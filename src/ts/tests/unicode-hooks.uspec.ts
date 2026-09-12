
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips, bareword_ok, quoted } from './unicode.uspec-driver';





// A hook declaration `on enter|exit <subject> do '<action>';` carries Unicode
// in two positions: the subject (a Label / group reference) and the action
// label.  Both are swept here.  Verified at the parse-AST level:
// `{ key: 'hook_decl', event, subject, action }`.

const hook_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  // the action is always single-quoted (`'${cp}'`), a value position governed
  // by ActionLabelUnescaped -- no branch on bareword_ok(cp) applies to it
  let action_ast;

  try {
    action_ast = parse(`on enter s do '${cp}'; s -> b;`);
  } catch {
    throw new Error(`Broke (action) on ${idx} "${cp}"`);
  }

  const act = action_ast.find((t: any) => t.key === 'hook_decl');
  expect( act?.action ).toBe(cp);

  // the subject is a Label (Atom / String, #754), so it is a name position
  let subject_ast;

  if (bareword_ok(cp)) {

    try {
      subject_ast = parse(`on enter ${cp} do 'act'; a -> b;`);
    } catch {
      throw new Error(`Bareword broke (subject) on ${idx} "${cp}"`);
    }

  } else {

    // not an identifier character: the bareword form must be rejected, and
    // the quoted form must work everywhere the bareword used to
    expect(() => parse(`on enter ${cp} do 'act'; a -> b;`)).toThrow();

    const q = quoted(cp);

    try {
      subject_ast = parse(`on enter ${q} do 'act'; a -> b;`);
    } catch {
      throw new Error(`Quoted form broke (subject) on ${idx} ${q}`);
    }

  }

  const subj = subject_ast.find((t: any) => t.key === 'hook_decl');
  expect( subj?.subject ).toBe(cp);

  return true;

};





describe('Characters in hook subjects and actions', () => {
  test_range_with(2, hook_test);
});
