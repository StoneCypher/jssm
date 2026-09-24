# Tonal state cards

Select the renderer in FSL, just like `dot` or `neato`:

```fsl
graph_layout: tonal;
Idle 'start' -> Running;
```

This selects tonal in SVG exports, the CLI renderer, and chart components.
Omitting `graph_layout` keeps the existing Graphviz appearance. `tonal` draws
navy-backed state cards with darker headers, soft shadows, blue monospace action
labels, and quieter forced transitions. Layout still uses Graphviz, including
FSL flow, arrangements, groups, self-loops and parallel actions.

```js
import { fsl_to_svg_string } from 'jssm/viz';

const svg = await fsl_to_svg_string(source, {
  provider: 'tonal', // Optional override; unnecessary when source selects tonal.
  tonal: {
    forced_opacity: 0.7,
    header_shade: 0.1,
    states: {
      Green: {
        description: 'Traffic may proceed.',
        action: 'Next',
        detail: 'changes the light to yellow.',
        icon: 'traffic-green'
      }
    }
  }
});
```

Annotations are optional presentation metadata keyed by the original state
name. They do not change FSL or execution. Unannotated states use compact cards.
`action` is a monospace prefix in the body; edge action labels always come from
the machine. Built-in icons are `traffic-red`, `traffic-yellow`, `traffic-green`
and `traffic-off`. Supply `{ path: 'M…' }` for a monochrome SVG path in a 24×24
view box. Content is escaped as text; raw SVG/HTML is not accepted as annotation
content.

`background` defaults to `#101827`, `action_color` to `#a9cfff`, and
`wrap_columns` to 24. Graphviz measures the wrapped label with the selected
fonts, sizes the node and routes edges around it. The resulting SVG uses those
same measurements. State colors, shapes and line styles come from the machine. Octagons use compact
card bounds with clipped corners, rather than an expanded regular polygon.
Borders default to a darker tone of the resolved node fill. Explicit FSL
`border-color` declarations retain their color and alpha, including declarations
in state defaults, groups, state kinds, and active-state overlays.
Normal, main and forced transitions retain their distinct arrowheads. Opposite
transitions are drawn separately so their styles remain independent.

Use `id_prefix` for reproducible SVG exports. Give each chart a distinct prefix
when embedding multiple exports in one document. If omitted, each render gets
a unique document-local prefix. SVG output works with the existing rasterizer
and can be used directly in tutorial graphics.

## Chart component

```html
<fsl-viz fsl="graph_layout: tonal; Idle 'start' -> Running;"></fsl-viz>
```

Set the component's `.tonal` JavaScript property to the same options object
used above. Provider and annotation changes trigger a render in standalone and
`fsl-instance`-bound charts. The existing trace-highlighting API continues to
recognize nodes and transitions.

Tonal uses `dot` for geometry by default. An explicit `engine: 'neato'`
option (or the chart's `engine` attribute) changes geometry while retaining
the source-selected tonal appearance. An explicit `provider` overrides the
source's appearance choice; `provider: 'graphviz'` restores standard drawing.
Existing `graph_layout: dot`, `neato`, `circo`, `fdp`, and `twopi` retain
their existing behavior.

## Application providers

`provider` also accepts a `VizRenderProvider` object with `name` and
`render(context)` members. No global registration is required. The context
exposes the machine, render options, collision-resolved state IDs and display
labels; `to_dot(overrides)` retains the existing FSL layout semantics while
allowing node measurements and independent edges; `render_dot(dot, format)`
uses the configured Graphviz adapter. The provider returns SVG synchronously
or asynchronously. Custom providers are trusted application code.

Both string and DOM-element render entry points use the same provider.
`machine_to_dot` / `fsl_to_dot` continue to export semantic DOT independent of
the drawing provider. The tonal provider requires the Graphviz adapter's
`json` output format; the default provider only requires `svg`.
