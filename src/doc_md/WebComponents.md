# Web Components

`jssm` exposes web-component versions of its visualization layer for direct use in plain HTML or for wrapping by any framework. This page covers the first shipped widget, `<jssm-viz>` (also available under the synonym tag `<fsl-viz>` — both render identically). Additional widgets (`<jssm-editor>`, `<jssm-playground>`) follow in later releases.

## Quick start — CDN

For static HTML pages with no build step:

```html
<script type="importmap">
  { "imports": { "@viz-js/viz": "https://cdn.jsdelivr.net/npm/@viz-js/viz@3/lib/viz-standalone.mjs" } }
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/jssm/dist/cdn/viz.js"></script>

<jssm-viz fsl="Off -> On -> Off;"></jssm-viz>
```

The import map is required so that `<jssm-viz>`'s dynamic import of `@viz-js/viz` resolves in the browser. Hosting providers other than jsDelivr work identically — substitute the base URL.

## Quick start — npm

```bash
npm install jssm lit
```

Side-effect import that registers the tag:

```ts
import 'jssm/wc/viz/define';
```

Then anywhere in your markup (`<fsl-viz>` is a synonym that renders identically):

```html
<jssm-viz fsl="Off -> On -> Off;"></jssm-viz>
<fsl-viz  fsl="Off -> On -> Off;"></fsl-viz>
```

## Class export — rename or subclass

To register the class under a different tag name, or to subclass it:

```ts
import { JssmViz } from 'jssm/wc/viz';
import { css } from 'lit';

customElements.define('my-fsl-viz', class extends JssmViz {
  static styles = [
    super.styles,
    css`:host { background: #111; }`,
  ];
});
```

The class export has no side effects — importing it does not register any tag.

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `fsl` | `string` | `''` | FSL source to render. Changing this re-renders the SVG. |
| `engine` | `string \| undefined` | `undefined` | Optional Graphviz layout engine override (e.g. `'dot'`, `'neato'`, `'circo'`). |

## Events

| Event | Detail | Description |
|---|---|---|
| `viz-error` | `{ message: string; location?: unknown }` | Fired when the FSL source fails to parse or render. Bubbles and crosses shadow boundaries. |

## CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--jssm-viz-min-height` | `100px` | Minimum height of the rendered SVG container. |

## See also

- `jssm/viz` headless API — same rendering pipeline, no shadow DOM. Use when wiring SVG into a custom layout.
- `custom-elements.json` at the package root — full programmatic description of every web component for use by framework-wrapper generators.
