import { ids, characters, type Expression } from '../characters/model';
import { characterSvg } from '../characters/svg';
import { levels, levelInfo, dayPeriod, digitalStyle, type Kind } from '../engine/levels';
import { generateSession, matchesSetting, nearQuestion, reviewQuestion, type Question } from '../engine/session';
import { sameTime, type Time } from '../engine/time';
import { answerLabel, formatDigital, say, spokenPrompt, type Locale } from '../engine/text';
import { questionOutcome, sessionValidates, recordSession, masteryState, localDay, RAPID_MS, MAX_REVIEWS, type Outcome, type Submission } from '../engine/mastery';
import { parentsHtml, gateHtml, makeGate, type Gate } from './parents';
import { answer, stars, recordBest, unlocked, recordKey, type Attempt } from '../engine/progress';
import { readSave, writeSave, browserStorage } from '../shell/storage';
import { clockSvg, wireClock } from './clock';
import { chooseScene, sceneSvg } from './scene';
import { buttonColors, sceneColors } from './contrast';

const root = document.querySelector<HTMLElement>('#app')!;
const storage = browserStorage();
const save = readSave(storage, navigator.language.startsWith('en') ? 'en' : 'fr');
let screen: 'home' | 'exercise' | 'result' | 'parents' = 'home';
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
// Learning follow-up of the current session (see engine/mastery.ts).
let submissions: Submission[] = [];
let outcomes: Outcome[] = [];
let validated = true;
let gate: Gate | null = null;
let gateOpen = false;
let confirmErase = false;
const reviewsOf = (key: string): Time[] => save.reviews[key] ?? [];
function setReviews(key: string, times: Time[]): void {
    save.reviews = Object.fromEntries(Object.entries({ ...save.reviews, [key]: times.slice(-MAX_REVIEWS) }).filter(([, list]) => list.length));
}
const tr = (fr: string, en: string): string => save.locale === 'fr' ? fr : en;
const persist = (): void => writeSave(storage, save);
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const motion = (): 'full' | 'reduce' => motionPreference.matches ? 'reduce' : 'full';
motionPreference.addEventListener('change', () => render());
function updateScene(): void {
    const scene = chooseScene(level, displayed, new Date(), screen === 'exercise');
    if (document.body.dataset.scene !== scene) {
        document.body.dataset.scene = scene;
        let backdrop = document.querySelector('#scene');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.id = 'scene';
            document.body.prepend(backdrop);
        }
        backdrop.innerHTML = sceneSvg(scene);
    }
    for (const [name, value] of Object.entries(sceneColors(scene))) {
        document.body.style.setProperty(`--scene-${name}`, value);
    }
    const accent = characters[save.guide].accent;
    document.body.style.setProperty('--accent', accent);
    for (const [name, value] of Object.entries(buttonColors(accent, scene))) {
        document.body.style.setProperty(`--button-${name}`, value);
    }
}
function guide(): string {
    return `<aside class="guide" data-expression="${expression}">
        ${characterSvg(save.guide, expression, screen === 'result' ? 'celebration' : expression === 'joie' ? 'saut' : 'repos', motion())}
        <p id="guide-message" role="status" aria-live="polite">${feedback || tr('Prends ton temps, on cherche ensemble !', 'Take your time, let’s work together!')}</p>
    </aside>`;
}

function button(text: string, id: string): string {
    return `<button id="${id}">${text}</button>`;
}

