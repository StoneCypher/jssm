# Operational Semantics of the Macrostep — Appendix (C2)

> **Status:** draft-normative (Fable, 2026-07-04) — the §29-committed appendix; every rule
> cites its megaspec §28 decision. Two implementations executing this text on the same tape
> MUST produce identical traces; the C4 trace schema derives its events from these steps.

## State

- `S` current control configuration (state; later: group memberships)
- `V` val register-file (columnar; §28 storage row) · `J` undo journal: list of (slot, old)
- `Qi` internal-event FIFO · `E` in-flight emit buffer · `T` input tape (append at commit)
- `μ` microstep counter · `B` microstep bound (default 100_000; §13)

## MACROSTEP(external stimulus x)   [one run-to-completion reaction; §12/§28 RTC row]

```
 1  fire hooks[before-macrostep]                       # observers only, no veto (§12)
 2  μ := 0; J := []; E := []; assert Qi empty at entry
 3  ev := x
 4  loop:                                              # the microstep cascade
 5    C := enabled_transitions(S, ev)                  # see SELECTION below
 6    if C = ∅ and ev is external:  goto REJECTED
 7    if C = ∅ and ev is internal:  drop ev            # internal events may fizzle
 8    else:
 9      t := first(C)                                  # deterministic; see SELECTION
10      μ += 1; if μ > B: FAULT(microstep_bound)       # → ROLLBACK (§13)
11      fire hooks[exit(S.from(t))]                    # exit before obligations (§12 pipeline)
12      if ¬require(t):  FAULT(contract_violation)     # caller obligation (§10)
13      run action-hooks(t); for each assign w in t:
14         J.push(slot(w), V[slot(w)]); V[slot(w)] := eval(w)   # immediate write + undo log
15         (any eval fault — div0/OOB/overflow/failed-narrow — ⇒ FAULT)   # (§11)
16      if ¬ensure(t) [old = J-shadowed values]: FAULT(contract_violation)
17      fire hooks[entry(S.to(t))]
18      S := S.to(t); E ++= emits(t)                   # emits buffered, transactional (§14)
19      Qi ++= raised(t)                               # raise/send enqueue FIFO (§12 SCXML)
20    if Qi nonempty: ev := Qi.pop(); goto 4           # internal drains before next external
21    if ∃ eventless transition enabled at S: ev := ε; goto 4
22    # quiescent ⇒ STABLE (§12: the single point everything keys off)
23  for each invariant I: if ¬I(V,S): FAULT(invariant) # checked only at stable (§10)
24  COMMIT: discard J                                  # writes were immediate; commit = forget
25          flush E to output/log channels; append (x, sensor-reads) to T   # §14 tape classes
26  fire hooks[at-stable] then hooks[post-commit]      # new RTC hook points (§12)
27  observers / serialization now see (S, V)           # never mid-macrostep
    return ACCEPTED

REJECTED: fire hooks[rejection]; per-state override first, else machine-wide (§12); T records
          the fed-but-rejected stimulus (input tape = events fed, incl. no-ops; M3 §5). return.

FAULT(k): reverse-replay J (restore every old value, reverse order); discard E;
          set last_error := {kind: k, …}; error_count += 1; emit error-tape record;
          fire host 'rollback' event w/ pre-error snapshot (§11).
          External hook side effects already performed are NOT unwound (§11 effect boundary);
          no `on rollback` handler exists (atomicity; §11). return FAULTED.
```

## SELECTION — enabled_transitions(S, ev), fully deterministic (§28 RTC + multigraph rows)

1. Candidate order by *kind*: specific-action match > wildcard-action `'*'` > unlabeled >
   wildcard-source `* ->`; rejection only if all empty.
2. Within a kind: explicit priority first, then **document order** as tiebreak.
3. A candidate is enabled iff its `where` guard (pure, total; §10) evaluates true.
4. Probabilistic targets: roll via the machine's seeded stream (§15) — the ONLY sanctioned
   nondeterminism, and it is seed-deterministic; weighted lists normalize per §28.

## Hook timing (normative order within one microstep)

exit → require → action-hooks/assigns (journaled) → ensure(old) → entry → raise/emit-buffer.
Macrostep-level: before-macrostep … [microsteps] … invariants → commit → at-stable →
post-commit. Observational hooks are pure observers — no veto, no mutation (§12).

## Explicitly pinned (the cross-host divergence killers)

- Assigns are **immediate** with undo-log; commit discards, never replays (§28 journal row).
- Internal FIFO order is arrival order; internal drains fully before the next external.
- `old` = value at macrostep entry for slots journaled this macrostep, else current.
- Sensor reads inside guards/assigns are recorded to T at commit (replay source of truth, §14).
- Iteration order anywhere semantics-visible = declaration/document order, never host map order.

## Deferred to their eras (named, not silent)

Group boundary-hook ordering on multi-group crossings (v8, with §19); queued system dispatch
(v11, §22.3 — this appendix is the per-machine inner loop it invokes); machine status
halted/complete (v11); recorded hook-return consumption during replay (v13, irreversibles #4).
