// Emplacements définis ici une seule fois : si tu renommes l'application, change la première ligne.
export const fichier = new URL('../Mon-Dossier-Sante.html', import.meta.url)
export const sources = new URL('../src/', import.meta.url)
// Version (« version ») et adresse du site de mise à jour (« homepage »), reprises dans le HTML.
export const paquet = new URL('../package.json', import.meta.url)
// Dépôt public : la page d'accueil du site renvoie à son registre des empreintes.
export const depot = 'Efix/mon-dossier-sante'
