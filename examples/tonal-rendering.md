# Tonal state cards

Select the renderer in FSL with `graph_renderer`:

```fsl
graph_renderer: tonal;
Idle 'start' -> Running;
```

This selects tonal in SVG exports, the CLI renderer, and chart components.
Omitting `graph_renderer` keeps the standard Graphviz appearance
(`graph_renderer: graphviz;` says so explicitly). `tonal` draws
navy-backed state cards with darker headers, soft shadows, blue monospace action
labels, and quieter forced transitions. Layout still uses Graphviz, including
FSL flow, arrangements, groups, self-loops and parallel actions.

`graph_renderer` chooses how the machine is drawn; `graph_layout` still
chooses the Graphviz geometry engine underneath it, so the two combine:

```fsl
graph_renderer: tonal;
graph_layout: circo;
a -> b -> c -> a;
```

```js
import { fsl_to_svg_string } from 'jssm-viz';

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
the machine, including forced transitions. An unnamed transition stays unlabeled;
write `[Red Yellow Green] 'Disable' ~> Off;` to label all three forced returns.
The traffic-light example now declares this action explicitly.

Built-in icons are `traffic-red`, `traffic-yellow`, `traffic-green`
and `traffic-off`. Supply `{ emoji: '🚦' }` for emoji or `{ path: 'M…' }`
for a monochrome SVG path. Library integration examples are below.

`background` defaults to `#101827`. Edge labels use pale blue for main paths,
blue for regular paths, and a quieter blue-gray for forced paths. Set
`action_color` to override all three colors while keeping their typography.
`wrap_columns` defaults to 24 for body text. Headers are exactly 1.5em tall (33 points
at the 22-point title size), with vertically centered text. Titles remain on one
line; long names widen the card, and title line breaks are displayed as spaces.
Graphviz measures the title and wrapped body, sizes the node and routes edges
around it. The resulting SVG uses those same measurements. State colors, shapes and line styles come from the machine. Octagons use compact
card bounds with clipped corners and a larger title inset to clear the diagonal.
Borders default to a darker tone of the resolved node fill. Explicit FSL
`border-color` declarations retain their color and alpha, including declarations
in state defaults, groups, state kinds, and active-state overlays.
Main transitions have a heavier white stroke and bold monospace action labels.
Regular transitions have plain monospace labels; forced transitions use smaller,
italic labels and a thinner dashed stroke. `forced_opacity` affects the stroke
and arrowhead, keeping action names readable. All three retain their distinct
arrowheads. Opposite transitions are drawn separately.

Action labels use Graphviz external labels, followed by a bounded clearance pass.
They do not become individual routing constraints. Uniform spacing reserves
room for text, and the SVG bounds include displaced labels. This preserves
balanced routes on symmetric machines. Placement tries to avoid cards, labels
and curves; crowded graphs can still require flow or arrangement adjustments.

Use `id_prefix` for reproducible SVG exports. Give each chart a distinct prefix
when embedding multiple exports in one document. If omitted, each render gets
a unique document-local prefix. SVG output works with the existing rasterizer
and can be used directly in tutorial graphics.

## Perceptually balanced pastel example

