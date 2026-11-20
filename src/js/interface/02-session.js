  function download(blob, filename) {
    const url = URL.createObjectURL(blob)
    urls.add(url)
    const link = el('a')
    link.href = url
    link.download = Coffre.safeName(filename)
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => {
      URL.revokeObjectURL(url)
      urls.delete(url)
    }, 15000)
  }

  function refreshStatus() {
    if (!session) return
    const label = $('disk-state')
    label.classList.toggle('pending', session.dirty)
    label.textContent = session.dirty ? 'Modifications à enregistrer' : 'Coffre enregistré'
    $('save-vault').disabled = busy || !session.dirty
    $('lock-vault').disabled = busy
  }

  function touch() {
    if (!session) return
    graceUsed = false
    clearTimeout(timer)
    timer = setTimeout(idleLock, idleMs)
  }

  // Un brouillon en cours obtient un seul délai supplémentaire, annoncé, avant le verrouillage.
  function idleLock() {
    if (draft?.changed && !graceUsed) {
      graceUsed = true
      notice('editor-message', 'Coffre inactif : il se verrouillera dans dix minutes et ce brouillon sera perdu. Ajoutez le document au dossier pour le conserver.', 'warn')
      timer = setTimeout(idleLock, idleMs)
      return
    }
    void lock()
  }

  function activity() {
    const now = Date.now()
    if (now - lastActivity < 2000) return
    lastActivity = now
    touch()
  }

  function showAccess(mode = '') {
    accessMode = mode
    $('app').hidden = true
    $('accueil').hidden = false
    $('access-form').hidden = !mode
    $('access-choices').hidden = Boolean(mode)
    $('resume').hidden = !lockedCopy
    $('confirm-password').hidden = mode !== 'create'
    $('passphrase-again').required = mode === 'create'
    $('access-heading').textContent = mode === 'create' ? 'Créer le coffre' : 'Ouvrir mon dossier'
    $('access-subtitle').textContent = mode === 'open' ? 'Saisissez la phrase secrète de votre coffre.' :
      mode === 'create' ? 'Choisissez la phrase secrète qui protégera vos dossiers.' :
      'Sélectionnez un fichier .sante ou créez un coffre.'
    $('access-submit').textContent = mode === 'create' ? 'Créer mon coffre' : 'Déverrouiller'
    $('access-form').reset()
    $('open-file').value = ''
    notice('access-message')
    if (mode) $('passphrase').focus()
    else if (lockedCopy?.dirty) notice('access-message', 'Des modifications sont en attente. Déverrouillez le coffre en cours pour les enregistrer.', 'warn')
  }

  function canReplaceSession() {
    return !lockedCopy?.dirty || confirm('Abandonner les modifications non enregistrées du coffre en cours ?')
  }

  async function openSelected(blob, handle = null) {
    await Coffre.inspect(blob)
    pendingOpen = {blob, handle, header:null, dirty:false}
    showAccess('open')
  }

  $('choose-vault').addEventListener('click', async () => {
    if (!canReplaceSession()) return
    if (typeof window.showOpenFilePicker !== 'function') {
      $('open-file').click()
      return
    }
    try {
      const [handle] = await window.showOpenFilePicker({types:vaultTypes})
      await openSelected(await handle.getFile(), handle)
    } catch (error) {
      if (error.name === 'AbortError') return
      if (error.name === 'SecurityError' || error.name === 'NotSupportedError') $('open-file').click()
      else notice('access-message', error.message, 'error')
    }
  })
  $('open-file').addEventListener('change', async event => {
    const [file] = event.target.files
    if (!file) return
    try { await openSelected(file) } catch (error) { notice('access-message', error.message, 'error') }
  })
  $('resume').addEventListener('click', () => {
    pendingOpen = lockedCopy
    showAccess('open')
  })
  $('new-vault').addEventListener('click', () => {
    if (canReplaceSession()) showAccess('create')
  })
  $('access-back').addEventListener('click', () => {
    if (accessBusy) return
    pendingOpen = null
    showAccess()
  })
  $('access-form').addEventListener('submit', async event => {
    event.preventDefault()
    if (accessBusy) return
    const passphrase = $('passphrase').value
    const creating = accessMode === 'create'
    if (creating && ([...passphrase].length < 15 || !passphrase.trim())) {
      notice('access-message', 'Choisissez une phrase secrète d’au moins 15 caractères.', 'warn')
      return
    }
    if (creating && passphrase !== $('passphrase-again').value) {
      notice('access-message', 'Les deux phrases secrètes diffèrent.', 'warn')
      return
    }
    accessBusy = true
    $('access-submit').disabled = true
    notice('access-message', creating ? 'Création du coffre…' : 'Ouverture du coffre…')
    try {
      if (creating) {
        const salt = Coffre.freshSalt()
        const key = await Coffre.derive(passphrase, salt)
        session = {key, salt, records:[], handle:null, header:null, dirty:true, current:null}
      } else {
        const selected = pendingOpen
        if (!selected) throw Error('Sélectionnez un coffre.')
        const loaded = await Coffre.open(selected.blob, passphrase)
        session = {
          ...loaded, handle:selected.handle, dirty:selected.dirty, current:selected.blob,
          header:selected.dirty ? selected.header : loaded.header,
        }
      }
      $('access-form').reset()
      pendingOpen = null
      lockedCopy = null
      $('accueil').hidden = true
      $('app').hidden = false
      metric = unit = ''
      notice('app-message')
      show('home')
      touch()
    } catch (error) {
      notice('access-message', error.message, 'error')
      $('passphrase').select()
    } finally {
      accessBusy = false
      $('access-submit').disabled = false
    }
  })

  // Renvoie true si le coffre a été écrit ou téléchargé. `auto` : enregistrement déclenché par une
  // modification ; `rekey` : nouvelle clé, adoptée seulement si l'écriture réussit ; `prefix` : début du message.
  async function save({copy = false, forceDownload = false, auto = false, rekey = null, prefix = ''} = {}) {
    if (busy || !session || (!session.dirty && !copy && !rekey)) return false
    busy = true
    refreshStatus()
    const say = (...parts) => parts.filter(Boolean).join(' ')
    try {
      let handle = copy ? null : session.handle
      let expected = handle ? session.header : null
      if (!handle && !forceDownload && typeof window.showSaveFilePicker === 'function') {
        try {
          handle = await window.showSaveFilePicker({types:vaultTypes, suggestedName:copy ? 'Dossier-sante-sauvegarde.sante' : 'Dossier-sante.sante'})
          if (session.handle && await handle.isSameEntry(session.handle)) expected = session.header
        } catch (error) {
          if (error.name === 'AbortError') return false
          if (error.name !== 'SecurityError' && error.name !== 'NotSupportedError') throw error
        }
      }
      if (handle && typeof handle.requestPermission === 'function') {
        const status = await handle.requestPermission({mode:'readwrite'})
        if (status !== 'granted') throw Error('Accès en écriture refusé. Téléchargez une copie chiffrée depuis la section Coffre.')
      }
      const key = rekey?.key ?? session.key
      const salt = rekey?.salt ?? session.salt
      const sealed = await Coffre.seal(key, salt, session.records)
      const sameFile = handle && session.handle && await handle.isSameEntry(session.handle)
      if (handle) await Coffre.writeFile(handle, sealed, expected)
      else download(sealed.blob, copy ? 'Dossier-sante-sauvegarde.sante' : 'Dossier-sante.sante')
      // Une copie téléchargée ne remplace le coffre de travail que si aucun fichier n'est ouvert :
      // sinon le fichier d'origine resterait périmé tout en paraissant enregistré.
      const adopted = !copy || sameFile || (session.dirty && !handle && !session.handle)
      if (adopted) session = {...session, key, salt, handle, header:sealed.header, dirty:false, current:sealed.blob}
      const message = handle ? (copy && !sameFile ? 'Copie chiffrée enregistrée.' : 'Coffre enregistré.') :
        adopted ? 'Fichier .sante chiffré téléchargé. Utilisez cette version à la prochaine ouverture.' :
        session.dirty ? 'Copie chiffrée téléchargée avec vos modifications en cours. Le fichier du coffre ouvert reste à enregistrer.' :
        'Copie chiffrée téléchargée.'
      // Une écriture réussie dans le fichier du coffre lève la suspension de l'enregistrement automatique.
      const resumed = autosaveSuspended && adopted && Boolean(handle)
      if (resumed) autosaveSuspended = false
      notice('app-message', say(prefix, message, resumed && autosave && 'L’enregistrement automatique reprend.'))
      if (view === 'vault') renderVault()
      return true
    } catch (error) {
      if (rekey) throw error
      if (auto) autosaveSuspended = true
      notice('app-message', say(prefix, error.message,
        auto && 'L’enregistrement automatique est suspendu : utilisez « Enregistrer le coffre ».'), 'error')
      if (auto && view === 'vault') renderVault()
      return false
    } finally {
      busy = false
      touch()
      refreshStatus()
    }
  }

  // Après chaque modification du dossier : écriture immédiate si le coffre est lié à un fichier.
  function afterChange(text) {
    session.dirty = true
    refreshStatus()
    if (autosave && !autosaveSuspended && session.handle) void save({auto:true, prefix:text})
    else notice('app-message', text + ' Enregistrez le coffre pour conserver cette modification.')
  }

  async function lock() {
    if (!session) return
    if (busy) { touch(); return }
    busy = true
    refreshStatus()
    try {
      const blob = session.dirty ? (await Coffre.seal(session.key, session.salt, session.records)).blob : session.current
      lockedCopy = {blob, handle:session.handle, header:session.header, dirty:session.dirty}
      clearTimeout(timer)
      if ($('editor').open) $('editor').close()
      if ($('record').open) $('record').close()
      if ($('rekey').open) $('rekey').close()
      if ($('viewer').open) $('viewer').close()
      closeViewer()
      clearCharts()
      clearEditor()
      $('record-body').replaceChildren()
      $('record-actions').replaceChildren()
      $('record-title').textContent = ''
      $('view').replaceChildren()
      notice('app-message')
      for (const url of urls) URL.revokeObjectURL(url)
      urls = new Set()
      session = null
      pendingOpen = null
      rereading = null
      metric = unit = ''
      showAccess()
    } catch (error) {
      notice('app-message', 'Verrouillage impossible. ' + error.message, 'warn')
      touch()
    } finally {
      busy = false
      refreshStatus()
    }
  }

  window.addEventListener('beforeunload', event => {
    if (session?.dirty || lockedCopy?.dirty || draft?.changed) {
      event.preventDefault()
      event.returnValue = true
    }
  })
  for (const event of ['pointerdown', 'keydown', 'input']) document.addEventListener(event, touch, {passive:true})
  // Lire, défiler ou bouger la souris compte aussi comme une présence.
  for (const event of ['pointermove', 'wheel', 'touchmove']) document.addEventListener(event, activity, {passive:true})
  document.addEventListener('scroll', activity, {passive:true, capture:true})
  // Un fichier déposé à côté de la zone prévue ne doit pas remplacer l'application par ce fichier.
  for (const event of ['dragover', 'drop']) window.addEventListener(event, item => item.preventDefault())
  $('save-vault').addEventListener('click', () => { void save() })
  $('lock-vault').addEventListener('click', lock)
  $('navigation').addEventListener('click', event => {
    const item = event.target.closest('[data-nav]')
    if (item) show(item.dataset.nav)
  })
  for (const close of document.querySelectorAll('[data-close]')) {
    close.addEventListener('click', () => {
      const dialog = $(close.dataset.close)
      if (dialog.id === 'editor' && draft?.changed && !confirm('Fermer sans ajouter les modifications au dossier ?')) return
      if (dialog.id === 'rekey' && rekeyBusy) return
      dialog.close()
      if (dialog.id === 'viewer') closeViewer()
    })
  }

