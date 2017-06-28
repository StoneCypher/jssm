
import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('weighted_sample_select/1', async it => {

  // wow is this hard to meaningfully test
  it('(0) generates []', t => t.deepEqual([], jssm.weighted_sample_select(0, [{item:'a',probability:2},{item:'a',probability:3}]) ));

  // stochastics would help, eg "every returned item is a member" and "in a
  // sufficient list any positive sample size is reasonable" and "always
  // returns the right sample size" - whargarbl todo


});

// stochable
