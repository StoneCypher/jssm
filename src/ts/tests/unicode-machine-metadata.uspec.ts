
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips, bareword_ok, quoted } from './unicode.uspec-driver';





// Machine metadata attribute values (machine_name, machine_comment as plain
// Labels; machine_author as a Label-or-list) are a distinct surface from
// machine properties.  We sweep the block table through these and read them
// back through their runtime getters.
//
// machine_language is intentionally NOT covered here: it parses but its value
// never reaches the machine_language() getter (returns undefined even for
// ASCII), a wiring bug unrelated to Unicode — tracked separately.

const metadata_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  let test;

  if (bareword_ok(cp)) {

    try {
      test = sm`a -> b; machine_name: ${cp}; machine_comment: ${cp}; machine_author: ${cp};`;
    } catch {
      throw new Error(`Bareword broke on ${idx} "${cp}"`);
    }

  } else {

    // not an identifier character: the bareword form must be rejected, and
    // the quoted form must work everywhere the bareword used to
    expect(() => sm`a -> b; machine_name: ${cp};`).toThrow();

    const q = quoted(cp);

    try {
      test = sm`a -> b; machine_name: ${q}; machine_comment: ${q}; machine_author: ${q};`;
    } catch {
      throw new Error(`Quoted form broke on ${idx} ${q}`);
    }

  }

  expect( test.machine_name()      ).toBe(cp);
  expect( test.machine_comment()   ).toBe(cp);
  expect( test.machine_author()[0] ).toBe(cp);

  return true;

};





describe('Characters in machine metadata fields', () => {
  test_range_with(3, metadata_test);
});
