
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §3 Numeric layer of the FSL grammar
// reference (`notes/fsl-grammar-reference.md`).  Covers the numeric
// surfaces the grammar consumes:
//
//   - JsNumericLiteral inside PropertyVal — hex / binary / octal /
//     decimal float / decimal integer / exponent forms / word
//     constants (Pi, Phi, Euler, Epsilon, Root2, MaxSafeInt, etc.)
//   - NonNegNumber inside ArrowProbability — N% percentages
//   - NonNegNumber + TimeType inside ArrowAfter — every documented
//     unit family (ms / s / min / h / day / week) and its aliases,
//     plus the bare-number-defaults-to-seconds quirk
//   - SemVer inside fsl_version / machine_version
//
// Includes regression coverage for the OctalDigit / BinaryDigit
// constraints (the historical bug shape that property-based testing
// was identified as catching earliest).  Pins the current behaviour
// that Infinity / NaN and their aliases parse but emit `null` in the
// AST default_value — likely an intentional JSON-serialisation
// workaround, but worth a test so any change is deliberate.



const RUNS = 100;



/**
 *  Parse `property p default <literal> ;` and return the AST's
 *  `default_value` field.  Used by the JsNumericLiteral group of
 *  tests because PropertyVal is the only top-level grammar surface
 *  that accepts the full numeric vocabulary.
 *  @param  literal  FSL source text of a single numeric literal.
 *  @returns         The parsed `default_value` (number, null, etc.).
 *  @example
 *    parse_prop_default('42')      // → 42
 *    parse_prop_default('0xFF')    // → 255
 *    parse_prop_default('Pi')      // → 3.141592653589793
 *    parse_prop_default('Infinity')// → null (current behaviour, pinned by test)
 */
function parse_prop_default(literal: string): unknown {

  const tree = jssm.parse(`property p default ${literal} ;`) as Array<{ default_value?: unknown }>;
  return tree[0].default_value;

}



/**
 *  Parse `a <n>% -> b;` and return the AST's `r_probability` field
 *  from the resulting transition.
 *  @param  n  Numeric literal as a number or pre-formatted string.
 *  @returns   The parsed probability value.
 */
function parse_probability(n: number | string): unknown {

  const tree = jssm.parse(`a ${n}% -> b;`) as Array<{ se: { r_probability?: unknown } }>;
  return tree[0].se.r_probability;

}



/**
 *  Parse `a after <n>[ <unit>] -> b;` and return the AST's `r_after`
 *  field from the resulting transition.  When `unit` is omitted, the
 *  grammar treats the bare number as seconds (×1000 into the AST).
 *  @param  n     Numeric literal as a number or pre-formatted string.
 *  @param  unit  Optional time-unit suffix (ms, s, min, h, day, week, etc.).
 *  @returns      The parsed duration value (milliseconds).
 */
function parse_after(n: number | string, unit?: string): unknown {

  const tail = unit === undefined ? '' : ` ${unit}`;
  const tree = jssm.parse(`a after ${n}${tail} -> b;`) as Array<{ se: { r_after?: unknown } }>;
  return tree[0].se.r_after;

}



/**
 *  Parse `fsl_version: <major>.<minor>.<patch>;` and return the
 *  AST's SemVer value object.
 *  @param  major  Major version component (non-negative integer).
 *  @param  minor  Minor version component (non-negative integer).
 *  @param  patch  Patch version component (non-negative integer).
 *  @returns       `{ major, minor, patch, full }` as produced by the SemVer rule.
 */
function parse_fsl_version(major: number, minor: number, patch: number): { major: number; minor: number; patch: number; full: string } {

  const tree = jssm.parse(`fsl_version: ${major}.${minor}.${patch};`) as Array<{ value: { major: number; minor: number; patch: number; full: string } }>;
  return tree[0].value;

}





describe('Hexadecimal integer parsing (0x / 0X prefix)', () => {

  test('0x<hex> round-trips for any non-negative 32-bit integer', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 0, max: 0x7F_FF_FF_FF }),
         fc.boolean(),   // false = "0x" lowercase prefix; true = "0X" uppercase prefix
         (n, upper_prefix) => {
           const literal = (upper_prefix ? '0X' : '0x') + n.toString(16);
           expect(parse_prop_default(literal)).toBe(n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Hex digits are case-insensitive: 0xFF, 0xff, 0Xff, 0XFF all equal 255', () => {

     expect(parse_prop_default('0xFF')).toBe(255);
     expect(parse_prop_default('0xff')).toBe(255);
     expect(parse_prop_default('0Xff')).toBe(255);
     expect(parse_prop_default('0XFF')).toBe(255);
     expect(parse_prop_default('0xAbCdEf')).toBe(0xAB_CD_EF);

  });

});





