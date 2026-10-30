import type { Page } from '@playwright/test';
import { test, expect, state } from './helpers';
import { characters, ids } from '../../src/characters/model';
import { contrastRatio } from '../../src/ui/contrast';
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
    await expect(page.locator('#hour .hand-shadow')).toHaveAttribute('transform', `translate(3 3) rotate(${hourAngle((await state(page)).displayed)} 160 160)`);
    await expect(page.locator('#minute .hand-shadow')).toHaveAttribute('transform', `translate(3 3) rotate(${minuteAngle((await state(page)).displayed)} 160 160)`);
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
        expect(guide!.height).toBeGreaterThanOrEqual(118);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(844);
    });
}

for (const hour of [3, 9, 14, 19]) test(`computed artwork and contrast at ${hour}h`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fixTime(page, hour);
    await page.goto('/');
    const checkOrb = async (selector: string): Promise<void> => {
        const orb = (await page.locator('.scene-orb').boundingBox())!;
        expect(orb.width).toBe(64);
        expect(orb.height).toBe(64);
        expect(orb.x).toBeGreaterThanOrEqual(0);
        expect(orb.y).toBeGreaterThanOrEqual(0);
        expect(orb.x + orb.width).toBeLessThanOrEqual(390);
        expect(orb.y + orb.height).toBeLessThanOrEqual(844);
        const text = (await page.locator(selector).boundingBox())!;
        expect(orb.x + orb.width <= text.x || text.x + text.width <= orb.x ||
            orb.y + orb.height <= text.y || text.y + text.height <= orb.y).toBe(true);
    };
    await checkOrb('header h1');
    if (hour === 3) {
        const header = (await page.locator('header').boundingBox())!;
        for (const star of await page.locator('.sky-star').all()) {
            const box = (await star.boundingBox())!;
            expect(box.y).toBeGreaterThanOrEqual(header.y + header.height);
        }
    }
    await page.locator('[data-level="1"]').click();
    await checkOrb('#back');
    const styles = await page.locator('.prompt, .level-label, .answers button, .guide p, .dots span').evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element);
        const hex = (color: string): string => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            context.fillStyle = color;
            return context.fillStyle;
        };
        // Glass uses the opaque scene fallback; gradients use their button base.
        const glass = style.backdropFilter !== 'none';
        const fallback = hex(style.getPropertyValue(element.matches('button') ? '--button-base' : '--scene-panel').trim());
        // A translucent fill is composited over the opaque panel it sits on.
        const over = (color: string): string => {
            const value = hex(color);
            const rgba = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(value);
            if (!rgba) return value;
            const alpha = Number(rgba[4]);
            const base = [1, 3, 5].map(start => parseInt(fallback.slice(start, start + 2), 16));
            return `#${[1, 2, 3].map(i => Math.round(Number(rgba[i]) * alpha + base[i - 1]! * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
        };
        return { ink: over(style.color), background: glass || style.backgroundImage !== 'none' ? fallback : over(style.backgroundColor) };
    }));
    for (const style of styles) expect(contrastRatio(style.ink, style.background)).toBeGreaterThanOrEqual(4.5);
    await expect(page.locator('.level-label')).toHaveCSS('font-weight', '700');
    await expect(page.locator('.level-label')).toHaveCSS('text-shadow', 'none');
    for (const needle of await page.locator('.needle').all()) await expect(needle).toHaveCSS('stroke-opacity', '0');
    const tail = await page.locator('.guide p').evaluate(element => {
        const style = getComputedStyle(element, '::before');
        return { content: style.content, width: parseFloat(style.width), height: parseFloat(style.height), transform: style.transform };
    });
    expect(tail.content).toBe('""');
    expect(tail.width).toBeGreaterThan(0);
    expect(tail.height).toBeGreaterThan(0);
    expect(tail.transform).not.toBe('none');
});

for (const mode of ['read', 'set']) for (const reduce of [false, true]) test(`${mode} success anchors sparkles and respects reduced motion ${reduce}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
    await page.clock.install({ time: new Date('2026-01-01T14:00:00Z') });
    await page.goto('/');
    await page.clock.pauseAt(new Date('2026-01-01T14:01:00Z'));
    await page.locator(`#${mode}`).click();
    await page.locator('[data-level="1"]').click();
    for (let index = 0; index < 10; index++) {
        const current = await state(page);
        if (mode === 'set') {
            for (let h = 0; h < current.question!.target.h % 12; h++) await page.locator('#hour').press('ArrowRight');
            await page.locator('#check').click();
        } else await page.locator('[data-answer]').nth(current.question!.answer).click();
        await expect(page.locator('.guide')).toHaveAttribute('data-expression', 'joie');
        if (index === 9) break;
        if (reduce) {
            await expect(page.locator('.answer-sparkles')).toHaveCount(0);
            await expectStill(page);
        } else {
            const sparkle = page.locator('.answer-sparkles');
            await expect(sparkle).toHaveCount(1);
            expect(await sparkle.evaluate(element => element.parentElement?.matches('.clock-wrap, .answers .correct'))).toBe(true);
            const target = page.locator(mode === 'set' ? '#clock' : '.answers .correct');
            const bounds = await target.boundingBox();
            const dimensions = await sparkle.evaluate(element => ({ width: parseFloat((element as HTMLElement).style.width), height: parseFloat((element as HTMLElement).style.height) }));
            expect(dimensions.width).toBeCloseTo(bounds!.width, 0);
            expect(dimensions.height).toBeCloseTo(bounds!.height, 0);
            await expect(page.locator('.guide animateTransform')).toHaveAttribute('values', '0 0;0 -12;0 0');
            await page.clock.fastForward(150);
            await expect(sparkle).toHaveCount(1);
        }
        if (index === 0) {
            await page.clock.fastForward(850);
            await expect(page.locator('.answer-sparkles')).toHaveCount(0);
        }
        await page.locator('#continue').click();
        await expect(page.locator('.answer-sparkles')).toHaveCount(0);
    }
    await expect(page.locator('main')).toHaveAttribute('data-screen', 'result');
    await page.clock.fastForward(1000);
    await expect(page.locator('body .answer-sparkles')).toHaveCount(0);
});
