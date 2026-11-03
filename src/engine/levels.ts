import type { Step, Time } from './time';

export type Kind = 'read' | 'set';
/** How the dial prints its hours: digits, nothing (like a grown-up watch) or Roman numerals. */
export type Dial = 'arabic' | 'none' | 'roman';
/** How the four proposals are written. */
export type Answers = 'words' | 'clock24' | 'moments' | 'digits' | 'twins';

interface Entry {
    step: Step;
    fr: string;
    en: string;
    /** Size of the target domain: 12 hours on the dial or the whole day. */
    hours: 12 | 24;
    dial: Dial;
    answers: Answers;
    /** Only reading questions (the child classifies, there is nothing to set). */
    readOnly: boolean;
    /** The landscape follows the dial and a sun or moon cue is shown. */
    sky: boolean;
    /** Level whose two stars unlock this one (0 for the first level). */
    requires: number;
}

const entry = (step: Step, fr: string, en: string, more: Partial<Entry> = {}): Entry => ({
    step, fr, en, hours: 12, dial: 'arabic', answers: 'words', readOnly: false, sky: false, requires: 0, ...more
});

const catalog: Entry[] = [
    entry(60, 'Heures pleines', 'On the hour'),
    entry(30, 'Les demies', 'Half hours', { requires: 1 }),
    entry(15, 'Les quarts', 'Quarter hours', { requires: 2 }),
    entry(5, 'De cinq en cinq', 'Five-minute steps', { requires: 3 }),
    entry(1, 'Chaque minute', 'Every minute', { requires: 4 }),
    entry(5, 'Les 24 heures', '24-hour time', { hours: 24, answers: 'clock24', sky: true, requires: 5 }),
    entry(5, 'Dans quelques minutes', 'In a few minutes', { hours: 24, requires: 6 }),
    entry(5, 'Ma journée', 'My day', { hours: 24, answers: 'moments', readOnly: true, sky: true, requires: 7 }),
    entry(5, 'En chiffres', 'In digits', { answers: 'digits', requires: 4 }),
    entry(5, 'Sans chiffres', 'No numbers', { dial: 'none', answers: 'digits', requires: 9 }),
    entry(5, 'Chiffres romains', 'Roman numerals', { dial: 'roman', requires: 9 }),
    entry(5, 'Midi ou minuit', 'Noon or midnight', { hours: 24, answers: 'twins', readOnly: true, sky: true, requires: 6 })
];

function instructions(index: number): { fr: Record<Kind, string>; en: Record<Kind, string> } {
    if (index === 7) return { fr: { read: 'À quel moment de la journée ?', set: 'À quel moment de la journée ?' }, en: { read: 'What part of the day is it?', set: 'What part of the day is it?' } };
    if (index === 6) return { fr: { read: 'Dans {n} minutes, il sera…', set: 'Dans {n} minutes, il sera…' }, en: { read: 'In {n} minutes it will be…', set: 'In {n} minutes it will be…' } };
    if (index === 11) return { fr: { read: 'Midi ou minuit ? Regarde le ciel !', set: 'Midi ou minuit ? Regarde le ciel !' }, en: { read: 'Noon or midnight? Look at the sky!', set: 'Noon or midnight? Look at the sky!' } };
    return { fr: { read: 'Quelle heure est-il ?', set: 'Règle l’horloge sur…' }, en: { read: 'What time is it?', set: 'Set the clock to…' } };
}

export const levels = catalog.map((info, index) => ({ ...info, instructions: instructions(index) }));
export const LEVEL_COUNT = levels.length;

export function levelInfo(level: number): (typeof levels)[number] {
    const info = levels[level - 1];
    if (!info) throw new RangeError(`Level must be 1–${LEVEL_COUNT}`);
    return info;
}

/** Digital display style: the whole day where the half of the day matters. */
export const digitalStyle = (level: number): '12' | '24' => levelInfo(level).sky ? '24' : '12';

// Half-open, disjoint ranges cover all 24 hours; noon is a separate lesson-eight moment.
export const moments = [
    { id: 'night', from: 0, to: 6, fr: 'nuit · dodo', en: 'night · bedtime' },
    { id: 'morning', from: 6, to: 12, fr: 'matin · petit-déjeuner ou école', en: 'morning · breakfast or school' },
    { id: 'noon', from: 12, to: 14, fr: 'midi · déjeuner', en: 'midday · lunch' },
    { id: 'afternoon', from: 14, to: 18, fr: 'après-midi · goûter', en: 'afternoon · snack' },
    { id: 'evening', from: 18, to: 24, fr: 'soir · dîner', en: 'evening · dinner' }
] as const;

export function moment(time: Time): typeof moments[number] {
    return moments.find(period => time.h >= period.from && time.h < period.to) ?? moments[0];
}

export function dayPeriod(time: Time): 'night' | 'morning' | 'afternoon' | 'evening' {
    return time.h < 6 ? 'night' : time.h < 12 ? 'morning' : time.h < 18 ? 'afternoon' : 'evening';
}
