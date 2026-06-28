# Blind Think-Through — the process

> **This is the canonical document. Use this one.** It supersedes the six proposal files (`../blind-thinkthrough-{opus,codex}-proposal{,-2,-3}.md`), which are kept as the audit trail of how it was reached.
>
> A two-model process for folding a topic *larger and harder than anything currently in the v6 megaspec* into the spec, by having two models (Opus + Codex) reason independently before converging. Reconciled by Opus from Codex v3's scaffold and Opus's framing. 2026-06-17.

## What this is for

A topic this hard fails in a predictable way: it **collapses too early into the first plausible design**. This process exists to stop that — by producing two independent committed designs, making them fight fairly, refusing to average them, and gating every spec edit behind a decision record and an *executable* conformance sketch.

## The core bet

The value of two models is **not** that they might agree — agreement can be shared clarity or a shared blind spot. The valuable signal is **structured disagreement**.

> Use disagreement to think better, and use artifacts to keep that thinking from evaporating before it becomes spec.

The **method** is adversarial (each review tries to break the other design hard enough that the surviving parts deserve confidence); the **goal** is collaborative (a better joint design). Designs are written **committed and falsifiable**, not hedged — easier to attack is better.

## The order, in one line

```text
cold brief → blind designs → cross-review (with self-revision) → synthesis
→ provisional decision → minimal VM/conformance sketch → final decision
→ spec-patch plan → megaspec edit
```

**Never edit the megaspec before the final decision record and the conformance sketch exist.**

## Folder layout

One folder per top-level topic, leaving a durable audit trail:

```text
notes/superpowers/specs/<topic-name>/
  00-topic-brief.md                    # human-authored, neutral
  01-codex-blind-design.md
  02-claude-blind-design.md
  03-codex-cross-review.md             # includes self-revision
  04-claude-cross-review.md            # includes self-revision
  05-synthesis.md                      # see dual-synthesis option below
  06-provisional-decision-record.md
  07-minimal-vm-conformance-sketch.md  # the readiness gate
  08-final-decision-record.md          # the gate that unlocks spec editing
  09-spec-patch-plan.md
```

Copy `topic-template/` to `<topic-name>/` to start. `<topic-name>` is lowercase hyphen-case.

**Dual synthesis (preferred for the biggest topics).** Replace `05-synthesis.md` with `05-codex-synthesis.md` + `06-claude-synthesis.md` + `07-merged-synthesis.md` and renumber the rest. This carries the anti-anchoring principle into the synthesis stage so no single model becomes the unchallenged arbiter of its own work. When only one synthesis is written, it **must** carry a bias note (`where this may be biased / what the other model emphasized more / which disagreements remain`).

**Scale the ceremony to size.** The full 00–09 run is for the top-level hard topic. When Phase 1 decomposition finds N subsystems, each runs a lighter loop — `brief → two blind takes → short cross-review → one-page synthesis → one-paragraph decision` — with an explicit dependency order. Process is a thinking tool, not a tax.

## Phase 0 — Cold brief (`00`)

The human writes the topic **once** and hands the **same text** to both models, with **no lean toward a solution**. Leading the brief is the fastest way to destroy the value of two independent takes.

Include: problem statement; concrete examples; why it might belong in v6; why it is difficult; expected users; non-goals; hard constraints; what success looks like; what failure looks like; VM-portability implications for 40+ languages; codegen implications; proof/safety implications; performance concerns; compatibility concerns; open questions.

Do not include either model's opinion, or any spec prose.

## Phase 1 — Independent blind designs (`01`, `02`)

Each model designs separately and blind, to the **shared skeleton** so outputs are diff-able. Committed and falsifiable, not hedged.

### Required skeleton

