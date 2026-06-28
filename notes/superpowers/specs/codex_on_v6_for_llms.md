# Codex on FSL v6 for LLMs and Agents

I reviewed the v6 worktree, the v6 megaspec, the current critique, the convergence
plan, the Gemini LLM note, and the current implementation surfaces around
capabilities, verification, tapes, errors, codegen, interchange, conformance, and
the CodeMirror sketch.

My high-level reaction: FSL is already aiming at the right thing for agents. Its
best LLM affordance is not "natural language support." It is the possibility of
turning behavior into small, deterministic, replayable, source-spanned artifacts
that a probabilistic worker can inspect, edit, verify, and cite.

The v6 work should preserve that center of gravity. The more every FSL operation
becomes a machine-readable repair or evidence object, the safer and more useful
the language becomes to me.

## What Already Works

These are the parts of v6 that already feel unusually friendly to agents:

- A finite/checkable core, with boundedness as the default.
- Deterministic replay as a first-class design value.
- Input tapes as the retained source of truth.
- Counterexamples and conformance traces as executable data.
- Capability profiles and target manifests.
- Structured runtime errors with finite error kinds and source locations.
- Pure, host-agnostic helper modules for tapes, errors, verification, and
  capability checks.
- CLI verb boundaries for render, import, export, codegen, config, and related
  workflows.
- Interchange types that explicitly acknowledge lossy conversion.
- A conformance corpus organized by certification tier.
- A stochastic/dragon testing posture that treats grammar corners as assets.
- Pure editor diagnostics that can run outside the DOM.
- A spec process that invites blind review, critique, and synthesis instead of
  treating the first large design as final.

That is already a strong base. The main gap is not imagination. It is turning the
good ideas into uniform contracts that tools can depend on.

## Central Thesis

For Codex, the north star should be:

Every failure should become a small, replayable, source-spanned,
machine-readable repair task.

Every success should produce a compact, hash-addressed artifact with enough
provenance that I can safely cite it, reuse it, diff it, or compose it.

Every host boundary should be typed, effect-described, and policy-checkable.

Every CLI, editor, LSP, MCP, and registry surface should speak the same core
schemas.

If v6 does that, FSL becomes much easier for agents to use safely than most
mainstream programming languages, even before any special LLM feature exists.

## Highest-Leverage Changes

### 1. One Result Envelope Everywhere

The most important agent-facing artifact is a uniform JSON result envelope for
every command and tool surface.

This should exist before the CLI surface gets much larger. A large set of verbs
with bespoke prose output is harder for agents than a small set of verbs with a
reliable schema.

The envelope should be shared by CLI `--json`, LSP, MCP, editor diagnostics,
test runners, registry jobs, and any programmatic API that reports user-facing
results.

A useful baseline shape:

```json
{
  "schema": "fsl.result.v1",
  "ok": false,
  "status": "failed",
  "command": "fsl check",
  "tool_version": "6.0.0-alpha.2",
  "edition": "v6",
  "source_hash": "sha256:...",
  "diagnostics": [],
  "artifacts": [],
  "metrics": {},
  "suggested_fixes": [],
  "next_commands": [],
  "provenance": {}
}
```

`status` should be more expressive than boolean success:

- `ok`
- `failed`
- `undecided`
- `unsupported`
- `lossy`
- `partial`
- `internal_error`

Every diagnostic should have:

- stable `code`
- `severity`
- short `message`
- optional long `explanation`
- `span`
- `entity`
- `expected`
- `actual`
- `rule`
- `suggested_fixes`
- `help_url`

This is the contract that lets an agent stop scraping terminal text.

### 2. A Compact Agent Context Bundle

Add a command such as:

```text
fsl context --json file.fsl
```

or:

```text
fsl inspect --agent --json file.fsl
```

The purpose is not documentation. It is a compact semantic briefing that lets an
agent understand the file before editing it.

It should include:

- source hash and edition
- grammar/version/capability profile
- declared and inferred capabilities
- states, start states, final states, terminal states, error states
- transitions with arrow kind, action, guard, effects, and source span
- channels, sensors, hooks, and their typed signatures
- vals, props, data shape, contracts, and properties
- topology summaries such as unreachable states and SCCs
- known unsupported or lossy constructs for active targets
- relevant conformance vectors or local test vectors
- short stable IDs for nodes and edges
- a suggested minimal command sequence for check, replay, render, and codegen

Make this available in size tiers:

- `--brief` for prompt context
- `--full` for local tools
- `--deep` for audits and registry packaging

This would be one of the highest-value agent features in the whole toolchain.
It lets me load semantic context without reading a megaspec, generated parser,
and source files every time.

### 3. Semantic Patches Should Move Earlier

The megaspec defers semantic patches, but I would pull a small version into v6
tooling sooner.

Agents are much better at targeted edits than whole-file rewrites when the edit
target is structured. FSL has a rare opportunity to expose a safe edit protocol:

```json
{
  "schema": "fsl.patch.v1",
  "source_hash": "sha256:...",
  "ops": [
    {
      "op": "add_transition",
      "from": "Idle",
      "action": "start",
      "kind": "legal",
      "to": "Running"
    }
  ]
}
```

The first version does not need to cover the whole language. It only needs to
cover common, safe edits:

- add/remove/rename state
- add/remove/modify transition
- add/update guard
- add/update property
- add/update contract
- add/update channel or hook declaration
- mark final/error/start state

Important properties:

- dry-run by default
- source-hash precondition
- stable AST or graph IDs
- source-span output
- formatter round-trip
- conflict diagnostics
- behavioral diff summary

This helps agents, but it also helps humans review generated edits.

### 4. Counterexamples As Repair Packs

The safety checker already returns a trace of state names. That is a good first
rung. For agents, a failed check should return a repair pack.

A repair pack should include:

- property ID and property source span
- source hash
- seed
- minimal input tape or stimulus sequence
- canonical trace
- first failing step
- expected vs actual condition
- state and edge spans involved in the failure
- values and effects relevant to the failure
- replay command
- slice command
- shrink status
- redaction status
- suggested fix candidates when safe

The agent-facing contract is simple: if a property fails, I should be able to
run exactly one replay command, inspect exactly the slice that matters, and
apply a small patch.

This is more valuable than a natural-language explanation by itself.

### 5. Budget, Timeout, And Undecided Semantics

Verification should never feel like an unbounded command from the perspective of
an agent.

The spec already has the right instincts around `undecided`, budgets, and
`check --estimate`. I would make the budget handshake highly explicit:

- `check --estimate --json`
- `check --budget states=10000,time=30s --json`
- resumable job IDs for long checks
- cache keys for repeated checks
- monotonic progress metrics
- partial results with known coverage
- `undecided_reason`
- solver/toolchain provenance
- proof dependency hashes

`undecided` should not be treated as a bad error. It is a first-class data
product. It should tell me what was proven, what was not, why, and what smaller
or different query I should run next.

### 6. Effects As A Security Primitive

FSL's biggest safety opportunity for agents is not only state-machine
verification. It is effect discipline.

External hooks, sensors, channels, host callbacks, timers, random streams,
filesystem access, network calls, and MCP tools should have machine-readable
effect manifests.

Each boundary should describe:

- effect kind
- input and output schema
- determinism
- replay policy
- idempotence
- timeout and cost bound
- authority required
- redaction requirements
- whether results are recorded in the tape
- whether failure rolls back the macrostep
- whether the host side effect is undoable
- policy labels such as `network`, `filesystem`, `clock`, `random`, `secret`,
  `user_visible`, `external_service`

This is where FSL can become an agent guardrail language. A machine that controls
tools is only safe if its host boundary is explicit enough to audit.

### 7. Fidelity Manifests For Codegen And Interchange

The current v6 codegen direction is useful, but generated output needs a
fidelity manifest.

Every generated target should carry or emit a machine-readable manifest:

```json
{
  "schema": "fsl.codegen_manifest.v1",
  "source_hash": "sha256:...",
  "target": "native:typescript",
  "tool_version": "6.0.0-alpha.2",
  "preserved": ["states", "legal_transitions", "final_states"],
  "unsupported": ["guards", "vals", "hooks"],
  "lossy": [],
  "warnings": []
}
```

By default, codegen should refuse unsupported semantics unless the user opts into
loss:

```text
fsl codegen --allow-loss forced_transitions
```

This matters because an agent will otherwise assume that generated code is a
faithful implementation. The current native TypeScript codegen is small and
clear, but it emits a simple action-driven table and does not yet expose a
machine-readable fidelity claim. As the language grows, silent semantic erosion
will become the main risk.

The same applies to import/export. The interchange model has a good `lossy`
concept already. Make it strict, validated, and visible in every output mode.
JSON interchange should validate its envelope and preserve start-state semantics
or report loss explicitly.

### 8. Packaging Truth Is An Agent Feature

Agents lose a surprising amount of time to install surfaces that do not match
documentation.

The critique found package-shape drift: exported CLI surfaces and advertised
verbs do not fully line up with packed files and binaries. That kind of mismatch
is especially expensive for agents, because we tend to trust nearby manifests
and then chase failures.

v6 should add package-shape tests:

- `npm pack --dry-run --json`
- assert exported files exist in the tarball
- assert every advertised binary resolves
- assert every built-in CLI verb has a smoke test
- assert help mentions only installed verbs, or marks unavailable verbs
- assert TypeScript declaration exports match runtime exports

This is not just release hygiene. It is tool visibility.

### 9. The Conformance Corpus Should Become An LLM Asset

The conformance corpus is already one of the best ideas in the v6 stack. I would
expand it into a first-class agent/eval asset.

In addition to `(document, seed, stimuli) -> canonical trace`, add related JSONL
datasets:

- natural language requirement -> FSL
- FSL -> concise natural language summary
- broken FSL -> diagnostic -> fixed FSL
- property request -> Dwyer pattern/property
- counterexample -> minimal repair
- target feature set -> expected codegen refusal or warning
- import/export input -> loss report
- anti-pattern -> safer rewrite
- stochastic/dragon grammar case -> expected parse/check result

Give every example a stable ID, tier, edition, feature tags, source hash, and
expected result envelope.

This makes FSL more visible to LLMs than ordinary prose docs. It also gives
maintainers a way to measure whether agent-facing changes are improving.

### 10. Registry Search Should Be Behavioral

The registry proposals are directionally right: agents need ground truth they
can act on, not a package list.

A useful registry should support search by:

- contract
- accepted input events
- emitted output events
- required hooks and effects
- capability profile
- proof status
- conformance tier
- target support
- semantic hash
- behavioral examples
- known failure modes
- policy compatibility

Every component should have an interface card that is short enough for an agent
to read and precise enough for a checker to validate.

The registry can come later, but v6 needs to emit the artifacts a registry would
index: typed interfaces, effect manifests, proof results, traces, semantic
hashes, and fidelity manifests.

### 11. Editor, LSP, MCP, And CLI Should Share Diagnostic Code

The CodeMirror sketch has the right shape: `diagnosticsFor` is pure and returns
data. That should become the pattern everywhere.

The editor should not have an editor-only diagnostic shape. The CLI should not
have CLI-only parse errors. MCP should not invent a third shape. They should all
consume a shared diagnostic package.

This gives agents a strong guarantee: if I can interpret a CLI diagnostic, I can
interpret the same issue from the editor, LSP, MCP, test runner, or registry.

### 12. Split Normative Core From Product Rings

The megaspec is rich, but it mixes normative semantics, roadmap, product
strategy, registry dreams, agent strategy, CLI design, and research directions.
That is understandable at this stage, but it is risky for agents.

An LLM reading a large spec needs to know whether a statement is:

- normative v6
- required implementation work
- intended but not normative
- future roadmap
- research
- rejected
- deferred

If this status is not explicit, agents will treat aspirational verbs and
shipping semantics with the same weight.

I would split or tag the spec aggressively:

- Core Language Semantics
- Portable VM/IR Semantics
- Standard Tool Contracts
- Conformance and Certification
- Agent/Registry Strategy
- Roadmap and Research
- Decision Log

The critique already points in this direction. I agree strongly.

## Specific Reactions To The Current Codebase

The capability manifest module is a good shape: pure, data-driven, and open to
future features. The next step is connecting it to CLI inspection, codegen
refusal, registry artifacts, and `--json` output.

The verification module is a good safety-tier start. For agents, the trace needs
to grow from state names into replayable stimuli and localized evidence. A trace
that cannot be replayed as a command is only half an artifact.

The tape module has the right conceptual center: bounded by default, input as
source of truth, emit transactional, rollback aware. Add serialization,
redaction, and stable replay bundle schemas early.

The structured FSL error taxonomy is valuable. Add stable public error codes,
severity, `help_url`, suggested fix slots, and a registry of examples.

The codegen plugin is clear and small, but it needs target manifests, feature
requirements, and loss/refusal semantics before users or agents trust it as a
semantic compiler.

The interchange layer already says "lossy" out loud. Tighten envelope
validation, start-state preservation, and machine-readable loss reporting.

The conformance corpus types are excellent. They should become a public artifact
format, not only internal tests.

The CodeMirror sketch should be treated as a proof of concept for shared
diagnostics. Its DOM-free diagnostic function is exactly the right seam.

The package export/bin/files mismatch should be fixed early. Broken discovery
hurts humans, but it hurts agents even more.

## What I Would Pull Earlier

I would pull these into the early v6 implementation plan:

- universal `--json` result envelope
- stable diagnostic/error code registry
- `fsl context --json` or `fsl inspect --agent --json`
- `fsl capabilities --json`
- package-shape smoke tests
- codegen fidelity manifests
- import/export envelope validation
- replay bundle schema
- proof/check budget schema
- semantic patch dry-run for common graph edits
- shared diagnostic library for CLI/editor/LSP/MCP
- conformance corpus manifest with stable IDs and tags
- redaction schema for tapes, traces, and examples
- `llms.txt`
- versioned one-page grammar reference
- versioned short agent cheat sheet
- agent anti-patterns guide
- broken-to-fixed example corpus

None of these require solving the full future registry or all codegen targets.
They make the current language easier to use safely.

## What I Would Delay

I would be careful about expanding too many verbs before the core result and
diagnostic contracts are stable.

Likely delay:

- broad `publish` workflows
- large registry hosting claims
- dozens of codegen targets
- time-travel UI polish
- natural-language generation features that are not backed by corpus/evals
- complex distributed semantics
- transparency-log machinery
- advanced liveness/probabilistic verification beyond the artifact contracts
- heavyweight MCP policy products before the effect model is crisp

The product surface can grow later. The agent contract should harden first.

## Proposed Agent Artifact Stack

I would think about v6 agent support as a stack of artifacts, not as a set of
features scattered across commands.

The layers I would want are:

1. Source text
2. Located AST
3. Canonical formatted source
4. Semantic graph
5. Portable VM or IR artifact
6. Capability and effect manifest
7. Verification query
8. Verification result or proof artifact
9. Replay bundle
10. Patch bundle
11. Codegen or interchange artifact
12. Registry/interface card

Each layer should be hashable. Each derived layer should record the hash of the
input layer it came from. This gives agents a chain of custody:

```text
source -> ast -> graph -> vm -> check -> replay -> patch -> regenerated source
```

That chain matters because agent work is often interrupted, resumed, reviewed,
or delegated. A compact provenance trail prevents me from applying a fix to the
wrong revision, citing stale verification output, or mixing artifacts from two
nearby machines.

The most useful invariant would be:

```text
No machine-readable artifact lacks source hash, edition, tool version, and
schema version.
```

That one rule would eliminate a large class of agent confusion.

## Concrete Schema Priorities

The memo already recommends a result envelope. I would make the following
schemas explicit and versioned early.

### `fsl.result.v1`

The top-level command/tool response. It wraps everything else. It should be the
default output of `--json` and the transport object for MCP-style calls.

Required fields:

- `schema`
- `ok`
- `status`
- `tool`
- `tool_version`
- `edition`
- `source_hash`
- `diagnostics`
- `artifacts`

Optional but common fields:

- `metrics`
- `suggested_fixes`
- `next_commands`
- `provenance`
- `warnings`
- `redactions`
- `cache`
- `job`

The important point is that every command has the same wrapper even when the
payload differs.

### `fsl.diagnostic.v1`

The shared error/warning/info object.

It should support parse errors, type errors, verification failures, lossy
conversion notes, codegen refusal, package-shape problems, and policy failures.

Minimum fields:

- `code`
- `severity`
- `message`
- `span`
- `phase`
- `category`

Useful fields:

- `expected`
- `actual`
- `entity`
- `rule`
- `related_spans`
- `suggested_fixes`
- `explain`
- `help_url`

