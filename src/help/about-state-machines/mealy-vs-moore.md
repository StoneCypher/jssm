---
id: mealy-vs-moore
section: about-state-machines
title: "Mealy vs Moore"
order: 20
teaches: []
mentions: []
indexTerms: [mealy, moore, output, action, theory]
---

# Mealy vs Moore

Two classic models differ in *where the output lives*:

- A **Moore machine** produces output based only on the **current state**. The output is a property of *being* in a state.
- A **Mealy machine** produces output based on the **state and the transition** taken. The output is a property of *moving*.

FSL can express both styles. Actions attached to transitions (`A 'go' -> B;`) read naturally as Mealy outputs; state-level behaviour reads as Moore. You rarely have to choose a camp — you model what the system does, and the distinction becomes a way to *describe* your machine rather than a constraint you fight.
