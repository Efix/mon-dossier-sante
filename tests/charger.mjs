// Charge les modules de l'application directement depuis le fichier HTML livré :
// les tests portent sur le code réellement exécuté dans le navigateur, sans copie intermédiaire.
import fs from 'node:fs'
import crypto from 'node:crypto'
import vm from 'node:vm'

import {fichier} from '../outils/application.mjs'

export {fichier}

export function lireApplication() {
  const html = fs.readFileSync(fichier, 'utf8')
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])
  const csp = html.match(/script-src '(sha256-[^']+)'/)?.[1] ?? ''
  const empreinte = script => 'sha256-' + crypto.createHash('sha256').update(script, 'utf8').digest('base64')
  return {html, scripts, csp, empreinte}
}

let modules
// Les trois premiers modules du script (lecture des bilans, coffre chiffré, fiches) n'ont pas besoin du navigateur.
export function charger() {
  if (!modules) {
    const [lab, coffre, dossier] = lireApplication().scripts[0].split(/\n;\n/)
    vm.runInThisContext(lab, {filename:'Lab (lecture des bilans)'})
    vm.runInThisContext(coffre, {filename:'Coffre (chiffrement)'})
    vm.runInThisContext(dossier, {filename:'Dossier (fiches et rappels)'})
    modules = {Lab:globalThis.Lab, Coffre:globalThis.Coffre, Dossier:globalThis.Dossier}
  }
  return modules
}

export const lire = (texte, laboratoire = 'auto') => {
  const {Lab} = charger()
  return Lab.parse(Lab.pagesFromText(Array.isArray(texte) ? texte.join('\n') : texte), laboratoire)
}
export const lignes = resultat => resultat.rows.map(({name, value, unit, reference, date, page}) => [name, value, unit, reference, date, page])
