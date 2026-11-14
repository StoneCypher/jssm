---
id: tut-single-value-configs
section: tutorials
title: "Single-value configuration"
order: 52
teaches: [single-value-configs]
mentions: [config-blocks]
indexTerms: [graph_layout, graph_renderer, allow_islands, allows_override, failed_outputs]
---

# Single-value configuration

Some settings are a single `key : value;` rather than a block — graph layout, renderer, island rules, override permission, and similar machine-wide switches.

```fsl {teaches: single-value-configs, run: true}
graph_layout   : circo;
graph_renderer : tonal;
allow_islands  : false;
a 'go' -> b;
```

`graph_layout` chooses the Graphviz geometry engine (`dot`, `circo`, `fdp`, `neato`, `twopi`); `graph_renderer` chooses what draws on that geometry — `graphviz` (the default) or `tonal` state cards, or any renderer a page has registered, quoted if its name isn't a bare identifier (`graph_renderer: "my cards";`); `allow_islands` controls whether disconnected components are permitted.
