
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
//   - Atom: AtomFirstLetter vs AtomLetter (rest) character classes — the
//     6.0 Unicode-identifier rule (#754), whose canonical predicates are
//     `is_state_name_first_char` / `is_state_name_char` on the jssm export
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



/**
 *  Escape a single character for literal use inside a `RegExp` source, so
 *  a rejection needle like `contains "+"` can be built from the offending
 *  character without `+` becoming a quantifier.
 *  @param  ch  The character to escape.
 *  @returns    The character, backslash-prefixed if it is a regex metacharacter.
 *  @example
 *    escape_for_regex('+')  // → '\\+'
 *    escape_for_regex('a')  // → 'a'
 */
function escape_for_regex(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}



/**
 *  Run `fn`, assert that it throws the parser's `SyntaxError` (pegjs's
 *  `peg$SyntaxError`, which carries `name === 'SyntaxError'` but subclasses
 *  `Error` rather than the global `SyntaxError`, so `toThrow(SyntaxError)`
 *  can't be used), and hand the error back so the caller can assert on its
 *  message.
 *  @param  fn  Thunk expected to throw.
 *  @returns    The caught parser error.
 *  @example
 *    expect(syntax_error_from(() => jssm.parse('0 -> b;')).message).toMatch(/starts with a digit/);
 */
function syntax_error_from(fn: () => unknown): Error {

  let caught: unknown;
  try { fn(); } catch (error) { caught = error; }

  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).name).toBe('SyntaxError');

  return caught as Error;

}



/**
 *  Build the rejection needle a bareword with a bad character gets: the
 *  message must carry a `contains "<ch>"` clause naming the exact offending
 *  character, not merely mention it somewhere in the quoted suggestion.
 *  @param  ch  The offending character.
 *  @returns    A `RegExp` matching `contains "<ch>"`.
 *  @example
 *    names_char('.')  // → /contains "\."/
 */
function names_char(ch: string): RegExp {
  return new RegExp(`contains "${escape_for_regex(ch)}"`);
}



// #754 bareword character classes, ASCII slice.  6.0 barewords are Unicode
// identifiers: first char `[\p{L}\p{Nl}_]`, rest `[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}]`.
// Restricted to ASCII these are `[A-Za-z_]` and `[A-Za-z0-9_]`.

const ASCII_LETTERS  = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ASCII_DIGITS   = '0123456789'.split('');
const ASCII_FIRST    = [...ASCII_LETTERS, '_'];
const ASCII_REST     = [...ASCII_FIRST, ...ASCII_DIGITS];

/**
 *  Every printable ASCII character (0x21–0x7E) that is NOT a legal
 *  bareword first character under the 6.0 rule — digits, punctuation, and
 *  symbols.  Whitespace (0x20) is omitted: it is structural, never a name.
 */
const ASCII_NOT_FIRST: string[] = [];
for (let cp = 0x21; cp <= 0x7E; ++cp) {
  const c = String.fromCharCode(cp);
  if (!ASCII_FIRST.includes(c)) { ASCII_NOT_FIRST.push(c); }
}



/**
 *  Random Unicode scalar value from U+0080 up through the supplementary
 *  planes, as a one-code-point string.  Surrogate code points are not scalar
 *  values and are skipped; a supplementary character (e.g. `𝛼`, U+1D6FC)
 *  is generated as its full surrogate pair via `String.fromCodePoint`.
 *  U+2028/U+2029 are line terminators in the grammar and are skipped too.
 *  @returns  fast-check Arbitrary yielding one non-ASCII code point.
 */
function unicode_code_point_arb(): fc.Arbitrary<string> {
  return fc.integer({ min: 0x80, max: 0x10_FF_FF })
    .filter(cp => cp < 0xD8_00 || cp > 0xDF_FF)
    .filter(cp => cp !== 0x20_28 && cp !== 0x20_29)
    .map(cp => String.fromCodePoint(cp));
}



/**
 *  Random bareword valid under the 6.0 rule, drawn from the FULL Unicode
 *  identifier classes (first char accepted by `is_state_name_first_char`,
 *  each later char by `is_state_name_char`) with ASCII mixed in so both
 *  halves of the class get real coverage.
 *  @returns  fast-check Arbitrary yielding a 1–8 code point identifier.
 */
