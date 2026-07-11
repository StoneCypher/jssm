
import * as fc from 'fast-check';

import * as jssm from '../jssm';





// Property-based coverage for the kind-specific hook family: standard /
// main / forced transition hooks, named action hooks, and the four
// everything-hooks.
//
// Machines are rings whose edges carry randomly drawn kinds (`->`, `=>`,
// `~>`).  The walk respects the kinds (forced edges via force_transition),
// so the expected per-kind call counts are computable directly from the
// drawn kind sequence.



const RUNS = 60;



type EdgeKind = 'legal' | 'main' | 'forced';

const ARROW_FOR: Record<EdgeKind, string> = {
  legal  : '->',
  main   : '=>',
  forced : '~>'
};



/**
 *  Builds a ring whose edge `i -> i+1` uses the drawn kind's arrow.
 *  @param kinds  One edge kind per ring position; length is the ring size.
 *  @returns      State names and FSL source.
 *  @example
 *    kind_ring(['legal', 'forced'])
 *    // { names: ['k0','k1'], fsl: 'k0 -> k1;  k1 ~> k0;' }
 */
function kind_ring(kinds: EdgeKind[]): { names: string[], fsl: string } {

  const names = kinds.map( (_k, i) => `k${i}` );
  const fsl   = kinds
    .map( (kind, i) => `${names[i]} ${ARROW_FOR[kind]} ${names[(i + 1) % kinds.length]};` )
    .join('  ');

  return { names, fsl };

}



/**
 *  Walks a kind ring n steps from its start, using force_transition on
 *  forced edges and plain transition otherwise, asserting every step
 *  lands.  Returns how many traversed edges had each kind.
 *  @param machine  Machine positioned at the ring start.
 *  @param names    Ring state names in order.
 *  @param kinds    Ring edge kinds in order.
 *  @param n        Steps to take.
 *  @returns        Traversal counts per kind.
 */
function walk_kind_ring(
  machine : jssm.Machine<unknown>,
  names   : string[],
  kinds   : EdgeKind[],
  n       : number
): Record<EdgeKind, number> {

  const counts: Record<EdgeKind, number> = { legal: 0, main: 0, forced: 0 };

  for (let s = 0; s < n; ++s) {

    const here = s % names.length,
          next = names[(here + 1) % names.length],
          kind = kinds[here];

    if (kind === 'forced') {
      expect(machine.force_transition(next)).toBe(true);
    } else {
      expect(machine.transition(next)).toBe(true);
    }

    ++counts[kind];

  }

  return counts;

}



const kinds_arb = fc.array(
  fc.constantFrom<EdgeKind>('legal', 'main', 'forced'),
  { minLength: 2, maxLength: 6 }
);

const step_count = fc.integer({ min: 0, max: 36 });





