---
id: tut-arrange
section: tutorials
title: "Layout hints (arrange)"
order: 60
teaches: [arrange]
mentions: [states]
indexTerms: [arrange, layout, rank, position]
---

# Layout hints (arrange)

`arrange [ … ];` nudges the layout engine to place a set of states on the same rank (row/column). Use `arrange-start` / `arrange-end` to pin states to the first or last rank.

```fsl {teaches: arrange, run: true}
arrange [a b];
a -> b;
c -> d;
arrange [c d];
```

Arrange is purely presentational — it changes how the diagram is drawn, never the machine's behaviour.
