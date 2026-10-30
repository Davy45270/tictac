import { it, expect } from 'vitest';
import { stars, answer, recordBest, unlocked } from '../src/engine/progress';
import { fresh, readSave, writeSave } from '../src/shell/storage';

it('awards exact star thresholds and preserves best scores by direction', () => {
    expect(Array.from({
        length: 11
    },
    (_, i) => stars(i))).toEqual([0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3]);
    let r = recordBest({},
    1, 'set', 7);
    expect(unlocked(r, 2)).toBe(true);
    expect(unlocked(r, 3)).toBe(false);
    r = recordBest(r, 1, 'set', 5);
    expect(r['1.set']).toBe(7);
    expect(r['1.read']).toBeUndefined();
    expect(unlocked({},
    1)).toBe(true);
});

it('retry advances only after a correct answer and cannot recover first-try credit', () => {
    const initial = {
        score: 0, index: 0, missed: false
    };
    expect(answer(initial, false)).toEqual({
        score: 0, index: 0, missed: true
    });
    expect(answer(answer(initial, false), true)).toEqual({
        score: 0, index: 1, missed: false
    });
    expect(answer(initial, true).score).toBe(1);
});

it('tolerates absent, malformed and throwing storage', () => {
    for (const value of [null, '{', 'null', '[]', '{}', '{"version":2}', '{"version":1,"locale":"fr","guide":"bad","records":{}}']) expect(readSave({
        getItem: () => value, setItem: () => {}
    })).toEqual(fresh());
    const broken = {
        getItem: () => {
            throw Error('blocked');
        },
        setItem: () => {
            throw Error('blocked');
        }
    };
    expect(readSave(broken)).toEqual(fresh());
    expect(() => writeSave(broken, fresh())).not.toThrow();
    let value = '';
    const memory = {
        getItem: () => value, setItem: (_key: string, next: string) => {
            value = next;
        }
    };
    const save = fresh('en');
    save.records = {
        '1.read': 9
    };
    writeSave(memory, save);
    expect(readSave(memory)).toEqual(save);
});