The `phase` field matters because agents need to distinguish grammar problems
from semantic problems, verification failures, target incompatibilities, and
toolchain failures.

### `fsl.context.v1`

The compact agent briefing.

It should have a strict size profile:

- `brief` fits comfortably in a prompt.
- `standard` is enough for most edits.
- `full` is complete enough for external tools.

This avoids a common failure mode where a helpful command returns too much data
for an agent to use safely.

### `fsl.replay.v1`

The replay bundle.

Required fields:

- `source_hash`
- `edition`
- `seed`
- `initial_state`
- `initial_data`
- `stimuli`
- `expected_trace`
- `final_observation`
- `redactions`

The replay bundle should be the canonical handoff object between verifier,
debugger, test runner, and agent.

### `fsl.patch.v1`

The semantic patch bundle.

Required fields:

- `source_hash`
- `ops`
- `preconditions`
- `expected_behavior_delta`

The patch runner should return both text edits and semantic confirmation:

- source spans touched
- formatted output hash
- graph diff
- behavior diff
- newly failing checks
- newly passing checks

### `fsl.codegen_manifest.v1`

The generated artifact's semantic receipt.

Required fields:

- `source_hash`
- `target`
- `target_version`
- `preserved`
- `unsupported`
- `lossy`
- `runtime_assumptions`
- `conformance_tier`

This should be emitted alongside generated code, and optionally embedded as a
comment at the top of generated files.

### `fsl.effect_manifest.v1`

The host boundary description.

Required fields:

- `hooks`
- `sensors`
- `channels`
- `external_authorities`
- `determinism`
- `replay_policy`
- `redaction_policy`

This is the schema that makes FSL relevant to agent safety beyond ordinary FSM
modeling.

## Agent Workflows To Optimize

The best way to prioritize tool work is to ask what loop an agent is actually
running. These are the loops I would optimize first.

### Understand

Goal: turn an unfamiliar FSL file into a compact operational model.

Ideal command sequence:

```text
fsl inspect --agent --json machine.fsl
fsl render --format svg machine.fsl
fsl check --estimate --json machine.fsl
```

The inspect output should tell me whether it is safe to edit, what profile it
claims, what effects exist, and which commands are worth running next.

### Repair

Goal: fix a parse, type, validation, or verification failure.

Ideal command sequence:

```text
fsl check --json machine.fsl
fsl explain FSL1234 --json
fsl slice --diagnostic FSL1234 --json machine.fsl
fsl patch --dry-run repair.json machine.fsl
fsl patch --apply repair.json machine.fsl
```

This loop depends on stable diagnostic codes, source spans, slices, and patch
preconditions.

### Prove

Goal: determine whether a safety or temporal property holds under an explicit
budget.

Ideal command sequence:

```text
fsl check --property prop.fsl --estimate --json machine.fsl
fsl check --property prop.fsl --budget states=50000,time=30s --json machine.fsl
fsl replay counterexample.json --json machine.fsl
```

The result should be `proved`, `failed`, or `undecided`, never ambiguous prose.

### Port

Goal: generate or convert while preserving known semantics.

Ideal command sequence:

```text
fsl capabilities --target native:typescript --json
fsl codegen --target native:typescript --json machine.fsl
fsl codegen --target native:typescript --manifest machine.fsl
```

The target manifest should prevent me from assuming unsupported semantics are
preserved.

### Compose

Goal: connect machines or a machine and host tools.

Ideal command sequence:

```text
fsl interface --json child.fsl
fsl interface --json parent.fsl
fsl compose-check --json parent.fsl child.fsl
fsl policy-check --json system.policy.fsl
```

This depends on typed channels, effect manifests, and assume/guarantee
contracts.

### Review

Goal: help a human understand whether a machine changed safely.

Ideal command sequence:

```text
fsl diff --behavioral --json old.fsl new.fsl
fsl check --changed-only --json old.fsl new.fsl
fsl review-pack --json old.fsl new.fsl
```

A review pack should include source diff, graph diff, behavior diff, changed
proof obligations, changed effects, and changed generated artifacts.

## Agent Failure Modes To Design Against

These are the ways I expect Codex-like agents to make mistakes unless the
toolchain gives us rails.

### Treating Prose As Contract

If help text says a verb exists but the package does not install it, an agent
will probably try it and waste time. If docs say conversion is lossless but the
JSON envelope is not validated, an agent may build on false confidence.

Mitigation: package-shape tests, `--capabilities --json`, and strict result
schemas.

### Confusing Similar States Or Actions

State-machine code often has near-duplicate names: `Open`, `Opened`, `Opening`,
`open`, `"open"`. An agent can easily patch the wrong node.

Mitigation: stable semantic IDs, source spans, graph slices, and patch
preconditions.

### Losing Arrow Semantics

Legal, main, and forced transitions have different semantics. Any codegen,
interchange, summary, or patch format that collapses them invites a bad edit.

Mitigation: arrow kind must be present in every graph, context, patch, codegen,
and diff artifact.

### Trusting Generated Code Too Much

Generated code feels authoritative. If it silently omits guards, hooks, forced
edges, probabilities, or rollback behavior, agents will treat an approximation
as an implementation.

Mitigation: codegen refusal by default, fidelity manifests, and target-specific
conformance vectors.

### Applying Stale Fixes

An agent may produce a patch after reading one version of a file, while the user
or another agent changes it before application.

Mitigation: source hashes, semantic preconditions, and patch dry-run.

### Over-Editing Instead Of Local Repair

When a language lacks structured edits, agents tend to rewrite whole files. That
creates formatting churn and accidental behavior changes.

Mitigation: semantic patches, formatter stability, and behavioral diffs.

### Missing Security-Relevant Host Effects

An FSL machine can be finite and still unsafe if a hook sends a network request,
reads a file, uses ambient time, or consumes a secret.

Mitigation: effect manifests, policy checks, redaction labels, and replay
policies.

### Treating `undecided` As Failure Or Success

Agents may misreport an incomplete verification run if `undecided` is just a
paragraph in stderr.

Mitigation: first-class `undecided` status with coverage, budget, and next-query
recommendations.

## What Would Make FSL More Visible To Codex

Visibility is not only SEO or docs. For an agent, visibility means "can I
discover the right facts at the right granularity while working?"

I would add these discovery surfaces:

- `llms.txt` at the package/docs root.
- A versioned `llms-full.txt` generated from canonical docs.
- A 500-token quick reference.
- A 2,000-token agent reference.
- A JSON command manifest.
- A JSON grammar/edition manifest.
- A JSON error-code manifest.
- A JSON feature/capability manifest.
- A JSON examples index.
- A JSON conformance corpus index.
- A "what changed in this edition" artifact.
- A "common repairs" artifact keyed by diagnostic code.

The docs should be generated from the same tables the CLI uses where possible.
If the CLI and docs disagree, agents will believe whichever one they saw last.

I would also make examples intentionally searchable by task, not only by syntax:

- "retry with backoff"
- "approval workflow"
- "two-phase commit"
- "circuit breaker"
- "wizard form"
- "traffic light"
- "tool policy"
- "human-in-the-loop escalation"
- "timeout and cancellation"
- "compensation after failure"

Agents retrieve by user intent. A syntax-only example index is much less useful.

## What Would Make FSL Safer For Codex To Edit

The safest edit environment would give me:

- located AST
- canonical formatter
- semantic graph IDs
- dry-run semantic patches
- behavioral diff
- replay bundle generation
- changed-check selection
- package-shape verification
- source-hash preconditions
- automatic repair suggestions with confidence labels

I would especially like `fsl patch --explain`:

```text
fsl patch --dry-run --explain repair.json machine.fsl
```

It should answer:

- what source text will change
- what graph nodes/edges will change
- what behavior is expected to change
- what checks should be rerun
- what capabilities/effects are newly required
- whether generated targets are still faithful

This is the difference between "the agent edited a file" and "the agent made a
reviewable semantic change."

## What Would Make FSL More Useful As An Agent Runtime Policy Language

FSL could become a practical guardrail layer for tool-using agents if the v6
effect model is precise enough.

The minimum viable policy story:

- tool calls are named effects
- each effect has an input schema and output schema
- each effect has an authority label
- each effect declares whether it is replayable
- each effect declares whether it can expose secrets
- policies can permit, deny, rate-limit, or require approval
- policy decisions are recorded as tape events
- counterexamples can include policy-violating traces

Example policy questions:

- Can this machine ever call a network tool after reading a secret?
- Can this machine retry a payment after a timeout?
- Can this machine delete a file without a prior user confirmation event?
- Can this machine call an LLM after loading private context?
- Can this machine reach `Approved` without passing through `HumanReview`?

Those are exactly the kinds of questions agents need answered before they run
automation on behalf of a user.

The core language does not need to become a full security framework in v6. But
the host/effect boundary should be shaped so that a security framework can be
strictly layered on top.

## Eval And Benchmark Design

If FSL wants to become more useful to LLMs, it should measure the actual tasks
LLMs perform.

I would add an agent eval suite with tasks like:

- summarize a machine without changing semantics
- find unreachable states
- add a transition requested in prose
- repair a parse error
- repair a failed safety property
- write a Dwyer-style property from prose
- identify lossy codegen
- choose a target from capability constraints
- minimize a counterexample
- produce a safe semantic patch
- explain a behavioral diff
- detect a stale patch
- detect a policy violation
- convert between FSL and JSON without loss
- refuse conversion when loss is unavoidable
- produce a review pack for a human

Each eval item should include:

- prompt
- source files
- allowed commands
- expected artifacts
- pass/fail checker
- known traps
- tags
- difficulty
- edition
- source hashes

This would let FSL test agent usefulness directly, instead of assuming that more
documentation automatically helps.

## Documentation Shape For Agents

The docs should exist in human-friendly form, but agents benefit from
predictable chunks.

I would create:

- `docs/llms/00-orientation.md`
- `docs/llms/01-grammar.md`
- `docs/llms/02-cli-json.md`
- `docs/llms/03-diagnostics.md`
- `docs/llms/04-common-repairs.md`
- `docs/llms/05-verification.md`
- `docs/llms/06-codegen-fidelity.md`
- `docs/llms/07-effects-policy.md`
- `docs/llms/08-examples-index.json`
- `docs/llms/09-anti-patterns.md`

Each Markdown file should start with:

- edition
- status
- source of truth
- generated/manual marker
- last schema version
- related commands

This makes docs safer to retrieve into a model context.

## Versioning And Compatibility

Agent tooling needs stable version promises.

I would separate:

- language edition version
- CLI version
- schema version
- conformance corpus version
- verifier version
- codegen target version
- registry artifact version

These should not be collapsed into one package version. A package release can
update docs or CLI behavior without changing language semantics. A schema can
add optional fields without changing the grammar. A verifier can improve and
invalidate stale proof artifacts without changing source meaning.

Every machine-readable object should say which version axis it depends on.

Compatibility policy should answer:

- Can old result envelopes be read by new tools?
- Can new optional fields be ignored?
- When can diagnostic codes disappear?
- When can canonical formatting change?
- When does a proof artifact become stale?
- When does codegen output need regeneration?
- When does a conformance vector move tiers?

These questions are not glamorous, but they determine whether agents can build
durable workflows.

## Suggested Verb Groups

The megaspec has a large CLI vision. I would group verbs by agent job:

Authoring:

- `parse`
- `format`
- `lint`
- `inspect`
- `patch`
- `explain`

Behavior:

- `run`
- `replay`
- `test`
- `check`
- `slice`
- `diff`

Portability:

- `capabilities`
- `codegen`
- `import`
- `export`
- `conformance`

Security:

- `effects`
- `policy-check`
- `redact`

Packaging:

- `pack`
- `publish`
- `registry`

Discovery:

- `list`
- `docs`
- `examples`
- `context`

The grouping matters less than the contract that every verb supports `--json`,
stable exits, and schema-tagged artifacts.

## Minimum Useful Agent Slice

If I had to choose the smallest slice that would materially improve Codex's
ability to work on FSL, I would pick this:

1. `parse --json`
2. `format --check`
3. `inspect --json`
4. `check --json`
5. `replay --json`
6. shared `diagnostic.v1`
7. shared `result.v1`
8. source hashes everywhere
9. codegen refusal/fidelity manifest
10. package-shape tests

That slice is less glamorous than registry search or natural-language synthesis,
but it makes every later feature safer.

## A More Concrete Definition Of "Agent-Friendly"

For v6, I would define agent-friendly as:

- Discoverable: the tool can tell me what it supports.
- Bounded: expensive work can be estimated, budgeted, paused, or refused.
- Located: every finding points to source spans and semantic IDs.
- Replayable: every behavior claim can be rerun from a compact bundle.
- Patchable: common edits can be represented structurally.
- Diffable: behavior changes are reported semantically, not only textually.
- Effect-aware: host authority is explicit.
- Loss-aware: conversion and codegen never silently drop semantics.
- Versioned: schemas, editions, and artifacts declare compatibility.
- Redactable: traces can be shared safely.
- Testable: examples and conformance vectors are executable.
- Reviewable: generated agent work produces human-readable evidence.

This is the lens I would use to decide whether a proposed feature helps LLMs.

## CI And Continuous Verification

For agents, CI is not just a gate. It is a fact source.

If a repository uses FSL, I would want a standard CI artifact directory that
agents can read without rerunning the whole world:

```text
.fsl/
  latest/
    inventory.json
    diagnostics.json
    checks.json
    coverage.json
    effects.json
    codegen.json
    conformance.json
    review-pack.json
```

The key artifact is `inventory.json`: a list of every FSL source file, source
hash, edition, detected profile, declared profile, generated artifacts, and last
known check result.

That gives Codex a cheap first move:

```text
read .fsl/latest/inventory.json
```

instead of:

```text
discover files, guess commands, run expensive checks, parse prose output
```

The CI output should distinguish:

- current facts from stale facts
- local facts from CI facts
- facts produced by trusted tools from facts produced by experimental tools
- checks skipped by configuration from checks that passed
- checks that timed out from checks that returned `undecided`

This also gives humans better review ergonomics. A pull request can attach an
FSL review pack showing exactly which machine semantics changed.

## Pull Request Review Packs

An agent working in a repository often has to answer one concrete question:

Did this change alter behavior in an acceptable way?

FSL should make that answer easy by producing a review pack:

```text
fsl review-pack --base main --head HEAD --json
```

or for explicit files:

```text
fsl review-pack old.fsl new.fsl --json
```

The review pack should include:

- source diff summary
- formatted-source diff status
- graph diff
- added/removed/changed states
- added/removed/changed transitions
- changed arrow kinds
- changed guards
- changed contracts
- changed properties
- changed effects and authorities
- changed start/final/error states
- changed generated artifacts
- changed conformance vectors
- proof invalidations
- replay bundles for newly failing properties
- recommended reviewer focus areas

Most languages cannot produce a semantic review pack cheaply. FSL can, because
the behavioral surface is explicit. That is a major advantage for agent-assisted
code review.

## Behavioral Diff Details

`diff --behavioral` should not be a fancy text diff. It should answer semantic
questions.

Useful diff categories:

- `state_added`
- `state_removed`
- `transition_added`
- `transition_removed`
- `transition_kind_changed`
- `action_changed`
- `guard_strengthened`
- `guard_weakened`
- `contract_added`
- `contract_removed`
- `effect_added`
- `effect_removed`
- `authority_expanded`
- `authority_reduced`
- `property_now_holds`
- `property_now_fails`
- `property_now_undecided`
- `target_now_supported`
- `target_now_lossy`
- `target_now_unsupported`

Some of these require approximation. That is fine if the result says so. An
approximate behavioral diff is still better than silently falling back to line
diffs.

The diff format should also mark review severity:

- `breaking`
- `behavioral`
- `security`
- `verification`
- `portability`
- `cosmetic`

This lets agents write useful PR summaries without inventing their own taxonomy.

## Proof And Certificate Artifacts

Proof artifacts should be treated as cached, inspectable objects, not just
terminal output.

A proof or verification result should record:

- property ID
- property source hash
- machine source hash
- normalized semantic artifact hash
- verifier name and version
- solver name and version, when applicable
- budget
- assumptions
- capability profile
- effect profile
- result: proved, failed, undecided, skipped, unsupported
- dependencies
- invalidation conditions
- witness or counterexample hash
- created timestamp

The important part is invalidation. A certificate should be able to say:

```text
valid only while source_hash = X
valid only under verifier >= A and < B
valid only under profile finite
valid only if hook H satisfies contract C
valid only if target manifest T supports features F
```

