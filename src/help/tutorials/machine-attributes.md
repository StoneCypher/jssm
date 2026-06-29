---
id: tut-machine-attributes
section: tutorials
title: "Machine attributes"
order: 25
teaches: [machine-attributes]
mentions: [semver, labels-quoting]
indexTerms: [machine_name, machine_author, fsl_version, theme, metadata]
---

# Machine attributes

Top-level `key : value;` lines attach **metadata** to the machine — its name, author, version, license, theme, and more.

```fsl {teaches: machine-attributes, run: true}
machine_name    : "Traffic Light";
machine_author  : "Jane Doe";
machine_version : 1.2.0;
fsl_version     : 5.0.0;

Red 'tick' -> Green 'tick' -> Yellow 'tick' -> Red;
```

Most attributes are optional. `machine_name` appears in visualizations; `fsl_version` declares the language version the machine targets (see version ranges).
