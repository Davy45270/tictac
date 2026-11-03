import { addMinutes, sameOnDial, sameTime, mod, type Time } from './time';
import { levelInfo, moment, type Kind } from './levels';

export function makeRng(seed: number): () => number {
    let value = seed >>> 0;
    return () => {
        value = (value + 1831565813) >>> 0;
        let t = value;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export interface Question {
    level: number;
    kind: Kind;
    target: Time;
    start: Time;
    delta: number;
    choices: Time[];
    answer: number;
    /** Brought back on purpose after a mistake. */
    review?: boolean
}

const deltas = [15, 30, 45, 60, 5, 10, 20, 25];
const circular = (a: Time, b: Time): number => Math.min(mod(a.h * 60 + a.m - b.h * 60 - b.m, 1440), mod(b.h * 60 + b.m - a.h * 60 - a.m, 1440));

/** Every legal target of a level, in a fixed order. */
export function domain(level: number): Time[] {
    const { step, hours, answers } = levelInfo(level);
    const pool: Time[] = [];
    if (answers === 'twins') {
        // Around twelve, where the words say “noon” or “midnight”: 11:35–12:30 and 23:35–00:30.
        for (const [h, from, to] of [[11, 35, 55], [12, 0, 30], [23, 35, 55], [0, 0, 30]] as const) for (let m = from; m <= to; m += step) pool.push({ h, m });
        return pool;
    }
    for (let h = 0; h < hours; h++) for (let m = 0; m < 60; m += step) pool.push({ h, m });
    return pool;
}

export const inDomain = (level: number, time: Time): boolean => domain(level).some(t => sameTime(t, time));

/** Noon/midnight lesson: the same dial twelve hours apart is the key distractor. */
function twinChoices(target: Time, index: number): Time[] {
    const twin = addMinutes(target, 720);
    const shift = [15, -15, 10, -10, 5, -5][index % 6]!;
    const others = [twin, addMinutes(target, shift), addMinutes(twin, shift)];
    return [...others.slice(index % 3), ...others.slice(0, index % 3)];
}

function distractors(level: number, target: Time, index: number, pool: Time[]): Time[] {
    const { step, hours, answers } = levelInfo(level);
    if (answers === 'twins') return twinChoices(target, index);
    const valid = (t: Time): boolean => t.m % step === 0 && !sameOnDial(t, target) && (level !== 8 || (moment(t).id !== moment(target).id && circular(t, target) >= 180));
    const wrong: Time[] = [];
    const direction = index % 2 === 0 ? 1 : -1;
    const candidates = [{
        h: target.m / 5, m: target.h % 12 * 5
    },
    addMinutes(target, direction * 60), addMinutes(target, direction * step), addMinutes(target, - direction * 60), addMinutes(target, - direction * step), ...pool];
    for (const raw of candidates) {
        const t = {
            h: hours === 12 ? raw.h % 12 : raw.h, m: raw.m
        };
        if (Number.isInteger(t.h) && valid(t) && !wrong.some(w => sameOnDial(w, t)) && (level !== 8 || !wrong.some(w => moment(w).id === moment(t).id))) wrong.push(t);
        if (wrong.length === 3) break;
    }
    return wrong;
}

function build(level: number, kind: Kind, target: Time, delta: number, index: number, answer: number, pool: Time[]): Question {
    const { readOnly } = levelInfo(level);
    const choices = distractors(level, target, index, pool);
    choices.splice(answer, 0, target);
    return {
        level, kind: readOnly ? 'read' : kind, target, start: addMinutes(target, - delta), delta, choices, answer
    };
}

export function generateSession(level: number, kind: Kind, seed: number, count = 10): Question[] {
    const rng = makeRng(seed);
    const pool = domain(level);
    if (!Number.isInteger(count) || count < 1 || count > pool.length) throw new RangeError('Invalid session length');
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const offset = Math.floor(rng() * 4);
    return pool.slice(0, count).map((target, index) => {
        const delta = level === 7 ? deltas[Math.floor(rng() * deltas.length)]! : 0;
        return build(level, kind, target, delta, index, (index + offset) % 4, pool);
    });
}

/**
 * A close exercise for later, after a mistake: the time the child confused it with when that is a
 * legal target, otherwise the nearest neighbour (other hand order, one hour, one step) not already planned.
 */
export function nearQuestion(question: Question, index: number, taken: Time[], confused?: Time, answer = question.answer): Question {
    const { level, target, kind, delta } = question;
    const { step } = levelInfo(level);
    const candidates = [
        ...(confused ? [confused] : []),
        addMinutes(target, 720), { h: target.m / 5, m: target.h % 12 * 5 },
        addMinutes(target, 60), addMinutes(target, -60), addMinutes(target, step), addMinutes(target, -step),
        ...domain(level)
    ];
    const free = (t: Time): boolean => Number.isInteger(t.h) && inDomain(level, t) && !sameTime(t, target) && !taken.some(other => sameTime(other, t));
    const next = candidates.find(free) ?? target;
    return { ...build(level, kind, next, delta, index, answer, domain(level)), review: true };
}

/** A pending review recreated for the start of a new session. */
export function reviewQuestion(level: number, kind: Kind, target: Time, index: number, answer: number, delta = 0): Question {
    return { ...build(level, kind, target, level === 7 ? delta || 15 : 0, index, answer, domain(level)), review: true };
}

/** Only the 24-hour lesson requires choosing the correct half of the day. */
export function matchesSetting(question: Question, setting: Time): boolean {
    return question.level === 6 ? sameTime(setting, question.target) : sameOnDial(setting, question.target);
}
