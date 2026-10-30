import { describe, expect, it } from 'vitest';
import { chooseScene, sceneForTime, sceneSvg } from '../src/ui/scene';

describe('time-of-day landscape', () => {
    it.each([
        [0, 0, 'night'], [5, 59, 'night'], [6, 0, 'morning'],
        [11, 59, 'morning'], [12, 0, 'day'], [17, 59, 'day'],
        [18, 0, 'evening'], [23, 59, 'evening']
    ] as const)('%i:%i selects %s', (h, m, expected) => {
        expect(sceneForTime({ h, m })).toBe(expected);
        expect(sceneSvg(expected)).toContain('pointer-events="none"');
    });
    it.each([1, 2, 3, 4, 5, 7])('lesson %i uses device time', level => {
        expect(chooseScene(level, { h: 1, m: 0 }, new Date(2026, 0, 1, 14))).toBe('day');
    });
    it.each([6, 8])('lesson %i follows the visible dial only during exercises', level => {
        const now = new Date(2026, 0, 1, 14);
        expect(chooseScene(level, { h: 1, m: 0 }, now)).toBe('night');
        expect(chooseScene(level, { h: 7, m: 0 }, now)).toBe('morning');
        expect(chooseScene(level, { h: 19, m: 0 }, now)).toBe('evening');
        expect(chooseScene(level, { h: 1, m: 0 }, now, false)).toBe('day');
    });
});
