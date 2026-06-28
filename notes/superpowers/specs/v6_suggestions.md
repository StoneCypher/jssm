# v6 Suggestions

> Audience: Claude, or another model/spec author working on the v6 megaspec.
>
> Purpose: use this as design guidance. These are recommendations, not a command
> to implement all of them immediately. The central theme is to improve safety
> and proof characteristics while preserving backwards compatibility and runtime
> performance.

## Summary

The safety/proof system should become a spine of v6, but it should be
descriptive first and restrictive only in explicit strict profiles.

Existing machines should continue to parse and run with their current semantics.
New safety machinery should classify their proof/replay/codegen status honestly:

```text
runs: yes
deterministic replay: partial
proof profile: unchecked / unsafe effects present
portable codegen: limited
```

That gives FSL stronger guarantees without turning old FSL into invalid FSL.

## Core Recommendation

Make v6 an executable specification language with explicit assumptions and
portable evidence.

In short:

> FSL programs are executable specifications. Verified FSL programs are
> executable specifications plus explicit assumptions and inspectable proof
> artifacts.

This is the difference between "the checker says okay" and a durable safety
story that tools, humans, generated code, and other hosts can all inspect.

## 1. Add An Explicit Effect Model

The biggest safety hazard is not the type system. It is external effects crossing
transactional, rollback, and replay boundaries without a hard contract.

Classify every expression, action, hook, and host callback into an effect class.
Suggested starting lattice:

```text
pure
  No host effect, no time/random/network, deterministic from inputs.

deterministic-observed
  Reads deterministic host context that is part of the machine input or snapshot.

recorded-external
  Calls the outside world, but the return value is recorded and replay consumes
  the recording instead of calling the world again.

post-commit-effect
  Irreversible effect that may occur only after the machine state has committed.

unsafe
  Opaque or irreversible behavior whose replay/proof semantics are not known.
```

Compatibility rule:

- Existing unannotated hooks should default to `unsafe` or `opaque`, not become
  illegal.
- Strict profiles may reject `unsafe`.
- Normal run mode should still execute existing hooks as it does today.

This lets the language say something precise without breaking current users.

## 2. Define Transaction And Replay Boundaries Precisely

The spec should define macrostep execution with enough precision that two host
implementations cannot disagree about when state changes become visible.

Define, at minimum:

- macrostep start;
- event selection;
- guard evaluation;
- assignment timing;
- internal event queue behavior;
- eventless cascade behavior;
- invariant check timing;
- rollback order;
- commit point;
- observer timing;
- post-commit hook timing.

Recommended semantic rule:

- Pure and recorded calls may happen inside the transaction.
- Irreversible external effects should happen only after commit.
- If an irreversible effect must happen during a transition, it should require an
  explicit unsafe/idempotent/non-transactional annotation that colors the proof
  status.

Replay rule:

- Replay should consume recorded external returns.
- Replay should refuse missing recordings by default.
- Calling the world again during replay should require an explicit unsafe mode.

## 3. Use Verification Bands Instead Of One Word Like "Finite"

The current language around `finite`, `checkable`, and `rich` should be made
consistent. I recommend separating the concepts:

```text
legacy
  Existing FSL behavior. Runnable, not necessarily proof-classified.

small-finite
  Entire state space is finite and explicitly enumerable.

symbolic-finite / checkable
  State space is finite or bounded but too large to enumerate directly; verifier
  may use symbolic methods, SMT, intervals, or abstract interpretation.

bounded-rich
  Rich behavior with stated analysis bounds. Some properties may be checked, but
  results can be partial.

unchecked-rich
  Runnable behavior outside the current proof model.
```

This helps the CLI and docs report truthfully:

```text
verified: partial
profile: bounded-rich
unknown: liveness, external effect replay
```

## 4. Generate Verification Conditions

Transitions should be able to produce explicit proof obligations.

Useful contract surfaces:

- transition preconditions;
- transition postconditions;
- machine invariants;
- emitted event contracts;
- assignment type/range obligations;
- effect capability obligations;
- determinism/replay obligations;
- totality or exhaustiveness obligations where requested.

The checker should report not only pass/fail, but also `undecided` when the
property is outside the selected verifier's capability.

Avoid pretending that "not disproved" is the same as proved.

## 5. Emit Proof Artifacts, Not Just Pass/Fail

Verification should create an inspectable artifact. Suggested contents:

```text
machine hash
spec edition
source hash
verifier version
solver/backend version
target profile
assumptions
capabilities required
capabilities available
properties proved
properties failed
properties undecided
counterexamples
witnesses
runtime checks required
unsupported language features
```

This artifact should be stable enough for CI, generated code manifests, and
human review.

## 6. Preserve Backwards Compatibility

The compatibility policy should be explicit:

- Existing FSL keeps its current meaning.
- Proof annotations are optional.
- New keywords should be context-sensitive where possible.
- Unannotated host hooks default to unsafe/opaque rather than being rejected.
- Strict proof behavior is opt-in through a file directive, profile, edition,
  CLI flag, or verifier mode.
- Normal parse/run should remain permissive unless a strict profile is selected.
- Formatters and checkers may warn, but warnings should not become breaking
  errors in legacy mode.

This allows a migration path:

```text
old file -> runs
old file + check -> classified
old file + annotations -> partially verified
old file + strict profile -> proof obligations enforced
```

## 7. Protect Runtime Performance

Most safety/proof work should happen at build/check time, not on the transition
hot path.

Runtime profiles should be distinct:

```text
fast
  No solver calls.
  No full trace retention.
  No runtime contracts beyond ordinary guards.
  Effects execute directly.

checked
  Runtime assertions only where requested or required by the proof artifact.
  Optional event/output recording.
  Manifest validation available.

replay/debug
  Retained tapes.
  Recorded external returns.
  Rich diagnostics.
  Determinism checks.
```

The default runtime overhead should be limited to cheap metadata:

- spec edition;
- feature flags;
- effect/capability tags;
- optional transition metadata;
- proof artifact pointer/hash when present.

Do not require every transition to validate a proof certificate at runtime.
Do not retain every tape in fast mode.
Do not make all contracts hot-path checks by default.

## 8. Add Target Capability Manifests

Every codegen target should state what it can preserve.

Example:

```text
target: native:typescript
preserves:
  - deterministic transition selection
  - forced transition distinction
  - typed state names
does_not_preserve:
  - symbolic proof certificates
requires_runtime_checks:
  - range refinements
refuses:
  - unsafe replay hooks in strict profile
```

This prevents a generated target from silently erasing semantics such as forced
transitions, effect restrictions, or replay behavior.

## 9. Make Refusal A Feature

The compiler/checker should be comfortable refusing a requested guarantee while
still allowing normal execution where appropriate.

Good refusals:

