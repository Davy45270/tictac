import { test, expect, state, readSession } from './helpers';
import { hourAngle, minuteAngle } from '../../src/engine/time';
import { say } from '../../src/engine/text';

test('ten first-try answers unlock the next level and persist', async ({
    page
}) => {
    await page.goto('/');
    await page.locator('[data-level]').nth(0).click();
    await readSession(page);
    await expect(page.locator('.stars .earned')).toHaveCount(3);
    expect((await page.locator('.guide svg').boundingBox())!.width).toBeGreaterThanOrEqual(140);
    for (const id of ['again', 'next']) {
        const box = (await page.locator(`#${id}`).boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(64);
        const main = (await page.locator('main').boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(main.width - 32);
    }
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
    const wrong = page.locator('[data-answer]').nth((s.question!.answer + 1) % 4);
    await wrong.click();
    await expect(wrong).toHaveClass('incorrect');
    await expect(page.locator('#guide-message')).toContainText('On réessaie ensemble');
    expect((await state(page)).index).toBe(0);
    const correct = page.locator('[data-answer]').nth(s.question!.answer);
    await correct.click();
    await expect(correct).toHaveClass('correct');
    await expect(correct.locator('.answer-check')).toHaveText('✓');
    await expect(wrong).toBeEnabled();
    await wrong.click();
    expect((await state(page)).index).toBe(1);
    expect((await state(page)).score).toBe(0);
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
            '1.read': 9, '2.read': 9, '3.read': 9, '4.read': 9, '5.read': 9, '6.read': 9
        }
    })));
    await page.goto('/');
    for (let level = 1; level <= 7; level++) {
        await page.locator('#set').click();
        await expect(page.locator('[data-level]')).toHaveCount(8);
        await expect(page.locator(`[data-level="${level}"]`)).toHaveCount(1);
        await page.locator(`[data-level="${level}"]`).click();
        expect((await state(page)).level).toBe(level);
        await expect(page.locator('main')).toHaveAttribute('data-current-level', String(level));
        for (const b of await page.locator('button').all()) {
            const box = await b.boundingBox();
            expect(box!.height).toBeGreaterThanOrEqual(44);
            expect(box!.width).toBeGreaterThanOrEqual(44);
        }
        const widths = await page.locator('#clock .hit').evaluateAll(lines => lines.map(line => {
            const svg = (line as SVGLineElement).ownerSVGElement!;
            const style = getComputedStyle(line);
            return parseFloat(style.strokeWidth) * (style.vectorEffect === 'non-scaling-stroke'
                ? 1 : svg.getBoundingClientRect().width / svg.viewBox.baseVal.width);
        }));
        expect(widths).toHaveLength(2);
        for (const width of widths) expect(width).toBeGreaterThanOrEqual(44);
        const dial = await page.locator('#clock').boundingBox();
        expect(dial!.width).toBeGreaterThanOrEqual(280);
        await page.locator('#back').click();
    }
    await page.locator('[data-level="2"]').click();
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

test('level seven reads and speaks the starting time without revealing the target', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('tictac.v1', JSON.stringify({
            version: 1, locale: 'fr', guide: 'panda', records: {
                '1.read': 9, '2.read': 9, '3.read': 9, '4.read': 9, '5.read': 9, '6.read': 9
            }
        }));
        // Keep the speech boundary deterministic on machines without installed voices.
        Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
            text: string;
            lang = '';
            voice: unknown = null;
            constructor(text: string) { this.text = text; }
        } });
        const phrases: string[] = [];
        Object.defineProperty(window, '__spoken', { value: phrases });
        Object.defineProperty(window.speechSynthesis, 'getVoices', {
            value: () => [{ localService: true, lang: 'fr-FR' }]
        });
        Object.defineProperty(window.speechSynthesis, 'speak', {
            value: (utterance: SpeechSynthesisUtterance) => phrases.push(utterance.text)
        });
    });
    await page.goto('/');
    await page.locator('[data-level="7"]').click();
    for (let index = 0; index < 10; index++) {
        const current = await state(page);
        const question = current.question!;
        expect(current.displayed).toEqual(question.start);
        // Check the rendered endpoints as well as the state exposed by the hook.
        for (const [hand, angle, radius] of [
            ['hour', hourAngle(question.start), 83], ['minute', minuteAngle(question.start), 126]
        ] as const) {
            const line = page.locator(`#${hand} .needle`);
            expect(Number(await line.getAttribute('x2'))).toBeCloseTo(160 + Math.sin(angle * Math.PI / 180) * radius, 6);
            expect(Number(await line.getAttribute('y2'))).toBeCloseTo(160 - Math.cos(angle * Math.PI / 180) * radius, 6);
        }
        await expect(page.locator('#digital')).toHaveText('--:--');
        await page.locator('#listen').click();
        const phrases = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
        expect(phrases).toHaveLength(index + 1);
        const phrase = phrases[index]!;
        expect(phrase).toContain(`Dans ${question.delta} minutes`);
        expect(phrase).toContain(`Départ : ${say(question.start, 'fr')}`);
        const startWords = say(question.start, 'fr');
        expect(phrase).toBe(`Dans ${question.delta} minutes, il sera… Départ : ${startWords}.`);
        // E.g. 'quatre heures' is already part of the valid start 'quatre heures moins le quart'.
        expect(phrase.replace(startWords, '')).not.toContain(say(question.target, 'fr'));
        await page.locator('[data-answer]').nth(question.answer).click();
        if (index < 9) await page.locator('#continue').click();
    }
});

