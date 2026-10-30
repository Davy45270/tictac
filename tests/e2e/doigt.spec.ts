import { test, expect, state } from './helpers';
import { hourAngle, minuteAngle } from '../../src/engine/time';
import { makeRng } from '../../src/engine/session';

test('noisy finger sessions: whole hours, five-minute, precise-minute and 24-hour settings', async ({
    page, context
}) => {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: {
            '1.read': 9, '2.read': 9, '3.read': 9, '4.read': 9, '5.read': 9
        }
    })));
    await page.goto('/');
    const cdp = await context.newCDPSession(page);
    const rng = makeRng(42);
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0): Promise<void> => {
        await cdp.send('Input.dispatchTouchEvent', {
            type, touchPoints: type === 'touchEnd' ? [] : [{
                x, y, id: 1, radiusX: 3, radiusY: 3, force: 1
            }]
        });
    };
    for (const level of [1, 4, 5, 6]) {
        await page.locator('#set').click();
        await page.locator('[data-level]').nth(level - 1).click();
        const scroll = await page.evaluate(() => scrollY);
        for (let question = 0; question < 10; question++) {
            for (const hand of level === 1 ? ['hour'] : ['minute', 'hour']) {
                const current = await state(page);
                const dial = current.dial!;
                const target = current.question!.target;
                const from = hand === 'hour' ? hourAngle(current.displayed) : minuteAngle(current.displayed);
                const to = hand === 'hour' ? hourAngle(target) : minuteAngle(target);
                // Grip an offset point on the shaft; choose the outer minute segment when hands overlap.
                const gripRadius = (hand === 'hour' ? dial.hourRadius * 0.78 : dial.minuteRadius * 0.92);
                const initialAngle = from * Math.PI / 180;
                await touch('touchStart', dial.cx + Math.sin(initialAngle) * gripRadius + Math.cos(initialAngle) * 6, dial.cy - Math.cos(initialAngle) * gripRadius + Math.sin(initialAngle) * 6);
                const steps = 12 + Math.floor(rng() * 9);
                const delta = ((to - from + 540) % 360) - 180;
                for (let stepIndex = 1; stepIndex <= steps; stepIndex++) {
                    const angle = (from + delta * stepIndex / steps) * Math.PI / 180;
                    const radius = stepIndex === Math.floor(steps / 2) ? dial.radius + 45 : gripRadius;
                    // Finish near the intended minute tick after a noisy approach.
                    const noise = stepIndex === steps ? (level === 5 ? 0.2 : 2) : 8;
                    await touch('touchMove', dial.cx + Math.sin(angle) * radius + (rng() * 2 - 1) * noise, dial.cy - Math.cos(angle) * radius + (rng() * 2 - 1) * noise);
                    await page.waitForTimeout(5 + Math.floor(rng() * 16));
                }
                await touch('touchEnd');
            }
            if (level === 6) {
                const target = (await state(page)).question!.target;
                await page.locator(`[data-half="${Math.floor(target.h / 12)}"]`).click();
            }
            await page.locator('#check').click();
            if (question < 9) await page.locator('#continue').click();
            expect(await page.evaluate(() => scrollY)).toBe(scroll);
        }
        await expect(page.locator('.score')).toHaveText('10/10');
        await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
        await page.locator('#back').click();
    }
});

test('a second finger cannot redirect or release the first hand drag', async ({
    page, context
}) => {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: {
            '1.read': 9, '2.read': 9, '3.read': 9
        }
    })));
    await page.goto('/');
    await page.locator('#set').click();
    await page.locator('[data-level="4"]').click();
    const cdp = await context.newCDPSession(page);
    const dial = (await state(page)).dial!;
    await page.evaluate(() => {
        const probe = { ids: [] as number[], released: [] as number[] };
        Object.defineProperty(window, '__pointerProbe', { value: probe });
        const svg = document.querySelector('#clock')!;
        svg.addEventListener('pointerdown', event => probe.ids.push((event as PointerEvent).pointerId));
        svg.addEventListener('pointerup', event => probe.released.push((event as PointerEvent).pointerId));
    });
    const finger = (id: number, angle: number) => ({
        id, x: dial.cx + Math.sin(angle * Math.PI / 180) * dial.minuteRadius * 0.92, y: dial.cy - Math.cos(angle * Math.PI / 180) * dial.minuteRadius * 0.92
    });
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [finger(1, 0)]
    });
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [finger(1, 30)]
    });
    await expect.poll(async () => (await state(page)).displayed.m).toBe(5);
    // The second finger lands on the same shaft and then moves elsewhere.
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [finger(1, 30), {
            ...finger(2, 30), y: finger(2, 30).y + 8
        }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [finger(1, 30), finger(2, 180)]
    });
    await expect.poll(async () => (await state(page)).displayed.m).toBe(5);
    // CDP keeps omitted contacts active on touchMove. End the second contact explicitly.
    // In Chromium's WebTouch path a nonempty touchEnd lists the contacts being released.
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd', touchPoints: [finger(2, 180)]
    });
    await expect.poll(() => page.evaluate(() => {
        const probe = (window as unknown as { __pointerProbe: { ids: number[]; released: number[] } }).__pointerProbe;
        return probe.released.length === 1 && probe.released[0] === probe.ids[1];
    })).toBe(true);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [finger(1, 60)]
    });
    await expect.poll(async () => (await state(page)).displayed.m).toBe(10);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd', touchPoints: []
    });
    // A cancelled gesture also permits a fresh finger to take control.
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [finger(3, 60)]
    });
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchCancel', touchPoints: []
    });
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [finger(4, 60)]
    });
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [finger(4, 90)]
    });
    await expect.poll(async () => (await state(page)).displayed.m).toBe(15);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd', touchPoints: []
    });
});

