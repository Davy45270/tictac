import { it, expect } from 'vitest';
import { say, formatDigital, type Locale, type Style } from '../src/engine/text';

const cases: [number, number, Locale, Style, string][] = [
    [1, 0, 'fr', '24', 'une heure'],
    [21, 0, 'fr', '24', 'vingt et une heures'],
    [21, 20, 'fr', '24', 'vingt et une heures vingt'],
    [0, 0, 'fr', '24', 'minuit'],
    [0, 20, 'fr', '24', 'minuit vingt'],
    [12, 0, 'fr', '24', 'midi'],
    [1, 0, 'fr', '12', 'une heure'],
    [3, 0, 'fr', '12', 'trois heures'],
    [3, 15, 'fr', '12', 'trois heures et quart'],
    [3, 30, 'fr', '12', 'trois heures et demie'],
    [3, 45, 'fr', '12', 'quatre heures moins le quart'],
    [3, 55, 'fr', '12', 'quatre heures moins cinq'],
    [12, 0, 'fr', '12', 'midi'],
    [0, 0, 'fr', '12', 'minuit'],
    [12, 30, 'fr', '12', 'midi et demi'],
    [15, 30, 'fr', '24', 'quinze heures trente'],
    [7, 25, 'en', '12', 'twenty-five past seven'],
    [8, 40, 'en', '12', 'twenty to nine'],
    [1, 0, 'en', '12', "one o'clock"],
    [12, 30, 'en', '12', 'half past twelve'],
    [0, 30, 'en', '12', 'half past twelve'],
    [11, 45, 'en', '12', 'quarter to twelve'],
    [3, 0, 'en', '12', "three o'clock"],
    [3, 15, 'en', '12', 'quarter past three'],
    [3, 30, 'en', '12', 'half past three'],
    [3, 45, 'en', '12', 'quarter to four'],
    [3, 55, 'en', '12', 'five to four'],
    [12, 0, 'en', '12', 'noon'],
    [0, 0, 'en', '12', 'midnight'],
    [15, 30, 'en', '24', 'fifteen thirty']
];
for (const [h, m, locale, style, text] of cases) {
    it(`${locale} ${h}:${m} ${style}`, () => expect(say({h, m}, locale, style)).toBe(text));
}

it('digital formats', () => {
    expect(formatDigital({
        h: 15, m: 30
    })).toBe('3:30');
    expect(formatDigital({
        h: 15, m: 30
    },
    '24')).toBe('15:30');
    expect(formatDigital({
        h: 0, m: 0
    },
    '24')).toBe('00:00');
});
