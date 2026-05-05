# Visualization

`jssm/viz` is the visualization subpath of `jssm`.  It renders state machines
to graphviz dot source or to SVG using
[`@viz-js/viz`](https://www.npmjs.com/package/@viz-js/viz), a WebAssembly
build of Graphviz.

The viz subpath is opt-in: `import { sm } from 'jssm'` does not pull in
`@viz-js/viz`.  Visualization is only loaded when you import from `jssm/viz`.





&nbsp;

&nbsp;

# Installation

`@viz-js/viz` is declared as an `optionalDependency` of jssm.  In nearly all
environments, npm installs it automatically.

```sh
npm install jssm
```

If your platform cannot build `@viz-js/viz`, npm will skip it without failing
the install.  Visualization will throw a clear error at runtime in that case.

For browser-only usage (no npm), the IIFE bundles can be loaded from a CDN
(see "Browser, IIFE" below).





&nbsp;

&nbsp;

# Node — string output

```typescript
import { sm } from 'jssm';
import { fsl_to_svg_string, machine_to_svg_string } from 'jssm/viz';

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
  import { sm }                     from 'https://esm.sh/jssm';
  import { fsl_to_svg_element }     from 'https://esm.sh/jssm/viz';

  const el = await fsl_to_svg_element('a -> b;');
  document.getElementById('chart').appendChild(el);
</script>
```

`fsl_to_svg_element` and `machine_to_svg_element` return a parsed
`SVGSVGElement` you can append directly to the DOM, skipping the
`innerHTML = svg_string` step.





&nbsp;

&nbsp;

# Browser, IIFE — with import map

For classic `<script>`-tag setups, declare an import map in the page so the
dynamic `import('@viz-js/viz')` inside jssm/viz can be resolved:

```html
<script type="importmap">
  { "imports": { "@viz-js/viz": "https://cdn.jsdelivr.net/npm/@viz-js/viz/+esm" } }
</script>

<script src="https://cdn.jsdelivr.net/npm/jssm/dist/jssm.es5.iife.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jssm/dist/jssm_viz.iife.cjs"></script>

<script>
  jssm_viz.fsl_to_svg_string('a -> b;')
    .then(svg => document.getElementById('chart').innerHTML = svg);
</script>
```

The import map is document-scoped; the same map services both classic
script-tag loads and `<script type="module">` loads on the same page.





&nbsp;

&nbsp;

# Node — element output (advanced)

`*_svg_element` requires a `DOMParser`.  In the browser, this is provided
automatically.  In Node, you must inject one — typically from `jsdom`:

```typescript
import { JSDOM }                    from 'jsdom';
import { configure, fsl_to_svg_element } from 'jssm/viz';

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
