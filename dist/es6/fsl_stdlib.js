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
var FslErrorKind;
(function (FslErrorKind) {
    FslErrorKind["div_by_zero"] = "div_by_zero";
    FslErrorKind["out_of_bounds"] = "out_of_bounds";
    FslErrorKind["overflow"] = "overflow";
    FslErrorKind["domain_error"] = "domain_error";
})(FslErrorKind || (FslErrorKind = {}));
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
class FslMathError extends Error {
    constructor(kind, message) {
        super(message);
        this.name = 'FslMathError';
        this.kind = kind;
    }
}
// ---------------------------------------------------------------------------
//  Mathematical constants (§7)
// ---------------------------------------------------------------------------
/** Ratio of a circle's circumference to its diameter (π). */
const pi = Math.PI;
/** Euler's number, the base of the natural logarithm (e). */
const e = Math.E;
/** One turn in radians (τ = 2π). */
const tau = 2 * Math.PI;
/** The golden ratio, φ = (1 + √5) / 2. */
const phi = (1 + Math.sqrt(5)) / 2;
/** The square root of two (√2). */
const sqrt2 = Math.SQRT2;
/** The natural logarithm of two (ln 2). */
const ln2 = Math.LN2;
/** The natural logarithm of ten (ln 10). */
const ln10 = Math.LN10;
/** Positive infinity (∞). */
const inf = Number.POSITIVE_INFINITY;
/** IEEE not-a-number; never equal to itself. */
const nan = Number.NaN;
/** The double-precision machine epsilon (smallest 1 + ε ≠ 1). */
const EPSILON = Number.EPSILON;
// ---------------------------------------------------------------------------
//  Predicates (§7) — required for NaN/∞ handling
// ---------------------------------------------------------------------------
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
const isnan = (x) => Number.isNaN(x);
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
const isinf = (x) => x === Number.POSITIVE_INFINITY || x === Number.NEGATIVE_INFINITY;
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
const isfinite_ = (x) => Number.isFinite(x);
// ---------------------------------------------------------------------------
//  Arithmetic / rounding (§7)
// ---------------------------------------------------------------------------
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
const abs = (x) => Math.abs(x);
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
const min = (...xs) => {
    if (xs.length === 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'min requires at least one argument');
    }
    return Math.min(...xs);
};
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
const max = (...xs) => {
    if (xs.length === 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'max requires at least one argument');
    }
    return Math.max(...xs);
};
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
const clamp = (x, lo, hi) => {
    if (lo > hi) {
        throw new FslMathError(FslErrorKind.domain_error, 'clamp requires lo <= hi');
    }
    if (x < lo) {
        return lo;
    }
    if (x > hi) {
        return hi;
    }
    return x;
};
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
const sign = (x) => Math.sign(x);
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
const trunc = (x) => Math.trunc(x);
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
const floor = (x) => Math.floor(x);
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
const ceil = (x) => Math.ceil(x);
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
const round = (x) => {
    if (!Number.isFinite(x)) {
        return x;
    }
    const f = Math.floor(x);
    const diff = x - f;
    if (diff < 0.5) {
        return f;
    }
    if (diff > 0.5) {
        return f + 1;
    }
    // exactly halfway — pick the even neighbour
    return (f % 2 === 0) ? f : f + 1;
};
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
const pow = (base, exponent) => Math.pow(base, exponent);
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
const sqrt = (x) => {
    if (x < 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'sqrt of a negative number');
    }
    return Math.sqrt(x);
};
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
const cubert = (x) => Math.cbrt(x);
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
const hypot = (...xs) => {
    if (xs.length === 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'hypot requires at least one argument');
    }
    return Math.hypot(...xs);
};
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
const lerp = (a, b, t) => a + (b - a) * t;
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
const smoothstep = (edge0, edge1, x) => {
    if (edge0 === edge1) {
        throw new FslMathError(FslErrorKind.domain_error, 'smoothstep requires edge0 !== edge1');
    }
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
};
// ---------------------------------------------------------------------------
//  Exp / log (§7)
// ---------------------------------------------------------------------------
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
const exp = (x) => Math.exp(x);
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
const log = (x, base = Math.E) => {
    if (x <= 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'log of a non-positive number');
    }
    if (base <= 0 || base === 1) {
        throw new FslMathError(FslErrorKind.domain_error, 'log base must be positive and not 1');
    }
    return Math.log(x) / Math.log(base);
};
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
const ln = (x) => {
    if (x <= 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'ln of a non-positive number');
    }
    return Math.log(x);
};
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
const log2 = (x) => {
    if (x <= 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'log2 of a non-positive number');
    }
    return Math.log2(x);
};
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
const log10 = (x) => {
    if (x <= 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'log10 of a non-positive number');
    }
    return Math.log10(x);
};
// ---------------------------------------------------------------------------
//  Angle conversion + trig (§7) — degrees by default
// ---------------------------------------------------------------------------
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
const degrees = (rad) => rad * (180 / Math.PI);
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
const radians = (deg) => deg * (Math.PI / 180);
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
const sin = (deg) => Math.sin(radians(deg));
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
const cos = (deg) => Math.cos(radians(deg));
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
const tan = (deg) => Math.tan(radians(deg));
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
const asin = (x) => {
    if (x < -1 || x > 1) {
        throw new FslMathError(FslErrorKind.domain_error, 'asin argument must be in [-1, 1]');
    }
    return degrees(Math.asin(x));
};
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
const acos = (x) => {
    if (x < -1 || x > 1) {
        throw new FslMathError(FslErrorKind.domain_error, 'acos argument must be in [-1, 1]');
    }
    return degrees(Math.acos(x));
};
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
const atan = (x) => degrees(Math.atan(x));
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
const atan2 = (y, x) => degrees(Math.atan2(y, x));
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
const sinh = (x) => Math.sinh(x);
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
const cosh = (x) => Math.cosh(x);
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
const tanh = (x) => Math.tanh(x);
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
const asinh = (x) => Math.asinh(x);
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
const acosh = (x) => {
    if (x < 1) {
        throw new FslMathError(FslErrorKind.domain_error, 'acosh argument must be >= 1');
    }
    return Math.acosh(x);
};
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
const atanh = (x) => {
    if (x <= -1 || x >= 1) {
        throw new FslMathError(FslErrorKind.domain_error, 'atanh argument must be in (-1, 1)');
    }
    return Math.atanh(x);
};
// ---------------------------------------------------------------------------
//  Integer / combinatorics (§7)
// ---------------------------------------------------------------------------
/*******
 *
 *  Asserts that a value is a safe integer, throwing a domain error otherwise.
 *  Shared guard for the integer/combinatorics family.
 *
 *  @param x      - The value to check.
 *  @param label  - The name to use in the error message.
 *  @returns      `x`, unchanged, when it is a safe integer.
 *  @throws       {@link FslMathError} (`domain_error`) when `x` is not a safe
 *                integer.
 *
 */
