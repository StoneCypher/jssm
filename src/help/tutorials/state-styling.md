---
id: tut-state-styling
section: tutorials
title: "State styling"
order: 42
teaches: [state-styling]
mentions: [colors, shapes]
indexTerms: [style, background-color, border-color, shape, state]
---

# State styling

A `state` declaration can carry style keys that control how the node is drawn: `color`, `text-color`, `background-color`, `border-color`, `shape`, `corners`, `line-style`, `image`, and `url`.

```fsl {teaches: state-styling, run: true}
state Active : {
  background-color : LightYellow;
  border-color     : GoldenRod;
  shape            : doublecircle;
};
Idle 'start' -> Active 'stop' -> Idle;
```

These are the same keys the autocomplete offers inside a `{ }` block, and the same vocabulary the `state: {}` default-config block accepts.
