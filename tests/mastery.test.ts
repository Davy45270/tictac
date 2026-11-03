import { describe, expect, it } from 'vitest';
import { questionOutcome, sessionValidates, recordSession, masteryState, counts, letters, validMastery, localDay, RAPID_MS, WINDOW, type Outcome } from '../src/engine/mastery';
import { stars } from '../src/engine/progress';
import { makeRng } from '../src/engine/session';

describe('question outcomes', () => {
    it('a first-try answer is sure, whatever its speed', () => {
        expect(questionOutcome([{ at: 0, correct: true }], 'read')).toBe('sure');
        expect(questionOutcome([{ at: 0, correct: true }], 'set')).toBe('sure');
    });
    it('a calm answer after a mistake is a retry; a quick one is a guess', () => {
        expect(questionOutcome([{ at: 0, correct: false }, { at: RAPID_MS, correct: true }], 'read')).toBe('retry');
        expect(questionOutcome([{ at: 0, correct: false }, { at: RAPID_MS - 1, correct: true }], 'read')).toBe('guess');
        expect(questionOutcome([{ at: 0, correct: false }, { at: 5000, correct: false }, { at: 5400, correct: true }], 'set')).toBe('guess');
    });
    it('trying every wrong proposal in turn is a guess when reading, not when setting', () => {
        const slow = [0, 3000, 6000].map(at => ({ at, correct: false })).concat({ at: 9000, correct: true });
        expect(questionOutcome(slow, 'read')).toBe('guess');
        expect(questionOutcome(slow, 'set')).toBe('retry');
    });
    it('rejects an empty question', () => {
        expect(() => questionOutcome([], 'read')).toThrow(RangeError);
    });
});

describe('sessions and mastery', () => {
    const many = (outcome: Outcome, n: number): Outcome[] => Array.from({ length: n }, () => outcome);
    it('three guesses in a session do not validate it, two do', () => {
        expect(sessionValidates([...many('sure', 8), ...many('guess', 2)])).toBe(true);
        expect(sessionValidates([...many('sure', 7), ...many('guess', 3)])).toBe(false);
    });
    it('needs two sessions: one perfect session is still learning', () => {
        const one = recordSession(undefined, many('sure', 10), '2026-11-03');
        expect(one).toEqual({ recent: 'ssssssssss', sessions: 1, last: '2026-11-03' });
        expect(masteryState(one)).toBe('learning');
        const two = recordSession(one, many('sure', 10), '2026-11-04');
        expect(masteryState(two)).toBe('mastered');
        expect(masteryState(undefined)).toBe('new');
    });
    it('18 of the last 20 first-try answers, no guess and nothing to review', () => {
        const base = recordSession(undefined, many('sure', 10), '2026-11-03');
        expect(masteryState(recordSession(base, [...many('sure', 8), ...many('retry', 2)], 'x'))).toBe('mastered');
        expect(masteryState(recordSession(base, [...many('sure', 7), ...many('retry', 3)], 'x'))).toBe('learning');
        expect(masteryState(recordSession(base, [...many('sure', 9), 'guess'], 'x'))).toBe('learning');
        expect(masteryState(recordSession(base, many('sure', 10), 'x'), 1)).toBe('learning');
    });
    it('keeps a sliding window of the last twenty outcomes', () => {
        let entry = recordSession(undefined, many('guess', 10), 'a');
        entry = recordSession(entry, many('sure', 10), 'b');
        expect(masteryState(entry)).toBe('learning');
        entry = recordSession(entry, many('sure', 10), 'c');
        expect(entry.recent).toHaveLength(WINDOW);
        expect(entry.sessions).toBe(3);
        expect(masteryState(entry)).toBe('mastered');
        expect(counts(entry)).toEqual({ sure: 20, retry: 0, guess: 0, total: 20 });
        expect(letters('srg')).toEqual(['s', 'r', 'g']);
    });
    it('validates stored entries strictly', () => {
        expect(validMastery({ recent: 'ssr', sessions: 1, last: '2026-11-03' })).toBe(true);
        for (const bad of [null, [], { recent: 'x', sessions: 1, last: '2026-11-03' }, { recent: 's'.repeat(21), sessions: 1, last: '2026-11-03' }, { recent: 's', sessions: -1, last: '2026-11-03' }, { recent: 's', sessions: 1, last: 'hier' }]) expect(validMastery(bad)).toBe(false);
        expect(localDay(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
});

/**
 * Measured distinction between a child who has learnt the lesson and one who taps at random.
 * 2000 simulated children play 20 sessions of ten four-choice questions each.
 */
describe('learnt versus random play (simulation)', () => {
    type Profile = { firstTry: number; quick: boolean };
    function play(profile: Profile, rng: () => number): { mastered: number | null; validatedTwoStars: number } {
        let entry;
        let mastered: number | null = null;
        let validatedTwoStars = 0;
        for (let session = 1; session <= 20; session++) {
            const outcomes: Outcome[] = [];
            for (let q = 0; q < 10; q++) {
                const submissions = [{ at: 0, correct: rng() < profile.firstTry }];
                // After a miss, the remaining proposals are tried one by one (quickly or calmly) until right.
                let remaining = 3;
                while (!submissions.at(-1)!.correct) {
                    const at = submissions.at(-1)!.at + (profile.quick ? 300 : 2500);
                    submissions.push({ at, correct: rng() < 1 / remaining-- });
                }
                outcomes.push(questionOutcome(submissions, 'read'));
            }
            const score = outcomes.filter(o => o === 'sure').length;
            if (sessionValidates(outcomes) && stars(score) >= 2) validatedTwoStars++;
            entry = recordSession(entry, outcomes, 'd');
            if (mastered === null && masteryState(entry) === 'mastered') mastered = session;
        }
        return { mastered, validatedTwoStars };
    }
    function population(profile: Profile, seed: number): { masteredShare: number; validatedSessions: number; medianSessions: number } {
        const rng = makeRng(seed);
        const runs = Array.from({ length: 2000 }, () => play(profile, rng));
        const sessions = runs.map(r => r.mastered).filter((s): s is number => s !== null).sort((a, b) => a - b);
        return {
            masteredShare: sessions.length / runs.length,
            validatedSessions: runs.reduce((sum, r) => sum + r.validatedTwoStars, 0),
            medianSessions: sessions[Math.floor(sessions.length / 2)] ?? Infinity
        };
    }

    it('a child tapping at random never reaches mastery, quickly or calmly', () => {
        const calm = population({ firstTry: .25, quick: false }, 1);
        const quick = population({ firstTry: .25, quick: true }, 2);
        expect(calm.masteredShare).toBe(0);
        expect(quick.masteredShare).toBe(0);
        // Out of 40 000 quick random sessions, only the rare lucky ones (eight first tries or more) keep their stars.
        expect(quick.validatedSessions / 40_000).toBeLessThan(.001);
    }, 20_000);

    it('a child who hesitates between two answers does not reach mastery either', () => {
        expect(population({ firstTry: .5, quick: false }, 3).masteredShare).toBeLessThan(.01);
    }, 20_000);

    it('a child who has learnt the lesson reaches it, typically after two sessions', () => {
        const learnt = population({ firstTry: .95, quick: false }, 4);
        expect(learnt.masteredShare).toBeGreaterThan(.99);
        expect(learnt.medianSessions).toBe(2);
    }, 20_000);
});
