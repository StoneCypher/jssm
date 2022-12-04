
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





const atom_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(atom_skips.includes(cp))) {

    let test;

    try {
      test = sm`source '${cp}' -> target;`;
    } catch (e) {
      throw new Error(`Broke on ${idx} "${cp}"`);
    }

    expect( test.actions().includes(cp) ).toBe(true);

  }

  return true;

};





describe('Characters as atoms', () => {
  test_range_with(1, atom_test);
});
