---
id: tut-wc-panels
section: tutorials
title: "Web component: inspector panels"
order: 126
teaches: [wc-panels]
mentions: [wc-instance]
indexTerms: [fsl-info-panel, fsl-effective-properties, inspector, panel]
---

# Web component: inspector panels

The inspector panels read a hosted machine and show its internals: `<fsl-info-panel>` (current state, available actions) and `<fsl-effective-properties>` (the resolved properties of the active state).

```html
<fsl-instance fsl="Idle 'start' -> Running 'stop' -> Idle;">
  <fsl-info-panel></fsl-info-panel>
  <fsl-effective-properties></fsl-effective-properties>
</fsl-instance>
```

They inspect a machine such as:

```fsl {teaches: wc-panels, run: true}
Idle 'start' -> Running 'stop' -> Idle;
```
