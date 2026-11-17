  function datePoint(date) { return new Date(date + 'T12:00:00Z').getTime() }


  function clearCharts() {
    for (const observer of chartObservers) observer.disconnect()
    chartObservers.clear()
  }

  function sharedReference(entries) {
    const ranges = entries.map(item => Lab.referenceRange(item.reference, item.document.lab, item.unit))
    const first = ranges[0]
    const shared = first && first.low !== null && first.high !== null &&
      ranges.every(range => range && range.low === first.low && range.high === first.high)
    return shared ? [first.low, first.high] : null
  }

  // Situation d'une mesure par rapport à la référence du labo enregistrée avec elle.
  const flagText = {high:'Au-dessus de la référence du labo', low:'En dessous de la référence du labo'}
  const flagNote = 'Les mentions « au-dessus » et « en dessous » comparent chaque valeur à la référence du labo enregistrée pour ce prélèvement. Elles ne remplacent pas l’avis d’un médecin.'
  const stateOf = (item, lab) => Lab.judge(item.value, lab, item.unit, item.reference)
  const outOfRange = state => state === 'high' || state === 'low'

  function valueCell(item, lab, className = 'measure-text') {
    const cell = el('span', className)
    cell.append(el('strong', '', measurement(item)))
    const state = stateOf(item, lab)
    if (outOfRange(state)) {
      const mark = el('span', 'flag', state === 'high' ? '↑ au-dessus' : '↓ en dessous')
      mark.title = flagText[state]
      cell.append(' ', mark)
    }
    return cell
  }

  function enablePointDetails(canvas, points, band) {
    const plot = el('div', 'bio-plot')
    const tip = el('div', 'bio-tip')
    tip.hidden = true
    tip.setAttribute('role', 'status')
    canvas.replaceWith(plot)
    plot.append(canvas, tip)
    if (points.some(point => outOfRange(point.state))) plot.after(el('p', 'small muted', '○ Mesure hors de la référence du labo pour son prélèvement'))
    if (band) plot.after(el('p', 'small muted', 'Plage de référence commune aux prélèvements'))

    const grouped = new Map()
    for (const point of points) {
      const key = point.date + '|' + point.value
      if (!grouped.has(key)) grouped.set(key, {...point, items:[]})
      grouped.get(key).items.push(point.item)
    }
    const groups = [...grouped.values()]
    let active = null

    function positionTip() {
      if (!active) return
      const width = tip.offsetWidth
      const left = Math.max(8, Math.min(active.x - width / 2, plot.clientWidth - width - 8))
      const above = active.y - tip.offsetHeight - 12
      const below = Math.min(active.y + 12, plot.clientHeight - tip.offsetHeight - 2)
      tip.style.left = left + 'px'
      tip.style.top = Math.max(2, above >= 2 ? above : below) + 'px'
    }

    function hideTip() {
      active = null
      tip.hidden = true
    }

    function showTip(point) {
      active = point
      tip.replaceChildren(el('strong', '', formatDate(point.item.date)))
      for (const item of point.items.slice(0, 2)) {
        tip.append(el('span', '', (item.label ? item.label + ' · ' : '') + measurement(item) + ' · ' + describe(item.document)))
        const state = stateOf(item, item.document.lab)
        if (outOfRange(state)) tip.append(el('span', 'flag-line', flagText[state]))
        if (item.reference) tip.append(el('span', 'muted bio-ref', 'Référence du labo · ' + item.reference))
      }
      if (point.items.length > 2) tip.append(el('span', 'muted', '+' + (point.items.length - 2) + ' mesures au même point'))
      tip.hidden = false
      positionTip()
    }

    groups.forEach((point, index) => {
      const marker = button('', () => showTip(point), 'bio-point')
      marker.hidden = true
      marker.tabIndex = index === groups.length - 1 ? 0 : -1
      marker.setAttribute('aria-label', formatDate(point.item.date) + ' · ' + (point.item.label ? point.item.label + ' ' : '') +
        measurement(point.item) + ' · ' + describe(point.item.document) +
        (outOfRange(point.state) ? ' · ' + flagText[point.state] : ''))
      marker.addEventListener('pointerenter', event => {if (event.pointerType !== 'touch') showTip(point)})
      marker.addEventListener('pointerleave', () => {if (active === point && document.activeElement !== marker) hideTip()})
      marker.addEventListener('focus', () => {
        for (const other of groups) other.marker.tabIndex = other === point ? 0 : -1
        showTip(point)
      })
      marker.addEventListener('blur', () => {if (active === point) hideTip()})
      marker.addEventListener('keydown', event => {
        if (event.key === 'Escape') hideTip()
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        groups[index + (event.key === 'ArrowLeft' ? -1 : 1)]?.marker.focus()
      })
      point.marker = marker
      plot.append(marker)
    })
    canvas.addEventListener('pointerdown', hideTip)

    return (x, y) => {
      for (const point of groups) {
        point.x = x(point.date)
        point.y = y(point.value)
        point.marker.style.left = point.x + 'px'
        point.marker.style.top = point.y + 'px'
        point.marker.hidden = false
      }
      positionTip()
    }
  }

  function renderTracking() {
    const head = pageHeader('Mon suivi biologique', 'Survole ou touche un point pour afficher les détails du prélèvement.',
      button('Importer un bilan', () => openEditor('bio'), 'primary'))
    const series = []
    const groups = [...allGroups().values()].sort((a,b) => a.name.localeCompare(b.name,'fr'))
    for (const group of groups) {
      const units = new Map()
      for (const item of group.entries) {
        const key = Lab.unitKey(item.unit)
        if (!units.has(key)) units.set(key, [])
        units.get(key).push(item)
      }
      for (const [key, results] of units) {
        if (results.some(item => Lab.exactNumber(item.value,item.document.lab,item.unit) !== null)) series.push({group,key,results})
      }
    }

    const search = el('input')
    search.type = 'search'
    search.placeholder = 'Plaquettes, ferritine, créatinine…'
    const field = inputField('Rechercher un paramètre', search)
    field.classList.add('bio-filter')
    const cards = el('div', 'bio-cards')
    const pager = el('div', 'bio-page')
    $('view').replaceChildren(head, field, cards, pager)
    let page = 0
    const perPage = 6

    function render() {
      clearCharts()
      cards.replaceChildren()
      pager.replaceChildren()
      const query = Lab.fold(search.value)
      const matches = series.filter(({group}) => matchesQuery(group, query))
      for (const {group,key,results} of matches.slice(page * perPage, (page + 1) * perPage)) {
        const card = el('section', 'panel')
        const details = button('Voir les résultats', () => {metric = group.key; unit = key; show('labs')}, 'secondary compact')
        section(card, group.name + (key ? ' · ' + key : ''), details)
        const canvas = el('canvas','chart')
        canvas.setAttribute('role','img')
        canvas.setAttribute('aria-label','Évolution de ' + group.name + (key ? ' en ' + key : ''))
        card.append(canvas)
        cards.append(card)
        drawChart(canvas, results, key)
      }
      if (!matches.length) cards.append(empty(series.length ?
        'Aucun paramètre ne correspond à la recherche.' : 'Tes courbes apparaîtront après l’ajout de résultats numériques.'))
      if (page > 0) pager.append(button('Précédent', () => {page--; render(); head.scrollIntoView()}))
      if ((page + 1) * perPage < matches.length) pager.append(button('Suivant', () => {page++; render(); head.scrollIntoView()}))
    }

    search.addEventListener('input', () => {page = 0; render()})
    render()
  }

  // `extra` : seconde série facultative sur le même axe (tension diastolique), tracée en tirets.
  function drawChart(canvas, entries, unitLabel, extra = []) {
    const plot = list => list.map(item => ({
      item, date:datePoint(item.date), value:Lab.exactNumber(item.value, item.document.lab, item.unit), state:stateOf(item, item.document.lab),
    })).sort((a,b) => a.date - b.date)
    const raw = plot(entries)
    const raw2 = plot(extra)
    const points = raw.filter(point => point.value !== null)
    const points2 = raw2.filter(point => point.value !== null)
    if (!points.length) return
    const band = extra.length ? null : sharedReference(entries)
    const positionPoints = enablePointDetails(canvas, points.concat(points2), band)
    const dates = raw.concat(raw2).map(point => point.date)
    const chartDate = new Intl.DateTimeFormat('fr-FR', {day:'2-digit', month:'short', year:'2-digit', timeZone:'UTC'})
    const tick = new Intl.NumberFormat('fr-FR', {maximumSignificantDigits:5})
    function draw() {
      if (!canvas.isConnected) return
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const c = canvas.getContext('2d')
      if (!c) return
      c.scale(ratio, ratio)
      c.font = '12px "Segoe UI",sans-serif'
      const values = points.concat(points2).map(point => point.value).concat(band ?? [])
      const min = Math.min(...values)
      const max = Math.max(...values)
      const padding = (max - min) * .16 || Math.abs(max) * .09 || 1
      const bottom = min - padding
      const top = max + padding
      const start = Math.min(...dates)
      const end = Math.max(...dates)
      const left = Math.max(46, c.measureText(tick.format(top)).width + 10, c.measureText(tick.format(bottom)).width + 10)
      const right = width - 11
      const x = date => start === end ? (left + right) / 2 : left + (date - start) / (end - start) * (right - left)
      const y = value => height - 32 - (value - bottom) / (top - bottom) * (height - 55)
      if (band) {
        c.fillStyle = '#f3eff9'
        c.fillRect(left, y(band[1]), right - left, y(band[0]) - y(band[1]))
        c.strokeStyle = '#7864b8'
        for (const limit of band) {
          c.beginPath()
          c.moveTo(left, y(limit))
          c.lineTo(right, y(limit))
          c.stroke()
        }
      }
      c.fillStyle = '#536a64'
      c.fillText(unitLabel, left, 14)
      for (let i = 0; i <= 4; i++) {
        const value = bottom + i * (top - bottom) / 4
        c.strokeStyle = '#dce8dd'
        c.lineWidth = 1
        c.beginPath()
        c.moveTo(left, y(value)); c.lineTo(right, y(value)); c.stroke()
        c.textAlign = 'right'
        c.fillText(tick.format(value), left - 5, y(value) + 4)
      }
      c.strokeStyle = '#0b614d'
      c.lineWidth = 2
      c.beginPath()
      let started = false
      for (const point of raw) {
        if (point.value === null) { started = false; continue }
        if (started) c.lineTo(x(point.date), y(point.value))
        else c.moveTo(x(point.date), y(point.value))
        started = true
      }
      c.stroke()
      if (points2.length) {
        c.strokeStyle = '#4f6fae'
        c.setLineDash([6, 4])
        c.beginPath()
        let next = false
        for (const point of raw2) {
          if (point.value === null) { next = false; continue }
          if (next) c.lineTo(x(point.date), y(point.value))
          else c.moveTo(x(point.date), y(point.value))
          next = true
        }
        c.stroke()
        c.setLineDash([])
        c.fillStyle = '#4f6fae'
        for (const point of points2) c.fillRect(x(point.date) - 3.5, y(point.value) - 3.5, 7, 7)
      }
      // Dans la référence : point plein. Hors référence : anneau ambré, reconnaissable sans la couleur.
      for (const point of points) {
        const out = outOfRange(point.state)
        c.beginPath()
        c.arc(x(point.date), y(point.value), out ? 5.5 : 4, 0, 2 * Math.PI)
        c.fillStyle = out ? '#fff' : '#0b614d'
        c.fill()
        if (out) {
          c.strokeStyle = '#b45309'
          c.lineWidth = 2.5
          c.stroke()
        }
      }
      c.fillStyle = '#536a64'
      c.textAlign = start === end ? 'center' : 'left'
      c.fillText(chartDate.format(start), x(start), height - 10)
      if (start !== end) {
        c.textAlign = 'right'
        c.fillText(chartDate.format(end), x(end), height - 10)
      }
      positionPoints(x, y)
    }
    const observer = new ResizeObserver(draw)
    chartObservers.add(observer)
    observer.observe(canvas)
    requestAnimationFrame(draw)
  }

  function table(headers, rows) {
    const wrap = el('div', 'table-wrap')
    wrap.tabIndex = 0
    wrap.setAttribute('role', 'region')
    wrap.setAttribute('aria-label', 'Tableau de résultats')
    const tab = el('table')
    const head = el('thead')
    const body = el('tbody')
    const titles = el('tr')
    for (const title of headers) {
      const cell = el('th', '', title)
      cell.scope = 'col'
      titles.append(cell)
    }
    head.append(titles)
    for (const cells of rows) {
      const row = el('tr')
      for (const item of cells) {
        const cell = el('td')
        cell.append(item)
        row.append(cell)
      }
      body.append(row)
    }
    tab.append(head, body)
    wrap.append(tab)
    return wrap
  }

