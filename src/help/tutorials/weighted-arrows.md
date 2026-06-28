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
