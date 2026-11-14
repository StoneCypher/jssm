# Migrating from `jssm/viz` to `jssm-viz`

In **jssm 6.0** the visualizer moved out of `jssm` and into its own package,
`jssm-viz`.  The `jssm` package no longer exports `jssm/viz`, the
`jssm/wc/*` web components, or the `jssm/cdn/*` bundles.  They all live in
`jssm-viz` now.

This is the reverse of the 5.109 change.  That history is kept at the bottom
of this page.

For every other 5 → 6 change, see [MIGRATING-5-to-6.md](MIGRATING-5-to-6.md).





## TL;DR

Install the package:

```
npm install jssm-viz
```

Use `jssm-viz` 6.x with `jssm` 6.x.  It is the real visualizer again, not the
5.x shim that re-exported `jssm/viz`.

Then change every:

```typescript
import { fsl_to_svg_string } from 'jssm/viz';
```

to:

```typescript
import { fsl_to_svg_string } from 'jssm-viz';
```

The exported names are the same.  Only the import path changes.





## Every path that moved

Each 5.x subpath of `jssm` has the same subpath under `jssm-viz`:

| 5.x | 6.0 |
|---|---|
| `import … from 'jssm/viz'` | `import … from 'jssm-viz'` |
| `require('jssm/viz')` | `require('jssm-viz')` |
| `import 'jssm/wc/viz/define'` | `import 'jssm-viz/wc/viz/define'` |
| `jssm/wc/instance`, `jssm/wc/editor`, `jssm/wc/widgets`, `jssm/wc/docs` (and their `/define`) | `jssm-viz/wc/instance`, `jssm-viz/wc/editor`, `jssm-viz/wc/widgets`, `jssm-viz/wc/docs` (and their `/define`) |
| `jssm/cdn/viz`, `jssm/cdn/instance` | `jssm-viz/cdn/viz`, `jssm-viz/cdn/instance` |
| `jssm/custom-elements.json` | `jssm-viz/custom-elements.json` |

Your machines still come from `jssm`:

```typescript
import { sm }                from 'jssm';
import { fsl_to_svg_string } from 'jssm-viz';

const svg = await fsl_to_svg_string('a -> b;');
```





## CDN and web components

The CDN script moves to the `jssm-viz` package.  Keep your import map for
`@viz-js/viz` as before.

```html
<!-- 5.x -->
<script type="module" src="https://cdn.jsdelivr.net/npm/jssm@5/dist/cdn/viz.js"></script>
<jssm-viz fsl="Off -> On -> Off;"></jssm-viz>

<!-- 6.0 -->
<script type="module" src="https://cdn.jsdelivr.net/npm/jssm-viz@6/dist/cdn/viz.js"></script>
<fsl-viz fsl="Off -> On -> Off;"></fsl-viz>
```

The tag is `<fsl-viz>` now, not `<jssm-viz>`.  That rename is a separate 6.0
break: every `jssm-*` tag, `data-jssm-*` attribute and `--jssm-viz-*` CSS
property became `fsl-*`.  See "Web components drop the jssm- prefix
entirely" in [MIGRATING-5-to-6.md](MIGRATING-5-to-6.md).





## History: the 5.109 move into `jssm/viz`

*This section describes jssm 5.x only.  It is kept as a record; in 6.0 the
move was undone, as described above.*

### Migrating from `jssm-viz` to `jssm/viz`

Starting with **jssm 5.109.0**, the visualization library `jssm-viz` is part
of `jssm` itself, exposed as the `jssm/viz` subpath.

The standalone `jssm-viz` package is deprecated.  It will continue to work
(via a thin shim that re-exports from `jssm/viz`) but receive no further
updates.



#### TL;DR

Change every:

```typescript
import { fsl_to_svg_string } from 'jssm-viz';
```

to:

```typescript
import { fsl_to_svg_string } from 'jssm/viz';
```

That is the entire required change.  The function signatures are unchanged.



#### What's new in `jssm/viz`

##### `fsl_to_svg_element` and `machine_to_svg_element`

Returns a parsed `SVGSVGElement` directly instead of a string, skipping the
`innerHTML = svg_string` step.  Browser-only by default; in Node, requires
`configure({ DOMParser })`.

```typescript
import { fsl_to_svg_element } from 'jssm/viz';

const el = await fsl_to_svg_element('a -> b;');
document.getElementById('chart').appendChild(el);
```

##### `configure(opts)`

Optional one-time configuration entry point.  Currently accepts a custom
`DOMParser` constructor for Node + jsdom usage of `*_svg_element`.



#### Under the hood

The visualization engine has been upgraded from `viz.js@2.1.2` (2018) to
`@viz-js/viz@3.x` (current).  The new engine is ESM-native, has its own
TypeScript types, does not pollute window globals, and renders synchronously
after a one-time WASM initialization.  Existing `*_svg_string` functions
still return promises — only the internal cold-start is async.

If you reached into `jssm-viz` internals (anything not in the documented
API), those internals have changed.  The supported public API is unchanged.
