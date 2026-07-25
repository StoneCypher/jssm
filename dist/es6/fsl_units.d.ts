/*******
 *
 *  FSL SI units prelude — a self-contained units-of-measure layer for the FSL
 *  numeric tower, per megaspec §4.5.
 *
 *  A dimensioned quantity carries a **dimension** — an exponent vector over the
 *  seven SI base dimensions (length, mass, time, electric current,
 *  thermodynamic temperature, amount of substance, luminous intensity) — as a
 *  TypeScript **phantom type**.  The dimension lives only in the type system: a
 *  {@link Quantity} stores nothing at runtime but the plain numeric magnitude
 *  in coherent base SI units (metres, kilograms, seconds, …).  This is the
 *  spec's *zero runtime cost* promise — a machine that never uses units
 *  compiles identically, and a machine that does pays at most a constant,
 *  compile-time-foldable conversion multiply.
 *
 *  What it ships:
 *    - the 7 SI **base units** (`metre`, `kilogram`, `second`, `ampere`,
 *      `kelvin`, `mole`, `candela`);
 *    - the SI **prefix system**, so `km`, `ms`, `μA`, `MHz`, … exist without a
 *      hand-written definition — define a base once and every prefix from `Y`
 *      (yotta) down to `y` (yocto) comes free via {@link scaled};
 *    - **derived units** through product ({@link mul}) and quotient
 *      ({@link div}) — `velocity = length / time`, `acceleration = velocity /
 *      time`, plus the named SI derived units (`hertz`, `newton`, `joule`,
 *      `watt`, `volt`, `ohm`, `pascal`, `coulomb`, `farad`, `siemens`);
 *    - **dimension tracking**: `+ - = < …` require matching dimensions, `* /`
 *      add/subtract the exponent vector, same-dimension `/` cancels to
 *      **dimensionless**;
 *    - **auto-convert within a dimension** (everything is stored in base units,
 *      so a `Quantity` declared in `km` and one declared in `m` add directly);
 *    - a **type error across dimensions** ({@link add}/{@link sub}/
 *      {@link compare} are generic over a single dimension `D`, so mixing
 *      incompatible dimensions fails to typecheck).
 *
 *  The opt-in `data`, `imperial`, `angle`, and `time` modules are present as
 *  stubs (see {@link data_module}, {@link imperial_module},
 *  {@link angle_module}, {@link time_module}) — the SI prelude ships, the rest
 *  is a deliberate, visible opt-in.
 *
 */
/*******
 *
 *  Identifiers of the seven SI base dimensions, in canonical order.  A
 *  {@link Dimension} is an exponent over exactly these seven slots.
 *
 */
declare const base_dimension_names: readonly ["length", "mass", "time", "current", "temperature", "amount", "luminosity"];
/**
 *  A single SI base dimension name (`'length'`, `'mass'`, …).  The literal
 *  union derived from {@link base_dimension_names}.
 */
type BaseDimensionName = (typeof base_dimension_names)[number];
/**
 *  The dimension of a quantity: an exponent vector over the seven SI base
 *  dimensions.  `length` 1 / `time` -1 is a velocity; an all-zero vector is
 *  **dimensionless**.  The runtime value is a frozen record; at the type level
 *  the specific exponents are what make two differently-dimensioned quantities
 *  fail to mix.
 */
type Dimension = Readonly<Record<BaseDimensionName, number>>;
/*******
 *
 *  Builds a {@link Dimension} from a partial exponent map, defaulting every
 *  unspecified base dimension to exponent `0`.  The dimensionless dimension is
 *  `make_dimension({})`.
 *
 *  ```typescript
 *  make_dimension({ length: 1, time: -1 });  // velocity: m·s⁻¹
 *  make_dimension({});                       // dimensionless
 *  ```
 *
 *  @param exponents - Partial map of base-dimension name to exponent; omitted
 *                     dimensions default to `0`.
 *
 *  @returns A frozen seven-slot exponent vector.
 *
 */
declare function make_dimension(exponents: Partial<Record<BaseDimensionName, number>>): Dimension;
/**
 *  The dimensionless dimension — every base exponent zero.  The result of
 *  cancelling like dimensions (`received / total`), and the dimension of pure
 *  numbers, ratios, and the `radian`/`steradian` SI supplementary units.
 */
