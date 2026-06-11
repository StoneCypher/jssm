# FSL Factories & Systems — Design Spec

> **Status:** DRAFT — product of the design dialogue 2026-06-10.
> **Target release:** major version bump (v6 family).
> **Sibling spec:** `2026-06-09-fsl-expression-language-design.md` (extended state & expression language) — this spec **depends on it**: factories bind the `var` declarations it defines, and all generator/selector expressions are written in its expression language.
> **Resolves fsl issues:** #413 (factories umbrella), #430 (instance name), #431 (name factory method), #443 (start-node selection), #459 (data factory method).
> **Coordinates:** #1348 (payload typing), the tape cluster (#640/#641, #676/#677, #696/#697), #64/#67 (stochastic system testing), #407 (publish/npm modules), #1172/#1173 (transcompiler targets & declared abilities).
> **Repo note:** durable docs live under `notes/`, never `docs/` (`npm run clean` does `rm -rf docs/`).

---

## 1. Motivation

A jssm machine is constructed from a text; every construction yields the same machine, modulo a grab-bag second argument (`from(text, ExtraConstructorFields)`). There is no first-class way to say "a *kind* of machine, some of whose parameters are fixed, some generated, and some left for the caller" — the factory_girl / stochastic-tester pattern. The tracker has wanted this since fsl#413: *"a call similar to `sm` … should generate state machine factories that accept an object to make a new state machine."*

The v6 expression-language spec supplies exactly the missing contract surface: a machine's `var` declarations are its parameters, and **a `required` var with no `default` is an unfilled parameter**. This spec adds the two constructs that exploit that surface:

- **Factory** — a binding layer over a parameterizable document: per parameter, a fixed value or a generator expression; deterministic, curryable, serializable.
- **System** — a named collection of machine instances (singletons and factory-fed populations) plus declared wiring that routes machine **tape output** to member actions. Systems are themselves parameterizable documents, so **system factories fall out by symmetry** rather than by new machinery.

