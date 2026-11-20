// Lecture des comptes rendus de laboratoire. Tous les textes sont fictifs :
// pour couvrir un vrai bilan, ajoute ici son texte anonymisé et les lignes attendues.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {charger, lire, lignes} from './charger.mjs'

const {Lab} = charger()

test('aucun alias ne désigne deux analyses différentes', () => {
  const vus = new Map()
  for (const [cle, nom, autres] of Lab.markers) {
    for (const alias of [nom, ...autres.split('|')]) {
      const forme = Lab.fold(alias)
      assert.ok(!vus.has(forme) || vus.get(forme) === cle, `« ${alias} » désigne ${vus.get(forme)} et ${cle}`)
      vus.set(forme, cle)
    }
  }
})

test('bilan Cerballiance ordinaire', () => {
  const bilan = lire([
    'Laboratoire Cerballiance', 'Prélevé le 12/03/2026 à 08h10',
    'HEMATOLOGIE',
    'Hémoglobine\t14,5 g/dL\t13,0 à 17,0\t14,2',
    'Leucocytes\t6 500 /mm3\t4 000 à 10 000',
    'BIOCHIMIE DU SANG',
    'Créatinine\t80 µmol/L\t59 à 104',
    '\t9,0 mg/L\t6,7 à 11,7',
    'Sodium\t140 mmol/L\t136 à 145',
    'Glycémie à jeun\t0,92 g/L soit 5,11 mmol/L\t0,70 à 1,10',
    'BIOCHIMIE DES URINES',
    'Créatinine\t12,5 mmol/L',
    'HORMONOLOGIE',
    'TSH\t1,85 mUI/L\t0,40 à 4,00',
  ])
  assert.equal(bilan.lab, 'cerballiance')
  assert.equal(bilan.date, '2026-03-12')
  assert.equal(bilan.multipleDates, false)
  assert.deepEqual(lignes(bilan), [
    ['Hémoglobine', '14,5', 'g/dL', '13,0 à 17,0', '', 1],
    ['Leucocytes', '6 500', '/mm3', '4 000 à 10 000', '', 1],
    ['Créatinine', '80', 'µmol/L', '59 à 104', '', 1],
    ['Créatinine', '9,0', 'mg/L', '6,7 à 11,7', '', 1],
    ['Sodium', '140', 'mmol/L', '136 à 145', '', 1],
    ['Glycémie à jeun', '0,92', 'g/L', '', '', 1],
    ['Glycémie à jeun', '5,11', 'mmol/L', '0,70 à 1,10', '', 1],
    ['TSH', '1,85', 'mUI/L', '0,40 à 4,00', '', 1],
  ])
  assert.equal(bilan.urineSkipped, 1)
  assert.deepEqual(bilan.unknown, [])
})

test('bilan Check-Up ordinaire, avec plusieurs dates de collecte', () => {
  const bilan = lire([
    'CHECK UP LABORATORIO',
    'CREATININA', 'Material: Soro', 'Resultado: 0,9 mg/dL', 'V.R.: 0,7 a 1,2 mg/dL', 'Data da coleta: 05/02/2026',
    'HEMOGRAMA',
    'Hemácias 4,85 milhões/mm³ 4,5 a 5,9',
    'Leucócitos 6.500 /mm³ 4.000 a 10.000',
    'Plaquetas 250.000 /mm³ 150.000 a 450.000',
    'Data da coleta: 05/02/2026',
    'VDRL', 'Resultado: Não reagente', 'Data da coleta: 06/02/2026',
  ])
  assert.equal(bilan.lab, 'checkup')
  assert.equal(bilan.date, '')
  assert.equal(bilan.multipleDates, true)
  assert.deepEqual(lignes(bilan), [
    ['CREATININA', '0,9', 'mg/dL', '0,7 a 1,2 mg/dL', '2026-02-05', 1],
    ['Hemácias', '4,85', 'milhões/mm³', '', '2026-02-05', 1],
    ['Leucócitos', '6.500', '/mm³', '', '2026-02-05', 1],
    ['Plaquetas', '250.000', '/mm³', '', '2026-02-05', 1],
    ['VDRL', 'Não reagente', '', '', '2026-02-06', 1],
  ])
})

