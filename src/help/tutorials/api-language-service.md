---
id: tut-api-language-service
section: tutorials
title: "API: the language service"
order: 92
teaches: [api-language-service]
mentions: [api-machine, editor-language-support]
indexTerms: [fslCompletions, fslDiagnostics, fslSemanticSpans, language service, API]
---

# API: the language service

For building editors, the language-service exports turn FSL text into editor primitives: `fslCompletions` (context-aware suggestions), `fslDiagnostics` (parse/compile errors), and `fslSemanticSpans` (token spans for highlighting).

```js
import { fslDiagnostics, fslCompletions } from 'jssm';

fslDiagnostics('a -> ');          // reports the parse error
fslCompletions('machine_', 8);    // suggests machine_name, machine_author, …
```

They operate on raw FSL source, the same text you would otherwise compile:

```fsl {teaches: api-language-service, run: true}
machine_name : "Sample";
a 'go' -> b;
```
