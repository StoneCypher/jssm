
import * as fc   from 'fast-check';
import * as jssm from '../jssm';

import { chain_plan_arb, ring_plan_arb } from './stoch_helpers';
import type { MachinePlan }              from './stoch_helpers';




// Property-based adjudication of fsl#497, "Available stochastic testing
// criteria" — a 2020 checklist of six candidate stochastic properties.
// Each criterion was checked against today's API surface and machine
// semantics before implementation; the dispositions are:
//
//   1. "Minified lib responses are identical to source responses"
//        NEEDS-CI-LEG.  Not implemented here: tests must never require()
//        dist/ bundles (CI legs clean dist before running).  This property
//        belongs in a post-build CI step instead — see the note at the
//        bottom of this header.
//
//   2. "When action required, action count + 1 >= node count"
//        FALSIFIED as stated, then CORRECTED-AND-IMPLEMENTED.  A single
//        action name may drive an arbitrarily long chain — `a 'go' -> b;
//        b 'go' -> c;` is legal, uses actions, and has 1 action against 3
//        nodes, so 1 + 1 >= 3 fails.  The corrected invariant that does
//        hold: when a machine uses actions at all,
//        1 <= list_actions().length <= list_edges().length.
//
//   3. "Stochastic networks' (.transition_count + 1) >= .node_count"
//        FALSIFIED as stated, then CORRECTED-AND-IMPLEMENTED.  There are
//        no `.transition_count` / `.node_count` members (counts come from
//        `list_edges().length` and `states().length`), and `allow_islands`
//        defaults to `true` (jssm.ts constructor), so `a -> b; c -> d;`
//        constructs legally with 2 edges against 4 nodes — 2 + 1 >= 4
//        fails.  Two corrected invariants hold and are pinned: (a) under
//        `allow_islands: false;` the graph must be one connected component,
//        so edge_count + 1 >= state_count; (b) for machines declared purely
//        by transition rules, every state rides on an edge, so
//        state_count <= 2 * edge_count.
//
//   4. "Stochastic networks .transition_count >= .named_transition_count"
//        IMPLEMENTED (via the real count carriers).  The literal members
//        do not exist; the counts are `list_edges().length` and
//        `list_named_transitions().size`.  Each edge carries at most one
//        name and duplicate names are rejected at construction, so the
//        inequality is a true invariant — with equality exactly when every
//        edge is named.
//
//   5. "Template string assembler matches application of template for
//       every value"
//        IMPLEMENTED.  `sm(template_strings, ...values)` (jssm.ts, the
//        tagged-template entry point) must build the same machine as
//        `from()` applied to the manually assembled string, for any
//        interpolated values.
//
//   6. "Rule order invariance: .equivalent(A, B) still true"
//        ABSENT-API.  No `.equivalent` exists anywhere in src/ts (the only
//        grep hits are prose comments).  Not implemented; building the
//        missing API is out of scope for a test train.
//
// Criterion 1 CI-leg sketch (design only): after `npm run make` produces
// dist/, a dedicated CI step — running *after* the build, never inside the
// unit/stoch suites — would import the same fixture corpus twice, once from
// the TypeScript source tree via the test build and once from the minified
// dist bundle via a child-process probe script, drive both through an
// identical fixed transcript (construct, transition, action, serialize),
// and diff the JSON-serialized responses.  Keeping it a separate post-build
// leg preserves the "tests never require() dist/" rule because the probe is
// not a vitest suite and only runs when dist/ is freshly built.
//
// As throughout the stoch suite, every expectation below derives from the
// constructed plan, never from asking the machine and echoing it back.



const RUNS = 40;



/** Arbitrary for a short lowercase atom fragment, for state/action names. */
const atom_arb = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 5 }
).map( arr => arr.join('') );



/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));



/** Sorted-copy helper so set-style comparisons read cleanly. */
const sorted = (arr: string[]): string[] => [...arr].sort(code_unit_compare);