test('urines Cerballiance : la section se poursuit sur la page suivante', () => {
  const bilan = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'BIOCHIMIE DES URINES', 'Créatinine\t12,5 mmol/L', '\f', 'Sodium\t95 mmol/L', 'Glucose\t0,1 g/L'])
  assert.deepEqual(lignes(bilan), [])
  assert.equal(bilan.urineSkipped, 3)
})

test('urines Cerballiance : un titre de section sanguine y met fin', () => {
  const bilan = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'BIOCHIMIE DES URINES', 'Créatinine\t12,5 mmol/L', '\f', 'BIOCHIMIE DU SANG', 'Sodium\t140 mmol/L'])
  assert.deepEqual(lignes(bilan), [['Sodium', '140', 'mmol/L', '', '', 2]])
})

test('urines Check-Up : l’examen s’arrête à sa date de collecte, même sur deux pages', () => {
  const bilan = lire([
    'CHECK UP LABORATORIO', 'ROTINA DE URINA', 'Leucócitos 3.000 /mL', '\f', 'Hemácias 2.000 /mL', 'Data da coleta: 05/02/2026',
    'CREATININA', 'Resultado: 0,9 mg/dL', 'Data da coleta: 05/02/2026',
  ])
  assert.deepEqual(lignes(bilan), [['CREATININA', '0,9', 'mg/dL', '', '', 2]])
  assert.equal(bilan.urineSkipped, 2)
})

test('nombres : le point brésilien sépare les milliers', () => {
  const nombre = (valeur, labo, unite) => Lab.exactNumber(valeur, labo, unite)
  assert.equal(nombre('1.250', 'checkup', 'pg/mL'), 1250)
  assert.equal(nombre('250.000', 'checkup', '/mm³'), 250000)
  assert.equal(nombre('1.250,5', 'checkup', 'ng/mL'), 1250.5)
  assert.equal(nombre('1,25', 'checkup', 'ng/dL'), 1.25)
  assert.equal(nombre('0.850', 'checkup', 'mg/dL'), 0.85, 'un zéro initial reste une décimale')
  assert.equal(nombre('1.250', 'cerballiance', 'pg/mL'), 1.25, 'hors Check-Up, le point reste décimal')
})

test('nombres : formats français, bornes et textes', () => {
  assert.equal(Lab.exactNumber('6 500', 'cerballiance', '/mm3'), 6500)
  assert.equal(Lab.exactNumber('4,85', 'cerballiance', 'T/L'), 4.85)
  assert.equal(Lab.exactNumber('< 5', 'cerballiance', 'mg/L'), null, 'une borne ne se trace pas')
  assert.equal(Lab.exactNumber('Não reagente', 'checkup', ''), null)
})

test('unités : écritures équivalentes regroupées, unités distinctes séparées', () => {
  const memes = [['MG/DL', 'mg/dL'], ['mg/dl', 'mg/dL'], ['/mm3', '/mm³'], ['NG/ML', 'ng/mL'], ['MMOL/L', 'mmol/L'], ['µUI/mL', 'mUI/L'], ['ug/L', 'ng/mL'], ['UI/L', 'U/L']]
  for (const [a, b] of memes) assert.equal(Lab.unitKey(a), Lab.unitKey(b), `${a} et ${b}`)
  assert.notEqual(Lab.unitKey('G/L'), Lab.unitKey('g/L'), 'giga par litre et gramme par litre')
  assert.notEqual(Lab.unitKey('mg/dL'), Lab.unitKey('mmol/L'))
})

test('unités mEq/L et mm/h reconnues', () => {
  const sodium = lire(['CHECK UP LABORATORIO', 'SÓDIO', 'Resultado: 140 mEq/L', 'Data da coleta: 05/02/2026'])
  assert.deepEqual(lignes(sodium), [['SÓDIO', '140', 'mEq/L', '', '', 1]])
  const vs = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'Vitesse de sédimentation\t8 mm/h'])
  assert.deepEqual(lignes(vs), [['Vitesse de sédimentation', '8', 'mm/h', '', '', 1]])
})

