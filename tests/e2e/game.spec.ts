import {test,expect,state,readSession} from './helpers';
test('ten first-try answers unlock the next level and persist',async({page})=>{
 await page.goto('/');await page.locator('[data-level]').nth(0).click();await readSession(page);
 await page.locator('#back').click();await expect(page.locator('[data-level]').nth(1)).toBeEnabled();await page.reload();await expect(page.locator('[data-level]').nth(1)).toBeEnabled();await expect(page.locator('[data-level]').nth(0).locator('span')).toHaveAttribute('aria-label','3 étoiles');
});
test('an error encourages a retry without first-try credit',async({page})=>{
 await page.goto('/');await page.locator('[data-level]').nth(0).click();const s=await state(page);await page.locator('[data-answer]').nth((s.question!.answer+1)%4).click();await expect(page.getByRole('status')).toContainText('On réessaie ensemble');expect((await state(page)).index).toBe(0);await page.locator('[data-answer]').nth(s.question!.answer).click();await page.locator('#continue').click();expect((await state(page)).index).toBe(1);expect((await state(page)).score).toBe(0);
});
test('language changes labels, instructions and document language',async({page})=>{
 await page.goto('/');await page.locator('#locale').selectOption('en');await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.locator('#read')).toHaveText('Read');await page.locator('[data-level]').nth(0).click();await expect(page.locator('.instruction')).toHaveText('What time is it?');await page.locator('#back').click();await page.locator('#locale').selectOption('fr');await expect(page.locator('html')).toHaveAttribute('lang','fr');await page.locator('[data-level]').nth(0).click();await expect(page.locator('.instruction')).toHaveText('Quelle heure est-il ?');
});
test('touch controls are large and minute hand responds to arrows',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('tictac.v1',JSON.stringify({version:1,locale:'fr',guide:'panda',records:{'1.read':9}})));
 await page.goto('/');await page.locator('#set').click();await page.locator('[data-level]').nth(1).click();
 for(const b of await page.locator('button').all()){const box=await b.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThanOrEqual(44);}
 const widths=await page.locator('#clock .hit').evaluateAll(lines=>lines.map(line=>{
  const svg=(line as SVGLineElement).ownerSVGElement!;
  return parseFloat(getComputedStyle(line).strokeWidth)*svg.getBoundingClientRect().width/svg.viewBox.baseVal.width;
 }));
 for(const width of widths)expect(width).toBeGreaterThanOrEqual(44);
 const dial=await page.locator('#clock').boundingBox();expect(dial!.width).toBeGreaterThanOrEqual(280);
 await page.locator('#minute').focus();await page.keyboard.press('ArrowRight');expect((await state(page)).displayed.m).toBe(30);await page.keyboard.press('ArrowLeft');expect((await state(page)).displayed.m).toBe(0);
 await expect(page.locator('#minute')).toHaveAttribute('aria-valuetext',/heures|midi|minuit/);
});
