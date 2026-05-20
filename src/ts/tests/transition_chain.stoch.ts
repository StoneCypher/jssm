
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §6 Subexp recursive chaining + the
// decoration → AST-key mapping table, of the FSL grammar reference
// (`notes/fsl-grammar-reference.md`).  Covers:
//
//   - Chain depth: `a -> b -> c -> d;` produces nested
//     `se.se.se` structure, one level per `->`.  Each link is
//     itself a Subexp.
//
//   - Mixed arrow kinds in a chain: each link records its own
//     `kind` independently.
//
//   - The full r_/l_ AST mapping for the three "non-desc"
//     decoration kinds (after, action, probability).  (Desc has
//     its own swap convention covered in `transition_desc.stoch.ts`.)
//
//   - Per-side independent metadata on a `<->` two-way arrow:
//     pre-arrow decorations go to `r_*`, post-arrow to `l_*`,
//     and they coexist on a single se object.
//
//   - Duplicate-decoration error messages: each *kind* may appear
//     at most once per side; a duplicate throws with a documented
//     error string.



const RUNS = 100;



/**
 *  Parse a transition source and return the parse tree.
 *
 *  @param  src  Full transition source, terminator included.
 *  @returns     The parse tree array.
 */
function parse_tree(src: string): Array<{ key: string; from: string; se: Record<string, unknown> }> {

  return jssm.parse(src) as Array<{ key: string; from: string; se: Record<string, unknown> }>;

}



/**
 *  Walk a chained Subexp tree, returning the sequence of
 *  `[kind, to]` pairs from outermost to innermost.  Used by the
 *  chain-depth tests so failures show the full path.
 *
 *  @param  se  Outermost se object from `tree[0].se`.
 *  @returns    Ordered list of `[kind, to]` pairs.
 *
 *  @example
 *    // For `a -> b -> c -> d;`:
 *    flatten_chain(tree[0].se) → [['->','b'], ['->','c'], ['->','d']]
 */
function flatten_chain(se: Record<string, unknown>): Array<readonly [string, string]> {

  const out: Array<readonly [string, string]> = [];
  let cur: Record<string, unknown> | undefined = se;
  while (cur && typeof cur === 'object') {
    out.push([cur.kind as string, cur.to as string]);
    cur = cur.se as Record<string, unknown> | undefined;
  }
  return out;

}



/**
 *  Random short label body.
 */
const ATOM_LIKE = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 6 }
).map(arr => arr.join(''));





describe('§6 Subexp — recursive chaining via nested `se`', () => {

  // Each `->` in a chain produces a fresh Subexp wrapped inside
  // the previous one's `se` field.  The recursion goes one level
  // deeper per arrow.

  test('Two-link chain `a -> b -> c;` produces one level of nesting', () => {
    const tree = parse_tree('a -> b -> c;');
    expect(tree[0].from).toBe('a');
    expect(flatten_chain(tree[0].se)).toEqual([['->','b'], ['->','c']]);
  });

  test('Three-link chain `a -> b -> c -> d;` produces two levels of nesting', () => {
    const tree = parse_tree('a -> b -> c -> d;');
    expect(flatten_chain(tree[0].se)).toEqual([['->','b'], ['->','c'], ['->','d']]);
  });

  test('Random chain length round-trips through nested se', () => {

    fc.assert(
      fc.property(
        fc.array(ATOM_LIKE, { minLength: 2, maxLength: 8 }),
        (labels) => {
          const src    = labels.join(' -> ') + ';';
          const tree   = parse_tree(src);
          expect(tree[0].from).toBe(labels[0]);
          const chain  = flatten_chain(tree[0].se);
          const linked = labels.slice(1).map(l => ['->', l] as const);
          expect(chain).toEqual(linked);
        }
      ),
      { numRuns: RUNS }
    );

  });

});



describe('§6 Subexp — mixed arrow kinds in a chain', () => {

  // Each link's `kind` is independent: `a -> b => c ~> d;` records
  // three different arrow shapes in three nested Subexps.  This
  // confirms Subexp doesn't lock the chain into a single arrow
  // weight.

  test('Mixed kinds chain produces per-link kind values', () => {
    const tree = parse_tree('a -> b => c ~> d;');
    expect(flatten_chain(tree[0].se)).toEqual([
      ['->', 'b'],
      ['=>', 'c'],
      ['~>', 'd'],
    ]);
  });

});





