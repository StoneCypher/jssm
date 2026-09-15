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

In JavaScript, the quickest way to build a machine is the `sm` template tag. It compiles an FSL string into a live machine you drive with functions that take the machine first: `state(m)`, `transition(m, to)`, `act(m, action)`.

```js
import { sm, state, act } from 'jssm';

const traffic = sm`Red 'go' -> Green 'go' -> Yellow 'go' -> Red;`;
state(traffic);                // 'Red'
act(traffic, 'go');            // true; now in 'Green'
```

The machine this compiles from is just ordinary FSL:

```fsl {teaches: api-machine, run: true}
Red 'go' -> Green 'go' -> Yellow 'go' -> Red;
```

`sm` is the terse path; `from(...)` and `create(compile(...))` give you the same machine with more control over options, and `deserialize` rebuilds one from saved state.

Coming from 5.x?  `import { Machine, sm } from 'jssm/compat'` is the class API, unchanged: `traffic.state()`, `traffic.act('go')`.  See `MIGRATING-5-to-6.md`.
