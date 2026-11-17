// Prépare le dossier publication/, servi tel quel par l'image Docker (voir deploiement/).
//   node outils/publier.mjs
//
// Chaque version publiée est le HTML d'un tag git « vX.Y.Z », placé à l'adresse /vX.Y.Z/ :
// le contenu d'une adresse ne change jamais. Son empreinte SHA-256 est notée une fois pour toutes dans
// deploiement/versions-publiees.txt (fichier versionné) : si un tag déplacé donnait un autre contenu,
// la publication est refusée. Le code servi en ligne n'est donc jamais autre chose que celui du dépôt.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {fichier} from './application.mjs'

const racine = fileURLToPath(new URL('../', import.meta.url))
const sortie = path.join(racine, 'publication')
const registre = path.join(racine, 'deploiement', 'versions-publiees.txt')
const nomApplication = path.basename(fileURLToPath(fichier))
const formatTag = /^v\d+\.\d+\.\d+$/

const git = (...args) => execFileSync('git', args, {cwd: racine, maxBuffer: 256 * 1024 * 1024})
const sha256 = octets => crypto.createHash('sha256').update(octets).digest('hex')
const echapper = texte => texte.replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c])

function lireRegistre() {
  const connues = new Map()
  if (!fs.existsSync(registre)) return connues
  for (const ligne of fs.readFileSync(registre, 'utf8').split('\n')) {
    const m = ligne.match(/^([0-9a-f]{64}) {2}(v\d+\.\d+\.\d+)$/)
    if (m) connues.set(m[2], m[1])
  }
  return connues
}

const tags = git('tag', '--list', 'v*', '--sort=v:refname').toString().split('\n').filter(tag => formatTag.test(tag))
if (!tags.length) {
  console.error('Aucune version à publier : crée d’abord un tag, par exemple « git tag v1.0.0 ».')
  process.exit(1)
}

const connues = lireRegistre()
const versions = []
const nouvelles = []
for (const tag of tags) {
  let html
  try {
    html = git('show', `${tag}:${nomApplication}`)
  } catch {
    throw Error(`Le tag ${tag} ne contient pas ${nomApplication}.`)
  }
  const texte = html.toString('utf8')
  // Garde-fous : une version publiée doit s'interdire tout réseau et ne pas dépendre d'une ressource extérieure.
  const csp = texte.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1] ?? ''
  if (!/connect-src 'none'/.test(csp) || !/default-src 'none'/.test(csp) || /https?:/.test(csp)) {
    throw Error(`${tag} : la Content-Security-Policy n'interdit pas toute connexion réseau, publication refusée.`)
  }
  const empreinte = sha256(html)
  const notee = connues.get(tag)
  if (notee && notee !== empreinte) {
    throw Error(`${tag} a déjà été publiée avec l'empreinte ${notee}, mais le tag donne aujourd'hui ${empreinte}.\n` +
      'Une version publiée ne change jamais : publie une nouvelle version plutôt que de déplacer un tag.')
  }
  if (!notee) nouvelles.push({tag, empreinte})
  versions.push({tag, empreinte, html, date: git('log', '-1', '--format=%cs', tag).toString().trim()})
}

fs.rmSync(sortie, {recursive: true, force: true})
for (const {tag, html} of versions) {
  fs.mkdirSync(path.join(sortie, tag), {recursive: true})
  fs.writeFileSync(path.join(sortie, tag, 'index.html'), html)
}

const derniere = versions.at(-1)
const sommes = versions.map(({tag, empreinte}) => `${empreinte}  ${tag}/index.html`).join('\n') + '\n'
fs.writeFileSync(path.join(sortie, 'SHA256SUMS'), sommes)

const lignes = [...versions].reverse().map(({tag, empreinte, date}) =>
  `      <tr><td><a href="${tag}/">${tag}</a>${tag === derniere.tag ? ' <small>(actuelle)</small>' : ''}</td><td>${date}</td><td><code>${empreinte}</code></td></tr>`)
fs.writeFileSync(path.join(sortie, 'index.html'), `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Mon dossier santé : versions</title>
  <style>
    body { font: 16px/1.5 system-ui, sans-serif; max-width: 60rem; margin: 2rem auto; padding: 0 1rem; color: #1f2933; }
    table { border-collapse: collapse; width: 100%; }
    th, td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #d9e2ec; vertical-align: top; }
    code { font-size: .8rem; word-break: break-all; }
    .ouvrir { display: inline-block; margin: .5rem 0 1.5rem; padding: .6rem 1rem; background: #1f6f8b; color: #fff; border-radius: .4rem; text-decoration: none; }
  </style>
</head>
<body>
  <h1>Mon dossier santé</h1>
  <p>Application de dossier médical personnel. Elle fonctionne entièrement dans ton navigateur : ton coffre chiffré <code>.sante</code> reste sur ton appareil, rien n'est envoyé à ce serveur.</p>
  <a class="ouvrir" href="${derniere.tag}/">Ouvrir la version ${echapper(derniere.tag)}</a>
  <h2>Versions</h2>
  <p>Le contenu d'une adresse de version ne change jamais. Pour vérifier qu'une page est bien celle du code publié, télécharge-la (enregistrer sous) et compare son empreinte SHA-256 à celle-ci. Une page enregistrée s'utilise aussi hors ligne, sans ce serveur.</p>
  <table>
    <thead><tr><th>Version</th><th>Date</th><th>Empreinte SHA-256</th></tr></thead>
    <tbody>
${lignes.join('\n')}
    </tbody>
  </table>
  <p>Liste des empreintes : <a href="SHA256SUMS">SHA256SUMS</a>.</p>
</body>
</html>
`)

if (nouvelles.length) {
  const entete = fs.existsSync(registre) ? '' :
    '# Empreinte SHA-256 de chaque version publiée, notée à sa première publication et jamais modifiée.\n'
  fs.appendFileSync(registre, entete + nouvelles.map(({tag, empreinte}) => `${empreinte}  ${tag}`).join('\n') + '\n')
}

console.log(`Publication prête dans publication/ : ${versions.length} version(s), actuelle ${derniere.tag}.`)
for (const {tag, empreinte} of versions) console.log(`  ${tag}  ${empreinte}`)
if (nouvelles.length) {
  console.log(`\nNouvelle(s) version(s) notée(s) dans deploiement/versions-publiees.txt : ${nouvelles.map(v => v.tag).join(', ')}.` +
    '\nCommite ce fichier : il protège ces versions contre toute modification ultérieure.')
}
