# Fable on the v6 Spec Set — Omissions

> **Author:** Claude Fable 5
> **Date:** 2026-07-04
> **Scope:** Things **absent from** the v6 document set (as read from the `v6` branch at
> `c03bcdeb`), as distinct from things wrong within it — see `fable_sum_critique.md` for those.
> **Purpose:** Review context. Ordered from "already acknowledged as debt" to "never mentioned
> anywhere." Where an item may already live in the fsl/jssm trackers, that is flagged rather than
> assumed novel — the claim in every case is *absent from this document set*, which is the set
> future readers (and models) will treat as the design record.

## A. Acknowledged debts — committed in megaspec §29, not yet written

Listed for completeness because each now blocks something concrete:

| Missing appendix | Blocks |
|---|---|
| **Operational semantics** (small-step macrostep/microstep loop) | M4 property evaluation, M5 full replay verification, any second host, conformance trace schema — everything that needs two implementations to agree on ordering |
| **Grammar appendix** (declarations, expressions, contracts, weighted `LabelList` in one place) | Phase 2 parser work, the `export --target gbnf/lark/ebnf` artifacts, constrained decoding |
| **Verifier complexity & budget model** | M1's "what counts as a verified property" scoping decision; honest `undecided` semantics |
| **Security / effects model** | The `pure` profile's safety claim, MCP guardrails, `witnessed`-tier receipts, untrusted-machine execution |
| **Compatibility policy** (v5/v6 parsing, editions vs conformance vectors) | The editions/feature-gates machinery, `lint --future`, the manual's migration chapter |

## B. Named as keystones, but no schema exists anywhere

Each of these is called load-bearing by at least one document, and none has even a draft schema in
the set:

- **The canonical `source_hash`.** The hinge of certificates, receipts, lockfiles, memoization.
  M3 shipped the provisional seam; no document defines the canonical form — normalization,
  hash-layer identity (source vs formatted vs AST vs graph), byte rules. Highest-leverage
  unwritten spec in the project.
- **`fsl.lock`.** Called "the supply-chain keystone every package ecosystem eventually learns it
  needs" (§25) — specced in one sentence.
- **The verification-certificate record.** §25 lists its five fields prose-style; M1 is told to
  deliver it; no canonical serialization or schema doc exists (and the receipts record cites it
  by hash).
- **The interface card.** Codex sketches fields; §25 (`docs --interface`) commits the feature;
  nothing normative.
- **The publish bundle manifest** and **advisory-feed format** (RustSec/GHSA-shaped — shape
  asserted, format absent).
- **The stable error-code registry.** `explain` with rustc-style codes is committed; meanwhile
  every module currently minting errors (`ReplayError` kinds, `ConfigError` kinds,
  `CodegenError`) uses ad-hoc string discriminants with no reserved namespace or numbering plan.
  Cheap to seed now; expensive to retrofit once codes are in the wild — codex explicitly asks for
  it, and it is dispositioned nowhere.

## C. Decided elsewhere, absent from the corpus

