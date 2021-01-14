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
const seq = (n) => (new Array(n)).fill(true)
    .map((_, i) => i);
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
export { seq, histograph, weighted_histo_key, weighted_rand_select, weighted_sample_select, array_box_if_string };
