  function renderLabs() {
    const head = pageHeader('Résultats', 'Consultez la dernière mesure et l’historique d’un paramètre.',
      button('Importer un bilan', () => openEditor('bio'), 'primary'))
    const groups = [...allGroups().values()].sort((a,b) => a.name.localeCompare(b.name, 'fr'))
    const panel = el('section', 'panel stack')
    const docs = el('section', 'panel')
    section(docs, 'Comptes rendus de laboratoire')
    docs.append(listRecords(session.records.filter(item => item.kind === 'bio').sort(chronological), 'Vos bilans importés apparaîtront ici.'))
    $('view').replaceChildren(head, panel, el('div', 'small', '\u00a0'), docs)
    if (!groups.length) {
      panel.append(empty('Ajoutez un bilan avec des résultats pour consulter vos courbes.'))
      return
    }
    const filters = el('div', 'filter-bar')
    const find = el('input')
    find.type = 'search'
    find.placeholder = 'Ferritine, créatinine, TSH…'
    const choose = el('select')
    filters.append(inputField('Rechercher un paramètre', find), inputField('Paramètre suivi', choose))
    const summary = el('div', 'stack')
    panel.append(filters, summary)
    function renderGroup() {
      clearCharts()
      const group = groups.find(value => value.key === choose.value)
      summary.replaceChildren()
      if (!group) { summary.append(empty('Aucun paramètre ne correspond à la recherche.')); return }
      // Nouveau paramètre : aucune unité choisie (null), à ne pas confondre avec la série sans unité ('').
      if (metric !== group.key) { metric = group.key; unit = null }
      const items = [...group.entries].sort(chronological)
      const byUnit = new Map()
      for (const item of items) {
        const key = Lab.unitKey(item.unit)
        if (!byUnit.has(key)) byUnit.set(key, [])
        byUnit.get(key).push(item)
      }
      // Par défaut, la série de la mesure la plus récente.
      if (unit === null || !byUnit.has(unit)) unit = Lab.unitKey(items[0].unit)
      const series = byUnit.get(unit)
      const latest = series[0]
      const headline = el('div', 'result-title')
      headline.append(el('h2', '', group.name), valueCell(latest, latest.document.lab, 'latest'))
      const lastDate = el('p', 'muted small', 'Dernière mesure de cette série le ' + formatDate(latest.date) + ' · ' + describe(latest.document))
      summary.append(headline, lastDate)
      if (byUnit.size > 1) {
        const chooseUnit = el('select')
        for (const [key, list] of byUnit) chooseUnit.add(option(key, (key || 'Sans unité') + ' · ' + list.length))
        chooseUnit.value = unit
        chooseUnit.addEventListener('change', () => { unit = chooseUnit.value; renderGroup() })
        summary.append(inputField('Unité de la courbe', chooseUnit))
      }
      const chartable = series.some(item => Lab.exactNumber(item.value, item.document.lab, item.unit) !== null)
      if (chartable) {
        const card = el('div', 'chart-card')
        const canvas = el('canvas', 'chart')
        canvas.setAttribute('role', 'img')
        canvas.setAttribute('aria-label', 'Évolution de ' + group.name + '. Les valeurs figurent dans le tableau suivant.')
        card.append(canvas, el('p', 'small muted plot-meta', 'Les valeurs précédées d’un signe < ou > et les résultats qualitatifs restent consultables dans le tableau.'))
        summary.append(card)
        drawChart(canvas, series, unit)
      }
      summary.append(table(['Prélèvement', 'Résultat', 'Référence du labo', 'Compte rendu'], series.map(item => [
        formatDate(item.date),
        valueCell(item, item.document.lab),
        item.reference || '—',
        button(describe(item.document) + (item.page ? ' · p. ' + item.page : ''), () => openRecord(item.document.id), 'link-button'),
      ])))
      if (series.some(item => outOfRange(stateOf(item, item.document.lab)))) summary.append(el('p', 'small muted', flagNote))
    }
    function findGroup() {
      const query = Lab.fold(find.value)
      const matching = groups.filter(item => matchesQuery(item, query))
      choose.replaceChildren(...matching.map(item => option(item.key, item.name)))
      if (matching.some(item => item.key === metric)) choose.value = metric
      renderGroup()
    }
    find.addEventListener('input', findGroup)
    choose.addEventListener('change', renderGroup)
    findGroup()
  }

  function renderVault() {
    const head = pageHeader('Coffre', 'Gérez le fichier chiffré et ses sauvegardes.')
    const grid = el('div', 'vault-grid')
    const device = el('section', 'panel')
    device.append(el('h2', '', 'Fichier du coffre'), el('p', 'muted', session.handle ?
      'Enregistrez les modifications dans le fichier .sante ouvert.' :
      'Utilisez « Enregistrer le coffre » pour créer ou mettre à jour votre fichier .sante.'),
      el('p', 'small muted', 'Documents joints · ' + formatBytes(session.records.reduce((total, record) => total + (record.file?.bytes.length ?? 0), 0)) + ' sur 150 Mo pour le coffre.'))
    if (session.handle) {
      const toggle = el('label', 'check-line')
      const box = el('input')
      box.type = 'checkbox'
      box.checked = autosave && !autosaveSuspended
      box.addEventListener('change', () => {
        autosave = box.checked
        autosaveSuspended = false
        if (autosave && session?.dirty) void save({auto:true})
      })
      toggle.append(box, el('span', '', 'Enregistrer automatiquement après chaque modification'))
      device.append(toggle)
    } else {
      device.append(el('p', 'small muted', 'L’enregistrement automatique s’active dès que le coffre est lié à un fichier, dans Edge ou Chrome.'))
    }
    const copies = el('section', 'panel')
    copies.append(el('h2', '', 'Sauvegarde'), el('p', 'muted', 'Conservez une copie dans un second emplacement. Vous pourrez la rouvrir avec la phrase secrète en vigueur au moment de la copie.'), backup())
    const secret = el('section', 'panel')
    secret.append(el('h2', '', 'Phrase secrète'), el('p', 'muted', 'Remplacez la phrase qui protège le coffre. La phrase actuelle vous sera demandée.'),
      button('Changer la phrase secrète', openRekey))
    const application = el('section', 'panel')
    application.append(el('h2', '', 'Application'), el('p', 'muted', !appVersion ? 'Version non indiquée.' : online ?
      'Version ' + appVersion + ', ouverte en ligne depuis ' + location.host + '. Le coffre reste sur cet appareil.' :
      'Version ' + appVersion + ', ouverte depuis un fichier de cet appareil.'))
    if (updateUrl) application.append(updateLink(el('a', 'secondary link-button')))
    else application.append(el('p', 'small muted', 'Pour mettre à jour, téléchargez la nouvelle version là où vous avez obtenu ce fichier.'))
    application.append(el('p', 'small muted', online ?
      'La page d’accueil du site mène toujours à la dernière version. Une version téléchargée s’ouvre depuis votre disque, sans connexion.' :
      'Une mise à jour ne remplace que ce fichier HTML : ouvrez votre coffre .sante avec la nouvelle version. Gardez-la ensuite, car une version plus ancienne peut ne pas relire un coffre enregistré par une plus récente.'))
    grid.append(device, copies, secret, application, rereadPanel())
    const help = el('section', 'panel help-panel')
    help.append(el('h2', '', 'Chiffrement et import'),
      el('p', 'muted', 'Le fichier .sante contient les documents et les résultats chiffrés. L’application s’ouvre hors ligne, sans compte. Le coffre se verrouille après dix minutes d’inactivité.'),
      el('p', 'muted', 'L’extraction lit le texte des PDF. Pour un scan, ajoutez le fichier et saisissez les résultats à partir de l’original. Vous pouvez aussi coller le texte d’un bilan.'),
      el('p', 'muted', 'Le fichier .sante permet aussi de déplacer le dossier sur un autre appareil. La phrase secrète est nécessaire pour l’ouvrir.'))
    $('view').replaceChildren(head, grid, help)
  }

  // « Relire les bilans » : les PDF déjà importés sont relus avec la lecture de cette version. Rien n'est
  // ajouté d'office : chaque bilan qui a de nouveaux résultats s'ouvre dans l'éditeur, pour vérification.
  let rereading = null
  const pdfBilans = () => session.records.filter(record => record.kind === 'bio' && record.file && Coffre.isPDF(record.file.bytes))

  function rereadPanel() {
    const panel = el('section', 'panel')
    const total = pdfBilans().length
    const start = button('Relire les bilans', () => { void rereadAll() })
    start.disabled = !total || Boolean(rereading?.running)
    const status = el('p', 'small muted')
    status.setAttribute('role', 'status')
    panel.append(el('h2', '', 'Relire les bilans'), el('p', 'muted', 'Une nouvelle version peut reconnaître des analyses que la précédente laissait de côté. ' +
      'Les PDF de vos bilans sont relus sur cet appareil, et les nouveaux résultats vous sont proposés bilan par bilan, à vérifier avant de les ajouter.'),
      start, status)
    if (!total) {
      status.textContent = 'Aucun bilan avec un PDF dans le dossier.'
      return panel
    }
    const state = rereading?.session === session ? rereading : null
    if (!state) return panel
    if (state.running) {
      status.textContent = 'Lecture du bilan ' + Math.min(state.done + 1, state.total) + ' sur ' + state.total + '…'
      return panel
    }
    // Ce qui a été ajouté depuis (bilan vérifié, ligne saisie à la main) ne compte plus comme nouveau.
    const pending = state.found.map(entry => {
      const record = session.records.find(item => item.id === entry.id)
      return record && {record, entry, rows:Lab.missing(record.results, entry.rows)}
    }).filter(item => item?.rows.length)
    const failed = state.failed === 1 ? ' Un PDF n’a pas pu être lu.' : state.failed ? ' ' + state.failed + ' PDF n’ont pas pu être lus.' : ''
    status.textContent = pending.length ? (pending.length === 1 ? 'Un bilan a' : pending.length + ' bilans ont') + ' de nouveaux résultats à vérifier.' + failed :
      'Aucun nouveau résultat : ' + (state.total === 1 ? 'le bilan relu est à jour.' : 'les ' + state.total + ' bilans relus sont à jour.') + failed
    if (pending.length) {
      const list = el('ul', 'reread-list')
      for (const {record, entry, rows} of pending) {
        const line = el('li')
        line.append(el('span', '', record.title + ' · ' + formatDate(record.date) + ' · ' + rows.length + ' nouveau(x) résultat(s)'),
          button('Vérifier et ajouter', () => openEditor('bio', record, {rows, lab:entry.lab, omissions:entry.omissions}), 'secondary compact'))
        list.append(line)
      }
      panel.append(list)
    }
    return panel
  }

  async function rereadAll() {
    if (busy || !session || rereading?.running) return
    const owner = session
    const records = pdfBilans()
    const state = rereading = {session:owner, running:true, total:records.length, done:0, failed:0, found:[]}
    if (view === 'vault') renderVault()
    try {
      for (const record of records) {
        try {
          const proposed = Lab.parse(await PdfLocal.extract(record.file.bytes), record.lab === 'other' ? 'auto' : record.lab)
          const rows = Lab.missing(record.results, proposed.rows)
          if (rows.length) state.found.push({id:record.id, rows, lab:proposed.lab, omissions:omissionsOf(proposed)})
        } catch {
          state.failed++
        }
        if (session !== owner) return
        state.done++
        if (view === 'vault') renderVault()
      }
    } finally {
      state.running = false
      if (session === owner && view === 'vault') renderVault()
    }
  }

  function openRekey() {
    if (busy || !session) return
    $('rekey-form').reset()
    notice('rekey-message')
    $('rekey').showModal()
  }
  $('rekey').addEventListener('cancel', event => {
    if (rekeyBusy) event.preventDefault()
  })
  $('rekey').addEventListener('close', () => {
    $('rekey-form').reset()
    notice('rekey-message')
  })
  $('rekey-form').addEventListener('submit', async event => {
    event.preventDefault()
    if (rekeyBusy || busy || !session) return
    const current = $('rekey-current').value
    const next = $('rekey-new').value
    if ([...next].length < 15 || !next.trim()) {
      notice('rekey-message', 'Choisissez une nouvelle phrase secrète d’au moins 15 caractères.', 'warn')
      return
    }
    if (next !== $('rekey-again').value) {
      notice('rekey-message', 'Les deux saisies de la nouvelle phrase diffèrent.', 'warn')
      return
    }
    if (next === current) {
      notice('rekey-message', 'La nouvelle phrase est identique à l’actuelle.', 'warn')
      return
    }
    rekeyBusy = true
    $('rekey-submit').disabled = true
    notice('rekey-message', 'Vérification de la phrase actuelle…')
    try {
      // L'autorisation d'écriture se demande tout de suite, tant que le clic est récent.
      if (typeof session.handle?.requestPermission === 'function' &&
          await session.handle.requestPermission({mode:'readwrite'}) !== 'granted') {
        throw Error('Accès en écriture au fichier du coffre refusé.')
      }
      const candidate = await Coffre.derive(current, session.salt)
      if (!session) return
      if (!await Coffre.sameKey(session.key, candidate)) throw Error('La phrase secrète actuelle est incorrecte.')
      notice('rekey-message', 'Chiffrement du coffre avec la nouvelle phrase…')
      const salt = Coffre.freshSalt()
      const key = await Coffre.derive(next, salt)
      if (!session) return
      // La nouvelle clé n'est adoptée que si le coffre a été écrit avec elle : jamais d'état intermédiaire.
      if (await save({rekey:{key, salt}, prefix:'Phrase secrète changée.'})) $('rekey').close()
      else notice('rekey-message', 'Changement annulé : le coffre n’a pas été enregistré et l’ancienne phrase reste valable.', 'warn')
    } catch (error) {
      notice('rekey-message', error.message + ' L’ancienne phrase reste valable.', 'error')
    } finally {
      rekeyBusy = false
      $('rekey-submit').disabled = false
    }
  })

