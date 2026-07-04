# Fable on the v6 Spec Set — Critique

> **Author:** Claude Fable 5
> **Date:** 2026-07-04
> **Scope:** A critique of the v6 document set **as a set** — the megaspec, the trust-stack
> documents (signed-run-receipts design + roadmap, M3 replayer design + plan), the convergence
> design + codegen plan, the verification performance model, the CLI-config design, the manual
> stream (topics, templates, taxonomy), the review corpus (megaspec-critique, v6_suggestions,
> codex_on_v6, gemini_on_v6, registry-close, blind-thinkthrough PROCESS), the var Phase-1 plan,
> and `v6_breaking_changes.json` — as read from the `v6` branch at `c03bcdeb`.
> **Purpose:** Review context, not a work order. The sibling documents already critique the
> *megaspec*; this one critiques the *corpus* — how the documents relate, contradict, and load-bear
> for each other. Companion: `fable_sum_omissions.md` (what is absent rather than what is wrong).

## What the set does unusually well

Worth stating first, because the strengths are structural, not cosmetic:

- **The megaspec absorbed its critics.** Nearly every "must fix" from `megaspec-critique.md` and
  `v6_suggestions.md` is resolved in the current decision log or the genre-bands header: the
  journal wording, the tape taxonomy, the `stream` type, the named-hook effect boundary, the
  `finite`-vs-`checkable` reconciliation. A spec that visibly metabolizes review is rare.
- **The anti-fake-test culture reaches into the specs themselves.** The receipts design (§14) and
  the M3 plan (Task 7) both mandate a stochastic cross-check against the live runtime precisely so
  the test cannot agree with a hand-written expectation. The repo's testing ethic is now a spec
  requirement, not just a habit.
- **The two-model adversarial process caught real errors.** Gemini's formal pass on registry-close
  corrected three P/R/X matrix cells that *both* general reasoners had blessed — the clearest
  possible validation of the decorrelated-reviewer design, and the PROCESS doc honestly records
  the lesson as a process amendment.
- **Deferrals are honest.** ZK disclosure, parallel regions, distribution semantics, registry
  hosting — each is named, scoped, and parked with a reason instead of hand-waved into v6.
- **The trust stack is sequenced like an engineer, not a visionary.** M3-first (cheapest, owns the
  determinism guarantee, independent of crypto) is exactly the right de-risking order, and the
  roadmap says why.

## Findings, ranked

### 1. Advisory mass now exceeds normative mass, with no disposition ledger

The review corpus (~330 KB: codex ~130 numbered recommendations, gemini's 13 parts,
v6_suggestions' ~100 recommendations) is roughly twice the size of the megaspec, and **none of it
carries accepted / rejected / deferred status**. The megaspec demonstrably absorbed
`megaspec-critique.md`, but nothing dispositions the other three. Consequence: every future
reader — human or model — must re-read ~80k tokens of advice and re-derive what was taken, and the
set's own stated failure mode ("a vivid paragraph looks like a binding requirement") now applies
*more* to the advisory ring than to the spec. The reviewers demanded a status matrix of the
megaspec; the same discipline is owed to the reviews. Cheapest fix: one disposition table
(item → adopted-in-§ / declined-because / deferred-to) per review document, maintained the way the
decision log already is.

### 2. Two centers of gravity, unreconciled: language-first vs artifact-first

The megaspec's center is language semantics + CLI. Codex and v6_suggestions argue — repeatedly and
from independent angles — that the **canonical IR / VM artifact, result envelope, and semantic
hashes** should be the center of gravity ("the VM is the product; codegen is an optimization").
Registry-close then converts that view into **twelve IRREVERSIBLE design-now obligations**
(canonical VM artifact, semantic hashes, typed boundaries, effect model, host ABI, total
arithmetic, proof-dependency identity, …). But the megaspec's phasing (§20: Phases 1–3, F1–F6)
contains **no milestone for any of them**. Meanwhile M3 has already started building the artifact
layer bottom-up (RFC 8785 canonicalization, a provisional hash) without a spec for the layer it is
building. These two worldviews are compatible — but nobody has written the sentence that
subordinates one to the other, and the twelve IRREVERSIBLE rows are precisely the ones that cannot
be retrofitted. This is the set's largest unmanaged risk.

### 3. A live normative conflict: the automata ladder vs the Gemini push-up

Megaspec §3 presents the four-rung model-class ladder (`regular` / `pushdown` / `petri` / `tree`)
as v6 design. Registry-close records Gemini's formal finding that the higher rungs are a
decidability hazard for the checkable band (nondeterministic pushdown equivalence undecidable;
Petri reachability Ackermann-hard) and proposes restricting v6's checkable band to
`regular` + `tree`, deferring `pushdown` (or strictly VPA) and `petri` (strictly
coverability/boundedness) to v7 — *"recorded here for the boundary audit + decision record, not
applied unilaterally."* **That boundary audit never happened.** The corpus therefore contains two
incompatible normative positions on a load-bearing §3 feature, and nothing marks the megaspec text
as contested. Until a decision record exists, any implementation or manual work on rungs 1–2 is
building on disputed ground.

### 4. Three phasing plans over one codebase, no merged dependency graph

The set contains three orthogonal sequencing documents: §20's feature phases (1–3, F1–F6), the
trust roadmap's M1–M6, and the convergence design's streams 1–3. Their cross-dependencies are real
and only implicit: M4-full needs Phase 2 (expression language merge); M1 needs the canonical
serialization M3 partially built; F3 needs Phase 3 I/O; stream 2's `VerificationGraph` port
overlaps M1's check engine. Nobody has drawn the single DAG. The predictable cost is rediscovering
ordering constraints mid-implementation — the exact failure the receipts roadmap was written to
prevent within its own column.

### 5. "The conformance suite is the spec" — and the set contains zero vectors

Vectors-as-executable-spec is the corpus's most repeated posture (megaspec §16/§26, the PROCESS
portability contract, v6_suggestions' "no vector, no normative feature"). Yet the set contains no
vector files, no normative schema for the vector format beyond a sketch, and M3's tests are
vitest-only. Stated ~30 times, instantiated zero times: the largest say-do gap in the corpus. The
M3 determinism tests are the natural seed corpus — promoting them into the vector format would
cost days and make the posture real.

### 6. The RTC keystone is still one paragraph of prose

Everything downstream keys off §12's macrostep/microstep/stable pipeline: contracts, rollback,
replay, receipts issuance, conformance traces. Two reviewers demanded small-step operational
semantics; §29 commits the appendix; it does not exist. M3 gets away with this because replay
currently excludes hooks and freezes the clock — but M4 (property evaluation over runs) and M5
(full replay verification) cannot. The risk is the classic one: two implementations that agree
with the *tests* but disagree with each other on unspecified ordering. The appendix stops being
deferrable the moment M4 is brainstormed.

### 7. Genre-banding is declared, not enforced

The megaspec's header names the five status bands but applies them "informally throughout"; §28
rows carry ring labels but individual features have no status column. The mitigation for the
corpus's own top-named risk (models over-trusting vivid prose) is therefore itself prose. Given
that the spec is explicitly maintained as a training/context corpus for models (§25.1), the
per-feature status tag is not bureaucracy — it is the load-bearing safety rail, and it is missing.

### 8. `source_hash` is the hinge of the entire trust economy, and has no spec

Certificates bind to it, receipts cite it through `machine_certificate_ref`, lockfiles pin it,
every `--json` result carries it, memoization keys on it. What exists: a `provisional:` FNV-1a
with a named M1 seam. What does not exist anywhere in the set: the canonical hash's definition —
normalization (formatted source? raw bytes? newline policy?), which of the several hash layers
(source / formatted / AST / graph / interface) is *the* certificate subject, and the
cross-host byte rules. The single most load-bearing identifier in the design is the least
specified. (Its concrete failure modes are in the omissions companion.)

### 9. The corpus violates its own one-spelling doctrine

§25.1's corpus strategy demands everything public pass through `format` so the training data has
one spelling — and §29 records the comment token as decided `//` with `%` "legacy, to be swept."
The sweep is half-done: the megaspec's own §21/§22 examples still use `%` while the manual-topics
flagship uses `//`. None of the spec's FSL examples are doc-tested yet (`test --doc` is itself
unbuilt), so the documents most likely to be ingested as ground truth are the least verified FSL
in the project. Sweep the examples now; doc-test them when the tooling lands.

