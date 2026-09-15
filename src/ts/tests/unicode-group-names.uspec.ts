
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips, bareword_ok, quoted } from './unicode.uspec-driver';





// A named-list / group declaration `&<name> : [ ... ];` names a group whose
// identifier is a Label.  Group names are a distinct syntactic position from
// state names (they stand in for states via `&name` references), so they get
// their own sweep.  Verified at the parse-AST level: the declaration becomes
// `{ key: 'named_list', name, value }`.

const group_name_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  let ast;

  if (bareword_ok(cp)) {

    try {
      ast = parse(`&${cp}: [a b]; a -> b;`);
    } catch {
      throw new Error(`Bareword broke on ${idx} "${cp}"`);
    }

  } else {

    // not an identifier character: the bareword form must be rejected, and
    // the quoted form must work everywhere the bareword used to
    expect(() => parse(`&${cp}: [a b]; a -> b;`)).toThrow();

    const q = quoted(cp);

    try {
      ast = parse(`&${q}: [a b]; a -> b;`);
    } catch {
      throw new Error(`Quoted form broke on ${idx} ${q}`);
    }

  }

  const decl = ast.find((t: any) => t.key === 'named_list');

  expect( decl?.name ).toBe(cp);

  return true;

};





describe('Characters as group / named-list names', () => {
  test_range_with(1, group_name_test);
});
