---
id: tut-weighted-arrows
section: tutorials
title: "Weighted / probabilistic arrows"
order: 66
teaches: [weighted-arrows]
mentions: [transitions]
indexTerms: [probability, weight, percent, random]
---

# Weighted / probabilistic arrows

A transition can carry a **probability** with `N%`. When several transitions share a source, the weights bias a random walk over the machine.

```fsl {teaches: weighted-arrows, run: true}
Idle -> 70% Win;
Idle -> 30% Lose;
```

Probabilities power FSL's stochastic tooling — random walks, sampling, and Monte-Carlo-style exploration of a machine's reachable states.

## Lists

A probabilistic transition can target a list.  The list keeps the transition's weight as a *group* weight, and the members share it — uniformly, or by their own inner weights:

```fsl {teaches: weighted-arrows, run: true}
Idle 50% -> [WinA WinB];
```

`WinA` and `WinB` each get 25% of `Idle`'s total weight, splitting the 50% evenly between them — not a 25% draw frequency on their own; with no other sibling edge from `Idle` here, they're still drawn 50/50 against each other. Give members their own weights to split unevenly instead:

```fsl {teaches: weighted-arrows, run: true}
Idle 50% -> [WinA 20% WinB 80%];
```

`WinA` gets 10% and `WinB` gets 40% — the 20/80 split of the outer 50%. (In 5.x, every member of a targeted list received the *full* outer weight instead of sharing it, so both examples above would have given each member 50%.)
