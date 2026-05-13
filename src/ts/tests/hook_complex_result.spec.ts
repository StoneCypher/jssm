
import * as jssm from '../jssm';





/**
 *
 *  Regression coverage for StoneCypher/fsl#1324
 *  ("is_hook_complex_result crashes on null").
 *
 *  The predicate must never throw for any input — it should return `true`
 *  only for non-null objects with a boolean `pass` field, and `false`
 *  otherwise (including `null`, `undefined`, primitives, and shape-mismatched
 *  objects).
 *
 */

describe('is_hook_complex_result never crashes on falsy / primitive input', () => {

  test('returns false for null and does not throw', () => {
    expect( () => jssm.is_hook_complex_result(null) ).not.toThrow();
    expect( jssm.is_hook_complex_result(null) ).toBe(false);
  });

  test('returns false for undefined and does not throw', () => {
    expect( () => jssm.is_hook_complex_result(undefined) ).not.toThrow();
    expect( jssm.is_hook_complex_result(undefined) ).toBe(false);
  });

  test('returns false for the number 0 and does not throw', () => {
    expect( () => jssm.is_hook_complex_result(0 as any) ).not.toThrow();
    expect( jssm.is_hook_complex_result(0 as any) ).toBe(false);
  });

  test('returns false for the empty string and does not throw', () => {
    expect( () => jssm.is_hook_complex_result('' as any) ).not.toThrow();
    expect( jssm.is_hook_complex_result('' as any) ).toBe(false);
  });

  test('returns false for the boolean false', () => {
    expect( jssm.is_hook_complex_result(false) ).toBe(false);
  });

  test('returns false for the boolean true', () => {
    expect( jssm.is_hook_complex_result(true) ).toBe(false);
  });

  test('returns false for the number 42', () => {
    expect( jssm.is_hook_complex_result(42 as any) ).toBe(false);
  });

  test('returns false for an arbitrary string', () => {
    expect( jssm.is_hook_complex_result('string' as any) ).toBe(false);
  });

});



describe('is_hook_complex_result accepts well-shaped complex results', () => {

  test('returns true for { pass: true }', () => {
    expect( jssm.is_hook_complex_result({ pass: true }) ).toBe(true);
  });

  test('returns true for { pass: false }', () => {
    expect( jssm.is_hook_complex_result({ pass: false }) ).toBe(true);
  });

  test('returns true for { pass: false, data: { x: 1 } }', () => {
    expect( jssm.is_hook_complex_result({ pass: false, data: { x: 1 } }) ).toBe(true);
  });

  test('returns true for { pass: true, next_data: { y: 2 } }', () => {
    expect( jssm.is_hook_complex_result({ pass: true, next_data: { y: 2 } }) ).toBe(true);
  });

});



describe('is_hook_complex_result rejects shape-mismatched objects', () => {

  test('returns false for { other: "thing" }', () => {
    expect( jssm.is_hook_complex_result({ other: 'thing' } as any) ).toBe(false);
  });

  test('returns false for {} (empty object)', () => {
    expect( jssm.is_hook_complex_result({} as any) ).toBe(false);
  });

  test('returns false for { pass: "yes" } (non-boolean pass)', () => {
    expect( jssm.is_hook_complex_result({ pass: 'yes' } as any) ).toBe(false);
  });

  test('returns false for { pass: 1 } (non-boolean pass)', () => {
    expect( jssm.is_hook_complex_result({ pass: 1 } as any) ).toBe(false);
  });

  test('returns false for arrays', () => {
    expect( jssm.is_hook_complex_result([] as any) ).toBe(false);
    expect( jssm.is_hook_complex_result([1, 2, 3] as any) ).toBe(false);
  });

});



/**
 *
 *  Caller-side: a hook handler returning `null` must not crash the machine.
 *  Per the documented contract of `abstract_hook_step`, `null` normalizes to
 *  `{ pass: false }` — i.e. a rejection.
 *
 */

describe('hooks returning null are handled gracefully by the machine', () => {

  test('a hook returning null rejects the transition without throwing', () => {
    const machine = jssm.sm`a -> b;`;
    machine.set_hook({
      from: 'a',
      to:   'b',
      kind: 'hook',
      handler: () => null as any
    });

    expect( () => machine.transition('b') ).not.toThrow();
    // null is documented to normalize to { pass: false } -> rejection
    expect( machine.state() ).toBe('a');
  });

  test('abstract_hook_step normalizes a hook returning null to { pass: false }', () => {
    const fn = () => null as any;
    expect( jssm.abstract_hook_step(fn, { data: undefined, next_data: undefined }) )
      .toStrictEqual({ pass: false });
  });

});
