import type { Step, Time } from './time';

export type Kind = 'read' | 'set';

const catalog: { step: Step; fr: string; en: string }[] = [
    { step: 60, fr: 'Heures pleines', en: 'On the hour' },
    { step: 30, fr: 'Les demies', en: 'Half hours' },
    { step: 15, fr: 'Les quarts', en: 'Quarter hours' },
    { step: 5, fr: 'De cinq en cinq', en: 'Five-minute steps' },
    { step: 1, fr: 'Chaque minute', en: 'Every minute' },
    { step: 5, fr: 'Les 24 heures', en: '24-hour time' },
    { step: 5, fr: 'Dans quelques minutes', en: 'In a few minutes' },
    { step: 5, fr: 'Ma journée', en: 'My day' }
];

export const levels = catalog.map((info, index) => ({
    ...info,
    instructions: {
        fr: {
            read: index === 7 ? 'À quel moment de la journée ?' : index === 6 ? 'Dans {n} minutes, il sera…' : 'Quelle heure est-il ?',
            set: index === 6 ? 'Dans {n} minutes, il sera…' : 'Règle l’horloge sur…'
        },
        en: {
            read: index === 7 ? 'What part of the day is it?' : index === 6 ? 'In {n} minutes it will be…' : 'What time is it?',
            set: index === 6 ? 'In {n} minutes it will be…' : 'Set the clock to…'
        }
    }
}));

export function levelInfo(level: number): (typeof levels)[number] {
    const info = levels[level - 1];
    if (!info) throw new RangeError('Level must be 1–8');
    return info;
}

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
