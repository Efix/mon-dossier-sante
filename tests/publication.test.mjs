// Version déclarée par l'application et page d'accueil du site (téléchargement, empreintes, mises à jour).
import {test} from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import vm from 'node:vm'
import {lireApplication} from './charger.mjs'
import {paquet} from '../outils/application.mjs'
import {pageAccueil, scriptPage, empreinteScript} from '../outils/accueil.mjs'

const {html} = lireApplication()
const meta = nom => html.match(new RegExp(`<meta name="${nom}" content="([^"]*)">`))?.[1]

test('l’application déclare la version de package.json et, au plus, une adresse https de mise à jour', () => {
  const {version} = JSON.parse(fs.readFileSync(paquet, 'utf8'))
  assert.equal(meta('application-version'), version)
  const site = meta('application-site')
  assert.ok(site === '' || /^https:\/\/[^\s"<>]+[^/]$/.test(site), site)
})

const versions = [
  {tag: 'v1.0.0', empreinte: 'a'.repeat(64), date: '2026-11-01', fichier: 'Mon-Dossier-Sante-v1.0.0.html', octets: 4_000_000},
  {tag: 'v1.1.0', empreinte: 'b'.repeat(64), date: '2026-11-18', fichier: 'Mon-Dossier-Sante-v1.1.0.html', octets: 4_200_000},
]
const page = pageAccueil({versions, depot: 'Efix/mon-dossier-sante'})

test('la page d’accueil n’exécute que son script, dont l’empreinte est dans sa CSP', () => {
  const csp = page.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]
  const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1])
  assert.deepEqual(scripts, [scriptPage])
  assert.equal(empreinteScript, 'sha256-' + crypto.createHash('sha256').update(scriptPage, 'utf8').digest('base64'))
  assert.ok(csp.includes(`script-src '${empreinteScript}';`), csp)
  assert.match(csp, /default-src 'none'/)
  assert.match(csp, /connect-src 'none'/)
  assert.doesNotMatch(csp, /https?:/)
  new vm.Script(scriptPage)
})

test('la page d’accueil propose la dernière version en téléchargement et en ligne, avec son empreinte', () => {
  assert.match(page, /href="v1\.1\.0\/">Essayer en ligne/)
  assert.match(page, /href="v1\.1\.0\/Mon-Dossier-Sante-v1\.1\.0\.html" download>/)
  assert.match(page, /href="v1\.0\.0\/Mon-Dossier-Sante-v1\.0\.0\.html" download>/)
  assert.match(page, /data-derniere="1\.1\.0"/)
  assert.match(page, new RegExp('<code>' + 'b'.repeat(64) + '</code>'))
})
