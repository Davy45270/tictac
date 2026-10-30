import { minuteAngle, hourAngle, angleFromPoint, dragHour, dragMinute, addMinutes, type Time, type Step } from '../engine/time';
import { say, type Locale } from '../engine/text';

export const point = (angle: number, radius: number): [number, number] => [
    160 + Math.sin(angle * Math.PI / 180) * radius,
    160 - Math.cos(angle * Math.PI / 180) * radius
];

export function clockSvg(time: Time, locale: Locale, adjustable: boolean, hoursOnly: boolean): string {
    const hand = (id: string, angle: number, radius: number, color: string, width: number): string => {
        const [x, y] = point(angle, radius);
        const label = locale === 'fr'
            ? id === 'hour' ? 'Aiguille des heures' : 'Aiguille des minutes'
            : id === 'hour' ? 'Hour hand' : 'Minute hand';
        const attributes = adjustable && !(hoursOnly && id === 'minute')
            ? `tabindex="0" role="slider" aria-label="${label}" aria-valuemin="0" aria-valuemax="${id === 'hour' ? 11 : 59}" aria-valuenow="${id === 'hour' ? time.h % 12 : time.m}" aria-valuetext="${say(time, locale)}"`
            : '';
        return `<g id="${id}" ${attributes}>
            <line class="hit" x1="160" y1="160" x2="${x}" y2="${y}"/>
            <line class="needle" x1="160" y1="160" x2="${x}" y2="${y}" stroke="${color}" stroke-width="${width}"/>
        <path class="hand-shape" pointer-events="none" transform="rotate(${angle} 160 160)" d="M160 ${160-radius}Q${160-width*1.4} ${174-radius} ${160-width/2} 150Q${160-width} 173 160 177Q${160+width} 173 ${160+width/2} 150Q${160+width*1.4} ${174-radius} 160 ${160-radius}Z" fill="${color}" stroke="#fff6dc" stroke-width="1.5"/>
        </g>`;
    };
    const ticks = Array.from({length: 60}, (_, index) => {
        const start = point(index * 6, index % 5 ? 143 : 138);
        const end = point(index * 6, 149);
        return `<line x1="${start[0]}" y1="${start[1]}" x2="${end[0]}" y2="${end[1]}" stroke="#48616b" stroke-width="${index % 5 ? 1 : 3}"/>`;
    }).join('');
    const numbers = Array.from({length: 12}, (_, index) => {
        const [x, y] = point((index + 1) * 30, 119);
        return `<text x="${x}" y="${y}" class="${(index + 1) % 3 === 0 ? 'cardinal' : ''}" text-anchor="middle" dominant-baseline="central">${index + 1}</text>`;
    }).join('');
    return `<svg id="clock" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" aria-label="${locale === 'fr' ? 'Horloge' : 'Clock'}">
        <defs><linearGradient id="case" x2=".8" y2="1"><stop stop-color="#b4f8f0"/><stop offset=".35" stop-color="#39b5bf"/><stop offset="1" stop-color="#17506c"/></linearGradient><radialGradient id="face" cx=".35" cy=".25" r=".8"><stop stop-color="#fffef6"/><stop offset="1" stop-color="#f5e4bc"/></radialGradient><radialGradient id="hub" cx=".3" cy=".2"><stop stop-color="#fff9c4"/><stop offset=".45" stop-color="#ffda5b"/><stop offset="1" stop-color="#b46b18"/></radialGradient></defs>
        <g pointer-events="none" aria-hidden="true"><path d="M44 34Q25 3 51 -7Q75 -17 88 8ZM232 8Q245 -17 269 -7Q295 3 276 34Z" fill="url(#case)" stroke="#20516a" stroke-width="4"/><path d="M70 294 60 324M250 294l10 30" stroke="#20516a" stroke-width="12" stroke-linecap="round"/></g>
        <g pointer-events="none"><circle cx="160" cy="160" r="157" fill="url(#case)" stroke="#20516a" stroke-width="4"/><circle cx="160" cy="160" r="145" fill="url(#face)" stroke="#c7f0e7" stroke-width="3"/><path d="M35 91A144 144 0 0 1 225 29" fill="none" stroke="#fff" opacity=".65" stroke-width="6" stroke-linecap="round"/></g>
        <g pointer-events="none">${ticks}${numbers}</g>
        ${hand('hour', hourAngle(time), 83, '#9b2960', 10)}
        ${hand('minute', minuteAngle(time), 126, '#066b89', 6)}
        <circle cx="160" cy="160" r="11" fill="url(#hub)" stroke="#9c671d" stroke-width="2" pointer-events="none"/>
    </svg>`;
}

