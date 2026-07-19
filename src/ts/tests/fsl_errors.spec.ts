
import {

  fsl_error_kinds,
  FslErrorKind,
  FslContractKind,

  describe_fields,

  FslError,

  div_by_zero_error,
  out_of_bounds_error,
  overflow_error,
  underflow_error,
  type_error,
  failed_narrow_error,
  contract_violation_error,
  unbound_value_error,
  nan_compare_error,
  microstep_overflow_error,

} from '../fsl_errors';

import { FslSourceLocation } from '../jssm_types';





const a_location: FslSourceLocation = {
  start : { offset: 0, line: 1, column: 1 },
  end   : { offset: 3, line: 1, column: 4 }
};





describe('fsl_error_kinds taxonomy', () => {


  test('is the exact, complete finite set from megaspec §11', () => {
    expect([...fsl_error_kinds]).toEqual([
      'div_by_zero',
      'out_of_bounds',
      'overflow',
      'underflow',
      'type_error',
      'failed_narrow',
      'contract_violation',
      'unbound_value',
      'nan_compare',
      'microstep_overflow',
    ]);
  });


  test('is frozen so the taxonomy cannot be mutated at runtime', () => {
    expect(Object.isFrozen(fsl_error_kinds)).toBe(true);
  });


  test('has no duplicate members', () => {
    expect(new Set(fsl_error_kinds).size).toBe(fsl_error_kinds.length);
  });


});





describe('describe_fields', () => {


  test('returns the empty string when nothing nameable is present', () => {
    expect(describe_fields({})).toBe('');
  });


  test('names a single entity', () => {
    expect(describe_fields({ entity: 'count' })).toBe(' (entity "count")');
  });


  test('renders every field, in declaration order, when all are present', () => {
    expect(describe_fields({
      entity        : 'count',
      index         : 5,
      length        : 3,
      value         : 256,
      lower_bound   : 0,
      upper_bound   : 255,
      expected_type : 'int',
      actual_type   : 'string',
      contract      : 'require',
      bound         : 100_000,
    })).toBe(
      ' (entity "count", index 5, length 3, value 256, min 0, max 255, ' +
      'expected int, actual string, contract require, bound 100000)'
    );
  });


  test('renders fields whose value is the falsy 0', () => {
    expect(describe_fields({ index: 0, length: 0, value: 0, lower_bound: 0, upper_bound: 0, bound: 0 }))
      .toBe(' (index 0, length 0, value 0, min 0, max 0, bound 0)');
  });


  test('ignores source_location (it is structured data, not message prose)', () => {
    expect(describe_fields({ source_location: a_location })).toBe('');
  });


});





describe('FslError class', () => {


  test('is an instance of Error and of FslError', () => {
    const e = new FslError('div_by_zero', 'division by zero');
    expect(e instanceof Error).toBe(true);
    expect(e instanceof FslError).toBe(true);
  });


  test('sets name to FslError', () => {
    expect(new FslError('overflow', 'numeric overflow').name).toBe('FslError');
  });


  test('builds the message as "<kind>: <prose>" with no fields', () => {
    expect(new FslError('div_by_zero', 'division by zero').message)
      .toBe('div_by_zero: division by zero');
  });


  test('appends the named-entity parenthetical when fields are present', () => {
    expect(new FslError('div_by_zero', 'division by zero', { entity: 'rate' }).message)
      .toBe('div_by_zero: division by zero (entity "rate")');
  });


  test('defaults its fields object so a bare two-arg construction works', () => {
    const e = new FslError('overflow', 'numeric overflow');
    expect(e.entity).toBe(undefined);
    expect(e.message).toBe('overflow: numeric overflow');
  });


  test('retains the base_message separate from the complex message', () => {
    const e = new FslError('out_of_bounds', 'index out of bounds', { entity: 'items', index: 5, length: 3 });
    expect(e.base_message).toBe('index out of bounds');
    expect(e.message).toBe('out_of_bounds: index out of bounds (entity "items", index 5, length 3)');
  });


  test('exposes every structured field it was given', () => {
    const e = new FslError('overflow', 'numeric overflow', {
      entity          : 'count',
      index           : 5,
      length          : 3,
      value           : 256,
      lower_bound     : 0,
      upper_bound     : 255,
      expected_type   : 'int',
      actual_type     : 'string',
      contract        : 'ensure',
      bound           : 100_000,
      source_location : a_location,
    });
    expect(e.kind).toBe('overflow');
    expect(e.entity).toBe('count');
    expect(e.index).toBe(5);
    expect(e.length).toBe(3);
    expect(e.value).toBe(256);
    expect(e.lower_bound).toBe(0);
    expect(e.upper_bound).toBe(255);
    expect(e.expected_type).toBe('int');
    expect(e.actual_type).toBe('string');
    expect(e.contract).toBe('ensure');
    expect(e.bound).toBe(100_000);
    expect(e.source_location).toBe(a_location);
  });


  test('leaves unsupplied structured fields undefined', () => {
    const e = new FslError('div_by_zero', 'division by zero');
    expect(e.index).toBe(undefined);
    expect(e.length).toBe(undefined);
    expect(e.value).toBe(undefined);
    expect(e.lower_bound).toBe(undefined);
    expect(e.upper_bound).toBe(undefined);
    expect(e.expected_type).toBe(undefined);
    expect(e.actual_type).toBe(undefined);
    expect(e.contract).toBe(undefined);
    expect(e.bound).toBe(undefined);
    expect(e.source_location).toBe(undefined);
  });


  test('is throwable and catchable with its kind intact', () => {
    let caught: unknown;
    try { throw new FslError('contract_violation', 'contract violated', { contract: 'invariant' }); }
    catch (error) { caught = error; }
    expect(caught instanceof FslError).toBe(true);
    expect((caught as FslError).kind).toBe('contract_violation');
  });


});





