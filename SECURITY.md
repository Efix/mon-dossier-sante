# Politique de sécurité

Mon dossier santé conserve des données de santé. Sa sécurité repose sur trois promesses :

- le coffre `.sante` ne peut pas être lu sans la phrase secrète ;
- l'application ne se connecte à aucun serveur et n'envoie rien ;
- le fichier publié est exactement celui construit à partir de ce dépôt.

Tout ce qui permettrait de contourner l'une d'elles est une faille de sécurité.

## Signaler une faille

**N'ouvre pas de ticket public.** Utilise le signalement privé de GitHub : onglet [Security](https://github.com/Efix/mon-dossier-sante/security), puis « Report a vulnerability ». Seul le mainteneur voit ton signalement.

Indique, si possible :

- la version de l'application, affichée sur l'écran d'accueil et dans la page Coffre ;
- le navigateur et le système utilisés ;
- les étapes pour reproduire le problème, avec un coffre et des documents fictifs ;
- ce qu'un attaquant pourrait obtenir.

N'envoie jamais un vrai coffre, une vraie phrase secrète ou un vrai document médical, même dans un signalement privé.

## Ce qui se passe ensuite

- Tu reçois une première réponse sous sept jours.
- Le problème est confirmé ou expliqué, puis corrigé dans une nouvelle version publiée sur le site.
- Un avis de sécurité est publié dans le dépôt une fois la correction disponible. Tu y es cité si tu le souhaites.

Le projet est maintenu bénévolement et ne propose pas de récompense.

## Versions prises en charge

Seule la dernière version publiée sur [le site](https://efix.github.io/mon-dossier-sante/) reçoit des corrections. Une version publiée ne change jamais : une correction prend toujours la forme d'une nouvelle version.

## Ce qui entre dans le champ

- Lire ou modifier un coffre sans la phrase secrète, ou affaiblir son chiffrement.
- Faire sortir des données de l'application : connexion réseau, ressource extérieure, contournement de la Content-Security-Policy.
- Exécuter du code à partir d'un document importé, par exemple un PDF piégé.
- Corrompre un coffre, ou perdre des données sans avertissement.
- Faire publier sur le site un fichier différent de celui du dépôt, ou une version dont l'empreinte ne correspond pas au registre `versions-publiees.txt`.

## Ce qui n'en relève pas

- Une phrase secrète faible, devinée ou notée en clair.
- Un ordinateur déjà compromis : logiciel malveillant, extension de navigateur malveillante, accès physique à une session ouverte.
- Une copie de l'application obtenue ailleurs que sur le site ou dans ce dépôt, ou modifiée.
- L'absence d'en-têtes HTTP de sécurité sur GitHub Pages, que l'hébergement ne permet pas de définir : chaque page porte sa propre politique, et l'application refuse de s'ouvrir dans le cadre d'un autre site.
