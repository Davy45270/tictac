# TicTac

[English](README.md)

Un jeu doux pour apprendre à lire l’heure de 5 à 9 ans. L’enfant déplace les aiguilles au doigt, observe l’affichage numérique et choisit son guide : Boubou, CaliRoux, Pestouille, Tutu ou Lumi. Français par défaut, anglais disponible. Aucun chronomètre, compte ni publicité.

[Jouer en ligne](https://davy45270.github.io/tictac/).

Huit niveaux : heures pleines, demies, quarts, tranches de cinq minutes, minute près, format 24 h, calcul « dans quelques minutes », moments de la journée. Les niveaux 1 à 7 proposent de lire et de régler. Chaque série compte dix questions ; deux étoiles débloquent le niveau suivant. Après une erreur, on peut réessayer tranquillement.

## Installer et développer

Dans le navigateur, choisir Installer ou Ajouter à l’écran d’accueil. Après une première visite complète en ligne, le jeu fonctionne hors connexion.

Utiliser la version Node de `.nvmrc` puis :

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Les tests unitaires vérifient le moteur pur, les séries, les textes, la sauvegarde et les personnages. Les tests navigateur couvrent le doigt bruité, les progrès, le clavier, les langues et le hors-ligne. Les icônes se régénèrent avec `node scripts/make-icons.js`. Les règles précises figurent dans [GAME_SPEC.md](GAME_SPEC.md).

## Vie privée

Tout progrès reste sur le téléphone, avec la langue et le guide choisis. Aucune collecte, aucun traceur, aucune publicité ni requête applicative de données. Seuls les fichiers statiques et le service worker sont téléchargés pour installer le jeu. Le bouton Écouter utilise la synthèse vocale du navigateur ; seules les voix locales de la langue choisie sont utilisées, et le bouton est masqué si aucune n’est disponible.

Licence MIT © 2026 David Sevin — [LICENSE](LICENSE).