This would help agents avoid citing stale proofs after changing a guard, an
effect, or a target.

## Interface Cards

Every publishable or composable machine should have a compact interface card.

An interface card is not full documentation. It is the small object an agent
reads to decide whether a component might fit.

Suggested fields:

- name
- version
- edition
- source hash
- semantic hash
- summary
- accepted inputs
- emitted outputs
- states intentionally exposed
- states intentionally private
- final states
- error states
- required hooks
- required sensors
- required authorities
- effect classes
- assumptions
- guarantees
- proved properties
- unchecked properties
- known counterexamples
- conformance tier
- supported targets
- examples
- license/provenance

This is the bridge between local files and a future registry. A registry without
interface cards becomes search over prose. A registry with interface cards
becomes search over contracts.

## Machine-Readable Examples

Examples should be runnable and tagged. A pretty Markdown example is useful, but
an agent needs the metadata.

Each example should have:

- stable ID
- edition
- source hash
- task tags
- concepts demonstrated
- negative concepts avoided
- expected parse/check result
- expected trace, if runnable
- expected diagnostics, if broken
- related docs
- related commands

Example categories I would add:

- minimal valid machine
- evented transition
- forced transition
- main transition
- guarded transition
- final state
- error state
- input channel
- output channel
- hook with effect manifest
- replayable failure
- policy violation
- codegen refusal
- lossy import
- semantic patch
- behavioral diff
- proof `undecided`

Broken examples matter as much as correct examples. Agents learn repair behavior
from high-quality failures.

## Redaction And Shareability

Replay and trace artifacts are powerful, but they may contain secrets,
identifiers, customer data, prompts, file paths, tool outputs, or host callback
results.

FSL should define redaction at the artifact level:

- which fields are secret
- which fields are user-private
- which fields are environment-private
- which fields are safe to send to an LLM
- which fields are safe to include in CI
- which fields are safe to publish in a registry
- what replacement preserves replay shape

Redaction should preserve structure where possible:

```json
{
  "email": "<redacted:email>",
  "amount": 42,
  "token": "<redacted:secret>",
  "decision": "approved"
}
```

Agents need this because a counterexample is often most useful when pasted into
a prompt, attached to an issue, or sent to another tool. The toolchain should
make the safe version easy to obtain:

```text
fsl replay --redact llm --json failing.replay.json
```

or:

```text
fsl redact --policy llm trace.json
```

## MCP Surface Design

If FSL exposes MCP tools, I would keep them small and schema-aligned.

Useful MCP tools:

- `fsl_parse`
- `fsl_format`
- `fsl_inspect`
- `fsl_check`
- `fsl_replay`
- `fsl_patch_dry_run`
- `fsl_patch_apply`
- `fsl_behavioral_diff`
- `fsl_capabilities`
- `fsl_codegen_manifest`
- `fsl_explain_diagnostic`
- `fsl_examples_search`

Each MCP result should be exactly the same `fsl.result.v1` envelope the CLI
returns. The MCP layer should not be a parallel API with different names for the
same concepts.

For safety, MCP tools should expose effect and cost metadata:

- reads files
- writes files
- may run solver
- may be expensive
- may call external service
- max default timeout
- supports dry-run

This lets a host agent choose when to request user approval.

## IDE And Editor Affordances

The editor integration should be treated as another consumer of the shared
schemas, not as a special UI island.

Useful IDE features:

- inline diagnostics from `fsl.diagnostic.v1`
- hover cards from `fsl.context.v1`
- graph preview from semantic graph
- "explain diagnostic" action
- "show counterexample" action
- "replay to here" action
- "generate semantic patch" action
- "show behavioral diff" action
- "show target support" action
- "show effect manifest" action

The IDE should be able to export the exact same repair pack that the CLI can
consume. That gives a human a smooth path:

1. see a diagnostic in editor
2. ask for explanation
3. preview semantic patch
4. apply
5. rerun check
6. attach review pack to PR

Codex benefits when the IDE and CLI agree, because the user can point at an
editor problem and the agent can reproduce it from the command line.

## Multi-Agent Collaboration

FSL's artifact discipline could make it unusually good for multi-agent work.

The key is to avoid two agents free-editing the same text without coordination.
Instead, agents should exchange:

- context bundles
- diagnostics
- repair packs
- semantic patches
- replay bundles
- review packs
- proof artifacts

A useful collaboration flow:

1. Agent A runs `inspect` and produces a context bundle.
2. Agent B proposes a semantic patch against that source hash.
3. Agent A dry-runs the patch and produces a behavioral diff.
4. Agent C reviews changed effects and proof invalidations.
5. One agent applies the patch only if the source hash still matches.

This sounds elaborate, but the artifacts are small. It is much safer than asking
several agents to rewrite one file from memory.

## Human Override And Approval Points

Agent-friendly should not mean agent-autonomous by default.

Some operations should naturally produce approval points:

- adding an external effect
- expanding authority
- weakening a guard
- removing a contract
- changing a final/error state
- making import/export lossy
- accepting `undecided`
- allowing unsupported codegen loss
- increasing verification budget greatly
- publishing or signing an artifact

The result envelope could include:

```json
{
  "requires_approval": true,
  "approval_reason": "authority_expanded",
  "approval_summary": "New hook may write files under ./dist"
}
```

That gives agents a principled place to stop and ask the human.

## Risk Scoring

FSL could provide a lightweight risk score for changes. It should not pretend to
be objective truth, but it can prioritize review.

Inputs:

- graph reachability change
- guard weakening
- new effects
- expanded authorities
- removed properties
- failed or stale proofs
- lossy codegen
- target support regression
- new unbounded data/tape use
- new nondeterminism
- changed public interface card

Output:

- score
- category breakdown
- explanation
- suggested checks

The key is explainability. A risk score without reasons is not useful. A risk
score with reasons helps agents decide what to inspect first.

## Test Generation From Semantics

FSL should be able to generate tests from its semantic graph and properties.

Useful generated tests:

- every state reachable
- every transition can fire under some stimulus, if intended
- every final state reachable
- every error state either unreachable or intentionally reachable
- every guard boundary has examples
- every recovery edge has a failing stimulus
- every emitted channel has at least one trace
- every effect has a policy test
- every property has at least one positive or negative witness where applicable

Generated tests should not replace authored tests. They should give agents a
baseline, especially when repairing or extending an unfamiliar machine.

## Negative Capability Reporting

A target manifest should not only say what it supports. It should say what it
does not support and why.

For example:

```json
{
  "unsupported": [
    {
      "feature": "forced_transitions",
      "reason": "target runtime has no bypass channel",
      "possible_workaround": "emit explicit privileged action"
    }
  ]
}
```

Agents need this because "unsupported" without explanation leads to bad guesses.
Negative capability reports turn target limitations into actionable design
constraints.

## Error Codes As Product Surface

Diagnostic codes should be treated as public API.

Each code should have:

- stable name
- phase
- severity
- one-line message
- long explanation
- examples
- common causes
- safe repairs
- unsafe repairs
- related codes
- schema payload
- first version
- deprecated version, if any

The `fsl explain` command should be generated from this registry. The docs,
tests, editor, and CLI should all refer to the same source.

This makes diagnostics teachable. It also gives agents a reliable map from
failure to repair strategy.

## Prompt-Ready Output

Some outputs should be deliberately prompt-ready.

That does not mean fluffy prose. It means compact, bounded, and complete enough
to paste into an LLM context.

Examples:

```text
fsl inspect --prompt machine.fsl
fsl diagnostic --prompt FSL1234 machine.fsl
fsl review-pack --prompt old.fsl new.fsl
```

These should include:

- edition
- source hash
- relevant source slice
- relevant graph slice
- exact diagnostic
- constraints
- allowed commands
- expected output format

Prompt-ready output should be generated from the same schemas as JSON output,
not hand-written separately. Otherwise it will drift.

## Locality And Slicing

Large machines need slicing.

Useful slice modes:

- by state
- by transition
- by diagnostic
- by property
- by counterexample
- by effect
- by channel
- by changed source lines
- by generated target failure

The slice result should include both source and semantic context:

- source spans
- nearby declarations
- inbound/outbound edges
- relevant vals/props
- relevant guards
- relevant contracts
- relevant effects
- minimal replay, if available

This is one of the most practical agent features. It reduces the amount of text
I need to hold in context and makes local repair safer.

## Handling Partial Implementations

The current v6 worktree has several surfaces that are intentionally partial:
future import/export formats, early codegen, early verification, editor sketch,
and value-module ports.

Partial implementation is fine if the toolchain says so precisely.

Every partial feature should expose:

- implemented subset
- unsupported subset
- known lossy cases
- known false positives
- known false negatives
- stability level
- intended next milestone
- tests that currently define behavior

This could be a `fsl features --json` command or part of `capabilities`.

Agents handle partial systems badly when the boundary is implicit. We handle
them much better when the boundary is a data object.

## Rollout Phasing

I would phase agent support like this:

Phase 1: shared facts.

- result envelope
- diagnostic schema
- source hashes
- inspect/context
- capabilities
- package-shape tests

Phase 2: replay and repair.

- replay bundle
- semantic slices
- patch dry-run
- behavioral diff
- check budget/undecided schema

Phase 3: trust and portability.

- codegen fidelity manifests
- effect manifests
- proof artifacts
- interface cards
- conformance corpus export

Phase 4: collaboration and registry.

- review packs
- registry indexing artifacts
- MCP tools
- prompt-ready output
- eval suite

This ordering keeps the early work small but compounding.

## A Useful Motto For The Toolchain

The toolchain should try to make the next safe action obvious.

After any command, an agent should know one of these:

- the machine is valid and here are the artifacts
- the machine is invalid and here is the smallest repair context
- the question is undecided and here is the next bounded query
- the target is unsupported and here is the missing capability
- the conversion is lossy and here is the lost semantic
- the patch is stale and here is the conflicting source hash
- the change is risky and here is the reason

That is the practical version of agent-friendliness.

## Canonical Semantic Hashing

Source hashes are necessary but not sufficient. Agents also need semantic
hashes.

A source hash changes when formatting changes. A semantic hash should change
only when the normalized machine meaning changes. This gives tools a way to say:

```text
text changed, behavior did not
```

or:

```text
behavior changed, here is the semantic diff
```

I would define several hash layers:

- `source_hash`: exact bytes
- `formatted_source_hash`: canonical formatted bytes
- `ast_hash`: located AST with locations removed
- `graph_hash`: normalized semantic graph
- `interface_hash`: public boundary only
- `effect_hash`: host authority boundary only
- `property_hash`: normalized property set
- `proof_input_hash`: machine plus property plus assumptions plus verifier config
- `codegen_input_hash`: machine plus target manifest plus codegen options

This lets a review tool distinguish harmless churn from meaningful change. It
also lets a registry index by behavior rather than only by package version.

The semantic hash rules must be boring and public:

- stable key ordering
- explicit Unicode normalization
- explicit number representation
- no host-dependent object ordering
- no implicit defaults unless defaults are also versioned
- edition included in every hash domain

If FSL gets semantic hashing right, a lot of agent safety becomes easier.

## Located AST As A Public Artifact

The parser should expose a located AST as a supported artifact, not only as an
internal compiler detail.

Agents need the AST for:

- precise edits
- source slices
- diagnostics
- formatting checks
- semantic patch anchoring
- example extraction
- doc generation
- code actions

The located AST should have stable node kinds and stable node IDs. The IDs do
not need to survive arbitrary edits, but they should survive harmless formatting
changes. A practical ID can be derived from node kind, normalized content,
parent path, and source span.

Important AST commands:

```text
fsl parse --ast --json machine.fsl
fsl parse --tokens --json machine.fsl
fsl parse --lossless-cst --json machine.fsl
```

The AST and CST should be separate. Agents often need the semantic AST, but
formatters and precise code actions may need comments, whitespace, and original
tokens.

## Grammar Artifacts For Constrained Decoding

If FSL wants to be easy for LLMs to produce correctly, publish grammar artifacts
for constrained decoding.

Useful outputs:

- EBNF
- Lark
- GBNF
- tree-sitter grammar
- CodeMirror language package
- JSON schema for interchange
- JSON schema for patches
- JSON schema for result envelopes

The key is version alignment. The grammar artifact should say:

- language edition
- generator version
- source grammar hash
- supported subset
- known ambiguities
- known divergences from parser

For agents, constrained decoding is most valuable for small generated fragments:

- transition blocks
- property declarations
- patch JSON
- interface cards
- effect manifests

Trying to constrain-generate a whole large machine may not be necessary. The
more common use case is safe fragment insertion.

## Portable IR And VM Shape

The megaspec gestures toward portable artifacts. I would make the portable IR
explicitly agent-readable.

A good IR should be:

- normalized
- typed
- span-linked
- hashable
- deterministic
- independent of host runtime quirks
- explicit about unsupported constructs
- able to round-trip enough information for review

It should separate:

- states
- transitions
- guards
- actions
- vals/props
- contracts
- channels
- effects
- properties
- metadata

The IR does not need to be pretty. It needs to be stable.

An agent should be able to run:

```text
fsl lower --ir --json machine.fsl
```

and receive the object that verification, codegen, diff, and registry indexing
all consume.

If every tool invents its own projection of the machine, agents will find drift.
If every tool consumes the same IR, agents can reason about the toolchain as a
pipeline.

## Host Adapter ABI

The host boundary is where otherwise clean semantics get messy. I would define a
small host adapter ABI early.

The ABI should cover:

- hook call shape
- sensor read shape
- channel send/receive shape
- time source
- random source
- external error representation
- cancellation
- timeout
- rollback notification
- replay injection
- redaction tags
- authority checks

Each adapter should declare:

- which ABI version it implements
- which effects it can perform
- which failures it can report
- whether calls are deterministic
- whether calls are replayable
- whether calls can be simulated

This helps codegen too. A generated target should not invent a hidden calling
convention for hooks. It should target an ABI and emit a manifest saying so.

## Determinism Ledger

Determinism should be auditable.

For every run, FSL should be able to produce a determinism ledger:

- seed used
- input stimuli
- sensor reads
- hook returns
- time reads
- random draws
- external decisions
- replayed values vs live values
- nondeterministic sources refused or recorded

This is slightly different from a trace. A trace describes what the machine did.
A determinism ledger describes why the run is reproducible.

Useful command:

```text
fsl run --ledger --json machine.fsl
```

or as part of replay:

```text
fsl replay --verify-ledger --json run.replay.json
```

Agents need this because "I reproduced the failure" should be a checkable claim,
not a feeling.

## State Space Budget Model

Budgeting should be stated in domain terms, not only wall-clock terms.

Useful budget dimensions:

- states explored
- transitions explored
- symbolic states explored
- path length
- microsteps
- solver time
- memory
- tape length
- widened domains
- property count
- effect stubs

The estimate command should return a budget model:

```json
{
  "schema": "fsl.estimate.v1",
  "finite": true,
  "estimated_states": 128,
  "estimated_transitions": 220,
  "dominant_factor": "bounded_int:counter",
  "recommended_budget": {
    "states": 1000,
    "time_ms": 5000
  }
}
```

Agents can use this to choose a reasonable next command. Humans can use it to
understand why a check is expensive.

## Properties As Named Assets

Properties should be treated as named assets with lifecycle, not just inline
syntax.

Each property should have:

- ID
- title
- source span
- pattern family
- severity
- owner, if useful
- assumptions
- dependencies
- last result
- proof artifact
- counterexample artifact
- review status

Useful commands:

```text
fsl properties --json machine.fsl
fsl property explain prop.no_dead_end --json machine.fsl
fsl property check prop.no_dead_end --json machine.fsl
```

This helps agents avoid the common mistake of treating all properties as equal.
Some are hard invariants. Some are advisory. Some are known research checks.
The machine should say which is which.

## Assumption Tracking

Assumptions are where many false proofs hide.

FSL should make assumptions visible:

- bounded domains
- finite input alphabets
- hook contracts
- sensor ranges
- environment fairness
- target runtime guarantees
- ignored effects
- abstracted data
- stubbed randomness
- redacted values

Every proof, codegen manifest, and review pack should list its assumptions.

An agent should be able to ask:

```text
fsl assumptions --json machine.fsl
```

and:

```text
fsl assumptions --for-proof prop.safe --json machine.fsl
```

This is especially important when FSL becomes attractive as an agent safety
language. A safety claim without assumption visibility is too easy to overstate.

## Round-Trip Laws

The toolchain should publish round-trip laws as tests and docs.

Examples:

