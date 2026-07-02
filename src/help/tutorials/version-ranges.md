---
id: tut-semver
section: tutorials
title: "Version ranges (SemVer)"
order: 54
teaches: [semver]
mentions: [machine-attributes]
indexTerms: [semver, version, fsl_version, range]
---

# Version ranges (SemVer)

`fsl_version` declares which FSL language version a machine targets, as a SemVer value. A plain version pins exactly; the comparison operators (`<`, `>`, `<=`, `>=`) express a range.

```fsl {teaches: semver, run: true}
fsl_version : 5.2.0;
a 'go' -> b;
```

Pinning `fsl_version` lets tooling warn when a machine relies on syntax newer than the runtime it is loaded into.
