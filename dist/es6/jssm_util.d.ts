import { JssmRng } from './jssm_types.js';
/*******
 *
 *  Predicate for validating an array for uniqueness.  Returns `true` when
 *  `el` is the first occurrence in `source`, `false` otherwise.  Intended
 *  for use as an `Array.filter` callback.  Not generally meant for external
 *  use.
 *
 *  ```typescript
 *  [1, 2, 2, 3].filter(arr_uniq_p);  // [1, 2, 3]
 *  ```
 *
 *  @param el     - The current element being tested.
 *  @param i      - The index of the current element.
 *  @param source - The full array being filtered.
 *
 *  @returns `true` if `el` is the first occurrence in `source`.
 *
 */
declare function arr_uniq_p<T>(el: T, i: number, source: T[]): boolean;
/*******
 *
 *  Wraps a string in an array, or passes through if already non-string.
 *  Used to normalize arguments that accept either a single state name or
 *  an array of state names.
 *
 *  ```typescript
 *  array_box_if_string('hello');    // ['hello']
 *  array_box_if_string(['a','b']); // ['a','b']
 *  ```
 *
 *  @param n - A string to box, or a value to pass through unchanged.
 *
 *  @returns The input wrapped in an array if it was a string, otherwise the
 *           input unchanged.
 *
 */
declare const array_box_if_string: (n: any) => any;
/*******
 *
 *  Selects a single item from a weighted array of objects using cumulative
 *  probability.  Each object in the array should have a numeric property
 *  indicating its relative weight (defaults to `'probability'`).  Objects
 *  missing the property are treated as weight 1.
 *
 *  ```typescript
 *  const opts = [
 *    { value: 'common',  probability: 0.8 },
 *    { value: 'rare',    probability: 0.2 }
 *  ];
 *
 *  weighted_rand_select(opts);  // most often { value: 'common', ... }
 *  ```
 *
 *  @param options              - Non-empty array of objects to choose from.
 *  @param probability_property - Name of the numeric weight property on each
 *                                object.  Defaults to `'probability'`.
 *  @param rng                  - Optional random number generator `() => number`
 *                                in `[0, 1)`.  Defaults to `Math.random`.
 *
 *  @returns One element from `options`, chosen by weighted random selection.
 *
 *  @throws {TypeError} If `options` is not a non-empty array of objects.
 *
 */
declare const weighted_rand_select: (options: Array<any>, probability_property?: string, rng?: JssmRng) => any;
/*******
 *
 *  Returns, for a non-negative integer argument `n`, the series `[0 .. n]`.
 *
 *  ```typescript
 *  import { seq } from './jssm.js';
 *
 *  seq(5);  // [0, 1, 2, 3, 4]
 *  seq(0);  // []
 *  ```
 *
 */
declare function seq(n: number): number[];
/*******
 *
 *  Comparator reproducing `Array.prototype.sort`'s default ordering (compare
 *  as strings), so histogram key order stays byte-identical to the historic
 *  comparator-free sort — that ordering is observable to every iterating
 *  caller.
 *
 *  ```typescript
 *  [10, 9, 1].sort(default_lexicographic);  // [1, 10, 9], as with plain .sort()
 *  ```
 *
 */
declare const default_lexicographic: (a: any, b: any) => number;
/*******
 *
 *  Returns the histograph of an array as a `Map`.  Makes no attempt to cope
 *  with deep equality; will fail for complex contents, as such.
 *
 *  ```typescript
 *  import { histograph } from './jssm.js';
 *
 *  histograph( [0, 0, 1, 1, 2, 2, 1] );  // Map()
 *  ```
 *
 */
declare const histograph: (ar: any[]) => Map<any, number>;
/*******
 *
 *  Draws `n` weighted random samples from an array of objects.  Each draw is
 *  independent (with replacement), delegating to {@link weighted_rand_select}.
 *
 *  ```typescript
 *  const opts = [
 *    { value: 'a', probability: 0.9 },
 *    { value: 'b', probability: 0.1 }
 *  ];
 *
 *  weighted_sample_select(3, opts, 'probability');
 *  // e.g. [ { value: 'a', ... }, { value: 'a', ... }, { value: 'b', ... } ]
 *  ```
 *
 *  @param n                    - Number of samples to draw.
 *  @param options              - Non-empty array of weighted objects.
 *  @param probability_property - Name of the numeric weight property.
 *  @param rng                  - Optional random number generator.
 *
 *  @returns An array of `n` independently selected items.
 *
 */
