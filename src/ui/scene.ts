import { levelInfo } from '../engine/levels';
import type { Time } from '../engine/time';

export type Scene = 'morning' | 'day' | 'evening' | 'night';
export function sceneForTime(time: Time): Scene {
    return time.h < 6 ? 'night' : time.h < 12 ? 'morning' : time.h < 18 ? 'day' : 'evening';
}
export function chooseScene(level: number, displayed: Time, now: Date, exercise = true): Scene {
    if (exercise && levelInfo(level).answers === 'twins') return displayed.h === 23 || displayed.h < 6 ? 'night' : 'day';
    return sceneForTime(exercise && levelInfo(level).sky ? displayed : { h: now.getHours(), m: now.getMinutes() });
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
    const stars = Array.from({ length: 22 }, (_, i) => `<path class="sky-star" style="animation-delay:-${i % 5}s" d="M${25 + i * 137 % 950} ${260 + i * 71 % 330}l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#fff4ba"/>`).join('');
    const trees = [260, 315, 700, 755].map((x, i) => `<g transform="translate(${x} ${480 + i % 2 * 60})"><path d="M0 250Q20 90 0 0" stroke="#335d56" stroke-width="17" fill="none"/><path d="M3 100Q-95 40-65 10Q0 15 3 100M4 65Q85-10 90 25Q85 75 4 65M8 155Q-80 110-70 80Q-10 80 8 155" fill="${near}" stroke="${hill}" stroke-width="4"/><path d="M-3 50l12-2M0 115l12-2M-4 185l12-2" stroke="#b3d296" stroke-width="4"/></g>`).join('');
    return `<svg class="scene-art" viewBox="0 0 1000 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" pointer-events="none"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h1000v900H0Z"/>${scene === 'night' ? stars : ''}<g class="clouds" fill="#fff9e7" opacity=".65"><path d="M70 193q-25-40 20-45 10-55 60-24 45-12 45 35 40 0 31 34Z"/><path d="M580 320q-35-30 0-49 5-49 46-25 40-30 61 18 42-4 41 56Z"/></g><path d="M0 630Q170 430 380 610T740 570T1000 610V900H0" fill="${hill}"/><path d="M0 760Q210 610 440 745T1000 690V900H0" fill="${near}"/>${trees}<path d="M430 900Q630 720 560 700Q710 770 650 900" fill="#f7d59c" opacity=".5"/><g fill="#ffe4a1">${[65, 180, 820, 950].map(x => `<path d="M${x} 820l4-11 4 11 11 4-11 4-4 11-4-11-11-4Z"/>`).join('')}</g></svg>${celestialSvg(scene)}`;
}

/** Separate corner artwork stays intact when the landscape is cropped. */
function celestialSvg(scene: Scene): string {
    const evening = scene === 'evening';
    return `<svg class="scene-orb" viewBox="0 0 100 100" aria-hidden="true" pointer-events="none">
        <defs><radialGradient id="orb-glow"><stop stop-color="${evening ? '#ffcc75' : '#fffde0'}"/><stop offset="1" stop-color="${evening ? '#ed6039' : '#ffbc58'}"/></radialGradient><radialGradient id="orb-halo"><stop stop-color="#fff0bb" stop-opacity=".3"/><stop offset="1" stop-color="#fff0bb" stop-opacity="0"/></radialGradient></defs>
        <circle cx="50" cy="50" r="49" fill="url(#orb-halo)"/>
        ${scene === 'night' ? '<path class="sky-moon" d="M49 6a44 44 0 1 0 41 64A50 50 0 0 1 49 6" fill="#fff0bb"/>' : `<g stroke="#ffe4a1" stroke-width="2" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => `<path transform="rotate(${i * 45} 50 50)" d="M50 3v5"/>`).join('')}</g><circle cx="50" cy="50" r="40" fill="url(#orb-glow)"/>`}
        ${evening ? '<path d="M0 80Q27 51 54 68T100 73V100H0Z" fill="#55517c"/>' : ''}
    </svg>`;
}
