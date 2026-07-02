---
id: ex-traffic-light
section: example-machines
title: "Traffic light"
order: 10
teaches: []
mentions: [transitions, timed-transitions]
indexTerms: [traffic, light, example, cycle]
---

# Traffic light

The canonical state machine: three states that cycle on a timer. Load it and watch the diagram.

```fsl {run: true}
Green after 5 -> Yellow;
Yellow after 2 -> Red;
Red after 5 -> Green;
```

Swap the `after` clauses for actions (`Green 'advance' -> Yellow;`) to drive it by hand instead of by timer.
