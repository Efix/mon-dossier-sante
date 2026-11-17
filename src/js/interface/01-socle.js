  'use strict'

  const $ = id => document.getElementById(id)
  const el = (tag, className = '', text = '') => {
    const item = document.createElement(tag)
    if (className) item.className = className
    if (text !== '') item.textContent = text
    return item
  }
  const button = (label, handler, style = 'secondary') => {
    const item = el('button', style, label)
    item.type = 'button'
    item.addEventListener('click', handler)
    return item
  }
  const option = (key, label) => new Option(label, key)
  const notice = (id, message = '', kind = '') => {
    const target = $(id)
    target.hidden = !message
    target.className = kind ? 'notice ' + kind : 'notice'
    target.textContent = message
  }
  const vaultTypes = [{description:'Coffre Mon dossier santé', accept:{'application/octet-stream':['.sante']}}]
  const dater = new Intl.DateTimeFormat('fr-FR', {dateStyle:'medium', timeZone:'UTC'})
  const formatDate = date => date ? dater.format(new Date(date + 'T12:00:00Z')) : 'Date à vérifier'
  const describe = record => record.kind === 'bio' ? Coffre.labs[record.lab] : Coffre.types[record.kind]
  const measurement = item => [item.value, item.unit].filter(Boolean).join(' ')
  const titleFor = lab => lab === 'other' ? 'Bilan biologique' : 'Bilan ' + Coffre.labs[lab]
  const formatBytes = bytes => new Intl.NumberFormat('fr-FR', {maximumFractionDigits:1}).format(bytes / (1024 * 1024)) + ' Mo'
  const chronological = (a, b) => b.date.localeCompare(a.date)
  const idleMs = 10 * 60 * 1000

  let session = null
  let pendingOpen = null
  let lockedCopy = null
  let accessMode = ''
  let draft = null
  let view = 'home'
  let metric = ''
  let unit = ''
  let busy = false
  let accessBusy = false
  let timer = null
  let graceUsed = false
  let lastActivity = 0
  let viewer = null
  let autosave = true
  let autosaveSuspended = false
  let rekeyBusy = false
  const chartObservers = new Set()
  let urls = new Set()

