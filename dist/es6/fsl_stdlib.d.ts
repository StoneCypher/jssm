/*******
 *
 *  FSL standard library — the domain-neutral math / stdlib primitives of
 *  megaspec §7, implemented as pure, total-where-possible, typed TypeScript
 *  functions with **no coupling to the parser or runtime**.  Phase 2 wires
 *  these into the expression evaluator; this file is the host implementation
 *  of the conformance-tested core.
 *
 *  Design notes that follow the spec:
 *
 *    - **Trig is degrees-by-default** (§7): `sin`/`cos`/`tan` and the inverse
 *      functions take and return degrees; `degrees`/`radians` convert.
 *    - **Overflow / domain misuse is an error, never a silent wrap** (§4.1,
 *      §11): the throwing helpers raise {@link FslMathError} carrying a finite
 *      {@link FslErrorKind}.  `option`-returning recovery variants are a Phase
 *      2 concern; this file throws.
 *    - **NaN/∞ follow IEEE** (`NaN = NaN` is false), and the §7 predicates
 *      `isnan`/`isinf`/`isfinite` are provided.
 *    - **Bit ops are over sized ints** (§6): the rotate/count helpers here
 *      operate on a caller-supplied width (8/16/32) of unsigned integer.
 *
 *  RNG (`rand*`), encoding, and compression from §7 are intentionally **not**
 *  here: RNG is stateful/seeded (rich tier, §15) and encoding/compression are
 *  I/O-shaped infrastructure — none are pure math, so they live elsewhere.
 *
 */
/*******
 *
 *  Finite error-kind enumeration for the math core, mirroring the in-machine
 *  `Error.kind` finite enum of megaspec §11.  Kept local so the stdlib has no
 *  dependency on the runtime's `JssmError` (which is bound to a `Machine`).
 *
 *  ```typescript
 *  FslErrorKind.div_by_zero;   // 'div_by_zero'
 *  ```
 *
 */
declare enum FslErrorKind {
    div_by_zero = "div_by_zero",
    out_of_bounds = "out_of_bounds",
    overflow = "overflow",
    domain_error = "domain_error"
}
/*******
 *
 *  Error raised by the FSL math core for domain misuse, division by zero,
 *  out-of-range arguments, and overflow.  Carries a finite {@link FslErrorKind}
 *  so callers can branch on the cause without string-matching the message.
 *
 *  ```typescript
 *  try { factorial(-1); }
 *  catch (e) { (e as FslMathError).kind; }   // 'domain_error'
 *  ```
 *
 *  @param kind     - The finite error category.
 *  @param message  - A human-readable description.
 *
 */
declare class FslMathError extends Error {
    kind: FslErrorKind;
    constructor(kind: FslErrorKind, message: string);
}
/** Ratio of a circle's circumference to its diameter (π). */
declare const pi: number;
/** Euler's number, the base of the natural logarithm (e). */
declare const e: number;
/** One turn in radians (τ = 2π). */
declare const tau: number;
/** The golden ratio, φ = (1 + √5) / 2. */
declare const phi: number;
/** The square root of two (√2). */
declare const sqrt2: number;
/** The natural logarithm of two (ln 2). */
declare const ln2: number;
/** The natural logarithm of ten (ln 10). */
declare const ln10: number;
/** Positive infinity (∞). */
declare const inf: number;
/** IEEE not-a-number; never equal to itself. */
declare const nan: number;
/** The double-precision machine epsilon (smallest 1 + ε ≠ 1). */
declare const EPSILON: number;
/*******
 *
 *  Tests whether a value is IEEE not-a-number.
 *
 *  ```typescript
 *  isnan(NaN);   // true
 *  isnan(1);     // false
 *  ```
 *
 *  @param x  - The value to test.
 *  @returns  `true` iff `x` is `NaN`.
 *
 */
declare const isnan: (x: number) => boolean;
/*******
 *
 *  Tests whether a value is positive or negative infinity.
 *
 *  ```typescript
 *  isinf(Infinity);    // true
 *  isinf(-Infinity);   // true
 *  isinf(1);           // false
 *  ```
 *
 *  @param x  - The value to test.
 *  @returns  `true` iff `x` is `±∞`.
 *
 */
