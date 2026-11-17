# Mon dossier santé

Application hors ligne en un seul fichier, `Mon-Dossier-Sante.html`. Les documents et résultats sont conservés dans un coffre chiffré `.sante` que tu gardes sur ton appareil. Aucun compte, aucun réseau.

## Utiliser

Ouvre `Mon-Dossier-Sante.html` dans Edge ou Chrome, puis choisis ton fichier `.sante`.

Le fichier `.sante` n'est jamais versionné (voir `.gitignore`) : sa sauvegarde reste à ta charge, par le bouton « Télécharger une copie chiffrée » de la page Coffre.

## Modifier

Tout le code est dans le fichier HTML, dont le nom est défini une seule fois dans `outils/application.mjs`. Après chaque modification du script :

```bash
npm run csp
```

```bash
npm test
```

`npm run csp` recalcule l'empreinte du script dans la balise Content-Security-Policy. Sans cela, le navigateur refuse d'exécuter le script et la page reste inerte, sans message. Un crochet `pre-commit` refuse un commit dont l'empreinte est périmée ; sur un nouveau clone, il s'active avec `git config core.hooksPath .githooks`.

Les deux très longues lignes `pdf-main` et `pdf-worker` contiennent la bibliothèque PDF.js encodée : ne pas y toucher. Un test vérifie qu'elles sont intactes.

## Tests

Les tests (Node 22 ou plus récent, sans dépendance) chargent le code directement depuis le fichier HTML.

| Fichier | Vérifie |
| --- | --- |
| `tests/fichier.test.mjs` | Empreinte CSP, fins de ligne, PDF.js intact, aucune connexion réseau autorisée |
| `tests/parseur.test.mjs` | Lecture des bilans Cerballiance et Check-Up, nombres, unités, sections d'urines |
| `tests/coffre.test.mjs` | Chiffrement, relecture avant écriture, limites du format, fiches structurées, changement de phrase secrète |
| `tests/dossier.test.mjs` | Fiches (allergies, traitements, vaccinations, antécédents), traitements en cours, rappels de vaccination |

Tous les bilans des tests sont fictifs. Pour couvrir un vrai compte rendu, ajoute son texte **anonymisé** dans `tests/parseur.test.mjs` avec les lignes attendues.
