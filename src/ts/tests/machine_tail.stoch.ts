
import * as fc from 'fast-check';

import * as jssm from '../jssm';

import { chain_plan_arb } from './stoch_helpers';



// Property-based coverage for the tail region of `jssm.ts` (line ~6360 to
// end of file), part of the stochastic-coverage drive (fsl#651 / fsl#556).
//
// Covered here: the creation-timestamp getters, the interned action lookup
// miss path, `from()`'s `allows_override` decoration, the exported hook
// result normalizers (`is_hook_rejection`, `abstract_hook_step`,
// `abstract_everything_hook_step`), `compareVersions` over mixed segment
// counts, and `deserialize` when the serialized state is not a state of the
// machine.  Expectations derive from constructed inputs, never from asking
// the code under test twice.



const RUNS = 40;



/** Arbitrary for a short lowercase alphabetic fragment, a valid FSL atom. */
const lc_word = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 8 }
);





describe('creation timestamps (machine tail region)', () => {

  test('create_start_time is the first time_source tick; creation follows it', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 40 }),
        fc.integer({ min: 1, max: 1000 }),
        (base, step) => {

          // deterministic injected clock: tick n returns base + n*step
          let now = base;
          const tick = (): number => (now += step);

          const machine = jssm.from('aa -> bb;', { time_source: tick });

          // the constructor's very first clock read is the create start time
          expect(machine.create_start_time).toBe(base + step);

          // construction completes at a later (or equal-resolution) tick
          expect(machine.creation_timestamp).toBeGreaterThanOrEqual(machine.create_start_time);

          // creation_date is the floored-millisecond Date of the same instant
          expect(machine.creation_date.getTime()).toBe(Math.floor(machine.creation_timestamp));

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('with the default clock, both stamps sit inside the construction window', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ fsl }) => {

          const t0      = Date.now();
          const machine = jssm.from(fsl);
          const t1      = Date.now();

          expect(machine.create_start_time).toBeGreaterThanOrEqual(t0);
          expect(machine.creation_timestamp).toBeGreaterThanOrEqual(machine.create_start_time);
          expect(machine.creation_timestamp).toBeLessThanOrEqual(t1);

        }
      ),
      { numRuns: 20 }
    );

  });

});





