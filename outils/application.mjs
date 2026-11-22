// Emplacements définis ici une seule fois : pour renommer l'application, modifiez la première ligne.
export const fichier = new URL('../Mon-Dossier-Sante.html', import.meta.url)
export const sources = new URL('../src/', import.meta.url)
// Version (« version ») et adresse du site de mise à jour (« homepage »), reprises dans le HTML.
export const paquet = new URL('../package.json', import.meta.url)
// Dépôt public : la page d'accueil du site renvoie à son registre des empreintes.
export const depot = 'Efix/mon-dossier-sante'

// Content-Security-Policy admise pour une page publiée : seules ces directives, avec ces seules sources.
// Toute autre directive (img-src, font-src…) ou source (*, data:, une adresse) pourrait ouvrir une connexion.
const directivesAdmises = {
  'default-src':["'none'"], 'connect-src':["'none'"], 'object-src':["'none'"], 'frame-src':["'none'"],
  'base-uri':["'none'"], 'form-action':["'none'"], 'worker-src':['blob:'], 'style-src':["'unsafe-inline'"],
  'script-src':['blob:', /^'sha256-[A-Za-z0-9+/]+={0,2}'$/],
}
// Renvoie la liste des écarts ; vide si la CSP est conforme.
export function defautsCsp(csp) {
  const ecarts = []
  const vues = new Set()
  for (const directive of String(csp).split(';').map(texte => texte.trim()).filter(Boolean)) {
    const [nom, ...valeurs] = directive.split(/\s+/)
    const cle = nom.toLowerCase()
    if (vues.has(cle)) ecarts.push(`directive répétée : ${cle}`)
    vues.add(cle)
    const admises = directivesAdmises[cle]
    if (!admises) { ecarts.push(`directive non prévue : ${directive}`); continue }
    if (!valeurs.length) ecarts.push(`directive sans valeur : ${cle}`)
    for (const valeur of valeurs) {
      if (!admises.some(admise => typeof admise === 'string' ? admise === valeur : admise.test(valeur))) ecarts.push(`source refusée dans ${cle} : ${valeur}`)
    }
  }
  for (const requise of ['default-src', 'connect-src']) if (!vues.has(requise)) ecarts.push(`directive manquante : ${requise}`)
  return ecarts
}
