import { test, expect } from './helpers';

const expected = [
    ['Opencade', 'https://davy45270.github.io/Opencade/'],
    ['Opencadkid', 'https://davy45270.github.io/opencadkid/'],
    ['Petit Astronome', 'https://davy45270.github.io/petit-astronome/']
];

test('the home menu shows the three other games with their exact addresses and icons', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Mes autres jeux' }).click();
    await expect(page.getByRole('heading', { name: 'Mes autres jeux' })).toBeFocused();
    const links = page.locator('a.other-game');
    await expect(links).toHaveCount(3);
    for (const [index, [name, url]] of expected.entries()) {
        const link = links.nth(index);
        await expect(link).toContainText(name!);
        await expect(link).toHaveAttribute('href', url!);
        expect(await link.getAttribute('target')).toBeNull();
        await expect(link.locator('img')).toHaveJSProperty('complete', true);
        expect(await link.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(96);
    }
    await page.getByRole('button', { name: 'Accueil' }).click();
    await expect(page.locator('[data-level]').first()).toBeVisible();
});

test('a finger opens the list and follows a link in the same tab', async ({ page, isMobile }, info) => {
    test.skip(!isMobile, 'finger journey');
    const [, url] = expected[2]!;
    await page.route(url!, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>stub</title><h1>stub</h1>' }));
    await page.goto('/');
    await page.getByRole('button', { name: 'Mes autres jeux' }).tap();
    const link = page.locator('a.other-game[data-game="petit-astronome"]');
    await expect(link).toBeVisible();
    await page.screenshot({ path: info.outputPath('autres-jeux.png'), fullPage: true });
    const pages = page.context().pages().length;
    await link.tap();
    await page.waitForURL(url!);
    expect(page.context().pages()).toHaveLength(pages);
});

test('the list and its icons still show offline', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    });
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: 'Mes autres jeux' }).click();
    const images = page.locator('a.other-game img');
    await expect(images).toHaveCount(3);
    for (let index = 0; index < 3; index++) expect(await images.nth(index).evaluate((image: HTMLImageElement) => image.decode().then(() => image.naturalWidth))).toBe(96);
    await context.setOffline(false);
});