describe('Octal integer parsing (0o / 0O prefix)', () => {

  test('0o<oct> round-trips for any non-negative integer up to 0o7777777', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 0, max: 0o777_7777 }),
         fc.boolean(),
         (n, upper_prefix) => {
           const literal = (upper_prefix ? '0O' : '0o') + n.toString(8);
           expect(parse_prop_default(literal)).toBe(n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Octal digit boundary: 0o8 and 0o9 reject (OctalDigit is [0-7])', () => {

     // Documented in `notes/fsl-grammar-reference.md` §3, the "OctalDigit"
     // production is `[0-7]`.  This pins the regression — the recent
     // grammar-reference audit specifically called the historical bug
     // here as the prototypical case property-based testing catches.
     expect(() => jssm.parse('property p default 0o8 ;')).toThrow();
     expect(() => jssm.parse('property p default 0o9 ;')).toThrow();
     expect(() => jssm.parse('property p default 0O8 ;')).toThrow();
     expect(() => jssm.parse('property p default 0O9 ;')).toThrow();

  });

});





describe('Binary integer parsing (0b / 0B prefix)', () => {

  test('0b<bin> round-trips for any non-negative 24-bit integer', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 0, max: 0xFF_FF_FF }),
         fc.boolean(),
         (n, upper_prefix) => {
           const literal = (upper_prefix ? '0B' : '0b') + n.toString(2);
           expect(parse_prop_default(literal)).toBe(n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Binary digit boundary: 0b2 through 0b9 all reject (BinaryDigit is [0-1])', () => {

     for (let d = 2; d <= 9; ++d) {
       expect(() => jssm.parse(`property p default 0b${d} ;`)).toThrow();
       expect(() => jssm.parse(`property p default 0B${d} ;`)).toThrow();
     }

  });

});





