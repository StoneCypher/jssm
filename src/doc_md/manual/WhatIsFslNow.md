# What FSL Is Now

If you've used FSL before, you knew it as a small, sharp language for finite
state machines: states, transitions, actions, hooks.  That FSL is still here,
and the light switch still fits on one line.  But FSL has grown a second and a
third identity, and it's worth setting expectations before you start: **this is a
major-version leap.**

FSL is now three things at once, stacked on top of the state machine you already
know:

- a **state machine** — *where you are* (the classic core);
- a **typed data machine** — *how you got there* (extended state that travels
  with the machine);
- a **transducer** — *what's out there* and *what comes back* (typed input and
  output);

and wrapping all three, a **verifiable, testable model** — a machine you can
*prove* things about, not just run.



&nbsp;

&nbsp;

## The `prop` / `val` / `sensor` trichotomy

The single most important idea to carry into the rest of the manual is that FSL
distinguishes three kinds of "data the machine knows about," and they are not
interchangeable.  Each answers a different question.

| Kind | Question it answers | Who writes it | Lives where |
|------|---------------------|---------------|-------------|
| `prop` | *Where am I?* | the machine's structure | bound to a **state** |
| `val`  | *How did I get here?* | transitions, via `assign` | carried **with the machine** |
| `sensor` | *What's out there?* | the outside world | read-only, externally **wired** |

A `prop` is a state-bound constant: it's true because of *which state you're
in*.  A traffic light's `prop color` is `"red"` precisely when the machine is in
the `Red` state — you don't assign it, the state *is* it.

A `val` is extended state: a typed value that survives transitions and changes
over time.  A vending machine's `val balance` goes up as coins arrive and down
when something is dispensed.  You read it with `.val()` and you change it inside
a transition with `assign`.

A `sensor` is the dual of a `val` on the *input* side: a read-only value the
machine doesn't own, supplied from outside and **recorded** so that a run can be
replayed exactly.  A thermostat reads `sensor room_temp`; it never writes it.

```fsl
// a tiny machine that uses all three
Idle 'coin'    -> Idle    assign balance += 25;        // val: how you got here
Idle 'vend'    -> Vending where balance >= 100;        // guard reads the val
Vending 'done' -> Idle    assign balance -= 100;

val    balance   : int 0..500 default 0;               // carried with the machine
prop   slot      : string;                             // bound to the state
sensor in_stock  : boolean;                            // wired from the outside
```

Why three and not one bag of variables?  Because the verifier needs to know what
it's allowed to assume.  It owns `prop` (structure) completely.  It controls
`val` (the machine writes it under rules it can check).  But it must
**over-approximate** `sensor` — the outside world can hand back anything in the
sensor's type — and keeping that separate is what lets proofs stay honest.



&nbsp;

&nbsp;

## Time is a sensor

A consequence worth stating up front: **the clock is just a sensor.**  FSL does
not bake in a notion of "now."  Time arrives the same way the room temperature
does — read-only, supplied from outside, recorded for replay.  The default is a
real clock, but you can hand the machine a tick source you control, which is
exactly what makes multi-machine simulations and deterministic tests possible:
advance one clock, and every machine sharing it steps together.



&nbsp;

&nbsp;

## What this buys you

Because the data is typed and the structure is explicit, FSL machines are
**verifiable**.  You can declare properties — "every request is eventually
answered," "the balance is never negative" — and have a checker *prove* them
across all reachable behaviors, or hand you a counterexample.  And because input
is the single source of truth (seeded randomness plus a recorded input tape),
**any run regenerates from its tape**: reproducible runs, portable repro
bundles, counterexamples you can replay.

That verifiability is the throughline of the whole manual.  See
{@page VerifiabilityTiers.md the verifiability tiers} for what makes a machine
checkable, {@page ExecutionModel.md the execution model} for the run-to-com­ple­tion
pipeline everything keys off, and {@page GuardsAndContracts.md guards and
contracts} for how you state obligations the verifier discharges.



&nbsp;

&nbsp;

## A note on migration

The vocabulary moved a little to make room for the new ideas:

- `var` is now **`val`** (extended state — see above);
- `property` is now **`prop`**, with `property` kept as a *deprecated alias*
  that will be **removed in v7**;
- the assignment verb is **`assign`**, because `set` is now the name of the set
  *type*.

These are context-scoped keywords: a state you named `case` still works fine
*outside* expression position.  v5 documents largely parse under v6 unchanged.

> One operational gotcha that has nothing to do with the language: in this
> project, releases are coupled to `main`, and the version must never be
> hand-bumped.  That's a contributor concern, not a user one, but it surprises
> people, so it's said here once.
