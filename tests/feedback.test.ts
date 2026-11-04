import { expect, it } from 'vitest';
import { FEEDBACK_URL, feedbackLabel, feedbackLinkHtml } from '../src/ui/feedback';

it('points at the public feedback forms of this game, with no tracking parameter', () => {
    expect(FEEDBACK_URL).toBe('https://github.com/Davy45270/tictac/issues/new/choose');
});

it('renders a new-tab link that cannot reach back into the game', () => {
    for (const locale of ['fr', 'en'] as const) {
        const html = feedbackLinkHtml(locale);
        expect(html).toMatch(/^<a id="feedback" class="parents-link feedback-link" href="https:\/\/github\.com\/Davy45270\/tictac\/issues\/new\/choose" target="_blank" rel="noopener noreferrer">/);
        expect(html).toContain(feedbackLabel(locale));
    }
    expect(feedbackLabel('fr')).toBe('Donner mon avis');
    expect(feedbackLabel('en')).toBe('Give feedback');
    expect(feedbackLinkHtml('fr')).toContain('(nouvel onglet)');
});