```text
This machine is runnable, but not verifiable under profile small-finite.
Reason: hook `fetchPrice` is unsafe and not recorded.

This machine can be rendered, but target native:typescript cannot preserve
semantic feature `durable timer`.

This machine can be replayed only if external result tape is supplied.
```

The language gains trust when it declines to overclaim.

## 10. Add A Security And Trust Model

The megaspec touches hooks, MCP, generated code, replay, certificates, and
potentially untrusted machines. That needs a security model.

At minimum, define:

- trusted vs untrusted machine documents;
- trusted vs untrusted host functions;
- effect permissions;
- file/network/process access policy;
- certificate trust roots, if certificates exist;
- whether proof artifacts are advisory or enforceable;
- how generated code communicates unsupported semantics;
- whether replay artifacts may contain secrets.

This does not need to be huge, but it needs to exist before the spec uses words
like "safe", "pure", "guardrail", or "certificate" too confidently.

## 11. Make Conformance Vectors The Executable Spec

Conformance should be developed alongside semantics, not after implementation.

For every new semantic feature, require:

- positive vector;
- negative vector;
- parse/diagnostic vector where relevant;
- replay vector when relevant;
- codegen preservation vector when relevant.

The conformance corpus should include expected traces, not only final states.
Final states are too weak for proving event ordering, observer timing, rollback,
and emitted outputs.

## 12. Add A Status Matrix To The Megaspec

The megaspec currently contains core semantics, roadmap, product ideas, AI-agent
support, and long-horizon ecosystem design. That is fine while exploring, but
dangerous when models use the file as authority.

Add a status label to major features:

```text
settled-core
draft-core
committed-v6
candidate-v6.x
experimental
aspirational
deferred
```

This is especially important for Claude or another agent interpreting the file.
Without labels, a vivid paragraph can look like a binding requirement.

## 13. Use Editions And Profiles Separately

Do not overload "v6" to mean syntax version, proof strictness, runtime mode, and
product roadmap.

Suggested split:

```text
edition
  Language syntax/semantics version.

profile
  Verification or runtime guarantee level.

target
  Host/codegen backend and its capabilities.

mode
  CLI operation such as run, check, replay, render, codegen.
```

Example:

```text
edition: fsl-v6
profile: symbolic-finite
target: native:typescript
mode: codegen
```

This makes compatibility and proof status much easier to explain.

## 14. Add A Performance Budget Section

For each verification feature, the spec should state:

- when it runs;
- what it costs;
- whether it can be erased after checking;
- whether it requires runtime checks;
- whether it requires trace retention;
- what happens when the solver times out;
- whether the result is `pass`, `fail`, or `undecided`.

This prevents proof features from quietly becoming runtime costs.

## 15. Recommended Near-Term Phasing

Do the smallest thing that creates durable safety structure:

1. Define editions, profiles, and effect classes.
2. Add operational semantics for macrostep/rollback/commit/replay.
3. Add proof artifact schema.
4. Add target capability manifest schema.
5. Add conformance vectors for the new semantics.
6. Add CLI reporting that distinguishes runnable, replayable, portable, and
   verified.
7. Only then expand into richer verification, MCP, registry, synthesis, or
   fleet-level features.

## Additional Recommendations

### Prefer Proof-Carrying Diagnostics

Diagnostics should point to the exact assumption, effect, target limitation, or
undecided property that caused a downgrade.

Bad:

```text
Machine is not safe.
```

Good:

```text
Proof profile downgraded from symbolic-finite to unchecked-rich because
transition `load` calls hook `readClock`, which is unrecorded and not declared
deterministic.
```

### Keep The Runtime Library Small

Avoid making the runtime responsible for theorem proving. The runtime should
execute semantics, enforce requested runtime checks, and expose trace/replay
hooks. Heavy proof belongs in tooling.

### Design For Partial Success

Many real machines will be partially verified. Make that a first-class outcome.

Example:

```text
proved:
  - no invalid state names
  - range invariant `count >= 0`
  - deterministic event selection

undecided:
  - eventual delivery

unchecked:
  - external hook `sendEmail`
```

This is more useful than all-or-nothing verification.

### Make Unsafe Visible But Usable

`unsafe` should not mean "bad." It should mean "outside this proof contract."
Users should be able to run unsafe machines. They should not be able to
accidentally market them as fully replayable, portable, or verified.

### Keep The Spec Boring Where Proof Depends On It

The visionary material is good, but proof systems need boring precision:

- grammar;
- typing rules;
- transition semantics;
- effect boundaries;
- verifier result taxonomy;
- artifact schemas.

Put the inspiring parts in roadmap/strategy documents. Put the boring parts in
the normative core.

## Further Suggestions

These suggestions extend the earlier safety/proof recommendations. One prior
suggestion is intentionally omitted: do not add a detailed v5 semantic
compatibility mode unless a concrete migration problem later proves it is worth
the complexity. The fifth version of the language was weakly specified enough
that preserving it at that level would likely create more burden than value.

### Create A Tiny Normative Kernel First

Define the smallest v6 language that is fully specified, testable, replayable,
and codegen-preservable.

Everything else should attach to that kernel as an extension. This helps avoid a
spec where every interesting idea becomes part of the critical path.

The kernel should include:

- state declarations;
- transition declarations;
- transition selection rules;
- guard evaluation;
- assignment timing;
- effect classification;
- replay input rules;
- conformance trace format.

### Introduce A Canonical IR, But Keep It Off The Hot Path

FSL source should lower into a normalized intermediate representation that
verifiers, renderers, import/export, and codegen all use. Without this, every
tool will slowly grow its own interpretation of the language.

Performance concern: a canonical IR should not imply that production machines
interpret a heavy object graph at runtime.

Recommended guardrails:

- Build the IR at parse/check/codegen time, not per transition.
- Compile the IR into the existing fast runtime structures.
- Let fast mode discard proof-only metadata after compilation.
- Keep stable hashes/manifests for tooling, not huge retained ASTs.
- Make runtime IR interpretation an explicit debug/replay mode, not the default.
- Avoid requiring generated code to ship the entire IR unless a target asks for
  it.

The IR should be treated as the common semantic contract between tools, not as a
mandatory runtime engine.

### Be Strict About Nondeterminism

Specify ordering anywhere two hosts might otherwise disagree.

Areas that need explicit rules:

- object key ordering in serialized artifacts;
- transition selection order;
- internal event queue order;
- simultaneous event ordering;
- eventless cascade behavior;
- weighted choice normalization;
- random stream selection;
- timer ordering;
- sensor read timing;
- observer and hook ordering.

Hidden nondeterminism is especially dangerous because it can pass ordinary tests
while breaking replay and cross-host conformance.

### Define Numeric Semantics Without Making Every Number Expensive

The spec should define numeric behavior early because proof depends on it:

