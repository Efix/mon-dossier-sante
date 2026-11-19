// Fiches structurées : formulaires, traitements en cours, rappels de vaccination, mesures et IMC.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {charger} from './charger.mjs'

const {Coffre, Dossier} = charger()
const vaccin = (id, date, nom, rappel = '', titre = 'Vaccination') =>
  ({id, kind:'vaccine', date, title:titre, fields:{...(nom && {vaccine:nom}), ...(rappel && {booster:rappel})}})

test('chaque formulaire (fiches et comptes rendus) correspond exactement aux champs admis par le coffre', () => {
  const formulaires = {...Object.fromEntries(Object.entries(Dossier.forms).map(([type, form]) => [type, form.fields])), ...Dossier.documentFields}
  assert.deepEqual(Object.keys(formulaires).sort(), Object.keys(Coffre.fieldRules).sort())
  for (const [type, champs] of Object.entries(formulaires)) {
    assert.ok(Coffre.types[type], type)
    assert.deepEqual(Dossier.fieldsFor(type), champs, type)
    assert.deepEqual(champs.map(champ => champ[0]), Object.keys(Coffre.fieldRules[type]), type)
    for (const [cle, , nature] of champs) {
      const regle = Coffre.fieldRules[type][cle]
      if (nature === 'date') assert.equal(regle, 'date', cle)
      else if (nature === 'text' || nature === 'textarea') assert.equal(typeof regle, 'number', cle)
      else if (nature === 'number') assert.ok(regle.min < regle.max && Number.isInteger(regle.decimals) && Dossier.metrics[cle], cle)
      else assert.deepEqual(Object.keys(nature), regle, cle)
    }
  }
})

test('dates : jour courant en heure locale, décalage en jours', () => {
  assert.equal(Dossier.today(new Date(2026, 0, 5, 23, 30)), '2026-01-05')
  assert.equal(Dossier.addDays('2026-02-27', 3), '2026-03-02')
  assert.equal(Dossier.addDays('2024-02-28', 1), '2024-02-29')
  assert.equal(Dossier.addDays('2026-01-01', -1), '2025-12-31')
})

test('traitement en cours : sans date de fin, ou jusqu à sa date de fin incluse', () => {
  const traitement = fin => ({kind:'treatment', date:'2026-01-01', fields:fin ? {end:fin} : {}})
  assert.equal(Dossier.ongoing(traitement(''), '2026-06-01'), true)
  assert.equal(Dossier.ongoing(traitement('2026-06-01'), '2026-06-01'), true)
  assert.equal(Dossier.ongoing(traitement('2026-05-31'), '2026-06-01'), false)
  assert.equal(Dossier.ongoing({kind:'rx', date:'2026-01-01', fields:{}}, '2026-06-01'), false)
})

test('vaccinations : une ligne par vaccin, la dernière injection fait foi', () => {
  const lignes = Dossier.vaccinations([
    vaccin('1', '2014-05-10', 'Tétanos', '2024-05-10'),
    vaccin('2', '2024-06-01', 'tetanos', '2034-06-01'),
    vaccin('3', '2025-10-15', '', '', 'Vaccin grippe'),
    {id:'x', kind:'rx', date:'2026-01-01', title:'Ordonnance', fields:{}},
  ], '2026-11-17')
  assert.equal(lignes.length, 2)
  const tetanos = lignes.find(ligne => ligne.key === 'tetanos')
  assert.equal(tetanos.last.id, '2', 'le rappel dépassé de 2014 est remplacé par l injection de 2024')
  assert.equal(tetanos.count, 2)
  assert.equal(tetanos.status, 'planned')
  assert.equal(lignes.find(ligne => ligne.name === 'Vaccin grippe').status, 'none')
})

test('rappels : dépassé, proche (90 jours), prévu, classés du plus urgent au moins urgent', () => {
  const jour = '2026-11-17'
  const lignes = Dossier.vaccinations([
    vaccin('a', '2020-01-01', 'Prévu', '2030-01-01'),
    vaccin('b', '2020-01-01', 'Sans rappel'),
    vaccin('c', '2020-01-01', 'Proche', Dossier.addDays(jour, 90)),
    vaccin('d', '2016-11-16', 'Dépassé hier', '2026-11-16'),
    vaccin('e', '2020-01-01', 'Le jour même', jour),
    vaccin('f', '2020-01-01', 'Juste après', Dossier.addDays(jour, 91)),
  ], jour)
  assert.deepEqual(lignes.map(ligne => [ligne.name, ligne.status]), [
    ['Dépassé hier', 'overdue'],
    ['Le jour même', 'soon'],
    ['Proche', 'soon'],
    ['Juste après', 'planned'],
    ['Prévu', 'planned'],
    ['Sans rappel', 'none'],
  ])
})

