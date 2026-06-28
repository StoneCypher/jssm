# Registry / Exposition / Compositionality — the close

> The close of the registry think-through. Driven by **Opus**; **Codex adversarial review applied 2026-06-18**; **Gemini formal-methods pass applied 2026-06-18** (three matrix corrections + two new IRREVERSIBLE v6 rows — see *Formal pass* at the end). Feeds the eventual decision record — it is **not** itself a decision record.
>
> Inputs: `registry-{opus,codex}-proposal-1.md`, `registry-opus-proposal-2.md`, `registry-codex-proposal-2.md` (Codex's synthesis). Scope is deliberately narrow: **decide what v6 must design-now vs. reserve-now**, and **surface the one live fork** — not settle every future registry detail. Hybrid format: prose for argument, tables/JSON for structure. 2026-06-17.

## Bias note (required — single-driver synthesis, same driver three times)

I (Opus) have now driven three syntheses in this collaboration (PROCESS.md, and this). That is exactly the anchoring risk we flagged. Read this close knowing:

- **Where this may be biased:** toward my own structural artifacts (the reversibility table, the P/R/X matrix, the band rules) because they're mine; toward *loop-first* de-risking, which is a bet, not a fact.
- **What Codex emphasized more strongly, and I've tried to honor:** third-party adjunct metadata and policy as load-bearing (not decorative); adapters as first-class proof-carrying components (its best catch); graded trust to boot before the verification farm matures.
- **What remains genuinely unresolved:** the loop-first vs. metadata-first fork (left for the human, below), and the formal-methods soundness of the composition algebra (flagged for a third reviewer).

## Locked spine (both models, independently)

- **v7, not v6.** v6's job is to be *registry-ready*; it does not build the registry.
- **Proof-carrying components and systems**, made practical by the finite FSM domain + the agent consumer.
- **The defensible claim** (Codex's wording, adopted over my original "known to work"): *components known to satisfy declared behavioral contracts, under declared assumptions, with portable evidence, under an explicit trust policy.*
- **Behavioral contracts *over* typed boundaries** — typed I/O is the load-bearing floor; assume/guarantee contracts are the semantic layer. ("Necessary and radically insufficient" and "over, not instead of" are the same claim.)
- **Composition is an algebra**; **band algebra** governs composite verifiability; **substitutability is Liskov-for-machines**; **failure is supervision** (Erlang/OTP).
- **Sidecar-first**, host manifests as adapters, C the forcing function.
- Signing proves **provenance, not adequacy**; trust needs grades, revocation, and freshness.
- The **agent** is the primary customer; the adoption loop is the **fast oracle + minimal counterexample**, not a browsable marketplace.

## Core model

### Component
A single machine + registry metadata, exposing: typed boundaries · behavioral contract (assumes/guarantees/invariants) · effect/capability requirements · failure semantics · canonical VM artifact · proof/conformance evidence · signatures/provenance · target support · **per-property verification band**.

### System
A composite of components under a **declared composition algebra**, additionally exposing: component graph · operators used · wiring/adapters · system-level assumes/guarantees · effect composition · supervision/failure behavior · resource bounds · composite proof status · **downgraded or unchecked obligations** (named, never silent).

### Adapter (Codex's catch — adopted, and promoted into the first slice)
**An adapter is not innocent glue.** Agents generate glue constantly, and unverified glue is precisely where the guarantee chain silently breaks. An adapter is a first-class proof-carrying component: typed boundaries · behavioral contract · effect declaration · evidence where possible · an explicit statement of **what guarantees it preserves vs. weakens**.

---

## The composition algebra (falsifiable hypothesis — flagged for formal review)

**Non-normative until formal review.** Per operator: **P** *candidate* preservation **under stated side conditions** (not unconditional) · **R** re-verify on composite · **X** does not compose without an explicit connector obligation. Even a **P** can fail — e.g. hierarchical preservation breaks if a parent's entry/exit actions, shared variables, or effects violate a child's assumptions — so **P** reads as "preserved *provided* the connector discharges those side conditions." Every cell is a hypothesis for the formal reviewer (Gemini) to confirm or break, not a guarantee.

| property \ operator | hierarchical | sequential | parallel / concurrent | wiring (port routing) |
|---|---|---|---|---|
| local safety invariant | P | P | R | R |
| reachability | **R** ¹ | P | R | R |
| deadlock-freedom | R | **P\*** ² | **X** | R |
| liveness | R | R | **X** | R |
| determinism / replay | P | P | **X** (must record schedule) | **P** sync / **X** async ³ |
| effect-safety (non-interference) | P (union) | P | R | R |
| resource bounds | R | P (sum) | R | R |

The gradient is load-bearing: **hierarchical and sequential are friendly; parallel and wiring are where guarantees die** — which is why the first slice is hierarchical-only.

**Formal corrections (Gemini, 2026-06-18) — both Opus and Codex had missed these:**
- ¹ **Reachability is not preserved downward.** A parent's preemption/interrupt can fire before a child reaches state `S`, making `S` dead code. Composition *restricts* behavior — so safety survives (fewer reachable states only helps), but reachability flips to **R**.
- ² **Sequential deadlock-freedom is conditional (`P*`):** preserved *only if* the compiler statically proves `Postcondition(A) ⟹ Precondition(B)`; otherwise the handoff deadlocks.
- ³ **Determinism is structural, not re-verifiable.** Re-verification checks; it cannot *confer* determinism. Synchronous wiring (shared tick) preserves it (**P**); asynchronous wiring with uncoordinated bounded queues is inherently nondeterministic (**X**) unless confluence/the diamond property is proven (undecidable). "R" was a category error.

**Supervision** is a *cross-cutting wrapper*, not a column: it composes a supervisor over children (any structural operator) and, by construction, **contains** child failure (contained / propagated / restart / retry / compensation / escalation / operator-intervention / terminal). It converts an `X`/`R` on failure-related properties into a *bounded, declared* outcome — that is its entire purpose, and the reason failure semantics live inside the algebra, not beside it.

## Band algebra (rule form — not "often")

```text
composite_band(property) =
  CHECKABLE   iff every part is checkable for `property`
              under a preserving operator (P in the matrix);
  CHECKABLE   iff an uncheckable part is QUARANTINED behind a
              checkable assume/guarantee contract covering `property`
              (the quarantining connector must itself be checkable);
  UNCHECKABLE otherwise (degrade to weakest part).

Invariants:
  - report the band PER PROPERTY, never globally;
  - never silently upgrade;
  - if a system property needs the product state space, say so explicitly.
```
("finite + finite + hierarchical → *often* checkable" is rejected: a band must be decidable per composite, not probable.)

## Unified claims/evidence record

```json
{
  "kind": "component | system | adapter",
  "identity":  { "name": "...", "version": "...", "edition": "...", "profile": "...",
                 "source_hash": "...", "canonical_vm_hash": "...", "semantic_hash": "..." },
  "interface": { "accepts": ["PaymentAuthorized"], "emits": ["ReceiptIssued"],
                 "payload_schemas": { "...": "..." }, "failure_payloads": {"...":"..."} },
  "contract":  { "assumes": ["fraud_check = passed"],
                 "guarantees": ["ledger_balance >= 0"], "invariants": ["..."] },
  "effects":   ["network.stripe.charge"],
  "failure":   { "model": "supervision", "on_fault": "compensate -> escalate" },
  "band":      { "declared": "symbolic-finite",
                 "per_property": { "deadlock_freedom": "checkable", "liveness": "unchecked" } },
  "evidence":  { "proof_artifact_hash": "...", "proof_input_hash": "...",
                 "proof_checker": "fsl-check@2.1.0",
                 "proof_dependencies": ["assume:fraud_check", "transition:auth->charge"],
                 "conformance_bundle_hash": "...", "targets_passed": ["typescript","rust"],
                 "undecided": ["..."], "unchecked": ["liveness"] },
  "attestation": { "tier": "registry-verified", "signer": "...", "verifier_trust_root": "...",
                   "verified_at": "<unixtime>", "revocation": null, "freshness": "current" },
  "loss_report": { "per_target": { "c": ["timers approximated"] } },
  "privacy":     { "redactions": ["payload.card_number"] }
}
```

## Substitutability (Codex's criteria, adopted)

```text
inputs        B.accepts     ⊇ A.accepts            (contravariant)
assumptions   B.assumes     ⊆ A.assumes            (no stronger demand)
guarantees    B.guarantees  ⊇ A.guarantees         (covariant; preserve/strengthen)
outputs       B.emits       compatible with downstream consumers
effects       B.effects     ⊆ allowed ∧ ⊆ A.effects
failure       B preserves A's required failure semantics
resources     B within A's resource contract
proof         B preserves A's proof obligations OR supplies fresh evidence
```

## Trust tiers (graded — `registry-checked` renamed to kill the overclaim)

| tier | meaning | agent-actionable? |
|---|---|---|
| `author-claimed` | author asserts + signs; not reproduced | low (claim, not evidence) |
| `third-party-adjunct` | non-maintainer asserts under own namespace, with provenance | medium (weigh by policy) |
| `registry-wellformed` | registry validated schema/hashes/signatures only — **no behavioral check** | low (paperwork, not correctness) |
| `registry-verified(targets)` | registry **reproduced** conformance/proof claims under the **named** targets — always target-qualified, never a bare/general mark | high *for those targets only* |
| `deprecated / revoked / stale` | not accepted under current policy without override | gate, not grant |

Codex's `registry-checked` is renamed **`registry-wellformed`**: the original name implies behavioral verification it does not perform — the exact overclaim Codex's own "claims to avoid" section forbids. Graded trust lets the ecosystem **boot before the verification farm matures**; only `registry-verified` is a correctness signal — and it is **always written target-qualified** (e.g. `registry-verified(ts-js)`), never a bare badge, or it overclaims beyond what was actually reproduced.

## Policy dimensions (Codex's, adopted)

| group | dimensions |
|---|---|
| trust | trusted namespaces · first-party vs adjunct · verifier trust roots |
| proof | required band/profile · accepted checkers · heuristic evidence allowed? |
| effects | allowed effects · no-network · no-filesystem · data-sensitivity class |
| targets | allowed targets / host ABIs · allowed editions |
| resources | max resource budgets |
| freshness | revocation/expiry · stale-proof handling · post-verifier-change recheck |

Without policy the registry is an unranked pile of claims; resolution is **policy-constrained contract solving** (SAT/CSP), not version arithmetic.

## Third-party adjunct metadata (Codex's pillar — adopted)

Maintainers across 40+ ecosystems will not author FSL metadata, so non-maintainers must, under their **own namespaces**, with **multiple competing adjuncts per upstream package**, chosen **by policy**. An adjunct declares: author/namespace · upstream ecosystem/package/version-range/hash · claim scope · provided contracts/wrappers · evidence · target support · trust status · revocation/freshness · and whether it **describes / wraps / constrains / replaces** upstream behavior. *Do not make upstream maintainers a bottleneck* — that is why TypeScript's ecosystem worked.

## Behavioral semver (Codex's sharpening, adopted)

> A **breaking change** is one that invalidates a previously-passing consumer's **conformance vectors, contract obligations, *or* substitutability relation.**

Made *computable* by **composable proof-dependencies**: a proof over `foo@1.2.0` carries to `1.2.1` iff its recorded dependencies (assumptions/hooks/transitions/interfaces/effects/solver-settings) are unchanged — and a proof checked by a later-discredited verifier is downgraded en masse.

## Why an agent says "I need this" (restored from opus side)

- **Fast local oracle + minimal counterexample trace** — the inner-loop signal that flips nice→need; build it first.
- **Contracts as context compression** — reason about a part *without loading its implementation*; how a large system fits in a finite window at all.
- **Cold-start solved by agent producers** — agents both generate and consume verified components, so the trait that makes them the ideal customer also fills the shelves.
- Codex's framing, kept: an **agent exoskeleton — deterministic rails for probabilistic workers.**

---

## The close's actual mission: v6 design-now vs. reserve-now

Codex's flat prerequisite list, re-sorted by **what foreclosing costs you** (opus-2's classification). This *is* the answer to "what must v6 add now vs. reserve."

| v6 foundation | class | v6 obligation |
|---|---|---|
| Canonical VM artifact (stable, versioned, hashable) | **IRREVERSIBLE** | **design now** |
| Forward-compatible artifact extension points | **IRREVERSIBLE** | **design now** |
| Semantic hashes / content-addressable identity | **IRREVERSIBLE** | **design now** |
| Composition semantics that *permit* property-preserving connectors | **IRREVERSIBLE** | **design now** |
| Typed boundaries (events, payloads, channels, hooks, returns, failures) | **IRREVERSIBLE** | **design now** |
| Effect / capability model | **IRREVERSIBLE** | **design now** |
| Assume/guarantee contract surface (minimal subset OK) | **IRREVERSIBLE** | **design now** |
| Host ABI (hooks, effects, timers, randomness, results, errors) | **IRREVERSIBLE** | **design now** |
| Canonical trace format + determinism | **IRREVERSIBLE** | **design now** |
| Bounded / total arithmetic semantics (saturate / wrap / interval) | **IRREVERSIBLE** | **design now** — partial arithmetic (overflow can throw) forces SMT branching per op → contracts uncheckable (*which* totalization is its own open fork) |
| Adapter declaration syntax (explicit guarantee weakening/subsetting) | **IRREVERSIBLE** (contingent) | **design now** unless the v6 contract surface already expresses declared weakening |
| Minimal proof-dependency *identity* model | **IRREVERSIBLE** | **design now** (behavioral semver needs it; can't retrofit onto proofs already emitted) |
| Full proof-artifact schema | **HOOK-NOW** | reserve the slot |
| Signing attachment points | **HOOK-NOW** | reserve the slot |
| Loss/compatibility reports | **HOOK-NOW** | reserve the slot |
| Capability manifests | **HOOK-NOW** | reserve the slot |
| Privacy/redaction model | **HOOK-NOW** | reserve the slot |
| Package identity placeholders | **ADDITIVE** | defer to v7 |
| Policy profiles | **ADDITIVE** | defer to v7 |

**v6 verdict:** get the **twelve** IRREVERSIBLE rows *right* (Gemini's formal pass added bounded/total arithmetic and adapter declaration syntax); reserve slots for the five HOOK-NOW rows; defer the two ADDITIVE rows. *"v6 does not need the registry; v6 needs to avoid making the registry impossible."* The IRREVERSIBLE rows are the spine of how it avoids that — but the **exact boundary is not yet settled** (see the open question on how minimal the v6 assume/guarantee subset can be). Treat the table as the current best cut, not the final word.

**Gemini push-up finding (pending boundary audit):** the megaspec's higher automata rungs are a *decidability* hazard for the checkable band — nondeterministic pushdown equivalence is undecidable (FSL's `rand`/hooks make its PDAs nondeterministic) and Petri-net reachability is Ackermann-hard. Gemini's action: v6 restricts the **checkable** band to `regular` (finite memory) + `tree` (stateless), and defers `pushdown` (or strictly *Visibly* Pushdown Automata, which *are* decidable) and `petri` (strictly coverability/boundedness) to v7. This is a concrete v6→v7 push-up, but it edits the **megaspec** — recorded here for the boundary audit + decision record, not applied unilaterally.

## The one live fork (for the human — not dissolved)

| | **Option A — metadata-first (Codex's lean)** | **Option B — loop-first (Opus's lean)** |
|---|---|---|
| build first | manifest + adjunct + policy + compatibility-explain | verify→assemble→counterexample→swap on a tiny vertical |
| de-risks | ecosystem shape & adoption | the research-grade core: is compositional proof real, automatic, fast? |
| failure if wrong | a beautiful index of *unproven* claims | a proven loop with no ecosystem yet |

**My recommendation (biased, see note): B.** The thesis is hollow if the proof/compose loop isn't cheap enough for an agent's inner loop, and that's the genuine unknown; the plumbing (A) is comparatively low-risk and can wrap a *proven* core. But if you judge adoption to be the dominant risk, A is rational. **Human decision.**

**Update (Gemini formal pass):** Gemini sides with B — *"building a registry schema before a sound composition loop guarantees you index the wrong metadata."* The lean is now **2:1 for B** (Opus + Gemini, with a formal argument); Codex leaned A. I'd temper Gemini's "mandatory" to "strongly favored" — A-first isn't formally *wrong*, just strategically riskier. Still your call, but the weight has shifted decisively toward B.

## Minimal first slice (trimmed — loop + adapter discipline; defer plumbing)

One language (TS/JS) · one operator (**hierarchical**) · **finite/checkable band only** · canonical-VM-artifact hash · typed boundaries · minimal assume/guarantee contracts · tiers `author-claimed` + one `registry-verified(ts-js)` path over a tiny corpus (target-qualified, not a general mark) · **counterexample traces** · refinement/substitutability check · **adapters as first-class proof-carrying components** · **a skeletal third-party adjunct**: one non-maintainer metadata file binding to an upstream artifact by **namespace + hash** (binding mechanism only — no ranking, competing adjuncts, or policy).

Demonstrate one loop, end to end:
```text
agent states a contract → queries registry → selects under policy
→ assembles a hierarchical composite (+ any adapter, itself contract-checked)
→ checker returns a green proof OR a minimal counterexample
→ agent swaps one component under a refinement check
```
**Defer to slice 2:** adjunct *richness* (ranking, competing adjuncts, policy selection), review-packs, and multi-target / 40-runtime registry verification. (The adjunct *binding mechanism* moves into slice 1 per Codex's review — the TS/@types thesis rests on third-party binding, so it must be proven early; only the ecosystem richness around it defers.) Keep artifact shapes portable from day one so widening is additive.

## Claims to avoid (Codex's, adopted — directly serves the overclaiming review)

Avoid: "proofs write themselves" · "known to work" unqualified · "verified = correct" · "signatures prove behavior" · "passing vectors prove all behavior" · "types are enough" · "composition is automatic" · "generated code preserves semantics unless shown otherwise."
Prefer: *many finite/checkable proofs can be generated automatically* · *verified under declared assumptions* · *signatures prove provenance and integrity* · *registry-verified = reproduced evidence under declared targets* · *composition introduces obligations* · *generated code must report preserved and unsupported semantics.*

## Open questions for Codex's adversarial pass (+ a third reviewer)

- **Formal soundness** of the composition matrix and band algebra — where does the P/R/X assignment break against assume-guarantee / behavioral-subtyping / session-type literature? *(best handed to a formal-methods-lensed third reviewer.)*
- Minimal contract language for slice 1 — and is its authoring load realistic even for agents (the keystone's make-or-break)?
- Adjunct namespace scheme; cross-ecosystem upstream identification; competing-adjunct ranking under policy.
- Acceptable verifier trust roots; revocation **without destroying reproducibility**.
- Smallest behavioral-semver rule worth implementing first (vector-invalidation only?).
- First registry shape: **local index vs. service vs. both** — note the agent fast-oracle requirement argues *local checker first, service for discovery/verification.*
- Exact line between IRREVERSIBLE "design now" and HOOK-NOW "reserve" for the assume/guarantee surface (how minimal can the v6 subset be without foreclosing v7?).
- **Which totalization for bounded arithmetic** — saturating vs. wrapping vs. interval-typed are *not* interchangeable (different program semantics); Gemini's pass establishes that *some* total discipline is IRREVERSIBLE, but *which* is its own design fork.
- **Does the v6 contract surface already express declared guarantee-weakening?** — decides whether adapter declaration syntax is genuinely IRREVERSIBLE or falls out of the contract surface for free.

## Adversarial pass — Codex (2026-06-18), applied

Five findings, all assessed and accepted as patches above:

1. **`registry-verified` made target-qualified everywhere** (`registry-verified(ts-js)`) — it was at risk of reading as a general trust mark in the first slice, which would be the document's own overclaim.
2. **A skeletal adjunct *binding* pulled into slice 1** (namespace + hash binding only; richness still deferred) — the TS/@types thesis rests on third-party binding, so it must be proven early.
3. **The proof row split** — a *minimal proof-dependency identity model* is now **design-now** (behavioral semver depends on it and it can't be retrofitted onto already-emitted proofs); the *full proof-artifact schema* stays reserve.
4. **The P/R/X matrix relabeled non-normative**, with **P** as *conditional* candidate-preservation under stated side conditions — handed to Gemini's formal pass.
5. **The v6 "nothing more" claim softened** against the unsettled-boundary open question.

Codex's verdict: *do not restart the loop; this is good enough to feed a decision record.*

## Formal pass — Gemini (2026-06-18), applied

Gemini's formal-methods review caught three errors in the P/R/X matrix that **both Opus and Codex missed** — a shared-LLM blind spot, and the clearest validation of the decorrelated third-reviewer choice:

1. **Hierarchical reachability `P`→`R`** — a parent's preemption can make a child-reachable state dead; reachability is not preserved downward.
2. **Wiring determinism `R`→ `P`(sync)/`X`(async)** — re-verification can't *confer* determinism; it's structural.
3. **Sequential deadlock-freedom `P`→`P*`** — preserved only if the compiler proves `Postcondition(A) ⟹ Precondition(B)`.

It also added two IRREVERSIBLE v6 rows (**bounded/total arithmetic**; **adapter declaration syntax**), a v6→v7 **push-up** (pushdown/petri rungs — pending the boundary audit), and a **formal endorsement of loop-first** (Option B).

**Process amendment (to fold into `PROCESS.md` separately):** Phase 3 should require an external formal-solver/persona gate before Phase 4 whenever a design proposes a matrix of logical/algebraic properties — a rule Gemini's own pass just proved necessary, since two general reasoners shared the same matrix blind spot.
