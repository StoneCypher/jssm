
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js'),
      sm   = jssm.sm;





describe('machine name', async it => {

  it('doesn\'t throw', t => t.notThrows(() => { const _foo = sm`machine_name: bob; a->b;`; }) );

});
