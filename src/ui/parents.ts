import { levels } from '../engine/levels';
import { counts, letters, masteryState, WINDOW, MASTERY_SURE, type MasteryState } from '../engine/mastery';
import { recordKey, stars } from '../engine/progress';
import type { Locale } from '../engine/text';
import type { Save } from '../shell/storage';

/** A small grown-up question keeps the follow-up away from little fingers. */
export interface Gate {
    a: number;
    b: number
}
export const makeGate = (random: () => number): Gate => ({ a: 6 + Math.floor(random() * 4), b: 6 + Math.floor(random() * 4) });

const t = (locale: Locale, fr: string, en: string): string => locale === 'fr' ? fr : en;

export function gateHtml(gate: Gate, locale: Locale): string {
    return `<button id="back">${t(locale, 'Accueil', 'Home')}</button>
        <section class="glass parents-gate">
            <h1>${t(locale, 'Espace parents', 'For parents')}</h1>
            <form id="gate">
                <label for="gate-answer">${t(locale, 'Pour entrer, combien font', 'To enter, what is')} <b data-a="${gate.a}" data-b="${gate.b}">${gate.a} × ${gate.b}</b> ?</label>
                <input id="gate-answer" type="number" inputmode="numeric" autocomplete="off" required>
                <button id="gate-enter" type="submit">${t(locale, 'Entrer', 'Enter')}</button>
                <p id="gate-message" role="status" aria-live="polite"></p>
            </form>
        </section>`;
}

const label = (state: MasteryState, locale: Locale): string => ({
    new: t(locale, 'Pas encore joué', 'Not played yet'),
    learning: t(locale, 'En cours', 'Learning'),
    mastered: t(locale, 'Acquis', 'Mastered')
})[state];

export function parentsHtml(save: Save, locale: Locale, confirmErase: boolean): string {
    const rows = levels.flatMap((info, index) => {
        const level = index + 1;
        return (info.readOnly ? ['read'] as const : ['read', 'set'] as const).map(kind => {
            const key = recordKey(level, kind);
            const entry = save.mastery[key];
            const pending = save.reviews[key]?.length ?? 0;
            const state = masteryState(entry, pending);
            const c = counts(entry);
            const best = stars(save.records[key] ?? 0);
            return `<li class="follow" data-key="${key}" data-state="${state}">
                <div class="follow-head"><b>${level}. ${info[locale]}</b><span class="follow-kind">${kind === 'read' ? t(locale, 'Lire', 'Read') : t(locale, 'Régler', 'Set')}</span><span class="badge badge-${state}">${label(state, locale)}</span></div>
                ${entry ? `<div class="meter" role="img" aria-label="${c.sure}/${c.total} ${t(locale, 'du premier coup', 'first try')}">${letters(entry.recent).map(o => `<i class="o-${o}"></i>`).join('')}</div>
                <p class="follow-facts"><span>${t(locale, 'Du premier coup', 'First try')} : <b>${c.sure}/${c.total}</b></span><span>${t(locale, 'Essais au hasard', 'Random tries')} : <b>${c.guess}</b></span><span>${t(locale, 'À revoir', 'To review')} : <b>${pending}</b></span><span>${'★'.repeat(best)}${'☆'.repeat(3 - best)}</span><span>${t(locale, 'Séries', 'Sessions')} : ${entry.sessions} · ${entry.last}</span></p>` : ''}
            </li>`;
        });
    }).join('');
    const played = Object.keys(save.mastery).length;
    const mastered = levels.flatMap((info, index) => (info.readOnly ? ['read'] as const : ['read', 'set'] as const).map(kind => recordKey(index + 1, kind)))
        .filter(key => masteryState(save.mastery[key], save.reviews[key]?.length ?? 0) === 'mastered').length;
    return `<button id="back">${t(locale, 'Accueil', 'Home')}</button>
        <section class="glass parents">
            <h1 tabindex="-1">${t(locale, 'Suivi de l’apprentissage', 'Learning follow-up')}</h1>
            <p class="parents-summary">${t(locale, `${mastered} leçon${mastered > 1 ? 's' : ''} acquise${mastered > 1 ? 's' : ''} · ${played} commencée${played > 1 ? 's' : ''}`, `${mastered} lesson${mastered === 1 ? '' : 's'} mastered · ${played} started`)}</p>
            <details class="parents-rule"><summary>${t(locale, 'Comment c’est mesuré ?', 'How is it measured?')}</summary>
                <p>${t(locale,
                    `Une leçon est <b>acquise</b> quand les ${WINDOW} dernières réponses (deux séries) comptent au moins ${MASTERY_SURE} réponses justes du premier coup, aucun essai au hasard et plus rien à revoir. Les étoiles disent comment une série s’est passée ; la maîtrise dit si la leçon tient dans la durée.`,
                    `A lesson is <b>mastered</b> when the last ${WINDOW} answers (two sessions) hold at least ${MASTERY_SURE} right on the first try, no random tries and nothing left to review. Stars tell how one session went; mastery tells whether the lesson lasts.`)}</p>
                <p>${t(locale,
                    'Un essai au hasard, c’est une réponse donnée moins d’une seconde après une erreur, ou toutes les propositions essayées l’une après l’autre. Trois dans une série et la série ne donne pas d’étoiles. Après une erreur, un exercice proche revient plus tard.',
                    'A random try is an answer given less than a second after a mistake, or every proposal tried in turn. Three in a session and the session earns no stars. After a mistake, a close exercise comes back later.')}</p>
            </details>
            <p class="legend"><span><i class="o-s"></i>${t(locale, 'du premier coup', 'first try')}</span><span><i class="o-r"></i>${t(locale, 'après une erreur', 'after a mistake')}</span><span><i class="o-g"></i>${t(locale, 'au hasard', 'random')}</span></p>
            <ul class="follow-list">${rows}</ul>
            <p class="privacy">${t(locale, 'Ce suivi reste sur cet appareil : rien n’est envoyé.', 'This follow-up stays on this device: nothing is sent.')}</p>
            <button id="erase" class="${confirmErase ? 'confirm' : ''}">${confirmErase ? t(locale, 'Confirmer l’effacement du suivi', 'Confirm erasing the follow-up') : t(locale, 'Effacer le suivi', 'Erase the follow-up')}</button>
        </section>`;
}
