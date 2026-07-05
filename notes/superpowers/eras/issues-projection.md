# Issues Projection — Prepared Tracker Actions

> **Status:** stable (as a skeleton; executors append) · **Author:** Claude Fable 5 ·
> **Date:** 2026-07-04
> **Rules (HANDOFF standing grant):** nothing in this file is executed until John approves the
> containing revision; ALL new issues file to **StoneCypher/fsl** (jssm stays empty); every
> close cites its supersessor. Executors: append drafts under the matching section, request
> John's batch approval, then execute mechanically and mark each row `filed:fsl#NNN` /
> `closed`.

## A. Era umbrella issues (file to fsl; one per era; bodies link the era briefs)

| # | Draft title | Body core |
|---|-------------|-----------|
| A1 | `v6 "The Ground" — end the 5.x line: breakage batch, One Merge, dragon (umbrella)` | link era-0 brief; exit criteria; child = WP list |
| A2 | `v7 "The Computing Machine" — scalars, expressions, where-guards (umbrella)` | link era-1 brief (wave 6.2) |
| A2b | `v8 "The Structured Machine" — containers, ADTs, streams, groups (umbrella)` | link era-1 brief (waves 6.3+6.6) |
| A2c | `v9 "The Transactional Machine" — assign, contracts, RTC, safety (umbrella; opens w/ mDT→val-record batch)` | link era-1 brief (waves 6.4+6.5+6.8) |
| A2d | `v10 "The Portable Machine" — conformance, Rust N=2, format (umbrella)` | link era-1 brief (waves 6.7+6.9) |
| A3 | `v11 "The Social Machine" — systems, factories, supervision (umbrella)` | link thin brief |
| A4 | `v12 "The Proven Machine" — verification stack (umbrella)` | link thin brief; ladder decision record = first child |
| A5 | `v13 "The Durable Machine" — durable execution (umbrella; PROCESS-gated)` | link thin brief |
| A6 | `v14 "The Trusted Machine" — signing + receipts (umbrella; security-review-gated)` | link thin brief |
| A7 | `v15 "The Ubiquitous Machine" — multi-host fan-out (umbrella)` | link thin brief |
| A8 | `v16 "The Public Machine" — registry + agent economy (umbrella)` | link thin brief |

## B. Decision-record asks (file to fsl)

| # | Draft title | Source |
|---|-------------|--------|
| B1 | `decision record: automata-ladder checkable band (megaspec §3 vs registry-close push-up)` | fable_sum_critique finding 3 |
| B2 | `spec: canonical source_hash (normalization, layers, algorithm)` | irreversibles #1 / era-1 WP-1.1 |
| B3 | `manifest entries: jssm-* synonym removal + probabilistic list split` | era-0 WP-5 |
| B4 | `spec: operational-semantics appendix (megaspec §29 commitment; small-step macrostep)` | era-1 WP-1.2, DO-FIRST |
| B5 | `perf envelope: allowed runtime regression budget for v6 enabling infra vs 6.0 baseline` | omissions D4; precedes #756 |
| B6 | `reserve the stable diagnostic/error-code namespace before ad-hoc kinds multiply` | irreversibles #16 |

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
