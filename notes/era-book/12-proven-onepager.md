# v12 — The Proven Machine (one page)

**Mission:** the proofs arrive. FSL's moat becomes real: not "nice FSM syntax" but machines
whose properties are proven or refuted with replayable counterexample tapes.

**Headline gate:** the **automata-ladder decision record** (megaspec §3 four rungs vs the
registry-close Gemini push-up) — nothing claims `pushdown`/`petri` checkability until it
exists; `tree` and any admitted rungs implement per the verdict (#492).

**Contents (~38):** the temporal property language (#1360) fronted by the **Dwyer pattern
prelude** (response/precedence/absence/universality/existence × scopes; `lint
--suggest-properties`); checker **backends** — `check --via nuxmv/spin/storm` with
differential agreement, `export --target tla+/alloy/smv/promela`; PCTL/probabilistic tier;
past operators; `settles_within(k)`; **F6 composed checking** (bound safety, lifted
contracts, deliverability, system invariants over count/all/any/sum, opt-in deadlock);
**assume-guarantee** composition; flow contracts (`disallow flow a -> b`); SLO contracts
(design-time half); the **testing toolkit** — in-language `test`/`expect`, tests-are-tapes
promotion, MBT (machine-as-oracle), statistical MC with shrinking, FSM-shaped coverage
(guard MC-DC), concolic `walk --reach`; `diff --behavioral` + refinement certificates (+ the
free theorem: old tapes replay on refining upgrades); `minimize`; **M2 signing lands by here
at the latest** → `--emit-certificate` signed; `check --witness`/full budgets; the lsp
live-verification daemon; the `mcp` verb + time-travel tools; certified stdlib first parts.

**Exit:** `check` proves or refutes with a tape on every finite machine in the corpus;
counterexample → `run` is a two-command reproduction; certificates verify in CI without
re-checking.

**Hazards:** never build the world-class checker in-house — backends are the artillery;
`undecided` is a first-class answer from day one; vacuous properties are the classic trap
(vacuity checks before bragging).

**Milestone:** fsl #55. **Sources:** eras-2-to-7 brief (era 3); W8.1–.23; megaspec §17/§23.
