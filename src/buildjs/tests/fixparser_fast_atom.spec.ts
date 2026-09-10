import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
// fixparser.cjs guards its file-rewriting `main()` behind `require.main ===
// module` (see the bottom of the file) so it is side-effect-free to require
// for testing; it exports the pieces this suite exercises directly.
const { inline_fast_atom, FAST_ATOM_RE } = require(resolve(__dirname, '../fixparser.cjs'));

/**
 *  `fixparser.cjs`'s output file (`src/ts/fsl_parser.ts`) is, by the time
 *  these tests run, ALREADY post-processed by `inline_fast_atom` itself —
 *  its `peg$parseAtom` no longer has the raw pegjs shape (the
 *  `peg$cN(s1, s2, s3)` action call and friends) that `inline_fast_atom`
 *  looks for, so feeding the committed file back into `inline_fast_atom`
 *  would fail for the wrong reason (structure already rewritten, not drift).
 *  The intermediate `src/ts/fsl_parser.js` that `npm run peg` reads this
 *  from doesn't persist on disk (fixparser deletes it after writing the
 *  `.ts`), so it isn't a stable test fixture either. This fixture is a
 *  byte-for-byte copy of the real generated `peg$parseAtom` (as pegjs 0.10
 *  emits it for the current grammar; only the two `peg$cNNN` constant names
 *  are renumbered, to keep the fixture independent of pegjs's renumbering)
 *  — the honest input `inline_fast_atom` is built to transform.
 */
const GENERATED_ATOM_FN = `  function peg$parseAtom() {
    var s0, s1, s2, s3;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parseAtomFirstLetter();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parseAtomLetter();
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$parseAtomLetter();
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseBarewordBadChar();
        if (s3 === peg$FAILED) {
          s3 = peg$parseBarewordDashTail();
        }
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c002(s1, s2, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0 && peg$currPos >= peg$maxFailPos) { peg$fail(peg$c001); }
    }

    return s0;
  }
`;

describe('inline_fast_atom', () => {

  it('replaces the generated peg$parseAtom with the regex scanner', () => {
    const out = inline_fast_atom(GENERATED_ATOM_FN);
    expect(out).toContain('FAST_ATOM_RE');
    expect(out.indexOf('function peg$parseAtom(')).toBe(out.lastIndexOf('function peg$parseAtom('));
  });

  it('carries the extracted expectation and action constants into the replacement', () => {
    const out = inline_fast_atom(GENERATED_ATOM_FN);
    expect(out).toContain('peg$c001');   // the "atom" expectation, reused on a scanner miss
    expect(out).toContain('peg$c002');   // the Atom action, reused verbatim on a scanner hit
  });

  it('throws when the generated function is not present (guards against silent drift)', () => {
    expect(() => inline_fast_atom('function peg$parseWS() {}')).toThrow(/peg\$parseAtom/);
  });

  it('throws when the action constant cannot be located (guards against pegjs output drift)', () => {
    const mangled = GENERATED_ATOM_FN.replace('s1 = peg$c002(s1, s2, s3);', 's1 = someOtherShape(s1, s2, s3);');
    expect(() => inline_fast_atom(mangled)).toThrow(/action constant/);
  });

  it('the scanner regex agrees with the grammar classes on representative characters', () => {
    const ok  = ['a', 'Z', '_', 'é', 'ж', '字', '𝛼', 'Ⅻ', 'a1', 'नमस्ते'];
    const bad = ['1a', '.a', 'a.b', 'in-progress', '😀', '→', ''];
    for (const s of ok)  { FAST_ATOM_RE.lastIndex = 0; expect(FAST_ATOM_RE.exec(s)?.[0]).toBe(s); }
    for (const s of bad) { FAST_ATOM_RE.lastIndex = 0; const m = FAST_ATOM_RE.exec(s); expect(m === null || m[0] !== s).toBe(true); }
  });

});
