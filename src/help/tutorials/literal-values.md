---
id: tut-literal-values
section: tutorials
title: "Literal values"
order: 48
teaches: [literal-values]
mentions: [single-value-configs]
indexTerms: [true, false, null, undefined, boolean]
---

# Literal values

A few configuration keys take literal values rather than labels: booleans (`true` / `false`), `null`, and `undefined`. They appear in the on/off-style config keys.

```fsl {teaches: literal-values, run: true}
allows_override : true;
allow_islands   : false;
a 'go' -> b;
```

These are the same literals you would recognise from JavaScript — `true`/`false` toggle a feature, and `undefined` leaves it at its default.