declare const isinf: (x: number) => boolean;
/*******
 *
 *  Tests whether a value is a finite number (neither `NaN` nor `±∞`).
 *
 *  ```typescript
 *  isfinite(1);          // true
 *  isfinite(Infinity);   // false
 *  isfinite(NaN);        // false
 *  ```
 *
 *  @param x  - The value to test.
 *  @returns  `true` iff `x` is finite.
 *
 */
declare const isfinite_: (x: number) => boolean;
/*******
 *
 *  Absolute value.
 *
 *  ```typescript
 *  abs(-3);   // 3
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  The non-negative magnitude of `x`.
 *
 */
declare const abs: (x: number) => number;
/*******
 *
 *  Smallest of its arguments.  Requires at least one argument; an empty call
 *  is a domain error rather than the `+∞` JS `Math.min()` returns.
 *
 *  ```typescript
 *  min(3, 1, 2);   // 1
 *  ```
 *
 *  @param xs  - One or more numbers.
 *  @returns   The minimum.
 *  @throws    {@link FslMathError} (`domain_error`) when called with no args.
 *
 */
declare const min: (...xs: number[]) => number;
/*******
 *
 *  Largest of its arguments.  Requires at least one argument; an empty call
 *  is a domain error rather than the `-∞` JS `Math.max()` returns.
 *
 *  ```typescript
 *  max(3, 1, 2);   // 3
 *  ```
 *
 *  @param xs  - One or more numbers.
 *  @returns   The maximum.
 *  @throws    {@link FslMathError} (`domain_error`) when called with no args.
 *
 */
declare const max: (...xs: number[]) => number;
/*******
 *
 *  Constrains a value to the inclusive range `[lo, hi]`.
 *
 *  ```typescript
 *  clamp(5, 0, 3);    // 3
 *  clamp(-1, 0, 3);   // 0
 *  clamp(2, 0, 3);    // 2
 *  ```
 *
 *  @param x   - The value to clamp.
 *  @param lo  - The inclusive lower bound.
 *  @param hi  - The inclusive upper bound.
 *  @returns   `x` confined to `[lo, hi]`.
 *  @throws    {@link FslMathError} (`domain_error`) when `lo > hi`.
 *
 */
declare const clamp: (x: number, lo: number, hi: number) => number;
/*******
 *
 *  Sign of a value: `-1`, `0`, or `1`, matching `Math.sign` (so `-0` yields
 *  `-0` and `NaN` yields `NaN`).
 *
 *  ```typescript
 *  sign(-4);   // -1
 *  sign(0);    // 0
 *  sign(7);    // 1
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  The sign of `x`.
 *
 */
declare const sign: (x: number) => number;
/*******
 *
 *  Truncates toward zero (drops the fractional part).
 *
 *  ```typescript
 *  trunc(2.9);    // 2
 *  trunc(-2.9);   // -2
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  `x` with its fractional part removed.
 *
 */
declare const trunc: (x: number) => number;
/*******
 *
 *  Largest integer not greater than `x` (rounds toward `-∞`).
 *
 *  ```typescript
 *  floor(2.9);    // 2
 *  floor(-2.1);   // -3
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  `⌊x⌋`.
 *
 */
declare const floor: (x: number) => number;
/*******
 *
 *  Smallest integer not less than `x` (rounds toward `+∞`).
 *
 *  ```typescript
 *  ceil(2.1);    // 3
 *  ceil(-2.9);   // -2
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  `⌈x⌉`.
 *
 */
declare const ceil: (x: number) => number;
/*******
 *
 *  Rounds to the nearest integer using **banker's rounding** (round-half-to-
 *  even), the §4.1 default.  This differs from JS `Math.round`, which rounds
 *  half **up**; here `0.5 → 0` and `2.5 → 2`.
 *
 *  ```typescript
 *  round(2.5);    // 2  (even)
 *  round(3.5);    // 4  (even)
 *  round(2.4);    // 2
 *  round(-2.5);   // -2 (even)
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  `x` rounded to the nearest integer, ties to even.
 *
 */
declare const round: (x: number) => number;
/*******
 *
 *  Raises `base` to the power `exponent`.
 *
 *  ```typescript
 *  pow(2, 10);    // 1024
 *  pow(9, 0.5);   // 3
 *  ```
 *
 *  @param base      - The base.
 *  @param exponent  - The exponent.
 *  @returns         `base ** exponent`.
 *
 */
