import type { Kind } from './levels';

export type Records = Record<string, number>;
export const stars = (score: number): number => score >= 9 ? 3 : score >= 7 ? 2 : score >= 5 ? 1 : 0;
export const recordKey = (level: number, kind: Kind): string => `${level}.${kind}`;
export function recordBest(records: Records, level: number, kind: Kind, score: number): Records {
    const key = recordKey(level, kind);
    return {
        ...records, [key]: Math.max(records[key] ?? 0, score)
    };
}

export function unlocked(records: Records, level: number): boolean {
    return level === 1 || stars(Math.max(records[recordKey(level - 1, 'read')] ?? 0, records[recordKey(level - 1, 'set')] ?? 0)) >= 2;
}

export interface Attempt {
    score: number;
    index: number;
    missed: boolean
}

export function answer(state: Attempt, correct: boolean): Attempt {
    return correct ? {
        score: state.score + (state.missed ? 0 : 1), index: state.index + 1, missed: false
    } : {
        ...state, missed: true
    };
}