describe('current_action_for interned lookup (machine tail region)', () => {

  test('known actions resolve to an edge index; unknown action names miss without throwing', () => {

    fc.assert(
      fc.property(
        lc_word,
        (frag) => {

          const act_fwd  = `${frag}f`,   // distinct by construction:
                act_back = `${frag}b`,   //   shared stem, distinct suffixes
                ghost    = `${frag}q`;

          const machine = jssm.from(`s1 '${act_fwd}' -> s2; s2 '${act_back}' -> s1;`);

          // known action from the current state: a numeric edge index
          const idx = machine.current_action_for(act_fwd);
          expect(typeof idx).toBe('number');

          const edge = machine.current_action_edge_for(act_fwd);
          expect(edge.from).toBe('s1');
          expect(edge.to).toBe('s2');

          // an action that exists nowhere in the machine: undefined, no throw
          expect(machine.current_action_for(ghost)).toBe(undefined);
          expect(machine.valid_action(ghost)).toBe(false);
          expect(() => machine.current_action_edge_for(ghost)).toThrow(/No such action/);

          // an action that exists, but not from the current state, also misses
          expect(machine.current_action_for(act_back)).toBe(undefined);
          expect(machine.valid_action(act_back)).toBe(false);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('from() decorates allows_override into config_allows_override', () => {

  test('the allows_override extra-constructor key lands on the config channel', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(true, false, undefined),
        lc_word,
        (ov, iname) => {

          // allows_override exercises the special-cased decoration branch;
          // instance_name rides along through the plain-copy branch
          const machine = jssm.from('aa -> bb;', { allows_override: ov, instance_name: iname });

          expect(machine.config_allows_override).toBe(ov);
          expect(machine.instance_name()).toBe(iname);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('is_hook_rejection normalizes every legal hook result shape', () => {

  test('pass shapes report false; reject shapes report true', () => {

    fc.assert(
      fc.property(
        fc.anything(),
        (payload) => {

          // pass shapes
          expect(jssm.is_hook_rejection(true      as any)).toBe(false);
          expect(jssm.is_hook_rejection(undefined as any)).toBe(false);
          expect(jssm.is_hook_rejection({ pass: true }               as any)).toBe(false);
          expect(jssm.is_hook_rejection({ pass: true, data: payload } as any)).toBe(false);

          // reject shapes
          expect(jssm.is_hook_rejection(false as any)).toBe(true);
          expect(jssm.is_hook_rejection({ pass: false }                as any)).toBe(true);
          expect(jssm.is_hook_rejection({ pass: false, data: payload } as any)).toBe(true);

        }
      ),
      { numRuns: 20 }
    );

  });

  test('unrecognized shapes throw TypeError', () => {

    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.double({ noNaN: false }),
          fc.string(),
          fc.constant(null),
          fc.record({ other: fc.integer() }),   // object without a `pass` field
          fc.record({ pass: fc.integer() })     // `pass` present but not boolean
        ),
        (bad) => {
          expect(() => jssm.is_hook_rejection(bad as any)).toThrow(TypeError);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('abstract_hook_step normalizes hook returns', () => {

  const args = (): any => ({ data: undefined, next_data: undefined });

  test('no hook installed is a pass', () => {
    expect(jssm.abstract_hook_step(undefined, args()).pass).toBe(true);
  });

  test('undefined and true returns pass; false and null returns reject', () => {

    fc.assert(
      fc.property(
        fc.constantFrom<[unknown, boolean]>(
          [undefined, true ],
          [true,      true ],
          [false,     false],
          [null,      false]
        ),
        ([hook_return, expected_pass]) => {

          const hook_args = args();
          let   seen: any = 'never called';

          const result = jssm.abstract_hook_step(
            ((ha: any) => { seen = ha; return hook_return; }) as any,
            hook_args
          );

          expect(seen).toBe(hook_args);            // hook receives the args object verbatim
          expect(result.pass).toBe(expected_pass);

        }
      ),
      { numRuns: 20 }
    );

  });

  test('a complex result object is returned as-is (identity preserved)', () => {

    fc.assert(
      fc.property(
        fc.boolean(),
        fc.anything(),
        (pass, data) => {

          const complex = { pass, data };
          const result  = jssm.abstract_hook_step((() => complex) as any, args());

          expect(result).toBe(complex);

        }
      ),
      { numRuns: 20 }
    );

  });

  test('any other return shape throws TypeError', () => {

    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.string(), fc.record({ nope: fc.integer() })),
        (bad) => {
          expect(() => jssm.abstract_hook_step((() => bad) as any, args()))
            .toThrow(/Unknown hook result type/);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('through the public machine API: a null-returning hook rejects the transition', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const machine = jssm.from(fsl);

          machine.hook(names[0], names[1], (() => null) as any);

          expect(machine.transition(names[1])).toBe(false);
          expect(machine.state()).toBe(names[0]);

        }
      ),
      { numRuns: 20 }
    );

  });

  test('through the public machine API: a garbage-returning hook throws TypeError', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        fc.oneof(fc.integer(), fc.string()),
        ({ names, fsl }, bad) => {

          const machine = jssm.from(fsl);

          machine.hook(names[0], names[1], (() => bad) as any);

          expect(() => machine.transition(names[1])).toThrow(/Unknown hook result type/);

        }
      ),
      { numRuns: 20 }
    );

  });

});





describe('abstract_everything_hook_step normalizes everything-hook returns', () => {

  const eargs = (): any => ({ data: undefined, next_data: undefined, hook_name: 'everything' });

  test('no hook installed is a pass', () => {
    expect(jssm.abstract_everything_hook_step(undefined, eargs()).pass).toBe(true);
  });

  test('undefined and true returns pass; false and null returns reject', () => {

    fc.assert(
      fc.property(
        fc.constantFrom<[unknown, boolean]>(
          [undefined, true ],
          [true,      true ],
          [false,     false],
          [null,      false]
        ),
        ([hook_return, expected_pass]) => {

          const hook_args = eargs();
          let   seen: any = 'never called';

          const result = jssm.abstract_everything_hook_step(
            ((ha: any) => { seen = ha; return hook_return; }) as any,
            hook_args
          );

          expect(seen).toBe(hook_args);
          expect(result.pass).toBe(expected_pass);

        }
      ),
      { numRuns: 20 }
    );

  });

  test('a complex result object is returned as-is (identity preserved)', () => {

    fc.assert(
      fc.property(
        fc.boolean(),
        fc.anything(),
        (pass, data) => {

          const complex = { pass, data };
          const result  = jssm.abstract_everything_hook_step((() => complex) as any, eargs());

          expect(result).toBe(complex);

        }
      ),
      { numRuns: 20 }
    );

  });

  test('any other return shape throws TypeError', () => {

    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.string(), fc.record({ nope: fc.integer() })),
        (bad) => {
          expect(() => jssm.abstract_everything_hook_step((() => bad) as any, eargs()))
            .toThrow(/Unknown hook result type/);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('compareVersions over mixed segment counts', () => {

  test('appending ".0" segments never changes the comparison', () => {

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 1, max: 3 }),
        (segs, zeros) => {

          const short_v = segs.join('.');
          const long_v  = [...segs, ...Array.from({ length: zeros }, () => 0)].join('.');

          // missing segments compare as zero, in both argument positions
          expect(jssm.compareVersions(short_v, long_v)).toBe(0);
          expect(jssm.compareVersions(long_v, short_v)).toBe(0);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a prerelease version compares equal to itself, identifier-by-identifier', () => {

    // reaches the comparator's deep equal-case terminator: both sides carry
    // a prerelease, every dot-identifier matches (numeric and alphanumeric
    // alike), so the identifier loop completes without an early return

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 3 }),
        fc.array(
          fc.oneof(
            fc.integer({ min: 0, max: 99 }).map(String),                 // numeric identifier
            fc.constantFrom('alpha', 'beta', 'rc', 'x', 'pre')           // alphanumeric identifier
          ),
          { minLength: 1, maxLength: 4 }
        ),
        (segs, ids) => {

          const v = `${segs.join('.')}-${ids.join('.')}`;

          expect(jssm.compareVersions(v, v)).toBe(0);

          // and equality is content-based, not identity-based
          expect(jssm.compareVersions(v, `${segs.join('.')}-${ids.join('.')}`)).toBe(0);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('appending a positive segment makes the longer version greater', () => {

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 1, max: 100 }),
        (segs, extra) => {

          const short_v = segs.join('.');
          const long_v  = [...segs, extra].join('.');

          expect(jssm.compareVersions(short_v, long_v)).toBeLessThan(0);
          expect(jssm.compareVersions(long_v, short_v)).toBeGreaterThan(0);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('deserialize with a state name unknown to the machine', () => {

  test('the serialized state is adopted verbatim even when the machine never declared it', () => {

    // deserialize() trusts the serialization: the state is restored as given,
    // with the interned state id falling back to NaN for unknown names.  The
    // graph itself is unchanged — the ghost never joins states().

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const machine = jssm.from(fsl);
          const ser     = machine.serialize();

          const ghost = `${names[0]}_`;   // constructed names end in a digit; never collides
          ser.state   = ghost;

          const restored = jssm.deserialize(fsl, ser);

          expect(restored.state()).toBe(ghost);
          expect(restored.states().includes(ghost)).toBe(false);

        }
      ),
      { numRuns: 20 }
    );

  });

});
