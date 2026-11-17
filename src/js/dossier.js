(() => {
  'use strict'

  // Formulaires des fiches : libellés du titre et de la date, puis champs propres à chaque type.
  // Champ : [clé, libellé, 'text' | 'date' | {valeur: libellé}, exemple].
  // Grandeurs mesurées : libellé et unité, dans l'ordre d'affichage.
  const metrics = {
    weight:{label:'Poids', unit:'kg', example:'72,5'},
    height:{label:'Taille', unit:'cm', example:'172'},
    systolic:{label:'Tension systolique', unit:'mmHg', example:'125'},
    diastolic:{label:'Tension diastolique', unit:'mmHg', example:'80'},
    pulse:{label:'Pouls', unit:'bpm', example:'64'},
    temperature:{label:'Température', unit:'°C', example:'37,2'},
    spo2:{label:'Saturation en oxygène', unit:'%', example:'98'},
  }

  const forms = {
    vaccine:{add:'Ajouter une vaccination', title:'Intitulé', example:'Rappel DTP, vaccin grippe 2026…', date:'Date de l’injection', fields:[
      ['vaccine', 'Vaccin ou maladie visée', 'text', 'Tétanos, grippe, hépatite B…'],
      ['lot', 'Numéro de lot', 'text', ''],
      ['booster', 'Prochain rappel prévu', 'date', ''],
    ]},
    treatment:{add:'Ajouter un traitement', title:'Médicament ou traitement', example:'Lévothyroxine 75 µg, kinésithérapie…', date:'Date de début', fields:[
      ['dose', 'Posologie', 'text', '1 comprimé le matin à jeun'],
      ['reason', 'Indication', 'text', ''],
      ['prescriber', 'Prescrit par', 'text', ''],
      ['end', 'Date de fin (vide si en cours)', 'date', ''],
    ]},
    allergy:{add:'Ajouter une allergie', title:'Allergène ou substance', example:'Pénicilline, arachide, latex…', date:'Connue depuis (ou date de saisie)', fields:[
      ['reaction', 'Réaction observée', 'text', 'Urticaire, œdème, gêne respiratoire…'],
      ['severity', 'Gravité', {'':'Non précisée', mild:'Légère', moderate:'Modérée', severe:'Sévère'}, ''],
    ]},
    history:{add:'Ajouter un antécédent', title:'Antécédent', example:'Appendicectomie, asthme, diabète du père…', date:'Date ou année (approximative si besoin)', fields:[
      ['category', 'Nature', {'':'Non précisée', medical:'Médical', surgical:'Chirurgical', family:'Familial'}, ''],
    ]},
    measure:{add:'Ajouter des mesures', title:'Intitulé', example:'Mesures du matin, consultation…', date:'Date de la mesure', defaultTitle:'Relevé de mesures',
      fields:Object.entries(metrics).map(([key, metric]) => [key, metric.label, 'number', metric.example])},
  }

  const decimal = new Intl.NumberFormat('fr-FR', {maximumFractionDigits:2})
  const numberOf = value => Number(String(value).replace(',', '.'))

  // Valeur saisie → forme enregistrée (« 72.50 » devient « 72,5 »), ou erreur explicite.
  function readMeasure(key, text) {
    const rule = Coffre.fieldRules.measure[key]
    const metric = metrics[key]
    let value = String(text ?? '').replace(/[\s\u00a0\u202f]/g, '').replace('.', ',')
    if (!value) return ''
    if (/^\d+,\d*$/.test(value)) value = value.replace(/,?0*$/, '')
    const number = numberOf(value)
    const places = rule.decimals ? (rule.decimals === 1 ? 'une décimale' : rule.decimals + ' décimales') + ' au plus' : 'sans décimale'
    if (!/^\d+(?:,\d+)?$/.test(value) || !(number >= rule.min && number <= rule.max) || (value.split(',')[1]?.length ?? 0) > rule.decimals) {
      throw Error(metric.label + ' : indique un nombre entre ' + decimal.format(rule.min) + ' et ' + decimal.format(rule.max) +
        ' ' + metric.unit + ', ' + places + '.')
    }
    return value
  }

  // Contrôle d'un relevé complet : au moins une valeur, tension saisie en entier et cohérente.
  function checkMeasures(input) {
    const fields = {}
    for (const key of Object.keys(metrics)) {
      const value = readMeasure(key, input[key])
      if (value) fields[key] = value
    }
    if (!Object.keys(fields).length) throw Error('Indique au moins une mesure.')
    if (Boolean(fields.systolic) !== Boolean(fields.diastolic)) throw Error('Indique les deux chiffres de la tension : systolique et diastolique.')
    if (fields.systolic && numberOf(fields.systolic) <= numberOf(fields.diastolic)) {
      throw Error('La tension systolique (le premier chiffre) doit dépasser la diastolique.')
    }
    return fields
  }

  const withUnit = (key, value) => value + (metrics[key].unit.startsWith('/') ? '' : ' ') + metrics[key].unit

  // Résumé d'un relevé en une ligne : « 72,5 kg · 125/80 mmHg · pouls 64/min ».
  function measureSummary(fields) {
    return [
      fields.weight && withUnit('weight', fields.weight),
      fields.systolic && fields.systolic + '/' + fields.diastolic + ' mmHg',
      fields.pulse && 'pouls ' + withUnit('pulse', fields.pulse),
      fields.temperature && withUnit('temperature', fields.temperature),
      fields.spo2 && 'SpO₂ ' + withUnit('spo2', fields.spo2),
      fields.height && 'taille ' + withUnit('height', fields.height),
    ].filter(Boolean).join(' · ')
  }

  // Séries chronologiques de chaque grandeur, plus l'IMC : poids divisé par le carré de la taille,
  // avec la taille du même relevé, sinon la dernière connue avant lui, sinon la première notée.
  function measureSeries(records) {
    const sorted = records.filter(record => record.kind === 'measure').sort((a, b) => a.date.localeCompare(b.date))
    const series = Object.fromEntries([...Object.keys(metrics), 'bmi'].map(key => [key, []]))
    const heights = sorted.filter(record => record.fields.height)
    for (const record of sorted) {
      for (const key of Object.keys(metrics)) {
        if (record.fields[key]) series[key].push({date:record.date, value:record.fields[key], record})
      }
      if (!record.fields.weight) continue
      const source = record.fields.height ? record : heights.findLast(item => item.date <= record.date) ?? heights[0]
      if (!source) continue
      const meters = numberOf(source.fields.height) / 100
      const bmi = (Math.round(numberOf(record.fields.weight) / (meters * meters) * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '')
      series.bmi.push({date:record.date, value:bmi, record, heightDate:source.date})
    }
    return series
  }

  const pad = value => String(value).padStart(2, '0')
  const today = (now = new Date()) => now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
  function addDays(date, days) {
    const moved = new Date(date + 'T12:00:00Z')
    moved.setUTCDate(moved.getUTCDate() + days)
    return moved.toISOString().slice(0, 10)
  }

  // Valeur lisible d'un champ de fiche : libellé pour une liste, texte tel quel sinon.
  function fieldText(kind, key, value) {
    const type = forms[kind]?.fields.find(field => field[0] === key)?.[2]
    if (type === 'number') return withUnit(key, value)
    return type && typeof type === 'object' ? type[value] ?? value : value
  }

  const ongoing = (record, day = today()) => record.kind === 'treatment' && (!record.fields.end || record.fields.end >= day)

  // Une ligne par vaccin : dernière injection connue et état de son prochain rappel
  // ('overdue' dépassé, 'soon' dans les `soonDays` jours, 'planned' plus tard, 'none' non renseigné).
  function vaccinations(records, day = today(), soonDays = 90) {
    const groups = new Map()
    for (const record of records) {
      if (record.kind !== 'vaccine') continue
      const name = (record.fields.vaccine || record.title).trim()
      const key = Lab.fold(name)
      const group = groups.get(key) ?? {key, name, last:record, count:0}
      group.count++
      if (record.date >= group.last.date) {
        group.last = record
        group.name = name
      }
      groups.set(key, group)
    }
    const rank = {overdue:0, soon:1, planned:2, none:3}
    return [...groups.values()].map(group => {
      const booster = group.last.fields.booster || ''
      const status = !booster ? 'none' : booster < day ? 'overdue' : booster <= addDays(day, soonDays) ? 'soon' : 'planned'
      return {...group, booster, status}
    }).sort((a, b) => rank[a.status] - rank[b.status] || a.booster.localeCompare(b.booster) || a.name.localeCompare(b.name, 'fr'))
  }

  globalThis.Dossier = {forms, metrics, today, addDays, fieldText, ongoing, vaccinations, readMeasure, checkMeasures, measureSummary, measureSeries}
})()

