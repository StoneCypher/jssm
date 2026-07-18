
 

import { sm } from '../jssm';

const glob           = require('glob'),

      language_files = glob.sync('./src/ts/tests/language_data/*.json', {})  // for some reason glob is project-relative
                           .map(rel => rel.replace('/src/ts/tests', ''));    // instead of execution relative like i'd expect





describe('base data walk/1', () => {

  for (const [i, language_file] of language_files.entries()) {

    const testData   = require(language_file),
          testTokens = testData.cases;

    const foreignTarget = sm`${testData.native_name} -> ${testData.english_name} -> ${testTokens.join(' -> ')};`;

    describe(`language ${i} "${testData.english_name}" contains all states`, () => {

      for (const tok of testTokens) {
        // eslint-disable-next-line vitest/valid-title -- title is data-driven by design
        test(tok, () =>
          expect( foreignTarget.states().includes(tok) ).toBe(true)
        );
      }

    });

  }


});
