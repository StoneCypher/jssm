---
id: tut-editor-highlighting
section: tutorials
title: "Editor: syntax highlighting"
order: 112
teaches: [editor-highlighting]
mentions: [editor-language-support]
indexTerms: [highlight, syntax color, deprecated marker, editor]
---

# Editor: syntax highlighting

`fslHighlightStyle` is the highlight style the language support uses; `fslDeprecated` is a token modifier that marks deprecated keywords so an editor can grey them out.

```js
import { fslHighlightStyle } from 'jssm/cm6';
import { syntaxHighlighting } from '@codemirror/language';

const extensions = [ syntaxHighlighting(fslHighlightStyle) ];
```

The highlighter colours the parts of a machine differently — keywords, state names, values:

```fsl {teaches: editor-highlighting, run: true}
state Go : { shape: doublecircle; };
Stop 'go' -> Go;
```