const require_safe_int = (x, label) => {
    if (!Number.isSafeInteger(x)) {
        throw new FslMathError(FslErrorKind.domain_error, `${label} requires a safe integer`);
    }
    return x;
};
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
const gcd = (a, b) => {
    let x = Math.abs(require_safe_int(a, 'gcd'));
    let y = Math.abs(require_safe_int(b, 'gcd'));
    while (y !== 0) {
        [x, y] = [y, x % y];
    }
    return x;
};
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
const lcm = (a, b) => {
    require_safe_int(a, 'lcm');
    require_safe_int(b, 'lcm');
    if (a === 0 || b === 0) {
        return 0;
    }
    const g = gcd(a, b);
    const result = Math.abs(a / g * b);
    if (!Number.isSafeInteger(result)) {
        throw new FslMathError(FslErrorKind.overflow, 'lcm overflowed the safe-integer range');
    }
    return result;
};
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
const factorial = (n) => {
    require_safe_int(n, 'factorial');
    if (n < 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'factorial of a negative number');
    }
    let acc = 1;
    for (let k = 2; k <= n; ++k) {
        acc *= k;
        if (!Number.isSafeInteger(acc)) {
            throw new FslMathError(FslErrorKind.overflow, 'factorial overflowed the safe-integer range');
        }
    }
    return acc;
};
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
const comb = (n, k) => {
    require_safe_int(n, 'comb');
    require_safe_int(k, 'comb');
    if (n < 0 || k < 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'comb requires non-negative arguments');
    }
    if (k > n) {
        return 0;
    }
    const kk = Math.min(k, n - k);
    let acc = 1;
    for (let i = 0; i < kk; ++i) {
        acc = acc * (n - i) / (i + 1);
        if (!Number.isSafeInteger(acc)) {
            throw new FslMathError(FslErrorKind.overflow, 'comb overflowed the safe-integer range');
        }
    }
    return Math.round(acc);
};
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
const perm = (n, k) => {
    require_safe_int(n, 'perm');
    require_safe_int(k, 'perm');
    if (n < 0 || k < 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'perm requires non-negative arguments');
    }
    if (k > n) {
        return 0;
    }
    let acc = 1;
    for (let i = 0; i < k; ++i) {
        acc *= (n - i);
        if (!Number.isSafeInteger(acc)) {
            throw new FslMathError(FslErrorKind.overflow, 'perm overflowed the safe-integer range');
        }
    }
    return acc;
};
// ---------------------------------------------------------------------------
//  Bit operations (§7) — over a caller-supplied unsigned width
// ---------------------------------------------------------------------------
/*******
 *
 *  Validates a bit width and an unsigned integer value against it, returning
 *  the value masked to the width.  Shared guard for the bit family; the
 *  spec scopes bit ops to sized ints (§6), so width is explicit here.
 *
 *  @param x      - The value; must be a non-negative safe integer in range.
 *  @param width  - The bit width; must be one of 8, 16, or 32.
 *  @returns      `x`, unchanged (already validated in range).
 *  @throws       {@link FslMathError} (`domain_error`) for a bad width or a
 *                non-integer value; (`out_of_bounds`) when `x` does not fit.
 *
 */