declare const weighted_sample_select: (n: number, options: Array<any>, probability_property: string, rng?: JssmRng) => Array<any>;
/*******
 *
 *  Draws `n` weighted random samples, extracts a named key from each, and
 *  returns a histograph (`Map`) of how often each key value appeared.  Useful
 *  for validating that a probabilistic transition distribution is roughly
 *  correct over many trials.
 *
 *  ```typescript
 *  const opts = [
 *    { to: 'a', probability: 0.7 },
 *    { to: 'b', probability: 0.3 }
 *  ];
 *
 *  weighted_histo_key(1000, opts, 'probability', 'to');
 *  // Map { 'a' => ~700, 'b' => ~300 }
 *  ```
 *
 *  @param n         - Number of samples to draw.
 *  @param opts      - Non-empty array of weighted objects.
 *  @param prob_prop - Name of the numeric weight property.
 *  @param extract   - Name of the property to extract from each sample for
 *                     histogramming.
 *  @param rng       - Optional random number generator.
 *
 *  @returns A `Map` from extracted key values to their occurrence counts.
 *
 */
declare const weighted_histo_key: (n: number, opts: Array<any>, prob_prop: string, extract: string, rng?: JssmRng) => Map<any, number>;
/*******
 *
 *  Internal method generating composite keys for the hook lookup map by
 *  JSON-serializing a `[property, state]` pair.  Not meant for external use.
 *
 *  ```typescript
 *  name_bind_prop_and_state('color', 'Red');  // '["color","Red"]'
 *  ```
 *
 *  @param prop  - The property name (e.g. a data key or hook category).
 *  @param state - The state name to bind to.
 *
 *  @returns A deterministic JSON string key for the `[prop, state]` pair.
 *
 *  @throws {JssmError} If either argument is not a string.
 *
 */
declare function name_bind_prop_and_state(prop: string, state: string): string;
/*******
 *
 *  Creates a SplitMix32 random generator.  Used by the randomness test suite.
 *
 *  Sourced from `bryc`: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#splitmix32
 *
 *  Replaces the Mulberry generator, which was found to have problems
 *
 */
declare function gen_splitmix32(a?: number): () => number;
/*******
 *
 *  Reduces an array to its unique contents.  Compares with `===` and makes no
 *  effort to deep-compare contents; two matching arrays or objects contained
 *  will be treated as distinct, according to javascript rules.  This also means
 *  that `NaNs` will be ***dropped***, because they do not self-compare.
 *
 *  ```typescript
 *  unique( [] );                     // []
 *  unique( [0,0] );                  // [0]
 *  unique( [0,1,2, 0,1,2, 0,1,2] );  // [0,1,2]
 *  unique( [ [1], [1] ] );           // [ [1], [1] ] because arrays don't match
 *  unique( [0,NaN,2] );              // [0,2]
 *  ```
 *
 */
declare const unique: <T>(arr: T[]) => T[];
/*******
 *
 *  Lists all repeated items in an array along with their counts.  Subject to
 *  matching rules of Map.  `NaN` is manually removed because of conflict rules
 *  around {@link unique}.  Because these are compared with `===` and because
 *  arrays and objects never match that way unless they're the same object,
 *  arrays and objects are never considered repeats.
 *
 *  ```typescript
 *  find_repeated<string>([ ]);                     // []
 *  find_repeated<string>([ "one" ]);               // []
 *  find_repeated<string>([ "one", "two" ]);        // []
 *  find_repeated<string>([ "one", "one" ]);        // [ ["one", 2] ]
 *  find_repeated<string>([ "one", "two", "one" ]); // [ ["one", 2] ]
 *  find_repeated<number>([ 0, NaN, 0, NaN ]);      // [ [0,     2] ]
 *  ```
 *
 */
declare function find_repeated<T>(arr: T[]): [T, number][];
/*******
 *
 *  Returns a `Promise` that resolves after `ms` milliseconds.  Useful for
 *  inserting delays in async test flows or demos.
 *
 *  ```typescript
 *  await sleep(100);  // pauses execution for 100ms
 *  ```
 *
 *  @param ms - Number of milliseconds to wait before resolving.
 *
 *  @returns A `Promise<void>` that resolves after the timeout.
 *
 */
declare function sleep(ms: number): Promise<unknown>;
export { seq, unique, find_repeated, arr_uniq_p, default_lexicographic, histograph, weighted_histo_key, weighted_rand_select, weighted_sample_select, array_box_if_string, name_bind_prop_and_state, gen_splitmix32, sleep };
