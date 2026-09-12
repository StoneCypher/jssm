
import { sm, compile, parse } from '../jssm';

import { test_range_with, atom_skips, bareword_ok, quoted } from './unicode.uspec-driver';





// The default-config state blocks (`state:`, `start_state:`, `end_state:`,
// `active_state:`, `terminal_state:`, `hooked_state: { ... };`) each carry a
// `label:` whose value is a Label.  A Unicode label is swept through all six.
// Verified at the parse-AST level: a `default_*_config` node whose first value
// item is the `{ key: 'state-label', value }`.

const block_keywords = [
  'state', 'start_state', 'end_state', 'active_state', 'terminal_state', 'hooked_state'
];

const config_block_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  if (bareword_ok(cp)) {

    for (const kw of block_keywords) {

      let ast;

      try {
        ast = parse(`a -> b; ${kw}: { label: ${cp}; };`);
      } catch {
        throw new Error(`Bareword broke on ${idx} "${cp}" for ${kw}`);
      }

      const node = ast.find((t: any) => typeof t.key === 'string' && t.key.endsWith('_config'));

      expect( node?.value?.[0]?.value ).toBe(cp);

    }

  } else {

    // not an identifier character: the bareword form must be rejected, and
    // the quoted form must work everywhere the bareword used to
    expect(() => parse(`a -> b; ${block_keywords[0]}: { label: ${cp}; };`)).toThrow();

    const q = quoted(cp);

    for (const kw of block_keywords) {

      let ast;

      try {
        ast = parse(`a -> b; ${kw}: { label: ${q}; };`);
      } catch {
        throw new Error(`Quoted form broke on ${idx} ${q} for ${kw}`);
      }

      const node = ast.find((t: any) => typeof t.key === 'string' && t.key.endsWith('_config'));

      expect( node?.value?.[0]?.value ).toBe(cp);

    }

  }

  return true;

};





describe('Characters in config default-state blocks', () => {
  test_range_with(6, config_block_test);
});
