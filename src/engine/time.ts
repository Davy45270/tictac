export interface Time { h: number; m: number }
export type Step = 60 | 30 | 15 | 5 | 1;
export const mod = (n: number, base: number): number => ((n % base) + base) % base;
export const minuteAngle = (t: Time): number => t.m * 6;
export const hourAngle = (t: Time): number => mod(t.h, 12) * 30 + t.m / 2;
export function angleFromPoint(cx: number, cy: number, x: number, y: number): number {
 return x === cx && y === cy ? 0 : mod(Math.atan2(x - cx, cy - y) * 180 / Math.PI, 360);
}
export const snapMinute = (angle: number, step: Step): number => mod(Math.round(mod(angle, 360) / 6 / step) * step, 60);
export function dragMinute(t: Time, angle: number, step: Step): Time {
 const m = snapMinute(angle, step);
 const movement = mod(angle - minuteAngle(t) + 180, 360) - 180;
 const shift = t.m >= 30 && m < 30 && movement > 0 ? 1 : t.m < 30 && m >= 30 && movement < 0 ? -1 : 0;
 return { h: mod(t.h + shift, 24), m };
}
export function dragHour(t: Time, angle: number): Time {
 return { h: Math.floor(t.h / 12) * 12 + mod(Math.round((mod(angle, 360) - t.m / 2) / 30), 12), m: t.m };
}
export const sameOnDial = (a: Time, b: Time): boolean => a.h % 12 === b.h % 12 && a.m === b.m;
export const sameTime = (a: Time, b: Time): boolean => a.h === b.h && a.m === b.m;
export function addMinutes(t: Time, n: number): Time {
 const total = mod(t.h * 60 + t.m + n, 1440); return { h: Math.floor(total / 60), m: total % 60 };
}
