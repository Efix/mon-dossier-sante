  // Poids, tension, pouls… : dernières valeurs, courbes et relevés.
  function renderMeasures() {
    const add = () => openEditor('measure')
    const head = pageHeader('Mesures', 'Poids, tension, pouls, température : relevés à la maison ou lors d’une consultation.',
      button('Ajouter des mesures', add, 'primary'))
    const records = session.records.filter(record => record.kind === 'measure').sort(chronological)
    if (!records.length) {
      const panel = el('section', 'panel')
      panel.append(empty('Vos relevés apparaîtront ici, avec leurs courbes, dès la première saisie.'))
      $('view').replaceChildren(head, panel)
      return
    }
    const series = Dossier.measureSeries(records)
    const unitOf = key => key === 'bmi' ? 'kg/m²' : Dossier.metrics[key].unit
    const latest = key => series[key].at(-1)

    const cards = el('div', 'grid-stats measure-cards')
    const card = (label, value, unitText, date, detail = '') => {
      const block = el('div', 'card')
      const figure = el('strong', '', value)
      figure.append(el('span', 'card-unit', unitText))
      block.append(figure, el('span', 'muted', label), el('span', 'muted card-date', 'le ' + formatDate(date) + detail))
      cards.append(block)
    }
    const pressure = series.systolic.at(-1)
    for (const key of ['weight', 'bmi', 'pressure', 'pulse', 'temperature', 'spo2', 'height']) {
      if (key === 'pressure') {
        if (pressure) card('Tension', pressure.value + '/' + pressure.record.fields.diastolic, 'mmHg', pressure.date)
        continue
      }
      const last = latest(key)
      if (!last) continue
      const detail = key === 'bmi' && last.heightDate !== last.date ? ' · taille du ' + formatDate(last.heightDate) : ''
      card(key === 'bmi' ? 'IMC (calculé)' : Dossier.metrics[key].label, last.value, unitOf(key), last.date, detail)
    }

    // Une mesure devient un point de courbe, avec le relevé d'origine pour l'infobulle.
    const items = (key, label = '') => series[key].map(point => ({
      value:point.value, unit:unitOf(key), reference:'', date:point.date, page:0, document:point.record, label,
    }))
    const charts = el('div', 'bio-cards')
    const pending = []
    const chart = (title, key, extraKey = '', legend = null) => {
      if (!series[key].length) return
      const block = el('section', 'panel')
      section(block, title + ' · ' + unitOf(key))
      const canvas = el('canvas', 'chart')
      canvas.setAttribute('role', 'img')
      canvas.setAttribute('aria-label', 'Évolution : ' + title + '. Les valeurs figurent dans les relevés plus bas.')
      block.append(canvas)
      if (legend) block.append(legend)
      charts.append(block)
      pending.push(() => drawChart(canvas, items(key, extraKey ? 'Systolique' : ''), unitOf(key), extraKey ? items(extraKey, 'Diastolique') : []))
    }
    chart('Poids', 'weight')
    const bmiNote = el('p', 'small muted plot-meta', 'L’IMC est calculé avec la taille du même relevé, sinon la dernière taille notée.')
    chart('IMC', 'bmi', '', bmiNote)
    const legend = el('p', 'small muted plot-meta chart-legend')
    legend.append(el('span', '', 'Systolique'), el('span', 'second', 'Diastolique'))
    chart('Tension artérielle', 'systolic', 'diastolic', legend)
    chart('Pouls', 'pulse')
    chart('Température', 'temperature')
    chart('Saturation en oxygène', 'spo2')

    const history = el('section', 'panel')
    section(history, 'Relevés', button('Ajouter des mesures', add))
    history.append(listRecords(records, ''))
    $('view').replaceChildren(head, cards, charts, el('div', 'small', '\u00a0'), history)
    for (const draw of pending) draw()
  }

  // Tout le dossier dans l'ordre du temps, année par année.
  function renderTimeline() {
    const head = pageHeader('Chronologie', 'Tout le dossier dans l’ordre du temps : documents, bilans, traitements, vaccinations.',
      button('Ajouter un document', () => openEditor('other'), 'primary'))
    const panel = el('section', 'panel')
    const controls = el('div', 'filter-bar')
    const search = el('input')
    search.type = 'search'
    search.placeholder = 'Titre, laboratoire, traitement, note…'
    const type = el('select')
    type.append(option('', 'Tous les types'))
    for (const [key, label] of Object.entries(Coffre.types)) type.add(option(key, label))
    controls.append(inputField('Rechercher', search), inputField('Type d’élément', type))
    const list = el('div')
    function filter() {
      const query = Lab.fold(search.value)
      const records = session.records.filter(item => (!type.value || item.kind === type.value) &&
        (!query || Lab.fold([item.title, item.notes, describe(item), summaryOf(item), item.file?.name, ...Object.values(item.fields)].join(' ')).includes(query)))
        .sort(chronological)
      list.replaceChildren()
      if (!records.length) {
        list.append(empty('Aucun élément ne correspond à cette recherche.'))
        return
      }
      const years = new Map()
      for (const record of records) {
        const year = record.date.slice(0, 4)
        if (!years.has(year)) years.set(year, [])
        years.get(year).push(record)
      }
      for (const [year, group] of years) list.append(el('h2', 'year-head', year), listRecords(group, ''))
    }
    search.addEventListener('input', filter)
    type.addEventListener('change', filter)
    filter()
    panel.append(controls, list)
    $('view').replaceChildren(head, panel)
  }

