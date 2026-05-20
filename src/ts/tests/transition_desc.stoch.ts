
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §6 ArrowDesc of the FSL grammar
// reference (`notes/fsl-grammar-reference.md`).  ArrowDesc is a
// `{ ... }` brace block on either side of an arrow that holds
// ArrowItems.  Two sub-shapes:
//
//   - Repeatable items (`ArrowItem+`):
//       arc_label   : Label ;   → key 'arc_label'
//       head_label  : Label ;   → key 'head_label'
//       tail_label  : Label ;   → key 'tail_label'
//
//   - Exclusive single-item forms:
//       edge_color  : Color ;     → key 'single_edge_color'
//       line-style  : LineStyle ; → key 'transition_line_style'
//
// The grammar's union alternates between the generic-items list and
// the single-item form, so a `{ edge_color: red; }` block replaces
// the array-of-items shape with a single object.  Both observable
// at the AST.
//
// Desc-row swap: a brace block before the arrow attaches to the
// *left* node (`l_desc`); after the arrow attaches to the *right*
// node (`r_desc`).  This is the opposite of the
// after/action/probability mapping, where pre-arrow → `r_*` and
// post-arrow → `l_*`.  The swap exists because the brace block
// visually carries the description on the side it's written on.
//
// Empty `{}` block returns `null` from the grammar; the `!= null`
// check (commit 0f5e97f) suppresses it from the AST, preserving
// shape compatibility with code that distinguishes "no decoration"
// from "decoration with falsy body."



const RUNS = 100;



/**
 *  Parse `a {<pre>} -> {<post>} b;` and return the transition's
 *  `se` object so callers can inspect `l_desc` / `r_desc`.
 *
 *  @param  pre_block_src   Pre-arrow brace block contents (without braces).  Empty string skips the block.
 *  @param  post_block_src  Post-arrow brace block contents.  Empty string skips the block.
 *  @returns                The se object containing kind, to, and any *_desc fields.
 *
 *  @example
 *    parse_desc_se('arc_label: x;', '')
 *    // → { kind:'->', to:'b', l_desc:[{key:'arc_label', value:'x'}] }
 */
function parse_desc_se(pre_block_src: string, post_block_src: string): {
  kind:    string;
  to:      string;
  l_desc?: unknown;
  r_desc?: unknown;
} {

  const pre  = pre_block_src  ? `{${pre_block_src}}`  : '';
  const post = post_block_src ? `{${post_block_src}}` : '';
  const tree = jssm.parse(`a ${pre} -> ${post} b;`) as Array<{ se: {
    kind:    string;
    to:      string;
    l_desc?: unknown;
    r_desc?: unknown;
  } }>;
  return tree[0].se;

}



/**
 *  Random short label body — lowercase ASCII letters, 1–6 chars.
 */
const ATOM_LIKE = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 6 }
).map(arr => arr.join(''));





describe('§6 ArrowDesc — repeatable items at pre-arrow position go to l_desc', () => {

  // The doc table: pre-arrow desc → l_desc.  Items appear in
  // source order in a single l_desc array.

  test('Pre-arrow `arc_label: x;` produces l_desc array', () => {
    const se = parse_desc_se('arc_label: x;', '');
    expect(se.l_desc).toEqual([{ key: 'arc_label', value: 'x' }]);
    expect(se.r_desc).toBeUndefined();
  });

  test('Pre-arrow `head_label: hh;` produces l_desc with head_label key', () => {
    const se = parse_desc_se('head_label: hh;', '');
    expect(se.l_desc).toEqual([{ key: 'head_label', value: 'hh' }]);
  });

  test('Pre-arrow `tail_label: tt;` produces l_desc with tail_label key', () => {
    const se = parse_desc_se('tail_label: tt;', '');
    expect(se.l_desc).toEqual([{ key: 'tail_label', value: 'tt' }]);
  });

  test('Mixed labels in pre-arrow block preserve source order', () => {
    const se = parse_desc_se('arc_label: x; head_label: y; tail_label: z;', '');
    expect(se.l_desc).toEqual([
      { key: 'arc_label',  value: 'x' },
      { key: 'head_label', value: 'y' },
      { key: 'tail_label', value: 'z' },
    ]);
  });

});



describe('§6 ArrowDesc — repeatable items at post-arrow position go to r_desc', () => {

  // The desc-row swap: post-arrow desc → r_desc.  Same item set
  // and same in-block ordering as pre-arrow, just different
  // AST field.

  test('Post-arrow `arc_label: x;` produces r_desc array', () => {
    const se = parse_desc_se('', 'arc_label: x;');
    expect(se.r_desc).toEqual([{ key: 'arc_label', value: 'x' }]);
    expect(se.l_desc).toBeUndefined();
  });

  test('Mixed labels in post-arrow block preserve source order at r_desc', () => {
    const se = parse_desc_se('', 'arc_label: x; head_label: y; tail_label: z;');
    expect(se.r_desc).toEqual([
      { key: 'arc_label',  value: 'x' },
      { key: 'head_label', value: 'y' },
      { key: 'tail_label', value: 'z' },
    ]);
  });

});



