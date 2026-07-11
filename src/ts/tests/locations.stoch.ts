 

import * as fc   from 'fast-check';
import * as jssm from '../jssm';
import type { JssmStateDeclarationRule } from '../jssm_types';



const RUNS = 100;



/**
 *  Type guard: returns true when `v` looks like a `FslSourceLocation`
 *  (has `start.offset` and `end.offset` as numbers).  Uses `unknown`
 *  + field checks so no `any` is needed.
 *  @param  v  Value to test.
 *  @returns   True iff `v` is a well-shaped source span.
 *  @example
 *    isLoc({ start: { offset: 0, line: 1, column: 1 },
 *            end:   { offset: 3, line: 1, column: 4 } }) // → true
 *    isLoc(undefined)                                     // → false
 */
const isLoc = (v: unknown): v is { start: { offset: number }, end: { offset: number } } => {
  if (!v || typeof v !== 'object') { return false; }
  const o = v as Record<string, unknown>;
  const s = o.start as Record<string, unknown> | undefined;
  const e = o.end   as Record<string, unknown> | undefined;
  return !!s && !!e && typeof s.offset === 'number' && typeof e.offset === 'number';
};



/**
 *  Recursively walks a parse-tree value and calls `check` for every
 *  field named `loc` or ending in `_loc` that satisfies {@link isLoc}.
 *  All other object/array values are descended into.
 *  @param  node   The value to walk (array, object, or primitive).
 *  @param  len    Byte length of the source string — passed through to `check`.
 *  @param  check  Callback invoked for each found location span.
 *  @see isLoc
 */
const walk = (
  node  : unknown,
  len   : number,
  check : (loc: { start: { offset: number }, end: { offset: number } }) => void
): void => {
  if (Array.isArray(node)) { for (const n of node) { walk(n, len, check); } return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if ((k === 'loc' || k.endsWith('_loc')) && isLoc(v)) { check(v); }
      else { walk(v, len, check); }
    }
  }
};



describe('parser source locations — stochastic well-formedness', () => {

  /**
   *  Every `loc` / `*_loc` field on any node in the parse tree must
   *  satisfy three invariants:
   *    1. `start.offset >= 0`
   *    2. `end.offset <= src.length`
   *    3. `start.offset <= end.offset`  (non-inverted span)
   *
   *  Generates random valid FSL machines as arrays of `a -> b;` edges.
   */
  test('every loc is in-bounds and non-inverted for random valid machines', () => {

    const LOWER     = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const LOWER_NUM = [...LOWER, '0','1','2','3','4','5','6','7','8','9'];
    const stateName = fc.tuple(
      fc.constantFrom(...LOWER),
      fc.array(fc.constantFrom(...LOWER_NUM), { minLength: 0, maxLength: 5 })
    ).map(([first, rest]) => first + rest.join(''));
    const edge      = fc.tuple(stateName, stateName).map(([a, b]) => `${a} -> ${b};`);

    fc.assert(
      fc.property(fc.array(edge, { minLength: 1, maxLength: 8 }), (edges) => {
        const src  = edges.join('\n');
        const tree = jssm.parse(src, { locations: true });
        walk(tree, src.length, (loc) => {
          expect(loc.start.offset).toBeGreaterThanOrEqual(0);
          expect(loc.end.offset).toBeLessThanOrEqual(src.length);
          expect(loc.start.offset).toBeLessThanOrEqual(loc.end.offset);
        });
      }),
      { numRuns: RUNS }
    );

  });

});



describe('parser source locations — color value_loc round-trip', () => {

  /**
   *  For a `state X: { color: <c>; };` declaration parsed with
   *  `{ locations: true }`, the color item's `value_loc` must slice
   *  back to exactly the original color token written in the source.
   *
   *  Tests a fixed set of representative color tokens (named SVG
   *  colors and a hex literal) via `fc.constantFrom`.
   */
  test('color item value_loc slices back to the original color token', () => {

    const COLOR_TOKENS = ['red', 'blue', 'green', '#ff0000'] as const;
    const colorArb     = fc.constantFrom(...COLOR_TOKENS);

    fc.assert(
      fc.property(colorArb, (color) => {
        const src  = `state X: { color: ${color}; };`;
        const tree = jssm.parse(src, { locations: true });

        const raw   = tree[0].value;
        const items : JssmStateDeclarationRule[] = Array.isArray(raw) ? raw : [];
        const item  = items.find(i => i.key === 'color');

        expect(item).toBeDefined();
        expect(item!.value_loc).toBeDefined();

        const sliced = src.slice(item!.value_loc!.start.offset, item!.value_loc!.end.offset);
        expect(sliced).toBe(color);
      }),
      { numRuns: RUNS }
    );

  });

});
