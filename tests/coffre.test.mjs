// Coffre chiffré : ce qui est écrit doit toujours pouvoir être rouvert, à l'identique.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {charger} from './charger.mjs'

const {Coffre} = charger()
const phrase = 'phrase de test jetable 123'
const sel = Coffre.freshSalt()
const cle = await Coffre.derive(phrase, sel)
const octets = taille => crypto.getRandomValues(new Uint8Array(taille))
const dossier = () => [
  {id:'a', kind:'bio', lab:'checkup', date:'2026-02-05', title:'Bilan', notes:'note', file:{name:'bilan.pdf', hash:'a'.repeat(64), bytes:octets(5000)},
    results:[{id:'1', name:'VDRL', value:'Não reagente', unit:'', reference:'', date:'', page:1}]},
  {id:'b', kind:'rx', lab:'', date:'2026-01-02', title:'Ordonnance', notes:'', file:null, results:[]},
]

test('aller-retour : documents, résultats et pièces jointes identiques', async () => {
  const origine = dossier()
  const scelle = await Coffre.seal(cle, sel, origine)
  const {records} = await Coffre.open(scelle.blob, phrase)
  assert.equal(records.length, 2)
  assert.deepEqual(records[0].results, origine[0].results)
  assert.deepEqual([...records[0].file.bytes], [...origine[0].file.bytes])
  assert.equal(records[0].file.name, 'bilan.pdf')
  assert.equal(records[1].file, null)
})

test('deux enregistrements du même dossier ne produisent jamais le même fichier', async () => {
  const origine = dossier()
  const [un, deux] = await Promise.all([Coffre.seal(cle, sel, origine), Coffre.seal(cle, sel, origine)])
  assert.notDeepEqual([...un.header], [...deux.header])
})

test('mauvaise phrase secrète : refus explicite', async () => {
  const scelle = await Coffre.seal(cle, sel, dossier())
  await assert.rejects(Coffre.open(scelle.blob, phrase + 'x'), /Phrase secrète incorrecte ou coffre endommagé/)
})

test('fichier altéré d’un seul octet : refusé', async () => {
  const scelle = await Coffre.seal(cle, sel, dossier())
  const contenu = new Uint8Array(await scelle.blob.arrayBuffer())
  contenu[contenu.length - 40] ^= 1
  await assert.rejects(Coffre.open(new Blob([contenu]), phrase), /Phrase secrète incorrecte ou coffre endommagé/)
})

test('fichier qui n’est pas un coffre : refusé avant toute demande de phrase', async () => {
  await assert.rejects(Coffre.inspect(new Blob([octets(500)])), /fichier \.sante créé par cette application/)
})

test('champ trop long : refusé à l’écriture, jamais découvert à la réouverture', async () => {
  const origine = dossier()
  origine[0].results[0].value = 'x'.repeat(241)
  await assert.rejects(Coffre.seal(cle, sel, origine), /« Bilan » contient un champ invalide ou trop long/)
  assert.throws(() => Coffre.check(origine[0]))
  assert.doesNotThrow(() => dossier().forEach(Coffre.check))
})

test('règles d’écriture : chaque limite du format est appliquée', () => {
  const invalide = modifier => {
    const [bilan] = dossier()
    modifier(bilan)
    assert.throws(() => Coffre.check(bilan))
  }
  invalide(d => { d.title = '' })
  invalide(d => { d.title = 't'.repeat(161) })
  invalide(d => { d.notes = 'n'.repeat(6001) })
  invalide(d => { d.date = '2026-02-30' })
  invalide(d => { d.kind = 'inconnu' })
  invalide(d => { d.lab = '' })
  invalide(d => { d.results[0].name = '' })
  invalide(d => { d.results[0].unit = 'u'.repeat(61) })
  invalide(d => { d.results[0].reference = 'r'.repeat(601) })
  invalide(d => { d.results[0].date = 'hier' })
  invalide(d => { d.results.push({...d.results[0]}) })
  invalide(d => { d.file.hash = 'pas une empreinte' })
})