The traffic-light example uses [HPLuv](https://www.hsluv.org/comparison/), the
pastel variant of HSLuv. All three signal fills share lightness L=90 and
pastel saturation P=100. At a fixed lightness, equal HPLuv P means equal
CIELUV chroma across hues; equal HSLuv S alone does not. The unrounded
colors have C*=22.1733. Conversion to 8-bit sRGB introduces small differences.

| State | HPLuv hue | Fill |
| --- | ---: | --- |
| Red | 10 | `#fedadb` |
| Green | 135 | `#cbead1` |
| Yellow | 75 | `#eae3c7` |

These values were generated with `hsluv@1.0.2`: create a `Hsluv` instance,
set `hpluv_h`, `hpluv_p`, and `hpluv_l`, call `hpluvToHex()`, then read
`hex`. The example stores the resulting colors in FSL, so conversion is not
a runtime dependency. The renderer's shared shading gives them matching tonal
headers and subtle depth. Bright signal lamps remain small accents.

Off uses a rounded card, a power icon, and muted blue-gray `#626b7c`
(HPLuv 250, 45, 45) with white text. This keeps the card shape consistent and
avoids the stop-sign association of an octagon. The dashed outline remains.
These are example styling choices: the provider continues to respect explicit
FSL colors and shapes, including octagons.

## Emoji and icon libraries

Use an emoji in the same slot:

```js
const states = { Green: { icon: { emoji: '🚦' }, description: 'Traffic may proceed.' } };
```

Emoji use the viewer's installed color-emoji font. For identical artwork across
video exports and browsers, use SVG icon data. No icon library is bundled or
loaded from a network by the renderer.

Lucide's shape records can be passed directly:

```js
import { icons } from 'lucide';
const states = { Green: { icon: { nodes: icons.CircleCheck } } };
```

Font Awesome's path data works with its native view box:

```js
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
const [width, height, , , path] = faCircleCheck.icon;
const states = {
  Green: { icon: { path, viewBox: `0 0 ${width} ${height}`, fill: 'currentColor', stroke: 'none' } }
};
```

Pass any of these `states` objects as `tonal: { states }` in render options, or
assign it through the chart's `.tonal` property. The integration uses the libraries'
public [Lucide IconNode](https://github.com/lucide-icons/lucide/blob/main/packages/lucide/src/types.ts)
and [Font Awesome IconDefinition](https://github.com/FortAwesome/Font-Awesome/blob/7.x/js-packages/@fortawesome/fontawesome-common-types/index.d.ts)
data formats.

`TonalSvgIcon` accepts `path` (one path or an array) or `nodes` (shape/attribute
pairs), optional `viewBox` (default `0 0 24 24`), `fill` (default `none`),
`stroke` (default `currentColor`), and `stroke_width` (default `1.5`).
`currentColor` uses the state's text color. Supported shapes are `path`,
`circle`, `ellipse`, `rect`, `line`, `polyline`, and `polygon`. Shape geometry,
transforms, fill/stroke styling and opacity are supported; framework `key`
attributes are ignored. Raw SVG/HTML, event handlers, external references and
paint-server URLs are rejected. Libraries that supply SVG strings need to be
converted to these drawing records by the application.


## Chart component

```html
<script type="module">import 'jssm-viz/wc/viz/define';</script>
<fsl-viz fsl="graph_renderer: tonal; Idle 'start' -> Running;"></fsl-viz>
```

Set the component's `.tonal` JavaScript property to the same options object
used above. Provider and annotation changes trigger a render in standalone and
`fsl-instance`-bound charts. The existing trace-highlighting API continues to
recognize nodes and transitions.

Geometry comes from `graph_layout` (default `dot`), whichever renderer draws.
An explicit `engine: 'neato'` option (or the chart's `engine` attribute)
overrides it while keeping the source-selected tonal appearance. An explicit
`provider` (option, or the chart's `provider` attribute) overrides the
source's `graph_renderer`; `provider: 'graphviz'` restores standard drawing.
`graph_layout: dot`, `neato`, `circo`, `fdp`, and `twopi` keep their existing
behavior.

## Application providers

`provider` also accepts a `VizRenderProvider` object with `name` and
`render(context)` members, used directly with no registration. The context
exposes the machine, render options, collision-resolved state IDs and display
labels; `to_dot(overrides)` retains the existing FSL layout semantics while
allowing node measurements and independent edges; `render_dot(dot, format)`
uses the configured Graphviz adapter with the selected geometry engine. The
provider returns SVG synchronously or asynchronously. Custom providers are
trusted application code.

## Registering a renderer so FSL can name it

Register a provider once and any FSL source, render call or chart on the page
can select it by name, with no further code:

```js
import { register_renderer, fsl_to_svg_string } from 'jssm-viz';

// Standard Graphviz drawing, tagged with a class the page's CSS can style.
register_renderer({
  name: 'framed',
  render: async ctx => {
    const svg = await ctx.render_dot(ctx.to_dot(), 'svg');
    return svg.replace('<svg ', '<svg class="framed" ');
  }
});

await fsl_to_svg_string('graph_renderer: framed; a -> b;');
```

```html
<fsl-viz fsl="graph_renderer: framed; a -> b;"></fsl-viz>
<fsl-viz provider="framed" fsl="a -> b;"></fsl-viz>
```

The renderer is chosen in this order: the `provider` option or chart
property (a name or an object), then the machine's `graph_renderer`, then
`graphviz`. A name nobody registered fails the render with a `JssmError`
that names it and lists the registered renderers; `<fsl-viz>` reports that
through its `viz-error` event.

Names are exact and case-sensitive. Write identifier-like names bare
(`graph_renderer: framed;`) and anything else quoted
(`graph_renderer: "framed v2";`). `renderer_names()` lists what is
registered (built-ins first, then registration order), `renderer_for(name)`
looks one up, and `unregister_renderer(name)` removes one.

Registering a name that is already taken throws, so two libraries cannot
silently replace each other; pass `{ replace: true }` to replace your own
renderer on purpose. The built-ins `graphviz` and `tonal` can never be
replaced or unregistered, so `graph_renderer: tonal;` means the same thing on
every page.

The registry belongs to the copy of `jssm-viz` that registered into it.
`<fsl-viz>` from `jssm-viz/wc/viz` shares the package's registry; the
self-contained `jssm-viz/cdn/viz` build carries its own copy of jssm-viz, so
renderers registered through a separate `jssm-viz` import are not visible to
it.

Both string and DOM-element render entry points use the same provider.
`machine_to_dot` / `fsl_to_dot` continue to export semantic DOT independent of
the drawing provider. The tonal provider requires the Graphviz adapter's
`json` output format; the default provider only requires `svg`.
