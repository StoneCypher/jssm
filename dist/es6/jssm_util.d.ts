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
 *  Creates a Mulberry32 random generator.  Used by the randomness test suite.
 *
 *  Sourced from `bryc` at StackOverflow: https://stackoverflow.com/a/47593316/763127
 *
 */
declare const make_mulberry_rand: (a?: number | undefined) => () => number;
export { seq, arr_uniq_p, histograph, weighted_histo_key, weighted_rand_select, weighted_sample_select, array_box_if_string, hook_name, named_hook_name, make_mulberry_rand };
