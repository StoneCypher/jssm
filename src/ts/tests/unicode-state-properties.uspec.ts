
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips, bareword_ok, quoted } from './unicode.uspec-driver';





// A per-state property `state s: { property: <name> <value>; };` carries
// Unicode in two positions with different grammar classes: the property name
// is a Label (Atom / String, #754), swept with the bareword/quoted
// classification; the value here is always a quoted String, with its own
// (much smaller) skip set.  Verified at the parse-AST level: a
// `{ key: 'state_property', name, value }` item.

const string_skips = new Set(['"', '\\']);

const property_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  // property name (Label: Atom / String, #754)
  if (!(atom_skips.includes(cp))) {

    let ast;

    if (bareword_ok(cp)) {

      try {
        ast = parse(`state s: { property: ${cp} "v"; }; s -> b;`);
      } catch {
        throw new Error(`Bareword broke (name) on ${idx} "${cp}"`);
      }

    } else {

      // not an identifier character: the bareword form must be rejected, and
      // the quoted form must work everywhere the bareword used to
      expect(() => parse(`state s: { property: ${cp} "v"; }; s -> b;`)).toThrow();

      const q = quoted(cp);

      try {
        ast = parse(`state s: { property: ${q} "v"; }; s -> b;`);
      } catch {
        throw new Error(`Quoted form broke (name) on ${idx} ${q}`);
      }

    }

    expect( ast[0].value[0].key  ).toBe('state_property');
    expect( ast[0].value[0].name ).toBe(cp);

  }

  // string property value (String)
  if (!(string_skips.has(cp))) {
    let ast;
    try {
      ast = parse(`state s: { property: p "${cp}"; }; s -> b;`);
    } catch {
      throw new Error(`Broke (value) on ${idx} "${cp}"`);
    }
    expect( ast[0].value[0].value ).toBe(cp);
  }

  return true;

};





describe('Characters in state property names and values', () => {
  test_range_with(2, property_test);
});
