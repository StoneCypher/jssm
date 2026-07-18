
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





// A machine-level `property <name> default <value>;` registers a default
// property keyed by the (possibly Unicode) name.  `prop(name)` reads it back
// from `_default_properties`; we sweep the name through the full block table
// and confirm the default round-trips under that exact key.
//
// The name position is a bare Atom, so the atom skip set applies.  The value
// is a fixed Boolean sentinel so a mismatch can only mean the name failed to
// round-trip.

const property_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(atom_skips.includes(cp))) {

    let test;

    try {
      test = sm`a -> b; property ${cp} default true;`;
    } catch {
      throw new Error(`Broke on ${idx} "${cp}"`);
    }

    expect( test.prop(cp) ).toBe(true);

  }

  return true;

};





describe('Characters as machine property names', () => {
  test_range_with(1, property_test);
});