/** Builds one plain legal transition record for raw Machine configs. */
const edge = (from: string, to: string, extra: object = {}) =>
  ({ kind: 'legal', forced_only: false, main_path: false, from, to, ...extra });



/**
 *  Assigns an action name to every edge of a plan, distinct per origin so
 *  the duplicate-(action, origin) constructor guard is never tripped, while
 *  still reusing names across different origins (the reuse is what breaks
 *  criterion 2 as stated).
 *  @param plan  The machine plan whose edges get actions.
 *  @returns     One `[from, action, to]` triple per plan edge, in order.
 *  @example
 *    actioned_edges({ names: ['a0','b1'], edges: [['a0','b1']], fsl: '...' })
 *    // [['a0', 'pact0', 'b1']]
 */
const actioned_edges = (plan: MachinePlan): [string, string, string][] => {

  const per_origin_seen = new Map<string, number>();

  return plan.edges.map( ([f, t]): [string, string, string] => {
    const nth = per_origin_seen.get(f) ?? 0;
    per_origin_seen.set(f, nth + 1);
    return [f, `pact${nth}`, t];
  });

};



/**
 *  Materializes a string array into the TemplateStringsArray shape a
 *  tagged-template call site would pass, so `sm` can be driven with
 *  stochastically generated part counts.
 *  @param parts  The literal string parts between interpolation slots.
 *  @returns      The parts as a template-strings object with `raw`.
 *  @example
 *    jssm.sm(as_template_strings(['', ' -> ', ';']), 'a', 'b')  // a -> b;
 */
const as_template_strings = (parts: string[]): TemplateStringsArray =>
  Object.assign([...parts], { raw: [...parts] });





