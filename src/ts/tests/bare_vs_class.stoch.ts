
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';

import { from as sm_from, on, history, set_history_length, transition, act, hook, post_hook_any_transition, hook_registry, state, data, set_data } from '../jssm';





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
//   - Task 4: the hooks arm — the same veto hook and post hook installed
//     through `hook(m, …)` / `post_hook_any_transition(m, …)` on one side and
//     `m.hook(…)` / `m.post_hook_any_transition(…)` on the other.
//   - Task 5: the `state` and `data` reads go through `state(m)` / `data(m)`,
//     and a `set_data` arm installs random data on both sides so the data
//     comparison at the end compares something other than undefined.
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
          fc.oneof(fc.integer(), fc.string(), fc.constant(undefined), fc.constant(null), fc.record({ n: fc.integer() }))
            .map(d => ({ kind: 'set_data' as const, d })),
        ),
        { minLength: 1, maxLength: 40 }
      ),
      (program) => {

        const via_class = sm_from<unknown>(SOURCE, { history: HISTORY });
        const via_fns   = sm_from<unknown>(SOURCE, { history: HISTORY });

        const log_class: string[] = [];
        const log_fns:   string[] = [];
        via_class.on('transition', ev => { log_class.push(`${ev.from}>${ev.to}`); });
        on(via_fns, 'transition', ev => { log_fns.push(`${ev.from}>${ev.to}`); });
        via_class.on('action', ev => { log_class.push(`!${ev.action}`); });
        on(via_fns, 'action', ev => { log_fns.push(`!${ev.action}`); });
        via_class.on('rejection', ev => { log_class.push(`x${ev.to}:${ev.reason}`); });
        on(via_fns, 'rejection', ev => { log_fns.push(`x${ev.to}:${ev.reason}`); });
        via_class.on('data-change', ev => { log_class.push(`d${ev.cause}:${JSON.stringify(ev.new_data)}`); });
        on(via_fns, 'data-change', ev => { log_fns.push(`d${ev.cause}:${JSON.stringify(ev.new_data)}`); });

        for (const step of program) {
          let r1: boolean, r2: boolean;
          if (step.kind === 'act') {
            r1 = via_class.action(step.a);
            r2 = act(via_fns, step.a);
          } else if (step.kind === 'transition') {
            r1 = via_class.transition(step.s);
            r2 = transition(via_fns, step.s);
          } else {
            // both sides get their own clone so neither machine aliases the other's data
            r1 = via_class.set_data(structuredClone(step.d)) === via_class;
            r2 = set_data(via_fns, structuredClone(step.d)) === via_fns;
          }
          expect(r2).toBe(r1);
          expect(state(via_fns)).toBe(via_class.state());
          expect(data(via_fns)).toStrictEqual(via_class.data());
          expect(history(via_fns)).toStrictEqual(via_class.history);
        }

        expect(log_fns).toStrictEqual(log_class);
        expect(data(via_fns)).toStrictEqual(via_class.data());

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



  test('a veto hook and a post hook installed through the functions and through the methods leave both machines in agreement', () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom('a', 'b', 'c', 'zed'), { minLength: 1, maxLength: 40 }),
      (walk) => {

        const via_class = sm_from(SOURCE, { history: HISTORY });
        const via_fns   = sm_from(SOURCE, { history: HISTORY });

        const post_class: string[] = [];
        const post_fns:   string[] = [];

        // b -> c is vetoed on both; every committed transition is logged on both
        via_class.hook('b', 'c', () => false).post_hook_any_transition(({ from, to }) => { post_class.push(`${from}>${to}`); });
        post_hook_any_transition(hook(via_fns, 'b', 'c', () => false), ({ from, to }) => { post_fns.push(`${from}>${to}`); });

        for (const s of walk) {
          const r1 = via_class.transition(s);
          const r2 = transition(via_fns, s);
          expect(r2).toBe(r1);
          expect(state(via_fns)).toBe(via_class.state());
        }

        expect(post_fns).toStrictEqual(post_class);
        expect(history(via_fns)).toStrictEqual(via_class.history);
        expect(hook_registry(via_fns)).toStrictEqual(via_class.hook_registry());

      }
    ), { numRuns: 200 });
  });

});