- **State-kinds (jssm #909).** The selector syntax (`state * terminal: {}`), kind-predicate
  model, and trailing-`dark`-value styling are decided in the issue thread, and the megaspec's
  §19 cascade / theme text — the natural home — does not mention them. Either they are v6-bound
  (then §19 needs a subsection or a sibling spec) or they are 5.x-bound (then a one-line scope
  note in §19 prevents the next reader from asking this same question).
- **`v6_breaking_changes.json` is missing at least two decided entries.** The manifest holds only
  `atom-charset-restriction` and `bare-functions-default-api`. Missing:
  1. **The `jssm-*` web-component synonym removal** — decided (fsl-* canonical, `jssm-viz` /
     `jssm-instance` / `jssm-bind` deprecated, removal in v6); the manifest already covers JS-API
     surface (entry 2), so this belongs.
  2. **The probabilistic list-target copy→split change** — §28's multigraph row documents that
     `a P% -> [b c]` semantics change from copy to hierarchical split, "differing from old copy
     only with sibling probabilistic edges (33/33/33 → 25/25/50). Major-bump change." That is a
     behavioral 5→6 break for existing documents and appears nowhere in the manifest.
- **Correction to a prior survey claim:** repeat-state **#454 is not missing** — its resolution
  is *inside* megaspec §19 ("repeat `state` declarations merge; same-tier conflicts error →
  closes #454"). And since 5.x rejected all repeated declarations, no migrating document can be
  broken by the new permissiveness — no manifest entry is needed. The only gap is that nothing
  outside §19 (issue cross-reference, manifest note) records that the design landed there.

## D. Never addressed anywhere in the set

### D1. Newline/encoding normalization for source hashing

The M3 hash runs over the source text as read; the CLI reads files as UTF-8. On Windows checkouts
with git `autocrlf`, the same committed file yields different bytes than on Linux — so a tape's
`source_hash` minted on one OS **mismatches on the other**, producing spurious
`source_hash_mismatch` refusals for the identical machine. Neither the M3 design, the plan, nor
the M1 seam note mentions line-ending or Unicode-normalization policy. One sentence in the
canonical-hash spec ("hash over LF-normalized NFC UTF-8" or "over formatted source") closes it;
left unstated, it will be discovered as a cross-platform bug report against the trust stack.

### D2. Seed-tree stability under document edits

§21.2 proves `at(n)` is bit-identical across hosts, runs, and time — for a **fixed document**. It
says nothing about edits, and the derivation labels make two silent reshuffles easy:

- renaming a member/system changes `derive(sys_seed, "<member name>")` → every instance seed
  below it changes;
- inserting a `rand()` call site shifts subsequent call-site indices `"<k>"` → downstream draws
  in the same instance change.

The factories pitch ("instance 42 of seed 1234 is a coordinate, not an anecdote") implies a
durability that ordinary refactoring silently breaks. This may be *accepted* behavior — like
lambda-tag invalidation, which §16 does state explicitly — but it needs the same explicit
paragraph: what edits preserve coordinates, what edits reshuffle them, and whether call-site
labels should be content-derived rather than positional.

### D3. Transparency-log equivocation, and the missing adversarial pass on the trust stack

The receipts design treats the transparency log as the non-repudiation anchor and explicitly
supports offline verification via self-contained inclusion proofs. A split-view (equivocating)
log defeats exactly that: an issuer running a forked log can show one view to the verifier and
another to the world, and an offline inclusion proof cannot detect it. The standard mitigations
(witness cosigning, gossip, consistency-proof audits) are absent from the design, the roadmap's
M2 brainstorm keys ("which log — Rekor vs self-hosted"), and the open-questions list. Related
unexamined surfaces: OIDC identity-provider compromise as the root of keyless signing, and
issuer-identity revocation semantics. None of this says the design is wrong — it says the trust
stack has had formal-logic review but **no security-adversarial review**, and the PROCESS doc's
own amendment (external specialist gate for property-matrix designs) argues for one before M2 is
specced.

### D4. Runtime performance acceptance envelope for the v6 enabling infra

The verification performance model correctly isolates the only genuine runtime-regression
surface: the enabling infra (RTC scheduler, undo journal, tape ring, debug-assert contracts) —
"which is exactly what the graviton perf CI guards." Guards against **what threshold?** No
document states how much v6.0 is *allowed* to cost relative to 5.x on the canonical benchmarks
(unfixed transition, edges_between, walk throughput). This project has concrete history here —
the 5.142–5.143 object-weight regressions (−20% transition, −40% edges_between) shipped
unnoticed. Without a written envelope ("v6 runtime ≤ N% over 5.158 baseline on the graviton
suite, else the feature waits"), the same drift will happen again, one journal write at a time.

### D5. A disposition ledger for the advisory corpus

~330 KB of recommendations (codex's 130-item checklist, gemini's parts, v6_suggestions) with no
accepted/declined/deferred record. Detailed in the critique (finding 1); listed here because the
*artifact* is what's missing: one table per review document.

### D6. The merged phasing DAG

§20 phases × trust-stack M1–M6 × convergence streams 1–3 have real cross-dependencies and no
single document ordering them. Detailed in the critique (finding 4); the missing artifact is a
one-page cross-index.

### D7. A bridge between the two documentation-planning universes

The manual stream on `v6` (manual-topics / templates / taxonomy) and the help-bar
teaching-surface manifest on `main` (7 first-class surfaces, grammar-derived coverage, tier ↔
treatment mapping) are two independent complete plans for teaching FSL, and neither references
the other. jssm #822 (re-enumerate surfaces for v6) is the natural join point, but no document
says which system owns what — e.g., whether the editor-help projection of the use-case template
*is* a help-bar surface. Left unbridged, v6 will ship two partially-overlapping doc taxonomies.

### D8. Baseline model-capability evals

§25.1 commits an eval set (NL→FSL, FSL→NL, bug-fix-given-counterexample) as a future asset — but
nothing measures the **baseline**: how well current frontier models already write 5.x/v6 FSL, and
which failure modes dominate. The AI-accessibility posture is a large design investment
(cheat-sheet, grammar export, corpus doctrine, curriculum) currently aimed by intuition. A
half-day baseline eval before the posture hardens would rank those investments by measured
failure mode, and doubles as the "before" datapoint the posture's success claims will eventually
need.

### D9. 5.x snapshot lift policy — an explicit decision, one way or the other

Version gating (§15) refuses incompatible snapshots; `migrates from` lifts old **val-schema**
snapshots across machine versions *within* v6's world. Nothing states whether a **5.x
serialization** (`.data()` blob + history + timestamp envelope) can ever be lifted into a v6
snapshot, or is permanently refused. Given the durable-execution positioning ("your saga survives
process death"), long-lived 5.x machines at upgrade time are exactly the hard case the posture
claims to own. "Permanently refused; re-run from tape" is a perfectly fine answer — it just needs
to be written down.

### D10. Hook-return recording has semantics but no format slot

§11/§14 define the replay contract for named-hook calls: returns are **recorded**, replay
consumes the recording, a missing recording is a refusal. The M3 tape format reserves a future
`receive` op for channels — but no document sketches where **recorded hook returns** live (tape
op? parallel ledger? snapshot section?). M6's `replayed`-tier receipts sidestep this by firing no
hooks, which quietly means: *receipts cannot cover any machine whose behavior depends on hooks*
until the format slot exists. That scope limit is real and appears nowhere; either state it in
the receipts design or reserve the tape/ledger slot now (codex's "determinism ledger" is the
obvious shape).

### D11. Re-verification of the June implementation audit

megaspec-critique §1's findings (package-shape drift, unwired verbs, interchange lossiness,
forced-transition erasure in codegen) date from a worktree state that has since moved. No
document tracks which were fixed. A 30-minute re-audit converts a stale finding list into either
closed items or live bugs; acting on the stale list — in either direction — is the omission.

## E. Checked and *not* missing

To save the next reader the hunt — plausible-looking gaps that the set actually covers:

- **Effect boundary for hooks vs rollback** — resolved, §11 (pure-in-transaction /
  post-commit-or-idempotent / replay-refuses-missing).
- **Journal semantics** (immediate writes + undo log, commit discards) — resolved, §28.
- **`stream` type** — §4.6. **Tape taxonomy** — §14. **`finite` vs `checkable`** — §28 row.
- **Repeat-state #454** — resolved inside §19 (see C above).
- **`migrate` codemod** — considered and explicitly declined (§25), with the revisit point (v7
  alias removal) recorded.
- **Cross-host float/collation determinism** — deliberately deferred with an issue number
  (#815) and a named landing site (`fsl_canonical`).
- **Channel/output-tape regeneration in M3** — explicitly reserved, with the reason (transducer
  wiring unlanded) and the non-blocking argument for M6 stated.
