# Fable on the v6 Spec Set — The Era Roadmap

> **Author:** Claude Fable 5, from a convergence discussion with John Haugeland, 2026-07-04.
> **Status:** Agreed working decomposition — a sequencing map, not a scope commitment. Each era
> still owes its own brainstorm → spec cycle before it becomes a plan.
> **Scope:** The v6 corpus (read at `v6` @ `c03bcdeb`) is not one major version; it is a
> multi-major program. This document records the agreed cleave into eras, the theme and contents
> of each, and the sequencing arguments — so the next reader doesn't re-derive them.
> **Companions:** `fable_sum_critique.md` (corpus critique), `fable_sum_omissions.md` (gaps).
> **Naming note:** In-corpus "v7" labels (registry-close's "v7, not v6"; strict-mode-in-7; alias
> removal) predate this decomposition and are now **obsolete shorthand for "post-v6"** — taken
> literally they would make v7 v6-sized again. This document supersedes that naming; the version
> numbers below are provisional era labels, not release promises.

> **AMENDMENT (2026-07-04, later the same day — versioning model, confirmed by John):**
> **Breakage-batch-opens-major.** Era 0 is not a 5.x finale: it **ships as 6.0.0**, carrying the
> currently-decided breakage batch AND the v6 integration branch's completed content (merged
> home in "the One Merge"), ending the toxic dual-track permanently. Era 1 is then purely
> additive and fills the **6.x series** (no major of its own); each later era opens its major
> with its own batched breakage (if an era accumulates none, its major is a milestone bump).
> Only eras 0 and 1 change labels; v7–v12 stand. Execution detail lives in
> `notes/superpowers/eras/era-0-cleanup-and-6.0.md`.

## The sequence

| # | Era | Ships as | Theme in one line |
|---|-----|----------|-------------------|
| 0 | **Cleanup → 6.0** | 6.0.0 | End the 5.x line: triage, breakage batch, the One Merge, dragon suite live, dual-track retired |
| 1 | **Language + Contract** | 6.x | FSL becomes a typed, replayable data machine — and locks the portability contract |
| 2 | **Society** | 7.0+ | Machines get I/O and each other: channels, systems, factories, populations, supervision |
| 3 | **Proofs** | 8.0+ | The verification stack proper: temporal, backends, composed checking, the testing toolkit |
| 4 | **Survival** | 9.0+ | Durable execution: machines that outlive processes, versions, and their authors |
| 5 | **Trust** | 10.0+ | Proofs and runs become portable, signed, revocable social objects |
| 6 | **Fleet** | 11.0+ | The multi-host fan-out, certifying a stable language against the era-1 contract |
| 7 | **Ecosystem** | 12.0+ | The registry and the agent economy: other people's machines |

## Era 0 — Cleanup → 6.0 (ending the 5.x line)

Ships as **6.0.0**. Four jobs: (1) tracker triage per the disposition rulebook (bugs, hygiene,
the strict-mode prerequisite cluster's burn-down, June-audit re-verification — omissions D11);
(2) the **breakage batch** — atom charset #754, `jssm-*` synonym removal, probabilistic
list-target split, and (long pole, with a 7.0 fallback) the §27 bare-functions/`jssm/compat`
split; (3) **the One Merge** — the v6 integration branch merges home once, its completed content
(val core, tapes, M3 replayer, canonical serialization, codegen/import/export) becoming 6.0's
feature payload, after which the dual-track and its merge-up tax are retired and development is
trunk-based on main forever; (4) the **stochastic dragon** suite brought live (harness exists;
see the era-0 brief) so the parser/compiler are hardened before era 1 builds on them.

## Era 1 — the 6.x series: Language + Contract

**Language half:** `val`/`prop`/`sensor`; the scalar→container type system; expressions;
`assign`/`where`; contracts as runtime asserts + safety-only checking (reachability,
invariants); the RTC macrostep model; the error model; overlapping groups (§19, incl. the #454
resolution); tapes + deterministic replay (M3, shipped-shaped); the bare-functions JS API (§27);
editions/feature-gate plumbing; the small CLI (parse/lint/format/render/run/config).

**Contract half (the cleave — promoted from the old late polyglot era):** the canonical
IR/artifact, host ABI, canonical serialization with **all pinning rules decided now** (newlines
— the CRLF hazard, omissions D1 — Unicode version, number formatting, key order), the canonical
`source_hash` spec, the conformance-vector format, **and one deliberately boring second
implementation** (Rust is the leading candidate: differential CI at N=2, plus the WASM
toolchain distribution for free).

**Why the contract moves here:** pinning decisions deferred are pinning decisions made
implicitly by V8's behavior, and each becomes exponentially harder to change once anything
hashes, signs, or replays it. N=2 differential testing buys ~90% of the timebomb prevention at
~1.3× cost, versus retrofitting a fleet at 5×. Registry-close's twelve IRREVERSIBLE rows are
mostly this contract; the advisory corpus (v6_suggestions, codex) independently demanded it.
Free synergy: the conformance trace format cannot be defined without writing the
operational-semantics appendix — so the contract work forces the corpus's most dangerous
missing document into existence.

## Era 2 — v7: Society

Channels/`emit`, sensors wired for real, time-as-sensor, multi-machine systems and wiring,
factories and the seed tree, populations/routes/`spawn`/`retire`, supervision (restart
intensity, the composition tree as supervision tree), machine-val embedding, system rendering
(§24). Carries the breakage formerly filed under the old "v7" shorthand where it still fits:
`property`/`var` alias removal, strict mode.

## Era 3 — v8: Proofs

Temporal properties and the Dwyer prelude; checker backends (nuXmv/Spin/Storm) with
differential checking; probabilistic/PCTL; composed-system verification and assume-guarantee;
the model-class ladder's upper rungs (`pushdown`/`petri`/`tree` — the Gemini push-up lands
here, resolving the §3 conflict flagged in the critique); the user testing toolkit
(test/expect blocks, MBT, shrinking, statistical MC); behavioral diff/refinement; `minimize`.
Unsigned certificates and the `replayed` receipt slice *may* trail into the end of this era —
the crypto perimeter is what belongs to v10, not the artifact formats.

