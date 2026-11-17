// Intégrité du fichier HTML livré : ce qui, cassé, rend l'application inerte sans message.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {lireApplication} from './charger.mjs'

const {html, scripts, csp, empreinte} = lireApplication()

test('un seul script exécutable, dont l’empreinte est celle de la CSP', () => {
  assert.equal(scripts.length, 1)
  assert.equal(csp, empreinte(scripts[0]), 'Empreinte périmée : lance « npm run csp ».')
})

test('fins de ligne LF uniquement (une conversion en CRLF invaliderait l’empreinte)', () => {
  assert.equal(html.includes('\r'), false)
})

test('la bibliothèque PDF.js embarquée est intacte', () => {
  const blocs = html.split('\n').filter(ligne => ligne.includes('<script type="application/octet-stream"'))
  assert.equal(blocs.length, 2)
  const somme = crypto.createHash('sha256').update(blocs.join('\n') + '\n', 'utf8').digest('hex')
  assert.equal(somme, '6cd1329e90b21855cb586e6beefc8d2156015cf12b21dff9c89afb8d2c6ff234')
})

test('la CSP interdit toute connexion réseau', () => {
  const regle = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]
  assert.match(regle, /default-src 'none'/)
  assert.match(regle, /connect-src 'none'/)
  assert.doesNotMatch(regle, /https?:/)
})
