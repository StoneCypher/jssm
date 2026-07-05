# v12 — The Proven Machine (long form)

**The ladder decision record (gate).** *Manager:* Settle, once, which automata rungs the
checkable band honestly claims — the recorded conflict between the megaspec's four rungs and
the formal review's push-up. Nothing ships pushdown/petri claims before this exists. *CS:*
decision record weighing: NPDA equivalence undecidable (our PDAs are nondeterministic via
rand/hooks) ⇒ VPA-only pushdown?; petri = coverability/boundedness only (reachability
Ackermann); tree = finite-carrier recognizers + transducers (#492); verdict updates megaspec
§3 + this era's scope.

**Temporal language + Dwyer prelude.** *Manager:* Users pick patterns and fill holes —
response, precedence, absence, universality, existence, with scopes — instead of writing raw
LTL wrong. The catalog covered ~92% of real-world specs; raw logic stays as escape hatch.
*CS:* `property p = pattern(args) [scope];` grammar; lowering: safety→reachability product,
liveness→Büchi + lasso search; past ops (once/since) for tape monitoring; bounded `within N`;
`settles_within(k)` via bounded exploration; `lint --suggest-properties` structural mapper;
counterexample = tape (finite or lasso prefix+cycle).

**Backends + bridges.** *Manager:* We don't build a world-class model checker; we compile to
three of them and require agreement — and the same lowerings double as bridges for
formal-methods researchers to study FSL in their own tools. *CS:* `check --via
nuxmv|spin|storm` lowerings (SMV/Promela/PRISM) from the IR; differential verdict-agreement
harness; `export --target tla+|alloy|smv|promela`; PCTL via Storm (`P>=x [...]`,
expected-cost); budgets/`undecided` first-class across all.

**F6 composed checking + assume-guarantee.** *Manager:* Systems verify without the product
blow-up: each member proves its interface contract once, the system composes contracts. The
500-customer park becomes one proof plus an argument. *CS:* finite-system = members finite +
population max + queue bound (compiler-enforced); checks: bound safety, lifted contracts,
deliverability, `invariant` over count/all/any/sum, opt-in deadlock; A/G: member interface
contracts (assumes/guarantees) + composition argument, session-typed wiring checks from
interfaces; flow contracts `disallow flow a->b` = taint-product reachability; SLO contracts
= PCTL in contract position (design half).

**The testing toolkit.** *Manager:* Tests, fuzzing, and proofs become one continuum: a unit
test can be a model-check, a shrunk fuzz failure becomes a permanent tape, and the machine
itself is the oracle for testing real systems. *CS:* in-language `test`/`expect`
(reaches/blocked/invariant-holds/temporal/IO-relation/replay-equivalence/coverage), codegen-
exported; tests-are-tapes promotion; statistical MC (walks + confidence + shrinking +
coverage-guided + adversarial); concolic `walk --reach` (SMT-steered); MBT: vals=shadow
state, contracts=pre/post, named hooks=real ops; coverage = state/transition/path/guard
MC-DC; vacuity checks standard.

**Evolution tooling + M2.** *Manager:* Upgrades get proofs: `diff --behavioral` shows v2
simulates v1, refinement certificates make it portable, old test tapes carry forward free —
and certificates get signatures at last. *CS:* simulation preorder over old alphabet
(decidable finite); refinement certs {v1_hash, v2_hash, verdict}; free theorem: v1 tapes
replay on v2 by the simulation map; `minimize` = Paige–Tarjan bisimulation quotient; M2
keyless signing lands by here → `--emit-certificate` signed; `check --witness` coverage
facts; lsp check-daemon (incremental, hash-keyed, budgeted squiggles); `mcp` verb +
time-travel tools (state_at/why_rejected/val_history/diverges_from); certified stdlib first
parts (debounce/retry/breaker/limiter/saga/turnstile) with interface cards.
