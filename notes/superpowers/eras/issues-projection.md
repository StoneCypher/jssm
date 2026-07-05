# Issues Projection — Prepared Tracker Actions

> **Status:** **REVISION APPROVED by John 2026-07-04** — sections A+B are authorized for
> filing as drafted. **MILESTONES ALREADY CREATED by Fable (2026-07-04): fsl milestones
> #48 "5.x — The Long Goodbye" through #59 "v16 — The Public Machine"**, one per major;
> every filed issue gets its milestone; umbrella issues (A) pin to their own milestone ·
> **Author:** Claude Fable 5 · **Date:** 2026-07-04
> **Rules (HANDOFF standing grant):** nothing in this file is executed until John approves the
> containing revision; ALL new issues file to **StoneCypher/fsl** (jssm stays empty); every
> close cites its supersessor. Executors: append drafts under the matching section, request
> John's batch approval, then execute mechanically and mark each row `filed:fsl#NNN` /
> `closed`.

## A. Era umbrella issues (file to fsl; one per era; bodies link the era briefs)

**EXECUTED 2026-07-04 (Opus 4.8, John's go): all 11 umbrellas filed to StoneCypher/fsl as
fsl#1401–#1411, each pinned to its milestone (#49–#59), labelled `Created by AI`. Bodies carry
mission + delivers + exit criteria + links to the era book (`notes/era-book/`) and briefs, and
the "children file just-in-time" cadence line.**

*(Renumbered A1–A11 2026-07-04, dropping the pre-five-way-split `A2b/c/d` fossil now that all
umbrellas are filed; row IDs are internal ledger keys, the filed issues are unaffected.)*

| # | Draft title | Milestone | Filed |
|---|-------------|-----------|-------|
| A0 | `5.x "The Long Goodbye" — end-of-line cleanup before 6.0 (umbrella)` | #48 | **fsl#1418** |
| A1 | `v6 "The Ground" — end the 5.x line: breakage batch, One Merge, dragon (umbrella)` | #49 | **fsl#1401** |
| A2 | `v7 "The Computing Machine" — scalars, expressions, where-guards, stdlib (umbrella)` | #50 | **fsl#1402** |
| A3 | `v8 "The Structured Machine" — containers, ADTs, streams, fn-slots, groups, graph (umbrella)` | #51 | **fsl#1403** |
| A4 | `v9 "The Transactional Machine" — assign, contracts, RTC, hooks, safety (umbrella; opens w/ mDT→val-record batch)` | #52 | **fsl#1404** |
| A5 | `v10 "The Portable Machine" — conformance, Rust N=2, format, tooling (umbrella)` | #53 | **fsl#1405** |
| A6 | `v11 "The Composable Machine" — systems, factories, supervision, statecharts (umbrella)` | #54 | **fsl#1406** |
| A7 | `v12 "The Proven Machine" — verification stack (umbrella)` | #55 | **fsl#1407** |
| A8 | `v13 "The Durable Machine" — durable execution (umbrella; PROCESS-gated)` | #56 | **fsl#1408** |
| A9 | `v14 "The Trusted Machine" — signing + receipts (umbrella; security-review-gated)` | #57 | **fsl#1409** |
| A10 | `v15 "The Ubiquitous Machine" — multi-host fan-out (umbrella)` | #58 | **fsl#1410** |
| A11 | `v16 "The Public Machine" — registry + agent economy (umbrella)` | #59 | **fsl#1411** |

## B. Decision-record asks (file to fsl)

**EXECUTED 2026-07-04 (Opus 4.8, John's go): all 6 filed to StoneCypher/fsl, labelled
`Created by AI`. B2–B6 pin to v6 (#49, the active era) as children of the v6 umbrella #1401;
B1 pins to v12 (#55) as the first child of the v12 umbrella #1407.**

| # | Draft title | Milestone | Filed |
|---|-------------|-----------|-------|
| B1 | `decision record: automata-ladder checkable band — §3 four rungs vs the formal push-up` | #55 | **fsl#1417** |
| B2 | `spec: canonical source_hash — normalization, layer identity, algorithm (C1)` | #49 | **fsl#1412** |
| B3 | `manifest entries: jssm-* synonym removal + probabilistic list-target split` | #49 | **fsl#1414** |
| B4 | `spec: operational-semantics appendix — small-step macrostep (C2, §29)` | #49 | **fsl#1413** |
| B5 | `perf envelope: allowed runtime-regression budget for v6 enabling infra vs 6.0 baseline` | #49 | **fsl#1415** |
| B6 | `reserve the stable diagnostic/error-code namespace before ad-hoc codes multiply` | #49 | **fsl#1416** |

Deliberately NOT pre-filed (first-touch cadence, HANDOFF): remaining §29 appendices (verifier
budget model, security/effects model, compatibility policy), fsl.lock / certificate-record /
interface-card / publish-manifest / advisory-feed schemas, hook-return slot (next tape-format
touch), 5.x snapshot-lift policy (era 4), seed-tree edit stability (F1), era-5 security review
(era-5 entry). Each is inventoried in `irreversibles.md` or the era briefs with its trigger.

## C. Migration twins (WP-8 jssm drain)

Produced by the WP-8 executor as `dispositions/jssm-drain.md` rows mature: one fsl draft per
kept jssm issue, titled as the original, body opening `(was jssm#NNN)`. Do not enumerate here
by hand — generate from the approved drain ledger.

## D. Close batches

Produced by WP-7/WP-8 executors from approved disposition ledgers (`SUP`/`DONE?`-verified/
`SAT`/`MIG` originals). Format: `repo#N — close comment text (one line, cites supersessor)`.
