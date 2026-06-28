---
id: tut-corners
section: tutorials
title: "Corner styles"
order: 72
teaches: [corners]
mentions: [state-styling]
indexTerms: [corners, rounded, regular, lined]
---

# Corner styles

The `corners` key softens or squares a state's box — `regular` (sharp), `rounded`, or `lined`.

```fsl {teaches: corners, run: true}
state Draft : { corners: rounded; };
Draft 'publish' -> Live;
```

`rounded` corners pair well with a `box` shape for a softer, card-like node.
