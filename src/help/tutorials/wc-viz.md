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
<script type="module" src="https://unpkg.com/jssm/dist/cdn/viz.js"></script>

<fsl-viz fsl="Red 'go' -> Green 'go' -> Red;"></fsl-viz>
```

Whatever FSL you give it renders, styling and all:

```fsl {teaches: wc-viz, run: true}
state Go : { color: ForestGreen; };
Stop 'go' -> Go;
```

(The `<jssm-viz>` tag was removed in 6.0 — use `<fsl-viz>`.)