describe('Decimal integer and exponent-form parsing', () => {

  test('Plain decimal integers round-trip', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 0, max: 1_000_000 }),
         (n) => {
           expect(parse_prop_default(String(n))).toBe(n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Exponent notation: 1e<n> equals Math.pow(10, n), case-insensitive', () => {

     // Compared via relative-error rather than strict equality.  The
     // literal `1e<n>` parses to the closest IEEE 754 double to the
     // mathematical value, while `Math.pow(10, n)` computes via
     // `exp(n * log(10))` which can introduce a 1-ULP rounding
     // difference (e.g. `1e-4 !== Math.pow(10, -4)` on some platforms).
     // We assert the parsed literal is within 1e-12 relative error of
     // the expected value — well within float64's ~15-digit precision
     // but tight enough that a real grammar bug would surface.

     fc.assert(
       fc.property(
         fc.integer({ min: -10, max: 10 }),
         fc.boolean(),
         (exp, upper_e) => {
           const literal  = `1${upper_e ? 'E' : 'e'}${exp}`;
           const actual   = parse_prop_default(literal) as number;
           const expected = Math.pow(10, exp);
           expect(actual / expected).toBeCloseTo(1, 12);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Leading-dot floats: .25 parses as 0.25', () => {

     expect(parse_prop_default('.25')).toBeCloseTo(0.25);
     expect(parse_prop_default('.5')).toBeCloseTo(0.5);
     expect(parse_prop_default('.001')).toBeCloseTo(0.001);

  });

});





describe('Word-form numeric constants (finite values)', () => {

  test('Pi and its aliases all return Math.PI', () => {

     for (const alias of ['Pi', '𝜋', 'π']) {
       expect(parse_prop_default(alias)).toBeCloseTo(Math.PI);
     }

  });

  test('Phi and its aliases all return the golden ratio', () => {

     for (const alias of ['Phi', '𝜑', '𝜙', 'ϕ', 'φ']) {
       expect(parse_prop_default(alias)).toBeCloseTo(1.618033988749895);
     }

  });

  test('EulerNumber and its aliases all return Math.E', () => {

     for (const alias of ['EulerNumber', 'E', 'e', 'Ɛ', 'ℇ']) {
       expect(parse_prop_default(alias)).toBeCloseTo(Math.E);
     }

  });

  test('Epsilon and its aliases all return Number.EPSILON', () => {

     for (const alias of ['Epsilon', '𝜀', 'ε']) {
       expect(parse_prop_default(alias)).toBe(Number.EPSILON);
     }

  });

  test('Root2 / RootHalf and natural-log family parse to recognisable values', () => {

     expect(parse_prop_default('Root2')).toBeCloseTo(Math.SQRT2);
     expect(parse_prop_default('RootHalf')).toBeCloseTo(Math.SQRT1_2);
     expect(parse_prop_default('Ln2')).toBeCloseTo(Math.LN2);
     expect(parse_prop_default('NatLog2')).toBeCloseTo(Math.LN2);
     expect(parse_prop_default('Ln10')).toBeCloseTo(Math.LN10);
     expect(parse_prop_default('NatLog10')).toBeCloseTo(Math.LN10);

  });

  test('MaxSafeInt returns Number.MAX_SAFE_INTEGER', () => {

     expect(parse_prop_default('MaxSafeInt')).toBe(Number.MAX_SAFE_INTEGER);
     expect(parse_prop_default('MinSafeInt')).toBe(Number.MIN_SAFE_INTEGER);

  });

});





describe('Word-form numeric constants (Infinity / NaN family)', () => {

  // The parser returns proper Infinity / -Infinity / NaN values from
  // the TypeScript source.  Note: the bundled `dist/jssm.es5.cjs`
  // build collapses these to `null` somewhere in its JSON-flavoured
  // serialisation pipeline (rollup/terser), but the tests here run
  // against `src/ts/jssm.ts` via @swc/jest and see the correct
  // values.  If the CJS-bundle null-collapse is ever fixed in the
  // build, these tests still pass; if the parser itself ever drops
  // to null, these tests catch it.

  test('Positive-infinity aliases all parse to Infinity', () => {

     for (const alias of ['Infinity', 'Inf', 'PInfinity', 'PInf', '∞']) {
       expect(parse_prop_default(alias)).toBe(Infinity);
     }

  });

  test('Negative-infinity aliases all parse to -Infinity', () => {

     for (const alias of ['NegativeInfinity', 'NegativeInf', 'NegInfinity', 'NegInf', 'NInfinity', 'NInf', '-∞']) {
       expect(parse_prop_default(alias)).toBe(-Infinity);
     }

  });

  test('NaN parses to NaN (use Number.isNaN, since NaN !== NaN)', () => {

     expect(Number.isNaN(parse_prop_default('NaN'))).toBe(true);

  });

});





describe('ArrowProbability (NonNegNumber as percent)', () => {

  test('Random non-negative integer percents round-trip into r_probability', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 0, max: 100 }),
         (n) => {
           expect(parse_probability(n)).toBe(n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Decimal percents round-trip', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 0, max: 10_000 }),  // x.xx with 2 decimal places
         (n) => {
           const literal = (n / 100).toFixed(2);
           expect(parse_probability(literal)).toBeCloseTo(Number(literal));
         }
       ),
       { numRuns: RUNS }
     );

  });

});





