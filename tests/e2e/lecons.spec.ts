import { test, expect, state, readSession } from './helpers';
import { addMinutes, sameTime } from '../../src/engine/time';
import type { Page } from '@playwright/test';

const preset = (page: Page, extra: Record<string, unknown> = {}): Promise<unknown> => page.addInitScript(more => {
    if (sessionStorage.getItem('preset')) return;
    sessionStorage.setItem('preset', '1');
    localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: {
            '1.read': 9, '2.read': 9, '3.read': 9, '4.read': 9, '5.read': 9, '6.read': 9, '7.read': 9, '9.read': 9
        }, ...more
    }));
}, extra);

async function openParents(page: Page): Promise<void> {
    await page.locator('#parents').click();
    const operands = page.locator('[data-a]');
    const product = Number(await operands.getAttribute('data-a')) * Number(await operands.getAttribute('data-b'));
    await page.locator('#gate-answer').fill(String(product + 1));
    await page.locator('#gate-enter').click();
    await expect(page.locator('#gate-message')).toContainText('autre calcul');
    const again = page.locator('[data-a]');
    await page.locator('#gate-answer').fill(String(Number(await again.getAttribute('data-a')) * Number(await again.getAttribute('data-b'))));
    await page.locator('#gate-enter').click();
    await expect(page.locator('.parents h1')).toHaveText('Suivi de l’apprentissage');
}

test('digit lesson writes every proposal as a digital time', async ({ page }) => {
    await preset(page);
    await page.goto('/');
    await page.locator('[data-level="9"]').click();
    await expect(page.locator('#clock')).toHaveAttribute('data-dial', 'arabic');
    for (const text of await page.locator('[data-answer]').allTextContents()) expect(text.trim()).toMatch(/^\d{1,2}:\d{2}$/);
    await readSession(page);
});

test('numberless and Roman dials draw their own faces', async ({ page }) => {
    await preset(page);
    await page.goto('/');
    await page.locator('[data-level="10"]').click();
    await expect(page.locator('#clock')).toHaveAttribute('data-dial', 'none');
    await expect(page.locator('#clock text')).toHaveCount(0);
    await page.locator('#back').click();
    await page.locator('#set').click();
    await page.locator('[data-level="11"]').click();
    await expect(page.locator('#clock')).toHaveAttribute('data-dial', 'roman');
    await expect(page.locator('#clock text')).toHaveText(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']);
    const box = (await page.locator('#clock').boundingBox())!;
    // Every numeral stays inside the dial face.
    for (const numeral of await page.locator('#clock text').all()) {
        const b = (await numeral.boundingBox())!;
        expect(Math.hypot(b.x + b.width / 2 - box.x - box.width / 2, b.y + b.height / 2 - box.y - box.height / 2) + Math.hypot(b.width, b.height) / 2).toBeLessThan(box.width * 145 / 320);
    }
});

test('noon or midnight: the sky tells the half of the day and a confusion comes back later', async ({ page }) => {
    await preset(page);
    await page.goto('/');
    await page.locator('[data-level="12"]').click();
    const first = await state(page);
    const question = first.question!;
    const twin = addMinutes(question.target, 720);
    expect(first.scene).toBe(question.target.h === 23 || question.target.h === 0 ? 'night' : 'day');
    await expect(page.locator('.period')).toHaveCount(1);
    const twinIndex = question.choices.findIndex(t => sameTime(t, twin));
    await page.locator('[data-answer]').nth(twinIndex).click();
    await page.waitForTimeout(1100);
    await page.locator('[data-answer]').nth(question.answer).click();
    await expect(page.locator('#digital')).toHaveText(/^\d{2}:\d{2}$/);
    for (let index = 1; index < 10; index++) {
        await page.locator('#continue').click();
        const current = await state(page);
        expect(current.scene).toBe(current.question!.target.h === 23 || current.question!.target.h === 0 ? 'night' : 'day');
        if (index === 3) {
            expect(current.question!.review).toBe(true);
            expect(current.question!.target).toEqual(twin);
            await expect(page.locator('.review-badge')).toContainText('On revoit celle-ci');
        } else await expect(page.locator('.review-badge')).toHaveCount(0);
        await page.locator('[data-answer]').nth(current.question!.answer).click();
    }
    await expect(page.locator('.score')).toHaveText('9/10');
    expect((await state(page)).outcomes).toEqual(['retry', ...Array.from({ length: 9 }, () => 'sure')]);
});

test('a burst of quick tries does not validate the stars and shows in the parents follow-up', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-level="1"]').click();
    for (let index = 0; index < 10; index++) {
        const question = (await state(page)).question!;
        if (index < 3) {
            await page.locator('[data-answer]').nth((question.answer + 1) % 4).click();
            await page.locator('[data-answer]').nth((question.answer + 2) % 4).click();
            await expect(page.locator('#guide-message')).toContainText('Doucement');
        }
        await page.locator('[data-answer]').nth(question.answer).click();
        if (index < 9) await page.locator('#continue').click();
    }
    expect((await state(page)).outcomes.filter(o => o === 'guess')).toHaveLength(3);
    await expect(page.locator('.score')).toHaveText('7/10');
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '0 étoiles');
    await expect(page.locator('#guide-message')).toContainText('trop vite');
    await expect(page.locator('#next')).toHaveCount(0);
    await page.locator('#back').click();
    await expect(page.locator('[data-level="2"]')).toBeDisabled();
    await openParents(page);
    const row = page.locator('[data-key="1.read"]');
    await expect(row).toHaveAttribute('data-state', 'learning');
    await expect(row).toContainText('Essais au hasard : 3');
    await expect(row).toContainText('Du premier coup : 7/10');
    await expect(row.locator('.meter i')).toHaveCount(10);
    await expect(page.locator('.privacy')).toContainText('rien n’est envoyé');
});

