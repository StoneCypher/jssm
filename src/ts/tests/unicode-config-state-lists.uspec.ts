
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





// The config lists `start_states`, `end_states`, and `failed_outputs` hold
// state-name references, so a Unicode state name flows through them.  All
// three are swept here.  Verified at the parse-AST level: a config node keyed
// by the list name whose `value` is the array of names.

const list_forms = [
  { src: `${'X'} -> b; start_states: [X];`,    key: 'start_states'   },
  { src: `b -> ${'X'}; end_states: [X];`,      key: 'end_states'     },
  { src: `${'X'} -> b; failed_outputs: [X];`,  key: 'failed_outputs' }
];

const config_list_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(atom_skips.includes(cp))) {

    for (const form of list_forms) {

      const src = form.src.split('X').join(cp);

      let ast;

      try {
        ast = parse(src);
      } catch (e) {
        throw new Error(`Broke on ${idx} "${cp}" for ${form.key}`);
      }

      const node = ast.find((t: any) => t.key === form.key);

      expect( node?.value?.includes(cp) ).toBe(true);

    }

  }

  return true;

};





describe('Characters in config state lists', () => {
  test_range_with(3, config_list_test);
});
