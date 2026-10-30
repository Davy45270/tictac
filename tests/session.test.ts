import { it, expect } from 'vitest';
import { generateSession } from '../src/engine/session';
import { levelInfo, moment, type Kind } from '../src/engine/levels';
import { sameOnDial, addMinutes, mod } from '../src/engine/time';

it('is deterministic and varies across seeds', () => {
    for (let seed = 0; seed < 20; seed++) {
        expect(generateSession(4, 'read', seed)).toEqual(generateSession(4, 'read', seed));
        expect(generateSession(4, 'read', seed)).not.toEqual(generateSession(4, 'read', seed + 1));
    }
});

for (let level = 1; level <= 8; level++) for (const kind of ['read', 'set'] as Kind[]) it(`level ${level} ${kind}: 200 seeds satisfy the oracle`, () => {
    const step = [60, 30, 15, 5, 1, 5, 5, 5] [level - 1]!;
    expect(levelInfo(level).step).toBe(step);
    for (let seed = 0; seed < 200; seed++) {
        const questions = generateSession(level, kind, seed);
        expect(questions).toHaveLength(10);
        expect(new Set(questions.map(q => `${q.target.h}:${q.target.m}`)).size).toBe(10);
        for (const q of questions) {
            expect(q.target.h).toBeGreaterThanOrEqual(0);
            expect(q.target.h).toBeLessThan(level < 6 ? 12 : 24);
            expect(q.target.m % step).toBe(0);
            expect(q.choices).toHaveLength(4);
            expect(q.choices[q.answer]).toEqual(q.target);
            expect(q.choices.filter(t => sameOnDial(t, q.target))).toHaveLength(1);
            expect(new Set(q.choices.map(t => `${t.h%12}:${t.m}`)).size).toBe(4);
            for (const t of q.choices) {
                expect(t.h).toBeGreaterThanOrEqual(0);
                expect(t.h).toBeLessThan(level < 6 ? 12 : 24);
                expect(t.m).toBeGreaterThanOrEqual(0);
                expect(t.m).toBeLessThan(60);
                expect(t.m % step).toBe(0);
            }
            if (level === 7) {
                expect([15, 30, 45, 60, 5, 10, 20, 25]).toContain(q.delta);
                expect(addMinutes(q.start, q.delta)).toEqual(q.target);
                expect(q.start.m % 5).toBe(0);
            }
            if (level === 8) {
                expect(new Set(q.choices.map(t => moment(t).id)).size).toBe(4);
                for (const t of q.choices.filter((_, i) => i !== q.answer)) expect(Math.min(mod((t.h - q.target.h) * 60 + t.m - q.target.m, 1440), mod((q.target.h - t.h) * 60 + q.target.m - t.m, 1440))).toBeGreaterThanOrEqual(180);
            }
        }
    }
},
1900);
it('balances answer positions over 400 questions', () => {
    const counts = [0, 0, 0, 0];
    for (let seed = 0; seed < 40; seed++) for (const q of generateSession(4, 'read', seed)) counts[q.answer] !++;
    for (const count of counts) {
        expect(count / 400).toBeGreaterThanOrEqual(.15);
        expect(count / 400).toBeLessThanOrEqual(.35);
    }
});

it('day boundaries follow the documented independent table', () => {
    const table: [number, number, string][] = [
        [0, 0, 'night'],
        [5, 59, 'night'],
        [6, 0, 'morning'],
        [11, 59, 'morning'],
        [12, 0, 'noon'],
        [13, 59, 'noon'],
        [14, 0, 'afternoon'],
        [17, 59, 'afternoon'],
        [18, 0, 'evening'],
        [23, 59, 'evening']
    ];
    for (const [h, m, id] of table) expect(moment({
        h, m
    }).id).toBe(id);
});

it('normalizes the eighth level to choices and rejects impossible counts', () => {
    expect(generateSession(8, 'set', 1).every(q => q.kind === 'read')).toBe(true);
    for (const count of [0, 13, 1.5]) expect(() => generateSession(1, 'read', 1, count)).toThrow(RangeError);
});

it('addition sessions exercise both delta families across seeds', () => {
    const deltas = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
        for (const question of generateSession(7, 'read', seed)) deltas.add(question.delta);
    }
    expect([...deltas].sort((a, b) => a - b)).toEqual([5, 10, 15, 20, 25, 30, 45, 60]);
});

it('prioritizes an adjacent step as well as an adjacent hour or legal swapped hands', () => {
    for (let level = 1; level <= 7; level++) {
        for (let seed = 0; seed < 20; seed++) {
            for (const question of generateSession(level, 'read', seed)) {
                const target = question.target;
                const plausible = [addMinutes(target, 60), addMinutes(target, -60)];
                if (target.m % 5 === 0) plausible.push({
                    h: target.m / 5, m: target.h % 12 * 5
                });
                expect(question.choices.some((choice, index) => index !== question.answer && plausible.some(time => sameOnDial(time, choice)))).toBe(true);
                const step = levelInfo(level).step;
                const adjacent = [addMinutes(target, step), addMinutes(target, -step)]
                    .filter(time => !sameOnDial(time, target) && time.m % step === 0);
                if (adjacent.length) expect(question.choices.some((choice, index) => index !== question.answer && adjacent.some(time => sameOnDial(time, choice)))).toBe(true);
            }
        }
    }
});
