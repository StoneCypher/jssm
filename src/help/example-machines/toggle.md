---
id: ex-toggle
section: example-machines
title: "Toggle"
order: 20
teaches: []
mentions: [transitions]
indexTerms: [toggle, switch, on, off, example]
---

# Toggle

The smallest useful machine: two states and one action that flips between them.

```fsl {run: true}
Off 'flip' -> On 'flip' -> Off;
```

This is the shape behind every checkbox, light switch, and feature flag — a single action bouncing the system between two states.