declare const dimensionless: Dimension;
/*******
 *
 *  Structural (value) equality of two dimensions.  Two dimensions are equal
 *  exactly when every base exponent matches; this is the runtime guard behind
 *  the compile-time "matching dimensions" rule of {@link add}, {@link sub}, and
 *  {@link compare}.
 *
 *  ```typescript
 *  dimensions_equal(SI.metre.dimension, SI.kilometre.dimension);  // true
 *  dimensions_equal(SI.metre.dimension, SI.second.dimension);     // false
 *  ```
 *
 *  @param a - The first dimension.
 *  @param b - The second dimension.
 *
 *  @returns `true` when the two exponent vectors are identical.
 *
 */
declare function dimensions_equal(a: Dimension, b: Dimension): boolean;
/*******
 *
 *  The product of two dimensions: exponent vectors add.  `length · length` is
 *  area; `force · length` is energy.  This is the dimension side of the `*`
 *  operator and of derived-unit declaration.
 *
 *  ```typescript
 *  multiply_dimensions(
 *    make_dimension({ length: 1 }),
 *    make_dimension({ length: 1 })
 *  );                                   // area: length²
 *  ```
 *
 *  @param a - The left dimension.
 *  @param b - The right dimension.
 *
 *  @returns A new dimension whose exponents are the slot-wise sums.
 *
 */
declare function multiply_dimensions(a: Dimension, b: Dimension): Dimension;
/*******
 *
 *  The quotient of two dimensions: exponent vectors subtract.  `length / time`
 *  is velocity; **same-dimension `/` cancels to dimensionless** (`a / a` has
 *  every exponent zero), so a part-over-whole ratio is a unit-less number.
 *
 *  ```typescript
 *  divide_dimensions(
 *    make_dimension({ length: 1 }),
 *    make_dimension({ time: 1 })
 *  );                                  // velocity: length·time⁻¹
 *  ```
 *
 *  @param a - The numerator dimension.
 *  @param b - The denominator dimension.
 *
 *  @returns A new dimension whose exponents are the slot-wise differences.
 *
 */
declare function divide_dimensions(a: Dimension, b: Dimension): Dimension;
/*******
 *
 *  A unit: a name, a {@link Dimension}, and a **scale factor** giving the size
 *  of one of this unit in coherent base SI units.  `metre` has factor `1`;
 *  `kilometre` has factor `1000`; `millisecond` has factor `0.001`.
 *
 *  A {@link Quantity} always stores its magnitude in base units, so a unit is
 *  only consulted at the I/O boundary — {@link quantity} multiplies in the
 *  factor on the way in, {@link value_in} divides it out on the way out — which
 *  is the single constant, compile-time-foldable multiply the spec permits.
 *
 *  The phantom type parameter `D` carries the dimension into the type system so
 *  that `Unit<Length>` and `Unit<Time>` are distinct types even though both are
 *  the same runtime shape.
 *
 */
interface Unit<D extends Dimension = Dimension> {
    /** The unit's display name (`'kilometre'`, `'millisecond'`, `'newton'`). */
    readonly name: string;
    /** The unit's symbol (`'km'`, `'ms'`, `'N'`). */
    readonly symbol: string;
    /** The exponent vector this unit measures. */
    readonly dimension: D;
    /** Size of one of this unit, expressed in coherent base SI units. */
    readonly factor: number;
}
/**
 *  A dimensioned numeric value: a magnitude stored in coherent base SI units,
 *  tagged with its {@link Dimension} `D` as a phantom type.  Construct one with
 *  {@link quantity}; read it back in any compatible unit with {@link value_in}.
 *
 *  The `dimension` field is retained at runtime only to back the value-level
 *  equality guard that mirrors the compile-time dimension check; all arithmetic
 *  is plain floating point on `base_value`.
 */
interface Quantity<D extends Dimension = Dimension> {
    /** The magnitude in coherent base SI units (metres, kilograms, seconds, …). */
    readonly base_value: number;
    /** The phantom-carried dimension; also checked at runtime by {@link add} etc. */
    readonly dimension: D;
}
/*******
 *
 *  Constructs a {@link Quantity} from a magnitude and a {@link Unit}.  The
 *  magnitude is scaled into base SI units immediately (`100` `km` becomes
 *  `100000` m of stored `base_value`), so every later operation is unit-free.
 *
 *  ```typescript
 *  const d = quantity(100, SI.kilometre);  // 100 km, stored as 100000 m
 *  value_in(d, SI.metre);                  // 100000
 *  ```
 *
 *  @param magnitude - The numeric size, expressed in `unit`.
 *  @param unit      - The {@link Unit} the magnitude is given in.
 *
 *  @returns A quantity carrying `magnitude * unit.factor` in base units, tagged
 *           with `unit`'s dimension.
 *
 */
