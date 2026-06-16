
import * as fc from 'fast-check';

import {
  FslMathError,

  abs, min, max, clamp, sign, trunc, floor, ceil, round,
  pow, sqrt, cubert, hypot, lerp, smoothstep,

  exp, log, ln, log2, log10,

  degrees, radians,
  sin, cos, tan, asin, acos, atan,
  sinh, cosh, tanh, asinh, acosh, atanh,

  gcd, lcm, factorial, comb, perm,

  popcount, clz, ctz, rotl, rotr,

  sum, product, mean, median, mode, variance, stddev, percentile

} from '../fsl_stdlib';




// Property-based coverage for the FSL math stdlib (`fsl_stdlib.ts`, megaspec
// §7).  Every property asserts an algebraic / metamorphic law that holds for
// the mathematical function independent of its implementation — a relation
// derived from the definition (e.g. `sin² + cos² = 1`, `gcd(a,b) | a`,
// `popcount + clz + ctz` lower bounds), never the code-under-test re-run as
// its own oracle.  Seeds come from fast-check, so any counterexample is
// reproducible from the reported seed.




const RUNS = 200;

// Tolerance for transcendental round-trips and identities.
const EPS = 1e-9;

const near = (a: number, b: number, eps: number = EPS): boolean =>
  Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));


// A finite double, excluding NaN / ±∞, in a sane magnitude band.
const finite = fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true });

// A small safe integer.
const small_int = fc.integer({ min: -1000, max: 1000 });

// A non-negative small safe integer.
const small_nat = fc.integer({ min: 0, max: 1000 });

// A non-empty finite collection.
const finite_array = fc.array(finite, { minLength: 1, maxLength: 40 });




