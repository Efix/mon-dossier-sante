// Prépare le dossier publication/, publié tel quel sur GitHub Pages (voir .github/workflows/pages.yml).
//   node outils/publier.mjs             publie tous les tags et note les nouvelles versions au registre
//   node outils/publier.mjs --registre  n'accepte que les versions déjà notées (construction du site par GitHub)
//   node outils/publier.mjs --commiter  commite aussi le registre (lancé par « npm version », voir package.json)
//
// Chaque version publiée est le HTML d'un tag git « vX.Y.Z », servi à l'adresse /vX.Y.Z/ et, à
// l'identique, en téléchargement (/vX.Y.Z/Mon-Dossier-Sante-vX.Y.Z.html) : son contenu ne change jamais.
// Son empreinte SHA-256 est notée une fois pour toutes dans versions-publiees.txt (fichier
// versionné) : si un tag déplacé donnait un autre contenu, la publication est refusée. Le code servi en
// ligne n'est donc jamais autre chose que celui du dépôt.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {fichier, depot, defautsCsp} from './application.mjs'
import {pageAccueil} from './accueil.mjs'

const racine = fileURLToPath(new URL('../', import.meta.url))
const sortie = path.join(racine, 'publication')
const registre = path.join(racine, 'versions-publiees.txt')
const nomApplication = path.basename(fileURLToPath(fichier))
const nomTelechargement = tag => nomApplication.replace(/\.html$/, '') + '-' + tag + '.html'
const formatTag = /^v\d+\.\d+\.\d+$/
// Sur GitHub : une version absente du registre commité n'a jamais été validée, elle n'est pas servie.
const registreSeul = process.argv.includes('--registre')
const commiter = process.argv.includes('--commiter')

const git = (...args) => execFileSync('git', args, {cwd: racine, maxBuffer: 256 * 1024 * 1024})
const sha256 = octets => crypto.createHash('sha256').update(octets).digest('hex')

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
  console.error('Aucune version à publier : créez d’abord une version, par exemple avec « npm version patch ».')
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
  const ecarts = defautsCsp(csp)
  if (ecarts.length) {
    throw Error(`${tag} : la Content-Security-Policy n'interdit pas toute connexion réseau (${ecarts.join(' ; ')}), publication refusée.`)
  }
  const empreinte = sha256(html)
  const notee = connues.get(tag)
  if (notee && notee !== empreinte) {
    throw Error(`${tag} a déjà été publiée avec l'empreinte ${notee}, mais le tag donne aujourd'hui ${empreinte}.\n` +
      'Une version publiée ne change jamais : publiez une nouvelle version plutôt que de déplacer un tag.')
  }
  if (!notee && registreSeul) {
    throw Error(`${tag} n'est pas notée dans versions-publiees.txt : lancez « npm run publier » puis commitez ce fichier.`)
  }
  // L'application affiche sa version : ce doit être celle du tag. Les versions déjà notées peuvent n'en déclarer aucune.
  const declaree = texte.match(/<meta name="application-version" content="([^"]*)">/)?.[1]
  if (declaree !== undefined ? 'v' + declaree !== tag : !notee) {
    throw Error(`${tag} : l'application déclare la version « ${declaree ?? 'aucune'} ». Créez les versions avec « npm version patch » ` +
      '(ou minor, major) : il met à jour package.json, reconstruit le HTML et pose le tag en une fois.')
  }
  if (!notee) nouvelles.push({tag, empreinte})
  versions.push({tag, empreinte, html, fichier: nomTelechargement(tag), octets: html.length,
    date: git('log', '-1', '--format=%cs', tag).toString().trim()})
}

fs.rmSync(sortie, {recursive: true, force: true})
for (const {tag, html, fichier: nom} of versions) {
  fs.mkdirSync(path.join(sortie, tag), {recursive: true})
  fs.writeFileSync(path.join(sortie, tag, 'index.html'), html)
  fs.writeFileSync(path.join(sortie, tag, nom), html)
}

const derniere = versions.at(-1)
// Noms des fichiers téléchargés : « sha256sum -c --ignore-missing SHA256SUMS » les vérifie dans le dossier de téléchargement.
fs.writeFileSync(path.join(sortie, 'SHA256SUMS'), versions.map(({fichier: nom, empreinte}) => `${empreinte}  ${nom}`).join('\n') + '\n')
fs.writeFileSync(path.join(sortie, 'index.html'), pageAccueil({versions, depot}))

if (nouvelles.length) {
  const entete = fs.existsSync(registre) ? '' :
    '# Empreinte SHA-256 de chaque version publiée, notée à sa première publication et jamais modifiée.\n'
  fs.appendFileSync(registre, entete + nouvelles.map(({tag, empreinte}) => `${empreinte}  ${tag}`).join('\n') + '\n')
  if (commiter) {
    git('add', '--', path.relative(racine, registre))
    git('commit', '-m', `Publication ${nouvelles.map(v => v.tag).join(', ')}`)
  }
}

console.log(`Publication prête dans publication/ : ${versions.length} version(s), actuelle ${derniere.tag}.`)
for (const {tag, empreinte} of versions) console.log(`  ${tag}  ${empreinte}`)
if (nouvelles.length) {
  console.log(`\nNouvelle(s) version(s) notée(s) dans versions-publiees.txt : ${nouvelles.map(v => v.tag).join(', ')}.` +
    (commiter ? '\nRegistre commité. Envoyez le tout avec « git push --follow-tags ».' :
      '\nCommitez ce fichier : il protège ces versions contre toute modification ultérieure.'))
}
