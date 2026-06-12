
import * as fc from 'fast-check';





// Shared machine-construction arbitraries for the stochastic suite.
//
// Both arbitraries produce a *plan* — the state names, the exact directed
// edge set, and the FSL source built from them — so tests can derive their
// expectations from the construction recipe instead of from machine
// introspection.  Names are distinct, lowercase-alphanumeric atoms, which
// keeps them valid FSL atoms and stable through the viz slug pass.



/**
 *  A constructed machine plan: distinct state names, the complete directed
 *  edge list, and the FSL source declaring exactly those edges with `->`.
 *  `names[0]` is always the first state mentioned, hence the start state.
 */
type MachinePlan = {
  names : string[];
  edges : [string, string][];
  fsl   : string;
};



/** Arbitrary for a short lowercase alphabetic name fragment. */
const lc_fragment = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 5 }
);



/**
 *  Assembles a {@link MachinePlan} from name fragments and raw index pairs.
 *  Fragments get an index suffix so names are distinct; raw pairs are
 *  folded modulo the state count, oriented/filtered by `shape_edge`, and
 *  deduplicated against the backbone and each other.
 *
 *  @param bases       Name fragments, one per state.
 *  @param raw_extras  Unconstrained index pairs to shape into extra edges.
 *  @param backbone    Edge indices every plan must contain (chain or ring).
 *  @param shape_edge  Maps a folded pair to a valid extra edge for this
 *                     topology, or null to discard it.
 *  @returns           The completed plan.
 */
function assemble_plan(
  bases      : string[],
  raw_extras : [number, number][],
  backbone   : [number, number][],
  shape_edge : (a: number, b: number) => [number, number] | null
): MachinePlan {

  const names = bases.map( (b, i) => `${b}${i}` ),
        k     = names.length;

  const seen  = new Set<string>( backbone.map( ([a, b]) => `${a}|${b}` ) );
  const extra : [number, number][] = [];

  for (const [ra, rb] of raw_extras) {

    const shaped = shape_edge(ra % k, rb % k);
    if (shaped === null) { continue; }

    const key = `${shaped[0]}|${shaped[1]}`;
    if (seen.has(key)) { continue; }

    seen.add(key);
    extra.push(shaped);

  }

  const edges = backbone.concat(extra)
    .map( ([a, b]): [string, string] => [names[a], names[b]] );

  const fsl = edges.map( ([f, t]) => `${f} -> ${t};` ).join('  ');

  return { names, edges, fsl };

}



/**
 *  Arbitrary for a forward-only chain machine: states `n0 .. n(k-1)`, the
 *  backbone `n0 -> n1 -> ... -> n(k-1)`, plus deduplicated random forward
 *  jumps.  Because every edge goes strictly forward, the machine is a DAG,
 *  `names[0]` is the start state and never a target, and the last state is
 *  always terminal.
 *
 *  @example
 *    fc.assert(fc.property(chain_plan_arb, ({ fsl, names }) => {
 *      expect(jssm.from(fsl).state()).toBe(names[0]);
 *    }));
 */
const chain_plan_arb: fc.Arbitrary<MachinePlan> = fc.tuple(
  fc.array(lc_fragment, { minLength: 2, maxLength: 7 }),
  fc.array(fc.tuple(fc.nat(20), fc.nat(20)), { maxLength: 8 })
).map( ([bases, raw_extras]) => {

  const k        = bases.length,
        backbone = bases.slice(0, -1).map( (_b, i): [number, number] => [i, i + 1] );

  return assemble_plan(bases, raw_extras as [number, number][], backbone, (a, b) => {

    const [lo, hi] = a < b ? [a, b] : [b, a];

    if (lo === hi)     { return null; }   // no self loops in a DAG plan
    if (hi === lo + 1) { return null; }   // already a backbone edge

    return [lo, hi];

  });

});



/**
 *  Arbitrary for a ring machine: states `n0 .. n(k-1)` joined in a cycle
 *  `n0 -> n1 -> ... -> n(k-1) -> n0`, plus deduplicated random chords (any
 *  direction, no self loops).  Every state always has at least one exit and
 *  at least one entrance, and the whole machine is strongly connected — so
 *  probabilistic walks can run forever without stranding.
 *
 *  @example
 *    fc.assert(fc.property(ring_plan_arb, ({ fsl }) => {
 *      expect(() => jssm.from(fsl).probabilistic_walk(50)).not.toThrow();
 *    }));
 */
const ring_plan_arb: fc.Arbitrary<MachinePlan> = fc.tuple(
  fc.array(lc_fragment, { minLength: 2, maxLength: 7 }),
  fc.array(fc.tuple(fc.nat(20), fc.nat(20)), { maxLength: 8 })
).map( ([bases, raw_extras]) => {

  const k        = bases.length,
        backbone = bases.map( (_b, i): [number, number] => [i, (i + 1) % k] );

  return assemble_plan(bases, raw_extras as [number, number][], backbone, (a, b) => {

    if (a === b) { return null; }   // no self loops
    return [a, b];

  });

});



export { chain_plan_arb, ring_plan_arb };
export type { MachinePlan };
