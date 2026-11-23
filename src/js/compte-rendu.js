(() => {
  'use strict'

  // Lecture d'un compte rendu (imagerie, consultation, examen) : examen, date, indication, conclusion,
  // médecin demandeur, praticien et lieu. Tout est proposé à la personne, qui vérifie avec l'original.
  // Les données d'identité du patient (nom, date de naissance…) ne sont jamais reprises.

  const limits = Coffre.fieldRules.imaging

  // Minuscules sans accents, même longueur que l'original : une position trouvée ici vaut dans la ligne d'origine.
  const plain = line => line.split('').map(char => char.normalize('NFD')[0].toLowerCase()[0]).join('')
  const clean = value => String(value ?? '').replace(/[  \t]/g, ' ').replace(/ {2,}/g, ' ').trim()

  const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
  const datePattern = new RegExp(String.raw`(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4}|\d{2})\b|(\d{1,2})(?:er)?\s+(` + months.join('|') + String.raw`)\s+(\d{4})`)
  function dateIn(text) {
    const m = plain(text).match(datePattern)
    if (!m) return ''
    let [day, month, year] = m[1] ? [m[1], m[2], m[3]] : [m[4], String(months.indexOf(m[5]) + 1), m[6]]
    if (year.length === 2) year = (Number(year) > 50 ? '19' : '20') + year
    const iso = year + '-' + month.padStart(2, '0') + '-' + day.padStart(2, '0')
    return Lab.validDate(iso) ? iso : ''
  }

  // Lignes qui parlent du patient ou d'un autre document : jamais une date d'examen.
  const identity = /naissance|\bnee? le\b|\bddn\b|\bage\b|\bnir\b|securite sociale|\bipp\b|imprime|edite le|\bedition\b/
  const weekday = String.raw`(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+`
  // Du plus explicite au moins sûr : le premier motif qui trouve une date l'emporte.
  const dateRules = [
    new RegExp(String.raw`\bdate (?:de l['’ ]?|d['’ ]?|du |de )?(?:examen|exam|consultation|intervention|hospitalisation|realisation|acte)\b`),
    /\b(?:examen|consultation|intervention|acte) (?:realisee? |pratiquee? |effectuee? )?(?:du|le)\b|\b(?:realise|pratique|effectue|vue?) le\b|\bvue? en consultation le\b/,
    new RegExp(String.raw`(?:^|, )le (?:` + weekday + String.raw`)?\d`),
    /\b(?:valide|signe)e? (?:electroniquement )?le\b/,
  ]

  const imagingStart = /^(?:echo\w*|doppler|radio\w*|scanner|uro ?scanner|angio\s?\w*|arthro\s?\w*|tomodensitometrie|tdm|irm|imagerie par resonance|mammographie|osteodensitometrie|densitometrie|scintigraphie|tep\b|pet\b|panoramique dentaire|cone beam|cystographie|hysterosalpingographie|elastographie|fibroscan)/
  const reportStart = /^(?:compte ?rendu|cr (?:de |d )|consultation|lettre de sortie|courrier|endoscopie|fibroscopie|gastroscopie|coloscopie|electrocardiogramme|ecg\b|epreuve d effort|holter|exploration fonctionnelle|efr\b|polysomnographie|electromyogramme|emg\b|eeg\b|bilan urodynamique)/
  const notTitle = /•|\||centre|cabinet|clinique|hopital|polyclinique|service|groupe|\btel\b|telephone|fax|www|@|avenue|\brue\b|boulevard|docteur|\bdr\b|materiel|appareil|valide|realise par|a la demande|indication/

  // Titres de section : la ligne entière est le titre, éventuellement suivie de « : » et d'un texte.
  const headings = [
    ['indication', /^(?:indications?|motif(?: de l ?examen| de (?:la )?consultation| de l ?hospitalisation)?|renseignements? cliniques?|contexte(?: clinique)?|histoire (?:clinique|de la maladie))\b/],
    ['conclusion', /^(?:conclusions?|au total|en conclusion|en resume|synthese|impression|avis)\b/],
    ['other', /^(?:technique|protocole|resultats?|description|observations?|constatations?|examen clinique|antecedents?|traitements?|comparaison|commentaires?)\b/],
  ]
  const closing = /^(?:(?:bien )?(?:confraternellement|cordialement)|(?:tres )?confraternellement|veuillez agreer|je vous (?:prie|remercie)|merci de (?:m ?avoir|votre)|avec mes|amities|signe|compte ?rendu (?:valide|signe|redige)|valide electroniquement|(?:dr|docteur|pr|professeur)\b)/

  function headingOf(line) {
    const text = plain(line).replace(/[^a-z0-9]+/g, ' ').trim()
    for (const [key, pattern] of headings) {
      const m = text.match(pattern)
      if (!m) continue
      // Un titre est court ; au-delà, c'est une phrase qui commence par ce mot (« Avis favorable pour… »).
      const colon = line.indexOf(':')
      const head = colon >= 0 ? line.slice(0, colon) : line
      if (plain(head).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').length > 6) continue
      if (colon < 0 && text.split(' ').length > 6) continue
      return {key, rest:colon >= 0 ? clean(line.slice(colon + 1)) : ''}
    }
    return null
  }

  // Majuscules → minuscules, sauf sigles connus ; première lettre en capitale.
  const acronyms = new Set(['irm', 'tdm', 'tep', 'orl', 'ecg', 'eeg', 'emg', 'efr', 'atm', 'asp', 'uiv', 'tsh', 'rx'])
  function sentenceCase(text) {
    if (/\p{Ll}/u.test(text)) return text
    const lower = text.toLowerCase().replace(/\p{L}+/gu, word => acronyms.has(plain(word)) ? word.toUpperCase() : word)
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  }

  // Texte d'une section : lignes jointes, une ligne à puce garde son retour à la ligne.
  function joinLines(lines, max) {
    let text = ''
    for (const line of lines) {
      const bullet = /^[-•–*]\s/.test(line)
      text += text ? (bullet ? '\n' : ' ') + line : line
    }
    if (text.length <= max) return text
    const cut = text.slice(0, max - 1)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('\n'))
    return (end > max / 2 ? cut.slice(0, end + 1) : cut).trimEnd() + '…'
  }

  // Ce qui suit une mention du patient dans une même cellule n'est jamais repris (colonnes trop proches pour être séparées).
  const patientMention = /[\s,;–-]+(?:patiente?|nee? le|date de naissance|nom de naissance|naissance|ddn|nir|ipp|securite sociale|nom\s*:|prenom)\b/
  const beforePatient = text => {
    const m = plain(text).match(patientMention)
    return m ? text.slice(0, m.index) : text
  }
  const patientStart = /^(?:mme |mlle |m\. |monsieur |madame )?(?:patiente?|nee? le|date de naissance|nom de naissance|naissance|ddn|nir|ipp|n° ?ss|securite sociale|nom\s*(?:d usage\s*)?:|prenom)\b/
  const doctor = /^(?:(?:dr|docteur|pr|professeur)\.?\s+)/i
  const shortDoctor = text => clean(beforePatient(clean(text))).replace(doctor, match => /^p/i.test(match) ? 'Pr ' : 'Dr ')
    .replace(/\s*[-–,]\s*(?:rpps\s*:?\s*)?\d{8,}.*$/i, '').replace(/[.,;:\s]+$/, '')

  function read(pages) {
    // Chaque ligne garde ses cellules : la lecture du PDF sépare par une tabulation les colonnes d'une même ligne.
    // Médecins et lieu ne sont cherchés que dans une cellule, jamais dans la colonne voisine (celle du patient).
    const all = pages.flatMap(page => page.lines.map(raw => ({
      line:clean(raw), cells:String(raw ?? '').split('\t').map(clean).filter(Boolean),
    }))).filter(row => row.line)
    if (!all.length) return null
    // Lignes répétées sur plusieurs pages : en-têtes et pieds de page, jamais du contenu.
    const seen = new Map()
    for (const page of pages) for (const line of new Set(page.lines.map(clean))) seen.set(line, (seen.get(line) ?? 0) + 1)
    const rows = pages.length > 1 ? all.filter(row => seen.get(row.line) < Math.min(pages.length, 3)) : all
    const lines = rows.map(row => row.line)
    const cells = rows.flatMap(row => row.cells)
    // Titre, indication et conclusion : chaque cellule s'arrête avant une mention du patient, et une cellule
    // qui commence par l'identité du patient (colonne voisine) est écartée.
    const texts = rows.map(row => clean(row.cells.map(cell => clean(beforePatient(cell)))
      .filter(cell => cell && !patientStart.test(plain(cell))).join(' ')))

    const found = {title:'', kind:'', date:'', fields:{}}

    // Examen : première ligne courte qui commence par un examen connu ; une ligne en majuscules est préférée.
    const candidates = []
    for (const [index, line] of texts.slice(0, 80).entries()) {
      if (!line) continue
      const text = plain(line).replace(/[^a-z0-9]+/g, ' ').trim()
      if (line.length > 100 || notTitle.test(plain(line)) || headingOf(line)) continue
      const kind = imagingStart.test(text) ? 'imaging' : reportStart.test(text) ? 'report' : ''
      if (kind) candidates.push({index, line, kind, upper:!/\p{Ll}/u.test(line)})
    }
    const title = candidates.find(item => item.upper) ?? candidates[0]
    if (title) {
      found.title = sentenceCase(title.line.replace(/[\s:.]+$/, '')).slice(0, 160)
      found.kind = title.kind
    }

    for (const rule of dateRules) {
      const line = lines.find(item => { const text = plain(item); return !identity.test(text) && rule.test(text) && dateIn(item) })
      if (line) { found.date = dateIn(line); break }
    }

    // Sections : indication et conclusion, jusqu'au titre suivant ou à la formule de politesse.
    let section = null
    const parts = {indication:[], conclusion:[]}
    for (const line of texts) {
      if (!line) continue
      const heading = headingOf(line)
      if (heading) {
        section = heading.key === 'other' || parts[heading.key].length ? null : heading.key
        if (section && heading.rest) parts[section].push(heading.rest)
        continue
      }
      if (!section) continue
      if (closing.test(plain(line))) { section = null; continue }
      if (parts[section].length >= 20) { section = null; continue }
      parts[section].push(line)
    }
    for (const key of ['indication', 'conclusion']) {
      if (parts[key].length) found.fields[key] = joinLines(parts[key], limits[key])
    }

    // Médecin demandeur.
    for (const line of cells) {
      const m = plain(line).match(/\b(?:a la demande d[ue]|demande par|adresse(?:e)? par|prescrit(?:e)? par|prescripteur\s*:|medecin prescripteur\s*:|medecin traitant\s*:)\s*/)
      if (!m) continue
      const name = shortDoctor(line.slice(m.index + m[0].length))
      if (name) { found.fields.prescriber = name.slice(0, limits.prescriber); break }
    }

    // Praticien : la signature (dernier médecin cité) ou, à défaut, celui de l'en-tête.
    const prescriberKey = plain(found.fields.prescriber ?? '').replace(/^dr /, '')
    const doctors = cells.filter(line => doctor.test(line) && line.length <= 80 && !/demande|adress|prescri|traitant/.test(plain(line)))
      .map(shortDoctor).filter(name => name.split(' ').length >= 2 && (!prescriberKey || !plain(name).includes(prescriberKey)))
    if (doctors.length) found.fields.practitioner = doctors.at(-1).slice(0, limits.practitioner)

    // Lieu : premier en-tête qui nomme un centre, un cabinet, une clinique… (sur deux lignes si besoin).
    place: for (const [index, row] of rows.slice(0, 15).entries()) {
      for (const cell of row.cells) {
        const line = clean(beforePatient(cell))
        if (!/^(?:centre|cabinet|clinique|polyclinique|hopital|ch[ u]|chu|institut|groupe|scm|selarl|imagerie|maison de sante|service)\b/.test(plain(line))) continue
        let place = line
        const next = rows[index + 1]?.cells[0]
        if (line === cell && /\b(?:de|du|des|d'|d’|de la|et|en|sur|au|aux)$/i.test(place) && next && !/\d/.test(next)) place += ' ' + clean(beforePatient(next))
        found.fields.place = place.replace(/[\s.,:;-]+$/, '').slice(0, limits.place)
        break place
      }
    }

    for (const [key, value] of Object.entries(found.fields)) if (!value) delete found.fields[key]
    return found.title || found.date || Object.keys(found.fields).length ? found : null
  }

  globalThis.CompteRendu = {read}
})()
