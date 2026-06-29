---
id: tut-api-version-info
section: tutorials
title: "API: version and build info"
order: 82
teaches: [api-version-info]
mentions: [api-machine]
indexTerms: [version, build_time, compareVersions, API]
---

# API: version and build info

The package exports its own `version` and `build_time`, plus `compareVersions` for ordering SemVer strings.

```js
import { version, build_time, compareVersions } from 'jssm';

version;                          // e.g. '5.149.2'
compareVersions('5.2.0', '5.10.0'); // -1  (5.2.0 is older)
```

This is the same machinery `fsl_version` ranges lean on:

```fsl {teaches: api-version-info, run: true}
fsl_version : 5.0.0;
a 'go' -> b;
```
