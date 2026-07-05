# Spec Work-Item Register — the corpus at issue granularity

> **AMENDED 2026-07-04 (five-way split; canonical v6→v16): W-IDs ARE STABLE — do not renumber.**
> Version translation: W6.* items split across majors v6–v10 (foundations→v6; scalars/expr/
> strings/where→v7; containers/data/streams/fn-slots/groups/graph→v8; mutation/contracts/error/
> RTC/hooks/safety/M-track→v9; conformance/N=2/format/tooling→v10 — per the era-1 wave→major
> note). W7.*→v11, W8.*→v12, W9.*→v13, W10.*→v14, W11.*→v15, W12.*→v16.
> **Status:** stable · **Author:** Claude Fable 5 · **Date:** 2026-07-04
> **Purpose:** every discrete buildable item in the v6 spec corpus, as trackable work items —
> the spec-side twin of the `dispositions/` ledgers, at equal-or-finer granularity than issues.
> **How executors consume this:** at era activation, items for that era go into an
> `issues-projection.md` revision (cadence policy, HANDOFF) and are filed to fsl with the item
> ID in the body; items tagged `(=fsl#N)` ALREADY have an issue — tag/retitle that issue, never
> double-file. Each item's authority is its §ref — the issue body is "implement §X per item
> W#.##" plus acceptance notes. Every item inherits the standing rules: TDD, stoch+dragon
> where grammar-touching, a C4 vector per normative feature, irreversibles-at-first-touch.
> **ID scheme:** W<major>.<n>. Coverage claim: exhaustive over megaspec normative core +
> committed rings at cluster grain; ring batches for v9–v12 are itemized at feature grain.

## v6 — the 6.x series (era 1; 6.0.0 items live in the era-0 brief, not here)

