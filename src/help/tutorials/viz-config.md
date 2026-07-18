---
id: tut-viz-config
section: tutorials
title: "Viz: render configuration"
order: 104
teaches: [viz-config]
mentions: [viz-render]
indexTerms: [configure, render options, groups, viz]
---

# Viz: render configuration

`configure` sets global render defaults, and the `VizRenderOpts` / `RenderGroups` types let you tune a single render — engine choice, group rendering, and more.

```js
import { configure, fsl_to_svg_string } from 'jssm/viz';

configure({ /* global defaults */ });
const svg = await fsl_to_svg_string(`a -> b;`, { /* VizRenderOpts */ });
```

Render options shape how a machine like this is drawn without changing the FSL:

```fsl {teaches: viz-config, run: true}
graph_layout : circo;
a 'go' -> b;
```