1. **Problem restatement and decomposition** — one feature or several subsystems? what separates? what dependency order?
2. **Strongest version of the idea** — its best form; what problem it's *really* solving.
3. **Classification** — portable VM core / normative source-language core / optional extension / target-specific extension / tooling / roadmap-research / deferred-rejected.
4. **Core model and abstractions** — new concepts; which are user-facing; *which (if any) exist only below the surface*. (See the per-topic guard below — "none" is a legitimate answer.)
5. **Fit with the existing spec** — reuses / adds / changes / breaks; which megaspec sections are touched.
6. **Canonical VM artifact impact** — new fields/instructions? new canonical value forms? affected semantic hashes? schema/version changes? can all runtimes consume the same artifact? *(A topic may legitimately propose a small change, a large change, or **no** artifact change — but it must answer, not skip.)*
7. **Canonical trace and conformance impact** — required trace events; positive / edge / negative / replay vectors; byte-for-byte canonical outputs.
8. **Source grammar and semantics sketch** — only enough syntax to expose the model; keep grammar subordinate; don't let syntax freeze the wrong abstraction.
9. **Verification story** — preserves finite/checkable? replay-as-source-of-truth? host-agnostic? bounded-by-default? which verifiability band? what proof obligations?
10. **Codegen story** (distinct from runtime semantics) — can generated code preserve the semantics and emit compatible traces? what must generated manifests report? which targets struggle?
11. **Performance budget** — fast vs. checked vs. replay/debug mode; what's erasable after check/build; unavoidable cost.
12. **40+ language portability risks** — dangerous host differences; what belongs in the host ABI; permitted vs. forbidden variance.
13. **Hardest risks** — what could make it fail; what could break v6's identity; what's expensive to reverse.
14. **Phasing and borders** — v6 / v6.x-later / experimental / aspirational. Label every piece.
15. **Open questions and recommendation** — what the human must decide; proceed/split/defer/reject; the smallest testable slice.

The two blind designs must not see one another.

## Phase 2 — Cross-review with self-revision (`03`, `04`)

Reveal both blind designs to both models. Each writes an adversarial-but-fair critique, then revises its own position **where genuinely persuaded** (not as a concession ritual). Answer: where they agree / disagree and why; the disagreement that matters most; what the other caught that I missed; what's outright wrong, and what's *stronger*, in the other design; understated risks; what I'd revise in my own design; which option better preserves the §2 principles / VM-artifact portability / clean conformance vectors / an honest codegen story; which decisions go to the human.

**Do not average the designs.** A compromise that inherits both weaknesses is worse than a clear fork — preserve the fork.

## Phase 3 — Synthesis (`05`)

Decision-ready, not consensus-shaped. Dual synthesis preferred (see layout); single-driver-with-bias-note acceptable. Lock the agreements; take the stronger frame and graft the best ideas from the runner-up; apply the arbiters below to surviving disagreements; surface what they can't settle as explicit forks for the human.

Options table columns: `option | description | benefits | risks | VM artifact impact | trace/conformance impact | source-language impact | codegen impact | proof impact | performance impact | 40-language portability impact | recommended status`. Plus: locked agreements; strongest frame; ideas grafted from the other design; unresolved forks; decisions for the human; smallest testable slice; reasons not to proceed.

## Phase 4 — Provisional decision record (`06`)

What appears worth pursuing, *before* writing normative prose. Classify (same taxonomy as skeleton item 3). Record: provisional decision; rationale; rejected alternatives; unresolved forks; required VM-artifact changes; required conformance vectors; required trace changes; host-ABI requirements; proof/safety requirements; performance budget; portability requirements; revisit condition.

Provisional because Phase 5 can still prove the idea isn't executable enough for spec work.

## Phase 5 — Minimal VM/conformance sketch (`07`) — the readiness gate

The smallest executable surface, before any normative prose: 3 minimal positive examples; 3 edge cases; 3 negative examples with expected diagnostic codes; expected canonical VM-artifact snippets / schema deltas; expected canonical trace snippets; expected replay behavior; host-ABI behavior, if any; codegen-preservation requirements; proof obligations; performance-sensitive cases; target capability-manifest changes.

> **Readiness rule:** if the topic cannot be sketched as *VM artifact + canonical traces + conformance vectors*, it is not ready for normative spec work.

This is the falsifiability test, not bureaucracy.

## Phase 6 — Final decision record (`08`) — the gate