describe('per-kind constructors', () => {


  test('div_by_zero_error names the offending entity', () => {
    const e = div_by_zero_error('rate');
    expect(e.kind).toBe('div_by_zero');
    expect(e.entity).toBe('rate');
    expect(e.message).toBe('div_by_zero: division by zero (entity "rate")');
  });


  test('div_by_zero_error works with no entity and carries a source location', () => {
    const e = div_by_zero_error(undefined, a_location);
    expect(e.message).toBe('div_by_zero: division by zero');
    expect(e.source_location).toBe(a_location);
  });


  test('out_of_bounds_error names container, index, and length', () => {
    const e = out_of_bounds_error('items', 5, 3, a_location);
    expect(e.kind).toBe('out_of_bounds');
    expect(e.entity).toBe('items');
    expect(e.index).toBe(5);
    expect(e.length).toBe(3);
    expect(e.source_location).toBe(a_location);
    expect(e.message).toBe('out_of_bounds: index out of bounds (entity "items", index 5, length 3)');
  });


  test('overflow_error names value and upper bound', () => {
    const e = overflow_error('count', 256, 255, a_location);
    expect(e.kind).toBe('overflow');
    expect(e.value).toBe(256);
    expect(e.upper_bound).toBe(255);
    expect(e.source_location).toBe(a_location);
    expect(e.message).toBe('overflow: numeric overflow (entity "count", value 256, max 255)');
  });


  test('underflow_error names value and lower bound', () => {
    const e = underflow_error('balance', -1, 0, a_location);
    expect(e.kind).toBe('underflow');
    expect(e.value).toBe(-1);
    expect(e.lower_bound).toBe(0);
    expect(e.source_location).toBe(a_location);
    expect(e.message).toBe('underflow: numeric underflow (entity "balance", value -1, min 0)');
  });


  test('type_error names expected and actual types', () => {
    const e = type_error('int', 'string', 'x', a_location);
    expect(e.kind).toBe('type_error');
    expect(e.expected_type).toBe('int');
    expect(e.actual_type).toBe('string');
    expect(e.entity).toBe('x');
    expect(e.source_location).toBe(a_location);
    expect(e.message).toBe('type_error: type mismatch (entity "x", expected int, actual string)');
  });


  test('type_error works without a named entity', () => {
    const e = type_error('int', 'string');
    expect(e.entity).toBe(undefined);
    expect(e.message).toBe('type_error: type mismatch (expected int, actual string)');
  });


  test('failed_narrow_error names expected and actual variants', () => {
    const e = failed_narrow_error('some', 'none', 'lookup', a_location);
    expect(e.kind).toBe('failed_narrow');
    expect(e.expected_type).toBe('some');
    expect(e.actual_type).toBe('none');
    expect(e.entity).toBe('lookup');
    expect(e.source_location).toBe(a_location);
    expect(e.message).toBe('failed_narrow: narrowing failed (entity "lookup", expected some, actual none)');
  });


  test('failed_narrow_error works without a named scrutinee', () => {
    const e = failed_narrow_error('some', 'none');
    expect(e.entity).toBe(undefined);
    expect(e.message).toBe('failed_narrow: narrowing failed (expected some, actual none)');
  });


  test('contract_violation_error names which obligation broke', () => {
    const kinds: FslContractKind[] = ['require', 'ensure', 'invariant'];
    for (const k of kinds) {
      const e = contract_violation_error(k, 'nonempty', a_location);
      expect(e.kind).toBe('contract_violation');
      expect(e.contract).toBe(k);
      expect(e.entity).toBe('nonempty');
      expect(e.source_location).toBe(a_location);
      expect(e.message).toBe(`contract_violation: contract violated (entity "nonempty", contract ${k})`);
    }
  });


  test('unbound_value_error names the unbound slot', () => {
    const e = unbound_value_error('verified', a_location);
    expect(e.kind).toBe('unbound_value');
    expect(e.entity).toBe('verified');
    expect(e.source_location).toBe(a_location);
    expect(e.message).toBe('unbound_value: value is unbound (entity "verified")');
  });


  test('nan_compare_error names the NaN operand', () => {
    const e = nan_compare_error('ratio', a_location);
    expect(e.kind).toBe('nan_compare');
    expect(e.entity).toBe('ratio');
    expect(e.source_location).toBe(a_location);
    expect(e.message).toBe('nan_compare: ordering comparison against NaN (entity "ratio")');
  });


  test('nan_compare_error works with no named operand', () => {
    const e = nan_compare_error();
    expect(e.entity).toBe(undefined);
    expect(e.message).toBe('nan_compare: ordering comparison against NaN');
  });


  test('microstep_overflow_error names the bound it hit', () => {
    const e = microstep_overflow_error(100_000, a_location);
    expect(e.kind).toBe('microstep_overflow');
    expect(e.bound).toBe(100_000);
    expect(e.source_location).toBe(a_location);
    expect(e.message).toBe('microstep_overflow: microstep bound exceeded (bound 100000)');
  });


  test('every constructor produces a kind that is a member of the taxonomy', () => {
    const all: FslError[] = [
      div_by_zero_error(),
      out_of_bounds_error('a', 0, 0),
      overflow_error('a', 0, 0),
      underflow_error('a', 0, 0),
      type_error('a', 'b'),
      failed_narrow_error('a', 'b'),
      contract_violation_error('require', 'a'),
      unbound_value_error('a'),
      nan_compare_error(),
      microstep_overflow_error(0),
    ];
    const produced: FslErrorKind[] = all.map(e => e.kind);
    expect(new Set(produced)).toEqual(new Set(fsl_error_kinds));
  });


});
