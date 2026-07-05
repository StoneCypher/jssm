# v11 — The Composable Machine (long form)

**Alias removal + strict (the batch).** *Manager:* `property`/`var` die (aliases since v6),
and TypeScript strict finally flips — last of its prerequisite cluster, batched at a major
where it belongs. *CS:* grammar drops aliases (edition-gated); tsconfig strict + the ~200
error burn-down (#712); manifest entries; `lint --future` warned since v6.

**Channels + emit + payloads.** *Manager:* Machines gain typed I/O ports: events carry data,
outputs are declared, and emission is transactional — rolled back with the step that caused
it. *CS:* `channel c : T;` declared alphabets (#1358); `on c(payload) ->` heads bind typed
payloads (#1348); `emit c <- expr` buffers in E, flushes at commit (C2 line 25); Mealy
(edge) + Moore (entry) emit points; rejection of undeclared events per alphabet mode.

**Sensors + time-as-sensor.** *Manager:* External readings become declared, typed, replayable
inputs — and time itself is just a sensor you inject, which is why whole systems can run on
one synthetic clock and replay perfectly. *CS:* `sensor s : T;` read-only, level-triggered;
reads recorded to tape at commit (input source-of-truth); time sources: default clock / tick
source w/ `.advance` / custom; declared abstract model (monotonic, discrete|dense) for the
checker; `time_between` guards (#1389/#1391) over the declared model.

**Named hooks.** *Manager:* The machine's dependency contract: callbacks it declares, the
caller must supply, typed like everything else. Returns are recorded so replay never re-fires
the world. *CS:* `hook f(a:T)->R [required];` call-position `call f(x)` / `assign y := call
f(x)`; effect boundary per §11 (pure-in-transaction / post-commit / idempotent-marked);
return recording format lands v13 (slot reserved) — v11 ships call semantics + live mode.

**Factories + seed tree.** *Manager:* Parameterized construction: a `required` val is an
unfilled parameter, the factory block fills it, and instance 42 of seed 1234 is a coordinate
— reproducible forever, parallelizable trivially. *CS:* one `factory{}` per doc; bindings
read earlier bindings; identity targets instance_name/machine_name/start_at/seed;
`seq()`/`rand(lo,hi)` builtins; `derive(u64,label)` = FNV-1a64+splitmix64 round, pinned w/
vectors + edit-stability policy (irreversibles #11); pure `at(n)` / cursor `make()` /
immutable-curry `with()`; UnboundParameterError lists all; serialize {source_hash, bindings-
as-text, seed, cursor}.

**Systems + dispatch.** *Manager:* Many machines in one document, wired by routes, fed by
factories, stepped deterministically — same seed, same stimuli, bit-identical run, even with
five hundred members. *CS:* `machine{}`/`system{}` blocks; registry + `import` (#1352); tags
fsl/fslf/fss/fssf (+`from` family); deterministic FIFO queued dispatch (doc-order routes,
write-order emissions, creation-order broadcast) + queue-depth bound; routes `on fact ->
target delivery`, observation sugar enters/exits/takes, `where` member selectors, `sender`
only context; populations `many X via factory count E max N` (max required for finite);
spawn/retire (indices never reused); `on_undeliverable: error|drop|dead_letter` (third
diagnostic tape); shared-clock `.advance` alternative; System API + Steppable/Serializable/
Renderable shared interfaces (wc auto-detects).

**Supervision + hierarchy + machine-vals.** *Manager:* Failure becomes policy: restart from
the factory coordinate, escalate up the containment tree, bound the thrash. Systems nest;
machines can own machines by value. *CS:* `on_member_error: escalate|restart|retire` +
restart-intensity windows; containment tree compile-enforced acyclic (wiring may cycle);
child dispatch to quiescence, emissions bubble; nested snapshots; `val m : machine T`
by-value embedding (parent-driven, journal nests, rich-tier like recursive ADTs); `dispatch:
fifo|fair` + quotas.

**Status + recovery + the rest.** *Manager:* Machines know they're done (halted/complete,
promise-resolvable), errors can route to recovery states, and the long-tail language items
land: units, windowed aggregates, weighted starts, spread. *CS:* status above state
(#621-concept/#458/#1341: running→halted + complete flag, `.halted()/.complete()`, promise);
`require X else -> S` / `on error where kind=K -> S`; §4.5 units (phantom dims + SI prelude,
zero runtime); `rate/count/avg(expr,N)` lower to N-slot rings (finite-eligible); weighted
`start_states` (μ₀, same LabelList rule); spread #453/#72/#142 w/ no-self; §24 system viz
(clusters, ×N badges, route edges, dead-letter sink); `make`/`repl` verbs; §16 doc-extraction
artifact + doc-comments emitted.