test('relecture avant écriture : un contenu qui diverge du dossier n’est jamais écrit', async () => {
  let lectures = 0
  const [bilan, ordonnance] = dossier()
  const instable = {...ordonnance, get title() { return ++lectures > 1 ? 'Titre altéré' : 'Ordonnance' }}
  await assert.rejects(Coffre.seal(cle, sel, [bilan, instable]), /n’a pas pu être relu à l’identique/)

  const chiffrer = crypto.subtle.encrypt
  crypto.subtle.encrypt = async function (...args) {
    const resultat = await chiffrer.apply(this, args)
    bilan.file.bytes[100] ^= 1 // la pièce jointe change après le chiffrement
    return resultat
  }
  try {
    await assert.rejects(Coffre.seal(cle, sel, [bilan]), /n’a pas pu être relu à l’identique/)
  } finally {
    crypto.subtle.encrypt = chiffrer
  }
})

test('changement de phrase secrète : nouvelle phrase seule valable, anciennes copies inchangées', async () => {
  const avant = await Coffre.seal(cle, sel, dossier())
  const {records} = await Coffre.open(avant.blob, phrase)
  const nouvelle = 'une autre phrase jetable 456'
  const nouveauSel = Coffre.freshSalt()
  const nouvelleCle = await Coffre.derive(nouvelle, nouveauSel)

  assert.equal(await Coffre.sameKey(cle, await Coffre.derive(phrase, sel)), true)
  assert.equal(await Coffre.sameKey(cle, nouvelleCle), false)

  const apres = await Coffre.seal(nouvelleCle, nouveauSel, records)
  assert.equal((await Coffre.open(apres.blob, nouvelle)).records.length, 2)
  await assert.rejects(Coffre.open(apres.blob, phrase))
  assert.equal((await Coffre.open(avant.blob, phrase)).records.length, 2)
})

test('noms de fichiers : caractères dangereux neutralisés', () => {
  assert.equal(Coffre.safeName('..\\bilan:2026?.pdf'), '.._bilan_2026_.pdf')
  assert.equal(Coffre.safeName(''), 'document')
  assert.equal(Coffre.isPDF(new TextEncoder().encode('%PDF-1.7')), true)
  assert.equal(Coffre.isPDF(new TextEncoder().encode('PK\u0003\u0004')), false)
})

test('images affichables reconnues à leur signature, pas à leur extension', () => {
  const debut = (...octets) => Uint8Array.from([...octets, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  assert.equal(Coffre.isImage(debut(0xff, 0xd8, 0xff, 0xe0)), true, 'JPEG')
  assert.equal(Coffre.isImage(debut(0x89, 0x50, 0x4e, 0x47)), true, 'PNG')
  assert.equal(Coffre.isImage(debut(0x47, 0x49, 0x46, 0x38)), true, 'GIF')
  assert.equal(Coffre.isImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50])), true, 'WebP')
  assert.equal(Coffre.isImage(new TextEncoder().encode('%PDF-1.7 ...')), false)
  assert.equal(Coffre.isImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">')), false, 'SVG exclu')
  assert.equal(Coffre.isImage(new Uint8Array(2)), false)
})

const fiches = () => [
  {id:'v', kind:'vaccine', lab:'', date:'2024-05-10', title:'Rappel DTP', notes:'', file:null, results:[], fields:{vaccine:'Tétanos', lot:'AB123', booster:'2034-05-10'}},
  {id:'t', kind:'treatment', lab:'', date:'2026-01-15', title:'Lévothyroxine 75 µg', notes:'', file:null, results:[], fields:{dose:'1 comprimé le matin', end:''}},
  {id:'a', kind:'allergy', lab:'', date:'2010-06-01', title:'Pénicilline', notes:'', file:null, results:[], fields:{reaction:'Urticaire', severity:'severe'}},
  {id:'h', kind:'history', lab:'', date:'1998-03-01', title:'Appendicectomie', notes:'', file:null, results:[], fields:{category:'surgical'}},
]
const formatDe = async scelle => {
  const iv = scelle.header.slice(24, 36)
  const clair = await crypto.subtle.decrypt({name:'AES-GCM', iv, additionalData:scelle.header}, cle, await scelle.blob.slice(36).arrayBuffer())
  const taille = new DataView(clair).getUint32(0)
  return JSON.parse(new TextDecoder().decode(new Uint8Array(clair, 4, taille))).version
}

