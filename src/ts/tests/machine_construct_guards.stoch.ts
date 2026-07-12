
import * as fc   from 'fast-check';
import * as jssm from '../jssm';




// Property-based coverage for `Machine` construction guards and defaults
// (`src/ts/jssm.ts` constructor, roughly lines 890-1400, plus the default
// timer sources at 522-524), part of the fsl#651 literal-100% stochastic
// coverage drive.
//
// Behaviors pinned here:
//
//   - code/config `allows_override` strictness ordering;
//   - malformed transitions (missing endpoints, duplicate edges);
//   - named-transition registry population and duplicate rejection;
//   - duplicate (action, origin) rejection;
//   - duplicate state declarations and double state-labels;
//   - start-state admission (nonexistent chosen/listed, repeats,
//     unlisted `initial_state`);
//   - `allow_islands: 'with_start'` connectivity admission both ways;
//   - arrange-declaration state existence, all three declaration lists;
//   - `_new_state` duplicate rejection;
//   - the default (real setTimeout/clearTimeout) timer sources when no
//     fake timer is injected.
//
// Raw `new jssm.Machine({...})` configs are used where the compiler cannot
// express the malformed input; everything asserted is observable machine
// behavior (constructor outcome or public accessors), never a re-derivation
// of internals.



const RUNS = 40;



/** Arbitrary for a short lowercase atom fragment. */
const atom_arb = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 6 }
).map(arr => arr.join(''));

/** Arbitrary for a pair of distinct state names (suffix-disambiguated). */
const two_names_arb = fc.tuple(atom_arb, atom_arb)
  .map( ([a, b]) => [`${a}0`, `${b}1`] as [string, string] );

/** Arbitrary for three distinct state names. */
const three_names_arb = fc.tuple(atom_arb, atom_arb, atom_arb)
  .map( ([a, b, c]) => [`${a}0`, `${b}1`, `${c}2`] as [string, string, string] );

/** Builds one plain legal transition record for raw Machine configs. */
const edge = (from: string, to: string, extra: object = {}) =>
  ({ kind: 'legal', forced_only: false, main_path: false, from, to, ...extra });





