# Bareword Charset Restriction (#754) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict FSL barewords (the grammar's `Atom` rule and `ValEnumMember`) to Unicode identifier characters, so symbol-bearing and leading-digit names must be quoted, while every Unicode letter keeps working unquoted.

**Architecture:** The grammar (`src/ts/fsl_parser.peg`, pegjs 0.10) gains a code-point rule plus semantic predicates over `u`-flag regexes, because pegjs 0.10 cannot express `\p{}` classes. The exported charset tables in `jssm_constants.ts` are replaced by predicates. The unicode suite driver gains an identifier-class predicate so every per-codepoint test asserts the correct one of "bareword accepted" or "bareword rejected, quoted accepted". Docs and the breaking-changes manifest record the landed break.

**Tech Stack:** TypeScript, pegjs 0.10 (`npm run peg` regenerates `src/ts/fsl_parser.ts`), vitest (`npx vitest run --config vitest.spec.config.ts <file> --coverage.enabled=false` for one file; `npm run vitest-unicode-atom` etc. for the unicode suites).

**Spec:** `notes/superpowers/specs/2026-09-08-v6-landing-program-design.md` (sub-project 2) — decision 2 there is binding: a bareword is `[\p{L}_][\p{L}\p{N}_]*`-shaped, "Unicode letters and digits remain barewords; only ASCII symbols and a leading digit are evicted."

## Global Constraints

- Bareword first character class (call it `BAREWORD_FIRST`): `/^[\p{L}\p{Nl}_]$/u` — letters, letter-numbers, underscore.
- Bareword continuation class (`BAREWORD_REST`): `/^[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}_]$/u` — the first class plus nonspacing and spacing marks, decimal digits, connector punctuation.
- Astral code points (surrogate pairs in UTF-16) must be classified as one character, so `𝛼` (U+1D6FC, a letter) is a legal bareword and `😀` (U+1F600, a symbol) is not.
- A rejected bareword must produce a `JssmError`/parse error whose message contains the offending character and the word `quote`.
- `ValEnumMember` uses exactly the bareword classes.
- Quoted-string names are unchanged: anything a `String` accepted before still works.
- No fake tests, no golden files, no snapshot tests. A test asserts behavior the code produces.
- Do not run `npm run make`, `npm run build`, or `npm install`. You may run `npm run peg`, `npx tsc --noEmit -p tsconfig.json`, `npx tsc --noEmit -p tsconfig.cli.json`, `npx eslint <files>`, and vitest on single files (coverage disabled) or the unicode scripts.
- One command per tool call. Never chain commands with `&&`, `||`, `;`, a pipe, or a newline.
- Commit with `git add <paths>` then `git commit -m "<conventional commit>"`, pathspec-scoped; never `git add -A`.

---

### Task 1: Grammar — Unicode identifier barewords with a targeted rejection message

**Files:**
- Modify: `src/ts/fsl_parser.peg` (rules `AtomFirstLetter`, `AtomLetter`, `Atom`, `ValEnumMember`, `ArrowTarget`, around lines 275–290, 811–816, 1674–1677)
- Test: `src/ts/tests/bareword_charset.spec.ts` (new)

**Interfaces:**
- Consumes: nothing.
- Produces: the regenerated parser (`src/ts/fsl_parser.ts`, via `npm run peg`) whose `Atom` accepts exactly the classes in Global Constraints. Later tasks rely on `jssm.parse('x -> y;')` throwing for a symbol-bearing bareword and succeeding for Unicode letters.

- [ ] **Step 1: Write the failing spec**

Create `src/ts/tests/bareword_charset.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

// #754: barewords are Unicode identifiers. Symbol-bearing and leading-digit
// names must be quoted.

const parses  = (src: string) => expect(() => jssm.parse(src)).not.toThrow();
const rejects = (src: string, needle: RegExp) => expect(() => jssm.parse(src)).toThrow(needle);

describe('bareword charset (#754)', () => {

  describe('accepted barewords', () => {
    it.each([
      'a', 'A', '_', 'a1', 'a_b', 'état', 'состояние', '状態', 'שלום', 'Ⅻ',
      'नमस्ते',   // Devanagari with combining vowel signs (Mc/Mn continuation)
      '𝛼𝛽',      // astral letters (surrogate pairs)
    ])('%s parses as a state name', (name) => {
      parses(`${name} -> other;`);
      const m = jssm.sm`${name} -> other;`;
      expect(m.has_state(name)).toBe(true);
    });
  });

  describe('rejected barewords', () => {
    it.each([
      ['in-progress', '-'],
      ['node.start',  '.'],
      ['a+b',         '+'],
      ['a&b',         '&'],
      ['a#b',         '#'],
      ['a@b',         '@'],
      ['a$b',         '$'],
      ['a^b',         '^'],
      ['a*b',         '*'],
      ['a!b',         '!'],
      ['a?b',         '?'],
      ['a,b',         ','],
    ])('%s is rejected naming %s and suggesting quotes', (name, ch) => {
      rejects(`${name} -> other;`, new RegExp(`\\${ch}`));
      rejects(`${name} -> other;`, /quote/);
    });

    it.each(['😀', '→', '★', '⌂'])('symbol %s is rejected as a bareword', (name) => {
      rejects(`${name} -> other;`, /quote/);
    });

    it.each(['1st', '2nd', '0', '99bottles'])('leading digit %s is rejected as a bareword', (name) => {
      rejects(`${name} -> other;`, /quote/);
      rejects(`other -> ${name};`, /quote/);
    });
  });

  describe('quoted forms still work', () => {
    it.each(['in-progress', 'node.start', '1st', '😀', 'a b'])('"%s" parses when quoted', (name) => {
      const m = jssm.sm`"${name}" -> other;`;
      expect(m.has_state(name)).toBe(true);
    });
  });

  describe('arrows written without spaces still parse', () => {
    it('a->b is two barewords and an arrow, not a rejected bareword', () => {
      const m = jssm.sm`a->b;`;
      expect(m.has_state('a')).toBe(true);
      expect(m.has_state('b')).toBe(true);
    });
    it('a<->b parses', () => {
      parses('a<->b;');
    });
  });

  describe('enum members follow the bareword classes', () => {
    it('unicode letter members parse', () => {
      parses('val mode : enum [ tag, état, 状態 ] default tag;');
    });
    it('a symbol-bearing member is rejected', () => {
      rejects('val mode : enum [ a.b, c ] default c;', /quote/);
    });
  });

});
```

