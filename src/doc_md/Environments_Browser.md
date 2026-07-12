# The Browser

`jssm` runs in the browser four different ways, and you only need one of them:

1. A classic `<script>` tag from CDN — zero tooling, works in an `.html` file on your desktop
2. A native ES module `import` — modern browsers, still zero tooling
3. A bundler (Vite, webpack, etc) — `import { sm } from 'jssm'` and get on with your day
4. Web components — `<fsl-viz>` and friends, for when you want a rendered machine in markup

If you're not sure which you want, and you just want to try things: use the
first one.  If you're already in a bundled app: use the third one.

This page is about the browser specifically; {@page GettingStarted.md Getting Started}
covers first steps in general, {@page LibraryPackaging.md Library Packaging}
covers what the various builds are, and {@page Environments_Deno.md Deno} is
the sibling page for that runtime.





&nbsp;

&nbsp;

# Script tag from CDN (the "just run already" way)

The IIFE build, `dist/jssm.es5.iife.js`, attaches a single global named `jssm`
when loaded with a plain `<script>` tag.  Both major CDNs carry it:

```html
<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/jssm@5/dist/jssm.es5.iife.js"></script>

<!-- or unpkg -->
<script src="https://unpkg.com/jssm@5/dist/jssm.es5.iife.js"></script>
```

The `@5` pins the major version.  You can pin harder (`jssm@5.162.9`) or not at
all (`jssm`), but unpinned means that a major release years from now silently
changes what your page loads, so, pin at least the major.

For anything past experimentation, prefer a bundler or a self-hosted copy over
a CDN tag.  If a CDN tag does go to production, pin an *exact* version and add
[Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
(`integrity="sha384-..." crossorigin="anonymous"`) so a compromised CDN can't
swap the script under you — note SRI only works with exact-version URLs, since
the hash is of the file's bytes.  The examples on this page omit it because
they float on `@5` for copy-paste freshness.

Here's a complete page you can save as an `.html` file and open — no server,
no build, no install:

```html
<!doctype html>
<html>

  <head>
    <title>Traffic light</title>
    <script src="https://cdn.jsdelivr.net/npm/jssm@5/dist/jssm.es5.iife.js"></script>
  </head>

  <body>

    <p>Current state: <b id="where">-</b></p>
    <button id="step">next</button>

    <script>

      const { sm } = jssm;

      const traffic_light = sm`
        Red 'next' => Green 'next' => Yellow 'next' => Red;
      `;

      const show = () =>
        document.getElementById('where').textContent = traffic_light.state();

      document.getElementById('step').onclick = () => {
        traffic_light.action('next');
        show();
      };

      show();

    </script>

  </body>

</html>
```

Note the first line of script: the IIFE exposes the *module* as the global
`jssm`, not the individual functions.  `sm` lives at `jssm.sm`; destructuring
it once at the top is the tidy way.  (Calling bare `sm` without that line is
the single most common way to get `sm is not defined`.)





&nbsp;

&nbsp;

# Native ES modules (no tooling, modern browsers)

Every browser you're likely to meet now supports `<script type="module">`, and
the ES6 build `dist/jssm.es6.mjs` is fully self-contained — no bare import
specifiers, no import map needed:

```html
<script type="module">

  import { sm } from 'https://cdn.jsdelivr.net/npm/jssm@5/dist/jssm.es6.mjs';

  const traffic_light = sm`Red 'next' => Green 'next' => Yellow 'next' => Red;`;

  traffic_light.action('next');
  console.log(traffic_light.state());   // Green

</script>
```

ESM-flavored CDNs work too, and resolve the package's `exports` map for you:

```html
<script type="module">
  import { sm } from 'https://esm.sh/jssm@5';
</script>
```

Module scripts are always deferred and run in their own scope; if you want to
poke the machine from the developer console, hang it on `window` yourself
(`window.tl = traffic_light;`).





&nbsp;

&nbsp;

# Bundlers (Vite, webpack, Rollup, esbuild, ...)

There is no step three.  `jssm` declares `exports`, `module`, `main`, and
`browser` fields, so every mainstream bundler picks the right build on its own:

```sh
npm install jssm
```

```javascript
import { sm } from 'jssm';

const traffic_light = sm`Red 'next' => Green 'next' => Yellow 'next' => Red;`;
```

TypeScript typings ride along in the package; no `@types/jssm` exists or is
needed.  If you also want visualization, `import from 'jssm/viz'` — it's a
separate subpath precisely so that apps which don't draw graphs don't pay for
Graphviz.  See {@page Visualization.md Visualization}.





&nbsp;

&nbsp;

# Web components (a machine in your markup)

`jssm` ships Lit-based custom elements — canonical names are `fsl-*` — that
render and drive machines with no glue code.  The quickest is `<fsl-viz>`,
which renders FSL source as an SVG graph.  Complete page:

```html
<!doctype html>
<html>

  <head>

    <title>fsl-viz example</title>

    <script type="importmap">
      { "imports": { "@viz-js/viz": "https://cdn.jsdelivr.net/npm/@viz-js/viz@3/lib/viz-standalone.mjs" } }
    </script>

    <script type="module" src="https://cdn.jsdelivr.net/npm/jssm@5/dist/cdn/viz.js"></script>

  </head>

  <body>
    <fsl-viz fsl="Red 'next' => Green 'next' => Yellow 'next' => Red;"></fsl-viz>
  </body>

</html>
```

The import map is *required*: the component lazily `import`s `@viz-js/viz`
(the WebAssembly build of Graphviz) the first time it renders, and the bare
specifier `@viz-js/viz` only resolves in a browser if an import map says where
it lives.  Forget the map and you get a resolution error on first render, not
on page load.

Under a bundler instead, it's a side-effect import:

```javascript
import 'jssm/wc/viz/define';   // registers <fsl-viz>
```

There is also `<fsl-instance>` (a full machine workspace element, loaded from
`dist/cdn/instance.js` or `jssm/wc/instance/define`), plus editor, widgets,
and docs panels.  The whole component family — properties, events, slots,
trace highlighting — is documented in {@page WebComponents.md Web Components}.





&nbsp;

&nbsp;

# Visualization without components

If you want SVG strings or elements rather than a custom element — say, to
place the graph in your own layout — the `jssm/viz` subpath works in the
browser too, in both ESM and script-tag styles.  The same `@viz-js/viz`
import-map requirement applies to script-tag setups.  Worked examples for
both are in {@page Visualization.md Visualization}.





&nbsp;

&nbsp;

# Troubleshooting

* **`sm is not defined`** — with the classic script tag, the global is the
  module object `jssm`, so it's `jssm.sm`, or `const { sm } = jssm;` once at
  the top.

* **`Failed to resolve module specifier "@viz-js/viz"`** — you rendered a viz
  component (or called a `*_to_svg_*` function) without the import map.  Add
  the `<script type="importmap">` block shown above; it's document-scoped, so
  one map serves everything on the page.

* **Rendering is async** — the first graph render initializes a WebAssembly
  Graphviz, so `fsl_to_svg_string` and friends return Promises, and `<fsl-viz>`
  paints a beat after the page does.  Machine *logic* (`sm`, `.action()`,
  `.state()`, hooks) is fully synchronous; only drawing waits.

* **The `.mjs` build needs `type="module"`** — loading `jssm.es6.mjs` from a
  plain `<script>` tag fails on its `import`/`export` syntax.  Classic tags
  get the IIFE; module tags get the `.mjs`.

* **`<jssm-viz>` still works but shouldn't be in new code** — the `jssm-*`
  element names are deprecated synonyms, removed in v6.  Write `fsl-*`.
