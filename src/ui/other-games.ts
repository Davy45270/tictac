import type { Locale } from '../engine/text';

/**
 * The author's other games, written here once and shown from the home screen.
 * A plain link opens the game in the same tab: no request is made by this page,
 * and the icons are local files cached with the rest of the app.
 */
export interface OtherGame {
    id: string;
    name: string;
    url: string;
    icon: string;
    fr: string;
    en: string
}

export const GAMES: readonly OtherGame[] = [
    {
        id: 'opencade', name: 'Opencade', url: 'https://davy45270.github.io/Opencade/', icon: './autres-jeux/opencade.png',
        fr: 'Des jeux d’arcade originaux, au doigt, à la souris ou au clavier.', en: 'Original arcade games for touch, mouse or keyboard.'
    },
    {
        id: 'opencadkid', name: 'Opencadkid', url: 'https://davy45270.github.io/opencadkid/', icon: './autres-jeux/opencadkid.png',
        fr: 'Des petits jeux doux pour les tout-petits, avec Boubou et ses amis.', en: 'Gentle little games for young children, with Boubou and friends.'
    },
    {
        id: 'tictac', name: 'TicTac', url: 'https://davy45270.github.io/tictac/', icon: './autres-jeux/tictac.png',
        fr: 'Apprendre à lire l’heure en jouant, à son rythme.', en: 'Learn to tell the time by playing, at your own pace.'
    },
    {
        id: 'petit-astronome', name: 'Petit Astronome', url: 'https://davy45270.github.io/petit-astronome/', icon: './autres-jeux/petit-astronome.png',
        fr: 'Découvrir le Soleil, les planètes, la Lune et les étoiles en jouant.', en: 'Discover the Sun, the planets, the Moon and the stars by playing.'
    }
];

export const SELF = 'tictac';
export const otherGames = (self = SELF): OtherGame[] => GAMES.filter(game => game.id !== self);

const t = (locale: Locale, fr: string, en: string): string => locale === 'fr' ? fr : en;

export const otherGamesLabel = (locale: Locale): string => t(locale, 'Mes autres jeux', 'My other games');

export function otherGamesHtml(locale: Locale): string {
    const items = otherGames().map(game => `
            <li><a class="other-game" href="${game.url}" data-game="${game.id}">
                <img src="${game.icon}" alt="" width="64" height="64" loading="eager">
                <span><b>${game.name}</b><span>${game[locale]}</span></span>
            </a></li>`).join('');
    return `<button id="back">${t(locale, 'Accueil', 'Home')}</button>
        <section class="glass other-games" aria-labelledby="other-games-title">
            <h1 id="other-games-title" tabindex="-1">${otherGamesLabel(locale)}</h1>
            <ul>${items}</ul>
        </section>`;
}
