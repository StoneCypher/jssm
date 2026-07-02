---
id: tut-colors
section: tutorials
title: "Colors"
order: 40
teaches: [colors]
mentions: [state-styling]
indexTerms: [color, svg color, hex, background-color]
---

# Colors

Anywhere a color is expected you can use a **PascalCase SVG color name** (the canonical form) or a `#rrggbb` **hex** value. The lowercase form (`forestgreen`) also parses, but PascalCase is preferred.

```fsl {teaches: colors, run: true}
state Go   : { color: ForestGreen; };
state Stop : { color: #b91c1c; };
Stop 'go' -> Go 'stop' -> Stop;
```

The same color vocabulary is used for `color`, `background-color`, `border-color`, and the graph defaults.
