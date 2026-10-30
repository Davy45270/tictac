# TicTac 0.1.0 — règles et oracle

## Clarification de l’exemple d’aimantation

L’exemple initial « 352° → 55 minutes au pas 5 » contredit l’arrondi au multiple le plus proche : 352° est à 8° de 0 minute, mais à 22° de 55 minutes. Cette version applique la règle générale : 352° → 0 ; 332° → 55. Le test vérifie également la distance minimale pour chaque degré et chaque pas, plutôt qu’une exception près de 12.

## Temps et gestes

Un temps est une paire entière h ∈ [0,23], m ∈ [0,59]. Les angles sont horaires depuis le haut, dans [0,360) : minute = 6m ; heure = 30(h modulo 12) + m/2. Le point exactement au centre donne 0°. L’aimantation choisit le multiple de pas le plus proche, une égalité arrondit dans le sens horaire, 60 devient 0.

Le glissement des minutes fait avancer ou reculer l’heure lors du passage de 12, avec bouclage sur 24 heures. Le déplacement angulaire signé le plus court détermine le sens ; une minute aimantée passant de la dernière moitié à la première dans le sens horaire ajoute une heure, le passage inverse dans le sens antihoraire en retire une. Passer de 29 à 30 ne change jamais l’heure. Au pas 30, l’angle brut distingue les deux côtés du passage. Les événements successifs doivent parcourir moins d’un demi-tour. L’aiguille des heures garde les minutes et la moitié de journée, et sélectionne l’angle corrigé de m/2 le plus proche. La comparaison sur cadran ignore la moitié de journée ; la comparaison complète distingue 3:30 et 15:30. L’addition accepte des valeurs négatives et boucle sur 1440 minutes.

L’enfant peut saisir toute la longueur d’une aiguille dans une zone de 48 unités SVG, soit au moins 44 pixels sur le cadran mobile. La distance au segment départage les aiguilles ; égalité exacte : heure prioritaire. Capture du pointeur jusqu’au relâchement, même hors du cadran. Seul le pointerId ayant saisi l’aiguille dirige le geste ; les autres doigts sont ignorés. Annulation et perte de capture terminent ce geste. Le centre à moins de 12 unités est ignoré durant le déplacement. Les flèches droite/haut ajoutent un pas aux minutes, gauche/bas le retirent. Pour les heures, elles ajoutent ou retirent exactement une heure (±1 h), en gardant les minutes. Les bornes ARIA sont 0–11 pour les heures et 0–59 pour les minutes, avec la valeur courante correspondante. Le niveau 1 bloque les minutes. Aucun minuteur.

## Niveaux

1. Heures pleines : h 0–11, m=0, pas 60. Seule l’aiguille des heures est réglable.
2. Demies : h 0–11, m ∈ {0,30}, pas 30.
3. Quarts : h 0–11, m ∈ {0,15,30,45}, pas 15.
4. Cinq minutes : h 0–11, m multiple de 5.
5. Minute près : h 0–11, m 0–59, pas 1.
6. 24 heures : h 0–23, m multiple de 5. Réponses écrites complètes en 24 h ; réglage évalué sur le temps complet (`sameTime`). Deux boutons matin / après-midi sélectionnent la moitié de journée, indépendamment du cadran. Le numérique suit le réglage en 24 h. Le soleil indique matin ou après-midi ; la lune indique soir ou nuit. Le texte distingue les quatre périodes : nuit [00:00,06:00), matin [06:00,12:00), après-midi [12:00,18:00), soir [18:00,24:00).
7. Addition : départ sur une tranche de cinq minutes, delta déterministe parmi 15,30,45,60 puis 5,10,20,25 selon la graine. Cible = départ + delta modulo 24 h. En lecture, le cadran montre le départ ; en réglage, le départ est écrit et l’enfant construit la cible. Comparaison sur cadran.
8. Journée : uniquement des choix, heure complète en 24 h, minutes multiples de 5. Les activités sont des exemples associés à un moment, sans prétendre imposer les habitudes familiales.

Les plages du niveau 8 sont disjointes et couvrent la journée. Les bornes droites sont exclues :

