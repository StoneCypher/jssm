
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





// arc_label / head_label / tail_label are transition *desc* decorations.
// Unlike state labels they are not surfaced on the runtime edge object
// (JssmTransition), so the round-trip is verified at the parse-AST level: a
// pre-arrow `{ key: value; }` decoration lands in the subexp's `l_desc`
// array as `{ key, value }`.  See parse.spec.ts / transition_desc.stoch.ts.
//
// The value position here is a bare Atom, so the atom skip set applies — the
// same conservative skip list the sibling atom sweeps use.

const edge_label_keys = ['arc_label', 'head_label', 'tail_label'];

const edge_label_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(atom_skips.includes(cp))) {

    for (const key of edge_label_keys) {

      let ast;

      try {
        ast = parse(`a { ${key}: ${cp}; } -> b;`);
      } catch {
        throw new Error(`Broke on ${idx} "${cp}" for ${key}`);
      }

      expect( ast[0].se.l_desc[0].key   ).toBe(key);
      expect( ast[0].se.l_desc[0].value ).toBe(cp);

    }

  }

  return true;

};





describe('Characters as edge labels', () => {
  test_range_with(3, edge_label_test);
});
