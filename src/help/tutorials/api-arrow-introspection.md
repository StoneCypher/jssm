---
id: tut-api-arrow-introspection
section: tutorials
title: "API: arrow introspection"
order: 86
teaches: [api-arrow-introspection]
mentions: [api-machine, arrow-flavors]
indexTerms: [arrow_direction, arrow_left_kind, arrow_right_kind, API]
---

# API: arrow introspection

`arrow_direction`, `arrow_left_kind`, and `arrow_right_kind` decode an arrow token into its direction and per-side kind — useful when building tools that reason about transition semantics.

```js
import { arrow_direction, arrow_right_kind } from 'jssm';

arrow_direction('<->');     // 'both'
arrow_right_kind('=>');     // 'main'
```

The arrows they decode are the ones you write between states:

```fsl {teaches: api-arrow-introspection, run: true}
a <-> b;
b => c;
```
