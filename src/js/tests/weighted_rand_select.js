
import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('weighted_rand_select/2', async it => {

  const fruit = [ { label: 'apple',  probability: 0.1 },
                  { label: 'orange', probability: 0.4 },
                  { label: 'banana', probability: 0.5 } ];

  const acc = {};
  for (var i=0; i<10000; ++i) {
  	  acc[jssm.weighted_rand_select(fruit).label] = (acc[jssm.weighted_rand_select(fruit).label] || 0) + 1;
  }

  it('banana baseline', t => t.deepEqual(true, acc.banana > 3000 ));

});

// stochable