**Types & values (§4)**
- W6.1 int=s53 semantics + literals (hex/bin/oct, suffixes 7f/7L/7i32/7u8)
- W6.2 sized ints int8..256/uint8..256; W6.3 longint; W6.4 float/double + IEEE + isnan/isinf/isfinite
- W6.5 decimal(p,s) + rounding modes (banker's default)
- W6.6 bounded scalar ranges (int 0..3 etc.); W6.7 promotion rules; W6.8 overflow=error + opt-in saturating
- W6.9 string codepoint model + bounded len; W6.10 bytearray + [< >] literal; W6.11 enum(...)
- W6.12 null/undefined JS-distinct, no-arithmetic; W6.13 tuple; W6.14 array+len bounds
- W6.15 set #[...]; W6.16 bag #(...) (petri store, monotone ops); W6.17 map #{} keys num/str
- W6.18 record {}; W6.19 object-removal guard (compile error + message)
- W6.20 ADT declarations + payloads; W6.21 recursive-ADT rich-gate
- W6.22 option<T>; W6.23 any + sound-narrow-only via case; W6.24 type aliases; W6.25 T? nullability
- W6.26 fn types uncurried, inline vs first-class; W6.27 defunctionalization tag = normalized-AST
  hash (spec the normalization — irreversibles #12); W6.28 intensional equality
- W6.29 function-typed prop (State pattern, per-state pin); W6.30 function-typed val (strategy)
- W6.31 stream type: construction/draw/serialize/finite-eligibility (§4.6)

**Expressions (§6) & totality (§13)**
- W6.32 arithmetic + div/mod/rem (Erlang div); W6.33 comparisons, cross-type error, total compare
- W6.34 boolean zoo incl. nand/xor/implies + andalso/orelse; W6.35 `in` membership
- W6.36 bitwise on sized ints only; W6.37 `++`, `|>`; W6.38 precedence table (grammar-pinned)
- W6.39 if/then/else expr; W6.40 let-in; W6.41 case: full patterns, when, exhaustiveness+else
- W6.42 forall/exists bounded quantifiers
- W6.43 container protocol: bracket-throws, get→option, HOFs (map/filter/foldl/foldr/all/any/find/count/sort/flat_map), no foreach
- W6.44 by-value capture + acyclic-data enforcement; W6.45 microstep bound (100k default, config)

**Stdlib (§7) & strings (§8)**
- W6.46 rounding/clamp/lerp family; W6.47 exp/log family; W6.48 trig degrees-default + rad
- W6.49 gcd/lcm/factorial/comb/perm; W6.50 popcount/clz/ctz/rotl/rotr; W6.51 stats family
- W6.52 rand family + optional stream arg + finite over-approximation
- W6.53 math constants + per-type MIN/MAX/EPSILON
- W6.54 encoding: base64/base64url/hex/percent; W6.55 pinned hash builtin (algorithm in vectors)
- W6.56 zstd+lz4, pinned encoder, url-safe compose
- W6.57 string ops portable set + negative indexing + grapheme `+` + byte view
- W6.58 normalize/case pinned to shipped Unicode; W6.59 `unicode: N` attribute + finite hard-match

**Mutation, contracts, errors (§9–§11)**
- W6.60 assign whole+slot, sequential, `old` (=carrier fsl#1355-adjacent; assign itself unfiled)
- W6.61 where guards; W6.62 require; W6.63 ensure+old; W6.64 invariant-at-stable (=fsl#1355)
- W6.65 violation model: obligation + debug assert + compile-out under sealed/proven
- W6.66 last_error/error_count + Error.kind enum; W6.67 error tape (regenerated class)
- W6.68 rollback event on the bus + pre-error snapshot payload
- W6.69 undo-journal rollback implementation (with #756); W6.70 error states `state X:{error;}`

**RTC & hooks (§12)**
- W6.71 macrostep pipeline implementation per C2 appendix (=fsl#1345)
- W6.72 priority + doc-order selection; W6.73 internal-event FIFO drain
- W6.74 before-macrostep/at-stable/post-commit hook points; W6.75 named handlers (`handler h = {…}`)
- W6.76 source lifecycle hooks construct/destruct/entry/exit/rejection/any-transition/any-action (=fsl#1357)
- W6.77 uniform observational registry (kind,target,phase); W6.78 introspection has_hook/hooks_on (=fsl#1251/#1158/#434)
- W6.79 machine `hooks: closed` enforcement via declarations (=fsl#617/#645)

**Groups & graph (§19, §28)**
- W6.80 `&group:[...]` first-class groups, overlap+nest, DAG check; W6.81 nest `&c` vs spread `...&c`
- W6.82 boundary hooks; W6.83 membership queries in(&g)/groupsOf/statesIn
- W6.84 group config blocks + unified cascade + transition:{}/graph:{} (=fsl#114 lineage)
- W6.85 per-group history; W6.86 repeat-state merge + same-tier conflict errors (=fsl#454, resolved-in-spec)
- W6.87 multigraph action-name rule + ≤1 unlabeled edge; W6.88 wildcard source `*->` (=fsl#1356) + wildcard action
- W6.89 resolution order specific>wildcard-action>unlabeled>wildcard-source>rejection
- W6.90 eventless + else transitions (=fsl#1350); W6.91 arranged/arranged-start/arranged-end sugar (=fsl#618)
- W6.92 val/prop grammar for kinds cluster follows #909 spec (=fsl#1256/#1257 — needs spec first)

**Replay, editions, safety checking, trust plumbing (§15, §17-safety, M-track)**
- W6.93 version-gating on deserialize (loud override) (=fsl#1057/#1056/#1017)
- W6.94 editions + feature-gates mechanism + `lint --future`
- W6.95 native safety checker: reachability + invariants + error-state targets
- W6.96 M1 `check` verb + unsigned certificate record (irreversibles #15)
- W6.97 M4-subset predicates over runs; W6.98 budget/--estimate/undecided basic tri-state
- W6.99 C1 canonical hash (era-1 WP-1.1); W6.100 seeded-walk reproducibility surface (seed in serialization)

**CLI & tooling (§25 early tier)**
- W6.101 lint verb; W6.102 format verb + CST + idempotence law (=fsl#134/jssm792 twins)
- W6.103 parse --json (AST/locations); W6.104 explain + error-code registry (projection B6)
- W6.105 list verb; W6.106 typegen TS; W6.107 inspect (bundle reader)
- W6.108 grammar export gbnf/lark/ebnf (rides the dual); W6.109 minifier family (=fsl#190/#199 cluster)
- W6.110 SVG id/class/::part completion + live current-state (=fsl#315 verify + themes cluster)
- W6.111 doc-comment syntax (/// or doc "") — grammar only, extraction is v7

## v7 — Society (era 2)

- W7.1 sensor wiring live (§14) ; W7.2 typed channels + declarations (=fsl#1348 payloads, #1358 alphabet)
- W7.3 emit-in-transaction; W7.4 `on chan(payload)` heads; W7.5 Mealy+Moore emit points
- W7.6 named hooks: declaration/required/call-position semantics (recording slot is v9)
- W7.7 time-as-sensor + tick source + abstract time model (=fsl#1349, #1391/#1389 time_between)
- W7.8 tokenized_by composition; W7.9 tape wiring: input ring retention, output/log/error regeneration (=fsl#450/#457/#913/#912)
- W7.10 first-class tape values; W7.11 machine blocks + wire + import/registry (=fsl#1352)
- W7.12 fsl/fslf/fss/fssf tags + from() family (sm deprecated synonym)
- W7.13 System type, delegated API, Steppable/Serializable/Renderable
- W7.14 shared-clock stepping + .advance; W7.15 queued dispatch + depth bound
- W7.16 routes: facts/targets/where-selectors/sender; W7.17 populations many/count/max
- W7.18 spawn/retire; W7.19 on_undeliverable + dead-letter tape; W7.20 supervision + restart intensity
- W7.21 dispatch fairness + quotas; W7.22 hierarchy, containment-acyclic enforcement
- W7.23 system serialization (recursive snapshot); W7.24 factory block + bindings + identity targets (=fsl#413/#430/#431/#443/#459)
- W7.25 seed tree derive() pinned + vectors + edit-stability policy (irreversibles #11)
- W7.26 at/make/with + UnboundParameterError + Factory serialize contract
- W7.27 machine-typed vals (embedding) (=fsl#160/#235 lineage); W7.28 §24 system viz (clusters/badges/route edges)
- W7.29 machine status halted/complete + termination promise (=fsl#621-concept/#458/#1341)
- W7.30 statechart set per decision: history #1340, final #1341, fork/join #1342, in-state #1343, internal #1344, deferred #1347, raise/send #1346, activities #1351
- W7.31 error-recovery transitions (`require X else ->`, on error routing)
- W7.32 units §4.5 + SI prelude; W7.33 windowed aggregates; W7.34 weighted start states (=fsl#414)
- W7.35 state spread + no-self (=fsl#453/#72/#142); W7.36 repl + make verbs; W7.37 docs-extraction artifact (§16 fifth artifact)

## v8 — Proofs (era 3)

- W8.1 THE ladder decision record (projection B1) then rung implementations per verdict (=fsl#492 tree)
- W8.2 temporal property language + Dwyer prelude + scopes (=fsl#1360)
- W8.3 backend lowerings --via nuxmv/spin/storm + backend agreement tests
- W8.4 export --target tla+/alloy/smv/promela; W8.5 PCTL/probabilistic tier; W8.6 past operators
- W8.7 settles_within(k); W8.8 statistical MC: walks, confidence, shrinking, coverage-guided, adversarial, concolic (=fsl#485/#497/#1244–#1249)
- W8.9 in-language test/expect blocks + assertion vocabulary; W8.10 tests-are-tapes promotion flow
- W8.11 MBT harness (machine-as-oracle) (=fsl#622-jssm-twin); W8.12 FSM-shaped coverage incl. guard MC-DC
- W8.13 F6 composed checking: bounds/lifted contracts/deliverability/aggregates/opt-in deadlock
- W8.14 assume-guarantee composition; W8.15 flow contracts (disallow flow a->b)
- W8.16 SLO contracts design-time half; W8.17 diff --behavioral + refinement certificates + free-theorem tape reuse
- W8.18 minimize (bisimulation quotient); W8.19 M2 signing at the latest here + --emit-certificate signed
- W8.20 check --witness/--estimate full; W8.21 lsp live-verification daemon; W8.22 mcp verb + time-travel debugging tools
- W8.23 certified stdlib first parts (debounce/retry/breaker/limiter/saga/turnstile)

## v9 — Survival (era 4) — items subject to its PROCESS run

- W9.1 persistence contract + resume-after-crash (=fsl-twin of jssm#813)
- W9.2 recorded hook returns + determinism ledger (irreversibles #4 slot)
- W9.3 migrates-from + verifier-checked lifting; W9.4 hot member upgrade; W9.5 canary factories
- W9.6 OTel flight-recorder mapping + one-call bundle export; W9.7 behavioral drift detection
- W9.8 calibrate verb; W9.9 run --amend counterfactual; W9.10 inspect --redact + redaction map proof
- W9.11 bug verb + CI auto-replay; W9.12 doctor verb; W9.13 5.x snapshot-lift decision (omissions D9)
- W9.14 §29 security/effects appendix (with era-5 review input)

## v10 — Trust (era 5) — items subject to its security review

- W10.1 sigstore-keyless signing; W10.2 transparency log + equivocation mitigation (witness/gossip)
- W10.3 revocation + advisory feed format; W10.4 verify verb full chain (M5)
- W10.5 receipts replayed slice (M6); W10.6 hosted + witnessed tiers + provenance tape ext
- W10.7 holder-key layer C + presentation challenge; W10.8 trusted event time
- W10.9 fsl.lock schema + sweeps; W10.10 registry entry format finalized

## v11 — Fleet (era 6)

- W11.1 host ABI finalized (incl. era-4 durability surface); W11.2 per-host runtimes (Python, C, …
  beyond the v6 Rust); W11.3 codegen targets native + adapters w/ golden traces (=fsl#563–#577, #456, #472, #530, #1270)
- W11.4 T2/T3 certification + differential fleet CI (=fsl-twin jssm#815); W11.5 typegen fleet-wide
- W11.6 package-name attributes + manifests; W11.7 capability negotiation (=fsl#1172/#1173)
- W11.8 WASM toolchain productized; W11.9 pinned-unicode cross-host; W11.10 publish + --certify (=fsl#407)

## v12 — Ecosystem (era 7)

- W12.1 registry loop-first vertical (registry-close option B); W12.2 behavioral/typeclass search
- W12.3 guardrails product (mcp --policy); W12.4 query fleet governance; W12.5 semantic patches
- W12.6 infer (aspirational); W12.7 synth (aspirational); W12.8 curriculum + eval corpus at scale
- W12.9 machines.txt + package exposure (=fsl-twins jssm#778/#610); W12.10 distribution program
  (the migrated jssm#831–#869 block — already itemized in the drain ledger)