describe('override strictness ordering', () => {

  test('code allows_override:false + config allows_override:true is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, ([a, b]) => {
        expect(
          () => jssm.from(`allows_override: false;  ${a} -> ${b};`, { allows_override: true })
        ).toThrow(/less strict than code/);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('transition record admission', () => {

  test('a transition without `from` is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, ([a, b]) => {
        expect(
          () => new jssm.Machine({ start_states: [a], transitions: [ edge(a, b), { kind: 'legal', to: a } ] } as any)
        ).toThrow(/must define 'from'/);
      }),
      { numRuns: RUNS }
    );

  });

  test('a transition without `to` is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, ([a, b]) => {
        expect(
          () => new jssm.Machine({ start_states: [a], transitions: [ edge(a, b), { kind: 'legal', from: b } ] } as any)
        ).toThrow(/must define 'to'/);
      }),
      { numRuns: RUNS }
    );

  });

  test('repeating the same plain (from, to) edge is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, ([a, b]) => {
        expect(
          () => new jssm.Machine({ start_states: [a], transitions: [ edge(a, b), edge(a, b) ] } as any)
        ).toThrow(/already has/);
      }),
      { numRuns: RUNS }
    );

  });

  test('repeating the same actioned (from, to) edge is rejected, naming the action', () => {

    fc.assert(
      fc.property(two_names_arb, atom_arb, ([a, b], action) => {
        expect(
          () => new jssm.Machine({
            start_states : [a],
            transitions  : [ edge(a, b, { action }), edge(a, b, { action }) ]
          } as any)
        ).toThrow(/already has .* on action/);
      }),
      { numRuns: RUNS }
    );

  });

  test('repeating the same action on the same origin is rejected', () => {

    fc.assert(
      fc.property(three_names_arb, atom_arb, ([a, b, c], action) => {
        expect(
          () => new jssm.Machine({
            start_states : [a],
            transitions  : [ edge(a, b, { action }), edge(a, c, { action }) ]
          } as any)
        ).toThrow(/already attached to origin/);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('named transitions', () => {

  test('every distinct declared name registers; the registry is exactly the declared set', () => {

    fc.assert(
      fc.property(three_names_arb, atom_arb, atom_arb, ([a, b, c], n1_base, n2_base) => {

        const n1 = `${n1_base}_one`, n2 = `${n2_base}_two`;

        const machine = new jssm.Machine({
          start_states : [a],
          transitions  : [ edge(a, b, { name: n1 }), edge(b, c, { name: n2 }), edge(c, a) ]
        } as any);

        const named = machine.list_named_transitions();
        expect(named.size).toBe(2);
        expect(named.has(n1)).toBe(true);
        expect(named.has(n2)).toBe(true);

      }),
      { numRuns: RUNS }
    );

  });

  test('repeating a transition name is rejected', () => {

    fc.assert(
      fc.property(three_names_arb, atom_arb, ([a, b, c], name) => {
        expect(
          () => new jssm.Machine({
            start_states : [a],
            transitions  : [ edge(a, b, { name }), edge(b, c, { name }) ]
          } as any)
        ).toThrow(/already created/);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('state declaration admission', () => {

  test('declaring the same state twice is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, ([a, b]) => {
        expect(
          () => new jssm.Machine({
            start_states      : [a],
            transitions       : [ edge(a, b) ],
            state_declaration : [
              { state: a, declarations: [] },
              { state: a, declarations: [] }
            ]
          } as any)
        ).toThrow(/twice/);
      }),
      { numRuns: RUNS }
    );

  });

  test('a state with two state-labels is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, atom_arb, atom_arb, ([a, b], l1, l2) => {
        expect(
          () => new jssm.Machine({
            start_states      : [a],
            transitions       : [ edge(a, b) ],
            state_declaration : [
              { state: a, declarations: [
                { key: 'state-label', value: l1 },
                { key: 'state-label', value: l2 }
              ] }
            ]
          } as any)
        ).toThrow(/may only have one state-label/);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('start state admission', () => {

  test('a requested initial_state that does not exist is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, atom_arb, ([a, b], z_base) => {
        const z = `${z_base}zz9`;
        expect(
          () => jssm.from(`${a} -> ${b};`, { initial_state: z })
        ).toThrow(/does not exist/);
      }),
      { numRuns: RUNS }
    );

  });

  test('a chosen start state that does not exist is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, atom_arb, ([a, b], z_base) => {
        const z = `${z_base}zz9`;
        expect(
          () => new jssm.Machine({ start_states: [z], transitions: [ edge(a, b) ] } as any)
        ).toThrow(/does not exist/);
      }),
      { numRuns: RUNS }
    );

  });

  test('a listed non-first start state that does not exist is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, atom_arb, ([a, b], z_base) => {
        const z = `${z_base}zz9`;
        expect(
          () => new jssm.Machine({ start_states: [a, z], transitions: [ edge(a, b) ] } as any)
        ).toThrow(/does not exist/);
      }),
      { numRuns: RUNS }
    );

  });

  test('repeated start states are rejected', () => {

    fc.assert(
      fc.property(two_names_arb, ([a, b]) => {
        expect(
          () => new jssm.Machine({ start_states: [a, a], transitions: [ edge(a, b) ] } as any)
        ).toThrow(/cannot be repeated/i);
      }),
      { numRuns: RUNS }
    );

  });

});