describe('fsl#497 criterion 2 — action count vs node count', () => {

  // The criterion as written claims: when actions are used,
  // list_actions().length + 1 >= states().length.  One action name may be
  // reused across every link of a chain, so the claim fails for any
  // single-action chain of three or more states.

  test('FALSIFIED as stated: one action driving a k-state chain has 1 action against k nodes', () => {

    fc.assert(
      fc.property(
        fc.array(atom_arb, { minLength: 3, maxLength: 7 }),
        (bases) => {

          const names = bases.map( (b, i) => `${b}${i}` );

          const fsl = names.slice(0, -1)
            .map( (f, i) => `${f} 'go' -> ${names[i + 1]};` )
            .join('  ');

          const machine = jssm.from(fsl);

          expect(machine.uses_actions).toBe(true);
          expect(machine.list_actions()).toEqual(['go']);
          expect(machine.states().length).toBe(names.length);

          // the stated criterion 2 inequality fails on this legal machine
          expect(machine.list_actions().length + 1)
            .toBeLessThan(machine.states().length);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('corrected invariant: when actions are used, 1 <= distinct action count <= edge count', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        (plan) => {

          const triples = actioned_edges(plan);
          const fsl     = triples.map( ([f, a, t]) => `${f} '${a}' -> ${t};` ).join('  ');
          const machine = jssm.from(fsl);

          const expected_actions = [...new Set(triples.map( ([_f, a, _t]) => a ))];

          expect(machine.uses_actions).toBe(true);
          expect(sorted(machine.list_actions())).toEqual(sorted(expected_actions));

          expect(machine.list_actions().length).toBeGreaterThanOrEqual(1);
          expect(machine.list_actions().length).toBeLessThanOrEqual(machine.list_edges().length);
          expect(machine.list_edges().length).toBe(plan.edges.length);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('fsl#497 criterion 3 — edge count vs state count', () => {

  // The criterion as written claims edge_count + 1 >= state_count for every
  // machine.  allow_islands defaults to true, so disconnected machines are
  // legal — and k disjoint 2-state components have k edges against 2k
  // states, breaking the claim for every k >= 2.

  test('FALSIFIED as stated: k disjoint pairs construct by default with k edges against 2k states', () => {

    fc.assert(
      fc.property(
        fc.array(fc.tuple(atom_arb, atom_arb), { minLength: 2, maxLength: 5 }),
        (pairs) => {

          const fsl = pairs
            .map( ([f, t], i) => `${f}a${i * 2} -> ${t}b${i * 2 + 1};` )
            .join('  ');

          const machine = jssm.from(fsl);   // default allow_islands: true admits islands

          expect(machine.list_edges().length).toBe(pairs.length);
          expect(machine.states().length).toBe(pairs.length * 2);

          // the stated criterion 3 inequality fails on this legal machine
          expect(machine.list_edges().length + 1)
            .toBeLessThan(machine.states().length);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('corrected invariant: under allow_islands: false, edge count + 1 >= state count', () => {

    fc.assert(
      fc.property(
        fc.oneof(chain_plan_arb, ring_plan_arb),
        (plan) => {

          // chain and ring plans are connected, so the strict setting admits them
          const machine = jssm.from(`allow_islands: false;  ${plan.fsl}`);

          expect(machine.list_edges().length).toBe(plan.edges.length);
          expect(machine.states().length).toBe(plan.names.length);

          expect(machine.list_edges().length + 1)
            .toBeGreaterThanOrEqual(machine.states().length);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('corrected invariant: rule-declared machines never exceed 2 states per edge', () => {

    fc.assert(
      fc.property(
        fc.oneof(chain_plan_arb, ring_plan_arb),
        (plan) => {

          const machine = jssm.from(plan.fsl);

          // every state was declared by riding on an edge, so construction
          // may never invent states past the 2-per-edge ceiling
          expect(machine.states().length)
            .toBeLessThanOrEqual(2 * machine.list_edges().length);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('fsl#497 criterion 4 — edge count >= named transition count', () => {

  test('naming any subset of edges yields named count == subset size, bounded by edge count', () => {

    fc.assert(
      fc.property(
        ring_plan_arb,
        fc.nat(20),
        (plan, name_seed) => {

          // name the first `named_count` edges, each distinctly by index
          const named_count = name_seed % (plan.edges.length + 1);

          const transitions = plan.edges.map( ([f, t], i) =>
            (i < named_count) ? edge(f, t, { name: `nm${i}_tr` }) : edge(f, t) );

          const machine = new jssm.Machine({
            start_states : [ plan.names[0] ],
            transitions
          } as any);

          const named = machine.list_named_transitions();

          expect(machine.list_edges().length).toBe(plan.edges.length);
          expect(named.size).toBe(named_count);

          const named_indices = Array.from({ length: named_count }, (_, i) => i );
          for (const i of named_indices) {
            expect(named.has(`nm${i}_tr`)).toBe(true);
          }

          // the criterion 4 inequality proper — equality exactly when all edges are named
          expect(machine.list_edges().length).toBeGreaterThanOrEqual(named.size);
          expect(named.size === machine.list_edges().length).toBe(named_count === plan.edges.length);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('fsl#497 criterion 5 — template assembler matches assembled-string application', () => {

  test('sm(strings, ...values) builds the same machine as from() on the hand-assembled source', () => {

    fc.assert(
      fc.property(
        fc.oneof(chain_plan_arb, ring_plan_arb),
        (plan) => {

          // rebuild the plan's source as a template call: every state name
          // arrives as an interpolated value, every arrow as a literal part
          const parts  : string[] = [''];
          const values : string[] = [];

          for (const [f, t] of plan.edges) {
            values.push(f, t);
            parts.push(' -> ', '; ');
          }

          const via_sm   = jssm.sm(as_template_strings(parts), ...values);
          const via_from = jssm.from(plan.fsl);

          expect(sorted(via_sm.states())).toEqual(sorted(via_from.states()));
          expect(via_sm.state()).toBe(via_from.state());

          const pairs = (m: jssm.Machine<unknown>) =>
            m.list_edges().map( e => `${e.from}→${e.to}` );

          expect(pairs(via_sm)).toEqual(pairs(via_from));

        }
      ),
      { numRuns: RUNS }
    );

  });

});
