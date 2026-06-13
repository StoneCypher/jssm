# The Execution Model: Macrostep, Microstep, Stable

This is the keystone of FSL's runtime semantics, and it pays to learn it before
anything else in this part of the manual.  Almost everything else keys off one
word in it — **stable** — so getting the model clear up front saves a lot of
confusion later.

There are three nested units of execution:

- a **macrostep** is one external stimulus run to completion — you fed the
  machine an event, and the machine churns until it settles;
- a **microstep** is one fired transition — a single edge taken;
- **stable** is the quiescent configuration: the point where *no transition is
  enabled* and the machine is, for now, done reacting.

One macrostep is made of one or more microsteps, ending at a stable
configuration.



&nbsp;

&nbsp;

## Why "stable" is the word that matters

Stable is not a cosmetic milestone; it is the point at which the machine's
promises come due.  All of the following happen **at stable**, never mid-cascade:

- **invariant checks** run (an invariant is an *always-at-stable* promise, not
  an *always-at-every-microstep* one);
- **val commits** land (writes are journaled during the macrostep and committed
  as a unit at stable);
- **journal rollback** is keyed to it (if something faults before stable, the
  whole macrostep can be undone atomically);
- **post-macrostep hooks**, observers, and **serialization** fire here;
- **the tape** records the macrostep here.

So when you read "at stable" anywhere else in the manual, this is the moment
being referenced.  An invariant that is briefly violated in the middle of a
multi-microstep cascade and restored before quiescence has *not* been violated —
the contract is about the stable configuration, by design.  That is what makes
run-to-completion sane.



&nbsp;

&nbsp;

## The pipeline of a single macrostep

When a stimulus arrives, a macrostep runs through a fixed pipeline.  Knowing the
order tells you exactly when your `require`, `assign`, `ensure`, and `entry`
code runs relative to everything else:

```
before-macrostep hook
  │
  ▼
fire a transition:
    exit   (leaving the old state)
    require  (caller obligation — checked first)
    assign   (the val writes, sequential)
    ensure   (machine obligation — checked after the writes)
    entry  (entering the new state)
    raise  (any events the transition raises)
  │
  ▼
cascade: keep firing eventless / internal transitions
         until none are enabled
  │
  ▼
STABLE:
    check invariants
    commit vals
    at-stable hook / post-commit hook
```

A few rules govern that cascade:

- **Microstep order is deterministic.**  When more than one transition could
  fire, FSL resolves by **priority, then document order**.  The only source of
  nondeterminism is an explicit, *seeded* `probabilistic` edge — and because the
  seed is recorded, even that replays identically.
- **Internal before external.**  Internally raised events are processed before
  external ones (SCXML-style FIFO), so a transition that raises an event sees
  that event handled before the next stimulus from outside.
- **The microstep bound is a safety net.**  An eventless cascade that never
  settles would hang the machine; instead, a runaway cascade faults at the
  **microstep bound** (default 100,000 per reaction).  If your machine "randomly
  freezes," suspect an eventless loop with no exit guard.



&nbsp;

&nbsp;

## A worked cascade

Consider a guest in a queue whose patience can run out *as a side effect* of
boarding logic:

```fsl
Queuing 'board' -> Riding  where patience > 0;
Queuing         -> StormedOff  where patience <= 0;   // eventless + guard

val patience : int 0..100 default 50;
```

Feed it `'board'` when `patience` is `0`:

1. **macrostep begins** on the `'board'` stimulus;
2. the labelled `'board'` edge is *not enabled* — its guard `patience > 0` is
   false — so it does not fire;
3. the **eventless** edge to `StormedOff` *is* enabled (`patience <= 0`), so it
   fires as a microstep;
4. no further transition is enabled — the machine reaches **stable** in
   `StormedOff`;
5. invariants are checked, vals commit, the at-stable hook fires, the tape
   records the macrostep.

The reader who internalizes this stops being surprised by "why did my invariant
not catch the intermediate value" and "why did the entry hook run after my
assign" — both answers are just *this pipeline*.



&nbsp;

&nbsp;

## What you can rely on

- **Same input, same run.**  Given the same starting configuration, the same
  stimuli, and the same seed, a macrostep produces a bit-identical result —
  microstep order included.  This is what makes {@page VerifiabilityTiers.md
  verification} and replay possible.
- **Quiescence is provable.**  For a `finite` machine, the verifier can *prove*
  that every macrostep terminates at a stable configuration — that the cascade
  always settles.  `settles_within(N)` lets you assert a *bound* on how many
  microsteps that takes.



&nbsp;

&nbsp;

## See also

- {@page GuardsAndContracts.md Guards and contracts} — where `require`,
  `ensure`, and `invariant` fit in the pipeline above.
- {@page VerifiabilityTiers.md The verifiability tiers} — what "the verifier can
  prove quiescence" actually requires.
- {@page WhatIsFslNow.md What FSL is now} — the `prop`/`val`/`sensor` data model
  the pipeline reads and writes.
