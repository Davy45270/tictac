import type { Page } from '@playwright/test';
import { test, expect, state } from './helpers';
import { characters, ids } from '../../src/characters/model';
import { hourAngle, minuteAngle } from '../../src/engine/time';

test.use({ timezoneId: 'UTC' });

const sceneState = async (page: Page) => await state(page) as Awaited<ReturnType<typeof state>> & { scene: string };
const expectedScene = (hour: number): string => hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'day' : 'evening';
const fixTime = async (page: Page, hour: number, minute = 0): Promise<void> => {
    await page.clock.setFixedTime(new Date(Date.UTC(2026, 0, 1, hour, minute)));
};
async function unlock(page: Page): Promise<void> {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: Object.fromEntries(
            Array.from({ length: 7 }, (_, index) => [`${index + 1}.read`, 9])
        )
    })));
}
async function expectScene(page: Page, scene: string): Promise<void> {
    await expect(page.locator('body')).toHaveAttribute('data-scene', scene);
    expect((await sceneState(page)).scene).toBe(scene);
    await expect(page.locator('#scene .sky-moon')).toHaveCount(scene === 'night' ? 1 : 0);
    await expect(page.locator('#scene .sky-star')).toHaveCount(scene === 'night' ? 22 : 0);
}

for (const [hour, minute, scene] of [[3, 30, 'night'], [9, 0, 'morning'], [14, 0, 'day'], [19, 0, 'evening']] as const) {
    test(`home at ${hour}:${minute} renders ${scene}`, async ({ page }) => {
        await fixTime(page, hour, minute);
        await page.goto('/');
        await expectScene(page, scene);
    });
}

for (const level of [6, 8]) test(`reading level ${level} follows the dial across a whole session`, async ({ page }) => {
    await fixTime(page, 14);
    await unlock(page);
    await page.goto('/');
    await page.locator(`[data-level="${level}"]`).click();
    const scenes = new Set<string>();
    for (let index = 0; index < 10; index++) {
        const current = await sceneState(page);
        const expected = expectedScene(current.displayed.h);
        scenes.add(expected);
        await expectScene(page, expected);
        await page.locator('[data-answer]').nth(current.question!.answer).click();
        if (index < 9) await page.locator('#continue').click();
    }
    expect([...scenes].some(scene => scene !== 'day')).toBe(true);
    await expectScene(page, 'day');
});

for (const hour of [9, 3]) test(`levels one to five follow device time at ${hour}h`, async ({ page }) => {
    await fixTime(page, hour);
    await unlock(page);
    await page.goto('/');
    for (let level = 1; level <= 5; level++) {
        await page.locator('#set').click();
        await page.locator(`[data-level="${level}"]`).click();
        expect((await state(page)).displayed).toEqual({ h: 0, m: 0 });
        await expectScene(page, expectedScene(hour));
        await page.locator('#hour').press('ArrowRight');
        await expectScene(page, expectedScene(hour));
        await page.locator('#back').click();
    }
});

test('setting crosses noon by keyboard and rotates both visible hand shapes', async ({ page }) => {
    await fixTime(page, 3, 30);
    await unlock(page);
    await page.goto('/');
    await page.locator('#set').click();
    await page.locator('[data-level="6"]').click();
    await expectScene(page, 'night');
    const hourShape = page.locator('#hour .hand-shape');
    const minuteShape = page.locator('#minute .hand-shape');
    const beforeHour = await hourShape.getAttribute('transform');
    const beforeMinute = await minuteShape.getAttribute('transform');
    await page.locator('#minute').press('ArrowRight');
    await expect(minuteShape).not.toHaveAttribute('transform', beforeMinute!);
    await expect(minuteShape).toHaveAttribute('transform', `rotate(${minuteAngle((await state(page)).displayed)} 160 160)`);
    for (let hour = 1; hour <= 11; hour++) await page.locator('#hour').press('ArrowRight');
    expect((await state(page)).displayed).toEqual({ h: 11, m: 5 });
    await expect(hourShape).not.toHaveAttribute('transform', beforeHour!);
    await expect(hourShape).toHaveAttribute('transform', `rotate(${hourAngle((await state(page)).displayed)} 160 160)`);
    await expectScene(page, 'morning');
    await page.locator('#hour').press('ArrowRight');
    expect((await state(page)).displayed).toEqual({ h: 12, m: 5 });
    await expectScene(page, 'day');
    await expect(hourShape).toHaveAttribute('transform', `rotate(${hourAngle((await state(page)).displayed)} 160 160)`);
});

test('every guide supplies its own computed body accent', async ({ page }) => {
    await page.goto('/');
    const accents: string[] = [];
    for (const id of ids) {
        await page.locator(`[data-guide="${id}"]`).click();
        const accent = await page.locator('body').evaluate(body => getComputedStyle(body).getPropertyValue('--accent').trim());
        expect(accent).toBe(characters[id].accent);
        accents.push(accent);
    }
    expect(new Set(accents).size).toBe(5);
});

async function expectStill(page: Page): Promise<void> {
    await expect(page.locator('animate, animateTransform')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
}
for (const dynamic of [false, true]) test(`reduced motion ${dynamic ? 'enabled during play' : 'from startup'} stops SVG and landscape motion`, async ({ page }) => {
    await fixTime(page, 3, 30);
    await page.emulateMedia({ reducedMotion: dynamic ? 'no-preference' : 'reduce' });
    await page.goto('/');
    if (!dynamic) await expectStill(page);
    await page.locator('[data-level="1"]').click();
    if (dynamic) {
        expect(await page.locator('animate, animateTransform').count()).toBeGreaterThan(0);
        await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length)).toBeGreaterThan(0);
        const before = await state(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expectStill(page);
        expect(await state(page)).toEqual(before);
    }
    await expectStill(page);
    await page.locator('#back').click();
    await expectStill(page);
});

for (const level of [1, 6, 8]) for (const mode of ['read', 'set']) {
    test(`mobile level ${level} ${mode} fits with a large guide`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'mobile', 'Portrait layout');
        await page.setViewportSize({ width: 390, height: 844 });
        await unlock(page);
        await page.goto('/');
        await page.locator(`#${mode}`).click();
        await page.locator(`[data-level="${level}"]`).click();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        if (level === 8) expect((await state(page)).kind).toBe('read');
        const last = page.locator('[data-answer], #check').last();
        const bounds = await last.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
        const guide = await page.locator('.guide > svg').boundingBox();
        expect(guide!.height).toBeGreaterThanOrEqual(110);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(844);
    });
}
