
import { sm }             from '../jssm';
import { machine_to_dot } from '../jssm_viz';

import { test_range_with, atom_skips } from './unicode.uspec-driver';





// `machine_to_dot` renders a machine to a graphviz dot string.  A Unicode
// state name should survive verbatim in the rendered node label (the node id
// is a graphviz-safe surrogate, but the label carries the original text).
// This sweeps the block table through a state name and confirms the code point
// appears in the dot output — no mojibake, no surrogate-pair truncation.

const viz_dot_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(atom_skips.includes(cp))) {

    let dot;

    try {
      dot = machine_to_dot(sm`${cp} -> b;`);
    } catch (e) {
      throw new Error(`Broke on ${idx} "${cp}"`);
    }

    expect( dot.includes(cp) ).toBe(true);

  }

  return true;

};





describe('Characters surviving viz / dot rendering', () => {
  test_range_with(1, viz_dot_test);
});