test('fiches structurées : aller-retour à l’identique, champs vides non stockés', async () => {
  const scelle = await Coffre.seal(cle, sel, fiches())
  const {records} = await Coffre.open(scelle.blob, phrase)
  assert.deepEqual(records.map(record => record.fields), [
    {vaccine:'Tétanos', lot:'AB123', booster:'2034-05-10'},
    {dose:'1 comprimé le matin'},
    {reaction:'Urticaire', severity:'severe'},
    {category:'surgical'},
  ])
  assert.deepEqual(records.map(record => record.kind), ['vaccine', 'treatment', 'allergy', 'history'])
})

test('format du coffre : 1 sans fiche (lisible par les anciennes versions), 2 dès qu’une fiche existe', async () => {
  assert.equal(await formatDe(await Coffre.seal(cle, sel, dossier())), 1)
  const vaccinSimple = [{id:'v', kind:'vaccine', lab:'', date:'2024-05-10', title:'Carnet de vaccination', notes:'', file:null, results:[], fields:{}}]
  assert.equal(await formatDe(await Coffre.seal(cle, sel, vaccinSimple)), 1, 'une vaccination sans champ reste au format 1')
  assert.equal(await formatDe(await Coffre.seal(cle, sel, fiches())), 2)
  assert.equal(await formatDe(await Coffre.seal(cle, sel, [fiches()[3]])), 2, 'un type récent suffit, même sans champ rempli')
})

test('fiches : champs inconnus, valeurs hors liste, dates impossibles et textes trop longs refusés', () => {
  const invalide = (index, modifier) => {
    const fiche = fiches()[index]
    modifier(fiche)
    assert.throws(() => Coffre.check(fiche))
  }
  invalide(0, f => { f.fields.booster = '2034-02-30' })
  invalide(0, f => { f.fields.vaccine = 'v'.repeat(121) })
  invalide(0, f => { f.fields.dose = '1 comprimé' })
  invalide(1, f => { f.fields.end = 'demain' })
  invalide(2, f => { f.fields.severity = 'terrible' })
  invalide(3, f => { f.fields.category = 42 })
  invalide(3, f => { f.fields = ['surgical'] })
  assert.throws(() => Coffre.check({...dossier()[1], fields:{dose:'x'}}), 'une ordonnance n’a pas de champ de fiche')
  assert.doesNotThrow(() => fiches().forEach(Coffre.check))
  assert.doesNotThrow(() => Coffre.check({...dossier()[1], fields:{}}))
})

test('relevé de mesures : aller-retour, format 2, valeurs mal formées refusées', async () => {
  const releve = {id:'m', kind:'measure', lab:'', date:'2026-11-17', title:'Relevé de mesures', notes:'', file:null, results:[],
    fields:{weight:'72,5', height:'172', systolic:'125', diastolic:'80', pulse:'64', temperature:'37,2', spo2:'98'}}
  const scelle = await Coffre.seal(cle, sel, [releve])
  assert.equal(await formatDe(scelle), 2)
  assert.deepEqual((await Coffre.open(scelle.blob, phrase)).records[0].fields, releve.fields)
  for (const [cle, valeur] of [['weight', '72.5'], ['weight', '401'], ['weight', '72,555'], ['systolic', '12,5'], ['spo2', '101'], ['pulse', 'soixante'], ['temperature', 37]]) {
    assert.throws(() => Coffre.check({...releve, fields:{...releve.fields, [cle]:valeur}}), `${cle} = ${valeur}`)
  }
  assert.throws(() => Coffre.check({...releve, fields:{poids:'72'}}), 'champ inconnu')
})
