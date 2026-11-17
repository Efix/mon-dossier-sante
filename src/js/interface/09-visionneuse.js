  // Visionneuse : l'original s'affiche dans l'application, une page à la fois.
  const zoomLevels = [1, 1.5, 2]

  async function imageSource(bytes) {
    let bitmap
    try {
      bitmap = await createImageBitmap(new Blob([bytes]))
    } catch {
      throw Error('Cette image n’a pas pu être affichée. Tu peux télécharger l’original.')
    }
    return {
      pages:1,
      async render(number, cssWidth, ratio) {
        const width = Math.min(cssWidth, bitmap.width)
        const scale = Math.min(width * ratio / bitmap.width, 1, Math.sqrt(16000000 / (bitmap.width * bitmap.height)))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale))
        canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        return {canvas, width, height:width * bitmap.height / bitmap.width}
      },
      async close() { bitmap.close() },
    }
  }

  function refreshViewer() {
    const ready = Boolean(viewer?.source)
    $('viewer-position').textContent = ready && viewer.pages > 1 ? 'Page ' + viewer.page + ' sur ' + viewer.pages : ''
    $('viewer-previous').hidden = $('viewer-next').hidden = !ready || viewer.pages < 2
    $('viewer-previous').disabled = !ready || viewer.page <= 1
    $('viewer-next').disabled = !ready || viewer.page >= viewer.pages
    $('viewer-zoom').disabled = !ready
    $('viewer-zoom').textContent = 'Zoom ' + Math.round((viewer?.zoom ?? 1) * 100) + ' %'
  }

  function closeViewer() {
    const current = viewer
    viewer = null
    if (current?.source) void current.source.close()
    const canvas = $('viewer-canvas')
    canvas.width = canvas.height = 0
    canvas.removeAttribute('aria-label')
    $('viewer-title').textContent = ''
    notice('viewer-message')
    refreshViewer()
  }

  async function showPage() {
    const state = viewer
    if (!state?.source) return
    const turn = ++state.turn
    const frame = $('viewer-page')
    state.frameWidth = frame.clientWidth
    refreshViewer()
    try {
      const shown = await state.source.render(state.page, Math.max(240, frame.clientWidth - 20) * state.zoom, Math.min(window.devicePixelRatio || 1, 2))
      if (!shown || viewer !== state || turn !== state.turn) return
      const canvas = $('viewer-canvas')
      canvas.width = shown.canvas.width
      canvas.height = shown.canvas.height
      canvas.style.width = Math.round(shown.width) + 'px'
      canvas.style.height = Math.round(shown.height) + 'px'
      canvas.getContext('2d').drawImage(shown.canvas, 0, 0)
      canvas.setAttribute('aria-label', (state.pages > 1 ? 'Page ' + state.page + ' sur ' + state.pages + ' de ' : 'Aperçu de ') + state.name)
      notice('viewer-message')
    } catch {
      if (viewer === state && turn === state.turn) notice('viewer-message', 'Cette page n’a pas pu être affichée. Tu peux télécharger l’original.', 'warn')
    }
  }

  async function openViewer(record, page = 1) {
    // L'événement « close » peut tarder (onglet en arrière-plan) : un état resté d'une visionneuse fermée est soldé ici.
    if (viewer && !$('viewer').open) closeViewer()
    if (!record.file || viewer) return
    const state = viewer = {name:record.file.name, page, pages:1, zoom:1, source:null, turn:0, frameWidth:0}
    $('viewer-title').textContent = record.file.name
    notice('viewer-message', 'Ouverture du document sur cet appareil…')
    refreshViewer()
    $('viewer').showModal()
    try {
      const source = Coffre.isPDF(record.file.bytes) ? await PdfLocal.view(record.file.bytes) : await imageSource(record.file.bytes)
      if (viewer !== state) {
        void source.close()
        return
      }
      state.source = source
      state.pages = source.pages
      state.page = Math.min(Math.max(1, page), source.pages)
      await showPage()
    } catch (error) {
      if (viewer === state) notice('viewer-message', error.message, 'warn')
    }
  }

  function turnPage(step) {
    if (!viewer?.source) return
    const target = Math.min(Math.max(1, viewer.page + step), viewer.pages)
    if (target === viewer.page) return
    viewer.page = target
    $('viewer').scrollTop = 0
    void showPage()
  }
  $('viewer-previous').addEventListener('click', () => turnPage(-1))
  $('viewer-next').addEventListener('click', () => turnPage(1))
  $('viewer-zoom').addEventListener('click', () => {
    if (!viewer?.source) return
    viewer.zoom = zoomLevels[(zoomLevels.indexOf(viewer.zoom) + 1) % zoomLevels.length]
    void showPage()
  })
  $('viewer').addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') turnPage(-1)
    else if (event.key === 'ArrowRight' || event.key === 'PageDown') turnPage(1)
    else return
    event.preventDefault()
  })
  // Un « close » tardif ne doit pas vider une visionneuse rouverte entre-temps.
  $('viewer').addEventListener('close', () => {
    if (!$('viewer').open) closeViewer()
  })
  // La page se redessine à la bonne largeur quand la fenêtre change nettement de taille.
  let viewerResize = null
  new ResizeObserver(() => {
    clearTimeout(viewerResize)
    viewerResize = setTimeout(() => {
      if (viewer?.source && Math.abs($('viewer-page').clientWidth - viewer.frameWidth) > 24) void showPage()
    }, 200)
  }).observe($('viewer-page'))