```text
parse(format(parse(source))) == parse(source)
format(format(source)) == format(source)
import(export(source, json), json) preserves graph_hash, unless lossy
codegen(source, target) passes target conformance vectors
patch(source, diff(source, patched)) == patched, where supported
replay(run(source, tape)) == run(source, tape)
```

Agents need these laws because they tell us which transformations are safe to
compose.

The laws should be executable:

```text
fsl law-check --json machine.fsl
```

For partial implementations, the result can say which laws are not yet claimed.

## Command Manifest

The CLI should publish a command manifest:

```text
fsl commands --json
```

It should include, for every command:

- name
- aliases
- stability
- input files
- output schemas
- writes files
- can use network
- can be expensive
- supports `--json`
- supports `--dry-run`
- supports stdin/stdout
- exit codes
- related docs
- examples

This is both discoverability and safety. An agent should not have to scrape help
text to learn whether a command writes files.

## Exit Codes As Contract

Semantic exit codes should be stable and documented.

At minimum:

- `0`: success
- `1`: user-correctable failure
- `2`: internal/tool failure
- `3`: verification failed
- `4`: verification undecided
- `5`: unsupported feature or target
- `6`: lossy conversion refused
- `7`: stale source hash or patch conflict
- `8`: policy violation
- `9`: budget exceeded

The JSON envelope is primary, but exit codes matter in CI and shell automation.
Agents call shell tools constantly. Stable exit codes reduce guesswork.

## Agent Contract Tests

FSL should have tests specifically for agent contracts.

These are not normal language tests. They assert that the toolchain remains
usable by machines.

Examples:

- every command advertised in `fsl commands --json` supports `--help`
- every `--json` output validates against its schema
- every diagnostic code has an `fsl explain` entry
- every suggested fix is either a valid semantic patch or explicitly prose-only
- every generated prompt summary includes source hash and edition
- every lossy conversion reports loss in the result envelope
- every codegen target has a negative capability report
- every registry/interface artifact has schema and hash fields

These tests should run in CI. They are the backstop against agent-facing drift.

## Current Implementation Hooks To Reuse

The v6 worktree already has useful seams.

I would reuse:

- `fsl_capabilities.ts` as the start of target and machine capability reporting
- `fsl_verify.ts` as the first safety/check result shape
- `fsl_tape.ts` as the seed for replay and ledger artifacts
- `fsl_errors.ts` as the runtime error taxonomy seed
- `conformance/corpus_types.ts` as the trace/corpus public artifact seed
- `cm6-editor/diagnostics.mjs` as evidence that diagnostics can be pure data
- `interchange/types.ts` as the place to harden loss reporting
- `codegen.ts` as the first target that should emit a manifest

The work does not need to start from zero. The main move is to connect these
seams through shared schemas and CLI contracts.

## Agent-Facing Stability Levels

Because v6 is alpha, not every surface can be stable. That is fine, but agents
need the stability level in data.

Suggested levels:

- `experimental`: may change without notice
- `preview`: intended shape, migration likely
- `stable`: compatible within edition
- `deprecated`: supported but scheduled for removal
- `removed`: known old surface, no longer supported

Every command, schema, diagnostic code, artifact, codegen target, and grammar
export should declare a stability level.

This prevents a model from treating an experiment as a contract.

## Migration Artifacts

When FSL editions change, migration should be structured.

Useful outputs:

```text
fsl migrate --from v6alpha2 --to v6alpha3 --dry-run --json machine.fsl
fsl migrate --explain --json machine.fsl
```

Migration result should include:

- source hash
- old edition
- new edition
- semantic hash before
- semantic hash after
- text edits
- semantic diff
- laws checked
- manual actions required
- deprecated constructs

This is another area where agents can be very helpful if the operation is
bounded and reviewable.

## Registry Trust Tiers

A future registry should avoid a single "verified" badge.

Useful trust dimensions:

- source available
- schema-valid
- conformance-tested
- proof-checked
- proof-current
- effects-declared
- effects-policy-compatible
- target-certified
- maintainer-signed
- reproducibly-built
- externally-audited
- deprecated
- revoked

Agents need multi-dimensional trust. A component can be conformance-tested but
have undeclared effects. Another can be signed but not proof-current. A single
badge hides exactly the information an agent needs.

## Supply Chain And Provenance

FSL artifacts should include provenance fields from the beginning.

Useful fields:

- source repository
- commit
- worktree dirty status
- package version
- tool version
- generation command
- generation timestamp
- host platform
- dependency lock hash
- signature, if any
- signer identity, if any

This matters for generated code and proofs. A generated target without
provenance is hard to trust and hard to regenerate.

## Time And Randomness

Time and randomness should be modeled as explicit inputs at the agent boundary.

Useful rules:

- no ambient clock in checkable profiles
- live time reads recorded in the ledger
- random draws come from named streams
- seed and stream position recorded
- replay can inject time and random values
- codegen target declares time/random support

Agents frequently miss hidden nondeterminism. FSL can make it visible.

## Floating Documentation Claims

One subtle risk in a large spec is documentation that makes claims no tool
checks.

For example:

```text
This conversion is lossless.
This profile is finite.
This target is certified.
This property is proved.
```

I would prefer every strong claim in docs to map to a command:

- lossless -> `fsl export --check-loss`
- finite -> `fsl capabilities --require finite`
- certified -> `fsl codegen --certify`
- proved -> `fsl check --property`

Docs should distinguish "design intent" from "tool-checkable claim." Agents are
especially likely to over-trust confident prose.

## Human-Readable Narratives From Artifacts

The spec mentions narration. I would make narration a derived view, never the
source of truth.

Good narrative output:

- cites artifact IDs
- cites source spans
- cites diagnostic codes
- cites replay IDs
- says when it is summarizing
- says when it is inferring
- links to JSON artifacts

Bad narrative output:

- invents causal claims not present in the trace
- hides uncertainty
- omits source hashes
- rewrites diagnostics into vague advice

Agents can use narrative output, but only if the narrative is tied back to data.

## Better Defaults For New Projects

`fsl init` should create an agent-ready project shape.

Suggested files:

```text
fsl.config.json
machines/
tests/
properties/
policies/
examples/
.fsl/cache/
.fsl/latest/
docs/llms/
```

Suggested defaults:

- JSON output enabled in CI
- formatter check enabled
- package-shape check enabled for libraries
- conformance corpus scaffold
- redaction policy stub
- effect policy stub
- example machine with one property and one replay

Starting agent-ready is easier than retrofitting.

## Acceptance Criteria For "LLM-Ready"

I would not call v6 LLM-ready just because it has docs for LLMs.

A stronger acceptance bar:

1. A fresh agent can discover commands without reading prose docs.
2. A fresh agent can inspect a machine with one JSON command.
3. A failed parse/check returns a source-spanned diagnostic with a stable code.
4. A failed safety property returns a replayable counterexample bundle.
5. A suggested fix can be represented as a dry-run semantic patch.
6. Codegen refuses unsupported semantics by default.
7. Every generated artifact has source hash and tool version.
8. Every lossy import/export reports loss in structured data.
9. CI can publish an FSL inventory and review pack.
10. Docs, CLI, editor, and MCP use the same diagnostic codes.

That is a concrete finish line.

## Corpus Governance

The conformance and LLM-facing corpora should have governance rules, not just
files in a folder.

Each corpus item should declare:

- stable ID
- owner
- edition
- status
- feature tags
- expected result
- source hash
- semantic hash
- generated/manual marker
- reviewer
- last reviewed version
- deprecation status
- replacement item, if deprecated

The corpus should also distinguish:

- normative conformance cases
- regression cases
- stochastic/dragon cases
- documentation examples
- LLM repair examples
- adversarial examples
- target-specific examples
- intentionally unsupported examples

Agents need this because examples are evidence. If all examples look equally
authoritative, agents will learn the wrong lesson from sketches, old drafts, or
target-specific hacks.

## Corpus Splits And Contamination

If FSL uses examples to evaluate LLM behavior, it should split the corpus.

Suggested splits:

- `train`: public examples intended for retrieval and fine-tuning
- `dev`: public-ish examples for prompt and tool development
- `eval`: held-out examples for scoring agent behavior
- `adversarial`: tricky examples meant to expose overconfidence
- `canary`: private or rotating examples to detect memorization

Each item should say whether it may appear in docs, prompts, tests, or public
registry examples.

This matters because a model can appear good at FSL simply by seeing the exact
examples. A serious agent eval needs stable IDs and contamination policy.

## Tolerant Parsing And Partial ASTs

Agents often help while code is broken. A parser that only says "failed" is less
useful than one that can recover enough structure to support local repair.

I would add a tolerant parse mode:

```text
fsl parse --partial --json machine.fsl
```

It should return:

- diagnostics
- recovered AST fragments
- missing-token placeholders
- skipped-token ranges
- confidence per recovered node
- source spans that are safe to edit
- source spans that are unreliable

This should not be used for verification or codegen. It is an editor and repair
tool. The result envelope should mark it as partial.

For agents, partial ASTs are valuable because they allow a repair strategy like:

1. preserve known-good declarations
2. isolate broken fragment
3. propose a small patch
4. reparse strictly

That is much safer than rewriting the file around a syntax error.

## Diagnostic Recovery Strategies

Each diagnostic code should be able to name recovery strategies.

For example:

- insert missing semicolon
- quote a label
- rename duplicate state
- choose valid arrow kind
- add missing target state
- narrow `any`
- add bound
- declare hook
- remove unsupported feature for target

Strategies should be typed:

- automatic semantic patch
- automatic text edit
- interactive choice
- explanation only
- unsafe suggestion

The agent should be able to ask:

```text
fsl fix-options FSL1234 --json machine.fsl
```

and receive a list of possible repairs with preconditions and risk labels.

This is more useful than a single "suggested fix" string.

## Semantic Linting

Beyond parse/check, FSL should have semantic lint rules.

Useful lint classes:

- unreachable state
- ambiguous action
- near-duplicate state names
- terminal state not marked final
- error state reachable without recovery
- guard always true
- guard always false
- transition shadowed by earlier priority
- effect not declared
- hook declared but unused
- channel emitted but never consumed
- property too weak
- property references private state
- target-incompatible construct
- unbounded data where finite profile claimed
- nondeterminism in deterministic profile

Each lint should be suppressible with a structured reason, not a bare comment.

The key for agents is that lint output should be patchable and reviewable.
Some lints are style; some are real safety concerns. The severity and category
must be explicit.

## Workspace Indexing

Large projects will contain many machines, generated artifacts, policies,
properties, and tests. Agents need a workspace index.

Useful command:

```text
fsl workspace index --json
```

The index should include:

- every FSL source file
- machine IDs
- semantic hashes
- imports/includes/dependencies
- generated outputs
- property files
- policy files
- test vectors
- conformance vectors
- stale artifacts
- duplicate machine names
- dependency graph
- last known status from `.fsl/latest`

This prevents agents from treating one open editor tab as the whole system.
It also supports changed-only checks and smarter review packs.

## Cross-Machine Dependencies

If v6 supports composition or systems of machines, cross-machine dependencies
should be explicit.

Each edge between machines should declare:

- source machine
- target machine
- channel/event mapping
- payload mapping
- assumptions
- backpressure or queue policy
- failure propagation
- timeout policy
- authority boundary
- version requirement

Agents need this because local edits can have nonlocal effects. Renaming an
output event in one machine may break a composed system even if the edited file
still checks alone.

## Refinement And Compatibility Checking

A major agent workflow is "change this without breaking callers."

FSL should expose compatibility checks:

```text
fsl refine-check old.fsl new.fsl --json
fsl interface-check old.fsl new.fsl --json
```

Useful questions:

- Does new accept all old valid inputs?
- Does new preserve old guarantees?
- Are emitted events compatible?
- Are error states less reachable, equally reachable, or more reachable?
- Did required effects increase?
- Did assumptions get stronger?
- Did nondeterminism increase?
- Did target support regress?

This is stronger than a behavioral diff. A diff says what changed. A refinement
check says whether the change is substitutable.

## Mutation Testing For Properties

Properties can be too weak. Agents often write properties that sound good but do
not catch meaningful bugs.

FSL can help with mutation testing:

```text
fsl mutate --properties --json machine.fsl
```

Useful mutants:

- remove transition
- reverse transition
- change arrow kind
- weaken guard
- strengthen guard
- remove final marker
- make error state reachable
- drop emitted output
- change hook result
- increase timeout
- remove recovery edge

The result should say which properties killed which mutants. If a safety
property kills nothing, an agent should not present it as meaningful evidence.

## What-If Analysis

Agents often need to answer "what would happen if..."

Useful command:

```text
fsl what-if --json machine.fsl
```

Inputs could include:

- force this state as start
- assume this hook returns value
- disable this transition
- set this val
- inject this event
- impose this target capability set
- impose this policy

Outputs:

- changed reachable states
- changed properties
- changed effects
- changed traces
- new counterexamples
- risk score

This should be explicitly sandboxed and non-persistent. It is analysis, not a
source edit.

## Interactive Debugger Protocol

The debugger should also have a machine protocol.

Useful operations:

- start
- step macrostep
- step microstep
- continue until state
- continue until property violation
- continue until effect
- inspect state
- inspect vals/props
- inspect tape
- inspect ledger
- inject event
- branch replay
- export replay

The protocol should be usable by CLI, IDE, MCP, and tests. The visual debugger
can be beautiful, but the protocol should be plain data.

Agents benefit because debugging becomes scriptable instead of screen-bound.

## Runtime Observability

Production use needs a flight recorder.

Useful runtime events:

- machine_started
- macrostep_started
- transition_considered
- guard_evaluated
- transition_taken
- transition_refused
- hook_called
- hook_returned
- effect_requested
- effect_allowed
- effect_denied
- emit_buffered
- emit_committed
- rollback_started
- rollback_completed
- property_observed
- machine_stabilized

Each event should have:

- machine ID
- run ID
- trace ID
- source span, when applicable
- semantic node ID
- timestamp or logical clock
- redaction labels

This would let agents connect production traces back to source-level repairs.

## Stdlib Metadata

Every standard library function/operator should be machine-readable.

Fields:

- name
- signature
- totality
- determinism
- purity
- possible error kinds
- finite-profile support
- target support
- algebraic laws
- examples
- edge cases
- replacement suggestions

Agents use stdlib functions by analogy. If the metadata says `div` can raise
`div_by_zero`, a repair tool can suggest a guard. If a function is not supported
in T1, codegen can refuse early.

## Units, Unicode, And Locale Tables

The spec has rich ambitions around units and Unicode. Those are high-risk areas
for agents because host languages differ.

For each such feature, publish:

- exact table version
- normalization rules
- comparison rules
- serialization form
- target support
- unsupported approximations
- conformance vectors
- examples of surprising cases

Agents should not infer Unicode or unit behavior from host language habits.
The toolchain should make the FSL rule discoverable.

## Numeric Semantics Matrix

Numbers are another portability trap.

Publish a numeric matrix covering:

- bounded ints
- overflow
- underflow
- division
- modulo/remainder
- decimal
- float/double, if present
- NaN behavior
- ordering
- rounding
- saturation/wrapping, if ever allowed
- target support
- error kinds

This matrix should be both documentation and data. Codegen, verification, and
agent docs should consume the same source.

## Target Conformance Harnesses

Every codegen target should have a harness contract.

The harness should:

- compile generated code
- run conformance vectors
- emit canonical traces
- compare against reference traces
- report unsupported vectors
- report lossy vectors
- record target runtime version

Useful command:

```text
fsl target-test --target native:typescript --json corpus/
```

This is how generated code becomes trustworthy. Without target harnesses,
codegen manifests are promises without regular evidence.

## Adapter Shims And Golden Traces

For third-party adapters, FSL should require golden trace comparison.

An adapter might not preserve every FSL semantic. That is acceptable only if the
adapter says exactly which traces it preserves and which it cannot.

Adapter packages should ship:

- capability manifest
- ABI manifest
- conformance subset
- golden traces
- loss report
- examples
- negative capability report

Agents need this because adapters to external state-machine libraries often look
more faithful than they are.

## Feature Interaction Matrix

Many bugs live at feature intersections.

FSL should maintain a feature interaction matrix:

- guards + forced transitions
- hooks + rollback
- emissions + rollback
- probabilistic transitions + replay
- Unicode identifiers + codegen
- units + numeric overflow
- channels + composition
- sensors + verification
- target codegen + effects
- partial import/export + start states

Each intersection should have status:

- specified
- implemented
- tested
- conformance-covered
- unsupported
- deferred

This helps agents avoid assuming that two individually supported features work
together.

## Semantic Search

A future registry and local workspace both need semantic search.

Useful search queries:

