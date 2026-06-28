---
id: tut-viz-version-info
section: tutorials
title: "Viz: version and build info"
order: 106
teaches: [viz-version-info]
mentions: [viz-render]
indexTerms: [version, build_time, viz]
---

# Viz: version and build info

The viz module reports its own `version` and `build_time`, independent of the core package — useful when the renderer is loaded from a CDN separately from the core.

```js
import { version, build_time } from 'jssm/viz';

version;      // the viz build's version
build_time;   // when it was built
```

It renders machines like any other:

```fsl {teaches: viz-version-info, run: true}
a 'go' -> b;
```
