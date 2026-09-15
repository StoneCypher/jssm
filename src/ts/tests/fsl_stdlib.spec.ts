
import {
  FslErrorKind,
  FslMathError,

  pi, e, tau, phi, sqrt2, ln2, ln10, inf, nan, EPSILON,

  isnan, isinf, isfinite_,

  abs, min, max, clamp, sign, trunc, floor, ceil, round,
  pow, sqrt, cubert, hypot, lerp, smoothstep,

  exp, log, ln, log2, log10,

  degrees, radians,
  sin, cos, tan, asin, acos, atan, atan2,
  sinh, cosh, tanh, asinh, acosh, atanh,

  gcd, lcm, factorial, comb, perm,

  popcount, clz, ctz, rotl, rotr,

  sum, product, mean, median, mode, variance, stddev, percentile

} from '../fsl_stdlib';




// Tolerance for floating-point comparisons of irrational results.
const close = (a: number, b: number, eps: number = 1e-12): boolean =>
  Math.abs(a - b) <= eps;




describe('error surface', () => {

  test('FslMathError carries its kind and name', () => {
    const err = new FslMathError(FslErrorKind.div_by_zero, 'boom');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('FslMathError');
    expect(err.kind).toBe(FslErrorKind.div_by_zero);
    expect(err.message).toBe('boom');
  });

  test('FslErrorKind members have their spec string values', () => {
    expect(FslErrorKind.div_by_zero).toBe('div_by_zero');
    expect(FslErrorKind.out_of_bounds).toBe('out_of_bounds');
    expect(FslErrorKind.overflow).toBe('overflow');
    expect(FslErrorKind.domain_error).toBe('domain_error');
  });

});




describe('constants', () => {

  test('values match the math definitions', () => {
    expect(pi).toBe(Math.PI);
    expect(e).toBe(Math.E);
    expect(tau).toBe(2 * Math.PI);
    expect(close(phi, (1 + Math.sqrt(5)) / 2)).toBe(true);
    expect(sqrt2).toBe(Math.SQRT2);
    expect(ln2).toBe(Math.LN2);
    expect(ln10).toBe(Math.LN10);
    expect(inf).toBe(Infinity);
    expect(Number.isNaN(nan)).toBe(true);
    expect(EPSILON).toBe(Number.EPSILON);
  });

  test('phi satisfies phi^2 = phi + 1', () => {
    expect(close(phi * phi, phi + 1)).toBe(true);
  });

});




describe('predicates', () => {

  test('isnan', () => {
    expect(isnan(NaN)).toBe(true);
    expect(isnan(1)).toBe(false);
    expect(isnan(Infinity)).toBe(false);
  });

  test('isinf', () => {
    expect(isinf(Infinity)).toBe(true);
    expect(isinf(-Infinity)).toBe(true);
    expect(isinf(0)).toBe(false);
    expect(isinf(NaN)).toBe(false);
  });

  test('isfinite_', () => {
    expect(isfinite_(0)).toBe(true);
    expect(isfinite_(Infinity)).toBe(false);
    expect(isfinite_(NaN)).toBe(false);
  });

});




