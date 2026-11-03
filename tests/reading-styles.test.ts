import { describe, expect, it } from 'vitest';
import { generateSession, nearQuestion, reviewQuestion, inDomain, domain } from '../src/engine/session';
import { levelInfo, levels, LEVEL_COUNT, digitalStyle } from '../src/engine/levels';
import { answerLabel, say, spokenPrompt } from '../src/engine/text';
import { unlocked } from '../src/engine/progress';
import { sameOnDial, sameTime, addMinutes } from '../src/engine/time';
import { clockSvg, ROMAN } from '../src/ui/clock';
import { chooseScene } from '../src/ui/scene';

const key = (t: { h: number; m: number }): string => `${t.h}:${t.m}`;

describe('twelve lessons with their own prerequisites', () => {
    it('lists the reading-style lessons after the original eight', () => {
        expect(LEVEL_COUNT).toBe(12);
        expect(levels.slice(8).map(l => l.fr)).toEqual(['En chiffres', 'Sans chiffres', 'Chiffres romains', 'Midi ou minuit']);
        expect(levels.map(l => l.requires)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 4, 9, 9, 6]);
        expect(() => levelInfo(13)).toThrow(RangeError);
    });
    it('unlocks each new lesson from its prerequisite, in either direction', () => {
        expect(unlocked({ '4.set': 7 }, 9)).toBe(true);
        expect(unlocked({ '4.read': 6 }, 9)).toBe(false);
        expect(unlocked({ '9.read': 9 }, 10)).toBe(true);
        expect(unlocked({ '9.read': 9 }, 11)).toBe(true);
        expect(unlocked({ '9.read': 9 }, 12)).toBe(false);
        expect(unlocked({ '6.read': 7 }, 12)).toBe(true);
    });
});