describe('ArrowAfter (NonNegNumber + TimeType unit conversion)', () => {

  test('Bare number with no unit defaults to seconds (×1000)', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 100 }),
         (n) => {
           expect(parse_after(n)).toBe(n * 1000);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Milliseconds aliases pass through unchanged', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 10_000 }),
         fc.constantFrom('ms', 'msec', 'msecs', 'millisecond', 'milliseconds'),
         (n, unit) => {
           expect(parse_after(n, unit)).toBe(n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Seconds aliases convert by ×1000', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 100 }),
         fc.constantFrom('s', 'sec', 'secs', 'second', 'seconds'),
         (n, unit) => {
           expect(parse_after(n, unit)).toBe(n * 1000);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Minutes aliases convert by ×60_000', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 60 }),
         fc.constantFrom('m', 'min', 'mins', 'minute', 'minutes'),
         (n, unit) => {
           expect(parse_after(n, unit)).toBe(n * 60_000);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Hours aliases convert by ×3_600_000', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 24 }),
         fc.constantFrom('h', 'hr', 'hrs', 'hour', 'hours'),
         (n, unit) => {
           expect(parse_after(n, unit)).toBe(n * 3_600_000);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Days aliases convert by ×86_400_000', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 30 }),
         fc.constantFrom('d', 'day', 'days'),
         (n, unit) => {
           expect(parse_after(n, unit)).toBe(n * 86_400_000);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Weeks aliases convert by ×604_800_000', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 8 }),
         fc.constantFrom('w', 'wk', 'wks', 'week', 'weeks'),
         (n, unit) => {
           expect(parse_after(n, unit)).toBe(n * 604_800_000);
         }
       ),
       { numRuns: RUNS }
     );

  });

});





describe('SemVer (fsl_version / machine_version)', () => {

  test('Random major.minor.patch triples round-trip with correct breakdown', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 0, max: 1000 }),
         fc.integer({ min: 0, max: 1000 }),
         fc.integer({ min: 0, max: 1000 }),
         (major, minor, patch) => {
           const v = parse_fsl_version(major, minor, patch);
           expect(v.major).toBe(major);
           expect(v.minor).toBe(minor);
           expect(v.patch).toBe(patch);
           expect(v.full).toBe(`${major}.${minor}.${patch}`);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('SemVer accepts zero components', () => {

     const v = parse_fsl_version(0, 0, 0);
     expect(v.major).toBe(0);
     expect(v.minor).toBe(0);
     expect(v.patch).toBe(0);
     expect(v.full).toBe('0.0.0');

  });

});





describe('Integer literals in Stripe / Cycle transition targets', () => {

  // Stripe (`+|N` / `-|N`) and Cycle (`+N` / `-N` / `+0`) live in §6
  // (Transition expressions), but their internal numeric parsing
  // shares root cause with IntegerLiteral.  Tests here cover the
  // multi-digit cases that exposed an array-stringification bug in
  // those rules.

  test('Positive Stripe accepts arbitrary positive integers', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 1_000_000 }),
         (n) => {
           const tree = jssm.parse(`+|${n} -> b;`) as Array<{ from: { key: string; value: number } }>;
           expect(tree[0].from.key).toBe('stripe');
           expect(tree[0].from.value).toBe(n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Negative Stripe accepts arbitrary positive integers', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 1_000_000 }),
         (n) => {
           const tree = jssm.parse(`-|${n} -> b;`) as Array<{ from: { key: string; value: number } }>;
           expect(tree[0].from.key).toBe('stripe');
           expect(tree[0].from.value).toBe(-n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Positive Cycle accepts arbitrary positive integers', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 1_000_000 }),
         (n) => {
           const tree = jssm.parse(`a -> +${n};`) as Array<{ se: { to: { key: string; value: number } } }>;
           expect(tree[0].se.to.key).toBe('cycle');
           expect(tree[0].se.to.value).toBe(n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('Negative Cycle accepts arbitrary positive integers', () => {

     fc.assert(
       fc.property(
         fc.integer({ min: 1, max: 1_000_000 }),
         (n) => {
           const tree = jssm.parse(`a -> -${n};`) as Array<{ se: { to: { key: string; value: number } } }>;
           expect(tree[0].se.to.key).toBe('cycle');
           expect(tree[0].se.to.value).toBe(-n);
         }
       ),
       { numRuns: RUNS }
     );

  });

  test('`+0` cycle parses with value 0', () => {

     const tree = jssm.parse(`a -> +0;`) as Array<{ se: { to: { key: string; value: number } } }>;
     expect(tree[0].se.to.key).toBe('cycle');
     expect(tree[0].se.to.value).toBe(0);

  });

  test('`-0` rejects as a cycle; bare `0` parses as a Label', () => {

     // Documented in `notes/fsl-grammar-reference.md` §6 (ArrowTarget
     // → Cycle bullet, "only `+0` is valid (no `-0`), and `0` alone is
     // not a cycle") and §14 ("Missing `-0` cycle.  `Cycle` accepts
     // `+0` but not `-0` or bare `0`.  Probably intentional (zero is
     // unsigned), but worth noting").

     expect(() => jssm.parse(`a -> -0;`)).toThrow();

     // Bare `0` parses as a Label (since `0` is a valid Atom first-char),
     // not as a Cycle — `a -> 0;` doesn't throw, it just doesn't produce
     // a Cycle node.
     const tree = jssm.parse(`a -> 0;`) as Array<{ se: { to: unknown } }>;
     expect(typeof tree[0].se.to).toBe('string');

  });

});