const require_uint_of_width = (x, width) => {
    if (width !== 8 && width !== 16 && width !== 32) {
        throw new FslMathError(FslErrorKind.domain_error, 'bit width must be 8, 16, or 32');
    }
    if (!Number.isSafeInteger(x) || x < 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'bit op requires a non-negative integer');
    }
    if (x > (2 ** width) - 1) {
        throw new FslMathError(FslErrorKind.out_of_bounds, `value does not fit in ${width} bits`);
    }
    return x;
};
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
const popcount = (x, width = 32) => {
    let v = require_uint_of_width(x, width);
    let count = 0;
    while (v !== 0) {
        v &= v - 1;
        ++count;
    }
    return count;
};
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
const clz = (x, width = 32) => {
    const v = require_uint_of_width(x, width);
    if (v === 0) {
        return width;
    }
    let count = 0;
    for (let bit = width - 1; bit >= 0; --bit) {
        if ((v & (2 ** bit)) !== 0) {
            break;
        }
        ++count;
    }
    return count;
};
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
const ctz = (x, width = 32) => {
    const v = require_uint_of_width(x, width);
    if (v === 0) {
        return width;
    }
    let count = 0;
    for (let bit = 0; bit < width; ++bit) {
        if ((v & (2 ** bit)) !== 0) {
            break;
        }
        ++count;
    }
    return count;
};
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
const rotl = (x, n, width = 32) => {
    const v = require_uint_of_width(x, width);
    if (!Number.isSafeInteger(n) || n < 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'rotl amount must be a non-negative integer');
    }
    const s = n % width;
    // Arithmetic (not JS bitwise) so the 32-bit signed `<<` cliff is avoided:
    // shift the low part up, OR in the high part that wrapped around.
    const modulus = 2 ** width;
    const low = (v * (2 ** s)) % modulus;
    const high = Math.floor(v / (2 ** (width - s)));
    return low + high;
};
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
const rotr = (x, n, width = 32) => {
    const v = require_uint_of_width(x, width);
    if (!Number.isSafeInteger(n) || n < 0) {
        throw new FslMathError(FslErrorKind.domain_error, 'rotr amount must be a non-negative integer');
    }
    const s = n % width;
    return rotl(v, width - s, width);
};
// ---------------------------------------------------------------------------
//  Descriptive statistics (§7) — over collections
// ---------------------------------------------------------------------------
/*******
 *
 *  Asserts that a collection is non-empty, throwing a domain error otherwise.
 *  Shared guard for the statistics family (an empty sample has no mean,
 *  median, etc.).
 *
 *  @param xs     - The collection.
 *  @param label  - The name to use in the error message.
 *  @throws       {@link FslMathError} (`domain_error`) when `xs` is empty.
 *
 */