declare const pow: (base: number, exponent: number) => number;
/*******
 *
 *  Principal (non-negative) square root.  A negative argument is a domain
 *  error rather than the `NaN` JS produces.
 *
 *  ```typescript
 *  sqrt(9);   // 3
 *  ```
 *
 *  @param x  - The radicand; must be `>= 0`.
 *  @returns  `√x`.
 *  @throws   {@link FslMathError} (`domain_error`) when `x < 0`.
 *
 */
declare const sqrt: (x: number) => number;
/*******
 *
 *  Real cube root, defined for negatives (unlike a `pow(x, 1/3)` workaround).
 *
 *  ```typescript
 *  cubert(27);    // 3
 *  cubert(-8);    // -2
 *  ```
 *
 *  @param x  - The radicand.
 *  @returns  `∛x`.
 *
 */
declare const cubert: (x: number) => number;
/*******
 *
 *  Euclidean norm `√(Σ xᵢ²)`, computed without intermediate overflow.
 *  Requires at least one argument.
 *
 *  ```typescript
 *  hypot(3, 4);   // 5
 *  ```
 *
 *  @param xs  - One or more components.
 *  @returns   The Euclidean length of the vector.
 *  @throws    {@link FslMathError} (`domain_error`) when called with no args.
 *
 */
declare const hypot: (...xs: number[]) => number;
/*******
 *
 *  Linear interpolation between `a` and `b` by parameter `t`.  `t` is not
 *  clamped, so `t < 0` or `t > 1` extrapolates.
 *
 *  ```typescript
 *  lerp(0, 10, 0.5);   // 5
 *  lerp(0, 10, 2);     // 20 (extrapolated)
 *  ```
 *
 *  @param a  - The value at `t = 0`.
 *  @param b  - The value at `t = 1`.
 *  @param t  - The interpolation parameter.
 *  @returns  `a + (b - a) * t`.
 *
 */
declare const lerp: (a: number, b: number, t: number) => number;
/*******
 *
 *  Smooth Hermite interpolation: `0` for `x <= edge0`, `1` for `x >= edge1`,
 *  and a smooth `3t² - 2t³` curve between (GLSL `smoothstep` semantics).
 *
 *  ```typescript
 *  smoothstep(0, 1, 0.5);    // 0.5
 *  smoothstep(0, 1, -1);     // 0
 *  smoothstep(0, 1, 2);      // 1
 *  ```
 *
 *  @param edge0  - The lower edge.
 *  @param edge1  - The upper edge.
 *  @param x      - The sample position.
 *  @returns      The smoothed value in `[0, 1]`.
 *  @throws       {@link FslMathError} (`domain_error`) when `edge0 === edge1`.
 *
 */
declare const smoothstep: (edge0: number, edge1: number, x: number) => number;
/*******
 *
 *  Natural exponential `eˣ`.
 *
 *  ```typescript
 *  exp(0);   // 1
 *  ```
 *
 *  @param x  - The exponent.
 *  @returns  `eˣ`.
 *
 */
declare const exp: (x: number) => number;
/*******
 *
 *  Logarithm of `x` in an arbitrary `base` (default `e`, i.e. the natural
 *  log).  A non-positive `x`, or a `base` that is not a valid positive base
 *  (`<= 0` or exactly `1`), is a domain error.
 *
 *  ```typescript
 *  log(8, 2);    // 3
 *  log(e);       // 1  (natural log when base omitted)
 *  ```
 *
 *  @param x     - The argument; must be `> 0`.
 *  @param base  - The logarithm base; must be `> 0` and `!= 1`.
 *  @returns     `log_base(x)`.
 *  @throws      {@link FslMathError} (`domain_error`) on `x <= 0` or an
 *               invalid base.
 *
 */
declare const log: (x: number, base?: number) => number;
/*******
 *
 *  Natural logarithm (base `e`).  Non-positive arguments are a domain error.
 *
 *  ```typescript
 *  ln(e);   // 1
 *  ```
 *
 *  @param x  - The argument; must be `> 0`.
 *  @returns  `ln x`.
 *  @throws   {@link FslMathError} (`domain_error`) when `x <= 0`.
 *
 */
declare const ln: (x: number) => number;
/*******
 *
 *  Base-2 logarithm.  Non-positive arguments are a domain error.
 *
 *  ```typescript
 *  log2(8);   // 3
 *  ```
 *
 *  @param x  - The argument; must be `> 0`.
 *  @returns  `log₂ x`.
 *  @throws   {@link FslMathError} (`domain_error`) when `x <= 0`.
 *
 */
