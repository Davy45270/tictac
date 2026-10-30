import { minuteAngle, hourAngle, angleFromPoint, dragHour, dragMinute, addMinutes, type Time, type Step } from '../engine/time';
import { say, type Locale } from '../engine/text';
export const point = (angle: number, radius: number): [number, number] => [160 + Math.sin(angle * Math.PI / 180) * radius,160 - Math.cos(angle * Math.PI / 180) * radius];
export function clockSvg(t: Time, locale: Locale, adjustable: boolean, hoursOnly: boolean): string {
 const hand = (id: string, a: number, r: number, color: string, width: number): string => {
  const [x,y] = point(a,r);
  return `<g id="${id}" ${adjustable && !(hoursOnly && id === 'minute') ? `tabindex="0" role="slider" aria-label="${locale === 'fr' ? id === 'hour' ? 'Aiguille des heures' : 'Aiguille des minutes' : id === 'hour' ? 'Hour hand' : 'Minute hand'}" aria-valuemin="0" aria-valuemax="${id === 'hour' ? 11 : 59}" aria-valuenow="${id === 'hour' ? t.h % 12 : t.m}" aria-valuetext="${say(t,locale)}"` : ''}><line class="hit" x1="160" y1="160" x2="${x}" y2="${y}"/><line class="needle" x1="160" y1="160" x2="${x}" y2="${y}" stroke="${color}" stroke-width="${width}"/></g>`;
 };
 return `<svg id="clock" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" aria-label="${locale === 'fr' ? 'Horloge' : 'Clock'}"><circle cx="160" cy="160" r="154" fill="white" stroke="#164e63" stroke-width="5"/>${Array.from({length:60},(_,i) => { const a=point(i*6, i%5 ? 143 : 138),b=point(i*6,149);return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#48616b" stroke-width="${i%5 ? 1 : 3}"/>`; }).join('')}${Array.from({length:12},(_,i) => {const [x,y]=point((i+1)*30,119);return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${i+1}</text>`;}).join('')}${hand('hour',hourAngle(t),83,'#9b2960',10)}${hand('minute',minuteAngle(t),126,'#066b89',6)}<circle cx="160" cy="160" r="9" fill="#164e63" pointer-events="none"/></svg>`;
}
function distance(x: number,y: number,a: number,r: number): number {
 const end=point(a,r),dx=end[0]-160,dy=end[1]-160;
 const k=Math.max(0,Math.min(1,((x-160)*dx+(y-160)*dy)/(r*r)));
 return Math.hypot(x-160-k*dx,y-160-k*dy);
}
export function wireClock(svg: SVGSVGElement, initial: Time, step: Step, locale: Locale, change: (t: Time) => void): void {
 let time=initial, active: 'hour' | 'minute' | undefined;
 const update = (next: Time): void => {
  time=next;
  for (const [id,a,r] of [['hour',hourAngle(time),83],['minute',minuteAngle(time),126]] as const) {
   const group=svg.querySelector(`#${id}`);const [x,y]=point(a,r);
   group?.querySelectorAll('line').forEach(line => {line.setAttribute('x2',String(x));line.setAttribute('y2',String(y));});
   group?.setAttribute('aria-valuetext',say(time,locale));group?.setAttribute('aria-valuenow',String(id==='hour' ? time.h%12 : time.m));
  }
  change(time);
 };
 const coords = (e: PointerEvent): [number,number] => {const b=svg.getBoundingClientRect();return [(e.clientX-b.left)*320/b.width,(e.clientY-b.top)*320/b.height];};
 svg.addEventListener('pointerdown',e => {
  const [x,y]=coords(e);const dh=distance(x,y,hourAngle(time),83),dm=step===60 ? Infinity : distance(x,y,minuteAngle(time),126);
  if (Math.min(dh,dm)>25) return;
  active=dh<=dm+1e-6 ? 'hour' : 'minute';svg.setPointerCapture(e.pointerId);e.preventDefault();
 });
 svg.addEventListener('pointermove',e => {if (!active) return;e.preventDefault();const [x,y]=coords(e);if(Math.hypot(x-160,y-160)<12)return;const a=angleFromPoint(160,160,x,y);update(active==='hour' ? dragHour(time,a) : dragMinute(time,a,step));});
 const end = (): void => {active=undefined;};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
 for(const id of ['hour','minute'] as const) svg.querySelector(`#${id}`)?.addEventListener('keydown',event => {
  const e=event as KeyboardEvent;if(!['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'].includes(e.key) || (id==='minute' && step===60))return;e.preventDefault();const sign=e.key==='ArrowLeft'||e.key==='ArrowDown' ? -1 : 1;
  update(addMinutes(time,sign*(id==='hour'?60:step)));
 });
}
