# Dragons-Egg — Stochastic Test Tracker

A living log of which grammar features have stochastic (property-based) test
coverage, what properties each test file asserts, and what generators or
helpers were established along the way.

**Purpose.** When the stochastic-testing work is done, this file becomes the
input list for **dragon testing** — the next, more aggressive testing tier
(mutation-style fuzzing, grammar-shaped negative fuzzing, etc.) that will
exercise the same surface area more thoroughly. Each stochastic test entry
here names exactly what a dragon test should cover for the same feature.

**Convention.** Every new `*.stoch.ts` file under `src/ts/tests/` gets a
section here. Entries follow the same shape:

- Filename
- Grammar reference section (`notes/fsl-grammar-reference.md`)
- Properties asserted (what's known true after the test runs green)
- Generators / helpers introduced (reusable building blocks)
- Dragon-tier suggestions (what aggressive testing should also exercise)

Last updated: 2026-05-12.



## Coverage status

| § | Section | File | Status |
|---|---|---|---|
| 1 | Document shape | — | Not directly testable (exercised indirectly) |
| 2 | Lexical layer | — | Gap |
| 3 | Numeric | `numeric.stoch.ts` | **Covered** ✓ (pins two bugs) |
| 4 | Colours | — | Gap |
| 5 | Arrows | — | Gap |
| 6 | Transition expressions — arrow decorations | `arrow_decorations.stoch.ts` | **Covered** ✓ |
| 6 | Transition expressions — other (Stripe / Cycle / chains) | — | Gap |
| 7 | State declarations | — | Gap |
| 8 | Config blocks | — | Gap |
| 9 | Machine attributes | — | Gap |
| 10 | Properties | — | Gap |
| 11 | NamedList | — | Gap |
| 12 | Arrange | `arrange.stoch.ts` | **Placeholder** (no real tests yet) |
| 13 | (cheat sheet — not a feature) | — | N/A |
| 14 | (quirks — not features) | — | N/A |

Plus existing non-grammar coverage: `seq.stoch.ts` covers the `jssm.seq(N)`
utility function (not a language feature).



## Entries



### 2026-05-12 — `arrow_decorations.stoch.ts`

**Grammar section:** §6 (Transition expressions → ArrowDecoration /
ArrowDecorations).

**Background.** Commit `1acbc62 feat(grammar): allow arrow decorations in any
order` made each side of an arrow accept its four decoration kinds (`after`,
action label, probability, `{...}` desc block) in free order, with each kind
appearing at most once per side. That commit shipped without stochastic
regression coverage. This file fills that gap.

**Properties asserted.**

1. **Pre-arrow order invariance** — for any subset of `{after, action, prob,
   desc}` and any two random orderings, parsing produces the same AST.
2. **Post-arrow order invariance** — same property on the post-arrow side.
3. **Both-sides independence** — independent random orderings on each side
   simultaneously preserve the AST.
4. **Duplicate detection (pre-arrow)** — two decorations of the same kind on
   the pre-arrow side throws a parse error matching `/duplicate/i`. One test
   per kind: `after`, `action`, `prob`, `desc`.
5. **Duplicate detection (post-arrow)** — same property on the post-arrow
   side. Four tests, one per kind.

11 tests total, 100 fast-check iterations each. Wall-clock ~7.5 s.

**Generators / helpers introduced.**

- `deco_string(kind, seed)` — render one decoration of a chosen kind, with
  the value deterministically derived from `seed`. Reusable for any test
  that needs a random valid decoration.
- `shuffle(arr, seed)` — seeded Fisher-Yates using `jssm.gen_splitmix32`.
  Required because fast-check's shrinking needs reproducible permutations.
  Reusable for any test that needs order-independence properties.
- Convention: when testing order-invariance, generate one subset of values
  + two integer seeds; parse two distinct permutations and assert
  `parse(s1).toEqual(parse(s2))`.

**Dragon-tier suggestions** (when we get to dragon testing for §6):

- **Mutation testing on the parser's `ArrowDecoration` alternatives.** Mutate
  the rule's alternative ordering and verify the test suite catches the
  regression (which it must, by construction of the order-invariance
  property). Confirms the stoch test has the power it claims.
- **Grammar-shaped negative fuzzing.** Generate random decoration strings
  that violate the at-most-once rule with N≥3 (we only test N=2 here), then
  with the SAME value appearing N times, and verify the same error fires.
- **Cross-kind interaction fuzzing.** Generate decoration sequences that
  mix valid and invalid forms (e.g. valid `after` plus malformed `5%%`) and
  verify the parser reports the first error rather than skipping ahead.
- **Whitespace/comment interleaving inside decoration runs.** Currently
  decorations are space-joined; dragon tier should fuzz `WS?` insertion at
  every position and confirm the parse tree is unchanged.
- **Round-trip via `parse → format → parse`** when the project gains a
  formatter (currently in the TODO under Language tooling → Formatter).
  Order-invariance should mean any permutation formats to the canonical
  order.

**Cross-references.**

- `notes/fsl-grammar-reference.md` §6 — the documented grammar surface.
- `src/doc_md/todo.md` — Language tooling → Committed → Formatter (will
  pair with the round-trip dragon test).
- `1acbc62 feat(grammar): allow arrow decorations in any order` — the
  commit this test backstops.



### 2026-05-12 — `numeric.stoch.ts`

**Grammar section:** §3 (Numeric layer — JsNumericLiteral, NonNegNumber, SemVer).

**Background.** §3 covers the widest numeric vocabulary in the grammar:
hex/binary/octal/decimal/exponent integer and float forms, ~30 word
constants (Pi, Phi, Euler, Epsilon, Root2, Ln2, Pi-aliases in Unicode
math italics, etc.), the `OctalDigit`/`BinaryDigit` strict-digit-set rule,
and SemVer in `fsl_version` / `machine_version`. Tests cover all of these
plus the time-unit conversion math in `ArrowAfter` (six unit families with
their aliases) and the integer-literal portions of Stripe/Cycle (§6
transition targets — same root-cause family).  35 tests, 100 fast-check
iterations each.  Writing this file surfaced two grammar bugs which were
fixed in-place (see "Bugs fixed during writing" below).

**Properties asserted.**

1. **Hex round-trip** — for any non-negative 32-bit integer, both `0x`
   and `0X` prefix variants parse to the same value as `parseInt(n, 16)`.
2. **Hex digit case-insensitivity** — `0xFF`, `0xff`, `0XFF`, `0Xff` all
   equal 255.
3. **Octal round-trip** — for any non-negative integer ≤ `0o7777777`,
   both `0o` and `0O` prefix variants parse to the same value.
4. **Octal-digit boundary rejection** — `0o8` and `0o9` reject (the
   documented `OctalDigit = [0-7]` constraint; regression coverage for
   the historical bug the audit identified).
5. **Binary round-trip** — for any non-negative 24-bit integer, both
   `0b` and `0B` prefix variants parse to the same value.
6. **Binary-digit boundary rejection** — `0b2` through `0b9` all reject.
7. **Decimal integer round-trip** — random non-negative integers
   round-trip via `String(n) → parse → AST default_value`.
8. **Exponent notation correctness** — `1e<n>` and `1E<n>` equal
   `Math.pow(10, n)` for exponents in -10..10.
9. **Leading-dot float parsing** — `.25`, `.5`, `.001` parse correctly.
10. **Pi aliases equivalence** — `Pi`, `𝜋`, `π` all return `Math.PI`.
11. **Phi aliases equivalence** — `Phi`, `𝜑`, `𝜙`, `ϕ`, `φ` all return
    the golden ratio.
12. **Euler aliases equivalence** — `EulerNumber`, `E`, `e`, `Ɛ`, `ℇ`
    all return `Math.E`.
13. **Epsilon aliases equivalence** — `Epsilon`, `𝜀`, `ε` all return
    `Number.EPSILON`.
14. **Root2 / RootHalf / log-family** — return their corresponding
    `Math.SQRT2`, `Math.SQRT1_2`, `Math.LN2`, `Math.LN10` values.
15. **MaxSafeInt / MinSafeInt** — return `Number.MAX_SAFE_INTEGER` and
    `Number.MIN_SAFE_INTEGER`.
16. **Infinity-family parses to `Infinity`** — `Infinity`, `Inf`,
    `PInfinity`, `PInf`, `∞` all return the JS `Infinity` literal.
17. **-Infinity-family parses to `-Infinity`** — `NegativeInfinity`,
    `NegativeInf`, `NegInfinity`, `NegInf`, `NInfinity`, `NInf`, `-∞`
    all return the JS `-Infinity` literal.
18. **NaN parses to NaN** — assertion via `Number.isNaN`, since
    `NaN !== NaN`.
19. **ArrowProbability integer round-trip** — random integer percents
    appear at `r_probability` in the AST unchanged.
20. **ArrowProbability decimal round-trip** — random `x.xx` formatted
    percents parse correctly.
21. **ArrowAfter bare-number-defaults-to-seconds** — `after N` (no
    unit) yields `r_after === N × 1000` in milliseconds.
22. **ArrowAfter ms unit family** — `ms`, `msec`, `msecs`,
    `millisecond`, `milliseconds` all pass through unchanged.
23. **ArrowAfter s unit family** — `s`, `sec`, `secs`, `second`,
    `seconds` all convert by ×1000.
24. **ArrowAfter min unit family** — `m`, `min`, `mins`, `minute`,
    `minutes` all convert by ×60_000.
25. **ArrowAfter h unit family** — `h`, `hr`, `hrs`, `hour`, `hours`
    all convert by ×3_600_000.
26. **ArrowAfter d unit family** — `d`, `day`, `days` all convert by
    ×86_400_000.
27. **ArrowAfter w unit family** — `w`, `wk`, `wks`, `week`, `weeks`
    all convert by ×604_800_000.
28. **SemVer multi-digit round-trip** — random `0..1000` triples for
    major/minor/patch parse with correct breakdown and `full` string.
29. **SemVer zero-component edge case** — `0.0.0` parses correctly.
30. **Stripe positive multi-digit** — `+|N` for random `N` up to 1_000_000
    parses to `{key:'stripe', value:N}`.
31. **Stripe negative multi-digit** — `-|N` parses to `{key:'stripe', value:-N}`.
32. **Cycle positive multi-digit** — `+N` parses to `{key:'cycle', value:N}`.
33. **Cycle negative multi-digit** — `-N` parses to `{key:'cycle', value:-N}`.
34. **`+0` cycle edge case** — parses with `value: 0`.
35. **`-0` and bare `0` cycle quirk** — `-0` rejects; bare `0` parses as a
    Label, not a Cycle.  Documented in §6 (ArrowTarget → Cycle) and §14
    ("Missing `-0` cycle") of the grammar reference.

**Bugs fixed during writing.**

1. **SemVer multi-digit components captured only the first digit** —
   `fsl_version: 10.0.0;` returned `{major:1, full:"10.0.0"}`. Fixed
   in `src/ts/fsl_parser.peg` by changing `IntegerLiteral` from
   `"0" / NonZeroDigit DecimalDigit*` to
   `$("0" / NonZeroDigit DecimalDigit*)` — the `$` operator returns
   the matched text rather than the default array-of-matches, so the
   subsequent `parseInt(major, 10)` in SemVer sees the full integer
   string instead of an arrayified `[firstDigit, [restDigits]]`.
2. **Stripe / Cycle dropped digits past the second** — `+|123` returned
   `{value:12}`; `+1234` returned `{value:12}`. Same root cause: the
   action `parseInt(\`${nzd}${dd}\`, 10)` stringified the `dd` array
   with comma separators (`["2","3"].toString() === "2,3"`), so
   `parseInt("12,3", 10)` stopped at the comma and returned 12.
   Fixed by switching to `n:$(NonZeroDigit DecimalDigit*)` capture, so
   `n` is the full digit string.

Both bugs shared the same root cause — PEG.js's default return for a
sequence-of-matches expression is an array of submatches, which
stringifies with commas. The `$` operator is the idiomatic fix when
you want the matched text rather than the structured result.

**Note about the CJS bundle Infinity / NaN handling.** The parser
correctly returns `Infinity`, `-Infinity`, `NaN` from the TypeScript
source (verified by the tests in this file), but the built
`dist/jssm.es5.cjs` collapses these to `null` — likely a rollup or
terser step's JSON-handling pass. Not in scope for §3 stoch tests,
but worth picking up in a future `build_roundtrip.stoch.ts` that
exercises the bundled output rather than the source.

**Generators / helpers introduced.**

- `parse_prop_default(literal)` — wrap any numeric literal in
  `property p default ... ;` and extract the `default_value` field.
  PropertyVal is the only top-level surface that accepts the full
  JsNumericLiteral vocabulary, so this is the canonical numeric-test
  entry point. Reusable for any future test that needs to exercise
  numeric-literal grammar paths.
- `parse_probability(n)` and `parse_after(n, unit?)` — same idea for
  `ArrowProbability` and `ArrowAfter` contexts. Reusable when
  testing arrow-decoration semantics in other files.
- `parse_fsl_version(major, minor, patch)` — same for the SemVer
  surface.
- Convention: helpers wrap a parse-and-extract pattern so the
  test bodies stay focused on the property under test, not the AST
  shape.

**Dragon-tier suggestions** (when we get to dragon testing for §3):

- **Boundary-condition fuzzing on octal/binary digits.** This file
  tests rejection for digits 8-9 (octal) and 2-9 (binary) at the
  *start* of the literal. Dragon tier should fuzz invalid digits at
  *every position* inside multi-digit literals (e.g. `0o178`,
  `0o712`, `0b1012`).
- **Negative-number handling.** §3 doesn't explicitly cover negative
  literals (only `-∞` is a named constant). Dragon tier should fuzz
  `property p default -42 ;` to confirm rejection vs. silent
  pass-through, and `a -50% -> b;` to confirm probability negation
  semantics.
- **Hex/octal/binary leading-zero edge cases.** What about `0x`,
  `0o`, `0b` alone (no digits)? `0x0`? `0X0xFF`? `0xFF00FF00FF`
  (above 32-bit)?
- **Word-constant case-sensitivity.** Is `pi` (lowercase) the same
  as `Pi`? What about `infinity`? Dragon tier should fuzz case
  variations to see which are accepted/rejected and decide whether
  the canonical-case-only rule is documented anywhere.
- **SemVer prerelease / build-metadata.** SemVer.org allows
  `1.2.3-alpha.1+build.42`. FSL's SemVer rule doesn't cover these.
  Dragon tier should confirm rejection.
- **Time-unit conversion overflow.** `after 999999999999 weeks`
  produces a very large number — does it overflow? Dragon tier
  should fuzz the upper edge.

**Cross-references.**

- `notes/fsl-grammar-reference.md` §3 — the documented grammar surface.
- `src/doc_md/todo.md` — Grammar bugs section (the SemVer multi-digit
  bug should probably get an entry there too).
- The `OctalDigit` bug fix in commit history (specific SHA not located;
  the audit-doc references the bug shape).



## Up next (gap-filling order)

Suggested order, by ratio of historical-bug-density to test-writing-cost
(`notes/language-features-from-issues.md` informed this ranking):

1. **`colors.stoch.ts`** (§4) — the prefix-protection ordering rule is
   exactly what fuzzing the 140-name SVG palette stresses. Easy generators,
   important property.
2. **`arrows.stoch.ts`** (§5) — small surface, well-defined Unicode ↔ ASCII
   equivalences, first-match-wins precedence claim worth verifying.
3. **`arrange.stoch.ts`** (§12) — lift from placeholder to real. Small file,
   symbol value of completing the placeholder.
4. **`grammar_roundtrip.stoch.ts`** (cross-cutting) — parse-twice
   determinism, whitespace/comment invariance. Pays dividends as the
   generator becomes the substrate for other tests.
5. **`transitions_misc.stoch.ts`** (§6 — non-decoration) — Stripe, Cycle,
   chain composition, two-way arrow metadata mirroring.
6. **`lexical.stoch.ts`** (§2) — Atom/Label/String/ActionLabel character
   classes, escape vocabularies.
7. **`state_declarations.stoch.ts`** (§7) — 60 GvizShape names, item
   ordering, per-state property syntax.
8. **`config_blocks.stoch.ts`** (§8) — 9 block forms, single-value configs,
   placeholder-key tolerance.
9. **`machine_attributes.stoch.ts`** (§9) — 14 attributes including URL,
   license, theme, direction, SemVer plumbing.
10. **`properties.stoch.ts`** (§10) — 4 MachineProperty shapes,
    PropertyVal types, state-level vs top-level syntax.
11. **`named_list.stoch.ts`** (§11) — Label vs LabelOrLabelList, forward
    references.
