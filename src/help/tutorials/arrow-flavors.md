---
id: tut-arrow-flavors
section: tutorials
title: "Arrow flavors"
order: 64
teaches: [arrow-flavors]
mentions: [transitions]
indexTerms: [arrow, fat arrow, tilde arrow, main, forced, "=>", "~>"]
---

# Arrow flavors

Beyond the plain legal arrow `->`, FSL has arrows that carry *intent*: `=>` is the **main** path (the expected route), and `~>` is a **forced** transition (the machine takes it on its own). Bidirectional forms (`<->`, `<=>`, `<~>`) declare both directions at once.

```fsl {teaches: arrow-flavors, run: true}
Red 'tick' => Green 'tick' => Yellow 'tick' => Red;
Door 'panic' ~> Open;
```

Unicode glyphs (`→`, `⇒`, `↔`) are accepted as synonyms for the ASCII forms, if you prefer them.