test('analyses rénales, VS et TSH ultra sensible, dans les libellés Cerballiance', () => {
  const bilan = lire([
    'Cerballiance', 'Prélevé le 12/03/2026',
    'VS calculée à une heure\t8 mm\t< 20',
    'Clairance créatinine estimée selon Cockroft & Gault\t95 mL/min',
    'DFG calculé selon MDRD\t88 mL/min/1,73 m²',
    'DFG calculé selon CKD-EPI\t92 mL/min/1,73 m²',
    'Un DFG < 60 mL/min/1,73 m² pendant plus de 3 mois traduit une maladie rénale chronique.',
    'TSH ULTRA SENSIBLE\t1,85 mUI/L\t0,40 à 4,00',
  ])
  assert.deepEqual(lignes(bilan), [
    ['VS calculée à une heure', '8', 'mm', '', '', 1],
    ['Clairance créatinine estimée selon Cockroft & Gault', '95', 'mL/min', '', '', 1],
    ['DFG calculé selon MDRD', '88', 'mL/min/1,73 m²', '', '', 1],
    ['DFG calculé selon CKD-EPI', '92', 'mL/min/1,73 m²', '', '', 1],
    ['TSH ULTRA SENSIBLE', '1,85', 'mUI/L', '0,40 à 4,00', '', 1],
  ])
  assert.deepEqual(bilan.unknown, [], 'la phrase « Un DFG < 60… » est un commentaire, pas une analyse')
  assert.deepEqual(bilan.rows.map(item => Lab.groupFor(item.name)), ['esr', 'crcl', 'egfr-mdrd', 'egfr', 'tsh'],
    'MDRD et CKD-EPI restent deux séries distinctes')
})

test('testostérone : totale, libre et biodisponible restent trois séries ; seconde unité reprise', () => {
  const fr = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'HORMONOLOGIE',
    'TESTOSTERONE\t5,20 ng/mL\t2,49 à 8,36', '\t18,0 nmol/L\t8,64 à 29,0', 'Testostérone libre\t95 pg/mL'])
  assert.deepEqual(lignes(fr), [
    ['TESTOSTERONE', '5,20', 'ng/mL', '2,49 à 8,36', '', 1],
    ['TESTOSTERONE', '18,0', 'nmol/L', '8,64 à 29,0', '', 1],
    ['Testostérone libre', '95', 'pg/mL', '', '', 1],
  ])
  assert.deepEqual(fr.unknown, [])
  assert.deepEqual(fr.rows.map(item => Lab.groupFor(item.name)), ['testosterone', 'testosterone', 'testosterone-free'])

  const br = lire(['CHECK UP LABORATORIO', 'TESTOSTERONA TOTAL', 'Resultado: 520 ng/dL', 'Data da coleta: 05/02/2026'])
  assert.deepEqual(lignes(br), [['TESTOSTERONA TOTAL', '520', 'ng/dL', '', '', 1]])
})

test('anticorps anti-thyroïdiens : deux séries, valeurs bornées conservées telles quelles', () => {
  const bilan = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'IMMUNOLOGIE',
    'ANTICORPS ANTI-THYROPEROXYDASE (ATPO)\t12 UI/mL\t(< 34)',
    'ANTICORPS ANTI-THYROGLOBULINE (ATG)\t< 10 UI/mL\t(< 115)'])
  assert.deepEqual(lignes(bilan), [
    ['ANTICORPS ANTI-THYROPEROXYDASE (ATPO)', '12', 'UI/mL', '(< 34)', '', 1],
    ['ANTICORPS ANTI-THYROGLOBULINE (ATG)', '< 10', 'UI/mL', '(< 115)', '', 1],
  ])
  assert.deepEqual(bilan.unknown, [])
  assert.deepEqual(bilan.rows.map(item => Lab.groupFor(item.name)), ['atpo', 'atg'])
  assert.equal(Lab.judge('12', 'cerballiance', 'UI/mL', '(< 34)'), 'in')
  assert.equal(Lab.judge('< 10', 'cerballiance', 'UI/mL', '(< 115)'), null, 'une valeur bornée n’est pas jugée')
})

