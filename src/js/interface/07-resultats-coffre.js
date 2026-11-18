  function renderLabs() {
    const head = pageHeader('Résultats', 'Consulte la dernière mesure et l’historique d’un paramètre.',
      button('Importer un bilan', () => openEditor('bio'), 'primary'))
    const groups = [...allGroups().values()].sort((a,b) => a.name.localeCompare(b.name, 'fr'))
    const panel = el('section', 'panel stack')
    const docs = el('section', 'panel')
    section(docs, 'Comptes rendus de laboratoire')
    docs.append(listRecords(session.records.filter(item => item.kind === 'bio').sort(chronological), 'Tes bilans importés apparaîtront ici.'))
    $('view').replaceChildren(head, panel, el('div', 'small', '\u00a0'), docs)
    if (!groups.length) {
      panel.append(empty('Ajoute un bilan avec des résultats pour consulter tes courbes.'))
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
    const head = pageHeader('Coffre', 'Gère le fichier chiffré et ses sauvegardes.')
    const grid = el('div', 'vault-grid')
    const device = el('section', 'panel')
    device.append(el('h2', '', 'Fichier du coffre'), el('p', 'muted', session.handle ?
      'Enregistre les modifications dans le fichier .sante ouvert.' :
      'Utilise « Enregistrer le coffre » pour créer ou mettre à jour ton fichier .sante.'),
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
    copies.append(el('h2', '', 'Sauvegarde'), el('p', 'muted', 'Conserve une copie dans un second emplacement. Tu peux la rouvrir avec la phrase secrète en vigueur au moment de la copie.'), backup())
    const secret = el('section', 'panel')
    secret.append(el('h2', '', 'Phrase secrète'), el('p', 'muted', 'Remplace la phrase qui protège le coffre. La phrase actuelle te sera demandée.'),
      button('Changer la phrase secrète', openRekey))
    const application = el('section', 'panel')
    application.append(el('h2', '', 'Application'), el('p', 'muted', !appVersion ? 'Version non indiquée.' : online ?
      'Version ' + appVersion + ', ouverte en ligne depuis ' + location.host + '. Le coffre reste sur cet appareil.' :
      'Version ' + appVersion + ', ouverte depuis un fichier de cet appareil.'))
    if (updateUrl) application.append(updateLink(el('a', 'secondary link-button')))
    else application.append(el('p', 'small muted', 'Pour mettre à jour, télécharge la nouvelle version là où tu as obtenu ce fichier.'))
    application.append(el('p', 'small muted', online ?
      'La page d’accueil du site mène toujours à la dernière version. Une version téléchargée s’ouvre depuis ton disque, sans connexion.' :
      'Une mise à jour ne remplace que ce fichier HTML : ouvre ton coffre .sante avec la nouvelle version. Garde-la ensuite, car une version plus ancienne peut ne pas relire un coffre enregistré par une plus récente.'))
    grid.append(device, copies, secret, application)
    const help = el('section', 'panel help-panel')
    help.append(el('h2', '', 'Chiffrement et import'),
      el('p', 'muted', 'Le fichier .sante contient les documents et les résultats chiffrés. L’application s’ouvre hors ligne, sans compte. Le coffre se verrouille après dix minutes d’inactivité.'),
      el('p', 'muted', 'L’extraction lit le texte des PDF. Pour un scan, ajoute le fichier et saisis les résultats à partir de l’original. Tu peux aussi coller le texte d’un bilan.'),
      el('p', 'muted', 'Le fichier .sante permet aussi de déplacer le dossier sur un autre appareil. La phrase secrète est nécessaire pour l’ouvrir.'))
    $('view').replaceChildren(head, grid, help)
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
      notice('rekey-message', 'Choisis une nouvelle phrase secrète d’au moins 15 caractères.', 'warn')
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

