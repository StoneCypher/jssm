
/*******
 *
 *  Versioned physical-constants library for FSL (§4.5 of the v6 megaspec).
 *
 *  The units *library* (definitions, mostly exact/stable) is deliberately
 *  *distinct from* this versioned physical-*constants* library: values such
 *  as `c`, `h`, and `G` are **measured** quantities tied to a particular
 *  CODATA adjustment, and so they carry a publication `year` and a measured
 *  `uncertainty`.  Pinning constants to a CODATA year keeps a machine that
 *  computes with them reproducible even as later adjustments shift the
 *  recommended values.
 *
 *  This is a self-contained, typed data module.  Each constant is keyed by a
 *  short symbolic name (`c`, `h`, `hbar`, `e`, `k_B`, `N_A`, `G`, …) and
 *  carries its numeric `value`, its `unit` (a plain string for now — the
 *  dimensioned-units layer of T12 is a separate work item), its absolute
 *  `uncertainty` in the same unit (`0` for exact/SI-defined constants), and
 *  the `codata_year` of the adjustment it was taken from.
 *
 */


/*******
 *
 *  The CODATA adjustment year that every constant in this module is taken
 *  from.  Exposed as a module-level version tag so downstream code can pin,
 *  display, or assert which recommended-value set it is computing against.
 *
 *  ```typescript
 *  CODATA_YEAR;  // 2018
 *  ```
 *
 */

const CODATA_YEAR = 2018 as const;


/*******
 *
 *  A human-readable version tag for this constants library, combining the
 *  source body (CODATA) with the adjustment {@link CODATA_YEAR}.  Useful for
 *  provenance lines in serialized machine state or diagnostics.
 *
 *  ```typescript
 *  CONSTANTS_VERSION;  // 'CODATA 2018'
 *  ```
 *
 *  @see CODATA_YEAR
 *
 */

const CONSTANTS_VERSION = `CODATA ${CODATA_YEAR}` as const;


/*******
 *
 *  A single physical constant: its measured (or defined) numeric `value`,
 *  the `unit` that value is expressed in (a string until the dimensioned
 *  units layer lands), the absolute `uncertainty` in that same unit, the
 *  CODATA adjustment `codata_year` it was sourced from, and a short
 *  human-readable `name`.
 *
 *  An `uncertainty` of exactly `0` marks an **exact** constant — one fixed by
 *  definition in the SI (for example the speed of light or the Avogadro
 *  constant since the 2019 SI redefinition), as opposed to a measured one.
 *
 *  ```typescript
 *  const c: PhysicalConstant = {
 *    name        : 'speed of light in vacuum',
 *    value       : 299_792_458,
 *    unit        : 'm s^-1',
 *    uncertainty : 0,
 *    codata_year : 2018
 *  };
 *  ```
 *
 *  @see PHYSICAL_CONSTANTS
 *
 */

type PhysicalConstant = {
  readonly name        : string;
  readonly value       : number;
  readonly unit        : string;
  readonly uncertainty : number;
  readonly codata_year : number;
};


/*******
 *
 *  Helper that stamps a partial constant definition with this module's
 *  {@link CODATA_YEAR}, so the individual entries below stay terse and the
 *  year cannot drift entry-to-entry.
 *
 *  ```typescript
 *  define('speed of light in vacuum', 299_792_458, 'm s^-1', 0);
 *  // { name: 'speed of light in vacuum', value: 299792458, unit: 'm s^-1', uncertainty: 0, codata_year: 2018 }
 *  ```
 *
 *  @param name        - Human-readable constant name.
 *  @param value       - The recommended numeric value.
 *  @param unit        - The unit string the value is expressed in.
 *  @param uncertainty - Absolute standard uncertainty in the same unit; `0`
 *                       for exact/SI-defined constants.
 *
 *  @returns A fully populated {@link PhysicalConstant}.
 *
 */

function define(name: string, value: number, unit: string, uncertainty: number): PhysicalConstant {
  return { name, value, unit, uncertainty, codata_year: CODATA_YEAR };
}


/*******
 *
 *  The well-known CODATA 2018 physical constants, keyed by short symbolic
 *  name.  Values and standard uncertainties are the CODATA 2018 recommended
 *  values; SI-defined constants carry an `uncertainty` of `0`.
 *
 *  ```typescript
 *  PHYSICAL_CONSTANTS.c.value;        // 299792458
 *  PHYSICAL_CONSTANTS.h.unit;         // 'J Hz^-1'
 *  PHYSICAL_CONSTANTS.G.uncertainty;  // 0.00000015e-11
 *  ```
 *
 *  @see PhysicalConstant
 *  @see lookup_constant
 *
 */