## Era 4 — v9: Survival (production / durable execution)

The era the corpus currently prices at one paragraph plus ring rows, added to the sequence as
its own major by explicit decision (2026-07-04).

**Contents:** the persistence contract (#813 — durable tape/snapshot storage;
resume-after-crash = rehydrate + replay tail + continue); **recorded hook returns** (the §11
effect boundary in anger — omissions D10's missing format slot; at-least-once vs exactly-once,
idempotency of replayed effects, post-commit failure compensation, crash-mid-macrostep
recovery); **`migrates from`** (typed snapshot lifting for mid-flight instances); the OTel
flight recorder; behavioral drift detection; `calibrate` (model → simulate → drift → calibrate
→ **re-prove**); hot member upgrade; production forensics (`run --amend`, `diff` over runs,
`inspect --redact`, `bug`); the 5.x snapshot-lift policy decision (omissions D9).

**Why it is its own era, not a ring:**
1. It is the only era whose subject is time in the deployment sense. Every other era treats a
   run as an artifact you can regenerate; this one treats it as a liability you must carry —
   state at rest, effects that already happened, upgrades landing mid-macrostep.
2. It is where "mostly assembly, not invention" is least true. Post-commit failure, delivery
   semantics, and crash recovery are the corners incumbent durable-execution vendors staff
   armies against; the corpus underprices them.
3. It has the worst breakage profile — snapshot/tape/persistence changes break *running
   long-lived instances* — so it should own its own breakage batch, and there is a deliberate
   self-reference in having the era that makes upgrades safe land `migrates from` + version
   gating together, as its own first beneficiary.

**Sequencing constraints (decided):**
- *After Proofs*, because without v8 this is just another durable engine in a crowded
  category. The differentiator is the compound sentence — certified workflows whose incidents
  are replayable counterexamples; drift needs the Markov analytics, SLO contracts need PCTL,
  `calibrate` ends in re-prove. (Pragmatic softening allowed: safety + statistical MC may be
  enough to launch on, with full PCTL/SLO trailing.)
- *Before Fleet*, because recorded hook returns and persistence hooks belong in the **host
  ABI**. If the fleet fans out first, N runtimes get retrofitted — the CRLF timebomb shape,
  one level up. Survival finalizes the ABI's durability/effect surface; the fleet inherits it
  finished.
- *Before Trust* (order was flexible; decided this way): the `witnessed` receipt tier wants
  provenance-signed inputs, which is what production capture provides, and the flight recorder
  is what makes "receipt over a real production run" a one-click object.

**Commercial note:** verification is the moat; durable execution is plausibly the market. This
is the era where the outward story changes from "interesting language" to "infrastructure you
buy" — the strongest business case for pulling work forward, resisted only as far as the
v8-differentiation argument requires.

**Process note:** this era needs its own brainstorm → spec cycle at least the size of the
receipts one, precisely because the least of its machinery already exists.

## Era 5 — v10: Trust

Certificate signing, the transparency log (with the equivocation/split-view question from
omissions D3 answered — witness cosigning or equivalent), revocation/advisories, `verify`
sweeps, lockfiles, redaction-with-proof at scale, and signed run-receipts through the full tier
ladder (`hosted`/`witnessed`, holder-key, trusted event time). Prerequisite before spec-work
hardens: the security-adversarial review pass the trust stack has not yet had.

## Era 6 — v11: Fleet

The multi-host fan-out against the era-1 contract: Rust/C/Python/… runtimes and codegen
targets, T1→T3 tier growth, typegen across hosts, package manifests, adapter targets with
golden-trace conformance, capability negotiation in anger. Lands here so it certifies a stable
language (through Survival's ABI surface) instead of chasing a moving one — and so the
headline claim includes the expression language and proofs, not just portable topologies.

## Era 7 — v12: Ecosystem

The registry proper (loop-first slice per registry-close, then the metadata economy),
guardrails/MCP as product, semantic patches, `query` fleet governance, `infer`/`synth`, the
manual/curriculum/eval corpus at full scale, the certified stdlib as a public catalog. The era
of other people's machines — which is why it is last: every earlier era exists to make a
stranger's machine safe to trust.

## Standing rules across eras

- **Ring discipline is the whole game.** The corpus's own reviewers identified the failure
  mode: ring items quietly becoming release criteria. Each era ships its theme; adjacent-ring
  material needs an explicit pull, recorded in the decision log.
- **Every era's breaking changes batch at its boundary** (the editions doctrine, applied to the
  program itself).
- **Irreversibles land early regardless of era theme:** anything hash-shaped, ABI-shaped, or
  serialization-shaped gets specced when first touched, at contract quality — that is the
  lesson of the cleave, generalized.
- **The blind-thinkthrough process gates the hard eras.** Survival and Trust both qualify as
  "larger and harder than anything currently in the megaspec"; they should run the PROCESS
  loop (with a security-lensed reviewer for Trust, per the PROCESS amendment) before their
  specs are written.
