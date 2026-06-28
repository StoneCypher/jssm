
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





// A hook declaration `on enter|exit <subject> do '<action>';` carries Unicode
// in two positions: the subject (a Label / group reference) and the action
// label.  Both are swept here.  Verified at the parse-AST level:
// `{ key: 'hook_decl', event, subject, action }`.

const hook_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(atom_skips.includes(cp))) {

    let subject_ast, action_ast;

    try {
      subject_ast = parse(`on enter ${cp} do 'act'; a -> b;`);
      action_ast  = parse(`on enter s do '${cp}'; s -> b;`);
    } catch (e) {
      throw new Error(`Broke on ${idx} "${cp}"`);
    }

    const subj = subject_ast.find((t: any) => t.key === 'hook_decl');
    const act  = action_ast.find((t: any) => t.key === 'hook_decl');

    expect( subj?.subject ).toBe(cp);
    expect( act?.action   ).toBe(cp);

  }

  return true;

};





describe('Characters in hook subjects and actions', () => {
  test_range_with(2, hook_test);
});
