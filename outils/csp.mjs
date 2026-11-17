// Recalcule l'empreinte du script dans la balise Content-Security-Policy.
// À lancer après chaque modification du script de l'application : sans cela, le navigateur
// refuse de l'exécuter et la page reste inerte, sans message d'erreur visible.
//   node outils/csp.mjs            met l'empreinte à jour
//   node outils/csp.mjs --verifier ne modifie rien, échoue si l'empreinte est périmée
import fs from 'node:fs'
import crypto from 'node:crypto'
import vm from 'node:vm'

import {fichier} from './application.mjs'

const verifier = process.argv.includes('--verifier')
const html = fs.readFileSync(fichier, 'utf8')
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])
if (scripts.length !== 1) throw Error('Un seul script exécutable est attendu, ' + scripts.length + ' trouvé(s).')
new vm.Script(scripts[0], {filename:'script de l’application'}) // contrôle de syntaxe, sans exécution

const actuelle = html.match(/script-src '(sha256-[^']+)'/)?.[1]
if (!actuelle) throw Error('Empreinte sha256 introuvable dans la balise Content-Security-Policy.')
const attendue = 'sha256-' + crypto.createHash('sha256').update(scripts[0], 'utf8').digest('base64')

if (actuelle === attendue) {
  console.log('Empreinte CSP à jour : ' + attendue)
} else if (verifier) {
  console.error('Empreinte CSP périmée.\n  dans le fichier : ' + actuelle + '\n  attendue        : ' + attendue + '\nLance « npm run csp ».')
  process.exit(1)
} else {
  fs.writeFileSync(fichier, html.replace(actuelle, attendue), 'utf8')
  console.log('Empreinte CSP mise à jour :\n  ' + actuelle + '\n  -> ' + attendue)
}