describe('arithmetic / rounding', () => {

  test('abs', () => {
    expect(abs(-3)).toBe(3);
    expect(abs(3)).toBe(3);
    expect(abs(0)).toBe(0);
  });

  test('min', () => {
    expect(min(3, 1, 2)).toBe(1);
    expect(min(5)).toBe(5);
  });

  test('min throws on no args', () => {
    expect(() => min()).toThrow(FslMathError);
  });

  test('max', () => {
    expect(max(3, 1, 2)).toBe(3);
    expect(max(5)).toBe(5);
  });

  test('max throws on no args', () => {
    expect(() => max()).toThrow(FslMathError);
  });

  test('clamp', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  test('clamp throws when lo > hi', () => {
    expect(() => clamp(1, 3, 0)).toThrow(FslMathError);
  });

  test('sign', () => {
    expect(sign(-4)).toBe(-1);
    expect(sign(0)).toBe(0);
    expect(sign(7)).toBe(1);
  });

  test('trunc', () => {
    expect(trunc(2.9)).toBe(2);
    expect(trunc(-2.9)).toBe(-2);
  });

  test('floor', () => {
    expect(floor(2.9)).toBe(2);
    expect(floor(-2.1)).toBe(-3);
  });

  test('ceil', () => {
    expect(ceil(2.1)).toBe(3);
    expect(ceil(-2.9)).toBe(-2);
  });

  test('round uses banker\'s rounding (ties to even)', () => {
    expect(round(2.5)).toBe(2);
    expect(round(3.5)).toBe(4);
    expect(round(0.5)).toBe(0);
    expect(round(1.5)).toBe(2);
    expect(round(-2.5)).toBe(-2);
    expect(round(2.4)).toBe(2);
    expect(round(2.6)).toBe(3);
  });

  test('round passes non-finite values through', () => {
    expect(round(Infinity)).toBe(Infinity);
    expect(Number.isNaN(round(NaN))).toBe(true);
  });

  test('pow', () => {
    expect(pow(2, 10)).toBe(1024);
    expect(pow(9, 0.5)).toBe(3);
  });

  test('sqrt', () => {
    expect(sqrt(9)).toBe(3);
    expect(sqrt(0)).toBe(0);
  });

  test('sqrt throws on a negative', () => {
    expect(() => sqrt(-1)).toThrow(FslMathError);
  });

  test('cubert', () => {
    expect(cubert(27)).toBe(3);
    expect(cubert(-8)).toBe(-2);
  });

  test('hypot', () => {
    expect(hypot(3, 4)).toBe(5);
    expect(hypot(5)).toBe(5);
  });

  test('hypot throws on no args', () => {
    expect(() => hypot()).toThrow(FslMathError);
  });

  test('lerp', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 2)).toBe(20);
  });

  test('smoothstep', () => {
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
  });

  test('smoothstep throws on equal edges', () => {
    expect(() => smoothstep(1, 1, 0.5)).toThrow(FslMathError);
  });

});




describe('exp / log', () => {

  test('exp', () => {
    expect(exp(0)).toBe(1);
    expect(close(exp(1), Math.E)).toBe(true);
  });

  test('log defaults to natural log', () => {
    expect(close(log(Math.E), 1)).toBe(true);
  });

  test('log with a base', () => {
    expect(close(log(8, 2), 3)).toBe(true);
    expect(close(log(1000, 10), 3)).toBe(true);
  });

  test('log throws on non-positive argument', () => {
    expect(() => log(0)).toThrow(FslMathError);
    expect(() => log(-1)).toThrow(FslMathError);
  });

  test('log throws on an invalid base', () => {
    expect(() => log(8, 1)).toThrow(FslMathError);
    expect(() => log(8, 0)).toThrow(FslMathError);
    expect(() => log(8, -2)).toThrow(FslMathError);
  });

  test('ln', () => {
    expect(close(ln(Math.E), 1)).toBe(true);
    expect(ln(1)).toBe(0);
  });

  test('ln throws on non-positive', () => {
    expect(() => ln(0)).toThrow(FslMathError);
  });

  test('log2', () => {
    expect(log2(8)).toBe(3);
  });

  test('log2 throws on non-positive', () => {
    expect(() => log2(0)).toThrow(FslMathError);
  });

  test('log10', () => {
    expect(log10(1000)).toBe(3);
  });

  test('log10 throws on non-positive', () => {
    expect(() => log10(-5)).toThrow(FslMathError);
  });

});




describe('angle conversion + trig', () => {

  test('degrees / radians round-trip', () => {
    expect(degrees(Math.PI)).toBe(180);
    expect(close(radians(180), Math.PI)).toBe(true);
    expect(close(degrees(radians(57)), 57)).toBe(true);
  });

  test('sin / cos / tan operate in degrees', () => {
    expect(close(sin(90), 1)).toBe(true);
    expect(close(sin(0), 0)).toBe(true);
    expect(close(cos(0), 1)).toBe(true);
    expect(close(cos(180), -1)).toBe(true);
    expect(close(tan(45), 1)).toBe(true);
  });

  test('asin / acos / atan return degrees', () => {
    expect(close(asin(1), 90)).toBe(true);
    expect(close(acos(0), 90)).toBe(true);
    expect(close(atan(1), 45)).toBe(true);
  });

  test('asin / acos throw outside [-1, 1]', () => {
    expect(() => asin(2)).toThrow(FslMathError);
    expect(() => asin(-2)).toThrow(FslMathError);
    expect(() => acos(2)).toThrow(FslMathError);
    expect(() => acos(-2)).toThrow(FslMathError);
  });

  test('atan2 places the result in the correct quadrant', () => {
    expect(close(atan2(1, 1), 45)).toBe(true);
    expect(close(atan2(1, -1), 135)).toBe(true);
    expect(close(atan2(-1, -1), -135)).toBe(true);
  });

  test('hyperbolic functions', () => {
    expect(sinh(0)).toBe(0);
    expect(cosh(0)).toBe(1);
    expect(tanh(0)).toBe(0);
    expect(asinh(0)).toBe(0);
    expect(acosh(1)).toBe(0);
    expect(atanh(0)).toBe(0);
  });

  test('acosh throws below 1', () => {
    expect(() => acosh(0)).toThrow(FslMathError);
  });

  test('atanh throws outside (-1, 1)', () => {
    expect(() => atanh(1)).toThrow(FslMathError);
    expect(() => atanh(-1)).toThrow(FslMathError);
    expect(() => atanh(2)).toThrow(FslMathError);
  });

});




