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

Select the tonal state-card renderer directly in your source:

```fsl {teaches: viz-config, run: true}
graph_layout: tonal;
a 'go' -> b;
```

This also works in the chart component and CLI exports. JavaScript callers can
override the source choice with `{ provider: 'tonal' }` or
`{ provider: 'graphviz' }`. Tonal uses `dot` geometry by default; an explicit
`engine` option changes the geometry without changing its appearance.
Optional `tonal.states`
annotations add descriptions, monospace action names and icons without changing
the machine. See `examples/tonal-rendering.md` and the runnable
`examples/tonal-traffic-light.mjs` example. Custom application providers can
implement the exported `VizRenderProvider` interface.
