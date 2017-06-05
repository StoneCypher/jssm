
import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('seq/1', async it => {

  it('(0) generates []',    t => t.deepEqual([],    jssm.seq(0) ));
  it('(1) generates [0]',   t => t.deepEqual([0],   jssm.seq(1) ));
  it('(2) generates [0,1]', t => t.deepEqual([0,1], jssm.seq(2) ));

});

// stochable
