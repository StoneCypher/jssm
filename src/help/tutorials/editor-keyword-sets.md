---
id: tut-editor-keyword-sets
section: tutorials
title: "Editor: keyword classification sets"
order: 114
teaches: [editor-keyword-sets]
mentions: [editor-highlighting]
indexTerms: [keywords, structural, property, enum, editor]
---

# Editor: keyword classification sets

The language support exports the keyword sets it uses to classify tokens — `STRUCTURAL_KEYWORDS`, `PROPERTY_KEYWORDS`, `ENUM_KEYWORDS`, and `DEPRECATED_KEYWORDS` — so tools can reuse the same vocabulary.

```js
import { STRUCTURAL_KEYWORDS, ENUM_KEYWORDS } from 'jssm/cm6';

STRUCTURAL_KEYWORDS.has('state');     // true
ENUM_KEYWORDS.has('doublecircle');    // true
```

These are the words an editor highlights specially in a machine:

```fsl {teaches: editor-keyword-sets, run: true}
state Final : { shape: doublecircle; };
a 'go' -> Final;
```
