
import * as fc from 'fast-check';

import * as jssm from '../jssm';





// Property-based coverage for the hook and observation-event machinery.
//
// All machines here are rings (`r0 -> r1 -> ... -> r0`), walked a random
// number of deterministic steps; every expected call count is computed
// from the ring arithmetic of the constructed walk, never from the
// machine's own bookkeeping.



const RUNS = 60;



/**
 *  Builds a plain ring machine `r0 -> r1 -> ... -> r(k-1) -> r0` and the
 *  walk helper used by every test: `walk(machine, n)` advances n single
 *  steps with `transition()`, asserting each step succeeds.
 *
 *  @param k  Ring size (number of states).
 *  @returns  The state names and the FSL source.
 *
 *  @example
 *    ring(3)  // { names: ['r0','r1','r2'], fsl: 'r0 -> r1;  r1 -> r2;  r2 -> r0;' }
 */
function ring(k: number): { names: string[], fsl: string } {

  const names = [...new Array(k).keys()].map( i => `r${i}` );
  const fsl   = names.map( (n, i) => `${n} -> ${names[(i + 1) % k]};` ).join('  ');

  return { names, fsl };

}



/**
 *  Advances a ring machine n steps with plain transitions, asserting each
 *  step is accepted.
 *
 *  @param machine  A machine currently somewhere on a ring built by {@link ring}.
 *  @param names    The ring's state names in order.
 *  @param n        Number of steps to take.
 */
function walk_ring(machine: jssm.Machine<unknown>, names: string[], n: number): void {

  for (let s = 0; s < n; ++s) {
    const here = names.indexOf(machine.state());
    expect(machine.transition(names[(here + 1) % names.length])).toBe(true);
  }

}



/**
 *  How many of the first n ring steps start from state index i: a walk
 *  from r0 visits edge (i -> i+1) on steps s where s % k === i.
 *
 *  @param n  Total steps walked.
 *  @param k  Ring size.
 *  @param i  Source-state index of the edge in question.
 *  @returns  The number of traversals of edge i -> (i+1)%k.
 *
 *  @example
 *    traversals_of_edge(7, 3, 0)  // 3  (steps 0, 3, 6)
 *    traversals_of_edge(7, 3, 2)  // 2  (steps 2, 5)
 */
function traversals_of_edge(n: number, k: number, i: number): number {
  if (n <= i) { return 0; }
  return Math.floor((n - i - 1) / k) + 1;
}



const ring_size  = fc.integer({ min: 2, max: 6 });
const step_count = fc.integer({ min: 0, max: 40 });