Note for the implementer: the `val ... enum [...]` syntax above must match the grammar's `ValEnum` rule; read the rule (`grep -n "ValEnum" src/ts/fsl_parser.peg`) and adjust the two enum test sources to the exact accepted syntax before running.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/bareword_charset.spec.ts --coverage.enabled=false`
Expected: the "rejected barewords" and "leading digit" tests FAIL (today these parse), "accepted" tests pass.

- [ ] **Step 3: Rewrite the grammar rules**

In `src/ts/fsl_parser.peg`, replace the `AtomFirstLetter` / `AtomLetter` / `Atom` block with:

```pegjs
// #754: a bareword is a Unicode identifier — first character a letter,
// letter-number, or underscore; continuation adds marks, decimal digits and
// connector punctuation (the UAX #31 shape).  pegjs 0.10 has no \p{} classes,
// so we match one code point (a surrogate pair or one BMP unit) and test it
// with a u-flag regex in a semantic predicate.  Symbols, punctuation, and a
// leading digit must be written as quoted strings.

AtomCodePoint
  = hi:[\uD800-\uDBFF] lo:[\uDC00-\uDFFF] { return hi + lo; }
  / ch:[^\uD800-\uDFFF]                    { return ch; }

AtomFirstLetter
  = ch:AtomCodePoint &{ return /^[\p{L}\p{Nl}_]$/u.test(ch); } { return ch; }

AtomLetter
  = ch:AtomCodePoint &{ return /^[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}_]$/u.test(ch); } { return ch; }

// A character that 5.x allowed inside a bareword and 6.0 does not.  Matched
// only to produce a targeted error: "-" is excluded here because "a->b" is an
// arrow, so the dash case is handled by BarewordDashTail below.
BarewordBadChar
  = [.+&#@$^*!?,]

BarewordDashTail
  = "-" &[^>\-|=~<] { return "-"; }

Atom "atom"
  = firstletter:AtomFirstLetter text:AtomLetter* bad:(BarewordBadChar / BarewordDashTail)? {
      const name = firstletter + ((text || []).join(''));
      if (bad) {
        error(`The bareword "${name}${bad}…" contains "${bad}", which is not allowed in an unquoted name; quote it ("${name}${bad}…") or rename it (${name}_…)`);
      }
      return name;
    }
```

Then replace `ValEnumMember`:

```pegjs
// An enum member is a bareword (same classes as Atom).  The pre-#754 rule
// excluded the comma by hand; commas are no longer bareword characters.
ValEnumMember
  = Atom
```

Then add a final alternative to `ArrowTarget` so a leading-digit token in a transition position gets a targeted message instead of pegjs's generic expectation list:

```pegjs
ArrowTarget
  = Stripe
  / Cycle
  / LabelList
  / GroupRef
  / Label
  / bad:$([0-9] AtomLetter*) {
      error(`The bareword "${bad}" starts with a digit, which is not allowed in an unquoted name; quote it ("${bad}")`);
    }
```

Check that `error(message)` one-argument calls are accepted: `src/buildjs/fixparser.cjs` widens the generated `error(message, location?)` signature, so they are.

- [ ] **Step 4: Regenerate the parser**

Run: `npm run peg`
Expected: no output errors; `src/ts/fsl_parser.ts` regenerated.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 6: Run the new spec**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/bareword_charset.spec.ts --coverage.enabled=false`
Expected: PASS. If the `a->b` test fails, the `BarewordDashTail` lookahead set is wrong: list every arrow's second character (`>`, `-`, `=`, `~`, `|`, `<`) in the negative class and re-run.

- [ ] **Step 7: Run the broader spec suite once, coverage off, to see what else the change broke**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false`
Expected: failures in `characterset.spec.ts` (Task 2 fixes them) and possibly the generated docex test for the charset constants; `numeric.stoch.ts` is in the stoch config, not this one. Record every failing file in your report; do not fix Task 2's files here.

- [ ] **Step 8: Commit**

