
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §12 Arrange declarations of the FSL
// grammar reference (`notes/fsl-grammar-reference.md`).  Three forms:
//
//   arrange       <LabelOrLabelList> ;   → key: 'arrange_declaration'
//   arrange-start <LabelOrLabelList> ;   → key: 'arrange_start_declaration'
//   arrange-end   <LabelOrLabelList> ;   → key: 'arrange_end_declaration'
//
// `arrange-start` and `arrange-end` are tried *before* `arrange` in
// the PEG so the hyphenated forms aren't short-circuited.  All three
// take a LabelOrLabelList, which collapses to a string for a bare
// label and an array for a bracketed list — the same union we
// exercise in §11 NamedList.
//
// This file replaces the prior single-test stub.



const RUNS = 100;



/**
 *  Parse a single arrange-style declaration source and return the
 *  parsed term at `tree[0]`.
 *  @param  src  Full declaration source, terminator included.
 *  @returns     Arrange AST node.
 *  @example
 *    parse_arrange('arrange [a b];')        // → {key:'arrange_declaration', value:['a','b']}
 *    parse_arrange('arrange-start foo;')    // → {key:'arrange_start_declaration', value:'foo'}
 */
function parse_arrange(src: string): { key: string; value: string | string[] } {

  const tree = jssm.parse(src) as Array<{ key: string; value: string | string[] }>;
  return tree[0];

}



/**
 *  Random atom-shaped label body.  Lowercase ASCII only so each
 *  body is unambiguously a valid Label without quotes.
 */
const ATOM_LIKE = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 6 }
).map(arr => arr.join(''));



/**
 *  Inventory of arrange-keyword variants paired with the AST `key`
 *  the parser produces for each.
 */
const KEYWORDS: ReadonlyArray<readonly [string, string]> = [
  ['arrange',       'arrange_declaration'      ],
  ['arrange-start', 'arrange_start_declaration'],
  ['arrange-end',   'arrange_end_declaration'  ],
] as const;





describe('§12 Arrange — three keywords produce distinct AST keys', () => {

  // Each keyword maps to a distinct `key`.  This is the table that
  // downstream code reads to decide whether a label group is a
  // generic order hint, a start-pin, or an end-pin.

  for (const [keyword, expected_key] of KEYWORDS) {
    test(`\`${keyword} [a];\` produces key=${expected_key}, value=['a']`, () => {
      const node = parse_arrange(`${keyword} [a];`);
      expect(node.key  ).toBe(expected_key);
      expect(node.value).toEqual(['a']);
    });
  }

});



describe('§12 Arrange — value shapes follow LabelOrLabelList', () => {

  // LabelOrLabelList = LabelList / Label, so:
  //   - bracketed source produces an array (including empty `[]`)
  //   - bare-label source produces a string

  for (const [keyword] of KEYWORDS) {

    test(`\`${keyword} foo;\` (bare label) yields string-typed value`, () => {
      const node = parse_arrange(`${keyword} foo;`);
      expect(node.value).toBe('foo');
      expect(Array.isArray(node.value)).toBe(false);
    });

    test(`\`${keyword} [];\` (empty list) yields empty-array value`, () => {
      const node = parse_arrange(`${keyword} [];`);
      expect(node.value).toEqual([]);
      expect(Array.isArray(node.value)).toBe(true);
    });

    test(`\`${keyword} [a b c];\` preserves order`, () => {
      const node = parse_arrange(`${keyword} [a b c];`);
      expect(node.value).toEqual(['a', 'b', 'c']);
    });

  }

});





describe('§12 Arrange — PEG ordering preserves hyphenated forms', () => {

  // If `arrange` were tried before `arrange-start`, the parser would
  // match the `arrange` keyword then choke on the leftover `-start`.
  // The fact that `arrange-start [a];` succeeds with the start-key
  // proves the explicit ordering invariant in the grammar:
  //   ArrangeDeclaration = ArrangeStartDeclaration
  //                      / ArrangeEndDeclaration
  //                      / RegularArrangeDeclaration

  test('`arrange-start [a];` is not short-circuited by `arrange`', () => {
    expect(parse_arrange('arrange-start [a];').key).toBe('arrange_start_declaration');
  });

  test('`arrange-end [a];` is not short-circuited by `arrange`', () => {
    expect(parse_arrange('arrange-end [a];').key).toBe('arrange_end_declaration');
  });

});





describe('§12 Arrange — random round-trip across keywords and lists', () => {

  // Random keyword × random member list × random per-member spelling
  // (atom vs quoted-string) — full LabelOrLabelList surface exercise.

  test('Every keyword + random member list round-trips with correct key and value', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...KEYWORDS),
        fc.array(ATOM_LIKE, { minLength: 0, maxLength: 8 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
        ([keyword, expected_key], bodies, quoted_flags) => {
          const members = bodies.map((b, i) =>
            quoted_flags[i % quoted_flags.length] === true ? `"${b}"` : b
          );
          const src  = `${keyword} [${members.join(' ')}];`;
          const node = parse_arrange(src);
          expect(node.key  ).toBe(expected_key);
          expect(node.value).toEqual(bodies);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Every keyword + bare-label random body round-trips as a string value', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...KEYWORDS),
        ATOM_LIKE,
        ([keyword, expected_key], body) => {
          const node = parse_arrange(`${keyword} ${body};`);
          expect(node.key  ).toBe(expected_key);
          expect(node.value).toBe(body);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§12 Arrange — whitespace tolerance', () => {

  // The rule has three `WS?` positions: between keyword and value,
  // between value and `;`, and trailing after `;`.

  const WS_CHARS = [' ', '\t', '\n'] as const;
  const ws_run_arb = fc.array(fc.constantFrom(...WS_CHARS), { minLength: 0, maxLength: 6 })
    .map(arr => arr.join(''));

  test('Random whitespace at every joinable position preserves parse for all three keywords', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...KEYWORDS),
        ws_run_arb, ws_run_arb, ws_run_arb,
        ([keyword, expected_key], w1, w2, w3) => {
          // `keyword` must be followed by *some* whitespace before
          // the value (otherwise `arrange[a]` would have the atom
          // start with `[`, which isn't in AtomFirstLetter — but
          // PEG would fail much earlier).  Use ` ` as a minimum.
          const lead = w1.length > 0 ? w1 : ' ';
          const src  = `${keyword}${lead}[a b]${w2};${w3}`;
          const node = parse_arrange(src);
          expect(node.key  ).toBe(expected_key);
          expect(node.value).toEqual(['a', 'b']);
        }
      ),
      { numRuns: RUNS }
    );

  });

});
