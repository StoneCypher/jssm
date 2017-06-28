
const weighted_rand_select = (options : Array<any>, probability_property : string = 'probability') => {

  if (!Array.isArray(options)) {
    throw new TypeError('options must be a non-empty array of objects');
  }

  if (!(typeof options[0] === 'object')) {
    throw new TypeError('options must be a non-empty array of objects');
  }

  const frand      = cap => Math.random() * cap,
        prob_sum   = options.reduce( (acc, val:any) => acc + val[probability_property], 0 ),
        rnd        = frand(prob_sum);

  var   cursor     = 0,
        cursor_sum = 0;

  while ((cursor_sum += (options:any)[cursor++][probability_property]) <= rnd) { }
  return options[cursor-1];

};





const seq = (n : number) =>

    (new Array(n)).fill(true).map( (_,i) => i );





const histograph = (a : Array<any>) =>

    a.sort().reduce( (m,v) => ( m.set(v, (m.has(v)? m.get(v)+1 : 1)) , m), new Map() );





const weighted_sample_select = (n : number, options : Array<mixed>, probability_property : string) =>

    seq(n).map(i => weighted_rand_select(options, probability_property));





const weighted_histo_key = (n : number, options : Array<mixed>, probability_property : string, extract : string) =>

    histograph(weighted_sample_select(n, options, probability_property).map( (s:any) => s[extract]));





export { seq, histograph, weighted_histo_key, weighted_rand_select, weighted_sample_select };
