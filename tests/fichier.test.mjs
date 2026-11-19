// Intégrité du fichier HTML livré : ce qui, cassé, rend l'application inerte sans message.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import {lireApplication} from './charger.mjs'
import {assembler} from '../outils/assembler.mjs'
import {sources} from '../outils/application.mjs'

const {html, scripts, csp, empreinte} = lireApplication()

test('le HTML livré est exactement l’assemblage des sources de src/', () => {
  assert.ok(assembler().html === html, 'HTML périmé : lancez « npm run build ».')
})

test('un seul script exécutable, dont l’empreinte est celle de la CSP', () => {
  assert.equal(scripts.length, 1)
  assert.equal(csp, empreinte(scripts[0]), 'Empreinte périmée : lancez « npm run build ».')
})

test('fins de ligne LF uniquement (une conversion en CRLF invaliderait l’empreinte)', () => {
  assert.equal(html.includes('\r'), false)
})

test('la bibliothèque PDF.js embarquée est intacte (4.10.38, telle que publiée)', () => {
  const somme = fichier => crypto.createHash('sha256').update(fs.readFileSync(new URL('vendor/pdfjs/' + fichier, sources))).digest('hex')
  assert.equal(somme('pdf.min.mjs'), '27fc2a057a00f92a4334ad06e17dbd7259912954e9fb7f76400bcca5fd190a9c')
  assert.equal(somme('pdf.worker.min.mjs'), '1baa1844c89c80a5b2797c916e75ab29254be46d8e9cb53cb6364d7aad84be36')
  const blocs = html.split('\n').filter(ligne => ligne.includes('<script type="application/octet-stream"'))
  assert.equal(blocs.length, 2)
  const embarque = crypto.createHash('sha256').update(blocs.join('\n') + '\n', 'utf8').digest('hex')
  assert.equal(embarque, '6cd1329e90b21855cb586e6beefc8d2156015cf12b21dff9c89afb8d2c6ff234')
})

test('la CSP interdit toute connexion réseau', () => {
  const regle = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]
  assert.match(regle, /default-src 'none'/)
  assert.match(regle, /connect-src 'none'/)
  assert.doesNotMatch(regle, /https?:/)
})