### 10. Staleness hazards inside the set

- The **implementation audit** in megaspec-critique §1 (package-shape drift, unwired verbs, lossy
  JSON interchange, forced-transition erasure) describes a worktree state from mid-June; the tree
  has moved since. Those findings should be re-verified before anyone acts on them — or worse,
  assumes they were fixed.
- **`v6` last synced main 2026-06-27** and main has moved ~265 commits since, including
  v6-adjacent spec work (help-bar teaching surface). Several corpus documents describe "current
  v6 state" that is now doubly stale (vs its own branch tip and vs main).
- The **taxonomy** declares its JSON canonical over its own markdown with no drift check between
  them — a self-acknowledged dual-source with no enforcement.

### 11. The trust stack has had formal review but no adversarial security review

Registry-close got a dedicated formal-methods pass; the receipts design — the actual
cryptographic artifact — has had none. Its logical structure (∀/∃ framing, evidence-determined
tiers, refusal-based issuance) is genuinely strong, which is exactly when a security-lensed
adversarial pass pays most. Specific unexamined surfaces are listed in the omissions companion
(transparency-log equivocation foremost). The PROCESS amendment born from the Gemini pass — "an
external specialist gate whenever a design proposes a matrix of logical properties" — applies with
equal force to a design that proposes a trust chain, and has not been applied.

### 12. Minor

- **Manual-topics is accreting self-patches** ("revise the Part-I GoF list when writing," the
  vocabulary-refresh banner on the var plan). Each is honest, but they are a drift ledger being
  paid down at read time by every future consumer; periodic consolidation passes should be
  scheduled, not left to whoever notices.
- **The blind-thinkthrough PROCESS has run once.** The topics it was built for — parallel regions
  (#1353), distribution semantics — are named in §29 with no plan to route them through it. A
  process proven on its first outing and then shelved is a common failure shape; worth a standing
  rule for which §29 items must go through it.
- **The var Phase-1 plan predates the rename and the vitest migration** and says so — but a plan
  carrying a "mechanically rename 156 occurrences before executing" banner is a plan that will be
  executed wrongly by someone in a hurry. Refresh it or mark it superseded before it is next
  picked up.

## Bottom line

The individual documents are strong; the *set* has outgrown its coordination mechanisms. The
megaspec proved it can metabolize review — the remaining work is to give the corpus the same
digestive system: disposition ledgers for the advisory ring, one merged phasing DAG, a decision
record for the ladder conflict, per-feature status tags, and a written spec for the two things
everything else hangs from (the operational semantics and the canonical hash). None of that is
invention; all of it is bookkeeping the set already knows it needs, because its own reviewers
asked for it.
