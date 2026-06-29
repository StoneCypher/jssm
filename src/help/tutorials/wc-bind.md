---
id: tut-wc-bind
section: tutorials
title: "Web component: <fsl-bind>"
order: 124
teaches: [wc-bind]
mentions: [wc-instance]
indexTerms: [fsl-bind, binding, data]
---

# Web component: &lt;fsl-bind&gt;

`<fsl-bind>` wires DOM to a hosted machine — reflecting the current state into the page and dispatching actions from it, so plain HTML can drive and read a machine.

```html
<fsl-instance fsl="Off 'flip' -> On 'flip' -> Off;">
  <fsl-bind>
    <button data-fsl-action="flip">Toggle</button>
  </fsl-bind>
</fsl-instance>
```

Behind it is a normal machine:

```fsl {teaches: wc-bind, run: true}
Off 'flip' -> On 'flip' -> Off;
```