declare const log2: (x: number) => number;
/*******
 *
 *  Base-10 logarithm.  Non-positive arguments are a domain error.
 *
 *  ```typescript
 *  log10(1000);   // 3
 *  ```
 *
 *  @param x  - The argument; must be `> 0`.
 *  @returns  `log₁₀ x`.
 *  @throws   {@link FslMathError} (`domain_error`) when `x <= 0`.
 *
 */
declare const log10: (x: number) => number;
/*******
 *
 *  Converts radians to degrees.
 *
 *  ```typescript
 *  degrees(Math.PI);   // 180
 *  ```
 *
 *  @param rad  - An angle in radians.
 *  @returns    The same angle in degrees.
 *
 */
declare const degrees: (rad: number) => number;
/*******
 *
 *  Converts degrees to radians.
 *
 *  ```typescript
 *  radians(180);   // 3.141592653589793
 *  ```
 *
 *  @param deg  - An angle in degrees.
 *  @returns    The same angle in radians.
 *
 */
declare const radians: (deg: number) => number;
/*******
 *
 *  Sine of an angle given in **degrees** (the §7 default).
 *
 *  ```typescript
 *  sin(90);   // 1
 *  sin(0);    // 0
 *  ```
 *
 *  @param deg  - The angle in degrees.
 *  @returns    `sin(deg)`.
 *
 */
declare const sin: (deg: number) => number;
/*******
 *
 *  Cosine of an angle given in **degrees** (the §7 default).
 *
 *  ```typescript
 *  cos(0);     // 1
 *  cos(180);   // -1
 *  ```
 *
 *  @param deg  - The angle in degrees.
 *  @returns    `cos(deg)`.
 *
 */
declare const cos: (deg: number) => number;
/*******
 *
 *  Tangent of an angle given in **degrees** (the §7 default).
 *
 *  ```typescript
 *  tan(45);   // 0.9999999999999999
 *  tan(0);    // 0
 *  ```
 *
 *  @param deg  - The angle in degrees.
 *  @returns    `tan(deg)`.
 *
 */
declare const tan: (deg: number) => number;
/*******
 *
 *  Arcsine, returning **degrees** (the §7 default).  Domain is `[-1, 1]`.
 *
 *  ```typescript
 *  asin(1);   // 90
 *  ```
 *
 *  @param x  - The sine value; must be in `[-1, 1]`.
 *  @returns  The angle in degrees in `[-90, 90]`.
 *  @throws   {@link FslMathError} (`domain_error`) when `|x| > 1`.
 *
 */
declare const asin: (x: number) => number;
/*******
 *
 *  Arccosine, returning **degrees** (the §7 default).  Domain is `[-1, 1]`.
 *
 *  ```typescript
 *  acos(0);   // 90
 *  ```
 *
 *  @param x  - The cosine value; must be in `[-1, 1]`.
 *  @returns  The angle in degrees in `[0, 180]`.
 *  @throws   {@link FslMathError} (`domain_error`) when `|x| > 1`.
 *
 */
declare const acos: (x: number) => number;
/*******
 *
 *  Arctangent, returning **degrees** (the §7 default).
 *
 *  ```typescript
 *  atan(1);   // 45
 *  ```
 *
 *  @param x  - The tangent value.
 *  @returns  The angle in degrees in `(-90, 90)`.
 *
 */
declare const atan: (x: number) => number;
/*******
 *
 *  Two-argument arctangent of `y / x`, returning **degrees** (the §7
 *  default) and using the signs of both arguments to place the result in the
 *  correct quadrant, `(-180, 180]`.
 *
 *  ```typescript
 *  atan2(1, 1);    // 45
 *  atan2(1, -1);   // 135
 *  ```
 *
 *  @param y  - The ordinate.
 *  @param x  - The abscissa.
 *  @returns  The angle in degrees.
 *
 */
declare const atan2: (y: number, x: number) => number;
/*******
 *
 *  Hyperbolic sine.
 *
 *  ```typescript
 *  sinh(0);   // 0
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  `sinh(x)`.
 *
 */