- integer bounds;
- rational or decimal semantics, if supported;
- float semantics, if supported;
- overflow behavior;
- division behavior;
- NaN and infinity policy;
- units and dimensional analysis;
- range/refinement checks.

Performance concern: do not accidentally require arbitrary-precision or
solver-friendly numbers on every hot transition.

Recommended guardrails:

- Keep the fast legacy/default numeric path cheap.
- Require exact integers, rationals, or decimals only when a file/profile asks
  for them.
- Allow proof tooling to reason over abstract numeric domains without requiring
  the runtime to use those representations.
- Let targets declare their numeric semantics in capability manifests.
- Require runtime checks only for contracts that cannot be discharged statically.
- Make overflow/range policy explicit per numeric type instead of implicit in
  the host language.

This gives proof a firm foundation without turning ordinary counters into a
performance liability.

### Make Time An Input, Not A Global

Timers, clocks, deadlines, and schedules should be modeled as events, sensors,
or tapes.

Direct clock reads should be effect-classified. In strict replay profiles, they
should be recorded or rejected. This is one of the simplest ways to prevent
replay from becoming "mostly deterministic except for the important parts."

### Add A Downgrade Taxonomy

When verification weakens, name the reason. Suggested downgrade codes:

```text
unsafe-effect
opaque-host-call
unsupported-target-feature
solver-timeout
unbounded-domain
noncanonical-import
missing-replay-tape
numeric-semantics-mismatch
runtime-check-required
```

These codes should appear in CLI output, proof artifacts, generated manifests,
and diagnostics. They make partial verification explainable.

### Require Conformance Vectors For Normative Features

No conformance vector, no normative feature.

For each new semantic feature, require:

- positive vector;
- negative vector;
- diagnostic vector where relevant;
- replay vector where relevant;
- codegen preservation vector where relevant.

Expected traces should be included, not just final states. Final states are too
weak to prove observer ordering, emitted output, rollback, and internal event
semantics.

### Define Import/Export Loss Accounting

Every importer/exporter should report what happened to semantics:

```text
preserved
approximated
dropped
synthesized
unknown
```

This matters if FSL becomes a hub format. A conversion can still be useful while
being honest that a guard, effect, timer, or probability distribution was
approximated.

### Add A Host ABI For Hooks

Define how host hooks are:

- named;
- typed;
- versioned;
- authorized;
- effect-classified;
- called;
- failed;
- recorded;
- replayed.

Without a host ABI, each runtime will invent its own callback semantics, and the
proof/replay story will fragment.

### Treat Failure Semantics As First-Class

Specify what happens when:

- guards throw;
- hooks fail;
- assignments fail;
- invariants fail;
- emits fail;
- serialization fails;
- replay data is missing;
- generated code reaches an impossible state;
- a post-commit effect fails after state has committed.

The post-commit failure case deserves special care. Once state has committed,
rollback may no longer be honest. The machine needs a defined compensation,
dead-letter, retry, or failure-reporting story.

### Keep The CLI From Becoming The Spec

CLI verbs should expose language semantics, not define them.

Put normative behavior in the language spec and conformance corpus. Then let
`check`, `render`, `codegen`, `import`, `export`, and `replay` be clients of that
behavior.

This reduces the chance that the CLI becomes the only place where real semantics
are encoded.

### Add A Boring Examples Suite

Create small examples that exist only to pin edge cases. These should not be
showcase demos.

Useful boring examples:

- assignment order;
- guard failure;
- rollback after invariant failure;
- internal event ordering;
- eventless cascade limits;
- forced transition behavior;
- invalid hook return;
- replay mismatch;
- weighted choice normalization;
- timer ordering;
- post-commit effect failure.

These are the examples future implementers and agents will actually need.

### Give Generated Code A Truth Label

Generated code should carry a manifest or header saying exactly what it
preserves and what it does not preserve.

Example:

```text
generated_from: machine.fsl
source_hash: ...
edition: fsl-v6
target: native:typescript
preserves:
  - deterministic transition selection
  - forced transitions
runtime_checks:
  - range invariant count >= 0
unsupported:
  - replay of unsafe hook sendEmail
```

Silent semantic erosion is worse than refusing to generate.

### Prefer Explicit Partial Verification

Make partial success normal and inspectable.

Example:

```text
proved:
  - no invalid state names
  - range invariant count >= 0
  - deterministic event selection

failed:
  - totality for action submit

undecided:
  - eventual delivery

unchecked:
  - external hook sendEmail
```

This is better than a single boolean. It also gives users a practical path from
"runnable" to "more verified" without demanding perfection all at once.

### Make Canonical IR And Conformance The Center Of Gravity

The strongest structural recommendation is to make canonical IR plus the
conformance corpus the center of the v6 effort.

The spec should define semantics. The IR should normalize semantics. The
conformance corpus should execute semantics. Codegen, import/export, render,
and verification should all orbit those three artifacts.

If those are strong, v6 can grow. If they are weak, every feature will need to be
rediscovered by every tool.

## More Recommendations

These recommendations are second-order, but they matter for keeping a large
language spec from becoming fragile as implementation spreads across runtimes,
codegen targets, import/export tools, and agents.

### Separate Safety From Liveness

Do not put "bad thing never happens" and "good thing eventually happens" in the
same undifferentiated `verify` bucket.

Safety properties usually ask whether something bad is reachable. Liveness
properties require assumptions about fairness, scheduling, delivery, progress,
timeouts, and external systems. Those assumptions should be explicit.

Recommended rule:

- safety checks can be core verifier features;
- liveness checks require named fairness/progress assumptions;
- proof artifacts should report safety and liveness separately;
- CLI output should not say "verified" when only safety was checked.

### Add Stable Diagnostic Codes

Human-readable diagnostic text will change. Stable diagnostic codes give tools,
docs, CI, tests, and agents something durable to key on.

Example codes:

```text
FSL_EFFECT_UNRECORDED
FSL_REPLAY_MISSING_TAPE
FSL_TARGET_SEMANTIC_LOSS
FSL_SOLVER_TIMEOUT
FSL_NUMERIC_SEMANTICS_MISMATCH
FSL_IMPORT_LOSSY
FSL_UNSUPPORTED_EXTENSION
```

The prose can be revised later. The code should remain stable within an edition
or have an explicit migration note.

### Define Canonical Serialization And Hashing

If proof artifacts, replay bundles, generated manifests, and machine hashes are
important, v6 needs canonical serialization.

Define what is hashed:

- original source text;
- normalized source;
- canonical IR;
- expanded machine;
- verifier input;
- generated target output, if relevant.

Recommended principles:

- whitespace and comments should not affect semantic hashes;
- semantic hashes should be based on canonical IR or expanded machine form;
- source hashes should still be retained for provenance;
- object keys and arrays need deterministic ordering rules;
- proof artifacts should say exactly which hash was verified.

