
import * as fc from 'fast-check';

import * as jssm from '../jssm';

import { chain_plan_arb, ring_plan_arb } from './stoch_helpers';





// Stochastic coverage for the `Machine` accessor / query surface of
// `src/ts/jssm.ts` (roughly lines 2100-3350 plus the rng-seed and
// edges_between accessors near 4580-4636, and the stochastic-run option
// resolution near 2850-2950), toward literal 100% stoch coverage of the
// runtime (fsl#651 / fsl#556).
//
// Every expectation derives from the FSL source or config the test itself
// constructed — never from re-computing the machine's own answer.



const RUNS = 40;



/** Arbitrary for a short lowercase alphabetic name fragment. */
const lc_fragment = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 5 }
);

/** Arbitrary for `n` distinct FSL-safe state names (index-suffixed). */
const distinct_names = (n: number): fc.Arbitrary<string[]> =>
  fc.array(lc_fragment, { minLength: n, maxLength: n })
    .map( bases => bases.map( (b, i) => `${b}${i}` ) );

/** Arbitrary for the three numeric parts of a version, e.g. `[3, 14, 159]`. */
const semver_parts_arb = fc.tuple(fc.nat(20), fc.nat(20), fc.nat(20));

/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (x: string, y: string): number => (x < y ? -1 : (x > y ? 1 : 0));





