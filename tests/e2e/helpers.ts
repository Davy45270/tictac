import { test as base, expect, type Page } from '@playwright/test';
import type { Question } from '../../src/engine/session';
import type { Time } from '../../src/engine/time';

export interface State {
    scene: string;
    screen: string;
    outcomes: string[];
    validated: boolean;
    level: number;
    kind: string;
    index: number;
    question: Question | null;
    displayed: Time;
    score: number;
    dial: {
        cx: number;
        cy: number;
        radius: number;
        hourRadius: number;
        minuteRadius: number;
    } | null;
}

export const state = (page: Page): Promise<State> => page.evaluate(() => (
    window as unknown as { __tictac: { state: () => State } }
).__tictac.state());

export const test = base.extend<{ consoleGuard: boolean }>({
    consoleGuard: [async ({page}, use) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
            if (message.type() === 'error') errors.push(message.text());
        });
        await use(true);
        expect(errors).toEqual([]);
    }, {auto: true}]
});

export { expect };

export async function readSession(page: Page): Promise<void> {
    for (let index = 0; index < 10; index++) {
        const current = await state(page);
        expect(current.index).toBe(index);
        await page.locator('[data-answer]').nth(current.question!.answer).click();
        if (index < 9) await page.locator('#continue').click();
    }
    await expect(page.locator('.score')).toHaveText('10/10');
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', /3/);
}
