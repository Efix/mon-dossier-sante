// Lecture des comptes rendus (imagerie, consultation) : examen, date, indication, conclusion, médecins, lieu.
// Tous les comptes rendus sont fictifs ; leur mise en page reprend celle de vrais documents.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {charger} from './charger.mjs'

const {CompteRendu, Coffre} = charger()
const lire = (...pages) => CompteRendu.read(pages.map((lines, index) => ({number:index + 1, lines})))

const echographie = [
  "CENTRE D'IMAGERIE MEDICALE ET D'ECHOGRAPHIE DE LA",
  'VALLEE DES PINS',
  '12, rue des Lilas – 69000 LYON – Tél : 04 00 00 00 00',
  'Radiologie générale • Echographie • Sénologie • Ostéodensitométrie',
  'Docteur Claire MARTIN',
  'Nom de naissance : DUPONT',
  'Prénom utilisé : JEAN',
  'Date de naissance : 14/07/1980',
  'Sexe : M',
  'Lyon, le Mardi 14/04/2026',
  'A la demande du Docteur DURAND Paul',
  'Matériel : échographe de démonstration',
  'ÉCHOGRAPHIE DE LA GLANDE THYROÏDE',
  'INDICATION',
  'Contrôle annuel.',
  'RESULTATS',
  'La glande thyroïde est homogène :',
  '- Lobe droit : volume moyen : 6,50 cc.',
  '- Lobe gauche : volume moyen : 5,80 cc.',
  'AU TOTAL, donc :',
  'Thyroïde homogène de dimensions normales.',
  '- Pas de nodule.',
  'Bien confraternellement.',
  'Dr Claire MARTIN - 10000000000',
  'Compte-rendu validé électroniquement le 15/04/2026 à 09:30',
  'Membres d’une association agréée.',
]

test('échographie : examen, date, indication, conclusion, médecins et lieu ; aucune donnée d’identité', () => {
  assert.deepEqual(lire(echographie), {
    title:'Échographie de la glande thyroïde',
    kind:'imaging',
    date:'2026-04-14',
    fields:{
      indication:'Contrôle annuel.',
      conclusion:'Thyroïde homogène de dimensions normales.\n- Pas de nodule.',
      prescriber:'Dr DURAND Paul',
      practitioner:'Dr Claire MARTIN',
      place:"CENTRE D'IMAGERIE MEDICALE ET D'ECHOGRAPHIE DE LA VALLEE DES PINS",
    },
  })
  const texte = JSON.stringify(lire(echographie))
  for (const identite of ['DUPONT', 'JEAN', '1980']) assert.equal(texte.includes(identite), false, identite + ' ne doit jamais être repris')
})

test('date : celle de l’examen, jamais la date de naissance ; à défaut, la date de validation', () => {
  const sansLieu = echographie.filter(line => !line.startsWith('Lyon, le'))
  assert.equal(lire(sansLieu).date, '2026-04-15', 'date de validation du compte rendu')
  assert.equal(lire(['IRM DU GENOU DROIT', 'Date de naissance : 14/07/1980']).date, '', 'seule date : la naissance, donc aucune')
  assert.equal(lire(['IRM DU GENOU DROIT', 'Examen réalisé le 2 mars 2026', 'Paris, le 5 mars 2026']).date, '2026-03-02', 'la date de l’examen prime')
  assert.equal(lire(['IRM DU GENOU DROIT', 'Date de l’examen : 03.02.26']).date, '2026-02-03')
})

test('titre : sigles conservés, en-têtes de centre et listes de spécialités écartés, casse d’origine respectée', () => {
  const irm = lire(['CABINET DE RADIOLOGIE DU CENTRE', 'Radiologie • Scanner • IRM', 'IRM DU GENOU DROIT :', 'CONCLUSION : Entorse bénigne du LCA.'])
  assert.equal(irm.title, 'IRM du genou droit')
  assert.equal(irm.kind, 'imaging')
  assert.equal(irm.fields.conclusion, 'Entorse bénigne du LCA.')
  assert.equal(lire(['Mammographie bilatérale de dépistage']).title, 'Mammographie bilatérale de dépistage')
})

