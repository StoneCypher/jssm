# Eras 2–7 — Thin Briefs

> **Status:** stable · **Author:** Claude Fable 5 · **Date:** 2026-07-04
> **Deliberately thin** (era-map standing rule: no fake precision about distant eras). Each era
> gets: theme, entry criteria, scope, hazards/decisions, and its process gate. Each era's FIRST
> packet, when its time comes, is "write the full brief" — by then reality will have voted.
> Deep sources: `fable_sum_eras.md` (rationale), `dag.md` (edges), megaspec §§ as cited.

## Era 2 — Society (opens 7.0)

- **Theme:** machines get I/O and each other. F1–F5: factories + seed tree (§21), channels/
  `emit`/sensors/time-as-sensor (§14), systems/populations/routes/lifecycle (§22), supervision,
  machine-val embedding, system viz (§24).
- **Breakage batch at 7.0:** `property`→`prop` / `var`→`val` alias removal; strict mode (#712,
  last of its cluster); bare-functions IF it took the era-0 fallback.
- **Entry:** P2/P3 shipped; groups shipped; dragon covering the full v6 grammar.
- **Hazards/decisions:** seed-tree `derive()` pinning + edit-stability policy land at F1
  (irreversibles #11); deterministic queued dispatch (§22.3) needs C2-grade small-step text
  BEFORE implementation; parallel regions stay OPEN (#1353) — composition is the answer until
  someone proves otherwise; `sender`-only context rule keeps routes analyzable.

## Era 3 — Proofs (opens 8.0)

- **Theme:** verification proper. F6 composed checking (§23), Dwyer prelude, checker backends
  (`--via` nuXmv/Spin/Storm, differential), M4-full, the testing toolkit (§17: test/expect
  blocks, MBT, shrinking, statistical MC), behavioral diff/refinement, `minimize`; certificates
  mature (M2 lands here if not earlier).
- **HEADLINE OPEN DECISION (blocks doc claims before code):** the automata ladder — megaspec §3
  four rungs vs registry-close's Gemini push-up (checkable band = `regular`+`tree`; `pushdown`
  as VPA-only and `petri` as coverability-only, or deferred). Needs a decision record; nothing
  may claim `pushdown`/`petri` checkability until it exists.
- **Entry:** society shipped (F6 needs F5); M1 certificates flowing.
- **Hazards:** never build the world-class checker in-house (delegate to backends; native =
  cheap safety); `undecided` is a first-class result from day one; assume-guarantee is the
  state-explosion answer, budgets are only the postponement.

## Era 4 — Survival (opens 9.0) — PROCESS-GATED

- **Theme:** durable execution. Persistence contract (#813), recorded hook returns (fills
  irreversibles #4's slot), `migrates from`, OTel flight recorder, drift detection, `calibrate`,
  hot member upgrade, production forensics (`run --amend`, `diff` over runs, `bug`).
- **Gate:** full blind-thinkthrough PROCESS run (two-model, per PROCESS.md) before its spec —
  this is the era the corpus prices at one paragraph; it is Temporal-cursed-corner territory
  (post-commit failure, at-least-once vs exactly-once, crash-mid-macrostep).
- **Entry:** era-3 safety+statistical checking live (the differentiator: *certified* durable
  workflows); tape format versioning discipline held.
- **Decisions owed:** 5.x snapshot lift policy (omissions D9 — "permanently refused" is
  acceptable, but write it); the ABI durability surface FINALIZES HERE, before fleet.

## Era 5 — Trust (opens 10.0) — SECURITY-REVIEW-GATED

- **Theme:** proofs and runs as signed social objects. M2 (if not earlier) + M5 + M6 full
  receipt tiers (`hosted`/`witnessed`, holder-key, trusted event time), revocation/advisories,
  `verify` sweeps, `fsl.lock` (schema = irreversibles #18), redaction at scale.
- **Gate:** a security-adversarial review pass (the PROCESS amendment, with a security-lensed
  reviewer) BEFORE the M2 spec hardens. Known unexamined surfaces: transparency-log
  equivocation/split-view (needs witness cosigning or equivalent), OIDC provider compromise,
  single-receipt revocation.
- **Entry:** era-4 capture infrastructure (provenance-signed inputs feed `witnessed`).

## Era 6 — Fleet (opens 11.0)

- **Theme:** the multi-host fan-out against the era-1 contract and era-4 ABI: Rust/C/Python/…
  runtimes and codegen targets, T1→T3 tier growth, cross-host determinism (#815), typegen
  everywhere, package manifests, adapter targets with golden-trace conformance.
- **Entry:** language stable through era 3; ABI durability surface final (era 4). This ordering
  IS the era's thesis: certify a stable language, don't chase a moving one.
- **Shape:** per-host packet template — port the ~200-line harness, not the suite; capability
  manifest declares tier; negative-capability reports mandatory; a host ships when the vector
  corpus passes at its declared tier.

## Era 7 — Ecosystem (opens 12.0)

- **Theme:** other people's machines. Registry (loop-first slice per registry-close option B:
  prove verify→assemble→counterexample→swap on a tiny vertical before building the metadata
  economy), guardrails-as-product (`mcp --policy`), semantic patches, `query` fleet governance,
  `infer`/`synth` (aspirational), the manual/curriculum/eval corpus at scale, the certified
  stdlib as public catalog, and the distribution block (the fsl twins of old jssm #831–#869
  post-drain: MCP registries, skills, llms.txt, corpus visibility).
- **Entry:** trust economy live (registry entries are certificate-bearing publish bundles).
- **Hazard:** registry trust tiers stay target-qualified and multi-dimensional (registry-close's
  renames and Codex's "no single verified badge") — the overclaim is the ecosystem-killer.
