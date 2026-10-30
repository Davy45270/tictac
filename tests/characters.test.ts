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
            expect(new TextEncoder().encode(svg).length).toBeLessThan(12 * 1024);
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
