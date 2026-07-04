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
| A1 | `era 0 — cleanup → 6.0.0: end the 5.x line (umbrella)` | link era-0 brief; exit criteria; child = WP list |
| A2 | `era 1 — the 6.x series: language + portability contract (umbrella)` | link era-1 brief |
| A3 | `era 2 — society: systems, factories, supervision (umbrella; opens 7.0)` | link thin brief |
| A4 | `era 3 — proofs: verification stack (umbrella; opens 8.0)` | link thin brief; NOTE the ladder decision record as first child |
| A5 | `era 4 — survival: durable execution (umbrella; opens 9.0; PROCESS-gated)` | link thin brief |
| A6 | `era 5 — trust: signed proofs and receipts (umbrella; opens 10.0; security-review-gated)` | link thin brief |
| A7 | `era 6 — fleet: multi-host fan-out (umbrella; opens 11.0)` | link thin brief |
| A8 | `era 7 — ecosystem: registry and agent economy (umbrella; opens 12.0)` | link thin brief |

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
