# Probabilistic list-target weights — design

**Date:** 2026-09-09
**Program:** v6 landing, sub-project 4 (see `2026-09-08-v6-landing-program-design.md`)
**Status:** approved in conversation 2026-09-09 (examples A–E reviewed; D resolved as "default weight")
**Manifest id:** `probabilistic-list-weights`

## Purpose

Make a probabilistic transition onto a list target keep its stated weight as
a *group* weight shared among the members, instead of copying the full weight
onto every member. Add optional per-member weights inside a list. Apply the
same weighted-list form to `start_states` as an initial distribution. This is
a 5→6 semantic break on an existing construct, so it ships in 6.0.

## Semantics

Let `P` be the probability written before the arrow (percent, as today), and
let a list `[m1 w1% m2 w2% ...]` carry optional inner weights `wi`.

- **Shares.** If any member carries an inner weight, every member's share is
  `wi / Σw` with a missing `wi` treated as 0 (a list that mixes weighted and
  unweighted members is a compile error; see Errors). If no member carries a
  weight, shares are uniform `1/n`.
- **Weighted transition onto a list (`a P% -> [..]`).** Each expanded edge
  compiles with `probability = P × share_i`. Example B: `a 50% -> [b 20% c
  80%]` gives a→b 10, a→c 40. Example A: `a 50% -> [b c]` gives 25 and 25
  (5.x gave 50 and 50).
- **Unweighted transition onto a list with inner weights (`a -> [b 20% c
  80%]`, example D).** The edges carry no declared `probability` (so the
  fsl#1248 pool rule is unchanged: they do not evict unweighted siblings from
  the candidate pool) and instead carry `share_i`. The picker weighs an edge
  as `(probability ?? 1) × (share ?? 1)`, so b=0.2, c=0.8 against a sibling
  d=1: picks land 10% / 40% / 50%.
- **Unweighted list, no inner weights (`a -> [b c]`).** Unchanged: edges
  carry neither field; picker weight 1 each.
- **Both directions.** The rule applies on whichever side the list sits
  (`[a b] <- 50% e` shares the 50 across the two reverse edges) and to
  two-way arrows per side.
- **`start_states: [idle 90% booting 10%]`.** One level, no origin: the
  members *are* the initial distribution. Stored as a weight map; exposed as
  `start_state_weights()` (Map<StateType, number>, normalized to sum 1) and
  `sample_start_state()` (weighted draw from the machine's RNG).
  `stochastic_runs` draws a start per run via `sample_start_state()` when the
  machine declares weights; otherwise it starts from the current state as
  today. `is_start_state`, `start_states` validation, and the initial-state
  choice for a constructed machine are unchanged (first listed).

## Grammar

`LabelList` gains an optional per-member weight in exactly two positions:
`ArrowTarget` and `ConfigStartNodes`. Every other `LabelList` consumer
(`end_states`, `panels`, `arrange*`, group member lists, config state lists)
keeps the weightless rule, so a weight there is a parse error.

AST shape: when no member carries a weight the node is the plain array of
names it is today, byte-identical. When any member carries a weight the node
is `{ key: 'weighted_list', members: [{ name, weight? }] }` (with `loc` under
`options.locations`). The compiler and the `start_states` config handler
accept both shapes.

Weight syntax is `NonNegNumber "%"` after the member label, whitespace
separated, matching `ArrowProbability`.

## Compiler and runtime

- `compile_rule_transition_step` computes shares from the list node and sets
  `probability = P × share` when `P` is declared, else `share` on the edge.
- `JssmTransition` gains `share?: number` (pre-declared as `undefined` in
  `makeTransition` so the edge hidden class stays monomorphic, as
  `probability` and `action` are today).
- `_assert_selectable_exit_pool` and `weighted_rand_select`'s weight
  extraction use `(probability ?? 1) × (share ?? 1)`; `probable_exits_for`'s
  pool rule keys on `probability !== undefined` only.
- `Machine` gains `_start_state_weights`, `start_state_weights()`,
  `sample_start_state()`; `stochastic_runs` uses the sampler when weights are
  declared.
- Viz: an edge label shows the compiled `probability` as today; a share-only
  edge shows nothing extra in 6.0 (deferred).
- Serialization: `share` rides along on serialized edges like `probability`.

## Errors (compile-time, `JssmError`)

- A list that mixes weighted and unweighted members.
- Inner weights that sum to 0.
- A weight on a list in a position that does not accept weights (parse error
  from the grammar).

## Tests

- Parse: plain lists parse byte-identically to today (snapshot-free: assert
  deep-equal against the hand-written expected array); weighted lists produce
  the tagged node; weights rejected in non-target positions.
- Compile: examples A, B, D, and the reverse-arrow case, asserting each edge's
  `probability`/`share`.
- Runtime: a seeded `probabilistic_histo_walk` over example A asserts the
  1:1:2 split against a tolerance; example D asserts roughly 1:4:5; a weighted
  `start_states` machine asserts the start distribution across seeded
  `stochastic_runs`.
- Existing `sample_select.spec.ts` expectations re-derived under the share
  model (its `[a b d e] 4% -> c` etc.).
- Unicode: one uspec exercising a weighted list with a non-ASCII member.
- Stoch: a generator over random lists with random inner weights asserting
  shares sum to 1 and the compiled probabilities sum to `P`.

## Docs

Grammar reference §6 (ArrowTarget) and §8 (start_states); language reference
transition and start-state sections; `v6_breaking_changes.json` entry with
example A as the before/after; migration line: "a 5.x document that relied
on each member receiving the full weight should multiply the outer
probability by the member count, or write inner weights".
