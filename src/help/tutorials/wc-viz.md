---
id: tut-wc-viz
section: tutorials
title: "Web component: <fsl-viz>"
order: 120
teaches: [wc-viz]
mentions: [viz-render]
indexTerms: [fsl-viz, web component, custom element, diagram]
---

# Web component: &lt;fsl-viz&gt;

`<fsl-viz>` renders a machine as a diagram with zero JavaScript — set its `fsl` attribute and it draws.

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/jssm-viz@6/dist/cdn/viz.js"></script>

<fsl-viz fsl="Red 'go' -> Green 'go' -> Red;"></fsl-viz>
```

Whatever FSL you give it renders, styling and all:

```fsl {teaches: wc-viz, run: true}
state Go : { color: ForestGreen; };
Stop 'go' -> Go;
```

The CDN module also exports the renderer registry that its `<fsl-viz>` reads,
so a page with no build step can add its own renderer and have FSL name it
with `graph_renderer`:

```html
<script type="module">
  import { register_renderer } from 'https://cdn.jsdelivr.net/npm/jssm-viz@6/dist/cdn/viz.js';

  register_renderer({
    name: 'framed',
    render: async ctx => (await ctx.render_dot(ctx.to_dot(), 'svg')).replace('<svg ', '<svg class="framed" ')
  });
</script>

<fsl-viz fsl="graph_renderer: framed; Red 'go' -> Green 'go' -> Red;"></fsl-viz>
```

(The `<jssm-viz>` tag was removed in 6.0 — use `<fsl-viz>`.)