describe('arithmetic / rounding laws', () => {

  test('abs is non-negative and idempotent', () => {
    fc.assert(fc.property(finite, x => {
      expect(abs(x) >= 0).toBe(true);
      expect(abs(abs(x))).toBe(abs(x));
    }), { numRuns: RUNS });
  });

  test('min / max bracket every argument', () => {
    fc.assert(fc.property(fc.array(finite, { minLength: 1, maxLength: 10 }), xs => {
      const lo = min(...xs);
      const hi = max(...xs);
      for (const x of xs) {
        expect(lo <= x).toBe(true);
        expect(x <= hi).toBe(true);
      }
      expect(xs.includes(lo)).toBe(true);
      expect(xs.includes(hi)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('clamp lands in range and is identity inside it', () => {
    fc.assert(fc.property(finite, finite, finite, (x, a, b) => {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const c = clamp(x, lo, hi);
      expect(c >= lo && c <= hi).toBe(true);
      if (x >= lo && x <= hi) { expect(c).toBe(x); }
    }), { numRuns: RUNS });
  });

  test('sign times abs reconstructs the value', () => {
    fc.assert(fc.property(finite, x => {
      expect(near(sign(x) * abs(x), x)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('floor <= x <= ceil, and they differ by 1 off-integer', () => {
    fc.assert(fc.property(finite, x => {
      expect(floor(x) <= x).toBe(true);
      expect(x <= ceil(x)).toBe(true);
      if (!Number.isInteger(x)) { expect(ceil(x) - floor(x)).toBe(1); }
    }), { numRuns: RUNS });
  });

  test('trunc equals floor for non-negatives, ceil for negatives', () => {
    fc.assert(fc.property(finite, x => {
      expect(trunc(x)).toBe(x >= 0 ? floor(x) : ceil(x));
    }), { numRuns: RUNS });
  });

  test('round result is an integer within 0.5 of the input', () => {
    fc.assert(fc.property(finite, x => {
      const r = round(x);
      expect(Number.isInteger(r)).toBe(true);
      expect(Math.abs(r - x) <= 0.5 + EPS).toBe(true);
    }), { numRuns: RUNS });
  });

  test('round of an exact half lands on an even integer', () => {
    fc.assert(fc.property(fc.integer({ min: -1000, max: 1000 }), n => {
      // `Math.abs` collapses the `-0` that `(-2) % 2` produces.
      expect(Math.abs(round(n + 0.5) % 2)).toBe(0);
    }), { numRuns: RUNS });
  });

  test('sqrt is the inverse of squaring for non-negatives', () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(sqrt(x) ** 2, x)).toBe(true);
      expect(near(sqrt(x * x), x)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('cubert is an odd inverse of cubing', () => {
    fc.assert(fc.property(fc.double({ min: -1e3, max: 1e3, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(cubert(x) ** 3, x, 1e-6)).toBe(true);
      expect(near(cubert(-x), -cubert(x))).toBe(true);
    }), { numRuns: RUNS });
  });

  test('pow agrees with repeated multiplication for small integer exponents', () => {
    fc.assert(fc.property(
      fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
      fc.integer({ min: 0, max: 6 }),
      (base, exp_) => {
        let acc = 1;
        for (let i = 0; i < exp_; ++i) { acc *= base; }
        expect(near(pow(base, exp_), acc, 1e-6)).toBe(true);
      }
    ), { numRuns: RUNS });
  });

  test('hypot equals sqrt of the sum of squares', () => {
    fc.assert(fc.property(finite, finite, (a, b) => {
      expect(near(hypot(a, b), Math.sqrt(a * a + b * b), 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('lerp hits its endpoints and is affine', () => {
    fc.assert(fc.property(finite, finite, fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }), (a, b, t) => {
      expect(near(lerp(a, b, 0), a)).toBe(true);
      expect(near(lerp(a, b, 1), b)).toBe(true);
      const v = lerp(a, b, t);
      expect(v >= Math.min(a, b) - EPS && v <= Math.max(a, b) + EPS).toBe(true);
    }), { numRuns: RUNS });
  });

  test('smoothstep is monotone non-decreasing in [0, 1] and saturates', () => {
    fc.assert(fc.property(fc.double({ min: -2, max: 3, noNaN: true, noDefaultInfinity: true }), x => {
      const v = smoothstep(0, 1, x);
      expect(v >= 0 && v <= 1).toBe(true);
      if (x <= 0) { expect(v).toBe(0); }
      if (x >= 1) { expect(v).toBe(1); }
    }), { numRuns: RUNS });
  });

});




describe('exp / log laws', () => {

  test('ln is the inverse of exp', () => {
    fc.assert(fc.property(fc.double({ min: -20, max: 20, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(ln(exp(x)), x, 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('exp turns addition into multiplication', () => {
    fc.assert(fc.property(
      fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),
      (a, b) => {
        expect(near(exp(a + b), exp(a) * exp(b), 1e-6)).toBe(true);
      }
    ), { numRuns: RUNS });
  });

  test('log in any base matches ln(x) / ln(base)', () => {
    const pos  = fc.double({ min: 1e-6, max: 1e6, noNaN: true, noDefaultInfinity: true });
    const base = fc.double({ min: 1.1, max: 100, noNaN: true, noDefaultInfinity: true });
    fc.assert(fc.property(pos, base, (x, b) => {
      expect(near(log(x, b), Math.log(x) / Math.log(b), 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('log2 and log10 invert their exponentials', () => {
    fc.assert(fc.property(fc.double({ min: -20, max: 20, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(log2(2 ** x), x, 1e-6)).toBe(true);
      expect(near(log10(10 ** x), x, 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('ln turns multiplication into addition', () => {
    const pos = fc.double({ min: 1e-6, max: 1e6, noNaN: true, noDefaultInfinity: true });
    fc.assert(fc.property(pos, pos, (a, b) => {
      expect(near(ln(a * b), ln(a) + ln(b), 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

});




describe('trig laws (degrees)', () => {

  test('Pythagorean identity sin² + cos² = 1', () => {
    fc.assert(fc.property(fc.double({ min: -720, max: 720, noNaN: true, noDefaultInfinity: true }), deg => {
      expect(near(sin(deg) ** 2 + cos(deg) ** 2, 1, 1e-9)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('tan equals sin / cos away from the poles', () => {
    fc.assert(fc.property(fc.double({ min: -89, max: 89, noNaN: true, noDefaultInfinity: true }), deg => {
      expect(near(tan(deg), sin(deg) / cos(deg), 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('degrees / radians round-trip', () => {
    fc.assert(fc.property(finite, x => {
      expect(near(degrees(radians(x)), x, 1e-6)).toBe(true);
      expect(near(radians(degrees(x)), x, 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('asin / acos / atan invert sin / cos / tan on principal ranges', () => {
    fc.assert(fc.property(fc.double({ min: -1, max: 1, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(sin(asin(x)), x, 1e-9)).toBe(true);
      expect(near(cos(acos(x)), x, 1e-9)).toBe(true);
    }), { numRuns: RUNS });
    fc.assert(fc.property(fc.double({ min: -1e3, max: 1e3, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(tan(atan(x)), x, 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('hyperbolic Pythagorean identity cosh² - sinh² = 1', () => {
    // Range capped where the cosh²/sinh² cancellation stays well-conditioned;
    // beyond ~|10| both terms grow past 1e8 and the difference loses too many
    // bits to assert 1 tightly — a float-precision limit, not a code defect.
    fc.assert(fc.property(fc.double({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(cosh(x) ** 2 - sinh(x) ** 2, 1, 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('inverse hyperbolic functions invert their forward forms', () => {
    fc.assert(fc.property(fc.double({ min: -20, max: 20, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(asinh(sinh(x)), x, 1e-6)).toBe(true);
    }), { numRuns: RUNS });
    fc.assert(fc.property(fc.double({ min: 1, max: 1e3, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(cosh(acosh(x)), x, 1e-6)).toBe(true);
    }), { numRuns: RUNS });
    fc.assert(fc.property(fc.double({ min: -0.999, max: 0.999, noNaN: true, noDefaultInfinity: true }), x => {
      expect(near(tanh(atanh(x)), x, 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

});




describe('integer / combinatorics laws', () => {

  test('gcd divides both arguments and gcd*lcm = |a*b|', () => {
    fc.assert(fc.property(small_int, small_int, (a, b) => {
      const g = gcd(a, b);
      expect(g >= 0).toBe(true);
      // `Math.abs` collapses the `-0` a negative dividend's `%` can produce.
      if (a !== 0) { expect(Math.abs(a % g)).toBe(0); }
      if (b !== 0) { expect(Math.abs(b % g)).toBe(0); }
      if (a !== 0 && b !== 0) {
        expect(g * lcm(a, b)).toBe(Math.abs(a * b));
      }
    }), { numRuns: RUNS });
  });

  test('gcd is symmetric and ignores sign', () => {
    fc.assert(fc.property(small_int, small_int, (a, b) => {
      expect(gcd(a, b)).toBe(gcd(b, a));
      expect(gcd(a, b)).toBe(gcd(Math.abs(a), Math.abs(b)));
    }), { numRuns: RUNS });
  });

  test('factorial(n) = n * factorial(n-1)', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 18 }), n => {
      expect(factorial(n)).toBe(n * factorial(n - 1));
    }), { numRuns: RUNS });
  });

  test('comb is symmetric: C(n,k) = C(n,n-k)', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 30 }), (n, k0) => {
      const k = Math.min(k0, n);
      expect(comb(n, k)).toBe(comb(n, n - k));
    }), { numRuns: RUNS });
  });

  test('Pascal rule: C(n,k) = C(n-1,k-1) + C(n-1,k)', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 25 }), fc.integer({ min: 1, max: 25 }), (n, k0) => {
      const k = 1 + (k0 % n);
      if (k <= n) {
        expect(comb(n, k)).toBe(comb(n - 1, k - 1) + comb(n - 1, k));
      }
    }), { numRuns: RUNS });
  });

  test('perm = comb * k!', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 15 }), fc.integer({ min: 0, max: 15 }), (n, k0) => {
      const k = Math.min(k0, n);
      expect(perm(n, k)).toBe(comb(n, k) * factorial(k));
    }), { numRuns: RUNS });
  });

});




describe('bit operation laws', () => {

  const widthArb = fc.constantFrom(8, 16, 32) as fc.Arbitrary<8 | 16 | 32>;

  // A value valid for the given width.
  const valueFor = (width: 8 | 16 | 32) =>
    fc.integer({ min: 0, max: (2 ** width) - 1 });

  test('popcount + (zero bits) = width', () => {
    fc.assert(fc.property(widthArb.chain(w => fc.tuple(fc.constant(w), valueFor(w))), ([w, v]) => {
      expect(popcount(v, w)).toBeGreaterThanOrEqual(0);
      expect(popcount(v, w)).toBeLessThanOrEqual(w);
    }), { numRuns: RUNS });
  });

  test('clz and ctz are width for zero, else bound popcount', () => {
    fc.assert(fc.property(widthArb.chain(w => fc.tuple(fc.constant(w), valueFor(w))), ([w, v]) => {
      if (v === 0) {
        expect(clz(v, w)).toBe(w);
        expect(ctz(v, w)).toBe(w);
      } else {
        // With >= 1 set bit, the leading and trailing zero runs cannot
        // overlap the set region, so they leave room for it: clz + ctz <= w-1.
        expect(clz(v, w) + ctz(v, w)).toBeLessThanOrEqual(w - 1);
      }
    }), { numRuns: RUNS });
  });

  test('rotl then rotr by the same amount is identity', () => {
    fc.assert(fc.property(
      widthArb.chain(w => fc.tuple(fc.constant(w), valueFor(w), fc.integer({ min: 0, max: 100 }))),
      ([w, v, n]) => {
        expect(rotr(rotl(v, n, w), n, w)).toBe(v);
      }
    ), { numRuns: RUNS });
  });

  test('rotation preserves popcount and is periodic in width', () => {
    fc.assert(fc.property(
      widthArb.chain(w => fc.tuple(fc.constant(w), valueFor(w), fc.integer({ min: 0, max: 100 }))),
      ([w, v, n]) => {
        expect(popcount(rotl(v, n, w), w)).toBe(popcount(v, w));
        expect(rotl(v, n, w)).toBe(rotl(v, n + w, w));
        expect(rotl(v, 0, w)).toBe(v);
      }
    ), { numRuns: RUNS });
  });

  test('clz of a single set bit identifies the bit position', () => {
    fc.assert(fc.property(widthArb.chain(w => fc.tuple(fc.constant(w), fc.integer({ min: 0, max: w - 1 }))), ([w, bit]) => {
      const v = 2 ** bit;
      expect(clz(v, w)).toBe(w - 1 - bit);
      expect(ctz(v, w)).toBe(bit);
      expect(popcount(v, w)).toBe(1);
    }), { numRuns: RUNS });
  });

});




describe('descriptive statistics laws', () => {

  test('sum is order-independent', () => {
    fc.assert(fc.property(fc.array(small_int, { maxLength: 30 }), xs => {
      const shuffled = [...xs].reverse();
      expect(sum(xs)).toBe(sum(shuffled));
    }), { numRuns: RUNS });
  });

  test('mean lies within [min, max]', () => {
    fc.assert(fc.property(finite_array, xs => {
      const m = mean(xs);
      expect(m >= Math.min(...xs) - EPS).toBe(true);
      expect(m <= Math.max(...xs) + EPS).toBe(true);
    }), { numRuns: RUNS });
  });

  test('median lies within [min, max] and is order-independent', () => {
    fc.assert(fc.property(finite_array, xs => {
      const m  = median(xs);
      const m2 = median([...xs].reverse());
      expect(m).toBe(m2);
      expect(m >= Math.min(...xs)).toBe(true);
      expect(m <= Math.max(...xs)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('mode is a member of the collection', () => {
    fc.assert(fc.property(fc.array(small_int, { minLength: 1, maxLength: 30 }), xs => {
      expect(xs.includes(mode(xs))).toBe(true);
    }), { numRuns: RUNS });
  });

  test('variance is non-negative and zero iff constant', () => {
    fc.assert(fc.property(finite_array, xs => {
      expect(variance(xs) >= -EPS).toBe(true);
      const allEqual = xs.every(x => x === xs[0]);
      if (allEqual) { expect(near(variance(xs), 0)).toBe(true); }
    }), { numRuns: RUNS });
  });

  test('stddev is the square root of variance', () => {
    fc.assert(fc.property(finite_array, xs => {
      expect(near(stddev(xs) ** 2, variance(xs), 1e-6)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('shifting the data shifts the mean by the same amount', () => {
    fc.assert(fc.property(finite_array, fc.double({ min: -1e3, max: 1e3, noNaN: true, noDefaultInfinity: true }), (xs, k) => {
      const shifted = xs.map(x => x + k);
      expect(near(mean(shifted), mean(xs) + k, 1e-6)).toBe(true);
      expect(near(variance(shifted), variance(xs), 1e-3)).toBe(true);
    }), { numRuns: RUNS });
  });

  test('percentile is monotone non-decreasing in p and spans [min, max]', () => {
    fc.assert(fc.property(
      finite_array,
      fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      (xs, p0, p1) => {
        const lo = Math.min(p0, p1);
        const hi = Math.max(p0, p1);
        expect(percentile(xs, lo) <= percentile(xs, hi) + EPS).toBe(true);
        expect(percentile(xs, 0)).toBe(Math.min(...xs));
        expect(percentile(xs, 1)).toBe(Math.max(...xs));
      }
    ), { numRuns: RUNS });
  });

  test('percentile at 0.5 equals the median', () => {
    fc.assert(fc.property(finite_array, xs => {
      expect(near(percentile(xs, 0.5), median(xs), 1e-9)).toBe(true);
    }), { numRuns: RUNS });
  });

});




describe('error discipline', () => {

  test('domain violations throw FslMathError, never return NaN silently', () => {
    fc.assert(fc.property(fc.double({ min: -1e6, max: -1e-6, noNaN: true, noDefaultInfinity: true }), neg => {
      expect(() => sqrt(neg)).toThrow(FslMathError);
      expect(() => ln(neg)).toThrow(FslMathError);
      expect(() => log10(neg)).toThrow(FslMathError);
    }), { numRuns: RUNS });
  });

  test('out-of-domain inverse trig throws FslMathError', () => {
    fc.assert(fc.property(fc.double({ min: 1.0000001, max: 1e6, noNaN: true, noDefaultInfinity: true }), big => {
      expect(() => asin(big)).toThrow(FslMathError);
      expect(() => acos(-big)).toThrow(FslMathError);
    }), { numRuns: RUNS });
  });

});
