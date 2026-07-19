/*******
 *
 *  Versioned physical-constants library for FSL — the home for CODATA
 *  values such as `c`, `G`, and `h`.  This is deliberately separate from the
 *  units-of-measure layer (§4.5 of the FSL megaspec): the *units* library
 *  holds definitions that are mostly exact and stable, while the constants
 *  here are *measured* quantities sourced from CODATA, each carrying a
 *  standard uncertainty and the CODATA adjustment year it came from.
 *
 *  Every constant is a {@link PhysicalConstant} record: a human-readable
 *  `name`, a numeric `value`, an SI `unit` string, a standard `uncertainty` (`0` for constants that are
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
 *  serializes cleanly (numbers and strings only): `name` is a human-readable
 *  label; `value` is the recommended magnitude in the stated SI `unit`; `uncertainty` is the one-sigma standard
 *  uncertainty in the same unit (`0` when the constant is exact by SI
 *  definition); `codata_year` records the adjustment the figure came from.
 *
 *  @see physical_constant
 *
 */
type PhysicalConstant = Readonly<{
    /** Human-readable name of the constant (e.g. `'speed of light in vacuum'`). */
    name: string;
    /** Recommended magnitude of the constant, expressed in `unit`. */
    value: number;
    /** SI unit string the `value` and `uncertainty` are expressed in. */
    unit: string;
    /**
     *  One-sigma standard uncertainty of `value`, in the same `unit`.  `0`
     *  marks a constant that is exact by SI definition (no measurement error).
     */
    uncertainty: number;
    /** CODATA adjustment year the figure is drawn from (e.g. `2018`). */
    codata_year: CodataYear;
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
type PhysicalConstantSymbol = 'c' | 'G' | 'h' | 'hbar' | 'e' | 'k' | 'NA' | 'R' | 'me' | 'mp' | 'mn' | 'alpha' | 'epsilon0' | 'mu0' | 'sigma' | 'F' | 'g_n';
/**
 *  Every supported CODATA adjustment, keyed by year.  The single source of
 *  truth the lookup accessors read; extend this (and {@link CodataYear}) to
 *  add another adjustment.
 *  @example
 *  import { physical_constants_by_year } from 'jssm';
 *  physical_constants_by_year[2018].c.value;  // => 299792458
 */
declare const physical_constants_by_year: Readonly<Record<CodataYear, Readonly<Record<PhysicalConstantSymbol, PhysicalConstant>>>>;
/**
 *  The most recent CODATA adjustment year this library ships, and the default
 *  year {@link physical_constant} reads when no year is pinned.
 *  @example
 *  import { latest_codata_year } from 'jssm';
 *  latest_codata_year;  // => 2018
 */
declare const latest_codata_year: CodataYear;
/**
 *  A human-readable provenance tag for this constants library — the source
 *  body (`CODATA`) joined with {@link latest_codata_year}.  Handy for
 *  provenance lines in serialized machine state or diagnostics.
 *  @example
 *  import { CONSTANTS_VERSION } from 'jssm';
 *  CONSTANTS_VERSION;  // => 'CODATA 2018'
 */
declare const CONSTANTS_VERSION: string;
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
 *  @param a - The left year.
 *  @param b - The right year.
 *  @returns A negative number when `a` precedes `b`, positive when it
 *           follows, `0` when they are equal.
 *  @example
 *  import { ascending_year_order } from 'jssm';
 *  [2022, 2018].sort(ascending_year_order);  // => [2018, 2022]
 */
declare function ascending_year_order(a: CodataYear, b: CodataYear): number;
/**
 *  List the CODATA adjustment years this library ships data for, ascending.
 *  @returns The supported {@link CodataYear} values, lowest first.
 *  @example
 *  import { supported_codata_years } from 'jssm';
 *  supported_codata_years();  // => [2018]
 */
declare function supported_codata_years(): ReadonlyArray<CodataYear>;
/**
 *  List the constant symbols available for a given CODATA year (the latest
 *  year by default).
 *  @param year - The {@link CodataYear} to enumerate; defaults to
 *                {@link latest_codata_year}.
 *  @returns The {@link PhysicalConstantSymbol} keys defined for that year.
 *  @example
 *  import { physical_constant_symbols } from 'jssm';
 *  physical_constant_symbols().includes('c');  // => true
 *  @example
 *  import { physical_constant_symbols } from 'jssm';
 *  physical_constant_symbols(2018).length;     // => 17
 */
declare function physical_constant_symbols(year?: CodataYear): ReadonlyArray<PhysicalConstantSymbol>;
/**
 *  Test whether a constant is defined for a given CODATA year without
 *  throwing — the non-throwing companion to {@link physical_constant}.
 *  @param symbol - The {@link PhysicalConstantSymbol} to look for.
 *  @param year   - The {@link CodataYear} to look in; defaults to
 *                  {@link latest_codata_year}.
 *  @returns `true` when the year is supported and defines `symbol`.
 *  @example
 *  import { known_physical_constant } from 'jssm';
 *  known_physical_constant('h');             // => true
 *  @example
 *  import { known_physical_constant } from 'jssm';
 *  known_physical_constant('c', 1999 as 2018);  // => false  (unsupported year)
 */
declare function known_physical_constant(symbol: PhysicalConstantSymbol, year?: CodataYear): boolean;
/**
 *  Read a single physical constant — the primary, typed, versioned accessor.
 *
 *  Resolves `symbol` against the requested CODATA `year` (the latest year by
 *  default) and returns its full {@link PhysicalConstant} record (value, SI
 *  unit, standard uncertainty, and year).  Pin `year` for reproducible,
 *  version-stable reads; omit it to track the latest shipped adjustment.
 *  @param symbol - The {@link PhysicalConstantSymbol} to read (e.g. `'c'`).
 *  @param year   - The {@link CodataYear} to read from; defaults to
 *                  {@link latest_codata_year}.
 *  @returns The {@link PhysicalConstant} record for `symbol` in `year`.
 *  @throws {RangeError} When `year` is not a supported CODATA adjustment, or
 *                       when `symbol` is not defined for that year.
 *  @example
 *  import { physical_constant } from 'jssm';
 *  physical_constant('c').value;   // => 299792458
 *  physical_constant('c').unit;    // => 'm s^-1'
 *  @example
 *  import { physical_constant } from 'jssm';
 *  physical_constant('G', 2018).uncertainty;  // => 1.5e-15
 */
declare function physical_constant(symbol: PhysicalConstantSymbol, year?: CodataYear): PhysicalConstant;
/*******
 *
 *  Error thrown by {@link lookup_constant} when asked for a symbol that is not
 *  registered in this library.  A dedicated typed error — rather than the
 *  general {@link FslError} taxonomy — keeps the constants module
 *  self-contained (it needs no machine context and no taxonomy `kind`), while
 *  still letting callers discriminate the miss path with `instanceof` and read
 *  the offending `symbol` directly.  Follows the `fsl_errors` convention of
 *  setting `name` and naming the offending entity in the message.
 *
 *  @param symbol - The unknown symbol that was requested.
 *
 *  @example
 *  import { lookup_constant, UnknownConstantError } from 'jssm';
 *  try { lookup_constant('nope'); }
 *  catch (e) { e instanceof UnknownConstantError; }  // => true
 *
 */
declare class UnknownConstantError extends Error {
    /** The unrecognized symbol that was requested. */
    symbol: string;
    constructor(symbol: string);
}
/**
 *  String-tolerant lookup of a physical constant by symbol — the forgiving
 *  companion to {@link physical_constant}, for callsites that hold an
 *  untyped string (parser output, user input) rather than a statically-known
 *  {@link PhysicalConstantSymbol}.  Resolves against the latest CODATA year.
 *  @param symbol - The short symbol to read (e.g. `'c'`); any string is
 *                  accepted, and an unrecognized one throws.
 *  @returns The {@link PhysicalConstant} record for `symbol`.
 *  @throws {UnknownConstantError} When `symbol` is not a registered constant.
 *  @example
 *  import { lookup_constant } from 'jssm';
 *  lookup_constant('c').value;   // => 299792458
 *  lookup_constant('k').unit;    // => 'J K^-1'
 *  @see physical_constant
 *  @see UnknownConstantError
 */
declare function lookup_constant(symbol: string): PhysicalConstant;
export { PhysicalConstant, CodataYear, PhysicalConstantSymbol, physical_constants_by_year, latest_codata_year, CONSTANTS_VERSION, ascending_year_order, supported_codata_years, physical_constant_symbols, known_physical_constant, physical_constant, lookup_constant, UnknownConstantError, };
