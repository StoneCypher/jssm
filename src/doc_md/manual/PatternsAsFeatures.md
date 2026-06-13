# Design Patterns as Features

There's a line worth leading with, because it reframes the whole language:

> In FSL, you don't *write* the design patterns.  You write states, and the
> patterns are already there.

The *Gang of Four* design patterns — the 23 recurring solutions catalogued in
*Design Patterns* (1994) — exist because object-oriented languages lack the
vocabulary to say certain things directly, so programmers assemble the same
scaffolding over and over.  About ten of those patterns aren't *implemented* in
FSL.  They **are** language features.  You get them for free, and — because they
live in the language rather than in your hand-rolled classes — the verifier
understands them.



&nbsp;

&nbsp;

## The patterns that are features

Lead with the first four; they're the ones a newcomer feels immediately.

### State → the machine itself

The **State** pattern exists to make an object behave differently depending on
its internal mode, without a sprawl of conditionals.  That *is* a state machine.
And FSL goes further: because a `prop` can be **function-typed**, a state can
carry its own behavior as a value — one lambda pinned per state — and the
verifier checks each one.  The State pattern, native and verifiable.

### Strategy → a function-typed `val`

**Strategy** swaps an algorithm at runtime.  In FSL a `val` can *be* a function,
so a carried, reassignable strategy is just a function-typed `val`.  Where State
is behavior that changes with *where you are*, Strategy is behavior you *carry
and swap*.

### Observer → hooks

**Observer** notifies interested parties when something happens.  That's exactly
what hooks do — they observe the machine without changing what it is.  The
behavioral/observational split (the machine's *source* defines what it is; hooks
*observe* what it does) is the Observer pattern drawn as a hard line.

### Memento → serialize / snapshot / tape

**Memento** captures and restores an object's state.  FSL serializes, snapshots,
and tapes by construction — the whole machine, including its vals, round-trips
to data and back.  Memento isn't a thing you build; it's how persistence works.

### The rest of the built-in set

| GoF pattern | FSL feature |
|-------------|-------------|
| **Command** | typed-payload events + the tape (each event *is* a reified command) |
| **Visitor** | `case` over ADTs (dispatch on a sum type's shape) |
| **Mediator** | a `System` + `wire` (peers coordinate through the system, not each other) |
| **Chain of Responsibility** | transition resolution order (specific → wildcard → unlabeled → rejection) |
| **Composite** | state groups (a group of sub-states treated as one) |
| **Decorator** | hooks-as-decorators (wrap behavior without touching the source) |

About six more — **Iterator, Interpreter, Adapter, Proxy, Builder, Prototype** —
are *naturally expressible* without ceremony, even if they're not single
features.



&nbsp;

&nbsp;

## The honest non-fits

Not every pattern collapses into a feature, and the manual says so plainly.  The
**creational, OO-instantiation** patterns — **Factory Method**, **Abstract
Factory**, **Singleton** — are arguably outside a *state machine's* domain,
because a bare state machine doesn't *spawn things*.

But note the update: FSL grows **document factories** and a `spawn` verb for
populations (see the factories and systems chapters).  Once you can stamp
instances from a `factory` block and `spawn` members into a running system,
**Factory Method and Abstract Factory are no longer out of domain** — a factory
that binds vals and identity targets *is* an abstract factory, and `make()` vs
`at(n)` *is* factory-method instantiation.  Singleton remains a non-fit, and
that's fine.



&nbsp;

&nbsp;

## Why this matters beyond trivia

This is a positioning argument as much as a teaching one.  When someone asks
"how do I do the State pattern in FSL," the honest answer is *you already did —
you wrote a machine*.  The patterns were workarounds for a missing vocabulary;
FSL has the vocabulary.  And the payoff is not just less boilerplate: because
the patterns are *language features* rather than *hand-assembled classes*, the
verifier can reason about them.  Your State pattern can be proven to have no
unreachable state; your Observer can be checked to be a pure observer; your
Mediator's routing can be model-checked.  Patterns-as-features means
patterns-as-*provable*.



&nbsp;

&nbsp;

## See also

- {@page AutomataZoo.md The automata zoo} — the sibling positioning chapter:
  the same "recovered, not implemented" framing, applied to formalisms instead
  of patterns.
- {@page WhatIsFslNow.md What FSL is now} — function-typed `prop`s and `val`s,
  the substrate under State and Strategy.
