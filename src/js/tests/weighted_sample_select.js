
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js');





describe('weighted_sample_select/2', async it => {

  const fruit = [ { label: 'apple',  probability: 0.1 },
                  { label: 'orange', probability: 0.4 },
                  { label: 'banana', probability: 0.5 } ];

  const none = jssm.weighted_sample_select(0, fruit),
        one  = jssm.weighted_sample_select(1, fruit),
        some = jssm.weighted_sample_select(2, fruit),
        over = jssm.weighted_sample_select(4, fruit);

  it('0 returns []',                t => t.deepEqual(0, none.length));
  it('1 returns [any]',             t => t.deepEqual(1, one.length) );
  it('2 returns [any,any]',         t => t.deepEqual(2, some.length));
  it('4 returns [any,any,any,any]', t => t.deepEqual(4, over.length));

});

// stochable
