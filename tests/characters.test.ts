import { it, expect } from 'vitest';
import { ids, expressions, animations, characters, drawList, others, type Expression } from '../src/characters/model';
import { characterSvg } from '../src/characters/svg';

function inspect(svg: string): void {
    const stack: string[] = [];
    for (const match of svg.matchAll(/<([^>]+)>/g)) {
        const tag = match[1]!;
        const name = /^\/?([a-zA-Z]+)/.exec(tag)?.[1];
        expect(name).toBeDefined();
        if (tag.startsWith('/')) expect(stack.pop()).toBe(name);
        else {
            expect(tag.slice(name!.length).replace(/\/$/, '').replace(/[a-zA-Z][a-zA-Z0-9:-]*="[^"]*"/g, '').trim()).toBe('');
            if (!tag.endsWith('/')) stack.push(name!);
        }
    }
    expect(stack).toEqual([]);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    const defined = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    expect(new Set(defined).size).toBe(defined.length);
    for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) expect(defined).toContain(ref[1]);
}
const normalize = (svg: string): string => svg.replace(/guide\d+-/g, 'guide-');
for (const id of ids) {
    it(`${id}: complete, bounded, self-contained SVG in every state`, () => {
        for (const expression of expressions) for (const animation of animations) for (const motion of ['full', 'reduce'] as const) {
            const svg = characterSvg(id, expression, animation, motion);
            inspect(svg);
            expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
            expect(svg).toContain('viewBox="0 0 240 240"');
            expect(svg).toContain(`role="img" aria-label="${characters[id].fr}"`);
            expect(svg.endsWith('</svg>')).toBe(true);
            expect(new TextEncoder().encode(svg).length).toBeLessThan(16 * 1024);
            expect((svg.match(/<(?:circle|ellipse|path|polygon|polyline) /g) ?? []).length).toBeGreaterThanOrEqual(40);
            expect(svg).toMatch(/<(?:radialGradient|linearGradient) /);
            expect(svg).toContain(characters[id].coat);
            expect(svg).toContain(characters[id].accent);
            expect(svg).not.toMatch(/<style|class=|<image|href=/);
            if (motion === 'reduce') expect(svg).not.toMatch(/<animate|animation|style=/);
            else expect(svg).toContain('<animateTransform');
            inspect(svg.replace(/<svg[^>]*>/, '<g transform="translate(10 20)">').replace('</svg>', '</g>'));
        }
    });
    it(`${id}: expressions differ beyond generated identifiers and unknown expressions fall back`, () => {
        expect(new Set(expressions.map(e => normalize(characterSvg(id, e)))).size).toBe(5);
        expect(normalize(characterSvg(id, 'celebration' as Expression))).toBe(normalize(characterSvg(id, 'joie')));
        const first = characterSvg(id);
        const second = characterSvg(id);
        const names = [...first.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
        for (const name of names) expect(second).not.toContain(`id="${name}"`);
    });
    it(`${id}: fallback model and registry remain available`, () => {
        expect(others(id)).toEqual(ids.filter(other => other !== id));
        expect(drawList(id, 'profil', 'concentre', 'special', 300, 'reduce').length).toBeGreaterThan(10);
    });
}

// Inspect actual painted geometry, so a label alone cannot satisfy these checks.
const paths = (svg: string): string[] => [...svg.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]!);
it('red panda keeps five cream bands clipped inside its curled tail', () => {
    const svg = characterSvg('pandaroux');
    expect(svg).toMatch(/<g clip-path="url\(#guide\d+-tail\)">/);
    const bands = [...svg.matchAll(/<path d="M(\d+) (\d+) q27 9 47 -13"[^>]+stroke-width="8"/g)];
    expect(bands).toHaveLength(5);
    expect(new Set(bands.map(b => b[2])).size).toBe(5);
});
it('unicorn has an elongated lowered muzzle, paired nostrils and a spiral horn', () => {
    const svg = characterSvg('licorne');
    expect(paths(svg)).toContain('M111 121 Q123 114 145 119 Q168 121 169 143 Q169 159 147 160 Q121 163 109 146 Q103 133 111 121Z');
    expect(paths(svg)).toContain('M114 55 L129 8 Q137 29 137 56Z');
    expect(paths(svg)).toContain('M124 27 l10 4 m-14 7 15 5');
    for (const x of [128, 151]) expect(svg).toContain(`<ellipse cx="${x}" cy="136" rx="3" ry="4"`);
});
it('panda patches tilt in opposite directions and no feline cheek zigzags remain', () => {
    const svg = characterSvg('panda');
    expect(svg).toContain('rotate(24 88 98)');
    expect(svg).toContain('rotate(-24 151 98)');
    expect(paths(svg).some(d => d.startsWith('M57 91') && d.includes('L119 39 123 44'))).toBe(true);
    expect(paths(svg).some(d => d.includes('L192 119'))).toBe(false);
});
it('dragon plates and wing fingers differ from the dancer skirt and spiral tail', () => {
    const dragon = paths(characterSvg('dragon'));
    for (const y of [150, 162, 174, 186]) expect(dragon).toContain(`M94 ${y} Q119 ${y+10} 143 ${y}`);
    expect(dragon).toContain('M30 104 L62 130 L44 139 M62 130 L76 154');
    const dancer = paths(characterSvg('singe'));
    expect(dancer).toContain('M158 182 C227 213 232 144 208 142 C187 141 190 164 205 160');
    expect(dancer.some(d => d.includes('L185 190') && d.includes('57 191Z'))).toBe(true);
});
it('sadness adds a visible blue tear while concentration keeps a tongue', () => {
    for (const id of ids) {
        const sad = characterSvg(id, 'triste');
        expect(sad).toContain('fill="#88d9ed"');
        expect(characterSvg(id, 'concentre')).not.toContain('fill="#88d9ed"');
        expect(paths(characterSvg(id, 'concentre'))).toContain('M123 138 Q126 150 133 144 L133 135');
    }
});

it('soft blush, clipped lighting and iris glints remain self-contained', () => {
    for (const id of ids) {
        const svg = characterSvg(id);
        expect(svg).toMatch(/<g clip-path="url\(#guide\d+-head\)">/);
        expect(svg).toMatch(/<radialGradient id="guide\d+-blush">/);
        expect(svg).toContain('stop-opacity="0"');
        expect(svg).toContain(id === 'licorne' ? 'fill="#a7f3f3"' : 'fill="#ffd080"');
    }
});