function distanceToHand(x: number, y: number, angle: number, radius: number): number {
    const end = point(angle, radius);
    const dx = end[0] - 160;
    const dy = end[1] - 160;
    const projection = Math.max(0, Math.min(1, ((x - 160) * dx + (y - 160) * dy) / (radius * radius)));
    return Math.hypot(x - 160 - projection * dx, y - 160 - projection * dy);
}

export function wireClock(svg: SVGSVGElement, initial: Time, step: Step, locale: Locale, change: (time: Time) => void): (next: Time) => void {
    let time = initial;
    let activeHand: 'hour' | 'minute' | undefined;
    let activePointerId: number | undefined;
    let previousRawAngle = 0;
    const update = (next: Time): void => {
        time = next;
        for (const [id, angle, radius] of [['hour', hourAngle(time), 83], ['minute', minuteAngle(time), 126]] as const) {
            const group = svg.querySelector(`#${id}`);
            const [x, y] = point(angle, radius);
            group?.querySelectorAll('line').forEach(line => {
                line.setAttribute('x2', String(x));
                line.setAttribute('y2', String(y));
            });
            group?.querySelector('.hand-shape')?.setAttribute('transform', `rotate(${angle} 160 160)`);
            group?.setAttribute('aria-valuetext', say(time, locale));
            group?.setAttribute('aria-valuenow', String(id === 'hour' ? time.h % 12 : time.m));
        }
        change(time);
    };
    const coordinates = (event: PointerEvent): [number, number] => {
        const bounds = svg.getBoundingClientRect();
        return [(event.clientX - bounds.left) * 320 / bounds.width, (event.clientY - bounds.top) * 320 / bounds.height];
    };
    svg.addEventListener('pointerdown', event => {
        if (activePointerId !== undefined) return;
        const [x, y] = coordinates(event);
        if (Math.hypot(x - 160, y - 160) < 12) return;
        const hourDistance = distanceToHand(x, y, hourAngle(time), 83);
        const minuteDistance = step === 60 ? Infinity : distanceToHand(x, y, minuteAngle(time), 126);
        const hitRadius = 24 * 320 / svg.getBoundingClientRect().width;
        if (Math.min(hourDistance, minuteDistance) > hitRadius) return;
        // The first finger owns the entire gesture, including capture outside the dial.
        activePointerId = event.pointerId;
        activeHand = hourDistance <= minuteDistance + 1e-6 ? 'hour' : 'minute';
        previousRawAngle = angleFromPoint(160, 160, x, y);
        svg.setPointerCapture(event.pointerId);
        event.preventDefault();
    });
    svg.addEventListener('pointermove', event => {
        if (!activeHand || event.pointerId !== activePointerId) return;
        event.preventDefault();
        const [x, y] = coordinates(event);
        if (Math.hypot(x - 160, y - 160) < 12) return;
        const angle = angleFromPoint(160, 160, x, y);
        update(activeHand === 'hour' ? dragHour(time, angle) : dragMinute(time, angle, step, previousRawAngle));
        previousRawAngle = angle;
    });
    const end = (event: PointerEvent): void => {
        if (event.pointerId !== activePointerId) return;
        activeHand = undefined;
        activePointerId = undefined;
        if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('lostpointercapture', end);
    for (const id of ['hour', 'minute'] as const) {
        svg.querySelector(`#${id}`)?.addEventListener('keydown', event => {
            const keyboardEvent = event as KeyboardEvent;
            if (!['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(keyboardEvent.key) || (id === 'minute' && step === 60)) return;
            keyboardEvent.preventDefault();
            const direction = keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowDown' ? -1 : 1;
            update(addMinutes(time, direction * (id === 'hour' ? 60 : step)));
        });
    }
    return update;
}
