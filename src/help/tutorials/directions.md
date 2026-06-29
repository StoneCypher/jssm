---
id: tut-directions
section: tutorials
title: "Directions"
order: 62
teaches: [directions]
mentions: [arrange, machine-attributes]
indexTerms: [direction, flow, up, down, left, right]
---

# Directions

A direction — `up`, `down`, `left`, or `right` — sets the **flow** of the diagram, i.e. which way the graph grows.

```fsl {teaches: directions, run: true}
flow: right;
a 'go' -> b 'go' -> c 'go' -> d;
```

`flow: down` (the default) stacks states top-to-bottom; `flow: right` lays them left-to-right, which often reads better for linear pipelines.