```
git add src/ts/fsl_parser.peg src/ts/tests/bareword_charset.spec.ts
git commit -m "feat(grammar)!: restrict barewords to Unicode identifier characters (#754)"
```

Do NOT commit `src/ts/fsl_parser.ts`; it is generated by the build (check `git status` shows it as untracked or ignored; if it is tracked in this branch, commit it too and say so in the report).

---

### Task 2: Exported charset predicates, the constants spec, and the bare-zero probe

**Files:**
- Modify: `src/ts/jssm_constants.ts:175-262` (`state_name_chars`, `state_name_first_chars`; leave `action_label_chars`)
- Modify: `src/ts/jssm.ts:2801-2846` (`all_state_name_chars`, `all_state_name_first_chars` docblocks and returns)
- Modify: `src/ts/tests/characterset.spec.ts`
- Modify: `src/ts/tests/numeric.stoch.ts:647-654`
- Test: `src/ts/tests/characterset.spec.ts`

**Interfaces:**
- Consumes: the Task 1 grammar.
- Produces: `is_state_name_char(ch: string): boolean` and `is_state_name_first_char(ch: string): boolean`, exported from `jssm_constants.ts` and re-exported from `jssm.ts` beside the existing `state_name_chars` exports; the range tables `state_name_chars` and `state_name_first_chars` shrink to the ASCII identifier ranges only. The Task 3 driver imports `is_state_name_first_char` and `is_state_name_char`.

- [ ] **Step 1: Write the failing tests**

Replace the `all_state_name_chars contains "+"` and `all_state_name_first_chars excludes "+"` tests in `src/ts/tests/characterset.spec.ts` with:

```typescript
  test('all_state_name_chars no longer contains "+"', () =>
    expect(inRanges(machine.all_state_name_chars(), '+')).toBe(false) );

  test('all_state_name_chars contains "_" and digits', () => {
    expect(inRanges(machine.all_state_name_chars(), '_')).toBe(true);
    expect(inRanges(machine.all_state_name_chars(), '7')).toBe(true);
  });

  test('all_state_name_first_chars excludes digits', () =>
    expect(inRanges(machine.all_state_name_first_chars(), '7')).toBe(false) );
```

and add a new describe:

```typescript
describe('bareword predicates (#754)', () => {

  test('is_state_name_first_char accepts letters in any script and underscore', () => {
    for (const ch of ['a', 'Z', '_', 'é', 'ж', '字', '𝛼', 'Ⅻ']) {
      expect(jssm.is_state_name_first_char(ch)).toBe(true);
    }
  });

  test('is_state_name_first_char rejects digits, symbols, and marks', () => {
    for (const ch of ['0', '9', '.', '-', '+', '😀', '→', '́']) {
      expect(jssm.is_state_name_first_char(ch)).toBe(false);
    }
  });

  test('is_state_name_char additionally accepts digits, marks, and connector punctuation', () => {
    for (const ch of ['0', '9', '́', 'ा', '‿', '_', 'a', '字']) {
      expect(jssm.is_state_name_char(ch)).toBe(true);
    }
  });

  test('is_state_name_char rejects symbols and punctuation', () => {
    for (const ch of ['.', '-', '+', ',', '😀', '→', '(', ')']) {
      expect(jssm.is_state_name_char(ch)).toBe(false);
    }
  });

  test('predicates reject anything that is not exactly one code point', () => {
    expect(jssm.is_state_name_char('')).toBe(false);
    expect(jssm.is_state_name_char('ab')).toBe(false);
    expect(jssm.is_state_name_first_char('')).toBe(false);
  });

});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/characterset.spec.ts --coverage.enabled=false`
Expected: FAIL — `is_state_name_first_char` is not a function.

- [ ] **Step 3: Implement the predicates and shrink the tables**

In `src/ts/jssm_constants.ts`, replace the two `state_name_*` blocks with:

