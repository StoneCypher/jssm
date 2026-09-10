
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips, bareword_ok, quoted } from './unicode.uspec-driver';





// A machine-level `property <name> default <value>;` registers a default
// property keyed by the (possibly Unicode) name.  `prop(name)` reads it back
// from `_default_properties`; we sweep the name through the full block table
// and confirm the default round-trips under that exact key.
//
// The name position is a Label (Atom / String, #754), swept with the
// bareword/quoted classification.  The value is a fixed Boolean sentinel so
// a mismatch can only mean the name failed to round-trip.

const property_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  let test;

  if (bareword_ok(cp)) {

    try {
      test = sm`a -> b; property ${cp} default true;`;
    } catch {
      throw new Error(`Bareword broke on ${idx} "${cp}"`);
    }

  } else {

    // not an identifier character: the bareword form must be rejected, and
    // the quoted form must work everywhere the bareword used to
    expect(() => sm`a -> b; property ${cp} default true;`).toThrow();

    const q = quoted(cp);

    try {
      test = sm`a -> b; property ${q} default true;`;
    } catch {
      throw new Error(`Quoted form broke on ${idx} ${q}`);
    }

  }

  expect( test.prop(cp) ).toBe(true);

  return true;

};





describe('Characters as machine property names', () => {
  test_range_with(1, property_test);
});