describe('kind-specific transition hooks', () => {

  test('standard / main / forced hooks each fire once per traversal of their kind', () => {

    fc.assert(
      fc.property(
        kinds_arb, step_count,
        (kinds, n) => {

          const { names, fsl } = kind_ring(kinds);
          const machine        = jssm.from(fsl);

          const fired: Record<EdgeKind, number> = { legal: 0, main: 0, forced: 0 };

          machine.hook_standard_transition( () => { ++fired.legal;  return true; } );
          machine.hook_main_transition(     () => { ++fired.main;   return true; } );
          machine.hook_forced_transition(   () => { ++fired.forced; return true; } );

          const walked = walk_kind_ring(machine, names, kinds, n);

          expect(fired).toEqual(walked);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('post_hook kind variants match their pre-hook counterparts', () => {

    fc.assert(
      fc.property(
        kinds_arb, step_count,
        (kinds, n) => {

          const { names, fsl } = kind_ring(kinds);
          const machine        = jssm.from(fsl);

          const fired: Record<EdgeKind, number> = { legal: 0, main: 0, forced: 0 };

          machine.post_hook_standard_transition( () => { ++fired.legal;  } );
          machine.post_hook_main_transition(     () => { ++fired.main;   } );
          machine.post_hook_forced_transition(   () => { ++fired.forced; } );

          const walked = walk_kind_ring(machine, names, kinds, n);

          expect(fired).toEqual(walked);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('force_transition over a legal edge counts as forced, not standard', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (laps) => {

          const machine = jssm.from('f0 -> f1;  f1 -> f0;');

          let standard = 0,
              forced   = 0;

          machine.hook_standard_transition( () => { ++standard; return true; } );
          machine.hook_forced_transition(   () => { ++forced;   return true; } );

          for (let s = 0; s < laps; ++s) {
            expect(machine.force_transition(s % 2 === 0 ? 'f1' : 'f0')).toBe(true);
          }

          expect(standard).toBe(0);
          expect(forced).toBe(laps);

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('named action hooks (hook_action)', () => {

  test('fires only for the action-driven traversal of its exact edge', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        (laps) => {

          // both hops share the action name, but the hook binds one edge
          const machine = jssm.from("n0 'step' -> n1;  n1 'step' -> n0;");

          let calls = 0;
          machine.hook_action('n0', 'n1', 'step', () => { ++calls; return true; });

          for (let s = 0; s < laps; ++s) {
            expect(machine.action('step')).toBe(true);
          }

          // edge n0->n1 is hit on even steps: ceil(laps/2) of them
          expect(calls).toBe(Math.ceil(laps / 2));

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a plain transition over the same edge does not trigger the action-named hook', () => {

    fc.assert(
      fc.property(
        fc.boolean(),
        (_x) => {

          const machine = jssm.from("n0 'step' -> n1;  n1 'step' -> n0;");

          let calls = 0;
          machine.hook_action('n0', 'n1', 'step', () => { ++calls; return true; });

          expect(machine.transition('n1')).toBe(true);
          expect(calls).toBe(0);

          expect(machine.action('step')).toBe(true);   // n1 -> n0, also not the hooked edge
          expect(calls).toBe(0);

          expect(machine.action('step')).toBe(true);   // n0 -> n1 via action: hooked
          expect(calls).toBe(1);

        }
      ),
      { numRuns: 20 }
    );

  });

  test('a rejecting action hook blocks the action without moving the machine', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        (attempts) => {

          const machine = jssm.from("n0 'step' -> n1;  n1 'step' -> n0;");

          machine.hook_action('n0', 'n1', 'step', () => false);

          for (let s = 0; s < attempts; ++s) {
            expect(machine.action('step')).toBe(false);
            expect(machine.state()).toBe('n0');
          }

        }
      ),
      { numRuns: 20 }
    );

  });

});





describe('everything hooks', () => {

  test('all four everything-hooks fire once per successful step, with their own hook_name', () => {

    fc.assert(
      fc.property(
        kinds_arb, step_count,
        (kinds, n) => {

          const { names, fsl } = kind_ring(kinds);
          const machine        = jssm.from(fsl);

          const seen_names = new Set<string>();
          let pre  = 0,
              ever = 0,
              prp  = 0,
              post = 0;

          machine.hook_pre_everything(      (d) => { ++pre;  seen_names.add(d.hook_name); return true; } );
          machine.hook_everything(          (d) => { ++ever; seen_names.add(d.hook_name); return true; } );
          machine.hook_pre_post_everything( (d) => { ++prp;  seen_names.add(d.hook_name); } );
          machine.hook_post_everything(     (d) => { ++post; seen_names.add(d.hook_name); } );

          walk_kind_ring(machine, names, kinds, n);

          expect(pre).toBe(n);
          expect(ever).toBe(n);
          expect(prp).toBe(n);
          expect(post).toBe(n);

          if (n > 0) {
            expect(seen_names).toEqual(new Set([
              'pre everything', 'everything', 'pre post everything', 'post everything'
            ]));
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a rejecting pre-everything hook vetoes every transition', () => {

    fc.assert(
      fc.property(
        kinds_arb,
        (kinds) => {

          const { names, fsl } = kind_ring(kinds);
          const machine        = jssm.from(fsl);

          machine.hook_pre_everything( () => false );

          const next = names[1];

          if (kinds[0] === 'forced') {
            expect(machine.force_transition(next)).toBe(false);
          } else {
            expect(machine.transition(next)).toBe(false);
          }

          expect(machine.state()).toBe(names[0]);

        }
      ),
      { numRuns: 30 }
    );

  });

});
