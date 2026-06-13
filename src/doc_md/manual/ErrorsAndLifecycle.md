# Errors, Lifecycle, and Hooks

Two things every real machine needs: a story for **when things go wrong**, and a
story for **the events around a machine's life** — construction, entry, exit,
destruction.  FSL keeps these deliberately structured, because both are places
where ad-hoc handling quietly destroys verifiability.



&nbsp;

&nbsp;

## The error model — three surfaces, kept apart

FSL exposes errors on three distinct surfaces, and the discipline is to know
which one you're touching:

1. **In-machine state.**  `last_error` is an `option<Error>` that is **sticky**
   (it stays set until cleared), paired with `error_count`.  This is the
   machine's own memory of what went wrong, readable from guards and
   expressions.
2. **The in-language error tape.**  Errors compose onto a dedicated **`error`
   tape**, separate from the main output tape.  Like all non-input tapes it
   isn't retained — you regenerate it by replaying the input — but during a run
   it's a first-class, composable stream.
3. **The host-side rollback event.**  A `rollback` **event** fires on the host
   side carrying the **pre-error snapshot**, so the surrounding system can react
   to a fault atomically.

```fsl
// behavioral error recovery, in the source itself
Charging 'submit' -> Confirmed
    require funds_available else -> Declined;   // recovery transition

Working 'tick' -> Working on error -> Failed;   // catch-all recovery edge
```

Two design decisions are load-bearing:

- **Rollback is atomic, then notifies.**  The machine reverts to the pre-error
  snapshot as a unit *and then* tells you.  Critically, there is **no `on
  rollback` handler** — letting source code run *during* a rollback would break
  its atomicity, so it's simply not allowed.
- **Domain error states are not runtime faults.**  A state tagged `{ error; }`
  is a *modeled* failure — a place the machine can legitimately *be* (the local
  form of "failed outputs"), and a free target for the checker.  That's
  different from a runtime fault, and the manual keeps the two ideas separate.

```fsl
state StormedOff: { error; };     // a domain failure state — a checker target,
                                  // NOT a runtime exception
```



&nbsp;

&nbsp;

## Lifecycle — the source-level hooks

A small, curated set of lifecycle events deserve to live in the *source* (they
define what the machine *is*, not merely observe it):

- `on construct` / `on destruct` — the machine's birth and death;
- `on entry` / `on exit` — per-state, as you arrive and leave;
- `on rejection` — when a transition is refused;
- `on any transition` / `on any action` — catch-alls.

Beyond those, **named handlers** are reusable internal effect blocks you can
invoke from multiple transitions — DRY for repeated effects.



&nbsp;

&nbsp;

## Behavioral vs observational — the split that keeps proofs clean

The single most important idea here: FSL draws a hard line between **behavioral**
and **observational**.

- **Behavioral** (source) code *defines* what the machine is — `assign`,
  `where`, entry/exit, handlers.  It's part of the machine and the verifier
  reasons about it.
- **Observational** (hooks) code merely *watches* — it's a pure observer and
  must not change the machine's behavior.

This is why, of the ~25 runtime hook points, only about **four lifecycle events**
were deemed worthy of *source* representation.  The rest are observers, supplied
by the caller, and stay out of the machine's definition.  A **named hook** is a
caller-provided callback the machine `call`s — optionally `required`, which turns
it into a *dependency contract* the host must satisfy.

```fsl
on construct { /* init effect — part of the machine */ }
on entry Riding { /* arrival effect */ }

hook log : required;          // caller MUST provide this — a dependency contract
```



&nbsp;

&nbsp;

## New macrostep-level hook points

Run-to-completion (see {@page ExecutionModel.md the execution model}) introduced
boundary points that didn't exist when hooks were per-transition:

- **`before-macrostep`** — fires once as a stimulus begins, before any
  transition;
- **`at-stable`** — fires when the cascade settles;
- **`post-commit`** — fires after vals are committed at stable.

These are the run-to-completion boundary hooks; they're where you observe a
*whole reaction* rather than a single edge.



&nbsp;

&nbsp;

## Gotchas

- **Observational hooks are pure observers** — if a hook changes what the
  machine does, you've broken the behavioral/observational contract and
  invalidated reasoning that depends on it.
- **Introspection is currently stubbed** — `has_hook` / `hooks_on` exist but are
  not yet fully wired; don't build logic on them yet.
- **A `require ... else -> S` is recovery, not suppression** — the error is
  still real and recorded; you've just given the machine a modeled place to go.



&nbsp;

&nbsp;

## See also

- {@page ExecutionModel.md The execution model} — where `entry`, `exit`,
  `require`, and `ensure` run in the macrostep pipeline, and what the
  macrostep-level hooks observe.
- {@page GuardsAndContracts.md Guards and contracts} — `require ... else` is the
  recovery form of the caller-obligation contract.
- {@page WhatIsFslNow.md What FSL is now} — the behavioral/observational split,
  stated as a cross-cutting principle.
