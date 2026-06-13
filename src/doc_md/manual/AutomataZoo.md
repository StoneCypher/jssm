# The Automata Zoo

This is the sibling of {@page PatternsAsFeatures.md design patterns as features},
and it carries the same surprising claim, one level up.  Just as the Gang-of-Four
patterns turn out to be FSL *features*, a long list of named automata and formal
models turn out to be FSL *configurations*.

> The formalisms aren't *implemented* in FSL.  They're **recovered** from it —
> coordinates in a feature space, not separate machines bolted on.

The feature space has a handful of axes: **memory** (none / one stack /
counters / tree), **communicating copies** (one machine / a wired system),
**weights** (plain / probabilistic edges), **I/O shape** (recognizer /
transducer), and **registers** (the val types you carry).  Pick a point in that
space and you've named a classical model.



&nbsp;

&nbsp;

## The coordinates

A tour of what falls out, grouped by which feature recovers it:

**From the model-class ladder** (how much memory):

- no memory → **regular** languages / finite automata;
- one stack → **pushdown** automata, CFG parsers, recursive state machines;
- nested/matched structure → **visibly-pushdown** / nested-word automata;
- counters (no zero-test) → **Petri nets** / **VASS**;
- a tree carrier → **tree automata**, attribute grammars.

**From systems + wiring** (communicating copies):

- protocols, **session types**, communicating FSMs (CFSMs);
- I/O and interface automata;
- workflow / **BPMN** / DMN;
- cellular automata;
- synchronous languages (Esterel, Lustre).

**From weighted edges:** Markov chains and MDPs, weighted automata, HMMs, reward
machines.

**From the transducer model:** Mealy and Moore machines, finite-state
transducers, tree transducers.

**From vals-as-registers:** register / data automata.

**From the verifier's view:** Kripke structures, labelled transition systems,
Büchi automata.

**From groups + history:** statecharts, UML state machines, SCXML.



&nbsp;

&nbsp;

## A worked anchor: BPMN's parallel gateway

The cleanest way to *feel* the coordinate idea is to watch a plain FSM fail and
a richer one succeed.

A BPMN **parallel gateway** splits one flow into several that run *at the same
time* and later rejoin.  A plain finite state machine has exactly **one current
state** — it cannot be "in two places at once," so it cannot model two
concurrent branches directly.

What you need is **tokens**: not a single current state but a *multiset* of
active positions.  That's the rung-2 move — a counter/`bag` val tracking how
many tokens sit where.  The parallel gateway adds tokens to several places at
once; the join consumes them.  The moment you reach for tokens, you've climbed
from "finite automaton" to "Petri net / VASS" — you moved along the *memory*
axis of the coordinate space, on purpose, because the problem demanded it.



&nbsp;

&nbsp;

## The honest non-fits

Positioning is only credible if it names what *doesn't* fit:

- **timed automata / PTA** — real-valued clocks; deferred, not yet in FSL;
- **hybrid automata** — continuous ODE dynamics; off-model by design (FSL is
  discrete);
- **π-calculus mobility, unbounded channels** — these run into the *totality
  ceiling*: FSL keeps expressions total and channels bounded, which is exactly
  what they require you to give up.

These aren't oversights; they're the edges of the design.



&nbsp;

&nbsp;

## Two framings worth carrying forward

The zoo is not just a catalog — it points at two larger stories the manual
returns to:

- **FSL + contracts is a lightweight, executable, visual TLA+ / Event-B.**
  State plus invariants plus a next-state relation *is* the shape of those
  specification languages — only here it runs, renders, and verifies in one
  artifact.
- **Verification has an inverse.**  Where `check` *judges* a machine against a
  property, **synthesis** *generates* one from a property (reactive/LTL
  synthesis, supervisory control), and **learning** *infers* one from an oracle
  (Angluin's L\*).  Same machine, three directions: `infer` from behavior,
  `check` against properties, `synth` from properties.

A hot example to lead a lesson with: **behavior trees** (game AI and robotics)
are a `tree` ticked synchronously — a formalism a game developer already knows,
recovered as an FSL configuration.



&nbsp;

&nbsp;

## See also

- {@page PatternsAsFeatures.md Design patterns as features} — the sibling
  positioning chapter; same "recovered, not implemented" framing.
- {@page VerifiabilityTiers.md The verifiability tiers} — the model-class rungs
  (`regular`/`pushdown`/`petri`/`tree`) and the decidability tripwires that
  keep each one below Turing.
