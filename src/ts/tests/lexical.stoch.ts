
import * as fc   from 'fast-check';
import * as jssm from '../jssm';





// Property-based coverage for §2 Lexical layer of the FSL grammar
// reference (`notes/fsl-grammar-reference.md`).  Covers the joinable
// fabric of the language — the rules that appear at virtually every
// `WS?` position and whose interactions are hard to enumerate
// deterministically:
//
//   - WS (whitespace runs over ` `, `\t`, `\r`, `\n`, `\v`)
//   - BlockComment (`/* ... */`) and its documented PEG non-nesting
//   - LineComment (`// ...` terminated by `\n` / `\r` / U+2028 / U+2029 / EOF)
//   - String literals: unescaped range + escape vocabulary + `\uXXXX`
//   - ActionLabel literals: single-quoted twin of String
//   - Atom: AtomFirstLetter vs AtomLetter (rest) character classes
//   - Label: Atom / String interchangeable
//   - LabelList: bracketed lists with mixed members and inner WS
//
// Vehicle conventions: a transition `${lhs} -> ${rhs};` exposes both
// labels at stable AST positions (`tree[0].from`, `tree[0].se.to`),
// and action labels appear pre-arrow as `tree[0].se.r_action`.
// LabelList is exercised through a `start_states` config block.



const RUNS = 100;

const WS_CHARS = [' ', '\t', '\r', '\n', '\v'] as const;



/**
 *  Parse a one-line FSL document of shape `${lhs} -> ${rhs};` and
 *  return its parse tree.  The from-label is `tree[0].from` and the
 *  to-label is `tree[0].se.to`.
 *  @param  lhs  Source of the left-hand label (atom or quoted string).
 *  @param  rhs  Source of the right-hand label.
 *  @returns     Parse tree array of one transition term.
 *  @example
 *    parse_transition('a',     'b')      // → [{key:'transition', from:'a', se:{kind:'->', to:'b'}}]
 *    parse_transition('"foo"', '"bar"')  // → [{key:'transition', from:'foo', se:{kind:'->', to:'bar'}}]
 */
function parse_transition(lhs: string, rhs: string): Array<{ from: string; se: { to: string; r_action?: string } }> {

  return jssm.parse(`${lhs} -> ${rhs};`) as Array<{ from: string; se: { to: string; r_action?: string } }>;

}



/**
 *  Parse a transition with a pre-arrow action label and return the
 *  action.  `a 'evt' -> b;` stores the action at `tree[0].se.r_action`
 *  per the grammar's pre-arrow / post-arrow naming convention.
 *  @param  action_literal  The raw `'...'`-quoted source (caller supplies the quotes and any escapes).
 *  @returns                The canonicalised action string.
 *  @example
 *    parse_pre_arrow_action(`'evt'`)        // → 'evt'
 *    parse_pre_arrow_action(`'a\\nb'`)      // → 'a\nb'
 */
function parse_pre_arrow_action(action_literal: string): string {

  const tree = jssm.parse(`a ${action_literal} -> b;`) as Array<{ se: { r_action?: string } }>;
  return tree[0].se.r_action!;

}



/**
 *  Generate the FSL source for a String literal containing the given
 *  raw chars (no escapes performed — caller is responsible for any
 *  pre-escaping).  Equivalent to `"${body}"`.
 *  @param  body  Inner string content, already escape-encoded.
 *  @returns      Source text including the surrounding quotes.
 */
function quote_string(body: string): string {
  return `"${body}"`;
}



/**
 *  Generate the FSL source for an ActionLabel containing the given
 *  raw chars (no escapes performed).  Equivalent to `'${body}'`.
 *  @param  body  Inner action-label content, already escape-encoded.
 *  @returns      Source text including the surrounding single quotes.
 */
function quote_action(body: string): string {
  return `'${body}'`;
}



/**
 *  Build a random run of whitespace characters drawn from
 *  `WS_CHARS`.  Used by injection-based tests that prove a parse is
 *  invariant under arbitrary WS at joinable positions.
 *  @returns  fast-check Arbitrary that yields a string of 0–8 WS chars.
 */