declare const sinh: (x: number) => number;
/*******
 *
 *  Hyperbolic cosine.
 *
 *  ```typescript
 *  cosh(0);   // 1
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  `cosh(x)`.
 *
 */
declare const cosh: (x: number) => number;
/*******
 *
 *  Hyperbolic tangent.
 *
 *  ```typescript
 *  tanh(0);   // 0
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  `tanh(x)`.
 *
 */
declare const tanh: (x: number) => number;
/*******
 *
 *  Inverse hyperbolic sine.
 *
 *  ```typescript
 *  asinh(0);   // 0
 *  ```
 *
 *  @param x  - The input value.
 *  @returns  `asinh(x)`.
 *
 */
declare const asinh: (x: number) => number;
/*******
 *
 *  Inverse hyperbolic cosine.  Domain is `x >= 1`.
 *
 *  ```typescript
 *  acosh(1);   // 0
 *  ```
 *
 *  @param x  - The input value; must be `>= 1`.
 *  @returns  `acosh(x)`.
 *  @throws   {@link FslMathError} (`domain_error`) when `x < 1`.
 *
 */
declare const acosh: (x: number) => number;
/*******
 *
 *  Inverse hyperbolic tangent.  Domain is the open interval `(-1, 1)`.
 *
 *  ```typescript
 *  atanh(0);   // 0
 *  ```
 *
 *  @param x  - The input value; must be in `(-1, 1)`.
 *  @returns  `atanh(x)`.
 *  @throws   {@link FslMathError} (`domain_error`) when `|x| >= 1`.
 *
 */
declare const atanh: (x: number) => number;
/*******
 *
 *  Greatest common divisor of two integers (always non-negative; `gcd(0, 0)`
 *  is `0`).  Operates on absolute values, so sign is ignored.
 *
 *  ```typescript
 *  gcd(12, 18);   // 6
 *  gcd(0, 5);     // 5
 *  ```
 *
 *  @param a  - The first integer.
 *  @param b  - The second integer.
 *  @returns  `gcd(|a|, |b|)`.
 *  @throws   {@link FslMathError} (`domain_error`) when either is not a safe
 *            integer.
 *
 */
declare const gcd: (a: number, b: number) => number;
/*******
 *
 *  Least common multiple of two integers (always non-negative).  `lcm(_, 0)`
 *  is `0`.
 *
 *  ```typescript
 *  lcm(4, 6);    // 12
 *  lcm(0, 5);    // 0
 *  ```
 *
 *  @param a  - The first integer.
 *  @param b  - The second integer.
 *  @returns  `lcm(|a|, |b|)`.
 *  @throws   {@link FslMathError} (`domain_error`) when either is not a safe
 *            integer, or (`overflow`) when the result exceeds the safe-integer
 *            range.
 *
 */
declare const lcm: (a: number, b: number) => number;
/*******
 *
 *  Factorial `n!` of a non-negative integer.  Overflow past the safe-integer
 *  range (`n > 18`) is an error, never a silent loss of precision (§4.1).
 *
 *  ```typescript
 *  factorial(5);   // 120
 *  factorial(0);   // 1
 *  ```
 *
 *  @param n  - A non-negative safe integer.
 *  @returns  `n!`.
 *  @throws   {@link FslMathError} (`domain_error`) when `n < 0` or non-integer;
 *            (`overflow`) when `n!` exceeds the safe-integer range.
 *
 */
declare const factorial: (n: number) => number;
/*******
 *
 *  Number of `k`-combinations of `n` items (the binomial coefficient
 *  `C(n, k)` / "n choose k").  Computed with a multiplicative loop that keeps
 *  intermediate values integral and checks for overflow each step.
 *
 *  ```typescript
 *  comb(5, 2);   // 10
 *  comb(5, 0);   // 1
 *  ```
 *
 *  @param n  - The population size (non-negative safe integer).
 *  @param k  - The number chosen (non-negative safe integer).
 *  @returns  `C(n, k)`, or `0` when `k > n`.
 *  @throws   {@link FslMathError} (`domain_error`) on negative / non-integer
 *            input; (`overflow`) when the result leaves the safe-integer range.
 *
 */
