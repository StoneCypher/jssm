const array_box_if_string = n => typeof n === 'string' ? [n] : n;
const weighted_rand_select = (options, probability_property = 'probability') => {
    if (!Array.isArray(options)) {
        throw new TypeError('options must be a non-empty array of objects');
    }
    if (!(typeof options[0] === 'object')) {
        throw new TypeError('options must be a non-empty array of objects');
    }
    const frand = (cap) => Math.random() * cap, or_one = (item) => item === undefined ? 1 : item, prob_sum = options.reduce((acc, val) => acc + or_one(val[probability_property]), 0), rnd = frand(prob_sum);
    let cursor = 0, cursor_sum = 0;
    while ((cursor_sum += or_one(options[cursor++][probability_property])) <= rnd) { }
    return options[cursor - 1];
};
const seq = (n) => (new Array(n)).fill(true)
    .map((_, i) => i);
const histograph = (ar) => ar.sort()
    .reduce((m, v) => (m.set(v, (m.has(v) ? m.get(v) + 1 : 1)), m), new Map());
const weighted_sample_select = (n, options, probability_property) => seq(n)
    .map((_i) => weighted_rand_select(options, probability_property));
const weighted_histo_key = (n, opts, prob_prop, extract) => histograph(weighted_sample_select(n, opts, prob_prop)
    .map((s) => s[extract]));
export { seq, histograph, weighted_histo_key, weighted_rand_select, weighted_sample_select, array_box_if_string };
