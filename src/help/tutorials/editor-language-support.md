---
id: tut-editor-language-support
section: tutorials
title: "Editor: CodeMirror 6 language support"
order: 110
teaches: [editor-language-support]
mentions: [doc-structure]
indexTerms: [codemirror, cm6, language support, editor]
---

# Editor: CodeMirror 6 language support

The `jssm/cm6` entry provides FSL language support for CodeMirror 6 — `fsl()` returns a `LanguageSupport` extension you drop into an editor.

```js
import { EditorView } from '@codemirror/view';
import { fsl } from 'jssm/cm6';

new EditorView({
  doc: `a 'go' -> b;`,
  extensions: [fsl()],
  parent: document.body,
});
```

It highlights the FSL you type — declarations, attributes, and values:

```fsl {teaches: editor-language-support, run: true}
machine_name : "Demo";
a 'go' -> b;
```
