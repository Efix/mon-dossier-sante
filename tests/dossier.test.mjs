// Fiches structurées : formulaires, traitements en cours, rappels de vaccination.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {charger} from './charger.mjs'

const {Coffre, Dossier} = charger()
const vaccin = (id, date, nom, rappel = '', titre = 'Vaccination') =>
  ({id, kind:'vaccine', date, title:titre, fields:{...(nom && {vaccine:nom}), ...(rappel && {booster:rappel})}})

test('chaque formulaire de fiche correspond exactement aux champs admis par le coffre', () => {
  assert.deepEqual(Object.keys(Dossier.forms).sort(), Object.keys(Coffre.fieldRules).sort())
  for (const [type, formulaire] of Object.entries(Dossier.forms)) {
    assert.ok(Coffre.types[type], type)
    assert.deepEqual(formulaire.fields.map(champ => champ[0]), Object.keys(Coffre.fieldRules[type]), type)
    for (const [cle, , nature] of formulaire.fields) {
      const regle = Coffre.fieldRules[type][cle]
      if (nature === 'date') assert.equal(regle, 'date', cle)
      else if (nature === 'text') assert.equal(typeof regle, 'number', cle)
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
