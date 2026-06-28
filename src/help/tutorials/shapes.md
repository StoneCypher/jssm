---
id: tut-shapes
section: tutorials
title: "State shapes"
order: 70
teaches: [shapes]
mentions: [state-styling]
indexTerms: [shape, circle, doublecircle, box, ellipse]
---

# State shapes

The `shape` key draws a state as one of Graphviz's node shapes — `circle`, `doublecircle`, `box`, `ellipse`, `diamond`, and dozens more.

```fsl {teaches: shapes, run: true}
state Start : { shape: circle; };
state Final : { shape: doublecircle; };
Start 'run' -> Final;
```

A common idiom: `doublecircle` for accepting/final states, plain `circle` or `box` for the rest — an at-a-glance convention borrowed from automata diagrams.