Without this, "verified" can quietly become slippery because it is unclear which
artifact the proof actually applies to.

### Support Compositional Verification

For systems, factories, and multi-machine features, avoid requiring only
whole-world verification.

The spec should support assume/guarantee contracts:

```text
machine A guarantees events x, y and invariant p
machine B assumes events x, y arrive in order and p holds
system proof composes A and B under those contracts
```

This allows large systems to be checked in pieces. It also makes partial
verification more useful because one machine can expose a proof-bearing
interface without forcing every neighboring machine to be fully known.

### Make Lints Distinct From Proof Failures

Do not blend style, suspicious design, portability warnings, semantic errors,
and proof failures into one `check failed` bucket.

Suggested categories:

```text
parse-error
type-error
semantic-error
proof-failure
proof-undecided
portability-warning
style-lint
performance-warning
migration-warning
```

This matters for CI. Some projects will fail builds on proof failures while
allowing style lints or portability warnings.

### Add An Extension Mechanism

If v6 will grow, define how experimental and target-specific features are named,
gated, declared, and rejected.

Suggested features:

- explicit `requires` or `features` declarations;
- namespaced extensions;
- edition compatibility rules;
- diagnostic for unknown extensions;
- conformance vectors for promoted extensions;
- clear path from experimental to normative.

This is preferable to accidental dialects.

### Require Rejected-Alternative Notes For Major Decisions

Major design choices should include short rejected-alternative notes.

This does not need to be long. A useful shape is:

```text
Decision: external effects inside transactions are forbidden in strict profiles.
Rejected: allow arbitrary effects with best-effort replay.
Reason: replay and rollback would overclaim safety.
```

These notes are especially useful for future agents. They prevent settled design
from being re-litigated every time someone rereads the spec.

### Add Counterexample Minimization

When verification fails, the best output is a tiny repro.

The verifier should try to produce:

- shortest failing event tape;
- smallest relevant state assignment;
- minimal transition path;
- minimized external-return tape;
- focused explanation of the violated property.

This should be a design goal even if the first implementation is simple. A small
counterexample is much more valuable than a large solver dump.

### Plan For State Explosion Honestly

The spec should tell users what happens when verification becomes too large.

Recommended tools:

- slicing;
- abstraction;
- bounding;
- summaries;
- assume/guarantee contracts;
- solver timeouts;
- partial results;
- `undecided` status;
- witness/counterexample retention when available.

Avoid implying that "verifiable" means "the solver will always finish."

### Make Formatter Behavior Semantic-Preserving By Contract

The formatter should have a clear contract: formatting must not change machine
semantics.

Recommended implementation posture:

- format through canonical parse/IR structures where possible;
- roundtrip with semantic hash checks;
- include formatter conformance vectors;
- reject formatting when the source cannot be parsed unambiguously;
- never use formatting as a migration step unless explicitly requested.

For a language with proof artifacts, a formatter bug is not just annoying. It
can invalidate the relationship between source, IR, proof, and generated code.

### Define Host Compliance Levels

Not every host should have to implement the entire v6 universe.

Define compliance levels such as:

```text
parse-only
run-core
replay-core
verify-core
codegen-core
full-v6
```

Each level should say which features, diagnostics, artifacts, and conformance
vectors are required. This lets smaller runtimes be honest without pretending to
support everything.

### Create A Spec Change Checklist

Every new normative feature should answer the same questions before it is
accepted:

- grammar shape;
- canonical IR shape;
- type rules;
- runtime semantics;
- effect semantics;
- replay semantics;
- proof obligations;
- conformance vectors;
- import/export behavior;
- codegen behavior;
- diagnostics;
- performance impact;
- compatibility impact.

This checklist will slow down impulsive feature growth in the right way.

## Runtime And Trace Recommendations

These recommendations focus on execution safety, termination, public trace
formats, and keeping proof-related work incremental enough to remain pleasant in
day-to-day development.

### Define Macrostep Fuel And Queue Bounds

Eventless cascades, internal events, retries, spawned work, and compensation
flows need termination limits or a proof of convergence.

Without this, a machine can be deterministic and still fail operationally by
deterministically hanging.

Recommended controls:

- maximum microsteps per macrostep;
- maximum internal event queue depth;
- maximum eventless cascade depth;
- maximum retry count;
- maximum spawned child operations;
- explicit behavior when a limit is reached;
- profile-specific defaults;
- diagnostic and trace entries when fuel is exhausted.

Strict profiles should either prove convergence or require declared bounds.
Runtime profiles should be able to enforce those bounds cheaply.

### Make Quiescence Formal

Define what it means for a machine or system to become stable.

Important states:

```text
quiescent
  No enabled eventless transitions, no pending internal events, no in-flight
  required work.

suspended
  Waiting for external input, timer, sensor, or host result.

deadlocked
  Cannot progress, but has unmet obligations.

livelocked
  Continues taking internal/eventless work without reaching quiescence.

failed-to-stabilize
  Hit fuel, queue, recursion, or cascade bounds before quiescence.
```

This gives replay, verification, and systems semantics a common vocabulary.

### Type Event Payloads As First-Class Interfaces

States and transitions are not enough. Inputs, outputs, emitted events,
channels, and hook calls should have typed payload schemas.

The spec should define types for:

- accepted input events;
- emitted output events;
- internal events;
- channel messages;
- hook arguments;
- hook return values;
- diagnostic/dead-letter payloads.

This makes import/export, codegen, conformance vectors, and generated host APIs
much more trustworthy.

### Add Incremental Verification Caching

Verification should be able to reuse previous work after small edits.

Recommended hashing levels:

- source file hash;
- canonical IR hash;
- machine/module hash;
- transition hash;
- contract hash;
- dependency graph hash;
- verifier option hash.

The verifier should invalidate only the affected proof obligations where
possible. This matters for developer experience: a correct proof system that is
painful to run will not be run often enough.

### Define Totality Modes

Machines need explicit behavior for unhandled input.

Suggested modes:

```text
reject
  Unhandled events are errors.

ignore
  Unhandled events are consumed with no state change.

defer
  Unhandled events remain pending, if a queue model exists.

dead-letter
  Unhandled events are sent to a diagnostic/dead-letter channel.

custom
  A declared handler decides what happens.
```

Totality should be a machine/profile choice, not an accidental behavior of the
current runtime.

### Standardize Traces As Public Artifacts

Trace events should have a stable schema. Traces should be usable by humans,
tests, replay tools, visualizers, and generated-code validators.

Trace entries should cover:

- macrostep start/end;
- event selected;
- guard evaluated;
- transition chosen;
- assignment performed;
- output emitted;
- hook called;
- external return consumed or recorded;
- invariant checked;
- rollback started/finished;
- commit occurred;
- post-commit effect started/finished;
- diagnostic emitted;
- fuel/queue bound hit.