declare const comb: (n: number, k: number) => number;
/*******
 *
 *  Number of `k`-permutations of `n` items (`P(n, k)` / `nPk` =
 *  `n! / (n - k)!`).  Computed with an overflow-checked product.
 *
 *  ```typescript
 *  perm(5, 2);   // 20
 *  perm(5, 0);   // 1
 *  ```
 *
 *  @param n  - The population size (non-negative safe integer).
 *  @param k  - The number arranged (non-negative safe integer).
 *  @returns  `P(n, k)`, or `0` when `k > n`.
 *  @throws   {@link FslMathError} (`domain_error`) on negative / non-integer
 *            input; (`overflow`) when the result leaves the safe-integer range.
 *
 */
declare const perm: (n: number, k: number) => number;
/*******
 *
 *  Population count — the number of set bits in `x`, considered as a `width`-
 *  bit unsigned integer.
 *
 *  ```typescript
 *  popcount(0b1011, 8);   // 3
 *  ```
 *
 *  @param x      - The value (a non-negative integer fitting in `width` bits).
 *  @param width  - The bit width (8, 16, or 32); defaults to 32.
 *  @returns      The count of set bits.
 *  @throws       {@link FslMathError} on bad width / value (see
 *                `require_uint_of_width`).
 *
 */
declare const popcount: (x: number, width?: number) => number;
/*******
 *
 *  Count leading zeros — the number of zero bits above the most-significant
 *  set bit of `x`, considered as a `width`-bit unsigned integer.  `clz(0)` is
 *  `width` (all bits are zero).
 *
 *  ```typescript
 *  clz(1, 8);   // 7
 *  clz(0, 8);   // 8
 *  ```
 *
 *  @param x      - The value (a non-negative integer fitting in `width` bits).
 *  @param width  - The bit width (8, 16, or 32); defaults to 32.
 *  @returns      The number of leading zero bits.
 *  @throws       {@link FslMathError} on bad width / value.
 *
 */
declare const clz: (x: number, width?: number) => number;
/*******
 *
 *  Count trailing zeros — the number of zero bits below the least-significant
 *  set bit of `x`, considered as a `width`-bit unsigned integer.  `ctz(0)` is
 *  `width`.
 *
 *  ```typescript
 *  ctz(0b1000, 8);   // 3
 *  ctz(0, 8);        // 8
 *  ```
 *
 *  @param x      - The value (a non-negative integer fitting in `width` bits).
 *  @param width  - The bit width (8, 16, or 32); defaults to 32.
 *  @returns      The number of trailing zero bits.
 *  @throws       {@link FslMathError} on bad width / value.
 *
 */
declare const ctz: (x: number, width?: number) => number;
/*******
 *
 *  Rotate-left by `n` positions within a `width`-bit unsigned integer (bits
 *  shifted off the top re-enter at the bottom).  `n` is taken modulo `width`,
 *  so every non-negative integer rotation is valid.
 *
 *  ```typescript
 *  rotl(0b10000000, 1, 8);   // 0b00000001 (1)
 *  ```
 *
 *  @param x      - The value (a non-negative integer fitting in `width` bits).
 *  @param n      - The rotation amount (non-negative integer).
 *  @param width  - The bit width (8, 16, or 32); defaults to 32.
 *  @returns      `x` rotated left by `n`.
 *  @throws       {@link FslMathError} on bad width / value, or a negative /
 *                non-integer `n`.
 *
 */
declare const rotl: (x: number, n: number, width?: number) => number;
/*******
 *
 *  Rotate-right by `n` positions within a `width`-bit unsigned integer (bits
 *  shifted off the bottom re-enter at the top).  `n` is taken modulo `width`.
 *
 *  ```typescript
 *  rotr(0b00000001, 1, 8);   // 0b10000000 (128)
 *  ```
 *
 *  @param x      - The value (a non-negative integer fitting in `width` bits).
 *  @param n      - The rotation amount (non-negative integer).
 *  @param width  - The bit width (8, 16, or 32); defaults to 32.
 *  @returns      `x` rotated right by `n`.
 *  @throws       {@link FslMathError} on bad width / value, or a negative /
 *                non-integer `n`.
 *
 */
declare const rotr: (x: number, n: number, width?: number) => number;
/*******
 *
 *  Sum of a collection (the empty sum is `0`, the additive identity).
 *
 *  ```typescript
 *  sum([1, 2, 3]);   // 6
 *  sum([]);          // 0
 *  ```
 *
 *  @param xs  - The collection.
 *  @returns   `Σ xs`.
 *
 */