- machines that accept event X
- machines that emit event Y
- machines that guarantee property P
- machines requiring no network effects
- machines compatible with target T
- machines with replay examples for failure F
- machines similar to this interface card
- machines whose behavior changed in this PR

Search results should be interface cards, not blobs of source.

This is another reason to invest in interface hashes and metadata early.

## Agent Task Recipes

Docs should include task recipes in a machine-readable index.

Examples:

- "add a state"
- "rename an action"
- "make an error state recoverable"
- "add a timeout"
- "add a property"
- "port to TypeScript"
- "investigate failed proof"
- "minimize counterexample"
- "prepare PR review pack"
- "check policy before tool use"

Each recipe should include:

- goal
- commands
- expected artifacts
- failure modes
- safe stopping points
- approval points

Agents do better with recipes than with only reference docs.

## Approval Policy Templates

For agent safety use cases, ship policy templates.

Examples:

- no network after secret read
- user approval before file deletion
- user approval before payment
- no LLM call with private context
- retry limit for external effects
- escalation after repeated failure
- human review before final approval
- deny tool use in error state

Each template should include a machine-readable property/policy plus examples
and counterexamples.

This would make FSL immediately useful as a guardrail language.

## Explainable Suggestions

Suggested fixes should include why they are suggested.

Fields:

- diagnostic code
- triggering evidence
- proposed patch
- expected effect
- risk
- alternatives
- why alternatives were not chosen
- checks to rerun

This avoids the bad pattern where an agent blindly applies a plausible-looking
fix. The fix should carry its own review argument.

## Non-Goals For Agent Support

It may help to state non-goals, because otherwise the spec can expand forever.

I would not make v6 promise:

- perfect natural-language-to-FSL synthesis
- autonomous repair of arbitrary semantic failures
- full verification for unbounded systems
- universal lossless import/export
- faithful codegen to every state-machine library
- secure tool use without explicit effect declarations
- registry trust without provenance and policy

These are fine aspirations. They should not be implied by the first agent-ready
surface.

## When To Refuse

The toolchain should teach agents refusal conditions.

Refuse or require explicit override when:

- codegen would drop semantics
- import/export would be lossy
- patch source hash is stale
- verification budget is exceeded
- proof assumptions are unsatisfied
- effect authority expands
- redaction policy is missing for sensitive trace
- target lacks required feature
- migration changes semantic hash unexpectedly
- package shape does not match manifest

Good refusal is an agent feature. It turns a dangerous guess into a clear next
step.

## Quality Bar For Generated Prose

Any generated explanation should have a quality bar.

It should:

- be traceable to artifacts
- avoid unstated certainty
- name assumptions
- include source spans or IDs
- include replay commands for behavior claims
- include target manifest IDs for portability claims
- include proof IDs for verification claims
- mark speculation

This applies to `--narrate`, prompt summaries, PR comments, and docs generated
from artifacts.

## Gemini-Derived Directions Worth Adding

After reading Gemini's separate note, I think the strongest additional theme is
that FSL should not only help agents repair machines. It should help agents
search design space under formal constraints.

My memo so far emphasizes artifacts, safety, replay, review, packaging, and
repair. Gemini's most useful additions push harder on synthesis, disambiguation,
optimization, and agent collaboration.

## Semantic Holes And Guided Completion

FSL should consider typed semantic holes:

```text
val retries : int 0..? = 0;
```

or:

```text
where balance >= ?;
```

A hole is not an unchecked TODO comment. It is a typed, located, explicitly
unknown term in the AST.

Useful behavior:

- parser accepts holes only in declared sketch/experimental mode
- typechecker assigns each hole a type and constraint set
- verifier can report required bounds or admissible values
- codegen refuses holes
- formatter preserves holes
- diagnostics name the hole ID and source span
- patch system can fill holes by ID

This would give agents a safe way to express partial knowledge. Instead of
guessing magic constants, an agent can leave a hole, ask the checker for
constraints, and fill the value that satisfies the property set.

## Test-Driven Sketching

`fsl sketch` would sit between full synthesis and ordinary editing.

The agent supplies:

- states
- events
- examples
- tests
- expected traces
- required properties
- maybe partial transitions

The toolchain tries to complete the missing transition logic.

If it succeeds, it should return:

- completed FSL
- assumptions
- proof/check results
- generated semantic patch
- traces showing the tests pass

If it fails, it should return:

- unsatisfied tests
- partial candidate graph
- smallest missing route or contradiction
- suggested new state/event/property to disambiguate

This is a practical synthesis step because it is bounded by concrete tests and
machine structure rather than open-ended natural language.

## PICK-Style Disambiguation

Gemini's strongest suggestion is PICK-style disambiguation: when several
candidate machines satisfy the vague request, generate concrete differentiating
scenarios and ask a human or domain agent which behavior was intended.

FSL is unusually suited to this because the differentiator can be a solver query:

```text
find tape T such that walk(A, T) differs from walk(B, T)
```

Useful commands:

```text
fsl differentiate a.fsl b.fsl --json
fsl pick candidates/*.fsl --json
fsl pick candidates/*.fsl --web
```

The result should include:

- candidate IDs
- differentiating tape
- state/output/property result for each candidate
- shortest natural-language scenario summary
- source spans responsible for divergence
- adjudication prompt
- machine-readable choice record

This bridges ambiguous human intent and formal semantics. Instead of asking
"is this abstract machine correct?", FSL can ask "in this concrete scenario,
which outcome did you mean?"

## Design-Space Search And Optimization

Agents are good at proposing rough structures. Solvers and stochastic search are
better at tuning bounded spaces.

FSL should expose optional design-space tools:

```text
fsl evolve --objective "minimize states" machine.fsl
fsl auto-tune --objective "maximize throughput" system.fsl
fsl score --json machine.fsl
```

Useful metrics:

- state count
- transition count
- state-space size
- proof cost
- target portability
- effect surface
- profile tightness
- queue depth
- latency bound
- dropped-message cost
- property coverage

The important safety rule: optimization must preserve declared properties unless
explicitly told otherwise. The tool should return a semantic patch and proof
delta, not silently rewrite source.

`fsl score` is especially interesting because agents optimize feedback signals.
The score must be transparent and multi-dimensional, not a single magic number.

## Trace Bisecting And Focused Tape Explanation

Long traces are hard for agents. Gemini's `fsl bisect-tape` and
`fsl explain-tape --focus` ideas are worth adding directly.

Useful commands:

```text
fsl explain-tape failing.replay.json --focus val.balance --json
fsl bisect-tape passing.replay.json failing.replay.json --json
```

`explain-tape --focus` should filter a replay to:

- steps where a value changed
- steps where a guard read that value
- steps where a property depending on it changed truth value
- relevant source spans
- causal predecessor steps

`bisect-tape` should identify:

- first divergent macrostep
- differing state, value, output, effect, or property
- source edits linked to the divergent semantic node
- minimal replay prefix

This would make regression debugging much more mechanical for agents.

## Production-To-Prompt Bridge

The runtime flight recorder should be able to turn production failures into
safe, bounded agent repair tasks.

Useful command:

```text
fsl alert-to-prompt incident.json --redact llm
```

It should produce:

- source hash
- relevant source slice
- redacted replay bundle
- failure diagnostic
- property/contract violated
- minimal trace prefix
- environment assumptions
- allowed repair surface
- suggested commands

The prompt output should be derived from artifacts, not free prose. This closes
the loop from production incident to reproducible local repair without asking a
human to translate logs into a debugging story.

## Stateful Mocks From Machines

`fsl mock` is a strong polyglot-agent idea.

Given an FSL machine with channels and effects, the toolchain can provide a
verified stateful mock service:

```text
fsl mock backend.fsl --http --json
fsl mock payments.fsl --mcp --json
```

The mock should:

- expose declared input events
- emit declared outputs
- enforce stateful protocol rules
- provide deterministic seeds
- export tapes from test runs
- simulate failure paths
- report coverage of mocked states/transitions

This keeps agents from hand-writing fragile host-language mocks that drift from
the formal spec.

## Legacy Lifting

`fsl lift` is risky but valuable if framed as assisted extraction, not magic
conversion.

Useful workflow:

```text
fsl lift --from legacy.py --json
```

The tool should return:

- candidate states inferred from flags/enums/classes
- candidate events inferred from methods/messages
- candidate guards inferred from conditionals
- side effects requiring host hooks
- uncertainty annotations
- uncovered code paths
- generated sketch FSL with holes
- test vectors extracted from existing tests, if available

This should not claim correctness. It should produce a reviewable migration
brief and a partial machine for an agent/human to refine.

## Ephemeral Agent Workbench

An agent often needs to try several related machines before touching the real
workspace.

`fsl workbench` could provide an in-memory sandbox:

```text
fsl workbench start --json
fsl workbench put machine.fsl --session S
fsl workbench check --session S --json
fsl workbench commit --session S --patch
```

The important property is that broken intermediate designs do not churn the
filesystem, trigger CI, or confuse later context gathering.

The commit operation should emit a semantic patch or review pack, not silently
write many files.

## Dynamic Agent Prompt And Onboarding Manifest

Gemini's `fsl export-system-prompt` and `agent.json` suggestions are compatible
with the existing `llms.txt` direction.

`fsl export-system-prompt` should generate an edition- and project-specific
agent brief from:

- grammar artifact
- command manifest
- diagnostic registry
- feature manifest
- project `agent.json`
- examples index
- current capability profile
- active policies

`agent.json` or `fsl-agent-manifest.yaml` should answer:

- what are the entrypoint machines?
- what are the verification goals?
- what commands are safe to run?
- what generated artifacts are authoritative?
- what policies govern edits?
- where are examples/properties/tests?
- what should an agent never do without approval?

This turns onboarding from README scraping into a stable machine-readable
contract.

## Documentation Feedback Loops

Gemini's shadow-mode documentation telemetry is worth preserving, with privacy
care.

The toolchain could record local, opt-in aggregate stats:

- diagnostic codes agents hit often
- commands agents misuse
- examples agents retrieve before successful fixes
- examples retrieved before failed fixes
- docs chunks never retrieved
- docs chunks associated with repeated confusion

This should not collect source text by default. The useful artifact is a
documentation heatmap that says where agents need better examples.

`fsl check-docs` also belongs here: every code block and claimed command in the
docs should be executable or explicitly marked illustrative.

## Multimodal And Visual Debugging

I would not make visual output primary, but Gemini is right that multimodal
models can use it.

Useful command:

```text
fsl render --highlight-error failing.replay.json --format svg
```

The rendered artifact should be paired with JSON:

- highlighted path IDs
- failing state ID
- edge IDs
- source spans
- diagnostic code
- alt text summary

This keeps the visual artifact grounded. A model can look at the diagram, but
the diagram remains tied to semantic IDs and source spans.

## Literate And Notebook Execution

Markdown-native FSL blocks are a useful bridge between human design docs and
agent-readable executable specs.

Useful command:

```text
fsl notebook check design.md --json
```

It should:

- extract FSL blocks
- assign block IDs
- check parse/format/properties
- run declared examples
- report stale prose claims where possible
- emit artifacts per block
- support fenced block attributes for edition/profile

The key discipline is that prose remains commentary and FSL blocks remain the
source of executable truth.

## Verified Synthetic Data And Curriculum Generation

FSL can generate trace data that is logically coherent by construction.

Useful commands:

```text
fsl walk --synthetic-data --count 10000 --json machine.fsl
fsl generate-curriculum --json registry/
```

Synthetic data generation should record:

- machine hash
- property set
- generation policy
- seed
- coverage goals
- redaction status
- output schema

Curriculum generation should produce `(broken, counterexample, fixed)` tuples
with stable IDs and difficulty tags.

This would help both agent evals and future model training, as long as the
corpus split/contamination policy is respected.

## Reasoning-Oriented LSP

The current LSP idea should be sharpened into an agent mode that streams
semantic constraints, not only editor affordances.

`fsl lsp --agent-mode` should support:

- incremental parse/check status
- early warning when a streamed edit violates an invariant
- proposed completion constrained by profile/target
- live state-space estimate
- live capability changes
- live effect-surface changes
- changed-check recommendations

This is different from human autocomplete. It is the verifier acting as a live
second mind while the agent edits.

## Verifiable System Prompt

The "system prompt as FSL policy machine" idea should stay prominent.

An MCP host could gate tools through a machine:

```text
fsl mcp --policy guard.fsl
```

Every proposed tool call becomes an event. The policy machine decides whether
that event is legal in the current state. This can express constraints like:

- tests must pass before deploy
- user approval before deletion
- no network after secret read
- no payment retry after committed success
- no publishing while verification is undecided

This is not merely an FSL application. It is a way for FSL to govern the agents
that use FSL.

## Zero-Knowledge And Cryptographic Targets

Gemini's `export --zk-snark` idea is ambitious and probably not v6-core, but it
is an interesting long-term target because FSL's boundedness gives it a better
shot than a general-purpose language.

I would classify it as research/roadmap:

- bounded finite machines only
- no undeclared effects
- explicit numeric domains
- target manifest for circuit backend
- proof of semantic preservation required
- conformance vectors for circuit execution

It is not a near-term priority, but it is a useful stress test for the IR and
capability model.

## Natural-Language Views With Round-Trip Discipline

Gemini's "toggle-view" story view is risky but points at a useful direction:
structured natural-language projections.

I would not allow arbitrary prose edits to silently rewrite FSL. A safer version:

- generate a structured narrative from AST/graph
- each paragraph links to semantic IDs
- edits become proposed semantic patches
- patches must pass parse/check/round-trip laws
- ambiguous prose triggers PICK-style disambiguation

This preserves the useful human/LLM affordance while keeping FSL as the source of
truth.

## Machine Testing Taxonomy

FSL should treat testing as a first-class family of machine artifacts, not as a
single `test` verb.

The useful distinction is:

- tests execute examples
- fuzzers search behavior
- mutation tests evaluate test strength
- model checkers prove or refute properties
- conformance tests compare runtimes
- refinement tests compare versions
- policy tests check authority boundaries
- replay tests preserve real incidents

Every test artifact should have:

- stable ID
- source hash
- semantic hash
- edition
- profile
- seed, when applicable
- expected trace or expected property result
- coverage contribution
- promotion path from failure to regression
- redaction status

### Unit Tests

Unit tests should cover small authored expectations:

- event `x` from state `A` reaches state `B`
- guard accepts/rejects specific payloads
- hook mock returns drive expected branch
- sensor mock returns drive expected branch
- emitted outputs match expectation
- illegal events are refused
- state props/vals update as expected

These are the familiar tests humans expect, but they should still emit canonical
trace fragments rather than only pass/fail prose.

### Golden Trace And Replay Tests

A golden trace test is:

```text
input tape + seed + initial observation -> canonical trace + final observation
```

This should be the foundation for regression tests, incident tests, conformance
tests, and generated-target parity tests.

Every fuzz failure, production incident, or model-checking counterexample should
be promotable into a replay test with one command.

### Property-Based Testing

Property-based testing generates many valid input tapes and asserts invariants
over all generated runs.

Generators should be profile-aware:

- valid actions
- valid payload shapes
- bounded numeric domains
- channel constraints
- current-state-sensitive events
- effect mocks

This is distinct from pure random walking because the generator and invariant
are part of the test artifact.

### Stochastic Testing

Stochastic testing should cover long random walks, random input tapes, random
payloads, random scheduling choices, and random failure injection.

It should always record:

- seed
- generator version
- distribution
- coverage reached
- failing tape, if any
- shrink result, if any

The existing dragon/stochastic posture in the repo is a good seed for this.

### Directed Fuzzing

Directed fuzzing asks the toolchain to try to find a behavior:

```text
fsl fuzz --directed "reach Refunded without ManagerApproval" machine.fsl
```

The prompt should compile into a property or target condition. The output should
be a trace if one is found, or an `undecided`/exhausted result with budget.

This makes the LLM a test director rather than a brute-force test author.

### Coverage-Guided Fuzzing

Coverage-guided fuzzing should steer generation toward uncovered:

- states
- transitions
- guards
- guard branches
- effects
- channels
- error states
- rollback paths
- contracts
- properties

Coverage should be structural and semantic, not only source-line coverage.

### Metamorphic Testing

Metamorphic testing checks relations between related runs when the exact output
is not known.

Examples:

- adding an unrelated event before `cancel` should not change cancellation
- formatting should not change semantic hash
- retrying idempotent `ack` should not double-emit
- two independent events should commute
- adding a log-only output should not affect safety properties

This is especially useful for agents because it catches plausible-but-wrong
behavior without requiring a full oracle.

### Combinatorial And Pairwise Testing

