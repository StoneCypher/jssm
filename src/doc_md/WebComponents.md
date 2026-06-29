# Web Components

`jssm` exposes web-component versions of its visualization layer for direct use in plain HTML or for wrapping by any framework. This page covers the first shipped widget, `<fsl-viz>`. Additional widgets (`<fsl-editor>`, `<fsl-playground>`) follow in later releases.

> **Tag names:** `fsl-*` is the canonical spelling (e.g. `<fsl-viz>`, class `FslViz`). The `jssm-*` tags (`<jssm-viz>`, `<jssm-instance>`, `<jssm-bind>`) and `Jssm*` class names are **deprecated as of v5** — for fsl.tools brand alignment — and **slated for removal in v6**. They remain fully functional aliases until then; migrate to `fsl-*` when convenient. Components introduced after the rename (the `<fsl-instance>` panels, etc.) are **`fsl-*`-only** — no `jssm-*` alias is minted for them.

## Quick start — CDN

For static HTML pages with no build step:

```html
<script type="importmap">
  { "imports": { "@viz-js/viz": "https://cdn.jsdelivr.net/npm/@viz-js/viz@3/lib/viz-standalone.mjs" } }
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/jssm/dist/cdn/viz.js"></script>

<fsl-viz fsl="Off -> On -> Off;"></fsl-viz>
```

The import map is required so that `<fsl-viz>`'s dynamic import of `@viz-js/viz` resolves in the browser. Hosting providers other than jsDelivr work identically — substitute the base URL.

## Quick start — npm

```bash
npm install jssm lit
```

Side-effect import that registers the tag:

```ts
import 'jssm/wc/viz/define';
```

Then anywhere in your markup:

```html
<fsl-viz fsl="Off -> On -> Off;"></fsl-viz>
```

The `<jssm-viz>` alias is also accepted and renders identically, but is deprecated (removed in v6).

## Class export — rename or subclass

To register the class under a different tag name, or to subclass it:

```ts
import { FslViz } from 'jssm/wc/viz';
import { css } from 'lit';

customElements.define('my-fsl-viz', class extends FslViz {
  static styles = [
    super.styles,
    css`:host { background: #111; }`,
  ];
});
```

The class export has no side effects — importing it does not register any tag. `JssmViz` is also exported as a deprecated alias for `FslViz` (removed in v6).

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

## Methods — programmatic trace highlighting

`<fsl-viz>` exposes two imperative methods for spotlighting an execution path through the rendered graph — useful for stepping a trace, animating a counterexample, or drawing attention to one route.

| Method | Description |
|---|---|
| `highlightTrace(trace, options?)` | Highlights the path named by `trace` — an ordered array of state names (e.g. `['a', 'b', 'c']`), whose consecutive pairs select the edges `a→b` and `b→c`. By default everything off the path is dimmed. An empty `trace` is a no-op. |
| `clearHighlights()` | Removes all highlighting, restoring the default rendering. |

`options` is a `HighlightOptions` object:

| Option | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | `'#b71c1c'` | Stroke/fill colour for the highlighted nodes and edges. |
| `fadeOthers` | `boolean` | `true` | When `true`, dims every node and edge *not* on the trace to `opacity: 0.2`. Set `false` to highlight without fading the rest. |

```javascript
const viz = document.querySelector('fsl-viz');

// Spotlight a → b → c in green, without dimming the rest of the graph:
viz.highlightTrace(['a', 'b', 'c'], { color: '#2e7d32', fadeOthers: false });

// Later, restore the default rendering:
viz.clearHighlights();
```

The highlight is applied as inline style overrides and transitions smoothly via CSS; `clearHighlights()` removes exactly those overrides, leaving the graph's own styling intact.

## `<fsl-instance>` — the workspace composition root

`<fsl-instance>` owns a single machine built from its FSL source and exposes it to slotted
sub-components (`<fsl-viz>`, and the panels that follow) and to outside consumers. It is additive —
`<fsl-viz>` keeps working standalone; `<fsl-instance>` is the larger composite.

Provide FSL through exactly one of three channels (supplying more than one throws):

```html
<!-- 1. attribute -->
<fsl-instance fsl="red -> green -> yellow -> red;"></fsl-instance>

<!-- 2. <script type="text/fsl"> child (best for FSL with < or & characters) -->
<fsl-instance>
  <script type="text/fsl">
    a 'b' -> c;
    c [color=red] -> a;
  </script>
</fsl-instance>

