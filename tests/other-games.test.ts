import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GAMES, otherGames, otherGamesHtml, otherGamesLabel } from '../src/ui/other-games';

const expected = {
    opencade: 'https://davy45270.github.io/Opencade/',
    opencadkid: 'https://davy45270.github.io/opencadkid/',
    'petit-astronome': 'https://davy45270.github.io/petit-astronome/'
};

it('lists the three other games, never this one', () => {
    expect(GAMES).toHaveLength(4);
    expect(Object.fromEntries(otherGames().map(game => [game.id, game.url]))).toEqual(expected);
});

it('gives each game a local PNG icon and a sentence in both languages', () => {
    for (const game of otherGames()) {
        const file = 'public/' + game.icon.replace('./', '');
        expect(existsSync(file), file).toBe(true);
        expect([...readFileSync(file).subarray(0, 4)]).toEqual([137, 80, 78, 71]);
        expect(game.fr.length).toBeGreaterThan(20);
        expect(game.en.length).toBeGreaterThan(20);
    }
});

it('renders same-tab links with the exact address of each game', () => {
    for (const locale of ['fr', 'en'] as const) {
        const html = otherGamesHtml(locale);
        const links = [...html.matchAll(/<a class="other-game" href="([^"]+)" data-game="([^"]+)">/g)].map(match => [match[2], match[1]]);
        expect(Object.fromEntries(links)).toEqual(expected);
        expect(html).not.toMatch(/target=|_blank|rel=/);
        expect(html).toContain(otherGamesLabel(locale));
    }
    expect(otherGamesLabel('fr')).toBe('Mes autres jeux');
});
