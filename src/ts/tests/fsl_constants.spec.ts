
import {
  physical_constant,
  known_physical_constant,
  physical_constant_symbols,
  supported_codata_years,
  ascending_year_order,
  physical_constants_by_year,
  latest_codata_year,
  lookup_constant,
  UnknownConstantError,
  CONSTANTS_VERSION
} from '../fsl_constants';

import type {
  PhysicalConstant,
  PhysicalConstantSymbol,
  CodataYear
} from '../fsl_constants';




/* The complete set of symbols this library should expose, used to drive the
   data-shape checks below.  Kept here (not imported) so the test fails loudly
   if the source table silently changes shape. */

const expected_symbols: ReadonlyArray<PhysicalConstantSymbol> = [
  'c', 'G', 'h', 'hbar', 'e', 'k', 'NA', 'R',
  'me', 'mp', 'mn', 'alpha', 'epsilon0', 'mu0', 'sigma', 'F', 'g_n'
];




describe('ascending_year_order', () => {

  test('orders an earlier year before a later one', () => {
    expect(ascending_year_order(2018 as CodataYear, 2022 as CodataYear)).toBeLessThan(0);
  });

  test('orders a later year after an earlier one', () => {
    expect(ascending_year_order(2022 as CodataYear, 2018 as CodataYear)).toBeGreaterThan(0);
  });

  test('treats equal years as equal', () => {
    expect(ascending_year_order(2018, 2018)).toBe(0);
  });

  test('sorts a multi-year list ascending', () => {
    const years = [2022, 2018, 2020] as CodataYear[];
    expect([...years].sort(ascending_year_order)).toEqual([2018, 2020, 2022]);
  });

});




describe('supported_codata_years', () => {

  test('returns the supported years ascending', () => {
    expect(supported_codata_years()).toEqual([2018]);
  });

  test('is consistent with the by-year table keys', () => {
    const table_years = Object.keys(physical_constants_by_year).map(Number);
    expect([...supported_codata_years()].sort((a, b) => a - b)).toEqual(table_years.sort((a, b) => a - b));
  });

  test('includes the latest year', () => {
    expect(supported_codata_years()).toContain(latest_codata_year);
  });

});




describe('latest_codata_year', () => {

  test('is 2018', () => {
    expect(latest_codata_year).toBe(2018);
  });

});




describe('physical_constant_symbols', () => {

  test('lists every expected symbol for the latest year (default arg)', () => {
    const got = physical_constant_symbols();
    expect([...got].sort()).toEqual([...expected_symbols].sort());
  });

  test('lists every expected symbol for an explicit year', () => {
    const got = physical_constant_symbols(2018);
    expect([...got].sort()).toEqual([...expected_symbols].sort());
  });

  test('returns 17 symbols for 2018', () => {
    expect(physical_constant_symbols(2018).length).toBe(17);
  });

});




describe('known_physical_constant', () => {

  test('is true for a defined symbol (default year)', () => {
    expect(known_physical_constant('c')).toBe(true);
  });

  test('is true for a defined symbol (explicit year)', () => {
    expect(known_physical_constant('h', 2018)).toBe(true);
  });

  test('is true for every expected symbol', () => {
    for (const sym of expected_symbols) {
      expect(known_physical_constant(sym)).toBe(true);
    }
  });

  test('is false for an unsupported year', () => {
    // a year the union does not actually carry; cast exercises the missing-table branch
    expect(known_physical_constant('c', 1999 as CodataYear)).toBe(false);
  });

  test('is false for a symbol that is not an own property', () => {
    // 'toString' lives on Object.prototype but is not an own key of the table
    expect(known_physical_constant('toString' as PhysicalConstantSymbol)).toBe(false);
  });

});




describe('physical_constant', () => {

  test('reads the speed of light by default', () => {
    const c = physical_constant('c');
    expect(c.value).toBe(299792458);
    expect(c.unit).toBe('m s^-1');
    expect(c.uncertainty).toBe(0);
    expect(c.codata_year).toBe(2018);
  });

  test('reads a constant with a pinned year', () => {
    const g = physical_constant('G', 2018);
    expect(g.value).toBe(6.67430e-11);
    expect(g.uncertainty).toBe(1.5e-15);
    expect(g.unit).toBe('m^3 kg^-1 s^-2');
  });

  test('throws RangeError for an unsupported year', () => {
    expect(() => physical_constant('c', 1999 as CodataYear)).toThrow(RangeError);
    expect(() => physical_constant('c', 1999 as CodataYear)).toThrow(/unsupported CODATA year/);
  });

  test('throws RangeError for an unknown symbol', () => {
    expect(() => physical_constant('toString' as PhysicalConstantSymbol)).toThrow(RangeError);
    expect(() => physical_constant('toString' as PhysicalConstantSymbol)).toThrow(/unknown physical constant/);
  });

  test('agrees with the underlying table', () => {
    for (const sym of expected_symbols) {
      expect(physical_constant(sym)).toBe(physical_constants_by_year[2018][sym]);
    }
  });

});




