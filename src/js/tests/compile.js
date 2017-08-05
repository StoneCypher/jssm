
/* eslint-disable max-len */

import {test, describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('compile/1', async _parse_it => {

    describe('a->b;', async it => {
      const a_to_b_str = `a->b;`;
      it('doesn\'t throw', t => t.notThrows(() => { jssm.compile(jssm.parse(a_to_b_str)); }) );
    });

});

// stochable