describe('integer / combinatorics', () => {

  test('gcd', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(5, 0)).toBe(5);
    expect(gcd(0, 0)).toBe(0);
    expect(gcd(-12, 18)).toBe(6);
  });

  test('gcd throws on a non-integer', () => {
    expect(() => gcd(1.5, 2)).toThrow(FslMathError);
  });

  test('lcm', () => {
    expect(lcm(4, 6)).toBe(12);
    expect(lcm(0, 5)).toBe(0);
    expect(lcm(5, 0)).toBe(0);
    expect(lcm(-4, 6)).toBe(12);
  });

  test('lcm throws on a non-integer', () => {
    expect(() => lcm(1.5, 2)).toThrow(FslMathError);
  });

  test('lcm throws on overflow', () => {
    expect(() => lcm(9_999_999_999, 9_999_999_998)).toThrow(FslMathError);
  });

  test('factorial', () => {
    expect(factorial(0)).toBe(1);
    expect(factorial(1)).toBe(1);
    expect(factorial(5)).toBe(120);
    expect(factorial(10)).toBe(3_628_800);
  });

  test('factorial throws on a negative', () => {
    expect(() => factorial(-1)).toThrow(FslMathError);
  });

  test('factorial throws on overflow', () => {
    expect(() => factorial(19)).toThrow(FslMathError);
  });

  test('comb', () => {
    expect(comb(5, 0)).toBe(1);
    expect(comb(5, 5)).toBe(1);
    expect(comb(5, 2)).toBe(10);
    expect(comb(5, 6)).toBe(0);
    expect(comb(52, 5)).toBe(2_598_960);
  });

  test('comb throws on a negative', () => {
    expect(() => comb(-1, 2)).toThrow(FslMathError);
    expect(() => comb(5, -2)).toThrow(FslMathError);
  });

  test('comb throws on overflow', () => {
    expect(() => comb(1000, 500)).toThrow(FslMathError);
  });

  test('perm', () => {
    expect(perm(5, 0)).toBe(1);
    expect(perm(5, 2)).toBe(20);
    expect(perm(5, 5)).toBe(120);
    expect(perm(5, 6)).toBe(0);
  });

  test('perm throws on a negative', () => {
    expect(() => perm(-1, 2)).toThrow(FslMathError);
    expect(() => perm(5, -2)).toThrow(FslMathError);
  });

  test('perm throws on overflow', () => {
    expect(() => perm(1000, 500)).toThrow(FslMathError);
  });

});




