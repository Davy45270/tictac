import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/engine/session';
import { minuteAngle, hourAngle, angleFromPoint, snapMinute, dragMinute, dragHour, addMinutes, sameOnDial, sameTime, type Step } from '../src/engine/time';

describe('clock geometry', () => {
    it('round-trips all 1440 minutes through both hand angles', () => {
        for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m++) {
            const t = {
                h, m
            };
            expect(minuteAngle(t)).toBe(m * 6);
            expect(hourAngle(t)).toBe((h % 12) * 30 + m / 2);
            expect(dragHour(t, hourAngle(t))).toEqual(t);
            expect(snapMinute(minuteAngle(t), 1)).toBe(m);
            const a = minuteAngle(t) * Math.PI / 180;
            expect(angleFromPoint(0, 0, Math.sin(a), - Math.cos(a))).toBeCloseTo(minuteAngle(t), 8);
        }
    });
    it('cardinals, diagonals and the exact center', () => {
        [[0, -1, 0], [1, -1, 45], [1, 0, 90], [1, 1, 135], [0, 1, 180], [- 1, 1, 225], [- 1, 0, 270], [- 1, -1, 315], [0, 0, 0]].forEach(([x, y, a]) => expect(angleFromPoint(10, 20, 10 + x!, 20 + y!)).toBe(a));
    });
    it('snaps every step, ties, negative angles and wrap boundaries', () => {
        for (const step of [60, 30, 15, 5, 1] as Step[]) for (let a = -360; a <= 720; a++) {
            const m = snapMinute(a, step);
            expect(m).toBeGreaterThanOrEqual(0);
            expect(m).toBeLessThan(60);
            expect(m % step).toBe(0);
        }
        expect(snapMinute(357, 5)).toBe(0);
        expect(snapMinute(352, 5)).toBe(0);
        expect(snapMinute(332, 5)).toBe(55);
        expect(snapMinute(15, 5)).toBe(5);
    });
    for (const step of [60, 30, 15, 5, 1] as Step[]) {
        it(`snaps every exact midpoint clockwise at step ${step}`, () => {
            // Enumerate adjacent legal minutes: the oracle never calls snapMinute.
            for (let lower = 0; lower < 60; lower += step) {
                const midpoint = lower * 6 + step * 3;
                const upper = lower + step === 60 ? 0 : lower + step;
                for (const turn of [-360, 0, 360]) {
                    expect(snapMinute(midpoint + turn, step)).toBe(upper);
                }
            }
        });
    }
    it('always selects a nearest legal minute on the circle', () => {
        const distance = (a: number, b: number): number => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
        for (const step of [60, 30, 15, 5, 1] as Step[]) for (let angle = 0; angle < 360; angle++) {
            const actual = distance(angle, snapMinute(angle, step) * 6);
            for (let candidate = 0; candidate < 60; candidate += step) if (actual > distance(angle, candidate * 6) +.000001) throw Error('Not nearest: ' + String(angle) + ' / ' + String(step));
        }
    });
    it('crosses midnight and noon in both directions', () => {
        expect(dragMinute({
            h: 23, m: 55
        },
        0, 5)).toEqual({
            h: 0, m: 0
        });
        expect(dragMinute({
            h: 0, m: 0
        },
        330, 5)).toEqual({
            h: 23, m: 55
        });
        expect(dragMinute({
            h: 11, m: 55
        },
        0, 5)).toEqual({
            h: 12, m: 0
        });
        expect(dragMinute({
            h: 12, m: 0
        },
        330, 5)).toEqual({
            h: 11, m: 55
        });
        expect(dragMinute({
            h: 3, m: 29
        },
        180, 1)).toEqual({
            h: 3, m: 30
        });
    });
    it('half-hour snapping does not count a turn before the raw finger crosses twelve', () => {
        expect(dragMinute({
            h: 3, m: 0
        },
        91, 30)).toEqual({
            h: 3, m: 30
        });
        expect(dragMinute({
            h: 3, m: 30
        },
        271, 30)).toEqual({
            h: 3, m: 0
        });
        const reverse = dragMinute({ h: 3, m: 0 }, 330, 30, 0);
        expect(reverse).toEqual({ h: 2, m: 0 });
        expect(dragMinute(reverse, 269, 30, 330)).toEqual({ h: 2, m: 30 });
        expect(dragMinute({ h: 3, m: 0 }, 0, 30, 271)).toEqual({ h: 4, m: 0 });
        expect(dragMinute({
            h: 3, m: 30
        },
        89, 30)).toEqual({
            h: 3, m: 0
        });
    });
    it('one noisy full turn advances exactly one hour', () => {
        let t = {
            h: 23, m: 0
        };
        let previous = 0;
        for (let a = 3; a <= 360; a += 3) {
            const raw = a === 360 ? 360 : a + (a % 2 ? .4 : -.4);
            t = dragMinute(t, raw, 1, previous);
            previous = raw;
        }
        expect(t).toEqual({
            h: 0, m: 0
        });
    });
    it('retains the hour for raw angles 89 then 181 at step 30', () => {
        const first = dragMinute({ h: 3, m: 0 }, 89, 30, 0);
        expect(first).toEqual({ h: 3, m: 0 });
        expect(dragMinute(first, 181, 30, 89)).toEqual({ h: 3, m: 30 });
    });
    it('counts raw turns independently of snapping on seeded random walks', () => {
        for (const step of [60, 30, 15, 5, 1] as Step[]) {
            const rng = makeRng(572);
            let cumulative = 0;
            let previous = 0;
            let time = { h: 3, m: 0 };
            for (let sample = 0; sample < 2000; sample++) {
                cumulative += (rng() * 2 - 1) * 89;
                const raw = ((cumulative % 360) + 360) % 360;
                time = dragMinute(time, raw, step, previous);
                const hours = 3 + Math.floor(cumulative / 360);
                expect(time.h).toBe(((hours % 24) + 24) % 24);
                expect(time.m).toBe(snapMinute(raw, step));
                previous = raw;
            }
        }
    });
    it('hour dragging accounts for minutes and retains half-day', () => {
        expect(dragHour({
            h: 15, m: 45
        },
        112.5)).toEqual({
            h: 15, m: 45
        });
        expect(dragHour({
            h: 15, m: 45
        },
        22.5)).toEqual({
            h: 12, m: 45
        });
    });
    it('arithmetic and comparisons distinguish dial from full day', () => {
        expect(addMinutes({
            h: 23, m: 50
        },
        25)).toEqual({
            h: 0, m: 15
        });
        expect(addMinutes({
            h: 0, m: 5
        },
        - 10)).toEqual({
            h: 23, m: 55
        });
        expect(sameOnDial({
            h: 15, m: 30
        },
        {
            h: 3, m: 30
        })).toBe(true);
        expect(sameTime({
            h: 15, m: 30
        },
        {
            h: 3, m: 30
        })).toBe(false);
    });
});
