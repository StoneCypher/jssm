---
id: tut-line-styles
section: tutorials
title: "Line styles"
order: 56
teaches: [line-styles]
mentions: [state-styling]
indexTerms: [line-style, dashed, dotted, solid, bold]
---

# Line styles

The `line-style` key controls how a border or edge is stroked — `solid` (the default), `dashed`, `dotted`, or `bold`.

```fsl {teaches: line-styles, run: true}
state Pending : { line-style: dashed; };
Idle 'submit' -> Pending 'confirm' -> Done;
```

On a state it styles the node border; in a `transition: {}` block it styles edges — handy for visually distinguishing tentative or fallback paths.
