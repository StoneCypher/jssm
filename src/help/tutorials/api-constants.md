---
id: tut-api-constants
section: tutorials
title: "API: constants and vocabularies"
order: 84
teaches: [api-constants]
mentions: [api-machine, colors, shapes]
indexTerms: [named_colors, gviz_shapes, constants, FslDirections, API]
---

# API: constants and vocabularies

The library exports the vocabularies the grammar accepts, so editors and tools never have to hard-code them: `named_colors`, `gviz_shapes`, `shapes`, `FslDirections`, and the `constants` bundle.

```js
import { named_colors, gviz_shapes, FslDirections } from 'jssm';

named_colors.includes('ForestGreen'); // true
gviz_shapes.includes('doublecircle');  // true
```

These are the exact values that style a machine:

```fsl {teaches: api-constants, run: true}
state Go : { color: ForestGreen; shape: doublecircle; };
Stop 'go' -> Go;
```
