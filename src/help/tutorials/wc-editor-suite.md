---
id: tut-wc-editor-suite
section: tutorials
title: "Web component: the editor suite"
order: 128
teaches: [wc-editor-suite]
mentions: [wc-instance, editor-language-support]
indexTerms: [fsl-editor, fsl-help, fsl-docs, toolbar, web component suite]
---

# Web component: the editor suite

The `fsl-*` editor suite composes a full editing surface: `<fsl-editor>` (a CodeMirror FSL editor), `<fsl-toolbar>`, `<fsl-footer>`, `<fsl-help>` (a docs drawer), and `<fsl-docs>` (this very curriculum, as a component), among others.

```html
<fsl-editor fsl="a 'go' -> b;"></fsl-editor>
<fsl-help open>
  <fsl-docs></fsl-docs>
</fsl-help>
```

`<fsl-editor>` edits machines like:

```fsl {teaches: wc-editor-suite, run: true}
machine_name : "Edit me";
a 'go' -> b 'go' -> a;
```
