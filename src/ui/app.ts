import { ids, characters, type Expression } from '../characters/model';
import { characterSvg } from '../characters/svg';
import { levels, levelInfo, moment, dayPeriod, type Kind } from '../engine/levels';
import { generateSession, matchesSetting, type Question } from '../engine/session';
import type { Time } from '../engine/time';
import { formatDigital, say, spokenPrompt, type Locale } from '../engine/text';
import { answer, stars, recordBest, unlocked, recordKey, type Attempt } from '../engine/progress';
import { readSave, writeSave, browserStorage } from '../shell/storage';
import { clockSvg, wireClock } from './clock';

const root = document.querySelector<HTMLElement>('#app')!;
const storage = browserStorage();
const save = readSave(storage, navigator.language.startsWith('en') ? 'en' : 'fr');
let screen: 'home' | 'exercise' | 'result' = 'home';
let level = 1;
let kind: Kind = 'read';
let session: Question[] = [];
let attempt: Attempt = {
    score: 0, index: 0, missed: false
};
let displayed: Time = {
    h: 0, m: 0
};
let serial = 0;
let feedback = '';
let expression: Expression = 'concentre';
const tr = (fr: string, en: string): string => save.locale === 'fr' ? fr : en;
const persist = (): void => writeSave(storage, save);
const motion = (): 'full' | 'reduce' => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'full';
function guide(): string {
    return `<aside class="guide">
        ${characterSvg(save.guide, expression, screen === 'result' ? 'celebration' : 'repos', motion())}
        <p id="guide-message" role="status" aria-live="polite">${feedback || tr('Prends ton temps, on cherche ensemble !', 'Take your time, let’s work together!')}</p>
    </aside>`;
}

function button(text: string, id: string): string {
    return `<button id="${id}">${text}</button>`;
}

function period(time: Time): string {
    const currentPeriod = dayPeriod(time);
    const sun = currentPeriod === 'morning' || currentPeriod === 'afternoon';
    const label = save.locale === 'fr' ? {
        night: 'nuit', morning: 'matin', afternoon: 'après-midi', evening: 'soir'
    }[currentPeriod] : currentPeriod;
    const icon = sun
        ? '<circle cx="25" cy="25" r="12" fill="#8c5400"/><path d="M25 2v7M25 41v7M2 25h7M41 25h7M8 8l5 5M37 37l5 5M8 42l5-5M37 13l5-5" stroke="#8c5400" stroke-width="3"/>'
        : '<path d="M34 5A21 21 0 1 0 45 34A23 23 0 0 1 34 5" fill="#164e63"/>';
    return `<div class="period">
        <svg viewBox="0 0 50 50" role="img" aria-label="${label}">${icon}</svg>${label}
    </div>`;
}

function start(next = level): void {
    level = next;
    kind = level === 8 ? 'read' : kind;
    serial++;
    session = generateSession(level, kind, serial * 7919 + level * 101);
    attempt = {
        score: 0, index: 0, missed: false
    };
    screen = 'exercise';
    feedback = '';
    expression = 'concentre';
    resetClock();
    render();
    window.scrollTo(0, 0);
}

function resetClock(): void {
    const question = session[attempt.index];
    displayed = kind === 'set' ? {
        h: 0, m: 0
    } : question?.start ?? {
        h: 0, m: 0
    };
}

function submit(correct: boolean): void {
    attempt = answer(attempt, correct);
    if (!correct) {
        feedback = tr('On réessaie ensemble ! Regarde la petite aiguille pour les heures, la grande pour les minutes.', 'Let’s try together! The short hand shows hours, the long hand shows minutes.');
        expression = 'surprise';
        updateGuide();
        return;
    }
    const solved = session[attempt.index - 1]!;
    const digital = root.querySelector('#digital');
    if (digital) {
        digital.textContent = formatDigital(solved.target, level === 6 || level === 8 ? '24' : '12');
        digital.removeAttribute('aria-label');
    }
    expression = 'joie';
    feedback = tr('Bravo, tu as trouvé !', 'Well done, you found it!');
    if (attempt.index === session.length) {
        save.records = recordBest(save.records, level, kind, attempt.score);
        persist();
        screen = 'result';
        render();
        return;
    }
    // A next button leaves the encouragement visible and gives the child control of the pace.
    const actions = root.querySelector('#actions');
    if (actions) {
        if (kind === 'set') actions.innerHTML = '';
        actions.insertAdjacentHTML('beforeend', button(tr('Continuer', 'Continue'), 'continue'));
        root.querySelector('#continue')?.addEventListener('click', () => {
            expression = 'concentre';
            feedback = '';
            resetClock();
            render();
        });
    }
    updateGuide();
}

function updateGuide(): void {
    const previousGuide = root.querySelector('.guide');
    if (previousGuide) previousGuide.outerHTML = guide();
}

