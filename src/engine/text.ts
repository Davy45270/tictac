import { levelInfo } from './levels';
import type { Question } from './session';
import type { Time } from './time';

export type Locale = 'fr' | 'en';
export type Style = '12' | '24';
const fr = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'];
const en = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
function number(n: number, locale: Locale): string {
    const words = locale === 'fr' ? fr : en;
    if (n <= 20) return words[n] ?? '';
    const tens = Math.floor(n / 10);
    const unit = n % 10;
    const prefix = (locale === 'fr' ? ['', '', 'vingt', 'trente', 'quarante', 'cinquante'] : ['', '', 'twenty', 'thirty', 'forty', 'fifty']) [tens] ?? '';
    return prefix + (unit ? (locale === 'fr' && unit === 1 ? ' et un' : '-' + (words[unit] ?? '')) : '');
}

export function say(t: Time, locale: Locale = 'fr', style: Style = '12'): string {
    if (style === '24' && locale === 'fr') {
        const hour = t.h === 0 ? 'minuit' : t.h === 12 ? 'midi' : `${t.h === 21 ? 'vingt et une' : number(t.h, locale)} heure${t.h === 1 ? '' : 's'}`;
        return hour + (t.m ? ' ' + number(t.m, locale) : '');
    }
    if (style === '24') return `${number(t.h, locale)} ${t.m ? number(t.m, locale) : 'hundred'}`;
    const h = t.h % 12;
    const base = (hour: number): string => locale === 'fr' ? hour === 0 ? (t.h === 0 || t.h === 23 ? 'minuit' : 'midi') : `${number(hour, locale)} heure${hour === 1 ? '' : 's'}` : hour === 0 ? (t.h === 0 || t.h === 23 ? 'midnight' : 'noon') : number(hour, locale);
    if (locale === 'fr') {
        if (!t.m) return base(h);
        if (t.m === 15) return base(h) + ' et quart';
        if (t.m === 30) return base(h) + (h === 0 ? ' et demi' : ' et demie');
        if (t.m > 30) return base((h + 1) % 12) + ' moins ' + (t.m === 45 ? 'le quart' : number(60 - t.m, locale));
        return base(h) + ' ' + number(t.m, locale);
    }
    if (!t.m) return h ? `${base(h)} o'clock` : base(h);
    if (t.m === 30) return `half past ${base(h)}`;
    return `${t.m === 15 || t.m === 45 ? 'quarter' : number(t.m > 30 ? 60 - t.m : t.m, locale)} ${t.m > 30 ? 'to' : 'past'} ${base(t.m > 30 ? (h + 1) % 12 : h)}`;
}

export const formatDigital = (t: Time, mode: Style = '12'): string => `${mode === '24' ? String(t.h).padStart(2, '0') : t.h % 12 || 12}:${String(t.m).padStart(2, '0')}`;
/** Speak the visible task, never the result of an addition exercise. */
export function spokenPrompt(question: Question, locale: Locale): string {
    const instruction = levelInfo(question.level).instructions[locale] [question.kind].replace('{n}', String(question.delta));
    if (question.level === 7) {
        return `${instruction} ${locale === 'fr' ? 'Départ' : 'Start'} : ${say(question.start, locale)}.`;
    }
    if (question.kind === 'read') return instruction;
    return `${instruction} ${say(question.target, locale, question.level === 6 ? '24' : '12')}`;
}
