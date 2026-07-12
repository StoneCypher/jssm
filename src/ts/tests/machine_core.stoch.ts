
import * as fc from 'fast-check';

import * as jssm from '../jssm';

import { chain_plan_arb } from './stoch_helpers';

/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));





// Property-based coverage for `Machine` construction and graph
// introspection (`jssm.ts`, with `jssm_compiler.ts` exercised on the way
// in through `from()`).
//
// Machines are built from a constructed plan — explicit state names and an
// explicit directed edge list — so every expectation below derives from
// the plan, not from asking the machine about itself.



const RUNS = 60;



/**
 *  Computes the declared outgoing targets for one state from a plan's edge
 *  list, preserving declaration order.
 *  @param edges  The plan's complete directed edge list.
 *  @param from   The source state to filter on.
 *  @returns      Every declared `to` for that source.
 *  @example
 *    targets_of([['a','b'], ['a','c'], ['b','c']], 'a')  // ['b', 'c']
 */
const targets_of = (edges: [string, string][], from: string): string[] =>
  edges.filter( ([f, _t]) => f === from ).map( ([_f, t]) => t );



/**
 *  Computes the declared inbound sources for one state from a plan's edge
 *  list, preserving declaration order.
 *  @param edges  The plan's complete directed edge list.
 *  @param to     The target state to filter on.
 *  @returns      Every declared `from` into that target.
 *  @example
 *    sources_of([['a','b'], ['a','c'], ['b','c']], 'c')  // ['a', 'b']
 */
const sources_of = (edges: [string, string][], to: string): string[] =>
  edges.filter( ([_f, t]) => t === to ).map( ([f, _t]) => f );



/** Sorted-copy helper so set-style comparisons read cleanly. */
const sorted = (arr: string[]): string[] => [...arr].sort(code_unit_compare);





