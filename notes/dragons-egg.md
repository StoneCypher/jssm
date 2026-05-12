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
| 3 | Numeric | — | Gap |
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



## Up next (gap-filling order)

Suggested order, by ratio of historical-bug-density to test-writing-cost
(`notes/language-features-from-issues.md` informed this ranking):

1. **`numeric.stoch.ts`** (§3) — the recent `OctalDigit` bug fixed here is
   the shape of failure that property-based testing catches earliest. High
   value, small surface.
2. **`colors.stoch.ts`** (§4) — the prefix-protection ordering rule is
   exactly what fuzzing the 140-name SVG palette stresses. Easy generators,
   important property.
3. **`arrows.stoch.ts`** (§5) — small surface, well-defined Unicode ↔ ASCII
   equivalences, first-match-wins precedence claim worth verifying.
4. **`arrange.stoch.ts`** (§12) — lift from placeholder to real. Small file,
   symbol value of completing the placeholder.
5. **`grammar_roundtrip.stoch.ts`** (cross-cutting) — parse-twice
   determinism, whitespace/comment invariance. Pays dividends as the
   generator becomes the substrate for other tests.
6. **`transitions_misc.stoch.ts`** (§6 — non-decoration) — Stripe, Cycle,
   chain composition, two-way arrow metadata mirroring.
7. **`lexical.stoch.ts`** (§2) — Atom/Label/String/ActionLabel character
   classes, escape vocabularies.
8. **`state_declarations.stoch.ts`** (§7) — 60 GvizShape names, item
   ordering, per-state property syntax.
9. **`config_blocks.stoch.ts`** (§8) — 9 block forms, single-value configs,
   placeholder-key tolerance.
10. **`machine_attributes.stoch.ts`** (§9) — 14 attributes including URL,
    license, theme, direction, SemVer plumbing.
11. **`properties.stoch.ts`** (§10) — 4 MachineProperty shapes,
    PropertyVal types, state-level vs top-level syntax.
12. **`named_list.stoch.ts`** (§11) — Label vs LabelOrLabelList, forward
    references.
