
import * as fc from 'fast-check';

import * as jssm from '../jssm';





// Stochastic coverage for the transition pipeline of `src/ts/jssm.ts`
// (roughly lines 4680-5390): per-kind pre-hook rejection and data-mutation
// arms inside `transition_impl`, forced dispatch to unknown targets,
// history-with-hooks, post-named probe misses, the terminal/complete
// observation events, and the FSL boundary-hook action runtime
// (`on enter/exit <subject> do 'X';`) including its cascade depth bound.
// Part of the fsl#651 / fsl#556 literal-100% stoch-coverage drive.
//
// Every expectation derives from the machine and hooks the test builds:
// rejection is observed through the returned boolean, the unmoved state,
// and the 'rejection' event's hook_name; data mutation through `data()`.



const RUNS = 30;



/** Arbitrary for a short lowercase alphabetic name fragment. */
const lc_fragment = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 5 }
);

/** Arbitrary for `n` distinct FSL-safe state names (index-suffixed). */
const distinct_names = (n: number): fc.Arbitrary<string[]> =>
  fc.array(lc_fragment, { minLength: n, maxLength: n })
    .map( bases => bases.map( (b, i) => `${b}${i}` ) );





type AnyMachine = ReturnType<typeof jssm.from<string>>;

/**
 *  One pre-hook pipeline row: how to build the machine, install the hook
 *  with a chosen return value, and dispatch the transition it guards.
 *  `hook_name` is the name the 'rejection' event reports for the row.
 */
type PipelineRow = {
  hook_name : string;
  make      : (a: string, b: string, act: string, data: string) => AnyMachine;
  install   : (m: AnyMachine, a: string, b: string, act: string, ret: () => unknown) => void;
  dispatch  : (m: AnyMachine, b: string, act: string) => boolean;
};

const action_fsl = (a: string, b: string, act: string, data: string) =>
  jssm.from<string>(`${a} '${act}' -> ${b};`, { data });

const plain_dispatch  = (m: AnyMachine, b: string, _act: string) => m.transition(b);
const action_dispatch = (m: AnyMachine, _b: string, act: string) => m.action(act);

// Every per-kind pre-hook gate in transition_impl, in pipeline order.
const pipeline_rows: ReadonlyArray<PipelineRow> = [

  { hook_name: 'pre everything',
    make: action_fsl,
    install: (m, _a, _b, _act, ret) => { m.hook_pre_everything(ret as never); },
    dispatch: plain_dispatch },

  { hook_name: 'any action',
    make: action_fsl,
    install: (m, _a, _b, _act, ret) => { m.hook_any_action(ret as never); },
    dispatch: action_dispatch },

  { hook_name: 'global action',
    make: action_fsl,
    install: (m, _a, _b, act, ret) => { m.hook_global_action(act, ret as never); },
    dispatch: action_dispatch },

  { hook_name: 'any transition',
    make: action_fsl,
    install: (m, _a, _b, _act, ret) => { m.hook_any_transition(ret as never); },
    dispatch: plain_dispatch },

  { hook_name: 'exit',
    make: action_fsl,
    install: (m, a, _b, _act, ret) => { m.hook_exit(a, ret as never); },
    dispatch: plain_dispatch },

  { hook_name: 'named',
    make: action_fsl,
    install: (m, a, b, act, ret) => { m.hook_action(a, b, act, ret as never); },
    dispatch: action_dispatch },

  { hook_name: 'hook',
    make: action_fsl,
    install: (m, a, b, _act, ret) => { m.hook(a, b, ret as never); },
    dispatch: plain_dispatch },

  { hook_name: 'standard transition',
    make: (a, b, _act, data) => jssm.from<string>(`${a} -> ${b};`, { data }),
    install: (m, _a, _b, _act, ret) => { m.hook_standard_transition(ret as never); },
    dispatch: plain_dispatch },

  { hook_name: 'main transition',
    make: (a, b, _act, data) => jssm.from<string>(`${a} => ${b};`, { data }),
    install: (m, _a, _b, _act, ret) => { m.hook_main_transition(ret as never); },
    dispatch: plain_dispatch },

  { hook_name: 'forced transition',
    make: (a, b, _act, data) => jssm.from<string>(`${a} ~> ${b};`, { data }),
    install: (m, _a, _b, _act, ret) => { m.hook_forced_transition(ret as never); },
    dispatch: (m, b, _act) => m.force_transition(b) },

  { hook_name: 'entry',
    make: action_fsl,
    install: (m, _a, b, _act, ret) => { m.hook_entry(b, ret as never); },
    dispatch: plain_dispatch },

  { hook_name: 'everything',
    make: action_fsl,
    install: (m, _a, _b, _act, ret) => { m.hook_everything(ret as never); },
    dispatch: plain_dispatch },

];





