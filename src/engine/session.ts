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
    answer: number
}

export function generateSession(level: number, kind: Kind, seed: number, count = 10): Question[] {
    const {
        step
    } = levelInfo(level);
    const rng = makeRng(seed);
    const pool: Time[] = [];
    for (let h = 0; h < (level >= 6 ? 24 : 12); h++) for (let m = 0; m < 60; m += step) pool.push({
        h, m
    });
    if (!Number.isInteger(count) || count < 1 || count > pool.length) throw new RangeError('Invalid session length');
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const offset = Math.floor(rng() * 4);
    return pool.slice(0, count).map((start, index) => {
        const deltas = [15, 30, 45, 60, 5, 10, 20, 25];
        const delta = level === 7 ? deltas[Math.floor(rng() * deltas.length)]! : 0;
        const target = start;
        const origin = addMinutes(target, - delta);
        const valid = (t: Time): boolean => t.m % step === 0 && !sameOnDial(t, target) && (level !== 8 || (moment(t).id !== moment(target).id && Math.min(mod(t.h * 60 + t.m - target.h * 60 - target.m, 1440), mod(target.h * 60 + target.m - t.h * 60 - t.m, 1440)) >= 180));
        const wrong: Time[] = [];
        const direction = index % 2 === 0 ? 1 : -1;
        const candidates = [{
            h: target.m / 5, m: target.h % 12 * 5
        },
        addMinutes(target, direction * 60), addMinutes(target, direction * step), addMinutes(target, - direction * 60), addMinutes(target, - direction * step), ...pool];
        for (const raw of candidates) {
            const t = {
                h: level < 6 ? raw.h % 12 : raw.h, m: raw.m
            };
            if (Number.isInteger(t.h) && valid(t) && !wrong.some(w => sameOnDial(w, t)) && (level !== 8 || !wrong.some(w => moment(w).id === moment(t).id))) wrong.push(t);
            if (wrong.length === 3) break;
        }
        const answer = (index + offset) % 4;
        const choices = [...wrong];
        choices.splice(answer, 0, target);
        return {
            level, kind: level === 8 ? 'read' : kind, target, start: origin, delta, choices, answer
        };
    });
}
/** Only the 24-hour lesson requires choosing the correct half of the day. */
export function matchesSetting(question: Question, setting: Time): boolean {
    return question.level === 6 ? sameTime(setting, question.target) : sameOnDial(setting, question.target);
}
