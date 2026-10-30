export interface Time {
    h: number;
    m: number;
}

export type Step = 60 | 30 | 15 | 5 | 1;

export const mod = (value: number, base: number): number => ((value % base) + base) % base;
export const minuteAngle = (time: Time): number => time.m * 6;
export const hourAngle = (time: Time): number => mod(time.h, 12) * 30 + time.m / 2;

export function angleFromPoint(cx: number, cy: number, x: number, y: number): number {
    return x === cx && y === cy ? 0 : mod(Math.atan2(x - cx, cy - y) * 180 / Math.PI, 360);
}

// Snap to the nearest legal minute; ties turn clockwise and 60 wraps to zero.
export const snapMinute = (angle: number, step: Step): number => mod(Math.round(mod(angle, 360) / 6 / step) * step, 60);

// Callers retain the last raw finger angle throughout a gesture, independently of snapping.
export function dragMinute(time: Time, angle: number, step: Step, previousAngle = minuteAngle(time)): Time {
    const raw = mod(angle, 360);
    const previous = mod(previousAngle, 360);
    // Consecutive raw samples crossing between the last and first quadrants pass twelve.
    const shift = previous >= 270 && raw < 90 ? 1
        : previous < 90 && raw >= 270 ? -1 : 0;
    return { h: mod(time.h + shift, 24), m: snapMinute(raw, step) };
}

export function dragHour(time: Time, angle: number): Time {
    return {
        h: Math.floor(time.h / 12) * 12 + mod(Math.round((mod(angle, 360) - time.m / 2) / 30), 12),
        m: time.m
    };
}

export const sameOnDial = (left: Time, right: Time): boolean => left.h % 12 === right.h % 12 && left.m === right.m;
export const sameTime = (left: Time, right: Time): boolean => left.h === right.h && left.m === right.m;

export function addMinutes(time: Time, minutes: number): Time {
    const total = mod(time.h * 60 + time.m + minutes, 1440);
    return { h: Math.floor(total / 60), m: total % 60 };
}