Final state is too weak as a conformance artifact. Trace shape is where many
semantic disagreements become visible.

### Add A Strict No Host-Language Leakage Rule

FSL expressions should not silently inherit JavaScript, Python, Ruby, or any
other host's semantics.

Be explicit about:

- truthiness;
- equality;
- comparison;
- exceptions;
- null/undefined/none;
- string indexing;
- Unicode normalization;
- object identity;
- property ordering;
- numeric overflow;
- floating point behavior.

Host-specific behavior should live behind a named target/extension/profile, not
inside the normative core by accident.

### Add Resource Contracts

Machines should be able to declare operational bounds as part of their safety
contract.

Examples:

```text
max_macrosteps: 1000
max_microsteps_per_macrostep: 100
max_queue_depth: 500
max_trace_bytes: 1048576
max_hook_latency_ms: 250
max_retries: 3
```

These are not just performance settings. They are operational safety properties
and should appear in proof artifacts, runtime manifests, and failure
diagnostics.

### Define Promotion Rules For Experimental Features

Experimental syntax and semantics should have an explicit path to becoming
normative.

Before promotion, require:

- grammar definition;
- canonical IR representation;
- type rules;
- runtime semantics;
- proof obligations;
- conformance vectors;
- diagnostic codes;
- import/export policy;
- codegen target policy;
- migration notes;
- performance notes.

This keeps experiments welcome without letting them become permanent dialects by
accident.

### Create A Spec Coverage Map

Every normative section should point to the artifacts that make it real.

Suggested columns:

```text
spec section
status
grammar rule
IR field
runtime implementation
conformance vectors
diagnostic codes
import/export behavior
codegen behavior
proof obligations
implementation status
```

This would be especially valuable for Claude or another agent interpreting the
spec. It turns "read the whole megaspec and infer the state of the world" into a
structured maintenance task.

## Change Management And Review Recommendations

These recommendations focus on keeping v6 maintainable after it becomes a real
language with users, teams, artifacts, generated code, and long-lived specs.

### Define A Deprecation Policy Before It Is Needed

The spec should say how features move from supported to warned to removed.

At minimum, define:

- how a feature becomes deprecated;
- whether warnings are tied to editions or tool versions;
- how many releases/editions must pass before removal;
- what migration tooling must exist before removal;
- how generated code and proof artifacts record deprecated features;
- whether deprecated features remain runnable in legacy profiles.

Deprecation should not be an improvised social process. It should be part of the
compatibility story.

### Add Semantic Diff As A First-Class Tool Concept

For FSL, textual diff is not enough.

A useful diff should say whether two machines differ in:

- reachable states;
- accepted input events;
- emitted outputs;
- transition behavior;
- guard or assignment semantics;
- invariants/contracts;
- replay behavior;
- proof status;
- target compatibility;
- import/export loss profile.

This is especially important for review. A small text diff can be a large
semantic change, and a large formatting diff can be semantically empty.

### Specify Merge And Conflict Behavior For Machines

If teams edit machine specs, the language should eventually support semantic
conflict reporting.

Examples:

- the same state was added twice compatibly;
- the same transition was edited incompatibly;
- an invariant was weakened;
- an event payload changed shape;
- a transition became unreachable;
- a guard was strengthened in one branch and an assignment changed in another;
- a proof artifact no longer applies after merge.

This does not need to be solved immediately, but the canonical IR and semantic
hashing design should leave room for it.

### Add Proof Monotonicity Guidance

The spec should describe which changes preserve prior proofs, weaken them, or
invalidate them.

Examples:

- adding an unreachable state may preserve many proofs;
- adding a reachable transition invalidates reachability and totality proofs;
- strengthening an invariant may invalidate existing transitions;
- weakening an invariant may invalidate safety claims that depended on it;
- changing a hook effect class can invalidate replay and portability proofs;
- changing a numeric type can invalidate arithmetic proofs.

This guidance helps incremental verification, semantic diff, and human review.

### Define Observability Levels

Observability should be profile-driven, not accidental.

Possible levels:

```text
minimal
  Counters, final state, high-level errors.

structured
  Stable trace entries for transitions, events, emits, and effects.

replay
  Retained input/external-result tapes sufficient for deterministic replay.

debug
  Rich timelines, guard results, assignments, rollback detail.

audit
  Signed or hash-linked bundles suitable for review/compliance.
```

Users should be able to choose what they retain and what costs they accept.

### Add Privacy And Redaction Rules For Tapes And Traces

Replay and trace artifacts can contain secrets, PII, credentials, business data,
or generated outputs that should not be shared casually.

The spec should define:

- sensitive field annotations;
- redaction behavior;
- hashing behavior;
- safe sharing profiles;
- whether redacted tapes remain replayable;
- whether proof artifacts may refer to redacted values;
- how tools warn before exporting sensitive traces.

This matters because the best debugging artifact can also be the worst thing to
paste into a public issue.

### Make Spec Examples Executable In CI

Every spec example should be either:

- executable and tested; or
- explicitly marked illustrative/non-normative.

Executable examples should cover parse, canonical IR, conformance trace, and
expected diagnostics where relevant.

This keeps the spec from drifting into examples that are pleasant to read but
not actually legal FSL.

### Define A Portable Subset Explicitly

Full v6 may become large. Adoption needs a small portable subset that every
serious runtime and codegen target can support.

The portable subset should define:

- required syntax;
- required runtime semantics;
- required diagnostics;
- required conformance vectors;
- required trace fields;
- required target capability manifest fields;
- explicitly excluded features.

This subset may matter more than full v6 for ecosystem health.

### Add Model Shrinking And Slicing Tools

When a machine is too large to verify or understand, users need principled
reduction tools.

Useful slicing dimensions:

- by event;
- by state or state group;
- by variable dependency;
- by emitted output;
- by property/invariant;
- by hook/effect;
- by failing counterexample path.

Shrinking should preserve the property or failure being investigated wherever
possible.

### Specify Human-Review Artifacts

Add a generated review pack for PRs and design reviews.

Suggested contents:

- rendered graph;
- semantic summary;
- changed behavior summary;
- accepted/emitted event summary;
- proof summary;
- downgraded/unchecked property list;
- import/export loss summary;
- target compatibility summary;
- trace or counterexample excerpts;
- privacy/redaction warning if artifacts include sensitive data.

This would make FSL pleasant to review in teams. It also gives agents a clear
artifact to produce and inspect.

## Composition And Tooling Recommendations

These recommendations focus on making v6 portable across runtimes, usable in
larger systems, and inspectable by humans and tools.

### Define Composition Algebra

Systems need precise rules for how machines combine.

Define semantics for:

- parallel composition;
- sequential composition, if supported;
- event routing;
- synchronization;
- broadcast;
- fan-out;
- fan-in;
- child machine lifecycle;
- parent/child failure propagation;
- shared resources;
- cancellation;
- supervision.

