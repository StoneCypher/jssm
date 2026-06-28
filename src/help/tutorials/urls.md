---
id: tut-urls
section: tutorials
title: "URLs"
order: 74
teaches: [urls]
mentions: [state-styling]
indexTerms: [url, link, http, click-through]
---

# URLs

A state can carry a `url` (a double-quoted string). In a rendered SVG it becomes a click-through link on the node — handy for wiring states to docs or dashboards.

```fsl {teaches: urls, run: true}
state Docs : { url: "https://fsl.tools"; };
Home 'help' -> Docs;
```

The URL passes through to Graphviz's `URL=` attribute and surfaces as an `xlink:href` on the SVG node.
