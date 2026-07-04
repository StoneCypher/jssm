# Spec-Content Map — which corpus content ships in which major

> **Status:** stable · **Author:** Claude Fable 5 · **Date:** 2026-07-04
> **Purpose:** the version-bucketing of the SPEC CORPUS (the tracker twin is in
> `dispositions/`). This is the coarse per-feature target tagging the critique asked for.
> Legend: sections are megaspec (`§`) unless named. "doctrine" = cross-era principle, no ship
> date. Rings not listed here are v9–v12 roadmap per their §28 batch notes.

## v6 — 6.0.0 + the 6.x series (eras 0–1)

- **6.0.0 itself:** §27 bare-functions JS API; breakage batch; the v6-branch payload (val core
  §5-partial, M3 replay §15-core, canonical serialization, codegen/import/export S3, totality)
- §4 type system (scalars, containers, ADTs, variants, functions; §4.6 streams) — P2
- §5 val/prop declarations (sensor grammar may parse; wiring is v7)
- §6 expressions, pattern matching, quantifiers; §8 string model (semantics; cross-host cert v11)
- §7 stdlib core + blessed infra (encoding, **pinned hash** — contract-coupled); §9 assign;
  §13 totality; §3 bands + `finite` + capability/profile *declarations*
- §10 contracts as runtime asserts + §11 error model (P3); §12 RTC execution + introspection
  registry (machine *status* → v7)
- §17-safety only (reachability, invariants — native BFS); M1 certificates (unsigned record);
  M4-subset; M2 attempts-here-slips-to-v10
- §19 overlapping groups; §15 version gating + editions/feature-gate *mechanism*
- §25 early verbs: lint, format (+#134 byte-level round-trip, CST), parse, config, init,
  explain, list, typegen, inspect, run (shipped), check-safety; grammar exports (gbnf/lark/ebnf)
- §26 vector mechanics + T1 conformance at N=2 (the Rust second implementation); §26
  self-fuzzing via the dragon + the generator dual; §29 appendices: ops-semantics, grammar,
  compatibility policy
- fable-era docs: the whole portability contract (C1 canonical hash … C5)

## v7 — Society (era 2)

- §14 in full: channels, emit, tape wiring, sensors live, named hooks, time-as-sensor,
  tokenizer, multi-machine systems, machine-val embedding, first-class tapes
- §21 factories + seed tree; §22 populations/routes/dispatch/supervision/hierarchy; §24 system viz
- §12 machine lifecycle status (halted/complete, #621/#458); §11 error-recovery transitions
- §17 weighted start states; §18 composition-first doctrine (parallel regions stays OPEN)
- §4.5 units (megaspec's own "later phase"); §7 windowed aggregates
- §25: make; repl-basic; the manual program's flagship content unlocks HERE (the RCT park
  needs systems — the book's spine is v7-gated even though on-ramp chapters can ship at v6)

## v8 — Proofs (era 3)

- §17 in full: Dwyer prelude, temporal/LTL via backends (nuXmv/Spin/Storm), PCTL, past
  operators, statistical MC/walks-as-verification, testing toolkit (test/expect blocks, MBT,
  shrinking, coverage), error-state analytics
- §3 ladder upper rungs (pushdown/petri/tree) — AFTER the decision record; §17 tree
  automata/transducers
- §23 composed verification, assume-guarantee, flow contracts, SLO contracts (design-time half)
- §25: test, walk, mcp, diff --behavioral + refinement certificates, minimize, check-full,
  --emit-certificate signed (M2 lands by here at latest); §29 verifier budget-model appendix;
  certified stdlib begins (needs certificates)

## v9 — Survival (era 4)

- §15 durable-execution posture: persistence contract, resume-after-crash, flight recorder /
  OTel, drift detection, `migrates from`; recorded hook returns (the §11 effect boundary,
  enforced); hot member upgrade (§22×§15)
- §25: run --amend, inspect --redact, bug, doctor, calibrate; §23 SLO runtime-monitor half
- §29 security/effects-model appendix (with v10's review)

## v10 — Trust (era 5)

- §25.1 certificates signed + transparency log + revocation/advisories (post security review);
  receipts design §25.2 in full (M5, M6, tiers, holder-key); fsl.lock; verify sweeps
- registry-close: entry/evidence formats (hosting stays deferred)

## v11 — Fleet (era 6)

- §16 in full across hosts: codegen targets, type-surface/hook-interface/manifest/docs
  artifacts everywhere, package-name attributes, capability negotiation (#1172/#1173), WASM
  toolchain productized (seeded by the v6 Rust impl)
- §26 T2/T3 tiers, adapter conformance, differential fleet; §8 pinned-unicode cross-host;
  §25 codegen --certify, publish

## v12 — Ecosystem (era 7)

- §25.1 the rest: registry hosting + behavioral search, guardrails-as-product (mcp --policy),
  query, infer/synth, learn-by-repairing at scale, corpus/eval/llms.txt program (note:
  distribution/visibility work is version-agnostic and may run opportunistically any time)
- registry-close: the loop-first slice then the metadata economy; semantic patches (§29 door)

## Whole documents

| Document | Fate |
|---|---|
| megaspec | splits as above — normative core ≈ 60% v6 / 25% v7 / 15% v8; rings v9–v12 |
| cli-config design + fsl-config | shipped (5.x); registry: section consumed from v6 on |
| replayer design/plan (M3) | shipped; arrives in 6.0 payload |
| convergence design/plan | consumed by 6.0 (One Merge + S2/S3) |
| verification perf model | doctrine; operationalized v8 |
| receipts design + roadmap | v10 (M2 flexibly earlier; record formats specced now) |
| manual topics/templates/taxonomy | version-agnostic program; on-ramp+language chapters v6, flagship/systems spine v7+, playbooks fill through v8–v9 |
| registry-close | irreversibles pulled to v6 contract; substance v10–v12 |
| blind-thinkthrough PROCESS | process; gates v9 and v10 spec work |
| fable_sum trio + eras/ directory | meta — the program itself |
