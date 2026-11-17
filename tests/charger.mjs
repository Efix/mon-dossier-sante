// Charge les modules de l'application depuis les sources de src/ : les tests portent sur le code
// tel qu'il est écrit, et fichier.test.mjs vérifie que le HTML livré en est bien l'assemblage.
import fs from 'node:fs'
import crypto from 'node:crypto'
import vm from 'node:vm'

import {fichier} from '../outils/application.mjs'
import {lireSource} from '../outils/assembler.mjs'

export {fichier}

export function lireApplication() {
  const html = fs.readFileSync(fichier, 'utf8')
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])
  const csp = html.match(/script-src '(sha256-[^']+)'/)?.[1] ?? ''
  const empreinte = script => 'sha256-' + crypto.createHash('sha256').update(script, 'utf8').digest('base64')
  return {html, scripts, csp, empreinte}
}

let modules
// Les quatre premiers modules (bilans, coffre chiffré, fiches, comptes rendus) n'ont pas besoin du navigateur.
export function charger() {
  if (!modules) {
    for (const nom of ['js/lab.js', 'js/coffre.js', 'js/dossier.js', 'js/compte-rendu.js']) vm.runInThisContext(lireSource(nom), {filename: 'src/' + nom})
    modules = {Lab:globalThis.Lab, Coffre:globalThis.Coffre, Dossier:globalThis.Dossier, CompteRendu:globalThis.CompteRendu}
  }
  return modules
}

export const lire = (texte, laboratoire = 'auto') => {
  const {Lab} = charger()
  return Lab.parse(Lab.pagesFromText(Array.isArray(texte) ? texte.join('\n') : texte), laboratoire)
}
export const lignes = resultat => resultat.rows.map(({name, value, unit, reference, date, page}) => [name, value, unit, reference, date, page])
