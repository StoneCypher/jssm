
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





export {
  seq,
  arr_uniq_p,
  histograph, weighted_histo_key,
  weighted_rand_select, weighted_sample_select,
  array_box_if_string,
  hook_name, named_hook_name
};

