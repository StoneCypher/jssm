---
id: tut-viz-dot
section: tutorials
title: "Viz: DOT output"
order: 102
teaches: [viz-dot]
mentions: [viz-render]
indexTerms: [dot, graphviz, viz]
---

# Viz: DOT output

If you want the Graphviz **DOT** source rather than rendered SVG — to feed another tool or render server-side — use `fsl_to_dot` / `machine_to_dot`, or `dot_to_svg` to finish the job yourself.

```js
import { fsl_to_dot } from 'jssm/viz';

const dot = fsl_to_dot(`a 'go' -> b;`);   // 'digraph { … }'
```

The DOT is generated from the same machine you would otherwise render:

```fsl {teaches: viz-dot, run: true}
a 'go' -> b 'go' -> c;
```