The spec should say whether composition preserves determinism, replayability,
and proof status, and under which assumptions.

### Version Every Artifact Schema

Every durable artifact should have a schema version and compatibility rules.

Version these at minimum:

- canonical IR;
- trace schema;
- proof artifact schema;
- target capability manifest;
- review pack;
- replay bundle;
- import/export report;
- diagnostic catalog;
- semantic diff report.

Artifacts will outlive individual tool versions. They need to be readable,
migratable, and rejectable with clear diagnostics.

### Add Differential Testing Across Runtimes

The same conformance vector should run against every relevant execution path.

Examples:

- interpreted JS runtime;
- generated TypeScript;
- imported then exported FSL;
- canonical IR execution, if a debug executor exists;
- future host runtimes.

Any trace disagreement should be treated as either:

- a bug;
- an explicit target capability gap;
- an intentional semantic difference behind a declared profile/extension.

Final state comparison is not enough. Differential testing should compare
canonical traces.

### Define Optimization Legality

Tools will eventually simplify machines, remove unreachable states, inline
guards, fold constants, minimize graphs, reorder declarations, or eliminate
dead assignments.

Each transform needs a semantic-preservation contract:

- what it may change;
- what it must preserve;
- which proof artifacts survive;
- which traces remain equivalent;
- when diagnostics must be emitted;
- whether the transform is allowed in strict profiles.

Optimizations should be able to produce proof or evidence that they preserved
the selected semantics.

### Add Module And Namespace Semantics

Large specs need clear rules for names.

Define:

- imports;
- includes;
- aliases;
- public/private declarations, if any;
- package boundaries;
- duplicate names;
- shadowing;
- qualified names;
- re-export behavior;
- dependency cycles;
- relative and absolute import resolution.

This should be specified before factories, systems, or shared libraries depend
on informal name resolution.

### Define Contract Refinement Rules

For factories, groups, systems, and interfaces, the spec should say how contracts
may be refined.

Examples:

- when a child may strengthen a postcondition;
- when a child may weaken a precondition;
- whether emitted events may be added or removed;
- whether invariants may be strengthened;
- whether accepted inputs may be narrowed;
- how effect classes may change under refinement;
- how proof artifacts record refinement.

This is the difference between safe substitutability and surprising breakage.

### Add Debugger Protocol Concepts

The semantics should support debugging even if the protocol is implemented
later.

Useful operations:

- step macrostep;
- step microstep;
- inspect current state;
- inspect enabled transitions;
- inspect guard results;
- inspect internal queue;
- inspect tapes;
- inject event;
- force event under debug mode;
- rewind/replay;
- inspect effect calls;
- inspect pending post-commit work.

If these concepts are reflected in the trace and execution model early,
debuggers and visualizers will be much easier to build later.

### Specify Recoverability Classes

Not all failures are the same.

Suggested classes:

```text
retryable
  The same operation may be attempted again.

compensatable
  A declared compensation can repair or offset the failure.

terminal
  The machine/system cannot safely continue.

diagnostic-only
  The issue is recorded but does not affect execution.

operator-required
  Execution is suspended until human or host intervention.
```

These classes should apply to hook failures, post-commit effect failures,
serialization failures, replay mismatches, and resource limit failures where
appropriate.

### Define Packaging And Distribution Metadata

If machines become shared artifacts, they need metadata.

Suggested fields:

- package name;
- package version;
- language edition;
- required profiles;
- required features/extensions;
- target capabilities;
- dependencies;
- license;
- provenance;
- source hash;
- canonical IR hash;
- proof artifact hash;
- generated artifact hashes.

This supports registries, CI, generated code, review packs, and reproducible
builds without tying v6 to any one package manager.

### Add Explain Mode As A First-Class Design Goal

Tools should be able to answer "why?" for transitions, diagnostics, and proof
status.

Useful questions:

- why is this transition enabled?
- why is this transition blocked?
- why did this guard evaluate false?
- why did this property fail?
- why is this machine not replayable?
- why is this hook unsafe?
- why is this target incompatible?
- why was proof downgraded?
- why did import/export lose semantics?

Explain mode should reuse trace entries, proof obligations, diagnostic codes,
and capability manifests rather than inventing a separate explanation system.

## Artifact Identity And Developer Experience Recommendations

These recommendations focus on giving v6 stable names, stable schemas, and
developer-facing surfaces that can support IDEs, agents, generated code, and
long-lived proof artifacts.

### Define A Formal Feature Registry

Every language feature should have a stable feature ID.

Suggested registry fields:

- feature ID;
- human name;
- status;
- owning spec section;
- language edition;
- required grammar rules;
- canonical IR fields;
- diagnostic codes;
- conformance vectors;
- capability-manifest key;
- implementation status by target.

This gives tools and agents a stable way to talk about features without
depending on headings or prose phrases.

### Add A Compatibility Test Matrix

For each feature, track support across operations, profiles, and targets.

Useful matrix dimensions:

- parse;
- run;
- replay;
- check;
- render;
- codegen;
- import;
- export;
- debug;
- explain.

Targets should report support as something richer than yes/no:

```text
supported
unsupported
partial
requires-runtime-check
requires-extension
lossy
unknown
```

This matrix should feed docs, capability manifests, diagnostics, and CI.

### Specify Schema Evolution Rules

All durable schemas need explicit evolution rules.

Define what happens when fields are:

- added;
- removed;
- renamed;
- made required;
- made optional;
- split;
- merged;
- changed in type;
- moved to an extension namespace.

Old tools should have predictable behavior for unknown fields. New tools should
have predictable behavior for old artifacts. The spec should distinguish
must-ignore, must-preserve, must-understand, and must-reject fields.

### Define Stable Machine Identity

A machine has several identities that should not be collapsed into one hash.

Suggested identities:

```text
package identity
  Name/version/provenance of the distributed artifact.

source identity
  Hash of the authored source text.

semantic identity
  Hash of canonical IR or expanded semantic form.

proof identity
  Hash of verifier input, assumptions, backend, and proved properties.

generated-code identity
  Hash of emitted target artifacts and generator configuration.
```

These identities are related, but not interchangeable. A formatter may change
source identity while preserving semantic identity. A verifier option change may
change proof identity while leaving semantic identity alone.

### Add Proof Dependency Graphs

Proof artifacts should record what each property depended on.

Dependencies may include:

- transitions;
- states;
- variables;
- types;
- invariants;
- hooks;
- effect classes;
- assumptions;
- numeric semantics;
- target capabilities;
- solver options;
- imported modules;
- resource bounds.

This makes incremental verification and proof invalidation much more precise.

### Support Proof Invalidation Explanations

When a prior proof no longer applies, tools should explain why.

