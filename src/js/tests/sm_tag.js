
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js'),
      sm   = jssm.sm;





describe('sm``', async _parse_it => {

    describe('sm`a->b;`', async it => {
      it('doesn\'t throw', t => t.notThrows(() => { const foo = sm`a -> b;`; }) );
    });

});

// stochable
