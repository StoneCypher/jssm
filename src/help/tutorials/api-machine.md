---
id: tut-api-machine
section: tutorials
title: "API: the Machine and its factories"
order: 80
teaches: [api-machine]
mentions: [transitions, states]
indexTerms: [sm, from, compile, Machine, transition, API]
---

# API: the Machine and its factories

In JavaScript, the quickest way to build a machine is the `sm` template tag. It compiles an FSL string into a live `Machine` you can drive with `.transition()`.

```js
import { sm } from 'jssm';

const traffic = sm`Red 'go' -> Green 'go' -> Yellow 'go' -> Red;`;
traffic.state;                 // 'Red'
traffic.transition('go');      // true; now in 'Green'
```

The machine this compiles from is just ordinary FSL:

```fsl {teaches: api-machine, run: true}
Red 'go' -> Green 'go' -> Yellow 'go' -> Red;
```

`sm` is the terse path; `from(...)` and `compile(...)` give you the same `Machine` with more control over options, and `deserialize` rebuilds one from saved state.
