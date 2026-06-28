---
id: what-is-an-fsm
section: about-state-machines
title: "What is a state machine?"
order: 10
teaches: []
mentions: []
indexTerms: [fsm, finite, state, transition, theory, automaton]
---

# What is a state machine?

A **finite state machine** is a system that is always in exactly one of a finite set of **states**, and moves between them through **transitions**. A transition fires in response to an input — in FSL, an **action**.

Three ideas carry most of the weight:

- **States** are the situations a system can be in: a door is *Open* or *Closed*; a traffic light is *Red*, *Yellow*, or *Green*.
- **Transitions** are the allowed moves between states. A door can go *Closed → Open*, but a turnstile cannot go *Locked → Locked-and-paid* without paying first.
- **Determinism** means that, from a given state and input, the next state is fixed. FSL machines are deterministic by construction.

Because the set of states is finite and the moves are explicit, a state machine is something you can *reason about* — and even *prove things about* — rather than just run.
