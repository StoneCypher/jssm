---
id: tut-viz-render
section: tutorials
title: "Viz: rendering to SVG"
order: 100
teaches: [viz-render]
mentions: [api-machine]
indexTerms: [svg, render, visualize, diagram, viz]
---

# Viz: rendering to SVG

The `jssm/viz` entry turns a machine (or FSL string) into an SVG diagram: `fsl_to_svg_string`, `fsl_to_svg_element`, `machine_to_svg_string`, `machine_to_svg_element`.

```js
import { fsl_to_svg_string } from 'jssm/viz';

const svg = await fsl_to_svg_string(`Red 'go' -> Green 'go' -> Red;`);
document.body.insertAdjacentHTML('beforeend', svg);
```

Any machine renders — the styling you write in FSL flows straight through to the SVG:

```fsl {teaches: viz-render, run: true}
state Go : { color: ForestGreen; };
Stop 'go' -> Go 'stop' -> Stop;
```
