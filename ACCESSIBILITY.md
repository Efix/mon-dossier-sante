# Accessibilité

Mon dossier santé doit pouvoir être utilisé par toute personne qui gère ses documents de santé, y compris au clavier, avec un lecteur d'écran ou avec un affichage agrandi. Cette page dit où en est l'application, et comment signaler une difficulté.

## État actuel

**L'application n'a pas encore fait l'objet d'un audit d'accessibilité**, ni selon le RGAA, ni selon les WCAG. Ce qui suit décrit ce qui est prévu dans le code, pas une conformité vérifiée.

## Ce qui est en place

- La page est déclarée en français, pour que les lecteurs d'écran utilisent la bonne prononciation.
- Les commandes sont de vrais boutons, liens et champs de formulaire, utilisables au clavier, avec un contour visible sur l'élément qui a le focus.
- Les fenêtres (ajout de document, fiche, visionneuse, changement de phrase secrète) sont des boîtes de dialogue natives du navigateur : le focus y reste tant qu'elles sont ouvertes, et la touche Échap les ferme.
- Chaque champ de formulaire a une étiquette.
- Les messages de l'application (enregistrement, erreur, avertissement) sont annoncés par les lecteurs d'écran.
- Les résultats des bilans sont aussi présentés sous forme de tableaux, et pas seulement de graphiques.
- Dans « Mon suivi biologique », chaque point d'un graphique est atteignable au clavier et décrit en toutes lettres : date, valeur, document d'origine, et position par rapport aux valeurs de référence.
- L'affichage s'adapte au zoom du navigateur.

## Limites connues

- **Graphiques** : leur lecture reste plus facile à la vue. Un lecteur d'écran peut parcourir les points un à un, mais n'a pas de résumé de la tendance.
- **Visionneuse PDF** : elle affiche les pages comme des images. Le texte d'un PDF n'y est pas lisible par un lecteur d'écran ; le document d'origine peut être ouvert dans un autre lecteur PDF.
- **Couleurs** : les résultats hors des valeurs de référence sont signalés par une couleur et par un texte, mais les contrastes n'ont pas été mesurés.
- **Animations** : l'application n'applique pas encore le réglage système « réduire les animations ».
- **Téléphone et tablette** : l'application est conçue pour un ordinateur.

## Environnements pris en charge

Microsoft Edge et Google Chrome, dans leur version actuelle, sur ordinateur (Windows, macOS, Linux). L'application n'a pas été testée méthodiquement avec les lecteurs d'écran NVDA, JAWS ou VoiceOver.

## Signaler une difficulté

Ouvrez un ticket avec le modèle [« Signaler un problème »](https://github.com/Efix/mon-dossier-sante/issues/new/choose) et commencez le titre par « Accessibilité ». Indiquez :

- ce que vous essayiez de faire ;
- ce qui vous en a empêché ;
- votre navigateur, et l'aide technique utilisée (lecteur d'écran, loupe, commande vocale, navigation au clavier…).

N'y joignez aucune information de santé réelle : les tickets sont publics. Les difficultés d'accessibilité sont traitées en priorité, au même titre que les erreurs.
