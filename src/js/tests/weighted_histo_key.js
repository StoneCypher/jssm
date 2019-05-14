
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js');





describe('weighted_histo_key/2', async it => {

  const fruit = [ { label: 'apple',  probability: 0.1 },
                  { label: 'orange', probability: 0.4 },
                  { label: 'banana', probability: 0.5 } ];

  const out = jssm.weighted_histo_key(10000, fruit, 'probability', 'label');

  it('produces a well formed probability map', t => t.deepEqual(3, [... out.keys()].length ));

});

// stochable