After the sketch exists, confirm or revise the provisional decision: proceed/split/defer/reject; exact v6 scope; exact later scope; required spec patches; required conformance artifacts; required implementation plans; required proof/performance work; remaining human decisions. **Only this final decision unlocks megaspec patching.**

## Phase 7 — Spec-patch plan (`09`)

Every document and artifact that must change: normative sections; rationale sections; roadmap sections; examples; feature-registry entries; VM-artifact schema; trace schema; conformance vectors; diagnostics; capability manifests; codegen requirements; proof-artifact requirements; performance-benchmark requirements. Then — and only then — enter the normal `brainstorming → writing-plans → implementation` discipline and edit the megaspec.

## The portability contract (resolved)

The one substantive correction the two models worked out: for the stated **40+-language VM + codegen goal, conformance vectors are necessary but not sufficient.** The portable contract is four parts:

1. **Canonical VM artifact** — the shared semantic object: versioned, hashable, consumed by runtimes, preserved-or-generated by codegen. **Defines intended meaning.**
2. **Canonical traces / conformance vectors** — executable validation: cross-runtime trace equivalence, replay validation, diagnostic validation. **Derived from the artifact; proves implementations honor it.**
3. **Host ABI** — the boundary for hooks, effects, timers, external results, and errors: identical semantics across languages; target-specific wrappers allowed *outside* the boundary.
4. **Capability manifests** — honest reporting of what a runtime or generator preserves: explicit declared downgrades for unsupported semantics; **no silent semantic erosion.**

This is *VM artifact **plus** conformance vectors*, not versus. The artifact defines what must be portable; the traces prove it is.

### Precedence rule (how this reconciles with "replay as source of truth")

The four layers answer **different questions**, which is why the apparent conflict with the existing §2 invariant dissolves:

- The **canonical artifact's defined semantics are the source of truth for *meaning*** — what a conforming run *should* do.
- **Conformance vectors are the checkable projection of that meaning** and must agree with the artifact. If a vector contradicts the artifact's defined semantics, the **vector** is wrong (it is derived, not authoritative).
- **Replay remains the source of truth for a *recorded run*** — a question about *recorded fact*, not intended meaning. It does not compete with the artifact; it pins what actually happened in a session.
- **Any permitted divergence must be declared in a capability manifest.** Nothing diverges silently.

So "canonical artifact" (meaning) and "replay as source of truth" (recorded fact) coexist without contradiction. **Per-topic guard:** the four layers are a *frame*, not a quota — a topic may honestly add nothing to the artifact layer, but it may not declare artifact-level portability out of scope.

## Arbiters for disagreement

Before taste, use the §2 design principles and verification invariants: bounded by default; finite/checkable where possible; replay as source of truth; host-agnostic semantics; canonical VM-artifact clarity; trace-equivalence conformance; explicit effect boundaries; codegen truthfulness; performance-profile clarity; portability to 40+ languages.

**Never split the difference.** What the arbiters can't settle is a real decision for the human, stated plainly.

**Principle-violation report.** A topic this hard may *legitimately* strain an invariant (e.g. finite/checkable). Do not auto-reject and do not hand-wave — write a report: `principle affected / how it strains it / benefit that justifies the strain / containment strategy / whether the strain is core, extension, or roadmap only`.

## Failure modes to watch

Anchoring (one model sees the other's frame too early); false consensus (both bless a weak design); incomparable essays (no shared skeleton); split-the-difference synthesis (incompatible designs averaged); grammar-first lock-in (syntax freezes the wrong model); **trace-only portability** (examples pass but the semantic artifact stays underspecified); **VM-only portability** (artifact exists but conformance doesn't prove it); codegen fantasy (targets claim semantics they can't preserve); proof hand-waving (the topic abandons finite/checkable or replay while keeping safety language); roadmap gravity (an exciting idea becomes a v6 commitment without a minimal executable slice); ceremony for its own sake (the full 00–09 run on a sub-piece that needed three files).

## What the driver needs to start

Only **Phase 0 — the cold brief.** Nothing about what the other model thinks until Phase 2.