describe('bit operations', () => {

  test('popcount', () => {
    expect(popcount(0b1011, 8)).toBe(3);
    expect(popcount(0, 8)).toBe(0);
    expect(popcount(255, 8)).toBe(8);
    expect(popcount(0xFF_FF_FF_FF, 32)).toBe(32);
  });

  test('popcount defaults to 32-bit width', () => {
    expect(popcount(0b1011)).toBe(3);
  });

  test('clz', () => {
    expect(clz(1, 8)).toBe(7);
    expect(clz(0, 8)).toBe(8);
    expect(clz(128, 8)).toBe(0);
    expect(clz(0b0001_0000, 8)).toBe(3);
  });

  test('ctz', () => {
    expect(ctz(0b1000, 8)).toBe(3);
    expect(ctz(0, 8)).toBe(8);
    expect(ctz(1, 8)).toBe(0);
  });

  test('rotl', () => {
    expect(rotl(0b1000_0000, 1, 8)).toBe(0b0000_0001);
    expect(rotl(0b0000_0001, 1, 8)).toBe(0b0000_0010);
    expect(rotl(0b0000_0001, 0, 8)).toBe(0b0000_0001);
    expect(rotl(0b0000_0001, 8, 8)).toBe(0b0000_0001);
    expect(rotl(1, 1, 32)).toBe(2);
    expect(rotl(0x80_00_00_00, 1, 32)).toBe(1);
  });

  test('rotr', () => {
    expect(rotr(0b0000_0001, 1, 8)).toBe(0b1000_0000);
    expect(rotr(0b0000_0010, 1, 8)).toBe(0b0000_0001);
    expect(rotr(0b0000_0001, 0, 8)).toBe(0b0000_0001);
    expect(rotr(0b0000_0001, 8, 8)).toBe(0b0000_0001);
    expect(rotr(1, 1, 32)).toBe(0x80_00_00_00);
  });

  test('bit ops reject a bad width', () => {
    expect(() => popcount(1, 7)).toThrow(FslMathError);
    expect(() => clz(1, 64)).toThrow(FslMathError);
  });

  test('bit ops reject a non-integer or negative value', () => {
    expect(() => popcount(1.5, 8)).toThrow(FslMathError);
    expect(() => popcount(-1, 8)).toThrow(FslMathError);
  });

  test('bit ops reject a value too large for the width', () => {
    expect(() => popcount(256, 8)).toThrow(FslMathError);
  });

  test('rotl / rotr reject a negative or non-integer rotation', () => {
    expect(() => rotl(1, -1, 8)).toThrow(FslMathError);
    expect(() => rotl(1, 1.5, 8)).toThrow(FslMathError);
    expect(() => rotr(1, -1, 8)).toThrow(FslMathError);
    expect(() => rotr(1, 1.5, 8)).toThrow(FslMathError);
  });

});




describe('descriptive statistics', () => {

  test('sum', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([])).toBe(0);
  });

  test('product', () => {
    expect(product([2, 3, 4])).toBe(24);
    expect(product([])).toBe(1);
  });

  test('mean', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(mean([5])).toBe(5);
  });

  test('mean throws on an empty collection', () => {
    expect(() => mean([])).toThrow(FslMathError);
  });

  test('median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([5])).toBe(5);
  });

  test('median does not mutate its input', () => {
    const xs = [3, 1, 2];
    median(xs);
    expect(xs).toStrictEqual([3, 1, 2]);
  });

  test('median throws on an empty collection', () => {
    expect(() => median([])).toThrow(FslMathError);
  });

  test('mode', () => {
    expect(mode([1, 2, 2, 3])).toBe(2);
    expect(mode([4])).toBe(4);
  });

  test('mode breaks ties toward the smaller value', () => {
    expect(mode([3, 3, 1, 1])).toBe(1);
  });

  test('mode throws on an empty collection', () => {
    expect(() => mode([])).toThrow(FslMathError);
  });

  test('variance (population)', () => {
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBe(4);
    expect(variance([5, 5, 5])).toBe(0);
  });

  test('variance throws on an empty collection', () => {
    expect(() => variance([])).toThrow(FslMathError);
  });

  test('stddev (population)', () => {
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });

  test('stddev throws on an empty collection', () => {
    expect(() => stddev([])).toThrow(FslMathError);
  });

  test('percentile', () => {
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4], 1)).toBe(4);
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([5], 0.5)).toBe(5);
  });

  test('percentile at 0.5 equals the median', () => {
    const xs = [7, 3, 9, 1, 5];
    expect(percentile(xs, 0.5)).toBe(median(xs));
  });

  test('percentile lands on an exact rank without interpolation', () => {
    expect(percentile([10, 20, 30], 0.5)).toBe(20);
  });

  test('percentile throws on an empty collection', () => {
    expect(() => percentile([], 0.5)).toThrow(FslMathError);
  });

  test('percentile throws on a fraction outside [0, 1]', () => {
    expect(() => percentile([1, 2, 3], -0.1)).toThrow(FslMathError);
    expect(() => percentile([1, 2, 3], 1.1)).toThrow(FslMathError);
    expect(() => percentile([1, 2, 3], NaN)).toThrow(FslMathError);
  });

});
