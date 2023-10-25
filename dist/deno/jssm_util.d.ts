/*******
 *
 *  Predicate for validating an array for uniqueness.  Not generally meant for
 *  external use.
 *
 */
declare function arr_uniq_p<T>(el: T, i: number, source: T[]): boolean;
declare const array_box_if_string: (n: any) => any;
declare const weighted_rand_select: Function;
/*******
 *
 *  Returns, for a non-negative integer argument `n`, the series `[0 .. n]`.
 *
 *  ```typescript
 *  import { seq } from './jssm';
 *
 *  seq(5);  // [0, 1, 2, 3, 4]
 *  seq(0);  // []
 *  ```
 *
 */
declare function seq(n: number): number[];
/*******
 *
 *  Returns the histograph of an array as a `Map`.  Makes no attempt to cope
 *  with deep equality; will fail for complex contents, as such.
 *
 *  ```typescript
 *  import { histograph } from './jssm';
 *
 *  histograph( [0, 0, 1, 1, 2, 2, 1] );  // Map()
 *  ```
 *
 */
declare const histograph: Function;
declare const weighted_sample_select: Function;
declare const weighted_histo_key: Function;
/*******
 *
 *  Internal method generating names for edges for the hook lookup map.  Not
 *  meant for external use.
 *
 */
declare function name_bind_prop_and_state(prop: string, state: string): string;
/*******
 *
 *  Internal method generating names for edges for the hook lookup map.  Not
 *  meant for external use.
 *
 */
declare const hook_name: (from: string, to: string) => string;
/*******
 *
 *  Internal method generating names for actions for the hook lookup map.  Not
 *  meant for external use.
 *
 */
declare const named_hook_name: (from: string, to: string, action: string) => string;
/*******
 *
 *  Creates a SplitMix32 random generator.  Used by the randomness test suite.
 *
 *  Sourced from `bryc`: https://github.com/bryc/code/blob/master/jshash/PRNGs.md#splitmix32
 *
 *  Replaces the Mulberry generator, which was found to have problems
 *
 */
declare function gen_splitmix32(a?: number | undefined): () => number;
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
declare const unique: <T>(arr?: T[]) => T[];
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
export { seq, unique, find_repeated, arr_uniq_p, histograph, weighted_histo_key, weighted_rand_select, weighted_sample_select, array_box_if_string, name_bind_prop_and_state, hook_name, named_hook_name, gen_splitmix32 };
