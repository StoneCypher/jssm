
import * as fc from 'fast-check';

import {
  seq, unique, find_repeated, arr_uniq_p, histograph,
  weighted_rand_select, weighted_sample_select, weighted_histo_key,
  array_box_if_string, name_bind_prop_and_state, gen_splitmix32, sleep
} from '../jssm_util';

/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));





// Property-based coverage for the runtime utility layer (`jssm_util.ts`).
//
// The distribution tests draw through `gen_splitmix32`, the library's own
// seeded PRNG, with the seed chosen by fast-check — so every run is
// reproducible from the failure seed, and tolerances are set many standard
// deviations wide so a genuine implementation break is the only realistic
// way to trip them.



const RUNS = 100;



/**
 *  Builds an array with known multiplicities, plus the list of values that
 *  should count as repeats.  Values are the integers `0 .. counts.length-1`,
 *  distinct by construction, where value `i` appears `counts[i]` times.
 *  Because the expectation is derived from the construction recipe rather
 *  than from the code under test, tests built on this are real tests.
 *  @param counts  Multiplicity for each constructed value; index = value.
 *  @returns       The constructed array (in value order, not shuffled) and
 *                 the `[value, count]` pairs where `count > 1`.
 *  @example
 *    build_multiset([2, 1, 3])
 *    // { arr: [0, 0, 1, 2, 2, 2], repeats: [[0, 2], [2, 3]] }
 */
function build_multiset(counts: number[]): { arr: number[], repeats: [number, number][] } {

  const arr: number[] = [];

  for (const [value, count] of counts.entries()) {
    for (let i = 0; i < count; ++i) { arr.push(value); }
  }

  const repeats = counts
    .map( (count, value): [number, number] => [value, count] )
    .filter( ([_value, count]) => count > 1 );

  return { arr, repeats };

}



/**
 *  Arbitrary producing a multiset recipe: between zero and eight distinct
 *  values, each with multiplicity 1-4.
 */
const counts_arb = fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 0, maxLength: 8 });





describe('seq', () => {

  test('seq(n) has length n and seq(n)[i] === i', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        (n) => {
          const s = seq(n);
          expect(s.length).toBe(n);
          for (const [i, v] of s.entries()) { expect(v).toBe(i); }
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('seq rejects negative integers with TypeError', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: -1 }),
        (n) => {
          expect(() => seq(n)).toThrow(TypeError);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('seq rejects non-integers with TypeError', () => {

    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000 }).filter( d => !Number.isSafeInteger(d) ),
        (d) => {
          expect(() => seq(d)).toThrow(TypeError);
        }
      ),
      { numRuns: RUNS }
    );

    expect(() => seq(NaN)).toThrow(TypeError);
    expect(() => seq(Infinity)).toThrow(TypeError);

  });

});