function identifier_arb(): fc.Arbitrary<string> {

  const first = fc.oneof(
    fc.constantFrom(...ASCII_FIRST),
    unicode_code_point_arb().filter(c => jssm.is_state_name_first_char(c)),
  );

  const rest = fc.oneof(
    fc.constantFrom(...ASCII_REST),
    unicode_code_point_arb().filter(c => jssm.is_state_name_char(c)),
  );

  return fc.tuple(first, fc.array(rest, { minLength: 0, maxLength: 7 }))
    .map(([f, r]) => f + r.join(''));

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

  // #754: AtomFirstLetter = [\p{L}\p{Nl}_].  Restricted to ASCII that is
  // `[A-Za-z_]`.  Every char in the set must be accepted as a one-character
  // atom at the from-label position, and every other printable ASCII char
  // must be rejected there — a leading digit with the migration message
  // (`quote it`), the rest with a parser SyntaxError.  A lone symbol
  // followed by whitespace is not bareword-shaped, so pegjs's generic
  // expectation error fires for it; only once the symbol is followed by
  // identifier text does the targeted `contains "<ch>"` message appear
  // (covered in the AtomLetter block below).

  test('Every ASCII AtomFirstLetter char parses as a single-char from-label', () => {

    for (const c of ASCII_FIRST) {
      const tree = parse_transition(c, 'b');
      expect(tree[0].from).toBe(c);
    }

  });

  test('Every ASCII digit is rejected as a single-char bareword with the leading-digit message', () => {

    for (const d of ASCII_DIGITS) {
      const message = syntax_error_from(() => parse_transition(d, 'b')).message;
      expect(message).toMatch(/starts with a digit/);
      expect(message).toMatch(new RegExp(String.raw`quote it \("${d}"\)`));
    }

  });

  test('Every other printable ASCII char is rejected as a single-char bareword', () => {

    for (const c of ASCII_NOT_FIRST) {
      expect(syntax_error_from(() => parse_transition(c, 'b')).message).not.toBe('');
    }

  });

  test('Random Unicode identifier-start code points (0x80–0x10FFFF) parse as single-char atoms', () => {

    fc.assert(
      fc.property(
        unicode_code_point_arb().filter(c => jssm.is_state_name_first_char(c)),
        (c) => {
          const tree = parse_transition(c, 'b');
          expect(tree[0].from).toBe(c);
          expect(parse_transition('a', c)[0].se.to).toBe(c);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Random Unicode non-identifier-start code points are rejected bare, naming the char, and parse when quoted', () => {

    fc.assert(
      fc.property(
        unicode_code_point_arb().filter(c => !jssm.is_state_name_first_char(c)),
        (c) => {
          const message = syntax_error_from(() => parse_transition(c, 'b')).message;
          expect(message).toMatch(new RegExp(`starts with "${escape_for_regex(c)}"`));
          expect(message).toMatch(/quote it/);
          expect(parse_transition(quote_string(c), 'b')[0].from).toBe(c);
        }
      ),
      { numRuns: RUNS }
    );

  });

});



describe('§2 Atom — AtomLetter (rest) adds digits and combining/connector marks', () => {

  // #754: AtomLetter = [\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}] — the first
  // class plus decimal digits, nonspacing/spacing combining marks, and
  // connector punctuation.  In ASCII that adds only `0-9` (`_` is in both
  // classes).  The 5.x rest-only chars `+ ( ) & # @` are no longer legal
  // anywhere in a bareword.

  /**
   *  Trailing chars the grammar's `BarewordBadChar` / `BarewordDashTail`
   *  rules catch, so the rejection names the char in a `contains "<ch>"`
   *  clause and suggests quoting.
   */
  const BAD_TAIL_NAMED = ['+', '&', '#', '@', '.', '-'] as const;

  /**
   *  Trailing chars the grammar has no targeted rule for: `(` / `)` are
   *  structural, so the atom ends before them and pegjs's generic
   *  expectation error reports the char as unexpected (`but "(" found`).
   */
  const BAD_TAIL_STRUCTURAL = ['(', ')'] as const;

  // 5.x rest-only chars as a LEADING char.  `&` is a GroupRef sigil; the
  // rest are rejected — `+ # @` with the targeted message, `( )` generically.
  const LEADING_NAMED      = ['+', '#', '@'] as const;
  const LEADING_STRUCTURAL = ['(', ')'] as const;

  test('`a` followed by each ASCII digit or `_` concatenates into one atom', () => {

    for (const c of [...ASCII_DIGITS, '_']) {
      const tree = parse_transition(`a${c}`, 'b');
      expect(tree[0].from).toBe(`a${c}`);
    }

  });

  test('Random ASCII-letter-led atoms with digit/underscore tails round-trip', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...ASCII_FIRST),
        fc.array(fc.constantFrom(...ASCII_DIGITS, '_'), { minLength: 1, maxLength: 12 }),
        (first, rest) => {
          const atom = first + rest.join('');
          expect(parse_transition(atom, 'b')[0].from).toBe(atom);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Random Unicode rest-only code points (Mn / Mc / Nd / Pc, not identifier-start) concatenate onto `a`', () => {

    fc.assert(
      fc.property(
        unicode_code_point_arb().filter(c => jssm.is_state_name_char(c) && !jssm.is_state_name_first_char(c)),
        (c) => {
          const atom = `a${c}`;
          expect(parse_transition(atom, 'b')[0].from).toBe(atom);
          expect(parse_transition('b', atom)[0].se.to).toBe(atom);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('Each named 5.x trailing char after `a` is rejected, naming the char and suggesting quotes', () => {

    for (const c of BAD_TAIL_NAMED) {
      const source_message = syntax_error_from(() => parse_transition(`a${c}`, 'b')).message;
      expect(source_message).toMatch(names_char(c));
      expect(source_message).toMatch(new RegExp(String.raw`quote it \("a${escape_for_regex(c)}"\)`));
      expect(syntax_error_from(() => parse_transition('b', `a${c}`)).message).toMatch(names_char(c));
    }

  });

  test('Each structural 5.x trailing char after `a` is rejected as an unexpected token', () => {

    for (const c of BAD_TAIL_STRUCTURAL) {
      const unexpected = new RegExp(`but "${escape_for_regex(c)}" found`);
      expect(syntax_error_from(() => parse_transition(`a${c}`, 'b')).message).toMatch(unexpected);
      expect(syntax_error_from(() => parse_transition('b', `a${c}`)).message).toMatch(unexpected);
    }

  });

  test('Each non-`&` 5.x rest-only char fails as the leading character of an atom', () => {

    for (const c of LEADING_NAMED) {
      const message = syntax_error_from(() => parse_transition(`${c}a`, 'b')).message;
      expect(message).toMatch(names_char(c));
      expect(message).toMatch(/quote it/);
    }

    for (const c of LEADING_STRUCTURAL) {
      expect(syntax_error_from(() => parse_transition(`${c}a`, 'b')).message).toMatch(new RegExp(`but "${escape_for_regex(c)}" found`));
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
  // by random AtomLetter chars, i.e. `[A-Za-z_][A-Za-z0-9_]*`.  Excludes
  // Unicode here to keep the shrinking output readable; Unicode is
  // covered separately above.

  test('Random ASCII atoms round-trip at the from-label position', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...ASCII_FIRST),
        fc.array(fc.constantFrom(...ASCII_REST), { minLength: 0, maxLength: 12 }),
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
  // Bodies are drawn from the full 6.0 identifier classes (ASCII and
  // Unicode letters, marks, digits, connectors); none of those contain
  // `"` or `\`, so every identifier is also a valid string body.

  test('Atom-form and quoted-form labels yield the same canonical from-label', () => {

    fc.assert(
      fc.property(identifier_arb(), (body) => {
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

    // `JssmCompileSeStart['value']` is a loose carrier union
    // (`string | number | JssmStateDeclarationRule[]`) shared by every
    // non-transition rule; it does not describe the `string[]` a LabelList
    // rule actually emits.  The double assertion is the narrowing this test
    // performs by hand — see the value-shape assertions below.
    const tree = jssm.parse(`start_states: ${list_src};`) as unknown as Array<{ value: string[] }>;
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
