
import { sm, compile, parse } from '../jssm';

import { test_range_with } from './unicode.uspec-driver';





// A quoted string used as a state name (`"X" -> target;`) exercises the
// String / Unescaped grammar path, which differs from the bare-atom path: a
// double-quoted string may legally contain almost any character.  The only
// code points it cannot carry literally are `"` (which closes the string)
// and `\` (which begins an escape), so those are the only skips — a
// deliberately far smaller skip set than the atom sweep, because covering the
// punctuation that atoms reject is the entire point of this suite.
//
// (Previously this file was a byte-for-byte copy of unicode-atoms.uspec.ts
// and so tested bare atoms, not strings; the quoted-string path went
// unexercised despite the filename.)

const string_skips = ['"', '\\'];

const string_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(string_skips.includes(cp))) {

    let left_test, middle_test, right_test;

    try {
      left_test   = sm`"${cp}" -> target;`,
      middle_test = sm`source -> "${cp}" -> target;`,
      right_test  = sm`source -> "${cp}";`;
    } catch (e) {
      throw new Error(`Broke on ${idx} "${cp}"`);
    }

    expect( left_test.has_state(cp)   ).toBe(true);
    expect( right_test.has_state(cp)  ).toBe(true);
    expect( middle_test.has_state(cp) ).toBe(true);

  }

  return true;

};





describe('Characters as string-quoted state names', () => {
  test_range_with(3, string_test);
});