FSL machines often have flags, modes, bounded values, channel types, and effect
outcomes. Exhaustive combinations may explode.

Pairwise or t-wise generation can cover interactions compactly:

- state x event class
- event class x payload class
- hook outcome x guard branch
- queue policy x timeout
- target capability x feature use

The generated cases should still be ordinary replay tests.

### Boundary-Value Testing

Boundary tests should be generated from declared domains:

- bounded int min/max
- overflow and underflow edges
- retry count limits
- queue depth limits
- timeout thresholds
- tape capacities
- string/bytes length limits
- enum edges
- unit conversion boundaries

This should connect directly to numeric/unit metadata.

### Equivalence-Class Testing

Inputs should be partitioned into classes expected to behave the same:

- invalid event in nonaccepting states
- successful payment providers
- retryable errors
- nonretryable errors
- authenticated users
- unauthenticated users
- payloads with equivalent rounded values

The toolchain can then sample representatives and report uncovered classes.

### Negative Testing

Negative tests assert refusal behavior:

- illegal transition refused
- bad payload rejected
- missing hook rejected
- denied effect rejected
- unsupported target refused
- stale patch refused
- lossy conversion refused
- secret-bearing trace refused without redaction

Good refusal behavior is part of machine correctness.

### Determinism Testing

Determinism tests run the same seed and input tape repeatedly and require
identical traces, ledgers, outputs, and final observations.

This should be mandatory for deterministic profiles and for any artifact that
claims replayability.

### Replay-Stability Testing

Replay-stability tests verify that a replay bundle still reproduces after:

- formatting
- refactoring
- dependency updates
- toolchain updates
- generated target updates
- migration between editions

If replay stability fails, the result should say whether behavior changed,
serialization changed, or the old replay artifact is no longer valid.

### Serialization Round-Trip Testing

Round-trip tests should cover:

- source -> AST -> source
- source -> IR -> source, when claimed
- source -> JSON interchange -> source
- source -> Mermaid/DOT/etc. -> source, when claimed
- patch -> apply -> diff -> patch
- replay -> serialize -> replay

Each round trip should preserve semantic hash or report explicit loss.

### Codegen Parity Testing

Generated code should run the same vectors as the reference runtime.

The parity report should include:

- target
- target runtime version
- vectors passed
- vectors failed
- vectors unsupported
- trace differences
- unsupported features
- generated artifact hash

This is stronger than compiling generated code. It proves the target behaves the
same for the claimed subset.

### Temporal Regression Testing

Temporal regression tests assert that old safety/temporal properties remain
proved, failed, or intentionally changed after edits.

The interesting artifact is not only "property failed"; it is:

- property status changed
- proof invalidated
- counterexample changed
- budget now insufficient
- assumption changed

### Model Checking

Model checking should cover at least:

- reachability
- absence
- invariants
- deadlock freedom
- bounded temporal properties
- liveness where feasible
- probabilistic checks where feasible

The result should be `proved`, `failed`, `undecided`, `unsupported`, or
`budget_exceeded`, with a proof artifact or counterexample when possible.

### Refinement And Compatibility Testing

Refinement tests ask whether a new machine is a safe replacement for an old one.

They should check:

- accepted inputs
- emitted outputs
- public states
- required hooks/effects
- assumptions
- guarantees
- target support
- error reachability

This is a release engineering test, not just a formal methods luxury.

### Contract Testing

Contract tests check that two machines or a machine and host adapter agree on:

- event names
- payload schemas
- channel direction
- ordering assumptions
- guarantees
- failure modes
- effect contracts

This should be generated from interface cards wherever possible.

### Protocol Testing

Protocol tests exercise composed systems:

- message compatibility
- deadlock freedom
- retry behavior
- backpressure
- queue overflow
- timeout behavior
- failure propagation
- reconnect/resume behavior

These are the tests that catch "each component is correct, the system is not."

### Scheduler And Interleaving Testing

Systems with queues, async delivery, or multiple machines need scheduler tests.

The toolchain should explore:

- delivery order
- duplicate delivery
- dropped delivery
- delayed delivery
- simultaneous events
- fairness assumptions
- starvation

This can be exhaustive for small systems and stochastic or bounded for larger
ones.

### Confluence Testing

Confluence testing asks whether independent event orders reach equivalent stable
observations.

If `A; B` and `B; A` should be equivalent, FSL should check that directly.

This matters for distributed, queued, or UI machines where event order may vary.

### Idempotence Testing

Idempotence tests check that repeating an event does not double-apply effects
when it should not.

Common candidates:

- `ack`
- `confirm`
- `cancel`
- `sync`
- `retry`
- `close`
- `approve`

The test should cover both state and emitted side effects.

### Commutativity Testing

Commutativity tests are related to confluence but narrower:

```text
event A then event B == event B then event A
```

The toolchain can suggest commutativity candidates when two events touch
disjoint vals/effects.

### Soak And Long-Walk Testing

Long-walk tests run extended random or guided traces to find:

- rare invariant failures
- livelocks
- state-space leaks
- unbounded tape growth
- queue accumulation
- gradual counter drift
- eventual retry exhaustion

Long-walk failures must be shrunk into short replay bundles before they become
good regression tests.

### Fault-Injection Testing

Fault injection should simulate:

- hook failure
- sensor absence
- timeout
- denied effect
- corrupt payload
- queue overflow
- clock jump
- random stream exhaustion
- external service returning inconsistent data

Faults should be typed and replayable.

### Chaos Testing

Chaos testing is system-level fault injection:

- multiple simultaneous failures
- delayed effects
- restarts
- partial outage
- queue partition
- repeated timeout
- recovery under load

This belongs mostly to composed systems and runtime adapters.

### Resource-Budget Testing

Resource tests assert limits:

- max microsteps
- max queue depth
- max tape length
- max replay length
- max memory
- max state-space size
- max verifier time
- max generated artifact size

These protect both production systems and agent workflows.

### Security Policy Testing

Security/policy tests attempt forbidden sequences:

- delete before approval
- network after secret read
- deploy before tests pass
- publish while verification is undecided
- payment retry after committed success
- LLM call with private context

These should run against the same policy machines that gate MCP tools.

### Redaction Testing

Redaction tests prove that artifacts marked safe for LLM/CI/public sharing do
not leak fields labeled secret, user-private, environment-private, or
policy-restricted.

This should cover:

- diagnostics
- replay bundles
- ledgers
- prompt-ready summaries
- review packs
- rendered alt text
- logs

### Migration Testing

Migration tests verify that old-edition machines migrated to a new edition:

- preserve semantic hash when claimed
- produce exact semantic deltas when not
- preserve replay bundles where possible
- update diagnostics/properties intentionally
- mark manual actions clearly

This should be required for edition changes.

### Documentation Testing

Documentation tests extract FSL snippets and commands from docs and verify:

- snippets parse
- examples check
- stated output matches actual output
- commands still exist
- JSON examples validate
- strong claims map to checkable commands

This keeps agent-readable docs from rotting.

### Prompt And Agent Regression Testing

Agent-facing prompts and recipes should have regression tests:

- fixed task prompt
- fixed allowed command set
- expected artifact shape
- expected patch constraints
- expected refusal, when appropriate

This helps detect when a docs/prompt change makes agents worse at FSL tasks.

### Oracle Testing

Oracle tests compare FSL behavior against:

- independent implementation
- generated reference model
- simpler mathematical spec
- existing legacy system traces
- hand-authored oracle machine

Oracle mismatch should produce a differentiating tape.

### Specification Mining

Specification mining infers candidate invariants from traces:

- state `X` always eventually followed by `Y`
- output `receipt` only after state `Paid`
- value `balance` never negative in observed traces
- event `cancel` never accepted after `Shipped`

Mined properties should be labeled as candidates, not proofs. Agents can propose
promoting them into real properties after review.

### Vacuity Testing

Vacuity testing detects properties that pass for the wrong reason:

- invariant holds because relevant state is unreachable
- liveness holds under impossible assumptions
- guard property holds because event never fires
- contract holds because hook is never called

This is important because agents are good at writing plausible weak properties.

### Delta Debugging And Test Minimization

Every failing long tape should be shrinkable:

```text
fsl minimize failing.replay.json --json
```

The minimized replay should preserve:

- failure
- source hash
- seed/generator provenance
- relevant coverage
- redaction status

Small failures are much easier for agents and humans to repair.

### Test Promotion Workflow

The testing system should support promotion:

```text
fuzz failure -> minimized replay -> regression test -> conformance vector
production incident -> redacted replay -> regression test
model-check counterexample -> replay test -> repaired property
```

Promotion should preserve provenance so future agents know where a test came
from and why it matters.

### Testing Verb Surface

I would group the testing commands roughly as:

```text
fsl test           # unit, examples, golden traces
fsl fuzz           # stochastic, directed, coverage-guided
fsl mutate         # mutation testing
fsl check          # model checking and properties
fsl conform        # reference/target/runtime conformance
fsl diff           # behavioral differential testing
fsl refine-check   # replacement compatibility
fsl compose-check  # system/protocol compatibility
fsl policy-check   # authority and effect policies
fsl minimize       # failing tape minimization
fsl coverage       # semantic coverage
```

The common contract is more important than the exact verb names: every test
should emit JSON, source hashes, semantic IDs, replay bundles on failure, and
coverage/provenance metadata when available.

## Behavior Query Layer

If I could add one feature for joy as much as utility, I would add an
interrogable behavior query layer:

```text
fsl query "shortest tape from Idle to Paid" checkout.fsl
fsl query "states that can reach Error without passing through Recovery" machine.fsl
fsl query "events accepted in Pending but refused in Approved" order.fsl
fsl query "effects reachable after secret_read" agent_guard.fsl
fsl query "cycles that can emit charge_card" billing.fsl
```

The purpose is to let humans and agents ask what is possible before changing the
machine.

This should not be a vague natural-language chatbot bolted onto FSL. It should
be a query layer over the same semantic graph, verifier, trace generator, and
source-map artifacts used by `check`, `slice`, `diff`, and `replay`.

The output should include:

- structured answer
- source hash
- semantic hash
- query interpretation
- confidence or parse status
- source spans
- semantic node IDs
- graph slice
- witness tape, when one exists
- proof or exhaustion status, when applicable
- next suggested queries

Useful built-in query forms:

```text
fsl why-not Shipped order.fsl
fsl how-can Error machine.fsl
fsl what-breaks-if "remove transition Packed -> Shipped" order.fsl
fsl must-pass-through Approved before Refunded refunds.fsl
fsl explain-reachability Error machine.fsl
fsl find-cycles --emits charge_card billing.fsl
fsl accepted-events --state Pending order.fsl
fsl compare-acceptance Pending Approved order.fsl
```

`why-not` is especially valuable. If a target state is unreachable, it should
answer with the nearest reachable frontier, the blocking guard/condition, and
the relevant source spans.

Example shape:

```json
{
  "schema": "fsl.query_result.v1",
  "query": "why-not Shipped",
  "status": "answered",
  "answer_kind": "unreachable",
  "target": "Shipped",
  "nearest_reachable": "Paid",
  "blocking": [
    {
      "kind": "guard",
      "summary": "tracking_id is unset",
      "span": { "file": "order.fsl", "start": 420, "end": 471 }
    }
  ],
  "next_queries": [
    "show paths to Paid",
    "find assignments to tracking_id",
    "generate minimal tape to Paid"
  ]
}
```

The query layer would also be useful for code review:

```text
fsl query "what newly reaches Error?" --base main --head HEAD
fsl query "what effects became reachable?" --base main --head HEAD
fsl query "what properties depend on transition T?" machine.fsl
```

It would be useful for security:

```text
fsl query "can delete_file occur without user_approval?" guard.fsl
fsl query "can network occur after secret_read?" guard.fsl
```

And it would be useful for design:

```text
fsl query "minimal states needed to distinguish Approved from Rejected"
fsl query "events that are legal in every non-final state"
fsl query "states that are observationally equivalent"
```

Agents benefit because a query result is smaller and more purposeful than a full
context bundle. Humans benefit because formal models become conversational
without giving up rigor.

The implementation should support two layers:

- a structured query API for exact tools
- a natural-language front end that compiles to structured queries and reports
  ambiguity

If the natural-language query is ambiguous, FSL should use PICK-style
disambiguation: present concrete interpretations and ask which question was
intended.

The result should never silently answer a different question than the one the
user meant.

## Observational Lenses

I would add observational lenses to FSL v6.

A property says what must be true. A sensor says what the machine reads from the
environment. A lens says what is visible from a particular point of view.

Example:

```text
lens public_api {
  observe state Idle, Pending, Paid, Failed;
  observe emit receipt, declined;
  hide state InternalRetry;
  hide val retry_count;
  redact payload.card_number;
}
```

The purpose is to define a projection over behavior:

- what states are externally visible
- what states are hidden as implementation detail
- what emits/channels/effects are visible
- what vals/props are visible
- what payload fields are redacted
- what timing is visible
- what errors are visible
- what host effects are visible

This enables questions like:

```text
fsl lens-equivalent --lens public_api old.fsl new.fsl
fsl lens-diff --lens attacker old.fsl new.fsl
fsl lens-minimize --lens public_api checkout.fsl
fsl lens-docs --lens partner_api checkout.fsl
```

The most important use is equivalence under observation.

For example, a refactor may change:

```text
Pending -> InternalRetry -> Pending -> Paid
```

into:

```text
Pending -> RetryBackoff -> RetryJitter -> Pending -> Paid
```

A public lens can hide the retry internals and prove that public behavior did
not change, even though the internal graph did.

This is different from a property. The lens does not say whether behavior is
good or bad. It says what counts as observable when comparing, documenting,
minimizing, mocking, or reviewing behavior.

Useful built-in lenses:

- `public_api`
- `debug`
- `audit`
- `attacker`
- `partner_api`
- `test`
- `codegen_target`

The security use is especially interesting:

```text
lens attacker {
  observe effect network;
  observe timing coarse;
  hide state *;
  redact payload *;
}
```

Then FSL can ask:

```text
fsl lens-diff --lens attacker old.fsl new.fsl
```

and report whether a change created a new observable side channel, new network
effect, new timing distinction, or new refusal pattern.

Lenses also help docs and mocks. A partner API mock should not expose private
states. Public docs should not mention internal rollback machinery. A review
pack should be able to show both "full internal diff" and "public API diff."

A lens result should include:

- lens name and hash
- visible alphabet
- hidden states/effects/fields
- projection rules
- equivalence result
- witness tape if not equivalent
- redaction report
- source spans for visible differences

This would make FSL unusually good at controlled abstraction: the same machine
can have different, checkable truths for users, maintainers, auditors, attackers,
and generated host adapters.

## Counterfactual Patches

I would add counterfactual patching to FSL v6.

The question is:

```text
What is the smallest semantic change that would make this desired behavior true?
```

Examples:

```text
fsl counterfactual "make no_refund_before_charge hold" refunds.fsl
fsl counterfactual "make Shipped reachable" order.fsl
fsl counterfactual "remove all paths from Guest to Admin" auth.fsl
fsl counterfactual "make old.fsl and new.fsl lens-equivalent under public_api"
```

This is different from ordinary repair suggestions. Repair starts from a
diagnostic. Counterfactual patching starts from a desired semantic change.

The result should be ranked candidate patches, not an automatic edit:

```json
{
  "schema": "fsl.counterfactual.v1",
  "goal": "make Shipped reachable",
  "source_hash": "sha256:...",
  "candidates": [
    {
      "kind": "add_transition",
      "risk": "low",
      "patch": { "schema": "fsl.patch.v1", "ops": [] },
      "expected_delta": "adds one path from Paid to Shipped",
      "side_effects": ["new accepted event: ship"],
      "checks_to_rerun": ["public_api_lens_equivalence"]
    },
    {
      "kind": "weaken_guard",
      "risk": "medium",
      "span": { "file": "order.fsl", "start": 420, "end": 471 },
      "expected_delta": "existing transition can now fire earlier",
      "side_effects": ["allows Shipped without tracking_id"],
      "checks_to_rerun": ["shipping_requires_tracking"]
    }
  ]
}
```

Useful candidate patch kinds:

- add transition
- remove transition
- retarget transition
- change arrow kind
- strengthen guard
- weaken guard
- add state
- split state
- merge equivalent states
- add recovery path
- add contract
- weaken overly strong contract
- narrow payload domain
- widen payload domain
- hide internal state under a lens
- add missing effect declaration

Every candidate should include:

