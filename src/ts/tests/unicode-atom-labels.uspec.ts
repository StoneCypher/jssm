
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips, bareword_ok, quoted } from './unicode.uspec-driver';





const atom_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  let test;

  if (bareword_ok(cp)) {

    try {
      test = sm`source -> target; state source: { label: ${cp}; };`;
    } catch {
      throw new Error(`Bareword broke on ${idx} "${cp}"`);
    }

  } else {

    // not an identifier character: the bareword form must be rejected, and
    // the quoted form must work everywhere the bareword used to
    expect(() => sm`source -> target; state source: { label: ${cp}; };`).toThrow();

    const q = quoted(cp);

    try {
      test = sm`source -> target; state source: { label: ${q}; };`;
    } catch {
      throw new Error(`Quoted form broke on ${idx} ${q}`);
    }

  }

  expect( test.label_for('source') ).toBe(cp);

  return true;

};





describe('Characters as atom labels', () => {
  test_range_with(1, atom_test);
});
