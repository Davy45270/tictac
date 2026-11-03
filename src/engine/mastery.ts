import type { Kind } from './levels';

/**
 * Learning follow-up. A star score says how one session went; mastery says whether the lesson is
 * acquired. Each question ends with one outcome:
 *   sure  — right on the first try;
 *   retry — found after a mistake, calmly;
 *   guess — a burst of quick tries (an answer less than RAPID_MS after a wrong one), or every
 *           wrong proposal tried in turn.
 */
export type Outcome = 'sure' | 'retry' | 'guess';
export interface Submission {
    at: number;
    correct: boolean
}

export const RAPID_MS = 1000;
/** A session with this many guessed questions does not validate its stars. */
export const BURST_LIMIT = 3;
/** Two whole sessions of evidence. */
export const WINDOW = 20;
export const MASTERY_SURE = 18;
export const MAX_REVIEWS = 3;

const letter: Record<Outcome, string> = { sure: 's', retry: 'r', guess: 'g' };

export function questionOutcome(submissions: Submission[], kind: Kind): Outcome {
    if (!submissions.length) throw new RangeError('A question ends with at least one answer');
    if (submissions[0]!.correct) return 'sure';
    for (let i = 1; i < submissions.length; i++) if (submissions[i]!.at - submissions[i - 1]!.at < RAPID_MS) return 'guess';
    return kind === 'read' && submissions.filter(s => !s.correct).length >= 3 ? 'guess' : 'retry';
}

export const sessionValidates = (outcomes: Outcome[]): boolean => outcomes.filter(o => o === 'guess').length < BURST_LIMIT;

export interface Mastery {
    /** Most recent outcomes, oldest first, one letter each (s, r, g). */
    recent: string;
    sessions: number;
    /** Local calendar day of the last completed session, YYYY-MM-DD. */
    last: string
}

export function recordSession(previous: Mastery | undefined, outcomes: Outcome[], today: string): Mastery {
    return {
        recent: ((previous?.recent ?? '') + outcomes.map(o => letter[o]).join('')).slice(-WINDOW),
        sessions: (previous?.sessions ?? 0) + 1,
        last: today
    };
}

/** One letter per outcome, oldest first. */
export const letters = (recent: string): string[] => Array.from(recent.matchAll(/[srg]/g), match => match[0]);

export type MasteryState = 'new' | 'learning' | 'mastered';

/** Acquired: the last two sessions hold at least 18 first-try answers out of 20, no burst, nothing left to review. */
export function masteryState(entry: Mastery | undefined, pendingReviews = 0): MasteryState {
    if (!entry?.recent) return 'new';
    const { recent } = entry;
    const sure = letters(recent).filter(c => c === 's').length;
    return recent.length >= WINDOW && sure >= MASTERY_SURE && !recent.includes('g') && pendingReviews === 0 ? 'mastered' : 'learning';
}

export function counts(entry: Mastery | undefined): { sure: number; retry: number; guess: number; total: number } {
    const recent = letters(entry?.recent ?? '');
    return {
        sure: recent.filter(c => c === 's').length,
        retry: recent.filter(c => c === 'r').length,
        guess: recent.filter(c => c === 'g').length,
        total: recent.length
    };
}

export const validMastery = (value: unknown): value is Mastery => {
    if (typeof value !== 'object' || !value) return false;
    const v = value as Record<string, unknown>;
    return typeof v.recent === 'string' && new RegExp(`^[srg]{0,${WINDOW}}$`).test(v.recent)
        && typeof v.sessions === 'number' && Number.isInteger(v.sessions) && v.sessions >= 0
        && typeof v.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.last);
};

export function localDay(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