Bad:

```text
Proof invalid. Recheck required.
```

Good:

```text
Proof for invariant `balance >= 0` invalidated because transition `withdraw`
changed assignment `balance -= amount`, which was part of obligation
`vc_17_withdraw_preserves_balance_nonnegative`.
```

This improves human review and gives agents something actionable.

### Define Canonical Error Recovery For Parsers

IDEs and agents need useful structure even when a file is invalid.

The parser should specify recovery behavior for common errors:

- missing semicolon;
- incomplete transition;
- unmatched bracket;
- bad declaration;
- unknown keyword;
- invalid expression;
- unterminated string;
- malformed type annotation.

Recovered parse trees should mark uncertain regions clearly. Diagnostics should
include stable codes and spans. Tools should not have to choose between "valid
full AST" and "nothing."

### Add Editor And LSP Semantics

The spec should define enough language metadata to support a good editor
experience.

Important surfaces:

- go to definition;
- find references;
- rename;
- semantic tokens;
- hover explanations;
- inline diagnostics;
- enabled-transition preview;
- event payload hints;
- hook signature hints;
- proof/downgrade explanations;
- trace navigation;
- generated artifact links.

This does not require specifying the whole LSP protocol in the language spec,
but the language should expose the concepts that make these features reliable.

### Specify Generated API Stability

Codegen should distinguish stable host API from generated internal detail.

Define:

- which generated exports are stable;
- which names may change between generator versions;
- how generator version affects output;
- whether generated APIs follow semantic versioning;
- how target manifests describe public surface;
- how users opt into breaking generated API changes;
- how regenerated code should be reviewed.

Without this, users may build against generated internals by accident and then
experience codegen improvements as breaking changes.

### Design A Minimal Standard Library Policy

The spec should define what belongs in core syntax versus the standard library.

For standard library functions, define:

- name;
- type signature;
- effect class;
- determinism;
- numeric semantics;
- error behavior;
- replay behavior;
- conformance vectors;
- target support expectations;
- whether the function may be inlined or optimized.

Keep the core language small. Put reusable behavior in a typed, effect-classed,
conformance-tested stdlib where possible.

## Reference Implementation And Validation Recommendations

These recommendations focus on making the spec executable enough to trust, while
keeping performance, proof checking, and documentation authority clear.

### Build A Tiny Reference Interpreter

Create a small reference interpreter for the normative kernel.

It should not optimize. It should not be the production runtime. It should be
boring, direct, and easy to compare to the spec.

Use it as:

- the oracle for conformance vectors;
- a debugging target for new semantics;
- a way to test generated code;
- a way to validate import/export roundtrips;
- a way to explain traces in the simplest possible execution model.

The production runtime can be fast. The reference interpreter should be obvious.

### Add A Small Trusted Proof Checker

Heavy solvers can produce evidence, but the trusted checker for proof artifacts
should be small and boring where possible.

Goal:

- minimize trusted code;
- make proof artifacts independently inspectable;
- separate "solver said yes" from "artifact checked";
- allow CI to verify proof bundles without re-running expensive solvers;
- make verifier upgrades less frightening.

This does not require a full formal proof assistant immediately. Even a modest
checker that validates artifact structure, machine hashes, assumptions, and
witness/counterexample consistency would improve trust.

### Create A Performance Benchmark Suite Per Profile

Performance should be measured per mode/profile rather than discussed in the
abstract.

Benchmark profiles:

```text
fast
checked
replay
debug
verify
codegen
import/export
```

Measure:

- parse time;
- canonical IR build time;
- transition throughput;
- guard/assignment overhead;
- trace recording overhead;
- replay overhead;
- proof/check time;
- memory use;
- artifact size.

This gives the project a way to protect the fast path while adding richer safety
features.

### Add Fuzzers Generated From Grammar And IR

Use fuzzing to attack the places where language tools usually drift.

Targets:

- parse;
- format;
- canonicalization;
- semantic hashing;
- import/export;
- replay;
- trace generation;
- codegen roundtrip;
- diagnostic recovery;
- proof artifact parsing.

Fuzzers should generate both source syntax and canonical IR structures. This
will catch disagreements between parser, formatter, IR, and runtime earlier than
handwritten tests alone.

### Define Deterministic Concurrency Scheduling

If systems can do parallel-ish work, the scheduler must be specified.

Options:

- define a canonical scheduler order;
- require all scheduler choices to be recorded in the trace;
- restrict concurrent semantics in strict replay profiles;
- force nondeterministic host scheduling behind an unsafe effect class.

Without this, systems may be replayable only on paper.

### Separate Sound, Incomplete, And Unsound Analyses

Not every analysis has the same truth value.

The spec and tools should distinguish:

```text
sound-complete
  If it says pass/fail, the answer is complete for the declared domain.

sound-incomplete
  Any reported proof/failure is trustworthy, but some truths may be undecided.

heuristic
  Useful signal, not a proof.

unsound
  Deliberately approximate; useful for linting, exploration, or performance.
```

Do not let a heuristic linter look like a verifier. Do not let an undecided
solver timeout look like success.

### Add Migration Reports And Autofix Rules

When specs evolve, tooling should explain migrations.

Migration output should report:

- source edition/profile;
- target edition/profile;
- rewrites applied;
- semantic hashes before/after;
- behavior believed preserved;
- behavior changed;
- lossy conversions;
- places requiring human review;
- deprecated features removed or rewritten.

Autofix is valuable, but it should be conservative. Any fix that may change
semantics should be explicit and reviewable.

### Define Value Serialization Canonically

Events, payloads, hook returns, errors, units, decimals, enums, strings, and
optional/null values need stable serialized forms.

Define:

- primitive value encoding;
- enum encoding;
- unit encoding;
- decimal/rational encoding;
- string normalization;
- error encoding;
- unknown/opaque value encoding;
- binary/blob policy, if any;
- map/object ordering;
- lossless JSON representation, if JSON is used.

Canonical values are the atoms of traces, proof artifacts, replay bundles, and
semantic hashes.

### Create Domain Profiles

Different domains should be able to choose different defaults without forking
the language.

Possible profiles:

```text
embedded
  Small memory, strict bounds, no dynamic allocation assumptions.

browser
  Event-driven, limited host effects, web-friendly generated APIs.

backend-service
  Durable effects, retries, tracing, deployment metadata.

workflow-engine
  long-running state, timers, compensation, operator intervention.

formal-proof-heavy
  stricter numeric semantics, more annotations, proof artifacts required.
```

Profiles should be collections of defaults and requirements, not separate
dialects.

### Split Documentation By Authority

Claude and future maintainers need to know what kind of document they are
reading.

Recommended document classes:

```text
normative spec
  Binding syntax and semantics.

rationale
  Why choices were made.

tutorial
  How to learn and use the language.

examples
  Executable examples, unless clearly marked illustrative.

roadmap
  Possible future work.

implementation notes
  Current implementation status and engineering plans.
```

