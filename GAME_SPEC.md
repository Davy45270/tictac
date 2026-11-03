# TicTac 0.1.0 — règles et oracle

## Clarification de l’exemple d’aimantation

L’exemple initial « 352° → 55 minutes au pas 5 » contredit l’arrondi au multiple le plus proche : 352° est à 8° de 0 minute, mais à 22° de 55 minutes. Cette version applique la règle générale : 352° → 0 ; 332° → 55. Le test vérifie également la distance minimale pour chaque degré et chaque pas, plutôt qu’une exception près de 12.

## Temps et gestes

Un temps est une paire entière h ∈ [0,23], m ∈ [0,59]. Les angles sont horaires depuis le haut, dans [0,360) : minute = 6m ; heure = 30(h modulo 12) + m/2. Le point exactement au centre donne 0°. L’aimantation choisit le multiple de pas le plus proche, une égalité arrondit vers la valeur supérieure dans le sens horaire pour chacun des pas 60, 30, 15, 5 et 1 ; 60 devient 0. Ainsi les angles à mi-chemin 180°, 90°, 45°, 15° et 3° donnent respectivement 0, 30, 15, 5 et 1 minute.

Le glissement des minutes fait avancer ou reculer l’heure lorsque l’angle brut du doigt passe du dernier quadrant au premier (ou inversement), avec bouclage sur 24 heures. Le geste conserve le dernier angle brut, indépendamment de la minute aimantée. Une minute arrondie à zéro ne change donc pas encore l’heure si le doigt n’a pas franchi 12. Les échantillons successifs doivent parcourir moins de 90°. Passer de 29 à 30 ne change jamais l’heure. L’aiguille des heures garde les minutes et la moitié de journée, et sélectionne l’angle corrigé de m/2 le plus proche. La comparaison sur cadran ignore la moitié de journée ; la comparaison complète distingue 3:30 et 15:30. L’addition accepte des valeurs négatives et boucle sur 1440 minutes.

L’enfant peut saisir toute la longueur d’une aiguille dans une zone de 48 pixels écran, indépendante de la taille du SVG ; la sélection géométrique utilise également ce rayon de 24 pixels. Hors de la zone centrale exclue, à ±20 pixels perpendiculairement à un segment, la saisie réussit (sauf si l’autre aiguille est plus proche) ; à 30 pixels, ce segment ne peut être saisi. Une autre aiguille ne peut alors gagner que si elle est plus proche et à au plus 24 pixels du doigt. La distance au segment départage les aiguilles ; égalité exacte : heure prioritaire. Capture du pointeur jusqu’au relâchement, même hors du cadran. Seul le pointerId ayant saisi l’aiguille dirige le geste ; les autres doigts sont ignorés. Annulation et perte de capture terminent ce geste. Le centre à moins de 12 unités SVG (12 × largeur écran du SVG / 320 pixels écran) est ignoré à la saisie comme durant le déplacement ; à partir de 12 unités, la sélection géométrique habituelle s’applique. Les flèches droite/haut ajoutent un pas aux minutes, gauche/bas le retirent. Pour les heures, elles ajoutent ou retirent exactement une heure (±1 h), en gardant les minutes. Les bornes ARIA sont 0–11 pour les heures et 0–59 pour les minutes, avec la valeur courante correspondante. Le niveau 1 bloque les minutes. Aucun minuteur.

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

## Niveaux 9 à 12 (0.4.0)

9. En chiffres : h 0–11, pas 5 ; les propositions sont des heures numériques (`3:45`) ; en réglage, la consigne n’affiche que l’heure numérique.
10. Sans chiffres : même domaine, cadran sans nombres (bâtons d’heures, doublés à 12, 3, 6 et 9), propositions numériques.
11. Chiffres romains : même domaine, cadran de I à XII, propositions en lettres.
12. Midi ou minuit : lecture seule. Cibles 11:35–12:30 et 23:35–00:30 au pas 5, c’est-à-dire les heures que les mots disent « midi » ou « minuit ». Les propositions sont la cible, sa jumelle à ±12 h, et une voisine de chacune décalée d’un même écart (±5, ±10 ou ±15 min) : deux paires identiques sur le cadran. Le ciel suit le cadran (jour pour 11 h et 12 h, nuit pour 23 h et 0 h) avec un repère soleil ou lune ; les propositions s’écrivent en 24 h avec les mots, l’anglais disant noon et midnight.

Chaque niveau se débloque par deux étoiles sur son prérequis (l’un des sens) : 1→2→…→8, 4→9, 9→10, 9→11, 6→12.

## Suivi de l’apprentissage

Chaque question se clôt par un résultat : **sûr** (juste au premier essai), **réessai** (juste après une erreur, calmement) ou **hasard** (une réponse moins d’une seconde après une erreur, ou en lecture les trois mauvaises propositions essayées). À la première erreur sur une question, un exercice proche est planifié trois questions plus loin, ou au début de la série suivante s’il n’y a plus la place (au plus trois en attente par niveau et sens) : l’heure confondue si elle est légale, sinon une voisine (jumelle à 12 h, aiguilles inversées, ±1 h, ±un pas). Une révision réussie du premier coup sort de la liste. Une série qui compte trois résultats « hasard » ou plus ne valide pas ses étoiles (aucun record, aucun déblocage). La maîtrise d’un niveau et d’un sens est acquise quand les 20 derniers résultats (deux séries) comptent au moins 18 « sûr », aucun « hasard » et plus aucune révision en attente. Une simulation de 2 000 enfants sur 20 séries vérifie qu’un joueur au hasard, lent ou rapide, n’atteint jamais la maîtrise, qu’un joueur hésitant entre deux réponses l’atteint dans moins de 1 % des cas, et qu’un enfant à 95 % de réussite l’atteint en deux séries en médiane.

Le suivi est rangé dans la même sauvegarde locale (`mastery`, `reviews`), validé à la lecture comme les scores. L’espace parents s’ouvre après une multiplication ; il peut effacer le suivi en deux appuis. Un test interdit tout canal réseau dans le code de l’application.

## Génération

Le PRNG entier est mulberry32. Même niveau, sens, graine et taille donnent exactement la même série. Un mélange du domaine légal garantit dix cibles distinctes ; en niveau 7, le départ est dérivé de la cible pour éviter les collisions après addition. Les quatre choix sont distincts aussi sur le cadran. La cible apparaît exactement une fois. Les candidats privilégient ±1 heure, ±un pas et aiguilles inversées si valides, puis complètent dans le domaine légal. Les niveaux 1 à 7 conservent au moins un distracteur à ±un pas lorsqu’il est valide, en plus d’un voisin à ±1 heure ou d’aiguilles inversées valides (ces critères peuvent coïncider au pas 60). Les positions correctes tournent entre les quatre cases avec un décalage issu de la graine. Les séries de taille invalide lèvent RangeError.

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