- source hash
- semantic preconditions
- expected behavior delta
- risk classification
- side effects
- affected lenses
- affected properties
- affected targets
- tests/checks to rerun
- witness tape showing the goal now holds, when possible
- witness tape showing behavior that changed, when relevant

This turns the verifier into a design assistant. An agent can ask:

- What would have to change for this to be possible?
- What is the least dangerous way to block this path?
- What patch makes these machines equivalent from this lens?
- What edit would make this codegen target supportable?
- What minimal guard prevents this counterexample?

Counterfactual patching should be conservative. It should prefer small semantic
patches, refuse when the goal is underspecified, and use PICK-style
disambiguation when several candidate interpretations exist.

The result should never be "just apply this." It should be "here are the
reviewable edits that would make the goal true, and here is what each edit would
cost."

## Semantic Breakpoints And Doomed Properties

I would add semantic breakpoints to FSL v6.

These are not source-line breakpoints. They are behavioral breakpoints:

```text
break when state Error is reached
break when val balance decreases
break when emit charge_card occurs twice
break when guard shipping_requires_tracking is false
break when effect network happens after secret_read
break when property no_refund_before_charge becomes doomed
```

Useful commands:

```text
fsl run --breakpoints breakpoints.fsl order.fsl
fsl replay --breakpoints breakpoints.fsl incident.replay.json
fsl check --break-when-doomed no_refund_before_charge refunds.fsl
```

The key idea is a doomed property.

A property is doomed at the first point in a trace where, even if the property
has not visibly failed yet, no possible continuation can still make it hold.

Example:

```text
Step 8: entered Refunded.
Property no_refund_before_charge has not emitted its final failure yet,
but Charged is now unreachable in every continuation.
Breakpoint: property doomed.
Nearest repair frontier: step 6, transition approve_refund.
```

This is a major debugging affordance because it stops at the moment the future
became impossible, not merely at the later moment where the failure becomes
observable.

Useful breakpoint predicates:

- state entered
- state exited
- transition taken
- transition refused
- guard true/false
- val changed
- val crosses threshold
- emit occurs
- emit count reaches N
- effect requested
- effect denied
- rollback starts
- rollback completes
- property fails
- property becomes doomed
- lens-visible behavior changes
- target capability becomes required
- secret reaches forbidden effect

The result should include:

- breakpoint ID
- trace step
- semantic node ID
- source span
- triggering observation
- current state snapshot
- relevant ledger entries
- remaining possible continuations, when finite enough
- nearest repair frontier
- suggested queries
- suggested counterfactual goals

For agents, doomed-property detection is much better than ordinary failure
reporting. It says:

```text
Do not debug the final symptom. Debug the semantic point of no return.
```

This also pairs naturally with `fsl bisect-tape`, `fsl explain-tape --focus`,
`fsl query`, and counterfactual patches.

## Semantic Debugging Workbench

FSL debugging should be semantic time travel over behavior, not source-line
stepping.

The debugger should understand:

- macrosteps
- microsteps
- stable states
- transitions considered and taken
- guards and guard inputs
- vals and props
- hooks and sensors
- emitted outputs
- requested/allowed/denied effects
- rollback journals
- tapes
- ledgers
- properties
- lenses
- scheduler choices
- composition boundaries

Every debugger answer should be exportable as a small replayable artifact. A
debugging session should not vanish when the terminal closes.

## Watch Expressions

The debugger should support semantic watches:

```text
watch val balance
watch val retry_count
watch state
watch last_error.kind
watch emit_count charge_card
watch lens public_api output
watch effect network
watch property no_refund_before_charge
```

Watches should be able to run over live execution, replay bundles, generated
targets, and composed systems.

Watch output should include:

- step
- old value
- new value
- source span responsible
- semantic node ID
- ledger entries involved
- whether the change is lens-visible
- whether the change affects any property

## Trace Slicing

Trace slicing should produce a smaller trace focused on a debugging target:

```text
fsl trace slice --property no_refund_before_charge failing.replay.json
fsl trace slice --val balance failing.replay.json
fsl trace slice --effect network failing.replay.json
fsl trace slice --state Refunded failing.replay.json
```

The slice should include only the steps that matter, plus the minimum causal
context needed to understand them.

Good slice targets:

- state
- transition
- property
- val
- emit
- effect
- rollback
- hook
- sensor
- channel
- lens-visible output
- scheduler decision

## Causal Explanation

The debugger should answer causal questions:

```text
fsl trace why --step 12 failing.replay.json
fsl trace why-transition approve_refund failing.replay.json
fsl trace why-emit receipt failing.replay.json
fsl trace why-effect network failing.replay.json
fsl trace why-rollback --step 14 failing.replay.json
```

Useful questions:

- Why did this transition fire?
- Why was this guard false?
- Why did this emit happen?
- Why did this effect get denied?
- Why did rollback begin?
- Why did this property become doomed?
- Why did this state become unreachable?

The answer should name the relevant guards, values, source spans, hook/sensor
returns, and prior steps.

## Why And Why-Not Debugging

`why` and `why-not` debugging should be first-class.

```text
fsl trace why --state Failed failing.replay.json
fsl trace why-not --state Shipped failing.replay.json
fsl trace why-not --emit receipt failing.replay.json
fsl trace why-not --transition ship failing.replay.json
```

`why-not` should explain the blocking frontier:

- nearest reached state
- refused transition
- false guard
- missing event
- missing hook value
- denied effect
- impossible payload
- violated assumption
- scheduler condition

This is the debugging equivalent of the behavior query layer.

## Time Travel And Branch Replay

The debugger should support time travel:

```text
fsl debug incident.replay.json
fsl trace branch --at 17 --event approve incident.replay.json
fsl trace branch --at 17 --hook fraud_score=0.1 incident.replay.json
fsl trace branch --at 17 --sensor current_time=2026-06-21T12:00:00Z incident.replay.json
```

The key operation is branching from a previous step with a different event,
hook result, sensor value, random draw, or scheduler choice.

The result should be a new replay bundle with explicit provenance:

- parent replay hash
- branch point
- changed input
- changed ledger entry
- resulting trace
- first divergence
- property deltas
- lens deltas

## First Divergence Debugging

When comparing two traces, the debugger should find the first semantic
divergence:

```text
fsl trace divergence old.replay.json new.replay.json
```

Divergence kinds:

- state differs
- val differs
- guard result differs
- transition differs
- emit differs
- effect differs
- rollback differs
- property status differs
- lens-visible observation differs
- scheduler decision differs

The result should identify the first divergence and the source edits or external
inputs most likely responsible.

## Counterfactual Debugging

Counterfactual patches should be available directly from the debugger:

```text
fsl trace counterfactual --prevent-failure incident.replay.json
fsl trace counterfactual --avoid-state Error incident.replay.json
fsl trace counterfactual --preserve-lens public_api old.replay.json new.replay.json
```

This connects the debug loop to patch candidates:

```text
failure -> cause -> counterfactual goal -> ranked patches -> dry-run -> replay
```

The debugger should not apply the patch. It should return reviewable semantic
patch candidates with witnesses.

## Effect And Authority Debugging

Effects need their own debugger view.

Useful commands:

```text
fsl effect trace incident.replay.json
fsl effect why-denied --step 21 incident.replay.json
fsl effect authority-diff old.replay.json new.replay.json
```

The effect debugger should show:

- requested effect
- authority required
- policy rule applied
- allowed/denied result
- redaction labels
- host adapter involved
- rollback relationship
- whether the effect is replayed or live
- whether the effect is lens-visible

This is crucial for agent tool-use safety.

## Ledger Debugging

The determinism ledger should be debuggable:

```text
fsl ledger explain incident.replay.json
fsl ledger diff old.replay.json new.replay.json
fsl ledger verify incident.replay.json
```

Ledger debugging should answer:

- which seed was used?
- which random draw changed?
- which clock read changed?
- which hook return changed?
- which sensor value changed?
- which value was replayed vs live?
- which nondeterministic source was refused?

This lets "I reproduced the bug" become a checkable statement.

## Lens Debugging

Lens debugging answers what changed for a particular observer:

```text
fsl lens trace --lens public_api incident.replay.json
fsl lens divergence --lens attacker old.replay.json new.replay.json
```

This is useful when internal traces differ but public behavior may not.

Lens debugging should show:

- visible steps
- hidden steps collapsed
- redacted fields
- observable emits/effects
- timing observations
- first lens-visible divergence
- witness tape

## Distributed And Scheduler Debugging

Composed systems need debugging over more than one machine.

The debugger should expose:

- per-machine state
- message queues
- in-flight messages
- delivery order
- clock model
- scheduler choices
- backpressure
- dropped messages
- duplicate messages
- timeout decisions
- failure propagation

Useful commands:

```text
fsl system debug incident.replay.json
fsl scheduler replay --strategy fair incident.replay.json
fsl scheduler branch --at 12 --deliver message_7 incident.replay.json
```

This is where many protocol bugs live.

## Guard Debugging

Guards deserve a specialized explanation surface:

```text
fsl guard explain shipping_requires_tracking order.fsl
fsl guard truth-table shipping_requires_tracking order.fsl
fsl guard flip-values shipping_requires_tracking order.fsl
```

Guard debugging should show:

- values read
- current values
- truth result
- boundary examples
- values that would flip the guard
- source span
- dependent properties
- affected transitions

This is a natural companion to counterfactual patches.

## Hook And Sensor Debugging

External values often explain surprising behavior.

Hook/sensor debugging should show:

- where the value entered
- schema validation result
- redaction labels
- replay policy
- whether it was live or replayed
- dependent guards/transitions/properties
- failure mode, if any

Useful commands:

```text
fsl hook trace fraud_score incident.replay.json
fsl sensor trace current_time incident.replay.json
```

## Rollback Debugging

Rollback is too important to leave as a boolean.

Useful command:

```text
fsl rollback explain --step 14 incident.replay.json
```

The result should show:

- error kind
- failing expression/source span
- journaled changes
- discarded emits
- retained external effects
- error tape entry
- recovery transitions considered
- state after rollback

This makes fault behavior inspectable and testable.

## Coverage Debugging

Coverage reports should answer why something is uncovered:

```text
fsl coverage why-uncovered --state Shipped machine.fsl
fsl coverage why-uncovered --transition ship machine.fsl
fsl coverage why-uncovered --property no_dead_end machine.fsl
```

Possible answers:

- state unreachable
- event never generated
- guard unsatisfied
- payload generator missing class
- hook mock never returns value
- scheduler never chooses interleaving
- effect denied before path
- property vacuous

This turns coverage from a percentage into a repairable artifact.

## Debug Certificates

A debug session should be savable as a certificate-like artifact:

```text
fsl debug export-session --json
```

The artifact should include:

- source hash
- replay hash
- breakpoints
- watches
- branches explored
- trace slices
- conclusions
- counterfactuals considered
- patches tried
- final accepted repair, if any

This is useful for handoff between humans and agents, and for preserving the
reason a regression test exists.

## Debug Verb Surface

The exact names can vary, but the debugging surface should include:

```text
fsl debug
fsl trace slice
fsl trace why
fsl trace why-not
fsl trace branch
fsl trace divergence
fsl watch
fsl guard explain
fsl hook trace
fsl sensor trace
fsl rollback explain
fsl effect trace
fsl ledger explain
fsl coverage why-uncovered
```

The common contract is the same as the rest of the toolchain: every debugging
answer should carry source hash, semantic IDs, source spans, replay provenance,
and suggested next actions.

## Proven Behavioral Building Blocks

FSL should grow a first-class notion of proven behavioral building blocks.

The core idea is that reusable machines should not be cataloged only by names,
tags, or structural signatures. They should be cataloged by the behaviors they
prove.

This would make the registry feel less like a package index and more like a
library of verified patterns.

## Behavioral Typeclasses

A behavioral typeclass is a named semantic interface.

It does not merely say "this machine has event `retry`." It says "this machine
has the retry behavior described by these laws."

Example:

```text
typeclass Retryable {
  event retry;
  state Failed;
  state Retrying;

  property retry_eventually_returns_or_fails:
    always retry -> eventually (Succeeded or Failed);

  property retry_does_not_duplicate_commit:
    never emit commit more_than 1;
}
```

A machine can claim an instance:

```text
machine PaymentRetry implements Retryable;
```

The claim is valid only if:

- required states/events/channels/effects exist or are mapped
- required assumptions are satisfied
- required properties are proved or explicitly marked unchecked
- required lenses are available, if the typeclass is lens-relative
- required target capabilities are available, if target-specific

Useful behavioral typeclasses:

- `Retryable`
- `CircuitBreaker`
- `TwoPhaseCommitParticipant`
- `SagaStep`
- `SagaCoordinator`
- `IdempotentConsumer`
- `ApprovalGate`
- `HumanEscalation`
- `ToolPolicyGuard`
- `RateLimiter`
- `BackpressureAware`
- `RecoverableError`
- `CompensatingAction`
- `ExactlyOnceEmitter`
- `AtLeastOnceConsumer`
- `TimeoutBounded`
- `Cancelable`
- `Auditable`

This gives agents and humans a compact semantic vocabulary. Instead of saying
"find me a machine that has some states called Open and Closed and maybe a
timeout," a user can say "find me a CircuitBreaker."

## Behavioral Laws

Each typeclass should be defined by laws.

Examples:

`IdempotentConsumer`:

- repeating the same message ID does not duplicate the externally visible emit
- duplicate delivery is accepted or ignored, never fatal
- duplicates do not expand authority

`CircuitBreaker`:

- enough failures eventually open the circuit
- open circuit refuses protected work
- after timeout, half-open probe is possible
- successful probe closes circuit
- failed probe reopens circuit

`ApprovalGate`:

- protected action is impossible before approval
- approval must be attributable
- approval can expire or be revoked, if declared
- denial prevents protected action

`SagaStep`:

- committed step has a compensating action, unless explicitly irreversible
- compensation is not emitted before commit
- repeated compensation is idempotent or refused

The laws should be ordinary FSL properties, plus optional test vectors and
counterexample shapes.

## Typeclass Instances As Proof Artifacts

An implementation claim should produce an instance artifact:

```json
{
  "schema": "fsl.typeclass_instance.v1",
  "typeclass": "Retryable",
  "machine": "PaymentRetry",
  "source_hash": "sha256:...",
  "semantic_hash": "sha256:...",
  "law_results": [],
  "assumptions": [],
  "lenses": [],
  "targets": [],
  "status": "proved"
}
```

The instance artifact should record:

- typeclass version
- machine hash
- mapping from typeclass names to machine names
- assumptions
- proof results
- counterexamples for failed laws
- undecided laws and budgets
- target/codegen support
- required effects
- lens-relative observations
- proof invalidation conditions

This makes "implements Retryable" a durable claim, not a comment.

## Name Mapping And Adapters

Real machines will not always use the exact names from a typeclass.

So typeclass instances need explicit mapping:

```text
implements Retryable where {
  retry    = event try_again;
  Failed   = state PaymentFailed;
  Retrying = state RetryingCharge;
  commit   = emit capture_payment;
}
```

If a machine almost implements a typeclass but needs a wrapper, FSL should
generate an adapter:

```text
fsl typeclass-adapt --typeclass Retryable payment.fsl --json
```

The adapter must preserve the typeclass laws. If it cannot, it should return the
missing law or counterexample.

## Negative Typeclasses And Forbidden Behaviors

Some reusable guarantees are negative:

- `NoNetwork`
- `NoSecretEgress`
- `NoDuplicateCharge`
- `NoSilentDrop`
- `NoUnboundedQueue`
- `NoUserDataInLogs`

These can be represented as typeclasses too, but it may be useful to call them
capability exclusions or forbidden-behavior certificates.

They are especially valuable for agent policy:

```text
machine Guard implements NoSecretEgress;
machine Checkout implements NoDuplicateCharge;
```

Registry search should support both positive and negative behavioral claims.

## Composing Behavioral Building Blocks

The real payoff is composition.

If `A implements Retryable` and `B implements IdempotentConsumer`, FSL should be
able to ask whether their composition implements a larger pattern:

```text
system PaymentFlow implements SagaCoordinator;
```

Composition needs law lifting:

- which laws survive composition automatically
- which laws require new assumptions
- which laws are invalidated by effects
- which laws depend on scheduler fairness
- which laws depend on queue bounds

The composition report should say:

- inherited laws
- newly proved laws
- failed inherited laws
- assumptions introduced by composition
- counterexamples
- required adapters

This is where behavioral building blocks become a real design system.

## Registry Search By Typeclass

The registry should be able to answer:

```text
find machines implementing CircuitBreaker
find Retryable machines with no network effects
find SagaStep machines compatible with native:typescript
find ToolPolicyGuard machines that prove NoSecretEgress
find IdempotentConsumer machines with public_api lens docs
```

