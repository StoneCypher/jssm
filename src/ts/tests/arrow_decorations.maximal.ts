/* eslint-disable max-len */

import * as fc   from 'fast-check';
import * as jssm from '../jssm';

// Dragon-tier (§6 arrow decorations).  The stochastic file
// `arrow_decorations.stoch.ts` establishes order-invariance and N=2 duplicate
// rejection with space-joined decorations.  This file pushes harder, per the
// dragons-egg §6 suggestions, on properties the stoch tier does not reach:
//
//   1. Duplicate rejection at N>=3 (stoch only tests N=2).
//   2. Duplicate rejection when the repeated decorations share an IDENTICAL
//      value (proves detection keys on decoration KIND, not value).
//   3. Whitespace-run invariance: arbitrary runs of space/tab/CR/LF at every
//      gap between decorations (and around the arrow) leave the parse tree
//      unchanged.  The stoch tier only ever joins with a single space.
//   4. Comment-interleaving invariance: block `/* */` and line `//` comments
//      inserted at those gaps are likewise parse-tree-invariant.
//   5. Malformed decorations are REPORTED (a parse error is thrown), not
//      silently accepted, and the error is a parse error rather than a
//      duplicate misfire.
//
// Every asserted behaviour was first confirmed against the built parser; the
// tests encode observed truth, not assumption.

const RUNS = 100;

const KINDS = ['after', 'action', 'prob', 'desc'] as const;
type DecKind = typeof KINDS[number];

/** Render one decoration of `kind`, value derived from `seed` (see the stoch twin). */
function deco_string(kind: DecKind, seed: number): string {
  switch (kind) {
    case 'after':  return `after ${1 + (seed % 9)}s`;
    case 'action': return `'evt${seed}'`;
    case 'prob':   return `${1 + (seed % 99)}%`;
    case 'desc':   return `{ arc_label : note${seed}; }`;
  }
}

const WS = [' ', ' ', ' ', '\t', '\r', '\n'] as const;   // space-biased

/**
 *  A seeded inter-decoration gap: always at least one whitespace char (so
 *  adjacent tokens never merge), optionally wrapping a block or line comment
 *  in more whitespace.  Deterministic in `seed` for fast-check shrinking.
 *
 *  @param seed          Non-negative integer driving the choices.
 *  @param allow_comment When true, the gap may embed a `/* *\/` or `//` comment.
 */
function gap(seed: number, allow_comment: boolean): string {
  // gen_splitmix32 returns a float in [0, 1); index by `Math.floor(r * len)`,
  // never `r % len` (which would leave a fractional index → undefined).
  const rng  = jssm.gen_splitmix32(seed >>> 0);
  const roll = (n: number): number => Math.floor(rng() * n);
  const pick = <T>(a: readonly T[]): T => a[roll(a.length)];
  const ws   = (): string => { let s = ''; const n = 1 + roll(3); for (let i = 0; i < n; i++) s += pick(WS); return s; };

  let g = ws();
  if (allow_comment && roll(2) === 0) {
    g += (roll(2) === 0) ? `/* c${roll(1000)} */` : `// c${roll(1000)}\n`;
    g += ws();
  }
  return g;
}

/** A distinct-kind subset (length >= 1), each rendered with its own value seed. */
const kinds_arb = fc.subarray([...KINDS], { minLength: 1 });
const vals_arb  = fc.array(fc.integer({ min: 1, max: 10_000 }), { minLength: 4, maxLength: 4 });
const gaps_arb  = fc.array(fc.integer({ min: 0, max: 0xffffffff }), { minLength: 5, maxLength: 5 });

/** Canonical (single-space) rendering of the selected decorations on the pre-arrow side. */
const canonical = (decos: string[]): string => `a ${decos.join(' ')} -> b;`;

/** Gap-fuzzed rendering of the same decorations, one seeded gap per boundary. */
function fuzzed(decos: string[], gap_seeds: number[], allow_comment: boolean): string {
  let s = 'a';
  decos.forEach((d, i) => { s += gap(gap_seeds[i], allow_comment) + d; });
  s += gap(gap_seeds[decos.length], allow_comment) + '-> b;';
  return s;
}

const decos_of = (kinds: DecKind[], vals: number[]): string[] =>
  kinds.map((k) => deco_string(k, vals[KINDS.indexOf(k)]));



describe('dragon §6: duplicate rejection at N>=3', () => {

  for (const kind of KINDS) {
    for (const side of ['pre', 'post'] as const) {

      test(`${kind} repeated 3..6 times (${side}-arrow) throws duplicate`, () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 3, max: 6 }),
            fc.array(fc.integer({ min: 1, max: 10_000 }), { minLength: 6, maxLength: 6 }),
            (n, vals) => {
              const run = Array.from({ length: n }, (_, i) => deco_string(kind, vals[i] + i)).join(' ');
              const fsl = side === 'pre' ? `a ${run} -> b;` : `a -> ${run} b;`;
              expect(() => jssm.parse(fsl)).toThrow(/duplicate/i);
            }
          ),
          { numRuns: RUNS }
        );
      });

    }
  }

});



describe('dragon §6: duplicate rejection is value-independent (identical values)', () => {

  for (const kind of KINDS) {

    test(`${kind} repeated with an IDENTICAL value throws duplicate`, () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 4 }),
          fc.integer({ min: 1, max: 10_000 }),
          (n, v) => {
            const one = deco_string(kind, v);
            const run = Array.from({ length: n }, () => one).join(' ');   // same value, N times
            expect(() => jssm.parse(`a ${run} -> b;`)).toThrow(/duplicate/i);
          }
        ),
        { numRuns: RUNS }
      );
    });

  }

});



describe('dragon §6: whitespace-run invariance', () => {

  test('arbitrary space/tab/CR/LF runs at every gap preserve the parse tree', () => {
    fc.assert(
      fc.property(
        kinds_arb, vals_arb, gaps_arb,
        (kinds, vals, gap_seeds) => {
          const decos = decos_of(kinds, vals);
          expect(jssm.parse(fuzzed(decos, gap_seeds, false))).toEqual(jssm.parse(canonical(decos)));
        }
      ),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §6: comment-interleaving invariance', () => {

  test('block and line comments at the gaps preserve the parse tree', () => {
    fc.assert(
      fc.property(
        kinds_arb, vals_arb, gaps_arb,
        (kinds, vals, gap_seeds) => {
          const decos = decos_of(kinds, vals);
          expect(jssm.parse(fuzzed(decos, gap_seeds, true))).toEqual(jssm.parse(canonical(decos)));
        }
      ),
      { numRuns: RUNS }
    );
  });

});



describe('dragon §6: malformed decorations are reported, not swallowed', () => {

  // `N%%` is a malformed probability (double percent).  The parser must reject
  // it with a parse error (not a duplicate error, and never a silent parse).
  test('a trailing double-percent throws a parse error (not duplicate)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        fc.boolean(),
        (n, with_prefix) => {
          const fsl = with_prefix ? `a after 5s ${n}%% -> b;` : `a ${n}%% -> b;`;
          let threw = false, dup = false;
          try { jssm.parse(fsl); } catch (e) { threw = true; dup = /duplicate/i.test(String((e as Error).message)); }
          expect(threw).toBe(true);   // rejected, never silently parsed
          expect(dup).toBe(false);    // a malformation report, not a duplicate misfire
        }
      ),
      { numRuns: RUNS }
    );
  });

});
