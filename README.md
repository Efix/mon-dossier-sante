# Mon dossier santé

Application hors ligne en un seul fichier, `Mon-Dossier-Sante.html`. Les documents et résultats sont conservés dans un coffre chiffré `.sante` que tu gardes sur ton appareil. Aucun compte, aucun réseau.

## Utiliser

Ouvre `Mon-Dossier-Sante.html` dans Edge ou Chrome, puis choisis ton fichier `.sante`.

Le fichier `.sante` n'est jamais versionné (voir `.gitignore`) : sa sauvegarde reste à ta charge, par le bouton « Télécharger une copie chiffrée » de la page Coffre.

## Organisation du code

L'application livrée reste un seul fichier HTML, mais elle est **assemblée** à partir des sources de `src/` : on ne modifie plus le HTML à la main.

| Source | Rôle |
| --- | --- |
| `src/page.html` | Gabarit : structure des pages et des fenêtres, balise Content-Security-Policy |
| `src/style.css` | Apparence |
| `src/js/lab.js` | Lecture des comptes rendus de laboratoire (`Lab`) |
| `src/js/coffre.js` | Coffre chiffré : format, chiffrement, relecture avant écriture (`Coffre`) |
| `src/js/dossier.js` | Fiches, rappels de vaccination, mesures et IMC (`Dossier`) |
| `src/js/pdf-local.js` | Extraction du texte et affichage des PDF (`PdfLocal`) |
| `src/js/interface/` | Interface, en fragments numérotés d'une même fonction (ils partagent ses variables et ne s'exécutent pas seuls) |
| `src/vendor/pdfjs/` | PDF.js 4.10.38, tel que publié : ne pas modifier |

Les modules s'exécutent dans l'ordre du tableau, chacun pouvant utiliser les précédents. Les fragments de l'interface sont assemblés dans l'ordre de leur numéro.

## Modifier

Après chaque modification dans `src/` :

```bash
npm run build
```

```bash
npm test
```

`npm run build` vérifie la syntaxe de chaque source, assemble `Mon-Dossier-Sante.html` et recalcule l'empreinte du script dans la Content-Security-Policy. Sans cette empreinte à jour, le navigateur refuse d'exécuter le script et la page reste inerte, sans message.

Un crochet `pre-commit` refuse un commit dont le HTML ne correspond plus aux sources. Sur un nouveau clone, il s'active avec `git config core.hooksPath .githooks`. Les noms du fichier livré et du dossier des sources sont définis une seule fois, dans `outils/application.mjs`.

## Tests

Les tests (Node 22 ou plus récent, sans dépendance) chargent le code depuis `src/`, et vérifient que le HTML livré en est exactement l'assemblage.

| Fichier | Vérifie |
| --- | --- |
| `tests/fichier.test.mjs` | HTML à jour avec les sources, empreinte CSP, fins de ligne, PDF.js intact, aucune connexion réseau autorisée |
| `tests/parseur.test.mjs` | Lecture des bilans Cerballiance et Check-Up, nombres, unités, sections d'urines |
| `tests/coffre.test.mjs` | Chiffrement, relecture avant écriture, limites du format, fiches structurées, changement de phrase secrète |
| `tests/dossier.test.mjs` | Fiches (allergies, traitements, vaccinations, antécédents), traitements en cours, rappels de vaccination, saisie des mesures et IMC |

Tous les bilans des tests sont fictifs. Pour couvrir un vrai compte rendu, ajoute son texte **anonymisé** dans `tests/parseur.test.mjs` avec les lignes attendues.