```typescript
/**
 *  Inclusive ASCII character ranges accepted in any but the first position of
 *  an FSL bareword (state / property / val / enum-member name): digits,
 *  letters, and underscore.  Non-ASCII characters are classified by
 *  {@link is_state_name_char}, which is the complete rule; this table exists
 *  for tooling that wants the ASCII portion as ranges.
 *  @example
 *  import { state_name_chars } from 'jssm';
 *  state_name_chars.some(r => 'A' >= r.from && 'A' <= r.to);  // => true
 *  state_name_chars.some(r => '+' >= r.from && '+' <= r.to);  // => false
 *  @see is_state_name_char
 */
// keep in sync with AtomLetter in src/ts/fsl_parser.peg (#754)
const state_name_chars: ReadonlyArray<{ from: string, to: string }> = Object.freeze([
  { from: '0', to: '9' },
  { from: 'a', to: 'z' },
  { from: 'A', to: 'Z' },
  { from: '_', to: '_' },
]);

/**
 *  Inclusive ASCII character ranges accepted in the first position of an FSL
 *  bareword: letters and underscore (never a digit).  Non-ASCII characters
 *  are classified by {@link is_state_name_first_char}.
 *  @example
 *  import { state_name_first_chars } from 'jssm';
 *  state_name_first_chars.some(r => '7' >= r.from && '7' <= r.to);  // => false
 *  @see is_state_name_first_char
 */
// keep in sync with AtomFirstLetter in src/ts/fsl_parser.peg (#754)
const state_name_first_chars: ReadonlyArray<{ from: string, to: string }> = Object.freeze([
  { from: 'a', to: 'z' },
  { from: 'A', to: 'Z' },
  { from: '_', to: '_' },
]);

const BAREWORD_FIRST_RE: RegExp = /^[\p{L}\p{Nl}_]$/u;
const BAREWORD_REST_RE : RegExp = /^[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}_]$/u;

/**
 *  Whether one code point may begin an FSL bareword (#754): a Unicode letter,
 *  a letter-number, or underscore.  Mirrors the grammar's `AtomFirstLetter`.
 *  @param ch - Exactly one code point (a surrogate pair counts as one).
 *  @example
 *  import { is_state_name_first_char } from 'jssm';
 *  is_state_name_first_char('é');  // => true
 *  is_state_name_first_char('7');  // => false
 *  @see is_state_name_char
 */
const is_state_name_first_char = (ch: string): boolean => BAREWORD_FIRST_RE.test(ch);

/**
 *  Whether one code point may continue an FSL bareword (#754): anything
 *  {@link is_state_name_first_char} accepts, plus combining marks, decimal
 *  digits, and connector punctuation.  Mirrors the grammar's `AtomLetter`.
 *  @param ch - Exactly one code point (a surrogate pair counts as one).
 *  @example
 *  import { is_state_name_char } from 'jssm';
 *  is_state_name_char('7');  // => true
 *  is_state_name_char('.');  // => false
 *  @see is_state_name_first_char
 */
const is_state_name_char = (ch: string): boolean => BAREWORD_REST_RE.test(ch);
```

Add `is_state_name_first_char, is_state_name_char` to the `export { ... }` block at the bottom of `jssm_constants.ts`, to the destructure at `src/ts/jssm.ts:77-78`, and to the export list at `src/ts/jssm.ts:7991-7997`. Update the two `all_state_name_*` docblocks in `jssm.ts` (lines ~2801–2830) so their examples match the new tables (`'+'` is now `false` in both; use `'_'` for the true example).

- [ ] **Step 4: Flip the bare-zero probe**

In `src/ts/tests/numeric.stoch.ts` lines 647–654, replace the bare-`0` block with:

```typescript
     // #754: a bare `0` is no longer a legal bareword (leading digit), so
     // `a -> 0;` is rejected with the quoting hint rather than parsing as a
     // Label.  The Cycle rule is unaffected: `-0` still rejects for its own
     // reason.
     expect(() => jssm.parse(`a -> 0;`)).toThrow(/quote/);
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/characterset.spec.ts --coverage.enabled=false`
Expected: PASS.
Run: `npx vitest run --config vitest.stoch.config.ts src/ts/tests/numeric.stoch.ts --coverage.enabled=false`
Expected: PASS.
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.
Run: `npx eslint src/ts/jssm_constants.ts src/ts/tests/characterset.spec.ts src/ts/tests/numeric.stoch.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```
git add src/ts/jssm_constants.ts src/ts/jssm.ts src/ts/tests/characterset.spec.ts src/ts/tests/numeric.stoch.ts
git commit -m "feat(core)!: bareword predicates replace the symbol-bearing charset tables (#754)"
```

---

### Task 3: Unicode suite — classify every code point instead of assuming every code point is a bareword

**Files:**
- Modify: `src/ts/tests/unicode.uspec-driver.ts`
- Modify: every atom-driven suite: `unicode-actions.uspec.ts`, `unicode-arrange.uspec.ts`, `unicode-atom-labels.uspec.ts`, `unicode-atoms.uspec.ts`, `unicode-config-state-blocks.uspec.ts`, `unicode-config-state-lists.uspec.ts`, `unicode-edge-labels.uspec.ts`, `unicode-group-names.uspec.ts`, `unicode-hooks.uspec.ts`, `unicode-machine-metadata.uspec.ts`, `unicode-machine-properties.uspec.ts`, `unicode-state-decl-names.uspec.ts`, `unicode-state-properties.uspec.ts`, `unicode-viz-dot.uspec.ts` (all under `src/ts/tests/`)
- Leave alone: `unicode-string-labels.uspec.ts`, `unicode-strings.uspec.ts`, `unicode-error-messages.uspec.ts` unless they drive a raw code point through `Atom` (read each; if one does, treat it like the list above)

**Interfaces:**
- Consumes: `is_state_name_first_char` from Task 2 (import from `../jssm`).
- Produces: driver exports `bareword_ok(cp: string): boolean` and `quoted(cp: string): string`.

- [ ] **Step 1: Extend the driver**

Append to `src/ts/tests/unicode.uspec-driver.ts` (before the `export`):

```typescript
import { is_state_name_first_char } from '../jssm';

/**
 *  #754: whether a single code point may stand alone as a bareword.  A
 *  one-character name is legal iff the character may BEGIN a bareword.
 */
const bareword_ok = (cp: string): boolean => is_state_name_first_char(cp);

/**
 *  The quoted-string spelling of a code point, escaping the two characters
 *  the String rule treats specially.
 */
const quoted = (cp: string): string =>
  `"${cp.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
```

