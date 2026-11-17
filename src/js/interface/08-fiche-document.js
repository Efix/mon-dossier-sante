  function openRecord(id) {
    const record = session?.records.find(item => item.id === id)
    if (!record) return
    $('record-title').textContent = record.title
    const badges = el('div', 'pills')
    badges.append(el('span', 'pill', describe(record)), el('span', 'pill', formatDate(record.date)))
    const body = $('record-body')
    body.replaceChildren(badges)
    if (record.file) body.append(el('p', 'muted small', record.file.name + ' · ' + formatBytes(record.file.bytes.length)))
    const facts = Dossier.fieldsFor(record.kind).filter(([key]) => record.fields[key])
    if (facts.length) {
      const list = el('dl', 'facts')
      for (const [key, label, type] of facts) {
        list.append(el('dt', '', label.replace(/ \(.*\)$/, '')),
          el('dd', type === 'textarea' ? 'detail-notes' : '', type === 'date' ? formatDate(record.fields[key]) : Dossier.fieldText(record.kind, key, record.fields[key])))
      }
      body.append(list)
    }
    if (record.notes) body.append(el('h3', '', 'Notes personnelles'), el('p', 'detail-notes', record.notes))
    const paged = Boolean(record.file) && Coffre.isPDF(record.file.bytes)
    const viewable = paged || (Boolean(record.file) && Coffre.isImage(record.file.bytes))
    if (record.results.length) {
      body.append(table(['Paramètre', 'Résultat', 'Référence du labo', 'Prélèvement'], record.results.map(item => {
        const sampled = el('span', '', formatDate(item.date || record.date))
        // Le numéro de page ouvre l'original à l'endroit où figure le résultat.
        if (item.page && paged) sampled.append(' · ', button('p. ' + item.page, () => { void openViewer(record, item.page) }, 'link-button'))
        else if (item.page) sampled.append(' · p. ' + item.page)
        return [
          button(item.name, () => {
            $('record').close()
            metric = Lab.groupFor(item.name)
            unit = Lab.unitKey(item.unit)
            show('labs')
          }, 'link-button'),
          valueCell(item, record.lab),
          item.reference || '—',
          sampled,
        ]
      })))
      if (record.results.some(item => outOfRange(stateOf(item, record.lab)))) body.append(el('p', 'small muted', flagNote))
    }
    const controls = $('record-actions')
    controls.replaceChildren(button('Retirer du dossier', () => {
      if (busy || !confirm('Retirer « ' + record.title + ' » du dossier ?')) return
      session.records = session.records.filter(item => item.id !== record.id)
      $('record').close()
      show(view)
      afterChange('Document retiré.')
    }, 'text-button danger'))
    if (record.file) controls.append(button('Télécharger l’original', () => {
      download(new Blob([record.file.bytes], {type:'application/octet-stream'}), record.file.name)
    }))
    if (viewable) controls.append(button('Afficher l’original', () => { void openViewer(record) }))
    controls.append(button('Modifier', () => {
      $('record').close()
      openEditor(record.kind, record)
    }, 'primary'))
    if (!$('record').open) $('record').showModal()
  }

