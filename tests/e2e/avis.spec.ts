import { test, expect } from './helpers';

const url = 'https://github.com/Davy45270/tictac/issues/new/choose';

test('the home menu offers “Donner mon avis”, opening the feedback forms in a new tab', async ({ page, context, isMobile }, info) => {
    const requests: string[] = [];
    page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173')) requests.push(request.url()); });
    await context.route(url, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>stub</title><h1>stub</h1>' }));
    await page.goto('/');
    const link = page.getByRole('link', { name: /^Donner mon avis/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /\bnoopener\b/);
    await expect(link).toHaveAccessibleName('Donner mon avis (nouvel onglet)');
    const box = await link.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
    if (isMobile) await page.screenshot({ path: info.outputPath('avis-menu.png'), fullPage: true });
    const opened = context.waitForEvent('page');
    if (isMobile) await link.tap(); else await link.click();
    const tab = await opened;
    await tab.waitForURL(url);
    expect(await tab.evaluate(() => window.opener === null)).toBe(true);
    await expect(page.locator('[data-level]').first()).toBeVisible();
    expect(requests).toEqual([]);
});