describe('per-kind pre-hook rejection', () => {

  test('a false return blocks the transition, leaves state and data, and names itself in the rejection event', () => {

    fc.assert(
      fc.property(
        distinct_names(2), lc_fragment, lc_fragment,
        ([a, b], act, data) => {

          for (const row of pipeline_rows) {

            const machine = row.make(a, b, act, data);

            const rejections: Array<string> = [];
            machine.on('rejection', detail => {
              rejections.push((detail as { hook_name?: string }).hook_name ?? '(none)');
            });

            row.install(machine, a, b, act, () => false);

            expect(row.dispatch(machine, b, act)).toBe(false);
            expect(machine.state()).toBe(a);
            expect(machine.data()).toBe(data);
            expect(rejections).toEqual([row.hook_name]);

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('per-kind pre-hook data mutation', () => {

  test('a { pass: true, data } return lets the transition proceed and installs the hook data', () => {

    fc.assert(
      fc.property(
        distinct_names(2), lc_fragment, lc_fragment, lc_fragment,
        ([a, b], act, data, replacement_base) => {

          const replacement = `${replacement_base}_changed`;   // never equal to `data`

          for (const row of pipeline_rows) {

            const machine = row.make(a, b, act, data);
            row.install(machine, a, b, act, () => ({ pass: true, data: replacement }));

            expect(row.dispatch(machine, b, act)).toBe(true);
            expect(machine.state()).toBe(b);
            expect(machine.data()).toBe(replacement);

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('explicit data provision through a hooked transition', () => {

  test('with a passing hook, supplied data commits and omitted data preserves', () => {

    fc.assert(
      fc.property(
        distinct_names(3), fc.string(), fc.string(),
        ([a, b, c], initial, payload) => {

          const machine = jssm.from<string>(`${a} -> ${b} -> ${c};`, { data: initial });
          machine.hook_any_transition( () => true );

          expect(machine.transition(b, payload)).toBe(true);   // explicit provision commits
          expect(machine.data()).toBe(payload);

          expect(machine.transition(c)).toBe(true);            // omission preserves
          expect(machine.data()).toBe(payload);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('history recording on the hooked commit path', () => {

  test('a hooked machine with history shoves the pre-transition state per transition', () => {

    fc.assert(
      fc.property(
        distinct_names(4), fc.integer({ min: 2, max: 5 }),
        (names, depth) => {

          const fsl     = names.map( (n, i) => i < names.length - 1 ? `${n} -> ${names[i + 1]};` : '' ).join(' ');
          const machine = jssm.from(fsl, { history: depth });

          machine.hook_any_transition( () => true );    // forces the has-hooks commit branch

          for (const target of names.slice(1)) { machine.go(target); }

          // the last `depth`-or-fewer pre-transition states, oldest first
          const expected = names.slice(0, -1).slice(-depth).map( n => [n, undefined] );
          expect(machine.history).toStrictEqual(expected);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('forced dispatch to unknown targets', () => {

  test('force_transition to a never-interned name is refused without moving', () => {

    fc.assert(
      fc.property(
        distinct_names(2), fc.string(),
        ([a, b], payload) => {

          const machine = jssm.from(`${a} ~> ${b};`);

          expect(machine.force_transition(`${a}_`)).toBe(false);
          expect(machine.force_transition(`${a}_`, payload)).toBe(false);
          expect(machine.state()).toBe(a);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('post-named probe arms', () => {

  test('a post action hook fires only for its own pair and action', () => {

    fc.assert(
      fc.property(
        distinct_names(2), distinct_names(2).map( ([x, y]) => [`${x}q`, `${y}z`] ),
        ([a, b], [act, other_act]) => {

          // two parallel action edges a->b, plus a return edge on a different pair
          const machine = jssm.from(
            `${a} '${act}' -> ${b}; ${a} '${other_act}' -> ${b}; ${b} '${other_act}' -> ${a};`
          );

          let fires = 0;
          machine.post_hook_action(a, b, act, () => { ++fires; });

          // same pair, different action: pair map hit, action probe miss
          expect(machine.action(other_act)).toBe(true);
          expect(fires).toBe(0);

          // different pair entirely: pair map miss
          expect(machine.action(other_act)).toBe(true);
          expect(fires).toBe(0);

          // the keyed pair and action: fires
          expect(machine.action(act)).toBe(true);
          expect(fires).toBe(1);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('terminal and complete observation events', () => {

  test('reaching a terminal state fires terminal; a complete state fires complete', () => {

    fc.assert(
      fc.property(
        distinct_names(2), fc.string(),
        ([a, b], payload) => {

          const machine = jssm.from<string>(`${a} -> ${b};`, { complete: [b], data: payload });

          const terminals: Array<string> = [];
          const completes: Array<string> = [];

          machine.on('terminal', detail => { terminals.push(detail.state as string); });
          machine.on('complete', detail => { completes.push(detail.state as string); });

          expect(machine.transition(b)).toBe(true);

          expect(terminals).toEqual([b]);   // b has no exits
          expect(completes).toEqual([b]);   // b was declared complete

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('with only unrelated listeners, terminal/complete details are skipped without incident', () => {

    fc.assert(
      fc.property(
        distinct_names(2),
        ([a, b]) => {

          const machine = jssm.from(`${a} -> ${b};`, { complete: [b] });

          let transitions = 0;
          machine.on('transition', () => { ++transitions; });

          expect(machine.transition(b)).toBe(true);
          expect(transitions).toBe(1);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('override data-provision arms', () => {

  test('provided data commits and reports; identical or omitted data reports no data-change', () => {

    fc.assert(
      fc.property(
        distinct_names(2), fc.string(), fc.string(),
        ([a, b], initial, replacement_base) => {

          const replacement = `${replacement_base}_changed`;   // never equal to `initial`

          const machine = jssm.from<string>(`allows_override: true; ${a} -> ${b};`, { data: initial });

          const overrides:    Array<string> = [];
          const data_changes: Array<string> = [];

          machine.on('override',    detail => { overrides.push(detail.to as string); });
          machine.on('data-change', detail => { data_changes.push(detail.new_data as string); });

          // provided, different: commits and fires data-change
          machine.override(b, replacement);
          expect(machine.state()).toBe(b);
          expect(machine.data()).toBe(replacement);

          // provided, identical: commits silently (no data-change)
          machine.override(a, replacement);
          expect(machine.data()).toBe(replacement);

          // omitted: preserves, and cannot fire data-change
          machine.override(b);
          expect(machine.data()).toBe(replacement);

          expect(overrides).toEqual([b, a, b]);          // every override reports
          expect(data_changes).toEqual([replacement]);   // only the real change reports

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('FSL boundary-hook actions (`on enter/exit … do …;`)', () => {

  test('leaving a group dispatches its onExit action; movement inside the group does not', () => {

    fc.assert(
      fc.property(
        distinct_names(3), lc_fragment, lc_fragment,
        ([a, b, c], group, act) => {

          const machine = jssm.from(
            `&${group} : [${a} ${b}];  ${a} -> ${b} -> ${c};  ${c} '${act}' -> ${a};  on exit &${group} do '${act}';`
          );

          machine.go(b);                       // a -> b stays inside the group
          expect(machine.state()).toBe(b);     // no boundary crossed, nothing dispatched

          machine.go(c);                       // b -> c leaves the group
          expect(machine.state()).toBe(a);     // onExit dispatched act, which returned us to a

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('entering a group dispatches its onEnter action', () => {

    fc.assert(
      fc.property(
        distinct_names(3), lc_fragment, lc_fragment,
        ([a, b, c], group, act) => {

          const machine = jssm.from(
            `&${group} : [${b}];  ${a} -> ${b};  ${b} '${act}' -> ${c};  on enter &${group} do '${act}';`
          );

          machine.go(b);                       // a -> b enters the group
          expect(machine.state()).toBe(c);     // onEnter dispatched act from b

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('plain-state onExit and onEnter both dispatch on the crossing transition', () => {

    fc.assert(
      fc.property(
        distinct_names(4), fc.tuple(lc_fragment, lc_fragment).map( ([x, y]) => [`${x}q`, `${y}z`] ),
        ([a, b, c, d], [exit_act, enter_act]) => {

          // leaving a queues exit_act; entering b queues enter_act; exits run first,
          // so exit_act (legal from b) fires and lands on c, then enter_act is
          // inapplicable from c and is a safe no-op.
          const machine = jssm.from(
            `${a} -> ${b};  ${b} '${exit_act}' -> ${c};  ${b} '${enter_act}' -> ${d};`
            + `  on exit ${a} do '${exit_act}';  on enter ${b} do '${enter_act}';`
          );

          machine.go(b);
          expect(machine.state()).toBe(c);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('an inapplicable boundary action is a safe no-op, and unrelated crossings fire nothing', () => {

    fc.assert(
      fc.property(
        distinct_names(4), lc_fragment, lc_fragment,
        ([a, b, c, d], group, act) => {

          // group declares only an onEnter; act is not a real action anywhere,
          // and c -> d crosses no declared boundary at all
          const machine = jssm.from(
            `&${group} : [${a}];  ${a} -> ${b};  ${b} -> ${c} -> ${d};  on enter &${group} do '${act}';`
          );

          machine.go(b);                       // leaves the group: it has no onExit
          expect(machine.state()).toBe(b);

          machine.go(c);                       // b -> c: no groups, no state hooks
          machine.go(d);
          expect(machine.state()).toBe(d);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a self-perpetuating boundary cascade is stopped at the configured depth limit', () => {

    fc.assert(
      fc.property(
        distinct_names(2), fc.tuple(lc_fragment, lc_fragment).map( ([x, y]) => [`${x}q`, `${y}z`] ),
        fc.integer({ min: 2, max: 12 }),
        ([a, b], [go_act, back_act], limit) => {

          // entering b dispatches back (b -> a); entering a dispatches go (a -> b);
          // the cascade never settles and must be cut off by the depth bound
          const machine = jssm.from(
            `${a} '${go_act}' -> ${b};  ${b} '${back_act}' -> ${a};`
            + `  on enter ${b} do '${back_act}';  on enter ${a} do '${go_act}';`,
            { boundary_depth_limit: limit }
          );

          expect( () => machine.go(b) ).toThrow(/cascade exceeded depth limit/);

        }
      ),
      { numRuns: RUNS }
    );

  });

});