test('ligne de méthode : la valeur revient à l’analyse nommée juste au-dessus', () => {
  const bilan = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'HEMATOLOGIE', 'Plaquettes', 'Impédance électrique\t245 G/L\t150 à 400', 'Sodium\t140 mmol/L'])
  assert.deepEqual(lignes(bilan), [['Plaquettes', '245', 'G/L', '150 à 400', '', 1], ['Sodium', '140', 'mmol/L', '', '', 1]])
  assert.deepEqual(bilan.unknown, [])

  const seule = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'Impédance électrique\t245 G/L'])
  assert.deepEqual(lignes(seule), [], 'sans analyse au-dessus, rien n’est deviné')
  assert.deepEqual(seule.unknown, ['Impédance électrique'])

  const loin = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'Plaquettes', 'Texte libre', 'Autre texte', 'Encore du texte', 'Impédance électrique\t245 G/L'])
  assert.deepEqual(lignes(loin), [], 'une analyse nommée trop haut n’est pas rattachée')

  const deja = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'Plaquettes\t250 G/L', 'Impédance électrique\t245 G/L'])
  assert.deepEqual(lignes(deja), [['Plaquettes', '250', 'G/L', '', '', 1]], 'une analyse qui a déjà sa valeur n’en reçoit pas une seconde')
})

test('compte rendu Cerba sous-traité : valeurs sous la technique et le prélèvement, deux unités', () => {
  const bilan = lire([
    'Cerballiance', 'Prélevé le 12/03/2026', 'Ferritine\t80 µg/L\t(10 à 200)',
    '\f',
    'Exemplaire patient',
    'VITAMINE C (ASCORBATE) #',
    'Technique : HPLC',
    'Prélèvement : 12.03.2026 Plasma\t08h 10',
    '40,0 μmol/l\tN : 26,1-84.6 μmol/l\t(01.01.26 : 30,0)',
    '7,0 mg/l\tN : 4,6-14,9 mg/l\t(01.01.26 : 5,3)',
    'Concentration satisfaisante en vitamine C.',
  ])
  assert.deepEqual(lignes(bilan), [
    ['Ferritine', '80', 'µg/L', '(10 à 200)', '', 1],
    ['VITAMINE C (ASCORBATE)', '40,0', 'μmol/l', '26,1-84.6 μmol/l', '', 2],
    ['VITAMINE C (ASCORBATE)', '7,0', 'mg/l', '4,6-14,9 mg/l', '', 2],
  ])
  assert.equal(Lab.groupFor('VITAMINE C (ASCORBATE)'), 'vitc')
  assert.equal(Lab.judge('7,0', 'cerballiance', 'mg/l', '4,6-14,9 mg/l'), 'in')
  assert.equal(Lab.judge('20,0', 'cerballiance', 'μmol/l', '26,1-84.6 μmol/l'), 'low')

  const suite = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'Créatinine\t80 µmol/L', 'VITAMINE C', '7,0 mg/l'])
  assert.deepEqual(lignes(suite), [['Créatinine', '80', 'µmol/L', '', '', 1], ['VITAMINE C', '7,0', 'mg/l', '', '', 1]],
    'la valeur qui suit une nouvelle analyse ne devient pas la seconde unité de la précédente')
})

test('lignes non reconnues : signalées au lieu de disparaître', () => {
  const fr = lire(['Cerballiance', 'Prélevé le 12/03/2026', 'Hémoglobine\t14,5 g/dL\t13,0 à 17,0', 'PSA total\t1,2 ng/mL\t< 4', 'Créatinine (enzymatique)\t80 µmol/L', 'soit\t9,0 mg/L'])
  assert.equal(fr.rows.length, 1)
  assert.deepEqual(fr.unknown, ['PSA total', 'Créatinine (enzymatique)'])

  const br = lire(['CHECK UP LABORATORIO', 'PSA TOTAL', 'Resultado: 1,2 ng/mL', 'Data da coleta: 05/02/2026', 'Bastonetes 2 % 80 /mm³'])
  assert.equal(br.rows.length, 0)
  assert.equal(br.unnamed, 1)
  assert.deepEqual(br.unknown, ['Bastonetes'])
})

test('résultat qualitatif noyé dans un long paragraphe : ramené sous la limite du coffre', () => {
  const bilan = lire(['CHECK UP LABORATORIO', 'VDRL', 'Resultado: Não reagente' + ' observação '.repeat(40), 'Data da coleta: 05/02/2026'])
  assert.deepEqual(lignes(bilan), [['VDRL', 'Não reagente', '', '', '', 1]])
})

test('dates : formats acceptés et dates impossibles refusées', () => {
  assert.equal(Lab.validDate('2026-02-28'), true)
  assert.equal(Lab.validDate('2026-02-30'), false)
  assert.equal(Lab.validDate('1899-12-31'), false)
  assert.equal(lire(['Cerballiance', 'Prélevé le 31/02/2026', 'Sodium\t140 mmol/L']).date, '')
})

