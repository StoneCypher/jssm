
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const glob = require('glob');





const jssm           = require('../../../build/jssm.es5.js'),
      sm             = jssm.sm,

      language_files = glob.sync('./src/js/tests/language_data/*.json', {})  // for some reason glob is project-relative
                           .map(rel => rel.replace('/src/js/tests', ''));    // instead of execution relative like i'd expect





describe('base data walk/1', async _it => {

  language_files.map(language_file => {

    const testData   = require(language_file);
    const testTokens = testData.cases;

    const foreignTarget = sm([`${testData.native_name} -> ${testData.english_name} -> ${testTokens.join(' -> ')};`]);

    describe(`language "${testData.english_name}" contains all states`, async it => {

      testTokens.map(tok =>
        it(tok, t => t.is(true, foreignTarget.states().includes(tok)))
      );

    });

  });


});
