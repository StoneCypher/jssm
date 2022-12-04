
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





const atom_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(atom_skips.includes(cp))) {

    let left_test, middle_test, right_test;

    try {
      left_test   = sm`${cp} -> target;`,
      middle_test = sm`source -> ${cp} -> target;`,
      right_test  = sm`source -> ${cp};`;
    } catch (e) {
      throw new Error(`Broke on ${idx} "${cp}"`);
    }

    expect( left_test.has_state(cp)   ).toBe(true);
    expect( right_test.has_state(cp)  ).toBe(true);
    expect( middle_test.has_state(cp) ).toBe(true);

  }

  return true;

};





describe('Characters as atoms', () => {
  test_range_with(3, atom_test);
});