describe('basic from->to hooks', () => {

  test('hook(from, to) fires once per traversal of exactly that edge', () => {

    fc.assert(
      fc.property(
        ring_size, step_count, fc.integer({ min: 0, max: 5 }),
        (k, n, raw_edge) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);
          const i              = raw_edge % k;

          let calls = 0;

          machine.hook(names[i], names[(i + 1) % k], () => { ++calls; return true; });

          walk_ring(machine, names, n);

          expect(calls).toBe(traversals_of_edge(n, k, i));

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a hook returning false rejects the transition and the machine does not move', () => {

    fc.assert(
      fc.property(
        ring_size,
        (k) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);

          machine.hook(names[0], names[1], () => false);

          expect(machine.transition(names[1])).toBe(false);
          expect(machine.state()).toBe(names[0]);

        }
      ),
      { numRuns: 30 }
    );

  });

  test('hooks returning undefined (no explicit value) pass', () => {

    fc.assert(
      fc.property(
        ring_size,
        (k) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);

          machine.hook(names[0], names[1], () => undefined);

          expect(machine.transition(names[1])).toBe(true);
          expect(machine.state()).toBe(names[1]);

        }
      ),
      { numRuns: 30 }
    );

  });

  test('complex hook results: { pass: true } passes, { pass: false } rejects', () => {

    fc.assert(
      fc.property(
        ring_size, fc.boolean(),
        (k, pass) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);

          machine.hook(names[0], names[1], () => ({ pass }));

          expect(machine.transition(names[1])).toBe(pass);
          expect(machine.state()).toBe(pass ? names[1] : names[0]);

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('entry, exit, and any-transition hooks', () => {

  test('hook_entry counts entries; hook_exit counts exits; hook_any_transition counts every step', () => {

    fc.assert(
      fc.property(
        ring_size, step_count, fc.integer({ min: 0, max: 5 }),
        (k, n, raw_state) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);
          const i              = raw_state % k;

          let entries = 0,
              exits   = 0,
              steps   = 0;

          machine.hook_entry(names[(i + 1) % k], () => { ++entries; return true; });
          machine.hook_exit(names[i],            () => { ++exits;   return true; });
          machine.hook_any_transition(           () => { ++steps;   return true; });

          walk_ring(machine, names, n);

          // entering state i+1 happens exactly when edge i -> i+1 is walked
          expect(entries).toBe(traversals_of_edge(n, k, i));
          expect(exits).toBe(traversals_of_edge(n, k, i));
          expect(steps).toBe(n);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('post_hook and post_hook_any_transition fire once per completed traversal', () => {

    fc.assert(
      fc.property(
        ring_size, step_count,
        (k, n) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);

          let edge_calls = 0,
              any_calls  = 0;

          machine.post_hook(names[0], names[1], () => { ++edge_calls; });
          machine.post_hook_any_transition(     () => { ++any_calls;  });

          walk_ring(machine, names, n);

          expect(edge_calls).toBe(traversals_of_edge(n, k, 0));
          expect(any_calls).toBe(n);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('action hooks versus action events', () => {

  // `s0 'tick' -> s1 'tick' -> ... -> s0`, every edge sharing one action
  // name, so machine.action('tick') always works and a bogus action never
  // does.  Hooks fire only on valid transitions; the 'action' observation
  // event fires on every attempt.  The distinction is the property.

  /**
   *  Builds a ring where every edge carries the same action label.
   *
   *  @param k       Ring size.
   *  @param action  The shared action name.
   *  @returns       State names and FSL source.
   *
   *  @example
   *    action_ring_shared(2, 'tick')  // fsl: "s0 'tick' -> s1;  s1 'tick' -> s0;"
   */
  function action_ring_shared(k: number, action: string): { names: string[], fsl: string } {
    const names = [...new Array(k).keys()].map( i => `s${i}` );
    const fsl   = names.map( (n, i) => `${n} '${action}' -> ${names[(i + 1) % k]};` ).join('  ');
    return { names, fsl };
  }

  test('hook_global_action and hook_any_action fire once per successful action call', () => {

    fc.assert(
      fc.property(
        ring_size, step_count,
        (k, n) => {

          const { fsl } = action_ring_shared(k, 'tick');
          const machine = jssm.from(fsl);

          let global_calls = 0,
              any_calls    = 0;

          machine.hook_global_action('tick', () => { ++global_calls; return true; });
          machine.hook_any_action(           () => { ++any_calls;    return true; });

          for (let s = 0; s < n; ++s) {
            expect(machine.action('tick')).toBe(true);
          }

          expect(global_calls).toBe(n);
          expect(any_calls).toBe(n);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test("the 'action' event fires per attempt, valid or not; action hooks only on valid", () => {

    fc.assert(
      fc.property(
        ring_size,
        fc.integer({ min: 0, max: 15 }),
        fc.integer({ min: 0, max: 15 }),
        (k, good_attempts, bad_attempts) => {

          const { fsl } = action_ring_shared(k, 'tick');
          const machine = jssm.from(fsl);

          let hook_calls  = 0,
              event_fires = 0;

          machine.hook_any_action( () => { ++hook_calls; return true; } );
          machine.on('action',     () => { ++event_fires; }            );

          for (let s = 0; s < good_attempts; ++s) {
            expect(machine.action('tick')).toBe(true);
          }

          for (let s = 0; s < bad_attempts; ++s) {
            expect(machine.action('not_an_action')).toBe(false);
          }

          expect(hook_calls).toBe(good_attempts);
          expect(event_fires).toBe(good_attempts + bad_attempts);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('observation events: on, once, off, unsubscribe', () => {

  test("on('transition') sees every hop with the right from/to; unsubscribe stops it", () => {

    fc.assert(
      fc.property(
        ring_size, step_count, step_count,
        (k, n_before, n_after) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);

          const seen: Array<[string, string]> = [];

          const unsubscribe = machine.on('transition', (detail) => {
            seen.push([detail.from as string, detail.to as string]);
          });

          walk_ring(machine, names, n_before);

          unsubscribe();
          walk_ring(machine, names, n_after);

          expect(seen.length).toBe(n_before);

          seen.forEach( ([from, to], s) => {
            expect(from).toBe(names[s % k]);
            expect(to).toBe(names[(s + 1) % k]);
          });

        }
      ),
      { numRuns: RUNS }
    );

  });

  test("once('transition') fires exactly once no matter how many steps follow", () => {

    fc.assert(
      fc.property(
        ring_size, fc.integer({ min: 1, max: 40 }),
        (k, n) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);

          let fires = 0;
          machine.once('transition', () => { ++fires; });

          walk_ring(machine, names, n);

          expect(fires).toBe(1);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('off() detaches a handler registered with on(), and reports whether it found one', () => {

    fc.assert(
      fc.property(
        ring_size, step_count,
        (k, n) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);

          let fires = 0;
          const handler = () => { ++fires; };

          machine.on('transition', handler);

          expect(machine.off('transition', handler)).toBe(true);
          expect(machine.off('transition', handler)).toBe(false);   // already gone

          walk_ring(machine, names, n);
          expect(fires).toBe(0);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test("entry/exit events fire per step, and 'terminal' does not fire on a ring", () => {

    fc.assert(
      fc.property(
        ring_size, step_count,
        (k, n) => {

          const { names, fsl } = ring(k);
          const machine        = jssm.from(fsl);

          let entries   = 0,
              exits     = 0,
              terminals = 0;

          machine.on('entry',    () => { ++entries;   });
          machine.on('exit',     () => { ++exits;     });
          machine.on('terminal', () => { ++terminals; });

          walk_ring(machine, names, n);

          expect(entries).toBe(n);
          expect(exits).toBe(n);
          expect(terminals).toBe(0);   // no ring state is terminal

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('machine data and the data-change event', () => {

  test('data() returns the constructed payload; transition newData replaces it and fires data-change', () => {

    fc.assert(
      fc.property(
        fc.integer(), fc.integer(),
        (initial, replacement) => {

          const machine = jssm.from('aa -> bb;', { data: initial });

          expect(machine.data()).toBe(initial);

          const changes: Array<[number, number]> = [];
          machine.on('data-change', (detail) => {
            changes.push([detail.old_data as number, detail.new_data as number]);
          });

          expect(machine.transition('bb', replacement)).toBe(true);
          expect(machine.data()).toBe(replacement);

          if (initial !== replacement) {
            expect(changes).toEqual([ [initial, replacement] ]);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});