function ws_run_arb(): fc.Arbitrary<string> {
  return fc.array(fc.constantFrom(...WS_CHARS), { minLength: 0, maxLength: 8 })
    .map(arr => arr.join(''));
}





describe('§2 WS — whitespace invariance over a->b;', () => {

  // The base machine `a->b;` has five joinable positions: before `a`,
  // between `a` and `->`, between `->` and `b`, between `b` and `;`,
  // and after `;`.  Random WS at any/all of them must leave the parse
  // tree identical to the no-WS form.

  const BASE = [{ key: 'transition', from: 'a', se: { kind: '->', to: 'b' } }];

  test('Random whitespace at all five splice positions preserves parse', () => {

    fc.assert(
      fc.property(
        ws_run_arb(), ws_run_arb(), ws_run_arb(), ws_run_arb(), ws_run_arb(),
        (w0, w1, w2, w3, w4) => {
          const src = `${w0}a${w1}->${w2}b${w3};${w4}`;
          expect(jssm.parse(src)).toEqual(BASE);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Each individual WS character produces a valid parse at every splice', () => {

    for (const ws of WS_CHARS) {
      expect(jssm.parse(`${ws}a->b;`     )).toEqual(BASE);
      expect(jssm.parse(`a${ws}->b;`     )).toEqual(BASE);
      expect(jssm.parse(`a->${ws}b;`     )).toEqual(BASE);
      expect(jssm.parse(`a->b${ws};`     )).toEqual(BASE);
      expect(jssm.parse(`a->b;${ws}`     )).toEqual(BASE);
    }

  });

});





describe('§2 WS — multi-statement separation', () => {

  // Two terms separated by arbitrary WS run produce two transition
  // entries.  Confirms WS is structural-only (never produces stray AST
  // entries) and that the boundary between terms is purely syntactic.

  const TWO = [
    { key: 'transition', from: 'a', se: { kind: '->', to: 'b' } },
    { key: 'transition', from: 'c', se: { kind: '->', to: 'd' } },
  ];

  test('Random WS between two transitions yields two-term parse', () => {

    fc.assert(
      fc.property(
        ws_run_arb().filter(s => s.length > 0),
        (ws) => {
          expect(jssm.parse(`a->b;${ws}c->d;`)).toEqual(TWO);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§2 BlockComment — empty and content forms at joinable positions', () => {

  // BlockComment matches `/*` then BlockCommentTail which is the
  // shortest-prefix munch to `*/`.  Body content is irrelevant to the
  // parse other than that it must not contain `*/`.

  const BASE = [{ key: 'transition', from: 'a', se: { kind: '->', to: 'b' } }];

  /**
   *  Random block-comment body — any printable ASCII except `*`,
   *  which would risk closing the comment early.  Conservative: `*`
   *  is permitted by the grammar so long as not followed by `/`,
   *  but excluding it keeps the test obviously sound.
   */
  const body_arb = fc.string({ minLength: 0, maxLength: 30 })
    .filter(s => !s.includes('*') && !s.includes('/'));

  test('Block comment with random body at every splice preserves parse', () => {

    fc.assert(
      fc.property(body_arb, (body) => {
        const c = `/*${body}*/`;
        expect(jssm.parse(`${c}a->b;`    )).toEqual(BASE);
        expect(jssm.parse(`a${c}->b;`    )).toEqual(BASE);
        expect(jssm.parse(`a->${c}b;`    )).toEqual(BASE);
        expect(jssm.parse(`a->b${c};`    )).toEqual(BASE);
        expect(jssm.parse(`a->b;${c}`    )).toEqual(BASE);
      }),
      { numRuns: RUNS }
    );

  });

  test('Empty block comment `/**/` accepted at every splice', () => {

    expect(jssm.parse(`/**/a->b;`)).toEqual(BASE);
    expect(jssm.parse(`a/**/->b;`)).toEqual(BASE);
    expect(jssm.parse(`a->/**/b;`)).toEqual(BASE);
    expect(jssm.parse(`a->b/**/;`)).toEqual(BASE);
    expect(jssm.parse(`a->b;/**/`)).toEqual(BASE);

  });

});





describe('§2 BlockComment — documented non-nesting (PEG first-match)', () => {

  // BlockCommentTail munches until the FIRST `*/`.  Apparent "nested"
  // comments therefore terminate the outer comment at the inner's
  // closer, leaving leftover text that should fail to parse.  This is
  // not a bug — `notes/fsl-grammar-reference.md` §2 documents that
  // block comments are non-nesting.

  test('Apparent nesting closes at first */, leaving leftover that fails', () => {

    // `/* /* X */ Y */ a->b;` — outer block ends at first `*/`,
    // leaving ` Y */ a->b;` which is junk before any valid term.
    expect(() => jssm.parse(`/* /* X */ Y */ a->b;`)).toThrow();

  });

  test('A pre-pended block comment ending before a real term parses fine', () => {

    // Sanity: the same shape *without* the trailing `*/` parses, to
    // prove the failure above isn't from some unrelated cause.
    expect(jssm.parse(`/* /* X */ a->b;`)).toEqual(
      [{ key: 'transition', from: 'a', se: { kind: '->', to: 'b' } }]
    );

  });

});





describe('§2 LineComment — terminators', () => {

  // LineComment is `//` then LineCommentTail which terminates on any
  // LineTerminator (LF / CR / U+2028 / U+2029) or EOF.

  const BASE = [{ key: 'transition', from: 'a', se: { kind: '->', to: 'b' } }];

  /**
   *  Random line-comment body — chars outside the LineTerminator set,
   *  so the comment can't self-terminate inside its random body.
   */
  const body_arb = fc.string({ minLength: 0, maxLength: 30 })
    .filter(s => [...s].every(c => !['\n', '\r', '\u{2028}', '\u{2029}'].includes(c)));

  test('LF (U+000A) ends the line comment', () => {

    fc.assert(
      fc.property(body_arb, (body) => {
        expect(jssm.parse(`//${body}\na->b;`)).toEqual(BASE);
      }),
      { numRuns: RUNS }
    );

  });

  test('CR (U+000D) ends the line comment', () => {

    fc.assert(
      fc.property(body_arb, (body) => {
        expect(jssm.parse(`//${body}\ra->b;`)).toEqual(BASE);
      }),
      { numRuns: RUNS }
    );

  });

  test('U+2028 (LINE SEPARATOR) ends the line comment', () => {

    fc.assert(
      fc.property(body_arb, (body) => {
        expect(jssm.parse(`//${body}\u{2028}a->b;`)).toEqual(BASE);
      }),
      { numRuns: RUNS }
    );

  });

  test('U+2029 (PARAGRAPH SEPARATOR) ends the line comment', () => {

    fc.assert(
      fc.property(body_arb, (body) => {
        expect(jssm.parse(`//${body}\u{2029}a->b;`)).toEqual(BASE);
      }),
      { numRuns: RUNS }
    );

  });

  test('EOF ends a trailing line comment (no terminator needed)', () => {

    fc.assert(
      fc.property(body_arb, (body) => {
        expect(jssm.parse(`a->b;//${body}`)).toEqual(BASE);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('§2 String — single-char escape vocabulary', () => {

  // The Char rule's escape sequences map one-to-one onto the JS
  // string-escape conventions.  Vehicle: parse `"<literal>" -> b;`
  // and read the canonicalised label at `tree[0].from`.

  const escape_table: Array<[string, string]> = [
    [String.raw`\"`,  '"'  ],
    ['\\\\', '\\' ],
    [String.raw`\/`,  '/'  ],
    [String.raw`\b`,  '\b' ],
    [String.raw`\f`,  '\f' ],
    [String.raw`\n`,  '\n' ],
    [String.raw`\r`,  '\r' ],
    [String.raw`\t`,  '\t' ],
    [String.raw`\v`,  '\v' ],
  ];

  for (const [escape_src, expected_char] of escape_table) {
    test(`Escape \`${escape_src}\` canonicalises to char code ${expected_char.charCodeAt(0)}`, () => {
      const tree = parse_transition(quote_string(`x${escape_src}y`), 'b');
      expect(tree[0].from).toBe(`x${expected_char}y`);
    });
  }

});



describe('§2 String — uXXXX unicode escape form', () => {

  // \uXXXX with four hex digits maps to the BMP code point parseInt(hex, 16).

  test('Random four-hex-digit unicode escapes decode to the matching code point', () => {

    fc.assert(
      fc.property(
        fc.integer(0x00_20, 0xFF_FD)
          // Excluded: code points that have other roles in the grammar's
          // unescaped class (`"` at 0x22, `\` at 0x5C) -- we still test
          // those via the canonical escape table above, but excluding
          // them here keeps the round-trip assertion clean.
          .filter(cp => cp !== 0x22 && cp !== 0x5C),
        (cp) => {
          const hex     = cp.toString(16).padStart(4, '0');
          const tree    = parse_transition(quote_string(String.raw`x\u${hex}y`), 'b');
          expect(tree[0].from).toBe(`x${String.fromCharCode(cp)}y`);
        }
      ),
      { numRuns: RUNS }
    );

  });

});



describe('§2 String — unescaped body round-trip', () => {

  // Any char in the unescaped range round-trips verbatim.  Range is
  // \x00–\x21, \x23–\x5B, \x5D–￿ (i.e. all of Unicode except `"`
  // and `\`).  We sample inside the printable ASCII window plus a
  // splash of non-Latin Unicode so the test is fast and readable in
  // failure output.

  /**
   *  Random unescaped-body string: any chars except `"`, `\`, and
   *  line terminators (which would terminate other contexts but are
   *  legal inside strings).
   */
  const body_arb = fc.string({ minLength: 0, maxLength: 20 })
    .filter(s => !s.includes('"') && !s.includes('\\'));

  test('Random unescaped string body round-trips at the from-label position', () => {

    fc.assert(
      fc.property(body_arb, (body) => {
        const tree = parse_transition(quote_string(body), 'b');
        expect(tree[0].from).toBe(body);
      }),
      { numRuns: RUNS }
    );

  });

  test('Non-Latin Unicode body (codepoints 0x0080–0xFFFD) round-trips', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.integer(0x00_80, 0xFF_FD).filter(cp => cp !== 0x20_28 && cp !== 0x20_29),
          { minLength: 1, maxLength: 10 }
        ),
        (cps) => {
          const body = cps.map(cp => String.fromCharCode(cp)).join('');
          const tree = parse_transition(quote_string(body), 'b');
          expect(tree[0].from).toBe(body);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§2 ActionLabel — single-char escape vocabulary', () => {

  // ActionLabel is a single-quoted twin of String.  Same escape
  // sequences except `\'` replaces `\"`.  Vehicle: a pre-arrow action
  // decoration `a '<literal>' -> b;`.

  const escape_table: Array<[string, string]> = [
    [String.raw`\'`,  "'"  ],
    ['\\\\', '\\' ],
    [String.raw`\/`,  '/'  ],
    [String.raw`\b`,  '\b' ],
    [String.raw`\f`,  '\f' ],
    [String.raw`\n`,  '\n' ],
    [String.raw`\r`,  '\r' ],
    [String.raw`\t`,  '\t' ],
    [String.raw`\v`,  '\v' ],
  ];

  for (const [escape_src, expected_char] of escape_table) {
    test(`Escape \`${escape_src}\` canonicalises to char code ${expected_char.charCodeAt(0)}`, () => {
      const action = parse_pre_arrow_action(quote_action(`x${escape_src}y`));
      expect(action).toBe(`x${expected_char}y`);
    });
  }

});



describe('§2 ActionLabel — uXXXX unicode escape form', () => {

  test('Random four-hex-digit unicode escapes decode to the matching code point', () => {

    fc.assert(
      fc.property(
        fc.integer(0x00_20, 0xFF_FD)
          // Excluded: `'` at 0x27 and `\` at 0x5C — these have escape
          // forms tested in the canonical table above.
          .filter(cp => cp !== 0x27 && cp !== 0x5C),
        (cp) => {
          const hex    = cp.toString(16).padStart(4, '0');
          const action = parse_pre_arrow_action(quote_action(String.raw`x\u${hex}y`));
          expect(action).toBe(`x${String.fromCharCode(cp)}y`);
        }
      ),
      { numRuns: RUNS }
    );

  });

});



describe('§2 ActionLabel — unescaped body round-trip', () => {

  // Unescaped range \x20–\x26, \x28–\x5B, \x5D–￿ (all of
  // Unicode except `'` and `\`).

  /**
   *  Random unescaped body: any chars except `'`, `\`, and bytes
   *  below 0x20 (the unescaped range starts at 0x20 for action
   *  labels — tighter than String's 0x00 start).
   */
  const body_arb = fc.string({ minLength: 0, maxLength: 20 })
    .filter(s => !s.includes("'") && !s.includes('\\') && [...s].every(c => c.charCodeAt(0) >= 0x20));

  test('Random unescaped action-label body round-trips through r_action', () => {

    fc.assert(
      fc.property(body_arb, (body) => {
        expect(parse_pre_arrow_action(quote_action(body))).toBe(body);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('§2 Atom — AtomFirstLetter character class', () => {

  // AtomFirstLetter = [0-9 a-z A-Z . _ ! $ ^ * ? , \x80-￿].
  // Every char in the set must be accepted as a one-character atom
  // at the from-label position.

  const ASCII_FIRST = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ._!$^*?,'.split('');

  test('Every ASCII AtomFirstLetter char parses as a single-char from-label', () => {

    for (const c of ASCII_FIRST) {
      const tree = parse_transition(c, 'b');
      expect(tree[0].from).toBe(c);
    }

  });

  test('Random non-Latin Unicode chars (0x80–0xFFFD) parse as single-char atoms', () => {

    fc.assert(
      fc.property(
        fc.integer(0x80, 0xFF_FD)
          // Skip line terminators and the standard non-character
          // codepoints that aren't legal in source.
          .filter(cp => cp !== 0x20_28 && cp !== 0x20_29),
        (cp) => {
          const c    = String.fromCharCode(cp);
          const tree = parse_transition(c, 'b');
          expect(tree[0].from).toBe(c);
        }
      ),
      { numRuns: RUNS }
    );

  });

});



describe('§2 Atom — AtomLetter (rest) adds + ( ) & # @', () => {

  // AtomLetter (the rest class) is AtomFirstLetter plus + ( ) & # @.
  // These six chars are valid in non-leading positions but NOT as the
  // first character of an atom.

  const REST_ONLY = ['+', '(', ')', '&', '#', '@'] as const;

  // Of those, a leading `&` is no longer a parse error: the overlapping-
  // state-groups feature makes `&Name` a GroupRef in source position.
  // The remaining five still fail as an atom's leading character.
  const REST_ONLY_NONLEADING = ['+', '(', ')', '#', '@'] as const;

  test('Each rest-only char concatenates onto a leading atom char', () => {

    for (const c of REST_ONLY) {
      // Use `a` as the leading char so the full atom is `a${c}`.
      const tree = parse_transition(`a${c}`, 'b');
      expect(tree[0].from).toBe(`a${c}`);
    }

  });

  test('Each non-`&` rest-only char fails as the leading character of an atom', () => {

    for (const c of REST_ONLY_NONLEADING) {
      expect(() => parse_transition(`${c}a`, 'b')).toThrow();
    }

  });

  test('A leading `&` parses as a GroupRef source, not an atom', () => {

    // `&busy -> b;` is now a transition whose source is a group
    // reference `{ key:'group_ref', name:'busy' }`, not a parse error.
    const tree = jssm.parse('&busy -> b;') as Array<{ from: unknown }>;
    expect(tree[0].from).toEqual({ key: 'group_ref', name: 'busy' });

  });

});



describe('§2 Atom — multi-char compositions', () => {

  // Random atoms built from a leading AtomFirstLetter char followed
  // by random AtomLetter chars.  Excludes Unicode here to keep the
  // shrinking output readable; Unicode is covered separately above.

  const FIRST = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ._!$^*?,'.split('');
  const REST  = [...FIRST, '+', '(', ')', '&', '#', '@'];

  test('Random ASCII atoms round-trip at the from-label position', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...FIRST),
        fc.array(fc.constantFrom(...REST), { minLength: 0, maxLength: 12 }),
        (first, rest) => {
          const atom = first + rest.join('');
          const tree = parse_transition(atom, 'b');
          expect(tree[0].from).toBe(atom);
        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('§2 Label — Atom and String forms produce equivalent labels', () => {

  // `Label = Atom / String`.  When a name fits both forms (i.e. it's
  // a valid atom *and* a valid string body), both spellings should
  // produce identical canonical values at the from-label position.

  /**
   *  Random atom-shaped body that's also a valid string (no `"`, no
   *  `\`).  Keep to a small alphabet of unambiguous chars to avoid
   *  any precedence accidents elsewhere in the grammar.
   */
  const body_arb = fc.array(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
    { minLength: 1, maxLength: 10 }
  ).map(arr => arr.join(''));

  test('Atom-form and quoted-form labels yield the same canonical from-label', () => {

    fc.assert(
      fc.property(body_arb, (body) => {
        const atom_tree   = parse_transition(body,                 'b');
        const string_tree = parse_transition(quote_string(body),   'b');
        expect(string_tree[0].from).toBe(atom_tree[0].from);
        expect(string_tree[0].from).toBe(body);
      }),
      { numRuns: RUNS }
    );

  });

});





describe('§2 LabelList — bracketed list shapes', () => {

  // LabelList appears inside config blocks like `start_states`.  The
  // grammar accepts an empty list, a single label, and any number of
  // labels separated only by whitespace.  Mixed atom/string members
  // are explicitly supported by `LabelList = "[" WS? (Label WS?)* "]"`
  // because Label is Atom / String.

  /**
   *  Parse `start_states : <list_src>;` and return the parsed list.
   *  The vehicle is config-block-driven because that's the cleanest
   *  surface that exposes a LabelList directly in the AST.
   *  @param  list_src  Source text of the list, including brackets.
   *  @returns          Array of label strings as canonicalised by the parser.
   */
  function parse_start_states(list_src: string): string[] {

    const tree = jssm.parse(`start_states: ${list_src};`) as Array<{ value: string[] }>;
    return tree[0].value;

  }

  test('Empty list `[]` parses to an empty array', () => {
    expect(parse_start_states('[]')).toEqual([]);
  });

  test('Single-label list `[a]` parses to one-element array', () => {
    expect(parse_start_states('[a]')).toEqual(['a']);
  });

  test('Multi-label list of atoms `[a b c]` parses in order', () => {
    expect(parse_start_states('[a b c]')).toEqual(['a', 'b', 'c']);
  });

  test('Mixed atom and string members `[a "b" c]` interleave correctly', () => {
    expect(parse_start_states('[a "b" c]')).toEqual(['a', 'b', 'c']);
  });

  test('Random WS between members preserves order and arity', () => {

    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
          { minLength: 0, maxLength: 8 }
        ),
        ws_run_arb(),
        (labels, ws) => {
          const separator = ws.length > 0 ? ws : ' ';
          const src       = '[' + labels.join(separator) + ']';
          expect(parse_start_states(src)).toEqual(labels);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Comments inside the list are treated as whitespace', () => {

    expect(parse_start_states('[a /* x */ b]'                 )).toEqual(['a', 'b']);
    expect(parse_start_states('[a // x\n b]'                   )).toEqual(['a', 'b']);
    expect(parse_start_states('[/**/ a /**/ b /**/]'           )).toEqual(['a', 'b']);

  });

});
