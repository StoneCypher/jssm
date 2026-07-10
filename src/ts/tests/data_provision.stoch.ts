
import * as fc          from 'fast-check';
import { from as sm_from } from '../jssm';





// Stochastic pinning for StoneCypher/fsl#1264 / #935: over an arbitrary
// value pool that deliberately over-represents the falsy family, an
// explicitly provided data argument is always committed exactly
// (Object.is), and an omitted data argument always preserves what was
// there — through both the hook-free and hooked transition paths, and
// through hook complex-return data assignment.
//
// Identity is asserted against `_data_ref()` (the zero-copy internal
// accessor) rather than `data()`, because the public `data()` contract is
// a structuredClone per call — reference values can never be `Object.is`-
// identical through it, by design.





const RUNS = 100;

const value_arb = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(false),
  fc.constant(0),
  fc.constant(''),
  fc.constant(Number.NaN),
  fc.integer(),
  fc.string(),
  fc.double(),
  fc.array(fc.integer(), { maxLength: 3 }),
);





test('explicit transition data always commits exactly; omitted always preserves', () => {

  fc.assert(
    fc.property(value_arb, value_arb, (seed, next) => {

      const m = sm_from(`a -> b -> a;`, { data: seed });

      expect(m.transition('b', next)).toBe(true);
      expect(Object.is(m._data_ref(), next)).toBe(true);

      expect(m.transition('a')).toBe(true);
      expect(Object.is(m._data_ref(), next)).toBe(true);

    }),
    { numRuns: RUNS }
  );

});





test('hook-assigned data always commits exactly, hooked path, all value shapes', () => {

  fc.assert(
    fc.property(value_arb, value_arb, (seed, assigned) => {

      const m = sm_from(`a -> b;`, { data: seed });
      m.hook_any_transition(() => ({ pass: true, data: assigned }));

      expect(m.go('b')).toBe(true);
      expect(Object.is(m._data_ref(), assigned)).toBe(true);

    }),
    { numRuns: RUNS }
  );

});





test('set_data round-trips every value shape exactly', () => {

  fc.assert(
    fc.property(value_arb, value_arb, (seed, next) => {

      const m = sm_from(`a -> b;`, { data: seed });

      m.set_data(next);
      expect(Object.is(m._data_ref(), next)).toBe(true);

    }),
    { numRuns: RUNS }
  );

});
