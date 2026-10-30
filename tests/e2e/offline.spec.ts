import {test,expect} from './helpers';
test('a fully installed worker reloads and plays offline',async({page,context})=>{
 await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
 await context.setOffline(true);await page.reload();await expect(page.locator('h1')).toContainText('TicTac');await page.locator('[data-level]').nth(0).click();await expect(page.locator('#clock')).toBeVisible();await context.setOffline(false);
});
