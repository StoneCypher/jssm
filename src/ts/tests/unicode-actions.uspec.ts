
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





const atom_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  // the action label is always single-quoted (`'${cp}'`), so it is a value
  // position governed by ActionLabelUnescaped, not the bareword Atom rule --
  // no branch on bareword_ok(cp) applies here (#754)
  let test;

  try {
    test = sm`source '${cp}' -> target;`;
  } catch {
    throw new Error(`Broke on ${idx} "${cp}"`);
  }

  expect( test.actions().includes(cp) ).toBe(true);

  return true;

};





describe('Characters as atoms', () => {
  test_range_with(1, atom_test);
});
