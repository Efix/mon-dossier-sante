  'use strict'

  // Le site ne peut pas interdire l'affichage dans un cadre (GitHub Pages n'envoie pas d'en-tête de
  // sécurité) : l'application refuse elle-même de s'ouvrir dans la page d'un autre site.
  if (window.top !== window.self) {
    document.body.textContent = 'Mon dossier santé ne s’ouvre que dans son propre onglet.'
    throw Error('Application ouverte dans un cadre : arrêt.')
  }

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

  // Version et mises à jour. L'application ne se connecte jamais : le lien ouvre, sur demande, la page
  // d'accueil du site, qui indique si une version plus récente existe. En ligne, c'est le dossier parent
  // de celui de la version (/vX.Y.Z/) ; pour un fichier local, l'adresse notée à la construction.
  const meta = name => document.querySelector(`meta[name="${name}"]`)?.content ?? ''
  const appVersion = meta('application-version')
  const online = location.protocol === 'https:' || location.protocol === 'http:'
  const query = '?depuis=' + encodeURIComponent(appVersion)
  const updateUrl = !appVersion ? '' : online ? new URL('../' + query, location.href).href :
    meta('application-site') ? meta('application-site') + '/' + query : ''
  const updateLabel = online ? 'Télécharger pour un usage hors ligne' : 'Rechercher une mise à jour'
  const updateLink = (target = el('a')) => {
    target.href = updateUrl
    target.target = '_blank'
    target.rel = 'noopener noreferrer'
    target.textContent = updateLabel
    target.hidden = !updateUrl
    return target
  }

  let session = null
  let pendingOpen = null
  let lockedCopy = null
  let accessMode = ''
  let draft = null
  let view = 'home'
  let metric = ''
  let unit = ''
  let busy = false
  // Verrouillage demandé pendant un enregistrement (sélecteur de fichier ouvert) : il a lieu dès la fin de celui-ci.
  let lockPending = false
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

