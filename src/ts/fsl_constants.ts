
/*******
 *
 *  Versioned physical-constants library for FSL — the home for CODATA
 *  values such as `c`, `G`, and `h`.  This is deliberately separate from the
 *  units-of-measure layer (§4.5 of the FSL megaspec): the *units* library
 *  holds definitions that are mostly exact and stable, while the constants
 *  here are *measured* quantities sourced from CODATA, each carrying a
 *  standard uncertainty and the CODATA adjustment year it came from.
 *
 *  Every constant is a {@link PhysicalConstant} record: a numeric `value`,
 *  an SI `unit` string, a standard `uncertainty` (`0` for constants that are
 *  exact by SI definition since the 2019 redefinition), and the `codata_year`
 *  the figure is drawn from.  Constants are grouped by CODATA adjustment year
 *  in {@link physical_constants_by_year}; the latest supported year is
 *  {@link latest_codata_year}.
 *
 *  The lookup API is typed and versioned: {@link physical_constant} reads a
 *  single constant (latest year by default, or a pinned year), while
 *  {@link known_physical_constant}, {@link physical_constant_symbols}, and
 *  {@link supported_codata_years} let callers introspect what is available
 *  without throwing.
 *
 *  @see physical_constant
 *  @see known_physical_constant
 *  @see PhysicalConstant
 *
 */




/*******
 *
 *  A single measured physical constant, as published by a CODATA adjustment.
 *
 *  Fields are intentionally minimal and host-agnostic so the record
 *  serializes cleanly (numbers and strings only): `value` is the recommended
 *  magnitude in the stated SI `unit`; `uncertainty` is the one-sigma standard
 *  uncertainty in the same unit (`0` when the constant is exact by SI
 *  definition); `codata_year` records the adjustment the figure came from.
 *
 *  @see physical_constant
 *
 */

type PhysicalConstant = Readonly<{

  /** Recommended magnitude of the constant, expressed in `unit`. */
  value       : number;

  /** SI unit string the `value` and `uncertainty` are expressed in. */
  unit        : string;

  /**
   *  One-sigma standard uncertainty of `value`, in the same `unit`.  `0`
   *  marks a constant that is exact by SI definition (no measurement error).
   */
  uncertainty : number;

  /** CODATA adjustment year the figure is drawn from (e.g. `2018`). */
  codata_year : CodataYear;

}>;


/**
 *  The set of CODATA adjustment years this library ships data for.  Adding a
 *  new adjustment means extending this union and {@link physical_constants_by_year}
 *  together, which keeps the typed lookup API honest about what exists.
 */
type CodataYear = 2018;


/**
 *  The canonical short symbols this library recognizes — the keys of the
 *  per-year constant tables.  Used as the argument type of the lookup
 *  accessors so a typo in a symbol is a compile-time error rather than a
 *  runtime `undefined`.
 */
type PhysicalConstantSymbol =
  | 'c'        // speed of light in vacuum
  | 'G'        // Newtonian constant of gravitation
  | 'h'        // Planck constant
  | 'hbar'     // reduced Planck constant
  | 'e'        // elementary charge
  | 'k'        // Boltzmann constant
  | 'NA'       // Avogadro constant
  | 'R'        // molar gas constant
  | 'me'       // electron mass
  | 'mp'       // proton mass
  | 'mn'       // neutron mass
  | 'alpha'    // fine-structure constant
  | 'epsilon0' // vacuum electric permittivity
  | 'mu0'      // vacuum magnetic permeability
  | 'sigma'    // Stefan-Boltzmann constant
  | 'F';       // Faraday constant




/*******
 *
 *  CODATA 2018 recommended values.
 *
 *  The four constants that became exact in the 2019 SI redefinition — `c`,
 *  `h`, `e`, and `k` — carry an `uncertainty` of `0`; the remainder retain
 *  their published standard uncertainties.  Figures follow the CODATA 2018
 *  internationally recommended values.
 *
 */

