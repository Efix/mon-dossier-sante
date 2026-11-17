  function renderHome() {
    const records = [...session.records].sort(chronological)
    const head = pageHeader('Vue d’ensemble', 'Tes résultats d’analyses, ordonnances et autres documents de santé.')
    const banner = el('div', 'banner')
    const intro = el('div')
    intro.append(el('h2', '', 'Ajouter un bilan biologique'), el('p', 'muted', 'Importe un PDF Cerballiance ou Check-Up, puis vérifie les résultats proposés.'))
    banner.append(intro, button('Importer un bilan', () => openEditor('bio'), 'primary'))
    const stats = el('div', 'grid-stats')
    for (const [value, label] of [[records.length, 'Éléments au dossier'], [records.filter(item => item.kind === 'bio').length, 'Bilans'], [allGroups().size, 'Paramètres suivis']]) {
      const card = el('div', 'card')
      card.append(el('strong', '', String(value)), el('span', 'muted', label))
      stats.append(card)
    }
    const panels = el('div', 'stack')
    const due = Dossier.vaccinations(session.records).filter(item => item.status === 'overdue' || item.status === 'soon')
    if (due.length) {
      const reminders = el('section', 'panel')
      section(reminders, 'Rappels de vaccination', button('Voir la fiche santé', () => show('profile')))
      reminders.append(entryList(due.map(vaccineRow), ''))
      panels.append(reminders)
    }
    const recent = el('section', 'panel')
    section(recent, 'Éléments récents', button('Ajouter un document', () => openEditor('other')))
    recent.append(listRecords(records.slice(0, 6), 'Tes documents s’afficheront ici dès le premier ajout.'))
    panels.append(recent)
    $('view').replaceChildren(head, banner, stats, panels)
  }

  function renderProfile() {
    const day = Dossier.today()
    const head = pageHeader('Fiche santé', 'L’essentiel à avoir sous la main : allergies, traitements, vaccinations et antécédents.')
    const of = kind => session.records.filter(record => record.kind === kind).sort(chronological)
    const panel = (title, kind, ...content) => {
      const block = el('section', 'panel')
      section(block, title, button(Dossier.forms[kind].add, () => openEditor(kind)))
      block.append(...content)
      return block
    }

    const allergies = entryList(of('allergy').map(record => ({
      id:record.id, title:record.title, detail:record.fields.reaction || '', warn:record.fields.severity === 'severe',
      aside:record.fields.severity ? Dossier.fieldText('allergy', 'severity', record.fields.severity) : '',
    })), 'Aucune allergie notée.')

    const treatments = of('treatment')
    const current = treatments.filter(record => Dossier.ongoing(record, day))
    const ended = treatments.filter(record => !Dossier.ongoing(record, day))
    const treatmentRow = record => ({
      id:record.id, title:record.title, detail:[record.fields.dose, record.fields.reason].filter(Boolean).join(' · '),
      aside:record.fields.end ? 'du ' + formatDate(record.date) + ' au ' + formatDate(record.fields.end) :
        (record.date > day ? 'à partir du ' : 'depuis le ') + formatDate(record.date),
    })
    const treatmentBlocks = [entryList(current.map(treatmentRow), 'Aucun traitement en cours.')]
    if (ended.length) {
      const past = el('details')
      past.append(el('summary', '', 'Traitements terminés · ' + ended.length), entryList(ended.map(treatmentRow), ''))
      treatmentBlocks.push(past)
    }

    const vaccines = entryList(Dossier.vaccinations(session.records, day).map(vaccineRow), 'Aucune vaccination notée.')

    const history = entryList(of('history').map(record => ({
      id:record.id, title:record.title, date:record.date, aside:formatDate(record.date),
      detail:record.fields.category ? Dossier.fieldText('history', 'category', record.fields.category) : '',
    })), 'Aucun antécédent noté.')

    const grid = el('div', 'profile-grid')
    grid.append(panel('Allergies', 'allergy', allergies), panel('Traitements en cours', 'treatment', ...treatmentBlocks),
      panel('Vaccinations', 'vaccine', vaccines), panel('Antécédents', 'history', history))
    $('view').replaceChildren(head, grid)
  }

  function inputField(label, input) {
    const wrapper = el('label', 'field')
    wrapper.append(el('span', 'small', label), input)
    return wrapper
  }

