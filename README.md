# Mon dossier santé

**Vos bilans et documents de santé, rangés au même endroit, dans un coffre chiffré qui reste chez vous.**

Mon dossier santé est une application gratuite qui fonctionne entièrement dans votre navigateur. Elle n'a ni compte, ni serveur, ni abonnement : vos données ne quittent jamais votre ordinateur.

**[Télécharger l'application](https://efix.github.io/mon-dossier-sante/)** · [Essayer en ligne](https://efix.github.io/mon-dossier-sante/) · [Code source](https://github.com/Efix/mon-dossier-sante)

---

## Ce que vous pouvez faire

- **Importer vos bilans de laboratoire en PDF.** L'application lit les résultats (analyse, valeur, unité, valeurs de référence) et vous les propose. Vous les vérifiez avant de les ajouter. La lecture automatique reconnaît les comptes rendus Cerballiance et Check-Up ; pour les autres laboratoires, vous saisissez ou corrigez les valeurs vous-même.
- **Suivre l'évolution de vos résultats.** « Mon suivi biologique » trace chaque analyse dans le temps, bilan après bilan.
- **Classer vos autres documents.** Ordonnances, imagerie, comptes rendus de consultation, notes. Pour un compte rendu en PDF, l'application propose l'examen, la date, la conclusion et les médecins ; vous corrigez si besoin.
- **Tenir votre fiche santé à jour.** Allergies, traitements en cours, vaccinations avec rappel du prochain vaccin, antécédents médicaux, chirurgicaux et familiaux.
- **Noter vos mesures.** Poids, taille et IMC, tension, pouls, température, saturation en oxygène.
- **Tout retrouver dans une chronologie.** Chaque document garde son PDF d'origine, consultable dans l'application.

## Ce qu'elle ne fait pas

- **Elle ne donne pas d'avis médical.** Elle range et affiche vos documents ; l'interprétation de vos résultats reste celle de votre médecin.
- **Elle ne synchronise rien.** Pas de cloud, pas de partage, pas de sauvegarde automatique ailleurs que sur votre appareil. C'est voulu : rien ne sort de votre ordinateur sans que vous le décidiez.
- **Elle ne peut pas récupérer une phrase secrète oubliée.** Personne ne le peut, pas même l'auteur de l'application. Voir [Votre phrase secrète](#votre-phrase-secrète).

## Démarrer

1. **Téléchargez l'application** depuis [le site](https://efix.github.io/mon-dossier-sante/). C'est un seul fichier, `Mon-Dossier-Sante-vX.Y.Z.html`, de quelques mégaoctets. Rien à installer.
2. **Ouvrez-le dans Microsoft Edge ou Google Chrome**, sur ordinateur : double-clic, ou glisser le fichier dans le navigateur. Il fonctionne sans connexion Internet.
3. **Créez votre coffre** : choisissez une phrase secrète, puis l'emplacement du fichier `Dossier-sante.sante`. Ce fichier contient tout votre dossier, chiffré.
4. **Ajoutez vos documents.** Ils sont enregistrés dans le coffre au fur et à mesure.

Les fois suivantes, ouvrez l'application, cliquez sur « Choisir un coffre », sélectionnez votre fichier `.sante` et saisissez votre phrase secrète.

### Navigateurs

| Navigateur | Utilisation |
| --- | --- |
| Edge ou Chrome, sur ordinateur | Recommandé. Le coffre est enregistré directement dans son fichier, à chaque modification. |
| Firefox, Safari | Moins testés. Ces navigateurs ne permettent pas d'écrire dans un fichier existant : chaque enregistrement télécharge une nouvelle copie du coffre, et c'est à vous de garder la plus récente. |
| Téléphone, tablette | Non prévu. L'affichage et la gestion des fichiers ne sont pas adaptés. |

## Vos données et votre sécurité

**Tout reste sur votre appareil.** L'application est une page web autonome : elle ne contient aucun traceur, ne charge aucune ressource extérieure et s'interdit toute connexion réseau. Cette interdiction est inscrite dans la page elle-même, et c'est le navigateur qui l'applique.

**Votre coffre est chiffré.** Le fichier `.sante` est chiffré en AES-256-GCM. La clé est dérivée de votre phrase secrète par PBKDF2-SHA-256, avec 600 000 itérations, ce qui rend les essais de phrases très lents. Sans la phrase, le fichier est illisible, même s'il est copié sur une clé USB, envoyé par erreur ou stocké dans un cloud.

**Il se verrouille tout seul.** Après dix minutes d'inactivité, l'application referme le dossier et oublie la clé : il faut de nouveau la phrase secrète pour le rouvrir. Le bouton « Verrouiller » le fait immédiatement.

**Chaque enregistrement est relu.** Avant de remplacer votre fichier, l'application vérifie que le nouveau coffre se déchiffre correctement. Elle refuse aussi d'écraser un coffre qui a été modifié ailleurs entre-temps.

### Votre phrase secrète

Elle est la seule clé de votre coffre. **Si vous l'oubliez, votre dossier est perdu**, sauvegardes comprises.

- Choisissez une phrase longue, d'au moins 15 caractères, par exemple quatre ou cinq mots sans rapport entre eux.
- Notez-la dans un gestionnaire de mots de passe, ou sur papier rangé en lieu sûr.
- Vous pouvez la changer dans la page **Coffre**. Les anciennes sauvegardes gardent l'ancienne phrase.

### Sauvegardes

Le coffre n'existe qu'à l'endroit où vous l'avez enregistré. Un disque qui casse ou un ordinateur perdu, et il disparaît avec.

Dans la page **Coffre**, « Télécharger une copie chiffrée » crée une sauvegarde complète. Gardez-en une copie ailleurs : clé USB, disque externe, ou service de stockage en ligne. Comme la copie est chiffrée, elle est protégée là où vous la rangez, tant que votre phrase secrète est solide.

## Mettre à jour

Dans la page **Coffre**, « Rechercher une mise à jour » ouvre le site, qui vous indique si une version plus récente existe. L'application elle-même ne se connecte jamais : c'est vous qui suivez le lien.

Pour mettre à jour, téléchargez la nouvelle version et ouvrez votre coffre avec. **Votre coffre ne change pas** : seul le fichier de l'application est remplacé. Gardez l'ancien fichier quelques jours, puis supprimez-le.

Une ancienne version de l'application peut ne pas savoir lire un coffre enregistré par une version plus récente. Après une mise à jour, utilisez donc toujours la nouvelle.

## Vérifier le fichier téléchargé

Chaque version publiée a une empreinte SHA-256, affichée sur le site et inscrite une fois pour toutes dans [`versions-publiees.txt`](versions-publiees.txt). Si l'empreinte de votre fichier est identique, il est exactement celui publié ici, octet pour octet.

Dans le dossier de téléchargement, en remplaçant le nom par celui de votre fichier, sous Windows (PowerShell) :

```powershell
Get-FileHash .\Mon-Dossier-Sante-v1.1.0.html
```

Sous macOS ou Linux :

```bash
shasum -a 256 Mon-Dossier-Sante-v1.1.0.html
```

Le site est construit automatiquement par GitHub à partir de ce dépôt : le code que vous téléchargez est celui que vous pouvez lire ici.

## Questions fréquentes

**Mon laboratoire n'est pas reconnu. Que faire ?**
Importez le PDF comme bilan : il est conservé dans le coffre, et vous saisissez les résultats qui vous intéressent dans le tableau. Vous pouvez aussi le classer comme « Autre document ».

**Puis-je utiliser mon coffre sur deux ordinateurs ?**
Oui : copiez le fichier `.sante` et l'application sur l'autre ordinateur. Mais il n'y a pas de synchronisation : si vous modifiez les deux copies, elles divergent. Travaillez sur une seule à la fois.

**Que se passe-t-il si je ferme le navigateur sans enregistrer ?**
Avec Edge ou Chrome, chaque modification est enregistrée dans le fichier aussitôt faite. Avec un autre navigateur, l'application vous prévient tant qu'une modification n'a pas été téléchargée.

**Faut-il faire confiance à la version en ligne ?**
Elle est identique à la version téléchargeable. Mais à chaque visite, votre navigateur la reçoit à nouveau du site. Le fichier téléchargé, lui, ne change plus une fois vérifié : c'est l'usage recommandé pour un dossier de santé.

## Avertissement

Mon dossier santé est un outil personnel d'organisation. Ce n'est pas un dispositif médical. Les valeurs lues dans les PDF sont des propositions : comparez-les toujours au document d'origine. Pour toute question sur votre santé ou vos résultats, adressez-vous à un professionnel de santé.

## Signaler un problème

Ouvrez un ticket depuis l'onglet [Issues](https://github.com/Efix/mon-dossier-sante/issues/new/choose), avec le modèle qui correspond : problème, idée, ou document mal lu. **N'y joignez jamais un vrai document médical, un coffre ou une capture contenant vos données** : les tickets sont publics.

- Une faille de sécurité se signale en privé : voir la [politique de sécurité](SECURITY.md).
- Une difficulté d'accessibilité : voir la [déclaration d'accessibilité](ACCESSIBILITY.md).
- Les échanges suivent le [code de conduite](CODE_OF_CONDUCT.md).

## Contribuer

Les signalements et les idées sont les bienvenus ; les demandes de fusion ne sont pas acceptées pour l'instant. Tout est expliqué dans [CONTRIBUTING.md](CONTRIBUTING.md). Le fonctionnement du code est décrit dans [DEVELOPPEMENT.md](DEVELOPPEMENT.md).

## Licence

Copyright © 2026 Efix. Tous droits réservés.

Vous pouvez télécharger et utiliser gratuitement les versions publiées pour gérer vos propres documents de santé, et lire le code pour le vérifier. Le code n'est pas sous licence libre : le reproduire, le modifier ou redistribuer l'application demande une autorisation écrite. Les conditions exactes sont dans [LICENSE](LICENSE). PDF.js, inclus dans l'application, reste sous licence Apache 2.0.