test('référence du labo : plages et bornes comprises, le reste ignoré', () => {
  const plage = (reference, labo = 'cerballiance', unite = 'g/dL') => Lab.referenceRange(reference, labo, unite)
  assert.deepEqual(plage('13,0 à 17,0'), {low:13, high:17, lowOpen:false, highOpen:false})
  assert.deepEqual(plage('(13,0 à 17,0)'), {low:13, high:17, lowOpen:false, highOpen:false})
  assert.deepEqual(plage('13,0 - 17,0 g/dL'), {low:13, high:17, lowOpen:false, highOpen:false})
  assert.deepEqual(plage('4 000 à 10 000', 'cerballiance', '/mm3'), {low:4000, high:10000, lowOpen:false, highOpen:false})
  assert.deepEqual(plage('4.000 a 10.000', 'checkup', '/mm³'), {low:4000, high:10000, lowOpen:false, highOpen:false})
  assert.deepEqual(plage('0,7 a 1,2 mg/dL', 'checkup', 'mg/dL'), {low:0.7, high:1.2, lowOpen:false, highOpen:false})
  assert.deepEqual(plage('< 5'), {low:null, high:5, lowOpen:false, highOpen:true})
  assert.deepEqual(plage('(< à 5)'), {low:null, high:5, lowOpen:false, highOpen:true})
  assert.deepEqual(plage('≤ 5,0'), {low:null, high:5, lowOpen:false, highOpen:false})
  assert.deepEqual(plage('Até 200', 'checkup', 'mg/dL'), {low:null, high:200, lowOpen:false, highOpen:false})
  assert.deepEqual(plage('Inferior a 200 mg/dL', 'checkup', 'mg/dL'), {low:null, high:200, lowOpen:false, highOpen:true})
  assert.deepEqual(plage('> 60'), {low:60, high:null, lowOpen:true, highOpen:false})
  assert.deepEqual(plage('Supérieur ou égal à 60'), {low:60, high:null, lowOpen:false, highOpen:false})

  assert.equal(plage(''), null)
  assert.equal(plage('13,0 à 17,0 mmol/L'), null, 'référence exprimée dans une autre unité')
  assert.equal(plage('13,0 à 17,0 14,2'), null, 'valeur antérieure collée à la référence')
  assert.equal(plage('Homens: 0,7 a 1,2 · Mulheres: 0,5 a 1,0', 'checkup', 'mg/dL'), null, 'plusieurs plages')
  assert.equal(plage('17,0 à 13,0'), null, 'plage inversée')
  assert.equal(plage('Não reagente', 'checkup', ''), null)
})

test('valeur située par rapport à la référence du labo', () => {
  const avis = (valeur, reference, labo = 'cerballiance', unite = 'g/dL') => Lab.judge(valeur, labo, unite, reference)
  assert.equal(avis('14,5', '13,0 à 17,0'), 'in')
  assert.equal(avis('13,0', '13,0 à 17,0'), 'in', 'les bornes d’une plage sont incluses')
  assert.equal(avis('12,9', '13,0 à 17,0'), 'low')
  assert.equal(avis('17,1', '13,0 à 17,0'), 'high')
  assert.equal(avis('5', '< 5'), 'high', 'une borne stricte exclut sa limite')
  assert.equal(avis('5', '≤ 5'), 'in')
  assert.equal(avis('4,9', '< 5'), 'in')
  assert.equal(avis('60', '> 60'), 'low')
  assert.equal(avis('3.500', '4.000 a 10.000', 'checkup', '/mm³'), 'low')
  assert.equal(avis('250.000', '150.000 a 450.000', 'checkup', '/mm³'), 'in')

  assert.equal(avis('14,5', ''), null, 'sans référence, pas d’avis')
  assert.equal(avis('< 0,5', '13,0 à 17,0'), null, 'une valeur bornée ne se compare pas')
  assert.equal(avis('Não reagente', 'Não reagente', 'checkup', ''), null, 'les résultats qualitatifs ne sont pas jugés')
  assert.equal(avis('14,5', 'Homens: 13 a 17 · Mulheres: 12 a 16', 'checkup', 'g/dL'), null)
})
