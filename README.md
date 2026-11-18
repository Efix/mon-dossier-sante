# Mon dossier santé

**Tes bilans et documents de santé, rangés au même endroit, dans un coffre chiffré qui reste chez toi.**

Mon dossier santé est une application gratuite qui fonctionne entièrement dans ton navigateur. Elle n'a ni compte, ni serveur, ni abonnement : tes données ne quittent jamais ton ordinateur.

**[Télécharger l'application](https://efix.github.io/mon-dossier-sante/)** · [Essayer en ligne](https://efix.github.io/mon-dossier-sante/) · [Code source](https://github.com/Efix/mon-dossier-sante)

---

## Ce que tu peux faire

- **Importer tes bilans de laboratoire en PDF.** L'application lit les résultats (analyse, valeur, unité, valeurs de référence) et te les propose. Tu les vérifies avant de les ajouter. La lecture automatique reconnaît les comptes rendus Cerballiance et Check-Up ; pour les autres laboratoires, tu saisis ou corriges les valeurs toi-même.
- **Suivre l'évolution de tes résultats.** « Mon suivi biologique » trace chaque analyse dans le temps, bilan après bilan.
- **Classer tes autres documents.** Ordonnances, imagerie, comptes rendus de consultation, notes. Pour un compte rendu en PDF, l'application propose l'examen, la date, la conclusion et les médecins ; tu corriges si besoin.
- **Tenir ta fiche santé à jour.** Allergies, traitements en cours, vaccinations avec rappel du prochain vaccin, antécédents médicaux, chirurgicaux et familiaux.
- **Noter tes mesures.** Poids, taille et IMC, tension, pouls, température, saturation en oxygène.
- **Retrouver tout dans une chronologie.** Chaque document garde son PDF d'origine, consultable dans l'application.

## Ce qu'elle ne fait pas

- **Elle ne donne pas d'avis médical.** Elle range et affiche tes documents ; l'interprétation de tes résultats reste celle de ton médecin.
- **Elle ne synchronise rien.** Pas de cloud, pas de partage, pas de sauvegarde automatique ailleurs que sur ton appareil. C'est voulu : rien ne sort de ton ordinateur sans que tu le décides.
- **Elle ne peut pas récupérer une phrase secrète oubliée.** Personne ne le peut, pas même l'auteur de l'application. Voir [Ta phrase secrète](#ta-phrase-secrète).

## Démarrer

1. **Télécharge l'application** depuis [le site](https://efix.github.io/mon-dossier-sante/). C'est un seul fichier, `Mon-Dossier-Sante-vX.Y.Z.html`, de quelques mégaoctets. Rien à installer.
2. **Ouvre-le dans Microsoft Edge ou Google Chrome**, sur ordinateur : double-clic, ou glisser le fichier dans le navigateur. Il fonctionne sans connexion Internet.
3. **Crée ton coffre** : choisis une phrase secrète, puis l'emplacement du fichier `Dossier-sante.sante`. Ce fichier contient tout ton dossier, chiffré.
4. **Ajoute tes documents.** Ils sont enregistrés dans le coffre au fur et à mesure.

Les fois suivantes, ouvre l'application, clique sur « Choisir un coffre », sélectionne ton fichier `.sante` et saisis ta phrase secrète.

### Navigateurs

| Navigateur | Utilisation |
| --- | --- |
| Edge ou Chrome, sur ordinateur | Recommandé. Le coffre est enregistré directement dans son fichier, à chaque modification. |
| Firefox, Safari | Moins testés. Ces navigateurs ne permettent pas d'écrire dans un fichier existant : chaque enregistrement télécharge une nouvelle copie du coffre, et c'est à toi de garder la plus récente. |
| Téléphone, tablette | Non prévu. L'affichage et la gestion des fichiers ne sont pas adaptés. |

## Tes données et ta sécurité

**Tout reste sur ton appareil.** L'application est une page web autonome : elle ne contient aucun traceur, ne charge aucune ressource extérieure et s'interdit toute connexion réseau. Cette interdiction est inscrite dans la page elle-même, et c'est le navigateur qui l'applique.

**Ton coffre est chiffré.** Le fichier `.sante` est chiffré en AES-256-GCM. La clé est dérivée de ta phrase secrète par PBKDF2-SHA-256, avec 600 000 itérations, ce qui rend les essais de phrases très lents. Sans la phrase, le fichier est illisible, même s'il est copié sur une clé USB, envoyé par erreur ou stocké dans un cloud.

**Il se verrouille tout seul.** Après dix minutes d'inactivité, l'application referme le dossier et oublie la clé : il faut de nouveau la phrase secrète pour le rouvrir. Le bouton « Verrouiller » le fait immédiatement.

**Chaque enregistrement est relu.** Avant de remplacer ton fichier, l'application vérifie que le nouveau coffre se déchiffre correctement. Elle refuse aussi d'écraser un coffre qui a été modifié ailleurs entre-temps.

### Ta phrase secrète

Elle est la seule clé de ton coffre. **Si tu l'oublies, ton dossier est perdu**, sauvegardes comprises.

- Choisis une phrase longue, d'au moins 15 caractères, par exemple quatre ou cinq mots sans rapport entre eux.
- Note-la dans un gestionnaire de mots de passe, ou sur papier rangé en lieu sûr.
- Tu peux la changer dans la page **Coffre**. Les anciennes sauvegardes gardent l'ancienne phrase.

### Sauvegardes

Le coffre n'existe qu'à l'endroit où tu l'as enregistré. Un disque qui casse ou un ordinateur perdu, et il disparaît avec.

Dans la page **Coffre**, « Télécharger une copie chiffrée » crée une sauvegarde complète. Garde-en une copie ailleurs : clé USB, disque externe, ou service de stockage en ligne. Comme la copie est chiffrée, elle est protégée là où tu la ranges, tant que ta phrase secrète est solide.

## Mettre à jour

Dans la page **Coffre**, « Rechercher une mise à jour » ouvre le site, qui t'indique si une version plus récente existe. L'application elle-même ne se connecte jamais : c'est toi qui suis le lien.

Pour mettre à jour, télécharge la nouvelle version et ouvre ton coffre avec. **Ton coffre ne change pas** : seul le fichier de l'application est remplacé. Garde l'ancien fichier quelques jours, puis supprime-le.

Une ancienne version de l'application peut ne pas savoir lire un coffre enregistré par une version plus récente. Après une mise à jour, utilise donc toujours la nouvelle.

## Vérifier le fichier téléchargé

Chaque version publiée a une empreinte SHA-256, affichée sur le site et inscrite une fois pour toutes dans [`versions-publiees.txt`](versions-publiees.txt). Si l'empreinte de ton fichier est identique, il est exactement celui publié ici, octet pour octet.

Dans le dossier de téléchargement, en remplaçant le nom par celui de ton fichier, sous Windows (PowerShell) :

```powershell
Get-FileHash .\Mon-Dossier-Sante-v1.1.0.html
```

Sous macOS ou Linux :

```bash
shasum -a 256 Mon-Dossier-Sante-v1.1.0.html
```

Le site est construit automatiquement par GitHub à partir de ce dépôt : le code que tu télécharges est celui que tu peux lire ici.

## Questions fréquentes

**Mon laboratoire n'est pas reconnu. Que faire ?**
Importe le PDF comme bilan : il est conservé dans le coffre, et tu saisis les résultats qui t'intéressent dans le tableau. Tu peux aussi le classer comme « Autre document ».

**Puis-je utiliser mon coffre sur deux ordinateurs ?**
Oui : copie le fichier `.sante` et l'application sur l'autre ordinateur. Mais il n'y a pas de synchronisation : si tu modifies les deux copies, elles divergent. Travaille sur une seule à la fois.

**Que se passe-t-il si je ferme le navigateur sans enregistrer ?**
Avec Edge ou Chrome, chaque modification est enregistrée dans le fichier aussitôt faite. Avec un autre navigateur, l'application te prévient tant qu'une modification n'a pas été téléchargée.

**Faut-il faire confiance à la version en ligne ?**
Elle est identique à la version téléchargeable. Mais à chaque visite, ton navigateur la reçoit à nouveau du site. Le fichier téléchargé, lui, ne change plus une fois vérifié : c'est l'usage recommandé pour un dossier de santé.

## Avertissement

Mon dossier santé est un outil personnel d'organisation. Ce n'est pas un dispositif médical. Les valeurs lues dans les PDF sont des propositions : compare-les toujours au document d'origine. Pour toute question sur ta santé ou tes résultats, adresse-toi à un professionnel de santé.

## Signaler un problème

Ouvre un ticket dans l'onglet [Issues](https://github.com/Efix/mon-dossier-sante/issues) du dépôt. **N'y joins jamais un vrai document médical, un coffre ou une capture contenant tes données** : les tickets sont publics. Si un compte rendu est mal lu, décris sa mise en page ou fournis un exemple dont tu as remplacé toutes les informations personnelles.

## Contribuer

L'organisation du code, la construction de l'application, les tests et la publication des versions sont décrits dans [DEVELOPPEMENT.md](DEVELOPPEMENT.md).
