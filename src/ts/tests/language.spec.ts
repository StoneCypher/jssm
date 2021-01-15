
/* eslint-disable max-len */

const glob           = require('glob');

const jssm           = require('../jssm'),
      sm             = jssm.sm,

      language_files = glob.sync('./src/ts/tests/language_data/*.json', {})  // for some reason glob is project-relative
                           .map(rel => rel.replace('/src/ts/tests', ''));    // instead of execution relative like i'd expect





describe('base data walk/1', () => {

  language_files.map( (language_file, i) => {

    const testData   = require(language_file),
          testTokens = testData.cases;

    const foreignTarget = sm([`${testData.native_name} -> ${testData.english_name} -> ${testTokens.join(' -> ')};`]);

    describe(`language ${i} "${testData.english_name}" contains all states`, () => {

      testTokens.map(tok =>
        test(tok, () =>
          expect( foreignTarget.states().includes(tok) ).toBe(true)
        )
      );

    });

  });


});
