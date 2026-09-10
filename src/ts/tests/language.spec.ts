
 

import { sm, is_state_name_first_char, is_state_name_char } from '../jssm';

const glob           = require('glob'),

      language_files = glob.sync('./src/ts/tests/language_data/*.json', {})  // for some reason glob is project-relative
                           .map(rel => rel.replace('/src/ts/tests', ''));    // instead of execution relative like i'd expect

// #754: these fixtures carry names in arbitrary scripts, plus symbol- and
// digit-leading cases that are no longer legal unquoted barewords under the
// 6.0 Unicode-identifier charset. Quoting every name unconditionally would
// sidestep the bareword charset entirely and silently drop this suite's
// only cross-validation of `is_state_name_first_char`/`is_state_name_char`
// against real-world fixture text: a regression in either predicate (e.g.
// the continuation class losing a combining-mark range) would go
// undetected if every name — including the ones already valid as barewords,
// like `état`/`состояние` — were blanket-quoted. `bareword` reimplements the
// grammar's own rule (first code point passes `is_state_name_first_char`,
// every remaining code point passes `is_state_name_char`) over the
// fixture text; `quote` leaves an already-legal bareword untouched and
// quotes only what actually needs it, so scripts like `état`/`состояние`
// still exercise the parser as *bare* names, unchanged from pre-#754.
const bareword = (s: string): boolean => {
  const [first, ...rest] = [...s];
  return first !== undefined
    && is_state_name_first_char(first)
    && rest.every(is_state_name_char);
};

const quote = (s: string): string => bareword(s) ? s : JSON.stringify(s);





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