function render(): void {
    document.documentElement.lang = save.locale;
    root.dataset.currentLevel = String(level);
    root.dataset.currentKind = kind;
    root.dataset.screen = screen;
    if (screen === 'home') {
        const cast = ids.map(id => `
            <button class="character" data-guide="${id}" aria-pressed="${save.guide === id}">
                ${characterSvg(id)}<span>${characters[id][save.locale]}</span>
            </button>`).join('');
        const levelButtons = levels.map((info, index) => {
            const number = index + 1;
            const score = save.records[recordKey(number, number === 8 ? 'read' : kind)] ?? 0;
            const available = unlocked(save.records, number);
            return `<button data-level="${number}" ${available ? '' : 'disabled'}>
                <b>${number}. ${info[save.locale]}</b>
                <span aria-label="${stars(score)} ${tr('étoiles', 'stars')}">
                    ${'★'.repeat(stars(score))}${'☆'.repeat(3 - stars(score))} ${available ? '' : '🔒'}
                </span>
            </button>`;
        }).join('');
        root.innerHTML = `
            <header><h1>TicTac <span aria-hidden="true">◷</span></h1>
                <p>${tr('À ton rythme, découvre l’heure !', 'Learn to tell the time at your own pace!')}</p>
            </header>
            <label class="language">${tr('Langue', 'Language')}
                <select id="locale">
                    <option value="fr" ${save.locale === 'fr' ? 'selected' : ''}>Français</option>
                    <option value="en" ${save.locale === 'en' ? 'selected' : ''}>English</option>
                </select>
            </label>
            <h2>${tr('Choisis ton guide', 'Choose your guide')}</h2>
            <div class="cast">${cast}</div>
            <fieldset><legend>${tr('Comment jouer ?', 'How would you like to play?')}</legend>
                <button id="read" aria-pressed="${kind === 'read'}">${tr('Lire', 'Read')}</button>
                <button id="set" aria-pressed="${kind === 'set'}">${tr('Régler', 'Set')}</button>
            </fieldset>
            <div class="levels">${levelButtons}</div>
            <footer>${tr('Sans publicité. Tout reste sur cet appareil.', 'No ads. Everything stays on this device.')} · 0.2.0</footer>`;
        root.querySelector<HTMLSelectElement>('#locale')?.addEventListener('change', event => {
            save.locale = (event.target as HTMLSelectElement).value as Locale;
            persist();
            render();
        });
        root.querySelectorAll<HTMLButtonElement>('[data-guide]').forEach(control => control.addEventListener('click', () => {
            save.guide = control.dataset.guide as typeof save.guide;
            persist();
            render();
        }));
        for (const k of ['read', 'set'] as const) root.querySelector(`#${k}`)?.addEventListener('click', () => {
            kind = k;
            render();
        });
        root.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(control => control.addEventListener('click', () => start(Number(control.dataset.level))));
        return;
    }
    if (screen === 'result') {
        const starCount = stars(attempt.score);
        feedback = starCount ? tr('Tu progresses ! Quelle belle découverte !', 'Great work! You’re getting the hang of it!') : tr('On réessaie ensemble, à ton rythme.', 'Let’s try again together, at your own pace.');
        root.innerHTML = `
            ${button(tr('Accueil', 'Home'), 'back')}
            <h1>${tr('Série terminée !', 'Session complete!')}</h1>
            <div class="stars" aria-label="${starCount} ${tr('étoiles', 'stars')}">
                ${Array.from({ length: 3 }, (_, index) => `<svg viewBox="0 0 100 100" aria-hidden="true" class="${index < starCount ? 'earned' : 'unearned'}"><path d="M50 7 63 34 93 38 71 59 76 90 50 75 24 90 29 59 7 38 37 34Z"/></svg>`).join('')}
            </div>
            <p class="score">${attempt.score}/10</p>${guide()}
            ${button(tr('Encore', 'Again'), 'again')}
            ${level < 8 && unlocked(save.records, level + 1) ? button(tr('Niveau suivant', 'Next level'), 'next') : ''}`;
        root.querySelector('#again')?.addEventListener('click', () => start());
        root.querySelector('#next')?.addEventListener('click', () => start(level + 1));
    } else {
        const question = session[attempt.index]!;
        const style = level === 6 || level === 8 ? '24' : '12';
        const instruction = levelInfo(level).instructions[save.locale] [kind].replace('{n}', String(question.delta));
        const promptTime = level === 7 ? question.start : question.target;
        const settingPrompt = kind === 'set' ? `
            <p id="target">${say(promptTime, save.locale, style)} · ${formatDigital(promptTime, style)}</p>
            ${level === 7 ? `<p>${tr('Départ', 'Start')}: ${formatDigital(question.start)}</p>` : ''}` : '';
        const answers = question.choices.map((time, index) => {
            const label = level === 8 ? moment(time)[save.locale]
                : level === 6 ? `${formatDigital(time, '24')}<small>${say(time, save.locale, '24')}</small>`
                : say(time, save.locale, style);
            return `<button data-answer="${index}">${label}</button>`;
        }).join('');
        const dots = session.map((_, index) => {
            const state = index < attempt.index ? 'done' : index === attempt.index ? 'current' : '';
            return `<span class="${state}">${index + 1}</span>`;
        }).join('');
        const halfDay = level === 6 && kind === 'set' ? `
            <div class="half-day">
                <button data-half="0" aria-pressed="${displayed.h < 12}">
                    <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M3 26h42M24 2v6M7 9l5 5M41 9l-5 5" stroke="#8c5400" stroke-width="3"/><path d="M10 26a14 14 0 0 1 28 0" fill="#8c5400"/></svg>
                    ${tr('Matin', 'Morning')}<small>${tr('avant midi', 'before noon')}</small>
                </button>
                <button data-half="1" aria-pressed="${displayed.h >= 12}">
                    <svg viewBox="0 0 48 32" aria-hidden="true"><circle cx="24" cy="16" r="9" fill="#8c5400"/><path d="M24 0v4M24 28v4M7 16h4M37 16h4M12 4l3 3M33 25l3 3M12 28l3-3M33 7l3-3" stroke="#8c5400" stroke-width="3"/></svg>
                    ${tr('Après-midi', 'Afternoon')}<small>${tr('après midi', 'after noon')}</small>
                </button>
            </div>` : '';
        const canSpeak = 'speechSynthesis' in window && speechSynthesis.getVoices().some(voice => voice.localService && voice.lang.startsWith(save.locale));
        root.innerHTML = `
            <nav>${button(tr('Retour', 'Back'), 'back')}<span>${levelInfo(level)[save.locale]}</span></nav>
            <h1 class="instruction">${instruction}</h1>${settingPrompt}
            <div class="clock-wrap">
                ${clockSvg(displayed, save.locale, kind === 'set', level === 1)}
                <output id="digital" ${kind === 'read' ? `aria-label="${tr('À toi de trouver', 'Your turn to find out')}"` : ''}>${kind === 'read' ? '--:--' : formatDigital(displayed, style)}</output>
                ${level === 6 || level === 8 ? period(question.target) : ''}
            </div>
            ${halfDay}
            <div class="dots" aria-label="${attempt.index + 1}/10">${dots}</div>${guide()}
            <div id="actions" class="answers">${kind === 'set' ? button(tr('Valider', 'Check'), 'check') : answers}</div>
            ${canSpeak ? button(tr('Écouter', 'Listen'), 'listen') : ''}`;
        if (kind === 'set') {
            const updateClock = wireClock(root.querySelector<SVGSVGElement>('#clock')!, displayed, levelInfo(level).step, save.locale, t => {
                displayed = t;
                const digital = root.querySelector('#digital');
                if (digital) digital.textContent = formatDigital(t, style);
                root.querySelectorAll<HTMLButtonElement>('[data-half]').forEach(control => control.setAttribute('aria-pressed', String(Number(control.dataset.half) === Math.floor(t.h / 12))));
            });
            root.querySelectorAll<HTMLButtonElement>('[data-half]').forEach(control => control.addEventListener('click', () => updateClock({
                h: displayed.h % 12 + Number(control.dataset.half) * 12, m: displayed.m
            })));
        }
        root.querySelector('#check')?.addEventListener('click', () => submit(matchesSetting(question, displayed)));
        let solved = false;
        root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(control => control.addEventListener('click', () => {
            if (solved) return;
            const correct = Number(control.dataset.answer) === question.answer;
            control.classList.add(correct ? 'correct' : 'incorrect');
            if (correct) {
                solved = true;
                control.insertAdjacentHTML('beforeend', '<span class="answer-check" aria-hidden="true">✓</span>');
            }
            submit(correct);
        }));
        root.querySelector('#listen')?.addEventListener('click', () => {
            const voice = new SpeechSynthesisUtterance(spokenPrompt(question, save.locale));
            const local = speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith(save.locale));
            if (!local) return;
            voice.voice = local;
            voice.lang = local.lang;
            speechSynthesis.speak(voice);
        });
    }
    root.querySelector('#back')?.addEventListener('click', () => {
        screen = 'home';
        feedback = '';
        render();
    });
}

const hook = Object.freeze({
    state: () => {
        const rect = root.querySelector('#clock')?.getBoundingClientRect();
        return structuredClone({
            screen, level, kind, index: attempt.index, question: session[attempt.index] ?? null, displayed, score: attempt.score, dial: rect ? {
                cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, radius: rect.width * 154 / 320, hourRadius: rect.width * 83 / 320, minuteRadius: rect.width * 126 / 320
            } : null
        });
    }
});
Object.defineProperty(window, '__tictac', {
    value: hook, writable: false, configurable: false
});
render();
