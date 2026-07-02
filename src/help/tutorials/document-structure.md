---
id: tut-document-structure
section: tutorials
title: "Document structure"
order: 2
teaches: [doc-structure]
mentions: [transitions]
indexTerms: [document, statement, term, semicolon]
---

# Document structure

An FSL file is a flat list of **statements**, each ended with a semicolon. Order rarely matters — transitions, state declarations, and machine attributes can appear in any sequence.

```fsl {teaches: doc-structure, run: true}
machine_name : "Tiny";
a 'go' -> b;
b 'go' -> a;
```

Whitespace and blank lines are free. That is the whole shape of a document: statements, separated by semicolons.
