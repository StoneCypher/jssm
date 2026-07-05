# v13 — The Durable Machine (long form)

**The PROCESS run (gate, first deliverable).** *Manager:* Before any code: the two-model
blind-design cycle the receipts spec got, because this era is priced at a paragraph and is
actually Temporal's hardest terrain. Its output IS this era's real spec. *CS:* PROCESS.md
00–09 flow; cold brief covers: persistence contract, effect recording, crash-mid-macrostep,
delivery semantics, snapshot schema evolution; conformance-sketch gate before normative text.

**Persistence contract + resume (#813).** *Manager:* Machines survive process death: tapes
and snapshots live somewhere durable, and restart means rehydrate + replay the tail +
continue — the durable-execution engine for the price of a contract. *CS:* pluggable store
API (append tape segment, write snapshot, read-latest); resume = deserialize snapshot
(version-gated) → replay tape suffix per C2 → continue; crash-mid-macrostep = journal never
persisted mid-step ⇒ reaction re-executes from last commit (exactly-once state, at-least-once
effects — hence recording, below); snapshot cadence policy configurable.

**Recorded hook returns + determinism ledger.** *Manager:* The effect boundary made real:
external calls record their answers, replay consumes recordings and never re-fires the
world. This also unlocks receipts over hooked machines — the v14 scope limit dies here.
*CS:* fills irreversibles #4: per-call record {call-site id, args-hash, return, seq} in the
ledger stream beside the tape (chosen shape: sidecar ledger, tape stays stimulus-pure);
replay: missing recording = refusal (§15), re-fire only under explicit `--live`; idempotency
annotations honored on re-execution after crash.

**`migrates from` + hot upgrade + canaries.** *Manager:* v2 deploys while v1 instances are
mid-flight: a declared, verifier-checked lifting of old snapshots into the new val schema —
and with supervision, live member replacement and weighted canary cohorts fall out. *CS:*
`migrates from v1 { new := expr(old...); }` blocks; checker: lifted states in-domain +
contracts hold + refinement verdict; hot upgrade = retire-with-snapshot → lift → restart from
v2 factory inside dispatch; `via factory weighted [v1 90% v2 10%]` + cohort drift comparison.

**Flight recorder + drift + calibrate.** *Manager:* The tape is already the telemetry: OTel
export makes machines native to any observability stack, drift detection turns statistical
surprise into pre-outage incidents, and `calibrate` closes the loop by correcting the model
from production — then re-proving it. *CS:* OTel mapping (transition=span/event, val
deltas=attrs, machine/system=resource) + one-call repro-bundle export per trace window;
drift = live transition stats vs §17 Markov prediction (test: χ² or KL threshold per edge);
`calibrate` emits weight/binding corrections as reviewable diff, never silent.

**Forensics + policy decisions.** *Manager:* Debugging becomes interrogating history:
counterfactual replay, run diffs, provably-safe redaction, self-proving bug reports — plus
the two decisions this era owes (5.x snapshot lift; both recorded even if the answer is
"refuse"). *CS:* `run --amend val=v|--amend-input step=N` forks handed to `diff` (first-
divergence report); `inspect --redact` via verifier-emitted map (unread-by-guards ⇒
pseudonymize, replay stays bit-identical; load-bearing flagged); `bug` = redacted bundle +
narrated trace + CI auto-replay labels; `doctor` env table; D9 decision: 5.x serializations
lift-or-refuse, written; §29 security/effects appendix drafted w/ v14's review.
