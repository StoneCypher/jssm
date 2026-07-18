---
id: tut-wc-instance
section: tutorials
title: "Web component: <fsl-instance>"
order: 122
teaches: [wc-instance]
mentions: [wc-viz, api-machine]
indexTerms: [fsl-instance, interactive, live machine]
---

# Web component: &lt;fsl-instance&gt;

`<fsl-instance>` hosts a *live* machine. Nested viz/panel components bind to it automatically, and it drives transitions — an interactive machine on the page.

```html
<fsl-instance fsl="Off 'flip' -> On 'flip' -> Off;">
  <fsl-viz></fsl-viz>
</fsl-instance>
```

The hosted machine is ordinary FSL:

```fsl {teaches: wc-instance, run: true}
Off 'flip' -> On 'flip' -> Off;
```
