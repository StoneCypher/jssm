# Megaspec Critique

> Audience: Claude or another model interpreting the v6 megaspec.
>
> Purpose: use this as review context, not as an instruction to implement
> everything named here. Separate current implementation risks from spec-design
> risks. The implementation is only just underway.

## 1. Current v6 Implementation Audit

This section reviews the current `v6` worktree as implementation-in-progress.
Treat these as quality findings against present code and packaging, not as a
judgment that the whole megaspec should already be implemented.

### High Priority

1. **Published CLI package shape appears broken.**

   `package.json` exports `jssm/cli` to `jssm.cli.*` and `dist/cli/lib.*`, but
   `npm pack --dry-run --json` did not include those files. It only included
   `dist/cli/fsl.cjs` and `dist/cli/fsl-render.cjs`.

   Impact: installed users may get a broken `jssm/cli` subpath even though local
   source imports and local tests pass.

   Suggested action: add the CLI library artifacts and declarations to the
   package `files` allowlist, and add a pack-shape test that checks the tarball
   contents for exported files.

2. **New CLI verbs are advertised before their binaries are wired.**

   The dispatcher help advertises `codegen`, `import`, and `export`; source entry
   files exist for `fsl-codegen`, `fsl-import`, and `fsl-export`. But
   `package.json` `bin` still lists only `fsl`, `jssm`, and `fsl-render`, and the
   CLI rollup config only builds `fsl`, `fsl-render`, and `lib`.

   Impact: `fsl codegen`, `fsl import`, and `fsl export` can be documented or
   advertised while not resolving in an installed package.

   Suggested action: decide whether these are first-party shipped binaries now
   or only library/plugin surfaces. If shipped, wire `bin`, rollup, minification,
   dist artifacts, and package files together. If not shipped, soften dispatcher
   help until the binaries are real.

### Interchange Fidelity

3. **JSON interchange is described as lossless, but start states are not
   faithfully preserved.**

   The JSON interchange format claims a lossless FSL -> JSON -> FSL roundtrip.
   However, `fslToModel()` currently records only `machine.state()` as
   `start_states`, not the full set of declared start states. `modelToFsl()`
   then ignores `model.start_states` entirely when rendering FSL.

   Impact: a machine such as `start_states: [a c]; a -> b -> c;` cannot
   roundtrip truthfully through the JSON path, despite `lossy: []`.

   Suggested action: either preserve and emit `start_states: [...]`, or mark the
   conversion as lossy. The former is preferable because FSL already supports
   the directive.

4. **JSON envelope validation is missing.**

   `JsonDocument` defines `format: 'fsl-interchange'` and `version: 1`, but
   `jsonToModel()` validates only `states`, `edges`, and optional
   `start_states`.

   Impact: foreign JSON, or a future incompatible interchange version, can be
   accepted as current FSL interchange if it happens to contain plausible
   `states` and `edges`.

   Suggested action: reject documents unless `format === 'fsl-interchange'` and
   `version === 1`, or deliberately document that the reader accepts the raw
   model shape without an envelope.

### Codegen Fidelity

5. **Generated TypeScript driver erases forced-transition semantics.**

   jssm treats `~>` forced edges as different from ordinary transitions:
   ordinary `transition()` rejects forced-only targets, while
   `force_transition()` accepts them. The current `native:typescript` codegen
   stores only `{ from, action, to }` and emits a single `transition(action)`
   driver.

   Impact: generated code is runnable but not semantically faithful for machines
   using `~>` or other arrow-kind behavior. That is especially important because
   the megaspec frames codegen as executable host source, not just a structural
   table dump.

   Suggested action: either encode edge kind and expose corresponding driver
   methods, or reject/warn on unsupported edge kinds until fidelity is
   implemented.

### Lower Priority Quality Drift

6. **Config schema and TypeScript config types are drifting.**

   `CodegenConfig` now has `defaultTarget` and `outDir`, while the runtime JSON
   schema still treats `codegen` as an open empty section.

   Impact: config files can pass schema validation while not being meaningfully
   checked against the new codegen contract.

   Suggested action: give `codegen` a real schema section once the fields are
   meant to be public.

