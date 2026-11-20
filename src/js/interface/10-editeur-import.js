  // Adapte l'éditeur au type choisi : libellés du titre et de la date, champs propres à la fiche.
  function syncEditorKind(values = {}) {
    const kind = $('doc-kind').value
    const biology = kind === 'bio'
    const form = Dossier.forms[kind]
    $('lab-fields').hidden = !biology
    $('doc-title-label').textContent = form?.title ?? 'Titre'
    $('doc-title').placeholder = form?.example ?? 'Bilan du 12 mars, ordonnance, consultation…'
    $('doc-date-label').textContent = biology ? 'Date du prélèvement' : form?.date ?? 'Date du document'
    const extra = $('extra-fields')
    const fields = Dossier.fieldsFor(kind)
    extra.hidden = !fields.length
    extra.replaceChildren(...fields.map(([key, label, type, example]) => {
      const input = el(typeof type === 'object' ? 'select' : type === 'textarea' ? 'textarea' : 'input')
      input.dataset.extra = key
      if (typeof type === 'object') {
        for (const [value, text] of Object.entries(type)) input.add(option(value, text))
      } else if (type === 'date') {
        input.type = 'date'
        input.min = '1900-01-01'
        input.max = '2199-12-31'
      } else if (type === 'number') {
        input.inputMode = 'decimal'
        input.maxLength = 8
        input.autocomplete = 'off'
        if (example) input.placeholder = 'ex. ' + example
      } else {
        input.maxLength = Coffre.fieldRules[kind][key]
        if (type === 'textarea') input.rows = 3
        if (example) input.placeholder = example
      }
      input.value = values[key] ?? ''
      const wrapper = inputField(type === 'number' ? label + ' (' + Dossier.metrics[key].unit + ')' : label, input)
      if (type === 'textarea') wrapper.classList.add('full')
      return wrapper
    }))
    updateAttachmentUI()
  }

  function clearEditor() {
    draft = null
    $('editor-form').reset()
    $('attachment-name').textContent = ''
    $('editor-title').textContent = ''
    $('result-editor').replaceChildren()
    $('extra-fields').replaceChildren()
    notice('editor-message')
    notice('import-message')
    notice('report-message')
  }

  // `additions` : résultats trouvés par « Relire les bilans », ajoutés aux lignes existantes pour vérification.
  function openEditor(kind, existing = null, additions = null) {
    if (busy || !session) return
    clearEditor()
    const form = Dossier.forms[kind]
    // Une fiche ouverte depuis la fiche santé garde son type, même si un PDF de bilan y est joint.
    draft = {id:existing?.id, file:existing?.file ?? null, proposed:false, changed:false, loading:false, kindChosen:Boolean(existing || form)}
    $('editor-title').textContent = existing ? (form ? 'Modifier la fiche' : 'Modifier le document') :
      kind === 'bio' ? 'Importer un bilan' : form?.add ?? 'Ajouter un document'
    $('editor-submit').textContent = existing ? 'Appliquer les modifications' : 'Ajouter au dossier'
    $('editor-submit').disabled = false
    $('doc-title').value = existing?.title ?? form?.defaultTitle ?? ''
    $('doc-kind').value = kind
    $('doc-date').value = existing?.date ?? (form ? Dossier.today() : '')
    $('doc-notes').value = existing?.notes ?? ''
    $('doc-lab').value = existing?.lab || 'auto'
    $('confirm-results').hidden = true
    for (const item of existing?.results ?? []) addResult(item)
    syncEditorKind(existing?.fields)
    if (additions) {
      if (existing?.lab === 'other' && additions.lab !== 'other') $('doc-lab').value = additions.lab
      showAdditions(additions.rows, additions.omissions ?? '')
    }
    $('editor').showModal()
  }
  $('editor').addEventListener('cancel', event => {
    if (draft?.changed && !confirm('Fermer sans ajouter les modifications au dossier ?')) event.preventDefault()
  })
  $('editor').addEventListener('close', () => {
    if (!$('editor').open) clearEditor()
  })
  $('record').addEventListener('close', () => {
    if ($('record').open) return
    $('record-body').replaceChildren()
    $('record-actions').replaceChildren()
    $('record-title').textContent = ''
  })
  $('editor-form').addEventListener('input', event => {
    if (!draft || event.target.id === 'checked-results' || event.target.id === 'source-file') return
    draft.changed = true
    if (event.target.closest('#result-editor') || ['doc-date', 'doc-lab'].includes(event.target.id)) $('checked-results').checked = false
  })
  $('doc-kind').addEventListener('change', () => {
    if (!draft) return
    draft.kindChosen = true
    // Les champs communs aux deux types (imagerie et compte rendu) gardent leur saisie.
    syncEditorKind(Object.fromEntries(Array.from($('extra-fields').querySelectorAll('[data-extra]'), input => [input.dataset.extra, input.value])))
    void readAttached()
  })
  $('doc-lab').addEventListener('change', () => { void readAttached() })
  $('source-choose').addEventListener('click', () => $('source-file').click())

  // Types dont le PDF est lu comme un compte rendu (examen, date, conclusion…) ; les fiches ne le sont pas.
  const readsReport = kind => kind === 'other' || Boolean(Dossier.documentFields[kind])

  function updateAttachmentUI() {
    if (!draft) return
    const pdf = draft.file && Coffre.isPDF(draft.file.bytes)
    const biology = $('doc-kind').value === 'bio'
    $('attachment-name').textContent = draft.file ?
      draft.file.name + (draft.loading && pdf ? ' · Lecture du PDF…' : '') :
      biology ? 'Choisissez un PDF avec du texte sélectionnable pour remplir les valeurs automatiquement.' :
      'PDF ou autre fichier, 30 Mo maximum.'
    $('source-choose').textContent = draft.file ? 'Changer de fichier' : 'Choisir un fichier'
    $('source-remove').hidden = !draft.file
    $('reread').hidden = !pdf || $('doc-kind').value !== 'bio'
    $('report-tools').hidden = !pdf || !readsReport($('doc-kind').value)
    $('read-report').disabled = draft.loading
    $('editor-submit').disabled = draft.loading
    $('doc-kind').disabled = draft.loading
    $('doc-lab').disabled = draft.loading
    $('source-choose').disabled = draft.loading
    $('source-remove').disabled = draft.loading
    $('reread').disabled = draft.loading
    $('parse-text').disabled = draft.loading
  }

  $('source-remove').addEventListener('click', () => {
    if (!draft || draft.loading) return
    draft.file = null
    draft.changed = true
    $('source-file').value = ''
    updateAttachmentUI()
  })

  async function importAttachment(file) {
    const active = draft
    if (!active || active.loading) return
    active.loading = true
    updateAttachmentUI()
    notice('editor-message')
    try {
      const attachment = await Coffre.attachment(file)
      if (draft !== active) return
      if (session.records.some(record => record.id !== active.id && record.file?.hash === attachment.hash)) {
        throw Error('Ce fichier original existe déjà dans le dossier.')
      }
      active.file = attachment
      active.changed = true
      notice('report-message')
      const kind = $('doc-kind').value
      const biology = kind === 'bio'
      const detectKind = !active.kindChosen && kind === 'other'
      if (Coffre.isPDF(attachment.bytes) && (biology ? !$('result-editor').children.length : readsReport(kind))) {
        updateAttachmentUI()
        await extractAttachment(active, detectKind)
        if (draft !== active) return
      } else if (biology && !Coffre.isPDF(attachment.bytes)) {
        notice('import-message', 'L’extraction automatique lit les PDF avec du texte. Vous pouvez saisir ou coller les valeurs pour ce fichier.', 'warn')
      }
      if (!$('doc-title').value) {
        $('doc-title').value = ($('doc-kind').value === 'bio' ? 'Bilan biologique' :
          attachment.name.replace(/\.[^.]+$/, '')).slice(0, 160)
      }
    } catch (error) {
      if (draft === active) notice('editor-message', error.message, 'error')
    } finally {
      if (draft === active) {
        active.loading = false
        updateAttachmentUI()
      }
    }
  }

  $('source-file').addEventListener('change', event => {
    const [file] = event.target.files
    event.target.value = ''
    if (file) void importAttachment(file)
  })
  const fileBox = $('attachment-box')
  fileBox.addEventListener('dragover', event => event.preventDefault())
  fileBox.addEventListener('drop', event => {
    event.preventDefault()
    const [file] = event.dataTransfer.files
    if (file) void importAttachment(file)
  })

  // Ce que la lecture a laissé de côté, à compléter à la main si besoin.
  function omissionsOf({unknown = [], urineSkipped = 0, unnamed = 0}) {
    const ignored = []
    if (unknown.length) ignored.push(unknown.length + ' ligne(s) avec une valeur mais sans analyse reconnue : ' +
      unknown.slice(0, 12).join(', ') + (unknown.length > 12 ? '…' : '') + '.')
    if (unnamed) ignored.push(unnamed + ' résultat(s) dont l’analyse n’a pas été identifiée.')
    if (urineSkipped) ignored.push(urineSkipped + ' ligne(s) d’analyse d’urine laissée(s) de côté.')
    return ignored.length ? ' Non repris, à ajouter à la main si besoin : ' + ignored.join(' ') : ''
  }

  // Nouvelle lecture d'un bilan qui a déjà des lignes : elles restent telles quelles, corrections comprises ;
  // seuls les résultats absents s'ajoutent, marqués « Nouveau », et la vérification est de nouveau demandée.
  function showAdditions(rows, omissions) {
    const added = rows.slice(0, Math.max(0, 1000 - $('result-editor').children.length))
    for (const item of added) addResult(item, true)
    if (!added.length) {
      notice('import-message', 'Aucun nouveau résultat dans ce PDF : les lignes actuelles sont conservées.' + omissions, omissions ? 'warn' : '')
      return
    }
    draft.proposed = true
    draft.changed = true
    $('confirm-results').hidden = false
    $('checked-results').checked = false
    notice('import-message', added.length + ' nouveau(x) résultat(s), marqué(s) « Nouveau » en fin de liste. Les lignes déjà présentes et vos corrections ' +
      'sont conservées. Vérifiez les nouvelles lignes avec l’original.' + omissions, 'warn')
    $('result-editor').querySelector('.result-new')?.scrollIntoView({block:'nearest'})
  }

  function mergeProposals(proposed) {
    const current = Array.from($('result-editor').children, entry =>
      Object.fromEntries(Array.from(entry.querySelectorAll('[data-field]'), input => [input.dataset.field, input.value.trim()])))
    if ($('doc-lab').value === 'other' && proposed.lab !== 'other') $('doc-lab').value = proposed.lab
    showAdditions(Lab.missing(current, proposed.rows), omissionsOf(proposed))
  }

  function acceptProposals({lab, date, rows, multipleDates, unknown = [], urineSkipped = 0, unnamed = 0}) {
    if ($('doc-lab').value === 'auto') $('doc-lab').value = lab
    if (!$('doc-title').value || $('doc-title').value === 'Bilan biologique') $('doc-title').value = titleFor(lab)
    if (date && !$('doc-date').value) $('doc-date').value = date
    const omissions = omissionsOf({unknown, urineSkipped, unnamed})
    if (!rows.length) {
      notice('import-message', 'Aucun résultat reconnu. Vous pouvez joindre l’original et saisir les valeurs à la main.' + omissions, 'warn')
      return
    }
    $('result-editor').replaceChildren()
    for (const item of rows.slice(0, 1000)) addResult(item)
    draft.proposed = true
    draft.changed = true
    $('confirm-results').hidden = false
    $('checked-results').checked = false
    notice('import-message', rows.slice(0, 1000).length + ' valeur(s) proposée(s). Vérifiez-les avec l’original et complétez les lignes manquantes.' +
      (multipleDates ? ' Plusieurs dates de prélèvement figurent dans le document. Vérifiez chaque date.' : '') + omissions,
      multipleDates || unknown.length || unnamed ? 'warn' : '')
  }

  // Texte du PDF joint, lu une seule fois par fichier.
  async function pagesOf(active) {
    if (active.pages?.file !== active.file) active.pages = {file:active.file, list:await PdfLocal.extract(active.file.bytes)}
    return active.pages.list
  }

  // Bilan : résultats proposés. Autre document : lu comme un compte rendu ; `detectKind` (type non choisi)
  // reconnaît en plus un bilan de laboratoire, une imagerie ou un autre compte rendu, sans message d'échec.
  async function extractAttachment(active, detectKind = false) {
    const biology = $('doc-kind').value === 'bio'
    const message = biology ? 'import-message' : 'report-message'
    if (!detectKind) notice(message, 'Lecture du PDF sur cet appareil…')
    try {
      const pages = await pagesOf(active)
      if (draft !== active) return
      if (!pages.some(page => page.lines.some(Boolean))) {
        if (!detectKind) {
          notice(message, biology ? 'Ce PDF ne contient pas de texte exploitable. Le fichier peut être archivé et les valeurs saisies à la main.' :
            'Ce PDF ne contient pas de texte (document scanné ?). Le fichier peut être archivé et les champs remplis à la main.', 'warn')
        }
        return
      }
      if (detectKind) {
        const proposed = Lab.parse(pages, 'auto')
        if (proposed.lab !== 'other' && proposed.rows.length) {
          $('doc-kind').value = 'bio'
          syncEditorKind()
          acceptProposals(proposed)
          return
        }
      }
      if (biology) {
        const proposed = Lab.parse(pages, $('doc-lab').value)
        // « Importer un bilan » avec un compte rendu d'imagerie ou de consultation : le type suit le document.
        const report = !active.kindChosen && !proposed.rows.length ? CompteRendu.read(pages) : null
        if (report?.kind) {
          notice('import-message')
          $('doc-kind').value = report.kind
          syncEditorKind()
          acceptReport(report, true, 'Ce PDF n’est pas un bilan de laboratoire : classé en « ' + Coffre.types[report.kind] + ' ». ')
        } else if ($('result-editor').children.length) {
          mergeProposals(proposed)
        } else {
          acceptProposals(proposed)
        }
      } else {
        acceptReport(CompteRendu.read(pages), detectKind)
      }
    } catch (error) {
      if (draft === active && !detectKind) notice(message, error.message, 'warn')
    }
  }

  // Ne remplace jamais une saisie : seuls les champs vides, ou encore égaux à ce qui a été proposé, sont remplis.
  function acceptReport(report, detectKind, prefix = '') {
    if (!report) {
      notice('report-message', detectKind ? '' : 'Aucun élément reconnu dans ce document : complétez les champs à la main.', 'warn')
      return
    }
    if (detectKind && report.kind && $('doc-kind').value === 'other') {
      $('doc-kind').value = report.kind
      syncEditorKind()
    }
    const auto = draft.auto ??= {}
    const filled = []
    const put = (key, input, value, label) => {
      if (!input || !value || (input.value && input.value !== auto[key])) return
      if (input.value !== value) filled.push(label)
      input.value = value
      auto[key] = value
    }
    put('title', $('doc-title'), report.title, 'examen')
    put('date', $('doc-date'), report.date, 'date')
    const labels = {conclusion:'conclusion', indication:'indication', prescriber:'médecin demandeur', practitioner:'praticien', place:'lieu'}
    for (const [key, label] of Object.entries(labels)) {
      put(key, $('extra-fields').querySelector('[data-extra="' + key + '"]'), report.fields[key], label)
    }
    if (filled.length) {
      draft.changed = true
      notice('report-message', prefix + 'Repris du compte rendu : ' + filled.join(', ') + '. Vérifiez avec l’original.')
    } else {
      notice('report-message', prefix || (detectKind ? '' : 'Rien de nouveau : les champs déjà remplis sont conservés.'))
    }
  }

  // Après un changement de type ou de laboratoire : relit le PDF joint si le nouveau type s'y prête.
  async function readAttached() {
    const kind = $('doc-kind').value
    if (kind === 'bio' ? $('result-editor').children.length : !readsReport(kind)) return
    await reread()
  }

  async function reread() {
    if (!draft?.file || draft.loading || !Coffre.isPDF(draft.file.bytes)) return
    const active = draft
    active.loading = true
    updateAttachmentUI()
    await extractAttachment(active)
    if (draft === active) {
      active.loading = false
      updateAttachmentUI()
    }
  }
  $('reread').addEventListener('click', reread)
  $('read-report').addEventListener('click', reread)
  $('parse-text').addEventListener('click', () => {
    if (!draft || draft.loading) return
    if (!$('paste-text').value.trim()) { notice('import-message', 'Collez le texte du compte rendu pour lancer la lecture.', 'warn'); return }
    if ($('result-editor').children.length && !confirm('Remplacer les lignes actuelles si des résultats sont trouvés dans ce texte ?')) return
    acceptProposals(Lab.parse(Lab.pagesFromText($('paste-text').value), $('doc-lab').value))
  })

  function addResult(item = {}, fresh = false) {
    const row = el('div', fresh ? 'result-row result-new' : 'result-row')
    row.dataset.id = item.id || crypto.randomUUID()
    row.dataset.page = String(item.page || 0)
    const field = (key, label, limit, text, css = '') => {
      const input = el('input')
      input.dataset.field = key
      input.maxLength = limit
      input.value = text || ''
      if (key === 'name') input.setAttribute('list', 'marker-names')
      const wrapper = inputField(label, input)
      if (css) wrapper.classList.add(css)
      return wrapper
    }
    const remove = button('Retirer', () => {
      row.remove()
      draft.changed = true
      $('checked-results').checked = false
      if (!$('result-editor').children.length) $('confirm-results').hidden = true
    }, 'text-button danger compact row-remove')
    const tail = el('div', 'row-tail')
    if (fresh) tail.append(el('span', 'pill new-pill', 'Nouveau'))
    if (item.page) tail.append(el('span', 'muted small', 'Page ' + item.page))
    const date = el('input', 'row-date')
    date.dataset.field = 'date'
    date.type = 'date'
    date.value = item.date || ''
    date.min = '1900-01-01'
    date.max = '2199-12-31'
    const label = el('label', 'small muted', 'Autre date de prélèvement ')
    label.append(date)
    tail.append(label)
    row.append(field('name','Analyse',160,item.name,'row-name'), field('value','Valeur',240,item.value), field('unit','Unité',60,item.unit),
      field('reference','Référence du labo',600,item.reference,'row-ref'), remove, tail)
    $('result-editor').append(row)
    return row
  }
  $('add-measure').addEventListener('click', () => {
    if (!draft || $('result-editor').children.length >= 1000) return
    draft.changed = true
    addResult().querySelector('input').focus()
  })

  $('editor-form').addEventListener('submit', event => {
    event.preventDefault()
    if (!session || !draft || draft.loading || busy) return
    notice('editor-message')
    try {
      const kind = $('doc-kind').value
      const lab = kind === 'bio' ? ($('doc-lab').value === 'auto' ? 'other' : $('doc-lab').value) : ''
      const date = $('doc-date').value
      const title = $('doc-title').value.trim()
      if (!title || !Lab.validDate(date)) throw Error('Indiquez un titre et une date valide.')
      const items = Array.from($('result-editor').children)
      if (kind === 'bio' && items.length && draft.proposed && !$('checked-results').checked) {
        $('checked-results').focus()
        throw Error('Confirmez la vérification des résultats extraits avant de les ajouter.')
      }
      if (kind !== 'bio' && items.length && !confirm('Changer le type de document et retirer ses résultats structurés ?')) return
      const results = []
      if (kind === 'bio') for (const entry of items) {
        const values = Object.fromEntries(Array.from(entry.querySelectorAll('[data-field]'), input => [input.dataset.field, input.value.trim()]))
        if (Object.values(values).every(value => !value)) continue
        if (!values.name || !values.value) throw Error('Chaque résultat doit avoir un nom et une valeur. Retirez les lignes incomplètes.')
        if (values.date && !Lab.validDate(values.date)) throw Error('Vérifiez la date de prélèvement de ' + values.name + '.')
        for (const [field, label, limit] of [['name','Analyse',160], ['value','Valeur',240], ['unit','Unité',60], ['reference','Référence du labo',600]]) {
          if (values[field].length > limit) {
            entry.querySelector('[data-field=' + field + ']').focus()
            throw Error('Le champ « ' + label + ' » de ' + values.name.slice(0, 60) + ' dépasse ' + limit + ' caractères. Raccourcis-le.')
          }
        }
        results.push({...values, id:entry.dataset.id, page:Number(entry.dataset.page)})
      }
      const existingBytes = session.records.filter(record => record.id !== draft.id)
        .reduce((sum, record) => sum + (record.file?.bytes.length ?? 0), 0)
      if (existingBytes + (draft.file?.bytes.length ?? 0) >= Coffre.MAX_VAULT - 200000) {
        throw Error('Ce document dépasserait la capacité du coffre de 150 Mo.')
      }
      const typed = Object.fromEntries(Array.from($('extra-fields').querySelectorAll('[data-extra]'),
        input => [input.dataset.extra, input.value.trim()]).filter(([, value]) => value))
      const fields = kind === 'measure' ? Dossier.checkMeasures(typed) : typed
      if (kind === 'treatment' && fields.end && fields.end < date) throw Error('La date de fin du traitement précède sa date de début.')
      if (kind === 'vaccine' && fields.booster && fields.booster <= date) throw Error('Le prochain rappel doit être postérieur à la date de l’injection.')
      const record = {id:draft.id || crypto.randomUUID(), title, kind, lab, date, notes:$('doc-notes').value.trim(), fields, file:draft.file, results}
      try {
        Coffre.check(record)
      } catch {
        throw Error('Ce document contient un champ vide, trop long ou invalide. Vérifiez le titre, les notes et chaque résultat.')
      }
      const editing = Boolean(draft.id)
      if (editing) session.records = session.records.map(old => old.id === record.id ? record : old)
      else session.records.push(record)
      draft.changed = false
      $('editor').close()
      show(editing ? view : kind === 'bio' ? 'labs' : kind === 'measure' ? 'measures' : Dossier.forms[kind] ? 'profile' : 'docs')
      const sheet = Boolean(Dossier.forms[kind])
      afterChange(editing ? (sheet ? 'Fiche modifiée.' : 'Document modifié.') : sheet ? 'Fiche ajoutée.' : 'Document ajouté.')
    } catch (error) {
      notice('editor-message', error.message, 'error')
    }
  })

