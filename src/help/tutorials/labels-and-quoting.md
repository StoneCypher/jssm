---
id: tut-labels-quoting
section: tutorials
title: "Labels and quoting"
order: 8
teaches: [labels-quoting]
mentions: [states, transitions]
indexTerms: [label, string, atom, quote, action]
---

# Labels and quoting

State names and action names are **labels**. A bare label (an *atom*) needs no quotes when it is a Unicode identifier: it starts with a letter or underscore (in any script) and continues with letters, digits, underscores, or combining marks — `Red`, `idle_2`. Everything else — spaces, punctuation, symbols, a leading digit — must be quoted: `"in-progress"`, `"node.start"`, `"1st"`, `"😀"`. The two quote styles mean different things:

- **Single quotes** mark **action labels** — `'insert coin'`.
- **Double quotes** mark **string literals** — used for attributes like `machine_name`.

```fsl {teaches: labels-quoting, run: true}
machine_name : "Vending Machine";
Idle 'insert coin' -> Paid;
Paid 'refund' -> Idle;
```

The quote styles are not interchangeable: single = action, double = string.
