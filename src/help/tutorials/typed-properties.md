---
id: tut-typed-properties
section: tutorials
title: "State properties"
order: 76
teaches: [typed-properties]
mentions: [machine-attributes]
indexTerms: [property, state property, extended state, value]
---

# State properties

A state can carry **properties** — named values attached to it — with `property: <name> <value>;` inside its declaration. Add `required` to mark one mandatory.

```fsl {teaches: typed-properties, run: true}
state Account : { property: balance 100; };
Open 'deposit' -> Account;
```

Properties are how a state carries data beyond its name — the seed of FSL's extended-state model.