const require_nonempty = (xs, label) => {
    if (xs.length === 0) {
        throw new FslMathError(FslErrorKind.domain_error, `${label} requires a non-empty collection`);
    }
};
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
const sum = (xs) => xs.reduce((acc, x) => acc + x, 0);
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
const product = (xs) => xs.reduce((acc, x) => acc * x, 1);
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
const mean = (xs) => {
    require_nonempty(xs, 'mean');
    return sum(xs) / xs.length;
};
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
const median = (xs) => {
    require_nonempty(xs, 'median');
    const sorted = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return (sorted.length % 2 === 1)
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
};
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
const mode = (xs) => {
    var _a;
    require_nonempty(xs, 'mode');
    const counts = new Map();
    for (const x of xs) {
        counts.set(x, ((_a = counts.get(x)) !== null && _a !== void 0 ? _a : 0) + 1);
    }
    let best = xs[0];
    let bestCount = 0;
    for (const [value, count] of counts) {
        if (count > bestCount || (count === bestCount && value < best)) {
            best = value;
            bestCount = count;
        }
    }
    return best;
};
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
const variance = (xs) => {
    require_nonempty(xs, 'variance');
    const m = mean(xs);
    return sum(xs.map(x => (x - m) ** 2)) / xs.length;
};
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
const stddev = (xs) => Math.sqrt(variance(xs));
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
const percentile = (xs, p) => {
    require_nonempty(xs, 'percentile');
    if (p < 0 || p > 1 || Number.isNaN(p)) {
        throw new FslMathError(FslErrorKind.domain_error, 'percentile fraction must be in [0, 1]');
    }
    const sorted = [...xs].sort((a, b) => a - b);
    if (sorted.length === 1) {
        return sorted[0];
    }
    const rank = p * (sorted.length - 1);
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    if (lo === hi) {
        return sorted[lo];
    }
    const frac = rank - lo;
    return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
};
export { 
// error surface
FslErrorKind, FslMathError, 
// constants
pi, e, tau, phi, sqrt2, ln2, ln10, inf, nan, EPSILON, 
// predicates
isnan, isinf, isfinite_, 
// arithmetic / rounding
abs, min, max, clamp, sign, trunc, floor, ceil, round, pow, sqrt, cubert, hypot, lerp, smoothstep, 
// exp / log
exp, log, ln, log2, log10, 
// angle conversion + trig (degrees by default)
degrees, radians, sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh, asinh, acosh, atanh, 
// integer / combinatorics
gcd, lcm, factorial, comb, perm, 
// bit operations
popcount, clz, ctz, rotl, rotr, 
// descriptive statistics
sum, product, mean, median, mode, variance, stddev, percentile };