function period(time: Time): string {
    const currentPeriod = dayPeriod(time);
    const twins = levelInfo(level).answers === 'twins';
    const sun = twins ? time.h === 11 || time.h === 12 : currentPeriod === 'morning' || currentPeriod === 'afternoon';
    const label = twins ? tr(sun ? 'jour' : 'nuit', sun ? 'day' : 'night') : save.locale === 'fr' ? {
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
    kind = levelInfo(level).readOnly ? 'read' : kind;
    serial++;
    session = generateSession(level, kind, serial * 7919 + level * 101);
    // Times missed in an earlier session come back first.
    reviewsOf(recordKey(level, kind)).forEach((target, index) => {
        const slot = session[index]!;
        const twin = session.findIndex(q => sameTime(q.target, target));
        // Keep ten distinct targets: a planned duplicate takes the place the review leaves.
        if (twin > index) session[twin] = { ...reviewQuestion(level, kind, slot.target, twin, session[twin]!.answer, session[twin]!.delta), review: false };
        session[index] = reviewQuestion(level, kind, target, index, slot.answer, slot.delta);
    });
    attempt = {
        score: 0, index: 0, missed: false
    };
    submissions = [];
    outcomes = [];
    validated = true;
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

/** After a first mistake, a close exercise comes back three questions later, or at the start of the next session. */
function scheduleReview(question: Question, confused?: Time): void {
    const later = attempt.index + 3;
    const planned = session.slice(attempt.index + 1).map(q => q.target);
    if (later < session.length && !session[later]!.review) {
        session[later] = nearQuestion(question, later, [question.target, ...planned], confused, session[later]!.answer);
        return;
    }
    const key = recordKey(level, kind);
    const near = nearQuestion(question, 0, [question.target, ...planned, ...reviewsOf(key)], confused).target;
    setReviews(key, [...reviewsOf(key), near]);
    persist();
}

function submit(correct: boolean, confused?: Time): void {
    const question = session[attempt.index]!;
    const now = performance.now();
    const hasty = submissions.length > 0 && !submissions.at(-1)!.correct && now - submissions.at(-1)!.at < RAPID_MS;
    if (!correct && !submissions.length) scheduleReview(question, confused);
    submissions.push({ at: now, correct });
    attempt = answer(attempt, correct);
    if (!correct) {
        feedback = hasty
            ? tr('Doucement ! Regarde bien les aiguilles avant de choisir.', 'Slow down! Look at the hands before you choose.')
            : tr('On réessaie ensemble ! Regarde la petite aiguille pour les heures, la grande pour les minutes.', 'Let’s try together! The short hand shows hours, the long hand shows minutes.');
        expression = 'surprise';
        updateGuide();
        return;
    }
    const outcome = questionOutcome(submissions, kind);
    outcomes.push(outcome);
    submissions = [];
    const key = recordKey(level, kind);
    if (question.review && outcome === 'sure') setReviews(key, reviewsOf(key).filter(t => !sameTime(t, question.target)));
    const solved = question;
    const digital = root.querySelector('#digital');
    if (digital) {
        digital.textContent = formatDigital(solved.target, digitalStyle(level));
        digital.removeAttribute('aria-label');
    }
    sparkleAnswer(root.querySelector(kind === 'set' ? '#clock' : '.answers .correct'));
    expression = 'joie';
    feedback = tr('Bravo, tu as trouvé !', 'Well done, you found it!');
    if (attempt.index === session.length) {
        // A burst of quick tries does not validate the session; the follow-up records it either way.
        validated = sessionValidates(outcomes);
        if (validated) save.records = recordBest(save.records, level, kind, attempt.score);
        save.mastery[key] = recordSession(save.mastery[key], outcomes, localDay(new Date()));
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

function sparkleAnswer(control: Element | null): void {
    if (!control || motionPreference.matches) return;
    const anchor = control.id === 'clock' ? control.parentElement! : control;
    const bounds = control.getBoundingClientRect();
    const origin = anchor.getBoundingClientRect();
    const sparkle = document.createElement('div');
    sparkle.className = 'answer-sparkles';
    sparkle.style.cssText = `left:${bounds.left - origin.left}px;top:${bounds.top - origin.top}px;width:${bounds.width}px;height:${bounds.height}px`;
    sparkle.innerHTML = `<svg viewBox="0 0 180 64" preserveAspectRatio="none" aria-hidden="true">${[[8, 12], [45, 3], [140, 5], [174, 25], [156, 59], [24, 58]].map(([x, y]) => `<path d="M${x} ${y! - 7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/>`).join('')}</svg>`;
    anchor.append(sparkle);
    window.setTimeout(() => sparkle.remove(), 600);
}

function updateGuide(): void {
    const previousGuide = root.querySelector('.guide');
    if (previousGuide) previousGuide.outerHTML = guide();
}

function render(): void {
    updateScene();
    document.documentElement.lang = save.locale;
    root.dataset.currentLevel = String(level);
    root.dataset.currentKind = kind;
    root.dataset.screen = screen;
    if (screen === 'home') {
        const cast = ids.map(id => `
            <button class="character" data-guide="${id}" aria-pressed="${save.guide === id}">
                ${characterSvg(id, 'joie', 'repos', motion())}<span>${characters[id][save.locale]}</span>
            </button>`).join('');
        const levelButtons = levels.map((info, index) => {
            const number = index + 1;
            const key = recordKey(number, info.readOnly ? 'read' : kind);
            const score = save.records[key] ?? 0;
            const available = unlocked(save.records, number);
            const mastered = masteryState(save.mastery[key], reviewsOf(key).length) === 'mastered';
            return `<button data-level="${number}" ${available ? '' : 'disabled'} ${mastered ? 'data-mastered="true"' : ''}>${mastered ? `<svg class="level-ribbon" viewBox="0 0 32 40" role="img" aria-label="${tr('Leçon acquise', 'Lesson mastered')}"><path d="M9 22 4 39l8-5 4 6 3-15M23 22l5 17-8-5-4 6-3-15" fill="#d9475f" stroke="#7c2236" stroke-width="1.5"/><circle cx="16" cy="15" r="12" fill="#ffd442" stroke="#996017" stroke-width="2"/><path d="m10 15 4 4 8-8" fill="none" stroke="#7a4b07" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>` : ''}
                <b><i class="level-number" aria-hidden="true">${number}</i>${number}. ${info[save.locale]}</b>
                <span aria-label="${stars(score)} ${tr('étoiles', 'stars')}">
                    ${'★'.repeat(stars(score))}${'☆'.repeat(3 - stars(score))} ${available ? '' : '<svg class="level-lock" viewBox="0 0 24 24" aria-label="Verrouillé / Locked" role="img"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v12H5Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="16" r="2" fill="currentColor"/></svg>'}
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
            <section class="glass guide-choice"><h2>${tr('Choisis ton guide', 'Choose your guide')}</h2>
            <div class="cast">${cast}</div></section>
            <fieldset class="glass"><legend>${tr('Comment jouer ?', 'How would you like to play?')}</legend>
                <button id="read" aria-pressed="${kind === 'read'}">${tr('Lire', 'Read')}</button>
                <button id="set" aria-pressed="${kind === 'set'}">${tr('Régler', 'Set')}</button>
            </fieldset>
            <div class="levels glass">${levelButtons}</div>
            <footer><button id="parents" class="parents-link">${tr('Espace parents', 'For parents')}</button>${tr('Sans publicité. Tout reste sur cet appareil.', 'No ads. Everything stays on this device.')} · 0.4.0</footer>`;
        root.querySelector('#parents')?.addEventListener('click', () => {
            screen = 'parents';
            gate = makeGate(Math.random);
            gateOpen = false;
            confirmErase = false;
            render();
        });
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
        const starCount = validated ? stars(attempt.score) : 0;
        feedback = !validated ? tr('Oups, trop vite ! Les étoiles se gagnent en prenant le temps de regarder l’horloge.', 'Whoops, too fast! Stars are earned by taking time to look at the clock.')
            : starCount ? tr('Tu progresses ! Quelle belle découverte !', 'Great work! You’re getting the hang of it!') : tr('On réessaie ensemble, à ton rythme.', 'Let’s try again together, at your own pace.');
        root.innerHTML = `
            ${button(tr('Accueil', 'Home'), 'back')}
            <h1>${tr('Série terminée !', 'Session complete!')}</h1>
            <div class="stars" aria-label="${starCount} ${tr('étoiles', 'stars')}">
                ${Array.from({ length: 3 }, (_, index) => `<svg viewBox="0 0 100 100" aria-hidden="true" class="${index < starCount ? 'earned' : 'unearned'}"><defs><linearGradient id="gold-${index}" x2=".7" y2="1"><stop stop-color="#fff8b5"/><stop offset=".45" stop-color="#ffd442"/><stop offset="1" stop-color="#ef9c15"/></linearGradient></defs><path style="${index < starCount ? `fill:url(#gold-${index})` : ''}" d="M50 7 63 34 93 38 71 59 76 90 50 75 24 90 29 59 7 38 37 34Z"/><path class="star-glint" d="M32 38 49 13 56 31Q40 29 32 38"/><path class="sparkle" d="M9 9v12M3 15h12M87 75v14M80 82h14"/></svg>`).join('')}
            </div>
            <p class="score">${attempt.score}/10</p>${guide()}
            ${button(tr('Encore', 'Again'), 'again')}
            ${level < levels.length && unlocked(save.records, level + 1) ? button(tr('Niveau suivant', 'Next level'), 'next') : ''}`;
        root.querySelector('#again')?.addEventListener('click', () => start());
        root.querySelector('#next')?.addEventListener('click', () => start(level + 1));
    } else if (screen === 'parents') {
        root.innerHTML = gateOpen ? parentsHtml(save, save.locale, confirmErase) : gateHtml(gate!, save.locale);
        root.querySelector<HTMLFormElement>('#gate')?.addEventListener('submit', event => {
            event.preventDefault();
            const value = Number(root.querySelector<HTMLInputElement>('#gate-answer')?.value);
            if (value === gate!.a * gate!.b) {
                gateOpen = true;
                render();
                root.querySelector<HTMLElement>('.parents h1')?.focus();
            } else {
                gate = makeGate(Math.random);
                render();
                root.querySelector('#gate-message')!.textContent = tr('Ce n’est pas ça. Voici un autre calcul.', 'Not quite. Here is another one.');
            }
        });
        root.querySelector('#erase')?.addEventListener('click', () => {
            if (!confirmErase) {
                confirmErase = true;
                render();
                return;
            }
            save.mastery = {};
            save.reviews = {};
            persist();
            confirmErase = false;
            render();
        });
    } else {
        const question = session[attempt.index]!;
        const style = digitalStyle(level);
        const info = levelInfo(level);
        const instruction = levelInfo(level).instructions[save.locale] [kind].replace('{n}', String(question.delta));
        const promptTime = level === 7 ? question.start : question.target;
        const settingPrompt = kind === 'set' ? `
            <p id="target">${info.answers === 'digits' ? `<span class="target-digits">${formatDigital(promptTime, style)}</span>` : `${say(promptTime, save.locale, style)} · ${formatDigital(promptTime, style)}`}</p>
            ${level === 7 ? `<p>${tr('Départ', 'Start')}: ${formatDigital(question.start)}</p>` : ''}` : '';
        const answers = question.choices.map((time, index) => `<button data-answer="${index}" class="${info.answers === 'digits' ? 'digits' : ''}">${answerLabel(time, level, save.locale)}</button>`).join('');
        const review = question.review ? `<p class="review-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>${tr('On revoit celle-ci !', 'Let’s see this one again!')}</p>` : '';
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
            <nav>${button(tr('Retour', 'Back'), 'back')}<span class="level-label">${levelInfo(level)[save.locale]}</span>${canSpeak ? button(tr('Écouter', 'Listen'), 'listen') : ''}</nav>
            <section class="glass prompt">${review}<h1 class="instruction">${instruction}</h1>${settingPrompt}</section>
            <div class="clock-wrap">
                ${clockSvg(displayed, save.locale, kind === 'set', level === 1, info.dial)}
                <output id="digital" ${kind === 'read' ? `aria-label="${tr('À toi de trouver', 'Your turn to find out')}"` : ''}>${kind === 'read' ? '--:--' : formatDigital(displayed, style)}</output>
                ${info.sky ? period(displayed) : ''}
            </div>
            ${halfDay}
            <div class="dots" aria-label="${attempt.index + 1}/10">${dots}</div>${guide()}
            <div id="actions" class="answers glass">${kind === 'set' ? button(tr('Valider', 'Check'), 'check') : answers}</div>
            `;
        if (kind === 'set') {
            const updateClock = wireClock(root.querySelector<SVGSVGElement>('#clock')!, displayed, levelInfo(level).step, save.locale, t => {
                displayed = t;
                updateScene();
                const cue = root.querySelector('.period');
                if (cue) cue.outerHTML = period(t);
                const digital = root.querySelector('#digital');
                if (digital) digital.textContent = formatDigital(t, style);
                root.querySelectorAll<HTMLButtonElement>('[data-half]').forEach(control => control.setAttribute('aria-pressed', String(Number(control.dataset.half) === Math.floor(t.h / 12))));
            });
            root.querySelectorAll<HTMLButtonElement>('[data-half]').forEach(control => control.addEventListener('click', () => updateClock({
                h: displayed.h % 12 + Number(control.dataset.half) * 12, m: displayed.m
            })));
        }
        root.querySelector('#check')?.addEventListener('click', () => submit(matchesSetting(question, displayed), displayed));
        let solved = false;
        root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(control => control.addEventListener('click', () => {
            if (solved) return;
            const correct = Number(control.dataset.answer) === question.answer;
            control.classList.add(correct ? 'correct' : 'incorrect');
            if (correct) {
                solved = true;
                control.insertAdjacentHTML('beforeend', '<span class="answer-check" aria-hidden="true">✓</span>');
            }
            submit(correct, question.choices[Number(control.dataset.answer)]);
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
            scene: document.body.dataset.scene, screen, level, kind, index: attempt.index, question: session[attempt.index] ?? null, displayed, score: attempt.score, outcomes, validated, dial: rect ? {
                cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, radius: rect.width * 154 / 320, hourRadius: rect.width * 83 / 320, minuteRadius: rect.width * 126 / 320
            } : null
        });
    }
});
Object.defineProperty(window, '__tictac', {
    value: hook, writable: false, configurable: false
});
render();

// Follow a device-time boundary even when the child leaves a screen open.
window.setInterval(updateScene, 60_000);
