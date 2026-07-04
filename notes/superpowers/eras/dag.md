# The Merged Dependency Graph

> **Status:** stable · **Author:** Claude Fable 5 · **Date:** 2026-07-04
> **Purpose:** The one artifact the corpus lacked: megaspec §20 phases × the trust-stack roadmap
> (M1–M6) × the convergence streams × the era map, as a single explicit graph. Read this before
> sequencing any implementation work; update it when any edge is discovered wrong.
> **Open questions:** verify S1 (#773) merge state; P1 bug-tail scope may grow as vals get used.

## Workstream inventory and current state (as of v6 @ c03bcdeb)

| ID | Workstream | State on `v6` |
|----|-----------|----------------|
| P1 | val scalar core (megaspec Phase 1) | **landed**, with an open bug-tail: #754 charset, #755 non-null hole, #757 collisions, #758 validator no-op, #759 numeric enums, #756 columnar+journal |
| P2 | expression language full (Phase 2: type system, operators, match, assign, stdlib) | **not started on v6**; partial primitives exist (`fsl_containers/stdlib/adts/tape/verify`); full language design in megaspec §4–§13 |
| P3 | contracts, I/O, safety verification (Phase 3) | not started; §10–§14 designed |
| F1–F6 | factories → systems → composed checking | designed (§21–§23); F1 needs only P1 |
| M1 | `check` verb + certificate record (#825) | not started; record unspecced |
| M2 | signing + transparency log + advisories (#826) | not started |
| M3 | `run` replayer + canonical serialization (#827) | **implemented** (RFC 8785, JSONL tapes, provisional hash, #816 fixed) |
| M4 | property evaluator: built-in subset → full (#828) | not started; subset needs only M3, full needs P2 |
| M5 | `verify` trust chain (#829) | not started |
| M6 | receipts, `replayed` slice (#830) | not started; specced in full |
| S1 | fsl_totality (PR #773) | open `--base v6` at last reading — **verify before assuming merged** |
| S2 | value-module delta ports | designed in convergence doc, not started |
| S3 | codegen reconciliation (A+B) | planned task-by-task, not started |
| J | JS API §27 bare-functions split | designed, independent stream |
| C1 | canonical `source_hash` spec (normalization, layer identity, newline/NFC) | **does not exist** — see `irreversibles.md` |
| C2 | operational-semantics appendix (§12 small-step) | committed §29, does not exist |
| C3 | grammar appendix (incl. weighted LabelList) | committed §29, does not exist; fsl#818 is its proof-construct slice |
| C4 | conformance-vector format + first corpus | posture everywhere, zero vectors exist |
| C5 | second implementation + differential CI (N=2) | decided in principle (era map); language choice open (Rust favored) |
| G | overlapping groups §19 implementation | plan exists but predates vitest migration — needs refresh |

## The edges (what blocks what)

Era-1 contract chain — the critical path of the whole program:

- C2 (ops semantics) → C4 (a trace schema cannot be defined without pinned execution order)
- C1 (canonical hash) → M1 (the certificate binds to it) → M2 (something to sign) → M5 → M6
- C4 → C5 (a second implementation needs something to conform to)
- C1 ← M3's provisional seam (swap point exists; C1 defines what goes in it)
- C4 ← M3's determinism tests (the natural seed vectors — promote, don't rewrite)

Language chain:

- P1 bug-tail → everything that stores a val (factories F1, journal #756, M4 property reads)
- P2 → P3 (contract expressions are expressions) → F3 (channel/emit rides P3 I/O)
- P2 → M4-full (the full property language) — M4-subset deliberately does NOT wait for P2
- P1 → F1 (factories bind vals) → F2 (needs P2 generators) → F3 → F4 → F5 → F6
- G (groups) is independent of P2 — it can land beside P1; its `in(&group)` predicate feeds
  era-3 properties later
- #756 (columnar vals + undo journal) → era-3 batch checking performance AND era-4 journal
  semantics; it is the perf keystone (§27) — schedule it early in era 1, with the perf
  envelope from `fable_sum_omissions.md` D4 written first

Convergence chain (near-term v6 housekeeping):

- S1 → nothing (self-contained; merge first)
- S2 → M4-subset quality (ports the stronger `VerificationGraph`), not blocking
- S3 → era-1 CLI baseline (`codegen`/`import`/`export` land reconciled); typegen ungated

Cross-era edges (the ones that justify the era ordering):

- Era-3 checker ← F6 (composed checking is F6) ← F5 ← … ← P2: **Proofs cannot finish before
  Society lands**, though safety-only checking (P3) ships inside era 1
- Era-4 hook-return recording slot ← M3 tape format v-next ← §11 effect boundary (P3):
  reserve the slot when the tape format is next versioned, even though the recorder ships in era 4
- Era-4 finalizes the host ABI's effect/persistence surface → era-6 fleet implements it: **fleet
  after survival**, or N runtimes get retrofitted
- Era-5 `witnessed` tier ← era-4 capture infrastructure (provenance-signed inputs)
- Era-3 must resolve the automata-ladder conflict (megaspec §3 vs registry-close push-up)
  **before** any `pushdown`/`petri` checkable-band claim ships in docs or code

## Critical-path reading

The longest chain to a shippable v6.0: **C2 → C4 → C5** in parallel with **P1-tail → P2 → P3**,
joining at "safety checking over the typed language, conformance-tested on two implementations."
C1 is short but blocks the entire trust stack; write it first. M-track work (M4-subset, M1
plumbing) can proceed in parallel off M3 at any time and is good early Opus/Codex material.

The single cheapest unblocking move in the whole graph: **write C1 and C2** — days of spec work
that unblock the trust stack and the conformance posture respectively.

## Era overlay

| Era | Contains (from above) |
|-----|----------------------|
| 0 Cleanup | tracker triage (rulebook in `era-0-cleanup.md`); S1 merge; stale-audit re-verification |
| 1 Language+Contract | P1-tail, P2, P3, G, J, S2, S3, C1–C5, M1, M4-subset; M2 if it fits |
| 2 Society | F1–F5, supervision, alias removal, strict mode |
| 3 Proofs | F6, temporal/backends, ladder decision, M4-full, testing toolkit; certificates mature |
| 4 Survival | persistence contract (#813), hook-return recorder, migrates-from, OTel/drift/calibrate |
| 5 Trust | M2 (if not earlier), M5, M6, full receipt tiers, revocation, lockfiles |
| 6 Fleet | host fan-out against C1–C5 + era-4 ABI; #815 cross-host conformance |
| 7 Ecosystem | registry, guardrails-product, `query`, infer/synth, manual at scale, jssm #831–#869 |
