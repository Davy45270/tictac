import { ids, type CharacterId } from '../characters/model';
import type { Locale } from '../engine/text';
import type { Records } from '../engine/progress';

export interface StoragePort {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void
}

export interface Save {
    version: 1;
    locale: Locale;
    guide: CharacterId;
    records: Records
}

export const SAVE_KEY = 'tictac.v1';
export function fresh(locale: Locale = 'fr'): Save {
    return {
        version: 1, locale, guide: 'panda', records: {}
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
        for (const [key, score] of Object.entries(v.records)) if (/^[1-8]\.(read|set)$/.test(key) && typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 10) records[key] = score;
        return {
            version: 1, locale: v.locale, guide: v.guide as CharacterId, records
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