const PHYSICAL_CONSTANTS = {

  // Exact / SI-defined constants (uncertainty 0)
  c    : define('speed of light in vacuum',           299_792_458,            'm s^-1',       0),
  h    : define('Planck constant',                     6.626_070_15e-34,       'J Hz^-1',      0),
  hbar : define('reduced Planck constant',             1.054_571_817e-34,      'J s',          0),
  e    : define('elementary charge',                   1.602_176_634e-19,      'C',            0),
  k_B  : define('Boltzmann constant',                  1.380_649e-23,          'J K^-1',       0),
  N_A  : define('Avogadro constant',                   6.022_140_76e23,        'mol^-1',       0),

  // Measured constants (nonzero standard uncertainty)
  G    : define('Newtonian constant of gravitation',   6.674_30e-11,           'm^3 kg^-1 s^-2', 0.000_15e-11),
  m_e  : define('electron mass',                       9.109_383_7015e-31,     'kg',           0.000_000_0028e-31),
  m_p  : define('proton mass',                         1.672_621_923_69e-27,   'kg',           0.000_000_000_51e-27),
  m_n  : define('neutron mass',                        1.674_927_498_04e-27,   'kg',           0.000_000_000_95e-27),
  alpha: define('fine-structure constant',             7.297_352_5693e-3,      '',             0.000_000_0011e-3),
  R    : define('molar gas constant',                  8.314_462_618,          'J mol^-1 K^-1', 0),
  eps0 : define('vacuum electric permittivity',        8.854_187_8128e-12,     'F m^-1',       0.000_000_0013e-12),
  mu0  : define('vacuum magnetic permeability',        1.256_637_062_12e-6,    'N A^-2',       0.000_000_000_19e-6),
  g_n  : define('standard acceleration of gravity',    9.806_65,               'm s^-2',       0),

} as const;


/*******
 *
 *  Every symbolic key registered in {@link PHYSICAL_CONSTANTS}.
 *
 *  ```typescript
 *  const k: ConstantName = 'c';
 *  ```
 *
 */

type ConstantName = keyof typeof PHYSICAL_CONSTANTS;


/*******
 *
 *  Error raised by {@link lookup_constant} when asked for a symbol that is
 *  not present in this library.  A dedicated type keeps the constants module
 *  self-contained (no machine context required) while still letting callers
 *  discriminate the miss path with `instanceof`.
 *
 *  ```typescript
 *  try {
 *    lookup_constant('nope');
 *  } catch (e) {
 *    e instanceof UnknownConstantError;  // true
 *  }
 *  ```
 *
 *  @param symbol - The unknown symbol that was requested.
 *
 */

class UnknownConstantError extends Error {

  readonly symbol : string;

  constructor(symbol: string) {
    super(`unknown physical constant "${symbol}" (not in ${CONSTANTS_VERSION})`);
    this.name   = 'UnknownConstantError';
    this.symbol = symbol;
  }

}


/*******
 *
 *  Looks up a physical constant by its short symbolic name.
 *
 *  ```typescript
 *  lookup_constant('c').value;   // 299792458
 *  lookup_constant('k_B').unit;  // 'J K^-1'
 *  ```
 *
 *  @param symbol - The short symbolic name of the constant (`'c'`, `'h'`,
 *                  `'k_B'`, …).
 *
 *  @returns The matching {@link PhysicalConstant}.
 *
 *  @throws {UnknownConstantError} If no constant is registered under `symbol`.
 *
 *  @see PHYSICAL_CONSTANTS
 *
 */

function lookup_constant(symbol: string): PhysicalConstant {

  if (Object.prototype.hasOwnProperty.call(PHYSICAL_CONSTANTS, symbol)) {
    return PHYSICAL_CONSTANTS[symbol as ConstantName];
  }

  throw new UnknownConstantError(symbol);

}


export {
  CODATA_YEAR,
  CONSTANTS_VERSION,
  PHYSICAL_CONSTANTS,
  lookup_constant,
  UnknownConstantError
};

export type {
  PhysicalConstant,
  ConstantName
};