| Moment | Plage | Exemple |
| --- | --- | --- |
| Nuit | [00:00,06:00) | dodo |
| Matin | [06:00,12:00) | petit-déjeuner ou école |
| Midi | [12:00,14:00) | déjeuner |
| Après-midi | [14:00,18:00) | goûter |
| Soir | [18:00,24:00) | dîner |

Chaque distracteur du niveau 8 représente un autre moment distinct et une heure à au moins 180 minutes de la cible, distance circulaire sur 24 h. Il n’existe donc qu’une catégorie correcte.

## Génération

Le PRNG entier est mulberry32. Même niveau, sens, graine et taille donnent exactement la même série. Un mélange du domaine légal garantit dix cibles distinctes ; en niveau 7, le départ est dérivé de la cible pour éviter les collisions après addition. Les quatre choix sont distincts aussi sur le cadran. La cible apparaît exactement une fois. Les candidats privilégient ±1 heure, ±un pas et aiguilles inversées si valides, puis complètent dans le domaine légal. Les positions correctes tournent entre les quatre cases avec un décalage issu de la graine. Les séries de taille invalide lèvent RangeError.

## Progression

Une série compte dix questions. Bonne réponse au premier essai : un point. Une erreur ne fait pas avancer ; le guide encourage un réessai. Trouver après une erreur fait avancer sans point. Étoiles : 3 à partir de 9, 2 à partir de 7, 1 à partir de 5, 0 sinon (« on réessaie ensemble »). Le meilleur score reste conservé séparément pour chaque niveau et sens. Deux étoiles dans l’un des sens du niveau précédent débloquent le suivant. Le niveau 8 utilise le sens lecture.

La sauvegarde versionnée est `tictac.v1`. Une donnée absente, illisible ou d’une autre version rend un état neuf ; les scores invalides sont ignorés. Tous les accès au stockage sont protégés.

## Oracle de vérification

- 1440 minutes : formules d’angles exactes et retour heure/minute identique ; huit directions et centre.
- Chaque pas : résultats légaux, angles négatifs, bouclage, égalités, 357° → 0, 352° → 0 et 332° → 55 au pas 5.
- Glissements : minuit, midi, sens inverse, 29→30 et un tour complet bruité qui avance d’une seule heure.
- 200 graines pour chaque couple niveau/sens : dix cibles uniques, domaine légal, quatre choix distincts, une cible ; addition et distances des moments. Chaque cas reste sous deux secondes.
- 400 questions : chaque case correcte représente entre 15 % et 35 %.
- Textes français et anglais : heures, quarts, demies, moins cinq, midi, minuit et 24 h.
- Scores : seuils exacts, réessai, déblocage, conservation du meilleur ; stockage corrompu ou bloqué.
- Personnages : les cinq, toutes les expressions, animations et modes de mouvement produisent du SVG sans valeur non finie.
- E2E : série parfaite, erreur/réessai, langue, clavier et tailles ; installation puis rechargement sans réseau ; quatre séries tactiles bruitées complètes, capture hors cadran, absence de défilement. Chaque scénario collecte les erreurs console et exceptions.

Le crochet `window.__tictac.state()` renvoie une copie de l’écran, du niveau, du sens, de l’index, de la question (dont la cible), de l’heure réglée et de la géométrie écran. Objet gelé, propriété non remplaçable, aucun accès en écriture au jeu. Les tests peuvent préparer une sauvegarde locale pour accéder à un niveau avancé.

En lecture, le numérique affiche `--:--` avec le libellé accessible « À toi de trouver » jusqu’à la bonne réponse ; il révèle ensuite la cible avant « Continuer ». Au niveau 6, chaque choix montre le numérique 24 h puis les mots en petit. Le repère soleil/lune apparaît uniquement aux niveaux 6 et 8. Au niveau 7, « Écouter » lit le délai et le départ, jamais la cible calculée.

Les séries tactiles bruitées couvrent les niveaux 1, 4, 5 et 6, avec sélection de la moitié de journée au niveau 6, dix bonnes réponses au premier essai, trois étoiles et aucun défilement.