and add `bareword_ok, quoted` to the export block. Move the `import` to the top of the file with the others.

- [ ] **Step 2: Convert `unicode-atoms.uspec.ts` first**

Replace its `atom_test` with:

```typescript
const atom_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (atom_skips.includes(cp)) { return true; }

  if (bareword_ok(cp)) {

    let left_test, middle_test, right_test;

    try {
      left_test   = sm`${cp} -> target;`;
      middle_test = sm`source -> ${cp} -> target;`;
      right_test  = sm`source -> ${cp};`;
    } catch {
      throw new Error(`Bareword broke on ${idx} "${cp}"`);
    }

    expect( left_test.has_state(cp)   ).toBe(true);
    expect( right_test.has_state(cp)  ).toBe(true);
    expect( middle_test.has_state(cp) ).toBe(true);

  } else {

    // not an identifier character: the bareword form must be rejected, and
    // the quoted form must work everywhere the bareword used to
    expect(() => sm`${cp} -> target;`).toThrow();

    const q = quoted(cp);
    let left_test, middle_test, right_test;

    try {
      left_test   = sm`${q} -> target;`;
      middle_test = sm`source -> ${q} -> target;`;
      right_test  = sm`source -> ${q};`;
    } catch {
      throw new Error(`Quoted form broke on ${idx} ${q}`);
    }

    expect( left_test.has_state(cp)   ).toBe(true);
    expect( right_test.has_state(cp)  ).toBe(true);
    expect( middle_test.has_state(cp) ).toBe(true);

  }

  return true;

};
```

Import `bareword_ok, quoted` from the driver.

- [ ] **Step 3: Run that one suite**

Run: `npm run vitest-unicode-atom`
Expected: PASS for every block. If a block fails on the quoted side, the character is one the `String` rule cannot carry (e.g. control characters); add it to `atom_skips` in the driver with a comment naming the reason, and say so in the report.

- [ ] **Step 4: Convert the remaining thirteen suites the same way**

For each suite in the Files list, apply the same two-branch shape: when `bareword_ok(cp)` keep the existing body; otherwise assert the bareword form throws (one representative form is enough) and assert the existing expectations hold with `quoted(cp)` substituted for `${cp}` wherever the code point was used as a NAME. Where the code point is used as a *value* (a string label, a URL, a property default) the existing body already quotes it — leave those lines as they are and only branch the name positions. Keep the `atom_skips` check as the first line of every test function.

- [ ] **Step 5: Run every unicode suite**

Run: `npm run vitest-unicode-full-slow`
Expected: PASS. Fix any suite whose quoted branch was mis-substituted.

- [ ] **Step 6: Lint the touched test files**

Run: `npx eslint src/ts/tests/unicode.uspec-driver.ts src/ts/tests/unicode-*.uspec.ts`
Expected: clean.

- [ ] **Step 7: Commit**

```
git add src/ts/tests/unicode.uspec-driver.ts src/ts/tests/unicode-*.uspec.ts
git commit -m "test(unicode): classify every code point as bareword or quoted-only (#754)"
```

---

### Task 4: Documentation and the breaking-changes manifest

**Files:**
- Modify: `notes/fsl-grammar-reference.md:115-135` (Atoms section)
- Modify: `src/help/tutorials/labels-and-quoting.md`
- Modify: `src/doc_md/LanguageReference.md` (add a short "Names" subsection after "The basics", around line 112)
- Modify: `v6_breaking_changes.json` (entry `atom-charset-restriction`)
- Modify: `src/doc_md/todo.md` only if it lists #754 as pending (grep `754`)

**Interfaces:**
- Consumes: nothing from code; documents Tasks 1–3.
- Produces: nothing.

- [ ] **Step 1: Grammar reference**

Replace the "Atoms — `Atom`" section body with:

```markdown
### Atoms — `Atom`

An identifier-like token — since 6.0 (#754), a Unicode identifier:

- First character: a Unicode letter (`\p{L}`), a letter-number (`\p{Nl}`,
  e.g. `Ⅻ`), or `_`.
- Rest: the first-character set plus combining marks (`\p{Mn}`, `\p{Mc}`),
  decimal digits (`\p{Nd}`), and connector punctuation (`\p{Pc}`).

Symbols and punctuation (`. - + & # @ $ ^ * ! ? ,` and every non-letter
Unicode symbol such as emoji or arrows) and a leading digit are **not**
atom characters; write those names as quoted strings (`"in-progress"`,
`"node.start"`, `"1st"`, `"😀"`).  Astral letters (`𝛼`) count as one
character.  A rejected bareword reports the offending character and
suggests quoting.

Implementation note: pegjs 0.10 cannot express `\p{}` classes, so
`AtomCodePoint` matches one code point (surrogate pair or BMP unit) and
`AtomFirstLetter` / `AtomLetter` test it with a `u`-flag regex in a
semantic predicate.  `ValEnumMember` mirrors `Atom` with the same classes
but its own bad-character set (the comma is the enum list's separator, not a
bad character) and, since 6.0, also accepts a quoted `String`, so the "quote
it" advice holds inside `enum(...)` as well.  A per-state `property : <name>`
inside a state block likewise accepts a `Label` (bareword or string).