declare function quantity<D extends Dimension>(magnitude: number, unit: Unit<D>): Quantity<D>;
/*******
 *
 *  Reads a {@link Quantity} back out in a chosen {@link Unit}, applying the
 *  inverse conversion factor.  This is where *auto-convert within a dimension*
 *  surfaces: a quantity built in `km` reads cleanly in `m`, because both share
 *  the length dimension and storage is always in base units.
 *
 *  Reading a quantity in a unit of a **different dimension** is rejected — the
 *  generic signature stops it at compile time, and a runtime guard backs that
 *  up for untyped (`any`) callers.
 *
 *  ```typescript
 *  value_in(quantity(1, SI.kilometre), SI.metre);  // 1000
 *  ```
 *
 *  @param q    - The quantity to read.
 *  @param unit - The unit to express it in; must share `q`'s dimension.
 *
 *  @returns The magnitude of `q` in `unit`.
 *
 *  @throws {JssmError} When `unit`'s dimension does not match `q`'s (only
 *          reachable when the compile-time check is bypassed via `any`).
 *
 *  @see quantity
 */
declare function value_in<D extends Dimension>(q: Quantity<D>, unit: Unit<D>): number;
/*******
 *
 *  Adds two quantities of the **same** dimension.  Both are already in base
 *  units, so the sum is a plain add and the dimension carries through.  The
 *  generic single-`D` signature is the compile-time "matching dimensions"
 *  rule — adding a length to a time will not typecheck.
 *
 *  ```typescript
 *  const total = add(quantity(1, SI.kilometre), quantity(500, SI.metre));
 *  value_in(total, SI.metre);  // 1500
 *  ```
 *
 *  @param a - The left addend.
 *  @param b - The right addend; must share `a`'s dimension.
 *
 *  @returns Their sum, in the shared dimension.
 *
 *  @throws {JssmError} When the dimensions differ (only reachable when the
 *          compile-time check is bypassed via `any`).
 *
 */
declare function add<D extends Dimension>(a: Quantity<D>, b: Quantity<D>): Quantity<D>;
/*******
 *
 *  Subtracts two quantities of the same dimension.  As with {@link add}, the
 *  shared-`D` signature is the dimension match check; storage in base units
 *  makes the operation a plain subtract.
 *
 *  ```typescript
 *  const left = sub(quantity(1, SI.kilometre), quantity(250, SI.metre));
 *  value_in(left, SI.metre);  // 750
 *  ```
 *
 *  @param a - The minuend.
 *  @param b - The subtrahend; must share `a`'s dimension.
 *
 *  @returns Their difference, in the shared dimension.
 *
 *  @throws {JssmError} When the dimensions differ (only reachable via `any`).
 *
 */
declare function sub<D extends Dimension>(a: Quantity<D>, b: Quantity<D>): Quantity<D>;
/*******
 *
 *  Multiplies two quantities, **combining their dimensions** — exponent vectors
 *  add (length · length = area, force · length = energy).  Unlike {@link add},
 *  the operands need *not* share a dimension; the result's dimension is their
 *  product.
 *
 *  ```typescript
 *  const force = quantity(2, SI.newton);
 *  const dist  = quantity(3, SI.metre);
 *  const work  = mul(force, dist);          // energy
 *  value_in(work, SI.joule);                // 6
 *  ```
 *
 *  @param a - The left factor.
 *  @param b - The right factor.
 *
 *  @returns A quantity whose dimension is the product of the operands'.
 *
 */
