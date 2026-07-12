# Styling nodes and graphs

`jssm` diagrams are styled in layers.  At the bottom sits a base stylesheet;
over that you can select one or more **named themes**; over that, state-*kind*
defaults (start, end, terminal, hooked) apply; and at the top, per-state
declarations always win.  This page covers the named themes — what ships, and
how to pick one on each rendering surface.

The web-component *chrome* (panel backgrounds, toolbars, JSON inspectors) has
its own separate palette system, covered
{@page WebComponents.md on the web components page} and summarized at the
bottom of this one.





&nbsp;

&nbsp;

# The built-in themes

Five diagram themes ship with the library:

| Theme | Look |
|---|---|
| `default` | White rectangles, black text; crimson terminals, yellow starts, `dodgerblue4` active state |
| `modern` | Khaki rectangles with the same saturated kind colors |
| `ocean` | Sea colors — `cadetblue` states, `deepskyblue` active, `darkviolet` terminals, aquamarine accents |
| `plain` | Box-free plaintext: transparent backgrounds, black text; good for print and monochrome contexts |
| `bold` | Currently shares `modern`'s palette; reserved as a separate name so the two can diverge |

Every theme styles each state kind — ordinary states, `start`, `end`,
`terminal`, and `hooked` states — plus the *active* variant of each, so the
current state stands out while the machine runs.

You can enumerate the available names at runtime:

```javascript
sm`a -> b;`.all_themes();   // [ 'default', 'modern', 'ocean', 'plain', 'bold' ]
```





&nbsp;

&nbsp;

# Picking a theme in the machine source

The primary mechanism is the `theme:` header directive, written in the FSL
source itself:

```fsl
theme: ocean;

Red => Green => Yellow => Red;
```

Because the selection rides inside the machine source, it applies everywhere
that source is rendered — the library API, the CLI, Markdown fences, and web
components all honor it with no further configuration.

Unknown theme names are rejected at parse time, so a typo fails loudly rather
than silently rendering the default.

## Layering several themes

`theme:` also accepts a bracketed list:

```fsl
theme: [ocean modern];

a -> b;
```

The first-declared theme is dominant: where two themes style the same
property, the earlier one wins, and later ones only fill the gaps.





&nbsp;

&nbsp;

# Picking a theme from code

Machines expose their theme selection as a property, so you can also set it
after construction:

```javascript
import { sm } from 'jssm';

const machine = sm`a -> b;`;

machine.themes;               // [ 'default' ]
machine.themes = 'ocean';     // switch themes at runtime
machine.themes = ['ocean', 'plain'];   // or layer, first-dominant

machine.style_for('a');       // the fully resolved style object for a state
```

`style_for(state)` is where the layering resolves: base stylesheet, then the
selected themes, then kind defaults, then any per-state declaration from the
source.  A per-state declaration therefore always overrides whatever the
theme says for that state.





&nbsp;

&nbsp;

# Themes in Markdown fences

The FSL Markdown fence convention renders `fsl`/`jssm` fenced code blocks as
live diagrams.  A fence body is ordinary machine source, so the same header
directive works:

````markdown
```fsl
theme: ocean;
Red => Green => Yellow => Red;
```
````

The fence's syntax-highlighted code listing picks up the *diagram's* node
colors automatically — each state name in the code is tinted with the color
that state renders with — so a themed fence themes both halves at once.

There is not yet a fence-info token for themes (something like
`theme=ocean` after the language word); the header directive inside the body
is the supported spelling.





&nbsp;

&nbsp;

# Themes in the CLI

`fsl-render` renders `.fsl` files (or stdin) to `svg`, `dot`, `png`, `jpeg`,
`html`, or `gif`.  It reads whole machine sources, so — again — the header directive is
the selection mechanism:

```fsl
// traffic.fsl
theme: ocean;
Red => Green => Yellow => Red;
```

```bash
fsl-render traffic.fsl --target png
```

There is not yet a `--theme` command-line flag; put the directive in the file.





&nbsp;

&nbsp;

# Themes in web components

The rendered diagram inside `<fsl-viz>` or `<fsl-instance>` uses the same
pipeline as everything else, so the machine source decides its theme:

```html
<fsl-viz fsl="theme: ocean; Off -> On -> Off;"></fsl-viz>
```

Separately, `<fsl-instance>` themes its own *chrome* — panels, toolbar, JSON
inspector — through a named light/dark palette registry.  `Default` and
`Solarized` ship built in; hosts can add their own, and every registered name
appears in the toolbar's theme pulldown:

```html
<fsl-instance theme="system" theme-name="Solarized">
  Off -> On -> Off;
</fsl-instance>
```

`theme` here is the light/dark *mode* (`system` follows the OS preference);
`theme-name` picks the palette.  The full registry API is documented
{@page WebComponents.md on the web components page}.





&nbsp;

&nbsp;

# Not yet

- A fence-info `theme=` token and a CLI `--theme` flag (the header directive
  covers both surfaces today).
- Render-time theme overrides as an alternative to compile-time merging.
- A public registration API for user-defined *diagram* themes (the
  web-component chrome registry is already user-extensible).
