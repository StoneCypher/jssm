
import { sm }             from '../jssm';
import { machine_to_dot } from '../jssm_viz';

import { test_range_with, atom_skips, bareword_ok, quoted } from './unicode.uspec-driver';





// `machine_to_dot` renders a machine to a graphviz dot string.  A Unicode
// state name should survive verbatim in the rendered node label (the node id
// is a graphviz-safe surrogate, but the label carries the original text).
// This sweeps the block table through a state name and confirms the code point
// appears in the dot output — no mojibake, no surrogate-pair truncation.

const viz_dot_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  let dot;

  if (bareword_ok(cp)) {

    try {
      dot = machine_to_dot(sm`${cp} -> b;`);
    } catch {
      throw new Error(`Bareword broke on ${idx} "${cp}"`);
    }

  } else {

    // not an identifier character: the bareword form must be rejected, and
    // the quoted form must work everywhere the bareword used to
    expect(() => sm`${cp} -> b;`).toThrow();

    const q = quoted(cp);

    try {
      dot = machine_to_dot(sm`${q} -> b;`);
    } catch {
      throw new Error(`Quoted form broke on ${idx} ${q}`);
    }

  }

  expect( dot.includes(cp) ).toBe(true);

  return true;

};





describe('Characters surviving viz / dot rendering', () => {
  test_range_with(1, viz_dot_test);
});
