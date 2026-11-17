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