5.x accepted `[0-9a-zA-Z._!$^*?,]` plus `U+0080`–`U+FFFF` as a first
character and additionally `+ ( ) & # @` afterwards; that set is gone.
```

- [ ] **Step 2: Help tutorial and language reference**

In `src/help/tutorials/labels-and-quoting.md`, find the passage describing which characters may appear unquoted and rewrite it to the rule above (letters, digits after the first, underscore, marks; everything else quoted), with the same four examples. In `src/doc_md/LanguageReference.md`, after the traffic-light example under "The basics", add:

```markdown
State names written without quotes are identifiers: they start with a letter
or underscore and continue with letters, digits, underscores, or combining
marks, in any script.  Anything else — spaces, punctuation, symbols, a
leading digit — goes in double quotes:

```fsl
"in-progress" -> "done (final)";
état -> 状態 -> "1st";
```
```

- [ ] **Step 3: Manifest**

In `v6_breaking_changes.json`, on the `atom-charset-restriction` entry: change `"status": "accepted"` to `"status": "landed"`; replace the `"implementation"` value with `"Landed 2026-09 on the v6 line: AtomCodePoint + predicate-based AtomFirstLetter/AtomLetter in fsl_parser.peg, ValEnumMember = Atom, targeted rejection messages, is_state_name_first_char/is_state_name_char predicates, unicode suite classified per code point."`; and amend the `"decision"` text's charset sentence to read: `Decided charset (refined 2026-09-08: letters mean Unicode letters): first character \\p{L}, \\p{Nl} or _; continuation adds \\p{Mn}, \\p{Mc}, \\p{Nd}, \\p{Pc}.` Keep the rest of the decision text.

- [ ] **Step 4: Verify JSON and commit**

Run: `node -e "JSON.parse(require('fs').readFileSync('v6_breaking_changes.json','utf8'))"`
Expected: no output.

```
git add notes/fsl-grammar-reference.md src/help/tutorials/labels-and-quoting.md src/doc_md/LanguageReference.md v6_breaking_changes.json
git commit -m "docs(grammar): document the 6.0 bareword charset and mark #754 landed"
```

---

### Task 5: Fast atom scanner derived from the bareword regexes, with a drift guard

**Files:**
- Modify: `src/buildjs/fixparser.cjs` (a new `inline_fast_atom` replacing the one Task 1 removed)
- Test: `src/buildjs/tests/fixparser_fast_atom.spec.ts` (new)
- Test: `src/ts/tests/bareword_charset.stoch.ts` (new, stoch config)

**Interfaces:**
- Consumes: the Task 1 grammar (`AtomCodePoint`, `AtomFirstLetter`, `AtomLetter`, `Atom` with `BarewordBadChar` / `BarewordDashTail`).
- Produces: a build-time replacement of the generated `peg$parseAtom` that is observably identical to the generated one.

Background: the pre-6.0 `inline_fast_atom` in `fixparser.cjs` (issue #702) replaced the generated `peg$parseAtom` with a hand-transcribed `charCodeAt` range scanner for performance (about 13% of `construct()` self-time). Task 1 removed it because it hard-coded the 5.x charset and silently undid the grammar change. This task restores the speed without the drift: the scanner is built from the SAME two regexes the grammar uses, and a generative test proves the fast path and the generated rule agree on random inputs.

- [ ] **Step 1: Write the drift-guard test first**

Create `src/ts/tests/bareword_charset.stoch.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import * as jssm from '../jssm';

// The build replaces peg$parseAtom with a fast scanner (fixparser.cjs).  This
// test drives random code-point sequences through the real parser and checks
// the observable contract the grammar promises, so a scanner that drifts from
// the grammar's classes fails here regardless of which code path ran.

const FIRST = /^[\p{L}\p{Nl}_]$/u;
const REST  = /^[\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}_]$/u;

const code_point = fc.integer({ min: 0x20, max: 0x10FFFF })
  .filter(cp => cp < 0xD800 || cp > 0xDFFF)
  .map(cp => String.fromCodePoint(cp));

const is_bareword = (s: string): boolean => {
  const cps = [...s];
  return cps.length > 0 && FIRST.test(cps[0]) && cps.slice(1).every(c => REST.test(c));
};

