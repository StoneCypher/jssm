# FSL Grammar Feature Reference

A feature-by-feature catalogue of everything the FSL PEG grammar
(`src/ts/fsl_parser.peg`) recognizes.  Organized by concept, not by
parse rule.  Section anchors line up roughly with rule groupings in the
grammar so a reader can cross-reference quickly.

This document describes *what the grammar accepts* — not what the
runtime does with it.  A few productions are accepted by the parser and
either ignored or only partially honoured downstream; those are flagged
inline.

*Last verified against `src/ts/fsl_parser.peg` on 2026-05-05.*  When
re-syncing, `git log src/ts/fsl_parser.peg --since=<that date>` will
show what may need to be re-audited.

Grammar conventions used throughout this document:

- `Foo`            — a named PEG rule
- `"lit"` / `'lit'` — a literal terminal in the grammar
- `WS`             — the whitespace/comment rule (see below)
- `?` / `*` / `+`  — PEG quantifiers (zero-or-one / zero-or-more / one-or-more)



## 1. Document shape

### `Document` (top level)

```
Document = WS? TermList WS?
```

A document is an optional whitespace-or-comments preamble, a list of
terms, and optional trailing whitespace.

### `TermList`

Zero or more `Term`s, no separator between them.  Term-level statements
each end with their own `;`, so the list is unambiguous without a
delimiter.

### `Term` — the seven top-level statement kinds

A term is exactly one of:

1. **`Exp`** — a transition expression (e.g. `'a' -> 'b';`)
2. **`StateDeclaration`** — `state Foo : { ... };`
3. **`ArrangeDeclaration`** — `arrange / arrange-start / arrange-end`
4. **`NamedList`** — `&name : [a b c];`
5. **`MachineAttribute`** — metadata like `machine_name`, `fsl_version`, `theme`, `flow`
6. **`MachineProperty`** — typed property declaration with optional default and `required`
7. **`Config`** — block configuration (`graph_layout`, `start_states`, `transition`, `state`, `validation`, …)

Each of these is described in its own section below.



## 2. Lexical layer

### Whitespace and comments — `WS`

```
WS = BlockComment WS?
   / LineComment  WS?
   / [ \t\r\n\v]+ WS?
```

Whitespace runs may interleave block comments (`/* … */`) and line
comments (`// …` to end-of-line/EOF).  Comments are *only* recognized
where `WS?` appears in another rule — there is no automatic
comment-anywhere behaviour.  In practice `WS?` appears at virtually
every joinable position, so this is rarely visible to users.

### `LineTerminator`

`\n`, `\r`, `<U+2028>`, `<U+2029>`.  Used only by the line-comment
terminator.

### Strings — `String`

```
"..."  using the Char rule
```

`Char` accepts:

