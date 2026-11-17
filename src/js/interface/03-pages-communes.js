  function show(route) {
    if (!session) return
    view = route
    clearCharts()
    for (const item of $('navigation').querySelectorAll('button')) {
      if (item.dataset.nav === route) item.setAttribute('aria-current', 'page')
      else item.removeAttribute('aria-current')
    }
    const render = {home:renderHome, profile:renderProfile, measures:renderMeasures, labs:renderLabs, tracking:renderTracking, docs:renderTimeline, vault:renderVault}[route]
    render()
    refreshStatus()
  }

  function pageHeader(name, description, ...actions) {
    const heading = el('div', 'page-head')
    const text = el('div')
    text.append(el('h1', '', name), el('p', 'muted', description))
    heading.append(text)
    if (actions.length) {
      const controls = el('div', 'actions')
      controls.append(...actions)
      heading.append(controls)
    }
    return heading
  }

  function empty(message) { return el('p', 'empty', message) }
  function section(panel, title, ...actions) {
    const header = el('div', 'section-line')
    header.append(el('h2', '', title), ...actions)
    panel.append(header)
  }
  function backup() {
    return button('Télécharger une copie chiffrée', () => { void save({copy:true, forceDownload:true}) })
  }

  // Liste cliquable : chaque ligne {id, title, detail, aside, date, warn} ouvre la fiche du document `id`.
  function entryList(rows, placeholder) {
    if (!rows.length) return empty(placeholder)
    const list = el('ul', 'entry-list')
    for (const item of rows) {
      const row = button('', () => openRecord(item.id), 'entry')
      const title = el('span')
      title.append(el('span', '', item.title))
      if (item.detail) title.append(el('span', 'muted small', item.detail))
      const aside = el(item.date ? 'time' : 'span', item.warn ? 'entry-aside entry-warn' : 'entry-aside', item.aside || '')
      if (item.date) aside.dateTime = item.date
      row.append(title, aside)
      const li = el('li')
      li.append(row)
      list.append(li)
    }
    return list
  }

  // L'essentiel d'une fiche en une ligne, pour les listes.
  function summaryOf(record) {
    const fields = record.fields
    if (record.kind === 'vaccine') return fields.vaccine || ''
    if (record.kind === 'treatment') return [fields.dose, fields.end ? 'jusqu’au ' + formatDate(fields.end) : 'en cours'].filter(Boolean).join(' · ')
    if (record.kind === 'allergy') {
      return [fields.reaction, fields.severity && 'gravité ' + Dossier.fieldText('allergy', 'severity', fields.severity).toLowerCase()].filter(Boolean).join(' · ')
    }
    if (record.kind === 'history') return fields.category ? Dossier.fieldText('history', 'category', fields.category) : ''
    if (record.kind === 'measure') return Dossier.measureSummary(fields)
    if (fields.conclusion) {
      const text = fields.conclusion.replace(/\s+/g, ' ')
      return text.length > 140 ? text.slice(0, 139).trimEnd() + '…' : text
    }
    return ''
  }

  function listRecords(records, placeholder) {
    return entryList(records.map(entry => ({
      id:entry.id, title:entry.title, date:entry.date, aside:formatDate(entry.date),
      detail:[describe(entry), summaryOf(entry),
        entry.results.length ? entry.results.length + ' résultat' + (entry.results.length === 1 ? '' : 's') : ''].filter(Boolean).join(' · '),
    })), placeholder)
  }

  function vaccineRow(item) {
    return {
      id:item.last.id, title:item.name, warn:item.status === 'overdue',
      detail:'Dernière injection le ' + formatDate(item.last.date) + (item.count > 1 ? ' · ' + item.count + ' injections notées' : ''),
      aside:item.status === 'none' ? 'Pas de rappel noté' :
        'Rappel le ' + formatDate(item.booster) + (item.status === 'overdue' ? ', date dépassée' : ''),
    }
  }

  function allGroups() {
    const groups = new Map()
    for (const document of session.records) {
      for (const item of document.results) {
        const key = Lab.groupFor(item.name)
        const name = Lab.nameFor(key, item.name)
        if (!groups.has(key)) groups.set(key, {name, key, entries:[], searchTerms:new Set([key, Lab.fold(name)])})
        const group = groups.get(key)
        group.entries.push({...item, date:item.date || document.date, document})
        group.searchTerms.add(Lab.fold(item.name))
      }
    }
    return groups
  }

  // Même recherche dans « Résultats » et « Mon suivi biologique » : noms affichés et alias (TGO, HbA1c…).
  function matchesQuery(group, query) {
    return [...group.searchTerms].some(term => term.includes(query)) ||
      Lab.markers.some(([key, , aliases]) => key === group.key && Lab.fold(aliases).includes(query))
  }

