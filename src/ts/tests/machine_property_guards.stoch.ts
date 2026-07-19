
import * as fc   from 'fast-check';
import * as jssm from '../jssm';




// Property-based coverage for machine-property construction validation
// (`src/ts/jssm.ts` constructor, roughly lines 1226-1320), part of the
// fsl#651 literal-100% stochastic coverage drive.
//
// Behaviors pinned:
//
//   - `property P required;` registers a required property; machines
//     where every state binds it construct, and `prop()` follows the
//     current state's binding;
//   - `required` plus `default` on the same property is rejected;
//   - a required property missing from any state is rejected;
//   - a state binding a property never globally declared is rejected;
//   - state-property bindings that arrive without the compiler's
//     unserialized `property`/`state` provenance fields (hand-built
//     configs) are re-derived by parsing the bound name, and resolve
//     identically.



const RUNS = 50;



/** Arbitrary for a short lowercase atom fragment. */
const atom_arb = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 6 }
).map(arr => arr.join(''));

/** Arbitrary for a pair of distinct state names. */
const two_names_arb = fc.tuple(atom_arb, atom_arb)
  .map( ([a, b]) => [`${a}0`, `${b}1`] as [string, string] );

/** Arbitrary for a property name, suffixed so it cannot collide with states. */
const prop_name_arb = atom_arb.map( p => `${p}pr` );

/**
 * Arbitrary for an FSL-expressible property value: non-negative integer or
 *  quoted string, as [source_literal, expected_runtime_value].  (The grammar
 *  has no negative number literal in property positions.)
 */
const prop_value_arb: fc.Arbitrary<[string, unknown]> = fc.oneof(
  fc.integer({ min: 0, max: 1000 }).map( (n): [string, unknown] => [String(n), n] ),
  atom_arb.map( (s): [string, unknown] => [`"${s}"`, s] )
);





describe('required properties', () => {

  test('a required property bound on every state constructs, and prop() tracks the current state', () => {

    fc.assert(
      fc.property(two_names_arb, prop_name_arb, prop_value_arb, prop_value_arb, ([a, b], p, [src1, v1], [src2, v2]) => {

        const machine = jssm.from(
          `property ${p} required;`
          + `  ${a} -> ${b};`
          + `  state ${a} : { property: ${p} ${src1}; };`
          + `  state ${b} : { property: ${p} ${src2}; };`
        );

        expect(machine.prop(p)).toBe(v1);
        expect(machine.go(b)).toBe(true);
        expect(machine.prop(p)).toBe(v2);

      }),
      { numRuns: RUNS }
    );

  });

  test('a property that is both required and defaulted is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, prop_name_arb, prop_value_arb, ([a, b], p, [src, _v]) => {
        expect(
          () => jssm.from(`property ${p} default ${src} required;  ${a} -> ${b};`)
        ).toThrow(/required, but also has a default/);
      }),
      { numRuns: RUNS }
    );

  });

  test('a required property missing from any one state is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, prop_name_arb, prop_value_arb, ([a, b], p, [src, _v]) => {
        expect(
          () => jssm.from(
            `property ${p} required;`
            + `  ${a} -> ${b};`
            + `  state ${a} : { property: ${p} ${src}; };`
          )
        ).toThrow(/missing required property/);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('undeclared state properties', () => {

  test('a state binding a property with no global declaration is rejected', () => {

    fc.assert(
      fc.property(two_names_arb, prop_name_arb, prop_value_arb, ([a, b], p, [src, _v]) => {
        expect(
          () => jssm.from(`${a} -> ${b};  state ${a} : { property: ${p} ${src}; };`)
        ).toThrow(/not globally declared/);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('state-property provenance re-derivation', () => {

  // The compiler writes `property` and `state` fields alongside each bound
  // state-property name.  A hand-built config may carry only the serialized
  // name; the constructor re-derives the pair by parsing it.  Both forms
  // must produce the same machine.

  test('bindings stripped of property/state fields resolve identically through prop()', () => {

    fc.assert(
      fc.property(two_names_arb, prop_name_arb, prop_value_arb, ([a, b], p, [src, v]) => {

        const cfg = jssm.make(
          `property ${p};`
          + `  ${a} -> ${b};`
          + `  state ${a} : { property: ${p} ${src}; };`
        ) as any;

        expect(Array.isArray(cfg.state_property)).toBe(true);
        expect(cfg.state_property.length).toBe(1);

        // strip the compiler's provenance fields, keeping only the bound name
        delete cfg.state_property[0].property;
        delete cfg.state_property[0].state;

        const machine = new jssm.Machine(cfg);

        expect(machine.prop(p)).toBe(v);

      }),
      { numRuns: RUNS }
    );

  });

});
