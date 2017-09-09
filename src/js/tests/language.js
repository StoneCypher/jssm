
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js'),
      sm   = jssm.sm,

      testData   = require('./language_data/english.json'),
      testTokens = testData.cases;




describe('english/1', async _it => {

  const foreignTarget = sm([`${testTokens.join(' -> ')};`]);

  describe('contains all states', async it => {
    testTokens.map(tok =>
      it(tok, t => t.is(true, foreignTarget.states().includes(tok)))
    );
  });

});