test('libellés des champs à liste', () => {
  assert.equal(Dossier.fieldText('allergy', 'severity', 'severe'), 'Sévère')
  assert.equal(Dossier.fieldText('history', 'category', 'family'), 'Familial')
  assert.equal(Dossier.fieldText('treatment', 'dose', '1 comprimé'), '1 comprimé')
})

const releve = (id, date, fields) => ({id, kind:'measure', lab:'', date, title:'Relevé de mesures', notes:'', file:null, results:[], fields})

test('saisie d’une mesure : virgule ou point, zéros inutiles retirés', () => {
  assert.equal(Dossier.readMeasure('weight', '72.5'), '72,5')
  assert.equal(Dossier.readMeasure('weight', ' 72,50 '), '72,5')
  assert.equal(Dossier.readMeasure('weight', '72,0'), '72')
  assert.equal(Dossier.readMeasure('weight', '3,25'), '3,25')
  assert.equal(Dossier.readMeasure('temperature', '37.2'), '37,2')
  assert.equal(Dossier.readMeasure('systolic', '125'), '125')
  assert.equal(Dossier.readMeasure('pulse', ''), '')
})

test('saisie d’une mesure : valeur hors bornes ou mal écrite refusée avec un message clair', () => {
  assert.throws(() => Dossier.readMeasure('weight', '600'), /^Error: Poids : indiquez un nombre entre 0,5 et 400 kg, 2 décimales au plus\.$/)
  assert.throws(() => Dossier.readMeasure('temperature', '37,25'), /Température : .* une décimale au plus/)
  assert.throws(() => Dossier.readMeasure('systolic', '12,5'), /Tension systolique : .* sans décimale/)
  assert.throws(() => Dossier.readMeasure('spo2', '101'), /Saturation en oxygène/)
  assert.throws(() => Dossier.readMeasure('weight', '72 kg'), /Poids/)
  assert.throws(() => Dossier.readMeasure('weight', '-3'), /Poids/)
})

test('relevé : au moins une valeur, tension complète et cohérente', () => {
  assert.deepEqual(Dossier.checkMeasures({weight:'72.5', pulse:'64'}), {weight:'72,5', pulse:'64'})
  assert.deepEqual(Dossier.checkMeasures({systolic:'125', diastolic:'80'}), {systolic:'125', diastolic:'80'})
  assert.throws(() => Dossier.checkMeasures({}), /au moins une mesure/)
  assert.throws(() => Dossier.checkMeasures({systolic:'125'}), /les deux chiffres de la tension/)
  assert.throws(() => Dossier.checkMeasures({diastolic:'80'}), /les deux chiffres de la tension/)
  assert.throws(() => Dossier.checkMeasures({systolic:'80', diastolic:'80'}), /doit dépasser la diastolique/)
})

test('résumé d’un relevé en une ligne', () => {
  assert.equal(Dossier.measureSummary({weight:'72,5', systolic:'125', diastolic:'80', pulse:'64', temperature:'37,2', spo2:'98', height:'172'}),
    '72,5 kg · 125/80 mmHg · pouls 64 bpm · 37,2 °C · SpO₂ 98 % · taille 172 cm')
  assert.equal(Dossier.measureSummary({pulse:'64'}), 'pouls 64 bpm')
  assert.equal(Dossier.fieldText('measure', 'weight', '72,5'), '72,5 kg')
})

test('séries de mesures et IMC : taille du relevé, sinon la dernière connue avant, sinon la première notée', () => {
  const series = Dossier.measureSeries([
    releve('c', '2026-03-01', {weight:'80'}),
    releve('a', '2026-01-01', {weight:'72', height:'180'}),
    releve('d', '2025-06-01', {weight:'75'}),
    releve('b', '2026-02-01', {height:'170', systolic:'125', diastolic:'80'}),
    {id:'x', kind:'note', date:'2026-01-15', fields:{}},
  ])
  assert.deepEqual(series.weight.map(point => [point.date, point.value]), [['2025-06-01', '75'], ['2026-01-01', '72'], ['2026-03-01', '80']])
  assert.deepEqual(series.systolic.map(point => point.value), ['125'])
  assert.deepEqual(series.bmi.map(point => [point.date, point.value, point.heightDate]), [
    ['2025-06-01', '23,1', '2026-01-01'],
    ['2026-01-01', '22,2', '2026-01-01'],
    ['2026-03-01', '27,7', '2026-02-01'],
  ])
  assert.deepEqual(Dossier.measureSeries([releve('a', '2026-01-01', {weight:'72'})]).bmi, [], 'sans taille, pas d’IMC')
})
