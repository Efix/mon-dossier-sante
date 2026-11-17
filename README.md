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
| `src/js/dossier.js` | Fiches, champs des comptes rendus, rappels de vaccination, mesures et IMC (`Dossier`) |
| `src/js/compte-rendu.js` | Lecture des comptes rendus : examen, date, indication, conclusion, médecins, lieu (`CompteRendu`) |
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

## Version web

La même application peut être servie en ligne, par une image Docker (`deploiement/`). Le serveur n'envoie que la page : le coffre reste sur l'appareil de la personne, et la page s'interdit toute connexion réseau.

**Ce qu'il faut savoir.** En local, le code ne change que si tu changes le fichier. En ligne, celui qui contrôle le serveur pourrait servir une page modifiée. D'où trois garanties :

- chaque version a sa propre adresse (`/v1.0.0/`), dont le contenu ne change jamais ;
- son empreinte SHA-256 est affichée sur la page d'accueil et dans `/SHA256SUMS` : une page enregistrée depuis le site doit avoir exactement cette empreinte, et s'utilise ensuite hors ligne ;
- `deploiement/versions-publiees.txt` note l'empreinte de chaque version à sa première publication : si un tag déplacé donnait un autre contenu, `npm run publier` refuse.

**Installer sur une machine qui a Docker** (ni Node ni npm nécessaires) :

```bash
git clone https://github.com/Efix/mon-dossier-sante.git
```

```bash
cd mon-dossier-sante && docker compose -f deploiement/compose.yaml up -d --build
```

L'application répond alors sur `http://127.0.0.1:8080`, depuis la machine seulement. Il faut devant elle un proxy inverse en **HTTPS** (Caddy, Traefik, nginx…) : sans HTTPS, le navigateur refuse le chiffrement et l'application reste bloquée.

**Mettre à jour** la machine après la publication d'une nouvelle version :

```bash
git pull && docker compose -f deploiement/compose.yaml up -d --build
```

**Publier une version**, sur le poste de développement, depuis un dépôt propre où `npm run verifier` passe :

```bash
git tag v1.0.1
```

```bash
npm run publier
```

```bash
git add deploiement/versions-publiees.txt && git commit -m "Publication v1.0.1"
```

```bash
git push && git push origin v1.0.1
```

`npm run publier` note l'empreinte de la nouvelle version au registre et prépare `publication/` (non versionné) pour un essai local. L'image, elle, reconstruit ses pages à partir de **tous** les tags `vX.Y.Z` (`publier --registre`) et refuse une version absente du registre ou dont le contenu diffère : les anciennes versions restent en ligne à leur adresse, la page d'accueil mène à la plus récente.

**Le serveur.** nginx sans privilèges, conteneur en lecture seule, sans capacités, méthodes GET et HEAD seulement, en-têtes de sécurité (`deploiement/entetes-securite.conf`), cache définitif sur les versions. L'image finale ne contient que les pages publiées et la configuration du serveur : ni Node, ni git, ni l'historique. Le `.dockerignore` est une liste blanche : aucun coffre `.sante` ne peut entrer dans la construction.

## Tests

Les tests (Node 22 ou plus récent, sans dépendance) chargent le code depuis `src/`, et vérifient que le HTML livré en est exactement l'assemblage.

| Fichier | Vérifie |
| --- | --- |
| `tests/fichier.test.mjs` | HTML à jour avec les sources, empreinte CSP, fins de ligne, PDF.js intact, aucune connexion réseau autorisée |
| `tests/parseur.test.mjs` | Lecture des bilans Cerballiance et Check-Up, nombres, unités, sections d'urines |
| `tests/coffre.test.mjs` | Chiffrement, relecture avant écriture, limites du format, fiches structurées et comptes rendus (formats 1 à 3), changement de phrase secrète |
| `tests/compte-rendu.test.mjs` | Lecture des comptes rendus d'imagerie et de consultation, date d'examen distinguée de la date de naissance, aucune donnée d'identité reprise |
| `tests/dossier.test.mjs` | Fiches (allergies, traitements, vaccinations, antécédents), traitements en cours, rappels de vaccination, saisie des mesures et IMC |

Tous les bilans des tests sont fictifs. Pour couvrir un vrai compte rendu, ajoute son texte **anonymisé** dans `tests/parseur.test.mjs` avec les lignes attendues.