Do not let roadmap language sound normative. Do not let implementation notes
silently define semantics.

## Virtual Machine Portability Recommendations

These recommendations assume a sharper product goal: create a virtual machine
that is reliably portable to 40+ languages, plus codegen targets for generally
the same languages. Under that goal, uniformity across implementations is
paramount.

The central design premise should be:

> The VM is the product. Codegen is an optimization and integration strategy.

FSL is the authoring language. The canonical VM artifact is the portability
contract. Codegen is one way to execute that contract efficiently or
idiomatically.

### Make The VM Spec Normative

The VM should not be an implementation detail inferred from one runtime.

Define a small abstract machine:

- VM artifact format;
- value model;
- transition algorithm;
- guard/action instruction semantics;
- queue behavior;
- effect boundary;
- host-call ABI;
- error model;
- trace event model;
- termination and fuel rules;
- replay rules;
- conformance requirements.

The VM spec should be the thing every language implements. The FSL parser and
compiler lower source into that VM model.

### Define Conformance As Trace Equivalence

Final state equivalence is not strong enough for 40+ implementations.

Conforming runtimes should produce the same canonical trace for the same:

- VM artifact;
- initial state/data;
- input tape;
- external result tape;
- scheduler choices, if any;
- profile/capability settings.

Trace equivalence catches differences in guard order, effect order, emitted
outputs, rollback behavior, error handling, and internal queue semantics.

### Do Not Require Every Language To Parse Full FSL First

For 40+ languages, parsing full FSL everywhere will fragment quickly.

Recommended architecture:

- one canonical FSL parser/lowerer early;
- canonical VM IR/bytecode/JSON artifact;
- all runtimes consume the canonical artifact;
- native parsers may come later;
- native parsers must prove equivalence by lowering to the same canonical VM
  artifact.

This makes the portable boundary smaller and much easier to test.

### Separate VM Runtime Conformance From Codegen Conformance

A target language may support:

- VM interpreter runtime;
- native codegen;
- both.

These should have separate capability manifests and conformance results.

Both should pass semantic vectors, but codegen may also need target-specific
tests for generated API shape, packaging, performance, and trace compatibility.

### Define A Tiny Portable Core Value Model

Portability will fail first where host languages disagree.

Define the portable core for:

- booleans;
- integers;
- strings;
- enums;
- optional/null values;
- lists;
- maps/records, if included;
- equality;
- ordering;
- hashing;
- errors;
- serialization.

Be especially careful with JavaScript, Python, Java, C, Rust, Ruby, Go, and
other hosts that differ on integer size, Unicode, map ordering, nullability,
exceptions, floats, and truthiness.

### Make Canonical Serialization Sacred

Machines, VM artifacts, values, traces, proof bundles, diagnostics, errors, and
host-call results all need stable encodings.

Canonical serialization is the glue that lets dozens of languages agree.

The spec should define:

- canonical field ordering;
- canonical value encoding;
- string normalization;
- integer/decimal encoding;
- map ordering;
- omitted vs null fields;
- unknown field behavior;
- binary encoding, if any;
- semantic hash inputs.

If two runtimes serialize the same trace differently, the portability story is
already leaking.

### Create A Target Bringup Kit

Every new language implementation should get the same bringup kit.

Suggested kit contents:

- corpus runner;
- trace comparator;
- canonical value serialization tests;
- VM artifact loader tests;
- host ABI mock tests;
- negative diagnostic tests;
- replay tests;
- codegen preservation tests, if applicable;
- performance smoke tests;
- capability manifest validator.

This makes adding the 17th or 38th language a procedure rather than a research
project.

### Use A Formal Host ABI

Hooks, sensors, timers, random streams, async calls, external results, and
errors must cross the VM boundary the same way everywhere.

The host ABI should specify:

- call naming;
- argument encoding;
- return encoding;
- error encoding;
- effect class;
- sync vs async behavior;
- timeout behavior;
- retry behavior;
- replay recording;
- replay consumption;
- authorization/capability checks.

If this is vague, portability will die at the host boundary first.

### Define Permitted Variance Explicitly

Some differences between targets are harmless. Others are semantic breaks.

Permitted variance may include:

- packaging style;
- public API idioms;
- performance;
- diagnostics prose;
- build system integration;
- optional debug metadata.

Non-permitted variance should include:

- VM trace semantics;
- value semantics;
- effect ordering;
- rollback/commit behavior;
- replay behavior;
- canonical serialization;
- proof/capability claims.

Any semantic variance should require an explicit profile, extension, or
capability downgrade.

### Keep Generated Native Code Humble

Generated native code should preserve VM semantics or clearly report what it
cannot preserve.

Recommended rules:

- generated code should optionally emit VM-compatible traces;
- checked/replay mode should compare generated traces to VM expectations;
- generated manifests should list preserved and unsupported features;
- generated APIs may be idiomatic outside, but semantics should remain
  VM-shaped inside;
- codegen should refuse unsupported semantic features in strict profiles.

Silent semantic erosion is worse than refusing to generate.

### Prefer Generated Adapters Over Semantic Rewrites

Let target APIs feel idiomatic at the boundary, but keep the inner semantics
close to the VM.

Good:

- idiomatic wrapper types;
- idiomatic package layout;
- host-friendly event constructors;
- target-native async wrappers around specified host ABI behavior.

Dangerous:

- rewriting transition selection into target-specific idioms;
- replacing VM queue semantics with host event-loop semantics;
- letting target exceptions define FSL failure behavior;
- using host numeric behavior in place of VM numeric behavior.

Idiomatic wrappers are fine. Idiomatic semantic reinterpretation is not.

### Build Differential CI Early

Every target should run the same corpus against the reference VM.

New semantic features should not be considered real until at least:

- reference VM passes;
- one production runtime passes;
- one generated target passes, if codegen is in scope;
- traces match;
- capability manifests agree.

The corpus should include positive, negative, replay, serialization, and
diagnostic vectors.

### Treat The Canonical VM Artifact As The Portability Boundary

The most important architectural recommendation is to make the canonical VM
artifact the portability boundary.

FSL source is for humans. The VM artifact is for runtimes. Codegen is for
integration and speed.

If the VM artifact is small, canonical, and ruthlessly tested, 40+ languages are
plausible. If every language reinterprets FSL source independently, 40+
languages will become 40+ dialects.

## Final Recommendation

The safest direction is:

```text
Backwards-compatible runtime.
Explicit effect classification.
Strict profiles by opt-in.
Build-time verification by default.
Runtime checks only when requested or required.
Proof artifacts that say exactly what was proved, failed, or left unknown.
```

That gives v6 a strong proof story without breaking existing users or making
fast machines slow.