test('grips both hands near the centre and retains the minute hand through the central zone', async ({ page, context }) => {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: { '1.read': 9, '2.read': 9, '3.read': 9 }
    })));
    await page.goto('/');
    await page.locator('#set').click();
    await page.locator('[data-level="4"]').click();
    await page.locator('#hour').focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    const dial = (await state(page)).dial!;
    const cdp = await context.newCDPSession(page);
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', angle: number, radius: number) => {
        await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{
            id: 1, x: dial.cx + Math.sin(angle * Math.PI / 180) * radius,
            y: dial.cy - Math.cos(angle * Math.PI / 180) * radius
        }] });
    };
    const minuteGrip = dial.minuteRadius * .35;
    await touch('touchStart', 0, minuteGrip);
    await touch('touchMove', 30, minuteGrip);
    await expect.poll(async () => (await state(page)).displayed).toEqual({ h: 3, m: 5 });
    // Move along a chord through the ignored centre, then out on the other side.
    await touch('touchMove', 30, 5);
    await touch('touchMove', 0, 0);
    await touch('touchMove', 210, 5);
    await expect.poll(async () => (await state(page)).displayed).toEqual({ h: 3, m: 5 });
    await touch('touchMove', 210, minuteGrip);
    await expect.poll(async () => (await state(page)).displayed).toEqual({ h: 3, m: 35 });
    await touch('touchEnd', 0, 0);
    const beforeHour = (await state(page)).displayed;
    const hourGrip = dial.hourRadius * .35;
    await touch('touchStart', hourAngle(beforeHour), hourGrip);
    await touch('touchMove', 180 + beforeHour.m / 2, hourGrip);
    await touch('touchEnd', 0, 0);
    expect((await state(page)).displayed).toEqual({ h: 6, m: 35 });
});

test('lostpointercapture alone releases the hand and permits a fresh gesture', async ({ page, context }) => {
    await page.addInitScript(() => localStorage.setItem('tictac.v1', JSON.stringify({
        version: 1, locale: 'fr', guide: 'panda', records: { '1.read': 9, '2.read': 9, '3.read': 9 }
    })));
    await page.goto('/');
    await page.locator('#set').click();
    await page.locator('[data-level="4"]').click();
    await page.evaluate(() => {
        const probe = { id: -1, lost: 0, ended: 0 };
        Object.defineProperty(window, '__captureProbe', { value: probe });
        const svg = document.querySelector('#clock')!;
        svg.addEventListener('pointerdown', event => { probe.id = (event as PointerEvent).pointerId; });
        svg.addEventListener('lostpointercapture', () => { probe.lost++; });
        for (const name of ['pointerup', 'pointercancel']) svg.addEventListener(name, () => { probe.ended++; });
    });
    const dial = (await state(page)).dial!;
    const cdp = await context.newCDPSession(page);
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', angle = 0) => {
        await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{
            id: 1, x: dial.cx + Math.sin(angle * Math.PI / 180) * dial.minuteRadius * .92,
            y: dial.cy - Math.cos(angle * Math.PI / 180) * dial.minuteRadius * .92
        }] });
    };
    await touch('touchStart');
    await touch('touchMove', 30);
    await expect.poll(async () => (await state(page)).displayed.m).toBe(5);
    await page.evaluate(() => {
        const probe = (window as unknown as { __captureProbe: { id: number } }).__captureProbe;
        document.querySelector('#clock')!.releasePointerCapture(probe.id);
    });
    await touch('touchMove', 60);
    await expect.poll(() => page.evaluate(() => {
        const probe = (window as unknown as { __captureProbe: { lost: number; ended: number } }).__captureProbe;
        return { lost: probe.lost, ended: probe.ended };
    })).toEqual({ lost: 1, ended: 0 });
    await expect.poll(async () => (await state(page)).displayed.m).toBe(5);
    await touch('touchEnd');
    await touch('touchStart', 30);
    await touch('touchMove', 90);
    await expect.poll(async () => (await state(page)).displayed.m).toBe(15);
    await touch('touchEnd');
});