declare function mul(a: Quantity, b: Quantity): Quantity;
/*******
 *
 *  Divides two quantities, **subtracting their dimensions** — exponent vectors
 *  subtract (length / time = velocity).  Dividing like by like cancels to the
 *  {@link dimensionless} dimension, so `received / total` is a unit-less ratio.
 *
 *  ```typescript
 *  const v = div(quantity(100, SI.kilometre), quantity(2, SI.hour));
 *  value_in(v, SI.metre_per_second);  // ≈ 13.888…
 *
 *  const ratio = div(quantity(3, SI.metre), quantity(4, SI.metre));
 *  is_dimensionless(ratio);           // true
 *  value_in(ratio, SI.one);           // 0.75
 *  ```
 *
 *  @param a - The numerator.
 *  @param b - The denominator.
 *
 *  @returns A quantity whose dimension is the quotient of the operands'.
 *
 *  @throws {JssmError} When `b`'s magnitude is zero.
 *
 */
declare function div(a: Quantity, b: Quantity): Quantity;
/*******
 *
 *  Scales a quantity by a plain (dimensionless) number, leaving its dimension
 *  untouched.  The scalar multiple of a velocity is still a velocity.
 *
 *  ```typescript
 *  value_in(scale(quantity(3, SI.metre), 2), SI.metre);  // 6
 *  ```
 *
 *  @param q - The quantity to scale.
 *  @param k - The dimensionless multiplier.
 *
 *  @returns `q` with its magnitude multiplied by `k`, same dimension.
 *
 */
declare function scale<D extends Dimension>(q: Quantity<D>, k: number): Quantity<D>;
/*******
 *
 *  Three-way comparison of two same-dimension quantities, `-1 | 0 | 1`.  The
 *  shared-`D` signature enforces matching dimensions at compile time; the
 *  comparison itself is on the base-unit magnitudes, so it is unit-agnostic
 *  (`1 km` compares greater than `500 m`).
 *
 *  ```typescript
 *  compare(quantity(1, SI.kilometre), quantity(500, SI.metre));  //  1
 *  compare(quantity(500, SI.metre),  quantity(1, SI.kilometre));  // -1
 *  compare(quantity(1, SI.kilometre), quantity(1000, SI.metre));  //  0
 *  ```
 *
 *  @param a - The left quantity.
 *  @param b - The right quantity; must share `a`'s dimension.
 *
 *  @returns `-1` if `a < b`, `1` if `a > b`, `0` if equal in magnitude.
 *
 *  @throws {JssmError} When the dimensions differ (only reachable via `any`).
 *
 */
declare function compare<D extends Dimension>(a: Quantity<D>, b: Quantity<D>): -1 | 0 | 1;
/*******
 *
 *  Whether a quantity is {@link dimensionless} — the all-zero exponent vector
 *  a same-dimension division collapses to.  A pure ratio answers `true`.
 *
 *  ```typescript
 *  is_dimensionless(div(quantity(3, SI.metre), quantity(4, SI.metre)));  // true
 *  is_dimensionless(quantity(3, SI.metre));                              // false
 *  ```
 *
 *  @param q - The quantity to test.
 *
 *  @returns `true` when every base exponent of `q`'s dimension is zero.
 *
 */
declare function is_dimensionless(q: Quantity): boolean;
/*******
 *
 *  Renders a {@link Dimension} as a compact human-readable exponent product,
 *  e.g. `length·time^-1` for velocity or `dimensionless` for the zero vector.
 *  An exponent of `1` is shown bare (`length`); others get a `^n` suffix.
 *  Used only to make {@link JssmError} messages legible.
 *
 *  ```typescript
 *  describe_dimension(make_dimension({ length: 1, time: -1 }));  // 'length·time^-1'
 *  describe_dimension(dimensionless);                            // 'dimensionless'
 *  ```
 *
 *  @param d - The dimension to describe.
 *
 *  @returns A `·`-joined `name^exp` rendering, or `'dimensionless'` if all
 *           exponents are zero.
 *
 */
declare function describe_dimension(d: Dimension): string;
/*******
 *
 *  Declares a base unit: the coherent (factor `1`) unit of a fresh or existing
 *  dimension.  `base_unit('metre', 'm', make_dimension({ length: 1 }))` is the
 *  SI metre.  Every prefixed and derived unit is ultimately expressed in terms
 *  of base units like these.
 *
 *  ```typescript
 *  const metre = base_unit('metre', 'm', make_dimension({ length: 1 }));
 *  metre.factor;  // 1
 *  ```
 *
 *  @param name      - The unit's display name.
 *  @param symbol    - The unit's symbol.
 *  @param dimension - The dimension the unit measures.
 *
 *  @returns A {@link Unit} with factor `1` in the given dimension.
 *
 *  @see scaled
 *  @see derived_unit
 *
 */
