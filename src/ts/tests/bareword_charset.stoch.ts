import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import * as jssm from '../jssm';

/**
 *  Drift guard for the fast atom scanner (#754). `peg$parseAtom` in the
 *  generated parser is replaced at build time (`src/buildjs/fixparser.cjs`,
 *  `inline_fast_atom`) with a sticky regex derived from the SAME two
 *  Unicode-property classes the grammar's `AtomFirstLetter` / `AtomLetter`
 *  predicates test (`BAREWORD_FIRST` / `BAREWORD_REST` in
 *  `src/ts/fsl_parser.peg`). This test drives random code-point sequences
 *  through the real, built parser and checks the observable contract the
 *  grammar promises — a bareword made only of identifier code points parses
 *  as a state name; anything else must be quoted — so a scanner that drifts
 *  from the grammar's classes fails here regardless of which code path
 *  (generated or inlined) actually ran.
 */

const FIRST = /^[\p{L}\p{Nl}_]$/u;
const REST  = /^[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}]$/u;

const code_point = fc.integer({ min: 0x20, max: 0x10_FF_FF })
  .filter(cp => cp < 0xD8_00 || cp > 0xDF_FF)
  .map(cp => String.fromCodePoint(cp));

const is_bareword = (s: string): boolean => {
  const cps = [...s];
  return cps.length > 0 && FIRST.test(cps[0]) && cps.slice(1).every(c => REST.test(c));
};

describe('bareword charset — generative', () => {

  test('a name made of identifier code points parses as a state; anything else is rejected as a bareword', () => {
    fc.assert(fc.property(
      fc.array(code_point, { minLength: 1, maxLength: 6 }).map(a => a.join('')),
      (name) => {
        // the grammar's structural characters can never be state names in either form; skip them
        if (/[\s;"'[\]{}<>\-=~|&:%#/]/u.test(name)) { return; }
        if (is_bareword(name)) {
          const m = jssm.sm`${name} -> other;`;
          expect(m.has_state(name)).toBe(true);
        } else {
          expect(() => jssm.sm`${name} -> other;`).toThrow();
        }
      }
    ), { numRuns: 400 });
  });

  test('every identifier name also round-trips quoted', () => {
    fc.assert(fc.property(
      fc.array(code_point.filter(c => REST.test(c)), { minLength: 1, maxLength: 6 }).map(a => a.join('')),
      (name) => {
        const m = jssm.sm`"${name}" -> other;`;
        expect(m.has_state(name)).toBe(true);
      }
    ), { numRuns: 200 });
  });

});