describe('digits, numberless and Roman lessons', () => {
    for (const level of [9, 10, 11]) for (const kind of ['read', 'set'] as const) it(`level ${level} ${kind}: 200 seeds satisfy the dial oracle`, () => {
        for (let seed = 0; seed < 200; seed++) {
            const questions = generateSession(level, kind, seed);
            expect(new Set(questions.map(q => key(q.target))).size).toBe(10);
            for (const q of questions) {
                expect(q.kind).toBe(kind);
                expect(q.target.h).toBeLessThan(12);
                expect(q.target.m % 5).toBe(0);
                expect(q.choices[q.answer]).toEqual(q.target);
                expect(new Set(q.choices.map(t => `${t.h % 12}:${t.m}`)).size).toBe(4);
            }
        }
    });
    it('writes digit proposals as digital times and keeps words for Roman numerals', () => {
        expect(answerLabel({ h: 3, m: 45 }, 9, 'fr')).toBe('3:45');
        expect(answerLabel({ h: 0, m: 5 }, 10, 'en')).toBe('12:05');
        expect(answerLabel({ h: 3, m: 45 }, 11, 'fr')).toBe('quatre heures moins le quart');
        expect(answerLabel({ h: 3, m: 45 }, 1, 'fr')).toBe('quatre heures moins le quart');
        expect(spokenPrompt({ ...generateSession(9, 'set', 1)[0]!, target: { h: 7, m: 5 } }, 'fr')).toBe('Règle l’horloge sur… 7:05');
    });
    it('draws a numberless dial with batons and a Roman dial with I to XII', () => {
        const plain = clockSvg({ h: 3, m: 0 }, 'fr', false, false, 'none');
        expect(plain).toContain('data-dial="none"');
        expect(plain).not.toContain('<text');
        expect(plain.match(/stroke="#2f4858" stroke-width="6"/g)).toHaveLength(8);
        expect(plain.match(/stroke-width="5"/g)).toHaveLength(8);
        expect(plain).toContain('Horloge sans chiffres');
        const roman = clockSvg({ h: 3, m: 0 }, 'en', false, false, 'roman');
        const labels = [...roman.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(m => m[1]);
        expect(labels).toEqual([...ROMAN.slice(1), 'XII']);
        expect(roman).toContain('Clock with Roman numerals');
        expect(clockSvg({ h: 3, m: 0 }, 'fr', false, false).match(/<text[^>]*>(\d+)<\/text>/g)).toHaveLength(12);
    });
});

describe('noon or midnight', () => {
    it('only uses times the words call noon or midnight', () => {
        const pool = domain(12);
        expect(pool).toHaveLength(24);
        for (const t of pool) expect(say(t, 'fr')).toMatch(/midi|minuit/);
        for (const t of pool) expect(say(t, 'en', '12', true)).toMatch(/noon|midnight/);
    });
    it('names English noon and midnight only when asked', () => {
        expect(say({ h: 0, m: 15 }, 'en', '12', true)).toBe('quarter past midnight');
        expect(say({ h: 11, m: 45 }, 'en', '12', true)).toBe('quarter to noon');
        expect(say({ h: 23, m: 35 }, 'en', '12', true)).toBe('twenty-five to midnight');
        expect(say({ h: 0, m: 15 }, 'en')).toBe('quarter past twelve');
    });
    it('200 seeds: the twin twelve hours away is always a distractor', () => {
        for (let seed = 0; seed < 200; seed++) {
            const questions = generateSession(12, 'set', seed);
            expect(new Set(questions.map(q => key(q.target))).size).toBe(10);
            for (const q of questions) {
                expect(q.kind).toBe('read');
                expect(inDomain(12, q.target)).toBe(true);
                expect(q.choices[q.answer]).toEqual(q.target);
                expect(new Set(q.choices.map(key)).size).toBe(4);
                expect(q.choices.filter(t => sameTime(t, addMinutes(q.target, 720)))).toHaveLength(1);
                expect(q.choices.filter(t => sameOnDial(t, q.target))).toHaveLength(2);
            }
        }
    });
    it('shows a day sky at noon and a night sky at midnight, with 24-hour digits', () => {
        const now = new Date(2026, 0, 1, 19);
        for (const h of [11, 12]) expect(chooseScene(12, { h, m: 40 }, now)).toBe('day');
        for (const h of [23, 0]) expect(chooseScene(12, { h, m: 40 }, now)).toBe('night');
        expect(digitalStyle(12)).toBe('24');
        expect(answerLabel({ h: 0, m: 30 }, 12, 'fr')).toBe('00:30<small>minuit et demi</small>');
        expect(answerLabel({ h: 12, m: 30 }, 12, 'fr')).toBe('12:30<small>midi et demi</small>');
    });
});

describe('close exercises after a mistake', () => {
    it('brings back the confused time when it is a legal target', () => {
        const q = generateSession(4, 'read', 3)[0]!;
        const wrong = q.choices.find((_, i) => i !== q.answer)!;
        const near = nearQuestion(q, 3, [q.target], wrong);
        expect(near.review).toBe(true);
        expect(near.target).toEqual(wrong);
        expect(near.choices[near.answer]).toEqual(wrong);
        expect(near.answer).toBe(q.answer);
    });
    it('otherwise picks a free neighbour inside the lesson domain', () => {
        for (let level = 1; level <= LEVEL_COUNT; level++) for (let seed = 0; seed < 20; seed++) {
            const session = generateSession(level, 'read', seed);
            const q = session[0]!;
            const near = nearQuestion(q, 3, session.map(s => s.target), { h: 30, m: 0 }, 2);
            expect(inDomain(level, near.target)).toBe(true);
            expect(session.some(s => sameTime(s.target, near.target))).toBe(false);
            expect(near.answer).toBe(2);
            expect(near.choices[2]).toEqual(near.target);
            if (level === 7) expect(addMinutes(near.start, near.delta)).toEqual(near.target);
        }
    });
    it('recreates stored reviews as review questions', () => {
        const q = reviewQuestion(7, 'set', { h: 14, m: 20 }, 0, 1, 25);
        expect(q).toMatchObject({ level: 7, kind: 'set', target: { h: 14, m: 20 }, start: { h: 13, m: 55 }, delta: 25, answer: 1, review: true });
        expect(reviewQuestion(12, 'set', { h: 0, m: 5 }, 0, 0).kind).toBe('read');
    });
});
