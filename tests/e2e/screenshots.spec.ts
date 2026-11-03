import type { Page } from '@playwright/test';
import { test, expect, state, readSession } from './helpers';

declare const process: { env: Record<string, string | undefined> };

test.skip(!process.env.SCREENSHOTS, 'Opt-in README screenshots');
test.skip(process.env.SCREENSHOTS !== '1', 'Enable with SCREENSHOTS=1');
test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile portrait screenshots only');
    // A fixed afternoon keeps the time-of-day landscape identical between runs.
    await page.clock.setFixedTime(new Date('2026-06-21T15:00:00'));
    await page.addInitScript(() => {
        localStorage.setItem('tictac.v1', JSON.stringify({
            version: 1, locale: 'fr', guide: 'panda', records: {
                '1.read': 10, '2.read': 8, '3.read': 9
            }
        }));
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

async function capture(page: Page, name: string): Promise<void> {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
        path: `docs/screenshots/${name}.png`, fullPage: false,
        animations: 'disabled', caret: 'hide',
        // The optional speech button depends on installed system voices.
        style: '#listen { visibility: hidden !important; } footer { visibility: hidden !important; }'
    });
}

test('home with Boubou and earned stars', async ({ page }) => {
    await expect(page.locator('[data-guide="panda"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-level="1"] span')).toHaveAttribute('aria-label', '3 étoiles');
    await capture(page, 'home');
});

test('read quarter hours before answering', async ({ page }) => {
    await page.locator('[data-level="3"]').click();
    await expect(page.locator('#digital')).toHaveText('--:--');
    await expect(page.locator('[data-answer]')).toHaveCount(4);
    expect((await state(page)).index).toBe(0);
    await capture(page, 'read');
});

test('set five-minute steps after dragging the minute hand', async ({ page, context }) => {
    await page.locator('#set').click();
    await page.locator('[data-level="4"]').click();
    // Separate the hands, then drag the minute shaft with a real touch gesture.
    await page.locator('#hour').focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    const dial = (await state(page)).dial!;
    const cdp = await context.newCDPSession(page);
    for (let angle = 0; angle <= 120; angle += 10) {
        const radians = angle * Math.PI / 180;
        await cdp.send('Input.dispatchTouchEvent', {
            type: angle === 0 ? 'touchStart' : 'touchMove',
            touchPoints: [{ id: 1,
                x: dial.cx + Math.sin(radians) * dial.minuteRadius * .92,
                y: dial.cy - Math.cos(radians) * dial.minuteRadius * .92
            }]
        });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await expect.poll(async () => (await state(page)).displayed).toEqual({ h: 3, m: 20 });
    await expect(page.locator('#digital')).toHaveText('3:20');
    await page.locator('#hour').blur();
    await capture(page, 'set');
});

async function advanced(page: Page): Promise<void> {
    // Registered after the default save, so it wins on reload.
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: {
            '1.read': 10, '2.read': 9, '3.read': 9, '4.read': 9, '5.read': 8, '6.read': 9, '7.read': 7, '8.read': 9, '9.read': 9, '10.read': 7
        },
        mastery: {
            '1.read': { recent: 'ssssssssssssssssssss', sessions: 3, last: '2026-06-20' },
            '2.read': { recent: 'sssssssssssssssssrss', sessions: 2, last: '2026-06-20' },
            '3.read': { recent: 'ssrssssssgsssssssss', sessions: 2, last: '2026-06-21' },
            '4.read': { recent: 'srsrsssssrsss', sessions: 2, last: '2026-06-21' },
            '9.read': { recent: 'ssggsrsssr', sessions: 1, last: '2026-06-21' }
        },
        reviews: { '4.read': [{ h: 3, m: 45 }] }
    })));
    await page.reload();
}

test('roman numerals dial', async ({ page }) => {
    await advanced(page);
    await page.locator('[data-level="11"]').click();
    await expect(page.locator('#clock text')).toHaveCount(12);
    await capture(page, 'roman');
});

test('noon or midnight under the night sky', async ({ page }) => {
    await advanced(page);
    await page.locator('[data-level="12"]').click();
    // Advance to the first midnight question so the night sky shows.
    for (let i = 0; i < 9 && (await state(page)).scene !== 'night'; i++) {
        const question = (await state(page)).question!;
        await page.locator('[data-answer]').nth(question.answer).click();
        await page.locator('#continue').click();
    }
    await expect(page.locator('body')).toHaveAttribute('data-scene', 'night');
    await capture(page, 'noon');
});

test('parents follow-up', async ({ page }) => {
    await advanced(page);
    await page.locator('#parents').click();
    const operands = page.locator('[data-a]');
    await page.locator('#gate-answer').fill(String(Number(await operands.getAttribute('data-a')) * Number(await operands.getAttribute('data-b'))));
    await page.locator('#gate-enter').click();
    await expect(page.locator('[data-key="1.read"]')).toHaveAttribute('data-state', 'mastered');
    await capture(page, 'parents');
});

test.describe('completed session', () => {
    test.use({ reducedMotion: 'reduce' });
    test('ten correct answers earn three stars', async ({ page }) => {
        await page.locator('[data-level="1"]').click();
        await readSession(page);
        await expect(page.locator('.score')).toHaveText('10/10');
        await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
        await expect.poll(() => page.evaluate(() =>
            document.getAnimations().filter(animation => animation.playState === 'running').length
        )).toBe(0);
        await capture(page, 'stars');
    });
});
