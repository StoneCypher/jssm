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
import { JssmError } from './jssm_error';
/*******
 *
 *  Identifiers of the seven SI base dimensions, in canonical order.  A
 *  {@link Dimension} is an exponent over exactly these seven slots.
 *
 */
const base_dimension_names = [
    'length',
    'mass',
    'time',
    'current',
    'temperature',
    'amount',
    'luminosity'
];
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
function make_dimension(exponents) {
    var _a;
    const out = {};
    for (const name of base_dimension_names) {
        out[name] = (_a = exponents[name]) !== null && _a !== void 0 ? _a : 0;
    }
    return Object.freeze(out);
}
/**
 *  The dimensionless dimension — every base exponent zero.  The result of
 *  cancelling like dimensions (`received / total`), and the dimension of pure
 *  numbers, ratios, and the `radian`/`steradian` SI supplementary units.
 */
const dimensionless = make_dimension({});
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
function dimensions_equal(a, b) {
    return base_dimension_names.every(name => a[name] === b[name]);
}
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
function multiply_dimensions(a, b) {
    const out = {};
    for (const name of base_dimension_names) {
        out[name] = a[name] + b[name];
    }
    return Object.freeze(out);
}
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
function divide_dimensions(a, b) {
    const out = {};
    for (const name of base_dimension_names) {
        out[name] = a[name] - b[name];
    }
    return Object.freeze(out);
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
function quantity(magnitude, unit) {
    return Object.freeze({
        base_value: magnitude * unit.factor,
        dimension: unit.dimension
    });
}
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
function value_in(q, unit) {
    if (!dimensions_equal(q.dimension, unit.dimension)) {
        throw new JssmError(undefined, `cannot read a ${describe_dimension(q.dimension)} quantity in unit "${unit.name}" (${describe_dimension(unit.dimension)})`);
    }
    return q.base_value / unit.factor;
}
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
function add(a, b) {
    require_same_dimension(a, b, 'add');
    return Object.freeze({ base_value: a.base_value + b.base_value, dimension: a.dimension });
}
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
function sub(a, b) {
    require_same_dimension(a, b, 'subtract');
    return Object.freeze({ base_value: a.base_value - b.base_value, dimension: a.dimension });
}
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
function mul(a, b) {
    return Object.freeze({
        base_value: a.base_value * b.base_value,
        dimension: multiply_dimensions(a.dimension, b.dimension)
    });
}
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
function div(a, b) {
    if (b.base_value === 0) {
        throw new JssmError(undefined, 'division by a zero-magnitude quantity');
    }
    return Object.freeze({
        base_value: a.base_value / b.base_value,
        dimension: divide_dimensions(a.dimension, b.dimension)
    });
}
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
function scale(q, k) {
    return Object.freeze({ base_value: q.base_value * k, dimension: q.dimension });
}
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
function compare(a, b) {
    require_same_dimension(a, b, 'compare');
    if (a.base_value < b.base_value) {
        return -1;
    }
    if (a.base_value > b.base_value) {
        return 1;
    }
    return 0;
}
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
function is_dimensionless(q) {
    return dimensions_equal(q.dimension, dimensionless);
}
/*******
 *
 *  Shared dimension-match guard for {@link add}, {@link sub}, and
 *  {@link compare}.  Throws a descriptive {@link JssmError} when the two
 *  operands carry different dimensions — the runtime backstop to the
 *  compile-time single-`D` signature.
 *
 *  @param a    - The left operand.
 *  @param b    - The right operand.
 *  @param verb - The operation name, woven into the error message.
 *
 *  @throws {JssmError} When `a` and `b` have unequal dimensions.
 *
 */
function require_same_dimension(a, b, verb) {
    if (!dimensions_equal(a.dimension, b.dimension)) {
        throw new JssmError(undefined, `cannot ${verb} quantities of different dimensions ` +
            `(${describe_dimension(a.dimension)} vs ${describe_dimension(b.dimension)})`);
    }
}
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
function describe_dimension(d) {
    const parts = base_dimension_names
        .filter(name => d[name] !== 0)
        .map(name => (d[name] === 1) ? name : `${name}^${d[name]}`);
    return parts.length ? parts.join('·') : 'dimensionless';
}
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
function base_unit(name, symbol, dimension) {
    return Object.freeze({ name, symbol, dimension, factor: 1 });
}
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
function scaled(base, factor, name, symbol) {
    return Object.freeze({ name, symbol, dimension: base.dimension, factor: base.factor * factor });
}
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
function derived_unit(name, symbol, factor, dimension) {
    return Object.freeze({ name, symbol, dimension, factor });
}
/*******
 *
 *  The full SI prefix ladder, yotta (10²⁴) down to yocto (10⁻²⁴), as
 *  `{ name, symbol, factor }` rows.  {@link with_si_prefixes} maps a base unit
 *  across all of these so that `km`, `ms`, `μA`, `MHz`, … come free.
 *
 */
const si_prefixes = [
    { name: 'yotta', symbol: 'Y', factor: 1e24 },
    { name: 'zetta', symbol: 'Z', factor: 1e21 },
    { name: 'exa', symbol: 'E', factor: 1e18 },
    { name: 'peta', symbol: 'P', factor: 1e15 },
    { name: 'tera', symbol: 'T', factor: 1e12 },
    { name: 'giga', symbol: 'G', factor: 1e9 },
    { name: 'mega', symbol: 'M', factor: 1e6 },
    { name: 'kilo', symbol: 'k', factor: 1e3 },
    { name: 'hecto', symbol: 'h', factor: 1e2 },
    { name: 'deca', symbol: 'da', factor: 1e1 },
    { name: 'deci', symbol: 'd', factor: 1e-1 },
    { name: 'centi', symbol: 'c', factor: 1e-2 },
    { name: 'milli', symbol: 'm', factor: 1e-3 },
    { name: 'micro', symbol: 'μ', factor: 1e-6 },
    { name: 'nano', symbol: 'n', factor: 1e-9 },
    { name: 'pico', symbol: 'p', factor: 1e-12 },
    { name: 'femto', symbol: 'f', factor: 1e-15 },
    { name: 'atto', symbol: 'a', factor: 1e-18 },
    { name: 'zepto', symbol: 'z', factor: 1e-21 },
    { name: 'yocto', symbol: 'y', factor: 1e-24 }
];
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
function with_si_prefixes(base) {
    const out = { [base.symbol]: base };
    for (const p of si_prefixes) {
        out[`${p.symbol}${base.symbol}`] =
            scaled(base, p.factor, `${p.name}${base.name}`, `${p.symbol}${base.symbol}`);
    }
    return out;
}
/*******
 *
 *  The SI prelude — the seven base units, a selection of prefixed units, and
 *  the named SI derived units, ready to use without any user declaration.
 *
 *  The base-dimension exponent vectors used to assemble the derived units:
 *    - velocity            length·time⁻¹
 *    - acceleration        length·time⁻²
 *    - force (newton)      mass·length·time⁻²
 *    - energy (joule)      mass·length²·time⁻²
 *    - power (watt)        mass·length²·time⁻³
 *    - pressure (pascal)   mass·length⁻¹·time⁻²
 *    - charge (coulomb)    current·time
 *    - voltage (volt)      mass·length²·time⁻³·current⁻¹
 *    - resistance (ohm)    mass·length²·time⁻³·current⁻²
 *    - capacitance (farad) mass⁻¹·length⁻²·time⁴·current²
 *    - conductance (siemens) mass⁻¹·length⁻²·time³·current²
 *    - frequency (hertz)   time⁻¹
 *
 */
const length_dim = make_dimension({ length: 1 });
const mass_dim = make_dimension({ mass: 1 });
const time_dim = make_dimension({ time: 1 });
const current_dim = make_dimension({ current: 1 });
const temperature_dim = make_dimension({ temperature: 1 });
const amount_dim = make_dimension({ amount: 1 });
const luminosity_dim = make_dimension({ luminosity: 1 });
const velocity_dim = divide_dimensions(length_dim, time_dim);
const acceleration_dim = divide_dimensions(velocity_dim, time_dim);
const force_dim = make_dimension({ mass: 1, length: 1, time: -2 });
const energy_dim = make_dimension({ mass: 1, length: 2, time: -2 });
const power_dim = make_dimension({ mass: 1, length: 2, time: -3 });
const pressure_dim = make_dimension({ mass: 1, length: -1, time: -2 });
const charge_dim = make_dimension({ current: 1, time: 1 });
const voltage_dim = make_dimension({ mass: 1, length: 2, time: -3, current: -1 });
const resistance_dim = make_dimension({ mass: 1, length: 2, time: -3, current: -2 });
const capacitance_dim = make_dimension({ mass: -1, length: -2, time: 4, current: 2 });
const conductance_dim = make_dimension({ mass: -1, length: -2, time: 3, current: 2 });
const frequency_dim = make_dimension({ time: -1 });
/**
 *  The SI prelude: base units, common prefixed units, derived units, and the
 *  dimensionless `one`.  Frozen — a stable, shared prelude no machine mutates.
 *
 *  @example
 *  import { SI, quantity, value_in } from './fsl_units';
 *  const dist = quantity(5, SI.kilometre);
 *  value_in(dist, SI.metre);  // 5000
 */
const SI = Object.freeze({
    // dimensionless
    one: base_unit('one', '1', dimensionless),
    // 7 base units
    metre: base_unit('metre', 'm', length_dim),
    kilogram: base_unit('kilogram', 'kg', mass_dim),
    second: base_unit('second', 's', time_dim),
    ampere: base_unit('ampere', 'A', current_dim),
    kelvin: base_unit('kelvin', 'K', temperature_dim),
    mole: base_unit('mole', 'mol', amount_dim),
    candela: base_unit('candela', 'cd', luminosity_dim),
    // a few hand-named prefixed units (all also reachable via with_si_prefixes)
    kilometre: scaled(base_unit('metre', 'm', length_dim), 1000, 'kilometre', 'km'),
    centimetre: scaled(base_unit('metre', 'm', length_dim), 0.01, 'centimetre', 'cm'),
    millimetre: scaled(base_unit('metre', 'm', length_dim), 0.001, 'millimetre', 'mm'),
    millisecond: scaled(base_unit('second', 's', time_dim), 0.001, 'millisecond', 'ms'),
    gram: scaled(base_unit('kilogram', 'kg', mass_dim), 0.001, 'gram', 'g'),
    microampere: scaled(base_unit('ampere', 'A', current_dim), 1e-6, 'microampere', 'μA'),
    // named SI derived units
    hertz: derived_unit('hertz', 'Hz', 1, frequency_dim),
    newton: derived_unit('newton', 'N', 1, force_dim),
    joule: derived_unit('joule', 'J', 1, energy_dim),
    watt: derived_unit('watt', 'W', 1, power_dim),
    pascal: derived_unit('pascal', 'Pa', 1, pressure_dim),
    coulomb: derived_unit('coulomb', 'C', 1, charge_dim),
    volt: derived_unit('volt', 'V', 1, voltage_dim),
    ohm: derived_unit('ohm', 'Ω', 1, resistance_dim),
    farad: derived_unit('farad', 'F', 1, capacitance_dim),
    siemens: derived_unit('siemens', 'S', 1, conductance_dim),
    // derived compound units
    metre_per_second: derived_unit('metre per second', 'm/s', 1, velocity_dim),
    metre_per_second_squared: derived_unit('metre per second squared', 'm/s²', 1, acceleration_dim),
    // a scaled time unit needed for the km/h example (also offered by time_module)
    hour: scaled(base_unit('second', 's', time_dim), 3600, 'hour', 'h')
});
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
function data_module() {
    throw new JssmError(undefined, 'the FSL units "data" module is opt-in and not yet implemented');
}
/*******
 *
 *  Opt-in **imperial** units module (inch/foot/mile, pound, …) — a stub.
 *
 *  @throws {JssmError} Always — the module is a not-yet-implemented stub.
 *
 *  @see data_module
 *
 */
function imperial_module() {
    throw new JssmError(undefined, 'the FSL units "imperial" module is opt-in and not yet implemented');
}
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
function angle_module() {
    throw new JssmError(undefined, 'the FSL units "angle" module is opt-in and not yet implemented');
}
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
function time_module() {
    throw new JssmError(undefined, 'the FSL units "time" module is opt-in and not yet implemented');
}
export { 
// dimension primitives
base_dimension_names, make_dimension, dimensionless, dimensions_equal, multiply_dimensions, divide_dimensions, describe_dimension, 
// quantities & arithmetic
quantity, value_in, add, sub, mul, div, scale, compare, is_dimensionless, 
// unit construction
base_unit, scaled, derived_unit, with_si_prefixes, si_prefixes, 
// the SI prelude
SI, 
// opt-in module stubs
data_module, imperial_module, angle_module, time_module };