test('consultation : compte rendu (et non imagerie), titres de section suivis du texte sur la même ligne', () => {
  const consultation = lire([
    'Hôpital fictif de la Plaine – Service de cardiologie',
    'Compte rendu de consultation de cardiologie',
    'Date de consultation : 3 mars 2026',
    'Médecin traitant : Dr Paul DURAND',
    'Motif : palpitations à l’effort.',
    'Examen clinique : pression artérielle 12/8.',
    'Conclusion : examen cardiovasculaire normal,',
    'pas de traitement.',
    'Cordialement,',
    'Pr Anne PETIT',
  ])
  assert.equal(consultation.kind, 'report')
  assert.equal(consultation.title, 'Compte rendu de consultation de cardiologie')
  assert.equal(consultation.date, '2026-03-03')
  assert.deepEqual(consultation.fields, {
    indication:'palpitations à l’effort.',
    conclusion:'examen cardiovasculaire normal, pas de traitement.',
    prescriber:'Dr Paul DURAND',
    practitioner:'Pr Anne PETIT',
    place:'Hôpital fictif de la Plaine – Service de cardiologie',
  })
})

test('plusieurs pages : en-têtes et pieds répétés ignorés, conclusion bornée à la longueur admise par le coffre', () => {
  const pied = 'Cabinet fictif – page de démonstration'
  const longue = 'Phrase de conclusion assez longue pour dépasser la limite. '.repeat(60)
  const lu = lire(['SCANNER THORACIQUE', 'CONCLUSION', longue, pied], ['Suite.', pied])
  assert.ok(lu.fields.conclusion.length <= Coffre.fieldRules.imaging.conclusion)
  assert.ok(lu.fields.conclusion.endsWith('…'))
  assert.equal(lu.fields.conclusion.includes('Cabinet fictif'), false)
  assert.equal(lu.fields.place, undefined, 'un pied de page répété n’est pas pris pour le lieu')
})

test('document sans rien de reconnaissable : aucune proposition', () => {
  assert.equal(lire(['Liste de courses', 'Pain, lait, œufs.']), null)
  assert.equal(lire([]), null)
  // « Avis » en début de phrase n'est pas un titre de section.
  assert.equal(lire(['ECHOGRAPHIE ABDOMINALE', 'Avis favorable pour une reprise du sport après contrôle.']).fields.conclusion, undefined)
})

test('en-tête sur deux colonnes : l’identité du patient voisine d’un médecin ou d’un lieu n’est jamais reprise', () => {
  // La lecture du PDF sépare les colonnes d'une même ligne par une tabulation.
  const colonnes = lire([
    'CABINET DE RADIOLOGIE DU PARC\tPatient : Mme Anne EXEMPLE',
    'Médecin traitant : Dr Paul MARTIN\tNée le 12/05/1970 – NIR 2700512345678',
    'SCANNER THORACIQUE',
    'CONCLUSION : Examen normal.',
    'Dr Claire PETIT\tIPP 123456',
  ])
  assert.equal(colonnes.fields.place, 'CABINET DE RADIOLOGIE DU PARC')
  assert.equal(colonnes.fields.prescriber, 'Dr Paul MARTIN')
  assert.equal(colonnes.fields.practitioner, 'Dr Claire PETIT')
  // Colonnes trop proches pour être séparées : la mention du patient arrête le nom du médecin.
  const accolees = lire(['SCANNER THORACIQUE', 'Prescrit par Dr Luc BERNARD Patient : M. Jean EXEMPLE, né le 12/05/1970'])
  assert.equal(accolees.fields.prescriber, 'Dr Luc BERNARD')
  const texte = JSON.stringify([colonnes, accolees])
  for (const identite of ['EXEMPLE', 'Anne', 'Jean', '1970', '2700512345678', '123456']) {
    assert.equal(texte.includes(identite), false, identite + ' ne doit jamais être repris')
  }
})
