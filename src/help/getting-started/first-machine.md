---
id: first-machine
section: getting-started
title: "Your first machine"
order: 30
teaches: []
mentions: [transitions]
indexTerms: [first, example, quickstart, machine]
---

# Your first machine

An FSL file is a list of statements. The simplest machine is a chain of transitions. States are inferred from the arrows — you do not have to declare them.

Try loading this into the editor and watch the diagram appear:

```fsl {run: true}
Solid 'crack' -> Liquid 'boil' -> Gas;
```

Each transition is a **source state**, an optional **action** in single quotes, an **arrow**, and a **target state**. Add `machine_name : "…";` at the top to give your machine a title.
