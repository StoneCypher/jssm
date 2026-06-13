# The Verifiability Tiers and `finite`

FSL's defining promise is that you can *prove* things about a machine, not just
run it.  But proof is not free, and not every machine can be checked the same
way.  This page explains the three bands of checkability, the difference between
the two attributes people most often confuse — `finite` and `checkable` — and
the one rule that runs through all of it.

The governing principle is simple: **bounded by default, opt into unbounded
knowingly.**  Every default in FSL is the safe, analyzable one — finite types,
bounded containers and strings, a microstep bound.  Going unbounded is always a
*visible act* in the source, never an accident.  That's what keeps machines
verifiable and memory-safe.



&nbsp;

&nbsp;

## Three bands of verification

Think of checkability as a ladder with three rungs, set by how big the machine's
reachable state space is:

| Band | State space | How it's checked |
|------|-------------|------------------|
| **small-finite** | small enough to **enumerate** | exhaustive search — visit every reachable state |
| **large-finite** | finite but huge | **SMT** — symbolic reasoning, no enumeration |
| **infinite / rich** | unbounded or genuinely infinite | **bounded analysis only** — statistical / depth-limited |

Finiteness is what makes model-checking *decidable*.  If the machine has a
finite reachable state space, a checker can, in principle, answer yes-or-no
about any safety property.  Once the space is infinite, the best you can do is
bounded or statistical evidence — strong, useful, but not a closed proof.



&nbsp;

&nbsp;

## `finite` vs `checkable` — they are different attributes

This is the distinction the manual most wants you to get right, because the two
words sound interchangeable and are not.

- **`finite`** is the *hard, enumerable line*.  A `finite` machine's reachable
  states can be **exhausted** — small-finite.  The compiler *enforces* it: a
  `finite` machine is forbidden from using anything that could blow the space
  open.
- **`checkable`** is the *softer* tier: "the checker may attempt this."  It
  covers large-finite machines the SMT band can handle, even when they're far
  too big to enumerate.

So `finite ⊊ checkable`.  Something can be checkable without being finite.  The
classic example is **chess**: the rules are entirely finite — a bounded board, a
fixed piece set — yet there are roughly 10⁴³ reachable positions.  Chess is
**finite-but-not-enumerable**: it lands in the *checkable* / large-finite-SMT
band, **not** the small-finite-enumerable one.  You can't `finite`-declare your
way to enumerating it; you reach for the SMT band instead.

Three concrete calibration points:

```fsl
val flag    : boolean;                 // small-finite: 2 states, enumerable
val byte    : uint8;                   // small-finite: 256 states, enumerable
val board   : array Square len 64;     // checkable: finite, astronomically large
val history : list Move;               // rich: unbounded — bounded analysis only
```



&nbsp;

&nbsp;

## What `finite` forbids — and what it surprisingly allows

Declaring `finite` is a contract with the compiler.  In exchange for
enumerability, a `finite` machine gives up the **rich tier**:

- no `float` / `double`, no `longint`;
- no open / unbounded containers — bound them (`array T len 0..N`, `string len
  0..N`);
- no recursive ADTs;
- no first-class lambdas as data;
- no `any`;
- no `data` (the unbounded escape hatch).

What surprises people is what `finite` **still allows**: construction-time
`rand` and `sensor` reads.  These don't break finiteness because the checker
**over-approximates** them — it reasons about *all* outcomes the random draw or
sensor could produce, which is itself a finite set of possibilities over a
finite type.  So a `finite` machine can still have randomized fixtures and
react to the outside world; the verifier just proves the property for *every*
value the world might hand back.

```fsl
finite;                                          // declared and enforced

Queuing 'wait' -> Queuing
    assign patience -= rand(1, 3);              // legal on finite:
                                                // proven for ALL outcomes
val patience : int 0..100 default 50;           // bounded — stays enumerable
sensor park_open : boolean;                      // over-approximated for proof
```



&nbsp;

&nbsp;

## The other attributes

`finite` is the headline, but it's one of a family of capability and *disallow*
attributes that each buy you something concrete:

- **`finite`** — enumerable state space (above).
- **`pure`** — no side effects; safe to run untrusted (`run --require-profile
  pure` is verify-before-run).
- **`sealed`** — contracts are proven, so the runtime checks compile out (see
  {@page GuardsAndContracts.md guards and contracts}).
- **`deterministic`** — no probabilistic edges; one outcome per stimulus.
- **`stateless`** — no carried `val`s; behavior depends only on the current
  state.

Each attribute buys the same three things: **documentation** (a reader knows the
machine's shape at a glance), a **checker assumption** (the verifier may reason
more aggressively), and **runtime specialization** (the engine can drop
machinery it knows is unnecessary).



&nbsp;

&nbsp;

## The model-class rung is a separate axis

Checkability bands are about *how big*; the **model class** is about *what kind
of memory* the machine has, and it sets the *decision procedure*.  A machine can
declare its rung — `regular`, `pushdown`, `petri`, `tree` — and the declaration
**enforces** the decidability tripwire that keeps it below Turing:

- **`pushdown`** — exactly **one** push/pop stack; a second stack would make it
  Turing-complete, so it's forbidden.
- **`petri`** — monotone counters with **no zero-test**; a zero-test turns it
  into a Minsky counter machine (Turing), so it's forbidden.
- **`tree`** — a finite carrier; this is what gives you verifiable validators
  and schema-preserving transducers.

Dropping the second stack or the zero-test isn't pedantry — it is the *exact*
line between decidable and undecidable.  The val type *is* the auxiliary memory;
the rung *is* the language class; totality caps the whole thing below Turing.



&nbsp;

&nbsp;

## What a counterexample is

When a check fails, you don't get a stack trace — you get a **replayable tape**.
The checker hands you the exact sequence of stimuli that reaches the bad state,
as a tape that `fsl run` replays to reproduce it.  A counterexample to "the
balance is never negative" is the precise sequence of operations that overdrew
the account.  This is why, throughout the manual, you'll see the same line: the
checker, the stochastic tester, and the factory are *one machine* — they all
speak in tapes.



&nbsp;

&nbsp;

## See also

- {@page ExecutionModel.md The execution model} — "the verifier proves
  quiescence for `finite`" means it proves every macrostep settles.
- {@page GuardsAndContracts.md Guards and contracts} — the proof obligations the
  verifier discharges.
- {@page WhatIsFslNow.md What FSL is now} — why `sensor` must be
  over-approximated and `val` need not be.
