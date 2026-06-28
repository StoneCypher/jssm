---
id: tut-api-hook-helpers
section: tutorials
title: "API: hook result helpers"
order: 88
teaches: [api-hook-helpers]
mentions: [api-machine, hooks]
indexTerms: [is_hook_rejection, hook result, abstract_hook_step, API]
---

# API: hook result helpers

When you attach hooks from JavaScript, the result helpers — `is_hook_rejection`, `is_hook_complex_result`, `abstract_hook_step` — classify what a hook returned so you can react to a rejection or a complex result uniformly.

```js
import { sm, is_hook_rejection } from 'jssm';

const m = sm`a 'go' -> b;`;
m.hook('a', 'b', () => false);   // a hook that rejects the transition
is_hook_rejection(false);        // true
```

Hooks attach to the boundaries of a machine like this one:

```fsl {teaches: api-hook-helpers, run: true}
on exit a do 'log';
a 'go' -> b;
```
