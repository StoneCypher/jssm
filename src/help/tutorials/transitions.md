---
id: tut-transitions
section: tutorials
title: "Transitions"
order: 10
teaches: [transitions]
mentions: [states, labels-quoting]
indexTerms: [arrow, edge, transition, action]
---

# Transitions

A transition is the core of FSL: a **source state**, an arrow, and a **target state**. States are inferred from the arrows, so you never declare them just to use them.

```fsl {teaches: transitions, run: true}
Off 'flip' -> On 'flip' -> Off;
```

The text in single quotes is an **action** — the named input that fires the transition. You can chain transitions on one line, as above, or write them one per line. The plain `->` arrow means a *legal* transition; later tutorials cover the other arrow kinds.
