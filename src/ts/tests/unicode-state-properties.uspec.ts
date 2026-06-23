
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





// A per-state property `state s: { property: <name> <value>; };` carries
// Unicode in two positions with different grammar classes: the property name
// is an Atom, and a string value is a quoted String.  Each gets its own skip
// set (atoms reject more characters than strings).  Verified at the parse-AST
// level: a `{ key: 'state_property', name, value }` item.

const string_skips = ['"', '\\'];

const property_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  // property name (Atom)
  if (!(atom_skips.includes(cp))) {
    let ast;
    try {
      ast = parse(`state s: { property: ${cp} "v"; }; s -> b;`);
    } catch (e) {
      throw new Error(`Broke (name) on ${idx} "${cp}"`);
    }
    expect( ast[0].value[0].key  ).toBe('state_property');
    expect( ast[0].value[0].name ).toBe(cp);
  }

  // string property value (String)
  if (!(string_skips.includes(cp))) {
    let ast;
    try {
      ast = parse(`state s: { property: p "${cp}"; }; s -> b;`);
    } catch (e) {
      throw new Error(`Broke (value) on ${idx} "${cp}"`);
    }
    expect( ast[0].value[0].value ).toBe(cp);
  }

  return true;

};





describe('Characters in state property names and values', () => {
  test_range_with(2, property_test);
});
