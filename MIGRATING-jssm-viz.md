# Migrating from `jssm-viz` to `jssm/viz`

Starting with **jssm 5.109.0**, the visualization library `jssm-viz` is part
of `jssm` itself, exposed as the `jssm/viz` subpath.

The standalone `jssm-viz` package is deprecated.  It will continue to work
(via a thin shim that re-exports from `jssm/viz`) but receive no further
updates.





## TL;DR

Change every:

```typescript
import { fsl_to_svg_string } from 'jssm-viz';
```

to:

```typescript
import { fsl_to_svg_string } from 'jssm/viz';
```

That is the entire required change.  The function signatures are unchanged.





## What's new in `jssm/viz`

### `fsl_to_svg_element` and `machine_to_svg_element`

Returns a parsed `SVGSVGElement` directly instead of a string, skipping the
`innerHTML = svg_string` step.  Browser-only by default; in Node, requires
`configure({ DOMParser })`.

```typescript
import { fsl_to_svg_element } from 'jssm/viz';

const el = await fsl_to_svg_element('a -> b;');
document.getElementById('chart').appendChild(el);
```

### `configure(opts)`

Optional one-time configuration entry point.  Currently accepts a custom
`DOMParser` constructor for Node + jsdom usage of `*_svg_element`.





## Under the hood

The visualization engine has been upgraded from `viz.js@2.1.2` (2018) to
`@viz-js/viz@3.x` (current).  The new engine is ESM-native, has its own
TypeScript types, does not pollute window globals, and renders synchronously
after a one-time WASM initialization.  Existing `*_svg_string` functions
still return promises — only the internal cold-start is async.

If you reached into `jssm-viz` internals (anything not in the documented
API), those internals have changed.  The supported public API is unchanged.
