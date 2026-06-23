
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





// The subject of a `state <name>: { ... };` declaration is a Label.  This is
// a different parse path from a state name appearing in a transition, so it
// gets its own sweep.  Verified at the parse-AST level: the declaration
// becomes `{ key: 'state_declaration', name, value }`.

const state_decl_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(atom_skips.includes(cp))) {

    let ast;

    try {
      ast = parse(`state ${cp}: { color: red; };`);
    } catch (e) {
      throw new Error(`Broke on ${idx} "${cp}"`);
    }

    expect( ast[0].key  ).toBe('state_declaration');
    expect( ast[0].name ).toBe(cp);

  }

  return true;

};





describe('Characters as state-declaration subject names', () => {
  test_range_with(1, state_decl_test);
});