declare function base_unit<D extends Dimension>(name: string, symbol: string, dimension: D): Unit<D>;
/*******
 *
 *  Declares a scaled unit of an existing unit's dimension — the primitive
 *  behind both SI prefixes and ad-hoc scaled units (`kilometre = 1000 metre`,
 *  `minute = 60 second`).  The new unit's factor is `base.factor * factor`, so
 *  scaling composes (a kilo- of a kilo- is a mega-).
 *
 *  ```typescript
 *  const km = scaled(SI.metre, 1000, 'kilometre', 'km');
 *  km.factor;  // 1000
 *  ```
 *
 *  @param base   - The unit being scaled (its dimension is inherited).
 *  @param factor - How many base units one of the new unit equals.
 *  @param name   - The new unit's display name.
 *  @param symbol - The new unit's symbol.
 *
 *  @returns A {@link Unit} of `base`'s dimension with the scaled factor.
 *
 *  @see with_si_prefixes
 *
 */
declare function scaled<D extends Dimension>(base: Unit<D>, factor: number, name: string, symbol: string): Unit<D>;
/*******
 *
 *  Declares a derived unit by combining the dimensions of its constituents,
 *  multiplying their factors.  The factor argument is the coherent multiple
 *  (`1` for SI-coherent derived units like the newton); use it for off-system
 *  derived units.
 *
 *  ```typescript
 *  const newton = derived_unit('newton', 'N', 1,
 *    make_dimension({ mass: 1, length: 1, time: -2 }));
 *  ```
 *
 *  @param name      - The derived unit's display name.
 *  @param symbol    - The derived unit's symbol.
 *  @param factor    - Size of one derived unit in coherent base units.
 *  @param dimension - The combined dimension (typically from
 *                     {@link multiply_dimensions} / {@link divide_dimensions}
 *                     of constituent dimensions).
 *
 *  @returns A {@link Unit} of the given dimension and factor.
 *
 */
declare function derived_unit<D extends Dimension>(name: string, symbol: string, factor: number, dimension: D): Unit<D>;
/*******
 *
 *  The full SI prefix ladder, yotta (10²⁴) down to yocto (10⁻²⁴), as
 *  `{ name, symbol, factor }` rows.  {@link with_si_prefixes} maps a base unit
 *  across all of these so that `km`, `ms`, `μA`, `MHz`, … come free.
 *
 */
declare const si_prefixes: readonly [{
    readonly name: "yotta";
    readonly symbol: "Y";
    readonly factor: 1e+24;
}, {
    readonly name: "zetta";
    readonly symbol: "Z";
    readonly factor: 1e+21;
}, {
    readonly name: "exa";
    readonly symbol: "E";
    readonly factor: 1000000000000000000;
}, {
    readonly name: "peta";
    readonly symbol: "P";
    readonly factor: 1000000000000000;
}, {
    readonly name: "tera";
    readonly symbol: "T";
    readonly factor: 1000000000000;
}, {
    readonly name: "giga";
    readonly symbol: "G";
    readonly factor: 1000000000;
}, {
    readonly name: "mega";
    readonly symbol: "M";
    readonly factor: 1000000;
}, {
    readonly name: "kilo";
    readonly symbol: "k";
    readonly factor: 1000;
}, {
    readonly name: "hecto";
    readonly symbol: "h";
    readonly factor: 100;
}, {
    readonly name: "deca";
    readonly symbol: "da";
    readonly factor: 10;
}, {
    readonly name: "deci";
    readonly symbol: "d";
    readonly factor: 0.1;
}, {
    readonly name: "centi";
    readonly symbol: "c";
    readonly factor: 0.01;
}, {
    readonly name: "milli";
    readonly symbol: "m";
    readonly factor: 0.001;
}, {
    readonly name: "micro";
    readonly symbol: "μ";
    readonly factor: 0.000001;
}, {
    readonly name: "nano";
    readonly symbol: "n";
    readonly factor: 1e-9;
}, {
    readonly name: "pico";
    readonly symbol: "p";
    readonly factor: 1e-12;
}, {
    readonly name: "femto";
    readonly symbol: "f";
    readonly factor: 1e-15;
}, {
    readonly name: "atto";
    readonly symbol: "a";
    readonly factor: 1e-18;
}, {
    readonly name: "zepto";
    readonly symbol: "z";
    readonly factor: 1e-21;
}, {
    readonly name: "yocto";
    readonly symbol: "y";
    readonly factor: 1e-24;
}];
/**
 *  One SI prefix, as carried in {@link si_prefixes}: a long name, a symbol, and
 *  the power-of-ten scale factor it denotes.
 */
