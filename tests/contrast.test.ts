import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { characters, ids } from '../src/characters/model';
import { buttonColors, contrastRatio, mixWithWhite } from '../src/ui/contrast';

describe('WCAG button contrast', () => {
    it('uses the WCAG sRGB transfer function and white mixing', () => {
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
        expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
        expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.478, 3);
        expect(mixWithWhite('#000000', .24)).toBe('#c2c2c2');
    });
    it.each(ids)('%s keeps every button surface at least 4.5:1', id => {
        const colors = buttonColors(characters[id].accent);
        const pairs = [
            ...['light', 'base', 'hoverLight', 'hover', 'character', 'selected'].flatMap(background =>
                ['ink', 'levelInk'].map(ink => [ink, background])),
            ...['actionLight', 'action', 'actionHover'].map(background => ['actionInk', background]),
            ['disabledInk', 'disabled'], ['correctInk', 'correct'], ['incorrectInk', 'incorrect']
        ];
        for (const [ink, background] of pairs as [keyof typeof colors, keyof typeof colors][]) {
            expect(contrastRatio(colors[ink], colors[background]), `${id}: ${ink} on ${background}`).toBeGreaterThanOrEqual(4.5);
        }
    });
    it('connects the tested colors to CSS variables assigned by the app', () => {
        const css = readFileSync(new URL('../src/ui/style.css', import.meta.url), 'utf8');
        const app = readFileSync(new URL('../src/ui/app.ts', import.meta.url), 'utf8');
        for (const name of Object.keys(buttonColors(characters.panda.accent))) {
            expect(css).toContain(`var(--button-${name})`);
        }
        expect(app).toContain('Object.entries(buttonColors(accent))');
        expect(app).toContain('setProperty(`--button-${name}`, value)');
    });
});
