---
id: tut-api-utilities
section: tutorials
title: "API: utility exports"
order: 90
teaches: [api-utilities]
mentions: [api-machine, weighted-arrows]
indexTerms: [seq, unique, weighted_rand_select, sleep, utility, API]
---

# API: utility exports

A handful of small utilities ride along with the package — `seq`, `unique`, `find_repeated`, `weighted_rand_select`, `sleep`, and friends. They back the stochastic tooling and are handy on their own.

```js
import { seq, unique, weighted_rand_select } from 'jssm';

seq(3);                                   // [0, 1, 2]
unique([1, 1, 2, 3, 3]);                  // [1, 2, 3]
weighted_rand_select([[0.7, 'win'], [0.3, 'lose']]);
```

`weighted_rand_select` is the engine behind probabilistic transitions:

```fsl {teaches: api-utilities, run: true}
Idle -> 70% Win;
Idle -> 30% Lose;
```
