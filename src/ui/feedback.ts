import type { Locale } from '../engine/text';

/**
 * "Give feedback" opens the game's public feedback forms in a new tab.
 * It is a plain link: nothing is sent from this page, and no counter or tracker is involved.
 */
export const FEEDBACK_URL = 'https://github.com/Davy45270/tictac/issues/new/choose';

const t = (locale: Locale, fr: string, en: string): string => locale === 'fr' ? fr : en;

export const feedbackLabel = (locale: Locale): string => t(locale, 'Donner mon avis', 'Give feedback');

export const feedbackLinkHtml = (locale: Locale): string =>
    `<a id="feedback" class="parents-link feedback-link" href="${FEEDBACK_URL}" target="_blank" rel="noopener noreferrer">${feedbackLabel(locale)}<span class="visually-hidden"> ${t(locale, '(nouvel onglet)', '(new tab)')}</span></a>`;