const codata_2018: Readonly<Record<PhysicalConstantSymbol, PhysicalConstant>> = Object.freeze({

  c:        Object.freeze({ value: 299792458,             unit: 'm s^-1',         uncertainty: 0,            codata_year: 2018 }),
  G:        Object.freeze({ value: 6.67430e-11,           unit: 'm^3 kg^-1 s^-2', uncertainty: 1.5e-15,      codata_year: 2018 }),
  h:        Object.freeze({ value: 6.62607015e-34,        unit: 'J Hz^-1',        uncertainty: 0,            codata_year: 2018 }),
  hbar:     Object.freeze({ value: 1.054571817e-34,       unit: 'J s',            uncertainty: 0,            codata_year: 2018 }),
  e:        Object.freeze({ value: 1.602176634e-19,       unit: 'C',              uncertainty: 0,            codata_year: 2018 }),
  k:        Object.freeze({ value: 1.380649e-23,          unit: 'J K^-1',         uncertainty: 0,            codata_year: 2018 }),
  NA:       Object.freeze({ value: 6.02214076e23,         unit: 'mol^-1',         uncertainty: 0,            codata_year: 2018 }),
  R:        Object.freeze({ value: 8.314462618,           unit: 'J mol^-1 K^-1',  uncertainty: 0,            codata_year: 2018 }),
  me:       Object.freeze({ value: 9.1093837015e-31,      unit: 'kg',             uncertainty: 2.8e-40,      codata_year: 2018 }),
  mp:       Object.freeze({ value: 1.67262192369e-27,     unit: 'kg',             uncertainty: 5.1e-37,      codata_year: 2018 }),
  mn:       Object.freeze({ value: 1.67492749804e-27,     unit: 'kg',             uncertainty: 9.5e-37,      codata_year: 2018 }),
  alpha:    Object.freeze({ value: 7.2973525693e-3,       unit: '1',              uncertainty: 1.1e-12,      codata_year: 2018 }),
  epsilon0: Object.freeze({ value: 8.8541878128e-12,      unit: 'F m^-1',         uncertainty: 1.3e-21,      codata_year: 2018 }),
  mu0:      Object.freeze({ value: 1.25663706212e-6,      unit: 'N A^-2',         uncertainty: 1.9e-16,      codata_year: 2018 }),
  sigma:    Object.freeze({ value: 5.670374419e-8,        unit: 'W m^-2 K^-4',    uncertainty: 0,            codata_year: 2018 }),
  F:        Object.freeze({ value: 96485.33212,           unit: 'C mol^-1',       uncertainty: 0,            codata_year: 2018 })

});


/**
 *  Every supported CODATA adjustment, keyed by year.  The single source of
 *  truth the lookup accessors read; extend this (and {@link CodataYear}) to
 *  add another adjustment.
 *
 *  @example
 *  import { physical_constants_by_year } from 'jssm';
 *  physical_constants_by_year[2018].c.value;  // => 299792458
 */
const physical_constants_by_year: Readonly<Record<CodataYear, Readonly<Record<PhysicalConstantSymbol, PhysicalConstant>>>> =
  Object.freeze({
    2018: codata_2018
  });


/**
 *  The most recent CODATA adjustment year this library ships, and the default
 *  year {@link physical_constant} reads when no year is pinned.
 *
 *  @example
 *  import { latest_codata_year } from 'jssm';
 *  latest_codata_year;  // => 2018
 */
const latest_codata_year: CodataYear = 2018;




/*******
 *
 *  Lookup API.
 *
 */

/**
 *  Numeric comparator that orders CODATA years ascending, for use as an
 *  `Array.prototype.sort` argument.  Pulled out as a named helper so the
 *  ordering rule is a directly testable unit rather than an inline closure
 *  that a single-element list would never exercise.
 *
 *  @param a - The left year.
 *  @param b - The right year.
 *  @returns A negative number when `a` precedes `b`, positive when it
 *           follows, `0` when they are equal.
 *
 *  @example
 *  import { ascending_year_order } from 'jssm';
 *  [2022, 2018].sort(ascending_year_order);  // => [2018, 2022]
 */
function ascending_year_order(a: CodataYear, b: CodataYear): number {
  return a - b;
}


