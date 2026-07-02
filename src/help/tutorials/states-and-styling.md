---
id: tut-states-and-styling
section: tutorials
title: "States and styling"
order: 20
teaches: [states]
mentions: [state-styling, colors]
indexTerms: [state, declaration, style, color, shape]
---

# States and styling

Most states are inferred from transitions, but you can **declare** a state explicitly to give it a style. A declaration is `state Name { … };` with style keys inside.

```fsl {teaches: states, run: true}
state On : {
  background-color : green;
};

Off 'flip' -> On 'flip' -> Off;
```

Inside the block you can set `background-color`, `text-color`, `border-color`, `shape`, `corners`, and more — the same vocabulary the autocomplete offers after a `:`. Declared or not, a state still participates in transitions exactly the same way.