describe('§6 Decorations — r_/l_ AST mapping (non-desc kinds)', () => {

  // Per the doc table, for after/action/probability:
  //   pre-arrow  → r_<kind>  (attaches to the right-hand node)
  //   post-arrow → l_<kind>  (attaches to the left-hand node)

  test('Pre-arrow `after 2s` → r_after = 2000', () => {
    const tree = parse_tree('a after 2s -> b;');
    expect(tree[0].se.r_after).toBe(2000);
    expect(tree[0].se.l_after).toBeUndefined();
  });

  test('Post-arrow `after 3s` → l_after = 3000', () => {
    const tree = parse_tree('a -> after 3s b;');
    expect(tree[0].se.l_after).toBe(3000);
    expect(tree[0].se.r_after).toBeUndefined();
  });

  test("Pre-arrow `'click'` → r_action = 'click'", () => {
    const tree = parse_tree("a 'click' -> b;");
    expect(tree[0].se.r_action).toBe('click');
    expect(tree[0].se.l_action).toBeUndefined();
  });

  test("Post-arrow `'fire'` → l_action = 'fire'", () => {
    const tree = parse_tree("a -> 'fire' b;");
    expect(tree[0].se.l_action).toBe('fire');
    expect(tree[0].se.r_action).toBeUndefined();
  });

  test('Pre-arrow `25%` → r_probability = 25', () => {
    const tree = parse_tree('a 25% -> b;');
    expect(tree[0].se.r_probability).toBe(25);
    expect(tree[0].se.l_probability).toBeUndefined();
  });

  test('Post-arrow `75%` → l_probability = 75', () => {
    const tree = parse_tree('a -> 75% b;');
    expect(tree[0].se.l_probability).toBe(75);
    expect(tree[0].se.r_probability).toBeUndefined();
  });

});



describe('§6 Decorations — per-side independence on two-way arrow', () => {

  // The whole reason for the r_/l_ split is two-way arrows: `<->`
  // can carry *independent* metadata for each direction.  A
  // decoration before the arrow describes the back-edge; after the
  // arrow describes the forward-edge.

  test('Independent action labels on `<->` coexist as r_action and l_action', () => {
    const tree = parse_tree("a 'evt1' <-> 'evt2' b;");
    expect(tree[0].se.kind    ).toBe('<->');
    expect(tree[0].se.r_action).toBe('evt1');
    expect(tree[0].se.l_action).toBe('evt2');
  });

  test('Independent probabilities on `<->` coexist as r_probability and l_probability', () => {
    const tree = parse_tree('a 30% <-> 70% b;');
    expect(tree[0].se.r_probability).toBe(30);
    expect(tree[0].se.l_probability).toBe(70);
  });

  test('Mixed pre+post decoration kinds all land in distinct AST fields', () => {
    const tree = parse_tree("a 5% 'click' after 1s <-> 7% 'fire' after 2s b;");
    expect(tree[0].se).toMatchObject({
      kind:           '<->',
      to:             'b',
      r_probability:  5,
      r_action:       'click',
      r_after:        1000,
      l_probability:  7,
      l_action:       'fire',
      l_after:        2000,
    });
  });

});





describe('§6 ArrowProbability — value range and round-trip', () => {

  // ArrowProbability = NonNegNumber "%".  Random non-negative
  // numbers should round-trip into the {l,r}_probability field as
  // numbers (not strings, not wrapped).

  test('Pre-arrow random integer probability round-trips at r_probability', () => {

    fc.assert(
      fc.property(fc.integer(0, 100), (n) => {
        const tree = parse_tree(`a ${n}% -> b;`);
        expect(tree[0].se.r_probability).toBe(n);
      }),
      { numRuns: RUNS }
    );

  });

  test('Fractional percentages round-trip', () => {

    fc.assert(
      fc.property(
        fc.integer(0, 9999).map(n => n / 100),
        (n) => {
          const tree = parse_tree(`a ${n}% -> b;`);
          expect(tree[0].se.r_probability).toBeCloseTo(n, 5);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§6 Decorations — duplicate kind throws with documented message', () => {

  // Each decoration *kind* may appear at most once per side.  A
  // duplicate raises a parse error whose message includes the kind
  // name and the side (before / after arrow).  The exact wording
  // is documented in §6 of the grammar reference.

  test('Duplicate pre-arrow probability throws with `before arrow` wording', () => {
    expect(() => jssm.parse('a 5% 7% -> b;')).toThrow(/duplicate prob decoration before arrow/);
  });

  test('Duplicate post-arrow probability throws with `after arrow` wording', () => {
    expect(() => jssm.parse('a -> 5% 7% b;')).toThrow(/duplicate prob decoration after arrow/);
  });

  test('Duplicate pre-arrow action label throws', () => {
    expect(() => jssm.parse("a 'x' 'y' -> b;")).toThrow(/duplicate action decoration before arrow/);
  });

  test('Duplicate pre-arrow after throws', () => {
    expect(() => jssm.parse('a after 1s after 2s -> b;')).toThrow(/duplicate after decoration before arrow/);
  });

  test('Duplicate pre-arrow desc block throws', () => {
    expect(() => jssm.parse('a {arc_label: x;} {arc_label: y;} -> b;')).toThrow(/duplicate desc decoration before arrow/);
  });

});
