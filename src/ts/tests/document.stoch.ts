
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §1 Document shape of the FSL grammar
// reference (`notes/fsl-grammar-reference.md`).  The Document rule
// is the composition skeleton of the language:
//
//   Document = WS? TermList WS?
//   TermList = Term*
//
// All §2–§12 surfaces are reached *through* a Document — every
// other stoch file is effectively a Document with one term — so
// the unique things to verify here are the composition rules:
//
//   - Empty source produces an empty term list
//   - Whitespace-only and comment-only sources produce an empty list
//   - Multiple terms with no inter-term separator (each term's `;`
//     is its own terminator) parse in source order
//   - Different Term kinds (transition, state-decl, arrange,
//     named-list, etc.) can be freely interleaved



const RUNS = 100;



/**
 *  Atom-shaped label body generator — lowercase ASCII, length 1–6.
 *  Kept narrow so generated state names are unambiguous in any
 *  Term position.
 */
const ATOM_LIKE = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 6 }
).map(arr => arr.join(''));



/**
 *  Generators producing one syntactically-valid Term of each kind
 *  the grammar reference enumerates.  Each generator yields a
 *  `[source, expected_top_level_key]` tuple so the test can assert
 *  the parser produces the right Term kind in the right position.
 */
const TERM_GENERATORS: ReadonlyArray<{
  label : string;
  arb   : fc.Arbitrary<[string, string]>;
}> = [

  {
    label : 'transition',
    arb   : fc.tuple(ATOM_LIKE, ATOM_LIKE).map(([a, b]) =>
              [`${a} -> ${b};`, 'transition'] as [string, string]
            ),
  },

  {
    label : 'state-declaration',
    arb   : ATOM_LIKE.map(name =>
              [`state ${name} : {};`, 'state_declaration'] as [string, string]
            ),
  },

  {
    label : 'arrange-declaration',
    arb   : fc.tuple(ATOM_LIKE, ATOM_LIKE).map(([a, b]) =>
              [`arrange [${a} ${b}];`, 'arrange_declaration'] as [string, string]
            ),
  },

  {
    label : 'named-list',
    arb   : fc.tuple(ATOM_LIKE, ATOM_LIKE).map(([name, member]) =>
              [`&${name} : [${member}];`, 'named_list'] as [string, string]
            ),
  },

];





describe('§1 Document — empty and whitespace-only inputs', () => {

  // Document permits a leading `WS?` and a trailing `WS?` — so an
  // entirely-empty document, an all-whitespace document, and an
  // all-comments document are all valid empty term-lists.

  test('Empty string parses to an empty term list', () => {
    expect(jssm.parse('')).toEqual([]);
  });

  test('Random whitespace-only sources parse to empty term lists', () => {

    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(' ', '\t', '\n', '\r', '\v'), { minLength: 1, maxLength: 20 })
          .map(arr => arr.join('')),
        (ws) => {
          expect(jssm.parse(ws)).toEqual([]);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Block-comment-only source parses to an empty term list', () => {
    expect(jssm.parse('/* nothing here */')).toEqual([]);
  });

  test('Line-comment-only source parses to an empty term list', () => {
    expect(jssm.parse('// nothing here\n')).toEqual([]);
  });

  test('Mixed whitespace + comments still parses to empty', () => {
    expect(jssm.parse('  /* a */  // b\n  /* c */  ')).toEqual([]);
  });

});



describe('§1 Document — single-term shape', () => {

  // The simplest non-empty document: one term.  Each grammar kind
  // appears with its top-level `key` at `tree[0].key`.

  for (const { label, arb } of TERM_GENERATORS) {

    test(`Single ${label} term produces a one-element tree with its expected key`, () => {

      fc.assert(
        fc.property(arb, ([src, expected_key]) => {
          const tree = jssm.parse(src) as Array<{ key: string }>;
          expect(tree).toHaveLength(1);
          expect(tree[0].key).toBe(expected_key);
        }),
        { numRuns: RUNS }
      );

    });

  }

});





describe('§1 Document — multi-term sequencing without explicit separator', () => {

  // TermList is `Term*` with no separator between terms — each
  // term's own `;` terminator is enough.  Sequencing two terms
  // back-to-back should produce a two-element tree.

  test('Two transitions back-to-back produce a two-element tree', () => {
    const tree = jssm.parse('a->b;c->d;') as Array<{ key: string }>;
    expect(tree).toHaveLength(2);
    expect(tree.map(t => t.key)).toEqual(['transition', 'transition']);
  });

  test('Mixed-kind sequencing preserves source order', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(...TERM_GENERATORS.map(g => g.arb)),
          { minLength: 2, maxLength: 6 }
        ),
        (terms) => {
          const src           = terms.map(([s]) => s).join('');
          const expected_keys = terms.map(([, k]) => k);
          const tree          = jssm.parse(src) as Array<{ key: string }>;
          expect(tree.map(t => t.key)).toEqual(expected_keys);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Random whitespace and comments between terms is structurally inert', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(...TERM_GENERATORS.map(g => g.arb)),
          { minLength: 2, maxLength: 4 }
        ),
        fc.array(
          fc.constantFrom(' ', '\t', '\n', '/* x */', '// y\n'),
          { minLength: 0, maxLength: 4 }
        ),
        (terms, separators) => {
          const joiner = separators.join('') || ' ';
          const src    = terms.map(([s]) => s).join(joiner);
          const tree   = jssm.parse(src) as Array<{ key: string }>;
          expect(tree.map(t => t.key)).toEqual(terms.map(([, k]) => k));
        }
      ),
      { numRuns: RUNS }
    );

  });

});
