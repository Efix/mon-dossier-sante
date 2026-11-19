# Développement

Ce document décrit le code de Mon dossier santé pour qui veut le lire ou le vérifier, et le travail du mainteneur pour le modifier et le publier. Pour utiliser l'application, voir le [README](README.md). Le code n'est pas sous licence libre : voir [LICENSE](LICENSE) et [CONTRIBUTING.md](CONTRIBUTING.md).

Prérequis : Node 22 ou plus récent, et git. Le projet n'a aucune dépendance à installer.

Sur un nouveau clone, active le crochet qui vérifie chaque commit :

```bash
git config core.hooksPath .githooks
```

## Organisation du code

L'application livrée reste un seul fichier HTML, mais elle est **assemblée** à partir des sources de `src/` : on ne modifie plus le HTML à la main.

| Source | Rôle |
| --- | --- |
| `src/page.html` | Gabarit : structure des pages et des fenêtres, balise Content-Security-Policy |
| `src/style.css` | Apparence |
| `src/js/lab.js` | Lecture des comptes rendus de laboratoire (`Lab`) |
| `src/js/coffre.js` | Coffre chiffré : format, chiffrement, relecture avant écriture (`Coffre`) |
| `src/js/dossier.js` | Fiches, champs des comptes rendus, rappels de vaccination, mesures et IMC (`Dossier`) |
| `src/js/compte-rendu.js` | Lecture des comptes rendus : examen, date, indication, conclusion, médecins, lieu (`CompteRendu`) |
| `src/js/pdf-local.js` | Extraction du texte et affichage des PDF (`PdfLocal`) |
| `src/js/interface/` | Interface, en fragments numérotés d'une même fonction (ils partagent ses variables et ne s'exécutent pas seuls) |
| `src/vendor/pdfjs/` | PDF.js 4.10.38, tel que publié : ne pas modifier |
| `package.json` | `version` : numéro affiché par l'application ; `homepage` : adresse https du site, vers laquelle une version téléchargée cherche ses mises à jour |

Les modules s'exécutent dans l'ordre du tableau, chacun pouvant utiliser les précédents. Les fragments de l'interface sont assemblés dans l'ordre de leur numéro.

Outils : `outils/assembler.mjs` construit le HTML ; `outils/publier.mjs` et `outils/accueil.mjs` préparent le site ; `.github/workflows/pages.yml` le publie sur GitHub Pages.

## Modifier

Après chaque modification dans `src/` :

```bash
npm run build
```

```bash
npm test
```

`npm run build` vérifie la syntaxe de chaque source, assemble `Mon-Dossier-Sante.html` et recalcule l'empreinte du script dans la Content-Security-Policy. Sans cette empreinte à jour, le navigateur refuse d'exécuter le script et la page reste inerte, sans message.

Un crochet `pre-commit` refuse un commit dont le HTML ne correspond plus aux sources. Il s'active avec la commande indiquée plus haut. Les noms du fichier livré et du dossier des sources sont définis une seule fois, dans `outils/application.mjs`.

## Site et publication

L'application est publiée sur **https://efix.github.io/mon-dossier-sante/** par GitHub Pages, directement depuis ce dépôt : il n'y a aucun serveur à gérer. La page d'accueil propose la dernière version :

- **Télécharger** (`/v1.1.0/Mon-Dossier-Sante-v1.1.0.html`) : un seul fichier HTML, à ouvrir depuis le disque, hors ligne. C'est la façon recommandée : une fois vérifié, le fichier ne change plus ;
- **Essayer en ligne** (`/v1.1.0/`) : rien à installer, mais chaque visite fait confiance au site qui envoie la page.

Venue de l'application (« Rechercher une mise à jour », `/?depuis=1.0.0`), elle indique si une version plus récente existe. Comme l'application, elle ne se connecte à rien.

**Ce qui garantit le code publié.**

- Le site est construit par GitHub (`.github/workflows/pages.yml`) à chaque envoi sur `main`, à partir des tags `vX.Y.Z` : le fichier de chaque version est exactement celui de son tag.
- `versions-publiees.txt` note l'empreinte SHA-256 de chaque version à sa première publication. Si un tag déplacé donnait un autre contenu, la construction échoue et le site n'est pas mis à jour.
- Ce registre est public : on vérifie un fichier téléchargé en calculant son empreinte sur son propre appareil (`Get-FileHash`, `shasum -a 256`, ou `sha256sum -c --ignore-missing SHA256SUMS`).
- GitHub Pages n'envoie pas d'en-têtes de sécurité : chaque page porte sa propre Content-Security-Policy (aucune connexion), et l'application refuse de s'ouvrir dans le cadre d'un autre site.

**Publier une version**, depuis un dépôt propre (`patch` pour une correction, `minor` pour une nouveauté) :

```bash
npm version minor -m "Version %s"
```

```bash
git push --follow-tags
```

`npm version` vérifie les sources et les tests, met à jour le numéro dans `package.json`, reconstruit le HTML, commite et pose le tag, puis note l'empreinte de la nouvelle version au registre et commite celui-ci. L'envoi déclenche la construction du site. Une version dont l'application n'affiche pas le numéro de son tag est refusée. `npm run publier` prépare le même site dans `publication/` (non versionné) pour un essai local.

`homepage` dans `package.json` est l'adresse du site : une version téléchargée y cherche ses mises à jour. Si le site change d'adresse, les versions déjà téléchargées continueront de pointer vers l'ancienne.

## Tests

Les tests (Node 22 ou plus récent, sans dépendance) chargent le code depuis `src/`, et vérifient que le HTML livré en est exactement l'assemblage.

| Fichier | Vérifie |
| --- | --- |
| `tests/fichier.test.mjs` | HTML à jour avec les sources, empreinte CSP, fins de ligne, PDF.js intact, aucune connexion réseau autorisée |
| `tests/parseur.test.mjs` | Lecture des bilans Cerballiance et Check-Up, nombres, unités, sections d'urines |
| `tests/coffre.test.mjs` | Chiffrement, relecture avant écriture, limites du format, fiches structurées et comptes rendus (formats 1 à 3), changement de phrase secrète |
| `tests/compte-rendu.test.mjs` | Lecture des comptes rendus d'imagerie et de consultation, date d'examen distinguée de la date de naissance, aucune donnée d'identité reprise |
| `tests/publication.test.mjs` | Version déclarée par l'application, page d'accueil du site : script autorisé par sa CSP, aucune connexion, liens de téléchargement et d'ouverture, empreinte |
| `tests/dossier.test.mjs` | Fiches (allergies, traitements, vaccinations, antécédents), traitements en cours, rappels de vaccination, saisie des mesures et IMC |

Tous les bilans des tests sont fictifs. Pour couvrir un vrai compte rendu, ajoute son texte **anonymisé** dans `tests/parseur.test.mjs` avec les lignes attendues.
