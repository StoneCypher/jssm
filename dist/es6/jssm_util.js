/*******
 *
 *  Predicate for validating an array for uniqueness.  Not generally meant for
 *  external use.
 *
 */
function arr_uniq_p(el, i, source) {
    return source.indexOf(el) === i;
}
const array_box_if_string = n => typeof n === 'string' ? [n] : n;
// this is explicitly about other peoples' data, so it has to be weakly typed
/* eslint-disable flowtype/no-weak-types */
const weighted_rand_select = (options, probability_property = 'probability') => {
    if (!Array.isArray(options)) {
        throw new TypeError('options must be a non-empty array of objects');
    }
    if (!(typeof options[0] === 'object')) {
        throw new TypeError('options must be a non-empty array of objects');
    }
    const frand = (cap) => Math.random() * cap, or_one = (item) => item === undefined ? 1 : item, prob_sum = options.reduce((acc, val) => acc + or_one(val[probability_property]), 0), rnd = frand(prob_sum);
    let cursor = 0, cursor_sum = 0;
    while ((cursor_sum += or_one(options[cursor++][probability_property])) <= rnd) { } // eslint-disable-line no-empty,fp/no-loops
    return options[cursor - 1];
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
function seq(n) {
    if (!(Number.isInteger(n))) {
        throw new TypeError('seq/1 takes a non-negative integer n as an argument');
    }
    if (n < 0) {
        throw new TypeError('seq/1 takes a non-negative integer n as an argument');
    }
    return (new Array(n))
        .fill(true)
        .map((_, i) => i);
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
const histograph = (ar) => // eslint-disable-line flowtype/no-weak-types
 ar.sort()
    .reduce((m, v) => // TODO FIXME eslint-disable-line flowtype/no-weak-types,no-sequences
 (m.set(v, (m.has(v) ? m.get(v) + 1 : 1)), m), new Map());
const weighted_sample_select = (n, options, probability_property) => // TODO FIXME no any // eslint-disable-line flowtype/no-weak-types
 seq(n)
    .map((_i) => // TODO FIXME eslint-disable-line flowtype/no-weak-types
 weighted_rand_select(options, probability_property));
const weighted_histo_key = (n, opts, prob_prop, extract) => // TODO FIXME no any // eslint-disable-line flowtype/no-weak-types
 histograph(weighted_sample_select(n, opts, prob_prop)
    .map((s) => s[extract] // TODO FIXME eslint-disable-line flowtype/no-weak-types
));
/*******
 *
 *  Internal method generating names for edges for the hook lookup map.  Not
 *  meant for external use.
 *
 */
const hook_name = (from, to) => JSON.stringify([from, to]);
/*******
 *
 *  Internal method generating names for actions for the hook lookup map.  Not
 *  meant for external use.
 *
 */
const named_hook_name = (from, to, action) => JSON.stringify([from, to, action]);
/*******
 *
 *  Creates a Mulberry32 random generator.  Used by the randomness test suite.
 *
 *  Sourced from `bryc` at StackOverflow: https://stackoverflow.com/a/47593316/763127
 *
 */
const make_mulberry_rand = (a) => () => {
    if (a === undefined) {
        a = new Date().getTime();
    }
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
export { seq, arr_uniq_p, histograph, weighted_histo_key, weighted_rand_select, weighted_sample_select, array_box_if_string, hook_name, named_hook_name, make_mulberry_rand };