<!-- 3. text content -->
<fsl-instance>Off -> On -> Off;</fsl-instance>
```

### Customizing — which mechanism do I want?

`<fsl-instance>` exposes five orthogonal customization planes. Pick by what you're trying to do:

| You want to… | Use | Plane |
|---|---|---|
| Style by state with **CSS only** | **1.** host attributes | `fsl-instance[current-state="red"] { … }` |
| Show **different content per state, no JS** | **2.** state-named slots | `<div slot="state-red">…</div>` |
| Theme a value that changes with state | **3.** CSS custom property | `var(--current-state)` |
| Run **JS when state changes** | **4.** DOM events | `el.addEventListener('fsl-transition', …)` |
| **Drive** the machine from outside | **5.** imperative API | `el.machine`, `el.do()`, `el.state()` |

#### 1 — State reflected to host attributes

On every transition the element writes its own attributes, so consumer CSS can key off them with no JS:

```css
fsl-instance[current-state="red"]   [slot="banner"] { background: crimson; }
fsl-instance[terminal]              [slot="banner"]::after { content: " (done)"; }
```

| Attribute | Value |
|---|---|
| `current-state` | The current state name. |
| `legal-actions` | Space-separated list of currently-legal action names. |
| `terminal` | Present (boolean) when the current state has no exits. |
| `complete` | Present (boolean) when the current state is a `complete` state. |

#### 2 — State-named slots

The element projects a `state-<name>` slot for the current state, re-targeting on each transition:

```html
<fsl-instance fsl="red -> green -> yellow -> red;">
  <div slot="state-red">Stop. Wait for green.</div>
  <div slot="state-green">Proceed.</div>
  <div slot="state-yellow">Prepare to stop.</div>
</fsl-instance>
```

#### 3 — CSS custom property

The element sets `--current-state` (the state name as a CSS token) on itself; it inherits through slots:

```css
[slot="indicator"] { content: var(--current-state); }
```

#### 4 — DOM custom events

The element bridges the library's `machine.on(...)` events to DOM `CustomEvent`s named `fsl-<event>`.
Every event **bubbles** and is **`composed`** (crosses shadow boundaries), and its `detail` is the
library event payload verbatim:

```js
document.querySelector('fsl-instance')
  .addEventListener('fsl-transition', e => {
    // e.detail === { from, to, action, data, next_data, trans_type, forced }
    status.textContent = `${e.detail.from} -> ${e.detail.to} via ${e.detail.action}`;
  });
```

Emitted events: `fsl-transition`, `fsl-entry`, `fsl-exit`, `fsl-terminal`, `fsl-complete`,
`fsl-action`, `fsl-rejection`, `fsl-override`, `fsl-data-change`, `fsl-timeout`, `fsl-error`.

> **Naming:** events use the canonical `fsl-` prefix only (not a `jssm-` synonym) — a symmetric
> listener would otherwise run twice per machine event.

**Ordering guarantee.** A `fsl-*` listener runs *after* the element has committed its render, so
mechanism 1 (attributes), 2 (state slot), and 3 (`--current-state`) are all current when your handler
fires — reading `el.getAttribute('current-state')` inside a `fsl-transition` handler returns the new
state, never the old one.

**Re-entrancy.** A handler may synchronously drive the machine again (e.g. `el.machine.action(...)`).
The resulting events are deferred to the next render cycle rather than dispatched inline, so handlers
never observe a half-applied transition. For your own deferral use `queueMicrotask`.

#### 5 — Imperative API

| Member | Description |
|---|---|
| `el.machine` | The raw `Machine` instance. Full power; couples you to the library API. |
| `el.do(action, data?)` | Convenience for `machine.action(...)`; repaints reflection and re-renders. |
| `el.state()` | The current state name. |

```html
<button onclick="this.closest('fsl-instance').do('emergency-stop')">Stop</button>
```

### Named slots

Beyond the `state-<name>` slots, the default template exposes layout slots for chrome and the panel
sub-components: `title`, `viz`, `editor`, `toolbar`, `actions`, `info-panel`, `history`,
`data-inspector`, `hook-log`, `effective-properties`, `simulation`, `export`, and `footer`. Empty
slots render nothing (a couple carry a faint placeholder), so a bare
`<fsl-instance fsl="…">` still renders as something.

## See also

- `jssm/viz` headless API — same rendering pipeline, no shadow DOM. Use when wiring SVG into a custom layout.
- `custom-elements.json` at the package root — full programmatic description of every web component for use by framework-wrapper generators.
