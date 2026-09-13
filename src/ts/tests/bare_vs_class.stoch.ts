
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

import { from as sm_from, on, history, set_history_length, transition, act } from '../jssm';





// Parity walk between the class surface and the function surface: two
// machines built from the same FSL, one driven through the class and one
// through the bare functions, must agree after every step.
//
// Families are switched to their function form as the extraction tasks land:
//   - Task 2 (this file's creation): events (`on`), history (`history`,
//     `set_history_length`).
//   - Task 3: the `act` arm, and the function-side machine steps through
//     `transition(m, x)` / `act(m, x)` while the class-side machine steps
//     through its methods, so the walk compares the two surfaces.
//   - Task 5 switches the `state` and `data` reads to `state(m)` / `data(m)`.
//   - Task 6 adds the `probabilistic_transition` arm and `set_rng_seed`.

const SOURCE = `a 'go' -> b 'go' -> c 'go' -> a; a 'jump' -> c; c 'reset' -> a; b -> a;`;

const HISTORY = 5;



describe('class and function surfaces agree', () => {

  test('a random program of actions and transitions leaves both machines in the same state, history, data, and event log', () => {
    fc.assert(fc.property(
      fc.array(
        fc.oneof(
          fc.constantFrom('go', 'jump', 'reset', 'nope').map(a => ({ kind: 'act' as const, a })),
          fc.constantFrom('a', 'b', 'c', 'zed').map(s => ({ kind: 'transition' as const, s })),
        ),
        { minLength: 1, maxLength: 40 }
      ),
      (program) => {

        const via_class = sm_from(SOURCE, { history: HISTORY });
        const via_fns   = sm_from(SOURCE, { history: HISTORY });

        const log_class: string[] = [];
        const log_fns:   string[] = [];
        via_class.on('transition', ev => { log_class.push(`${ev.from}>${ev.to}`); });
        on(via_fns, 'transition', ev => { log_fns.push(`${ev.from}>${ev.to}`); });
        via_class.on('action', ev => { log_class.push(`!${ev.action}`); });
        on(via_fns, 'action', ev => { log_fns.push(`!${ev.action}`); });
        via_class.on('rejection', ev => { log_class.push(`x${ev.to}:${ev.reason}`); });
        on(via_fns, 'rejection', ev => { log_fns.push(`x${ev.to}:${ev.reason}`); });

        for (const step of program) {
          let r1: boolean, r2: boolean;
          if (step.kind === 'act') {
            r1 = via_class.action(step.a);
            r2 = act(via_fns, step.a);
          } else {
            r1 = via_class.transition(step.s);
            r2 = transition(via_fns, step.s);
          }
          expect(r2).toBe(r1);
          expect(via_fns.state()).toBe(via_class.state());
          expect(history(via_fns)).toStrictEqual(via_class.history);
        }

        expect(log_fns).toStrictEqual(log_class);
        expect(via_fns.data()).toStrictEqual(via_class.data());

      }
    ), { numRuns: 200 });
  });



  test('resizing the history through the setter and through set_history_length agree', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 8 }),
      fc.array(fc.constantFrom('a', 'b', 'c'), { minLength: 1, maxLength: 20 }),
      (new_length, walk) => {

        const via_class = sm_from(SOURCE, { history: HISTORY });
        const via_fns   = sm_from(SOURCE, { history: HISTORY });

        for (const s of walk) {
          via_class.transition(s);
          transition(via_fns, s);
        }

        via_class.history_length = new_length;
        set_history_length(via_fns, new_length);

        expect(via_fns.history_length).toBe(via_class.history_length);
        expect(history(via_fns)).toStrictEqual(via_class.history);

      }
    ), { numRuns: 200 });
  });

});
