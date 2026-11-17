(() => {
  'use strict'

  const MiB = 1024 * 1024
  const MAX_DOCUMENT = 30 * MiB
  const MAX_VAULT = 150 * MiB
  const encoder = new TextEncoder()
  const decoder = new TextDecoder('utf-8', {fatal:true})
  const magic = encoder.encode('FXSANTE1')
  const headerLength = 36
  const types = {
    bio:'Bilan biologique',
    rx:'Ordonnance',
    imaging:'Imagerie',
    report:'Compte rendu',
    vaccine:'Vaccination',
    treatment:'Traitement',
    allergy:'Allergie',
    history:'Antécédent',
    measure:'Mesures',
    note:'Note de santé',
    other:'Autre document',
  }
  // Champs propres aux fiches. Nombre : longueur maximale d'un texte ; 'date' : date ou vide ; liste : valeurs admises.
  const fieldRules = {
    vaccine:{vaccine:120, lot:60, booster:'date'},
    treatment:{dose:160, reason:160, prescriber:120, end:'date'},
    allergy:{reaction:200, severity:['', 'mild', 'moderate', 'severe']},
    history:{category:['', 'medical', 'surgical', 'family']},
    // Mesures : nombre à virgule décimale (« 72,5 »), dans les bornes, avec au plus `decimals` décimales.
    measure:{
      weight:{min:0.5, max:400, decimals:2}, height:{min:30, max:250, decimals:1},
      systolic:{min:50, max:300, decimals:0}, diastolic:{min:20, max:200, decimals:0},
      pulse:{min:20, max:250, decimals:0}, temperature:{min:30, max:45, decimals:1}, spo2:{min:50, max:100, decimals:0},
    },
  }
  const numberRule = rule => typeof rule === 'object' && !Array.isArray(rule)
  function validNumber(value, rule) {
    const pattern = rule.decimals ? new RegExp('^\\d{1,3}(?:,\\d{1,' + rule.decimals + '})?$') : /^\d{1,3}$/
    if (!pattern.test(value)) return false
    const number = Number(value.replace(',', '.'))
    return number >= rule.min && number <= rule.max
  }
  // Types inconnus du premier format : leur présence fait passer le coffre au format 2.
  const recentKinds = new Set(['treatment', 'allergy', 'history', 'measure'])
  const labs = {cerballiance:'Cerballiance', checkup:'Check-Up', other:'Autre laboratoire'}
  const safeName = text => String(text ?? '').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 200) || 'document'
  const sameBytes = (a, b) => a.length === b.length && a.every((value, index) => value === b[index])
  const equalBytes = (a, b) => {
    if (a.length !== b.length) return false
    for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return false
    return true
  }
  const freshSalt = () => crypto.getRandomValues(new Uint8Array(16))

  async function derive(passphrase, salt) {
    const passBytes = encoder.encode(passphrase)
    try {
      const baseKey = await crypto.subtle.importKey('raw', passBytes, 'PBKDF2', false, ['deriveKey'])
      return await crypto.subtle.deriveKey(
        {name:'PBKDF2', salt, iterations:600000, hash:'SHA-256'}, baseKey,
        {name:'AES-GCM', length:256}, false, ['encrypt', 'decrypt'],
      )
    } finally {
      passBytes.fill(0)
    }
  }

  function readText(input, max, required = false) {
    if (typeof input !== 'string' || input.length > max || (required && !input.trim())) throw Error('Champ invalide.')
    return input
  }

  // Règles communes à l'écriture et à la lecture : ce qui est enregistré peut toujours être rouvert.
  function checkRecord(input, ids) {
    const id = readText(input.id, 80, true)
    if (ids.has(id) || !Object.hasOwn(types, input.kind) || !Lab.validDate(input.date) ||
        !Array.isArray(input.results) || input.results.length > 1000 ||
        (input.kind === 'bio' ? !Object.hasOwn(labs, input.lab) : input.results.length > 0 || input.lab !== '')) {
      throw Error('Document invalide.')
    }
    ids.add(id)
    const resultIds = new Set()
    const results = input.results.map(item => {
      const key = readText(item.id, 80, true)
      const page = Number.isInteger(item.page) && item.page > 0 && item.page <= 1000 ? item.page : 0
      if (resultIds.has(key) || (item.date !== '' && !Lab.validDate(item.date))) throw Error('Résultat invalide.')
      resultIds.add(key)
      return {
        id:key, name:readText(item.name, 160, true), value:readText(item.value, 240, true),
        unit:readText(item.unit, 60), reference:readText(item.reference, 600),
        date:item.date, page,
      }
    })
    const rules = fieldRules[input.kind] ?? {}
    const given = input.fields ?? {}
    if (typeof given !== 'object' || Array.isArray(given) || Object.keys(given).some(key => !Object.hasOwn(rules, key))) {
      throw Error('Fiche invalide.')
    }
    const fields = {}
    for (const [key, rule] of Object.entries(rules)) {
      const value = given[key] ?? ''
      const valid = typeof value === 'string' && (rule === 'date' ? value === '' || Lab.validDate(value) :
        Array.isArray(rule) ? rule.includes(value) : numberRule(rule) ? value === '' || validNumber(value, rule) : value.length <= rule)
      if (!valid) throw Error('Fiche invalide.')
      if (value !== '') fields[key] = value
    }
    let file = null
    if (input.file !== null) {
      const size = input.file?.size
      if (!Number.isInteger(size) || size < 1 || size > MAX_DOCUMENT ||
          !/^[0-9a-f]{64}$/.test(input.file.hash)) throw Error('Pièce jointe invalide.')
      file = {name:safeName(readText(input.file.name, 200, true)), hash:input.file.hash, size}
    }
    return {
      id, kind:input.kind, lab:input.lab, date:input.date, title:readText(input.title, 160, true),
      notes:readText(input.notes, 6000), fields, file, results,
    }
  }

  const stored = record => ({
    ...record,
    file:record.file ? {name:record.file.name, hash:record.file.hash, size:record.file.bytes.length} : null,
  })

  function check(record) {
    checkRecord(stored(record), new Set())
  }

  function pack(records) {
    const ids = new Set()
    const list = records.map(record => {
      try {
        return checkRecord(stored(record), ids)
      } catch {
        throw Error('Le document « ' + String(record?.title ?? '').slice(0, 80) + ' » contient un champ invalide ou trop long. Corrige-le avant d’enregistrer.')
      }
    })
    // Format 2 dès qu'une fiche structurée existe : une ancienne version de l'application refuse alors le coffre
    // au lieu de l'ouvrir en perdant ces données. Sans fiche, le coffre reste lisible partout (format 1).
    const version = list.some(record => recentKinds.has(record.kind) || Object.keys(record.fields).length) ? 2 : 1
    const metadata = encoder.encode(JSON.stringify({version, records:list}))
    if (metadata.length + 4 > 16 * MiB || list.length > 15000) throw Error('Le coffre dépasse sa capacité de classement.')
    const length = 4 + metadata.length + list.reduce((total, record) => total + (record.file?.size ?? 0), 0)
    if (length + headerLength + 16 > MAX_VAULT) throw Error('Le coffre dépasse sa limite de 150 Mo.')
    const buffer = new Uint8Array(length)
    new DataView(buffer.buffer).setUint32(0, metadata.length)
    buffer.set(metadata, 4)
    let offset = 4 + metadata.length
    for (const record of records) {
      if (!record.file) continue
      buffer.set(record.file.bytes, offset)
      offset += record.file.bytes.length
    }
    return buffer
  }

  function unpack(buffer, copyFiles = true) {
    if (buffer.byteLength < 4) throw Error('Contenu incomplet.')
    const limit = 4 + new DataView(buffer).getUint32(0)
    if (limit > buffer.byteLength || limit > 16 * MiB) throw Error('Métadonnées invalides.')
    const data = JSON.parse(decoder.decode(new Uint8Array(buffer, 4, limit - 4)))
    if ((data.version !== 1 && data.version !== 2) || !Array.isArray(data.records) || data.records.length > 15000) throw Error('Version ou format non reconnu.')
    const ids = new Set()
    let offset = limit
    const records = data.records.map(input => {
      const record = checkRecord(input, ids)
      if (record.file) {
        const {name, hash, size} = record.file
        if (offset + size > buffer.byteLength) throw Error('Pièce jointe invalide.')
        const bytes = new Uint8Array(buffer, offset, size)
        record.file = {name, hash, bytes:copyFiles ? bytes.slice() : bytes}
        offset += size
      }
      return record
    })
    if (offset !== buffer.byteLength) throw Error('Taille incohérente.')
    return records
  }

  async function inspect(blob) {
    if (!(blob instanceof Blob) || blob.size < headerLength + 20 || blob.size > MAX_VAULT) throw Error('Taille de coffre invalide.')
    const header = new Uint8Array(await blob.slice(0, headerLength).arrayBuffer())
    if (!sameBytes(header.slice(0, magic.length), magic)) throw Error('Sélectionne un fichier .sante créé par cette application.')
    return {header, salt:header.slice(8, 24), iv:header.slice(24, 36)}
  }

  async function open(blob, passphrase) {
    const {header, salt, iv} = await inspect(blob)
    const key = await derive(passphrase, salt)
    const encrypted = await blob.slice(headerLength).arrayBuffer()
    let plaintext
    try {
      plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv, additionalData:header}, key, encrypted)
    } catch {
      throw Error('Phrase secrète incorrecte ou coffre endommagé.')
    }
    try {
      return {key, salt, header, records:unpack(plaintext)}
    } catch {
      throw Error('Ce coffre utilise un format incompatible ou contient des données endommagées.')
    } finally {
      new Uint8Array(plaintext).fill(0)
    }
  }

  async function seal(key, salt, records) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const header = new Uint8Array(headerLength)
    header.set(magic)
    header.set(salt, 8)
    header.set(iv, 24)
    const plaintext = pack(records)
    try {
      const encrypted = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:header}, key, plaintext)
      await reread(key, iv, header, encrypted, records)
      return {header, blob:new Blob([header, encrypted], {type:'application/octet-stream'})}
    } finally {
      plaintext.fill(0)
    }
  }

  // Le coffre chiffré est rouvert et comparé au dossier avant de remplacer quoi que ce soit :
  // un fichier écrit est toujours un fichier qui se rouvre, avec le même contenu.
  async function reread(key, iv, header, encrypted, records) {
    let plaintext
    try {
      plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv, additionalData:header}, key, encrypted)
      const back = unpack(plaintext, false)
      const ids = new Set()
      const expected = JSON.stringify(records.map(record => checkRecord(stored(record), ids)))
      const identical = JSON.stringify(back.map(stored)) === expected &&
        back.every((record, index) => !record.file || equalBytes(record.file.bytes, records[index].file.bytes))
      if (!identical) throw Error('Contenu différent.')
    } catch {
      throw Error('Le coffre chiffré n’a pas pu être relu à l’identique. Rien n’a été écrit : le fichier précédent est intact.')
    } finally {
      if (plaintext) new Uint8Array(plaintext).fill(0)
    }
  }

  // Deux clés sont identiques si l'une déchiffre ce que l'autre a chiffré.
  async function sameKey(first, second) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const probe = await crypto.subtle.encrypt({name:'AES-GCM', iv}, first, new Uint8Array(16))
    try {
      await crypto.subtle.decrypt({name:'AES-GCM', iv}, second, probe)
      return true
    } catch {
      return false
    }
  }

  async function attachment(file) {
    if (file.size < 1 || file.size > MAX_DOCUMENT) throw Error('Choisis un document non vide de 30 Mo maximum.')
    const bytes = new Uint8Array(await file.arrayBuffer())
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    return {name:safeName(file.name), bytes, hash:Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')}
  }

  function isPDF(bytes) {
    return new TextDecoder().decode(bytes.subarray(0, 1024)).includes('%PDF-')
  }

  // Images matricielles que le navigateur sait décoder (JPEG, PNG, GIF, WebP), reconnues à leur signature.
  function isImage(bytes) {
    const starts = (offset, ...signature) => signature.every((byte, index) => bytes[offset + index] === byte)
    return starts(0, 0xff, 0xd8, 0xff) || starts(0, 0x89, 0x50, 0x4e, 0x47) || starts(0, 0x47, 0x49, 0x46, 0x38) ||
      (starts(0, 0x52, 0x49, 0x46, 0x46) && starts(8, 0x57, 0x45, 0x42, 0x50))
  }

  async function writeFile(handle, sealed, expectedHeader) {
    const writable = await handle.createWritable({mode:'exclusive'})
    try {
      if (expectedHeader) {
        const disk = await handle.getFile()
        const header = new Uint8Array(await disk.slice(0, headerLength).arrayBuffer())
        if (!sameBytes(header, expectedHeader)) throw Error('Ce fichier a changé. Enregistre tes modifications dans une copie du coffre.')
      }
      await writable.write(sealed.blob)
      await writable.close()
    } catch (error) {
      await writable.abort().catch(() => {})
      throw error
    }
  }

  globalThis.Coffre = {types, labs, fieldRules, MAX_VAULT, MAX_DOCUMENT, safeName, freshSalt, derive, inspect, open, seal, attachment, isPDF, isImage, writeFile, check, sameKey}
})()

