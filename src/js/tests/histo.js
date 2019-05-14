
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js');





describe('histograph/1', async it => {

  it('([]) generates Map()', t => t.deepEqual(new Map(),              jssm.histograph([])      ));
  it('([]) generates Map()', t => t.deepEqual(new Map([[1,1]]),       jssm.histograph([1])     ));
  it('([]) generates Map()', t => t.deepEqual(new Map([[1,1],[2,1]]), jssm.histograph([1,2])   ));
  it('([]) generates Map()', t => t.deepEqual(new Map([[1,2],[2,1]]), jssm.histograph([1,1,2]) ));

});

// stochable
