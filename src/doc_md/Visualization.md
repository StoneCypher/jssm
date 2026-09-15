# Visualization

`jssm-viz` is the visualization package.  It renders state machines
to graphviz dot source or to SVG using
[`@viz-js/viz`](https://www.npmjs.com/package/@viz-js/viz), a WebAssembly
build of Graphviz.

Visualization is its own package in 6.0 — it used to be the `jssm/viz` subpath
of `jssm`, and that subpath is gone.  `import { sm } from 'jssm'` does not pull
in `@viz-js/viz`; visualization is only loaded when you install and import
`jssm-viz`.





&nbsp;

&nbsp;

# Installation

`@viz-js/viz` is declared as an `optionalDependency` of `jssm-viz`.  In nearly
all environments, npm installs it automatically.  `jssm-viz` depends on `jssm`,
so installing it brings the core library along.

```sh
npm install jssm-viz
```

If your platform cannot build `@viz-js/viz`, npm will skip it without failing
the install.  Visualization will throw a clear error at runtime in that case.

For browser-only usage (no npm), `jssm-viz` publishes ready-to-load CDN entries
(see "Browser, script tag" below).





&nbsp;

&nbsp;

# Node — string output

```typescript
import { sm } from 'jssm';
import { fsl_to_svg_string, machine_to_svg_string } from 'jssm-viz';

// from FSL source:
const svg1 = await fsl_to_svg_string('a -> b;');

// from a Machine instance:
const m    = sm`a -> b;`;
const svg2 = await machine_to_svg_string(m);
```

`*_svg_string` returns an SVG XML string suitable for writing to a file,
serving over HTTP, or interpolating into HTML.





&nbsp;

&nbsp;

# Browser, ESM — element output

```html
<script type="module">
  import { sm }                     from 'https://esm.sh/jssm@6';
  import { fsl_to_svg_element }     from 'https://esm.sh/jssm-viz@6';

  const el = await fsl_to_svg_element('a -> b;');
  document.getElementById('chart').appendChild(el);
</script>
```

`fsl_to_svg_element` and `machine_to_svg_element` return a parsed
`SVGSVGElement` you can append directly to the DOM, skipping the
`innerHTML = svg_string` step.





&nbsp;

&nbsp;

# Browser, script tag — with import map

**There is no global (IIFE) build of the visualization layer in 6.0.**  The
`jssm` package used to publish `dist/jssm.es5.iife.js` and
`dist/jssm_viz.iife.cjs`; neither ships from `jssm` any more.  The replacements
are two separate packages:

* the core library as a classic global — `jssm-iife`, whose single artifact is
  `dist/jssm.iife.js` and which attaches the global `jssm`
* the visualization layer — `jssm-viz`, which publishes **ES modules only**,
  including the ready-to-load CDN entries `dist/cdn/viz.js` (registers
  `<fsl-viz>`) and `dist/cdn/instance.js` (registers `<fsl-instance>`)

So a no-tooling page mixes a classic tag for the machine global with a module
tag for the drawing.  Loaded this way, nothing else is needed: esm.sh rewrites
the bare `import('@viz-js/viz')` inside `jssm-viz` into a URL before your page
ever sees it.

```html
<!-- the machine library, as the classic global `jssm` -->
<script src="https://cdn.jsdelivr.net/npm/jssm-iife@6/dist/jssm.iife.js"></script>

<!-- the drawing functions, as a module -->
<script type="module">
  import { fsl_to_svg_string } from 'https://esm.sh/jssm-viz';

  const svg = await fsl_to_svg_string('a -> b;');
  document.getElementById('chart').innerHTML = svg;
</script>
```

If all you want is a rendered machine in markup, skip the functions entirely
and load the custom element straight from the CDN instead.  This entry is a
plain file rather than an esm.sh rewrite, so the page must declare an import
map for it:

```html
<script type="importmap">
  { "imports": { "@viz-js/viz": "https://cdn.jsdelivr.net/npm/@viz-js/viz/+esm" } }
</script>

<script type="module"
        src="https://cdn.jsdelivr.net/npm/jssm-viz@6/dist/cdn/viz.js"></script>

<fsl-viz fsl="a -> b;"></fsl-viz>
```

The import map is what lets `dist/cdn/viz.js` resolve its bare
`import('@viz-js/viz')`.  A module loaded from an ESM CDN such as esm.sh does
not need one — that CDN rewrites the specifier before your page ever sees it.





&nbsp;

&nbsp;

# Node — element output (advanced)

`*_svg_element` requires a `DOMParser`.  In the browser, this is provided
automatically.  In Node, you must inject one — typically from `jsdom`:

```typescript
import { JSDOM }                    from 'jsdom';
import { configure, fsl_to_svg_element } from 'jssm-viz';

configure({ DOMParser: new JSDOM().window.DOMParser });

const el = await fsl_to_svg_element('a -> b;');
// el is a parsed SVGSVGElement
```

Most Node users prefer `fsl_to_svg_string` and skip this step.





&nbsp;

&nbsp;

# API

| Function                    | Returns                       | Notes                                  |
|-----------------------------|-------------------------------|----------------------------------------|
| `fsl_to_dot(fsl)`           | `string`                      | Sync.  Pure dot generation.            |
| `machine_to_dot(machine)`   | `string`                      | Sync.  Pure dot generation.            |
| `dot_to_svg(dot)`           | `Promise<string>`             | Async (WASM init on first call).       |
| `fsl_to_svg_string(fsl)`    | `Promise<string>`             | Async.                                 |
| `machine_to_svg_string(m)`  | `Promise<string>`             | Async.                                 |
| `fsl_to_svg_element(fsl)`   | `Promise<SVGSVGElement>`      | Browser-only by default.               |
| `machine_to_svg_element(m)` | `Promise<SVGSVGElement>`      | Browser-only by default.               |
| `configure(opts)`           | `void`                        | Inject DOMParser; idempotent.          |