type SiPrefix = (typeof si_prefixes)[number];
/*******
 *
 *  Expands a base unit into a map keyed by prefix symbol of every prefixed
 *  unit — define `metre` once and get `km`, `mm`, `μm`, `Mm`, … without writing
 *  any of them.  The base unit itself is included under its own symbol.  This
 *  is the spec's "define a base once and every prefix comes free."
 *
 *  ```typescript
 *  const lengths = with_si_prefixes(SI.metre);
 *  lengths['km'].factor;  // 1000
 *  lengths['mm'].factor;  // 0.001
 *  lengths['m'].factor;   // 1   (the unprefixed base)
 *  ```
 *
 *  @param base - The base unit to prefix.
 *
 *  @returns A record from prefix symbol (plus the base symbol) to the
 *           corresponding {@link Unit}.
 *
 *  @see si_prefixes
 *
 */
declare function with_si_prefixes<D extends Dimension>(base: Unit<D>): Record<string, Unit<D>>;
/**
 *  The SI prelude: base units, common prefixed units, derived units, and the
 *  dimensionless `one`.  Frozen — a stable, shared prelude no machine mutates.
 *  @example
 *  import { SI, quantity, value_in } from './fsl_units';
 *  const dist = quantity(5, SI.kilometre);
 *  value_in(dist, SI.metre);  // 5000
 */
declare const SI: Readonly<{
    one: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    metre: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    kilogram: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    second: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    ampere: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    kelvin: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    mole: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    candela: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    kilometre: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    centimetre: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    millimetre: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    millisecond: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    gram: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    microampere: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    hertz: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    newton: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    joule: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    watt: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    pascal: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    coulomb: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    volt: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    ohm: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    farad: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    siemens: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    metre_per_second: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    metre_per_second_squared: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
    hour: Unit<Readonly<Record<"length" | "time" | "mass" | "current" | "temperature" | "amount" | "luminosity", number>>>;
}>;
/*******
 *
 *  Opt-in **data** units module (byte/bit, decimal `KB` vs binary `KiB`) — a
 *  stub per the spec's "leave data/imperial/angle/time modules as opt-in
 *  stubs."  Calling it surfaces, by throwing, that the module is declared but
 *  not yet shipped, so the surface exists without the SI prelude pulling in
 *  information-theory units no FSL machine needs by default.
 *
 *  @throws {JssmError} Always — the module is a not-yet-implemented stub.
 *
 *  @see imperial_module
 *  @see angle_module
 *  @see time_module
 *
 */
declare function data_module(): never;
/*******
 *
 *  Opt-in **imperial** units module (inch/foot/mile, pound, …) — a stub.
 *
 *  @throws {JssmError} Always — the module is a not-yet-implemented stub.
 *
 *  @see data_module
 *
 */
declare function imperial_module(): never;
/*******
 *
 *  Opt-in **angle** units module (degree/radian/gradian) — a stub.  The SI
 *  prelude treats angle as dimensionless; this module would add the explicit
 *  `deg`/`rad` units the spec says it subsumes.
 *
 *  @throws {JssmError} Always — the module is a not-yet-implemented stub.
 *
 *  @see data_module
 *
 */
declare function angle_module(): never;
/*******
 *
 *  Opt-in extended **time** units module (minute/hour/day/week, …) — a stub.
 *  `SI.second` and `SI.hour` cover the prelude's needs; this module would add
 *  the broader civil-time ladder.
 *
 *  @throws {JssmError} Always — the module is a not-yet-implemented stub.
 *
 *  @see data_module
 *
 */
declare function time_module(): never;
export { base_dimension_names, make_dimension, dimensionless, dimensions_equal, multiply_dimensions, divide_dimensions, describe_dimension, quantity, value_in, add, sub, mul, div, scale, compare, is_dimensionless, base_unit, scaled, derived_unit, with_si_prefixes, si_prefixes, SI, data_module, imperial_module, angle_module, time_module };
export type { BaseDimensionName, Dimension, Unit, Quantity, SiPrefix };