7. **Test type imports can drift silently.**

   One CLI config type test imports a non-existent `FmtConfig` type. Vitest
   passes because the type-only import is erased and the TS configs exclude
   tests.

   Impact: test sources can fall out of type agreement with the code they claim
   to pin.

   Suggested action: add a lightweight test-typecheck target, or include test
   sources in a no-emit test tsconfig.

### Verification Already Run

- `npx.cmd tsc --noEmit -p tsconfig.cli.json` passed.
- Focused CLI/codegen/interchange/dispatcher Vitest run passed: 125 tests.
- Focused config/lib Vitest run passed: 34 tests.
- `git diff --check` passed.
- `npm.cmd pack --dry-run --json` exposed the packaging omission and did not
  create a tarball.

## 2. Megaspec Content Review

This section reviews the megaspec as a roadmap/specification artifact. Do not
interpret implementation gaps as failures. The implementation is intentionally
early.

### Overall Opinion

The megaspec has a very strong core. The central design is sensible:

- finite/checkable by default;
- deterministic replay as the source of truth;
- typed `val` / `prop` / `sensor` as a clean state model;
- tapes and repro bundles;
- host-agnostic semantics backed by conformance vectors;
- capability negotiation for verification and codegen.

That core gives FSL a real identity beyond "nice FSM syntax." It is an
ambitious but coherent direction.

The main weakness is not the core. The weakness is that the document currently
mixes four different genres:

1. normative language semantics;
2. implementation roadmap;
3. product/tooling strategy;
4. positioning manifesto for humans and AI agents.

Those genres can live together during ideation, but they should not all look
equally binding once implementation branches start using the file as authority.

### What Is Especially Strong

1. **Finite/checkable/rich framing.**

   The "bounded by default, opt into unbounded knowingly" principle is the right
   north star. It keeps the language from becoming a pretty scripting language
   with an FSM attached.

2. **Replay-first semantics.**

   Treating input tape plus snapshot as the source of truth is powerful. It
   unifies debugging, testing, counterexamples, observability, and conformance.

3. **Conformance vectors as executable spec.**

   Cross-host semantics will otherwise rot. Vectors as data, canonical traces,
   and thin host harnesses are the correct way to make "host-agnostic" real.

4. **Capability profiles and target manifests.**

   This is a good design bridge between verification and codegen. It lets a
   machine declare what it needs and lets a target declare what it can honor.

5. **The CLI verb-boundary thinking.**

   The distinctions among `render`, `codegen`, `typegen`, `import`, and
   `export` are important and well stated. Keep those boundaries.

### Overreach

1. **The outer rings are too much for one release target.**

   The decision log expands into deployment, verification ecosystem, trust,
   agent ops, fleet governance, synthesis, registry, OTel, durable execution,
   semantic merge, and more. These are interesting, but they should not all be
   "v6" commitments.

   Concrete caution: phrases like "All rings target v6" should be removed or
   reworded. They turn a visionary map into a release trap.

2. **The CLI surface is too large as a normative near-term promise.**

   A CLI list that grows from roughly two dozen to thirty-plus built-ins is a
   product suite, not a single language milestone. Keep the vision, but divide
   verbs into:

   - MVP;
   - committed v6;
   - v6.x candidates;
   - research / aspirational.

3. **The AI-agent strategy is compelling but should not pollute core semantics.**

   MCP, guardrails, learn-by-repairing, interface cards, and `llms.txt` are
   valuable. They should be a companion strategy document unless a feature has
   direct language semantics.

### Choices That Need Clarification Or Revision

1. **`finite` vs `checkable` is inconsistent.**

   Early text says `finite` rejects the rich band, which appears to allow
   large-finite / SMT cases. Later the decision log says `finite` is the hard
   enumerable line and `checkable` is the softer large-finite / SMT tier.

   Recommendation: pick one model and rewrite all occurrences. My preference:

   - `finite`: all state spaces are finite, possibly large;
   - `small-finite`: explicitly enumerable;
   - `symbolic-finite` or `checkable`: finite but requiring SMT/symbolic
     methods;
   - `rich`: bounded analysis only.