describe('directive accessors', () => {

  test('default_size() reflects each of the three FSL forms, and is undefined when absent', () => {

    fc.assert(
      fc.property(
        distinct_names(2), fc.integer({ min: 1, max: 4000 }), fc.integer({ min: 1, max: 4000 }),
        ([a, b], w, h) => {

          expect(jssm.from(`default_size: ${w}; ${a} -> ${b};`).default_size())
            .toEqual({ width: w });

          expect(jssm.from(`default_size: ${w} ${h}; ${a} -> ${b};`).default_size())
            .toEqual({ width: w, height: h });

          expect(jssm.from(`default_size: height ${h}; ${a} -> ${b};`).default_size())
            .toEqual({ height: h });

          expect(jssm.from(`${a} -> ${b};`).default_size())
            .toBeUndefined();

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('fsl_version() returns the declared version, parsed', () => {

    fc.assert(
      fc.property(
        distinct_names(2), semver_parts_arb,
        ([a, b], [major, minor, patch]) => {
          const parsed = jssm.from(`fsl_version: ${major}.${minor}.${patch}; ${a} -> ${b};`).fsl_version();
          expect(parsed).toMatchObject({ major, minor, patch });
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('state_for', () => {

  test('returns the descriptor for every constructed state; throws for an unknown name', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const machine = jssm.from(fsl);

          for (const name of names) {
            const descriptor = machine.state_for(name);
            expect(descriptor.name).toBe(name);
          }

          // constructed names always carry a digit suffix; a trailing
          // underscore can never collide
          expect( () => machine.state_for(`${names[0]}_`) ).toThrow(/No such state/);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('transition and action inventory', () => {

  test('list_named_transitions is an empty Map on machines declaring none', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ fsl }) => {
          const named = jssm.from(fsl).list_named_transitions();
          expect(named instanceof Map).toBe(true);
          expect(named.size).toBe(0);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('list_actions / uses_actions reflect declared action labels', () => {

    fc.assert(
      fc.property(
        distinct_names(3), lc_fragment,
        ([a, b, c], act) => {

          const with_actions = jssm.from(`${a} '${act}' -> ${b} '${act}' -> ${c};`);
          expect(with_actions.list_actions()).toEqual([act]);
          expect(with_actions.uses_actions).toBe(true);

          const without = jssm.from(`${a} -> ${b} -> ${c};`);
          expect(without.list_actions()).toEqual([]);
          expect(without.uses_actions).toBe(false);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('uses_forced_transitions is true exactly when a `~>` edge was declared', () => {

    fc.assert(
      fc.property(
        distinct_names(2),
        ([a, b]) => {
          expect(jssm.from(`${a} ~> ${b};`).uses_forced_transitions).toBe(true);
          expect(jssm.from(`${a} -> ${b};`).uses_forced_transitions).toBe(false);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('override permission accessors', () => {

  // code false + config true is rejected at construction (strictness ordering),
  // so it is excluded from the sweep here.
  const tri = [true, false, undefined] as const;

  test('code/config_allows_override echo their sources; allows_override resolves the table', () => {

    fc.assert(
      fc.property(
        distinct_names(2),
        ([a, b]) => {

          const combos = tri.flatMap( code => tri.map( config => [code, config] as const ) )
                            .filter( ([code, config]) => !(code === false && config === true) );

          for (const [code, config] of combos) {

            const fsl  = `${code === undefined ? '' : `allows_override: ${code};`} ${a} -> ${b};`;
            const opts = config === undefined ? {} : { allows_override: config };

            const machine = jssm.from(fsl, opts);

            expect(machine.code_allows_override).toBe(code);
            expect(machine.config_allows_override).toBe(config);

            // documented resolution: code false wins false; code true means
            // config may only tighten; code undefined means config must
            // affirmatively enable
            const expected =
              (code === false) ? false
                               : ((code === true) ? (config !== false) : (config === true));

            expect(machine.allows_override).toBe(expected);

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('allow_islands accessor', () => {

  test('defaults to true; echoes FSL with_start policy', () => {

    fc.assert(
      fc.property(
        distinct_names(4),
        ([a, b, c, d]) => {

          expect(jssm.from(`${a} -> ${b};`).allow_islands).toBe(true);

          const with_start = jssm.from(
            `allow_islands: with_start; start_states: [${a} ${c}]; ${a} -> ${b}; ${c} -> ${d};`
          );
          expect(with_start.allow_islands).toBe('with_start');

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('themes accessor pair', () => {

  test('setter wraps a bare string into an array and passes arrays through', () => {

    const theme_arb = fc.constantFrom('default', 'modern', 'ocean', 'plain', 'bold');

    fc.assert(
      fc.property(
        distinct_names(2), theme_arb, fc.array(theme_arb, { minLength: 1, maxLength: 3 }),
        ([a, b], single, several) => {

          const machine = jssm.from(`${a} -> ${b};`);

          expect(machine.all_themes()).toEqual(
            expect.arrayContaining(['default', 'modern', 'ocean', 'plain', 'bold'])
          );

          machine.themes = single;
          expect(machine.themes).toEqual([single]);

          machine.themes = several;
          expect(machine.themes).toEqual(several);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('entrance/exit listing on unknown states', () => {

  test('list_entrances and list_exits return [] for a name the machine does not know', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {
          const machine = jssm.from(fsl);
          expect(machine.list_entrances(`${names[0]}_`)).toEqual([]);
          expect(machine.list_exits(`${names[0]}_`)).toEqual([]);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('probable_exits_for', () => {

  test('excludes forced-only exits, is empty for all-forced states, and throws on unknowns', () => {

    fc.assert(
      fc.property(
        distinct_names(3),
        ([a, b, c]) => {

          // one forced and one legal exit: only the legal one is probabilistically reachable
          const mixed = jssm.from(`${a} ~> ${b}; ${a} -> ${c};`);
          expect(mixed.probable_exits_for(a).map( e => e.to )).toEqual([c]);

          // only forced exits: no probabilistic exit at all
          const forced_only = jssm.from(`${a} ~> ${b};`);
          expect(forced_only.probable_exits_for(a)).toEqual([]);

          expect( () => mixed.probable_exits_for(`${a}_`) ).toThrow(/No such state/);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('per-state action queries', () => {

  test('actions / list_exit_actions / probable_action_exits: empty for actionless states, throwing for unknowns', () => {

    fc.assert(
      fc.property(
        distinct_names(3), lc_fragment,
        ([a, b, c], act) => {

          const machine = jssm.from(`${a} '${act}' -> ${b}; ${b} -> ${c};`);

          // a has the action
          expect(machine.actions(a)).toEqual([act]);
          expect(machine.list_exit_actions(a)).toEqual([act]);

          const pae = machine.probable_action_exits(a);
          expect(pae.length).toBe(1);
          expect(pae[0].action).toBe(act);

          // b exists but exits without an action; c is terminal — both are
          // empty, not errors
          for (const state of [b, c]) {
            expect(machine.actions(state)).toEqual([]);
            expect(machine.list_exit_actions(state)).toEqual([]);
            expect(machine.probable_action_exits(state)).toEqual([]);
          }

          // unknown states throw from all three
          expect( () => machine.actions(`${a}_`)               ).toThrow(/No such state/);
          expect( () => machine.list_exit_actions(`${a}_`)     ).toThrow(/No such state/);
          expect( () => machine.probable_action_exits(`${a}_`) ).toThrow(/No such state/);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('list_states_having_action names exactly the sources; unknown actions throw', () => {

    fc.assert(
      fc.property(
        distinct_names(3), lc_fragment,
        ([a, b, c], act) => {

          const machine = jssm.from(`${a} '${act}' -> ${b} '${act}' -> ${c};`);

          expect([...machine.list_states_having_action(act)].sort(code_unit_compare))
            .toEqual([a, b].sort(code_unit_compare));
          expect( () => machine.list_states_having_action(`${act}_`) ).toThrow(/No such state/);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('group membership queries', () => {

  test('isIn tracks the current state; statesIn flattens membership and throws on unknown groups', () => {

    fc.assert(
      fc.property(
        distinct_names(3), lc_fragment,
        ([a, b, c], group) => {

          const machine = jssm.from(`&${group} : [${a} ${b}]; ${a} -> ${b} -> ${c};`);

          expect(machine.isIn(group)).toBe(true);        // at a, a member
          expect(machine.isIn(`${group}_`)).toBe(false); // undeclared group: no members

          machine.go(b);
          expect(machine.isIn(group)).toBe(true);

          machine.go(c);
          expect(machine.isIn(group)).toBe(false);       // c is outside the group

          expect(machine.statesIn(group)).toEqual([a, b]);
          expect( () => machine.statesIn(`${group}_`) ).toThrow(/No such group/);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('rng seed accessor pair', () => {

  test('set-then-get roundtrips; equal seeds reproduce walks; undefined reseeds from time', () => {

    fc.assert(
      fc.property(
        ring_plan_arb, fc.integer({ min: 0, max: 2 ** 31 }), fc.integer({ min: 1, max: 30 }),
        ({ fsl }, seed, steps) => {

          const m1 = jssm.from(fsl);
          const m2 = jssm.from(fsl);

          m1.rng_seed = seed;
          m2.rng_seed = seed;

          expect(m1.rng_seed).toBe(seed);
          expect(m2.rng_seed).toBe(seed);

          // ring machines never strand, so equal-length walks always complete;
          // an identical seed must reproduce the walk exactly
          expect(m1.probabilistic_walk(steps)).toEqual(m2.probabilistic_walk(steps));

          m1.rng_seed = undefined;
          expect(typeof m1.rng_seed).toBe('number');
          expect(Number.isFinite(m1.rng_seed)).toBe(true);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('edges_between on unknown targets', () => {

  test('returns [] when the target name was never interned by any edge', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {
          const machine = jssm.from(fsl);
          expect(machine.edges_between(names[0], `${names[0]}_`)).toEqual([]);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('stochastic run-count and step-cap resolution', () => {

  test('steady_state mode yields exactly one walk of exactly max_steps on a ring', () => {

    fc.assert(
      fc.property(
        ring_plan_arb, fc.integer({ min: 1, max: 40 }), fc.integer({ min: 0, max: 2 ** 31 }),
        ({ fsl }, max_steps, seed) => {

          const machine = jssm.from(fsl);
          const runs    = [...machine.stochastic_runs({ mode: 'steady_state', max_steps, seed })];

          expect(runs.length).toBe(1);
          expect(runs[0].length).toBe(max_steps);      // rings never terminate early
          expect(runs[0].terminated).toBe(false);

          // steady_state summaries omit the montecarlo-only fields
          const summary = machine.stochastic_summary({ mode: 'steady_state', max_steps, seed });
          expect(summary.mode).toBe('steady_state');
          expect(summary.path_lengths).toBeUndefined();
          expect(summary.terminal_reached).toBeUndefined();
          expect(summary.capped).toBeUndefined();

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('explicit runs wins over the editor declaration, which wins over the default', () => {

    fc.assert(
      fc.property(
        distinct_names(2),
        fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 2 ** 31 }),
        ([a, b], explicit_runs, editor_runs, seed) => {

          const declared = jssm.from(
            `editor: { stochastic_run_count: ${editor_runs}; }; ${a} -> ${b};`
          );

          // editor declaration is the fallback when opts.runs is omitted
          expect(declared.stochastic_summary({ seed }).runs).toBe(editor_runs);

          // an explicit runs option overrides the declaration
          expect(declared.stochastic_summary({ seed, runs: explicit_runs }).runs).toBe(explicit_runs);

          // montecarlo bookkeeping: every run either terminated or was capped
          const s = declared.stochastic_summary({ seed, runs: explicit_runs });
          expect((s.terminal_reached ?? 0) + (s.capped ?? 0)).toBe(explicit_runs);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('omitting seed consumes the current PRNG without reseeding', () => {

    fc.assert(
      fc.property(
        distinct_names(2), fc.integer({ min: 0, max: 2 ** 31 }),
        fc.integer({ min: 1, max: 10 }), fc.integer({ min: 1, max: 10 }),
        ([a, b], seed, run_count, editor_runs) => {

          const machine = jssm.from(
            `editor: { stochastic_run_count: ${editor_runs}; }; ${a} -> ${b};`
          );

          machine.rng_seed = seed;

          // no seed option: the generator must not replace the machine's seed
          const runs = [...machine.stochastic_runs({ runs: run_count, max_steps: 5 })];
          expect(runs.length).toBe(run_count);
          expect(machine.rng_seed).toBe(seed);

          // the seedless summary reports the seed it found in place
          const summary = machine.stochastic_summary({ runs: run_count });
          expect(summary.seed).toBe(seed);
          expect(machine.rng_seed).toBe(seed);

          // fully argument-free calls resolve every option from defaults;
          // run count falls to the editor declaration
          expect([...machine.stochastic_runs()].length).toBe(editor_runs);
          expect(machine.stochastic_summary().runs).toBe(editor_runs);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('with neither runs nor an editor declaration, run count falls back to STOCHASTIC_DEFAULT_RUNS', () => {

    const machine = jssm.from('a -> b;');
    const summary = machine.stochastic_summary({ seed: 1 });

    expect(summary.runs).toBe(jssm.STOCHASTIC_DEFAULT_RUNS);

    // a 2-state chain terminates in one step, every time
    expect(summary.terminal_reached).toBe(jssm.STOCHASTIC_DEFAULT_RUNS);
    expect(summary.capped).toBe(0);

  });

});
