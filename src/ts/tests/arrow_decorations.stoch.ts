
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for the free-ordered arrow-decoration
// grammar.  Per `notes/fsl-grammar-reference.md` §6, each side of an
// arrow accepts a free-ordered run of decorations (after / action /
// probability / desc); each kind appears at most once per side.  The
// commit that introduced order-independence (`1acbc62 feat(grammar):
// allow arrow decorations in any order`) lacked stochastic regression
// coverage — these properties fill that gap.



const RUNS = 100;

const KINDS = ['after', 'action', 'prob', 'desc'] as const;
type DecKind = typeof KINDS[number];



/**
 *  Render a single decoration of the given kind, with the supplied
 *  seed determining the value so two calls with the same args
 *  produce identical syntax.  Used by the property-based tests to
 *  build random decoration sequences deterministically.
 *
 *  @param   kind  Decoration kind: `after`, `action`, `prob`, or `desc`.
 *  @param   seed  Positive integer used to derive a deterministic value.
 *  @returns       FSL syntax for a single decoration of `kind`.
 *
 *  @example
 *    deco_string('prob',   42)    // → '42%'
 *    deco_string('after',   5)    // → 'after 6s'
 *    deco_string('action',  7)    // → "'evt7'"
 *    deco_string('desc',    9)    // → '{ arc_label : note9; }'
 */
function deco_string(kind: DecKind, seed: number): string {

  switch (kind) {
    case 'after':  return `after ${1 + (seed % 9)}s`;
    case 'action': return `'evt${seed}'`;
    case 'prob':   return `${1 + (seed % 99)}%`;
    case 'desc':   return `{ arc_label : note${seed}; }`;
  }

}



/**
 *  Seeded Fisher-Yates shuffle.  Uses `jssm.gen_splitmix32` so a
 *  given seed always produces the same permutation — necessary for
 *  fast-check's deterministic shrinking.
 *
 *  @param   arr   Array to shuffle.  Not mutated.
 *  @param   seed  Non-negative integer.
 *  @returns       A new array with the same contents in a permuted order.
 *
 *  @example
 *    shuffle(['a','b','c','d'], 0)   // → e.g. ['c','a','d','b']
 *    shuffle(['a','b','c','d'], 0)   // → same as above (deterministic)
 */
function shuffle<T>(arr: readonly T[], seed: number): T[] {

  const rng = jssm.gen_splitmix32(seed >>> 0);
  const out = arr.slice();

  for (let i = out.length - 1; i > 0; --i) {
    const j = rng() % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;

}





describe('Arrow decorations parse order-invariantly (pre-arrow position)', () => {

  test('Two random permutations of the same decoration set produce identical parse trees', () => {

     fc.assert(
       fc.property(
         fc.array(fc.integer({ min: 1, max: 10_000 }), { minLength: 4, maxLength: 4 }),  // four value seeds
         fc.integer({ min: 0, max: 0xffffffff }),                                         // permutation seed 1
         fc.integer({ min: 0, max: 0xffffffff }),                                         // permutation seed 2
         (vals, s1, s2) => {
           const decos = KINDS.map((k, i) => deco_string(k, vals[i]));
           const fsl1  = `a ${shuffle(decos, s1).join(' ')} -> b;`;
           const fsl2  = `a ${shuffle(decos, s2).join(' ')} -> b;`;
           expect( jssm.parse(fsl1) ).toEqual( jssm.parse(fsl2) );
         }
       ),
       { numRuns: RUNS }
     );

  });

});





describe('Arrow decorations parse order-invariantly (post-arrow position)', () => {

  test('Two random permutations of the same decoration set produce identical parse trees', () => {

     fc.assert(
       fc.property(
         fc.array(fc.integer({ min: 1, max: 10_000 }), { minLength: 4, maxLength: 4 }),
         fc.integer({ min: 0, max: 0xffffffff }),
         fc.integer({ min: 0, max: 0xffffffff }),
         (vals, s1, s2) => {
           const decos = KINDS.map((k, i) => deco_string(k, vals[i]));
           const fsl1  = `a -> ${shuffle(decos, s1).join(' ')} b;`;
           const fsl2  = `a -> ${shuffle(decos, s2).join(' ')} b;`;
           expect( jssm.parse(fsl1) ).toEqual( jssm.parse(fsl2) );
         }
       ),
       { numRuns: RUNS }
     );

  });

});





describe('Arrow decorations parse order-invariantly on both sides simultaneously', () => {

  test('Independent permutations on each side preserve the parse tree', () => {

     fc.assert(
       fc.property(
         fc.array(fc.integer({ min: 1, max: 10_000 }), { minLength: 4, maxLength: 4 }),  // pre-arrow value seeds
         fc.array(fc.integer({ min: 1, max: 10_000 }), { minLength: 4, maxLength: 4 }),  // post-arrow value seeds
         fc.integer({ min: 0, max: 0xffffffff }),                                        // pre-arrow permutation seed 1
         fc.integer({ min: 0, max: 0xffffffff }),                                        // post-arrow permutation seed 1
         fc.integer({ min: 0, max: 0xffffffff }),                                        // pre-arrow permutation seed 2
         fc.integer({ min: 0, max: 0xffffffff }),                                        // post-arrow permutation seed 2
         (pre_vals, post_vals, pre_s1, post_s1, pre_s2, post_s2) => {
           const pre  = KINDS.map((k, i) => deco_string(k, pre_vals[i]));
           const post = KINDS.map((k, i) => deco_string(k, post_vals[i]));
           const fsl1 = `a ${shuffle(pre, pre_s1).join(' ')} -> ${shuffle(post, post_s1).join(' ')} b;`;
           const fsl2 = `a ${shuffle(pre, pre_s2).join(' ')} -> ${shuffle(post, post_s2).join(' ')} b;`;
           expect( jssm.parse(fsl1) ).toEqual( jssm.parse(fsl2) );
         }
       ),
       { numRuns: RUNS }
     );

  });

});





describe('Arrow decorations reject duplicate decorations of the same kind', () => {

  for (const kind of KINDS) {

    test(`Two ${kind} decorations on the pre-arrow side throws`, () => {

       fc.assert(
         fc.property(
           fc.integer({ min: 1, max: 10_000 }),
           fc.integer({ min: 1, max: 10_000 }),
           (v1, v2) => {
             const d1  = deco_string(kind, v1);
             const d2  = deco_string(kind, v2 + 1);   // make values mostly differ
             const fsl = `a ${d1} ${d2} -> b;`;
             expect( () => jssm.parse(fsl) ).toThrow(/duplicate/i);
           }
         ),
         { numRuns: RUNS }
       );

    });

    test(`Two ${kind} decorations on the post-arrow side throws`, () => {

       fc.assert(
         fc.property(
           fc.integer({ min: 1, max: 10_000 }),
           fc.integer({ min: 1, max: 10_000 }),
           (v1, v2) => {
             const d1  = deco_string(kind, v1);
             const d2  = deco_string(kind, v2 + 1);
             const fsl = `a -> ${d1} ${d2} b;`;
             expect( () => jssm.parse(fsl) ).toThrow(/duplicate/i);
           }
         ),
         { numRuns: RUNS }
       );

    });

  }

});
