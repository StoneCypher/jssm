---
id: tut-viz-config
section: tutorials
title: "Viz: render configuration"
order: 104
teaches: [viz-config]
mentions: [viz-render]
indexTerms: [configure, render options, groups, viz, renderer, register_renderer]
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

Select the tonal state-card renderer directly in your source with
`graph_renderer`. `graph_layout` still picks the geometry underneath it:

```fsl {teaches: viz-config, run: true}
graph_renderer: tonal;
graph_layout: circo;
a 'go' -> b;
```

This also works in the chart component and CLI exports. JavaScript callers can
override the source choice with `{ provider: 'tonal' }` or
`{ provider: 'graphviz' }`, and an explicit `engine` option overrides
`graph_layout` without changing the appearance. Optional `tonal.states`
annotations add descriptions, monospace action names and icons without changing
the machine. See `examples/tonal-rendering.md` and the runnable
`examples/tonal-traffic-light.mjs` example.

Your own renderers implement the exported `VizRenderProvider` interface. Pass
one directly as `provider`, or register it once so FSL, `provider: '<name>'`
and the `<fsl-viz provider="…">` attribute can choose it by name:

```js
import { register_renderer, fsl_to_svg_string } from 'jssm-viz';

register_renderer({
  name: 'framed',
  render: async ctx => {
    const svg = await ctx.render_dot(ctx.to_dot(), 'svg');
    return svg.replace('<svg ', '<svg class="framed" ');
  }
});

const svg = await fsl_to_svg_string('graph_renderer: framed; a -> b;');
```

The `provider` option wins, then the machine's `graph_renderer`, then
`graphviz`. An unregistered name fails the render with an error naming it and
listing `renderer_names()`. A taken name throws unless you pass
`{ replace: true }`, and the built-ins `graphviz` and `tonal` can't be
replaced or unregistered.
