import {test,expect,state} from './helpers';
import {hourAngle,minuteAngle} from '../../src/engine/time';
import {makeRng} from '../../src/engine/session';
test('noisy finger sessions: whole hours and five-minute settings',async({page,context})=>{
 await page.addInitScript(()=>localStorage.setItem('tictac.v1',JSON.stringify({version:1,locale:'fr',guide:'panda',records:{'1.read':9,'2.read':9,'3.read':9}})));
 await page.goto('/');const cdp=await context.newCDPSession(page),rng=makeRng(42);
 const touch=async(type:'touchStart'|'touchMove'|'touchEnd',x=0,y=0):Promise<void>=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:3,radiusY:3,force:1}]});};
 for(const level of [1,4]){
  await page.locator('#set').click();await page.locator('[data-level]').nth(level-1).click();const scroll=await page.evaluate(()=>scrollY);
  for(let question=0;question<10;question++){
   for(const hand of level===1?['hour']:['minute','hour']){
    const s=await state(page),d=s.dial!,t=s.question!.target;
    const from=hand==='hour'?hourAngle(s.displayed):minuteAngle(s.displayed),to=hand==='hour'?hourAngle(t):minuteAngle(t);
    // Grip an offset point on the shaft; choose the outer minute segment when hands overlap.
    const r=(hand==='hour'?d.hourRadius*.78:d.minuteRadius*.92),a=from*Math.PI/180;
    await touch('touchStart',d.cx+Math.sin(a)*r+Math.cos(a)*6,d.cy-Math.cos(a)*r+Math.sin(a)*6);
    const steps=12+Math.floor(rng()*9),delta=((to-from+540)%360)-180;
    for(let i=1;i<=steps;i++){
     const angle=(from+delta*i/steps)*Math.PI/180;
     const radius=i===Math.floor(steps/2)?d.radius+45:r;
     const noise=i===steps?2:8;
     await touch('touchMove',d.cx+Math.sin(angle)*radius+(rng()*2-1)*noise,d.cy-Math.cos(angle)*radius+(rng()*2-1)*noise);
     await page.waitForTimeout(5+Math.floor(rng()*16));
    }
    await touch('touchEnd');
   }
   await page.locator('#check').click();if(question<9)await page.locator('#continue').click();
   expect(await page.evaluate(()=>scrollY)).toBe(scroll);
  }
  await expect(page.locator('.score')).toHaveText('10/10');await expect(page.locator('.stars')).toHaveAttribute('aria-label','3 étoiles');await page.locator('#back').click();
 }
});
