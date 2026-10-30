import { test, expect, state, readSession } from './helpers';

test('ten first-try answers unlock the next level and persist', async ({
    page
}) => {
    await page.goto('/');
    await page.locator('[data-level]').nth(0).click();
    await readSession(page);
    await page.locator('#back').click();
    await expect(page.locator('[data-level]').nth(1)).toBeEnabled();
    await page.reload();
    await expect(page.locator('[data-level]').nth(1)).toBeEnabled();
    await expect(page.locator('[data-level]').nth(0).locator('span')).toHaveAttribute('aria-label', '3 étoiles');
});

test('an error encourages a retry without first-try credit', async ({
    page
}) => {
    await page.goto('/');
    await page.locator('[data-level]').nth(0).click();
    const s = await state(page);
    await page.locator('[data-answer]').nth((s.question!.answer + 1) % 4).click();
    await expect(page.locator('#guide-message')).toContainText('On réessaie ensemble');
    expect((await state(page)).index).toBe(0);
    await page.locator('[data-answer]').nth(s.question!.answer).click();
    await page.locator('#continue').click();
    expect((await state(page)).index).toBe(1);
    expect((await state(page)).score).toBe(0);
});

test('language changes labels, instructions and document language', async ({
    page
}) => {
    await page.goto('/');
    await page.locator('#locale').selectOption('en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('#read')).toHaveText('Read');
    await page.locator('[data-level]').nth(0).click();
    await expect(page.locator('.instruction')).toHaveText('What time is it?');
    await page.locator('#back').click();
    await page.locator('#locale').selectOption('fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await page.locator('[data-level]').nth(0).click();
    await expect(page.locator('.instruction')).toHaveText('Quelle heure est-il ?');
});

test('touch controls are large and minute hand responds to arrows', async ({
    page
}) => {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: {
            '1.read': 9
        }
    })));
    await page.goto('/');
    await page.locator('#set').click();
    await page.locator('[data-level]').nth(1).click();
    for (const b of await page.locator('button').all()) {
        const box = await b.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    const widths = await page.locator('#clock .hit').evaluateAll(lines => lines.map(line => {
        const svg = (line as SVGLineElement).ownerSVGElement!;
        return parseFloat(getComputedStyle(line).strokeWidth) * svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    }));
    for (const width of widths) expect(width).toBeGreaterThanOrEqual(44);
    const dial = await page.locator('#clock').boundingBox();
    expect(dial!.width).toBeGreaterThanOrEqual(280);
    await page.locator('#minute').focus();
    await page.keyboard.press('ArrowRight');
    expect((await state(page)).displayed.m).toBe(30);
    await page.keyboard.press('ArrowLeft');
    expect((await state(page)).displayed.m).toBe(0);
    await expect(page.locator('#minute')).toHaveAttribute('aria-valuetext', /heures|midi|minuit/);
});

for (const [locale, language, label] of [['en-US', 'en', 'Read'], ['fr-FR', 'fr', 'Lire']]) {
    test.describe(`browser language ${locale}`, () => {
        test.use({
            locale
        });
        test('starts with the browser language on a fresh save', async ({
            page
        }) => {
            await page.goto('/');
            await expect(page.locator('html')).toHaveAttribute('lang', language!);
            await expect(page.locator('#read')).toHaveText(label!);
        });
    });
}

test('guide choice survives a reload', async ({
    page
}) => {
    await page.goto('/');
    await page.locator('[data-guide="licorne"]').click();
    await expect(page.locator('[data-guide="licorne"]')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('[data-guide="licorne"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-guide="panda"]')).toHaveAttribute('aria-pressed', 'false');
});

