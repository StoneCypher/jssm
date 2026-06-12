
import * as fc from 'fast-check';

import * as jssm from '../jssm';

import { chain_plan_arb } from './stoch_helpers';





// Property-based coverage for machine data properties (`property` /
// `state: { property: ... }`), `override()`, and the history buffer.



const RUNS = 60;



const word = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 2, maxLength: 8 }
);

/** Arbitrary FSL property literal with its expected parsed value.  The
 *  grammar's JsNumericLiteral carries no sign, so numerics stay >= 0. */
const prop_value = fc.oneof(
  fc.integer({ min: 0, max: 100_000 }).map( n => ({ literal: String(n), expected: n as unknown }) ),
  word.map( w => ({ literal: `"${w}"`, expected: w as unknown }) ),
  fc.boolean().map( b => ({ literal: String(b), expected: b as unknown }) )
);





describe('declared properties', () => {

  test('a default-valued property reads back everywhere; a state override wins on its state', () => {

    fc.assert(
      fc.property(
        word.map( w => `p${w}` ),
        prop_value,
        prop_value,
        (pname, dflt, override) => {

          const machine = jssm.from(`
            property ${pname} default ${dflt.literal};
            aa -> bb;
            state bb: { property: ${pname} ${override.literal}; };
          `);

          expect(machine.prop(pname)).toBe(dflt.expected);
          expect(machine.strict_prop(pname)).toBe(dflt.expected);

          expect(machine.go('bb')).toBe(true);
          expect(machine.prop(pname)).toBe(override.expected);
          expect(machine.strict_prop(pname)).toBe(override.expected);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('known_prop / known_props / props() see exactly the declared property', () => {

    fc.assert(
      fc.property(
        word.map( w => `p${w}` ),
        prop_value,
        (pname, dflt) => {

          const machine = jssm.from(`
            property ${pname} default ${dflt.literal};
            aa -> bb;
          `);

          expect(machine.known_prop(pname)).toBe(true);
          expect(machine.known_prop(`${pname}x`)).toBe(false);
          expect(machine.known_props()).toEqual([pname]);
          expect(machine.props()).toEqual({ [pname]: dflt.expected });

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('strict_prop throws on a state with neither default nor state value; prop does not', () => {

    fc.assert(
      fc.property(
        word.map( w => `p${w}` ),
        prop_value,
        (pname, on_b) => {

          const machine = jssm.from(`
            property ${pname};
            aa -> bb;
            state bb: { property: ${pname} ${on_b.literal}; };
          `);

          expect(() => machine.strict_prop(pname)).toThrow();
          expect(machine.prop(pname)).toBe(undefined);

          expect(machine.go('bb')).toBe(true);
          expect(machine.strict_prop(pname)).toBe(on_b.expected);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('override()', () => {

  test('with allows_override, any constructed state is reachable directly, and data swaps', () => {

    fc.assert(
      fc.property(
        chain_plan_arb.chain( plan =>
          fc.tuple(
            fc.constant(plan),
            fc.integer({ min: 0, max: plan.names.length - 1 })
          )
        ),
        fc.integer(),
        fc.integer(),
        ([plan, target], data_before, data_after) => {

          const machine = jssm.from(`allows_override: true;  ${plan.fsl}`, { data: data_before });

          let override_events = 0;
          machine.on('override', () => { ++override_events; });

          machine.override(plan.names[target], data_after);

          expect(machine.state()).toBe(plan.names[target]);
          expect(machine.data()).toBe(data_after);
          expect(override_events).toBe(1);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('override throws by default, when disallowed, and for unknown states', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const by_default = jssm.from(fsl);
          expect(() => by_default.override(names[names.length - 1])).toThrow();

          const disallowed = jssm.from(`allows_override: false;  ${fsl}`);
          expect(() => disallowed.override(names[names.length - 1])).toThrow();

          const allowed = jssm.from(`allows_override: true;  ${fsl}`);
          expect(() => allowed.override(`${names[0]}_`)).toThrow();

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('history buffer', () => {

  /**
   *  Builds the FSL for a plain ring of size k (`h0 -> h1 -> ... -> h0`)
   *  and walks a machine n steps, returning the visited-state sequence
   *  *before* each step — which is exactly what the history buffer records.
   *
   *  @param k  Ring size.
   *  @param n  Steps to walk.
   *  @param history  Capacity passed to the constructor.
   *  @returns  The machine and the full pre-step state sequence.
   */
  function walked_ring(k: number, n: number, history: number) {

    const names = [...new Array(k).keys()].map( i => `h${i}` );
    const fsl   = names.map( (nm, i) => `${nm} -> ${names[(i + 1) % k]};` ).join('  ');

    const machine = jssm.from(fsl, { history });
    const visited: string[] = [];

    for (let s = 0; s < n; ++s) {
      visited.push(machine.state());
      expect(machine.transition(names[(s + 1) % k])).toBe(true);
    }

    return { machine, visited };

  }

  test('history holds the last `capacity` pre-transition states, oldest first, current excluded', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 0, max: 25 }),
        fc.integer({ min: 1, max: 6 }),
        (k, n, capacity) => {

          const { machine, visited } = walked_ring(k, n, capacity);

          const expected = visited
            .slice(Math.max(0, visited.length - capacity))
            .map( state => [state, undefined] );

          expect(machine.history).toEqual(expected);
          expect(machine.history_length).toBe(capacity);

          // inclusive = history plus the current state on the end
          expect(machine.history_inclusive).toEqual([...expected, [machine.state(), undefined]]);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('history is off (empty) when unconfigured, and can be enabled at runtime', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 6 }),
        (k, n, capacity) => {

          const names = [...new Array(k).keys()].map( i => `h${i}` );
          const fsl   = names.map( (nm, i) => `${nm} -> ${names[(i + 1) % k]};` ).join('  ');

          const machine = jssm.from(fsl);
          expect(machine.history_length).toBe(0);

          machine.transition(names[1]);
          expect(machine.history).toEqual([]);   // nothing recorded while off

          machine.history_length = capacity;
          expect(machine.history_length).toBe(capacity);

          const visited: string[] = [];
          for (let s = 0; s < n; ++s) {
            visited.push(machine.state());
            const here = names.indexOf(machine.state());
            expect(machine.transition(names[(here + 1) % k])).toBe(true);
          }

          const expected = visited
            .slice(Math.max(0, visited.length - capacity))
            .map( state => [state, undefined] );

          expect(machine.history).toEqual(expected);

          machine.history_length = 0;
          expect(machine.history).toEqual([]);

        }
      ),
      { numRuns: RUNS }
    );

  });

});