Search results should rank by:

- proof status
- proof freshness
- target support
- effect compatibility
- assumption compatibility
- interface compatibility
- conformance tier
- examples available
- maintainer trust

This makes the registry useful to agents as a design catalog, not just a source
download mechanism.

## Typeclass-Driven Scaffolding

Typeclasses should also scaffold new machines.

Useful command:

```text
fsl scaffold --typeclass CircuitBreaker --json
```

It should generate:

- skeleton states/events/channels
- required properties
- example traces
- holes for policy-specific thresholds
- docs stub
- tests
- target capability expectations

This pairs beautifully with semantic holes and `fsl sketch`: the typeclass gives
the shape, holes capture unknowns, and sketch/check fills or rejects the design.

## Behavioral Semver

For building blocks, semantic versioning should be behavioral.

Breaking changes:

- remove accepted public input
- remove emitted public output
- strengthen assumptions
- weaken guarantees
- add required effect authority
- lose a typeclass instance
- invalidate a public lens equivalence

Non-breaking changes:

- internal state refactor hidden by public lens
- stronger guarantees
- fewer effects
- weaker assumptions
- additional optional events
- improved target support

The registry can compute or assist behavioral semver from lenses, typeclass
instances, and refinement checks.

## Typeclass Law Testing

Every typeclass should ship law tests.

These are not substitutes for proofs. They are executable examples and
regression cases that help agents understand the pattern.

For `CircuitBreaker`, law tests might include:

- repeated failures open the circuit
- open circuit refuses protected event
- timeout allows half-open probe
- success closes circuit
- failure reopens circuit

The law tests should be generated into the machine's test suite when a machine
claims the typeclass.

## Derived Typeclasses

FSL may be able to infer some typeclass instances.

For example:

- if a machine proves duplicate message IDs never duplicate visible emit, suggest
  `IdempotentConsumer`
- if a machine proves no path from unapproved to protected effect, suggest
  `ApprovalGate`
- if a machine proves enough failures open a refusal state and timeout returns
  to probe, suggest `CircuitBreaker`

Inference should be advisory. The user should accept the claim explicitly,
because typeclass membership becomes part of the public contract.

## Typeclass Anti-Patterns

The system should also explain why a machine does not implement a desired
typeclass.

Example:

```text
fsl implements? --typeclass IdempotentConsumer consumer.fsl
```

Possible answer:

```text
Not an IdempotentConsumer.
Counterexample: duplicate message m1 emits receipt twice.
Nearest repair: remember processed message IDs or make receipt emit lens-hidden.
```

This connects typeclasses to counterfactual patches and behavior queries.

## Near-Term Checklist

1. Fix package-shape drift and add tarball/export/bin smoke tests.
2. Define `fsl.result.v1` and use it for at least parse/check/render/codegen.
3. Define `fsl.diagnostic.v1` with stable error codes and spans.
4. Add `fsl explain <code> --json`.
5. Add `fsl capabilities --json`.
6. Add `fsl inspect --json` with states, edges, spans, starts, finals, and
   capabilities.
7. Add source hashes to every JSON-producing command.
8. Add semantic exit-code documentation.
9. Typecheck CLI tests and test-only imports so drift is caught.
10. Validate JSON interchange envelopes and versions.
11. Preserve start-state semantics in interchange or report loss.
12. Add codegen manifests and refuse unsupported semantics by default.
13. Extend safety traces toward replayable stimulus traces.
14. Define a replay bundle schema.
15. Promote conformance corpus metadata to public JSON.
16. Add `llms.txt`, `llms-cheatsheet.md`, `llms-errors.json`, and
   `agent-anti-patterns.md`.
17. Make CM6 diagnostics consume the same diagnostic schema as the CLI.
18. Add redaction labels for tapes, traces, hook values, and error fields.
19. Add a minimal semantic patch dry-run command for graph edits.
20. Tag megaspec sections by status: normative, tooling, roadmap, research,
   deferred.
21. Emit CI-friendly `.fsl/latest/*.json` artifacts for inventory,
   diagnostics, checks, effects, and review packs.
22. Add `fsl review-pack --json` for PRs and old/new file comparisons.
23. Add `fsl diff --behavioral --json` with explicit semantic categories.
24. Define proof artifact invalidation rules.
25. Define interface cards for composable machines and future registry entries.
26. Add `fsl slice --json` by diagnostic, property, counterexample, state,
   effect, and changed source lines.
27. Generate prompt-ready summaries from the same schemas as JSON output.
28. Add negative capability reports that explain unsupported target features.
29. Treat diagnostic codes as public API backed by a generated registry.
30. Publish a partial-implementation/features manifest for v6 alpha surfaces.
31. Define semantic hash layers: source, formatted source, AST, graph,
   interface, effects, properties, proof input, and codegen input.
32. Expose located AST, token stream, and lossless CST artifacts via
   `fsl parse --json`.
33. Publish versioned grammar artifacts for constrained decoding: EBNF, Lark,
   GBNF, tree-sitter, and JSON schemas.
34. Define a portable IR consumed by verification, codegen, diff, and registry
   indexing.
35. Define a host adapter ABI for hooks, sensors, channels, time, randomness,
   rollback, cancellation, and replay injection.
36. Add a determinism ledger for runs and replays.
37. Add `fsl estimate --json` with domain-specific state-space budget fields.
38. Treat properties as named assets with IDs, assumptions, severity, proof
   artifacts, and counterexamples.
39. Add `fsl assumptions --json` and assumption lists on proofs, codegen, and
   review packs.
40. Publish executable round-trip laws with `fsl law-check --json`.
41. Add `fsl commands --json` as a machine-readable CLI manifest.
42. Define semantic exit codes for verification failure, undecided,
   unsupported, lossy-refused, stale patch, policy violation, and budget
   exceeded.
43. Add agent contract tests that validate schemas, diagnostic-code docs,
   suggested fixes, lossy reports, and command manifests.
44. Declare stability levels for commands, schemas, diagnostic codes, grammar
   exports, artifacts, and codegen targets.
45. Add structured migration artifacts for edition changes.
46. Add provenance fields to generated artifacts, proofs, and registry objects.
47. Make time and randomness explicit in ledgers, replay, and target manifests.
48. Map strong documentation claims to checkable commands.
49. Make `fsl init` create an agent-ready project scaffold.
50. Define acceptance criteria for calling the v6 toolchain LLM-ready.
51. Add corpus governance metadata: owner, status, reviewer, feature tags,
   generated/manual marker, and deprecation/replacement fields.
52. Split corpora into train, dev, eval, adversarial, and canary sets with
   contamination policy.
53. Add tolerant parse mode with partial AST fragments, recovery confidence,
   skipped ranges, and strict reparse guidance.
54. Add diagnostic repair strategies via `fsl fix-options --json`.
55. Add semantic lint rules for reachability, near-duplicate names, guards,
   effects, channels, profiles, and target compatibility.
56. Add `fsl workspace index --json` for repo-wide machine, property, policy,
   test, generated artifact, and dependency discovery.
57. Make cross-machine dependencies explicit for composition: channel mapping,
   payload mapping, assumptions, queues, failures, timeouts, and authority.
58. Add compatibility/refinement checks for old/new machines and public
   interfaces.
59. Add property mutation testing to identify weak or vacuous properties.
60. Add sandboxed `fsl what-if --json` analysis for hypothetical states,
   hooks, events, policies, and target capabilities.
61. Define a machine-readable debugger protocol shared by CLI, IDE, MCP, and
   tests.
62. Add runtime observability events and a source-linked flight recorder.
63. Publish stdlib/operator metadata for signatures, totality, determinism,
   error kinds, laws, target support, and examples.
64. Publish Unicode, unit, and numeric semantics matrices as data consumed by
   docs, verifier, codegen, and agent references.
65. Add target conformance harnesses that compile generated code, run vectors,
   and emit canonical traces.
66. Require adapter shims to ship capability manifests, ABI manifests,
   conformance subsets, golden traces, and loss reports.
67. Maintain a feature interaction matrix with specified/implemented/tested/
   conformance/deferred status.
68. Add semantic search over local workspaces and future registry interface
   cards.
69. Publish agent task recipes and approval policy templates as
   machine-readable indexed docs.
70. Define refusal conditions and quality bars for generated prose,
   explanations, prompt summaries, and PR comments.
71. Add typed semantic holes in explicit sketch mode, with checker-produced
   constraints and patchable hole IDs.
72. Add `fsl sketch --json` for test-driven completion of partial machines.
73. Add `fsl differentiate` and `fsl pick` for PICK-style candidate
   disambiguation using concrete differentiating tapes.
74. Add design-space tools such as `fsl score`, `fsl evolve`, and
   `fsl auto-tune`, preserving declared properties by default.
75. Add `fsl explain-tape --focus` and `fsl bisect-tape --json` for long-trace
   debugging and behavioral regression localization.
76. Add `fsl alert-to-prompt --redact` to turn production incidents into safe,
   bounded agent repair tasks.
77. Add `fsl mock` for verified stateful mocks over declared machine
   interfaces.
78. Add `fsl lift --json` for legacy-code state-machine extraction briefs with
   uncertainty annotations and generated sketch FSL.
79. Add `fsl workbench` for isolated in-memory agent design sessions that commit
   only semantic patches or review packs.
80. Add `fsl export-system-prompt` plus `agent.json` or
   `fsl-agent-manifest.yaml` for project-specific agent onboarding.
81. Add privacy-preserving documentation telemetry and `fsl check-docs` for
   executable docs and docs heatmaps.
82. Add `fsl render --highlight-error` paired with semantic IDs, source spans,
   and alt-text summaries.
83. Add `fsl notebook check --json` for Markdown-native executable FSL blocks.
84. Add verified synthetic trace generation and curriculum generation with
   corpus split and contamination controls.
85. Add `fsl lsp --agent-mode` for reasoning-oriented incremental constraints
   while agents edit.
86. Add `fsl mcp --policy guard.fsl` as a verifiable system-prompt/tool-gating
   mechanism.
87. Track zero-knowledge/circuit export as a roadmap stress test for bounded IR
   and capability manifests.
88. Add structured natural-language views that round-trip only through proposed
   semantic patches and disambiguation, never silent prose rewrites.
89. Define first-class machine test artifacts with stable IDs, source hashes,
   semantic hashes, expected traces/properties, coverage, and promotion
   provenance.
90. Add `fsl test --json` for unit tests, authored examples, golden traces, and
   replay regression tests.
91. Add property-based generators for valid input tapes, payloads, hooks,
   sensors, and current-state-sensitive events.
92. Add stochastic, directed, and coverage-guided fuzzing with seed,
   distribution, coverage, shrink, and replay outputs.
93. Add metamorphic, equivalence-class, boundary-value, pairwise, and negative
   testing modes.
94. Add determinism and replay-stability tests for deterministic profiles,
   ledgers, generated targets, migrations, and toolchain updates.
95. Add serialization round-trip tests for source, AST/CST, IR, interchange,
   patches, and replay bundles.
96. Add codegen parity tests and target conformance reports comparing generated
   runtimes against reference canonical traces.
97. Add temporal regression, refinement, contract, protocol, scheduler,
   confluence, idempotence, and commutativity testing.
98. Add soak, long-walk, fault-injection, chaos, and resource-budget testing for
   composed systems and runtime adapters.
99. Add security policy and redaction tests for effect authority, prompt-safe
   artifacts, logs, rendered alt text, ledgers, and review packs.
100. Add migration, documentation, prompt/agent regression, oracle, and
   specification-mining test modes.
101. Add vacuity testing for weak properties that pass because states, events,
   hooks, or assumptions are unreachable/impossible.
102. Add failing tape minimization via `fsl minimize --json`.
103. Add test promotion workflows from fuzz failures, production incidents, and
   model-check counterexamples into regression tests and conformance vectors.
104. Add `fsl coverage --json` for semantic coverage over states, transitions,
   guards, effects, channels, contracts, properties, errors, and rollback paths.
105. Add `fsl query --json` as a structured behavior query layer over the
   semantic graph, verifier, trace generator, and source-map artifacts.
106. Add exact query forms such as `why-not`, `how-can`, `what-breaks-if`,
   `must-pass-through`, `explain-reachability`, `find-cycles`,
   `accepted-events`, and `compare-acceptance`.
107. Add query results with interpreted query, answer kind, witness/proof status,
   graph slice, source spans, semantic IDs, witness tape, and suggested next
   queries.
108. Add a natural-language query front end that compiles to structured queries
   and uses PICK-style disambiguation when ambiguous.
109. Add observational lenses that declare visible, hidden, abstracted, and
   redacted states, vals, channels, emits, effects, timing, errors, and payload
   fields.
110. Add `fsl lens-equivalent`, `fsl lens-diff`, `fsl lens-minimize`, and
   `fsl lens-docs` for viewpoint-specific equivalence, review, minimization,
   mocks, and documentation.
111. Add lens result artifacts with lens hash, visible alphabet, projection
   rules, redaction report, equivalence result, source spans, and witness tape
   when not equivalent.
112. Add `fsl counterfactual --json` for ranked semantic patch candidates that
   would make a desired behavior, property, reachability, blocking, lens, or
   target-support goal true.
113. Add counterfactual result artifacts with source hash, semantic
   preconditions, expected behavior delta, side effects, affected lenses,
   affected properties, affected targets, risk, rerun checks, and witness tapes.
114. Require counterfactual patching to refuse underspecified goals, prefer
   small semantic patches, and use PICK-style disambiguation for ambiguous
   interpretations.
115. Add semantic breakpoints for states, transitions, guards, vals, emits,
   effects, rollbacks, properties, lenses, capabilities, and secret-flow events.
116. Add doomed-property detection: the earliest trace point where no possible
   continuation can still satisfy a property.
117. Add breakpoint result artifacts with trace step, semantic node ID, source
   span, triggering observation, state snapshot, ledger context, nearest repair
   frontier, suggested queries, and suggested counterfactual goals.
118. Add a semantic debugging workbench with watch expressions, trace slicing,
   causal explanation, why/why-not debugging, time travel, branch replay, and
   first-divergence detection.
119. Add effect, ledger, lens, distributed/system, scheduler, guard, hook,
   sensor, rollback, and coverage debugging views.
120. Add debug session artifacts that preserve replay hash, breakpoints,
   watches, branches, trace slices, conclusions, counterfactuals, tried patches,
   and accepted repairs.
121. Add debugging commands such as `fsl debug`, `fsl trace slice`,
   `fsl trace why`, `fsl trace why-not`, `fsl trace branch`,
   `fsl trace divergence`, `fsl watch`, `fsl guard explain`,
   `fsl rollback explain`, `fsl effect trace`, `fsl ledger explain`, and
   `fsl coverage why-uncovered`.
122. Add behavioral typeclasses as named semantic interfaces defined by required
   structure, laws, assumptions, lenses, effects, and target requirements.
123. Add typeclass instance artifacts recording name mappings, proof results,
   assumptions, law status, target support, effect requirements, and invalidation
   conditions.
124. Add typeclass adapters and `implements?` checks that explain missing laws,
   counterexamples, and nearest repair/counterfactual options.
125. Add positive and negative behavioral building blocks such as Retryable,
   CircuitBreaker, SagaStep, IdempotentConsumer, ApprovalGate, ToolPolicyGuard,
   NoSecretEgress, and NoDuplicateCharge.
126. Add composition/law-lifting reports for systems built from behavioral
   building blocks.
127. Add registry search, ranking, and interface cards based on typeclass
   instances, proof freshness, effect compatibility, target support, and
   assumptions.
128. Add typeclass-driven scaffolding that emits skeleton machines, required
   properties, law tests, examples, holes, docs stubs, and target expectations.
129. Add behavioral semver based on lenses, typeclass instances, refinement
   checks, assumptions, guarantees, and effect authority.
130. Add advisory typeclass inference with explicit user acceptance before a
   claim becomes part of the public contract.

## Final Position

FSL v6 already has the ingredients that matter to LLMs: bounded execution,
deterministic replay, capability profiles, typed errors, conformance vectors,
and a toolchain that wants to speak in artifacts.

The main recommendation is to make those artifacts uniform and operational
before broadening the surface area.

For Codex, the ideal FSL toolchain is not one that writes more prose for me. It
is one that gives me a compact semantic context, refuses unsafe or lossy work by
default, turns failures into replayable repair packs, and lets every successful
operation leave behind a hashable artifact I can trust.

That is the difference between an LLM being able to talk about a state machine
and an LLM being able to safely work on one.