test('two calm perfect sessions master a lesson; the follow-up survives a reload and can be erased', async ({ page }) => {
    await preset(page, { mastery: { '1.read': { recent: 'ssssssssss', sessions: 1, last: '2026-11-01' } } });
    await page.goto('/');
    await expect(page.locator('[data-level="1"]')).not.toHaveAttribute('data-mastered');
    await page.locator('[data-level="1"]').click();
    await readSession(page);
    await page.locator('#back').click();
    await expect(page.locator('[data-level="1"][data-mastered="true"] .level-ribbon')).toHaveAttribute('aria-label', 'Leçon acquise');
    await page.reload();
    await expect(page.locator('[data-level="1"][data-mastered="true"]')).toHaveCount(1);
    await openParents(page);
    await expect(page.locator('[data-key="1.read"]')).toHaveAttribute('data-state', 'mastered');
    await expect(page.locator('.parents-summary')).toContainText('1 leçon acquise');
    await page.locator('#erase').click();
    await expect(page.locator('[data-key="1.read"]')).toHaveAttribute('data-state', 'mastered');
    await page.locator('#erase').click();
    await expect(page.locator('[data-key="1.read"]')).toHaveAttribute('data-state', 'new');
    await page.locator('#back').click();
    await expect(page.locator('[data-mastered]')).toHaveCount(0);
});

test('a mistake at the end of a session opens the next one with a review', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-level="1"]').click();
    for (let index = 0; index < 10; index++) {
        const question = (await state(page)).question!;
        if (index === 9) {
            await page.locator('[data-answer]').nth((question.answer + 1) % 4).click();
            await page.waitForTimeout(1100);
        }
        await page.locator('[data-answer]').nth(question.answer).click();
        if (index < 9) await page.locator('#continue').click();
    }
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tictac.v1')!) as { reviews: Record<string, unknown[]> });
    expect(stored.reviews['1.read']).toHaveLength(1);
    await page.locator('#again').click();
    const first = await state(page);
    expect(first.question!.review).toBe(true);
    expect(first.question!.target).toEqual(stored.reviews['1.read']![0]);
    await page.locator('[data-answer]').nth(first.question!.answer).click();
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('tictac.v1')!) as { reviews: Record<string, unknown[]> });
    expect(after.reviews['1.read']).toBeUndefined();
});

test('parents follow-up fits a 360 px phone without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await preset(page, { mastery: { '4.read': { recent: 'ssrsgsssssssrsssssss', sessions: 2, last: '2026-11-02' } }, reviews: { '4.read': [{ h: 3, m: 45 }] } });
    await page.goto('/');
    await openParents(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    await expect(page.locator('[data-key="4.read"]')).toContainText('À revoir : 1');
    for (const control of ['#back', '#erase', '.parents-rule summary']) expect((await page.locator(control).boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
