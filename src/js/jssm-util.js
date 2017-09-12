
// @flow

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

  while ((cursor_sum += or_one((options:any)[cursor++][probability_property])) <= rnd) { } // eslint-disable-line no-empty,fp/no-loops
  return options[cursor-1];

};
/* eslint-enable flowtype/no-weak-types */





const seq: Function = (n: number): Array<number> =>

    (new Array(n)).fill(true)
                  .map( (_, i): number => i );





const histograph: Function = (a : Array<any>) => // eslint-disable-line flowtype/no-weak-types

    a.sort().reduce( (m,v): Map<any, any> => ( m.set(v, (m.has(v)? m.get(v)+1 : 1)) , m), new Map() );  // eslint-disable-line flowtype/no-weak-types,no-sequences





const weighted_sample_select: Function = (n: number, options: Array<mixed>, probability_property: string): Array<any> => // eslint-disable-line flowtype/no-weak-types

    seq(n).map( (_i): any => weighted_rand_select(options, probability_property)); // eslint-disable-line flowtype/no-weak-types





const weighted_histo_key: Function = (n: number, opts: Array<mixed>, prob_prop: string, extract: string): Array<any> => // eslint-disable-line flowtype/no-weak-types

    histograph(weighted_sample_select(n, opts, prob_prop).map( (s): any => s[extract])); // eslint-disable-line flowtype/no-weak-types





export { seq, histograph, weighted_histo_key, weighted_rand_select, weighted_sample_select };
