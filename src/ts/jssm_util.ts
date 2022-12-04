
import { JssmError } from './jssm_error';





/*******
 *
 *  Predicate for validating an array for uniqueness.  Not generally meant for
 *  external use.
 *
 */

function arr_uniq_p<T>(el: T, i: number, source: T[]): boolean {
  return source.indexOf(el) === i;
}





const array_box_if_string = n =>
  typeof n === 'string'? [n] : n;





// this is explicitly about other peoples' data, so it has to be weakly typed
/* eslint-disable flowtype/no-weak-types */

const weighted_rand_select: Function = (options: Array<any>, probability_property: string = 'probability'): any => {

  if (!Array.isArray(options)) {
    throw new TypeError('options must be a non-empty array of objects');
  }

  if (!(typeof options[0] === 'object')) {
    throw new TypeError('options must be a non-empty array of objects');
  }

  const frand      : Function = (cap): number => Math.random() * cap,
        or_one     : Function = (item): any   => item === undefined? 1 : item,
        prob_sum   : number   = options.reduce( (acc, val:any): number => acc + or_one(val[probability_property]), 0 ),
        rnd        : number   = frand(prob_sum);

  let   cursor     : number   = 0,
        cursor_sum : number   = 0;

  while ((cursor_sum += or_one(options[cursor++][probability_property])) <= rnd) { } // eslint-disable-line no-empty,fp/no-loops
  return options[cursor-1];

};

/* eslint-enable flowtype/no-weak-types */





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

function seq(n: number): number[] {

  if (!(Number.isInteger(n))) {
    throw new TypeError('seq/1 takes a non-negative integer n as an argument');
  }

  if (n < 0) {
    throw new TypeError('seq/1 takes a non-negative integer n as an argument');
  }

  return (new Array(n))
           .fill(true)
           .map( (_, i): number => i );

}





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

const histograph: Function = (ar : any[]): Map<any, number> => // eslint-disable-line flowtype/no-weak-types

    ar.sort()
      .reduce(
        (m,v): Map<any, any> =>    // TODO FIXME eslint-disable-line flowtype/no-weak-types,no-sequences
          ( m.set(v, (m.has(v)? m.get(v)+1 : 1)) , m),
          new Map()
      );





const weighted_sample_select: Function = (n: number, options: Array<any>, probability_property: string): Array<any> => // TODO FIXME no any // eslint-disable-line flowtype/no-weak-types

    seq(n)
      .map( (_i): any =>   // TODO FIXME eslint-disable-line flowtype/no-weak-types
        weighted_rand_select(options, probability_property)
      );





const weighted_histo_key: Function = (n: number, opts: Array<any>, prob_prop: string, extract: string): Array<any> => // TODO FIXME no any // eslint-disable-line flowtype/no-weak-types

    histograph(
      weighted_sample_select(n, opts, prob_prop)
        .map(
          (s): any => s[extract]     // TODO FIXME eslint-disable-line flowtype/no-weak-types
        )
    );





/*******
 *
 *  Internal method generating names for edges for the hook lookup map.  Not
 *  meant for external use.
 *
 */

function name_bind_prop_and_state(prop: string, state: string): string {

  if (typeof prop  !== 'string') {
    throw new JssmError(undefined, `Name of property must be a string; got ${prop}`);
  }

  if (typeof state !== 'string') {
    throw new JssmError(undefined, `Name of state must be a string; got ${prop}`);
  }

  return JSON.stringify([prop, state]);

}





/*******
 *
 *  Internal method generating names for edges for the hook lookup map.  Not
 *  meant for external use.
 *
 */

const hook_name = (from: string, to: string): string =>

  JSON.stringify([from, to]);





/*******
 *
 *  Internal method generating names for actions for the hook lookup map.  Not
 *  meant for external use.
 *
 */

const named_hook_name = (from: string, to: string, action: string): string =>

  JSON.stringify([from, to, action]);





/*******
 *
 *  Creates a Mulberry32 random generator.  Used by the randomness test suite.
 *
 *  Sourced from `bryc` at StackOverflow: https://stackoverflow.com/a/47593316/763127
 *
 */

const make_mulberry_rand = (a?: number | undefined) =>

  () => {

    if (a === undefined) { a = new Date().getTime(); }

    let t  = a += 0x6D2B79F5;
        t  = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);

    return ((t ^ t >>> 14) >>> 0) / 4294967296;

  };





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

const unique = <T>(arr?: T[]) =>

  arr.filter( (v, i, a) => a.indexOf(v) === i );





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

function find_repeated<T>(arr: T[]): [T, number][] {

  const uniqued = unique<T>(arr);

  if (uniqued.length !== arr.length) {

    const residue_keys = new Map();

    arr.forEach(k =>
      residue_keys.set(
        k,
        residue_keys.has(k)
          ? (residue_keys.get(k)+1)
          : 1
      )
    );

    uniqued.forEach(k =>
      residue_keys.set(
        k,
        residue_keys.get(k) - 1
      )
    );

    return [ ... residue_keys.entries() ]
             .filter( (e) => ( (e[1] > 0) && (!(Number.isNaN(e[0]))) ) )
             .map( (e) => [e[0], e[1]+1] );

  } else {
    return [];
  }

}





export {
  seq,
  unique, find_repeated,
  arr_uniq_p,
  histograph, weighted_histo_key,
  weighted_rand_select, weighted_sample_select,
  array_box_if_string,
  name_bind_prop_and_state, hook_name, named_hook_name,
  make_mulberry_rand
};