describe('state inventory', () => {

  test('states() returns exactly the constructed states; state() is the first mentioned', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const machine = jssm.from(fsl);

          expect(sorted(machine.states())).toEqual(sorted(names));
          expect(machine.state()).toBe(names[0]);
          expect(machine.is_start_state(names[0])).toBe(true);

          for (const name of names.slice(1)) {
            expect(machine.is_start_state(name)).toBe(false);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('has_state is true for every constructed state and false for an unknown name', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const machine = jssm.from(fsl);

          for (const name of names) {
            expect(machine.has_state(name)).toBe(true);
          }

          // constructed names always carry a digit suffix; a trailing
          // underscore can never collide
          expect(machine.has_state(`${names[0]}_`)).toBe(false);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('edge inventory', () => {

  test('list_edges matches the constructed edge list pair-for-pair', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ edges, fsl }) => {

          const machine  = jssm.from(fsl);
          const reported = machine.list_edges();

          expect(reported.length).toBe(edges.length);

          const reported_pairs = new Set( reported.map( e => `${e.from}|${e.to}` ) ),
                declared_pairs = new Set( edges.map( ([f, t]) => `${f}|${t}` ) );

          expect(reported_pairs).toEqual(declared_pairs);

          // plans declare with `->` only, so every edge is a plain legal edge
          for (const e of reported) {
            expect(e.kind).toBe('legal');
            expect(e.forced_only).toBe(false);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('list_exits and list_entrances per state match the plan', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, edges, fsl }) => {

          const machine = jssm.from(fsl);

          for (const name of names) {
            expect(sorted(machine.list_exits(name))).toEqual(sorted(targets_of(edges, name)));
            expect(sorted(machine.list_entrances(name))).toEqual(sorted(sources_of(edges, name)));
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('lookup_transition_for and edges_between are defined exactly on declared pairs', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, edges, fsl }) => {

          const machine  = jssm.from(fsl);
          const declared = new Set( edges.map( ([f, t]) => `${f}|${t}` ) );

          for (const from of names) {
            for (const to of names) {

              const tr      = machine.lookup_transition_for(from, to);
              const between = machine.edges_between(from, to);

              if (declared.has(`${from}|${to}`)) {
                expect(tr).toBeDefined();
                expect(tr.from).toBe(from);
                expect(tr.to).toBe(to);
                expect(between.length).toBe(1);
              } else {
                expect(tr).toBe(undefined);
                expect(between.length).toBe(0);
              }

            }
          }

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('terminality, enterability, and finality over chain plans', () => {

  // chain plans guarantee: a full backbone n0 -> n1 -> ... -> n(k-1), all
  // extras strictly forward.  So the last state is the only terminal, and
  // the first state is the only unenterable.

  test('exactly the last state is terminal; exactly the first is unenterable', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const machine = jssm.from(fsl);
          const last    = names.at(-1);

          for (const name of names) {
            expect(machine.state_is_terminal(name)).toBe(name === last);
            expect(machine.is_unenterable(name)).toBe(name === names[0]);
          }

          expect(machine.has_terminals()).toBe(true);
          expect(machine.has_unenterables()).toBe(true);

          // the start of a 2+ state chain always has an exit
          expect(machine.is_terminal()).toBe(false);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('with no complete markings, finality collapses to terminality', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const machine = jssm.from(fsl);

          expect(machine.has_completes()).toBe(false);

          for (const name of names) {
            expect(machine.state_is_complete(name)).toBe(false);
            expect(machine.state_is_final(name)).toBe(machine.state_is_terminal(name));
          }

          expect(machine.is_final()).toBe(false);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('querying a nonexistent state throws JssmError', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        ({ names, fsl }) => {

          const machine = jssm.from(fsl);
          const ghost   = `${names[0]}_`;

          expect(() => machine.state_is_terminal(ghost)).toThrow();
          expect(() => machine.is_unenterable(ghost)).toThrow();
          expect(() => machine.state_is_complete(ghost)).toThrow();

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('machine attributes round-trip through from()', () => {

  const word = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    { minLength: 1, maxLength: 12 }
  );

  test('name, author, license, and comment surface through their getters', () => {

    fc.assert(
      fc.property(
        word, word, word,
        (name, author, license_word) => {

          const machine = jssm.from(`
            machine_name    : "${name}";
            machine_author  : "${author}";
            machine_license : ${license_word};
            machine_comment : "${name} ${author}";
            aa -> bb;
          `);

          expect(machine.machine_name()).toBe(name);
          expect(machine.machine_author()).toEqual([author]);   // boxed: author accepts multiples
          expect(machine.machine_license()).toBe(license_word);
          expect(machine.machine_comment()).toBe(`${name} ${author}`);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('machine_version round-trips semver triples as the parsed breakdown object', () => {

    // note: despite the getter's `(): string` annotation, the contract —
    // pinned by machine_attributes.spec.ts "retval correct" — is the parsed
    // `{ major, minor, patch, full }` breakdown.  The annotation is the
    // wart (see the compiler's `TODO COMEBACK semver`); behavior is this.

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 0, max: 99 }),
        (maj, min, pat) => {

          const machine = jssm.from(`
            machine_version : ${maj}.${min}.${pat};
            aa -> bb;
          `);

          expect(machine.machine_version()).toEqual({
            major : maj,
            minor : min,
            patch : pat,
            full  : `${maj}.${min}.${pat}`
          });

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('instance_name passes through ExtraConstructorFields', () => {

    fc.assert(
      fc.property(
        word,
        (iname) => {
          const machine = jssm.from('aa -> bb;', { instance_name: iname });
          expect(machine.instance_name()).toBe(iname);
        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('serialize / deserialize round-trip', () => {

  test('serialization carries current state, version, and the comment', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        fc.string({ maxLength: 20 }),
        ({ names, fsl }, comment) => {

          const machine = jssm.from(fsl);
          const ser     = machine.serialize(comment);

          expect(ser.state).toBe(names[0]);
          expect(ser.comment).toBe(comment);
          expect(ser.jssm_version).toBe(jssm.version);
          expect(Array.isArray(ser.history)).toBe(true);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('walking the backbone then round-tripping preserves the reached state', () => {

    fc.assert(
      fc.property(
        chain_plan_arb.chain( plan =>
          fc.tuple(
            fc.constant(plan),
            fc.integer({ min: 0, max: plan.names.length - 1 })
          )
        ),
        ([plan, steps]) => {

          const machine = jssm.from(plan.fsl);

          for (let i = 0; i < steps; ++i) {
            expect(machine.transition(plan.names[i + 1])).toBe(true);
          }

          const restored = jssm.deserialize(plan.fsl, machine.serialize());
          expect(restored.state()).toBe(plan.names[steps]);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('deserialize rejects serializations from a future major version', () => {

    fc.assert(
      fc.property(
        chain_plan_arb,
        fc.integer({ min: 1, max: 100 }),
        ({ fsl }, bump) => {

          const machine = jssm.from(fsl);
          const ser     = machine.serialize();

          const major   = Number(jssm.version.split('.', 1)[0]) + bump;
          ser.jssm_version = `${major}.0.0`;

          expect(() => jssm.deserialize(fsl, ser)).toThrow(/future version/);

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('compareVersions', () => {

  test('reflexive: any triple compares equal to itself', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 0, max: 500 }),
        (a, b, c) => {
          expect(jssm.compareVersions(`${a}.${b}.${c}`, `${a}.${b}.${c}`)).toBe(0);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('agrees with lexicographic comparison of constructed triples, antisymmetrically', () => {

    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 30 })),
        fc.tuple(fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 30 })),
        (t1, t2) => {

          const v1 = t1.join('.'),
                v2 = t2.join('.');

          const expected = ((): number => {
            for (let i = 0; i < 3; ++i) {
              if (t1[i] !== t2[i]) { return t1[i] < t2[i] ? -1 : 1; }
            }
            return 0;
          })();

          expect(Math.sign(jssm.compareVersions(v1, v2))).toBe(expected);
          // guard the equal case: -expected would be -0, and toBe uses Object.is,
          // where Object.is(+0, -0) is false (compareVersions returns +0 for equal)
          expect(Math.sign(jssm.compareVersions(v2, v1))).toBe(expected === 0 ? 0 : -expected);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a prerelease always precedes its own release', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        fc.constantFrom('alpha', 'beta', 'rc.1', 'alpha.2', '0'),
        (a, b, c, pre) => {

          const release    = `${a}.${b}.${c}`,
                prerelease = `${release}-${pre}`;

          expect(jssm.compareVersions(prerelease, release)).toBeLessThan(0);
          expect(jssm.compareVersions(release, prerelease)).toBeGreaterThan(0);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('numeric prerelease identifiers order numerically and below alphanumerics', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (n1, n2) => {

          const expected = Math.sign(n1 - n2);

          expect(Math.sign(jssm.compareVersions(`1.0.0-${n1}`, `1.0.0-${n2}`))).toBe(expected);

          // semver: numeric identifiers sort below alphanumeric ones
          expect(jssm.compareVersions(`1.0.0-${n1}`, '1.0.0-alpha')).toBeLessThan(0);

        }
      ),
      { numRuns: RUNS }
    );

  });

});
