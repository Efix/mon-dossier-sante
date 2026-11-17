// Assemble les sources de src/ en un seul fichier HTML autonome, l'application livrée.
//   node outils/assembler.mjs             écrit Mon-Dossier-Sante.html
//   node outils/assembler.mjs --verifier  ne modifie rien, échoue si le HTML ne correspond plus aux sources
//
// Le gabarit src/page.html contient des marques remplacées ici :
//   {{style.css}}        le contenu de src/style.css
//   {{base64:chemin}}    un fichier de src/, encodé en base64 (PDF.js, gardé tel que publié)
//   {{script}}           les modules de src/js/, puis les fragments de src/js/interface/
//   {{empreinte}}        l'empreinte sha256 du script, seule autorisée par la Content-Security-Policy
import fs from 'node:fs'
import crypto from 'node:crypto'
import vm from 'node:vm'
import {fileURLToPath} from 'node:url'

import {fichier, sources} from './application.mjs'

// Ordre d'exécution : chaque module expose son objet (Lab, Coffre, Dossier, CompteRendu, PdfLocal) aux suivants.
export const modules = ['js/lab.js', 'js/coffre.js', 'js/dossier.js', 'js/compte-rendu.js', 'js/pdf-local.js']
const dossierInterface = 'js/interface/'

const chemin = relatif => new URL(relatif, sources)
// Un éditeur Windows peut enregistrer en CRLF : sans effet sur le code, mais l'empreinte porte sur l'octet.
export const lireSource = relatif => fs.readFileSync(chemin(relatif), 'utf8').replace(/\r\n/g, '\n')

export function fragmentsInterface() {
  return fs.readdirSync(chemin(dossierInterface)).filter(nom => nom.endsWith('.js')).sort()
    .map(nom => ({nom: dossierInterface + nom, texte: lireSource(dossierInterface + nom)}))
}

// L'interface est une seule fonction : ses fragments partagent ses variables et ne s'exécutent pas seuls.
export function interfaceComplete() {
  return '(() => {\n' + fragmentsInterface().map(fragment => fragment.texte).join('') + '})()\n'
}

// Contrôle sans exécution. Chaque fragment de l'interface est d'abord lu seul, placé dans la fonction
// commune, pour que l'erreur désigne le fragment fautif et non celui qui le suit.
function controlerSyntaxe() {
  const lire = (texte, nom, decalage = 0) => {
    try {
      new vm.Script(texte, {filename: nom})
    } catch (error) {
      const ligne = Number(error.stack?.match(/^[^\n]*:(\d+)\n/)?.[1]) - decalage
      throw Error(`Erreur de syntaxe dans src/${nom}${ligne > 0 ? ', ligne ' + ligne : ''} : ${error.message}`)
    }
  }
  for (const nom of modules) lire(lireSource(nom), nom)
  for (const fragment of fragmentsInterface()) lire('(() => {\n' + fragment.texte + '})()\n', fragment.nom, 1)
  lire(interfaceComplete(), dossierInterface + ' (ensemble des fragments)')
}

function inserer(texte, marque, valeur) {
  const morceaux = texte.split(marque)
  if (morceaux.length !== 2) throw Error(`La marque ${marque} doit figurer une seule fois dans src/page.html (${morceaux.length - 1} trouvée(s)).`)
  return morceaux[0] + valeur + morceaux[1]
}

export function assembler() {
  controlerSyntaxe()
  const script = [...modules.map(lireSource), interfaceComplete()].join(';\n')
  if (script.includes('</script')) throw Error('Le script ne doit pas contenir « </script » : la page serait coupée à cet endroit.')
  const empreinte = 'sha256-' + crypto.createHash('sha256').update(script, 'utf8').digest('base64')

  let html = lireSource('page.html')
  html = inserer(html, '{{empreinte}}', empreinte)
  html = inserer(html, '{{style.css}}', lireSource('style.css'))
  for (const [marque, relatif] of [...html.matchAll(/\{\{base64:([^}]+)\}\}/g)]) {
    html = inserer(html, marque, fs.readFileSync(chemin(relatif)).toString('base64'))
  }
  html = inserer(html, '{{script}}', script)
  return {html, script, empreinte}
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const verifier = process.argv.includes('--verifier')
  const {html, empreinte} = assembler()
  const actuel = fs.existsSync(fichier) ? fs.readFileSync(fichier, 'utf8') : ''
  if (actuel === html) {
    console.log('Application à jour avec les sources (empreinte ' + empreinte + ').')
  } else if (verifier) {
    console.error('Mon-Dossier-Sante.html ne correspond plus aux sources de src/. Lance « npm run build ».')
    process.exit(1)
  } else {
    fs.writeFileSync(fichier, html, 'utf8')
    console.log('Application assemblée : ' + fileURLToPath(fichier) + '\n  empreinte CSP ' + empreinte)
  }
}