for (const level of [1, 6]) test(`read level ${level} conceals the digital answer until success`, async ({
    page
}) => {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: {
            '1.read': 9, '2.read': 9, '3.read': 9, '4.read': 9, '5.read': 9
        }
    })));
    await page.goto('/');
    await page.locator(`[data-level="${level}"]`).click();
    for (let index = 0; index < 10; index++) {
        const question = (await state(page)).question!;
        const target = `${level === 6 ? String(question.target.h).padStart(2, '0') : question.target.h % 12 || 12}:${String(question.target.m).padStart(2, '0')}`;
        await expect(page.locator('#digital')).toHaveText('--:--');
        await expect(page.locator('#digital')).not.toContainText(target);
        await expect(page.locator('#digital')).toHaveAccessibleName('À toi de trouver');
        if (level === 6) {
            for (const [choiceIndex, choice] of question.choices.entries()) {
                const button = page.locator('[data-answer]').nth(choiceIndex);
                await expect(button).toContainText(`${String(choice.h).padStart(2, '0')}:${String(choice.m).padStart(2, '0')}`);
                await expect(button.locator('small')).not.toBeEmpty();
            }
        }
        if (index === 0) {
            await page.locator('[data-answer]').nth((question.answer + 1) % 4).click();
            await expect(page.locator('#digital')).toHaveText('--:--');
        }
        await page.locator('[data-answer]').nth(question.answer).click();
        if (index < 9) {
            await expect(page.locator('#digital')).toHaveText(target);
            await page.locator('#continue').click();
        }
    }
});

test('hour keyboard moves one hour and both sliders expose correct ARIA bounds', async ({
    page
}) => {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: {
            '1.read': 9, '2.read': 9, '3.read': 9
        }
    })));
    await page.goto('/');
    await page.locator('#set').click();
    await page.locator('[data-level="4"]').click();
    const hour = page.locator('#hour');
    const minute = page.locator('#minute');
    for (const [hand, maximum] of [[hour, '11'], [minute, '59']] as const) {
        await expect(hand).toHaveAttribute('aria-valuemin', '0');
        await expect(hand).toHaveAttribute('aria-valuemax', maximum);
        await expect(hand).toHaveAttribute('aria-valuenow', '0');
    }
    await minute.focus();
    await page.keyboard.press('ArrowRight');
    await hour.focus();
    for (const key of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowLeft']) {
        const before = (await state(page)).displayed;
        await page.keyboard.press(key);
        const after = (await state(page)).displayed;
        expect(after.h).toBe((before.h + (key === 'ArrowRight' || key === 'ArrowUp' ? 1 : 23)) % 24);
        expect(after.m).toBe(5);
        await expect(hour).toHaveAttribute('aria-valuenow', String(after.h % 12));
        await expect(minute).toHaveAttribute('aria-valuenow', '5');
    }
    await minute.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    await expect(minute).toHaveAttribute('aria-valuenow', '55');
    await expect(hour).toHaveAttribute('aria-valuenow', String((await state(page)).displayed.h % 12));
});

test('24-hour setting rejects the other half-day and accepts the selected half', async ({
    page
}) => {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: {
            '1.read': 9, '2.read': 9, '3.read': 9, '4.read': 9, '5.read': 9
        }
    })));
    await page.goto('/');
    await page.locator('#set').click();
    await page.locator('[data-level="6"]').click();
    const target = (await state(page)).question!.target;
    await page.locator('#minute').focus();
    for (let index = 0; index < target.m / 5; index++) await page.keyboard.press('ArrowRight');
    await page.locator('#hour').focus();
    for (let index = 0; index < target.h % 12; index++) await page.keyboard.press('ArrowRight');
    const half = Math.floor(target.h / 12);
    for (const button of await page.locator('[data-half]').all()) {
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(64);
    }
    await page.locator(`[data-half="${1 - half}"]`).click();
    await expect(page.locator('#digital')).toHaveText(`${String((target.h + 12) % 24).padStart(2, '0')}:${String(target.m).padStart(2, '0')}`);
    await page.locator('#check').click();
    expect((await state(page)).index).toBe(0);
    await expect(page.locator('#guide-message')).toContainText('On réessaie ensemble');
    await page.locator(`[data-half="${half}"]`).click();
    await expect(page.locator(`[data-half="${half}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#digital')).toHaveText(`${String(target.h).padStart(2, '0')}:${String(target.m).padStart(2, '0')}`);
    await page.locator('#check').click();
    await expect(page.locator('#continue')).toBeVisible();
});

test('day cue is confined to lessons six and eight', async ({
    page
}) => {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: {
            '1.read': 9, '2.read': 9, '3.read': 9, '4.read': 9, '5.read': 9, '6.read': 9, '7.read': 9
        }
    })));
    await page.goto('/');
    for (let level = 1; level <= 8; level++) {
        await page.locator(`[data-level="${level}"]`).click();
        await expect(page.locator('.period')).toHaveCount(level === 6 || level === 8 ? 1 : 0);
        await page.locator('#back').click();
    }
});