describe('unique / arr_uniq_p', () => {

  test('unique of a constructed multiset returns each value exactly once, in first-occurrence order', () => {

    fc.assert(
      fc.property(
        counts_arb,
        (counts) => {
          const { arr } = build_multiset(counts);
          const u       = unique(arr);

          // one entry per distinct constructed value, in value order
          // (the multiset is built in value order, so first occurrences ascend)
          expect(u).toEqual(counts.map( (_c, value) => value ));
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('unique is idempotent on arbitrary integer arrays', () => {

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -50, max: 50 }), { maxLength: 60 }),
        (arr) => {
          const once = unique(arr);
          expect(unique(once)).toEqual(once);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('unique drops NaN entirely, because NaN does not self-compare', () => {

    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 5 }), { maxLength: 10 }),
        fc.integer({ min: 1, max: 3 }),
        (arr, nan_count) => {
          const with_nans = [...arr, ...Array.from({ length: nan_count }, () => NaN)];
          expect(unique(with_nans).some(Number.isNaN)).toBe(false);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('filtering with arr_uniq_p keeps exactly the first occurrence of each value', () => {

    fc.assert(
      fc.property(
        counts_arb,
        (counts) => {
          const { arr } = build_multiset(counts);
          expect(arr.filter(arr_uniq_p)).toEqual(counts.map( (_c, value) => value ));
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('find_repeated', () => {

  test('reports exactly the constructed values with multiplicity > 1, with their counts', () => {

    fc.assert(
      fc.property(
        counts_arb,
        (counts) => {

          const { arr, repeats } = build_multiset(counts);

          const found = find_repeated(arr);

          const sort_pairs = (pairs: [number, number][]) =>
            [...pairs].sort( (a, b) => a[0] - b[0] );

          expect(sort_pairs(found)).toEqual(sort_pairs(repeats));

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('result is independent of element order', () => {

    fc.assert(
      fc.property(
        counts_arb.chain( counts => {
          const { arr } = build_multiset(counts);
          return fc.tuple(
            fc.constant(counts),
            fc.shuffledSubarray(arr, { minLength: arr.length, maxLength: arr.length })
          );
        }),
        ([counts, shuffled]) => {

          const { repeats } = build_multiset(counts);

          const sort_pairs = (pairs: [number, number][]) =>
            [...pairs].sort( (a, b) => a[0] - b[0] );

          expect(sort_pairs(find_repeated(shuffled))).toEqual(sort_pairs(repeats));

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('arrays with no repeats return []', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        (n) => {
          expect(find_repeated(seq(n))).toEqual([]);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('NaN repeats are suppressed', () => {
    expect(find_repeated([0, NaN, 0, NaN])).toEqual([ [0, 2] ]);
  });

});





describe('histograph', () => {

  test('counts match construction multiplicities and sum to array length', () => {

    fc.assert(
      fc.property(
        counts_arb.chain( counts => {
          const { arr } = build_multiset(counts);
          return fc.tuple(
            fc.constant(counts),
            fc.shuffledSubarray(arr, { minLength: arr.length, maxLength: arr.length })
          );
        }),
        ([counts, shuffled]) => {

          const histo: Map<number, number> = histograph(shuffled);

          for (const [value, count] of counts.entries()) {
            expect(histo.get(value)).toBe(count);
          }

          const total = [...histo.values()].reduce( (acc, v) => acc + v, 0 );
          expect(total).toBe(shuffled.length);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('histograph of an empty array is an empty Map', () => {
    const histo: Map<unknown, number> = histograph([]);
    expect(histo.size).toBe(0);
  });

});





describe('gen_splitmix32', () => {

  test('same seed produces the same sequence; outputs stay in [0, 1)', () => {

    fc.assert(
      fc.property(
        fc.integer(),
        (saw_seed) => {

          const a = gen_splitmix32(saw_seed),
                b = gen_splitmix32(saw_seed);

          for (let i = 0; i < 64; ++i) {
            const va = a();
            expect(va).toBe(b());
            expect(va).toBeGreaterThanOrEqual(0);
            expect(va).toBeLessThan(1);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('output is roughly uniform: decile buckets of 10,000 draws each hold ~1,000', () => {

    // each bucket is binomial(10_000, 0.1): mean 1_000, std ≈ 30.
    // ±250 is more than 8σ, so this only trips on a real generator break.

    fc.assert(
      fc.property(
        fc.integer(),
        (saw_seed) => {

          const rng     = gen_splitmix32(saw_seed);
          const buckets = Array.from({length: 10}, () => 0);

          for (let i = 0; i < 10_000; ++i) {
            ++buckets[Math.floor(rng() * 10)];
          }

          for (const count of buckets) {
            expect(count).toBeGreaterThan(750);
            expect(count).toBeLessThan(1250);
          }

        }
      ),
      { numRuns: 10 }
    );

  });

  test('omitting the seed still yields a working in-range generator', () => {

    const rng = gen_splitmix32();

    for (let i = 0; i < 32; ++i) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }

  });

});





describe('weighted_rand_select', () => {

  test('single-option lists are always selected', () => {

    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 1, max: 100 }),
        (saw_seed, weight) => {
          const rng    = gen_splitmix32(saw_seed);
          const option = { name: 'only', probability: weight };
          expect(weighted_rand_select([option], undefined, rng)).toBe(option);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('zero-weight options are never selected while positive weight remains', () => {

    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 0, max: 2 }),   // where the zero-weight option is spliced in
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (saw_seed, zero_pos, w1, w2) => {

          const rng     = gen_splitmix32(saw_seed);
          const options = [
            { name: 'live_1', probability: w1 },
            { name: 'live_2', probability: w2 }
          ];
          options.splice(zero_pos, 0, { name: 'dead', probability: 0 });

          for (let i = 0; i < 200; ++i) {
            expect(weighted_rand_select(options, undefined, rng).name).not.toBe('dead');
          }

        }
      ),
      { numRuns: 25 }
    );

  });

  test('two-option selection frequency tracks the weight ratio', () => {

    // 4,096 draws of a Bernoulli(q) with q ∈ [1/101, 100/101]: the
    // standard deviation of the observed proportion is at most
    // sqrt(0.25 / 4096) ≈ 0.0078, so ±0.05 is over 6σ.

    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (saw_seed, w1, w2) => {

          const rng     = gen_splitmix32(saw_seed),
                options = [
                  { name: 'first',  probability: w1 },
                  { name: 'second', probability: w2 }
                ];

          let firsts = 0;

          for (let i = 0; i < 4096; ++i) {
            if (weighted_rand_select(options, undefined, rng).name === 'first') { ++firsts; }
          }

          const expected = w1 / (w1 + w2);
          expect(Math.abs((firsts / 4096) - expected)).toBeLessThan(0.05);

        }
      ),
      { numRuns: 25 }
    );

  });

  test('a custom probability property name is honored', () => {

    fc.assert(
      fc.property(
        fc.integer(),
        (saw_seed) => {

          const rng     = gen_splitmix32(saw_seed),
                options = [
                  { name: 'all',  weight: 5 },
                  { name: 'none', weight: 0 }
                ];

          for (let i = 0; i < 50; ++i) {
            expect(weighted_rand_select(options, 'weight', rng).name).toBe('all');
          }

        }
      ),
      { numRuns: 25 }
    );

  });

  test('options missing the weight property default to weight 1 (all reachable)', () => {

    fc.assert(
      fc.property(
        fc.integer(),
        (saw_seed) => {

          const rng     = gen_splitmix32(saw_seed),
                options = [ { name: 'a' }, { name: 'b' }, { name: 'c' } ],
                seen    = new Set<string>();

          // P(missing any one option in 1,000 uniform draws) ≈ 3 · (2/3)^1000 ≈ 0
          for (let i = 0; i < 1000; ++i) {
            seen.add(weighted_rand_select(options, undefined, rng).name);
          }

          expect([...seen].sort(code_unit_compare)).toEqual(['a', 'b', 'c']);

        }
      ),
      { numRuns: 10 }
    );

  });

  test('rejects non-arrays, empty arrays, and non-object members with TypeError', () => {

    expect(() => weighted_rand_select('not an array')).toThrow(TypeError);
    expect(() => weighted_rand_select(7)).toThrow(TypeError);
    expect(() => weighted_rand_select(undefined)).toThrow(TypeError);
    expect(() => weighted_rand_select([])).toThrow(TypeError);
    expect(() => weighted_rand_select([1, 2, 3])).toThrow(TypeError);

    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (not_an_array) => {
          expect(() => weighted_rand_select(not_an_array)).toThrow(TypeError);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('weighted_sample_select', () => {

  test('returns exactly n draws, every one a member of the option list', () => {

    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 0, max: 200 }),
        (saw_seed, n) => {

          const rng     = gen_splitmix32(saw_seed),
                options = [
                  { name: 'x', probability: 1 },
                  { name: 'y', probability: 2 },
                  { name: 'z', probability: 3 }
                ];

          const samples = weighted_sample_select(n, options, 'probability', rng);

          expect(samples.length).toBe(n);
          for (const s of samples as unknown[]) { expect(options).toContain(s); }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('weighted_histo_key', () => {

  test('histogram counts sum to n and keys come from the extracted property', () => {

    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 1, max: 500 }),
        (saw_seed, n) => {

          const rng  = gen_splitmix32(saw_seed),
                opts = [
                  { to: 'red',   probability: 4 },
                  { to: 'green', probability: 2 },
                  { to: 'blue',  probability: 1 }
                ];

          const histo: Map<string, number> = weighted_histo_key(n, opts, 'probability', 'to', rng);

          const total = [...histo.values()].reduce( (acc, v) => acc + v, 0 );
          expect(total).toBe(n);

          for (const k of histo.keys()) expect(['red', 'green', 'blue']).toContain(k) ;

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('extracted frequencies track the weights over a large sample', () => {

    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (saw_seed, w1, w2) => {

          const rng  = gen_splitmix32(saw_seed),
                n    = 4096,
                opts = [
                  { to: 'heavier', probability: w1 },
                  { to: 'lighter', probability: w2 }
                ];

          const histo: Map<string, number> = weighted_histo_key(n, opts, 'probability', 'to', rng);

          const observed = (histo.get('heavier') ?? 0) / n,
                expected = w1 / (w1 + w2);

          expect(Math.abs(observed - expected)).toBeLessThan(0.05);

        }
      ),
      { numRuns: 25 }
    );

  });

});





describe('array_box_if_string', () => {

  test('strings come back as a one-element array', () => {

    fc.assert(
      fc.property(
        fc.string(),
        (s) => {
          expect(array_box_if_string(s)).toEqual([s]);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('non-strings pass through unchanged, by identity', () => {

    fc.assert(
      fc.property(
        fc.oneof(
          fc.array(fc.string()),
          fc.integer(),
          fc.boolean(),
          fc.constant(undefined),
          fc.constant(null),
          fc.object()
        ),
        (v) => {
          expect(array_box_if_string(v)).toBe(v);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('name_bind_prop_and_state', () => {

  test('any string pair round-trips through the JSON composite key', () => {

    fc.assert(
      fc.property(
        fc.fullUnicodeString(),
        fc.fullUnicodeString(),
        (prop, state) => {
          expect(JSON.parse(name_bind_prop_and_state(prop, state))).toEqual([prop, state]);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('non-string prop or state throws', () => {

    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(undefined), fc.constant(null)),
        fc.string(),
        (bad, good) => {
          expect(() => name_bind_prop_and_state(bad as unknown as string, good)).toThrow();
          expect(() => name_bind_prop_and_state(good, bad as unknown as string)).toThrow();
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('sleep', () => {

  test('resolves, and not before the requested delay', async () => {

    const started = Date.now();
    await sleep(30);
    const elapsed = Date.now() - started;

    // setTimeout can fire ~1ms early due to clock rounding; 25 is a safe floor
    expect(elapsed).toBeGreaterThanOrEqual(25);

  });

});