/**
 *  List the CODATA adjustment years this library ships data for, ascending.
 *
 *  @returns The supported {@link CodataYear} values, lowest first.
 *
 *  @example
 *  import { supported_codata_years } from 'jssm';
 *  supported_codata_years();  // => [2018]
 */
function supported_codata_years(): ReadonlyArray<CodataYear> {
  return (Object.keys(physical_constants_by_year).map(Number) as CodataYear[])
    .sort(ascending_year_order);
}


/**
 *  List the constant symbols available for a given CODATA year (the latest
 *  year by default).
 *
 *  @param year - The {@link CodataYear} to enumerate; defaults to
 *                {@link latest_codata_year}.
 *  @returns The {@link PhysicalConstantSymbol} keys defined for that year.
 *
 *  @example
 *  import { physical_constant_symbols } from 'jssm';
 *  physical_constant_symbols().includes('c');  // => true
 *
 *  @example
 *  import { physical_constant_symbols } from 'jssm';
 *  physical_constant_symbols(2018).length;     // => 16
 */
function physical_constant_symbols(year: CodataYear = latest_codata_year): ReadonlyArray<PhysicalConstantSymbol> {
  return Object.keys(physical_constants_by_year[year]) as PhysicalConstantSymbol[];
}


/**
 *  Test whether a constant is defined for a given CODATA year without
 *  throwing — the non-throwing companion to {@link physical_constant}.
 *
 *  @param symbol - The {@link PhysicalConstantSymbol} to look for.
 *  @param year   - The {@link CodataYear} to look in; defaults to
 *                  {@link latest_codata_year}.
 *  @returns `true` when the year is supported and defines `symbol`.
 *
 *  @example
 *  import { known_physical_constant } from 'jssm';
 *  known_physical_constant('h');             // => true
 *
 *  @example
 *  import { known_physical_constant } from 'jssm';
 *  known_physical_constant('c', 1999 as 2018);  // => false  (unsupported year)
 */
function known_physical_constant(symbol: PhysicalConstantSymbol, year: CodataYear = latest_codata_year): boolean {
  const table = physical_constants_by_year[year];
  if (table === undefined) { return false; }
  return Object.prototype.hasOwnProperty.call(table, symbol);
}


/**
 *  Read a single physical constant — the primary, typed, versioned accessor.
 *
 *  Resolves `symbol` against the requested CODATA `year` (the latest year by
 *  default) and returns its full {@link PhysicalConstant} record (value, SI
 *  unit, standard uncertainty, and year).  Pin `year` for reproducible,
 *  version-stable reads; omit it to track the latest shipped adjustment.
 *
 *  @param symbol - The {@link PhysicalConstantSymbol} to read (e.g. `'c'`).
 *  @param year   - The {@link CodataYear} to read from; defaults to
 *                  {@link latest_codata_year}.
 *  @returns The {@link PhysicalConstant} record for `symbol` in `year`.
 *
 *  @throws {RangeError} When `year` is not a supported CODATA adjustment, or
 *                       when `symbol` is not defined for that year.
 *
 *  @example
 *  import { physical_constant } from 'jssm';
 *  physical_constant('c').value;   // => 299792458
 *  physical_constant('c').unit;    // => 'm s^-1'
 *
 *  @example
 *  import { physical_constant } from 'jssm';
 *  physical_constant('G', 2018).uncertainty;  // => 1.5e-15
 */
function physical_constant(symbol: PhysicalConstantSymbol, year: CodataYear = latest_codata_year): PhysicalConstant {

  const table = physical_constants_by_year[year];
  if (table === undefined) {
    throw new RangeError(`unsupported CODATA year ${year}; supported years are ${supported_codata_years().join(', ')}`);
  }

  if (!Object.prototype.hasOwnProperty.call(table, symbol)) {
    throw new RangeError(`unknown physical constant "${symbol}" for CODATA year ${year}`);
  }

  return table[symbol];
}




export {

  PhysicalConstant,
  CodataYear,
  PhysicalConstantSymbol,

  physical_constants_by_year,
  latest_codata_year,

  ascending_year_order,
  supported_codata_years,
  physical_constant_symbols,
  known_physical_constant,
  physical_constant,

};
