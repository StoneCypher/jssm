
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips, bareword_ok, quoted } from './unicode.uspec-driver';





const atom_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  let left_test, middle_test, right_test;

  if (bareword_ok(cp)) {

    try {
      left_test   = sm`${cp} -> target;`;
      middle_test = sm`source -> ${cp} -> target;`;
      right_test  = sm`source -> ${cp};`;
    } catch {
      throw new Error(`Bareword broke on ${idx} "${cp}"`);
    }

  } else {

    // not an identifier character: the bareword form must be rejected, and
    // the quoted form must work everywhere the bareword used to
    expect(() => sm`${cp} -> target;`).toThrow();

    const q = quoted(cp);

    try {
      left_test   = sm`${q} -> target;`;
      middle_test = sm`source -> ${q} -> target;`;
      right_test  = sm`source -> ${q};`;
    } catch {
      throw new Error(`Quoted form broke on ${idx} ${q}`);
    }

  }

  expect( left_test.has_state(cp)   ).toBe(true);
  expect( right_test.has_state(cp)  ).toBe(true);
  expect( middle_test.has_state(cp) ).toBe(true);

  return true;

};





describe('Characters as atoms', () => {
  test_range_with(3, atom_test);
});
