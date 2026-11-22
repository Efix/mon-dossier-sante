(() => {
  'use strict'

  const markers = [
    ['ferritin', 'Ferritine', 'Ferritina|Ferritine sérique|Ferritina sérica'],
    ['iron', 'Fer sérique', 'Ferro|Ferro sérico|Ferro no soro|Fer|Dosagem de ferro'],
    ['transferrin', 'Transferrine', 'Transferrina'],
    ['tsat', 'Saturation de la transferrine', 'Coefficient de saturation de la transferrine|Saturação da transferrina|Índice de saturação da transferrina|' +
      'Coefficient de saturation|Coefficient de saturation en fer de la transferrine|CS-Tf'],
    ['rbc', 'Hématies', 'Hemácias|Eritrócitos|Globules rouges'],
    ['hemoglobin', 'Hémoglobine', 'Hemoglobina|Hb'],
    ['hematocrit', 'Hématocrite', 'Hematócrito|Ht'],
    ['mcv', 'VGM', 'V.G.M.|VCM|Volume corpuscular médio'],
    ['mch', 'TCMH', 'T.C.M.H.|HCM|Hemoglobina corpuscular média'],
    ['mchc', 'CCMH', 'C.C.M.H.|CHCM|Concentração de hemoglobina corpuscular média'],
    ['rdw', 'RDW', 'IDR|Indice de distribution des globules rouges'],
    ['wbc', 'Leucocytes', 'Leucócitos|Leucócitos totais|Leucocytes totaux|Globules blancs'],
    ['neutrophils', 'Neutrophiles', 'Polynucléaires neutrophiles|Neutrófilos|Segmentados|Neutrófilos segmentados'],
    ['eosinophils', 'Éosinophiles', 'Polynucléaires éosinophiles|Eosinófilos'],
    ['basophils', 'Basophiles', 'Polynucléaires basophiles|Basófilos'],
    ['lymphocytes', 'Lymphocytes', 'Linfócitos'],
    ['monocytes', 'Monocytes', 'Monócitos'],
    ['ig', 'Granulocytes immatures', 'Granulócitos imaturos'],
    ['platelets', 'Plaquettes', 'Plaquetas|Contagem de plaquetas'],
    ['mpv', 'Volume plaquettaire moyen', 'VPM|Volume plaquetário médio'],
    ['pt', 'Taux de prothrombine (TP)', 'Taux de prothrombine|TP|Tempo de protrombina (atividade)'],
    ['inr', 'INR', 'International normalized ratio'],
    ['aptt', 'TCA (ratio patient/témoin)', 'Ratio patient/témoin|TCA ratio|Ratio TCA'],
    ['crp', 'CRP', 'Proteína C reativa|Protéine C réactive|Protéine C réactive (CRP)|Proteína C reativa (PCR)|PCR'],
    ['creatinine', 'Créatinine', 'Creatinina|Créatinine sérique|Creatinina sérica|Dosagem de creatinina'],
    ['egfr', 'DFG (CKD-EPI)', 'DFG CKD-EPI|DFG calculé selon la formule CKD-EPI|DFG selon CKD-EPI|DFG CKD-EPI 2021|DFG calculé selon CKD-EPI|DFG calculé selon CKD-EPI 2021'],
    ['egfr-mdrd', 'DFG (MDRD)', 'DFG MDRD|DFG calculé selon MDRD|DFG calculé selon la formule MDRD|DFG selon MDRD'],
    ['crcl', 'Clairance de la créatinine (Cockcroft-Gault)', 'Clairance créatinine estimée selon Cockroft & Gault|Clairance créatinine estimée selon Cockcroft & Gault|' +
      'Clairance de la créatinine selon Cockcroft et Gault|Clairance de la créatinine (Cockcroft)|Clairance de la créatinine Cockcroft-Gault|Clearance de creatinina'],
    ['esr', 'Vitesse de sédimentation (1re heure)', 'VS calculée à une heure|VS|VS 1re heure|VS 1ère heure|Vitesse de sédimentation|' +
      'Vitesse de sédimentation 1ère heure|VHS|Velocidade de hemossedimentação'],
    ['urea', 'Urée', 'Ureia|Uréia|Urée sérique|Dosagem de ureia'],
    ['uric', 'Acide urique', 'Ácido úrico|Dosagem de ácido úrico|Uricémie'],
    ['sodium', 'Sodium', 'Sódio|Sodium sérique|Sódio sérico|Na'],
    ['potassium', 'Potassium', 'Potássio|Potassium sérique|Potássio sérico|K'],
    ['chloride', 'Chlorures', 'Cloro|Cloreto|Cloreto sérico|Chlore|Chlorures sériques'],
    ['calcium', 'Calcium total', 'Cálcio total|Calcium|Calcémie|Cálcio sérico'],
    ['calcium-corrected', 'Calcium corrigé', 'Calcium corrigé (albumine)|Calcémie corrigée|Cálcio corrigido'],
    ['magnesium', 'Magnésium', 'Magnésio|Magnésium sérique'],
    ['zinc', 'Zinc', 'Zinco|Zinc sérique|Zinco sérico'],
    ['copper', 'Cuivre', 'Cuivre sérique|Cobre|Cobre sérico'],
    ['selenium', 'Sélénium', 'Selênio|Sélénium sérique'],
    ['phosphate', 'Phosphore', 'Fósforo|Phosphatémie|Phosphates inorganiques'],
    ['fasting', 'Glycémie à jeun', 'Glicemia em jejum|Glicose em jejum|Glicemia de jejum|Glucose à jeun'],
    ['glucose', 'Glucose sanguin', 'Glicose sanguínea|Glicose|Glicemia|Glycémie|Glucose'],
    ['a1c', 'Hémoglobine glyquée (HbA1c)', 'Hemoglobina glicada|Hemoglobina glicada A1c|HbA1c|Hémoglobine glyquée|Hémoglobine A1c'],
    ['cholesterol', 'Cholestérol total', 'Colesterol total|Colesterol'],
    ['hdl', 'Cholestérol HDL', 'HDL|Colesterol HDL|HDL colesterol|Colesterol HDL HDL'],
    ['ldl', 'Cholestérol LDL', 'LDL|Colesterol LDL|LDL colesterol|Cholestérol LDL calculé'],
    ['nonhdl', 'Cholestérol non-HDL', 'Colesterol não HDL|Colesterol não-HDL'],
    ['triglycerides', 'Triglycérides', 'Triglicerídeos|Triglicérides|Triglicérides (TG)|Trigliceridos'],
    ['ast', 'ASAT (TGO)', 'ASAT|TGO|Transaminase TGO (ASAT)|TGO - Transaminase oxalacética|Aspartato aminotransferase|Transaminase oxalacétique'],
    ['alt', 'ALAT (TGP)', 'ALAT|TGP|Transaminase TGP (ALAT)|TGP - Transaminase pirúvica|Alanina aminotransferase|Transaminase pyruvique'],
    ['ggt', 'Gamma-GT', 'GGT|Gama GT|Gama glutamil transferase|Gamma glutamyl transferase (GGT)'],
    ['alp', 'Phosphatases alcalines', 'Fosfatase alcalina|Phosphatase alcaline|PAL'],
    ['bili', 'Bilirubine totale', 'Bilirrubina total'],
    ['protein', 'Protides totaux', 'Protéines totales|Protides totaux sériques|Protéines sériques totales|Proteínas totais'],
    ['albumin', 'Albumine sanguine', 'Albumine|Albumine sérique|Albumina|Albumina sérica'],
    ['alpha1', 'Alpha-1 globulines', 'Alpha 1 globulines|Alfa 1 globulinas'],
    ['alpha2', 'Alpha-2 globulines', 'Alpha 2 globulines|Alfa 2 globulinas'],
    ['beta1', 'Bêta-1 globulines', 'Beta 1 globulines|Beta 1 globulinas'],
    ['beta2', 'Bêta-2 globulines', 'Beta 2 globulines|Beta 2 globulinas'],
    ['gamma', 'Gammaglobulines', 'Gamma globulines|Gama globulinas'],
    ['ag-ratio', 'Rapport albumine/globulines', 'Rapport A/G|Relação albumina/globulina'],
    ['iga', 'Immunoglobulines A (IgA)', 'Immunoglobuline A|Immunoglobulines A|IgA|Imunoglobulina A'],
    ['fib4', 'FIB-4', 'Calcul du FIB-4|Score FIB-4'],
    ['b9', 'Folates (vitamine B9)', 'Folates|Vitamine B9|Ácido fólico|Folato sérico|Folato'],
    ['b12', 'Vitamine B12', 'Vitamina B12|Cobalamina|Cobalamine'],
    ['vita', 'Vitamine A (rétinol)', 'Vitamine A|Rétinol|Vitamina A|Retinol'],
    ['b6', 'Vitamine B6', 'Vitamine B6 (pyridoxal 5 phosphate)|Pyridoxal 5 phosphate|Pyridoxal phosphate|Vitamina B6'],
    ['vitc', 'Vitamine C', 'Vitamine C (ascorbate)|Ascorbate|Acide ascorbique|Vitamina C|Ácido ascórbico'],
    ['vite', 'Vitamine E (alpha-tocophérol)', 'Vitamine E|Alpha-tocophérol|Vitamina E|Alfa-tocoferol'],
    ['d25', 'Vitamine D (25-OH)', '25 OH vitamine D|25 OH vitamina D|Vitamina D 25 OH|25 hidroxivitamina D|25 hydroxyvitamine D|Vitamine D totale (D2+D3)|' +
      'Vitamine D2/D3 (25-OH vit D)|Vitamine D2/D3|Vitamine D (25-OH)'],
    ['insulin', 'Insuline à jeun', 'Insuline|Insulina|Insulina em jejum|Insulinémie à jeun'],
    ['homa', 'Index HOMA (insulinorésistance)', 'Index HOMA d’insulinorésistance|Index HOMA|HOMA-IR|Indice HOMA'],
    ['prolactin', 'Prolactine', 'Prolactina'],
    ['estradiol', 'Estradiol', 'Œstradiol|Oestradiol|Estradiol (E2)'],
    ['fsh', 'FSH', 'Hormone folliculostimulante|Hormônio folículo estimulante'],
    ['lh', 'LH', 'Hormone lutéinisante|Hormônio luteinizante'],
    ['cortisol', 'Cortisol', 'Cortisol (matin)|Cortisol du matin|Cortisol sérique|Cortisolémie'],
    ['dhea', 'DHEA', 'Déhydroépiandrostérone|Dehydroepiandrosterone (D.H.E.A.)|D.H.E.A.'],
    ['protein-c', 'Protéine C (activité)', 'Dosage fonctionnel de la protéine C|Protéine C activité fonctionnelle|Activité de la protéine C'],
    ['protein-s', 'Protéine S (activité)', 'Dosage fonctionnel de la protéine S|Protéine S activité fonctionnelle|Activité de la protéine S'],
    ['ttg-iga', 'Anticorps anti-transglutaminase IgA', 'Ac anti-transglutaminase tissulaire IgA|Anticorps anti-transglutaminase tissulaire IgA|' +
      'Anti-transglutaminase IgA|Ac anti-transglutaminase IgA'],
    ['testosterone', 'Testostérone totale', 'Testostérone|Testostérone sérique|Testosterona|Testosterona total|Testosterona total sérica'],
    ['testosterone-free', 'Testostérone libre', 'Testosterona livre'],
    ['testosterone-bio', 'Testostérone biodisponible', 'Testosterona biodisponível'],
    ['tsh', 'TSH', 'T.S.H.|TSH ultrasensible|TSH ultra sensible|TSH ultra-sensible|TSH ultra sensível|Tireoestimulante, hormônio (TSH)|Hormônio tireoestimulante'],
    ['ft4', 'T4 libre', 'T4L|T4 livre|Tiroxina livre|Thyroxine libre (T4L)'],
    ['ft3', 'T3 libre', 'T3L|T3 livre|Triiodotironina livre|Triiodothyronine libre (T3L)'],
    ['atpo', 'Anticorps anti-TPO (thyroperoxydase)', 'Anticorps anti-thyroperoxydase (ATPO)|Anticorps anti-thyroperoxydase|Anticorps anti-TPO|' +
      'Ac anti-TPO|Ac anti-thyroperoxydase|Anti-TPO|ATPO|Anticorpos anti-TPO|Anticorpos antitireoperoxidase|Anticorpos anti-tireoperoxidase'],
    ['atg', 'Anticorps anti-thyroglobuline', 'Anticorps anti-thyroglobuline (ATG)|Anticorps anti-thyroglobuline (anti-Tg)|Ac anti-thyroglobuline|' +
      'Anti-thyroglobuline|Anti-Tg|ATG|Anticorpos antitireoglobulina|Anticorpos anti-tireoglobulina'],
    ['hcv', 'Hépatite C (anticorps anti-VHC)', 'Hepatite C - Anti-HCV|Anticorps anti-VHC'],
    ['hcv-index', 'Anti-HCV (indice)', 'Anti-HCV'],
    ['hbsag', 'Hépatite B (antigène HBs)', 'Hepatite B - HBsAg|Antigène HBs'],
    ['hbsag-index', 'HBsAg (indice)', 'HBsAg'],
    ['toxo-igg', 'Toxoplasmose IgG', 'Toxoplasmose - IgG'],
    ['toxo-igm', 'Toxoplasmose IgM', 'Toxoplasmose - IgM'],
    ['rubella-igg', 'Rubéole IgG', 'Rubéola - Anticorpos - IgG|Rubéola IgG'],
    ['rubella-igm', 'Rubéole IgM', 'Rubéola - Anticorpos - IgM|Rubéola IgM'],
    ['vdrl', 'Syphilis (VDRL)', 'VDRL|Teste diagnóstico para investigação de sífilis - VDRL'],
  ]
  const accentless = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '')
  const fold = value => accentless(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const clean = value => String(value ?? '').replace(/[\u00a0\u202f]/g, ' ').trim()
  const aliases = new Map()
  const names = new Map()
  for (const [key, name, alternatives] of markers) {
    names.set(key, name)
    for (const alt of [name, ...alternatives.split('|')]) aliases.set(fold(alt), key)
  }
  const labelText = value => clean(value)
    .replace(/^[\s✔✓•*▪¤▫]+|[\s:.*·…#]+$/gu, '').replace(/\s+/g, ' ')
  // « ZINC (Absorption atomique) », « VITAMINE E (ALPHA-TOCOPHEROL) (RF-MSMS) » : sans nom connu tel quel,
  // le libellé est essayé sans ses parenthèses finales, qui donnent souvent la technique.
  const keyFor = name => aliases.get(fold(name)) ?? aliases.get(fold(String(name ?? '').replace(/(?:\s*\([^()]*\))+\s*$/, ''))) ?? ''
  const groupFor = name => keyFor(name) || 'libre:' + fold(name)
  const nameFor = (key, name) => names.get(key) ?? name
  const number = String.raw`(?:[<>≤≥]=?[ ]*)?[−+-]?(?:\d{1,3}(?:[ .,'\u00a0\u202f]\d{3}){1,3}(?:[.,]\d+)?|\d+(?:[.,]\d+)?)`
  const micro = '(?:µ|μ|u|mc|micro)'
  const unit = [
    'mL\\s*/\\s*(?:min|mn)\\s*(?:[x×/]\\s*1[,.]73(?:\\s*m[²2]?)?)?',
    '(?:[kK]|milli|m|' + micro + ')?(?:U[IL]|I[U]|UI|U)\\s*/\\s*(?:mL|dL|L)',
    '(?:[kKmµμu]?mol|nmol|pmol|[mcdnp]g|' + micro + 'g|[GgT]|mmol)\\s*/\\s*(?:mL|dL|L)',
    '(?:10\\s*[\\^³⁶63]?\\s*[36]?|milh(?:ões|oes)|mil|c[eé]lulas?|cel|cél)?\\s*/\\s*(?:mm[³3]|[µμu]L|mL)',
    'm?Eq\\s*/\\s*(?:mL|dL|L)',
    'mmol\\s*/\\s*mol',
    'mm\\s*/\\s*(?:1\\s*)?h(?:ora|eure)?',
    'fL|pg|%|segundos?|s',
    'mm',
  ].join('|')
  const measurePattern = new RegExp('(^|[\\s:])(' + number + ')\\s*(' + unit + ')(?=$|[\\s*()\\[\\]:])', 'gi')
  const numberCell = new RegExp('^' + number + '$')
  const textResult = /^(?:amostra |resultado |pesquisa )?(?:n[aã]o reagente|reagente|negativ[oa]|positiv[oa]|ausente|indeterminad[oa])\b/i
  const collectionBR = /^ *(?:data d[ae] coleta|coleta em|coletado em)\s*:?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i
  const collectionFR = /^\s*(?:preleve(?:e)?\s+(?:le|du)|date (?:du|de) prelevement|prelevement\s+du)\s*:?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i
  const pagesFromText = text => String(text ?? '').split(/\f|<PARSED TEXT FOR PAGE: \d+ \/ \d+>/).filter(p => p.trim())
    .map((page, index) => ({number:index + 1, lines:page.split(/\r?\n/)}))

  function dateISO(raw) {
    const parts = raw?.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/)
    if (!parts) return ''
    let year = Number(parts[3])
    if (parts[3].length === 2) year += year >= 70 ? 1900 : 2000
    const date = [String(year).padStart(4, '0'), parts[2].padStart(2, '0'), parts[1].padStart(2, '0')].join('-')
    return validDate(date) ? date : ''
  }

  function validDate(date) {
    if (!/^(?:19|20|21)\d{2}-\d{2}-\d{2}$/.test(date)) return false
    const value = new Date(date + 'T00:00:00Z')
    return !isNaN(value) && value.toISOString().slice(0, 10) === date
  }

  function unitKey(raw) {
    let value = clean(raw).replace(/\s+/g, '').replace(/μ/g, 'µ')
      .replace(/^micro/i, 'µ').replace(/^mc/i, 'µ').replace(/^u(?=[gUmL])/i, 'µ')
      .replace(/UI/g, 'IU').replace(/^ul\//i, 'IU/').replace(/^U\//, 'IU/')
    if (/^(?:µg\/l|ng\/ml)$/i.test(value)) return 'ng/mL'
    if (/^(?:mIU\/l|µIU\/ml)$/i.test(value)) return 'mIU/L'
    if (/^mL\/m(?:i)?n[\/x×]1[.,]73(?:m[²2]?)?$/i.test(value)) return 'mL/min/1,73 m²'
    if (value === 'g/L' || value === 'G/L' || value === 'T/L') return value
    // « MG/DL » et « mg/dL », « /mm3 » et « /mm³ » désignent la même unité : une seule série.
    if (/^(?:[MNPDCKµ]?G|[MNPµ]?MOL)\/(?:ML|DL|L)$/.test(value)) value = value.toLowerCase()
    return value.replace(/mm3$/i, 'mm³').replace(/\/(?:ml|dl)$/i, end => '/' + end[1].toLowerCase() + 'L').replace(/\/l$/i, '/L')
  }

  function exactNumber(raw, lab, unitText) {
    let value = clean(raw).replace(/−/g, '-')
    if (!numberCell.test(value) || /^[<>≤≥]/.test(value)) return null
    if (/[ '\u00a0\u202f]/.test(value)) value = value.replace(/[ '\u00a0\u202f]/g, '')
    const isCount = /^(?:\/|c[eé]l(?:ulas?)?\/)(?:mm[3³]|[µμu]L|mL)$/i.test(unitText.replace(/\s+/g, ''))
    // Au Brésil le point sépare les milliers, quelle que soit l'unité (« 1.250 pg/mL » vaut 1250).
    if (lab === 'checkup' && (isCount ? /^\d{1,3}(?:\.\d{3})+$/ : /^[1-9]\d{0,2}(?:\.\d{3})+$/).test(value)) {
      value = value.replace(/\./g, '')
    } else {
      const decimal = value.match(/^(.*?)(([,.])\d+)$/)
      if (decimal && /[.,]/.test(decimal[1])) {
        const other = decimal[3] === ',' ? '.' : ','
        const integer = decimal[1]
        if (!integer.includes(decimal[3])) value = integer.split(other).join('') + decimal[2]
        else if (!integer.includes(other) && /^[+-]?\d{1,3}(?:[.,]\d{3})+$/.test(value)) value = value.replace(/[.,]/g, '')
        else return null
      }
      value = value.replace(',', '.')
    }
    const numeric = Number(value)
    return Number.isFinite(numeric) && Math.abs(numeric) < 1e16 ? numeric : null
  }

  function measures(line) {
    return Array.from(line.matchAll(measurePattern), m => ({
      start:m.index + m[1].length, end:m.index + m[0].length, value:clean(m[2]), unit:clean(m[3]),
    }))
  }

  function rowOf(name, measurement, page, reference = '') {
    return {
      name:labelText(name).slice(0, 160), value:measurement.value.slice(0, 240), unit:measurement.unit.slice(0, 60),
      page, reference:reference.slice(0, 600), date:'',
    }
  }

  // Un résultat qualitatif noyé dans un long paragraphe est ramené à son seul verdict.
  const shortText = text => text.length > 240 ? text.match(textResult)?.[0] ?? text.slice(0, 240) : text

  function referenceFR(tail) {
    // « N : 4,6-14,9 mg/l », « N > 49 » : valeurs normales des comptes rendus du laboratoire spécialisé Cerba.
    // Ailleurs, une borne seule sans « à » (« < 3 ») peut être un résultat antérieur : elle n'est pas reprise.
    const normal = /^N\s*(?::|(?=[<>≤≥]))\s*/
    const cell = tail.trimStart().split(/\t| {2,}/)[0] ?? ''
    const part = cell.replace(normal, '')
    if (!part || part.length > 100 || /^\d{2}[/.-]\d{2}[/.-]/.test(part)) return ''
    const range = /\d\s*(?:à|[-–])\s*\d/.test(part)
    const explicitBound = /^(?:\(\s*[<>≤≥]=?\s*(?:à\s*)?\d.*\)|[<>≤≥]=?\s*à\s*\d.*)$/i.test(part) ||
      (normal.test(cell) && /^[<>≤≥]=?\s*\d/.test(part))
    return range || explicitBound ? part.trim() : ''
  }

  // Lignes « libellé + valeur » dont le libellé est inconnu : signalées à l'import au lieu de disparaître.
  const notAName = /^(?:soit|ou|et|valeurs?|valor(?:es)?|referenc|risque|risco|objectif|cible|seuil|normales?|interpretation|resultado|adult|homens|mulheres|crianca|desejavel|otimo|limitrofe|alto|baixo|ate|acima|inferior|superior|si|pour|en|de|un|une|le|la|les|des|du|au|aux|chez|dans|avec|sans|selon|ce|cet|cette|il|elle|on|nous|vous)(?: |$)/
  const noteUnknown = (unknown, label) => {
    const key = fold(label)
    if (label.length <= 80 && /\p{L}{3}/u.test(label) && !notAName.test(key) && unknown.size < 200) unknown.set(key, label)
  }

  // Libellés de technique d'analyse : jamais une analyse, parfois la ligne qui porte la valeur.
  const methodLine = /^(?:impedance|photometrie|cytometrie|colorimetrie|spectrophotometrie|turbidimetrie|immunoturbidimetrie|nephelometrie|enzymatique|chimiluminescence|electrochimiluminescence|potentiometrie|electrode|methode|technique)(?: |$)/

  // Titres de section des comptes rendus Cerballiance. Une section d'urines ne se termine qu'au titre d'une
  // autre section : les en-têtes de page (laboratoire, patient) ne doivent pas y mettre fin.
  const urineSection = /^(?:biochimie (?:des urines|urinaire)|analyse d urines|cytologie urinaire|chimie urinaire|ionogramme urinaire|examen cytobacteriologique|ecbu)(?: |$)/
  const otherSection = new RegExp('^(?:' + [
    'biochimie(?: (?:generale|du sang|sanguine|plasmatique|specialisee))?$', 'hematologie', 'hemostase', 'coagulation',
    'immunologie', 'immuno ?hematologie', 'auto ?immunite', 'allergologie', 'hormonologie', 'hormones', 'endocrinologie',
    'serologies?', 'virologie', 'infectiologie', 'enzymologie', 'marqueurs', 'vitamines', 'oligo ?elements', 'proteines',
    'electrophorese', 'exploration', 'bilan', 'lipides', 'metabolisme', 'toxicologie', 'pharmacologie', 'suivi therapeutique',
    'examens transmis', 'gaz du sang',
  ].join('|') + ')(?: |$)')
  const sectionEnds = heading => !/urin|ecbu/.test(heading) && otherSection.test(heading)

  function parseCerballiance(pages) {
    const rows = []
    const dates = new Set()
    const unknown = new Map()
    // Résultats sans unité : la valeur est la cellule qui suit le libellé.
    const unitless = new Set(['fib4', 'inr', 'aptt', 'homa', 'ag-ratio'])
    // Une section d'urines peut se poursuivre sur la page suivante : l'état survit au saut de page.
    let urine = false
    let urineSkipped = 0
    // Chaque résultat garde la date du prélèvement qui le précède : deux dates, deux résultats distincts.
    let collected = ''
    const row = (...args) => ({...rowOf(...args), date:collected})
    for (const {number:page, lines} of pages) {
      let previous = null
      let last = -10
      // Analyse nommée sans valeur sur sa ligne : sa valeur peut figurer sur la ligne de méthode suivante.
      let awaiting = null
      for (const [index, raw] of lines.entries()) {
        const line = clean(raw)
        const date = dateISO(accentless(line).match(collectionFR)?.[1])
        if (date) {
          dates.add(date)
          collected = date
        }
        const heading = fold(line)
        if (urineSection.test(heading)) urine = true
        else if (sectionEnds(heading)) urine = false
        if (!line) continue
        const items = measures(line)
        if (urine) {
          if (items.length) urineSkipped++
          continue
        }
        // « Seuil de détection : 12,6 mUI/L » décrit la technique ; « HbA1c < 5.7 % : risque faible » est une légende.
        if (/seuil de detection/.test(heading) || items.some(item => /^\s*:/.test(line.slice(item.end)))) continue
        const first = items[0]
        const technicalPrefix = first && /^\(\d+\)\s*\([^)]*\)\s*$/.test(line.slice(0, first.start))
        // Même analyse dans une seconde unité, sur une ligne qui commence par la valeur.
        if (first && (!first.start || technicalPrefix) && previous && index - last <= 3 && keyFor(previous.name)) {
          if (unitKey(previous.unit) !== unitKey(first.unit)) rows.push(row(previous.name, first, page, referenceFR(line.slice(first.end))))
          previous = null
          continue
        }
        const cells = line.replace(/^[✔✓]\s*/, '').split(/\t| {2,}/)
        const label = first ? labelText(line.slice(0, first.start)) : labelText(cells[0])
        // Valeur sur la ligne de méthode, ou seule en début de ligne sous « Technique » et « Prélèvement » (Cerba).
        if (!keyFor(label) && first && awaiting && index - awaiting.index <= (first.start ? 3 : 5) &&
          (first.start ? methodLine.test(fold(label)) : !label)) {
          const candidate = row(awaiting.label, first, page, referenceFR(line.slice(first.end)))
          rows.push(candidate)
          previous = candidate
          last = index
          awaiting = null
          continue
        }
        if (!keyFor(label)) {
          if (first?.start) noteUnknown(unknown, label)
          if (line.startsWith('✔') || line.startsWith('✓')) previous = null
          continue
        }
        if (first) {
          const second = items[1]
          // « 42,5 % soit 2,98 G/L », ou avec la référence de la première valeur : « 61,9 % (55.8 à 66.1) soit 47,0 g/L ».
          const between = second ? line.slice(first.end, second.start) : ''
          const both = second && /^\s*(?:\([^()]*\)\s*)?soit\s*$/i.test(between)
          if (both) rows.push(row(label, first, page, referenceFR(between)))
          const current = both ? second : first
          const candidate = row(label, current, page, referenceFR(line.slice(current.end)))
          rows.push(candidate)
          previous = candidate
          last = index
          awaiting = null
        } else if (unitless.has(keyFor(label))) {
          const cell = cells[1]?.trim()
          if (cell && numberCell.test(cell)) rows.push(row(label, {value:cell, unit:''}, page, referenceFR(cells.slice(2).join('\t'))))
        } else {
          // Une nouvelle analyse commence : la ligne suivante ne peut plus être la seconde unité de la précédente.
          awaiting = {label, index}
          previous = null
        }
      }
    }
    return {rows, dates, unknown, urineSkipped, unnamed:0}
  }

  function firstBRMeasurement(text) {
    const measurement = measures(text)[0]
    if (measurement && measurement.start === 0) return measurement
    const cell = text.split(/\t| {2,}/)[0].trim()
    if (textResult.test(text)) return {value:shortText(text), unit:''}
    if (numberCell.test(cell)) return {value:cell, unit:''}
    return null
  }

  function collectBRReference(current, text) {
    if (!text || /^\s*[+|]/.test(text)) return
    const joined = current.reference ? current.reference + ' · ' + text : text
    if (joined.length <= 600) current.reference = joined
  }

  function parseCheckUp(pages) {
    const rows = []
    const dates = new Set()
    const unknown = new Map()
    // L'examen d'urine se termine à sa date de collecte, pas à la fin de la page.
    let urine = false
    let urineSkipped = 0
    let unnamed = 0
    const row = rowOf
    // Un examen peut commencer en bas d'une page et finir sur la suivante, avec sa date de collecte :
    // l'analyse en cours et les résultats qui attendent leur date survivent au saut de page.
    let label = ''
    let active = null
    let references = false
    let pending = []
    const add = item => {
      rows.push(item)
      pending.push(item)
      return item
    }
    for (const {number:page, lines} of pages) {
      for (const raw of lines) {
        const line = clean(raw)
        if (!line) continue
        const heading = fold(line)
        const date = dateISO(accentless(line).match(collectionBR)?.[1])
        if (date) {
          dates.add(date)
          pending.forEach(item => { item.date = date })
          pending = []
          label = ''
          active = null
          references = false
          urine = false
          continue
        }
        if (/^(?:rotina de urina|urinalise|sumario de urina|urocultura|cultura automatizada urina)/.test(heading)) {
          urine = true
          continue
        }
        if (urine && /^(?:hemograma|eritrograma|leucograma|bioquimica|sorologia|imunologia|hormonios)(?: |$)/.test(heading)) urine = false
        if (urine) {
          if (measures(line).length) urineSkipped++
          continue
        }
        const reference = line.match(/^(?:V\.?\s*R\.?|Valor(?:es)? de refer[êe]ncia)\s*:\s*(.*)$/i)
        if (reference) {
          if (active) collectBRReference(active, reference[1].replace(/\s+/g, ' '))
          references = Boolean(active)
          continue
        }
        const result = line.match(/^resultados?(?:\s*:\s*|\t+| {2,})(.*)$/i) ??
          line.match(/^resultados?\s+([<>≤≥+\-\d].*)$/i) ??
          (keyFor(label) === 'vdrl' ? line.match(/^teste n[aã]o trepon[eê]mico\s*:\s*(.*)$/i) : null)
        if (result && label) {
          const measurement = firstBRMeasurement(result[1])
          if (measurement) active = add(row(label, measurement, page))
          else noteUnknown(unknown, label)
          references = false
          continue
        }
        if (result && firstBRMeasurement(result[1])) unnamed++
        if (keyFor(label) === 'vdrl' && !active && textResult.test(line)) {
          active = add(row(label, {value:shortText(line), unit:''}, page))
          continue
        }
        if (keyFor(label) === 'hbsag' && active && /\bda Hepatite$/i.test(active.value) && /^B\.?$/.test(line)) {
          active.value = (active.value + ' ' + line).slice(0, 240)
          continue
        }
        const first = measures(line)[0]
        const inlineLabel = first ? labelText(line.slice(0, first.start)) : labelText(line)
        if (keyFor(inlineLabel)) {
          label = inlineLabel
          references = false
          active = first ? add(row(label, first, page, referenceFR(line.slice(first.end)))) : null
          continue
        }
        const [colLabel, ...cells] = line.split(/\t| {2,}/).map(labelText)
        if (keyFor(colLabel) && cells.length && /^(?:anti hcv|hbsag|vdrl)$/.test(fold(colLabel))) {
          const measurement = firstBRMeasurement(cells.join(' '))
          if (measurement) {
            label = colLabel
            active = add(row(label, measurement, page))
            references = false
            continue
          }
        }
        if (first?.start && !references && !result) noteUnknown(unknown, inlineLabel)
        if (/^(?:atencao|obs|observac|nota|amostras |assinatura|material|metodo|check up |laudo )/.test(heading)) references = false
        if (references && /^(?:adult|crianca|homens|mulheres|recem|nao reagente|reagente|indeterminado|negativo|positivo|\d+\s*(?:a|m|anos|dias|meses))/i.test(heading)) {
          collectBRReference(active, line.replace(/\s+/g, ' '))
        }
      }
    }
    return {rows, dates, unknown, urineSkipped, unnamed}
  }

  function parse(pages, requested = 'auto') {
    const all = fold(pages.flatMap(page => page.lines).join(' '))
    let lab = requested
    if (lab === 'auto') {
      if (/\bcerballiance\b|valeurs de reference anteriorites|preleve le \d/.test(all)) lab = 'cerballiance'
      else if (/\bcheck up laboratorio\b|data da coleta\b/.test(all)) lab = 'checkup'
      else lab = 'other'
    }
    const {rows, dates, unknown, urineSkipped, unnamed} = lab === 'checkup' ? parseCheckUp(pages) : parseCerballiance(pages)
    const date = dates.size === 1 ? [...dates][0] : ''
    const seen = new Set()
    const proposals = rows.filter(item => {
      const signature = [groupFor(item.name), item.value, item.unit, item.reference, item.date].join('\u001f')
      if (seen.has(signature)) return false
      seen.add(signature)
      if (item.date === date) item.date = ''
      return true
    })
    return {lab, date, multipleDates:dates.size > 1, rows:proposals, unknown:[...unknown.values()], urineSkipped, unnamed}
  }

  // Référence du labo lue comme une plage (« 13,0 à 17,0 ») ou une borne (« < 5 », « até 200 »).
  // Tout ce qui est ambigu (plusieurs plages, autre unité, texte libre) renvoie null : pas de signalement.
  const refNumber = String.raw`[+-]?(?:\d{1,3}(?:[ .  ]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)`
  const refRange = new RegExp('^(' + refNumber + ')\\s*(?:à|a|-|–|−)\\s*(' + refNumber + ')(?:\\s*(\\S.*))?$', 'i')
  const refBound = new RegExp('^(<=|>=|[<>≤≥]|inf[ée]rieure?s? (?:ou [ée]gale?s? )?[àa]|sup[ée]rieure?s? (?:ou [ée]gale?s? )?[àa]|' +
    'inferior a|superior a|abaixo de|acima de|at[ée])\\s*(?:[àa]\\s+)?(' + refNumber + ')(?:\\s*(\\S.*))?$', 'i')

  function referenceRange(reference, lab, unitText) {
    const text = clean(reference).replace(/\s+/g, ' ').replace(/^\((.*)\)$/, '$1').trim()
    if (!text) return null
    const sameUnit = tail => !tail || unitKey(tail) === unitKey(unitText)
    const range = text.match(refRange)
    if (range) {
      const low = exactNumber(range[1], lab, unitText)
      const high = exactNumber(range[2], lab, unitText)
      return sameUnit(range[3]) && low !== null && high !== null && low < high ? {low, high, lowOpen:false, highOpen:false} : null
    }
    const bound = text.match(refBound)
    if (!bound || !sameUnit(bound[3])) return null
    const limit = exactNumber(bound[2], lab, unitText)
    if (limit === null) return null
    const word = accentless(bound[1]).toLowerCase()
    const upper = /^(?:<|≤|inf|abaixo|ate)/.test(word)
    const open = !/^(?:<=|>=|≤|≥|ate)$/.test(word) && !/ ou /.test(word)
    return upper ? {low:null, high:limit, lowOpen:false, highOpen:open} : {low:limit, high:null, lowOpen:open, highOpen:false}
  }

  // Situe une valeur chiffrée par rapport à la référence du labo : 'low', 'high', 'in', ou null si on ne peut pas trancher.
  function judge(value, lab, unitText, reference) {
    const number = exactNumber(value, lab, unitText)
    const range = number === null ? null : referenceRange(reference, lab, unitText)
    if (!range) return null
    if (range.low !== null && (number < range.low || (range.lowOpen && number === range.low))) return 'low'
    if (range.high !== null && (number > range.high || (range.highOpen && number === range.high))) return 'high'
    return 'in'
  }

  // Nouvelle lecture d'un bilan déjà enregistré : résultats lus qui n'y figurent pas encore.
  // Une analyse déjà présente dans la même unité et à la même date est considérée comme lue, même si
  // sa valeur ou son nom ont été corrigés à la main : une correction n'est jamais doublée par l'original.
  function missing(existing, proposed) {
    const signature = item => [groupFor(item.name), unitKey(item.unit), item.date || ''].join('\u001f')
    const present = new Map()
    for (const item of existing) present.set(signature(item), (present.get(signature(item)) ?? 0) + 1)
    return proposed.filter(item => {
      const count = present.get(signature(item)) ?? 0
      if (count) present.set(signature(item), count - 1)
      return !count
    })
  }

  globalThis.Lab = {markers, fold, groupFor, nameFor, validDate, unitKey, exactNumber, pagesFromText, parse, missing, referenceRange, judge}
})()

