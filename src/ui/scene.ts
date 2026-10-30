import type { Time } from '../engine/time';

export type Scene = 'morning' | 'day' | 'evening' | 'night';
export function sceneForTime(time: Time): Scene {
    return time.h < 6 ? 'night' : time.h < 12 ? 'morning' : time.h < 18 ? 'day' : 'evening';
}
export function chooseScene(level: number, displayed: Time, now: Date, exercise = true): Scene {
    return sceneForTime(exercise && (level === 6 || level === 8) ? displayed : { h: now.getHours(), m: now.getMinutes() });
}

/** Decorative landscape; all interaction belongs to the foreground. */
export function sceneSvg(scene: Scene): string {
    const palettes = {
        morning: ['#ef9eae', '#ffe7a2', '#86b890', '#447d65'],
        day: ['#279ee6', '#b8f3ef', '#74c873', '#287e64'],
        evening: ['#7156ab', '#ffb26d', '#9876a2', '#55517c'],
        night: ['#142957', '#51679b', '#435e83', '#273e62']
    };
    const [top, bottom, hill, near] = palettes[scene];
    const stars = Array.from({ length: 22 }, (_, i) => `<path class="sky-star" style="animation-delay:-${i % 5}s" d="M${25 + i * 137 % 950} ${20 + i * 71 % 570}l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#fff4ba"/>`).join('');
    const trees = [260, 315, 700, 755].map((x, i) => `<g transform="translate(${x} ${480 + i % 2 * 60})"><path d="M0 250Q20 90 0 0" stroke="#335d56" stroke-width="17" fill="none"/><path d="M3 100Q-95 40-65 10Q0 15 3 100M4 65Q85-10 90 25Q85 75 4 65M8 155Q-80 110-70 80Q-10 80 8 155" fill="${near}" stroke="${hill}" stroke-width="4"/><path d="M-3 50l12-2M0 115l12-2M-4 185l12-2" stroke="#b3d296" stroke-width="4"/></g>`).join('');
    return `<svg class="scene-art" viewBox="0 0 1000 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" pointer-events="none"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><radialGradient id="sunlight"><stop stop-color="#fffde0"/><stop offset=".65" stop-color="#ffe793"/><stop offset="1" stop-color="#ffbc58"/></radialGradient></defs><path fill="url(#sky)" d="M0 0h1000v900H0Z"/>${scene === 'night' ? `${stars}<path class="sky-moon" d="M547 50a57 57 0 1 0 63 79 66 66 0 0 1-63-79" fill="#fff0bb"/>` : '<circle cx="560" cy="90" r="80" fill="#ffe7a0" opacity=".18"/><circle cx="560" cy="90" r="48" fill="url(#sunlight)"/>'}<g class="clouds" fill="#fff9e7" opacity=".65"><path d="M70 193q-25-40 20-45 10-55 60-24 45-12 45 35 40 0 31 34Z"/><path d="M580 320q-35-30 0-49 5-49 46-25 40-30 61 18 42-4 41 56Z"/></g><path d="M0 630Q170 430 380 610T740 570T1000 610V900H0" fill="${hill}"/><path d="M0 760Q210 610 440 745T1000 690V900H0" fill="${near}"/>${trees}<path d="M430 900Q630 720 560 700Q710 770 650 900" fill="#f7d59c" opacity=".5"/><g fill="#ffe4a1">${[65, 180, 820, 950].map(x => `<path d="M${x} 820l4-11 4 11 11 4-11 4-4 11-4-11-11-4Z"/>`).join('')}</g></svg>`;
}
