---
id: tut-arrow-decorations
section: tutorials
title: "Per-arrow decorations"
order: 68
teaches: [arrow-decorations]
mentions: [transitions, colors]
indexTerms: [edge-color, arc_label, head_label, tail_label, per-arrow]
---

# Per-arrow decorations

A `{ … }` block placed **between an arrow and its target** decorates that one edge — its color, line style, or labels (`arc_label`, `head_label`, `tail_label`).

```fsl {teaches: arrow-decorations, run: true}
a -> {edge-color: SteelBlue;} b;
b -> {arc_label: retry;} a;
```

This is the per-edge counterpart to the `transition: {}` default block: use the block for machine-wide edge defaults, a decoration for a single distinctive edge. (`edge_color` with an underscore is accepted as a legacy alias of `edge-color`.)
