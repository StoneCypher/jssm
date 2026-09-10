
 

import { sm } from '../jssm';

const glob           = require('glob'),

      language_files = glob.sync('./src/ts/tests/language_data/*.json', {})  // for some reason glob is project-relative
                           .map(rel => rel.replace('/src/ts/tests', ''));    // instead of execution relative like i'd expect

// #754: these fixtures carry names in arbitrary scripts, plus symbol- and
// digit-leading cases that are no longer legal unquoted barewords under the
// 6.0 Unicode-identifier charset.  Quoting every name in the FSL source
// sidesteps the bareword charset entirely (a quoted String has no character
// restrictions) while leaving the comparison below — which checks the raw,
// unquoted fixture strings against `states()` — unchanged, since FSL
// unescapes a quoted name back to its literal content.
const quote = (s: string) => JSON.stringify(s);





describe('base data walk/1', () => {

  for (const [i, language_file] of language_files.entries()) {

    const testData   = require(language_file),
          testTokens = testData.cases;

    const foreignTarget = sm`${quote(testData.native_name)} -> ${quote(testData.english_name)} -> ${testTokens.map(quote).join(' -> ')};`;

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
