---
id: tut-config-blocks
section: tutorials
title: "Configuration blocks"
order: 50
teaches: [config-blocks]
mentions: [state-styling]
indexTerms: [config, state defaults, transition defaults, graph]
---

# Configuration blocks

A `keyword : { … };` block sets **defaults** for a whole class of things at once — every state, every transition (edge), or the graph as a whole — instead of styling each one inline.

```fsl {teaches: config-blocks, run: true}
state : {
  background-color : WhiteSmoke;
};
transition : {
  color : SlateGray;
};
a 'go' -> b 'go' -> a;
```

The block forms are `state`, `start_state`, `end_state`, `active_state`, `terminal_state`, `hooked_state`, `transition`, and `graph`. They accept the same style vocabulary as a per-state block.