describe("allow_islands: 'with_start' connectivity admission", () => {

  test('two components, one with no start state, is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, two_names_arb, ([a, b], [c_base, d_base]) => {
        const c = `${c_base}x`, d = `${d_base}y`;
        expect(
          () => jssm.from(`${a} -> ${b};  ${c} -> ${d};`, { allow_islands: 'with_start' })
        ).toThrow(/no start state/);
      }),
      { numRuns: RUNS }
    );

  });

  test('two components, each holding a start state, is admitted', () => {

    fc.assert(
      fc.property(two_names_arb, two_names_arb, ([a, b], [c_base, d_base]) => {

        const c = `${c_base}x`, d = `${d_base}y`;

        const machine = new jssm.Machine({
          start_states  : [a, c],
          transitions   : [ edge(a, b), edge(c, d) ],
          allow_islands : 'with_start'
        } as any);

        expect(machine.states().length).toBe(4);
        expect(machine.state()).toBe(a);

      }),
      { numRuns: RUNS }
    );

  });

});





describe('arrange declarations', () => {

  test('arranging only existing states, across all three declaration kinds, is admitted', () => {

    fc.assert(
      fc.property(three_names_arb, ([a, b, c]) => {

        const machine = jssm.from(`${a} -> ${b} -> ${c};`, {
          arrange_declaration  : [ [a, b] ],
          oarrange_declaration : [ [b, c] ],
          farrange_declaration : [ [a, c] ]
        });

        expect(machine.states().length).toBe(3);

      }),
      { numRuns: RUNS }
    );

  });

  test('arranging a state that does not exist is rejected, whichever declaration list carries it', () => {

    fc.assert(
      fc.property(
        two_names_arb,
        atom_arb,
        fc.constantFrom('arrange_declaration', 'oarrange_declaration', 'farrange_declaration'),
        ([a, b], z_base, decl_kind) => {
          const z = `${z_base}zz9`;
          expect(
            () => jssm.from(`${a} -> ${b};`, { [decl_kind]: [ [a, z] ] })
          ).toThrow(/Cannot arrange/);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('_new_state', () => {

  test('a fresh name registers and becomes a known state; a repeat of any existing name throws', () => {

    fc.assert(
      fc.property(two_names_arb, atom_arb, ([a, b], fresh_base) => {

        const machine = jssm.from(`${a} -> ${b};`);
        const fresh   = `${fresh_base}zz9`;

        expect(machine.has_state(fresh)).toBe(false);
        machine._new_state({ name: fresh, from: [], to: [], complete: false });
        expect(machine.has_state(fresh)).toBe(true);

        for (const existing of [a, b, fresh]) {
          expect(
            () => machine._new_state({ name: existing, from: [], to: [], complete: false })
          ).toThrow(/already exists/);
        }

      }),
      { numRuns: RUNS }
    );

  });

});





describe('default timer sources (real setTimeout/clearTimeout)', () => {

  // No fake timers injected here, deliberately: this pins that a machine
  // built without `timeout_source` overrides arms and clears real timers.
  // Delays are large so nothing fires during the test, and every armed
  // timer is cleared (by transition or explicitly) before the run ends.

  test('an `after` machine arms on construction, reports its timeout, and clears it on transition', () => {

    fc.assert(
      fc.property(
        two_names_arb,
        fc.integer({ min: 500_000, max: 2_000_000 }),
        ([ta, tb], ms) => {

          const machine = jssm.from(`${ta} after ${ms} ms -> ${tb};  ${tb} -> ${ta};`);

          expect(machine.current_state_timeout()).toEqual([tb, ms]);

          // transitioning away must clear the pending real timer
          expect(machine.go(tb)).toBe(true);
          expect(machine.state()).toBe(tb);
          expect(machine.current_state_timeout()).toBe(undefined);

          // explicit clear is safe when nothing is armed
          machine.clear_state_timeout();

        }
      ),
      { numRuns: 8 }
    );

  });

  test('explicit clear_state_timeout cancels the armed default timer and is idempotent', () => {

    fc.assert(
      fc.property(
        two_names_arb,
        fc.integer({ min: 500_000, max: 2_000_000 }),
        ([ta, tb], ms) => {

          const machine = jssm.from(`${ta} after ${ms} ms -> ${tb};  ${tb} -> ${ta};`);

          machine.clear_state_timeout();
          machine.clear_state_timeout();

          expect(machine.state()).toBe(ta);

        }
      ),
      { numRuns: 8 }
    );

  });

});
