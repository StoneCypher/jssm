 

import * as jssm           from '../jssm';
import * as fc             from 'fast-check';
import { gen_splitmix32 }  from '../jssm_util';

// Kitchen-sink dragon: splitmix-seeded random-graph generation driving
// construction + long force-walks.  Two generator modes:
//
//   loopable  (shouldHalt = false) — every chain closes back to an existing
//             node, so no node is a sink; a bounded walk can never reach a
//             terminal, and must exhaust its step budget.
//   semi-star (shouldHalt = true)  — each chain leaves its last node hanging as
//             a sink; the graph is a DAG, so a walk longer than the node count
//             must find a terminal.
//
// Property under test: a bounded force-walk halts (reaches a sink) iff the graph
// is a semi-star.  The assertion lives INSIDE `fc.property`, so fast-check is
// genuinely engaged: on a find it shrinks the counterexample and prints BOTH the
// splitmix `gen_seed` (as the reported counterexample) and fast-check's own
// replay seed — the reproducibility the dragon tier requires.  (The earlier form
// registered a deferred `test()` per iteration and returned `undefined` from the
// property, so fast-check never saw the assertion and no seed was reported.)

const MAX_WALK_LENGTH = 1500,
      NODES_ADDED     = 100;

/**
 * Result of one generated case: the FSL source that was built and whether a
 * bounded force-walk over it reached a sink.
 */
interface DragonCase {
  machine_string : string;
  halted         : boolean;
}

/**
 * Build a random machine from `gen_seed`, then force-walk it, sharing one
 * splitmix stream for both phases (so a `gen_seed` reproduces the whole case
 * byte-for-byte).  Throws with seed context if the generated source fails to
 * parse — itself a reportable dragon find.
 */
function run_case(shouldHalt: boolean, gen_seed: number): DragonCase {

  const rand  = gen_splitmix32(gen_seed),
        r_int = (n: number): number => Math.trunc(rand() * n);

  function choose<T>(arr: T[]): T {
    if (!Array.isArray(arr)) { throw new TypeError(`choose only takes arrays, not '${typeof arr}'s`); }
    if (arr.length === 0)    { throw new RangeError(`choose cannot choose from an empty array`); }
    return arr[ r_int(arr.length) ];
  }

  function ws(): string {
    let random_whitespace = '';
    while (r_int(3) < 1) { random_whitespace += choose([' ', ' ', ' ', '\t', '\r', '\n', '\r\n']); }
    return random_whitespace;
  }

  const r_edgetype_1way = (): string => choose(['-', '-', '-', '-', '-', '=', '=', '~']);
  const r_edgetype_2way = (): string => choose(['-', '-', '-', '-', '-', '=', '=', '~', '-', '-', '-', '-', '-', '=', '=', '~', '-=', '=-', '-~', '~-', '=~', '~-']);

  const has_nodes: string[] = [];

  let node_cursor = 0;
  const n = (): string => `n${node_cursor++}`;

  const root1 = n(),
        root2 = n();

  has_nodes.push(root1, root2);

  // One-way root edge for the halting (semi-star) case keeps the graph a DAG;
  // two-way for the non-halting (loopable) case gives both roots an out-edge
  // from the start.
  const edges: string[] = [
    shouldHalt
      ? `${root1}${ws()}${r_edgetype_1way()}>${ws()}${root2};`
      : `${root1}${ws()}<${r_edgetype_2way()}>${ws()}${root2};`,
  ];

  let nodes_left = NODES_ADDED;
  while (nodes_left) {

    const chain_len = r_int(nodes_left - 1) + 1;
    nodes_left -= chain_len;

    let prev = choose(has_nodes);
    const fresh: string[] = [];
    for (let c = 0; c < chain_len; c++) {
      const node = n();
      fresh.push(node);
      edges.push(`${prev}${ws()}${r_edgetype_1way()}>${ws()}${node};`);
      prev = node;
    }

    // loopable: close back to an existing node so no new node is a sink —
    // every node keeps an exit and the walk cannot halt.
    // semi-star: leave the last new node hanging as a terminal sink.
    if (!shouldHalt) {
      edges.push(`${prev}${ws()}${r_edgetype_1way()}>${ws()}${choose(has_nodes)};`);
    }

    has_nodes.push(...fresh);

  }

  const machine_string = edges.join('');

  let machine;
  try {
    machine = jssm.from(machine_string);
  } catch {
    throw new Error(`dragon find: parse failed (gen_seed=${gen_seed}, shouldHalt=${shouldHalt}): \`${machine_string}\``);
  }

  let walk_length = MAX_WALK_LENGTH,
      halted      = true;

  let exits = machine.list_exits();
  while (exits.length > 0) {
    if (walk_length <= 0) { halted = false; break; }   // never reached a sink
    machine.force_transition(choose(exits));
    --walk_length;
    exits = machine.list_exits();
  }

  return { machine_string, halted };

}

describe('kitchen-sink dragon', () => {

  it('random graphs halt iff they are semi-stars (fast-check, 100 runs)', () => {
    expect(() => fc.assert(
      fc.property(
        fc.boolean(),
        fc.nat(),
        (shouldHalt: boolean, gen_seed: number): boolean => {
          const { machine_string, halted } = run_case(shouldHalt, gen_seed);
          if (halted !== shouldHalt) {
            throw new Error(
              `dragon find: halt mismatch — gen_seed=${gen_seed} shouldHalt=${shouldHalt} halted=${halted}\nmachine: ${machine_string}`
            );
          }
          return true;
        }
      ),
      { numRuns: 100 }
    )).not.toThrow();
  });

});
