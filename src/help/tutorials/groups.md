---
id: tut-groups
section: tutorials
title: "Groups and named lists"
order: 44
teaches: [groups]
mentions: [states]
indexTerms: [group, named list, "&", set, reusable]
---

# Groups and named lists

A **named list** with `&name : [ … ];` gives a reusable set of states a single handle. It groups states visually and lets you refer to the set by name.

```fsl {teaches: groups, run: true}
&warm : [Red Orange Yellow];
Red 'next' -> Orange 'next' -> Yellow 'next' -> Red;
```

Members are separated by spaces inside the brackets. Groups are how you draw clusters and (in later features) attach shared behaviour.
