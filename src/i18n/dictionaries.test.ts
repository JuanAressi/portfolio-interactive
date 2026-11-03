import { describe, expect, it } from 'vitest';
import { dictionaries } from './index.ts';

function leaves(tree: object, prefix = ''): Array<[string, unknown]> {
    return Object.entries(tree).flatMap(([key, value]) => {
        const path = `${prefix}${key}`;
        return value && typeof value === 'object'
            ? leaves(value, `${path}.`)
            : ([[path, value]] as Array<[string, unknown]>);
    });
}

function keysOf(tree: object): string[] {
    return leaves(tree)
        .map(([path]) => path)
        .sort();
}

describe('dictionaries', () => {
    it('es and en have exactly the same keys', () => {
        expect(keysOf(dictionaries.en)).toEqual(keysOf(dictionaries.es));
    });

    for (const [locale, dictionary] of Object.entries(dictionaries)) {
        it(`${locale} has text for every key`, () => {
            const empty = leaves(dictionary).filter(
                ([, value]) => typeof value !== 'string' || value.trim() === ''
            );
            expect(empty).toEqual([]);
        });
    }
});
