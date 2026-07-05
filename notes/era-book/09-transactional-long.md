# v9 — The Transactional Machine (long form)

**mDT→val-record hook re-target (the breakage batch).** *Manager:* Hooks stop receiving the
opaque `.data()` blob and receive the typed val-record — the payoff of typing state. One
generated record type replaces ~210 generic instantiations; `.data()` stays as a deprecated
escape hatch. *CS:* hook payload = generated val-record interface (columnar view); mDT
defaults `unknown`; compat shim documented; manifest entry (this batch opens 9.0.0); 5.x
hook suites run against shim.

**assign + undo journal (#756).** *Manager:* Source-level mutation with crash-safe semantics:
writes apply immediately, a journal remembers old values, rollback is mechanical replay
backwards. Perf-envelope-policed because this touches every hot transition. *CS:* columnar
val register-file (typed-array numeric lanes, boxed others), compile-time slot indices, never
a Map; `J.push(slot,old)` per write, O(#writes), zero read-only cost; commit=discard;
slot-path assignment `a[i]:=`/`r.f:=`; `old` = journal-shadowed read; integer state IDs
(#1167) land with this (visited-sets → Uint arrays).

**The contract quartet.** *Manager:* `where` (may I?), `require` (caller must), `ensure`
(machine must), `invariant` (always at rest) — four distinct words with four distinct blame
assignments, each a runtime assert now and a proof obligation forever. *CS:* semantics per
C2 lines 12/16/23; violation ⇒ FAULT(contract_violation) + rollback; contract exprs
total/pure over vals/props/payload/`old`; compile-out under sealed/proven; NO inheritance;
diagnostics carry both blame-site and contract spans.

**Error model.** *Manager:* Failures become data: a sticky `last_error` you can guard on, an
error tape you can route to a supervisor, a host event carrying the repro bundle, and
designed error states distinct from crashes. *CS:* `last_error: option<Error>` (kind enum
div_by_zero/out_of_bounds/overflow/contract_violation/failed_narrow/microstep_bound),
monotonic error_count; error tape = regenerated class; `rollback` host event + pre-error
snapshot; `state X:{error;}` = failed_outputs local form → free `always not in(error)`
target; no `on rollback` handler ever.

**RTC per C2.** *Manager:* The reaction loop stops being folklore: the C2 appendix becomes
the implementation, and the trace schema names its steps. Deterministic by construction —
the only randomness is seeded. *CS:* implement MACROSTEP verbatim (selection tiers, FIFO
drain, eventless at quiescence, μ-bound fault, invariant-then-commit, at-stable/post-commit
points); before-macrostep/at-stable/post-commit hook surfaces; audit deltas from current
transition_impl filed as bugs first.

**Hook registry + introspection.** *Manager:* Twenty-five ad-hoc hook pairs become one
generated registry keyed by (event-kind, target, phase) — and machines can finally answer
"is this hooked?", un-stubbing the viz styling. *CS:* registry table generated; observers
pure (no veto/mutate — vetoing lives in source contracts now); `has_hook/hooks_on(state|
edge|action)`; closes the fsl on_*-grammar cluster (SUP per ledger) + #1251/#1158/#434;
`hooks: closed` enforced against declarations (#617 → Closes via landing PR).

**Safety checking + M1 + M4-subset.** *Manager:* The first proofs: reachability and
invariant checking over the typed machine, `fsl check` emitting certificate records bound to
the canonical hash — unsigned now, the trust economy's substrate later. *CS:* BFS/product
enumeration over control×bounded-val domains (small-finite band only; budgets +
`undecided` + `--estimate` cheap bound); certificate = {source_hash, properties,
checker_version, tier, result} canonically serialized (irreversibles #15);
M4 predicates reached_state/in_config/is_legal_run/never_entered over M3 runs; M2 attempts
here (keyless sign), slips to v14 freely.
