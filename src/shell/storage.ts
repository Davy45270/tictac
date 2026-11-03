import { ids, type CharacterId } from '../characters/model';
import type { Locale } from '../engine/text';
import type { Records } from '../engine/progress';
import { validMastery, MAX_REVIEWS, type Mastery } from '../engine/mastery';
import type { Time } from '../engine/time';

export interface StoragePort {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void
}

export interface Save {
    version: 1;
    locale: Locale;
    guide: CharacterId;
    records: Records;
    /** Learning follow-up per level and direction; never leaves the device. */
    mastery: Record<string, Mastery>;
    /** Times to bring back after a mistake, per level and direction. */
    reviews: Record<string, Time[]>
}

const KEY = /^([1-9]|1[0-2])\.(read|set)$/;
const validTime = (t: unknown): t is Time => typeof t === 'object' && !!t && Number.isInteger((t as Time).h) && Number.isInteger((t as Time).m) && (t as Time).h >= 0 && (t as Time).h < 24 && (t as Time).m >= 0 && (t as Time).m < 60;

export const SAVE_KEY = 'tictac.v1';
export function fresh(locale: Locale = 'fr'): Save {
    return {
        version: 1, locale, guide: 'panda', records: {}, mastery: {}, reviews: {}
    };
}

export function browserStorage(): StoragePort | undefined {
    try {
        return window.localStorage;
    } catch {
        return undefined;
    }
}

export function readSave(storage?: StoragePort, locale: Locale = 'fr'): Save {
    try {
        const data: unknown = JSON.parse(storage?.getItem(SAVE_KEY) ?? 'null');
        if (typeof data !== 'object' || !data) return fresh(locale);
        const v = data as Record<string, unknown>;
        if (v.version !== 1 || (v.locale !== 'fr' && v.locale !== 'en') || !ids.includes(v.guide as CharacterId) || typeof v.records !== 'object' || !v.records || Array.isArray(v.records)) return fresh(locale);
        const records: Records = {};
        for (const [key, score] of Object.entries(v.records)) if (KEY.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 10) records[key] = score;
        const mastery: Record<string, Mastery> = {};
        const reviews: Record<string, Time[]> = {};
        if (typeof v.mastery === 'object' && v.mastery && !Array.isArray(v.mastery)) for (const [key, value] of Object.entries(v.mastery)) if (KEY.test(key) && validMastery(value)) mastery[key] = { recent: value.recent, sessions: value.sessions, last: value.last };
        if (typeof v.reviews === 'object' && v.reviews && !Array.isArray(v.reviews)) for (const [key, value] of Object.entries(v.reviews)) if (KEY.test(key) && Array.isArray(value)) {
            const times = value.filter(validTime).slice(0, MAX_REVIEWS).map(t => ({ h: t.h, m: t.m }));
            if (times.length) reviews[key] = times;
        }
        return {
            version: 1, locale: v.locale, guide: v.guide as CharacterId, records, mastery, reviews
        };
    } catch {
        return fresh(locale);
    }
}

export function writeSave(storage: StoragePort | undefined, save: Save): void {
    try {
        storage?.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
        /* Playing remains possible without storage. */
    }
}