The Roller Coaster Tycoon test (fsl#431/#459): a park needs a semi-constant stream of customers, each with a generated debug label (`Cust ${n}`), generated gameplay data (name, patience, preferences), within declared domains, reproducibly. This spec makes that two declarations and one route.

---

## 2. Design principles

1. **One factory semantics, defined once.** Machine documents and system documents are both "parameterizable documents" (`var`s + optional `factory` block). Factories over either share one definition, one API contract, one serialization. The API surface does not double.
2. **Pure core, convenient skin.** Instance *n* of a factory is a pure function of `(document, bindings, seed, n)`. The stateful feel (`make()` advancing a hidden cursor) is sugar over the pure core (`at(n)`).
3. **A seed is only ever sampled at the root; every other seed is derived** — by an FSL-defined, host-portable derivation function, never by host RNG.
4. **Construction-time randomness is free; runtime randomness costs `checkable`.** `rand()` in a factory block picks initial values *inside declared var domains the checker already verifies over*, so stochastic factories emit fully `checkable` machines. (`rand()` at machine runtime still flips `checkable` off, per the sibling spec §9.)
5. **Machines never know they are in a system.** Communication topology belongs to the system document. The machine-side surface is only: actions in, declared tape records out.
6. **Deterministic everywhere.** Dispatch order, broadcast order, spawn cursors, and seed derivation are all fully defined; same seed + same external stimuli ⇒ bit-identical run on every host, enforced by the conformance suite (sibling spec §10).

---

## 3. Scope

**In scope:** value + identity parameterization (declared `var`s; instance/machine name; start state; per-instance rng seed; config attributes); machine factories; tape alphabets and the `tape` write verb; system documents (members, routes, lifecycle, failure policy); systems as members of systems (§5.4); system factories; composed-system model checking (§10); the visualization model (§11); serialization of both; the CLI surface (§13) and its conformance mechanics (§12.1).

**Out of scope (named future work, §15):** bounded *structural* templating (a parameter changing topology, e.g. `n_stages : int 1..8` stamping out N states — the parameter-domain syntax here is designed so a future template tier can adopt it); tape writes from entry/exit positions; backpressure/bounded-queue analysis; live/runtime visualization.

---

## 4. Machine-side grammar

### 4.1 The `factory` block

An optional top-level block in a machine document. Each binding targets a declared `var` or a **reserved identity target**, with an expression-language RHS:

```
// customer.fsl
Entering -> Queuing -> Riding -> Leaving;
Riding 'done' -> Leaving    tape left(satisfaction);

var name         : string            required;
var patience     : int 0..100        default 50;
var satisfaction : int 0..100        default 70;
var tier         : enum(kid, adult)  required;

tape left(satisfaction : int 0..100);

factory {
  seed 1234;                              // optional; else supplied at construction (§6.1)
  name          <- "Cust ${seq()}";
  patience      <- rand(20, 95);
  instance_name <- "customer_${seq()}";
  // tier left unbound: must be supplied at with()/make()/at()
}
```

- Binding an undeclared name, or a type-mismatched expression, is a **compile error**.
- Binding a non-`required` var simply overrides its default-generation.
- A document may have **at most one** `factory` block (it is *the document's* canonical factory; alternates are built API-side via `.with()` or registered under other names, §8).

**Reserved identity targets** (settling fsl#430/#431/#443):

| Target | Type | Meaning |
|---|---|---|
| `instance_name` | `string` | the instance's `instance_name` config field (fsl#430) |
| `machine_name` | `string` | the instance's `machine_name` (fsl#431) |
| `start_at` | state name (literal, not computed) | which declared start state the instance begins in (fsl#443) |
| `seed` | `uint64` | the instance's machine `rng_seed`; defaults to a derived value (§6.1) |

**Factory-block-only builtins:** `seq()` — the instance index *n* (an `int 0..`); `rand(lo, hi)` — seeded from the seed tree (§6.1). All other expression-language builtins are available. Generator expressions may read other bound targets only in declaration order (no cycles; a binding may not reference itself or a later binding — compile error).

### 4.2 Tape alphabet declarations and the `tape` verb

A machine that produces output declares its **tape alphabet** at top level and writes records as a transition clause:

```
tape left(satisfaction : int 0..100);          // declaration: record name + typed payload
Riding 'done' -> Leaving   tape left(satisfaction);   // write: payload is an expression
```

- Writing an undeclared record name, or a payload not matching the declared type, is a **compile error**. Payload type syntax is shared with action-payload typing (fsl#1348) and must be settled jointly.
- Multiple `tape` clauses on one transition are written in source order and enqueued in that order (§7.2).
- The `tape` clause runs in the pipeline at the same slot as `assign` (between exit and entry), sees post-`assign` values, and is **rolled back with the transition**: a record from a transition that errors is never delivered.
- A declared, finite tape alphabet keeps machines analyzable and is what makes a machine **testable in isolation**: feed actions, assert the output tape, no system required.

---

## 5. System documents

A new document type (working file extension: `.fsls`).

```
// park.fsls
use "./customer.fsl" as Customer;          // file sugar; the registry is the core (§5.1)

system Park {

  var n_customers : int 0..500 default 200;

  customers : many Customer via factory  count n_customers max 500;
  gate      : one  Gate;
  kids      : one  KidsSection;            // a member *system* (§5.4)

  tape closed(reason : string);            // this system's own output tape (§5.4)

  on customers tape left(s)   -> gate 'depart'(s);      // tape route (the primitive)
  on gate enters Closed       -> customers 'hurry';     // observation route (sugar, §7.1)
  on gate tape admit          -> spawn customers;       // lifecycle verb (§7.3)
  on customers enters Leaving -> retire sender;         // lifecycle verb (§7.3)
  on gate enters Closed       -> tape closed("day end");// writes our output tape (§7.1)
  on action 'hurry'           -> customers 'hurry';     // our inbound action surface (§5.4)

  on_undeliverable: error;                 // error | drop | dead_letter (§7.4)

  invariant count(customers) <= 500;       // system invariant (§10)

  factory {                                 // a system factory binds these, by symmetry
    n_customers <- rand(50, 400);
  }
}
```

### 5.1 Name resolution: registry core, `use` sugar

Semantically a system compiles against a **registry**: a mapping from names to machine definitions/factories. The host API populates it (`.register('Gate', gateFactory)`) — this works in browsers, tests, and embedded hosts with no filesystem. The `use "<path>" as Name;` statement is host/CLI **sugar** that populates the same registry from files. The spec defines resolution once; loaders are per-host. An unresolved name at instantiation is an error naming the missing entries.

### 5.2 Members

- `name : one Defn;` — a singleton member, instantiated from `Defn` (its factory if it has one, else its defaults; unbound required vars are an instantiation error).
- `name : many Defn via factory count <expr>;` — a population fed by `Defn`'s own factory block; `via OtherName` selects a registered alternative factory. `count` is the *initial* population (an expression over system vars; populations may grow/shrink via `spawn`/`retire`).
- `max N` declares a population's hard upper bound — required for a `checkable` system (§10) and enforced at runtime: a `spawn` beyond `max` is an undeliverable (§7.4).

### 5.3 Systems are parameterizable documents

Systems declare `var`s and may carry a `factory` block, exactly as machines do (§2 principle 1). System vars are readable in `count` expressions and route selectors. Everything in §6 (factory semantics, seed tree, cursor, currying, serialization) applies verbatim with "document" = the system document.

### 5.4 Composition: systems as members

The member contract is **actions in, tape out**; a system satisfies both halves explicitly:

- **System output tapes** — declared in the system block exactly as machine tape alphabets (`tape closed(reason : string);`), written by routes whose delivery verb is `tape <record>(payload)` (§7.1).
- **System action interface** — the route source form `on action '<name>' -> ...` means "when this system *receives* `<name>`, route it inward." The set of `on action` routes **is** the system's declared action surface; deliveries (from `.action()` or a parent system) naming anything else are undeliverable (§7.4).
- **Membership** — `kids : one KidsSection;` works when `KidsSection` resolves to a registered *system* definition; `many` + system factories yield populations of systems (the §2 symmetry again).
- **Seed tree** — no new rules: `derive(parent_seed, "kids")` roots the child's tree (§6.1).
- **Acyclicity, enforced** — registry resolution rejects recursive composition (a system definition reachable from its own member graph) at compile time; composition is a finite tree by construction. The composition tree is also the visualization cluster tree (§11).

---

## 6. Factory semantics

### 6.1 The seed tree

The spec fixes a derivation function over pure uint64 arithmetic:

```
derive(parent_seed : uint64, label : string) -> uint64
```

*Working candidate:* FNV-1a 64 over the label's UTF-8 bytes, XORed into the parent, mixed through one splitmix64 round. Final choice is a drafting detail; the requirements are normative: pure uint64 ops, no host RNG, ~5 lines in any host, **test vectors in the conformance suite**.

The tree:

```
system seed
 └─ derive(sys_seed, "<member name>")      → population-factory seed
     └─ derive(factory_seed, "<n>")        → instance n's seed
         ├─ derive(instance_seed, "<k>")   → k-th rand() call site in the factory block
         └─ derive(instance_seed, "machine_rng") → the instance's rng_seed
                                              (unless the factory block binds `seed`)
```

A standalone machine factory is simply a tree rooted at its own seed. Consequences: `at(n)` is bit-identical across hosts, runs, and time; disjoint index ranges of one population can be built in parallel with zero coordination; instance 42 of seed 1234 is a *coordinate*, not an anecdote.

**Unseeded roots:** if no seed is given anywhere in a construction tree, the host samples its clock **once, at the root only** (spec-defined: milliseconds since Unix epoch as `uint64`), and that value **becomes the recorded seed** — readable via `.seed()`, included in serialization, printed by the CLI. Unseeded runs are therefore replayable after the fact. There is always exactly one root seed; the only question is whether the caller chose it.

### 6.2 Pure core, cursor sugar

- `at(n, overrides?)` — pure: instance *n*, deterministic, cursor untouched.
- `make(overrides?)` — `at(cursor)`, then cursor += 1.
- `seq()` inside the factory block evaluates to *n*.
- `rand(lo, hi)` at call site *k* draws from `derive(instance_seed, k)`'s stream — so each binding's randomness is independent of binding order elsewhere.

### 6.3 Currying and validation timing

- `with(bindings)` returns a **new** factory (immutability makes sharing safe); it validates **immediately**: unknown names and type mismatches throw at `with()` time.
- `make()`/`at()` validate **completeness**: any still-unbound `required` var throws `UnboundParameterError` (a `JssmError` subtype) listing **all** missing names.
- Host-callback bindings are permitted (`with({ name: () => pick() })`) but place the factory in the **rich tier**: not portable, not serializable (§9).

---

## 7. System runtime semantics

### 7.1 Routes

`on <source> <fact> -> <target> <delivery>;`

- **Source facts:** `tape <record>(bindings)` — the primitive; `enters <State>` / `exits <State>` / `takes '<action>'` — **observation sugar**: the system synthesizes an internal record from the observed fact and routes it through the same plumbing. One delivery semantics underneath. The memberless form `on action '<name>'` fires when the system itself receives `<name>` (§5.4).
- **Targets:** a `one` member; a population (broadcast, member-creation order); or a filtered population — `-> customers where patience < 20 'leave_now'` — the `where` expression evaluated against each member's vars/properties/current state. Same expression language; no new sub-language.
- **Deliveries:** `'<action>'(payload-expr)` invoking the target's action; a lifecycle verb (§7.3); or the targetless `tape <record>(payload-expr)`, writing the enclosing system's own output tape (§5.4).
- Payload expressions may read the source record's payload bindings and the source member's vars/properties.
- **`sender`** is the single reserved context name: the member whose fact fired the route. There are no computed member references — identifier slots stay non-computed (sibling spec §8) and routes stay statically analyzable.

### 7.2 Dispatch: run-to-completion, fully ordered

The system owns a FIFO queue of pending deliveries. The loop is defined, not emergent:

1. An external stimulus (host calls an action on a member or the system) begins a **step**.
2. A transition runs to full completion — the entire v6 pipeline: guards, `require`, `assign`, hooks, `ensure`, `invariant`, rollback. `tape` records written during it are **enqueued in write order**. (A rolled-back transition enqueues nothing.)
3. After completion the system pops the queue head, evaluates routes **in document order**, and delivers; broadcast delivers in **member-creation order**. Each delivery is itself a run-to-completion transition (step 2).
4. The step ends when the queue is empty.

**Hierarchical dispatch:** a delivery to a member *system* enters through that child's `on action` routes and runs the child's own dispatch loop **to quiescence** (its queue drains, under its own depth limit); records the child writes to its output tape during that processing enqueue into the **parent's** queue in write order. Run-to-completion holds at every level, so determinism composes.

No re-entrancy is possible. A **queue-depth limit** (system attribute; *draft default 10,000, flag for review*) guards live-lock; exceeding it is an error — the same shape as the machine boundary-cascade depth limit shipped in jssm 5.143.

### 7.3 Lifecycle verbs

- `spawn <population>` — stamp the next instance from the population's factory, advancing its cursor, inside the dispatch loop (hence deterministic). New members begin receiving routed deliveries from the next queue item onward.
- `retire sender` / `retire <member>` — remove a member. Pending queue items targeting a retired member are treated by the undeliverable policy (§7.4). Retirement does not disturb other members' indices (`seq()` values are never reused).
- The host API mirrors both verbs (§8).

### 7.4 Failure policy

`on_undeliverable: error | drop | dead_letter;` — default **error** (loud beats silent).

Undeliverable = the target's action is not permitted in its current state, the target's contract rolls the delivery back, or the target was retired. `dead_letter` appends the failed record (with source, target, and reason) to a system-owned **dead-letter tape**, inspectable via `.dead_letters()`. Member-machine rollback semantics are untouched (sibling spec §7.4); the policy governs only what the *system* does with the failed delivery.

### 7.5 Time

Members' `after`-delays already accept an injected `time_source`; the system supplies one uniformly to all members. Virtual-clock testing of a whole park is the same trick jssm already supports for one machine.

---

## 8. Host API

Template tags complete the `sm` pattern as a 2×2 grid — language × system, instance × factory:

| | instance | factory |
|---|---|---|
| **machine** | `` fsl`...` `` | `` fslf`...` `` |
| **system** | `` fss`...` `` | `` fssf`...` `` |

- **`` fsl`` `` is the canonical machine tag in v6; `` sm`` `` remains as a deprecated synonym** (documented as deprecated, removal not scheduled in v6).
- Instance tags throw if any required var is unbound (machines) or any registry name is unresolved (systems). Factory tags defer those checks to `make()`/`at()`/instantiation.
- Function forms mirror the existing `from()`: `from()`, `factory_from()`, `system_from()`, `system_factory_from()` — each accepting the existing-style extra-fields overlay where applicable.

**`Factory`** (one contract for machine and system factories): `.with(bindings)`, `.make(overrides?)`, `.at(n, overrides?)`, `.unbound()`, `.seed()`, `.cursor()`, `.bindings()`, `.serialize()`.

**`System`**: `.member(name)`, `.members(name)` (population iteration), `.action(member, action, payload?)` (the external stimulus entry point), `.spawn(population)`, `.retire(member)`, `.register(name, factoryOrDefn)`, `.dead_letters()`, `.seed()`, `.serialize()`, uniform `time_source`/`timeout_source` injection.

Errors are `JssmError` subtypes throughout; `UnboundParameterError` carries the full missing-name list.

---

## 9. Serialization

- **Factory:** `{ source_hash, bindings (expression-language source text), seed, cursor }` — a small portable JSON object, valid across hosts because bindings are FSL text, not host closures. A factory holding host-callback bindings is non-portable: `.serialize()` throws unless explicitly asked to emit with the callback slots marked unfilled.
- **System:** full snapshot — definition hash, registry name list, every member's state (current state + vars + RNG triple, per sibling spec §7), population cursors, the pending delivery queue, the dead-letter tape, the root seed. Member systems serialize recursively as nested snapshots. Snapshot/restore is whole-system time travel.
- **Replay-equality is a conformance test:** same snapshot + same recorded stimuli ⇒ bit-identical run on every host.

---

## 10. Checkability and composed-system model checking

- A machine built by a stochastic factory keeps its `checkable` flag: factory `rand()` executes before the machine exists and only selects values inside declared var domains — the domains the checker verifies over anyway. **Randomized fixtures, verifiable instances** — the stochastic-tester use case in its strongest form.
- A **system** may declare `checkable` when: every member definition (machine or system) is `checkable`, every population declares `max N`, and the queue-depth bound is declared. The compiler **enforces** the declaration (rejects violations), exactly like the machine attribute (sibling spec §9). The composed artifact is thereby *finite by construction*.

**The composed-system checker (phase F6)** verifies, over the composed configuration space (member states × var domains × population sizes `0..max` × queue contents up to the depth bound):

1. **Bound safety** — the queue-depth limit and population `max`es cannot be violated from any reachable configuration.
2. **Contract safety** — no reachable configuration violates any member's `invariant`/`require`/`ensure`, lifted compositionally.
3. **Deliverability** — under `on_undeliverable: error`, no reachable dispatch produces an undeliverable record (the point of declaring routes statically).
4. **System invariants** — a system may declare `invariant <expr>;` over member aggregates via four system-context-only builtins: `count(pop)`, `all(pop, pred)`, `any(pop, pred)`, `sum(pop, expr)`. Same expression language; legal only in system documents.
5. **Liveness (opt-in)** — deadlock detection: a reachable configuration from which no enabled progress exists.

The verifiability bands (sibling spec §3) apply compositionally: all-small-finite members enumerate; large-finite members push the composition into the symbolic/SMT band. **Counterexamples are stimulus traces** — and because of replay determinism (§9), every counterexample is *executable*: the checker hands back a reproduction script that replays bit-identically on any host.

---

## 11. Visualization model

Normative rendering model; implementation lands in jssm-viz plus this repo's CLI render path.

- A system renders as nested **clusters**: each `one` member is a cluster containing its full machine graph; a `many` population renders as one representative machine cluster with a **population badge** (`×200 / max 500`); member systems nest as clusters-within-clusters — the composition tree (§5.4) is the cluster tree.
- **Routes are inter-cluster edges**: anchored at the specific state for `enters`/`exits` sources, at the cluster boundary for tape/action sources; labeled with the record/action name; `where` selectors render as edge decorations. The dead-letter tape renders as a sink node when the policy enables it; system output tapes render as port nodes on the cluster boundary.
- Builds on the group-cluster machinery shipped in jssm 5.143 (overlapping state groups: cluster rendering, collision-free cluster ids, chip fallback) — populations and members are clusters with different framing, not a new engine.
- Live/runtime visualization (current-state heat, queue depth, population counts over time) is future work (§15); structural rendering is the normative part.

---

## 12. Testing strategy

- **Conformance vectors** for `derive()` (inputs → exact uint64 outputs) and for replay-equality (snapshot + stimuli → state digest).
- **Stochastic tests** (in the stoch suite): `at(n)` purity (idempotent, order-independent, cursor-independent); seed-tree independence (changing one binding's expression does not perturb another site's stream); population parallel-build equivalence (ranges built out of order produce identical members).
- **Spec tests** for: every grammar addition; `with()` validation timing; `UnboundParameterError` completeness; dispatch ordering (document order, write order, creation order); `spawn`/`retire` determinism; all three `on_undeliverable` policies; rolled-back transitions enqueueing nothing; tape-alphabet compile errors.
- Doctest `@example` blocks on every new public API entry point, per repo policy.

### 12.1 Conformance mechanics (codegen / multi-host)

Cross-host behavioral equivalence is tested as **data, not as N ported suites**:

- A **conformance vector** is `(document, seed, stimuli)`; its expected result is a **canonical trace** (JSONL: per step — transition taken, var deltas, tape records, rollbacks) plus a digest. Expected traces are produced by the reference implementation and **reviewed into the suite as normative spec artifacts**, versioned with the spec — the trace *is* the specified behavior, not an incidental snapshot of implementation output.
- A backend ships one **thin native harness** (read vector → run → emit the canonical trace); a host-agnostic differ does the comparison. Per-language cost is the harness, not a suite port.
- **Certification tiers:** **T1** `checkable` (no floats, locale, regex, or unicode tables — trivially exact everywhere, including C); **T2** rich-portable; **T3** pinned-unicode (the implementation-defined corners, sibling spec §12). A codegen target plugin **declares its certified tier** (fsl#1172). `fsl codegen --certify <target>` runs the suite against a harness.
- **Vector generation is itself factory work:** seeded `fslf`/`fssf` factories mass-produce machines and stimulus streams. **Differential mode** runs all certified backends on the same vectors and diffs pairwise, so disagreements localize to a backend immediately.

---

## 13. The CLI

### 13.1 Architecture

The existing git-style dispatcher is unchanged: `fsl <verb>` resolves built-ins first, then any `fsl-<verb>` binary on PATH (the plugin seam). The built-in verbs below join the dispatcher's reserved-names list. Every verb sits on the config loader (the `feat_26-05-22_fsl-cli-config_631` work); config gains a **`registry:` section** (name → file) consumed by every verb that resolves system member names (§5.1).

### 13.2 Verbs

| Verb | Role | Notes |
|---|---|---|
| `render` | documents → images (exists today) | grows system-document rendering per §11; `--watch` live-reloads on change |
| `make` | stamp instances from factories | `--bind k=v`, `--seed`, `-n` / `--at n`; emits §9 serializations |
| `run` | drive a doc from a stimulus file | JSONL stimuli in, tape records out; `--snapshot`/`--restore`; **the replayer** |
| `check` | `checkable` validation; F6 model checking | counterexamples emitted as stimulus files; meaningful exit codes |
| `test` | user-facing test runner | a test = `(document, seed, stimuli, expectations)` — the §12.1 vector format, user-aimed |
| `repl` | interactive session | send actions; watch state/vars/queue/populations; **sessions record as stimulus files** |
| `lint` | warnings beyond errors | unreachable states, unused vars, suspicious routes; core rule list is a drafting detail |
| `format` | canonical formatter | comment-preserving round-trip via the parser source locations shipped in 5.143 |
| `parse` | dump parse tree / compiled config as JSON | the tooling seam for editors, plugins, and bug reports |
| `config` | print resolved config with provenance | which files were discovered, the extends chain, the winning layer per key |
| `import` | SCXML / xstate / mermaid / dot → FSL | lossy conversions are marked as such |
| `export` | FSL → SCXML / xstate / mermaid / JSON | tool interchange |
| `codegen` | FSL → host-language source | targets are plugins declaring abilities + certified tier (§12.1; fsl#1172/#1173); `--certify` runs conformance |
| `publish` | package a document as a module (fsl#407) | npm first, other registries later; wraps codegen + manifest; **never touches a registry without explicit confirmation** |
| `init` | scaffold a project / config / registry | |
| `docs` | per-document human documentation | states, vars, tape alphabets, routes, members |
| `diff` | semantic diff of two document versions | states/transitions/vars/routes added/removed/changed |

**Verb boundaries:** `render` = images for eyes; `codegen` = executable source for hosts; `import`/`export` = tool interchange. Package *fetching* is not `import`'s job — published modules arrive via host package managers.

**Codegen targets are `host:library` coordinates.** Two kinds: **`native:*`** targets (`native:javascript`, `native:rust`, `native:c`, `native:python`, `native:php`, `native:ruby`, `native:csharp`; later `native:erlang`/`elixir`/`lisp` — the sibling spec §10 host list) emit code on the conformance-certified FSL runtime, with T1–T3 tier certification (§12.1). **Adapter** targets (`xstate`, `stent`, `ruby:state_machine`, `boost:msm`, `c#:dotnet-state-machine`, `taskflow`, … — the site's FeatureComparison matrix is the candidate set) emit onto third-party state-machine libraries and instead declare a **feature subset** (fsl#1172); a document's `targets:` directive (fsl#1173) makes the compiler warn the moment a construct exceeds any declared target's abilities. Both kinds arrive as `fsl-codegen-<target>` plugins, so the list is open-ended by design.

**The `publish` bundle:** alongside the module code and manifest, `publish` emits a generated `README.md`, an HTML render, and PNG + SVG renders of the document (all via `render`/`docs`). The README and the HTML render each carry a small, unobtrusive attribution link back to the FSL website and the GitHub repository — subtle placement (footer / badge line), deliberately: every published machine quietly points home (SEO).

### 13.3 Flows

- `check` → counterexample stimulus file → `run`: two-command reproduction of a model-checking violation.
- `repl` → recorded session → `test`: an interactive discovery becomes a regression test by saving a file.
- factories → vectors → `codegen --certify`: the conformance loop (§12.1).

### 13.4 Re-targeting the `feat_26-05-22_fsl-cli-config_631` branch

The branch's config-loader core (discovery, extends chains, schema, merge — its Tasks 1–11, committed) is infrastructure and **survives untouched**; the `registry:` section and the `config` verb are direct consumers. Its unfinished documentation/build tasks get rewritten against this verb vocabulary on the v6 integration branch; nothing is scrapped.

---

## 14. Implementation phasing

Slots between/after the sibling spec's phases (its Phase 1 = `var` declarations; Phase 2 = expressions):

| Phase | Needs | Delivers |
|---|---|---|
| **F1** | v6 Phase 1 | `factory` block with literal bindings + `seq()` + identity targets; `fsl`/`fslf` tags (+ `sm` deprecation); `Factory` API; seed tree + `derive()` with vectors; cursor semantics. *Factories are useful from here.* |
| **F2** | v6 Phase 2 | Full generator expressions; `rand()` bindings; `with()` type checking. |
| **F3** | F2, fsl#1348 coordination | `tape` alphabet declarations + `tape` write verb + pipeline slot + rollback semantics. |
| **F4** | F3 | System documents; registry + `use`; routes incl. observation sugar and `on action`; system output tapes; dispatch loop; `spawn`/`retire`; failure policy; `fss` tag. |
| **F5** | F4 | System factories (`fssf`; mostly free by symmetry); composition (systems as members, hierarchical dispatch, acyclicity enforcement); serialization of both; system `checkable` enforcement; CLI surface. |
| **F6** | F5 | Composed-system model checker: bound/contract/deliverability checking; system `invariant` + population aggregates; opt-in deadlock detection; executable counterexample traces. |

jssm-viz structural rendering (§11) is a parallel cross-repo track keyed to F4/F5.

**CLI verb phasing:** `lint`/`format`/`parse`/`config`/`init` are parser- or loader-only and can land early; `make`/`run` ride F1–F5; `check` rides F5/F6; `test` and `repl` follow `run`; `import`/`export`/`docs`/`diff` are independent tracks; `codegen`/`publish` are the long pole, gated on conformance certification (§12.1).

## 15. Future work (doors deliberately left open)

- **Bounded structural templating** — a parameter with a finite domain (`n_stages : int 1..8`) stamping out topology, TLA+-`CONSTANT`-style. The factory parameter syntax is designed so a template tier can adopt it; it is excluded here because it breaks "one text → one graph" (visualization, docs, compile model) and is a separable layer.
- **Tape writes from entry/exit positions** — v1 allows `tape` only as a transition clause; a future veneer (possibly spelled `emit`) could allow writes on state entry/exit, lowering to the same tape machinery with no new semantics.
- **Backpressure / bounded-queue analysis** — the queue-depth limit as an analyzed property rather than a guard.
- **Live/runtime visualization** — current-state heat, queue depth, population counts over time (§11); structural rendering is normative now, liveness is viz-side later.

---

## 16. Decision log

| # | Decision | Resolution |
|---|---|---|
| Surface | API-only vs language | **API + FSL grammar together**, v6 family, on the v6 integration line |
| Parameterization scope | values vs structure | **values + identity**; bounded structure = future work with the door open |
| Binding home | machine doc vs API vs separate file | **`factory` block in the document + API layering**; standalone factory files rejected (needs modules) |
| State model | pure vs stateful | **pure core `at(n)` + hidden-cursor `make()` sugar**; serializes as `{bindings, seed, cursor}` |
| Systems | in scope? | **full system factories in scope**; system = wired actors (collection + routing) |
| Wiring primitive | tapes vs observation vs streams | **tapes primitive + observation sugar**, one routing semantics underneath |
| Delivery | sync vs queued vs host-async | **run-to-completion, deterministic FIFO**; document/write/creation order; depth-limit guard |
| Name resolution | files vs registry | **registry core + `use` file sugar** |
| Seeding | host RNG vs derived | **single root seed; FSL-defined `derive()`; clock-at-root-only fallback, recorded** |
| Factory rand vs `checkable` | costs the flag? | **no** — construction-time randomness inside declared domains preserves `checkable` |
| Template tags | naming | **`fsl`/`fslf`/`fss`/`fssf`; `sm` deprecated synonym of `fsl`** |
| Failure policy | default | **`on_undeliverable: error`** (loud), `drop`/`dead_letter` opt-in |
| Composition | systems as members? | **in scope**: actions-in/tape-out contract; `on action` + system tapes; hierarchical run-to-completion to quiescence; acyclic, compile-enforced |
| Model checking | composed systems? | **in scope (F6)**: bound/contract/deliverability/system-invariant + opt-in deadlock; populations require `max`; counterexamples are executable stimulus traces |
| Visualization | system rendering? | **in scope, normative model**: nested clusters reusing the 5.143 group-cluster machinery; routes as inter-cluster edges; live rendering deferred |
| CLI vocabulary | which verbs | **17 built-ins** (§13.2): render make run check test repl lint format parse config import export codegen publish init docs diff; dispatcher/plugin architecture unchanged |
| Verb boundaries | render/export/codegen/import | **render=images, codegen=host source, import/export=tool interchange**; package fetching excluded from `import` |
| Conformance | how to test cross-host equivalence | **vectors as data** (document, seed, stimuli → canonical trace); thin per-host harness; T1/T2/T3 certification tiers declared by target plugins (fsl#1172); factory-generated vectors; differential mode |
| `publish` bundle | contents | **module + README + HTML/PNG/SVG renders**; README + HTML carry subtle attribution links to the FSL site and repo (SEO) |