describe('PhysicalConstant record shape', () => {

  const all: ReadonlyArray<[PhysicalConstantSymbol, PhysicalConstant]> =
    expected_symbols.map(sym => [sym, physical_constant(sym)]);

  test.each(all)('"%s" has a finite numeric value', (_sym, k) => {
    expect(Number.isFinite(k.value)).toBe(true);
  });

  test.each(all)('"%s" has a non-negative uncertainty', (_sym, k) => {
    expect(k.uncertainty).toBeGreaterThanOrEqual(0);
  });

  test.each(all)('"%s" has a non-empty SI unit string', (_sym, k) => {
    expect(typeof k.unit).toBe('string');
    expect(k.unit.length).toBeGreaterThan(0);
  });

  test.each(all)('"%s" reports the year it was read from', (_sym, k) => {
    expect(k.codata_year).toBe(2018);
  });

});




describe('exactness of SI-redefined constants', () => {

  // Since the 2019 SI redefinition these are exact: zero standard uncertainty.
  const exact: ReadonlyArray<PhysicalConstantSymbol> = ['c', 'h', 'e', 'k', 'NA'];

  test.each(exact)('"%s" has zero uncertainty', (sym) => {
    expect(physical_constant(sym).uncertainty).toBe(0);
  });

});




describe('immutability', () => {

  test('the by-year table is frozen', () => {
    expect(Object.isFrozen(physical_constants_by_year)).toBe(true);
  });

  test('a year table is frozen', () => {
    expect(Object.isFrozen(physical_constants_by_year[2018])).toBe(true);
  });

  test('a returned record is frozen', () => {
    expect(Object.isFrozen(physical_constant('c'))).toBe(true);
  });

});




describe('PhysicalConstant name field', () => {

  test.each([...expected_symbols])('"%s" has a non-empty name', (sym) => {
    const k = physical_constant(sym);
    expect(typeof k.name).toBe('string');
    expect(k.name.length).toBeGreaterThan(0);
  });

  test('c is named the speed of light in vacuum', () => {
    expect(physical_constant('c').name).toBe('speed of light in vacuum');
  });

});




describe('g_n (standard acceleration of gravity)', () => {

  test('is registered as a symbol', () => {
    expect(physical_constant_symbols()).toContain('g_n');
    expect(known_physical_constant('g_n')).toBe(true);
  });

  test('has the exact standard-gravity value and is exact', () => {
    const g = physical_constant('g_n');
    expect(g.value).toBe(9.80665);
    expect(g.unit).toBe('m s^-2');
    expect(g.uncertainty).toBe(0);
    expect(g.name).toBe('standard acceleration of gravity');
  });

});




describe('CONSTANTS_VERSION', () => {

  test('is the labeled CODATA tag for the latest year', () => {
    expect(CONSTANTS_VERSION).toBe('CODATA 2018');
  });

  test('embeds the latest CODATA year', () => {
    expect(CONSTANTS_VERSION).toContain(String(latest_codata_year));
  });

});




describe('lookup_constant', () => {

  test('hit: returns the registered constant by symbol', () => {
    const c = lookup_constant('c');
    expect(c.value).toBe(299792458);
    expect(c.name).toBe('speed of light in vacuum');
    expect(c).toBe(physical_constants_by_year[latest_codata_year].c);
  });

  test('hit: resolves a measured constant too', () => {
    expect(lookup_constant('G').uncertainty).toBeGreaterThan(0);
  });

  test('hit: agrees with physical_constant for every symbol', () => {
    for (const sym of expected_symbols) {
      expect(lookup_constant(sym)).toBe(physical_constant(sym));
    }
  });

  test('miss: throws UnknownConstantError', () => {
    expect(() => lookup_constant('does_not_exist')).toThrow(UnknownConstantError);
  });

  test('miss: message names the missing symbol', () => {
    expect(() => lookup_constant('nope')).toThrow('unknown physical constant "nope"');
  });

  test('miss: carries the offending symbol field and name', () => {
    try {
      lookup_constant('zzz');
      throw new Error('lookup_constant should have thrown');
    } catch (e) {
      expect(e instanceof UnknownConstantError).toBe(true);
      expect((e as UnknownConstantError).symbol).toBe('zzz');
      expect((e as UnknownConstantError).name).toBe('UnknownConstantError');
    }
  });

  test('miss: inherited Object property names are not constants', () => {
    expect(() => lookup_constant('toString')).toThrow(UnknownConstantError);
    expect(() => lookup_constant('hasOwnProperty')).toThrow(UnknownConstantError);
  });

});