- Any unescaped char in `\x00–\x21, \x23–\x5B, \x5D–<U+FFFF>` (i.e. all
  of Unicode *except* the literal `"` and `\`).
- Escapes via `\`: `"`, `\`, `/`, `b`, `f`, `n`, `r`, `t`, `v`, and
  `\uXXXX` (4-hex-digit Unicode escape).

### Action labels — `ActionLabel`

```
'...'  using ActionLabelChar
```

A single-quoted twin of `String`.  Same escape vocabulary, but the
unescaped range is `\x20–\x26, \x28–\x5B, \x5D–<U+FFFF>` — i.e. excludes
`'` and `\`.  Used everywhere the grammar wants a quoted "action" name
distinct from a structural string.

### Atoms — `Atom`

An identifier-like token.

- First letter:  `[0-9a-zA-Z._!$^*?,]` plus all of `\x80–<U+FFFF>`
- Rest:          first-letter set plus `+ ( ) & # @`

Notable: `.` and digits are allowed *as the first character*; `+` and
`(` `)` are allowed only after.  The atom set is intentionally broad
to let users name states with things like `step.1`, `q!`, or non-Latin
Unicode without quoting.

### Labels — `Label`

```
Label = Atom / String
```

Anywhere the grammar accepts a "label" you can write either an atom or
a quoted string.  The two forms are interchangeable for naming.

### `LabelList`

```
LabelList = "[" WS? (Label WS?)* "]"
```

A bracketed list of labels.  Whitespace/comments between items.

### `LabelOrLabelList`

Convenience wrapper: either a single label or a label list.



## 3. Numeric layer

### `IntegerLiteral`

`0` or a non-zero digit followed by any number of decimal digits.

### `NonNegNumber`

Decimal float or integer with optional trailing `WS?`.  Used inside
`ArrowProbability` and `ArrowAfter`.

### `JsNumericLiteral` — JS-style number literal

Accepts:

- Hex integers: `0x…` / `0X…` (the `i` flag on the `0x` literal makes
  the prefix case-insensitive)
- Binary integers: `0b…` / `0B…` (same — case-insensitive prefix)
- Octal integers: `0o…` / `0O…` (same — case-insensitive prefix.
  `BinaryDigit` is `[0-1]`; `OctalDigit` is `[0-7]`)
- Decimal floats with optional exponent — exponent indicator is
  case-insensitive (`1e10`, `1E10`, `2.5e-3`); leading-dot form is
  legal (`.25`)
- Decimal integers
- Word-form constants:
  - `NaN`
  - `Infinity` / `Inf` / `PInfinity` / `PInf` / `∞`
  - `NegativeInfinity` / `NegativeInf` / `NegInfinity` / `NegInf` /
    `NInfinity` / `NInf` / `-∞`
  - `Epsilon`, `𝜀` (math italic), `ε` (Greek)
  - `Pi`, `𝜋`, `π`
  - `EulerNumber` (Math.E), `E`, `e`, `Ɛ`, `ℇ`
  - `Root2`, `RootHalf`
  - `Ln2`, `NatLog2`, `Ln10`, `NatLog10`, `Log2E`, `Log10E`
  - `MaxSafeInt`, `MinSafeInt`, `MaxPosNum`, `MinPosNum`
  - `Phi`, `𝜑`, `𝜙`, `ϕ`, `φ` (golden ratio, ≈1.6180339887498948)
  - `EulerConstant`, `γ`, `𝛾` (≈0.5772156649015329)

These constants live only in `PropertyVal` (used for `property`
declarations), so they can be the default value of a machine or state
property but not a probability or arrow-after duration.

### `SemVer` and friends

- `SemVer`     — `major.minor.patch`, returned as `{major, minor, patch, full}`
- `SemVerOper` — `^ ~ >= <= < >`
- `SemVerRule` — optional operator + `SemVer`
- `SemVerRange` — one or two `SemVerRule`s

`SemVerRange` is defined but only `SemVer` is consumed by callers
(`fsl_version`, `machine_version`).  The range/rule plumbing is in
place for future use.



## 4. Colours

### Named SVG colours — `SvgColorLabel`

The full SVG/CSS named-colour palette (≈140 names) is enumerated, each
with both lowercase and CamelCase spellings (`aliceblue` and
`AliceBlue`, `darkgoldenrod` and `DarkGoldenRod`, …).  Each alternative
returns an 8-digit `#rrggbbaa` literal.

Ordering note: PEG's first-match-wins rule forces longer prefixes to
appear *before* their shorter substrings.  The grammar has explicit
comments at every such site:

- `aquamarine` before `aqua`
- `blueviolet` before `blue`
- `goldenrod` before `gold`
- `greenyellow` before `green`
- `lavenderblush` before `lavender`
- `limegreen` before `lime`
- `olivedrab` before `olive`
- `orangered` before `orange`
- `whitesmoke` before `white`
- `yellowgreen` before `yellow`

Anyone editing this list needs to keep the prefix-protection comments
in sync.

### Hex colours

- `Rgb3`  — `#rgb`        → `#rrggbbff`
- `Rgb6`  — `#rrggbb`     → `#rrggbbff`
- `Rgba4` — `#rgba`       → `#rrggbbaa`
- `Rgba8` — `#rrggbbaa`   → `#rrggbbaa`

All hex forms are lower-case-extended to 8 digits with `ff` alpha
when alpha is omitted.

### `Color`

```
Color = SvgColor / Rgba8 / Rgb6 / Rgba4 / Rgb3
```

`Rgba8` is tried before `Rgb6` so an 8-digit hex isn't truncated at
the 6-digit point.



## 5. Arrows

The arrow lexicon distinguishes three "weights":

- **Light** — drawn as a thin line (`->`, `<->`, `<-`, plus Unicode
  `→ ↔ ←`)
- **Fat**   — drawn double (`=>`, `<=>`, `<=`, plus Unicode `⇒ ⇔ ⇐`)
- **Tilde** — drawn dashed/wavy (`~>`, `<~>`, `<~`, plus Unicode
  `↛ ↮ ↚`)

Each weight has Forward (`X>`), TwoWay (`<X>`), and Back (`<X`) forms.

### Mixed arrows

Six "mixed" forms encode different weights on each side of a two-way
arrow:

- `<-=>` / `←⇒` — light back, fat forward
- `<-~>` / `←↛` — light back, tilde forward
- `<=->` / `⇐→` — fat back, light forward
- `<=~>` / `⇐↛` — fat back, tilde forward
- `<~->` / `↚→` — tilde back, light forward
- `<~=>` / `↚⇒` — tilde back, fat forward

### `Arrow`

```
Arrow = MixedArrow / LightArrow / FatArrow / TildeArrow
```

Mixed is tried first so the longer four-character sequences aren't
short-circuited by a two-character prefix.  Within each weight group
the order is Forward → TwoWay → Back.

The Unicode forms all map to their ASCII equivalents in the AST, so
downstream code never has to care about which form was typed.



## 6. Transition expressions — `Exp` and `Subexp`

This is the heart of FSL.

### `Exp`

```
Exp = ArrowTarget Subexp WS? ';'
```

Returns `{ key: 'transition', from: ArrowTarget, se: Subexp }`.

### `Subexp` — the chained tail

A `Subexp` is the right-hand side of an arrow plus any further chained
transitions.  It is a free-ordered run of decorations, a mandatory
arrow, another free-ordered run of decorations, a target, and an
optional further `Subexp`:

```
WS? ArrowDecorations    // pre-arrow run, any order
WS? Arrow
WS? ArrowDecorations    // post-arrow run, any order
WS? ArrowTarget
WS? Subexp?             // chain another segment
```

### `ArrowDecoration` and `ArrowDecorations`

Each side of the arrow accepts a *free-ordered* run of decorations.
A single `ArrowDecoration` is one of:

- `ArrowAfter`        — `after N [unit]`
- `ActionLabel`       — `'name'`
- `ArrowProbability`  — `N%`
- `ArrowDesc`         — `{ ... }` brace block

`ArrowDecorations` is a Kleene-star (zero or more) over
`ArrowDecoration` with optional whitespace between items.  Each *kind*
may appear **at most once per side**; a duplicate raises a parse error
with the message:

```
duplicate <kind> decoration before arrow
duplicate <kind> decoration after arrow
```

Within a side, decorations may appear in any order — `5% 'click' after 3s`
and `after 3s 'click' 5%` parse identically.

### AST mapping for decorations

The AST naming is mirrored across the arrow so that `<->`-style
two-way arrows can carry *independent* metadata for each direction.
The mirroring is asymmetric: timing/action/probability decorations
swap sides between source position and AST key, but `desc` swaps the
opposite way.

| Decoration kind | Before arrow → AST key | After arrow → AST key |
|-----------------|------------------------|------------------------|
| `after`         | `r_after`              | `l_after`              |
| action label    | `r_action`             | `l_action`             |
| probability     | `r_probability`        | `l_probability`        |
| `{ ... }` desc  | `l_desc`               | `r_desc`               |

The `r_`/`l_` prefixes refer to *which node* the decoration attaches
to:

- Decorations *before* the arrow attach to the right-hand node
  (they describe the transition leaving that node going back the
  other way) and so are prefixed `r_`.
- Decorations *after* the arrow attach to the left-hand node and are
  prefixed `l_`.

The `desc` row is swapped relative to the others: a brace block
before the arrow attaches to the *left* node (`l_desc`), and one
after the arrow attaches to the *right* node (`r_desc`).  This
mirrors which side of the arrow visually carries the block in the
source.

A pre-arrow decoration whose value is falsy — notably an empty `{}`
brace block returning `null` — is silently skipped, preserving AST
shape compatibility with the original fixed-order grammar.

### Arrow targets — `ArrowTarget`

A transition's destination can be:

- **`Stripe`** — `+|N` or `-|N`, where N is a positive integer.
  Returns `{ key:'stripe', value: ±N }`.  Used for "stripe N along
  this dimension" style state coordinates.
- **`Cycle`**  — `+N` / `-N` / `+0`.  Returns
  `{ key:'cycle', value: ±N }`.  Note the asymmetry: only `+0` is
  valid (no `-0`), and `0` alone is not a cycle.
- **`LabelList`** — `[a b c]` for fan-out/fan-in
- **`Label`** — single state name

The grammar tries them in that order so e.g. `+1` is parsed as Cycle,
not as the start of a label that begins with `+`.

### Arrow decorations

#### `ArrowAfter` — timed transitions

```
'after' WS NonNegNumber WS? TimeType?
```

`TimeType` accepts a wide unit vocabulary, all converted to
milliseconds:

| Unit family | Accepted forms                                |
|-------------|-----------------------------------------------|
| ms          | `milliseconds`, `millisecond`, `msecs`, `msec`, `ms` |
| s           | `seconds`, `second`, `secs`, `sec`, `s`       |
| min         | `minutes`, `minute`, `mins`, `min`, `m`       |
| hour        | `hours`, `hour`, `hrs`, `hr`, `h`             |
| day         | `days`, `day`, `d`                            |
| week        | `weeks`, `week`, `wks`, `wk`, `w`             |

If `TimeType` is omitted the value is treated as **seconds** (`value *
1000`).  This is non-obvious — bare numbers default to seconds, not
milliseconds.

#### `ArrowProbability`

```
NonNegNumber "%"
```

A percentage probability for choosing this transition among
alternatives.

#### `ActionLabel`

A single-quoted action name (see lexical section).  Distinguishes
*event-driven* transitions: a transition with an action label fires
only on that named event.

#### `ArrowDesc` — `{ ... }` block

A brace block on either side of the arrow holding ArrowItems:

- `arc_label : Label;`         — caption attached to the arrow itself
- `head_label : Label;`        — caption near the destination end
- `tail_label : Label;`        — caption near the source end
- `edge_color : Color;`        — per-edge colour override
  (returns key `single_edge_color`)
- `line-style : LineStyle;`    — per-edge `solid`/`dotted`/`dashed`
  (returns key `transition_line_style`)

The first three may appear repeatedly (`ArrowItem+`); the latter two
are exclusive single-item forms (the rule alternates between them and
a list of generic items, so a single `edge_color`/`line-style` block
*replaces* the generic-items mode for that block).



## 7. State declarations

### `StateDeclaration`

```
state <Label> : { ... };
```

The brace block is a sequence of `StateDeclarationItem`s, each of
which can be:

- `label : <Label>;`            — display label
- `color : <Color>;`            — overall colour
- `text-color : <Color>;`       — text/foreground
- `background-color : <Color>;`
- `border-color : <Color>;`
- `shape : <GvizShape>;`        — see Graphviz shape list below
- `corners : regular | rounded | lined;`
- `line-style : solid | dotted | dashed;`
  (also accepts `linestyle` without the hyphen)
- `image : <String>;`
- `property : <Atom> <PropertyVal>;`           — per-state property
- `property : <Atom> <PropertyVal> required;` — required per-state
  property

The same `StateDeclarationItem` set is reused inside the
`state:`/`start_state:`/`end_state:`/`active_state:`/
`terminal_state:`/`hooked_state:` config blocks, so any item legal in
a single state declaration is also legal as a default for a state
class.

### `GvizShape` — Graphviz shape vocabulary

60 shape names mirroring Graphviz' built-ins, including geometric
(`box`, `circle`, `ellipse`, `polygon`, `triangle`, `diamond`,
`pentagon`, `hexagon`, `septagon`, `octagon`, `star`, `square`,
`rectangle`/`rect`, `cylinder`, `parallelogram`, `trapezium`,
`house`), specialty (`Mdiamond`, `Msquare`, `Mcircle`, `doublecircle`,
`doubleoctagon`, `tripleoctagon`, `invtriangle`, `invtrapezium`,
`invhouse`, `box3d`, `egg`, `point`, `oval`, `note`, `tab`, `folder`,
`component`, `record`, `plaintext`/`plain`, `none`, `underline`), and
the bio/circuit set (`promoter`, `cds`, `terminator`, `utr`,
`primersite`, `restrictionsite`, `fivepoverhang`, `threepoverhang`,
`noverhang`, `assembly`, `signature`, `insulator`, `ribosite`,
`rnastab`, `proteasesite`, `proteinstab`, `rpromoter`, `rarrow`,
`larrow`, `lpromoter`).



## 8. Configuration blocks — `Config`

A `Config` is one of nine block forms, all of shape

```
<keyword> : { <items>? };
```

except the four that take a single value plus `;`.

### Block-style configs

- **`state`**          — defaults applied to every state
- **`start_state`**    — defaults for start state(s)
- **`end_state`**      — defaults for end state(s)
- **`active_state`**   — defaults for the currently-active state
- **`terminal_state`** — defaults for terminal states
- **`hooked_state`**   — defaults for states with hooks attached
- **`transition`**     — global transition defaults (currently
  accepts either a `GraphDefaultEdgeColor` (`edge_color : <Color>;`)
  or a list of `TransitionItem+` whose only legal keys are
  `whargarbl`/`todo` placeholders — i.e. real transition-default
  surface area is just the edge colour today)
- **`action`**         — same placeholder shape; only `whargarbl`/
  `todo` accepted
- **`validation`**     — same placeholder shape; only `whargarbl`/
  `todo` accepted

The `whargarbl`/`todo` placeholders are explicit grammar stubs, not
real keys — they are scaffolding for future config schemas.

### Single-value configs

- `graph_layout : <GvizLayout>;` — `dot`, `circo`, `fdp`, `neato`,
  `twopi`
- `start_states : <LabelList>;`
- `end_states   : <LabelList>;`
- `graph_bg_color : <Color>;`
- `allows_override : <OverrideT>;` — `true` / `false` / `undefined`



## 9. Machine attributes

Each is a `keyword : value;` line at top level.

| Attribute              | Value type            |
|------------------------|-----------------------|
| `fsl_version`          | `SemVer`              |
| `machine_name`         | `Label`               |
| `machine_author`       | `LabelOrLabelList`    |
| `machine_contributor`  | `LabelOrLabelList`    |
| `machine_comment`      | `LabelOrLabelList`    |
| `machine_definition`   | `URL` (`http`/`https` only) |
| `machine_reference`    | `LabelOrLabelList`    |
| `machine_version`      | `SemVer`              |
| `machine_license`      | `LicenseOrLabelOrList` |
| `machine_language`     | `Label`               |
| `theme`                | `ThemeOrThemeList`    |
| `dot_preamble`         | `String`              |
| `flow`                 | `Direction`           |
| `hooks`                | `HookDefinition`      |

### `URL`

Restricted to `http://` or `https://` followed by a permissive set of
URL-safe characters.  No other schemes (no `file://`, no `mailto:`,
etc.).

### `LicenseOrLabelOrList`

A specific shortlist of well-known licenses comes first:

- `MIT`, `BSD 2-clause`, `BSD 3-clause`, `Apache 2.0`, `Mozilla 2.0`,
  `Public domain`, `GPL v2`, `GPL v3`, `LGPL v2.1`, `LGPL v3.0`,
  `Unknown`

Followed by fall-through to a generic `Label` or `LabelList`.

### `Theme` / `ThemeOrThemeList`

`Theme` is an enum: `none`, `default`, `modern`, `ocean`, `bold`.
`theme:` accepts either a single theme or a bracketed list of themes
(layered in stacking order).

### `Direction`

`up`, `right`, `down`, `left` — used by `flow:`.

### `HookDefinition`

`open` or `closed` — `hooks:` controls whether *unbound* hooks throw
or are silently allowed.



## 10. Properties — `MachineProperty`

Top-level machine properties have four legal shapes:

```
property <Label> default <PropertyVal> required ;
property <Label>                       required ;
property <Label> default <PropertyVal>          ;
property <Label>                                ;
```

`PropertyVal` accepts:

- `String`
- `Boolean` (`true`/`false`)
- `JsNumericLiteral` (full numeric vocabulary above, including
  `Infinity`, `Pi`, …)
- `Null` (`null`)
- `Undefined` (`undefined`)

(There are commented-out hooks for default arrays / default objects —
not implemented in the current grammar.)

State-level properties (inside a `state:` block or `state Foo:` decl)
use a slightly different rule, `SdStateProperty`, that reads
`property : <Atom> <PropertyVal>` (with `:` separator) rather than the
top-level `property <Label> default <Val>` syntax.



## 11. Named lists — `NamedList`

```
& <Label> : <LabelOrLabelList> ;
```

A reusable label group.  `& foo : [a b c];` defines `foo` as a
shorthand that expands elsewhere.



## 12. Arrange declarations

Three forms, all taking a `LabelOrLabelList`:

- `arrange       <list> ;` — generic ordering hint
- `arrange-start <list> ;` — pin to the start
- `arrange-end   <list> ;` — pin to the end

`arrange-start` / `arrange-end` are tried before `arrange` so the
hyphenated forms aren't shadowed.



## 13. State / arrow / transition vocabulary cheat sheet

| Concept              | Grammar entry point                          |
|----------------------|----------------------------------------------|
| Transition           | `Exp`                                        |
| Transition tail      | `Subexp`                                     |
| Arrow weight         | `LightArrow` / `FatArrow` / `TildeArrow` / `MixedArrow` |
| Arrow target         | `ArrowTarget` (Stripe / Cycle / LabelList / Label) |
| Per-arrow block      | `ArrowDesc`                                  |
| Per-arrow timing     | `ArrowAfter`                                 |
| Per-arrow odds       | `ArrowProbability`                           |
| Per-arrow event      | `ActionLabel`                                |
| Per-arrow decoration set | `ArrowDecoration` / `ArrowDecorations`   |
| Per-arrow caption    | `arc_label` / `head_label` / `tail_label`    |
| Per-arrow colour     | `edge_color` (inside `ArrowDesc`)            |
| Per-arrow line style | `line-style` (inside `ArrowDesc`)            |
| State declaration    | `StateDeclaration`                           |
| State default block  | `ConfigState` / `ConfigStartState` / …       |
| Machine metadata     | `MachineAttribute`                           |
| Machine property     | `MachineProperty`                            |
| Reusable label group | `NamedList`                                  |
| Layout hints         | `ArrangeDeclaration`                         |
| Graph-level config   | `Config`                                     |



## 14. Quirks and footguns to be aware of

- **Missing `-0` cycle.** `Cycle` accepts `+0` but not `-0` or bare
  `0`.  Probably intentional (zero is unsigned), but worth noting.

- **`whargarbl` / `todo` keys.** `ConfigTransition`, `ConfigAction`,
  and `ConfigValidation` only accept these placeholder keys.  Any
  real schema work for these blocks is still pending in the grammar.

- **Bare `after` numbers default to seconds.** `after 5 -> foo`
  means *five seconds*, not five milliseconds.  The implicit unit
  scale is `1000`.

- **`String` vs `ActionLabel` quoting.** Double quotes parse as
  string literals; single quotes parse as action labels.  Their
  escape vocabularies are duplicated rather than factored.

- **PEG ordering protects long-prefix matches.** Editing the SVG
  colour list, the arrow weight list, the time-unit list, or the
  arrange list requires keeping shorter prefixes *after* their
  longer-prefix siblings.  See the inline `out of order because…`
  comments.

- **Two `Reminder` notes on type annotations.** `Subexp` and `Exp`
  carry `// Reminder: remove this type ... if you want to work in
  pegjs online` lines.  The annotation `const base: any = ...` is
  only legal because the project compiles the grammar through
  TypeScript-aware tooling; pegjs.org's online editor can't parse
  TS type annotations and will reject the grammar verbatim.

- **`SemVerRange` is defined but not used.** No top-level rule
  consumes it today; only `SemVer` is referenced.  Range-aware
  version handling appears to be partially scaffolded for future
  work.

- **URL char class includes `;`.** The `URL` production
  (`UrlProtocol [a-zA-Z0-9!*'():;@&=+$,/?#[]_.~-]+`) accepts `;` as
  a URL-safe character per RFC 3986.  In FSL that conflicts with
  the statement terminator: `machine_definition: https://x.com;`
  fails because the URL eats the trailing `;`.  Workaround used by
  the existing tests and conventional in practice: leave one
  whitespace character between the URL and the terminator
  (`machine_definition: https://x.com ;`).
