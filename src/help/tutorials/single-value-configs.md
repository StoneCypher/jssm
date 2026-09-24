---
id: tut-single-value-configs
section: tutorials
title: "Single-value configuration"
order: 52
teaches: [single-value-configs]
mentions: [config-blocks]
indexTerms: [graph_layout, allow_islands, allows_override, failed_outputs]
---

# Single-value configuration

Some settings are a single `key : value;` rather than a block — graph layout, island rules, override permission, and similar machine-wide switches.

```fsl {teaches: single-value-configs, run: true}
graph_layout  : circo;
allow_islands : false;
a 'go' -> b;
```

`graph_layout` chooses a renderer: a Graphviz engine (`dot`, `circo`, `fdp`, `neato`, `twopi`) or `tonal`, which draws state cards using `dot` geometry; `allow_islands` controls whether disconnected components are permitted.