describe('bareword charset — generative', () => {

  test('a name made of identifier code points parses as a state; anything else is rejected as a bareword', () => {
    fc.assert(fc.property(
      fc.array(code_point, { minLength: 1, maxLength: 6 }).map(a => a.join('')),
      (name) => {
        // the grammar's structural characters can never be state names in either form; skip them
        if (/[\s;"'\[\]{}<>\-=~|&:%#\/]/u.test(name)) { return; }
        if (is_bareword(name)) {
          const m = jssm.sm`${name} -> other;`;
          expect(m.has_state(name)).toBe(true);
        } else {
          expect(() => jssm.sm`${name} -> other;`).toThrow();
        }
      }
    ), { numRuns: 400 });
  });

  test('every identifier name also round-trips quoted', () => {
    fc.assert(fc.property(
      fc.array(code_point.filter(c => REST.test(c)), { minLength: 1, maxLength: 6 }).map(a => a.join('')),
      (name) => {
        const m = jssm.sm`"${name}" -> other;`;
        expect(m.has_state(name)).toBe(true);
      }
    ), { numRuns: 200 });
  });

});
```

Run: `npx vitest run --config vitest.stoch.config.ts src/ts/tests/bareword_charset.stoch.ts --coverage.enabled=false`
Expected: PASS against the current (generated, un-inlined) parser. This is the baseline the fast scanner must keep green. If a structural character slips past the skip regex and the test flakes, widen the skip regex and say so in the report.

- [ ] **Step 2: Write the fixparser unit test**

Create `src/buildjs/tests/fixparser_fast_atom.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// fixparser.cjs exports its transforms for testing (see Step 3).
const { inline_fast_atom, FAST_ATOM_RE } = require(resolve(__dirname, '../fixparser.cjs'));

describe('inline_fast_atom', () => {

  it('replaces the generated peg$parseAtom with the regex scanner', () => {
    const src = readFileSync(resolve(__dirname, '../../ts/fsl_parser.ts'), 'utf8');
    const out = inline_fast_atom(src);
    expect(out).toContain('FAST_ATOM_RE');
    expect(out.indexOf('function peg$parseAtom(')).toBe(out.lastIndexOf('function peg$parseAtom('));
  });

  it('throws when the generated function is not present (guards against silent drift)', () => {
    expect(() => inline_fast_atom('function peg$parseWS() {}')).toThrow(/peg\$parseAtom/);
  });

  it('the scanner regex agrees with the grammar classes on representative characters', () => {
    const ok  = ['a', 'Z', '_', 'é', 'ж', '字', '𝛼', 'Ⅻ', 'a1', 'नमस्ते'];
    const bad = ['1a', '.a', 'a.b', 'in-progress', '😀', '→', ''];
    for (const s of ok)  { FAST_ATOM_RE.lastIndex = 0; expect(FAST_ATOM_RE.exec(s)?.[0]).toBe(s); }
    for (const s of bad) { FAST_ATOM_RE.lastIndex = 0; const m = FAST_ATOM_RE.exec(s); expect(m === null || m[0] !== s).toBe(true); }
  });

});
```

Check how other `src/buildjs/tests/*.spec.ts` files import their `.cjs` subject and mirror that if it differs. Note `fsl_parser.ts` on disk is ALREADY post-processed when tests run, so the first test may need to read the pre-processed `src/ts/fsl_parser.js` that `npm run peg` leaves behind, or synthesize a minimal generated-shaped input; read `fixparser.cjs` to see what it reads and pick the honest input.

- [ ] **Step 3: Implement the scanner**

In `src/buildjs/fixparser.cjs`, add (and export via `module.exports`) a sticky regex and a transform, then call the transform in the pipeline where the old `inline_fast_atom` was called:

```javascript
/**
 *  The bareword scanner, built from the SAME classes the grammar's
 *  AtomFirstLetter / AtomLetter use (#754).  Sticky + unicode so one exec at
 *  `peg$currPos` consumes the whole bareword, surrogate pairs included.
 *  Keep in sync with src/ts/fsl_parser.peg — the drift guard
 *  src/ts/tests/bareword_charset.stoch.ts fails if they disagree.
 */
const FAST_ATOM_RE = /[\p{L}\p{Nl}_][\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}_]*/uy;

/**
 *  Replaces the generated `peg$parseAtom` with a scanner that runs one sticky
 *  regex instead of a per-character predicate call, then applies the same
 *  trailing bad-character check the grammar's Atom action performs (a `.`,
 *  `+`, `&`, `#`, `@`, `$`, `^`, `*`, `!`, `?`, `,`, or a `-` not followed
 *  by an arrow character), raising the identical "quote it" error.
 *  @param body - The generated parser source after the WS swap.
 *  @returns The source with `peg$parseAtom` replaced.
 *  @throws {Error} when the generated function cannot be found, so a pegjs
 *  upgrade that renames it fails the build loudly instead of silently
 *  skipping the optimization.
 *  @example
 *  inline_fast_atom(generated_source).includes('FAST_ATOM_RE');  // => true
 */
function inline_fast_atom(body) {
  const start = body.indexOf('function peg$parseAtom() {');
  if (start < 0) { throw new Error('fixparser: peg$parseAtom not found; cannot inline the fast atom scanner'); }
  const end = find_function_end(body, start);   // reuse the brace-walking helper the WS swap uses; write one if it is inline there
  const replacement = [
    'function peg$parseAtom() {',
    '    var s0, s1;',
    '    var re = ' + FAST_ATOM_RE.toString() + ';',
    '    re.lastIndex = peg$currPos;',
    '    var m = re.exec(input);',
    '    if (m === null) {',
    '      if (peg$silentFails === 0) { peg$fail(ATOM_EXPECTATION); }',
    '      return peg$FAILED;',
    '    }',
    '    s0 = peg$currPos;',
    '    s1 = m[0];',
    '    peg$currPos += s1.length;',
    '    // trailing bad character: the same rule as the grammar\'s Atom action',
    '    var bad = input.charAt(peg$currPos);',
    '    var dash_tail = bad === "-" && !/[>\\-|=~<]/.test(input.charAt(peg$currPos + 1));',
    '    if (/[.+&#@$^*!?,]/.test(bad) || dash_tail) {',
    '      peg$savedPos = s0;',
    '      error(ATOM_BAD_CHAR_MESSAGE(s1, bad));',
    '    }',
    '    peg$savedPos = s0;',
    '    return s1;',
    '  }',
  ].join('\n');
  return body.slice(0, start) + replacement + body.slice(end);
}
```

`ATOM_EXPECTATION` must be replaced with the actual name of the expectation constant the generated `peg$parseAtom` used for its `peg$fail` (read the generated function; it is the `peg$otherExpectation("atom")` constant). `ATOM_BAD_CHAR_MESSAGE(s1, bad)` must be replaced with the exact message expression the grammar's `Atom` action uses, so the two paths produce byte-identical errors — copy it from `fsl_parser.peg`, do not retype it.

- [ ] **Step 4: Regenerate, run everything that touches parsing**

Run: `npm run peg`
Run: `npx tsc --noEmit -p tsconfig.json`
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/bareword_charset.spec.ts src/buildjs/tests/fixparser_fast_atom.spec.ts src/ts/tests/vals.spec.ts src/ts/tests/arrange.spec.ts --coverage.enabled=false`
Run: `npx vitest run --config vitest.stoch.config.ts src/ts/tests/bareword_charset.stoch.ts --coverage.enabled=false`
Run: `npm run vitest-unicode-atom`
Expected: all PASS.

- [ ] **Step 5: Commit**

```
git add src/buildjs/fixparser.cjs src/buildjs/tests/fixparser_fast_atom.spec.ts src/ts/tests/bareword_charset.stoch.ts src/ts/fsl_parser.ts
git commit -m "perf(parser): regex-derived fast atom scanner with a charset drift guard (#754)"
```

---

### Task 6: Corpus and consumer sweep for the 6.0 charset

**Files:**
- Modify: `src/ts/tests/language_data/belarussian.json`, `src/ts/tests/language_data/ukrainian.json` (a case name containing U+2019 — quote it in the FSL source the fixture carries; read `src/ts/tests/language.spec.ts` to see how the fixtures are consumed)
- Modify: `src/ts/tests/conformance/corpus/t3-pinned-unicode/identifiers.ts` (the "👨" bareword vector becomes a quoted-name vector; add a sibling vector asserting the bareword form is rejected)
- Modify: `src/machines/atm quick start tutorial/8_CanWithdrawMoney.fsl` (quote `AcctHasMoney?` as `"AcctHasMoney?"` everywhere it appears; keep the file otherwise byte-identical) and any page that embeds the same source (`grep -rn "AcctHasMoney?" src/doc_md src/help src/machines`)
- Modify: `src/ts/tests/fsl_fence_highlight.spec.ts` and `src/ts/language_service/tests/semantic_spans.spec.ts` (the `123abc -> b;` "digit-leading name highlights as a state" tests become "a digit-leading bareword is reported as an error / not highlighted as a state"; read each file's error-span convention and assert the real 6.0 behavior)
- Modify: `src/ts/jssm_compiler.ts` around lines 1104–1114 (delete the now-unreachable jssm#759 digit-leading enum check and its comment; the grammar rejects the member first)

**Interfaces:** none.

- [ ] **Step 1: Run the affected specs to see them fail**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/language.spec.ts src/ts/tests/conformance/corpus.spec.ts src/ts/tests/example_machines.spec.ts src/ts/tests/fsl_fence_highlight.spec.ts src/ts/language_service/tests/semantic_spans.spec.ts --coverage.enabled=false`
Expected: FAIL for the reasons Task 1's report lists.

- [ ] **Step 2: Make each change above**

For the conformance corpus, the new vectors look like this (adapt to the file's vector shape):

```typescript
  // #754: an emoji is a symbol, not an identifier — quoted it is a name, bare it is rejected
  { name: 'quoted emoji name', fsl: '"👨" -> b;', expect: { states: ['👨', 'b'] } },
  { name: 'bare emoji name is rejected', fsl: '👨 -> b;', expect: { throws: /quote/ } },
```

If the vector shape has no "throws" form, add one to `src/ts/tests/conformance/corpus_types.ts` and to the runner in `corpus.spec.ts` (a `throws: RegExp` field asserted with `toThrow`).

For `jssm_compiler.ts`, remove the block and leave one comment line: `// digit-leading enum members are rejected by the grammar (#754); the former jssm#759 post-parse check is gone`.

- [ ] **Step 3: Run them again**

Same command as Step 1, plus `npx vitest run --config vitest.spec.config.ts src/ts/tests/vals.spec.ts --coverage.enabled=false`.
Expected: PASS. Then the whole spec config once, coverage off: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false`. Expected failures only in files that read committed built artifacts (`fsl_tmlanguage.spec.ts` CRLF, `bundle_shape.spec.ts` size), which a full build regenerates; list any other failure in the report.

- [ ] **Step 4: Commit**

```
git add src/ts/tests/language_data src/ts/tests/conformance src/machines src/doc_md src/help src/ts/tests/fsl_fence_highlight.spec.ts src/ts/language_service/tests/semantic_spans.spec.ts src/ts/jssm_compiler.ts
git commit -m "test(charset): sweep fixtures, corpus, examples, and tooling specs for the 6.0 bareword rule (#754)"
```