2. **External effects inside transactional semantics are the biggest hazard.**

   The spec promises atomic rollback of state/data/emits, but external hook
   side effects are explicitly not unwound. Named hooks can be called in action
   position and their return values are recorded.

   Recommendation: define a hard effect boundary:

   - Pure/calculating external calls may happen inside the transaction if their
     return is recorded.
   - Irreversible external effects should happen only post-commit, or must be
     explicitly marked non-transactional/idempotent.
   - Replay behavior for calls must be specified: use recorded return, refuse
     missing recording, or call again only under an explicit unsafe mode.

3. **Journal wording is ambiguous.**

   "Commit journaled writes" can be read as deferred writes becoming visible
   only at stable. But the likely intended model is immediate writes with undo
   logging, then journal discard at commit.

   Recommendation: say explicitly: assigns update machine state immediately
   during the macrostep; the journal records old values; rollback reverses the
   journal; commit discards it.

4. **Tape policy needs one taxonomy.**

   One section says input tape is retained and output/log/error regenerate; a
   later section introduces a dead-letter tape that is system-scoped and
   inspectable.

   Recommendation: define tape classes:

   - retained source-of-truth tapes;
   - regenerated observable tapes;
   - diagnostic retained tapes, if any;
   - host/export-only observability streams.

5. **`stream` is used but not defined.**

   The spec already notes this in Open/Deferred. Move it earlier if any v6
   phase uses RNG streams in examples or semantics.

6. **Comment syntax is unsettled.**

   Examples mix `%` and `//`. Since the existing parser uses `//`, choose one
   and sweep the spec examples. This matters because the megaspec is also a
   training corpus for models.

7. **Weighted `LabelList` grammar needs an explicit grammar sketch.**

   The weighted start state and probabilistic list-target rules are important
   and subtle. They deserve a small grammar and normalization examples in one
   place.

### Omissions To Fill Before Implementation Depends On This

1. **Operational semantics appendix.**

   Add small-step or structured pseudocode for macrostep, microstep, event
   selection, internal event queue, eventless cascade, invariant check, commit,
   rollback, and observer timing.

2. **Minimal grammar appendix.**

   The spec needs at least a compact grammar for new constructs, especially
   declarations, expressions, `assign`, `where`, contracts, weighted lists,
   channels, factories, and systems.

3. **Verifier complexity and budget model.**

   Decidability is not enough. Each verifier feature should state:

   - decision procedure;
   - required restrictions;
   - expected complexity class when known;
   - fallback result (`pass`, `fail`, `undecided`);
   - what certificate or witness is produced.

4. **Security/effects model.**

   This is needed for named hooks, MCP guardrails, untrusted machine execution,
   certificates, and `pure` profiles. Without it, the effect-safety story is too
   easy to overclaim.

5. **Release matrix.**

   Add a table with statuses such as:

   - `settled-core`;
   - `draft-core`;
   - `roadmap`;
   - `aspirational`;
   - `deferred`.

   Claude should not infer that every vivid paragraph is equally normative.

6. **Compatibility policy.**

   The spec mentions editions and future removals. It should also say how
   existing v5/v6 documents are parsed, warned, formatted, and migrated, and
   what "edition" means for conformance vectors.

### Suggested Restructure

Split the megaspec into four documents:

1. **Normative Core Spec**
   - syntax;
   - types;
   - execution;
   - effects;
   - tapes;
   - determinism;
   - conformance.

2. **Implementation Roadmap**
   - phases;
   - dependency graph;
   - systems track;
   - verifier track;
   - CLI phasing.

3. **Product / AI Strategy**
   - MCP;
   - interface cards;
   - registry;
   - learn-by-repairing;
   - guardrails;
   - docs and adoption.

4. **Decision Log**
   - keep the existing table;
   - add status and target phase to every row.

### Bottom Line

The megaspec is sensible at the center and overextended at the edges. The best
thing to preserve is the through-line:

> FSL is a bounded, typed, replayable, verifiable transducer language whose
> behavior is portable because the conformance corpus is the executable spec.

The thing to avoid is letting every attractive adjacent idea become a v6
requirement. The map is good. It now needs borders, labels, and a few "later"
signs.
