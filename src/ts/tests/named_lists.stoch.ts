
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §11 Named lists of the FSL grammar
// reference (`notes/fsl-grammar-reference.md`).  The NamedList rule
// is one line:
//
//   NamedList = WS? "&" WS? name:Label WS? ":" WS? value:LabelOrLabelList WS? ";" WS?
//
// — but it nests three §2 surfaces (Label, LabelList, and the
// "label-or-list" union) inside a 5-`WS?` whitespace-tolerant frame.
// The AST shape:
//
//   { key: 'named_list', name: <string>, value: <string | string[]> }
//
// `value` is a string when the source uses a bare label
// (`&n : foo;`), and an array when the source uses a bracketed list
// (`&n : [foo bar];`), including the empty-list case `[]`.  This
// suite enumerates the value-shape branches, exercises Label/String
// equivalence in both the name and members, and pins WS tolerance
// at every joinable position.



const RUNS = 100;



/**
 *  Parse a single `& name : value ;` named-list source and return
 *  the parsed term.
 *  @param  src  The full named-list source, terminator included.
 *  @returns     The named_list AST node at `tree[0]`.
 *  @example
 *    parse_named_list('&n : [a b];')  // → {key:'named_list', name:'n', value:['a','b']}
 *    parse_named_list('&n : a;')      // → {key:'named_list', name:'n', value:'a'}
 */
function parse_named_list(src: string): { key: string; name: string; value: string | string[] } {

  const tree = jssm.parse(src) as Array<{ key: string; name: string; value: string | string[] }>;
  return tree[0];

}



/**
 *  Random atom-shaped label body: lowercase ASCII letters only, so
 *  the value is unambiguous as either an atom or a quoted string.
 *  Kept short for readable fast-check counter-examples.
 */
const ATOM_LIKE = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 6 }
).map(arr => arr.join(''));





describe('§11 NamedList — value-shape branches of LabelOrLabelList', () => {

  // LabelOrLabelList tries LabelList first then Label, so:
  //   - bracketed source produces an array (including empty `[]`)
  //   - bare-label source produces a string

  test('Bare label as value parses to a string-typed `value`', () => {
    const node = parse_named_list('&n : foo;');
    expect(node.name).toBe('n');
    expect(node.value).toBe('foo');
    expect(Array.isArray(node.value)).toBe(false);
  });

  test('Empty bracketed list `[]` parses to an empty-array `value`', () => {
    const node = parse_named_list('&n : [];');
    expect(node.value).toEqual([]);
    expect(Array.isArray(node.value)).toBe(true);
  });

  test('Single-element bracketed list `[foo]` parses to a one-element array', () => {
    const node = parse_named_list('&n : [foo];');
    expect(node.value).toEqual(['foo']);
  });

  test('Multi-element bracketed list `[a b c]` preserves order', () => {
    const node = parse_named_list('&n : [a b c];');
    expect(node.value).toEqual(['a', 'b', 'c']);
  });

});





describe('§11 NamedList — Label equivalence in the `name` position', () => {

  // The grammar's `name:Label` permits both atom and quoted-string
  // forms.  When the body is shared (lowercase ASCII), both spellings
  // must produce the same canonical `name`.

  test('Atom-form and string-form names produce identical canonical names', () => {

    fc.assert(
      fc.property(ATOM_LIKE, (body) => {
        const atom_node   = parse_named_list(`&${body} : x;`);
        const string_node = parse_named_list(`&"${body}" : x;`);
        expect(string_node.name).toBe(atom_node.name);
        expect(string_node.name).toBe(body);
      }),
      { numRuns: RUNS }
    );

  });

});



describe('§11 NamedList — Label equivalence among list members', () => {

  // LabelList's `(Label WS?)*` rule means each member can be either
  // an atom or a quoted string.  Mixed spellings within a single
  // list canonicalise so the resulting array is order-preserving and
  // content-faithful regardless of which form was used per member.

  test('Mixed atom and quoted-string members round-trip into the same array', () => {

    fc.assert(
      fc.property(
        fc.array(ATOM_LIKE, { minLength: 1, maxLength: 6 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }),
        (bodies, quoted_flags) => {
          // For each member, decide independently whether to write
          // it as an atom or a quoted string.  Final array of
          // canonical names should always match `bodies`.
          const members = bodies.map((b, i) =>
            quoted_flags[i % quoted_flags.length] === true ? `"${b}"` : b
          );
          const src = `&n : [${members.join(' ')}];`;
          expect(parse_named_list(src).value).toEqual(bodies);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§11 NamedList — whitespace tolerance at every `WS?` position', () => {

  // The rule has five `WS?` slots: before `&`, between `&` and the
  // name, between the name and `:`, between `:` and the value, and
  // between the value and `;`.  Random whitespace at any/all of them
  // must not change the parse.

  const WS_CHARS = [' ', '\t', '\n'] as const;
  const ws_run_arb = fc.array(fc.constantFrom(...WS_CHARS), { minLength: 0, maxLength: 6 })
    .map(arr => arr.join(''));

  const EXPECTED = {
    key:   'named_list',
    name:  'n',
    value: ['a', 'b'],
  };

  test('Random WS at every joinable position preserves parse', () => {

    fc.assert(
      fc.property(
        ws_run_arb, ws_run_arb, ws_run_arb, ws_run_arb, ws_run_arb,
        (w0, w1, w2, w3, w4) => {
          // Note: the parser swallows leading-document WS via the
          // top-level Document = WS? TermList WS? rule, so `w0` is
          // effectively absorbed there.  Including it anyway proves
          // we don't accidentally make it harmful.
          const src = `${w0}&${w1}n${w2}:${w3}[a b]${w4};`;
          expect(parse_named_list(src)).toEqual(EXPECTED);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Minimum-whitespace form `&n:[a b];` parses identically to spaced form', () => {
    expect(parse_named_list('&n:[a b];')).toEqual(EXPECTED);
  });

});





describe('§11 NamedList — random round-trip of name and list members', () => {

  // Combined property: random atom-like name + random list of
  // atom-like members produces a node whose `name` equals the
  // chosen name and whose `value` array equals the chosen members
  // in order.

  test('Random `& name : [m1 m2 ...] ;` round-trips fully', () => {

    fc.assert(
      fc.property(
        ATOM_LIKE,
        fc.array(ATOM_LIKE, { minLength: 0, maxLength: 8 }),
        (name, members) => {
          const src  = `&${name} : [${members.join(' ')}];`;
          const node = parse_named_list(src);
          expect(node.key  ).toBe('named_list');
          expect(node.name ).toBe(name);
          expect(node.value).toEqual(members);
        }
      ),
      { numRuns: RUNS }
    );

  });

});