for (const [locale, kind] of [['en', 'read'], ['en', 'set'], ['fr', 'set']] as const) {
    test(`level seven ${locale} ${kind}: visible instruction and speech give the start without the answer`, async ({ page }) => {
        await page.addInitScript(({ locale }) => {
            localStorage.setItem('tictac.v1', JSON.stringify({
                version: 1, locale, guide: 'panda', records: {
                    '1.read': 9, '2.read': 9, '3.read': 9, '4.read': 9, '5.read': 9, '6.read': 9
                }
            }));
            Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: class {
                text: string;
                lang = '';
                voice: unknown = null;
                constructor(text: string) { this.text = text; }
            } });
            const phrases: string[] = [];
            Object.defineProperty(window, '__spoken', { value: phrases });
            Object.defineProperty(window.speechSynthesis, 'getVoices', {
                value: () => [{ localService: true, lang: locale === 'en' ? 'en-GB' : 'fr-FR' }]
            });
            Object.defineProperty(window.speechSynthesis, 'speak', {
                value: (utterance: SpeechSynthesisUtterance) => phrases.push(utterance.text)
            });
        }, { locale });
        await page.goto('/');
        if (kind === 'set') await page.locator('#set').click();
        await page.locator('[data-level="7"]').click();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        const question = (await state(page)).question!;
        const instruction = locale === 'en' ? `In ${question.delta} minutes it will be…`
            : `Dans ${question.delta} minutes, il sera…`;
        await expect(page.locator('.instruction')).toHaveText(instruction);
        if (kind === 'read') {
            expect((await state(page)).displayed).toEqual(question.start);
            for (const [hand, angle, radius] of [
                ['hour', (question.start.h % 12) * 30 + question.start.m / 2, 83],
                ['minute', question.start.m * 6, 126]
            ] as const) {
                const line = page.locator(`#${hand} .needle`);
                expect(Number(await line.getAttribute('x2'))).toBeCloseTo(160 + Math.sin(angle * Math.PI / 180) * radius, 6);
                expect(Number(await line.getAttribute('y2'))).toBeCloseTo(160 - Math.cos(angle * Math.PI / 180) * radius, 6);
            }
        }
        const startWords = say(question.start, locale);
        if (kind === 'set') {
            await expect(page.locator('#target')).toHaveText(`${startWords} · ${question.start.h % 12 || 12}:${String(question.start.m).padStart(2, '0')}`);
        }
        await page.locator('#listen').click();
        const phrases = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
        expect(phrases).toEqual([`${instruction} ${locale === 'en' ? 'Start' : 'Départ'} : ${startWords}.`]);
        // The target may be a substring of the legitimate starting time.
        expect(phrases[0]!.replace(startWords, '')).not.toContain(say(question.target, locale));
    });
}

test('home level grid stays within a 360 by 640 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');
    for (const locale of ['fr', 'en']) {
        await page.locator('#locale').selectOption(locale);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
        await expect(page.locator('[data-level]')).toHaveCount(8);
        for (const button of await page.locator('[data-level]').all()) {
            await button.scrollIntoViewIfNeeded();
            const box = (await button.boundingBox())!;
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(360);
            expect(box.height).toBeGreaterThanOrEqual(64);
            expect(await button.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        }
    }
});
