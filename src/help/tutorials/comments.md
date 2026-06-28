---
id: tut-comments
section: tutorials
title: "Comments"
order: 4
teaches: [comments]
mentions: []
indexTerms: [comment, line comment, block comment]
---

# Comments

FSL has line comments (`//` to end of line) and block comments (`/* … */`), just like C or JavaScript.

```fsl {teaches: comments, run: true}
// a one-line note
a 'go' -> b;
/* a block comment
   spanning lines */
b 'go' -> a;
```

Comments are ignored by the parser — use them freely to annotate intent.