describe('§6 ArrowDesc — desc-row swap (the asymmetric column)', () => {

  // Pinning the documented inversion: pre-arrow → l_desc (NOT
  // r_desc); post-arrow → r_desc (NOT l_desc).  This is opposite
  // to after/action/probability which go pre → r_*, post → l_*.

  test('A label in both desc blocks attaches to *different* sides', () => {

    fc.assert(
      fc.property(ATOM_LIKE, ATOM_LIKE, (left_label, right_label) => {
        const se = parse_desc_se(
          `arc_label: ${left_label};`,
          `arc_label: ${right_label};`
        );
        expect(se.l_desc).toEqual([{ key: 'arc_label', value: left_label  }]);
        expect(se.r_desc).toEqual([{ key: 'arc_label', value: right_label }]);
      }),
      { numRuns: RUNS }
    );

  });

});



describe('§6 ArrowDesc — exclusive single-item: edge_color', () => {

  // `edge_color: <Color>;` is a single-item form: the parser
  // returns a single object (not an array) at the desc position.
  // The AST key is `single_edge_color`, distinct from the
  // graph-default `graph_default_edge_color` key used by the §8
  // transition config block.

  test('Pre-arrow `edge_color: red;` returns single_edge_color object at l_desc', () => {
    const se = parse_desc_se('edge_color: red;', '');
    expect(se.l_desc).toEqual({ key: 'single_edge_color', value: '#ff0000ff' });
    expect(Array.isArray(se.l_desc)).toBe(false);
  });

  test('Post-arrow `edge_color: blue;` returns single_edge_color object at r_desc', () => {
    const se = parse_desc_se('', 'edge_color: blue;');
    expect(se.r_desc).toEqual({ key: 'single_edge_color', value: '#0000ffff' });
    expect(Array.isArray(se.r_desc)).toBe(false);
  });

});



describe('§6 ArrowDesc — exclusive single-item: line-style', () => {

  // Parallel to edge_color: `line-style: <LineStyle>;` is also a
  // single-form item, AST key `transition_line_style`.  Same three
  // LineStyle values from §7 are accepted.

  for (const style of ['solid', 'dotted', 'dashed'] as const) {

    test(`Pre-arrow \`line-style: ${style};\` returns transition_line_style at l_desc`, () => {
      const se = parse_desc_se(`line-style: ${style};`, '');
      expect(se.l_desc).toEqual({ key: 'transition_line_style', value: style });
      expect(Array.isArray(se.l_desc)).toBe(false);
    });

    test(`Post-arrow \`line-style: ${style};\` returns transition_line_style at r_desc`, () => {
      const se = parse_desc_se('', `line-style: ${style};`);
      expect(se.r_desc).toEqual({ key: 'transition_line_style', value: style });
    });

  }

});



describe('§6 ArrowDesc — empty `{}` is silently suppressed', () => {

  // Empty brace block returns null from the grammar; the parser's
  // `!= null` decoration guard (commit 0f5e97f) excludes it from
  // the AST, so the transition node looks like an undecorated
  // arrow.  Pinning this so a future grammar tweak that emits
  // empty-array desc would be a deliberate decision.

  test('Pre-arrow `{}` leaves l_desc undefined on the AST', () => {
    const se = parse_desc_se('', '');
    // Sanity baseline: no blocks at all has no desc fields.
    expect(se.l_desc).toBeUndefined();
    expect(se.r_desc).toBeUndefined();
  });

  test('Literal empty `{}` block before arrow does not produce l_desc', () => {
    const tree = jssm.parse('a {} -> b;') as Array<{ se: { l_desc?: unknown } }>;
    expect(tree[0].se.l_desc).toBeUndefined();
  });

  test('Literal empty `{}` block after arrow does not produce r_desc', () => {
    const tree = jssm.parse('a -> {} b;') as Array<{ se: { r_desc?: unknown } }>;
    expect(tree[0].se.r_desc).toBeUndefined();
  });

});



describe('§6 ArrowDesc — random label round-trips through l_desc and r_desc', () => {

  // Combined property: pick a label-class item and a random body,
  // pick whether to place it pre- or post-arrow, and verify the
  // value lands at the correct AST field with the correct key.

  const LABEL_ITEMS = ['arc_label', 'head_label', 'tail_label'] as const;

  test('Random {item, body, side} triple lands at the documented AST position', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...LABEL_ITEMS),
        ATOM_LIKE,
        fc.boolean(),
        (item, body, place_pre) => {
          const block_src = `${item}: ${body};`;
          const se        = place_pre
            ? parse_desc_se(block_src, '')
            : parse_desc_se('', block_src);
          const expected_field   = place_pre ? 'l_desc' : 'r_desc';
          const unexpected_field = place_pre ? 'r_desc' : 'l_desc';
          expect(se[expected_field as 'l_desc' | 'r_desc']).toEqual([{ key: item, value: body }]);
          expect(se[unexpected_field as 'l_desc' | 'r_desc']).toBeUndefined();
        }
      ),
      { numRuns: RUNS }
    );

  });

});
