(() => {
  'use strict'

  let library
  const fromBase64 = value => {
    if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(value)
    const binary = atob(value)
    return Uint8Array.from(binary, value => value.charCodeAt(0))
  }
  const moduleURL = id => URL.createObjectURL(new Blob([fromBase64(document.getElementById(id).textContent.trim())],
    {type:'text/javascript'}))

  async function localLibrary() {
    if (!library) {
      const url = moduleURL('pdf-main')
      library = import(url).finally(() => URL.revokeObjectURL(url)).catch(error => {
        library = undefined
        throw error
      })
    }
    return library
  }

  function layout(items) {
    const arranged = []
    for (const item of items) {
      if (typeof item.str !== 'string' || !item.str.trim() || !item.transform) continue
      const [a, b, c, d, x, y] = item.transform
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(b) > Math.abs(a) || Math.abs(c) > Math.abs(d)) continue
      const size = Math.max(5, Math.min(25, item.height || Math.abs(d)))
      arranged.push({x, y, size, width:Math.max(0, item.width), text:item.str})
    }
    arranged.sort((a,b) => b.y - a.y || a.x - b.x)
    const rows = []
    for (const item of arranged) {
      const prev = rows.at(-1)
      if (!prev || Math.abs(item.y - prev.y) > Math.max(1.4, Math.min(item.size, prev.size) * .22)) {
        rows.push({y:item.y, size:item.size, items:[item]})
      } else {
        prev.items.push(item)
      }
    }
    return rows.map(line => {
      let right = null
      let output = ''
      for (const item of line.items.sort((a,b) => a.x - b.x)) {
        if (right !== null) {
          const gap = item.x - right
          if (gap >= Math.max(7, item.size * .85)) output = output.trimEnd() + '\t'
          else if (gap > item.size * .14 && !/\s$/.test(output) && !/^\s/.test(item.text)) output += ' '
        }
        output += item.text
        right = Math.max(right ?? -Infinity, item.x + item.width)
      }
      return output.trim()
    }).filter(Boolean)
  }

  async function extract(bytes) {
    let workerURL
    let task
    let timer
    try {
      const pdf = await localLibrary()
      workerURL = moduleURL('pdf-worker')
      pdf.GlobalWorkerOptions.workerSrc = workerURL
      task = pdf.getDocument({
        data:bytes.slice(),
        isEvalSupported:false,
        disableFontFace:true,
        useSystemFonts:false,
        useWasm:false,
        useWorkerFetch:false,
        stopAtErrors:true,
        isOffscreenCanvasSupported:false,
        verbosity:pdf.VerbosityLevel.ERRORS,
      })
      const read = async () => {
        const source = await task.promise
        if (source.numPages > 120) throw Error('L’extraction est limitée aux PDF de 120 pages. Vous pouvez archiver ce fichier et saisir les valeurs.')
        const pages = []
        let chars = 0
        for (let number = 1; number <= source.numPages; number++) {
          const page = await source.getPage(number)
          const content = await page.getTextContent()
          const lines = layout(content.items)
          chars += lines.reduce((count, line) => count + line.length, 0)
          if (chars > 1000000) throw Error('Ce texte est trop long pour l’extraction. Vous pouvez archiver le PDF et saisir les résultats.')
          pages.push({number, lines})
          page.cleanup()
        }
        return pages
      }
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('La lecture du PDF a expiré. Vous pouvez archiver le fichier ou coller son texte.')), 20000)
      })
      return await Promise.race([read(), timeout])
    } catch (error) {
      if (error.name === 'PasswordException') throw Error('Ce PDF est protégé. Vous pouvez conserver l’original et coller le texte après l’avoir ouvert avec son mot de passe.')
      if (error.name === 'InvalidPDFException' || error.name === 'UnknownErrorException') {
        throw Error('Le texte de ce PDF n’a pas pu être lu. Vous pouvez l’archiver et saisir les résultats.')
      }
      if (error.message.startsWith('L’extraction') || error.message.startsWith('Ce texte') || error.message.startsWith('La lecture')) throw error
      throw Error('Lecture du PDF indisponible. Essayez de coller son texte ou de saisir les valeurs.')
    } finally {
      clearTimeout(timer)
      if (task) await task.destroy().catch(() => {})
      if (workerURL) URL.revokeObjectURL(workerURL)
    }
  }

  // Affichage d'un PDF dans l'application, une page à la fois, sans écrire l'original déchiffré sur le disque.
  // Chaque page est dessinée dans un canevas à part, que l'appelant recopie une fois le rendu terminé.
  const MAX_PIXELS = 16000000

  async function view(bytes) {
    let workerURL
    let task
    let timer
    let source
    try {
      const pdf = await localLibrary()
      workerURL = moduleURL('pdf-worker')
      pdf.GlobalWorkerOptions.workerSrc = workerURL
      task = pdf.getDocument({
        data:bytes.slice(),
        isEvalSupported:false,
        // Les polices du document sont chargées depuis ses propres données ; une police standard non
        // incluse (Helvetica, Times…) est remplacée par une police de l'appareil, sinon son texte disparaît.
        disableFontFace:false,
        useSystemFonts:true,
        useWasm:false,
        useWorkerFetch:false,
        isOffscreenCanvasSupported:false,
        verbosity:pdf.VerbosityLevel.ERRORS,
      })
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('expiration')), 20000)
      })
      source = await Promise.race([task.promise, timeout])
    } catch (error) {
      if (task) await task.destroy().catch(() => {})
      if (workerURL) URL.revokeObjectURL(workerURL)
      throw Error(error?.name === 'PasswordException' ?
        'Ce PDF est protégé par un mot de passe et ne peut pas être affiché ici. Vous pouvez télécharger l’original.' :
        'Ce PDF n’a pas pu être affiché. Vous pouvez télécharger l’original.')
    } finally {
      clearTimeout(timer)
    }
    let active = null
    return {
      pages:source.numPages,
      async render(number, cssWidth, ratio) {
        active?.cancel()
        const page = await source.getPage(number)
        const base = page.getViewport({scale:1})
        let scale = cssWidth / base.width * ratio
        const pixels = base.width * base.height * scale * scale
        if (pixels > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / pixels)
        const viewport = page.getViewport({scale})
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const rendering = active = page.render({canvasContext:canvas.getContext('2d'), viewport, background:'#fff'})
        try {
          await rendering.promise
        } catch (error) {
          if (error?.name === 'RenderingCancelledException') return null
          throw error
        } finally {
          if (active === rendering) active = null
          page.cleanup()
        }
        return {canvas, width:cssWidth, height:cssWidth * base.height / base.width}
      },
      async close() {
        active?.cancel()
        await task.destroy().catch(() => {})
        URL.revokeObjectURL(workerURL)
      },
    }
  }

  globalThis.PdfLocal = {extract, view}
})()