declare const sum: (xs: readonly number[]) => number;
/*******
 *
 *  Product of a collection (the empty product is `1`, the multiplicative
 *  identity).
 *
 *  ```typescript
 *  product([2, 3, 4]);   // 24
 *  product([]);          // 1
 *  ```
 *
 *  @param xs  - The collection.
 *  @returns   `Π xs`.
 *
 */
declare const product: (xs: readonly number[]) => number;
/*******
 *
 *  Arithmetic mean (average) of a non-empty collection.
 *
 *  ```typescript
 *  mean([1, 2, 3, 4]);   // 2.5
 *  ```
 *
 *  @param xs  - A non-empty collection.
 *  @returns   The mean.
 *  @throws    {@link FslMathError} (`domain_error`) when `xs` is empty.
 *
 */
declare const mean: (xs: readonly number[]) => number;
/*******
 *
 *  Median of a non-empty collection (the middle value of the sorted sample,
 *  or the mean of the two middle values for an even count).  Does not mutate
 *  its argument.
 *
 *  ```typescript
 *  median([3, 1, 2]);      // 2
 *  median([1, 2, 3, 4]);   // 2.5
 *  ```
 *
 *  @param xs  - A non-empty collection.
 *  @returns   The median.
 *  @throws    {@link FslMathError} (`domain_error`) when `xs` is empty.
 *
 */
declare const median: (xs: readonly number[]) => number;
/*******
 *
 *  Mode of a non-empty collection — the most frequently occurring value.  On
 *  a tie, returns the smallest such value, so the result is deterministic.
 *
 *  ```typescript
 *  mode([1, 2, 2, 3]);   // 2
 *  mode([3, 1, 1, 3]);   // 1  (tie broken to the smaller)
 *  ```
 *
 *  @param xs  - A non-empty collection.
 *  @returns   The (smallest, on a tie) most frequent value.
 *  @throws    {@link FslMathError} (`domain_error`) when `xs` is empty.
 *
 */
declare const mode: (xs: readonly number[]) => number;
/*******
 *
 *  Population variance of a non-empty collection (divides by `n`, the
 *  population convention, not `n - 1`).
 *
 *  ```typescript
 *  variance([2, 4, 4, 4, 5, 5, 7, 9]);   // 4
 *  ```
 *
 *  @param xs  - A non-empty collection.
 *  @returns   The population variance.
 *  @throws    {@link FslMathError} (`domain_error`) when `xs` is empty.
 *
 */
declare const variance: (xs: readonly number[]) => number;
/*******
 *
 *  Population standard deviation — the square root of the population variance.
 *
 *  ```typescript
 *  stddev([2, 4, 4, 4, 5, 5, 7, 9]);   // 2
 *  ```
 *
 *  @param xs  - A non-empty collection.
 *  @returns   The population standard deviation.
 *  @throws    {@link FslMathError} (`domain_error`) when `xs` is empty.
 *
 */
declare const stddev: (xs: readonly number[]) => number;
/*******
 *
 *  Percentile of a non-empty collection by **linear interpolation between
 *  closest ranks** (the common "type 7" method).  `p` is a fraction in
 *  `[0, 1]`; `percentile(xs, 0.5)` equals `median(xs)`.
 *
 *  ```typescript
 *  percentile([1, 2, 3, 4], 0.5);   // 2.5
 *  percentile([1, 2, 3, 4], 0);     // 1
 *  percentile([1, 2, 3, 4], 1);     // 4
 *  ```
 *
 *  @param xs  - A non-empty collection.
 *  @param p   - The percentile fraction in `[0, 1]`.
 *  @returns   The interpolated percentile value.
 *  @throws    {@link FslMathError} (`domain_error`) when `xs` is empty or `p`
 *             is outside `[0, 1]`.
 *
 */
declare const percentile: (xs: readonly number[], p: number) => number;
export { FslErrorKind, FslMathError, pi, e, tau, phi, sqrt2, ln2, ln10, inf, nan, EPSILON, isnan, isinf, isfinite_, abs, min, max, clamp, sign, trunc, floor, ceil, round, pow, sqrt, cubert, hypot, lerp, smoothstep, exp, log, ln, log2, log10, degrees, radians, sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh, asinh, acosh, atanh, gcd, lcm, factorial, comb, perm, popcount, clz, ctz, rotl, rotr, sum, product, mean, median, mode, variance, stddev, percentile };
