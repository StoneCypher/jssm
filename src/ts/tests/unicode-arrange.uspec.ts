
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





// The layout declarations `arrange`, `arrange-start`, and `arrange-end` each
// take a Label-or-list of state names.  All three are swept here.  Verified at
// the parse-AST level: `{ key: 'arrange_declaration' | 'arrange_start_declaration'
// | 'arrange_end_declaration', value: [...] }`.

const arrange_forms = [
  { src: 'arrange',       key: 'arrange_declaration'       },
  { src: 'arrange-start', key: 'arrange_start_declaration' },
  { src: 'arrange-end',   key: 'arrange_end_declaration'   }
];

const arrange_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(atom_skips.includes(cp))) {

    for (const form of arrange_forms) {

      let ast;

      try {
        ast = parse(`${form.src} [${cp}];`);
      } catch {
        throw new Error(`Broke on ${idx} "${cp}" for ${form.src}`);
      }

      const decl = ast.find((t: any) => t.key === form.key);

      expect( decl?.value?.includes(cp) ).toBe(true);

    }

  }

  return true;

};





describe('Characters in arrange declarations', () => {
  test_range_with(3, arrange_test);
});
