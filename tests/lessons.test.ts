import { expect, it } from 'vitest';
import { dayPeriod, moment } from '../src/engine/levels';
import { generateSession, matchesSetting } from '../src/engine/session';
import { spokenPrompt } from '../src/engine/text';

it('dayPeriod follows the independent hour table, including noon', () => {
    const periods = ['night', 'night', 'night', 'night', 'night', 'night', 'morning', 'morning', 'morning', 'morning', 'morning', 'morning', 'afternoon', 'afternoon', 'afternoon', 'afternoon', 'afternoon', 'afternoon', 'evening', 'evening', 'evening', 'evening', 'evening', 'evening'];
    for (let h = 0; h < 24; h++) {
        for (const m of [0, 59]) {
            expect(dayPeriod({
                h, m
            })).toBe(periods[h]);
            expect(dayPeriod({
                h, m
            })).toBe(moment({
                h, m
            }).id === 'noon' ? 'afternoon' : moment({
                h, m
            }).id);
        }
    }
});

it('24-hour settings require the right half-day; other dial lessons ignore it', () => {
    for (const h of [0, 3, 12, 15, 23]) {
        const question = {
            ...generateSession(6, 'set', 1)[0]!, target: {
                h, m: 30
            }
        };
        expect(matchesSetting(question, {
            h, m: 30
        })).toBe(true);
        expect(matchesSetting(question, {
            h: (h + 12) % 24, m: 30
        })).toBe(false);
        expect(matchesSetting(question, {
            h, m: 35
        })).toBe(false);
        expect(matchesSetting({
            ...question, level: 5
        },
        {
            h: (h + 12) % 24, m: 30
        })).toBe(true);
    }
});

it('spoken addition prompts state the delay and departure without solving it', () => {
    for (const kind of ['read', 'set'] as const) {
        const question = {
            ...generateSession(7, kind, 1)[0]!, start: {
                h: 3, m: 0
            },
            target: {
                h: 3, m: 15
            },
            delta: 15
        };
        expect(spokenPrompt(question, 'fr')).toBe('Dans 15 minutes, il sera… Départ : trois heures.');
        expect(spokenPrompt(question, 'en')).toBe("In 15 minutes it will be… Start : three o'clock.");
        expect(spokenPrompt({
            ...question, target: {
                h: 9, m: 45
            }
        },
        'fr')).toBe(spokenPrompt(question, 'fr'));
    }
});

it('spoken ordinary tasks match the visible instruction and requested time', () => {
    const question = {
        ...generateSession(6, 'set', 1)[0]!, target: {
            h: 21, m: 20
        }
    };
    expect(spokenPrompt(question, 'fr')).toBe('Règle l’horloge sur… vingt et une heures vingt');
    expect(spokenPrompt({
        ...question, kind: 'read'
    },
    'fr')).toBe('Quelle heure est-il ?');
});
