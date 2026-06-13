# Guards and Contracts

FSL gives you four ways to attach a condition to a transition, and the single
most common mistake is treating them as four flavors of the same thing.  They
are not.  They differ in *who is responsible when the condition is false*, and
that difference is the whole point.  Keep them apart:

| Keyword | Means | If false at runtime | Verifier's job |
|---------|-------|---------------------|----------------|
| `where` | **enabledness** | the transition silently doesn't fire | prove reachability where it matters |
| `require` | **caller obligation** | misuse — it's an **error** | prove callers always satisfy it |
| `ensure` | **machine obligation** | the *machine* broke its promise | prove the machine always satisfies it |
| `invariant` | **always true at stable** | a structural promise broke | prove it holds in every reachable stable config |

Read that table as a sentence: a `where` is a *question* ("may I go here?"), a
`require` is a *demand on you* ("you promised this before calling"), an `ensure`
is a *promise from the machine* ("I'll leave things this way"), and an
`invariant` is a *standing truth* ("this is always so when I'm at rest").



&nbsp;

&nbsp;

## `where` — enabledness

A `where` guard decides whether an edge is *available*.  If it's false, the
transition simply isn't enabled — no error, no noise, the machine just doesn't
take that edge (and may take another, or stay put).  This is the right tool when
"not allowed right now" is a normal, expected condition.

```fsl
Queuing 'board' -> Riding  where patience > 0;
```

Trying to `'board'` with no patience left is not a bug — it's just not your
turn.  The edge stays dark.  In access-control terms, a `where` guard literally
answers *"is this permitted here, now?"*



&nbsp;

&nbsp;

## `require` — the caller's obligation

A `require` is a precondition the *caller* must satisfy.  If it's false, that's
**misuse** — the machine raises an error, because the rules of the road were
broken.  Use `require` when calling at the wrong time is a programming mistake,
not an expected state.

```fsl
Queuing 'board' -> Riding
    require park_open                 // you may not board a closed park
    where   patience > 0;            // and only if you've still got patience
```

The two compose cleanly: `require park_open` says *boarding a closed park is an
error*; `where patience > 0` says *boarding with no patience just isn't
available*.  Same edge, two very different failure modes.



&nbsp;

&nbsp;

## `ensure` — the machine's obligation

An `ensure` is a postcondition the *machine* promises to deliver.  If it's
false, the machine broke its own contract — that's a machine bug, surfaced
immediately.  `ensure` can talk about the **pre-transition** state with `old`,
which is what lets you state real before/after relationships:

```fsl
Riding 'done' -> Leaving
    assign rides_taken += 1
    ensure rides_taken = old rides_taken + 1;   // exactly one more than before
```

`old rides_taken` is the value *before* this transition's assigns ran.  The
`ensure` says "after this transition, the count is exactly one higher than it
was when we started" — a promise the verifier can check against the `assign`.



&nbsp;

&nbsp;

## `invariant` — always true at stable

An `invariant` is a standing truth about the machine, checked at every **stable**
configuration (see {@page ExecutionModel.md the execution model} for what
"stable" means).  It is *not* checked at every microstep — a value that dips and
recovers within a single run-to-completion macrostep has not violated the
invariant.

```fsl
invariant patience >= 0;
invariant rides_taken <= 20;
```

This is the home of your safety properties: "the balance is never negative,"
"debits always equal credits," "no two trains occupy the same block."



&nbsp;

&nbsp;

## The dual nature: proof *and* assertion

Here is the idea that makes contracts more than runtime asserts.  Each of
`require`, `ensure`, and `invariant` is **two things at once**:

1. a **proof obligation** the verifier discharges statically — it tries to prove
   your contract can *never* be violated across all reachable behavior; and
2. a **runtime assertion** that fires if it ever is.

And crucially, once the verifier has *proven* a contract (or you've sealed the
machine with the `sealed` attribute), the runtime check **compiles out**.  You
get the safety with none of the cost: the assertion exists only as long as it's
unproven.  A contract you've discharged is free at runtime.

For this to work, contract expressions must be **total and pure** — no loops, no
side effects, always a value (see {@page WhatIsFslNow.md the totality
principle}).  And there is **no inheritance** of contracts: a contract means
exactly what it says where it's written, with nothing inherited or overridden to
reason around.



&nbsp;

&nbsp;

## Choosing among the four

A quick decision guide:

- *"This just isn't available right now, and that's fine."* → **`where`**
- *"Calling this here is a bug on the caller's part."* → **`require`**
- *"I promise the state looks like this afterward."* → **`ensure`**
- *"This is always true whenever the machine is at rest."* → **`invariant`**

When you find yourself reaching for `where` to *reject* misuse, you probably
wanted `require`; when you reach for `ensure` to *gate* a transition, you
probably wanted `where`.  The table at the top is the tiebreaker.



&nbsp;

&nbsp;

## See also

- {@page ExecutionModel.md The execution model} — where each of these runs in
  the macrostep pipeline.
- {@page VerifiabilityTiers.md The verifiability tiers} — what makes a contract
  *provable* rather than only *asserted*.
