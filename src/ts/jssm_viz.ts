
import * as jssm                 from './jssm.js';
import { JssmError }              from './jssm_error.js';
import { default_viz_colors }     from './jssm_viz_colors.js';
import { version, build_time }    from './version.js';
import { membership_distance }    from './jssm_compiler.js';

import type { Viz }               from '@viz-js/viz';
import type { JssmTransition, JssmStateConfig, JssmGroupMemberRef,
              JssmTransitionConfig, JssmGraphConfig } from './jssm_types.js';


/**
 *  How {@link machine_to_dot} renders FSL state groups (`&group : [ … ];`).
 *
 *  - `'cluster'` (default) — render the subset of groups that form a clean
 *    nesting tree as nested Graphviz `subgraph cluster_<group> { … }` boxes,
 *    deepest group innermost.  A state that genuinely *overlaps* two groups
 *    (member of two groups where neither nests inside the other) can only be
 *    drawn inside one cluster, so its remaining memberships are shown as
 *    bracketed chips appended to the node label.
 *  - `'chips'` — render *every* group membership as a chip on the node label
 *    and emit no clusters at all.  Useful when cluster boxes clutter the
 *    diagram or when overlap is pervasive.
 *  - `'off'` — ignore groups entirely; byte-for-byte the historical output.
 */
type RenderGroups = 'cluster' | 'chips' | 'off';




/**
 *  Cached resolved viz.js instance.  Populated on first call to
 *  {@link get_viz}; later calls reuse it directly.  Internal.
 */
let viz_instance: Viz | null = null;

/**
 *  DOM parser injected via {@link configure} for environments without a
 *  global `DOMParser` (e.g. Node).  Internal.
 */
let injected_dom_parser: typeof globalThis.DOMParser | null = null;




/**
 *  Returns a cached @viz-js/viz instance, lazily instantiated on first call.
 *  Internal helper for the rendering functions.
 *
 *  @internal
 */
async function get_viz(): Promise<Viz> {

  if (viz_instance === null) {
    const mod = await import('@viz-js/viz');
    viz_instance = await mod.instance();
  }

  return viz_instance;

}




/**
 *  Inject runtime configuration for jssm/viz.  Currently only accepts a
 *  custom `DOMParser` constructor for use by `*_svg_element` functions in
 *  environments that do not provide one globally (e.g. Node + jsdom).
 *
 *  Idempotent — last call wins.  No-op if called with no recognized keys.
 *
 *  ```typescript
 *  // Node, with jsdom:
 *  import { JSDOM } from 'jsdom';
 *  import { configure, fsl_to_svg_element } from 'jssm/viz';
 *
 *  configure({ DOMParser: new JSDOM().window.DOMParser });
 *  const el = await fsl_to_svg_element('a -> b;');
 *  ```
 *
 *  @param opts Configuration overrides.
 *  @param opts.DOMParser Constructor compatible with the WHATWG `DOMParser`
 *  interface.  Used as a fallback when `globalThis.DOMParser` is undefined.
 *
 *  @throws {JssmError} if `DOMParser` is provided and is not a constructor.
 */
function configure(opts: { DOMParser?: typeof globalThis.DOMParser }): void {

  if (opts.DOMParser !== undefined) {
    if (typeof opts.DOMParser !== 'function') {
      throw new JssmError(undefined,
        'jssm/viz: configure({ DOMParser }) — value must be a constructor');
    }
    injected_dom_parser = opts.DOMParser;
  }

}




/**
 *  Look up a color from the default viz palette by key, returning empty
 *  string if the key is unknown (so it disappears in feature concatenation).
 *
 *  @internal
 */
function vc(col: string): string {
  return (default_viz_colors as Record<string, string>)[col] ?? '';
}




/**
 *  Escape a string for safe interpolation inside a DOT double-quoted
 *  attribute value.  Replaces every `"` with `\"` so that group names,
 *  state labels, and chip labels containing literal double-quotes produce
 *  valid, parseable DOT source.
 *
 *  ```typescript
 *  doublequote('a"b');  // 'a\\"b'
 *  doublequote('safe'); // 'safe'
 *  ```
 *
 *  @param txt Any string that will be placed inside `"…"` in a DOT attribute.
 *  @returns The string with every `"` replaced by `\"`.
 *
 *  @internal
 */
function doublequote(txt: string): string {
  return txt.replace(/"/g, '\\"');
}




/**
 *  Convert a state name into a URL-friendly slug suitable for use as the
 *  body of a dot/SVG node identifier.  The transformation is:
 *
 *  1. Lowercase
 *  2. Any run of characters outside `[a-z0-9]` (after lowercasing) becomes
 *     a single `-`
 *  3. Leading and trailing `-` are trimmed
 *
 *  If the result is empty (e.g. for a state named `"!!!"`), the empty
 *  string is returned — callers are expected to fall back to an indexed
 *  placeholder like `node-N`.  See {@link slug_states} for the collision-
 *  resolving wrapper that consumes this helper.
 *
 *  ```typescript
 *  slug_for('Green Light');  // 'green-light'
 *  slug_for('!!!');          // ''
 *  slug_for('  Foo  Bar  '); // 'foo-bar'
 *  ```
 *
 *  @param state The state name to slugify.
 *  @returns The lowercase hyphen-separated slug, or empty string if none of
 *  the characters were retainable.
 *
 *  @internal
 */
function slug_for(state: string): string {
  return state
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}




/**
 *  Build a `Map<state, slug>` assigning every state in `states` a unique,
 *  deterministic, URL-safe slug used as its dot/SVG node identifier.
 *
 *  Algorithm:
 *
 *  1. Slug each state via {@link slug_for}.  States whose slug comes out
 *     empty fall back to `node-N`, where `N` is the state's declaration
 *     index (1-based, to match user-visible numbering).
 *  2. Walk the state list in declaration order, tracking how many times
 *     each base slug has already been used.  The first occurrence keeps
 *     the base slug; subsequent collisions get `-2`, `-3`, … suffixes.
 *     If the proposed suffixed slug itself collides with a base slug
 *     used later, the counter advances until a free slot is found.
 *
 *  This yields a deterministic mapping given the state-declaration order,
 *  so output is stable across runs.
 *
 *  ```typescript
 *  slug_states(['Red Light', 'red-light']);
 *  // Map { 'Red Light' => 'red-light', 'red-light' => 'red-light-2' }
 *
 *  slug_states(['!!!', '???']);
 *  // Map { '!!!' => 'node-1', '???' => 'node-2' }
 *  ```
 *
 *  @param states States in declaration order.
 *  @returns A `Map` from each state name to its unique slug.
 *
 *  @internal
 */
function slug_states(states: string[]): Map<string, string> {
  const used = new Set<string>();
  const out  = new Map<string, string>();
  states.forEach((s, i) => {
    const base = slug_for(s) || `node-${i + 1}`;
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    used.add(candidate);
    out.set(s, candidate);
  });
  return out;
}




/**
 *  Build a graphviz-safe node identifier for a state.  Accepts either a
 *  `string[]` (legacy test-only path; returns an index-based `n0`/`n1`
 *  identifier via `indexOf`), or a precomputed `Map<state, slug>` produced
 *  by {@link slug_states} (used by all rendering hot paths).
 *
 *  When a slug map is supplied, the identifier is the slug wrapped in
 *  double quotes — dot allows quoted identifiers, and the slug alphabet
 *  (lowercase alphanumerics + `-`) requires quoting because bare dot IDs
 *  may not contain `-`.  Graphviz round-trips the quoted form through to
 *  the SVG `<title>` element and uses the slug as a stable basis for the
 *  generated SVG element `id` attribute.
 *
 *  ```typescript
 *  node_of('Red Light', new Map([['Red Light', 'red-light']]));
 *  // '"red-light"'
 *  ```
 *
 *  @internal
 */
function node_of(state: string, state_index: string[] | Map<string, number> | Map<string, string>): string {
  if (Array.isArray(state_index)) { return `n${state_index.indexOf(state)}`; }
  const v = state_index.get(state);
  if (typeof v === 'string') { return `"${v}"`; }
  return `n${v}`;
}




/**
 *  Convert an 8-channel hex color (`#RRGGBBAA`) to a 6-channel hex color
 *  (`#RRGGBB`), discarding the alpha channel.  Throws if the input is not
 *  a 9-character `#`-prefixed string.
 *
 *  Graphviz dot does not support alpha; this is a lossy projection.
 *
 *  @internal
 */
function color8to6(color8: string): string {
  if ((color8.length !== 9) || (color8[0] !== '#')) {
    throw new JssmError(undefined, `not a color8: ${color8}`);
  }
  return `#${color8.substring(1, 7)}`;
}




/**
 *  Variant of {@link color8to6} that passes `undefined` through.
 *
 *  @internal
 */
function u_color8to6(color8?: string): string | undefined {
  return color8 === undefined ? undefined : color8to6(color8);
}




/**
 *  Read the graphviz shape for a state through {@link jssm.Machine.style_for},
 *  so theme-supplied shapes are honoured along with per-state declarations.
 *  Returns `undefined` if neither a theme nor a state declaration supplies a
 *  shape.
 *
 *  @internal
 */
function shape_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined {
  return u_jssm.style_for(state).shape;
}




/**
 *  Read the image filename for a state through {@link jssm.Machine.style_for},
 *  so theme-supplied images are honoured along with per-state declarations.
 *  Returns `undefined` if neither a theme nor a state declaration supplies an
 *  image.
 *
 *  @internal
 */
function image_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined {
  return u_jssm.style_for(state).image;
}




/**
 *  Compose a graphviz `style` string from a pre-computed
 *  {@link jssm.JssmStateConfig}, combining its `corners` and `lineStyle`
 *  fields.  Returns either the empty string (when neither field is set
 *  anywhere — state declaration nor theme) or a `corners,line,filled`-shape
 *  string.
 *
 *  Production callers should pass the result of `u_jssm.style_for(state)`
 *  so theme-supplied values are honoured uniformly with the rest of the
 *  rendering pipeline.
 *
 *  @internal
 */
function compose_style_string(style: JssmStateConfig): string {

  if (style.corners === undefined && style.lineStyle === undefined) { return ''; }

  const corners_map = { rounded: 'rounded', lined: 'diagonals', regular: 'regular' };
  const lines_map   = { dashed:  'dashed',  dotted: 'dotted',   solid:   'solid'   };

  const corners = corners_map[style.corners   ?? 'regular'];
  const lines   = lines_map  [style.lineStyle ?? 'solid'  ];

  return `${corners},${lines},filled`;

}




/**
 *  Compose a graphviz `style` string for a state by looking up its merged
 *  style via {@link jssm.Machine.style_for}, then delegating to
 *  {@link compose_style_string}.  Theme-supplied `corners` and `lineStyle`
 *  are honoured along with per-state declarations.
 *
 *  @internal
 */
function style_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string {
  return compose_style_string(u_jssm.style_for(state));
}




/**
 *  Convert an FSL flow direction (`up`/`right`/`down`/`left`) to a graphviz
 *  `rankdir=` declaration line.  Throws on unknown input.
 *
 *  @internal
 */
function flow_direction_to_rankdir(flow_direction: string): string {
  switch (flow_direction) {
    case 'up'    : return 'rankdir=BT;';
    case 'right' : return 'rankdir=LR;';
    case 'down'  : return 'rankdir=TB;';
    case 'left'  : return 'rankdir=RL;';
    default      : throw new JssmError(undefined, `unknown flow direction '${flow_direction}'`);
  }
}




/**
 *  Map a single `transition: {}` config item (`{ key, value }`) to a Graphviz
 *  *edge*-scope attribute `name="value"` pair, or `undefined` when the key has
 *  no edge-meaningful projection.  Mirrors the per-node mapping in
 *  {@link state_node_line}, but targets the attribute names Graphviz uses on
 *  edges:
 *
 *  - `color` and the legacy `graph_default_edge_color` both set the edge line
 *    `color`.
 *  - `text-color`  → edge label `fontcolor`.
 *  - `line-style`  → edge `style` (`dashed`/`dotted`/`solid` pass through).
 *
 *  Node-only keys (`background-color`, `shape`, `corners`, `image`, `url`,
 *  `state-label`, `border-color`) have no edge meaning and yield `undefined`,
 *  so they are dropped from the `edge [ … ]` default statement.
 *
 *  @internal
 */
function edge_attr_for(key: string, value: string): string | undefined {
  switch (key) {
    case 'color':
    case 'graph_default_edge_color': return `color="${doublequote(value)}"`;
    case 'text-color':               return `fontcolor="${doublequote(value)}"`;
    case 'line-style':               return `style="${doublequote(value)}"`;
    default:                         return undefined;
  }
}


/**
 *  Project a {@link JssmTransitionConfig} (the compiled `transition: {}` block)
 *  onto the body of a Graphviz default-edge statement — the attribute list that
 *  belongs inside `edge [ … ];`.  Per-key last-wins is already applied by the
 *  compiler, so the list is walked in order and each edge-meaningful key
 *  (see {@link edge_attr_for}) contributes one attribute.  Returns the empty
 *  string when the config is absent or contributes nothing, so a machine with
 *  no `transition: {}` block produces byte-identical output to before.
 *
 *  ```typescript
 *  edge_defaults_body([{ key: 'color', value: '#0000ffff' }]);
 *  // 'color="#0000ffff"'
 *  ```
 *
 *  @internal
 */
function edge_defaults_body(config: JssmTransitionConfig | undefined): string {
  if (!config) { return ''; }
  return config
    .map(item => edge_attr_for(item.key, item.value as string))
    .filter((a): a is string => a !== undefined)
    .join(' ');
}


/**
 *  Map a single `graph: {}` config item (`{ key, value }`) to a Graphviz
 *  *graph*-scope attribute `name="value"` pair, or `undefined` when the key is
 *  either not graph-meaningful or already handled by another machine path
 *  (`graph_layout` → SVG engine, `flow` → `rankdir`, `theme` → style cascade,
 *  `dot_preamble` → preamble).  `background-color` is handled separately — it
 *  feeds the existing single `bgcolor` slot in {@link dot_template} so it is
 *  never double-emitted — and so is excluded here.
 *
 *  - `color`      → graph `color` (cluster/graph border).
 *  - `text-color` → graph `fontcolor`.
 *
 *  @internal
 */
function graph_attr_for(key: string, value: string): string | undefined {
  switch (key) {
    case 'color':      return `color="${doublequote(value)}"`;
    case 'text-color': return `fontcolor="${doublequote(value)}"`;
    default:           return undefined;
  }
}


/**
 *  Read the effective graph background color from a {@link JssmGraphConfig},
 *  honouring the `background-color` item the compiler folded `graph_bg_color`
 *  into (and into which an explicit `graph: { background-color: … }` block
 *  already won, last-wins).  Falls back to the supplied palette default when
 *  the config carries no background color, so output is unchanged for machines
 *  without a `graph: {}` background.
 *
 *  This is the single reconciliation point for the graph background: the value
 *  it returns flows into {@link dot_template}'s one `bgcolor="…"` slot, so the
 *  `graph: {}` value wins over the legacy alias and is never emitted twice.
 *
 *  @internal
 */
function graph_bg_color_from_config(config: JssmGraphConfig | undefined, fallback: string): string {
  if (!config) { return fallback; }
  const item = config.find(i => i.key === 'background-color');
  return item ? (item.value as string) : fallback;
}


/**
 *  Project the graph-scope attributes of a {@link JssmGraphConfig} that are NOT
 *  the background color (handled via {@link graph_bg_color_from_config}) onto
 *  one Graphviz graph attribute statement per key (e.g. `color="…";`).  Returns
 *  the empty string when nothing applies, so machines without graph-scope color
 *  attributes are byte-identical to before.
 *
 *  @internal
 */
function graph_attrs_body(config: JssmGraphConfig | undefined): string {
  if (!config) { return ''; }
  return config
    .map(item => graph_attr_for(item.key, item.value as string))
    .filter((a): a is string => a !== undefined)
    .map(a => `${a};`)
    .join('\n');
}


/**
 *  Build the graphviz `digraph G { ... }` envelope from rendered fragments.
 *
 *  The optional `preamble` is inlined just after `digraph G {`, before any
 *  graph attributes; the optional `footer` is inlined just before the closing
 *  `}`, after all arrange declarations.  Both are emitted verbatim, separated
 *  from surrounding content by a blank line so that empty strings render
 *  cleanly (no stray whitespace artifacts in the output).
 *
 *  The `edge_defaults` body (mapped from the machine's `transition: {}` block)
 *  is appended after the built-in `edge [ … ]` defaults so user-supplied edge
 *  colour/style wins; an empty body leaves the built-in statement untouched.
 *  `extra_graph_attrs` (mapped from the non-background graph-scope keys of the
 *  `graph: {}` block) is emitted just after `bgcolor`; the background colour
 *  itself flows through the single `graph_bg_color` slot so it is never
 *  double-emitted.
 *
 *  @param rank_dir Pre-rendered `rankdir=...;` fragment (see {@link flow_direction_to_rankdir}).
 *  @param graph_bg_color CSS-style color string for `bgcolor`.
 *  @param nodes Rendered node-declaration block.
 *  @param edges Rendered edge-declaration block.
 *  @param arranges Rendered rank-arrangement block.
 *  @param preamble Optional verbatim dot source inserted just after `digraph G {`.
 *  @param footer Optional verbatim dot source inserted just before the closing `}`.
 *  @param edge_defaults Attribute body for the machine's `transition: {}` edge defaults.
 *  @param extra_graph_attrs Graph-scope attribute statements from the `graph: {}` block.
 *  @returns A complete graphviz dot source string.
 *
 *  @internal
 */
function dot_template(rank_dir: string, graph_bg_color: string, nodes: string, edges: string, arranges: string, preamble = '', footer = '', edge_defaults = '', extra_graph_attrs = ''): string {
  return `digraph G {
${preamble}

${rank_dir}
fontname="Open Sans";
style=filled;
bgcolor="${graph_bg_color}";
${extra_graph_attrs}
node [fontsize=14; shape=box; style=filled; fillcolor=white; fontname="Times New Roman"];
edge [fontsize=6; fontname="Open Sans"; fontcolor="#0066bb"];
${edge_defaults ? `edge [ ${edge_defaults} ];\n` : ''}
${nodes}

${edges}

${arranges}

${footer}
}`;
}




/**
 *  Classification of a state for viz styling purposes.  Each bucket is
 *  meaningfully distinct:
 *
 *  - `final`    — the state is both terminal AND complete (the strongest
 *                 form; user-marked complete *and* has no exits).
 *  - `complete` — the state is user-marked complete but still has exits.
 *  - `terminal` — the state has no exits but is not user-marked complete
 *                 (automatic / structural terminus).
 *  - `base`     — none of the above.
 *
 *  Historical note: the viz code used to check `state_is_final` first,
 *  which made the `complete` and `terminal` branches structurally
 *  unreachable (because `state_is_final` in the jssm core is itself
 *  `terminal || complete`).  That meant per-state-kind styling
 *  differences were silently absent for any state that was only complete
 *  or only terminal — a long-standing bug.  The fix is to check the two
 *  underlying predicates directly so the three named buckets reflect
 *  three meaningfully distinct conditions.
 *
 *  @internal
 */
type StateKind = 'final' | 'complete' | 'terminal' | 'base';

/**
 *  Compute state-kind classification for every state once per render.
 *  Replaces per-edge calls to `state_is_complete` / `state_is_terminal`
 *  (the latter rebuilds a fresh `list_exits` array each call) with O(1)
 *  Map lookups.  Significant win on machines with many edges.
 *
 *  The conjunction (`final` = complete AND terminal) is computed directly
 *  rather than via `state_is_final`, which returns the disjunction
 *  (terminal OR complete) and would collapse the three named buckets
 *  into two — see the type docstring above.
 *
 *  @internal
 */
function classify_states<T>(u_jssm: jssm.Machine<T>, l_states: string[]): Map<string, StateKind> {
  const kinds = new Map<string, StateKind>();
  for (const s of l_states) {
    const is_complete = u_jssm.state_is_complete(s);
    const is_terminal = u_jssm.state_is_terminal(s);
    if      (is_complete && is_terminal) { kinds.set(s, 'final');    }
    else if (is_complete)                { kinds.set(s, 'complete'); }
    else if (is_terminal)                { kinds.set(s, 'terminal'); }
    else                                 { kinds.set(s, 'base');     }
  }
  return kinds;
}




/**
 *  Pick the default fill color for a state, by state-kind precedence
 *  (final > complete > terminal > none).  Returns empty string if no
 *  kind applies.
 *
 *  @internal
 */
function default_fillcolor_for(kind: StateKind): string {
  switch (kind) {
    case 'final':    return vc('fill_final');
    case 'complete': return vc('fill_complete');
    case 'terminal': return vc('fill_terminal');
    default:         return '';
  }
}




/**
 *  Render the node-feature list for one machine, one node per state.
 *  All style reads route through {@link jssm.Machine.style_for} so that
 *  theme-supplied values (corners, lineStyle, image, shape, colours, url)
 *  are honoured uniformly.  A single `style_for` call per state —
 *  downstream helpers operate on the cached result rather than
 *  re-querying.
 *
 *  When a state declares a `url`, that value is emitted as Graphviz'
 *  uppercase `URL=` node attribute, which becomes an `xlink:href` on the
 *  rendered SVG node — providing click-through navigation from state
 *  shapes in diagrams.  See FSL issue StoneCypher/fsl#420.
 *
 *  When `hide_state_labels` is true, the `label=` attribute is omitted from
 *  every state's node line; Graphviz then renders the node box without any
 *  text inside.  Useful for diagrams where the state shape carries meaning
 *  on its own (e.g. a tutorial graphic, an icon-only diagram, or a
 *  presentation slide).
 *
 *  @internal
 */
function state_node_line<T>(u_jssm: jssm.Machine<T>, s: string, state_index: Map<string, string>, state_kinds: Map<string, StateKind>, hide_state_labels: boolean, chips: string[]): string {

  const style     = u_jssm.style_for(s);
  const fillcolor = style.backgroundColor || default_fillcolor_for(state_kinds.get(s) ?? 'base');

  // doublequote the display text so a state name containing literal `"`
  // (e.g. `"Output \"foo\""`) produces valid DOT instead of an unbalanced
  // `label="Output "foo""` that crashes the graphviz/emscripten renderer.
  // chips are already escaped by label_with_chips.  StoneCypher/fsl#474
  const label     = hide_state_labels ? '' : label_with_chips(doublequote(u_jssm.display_text(s)), chips);

  const features = [
    ['label',     label],
    ['shape',     style.shape       || ''],
    ['color',     style.borderColor || ''],
    ['style',     compose_style_string(style)],
    ['fontcolor', style.textColor   || ''],
    ['image',     style.image       || ''],
    ['URL',       style.url         || ''],
    ['fillcolor', fillcolor]
  ]
    .filter(r => r[1])
    .map(r => `${r[0]}="${r[1]}"`)
    .join(' ');

  return `${node_of(s, state_index)} [${features}];`;

}

/**
 *  Render the node-feature line for one state, routing every style read
 *  through {@link jssm.Machine.style_for} so theme-supplied values are
 *  honoured uniformly.  Extracted so the group-cluster builder can emit the
 *  identical node statement inside a `subgraph cluster_… { … }` block.
 *
 *  @internal
 */
function states_to_nodes_string<T>(u_jssm: jssm.Machine<T>, l_states: string[], state_index: Map<string, string>, state_kinds: Map<string, StateKind>, hide_state_labels = false, chips: Map<string, string[]> = new Map()): string {

  return l_states
    .map((s) => state_node_line(u_jssm, s, state_index, state_kinds, hide_state_labels, chips.get(s) ?? []))
    .join(' ');

}




/**
 *  Compose a multi-line `action\nprobability` label for a transition.
 *  Returns `undefined` when both fields are absent, so callers can skip
 *  emitting the attribute entirely.
 *
 *  @internal
 */
function transition_label<T>(tr: JssmTransition<string, T> | undefined): string | undefined {
  if (!tr) { return undefined; }
  const parts = [`${tr.action || ''}`, `${tr.probability || ''}`].filter(x => x !== '');
  return parts.length ? parts.join('\n') : undefined;
}




/**
 *  Pick the graphviz arrowhead style for a transition, by transition kind
 *  (forced > main > normal).
 *
 *  @internal
 */
function arrow_for<T>(tr: JssmTransition<string, T> | undefined): string {
  if (!tr)              { return '';                 }
  if (tr.forced_only)   { return 'ediamond';         }
  if (tr.main_path)     { return 'normal;weight=5';  }
  return 'empty';
}




/**
 *  Pick the line color for a transition end-position from a precomputed
 *  state-kind classification (final > complete > terminal > base).
 *
 *  @internal
 */
function line_color(kind: StateKind, lkind: string, suffix: string): string {
  switch (kind) {
    case 'final':    return vc(`${lkind}_final${suffix}`);
    case 'complete': return vc(`${lkind}_complete${suffix}`);
    case 'terminal': return vc(`${lkind}_terminal${suffix}`);
    default:         return vc(`${lkind}${suffix}`);
  }
}




/**
 *  Pick the text color for a transition label end-position from a precomputed
 *  state-kind classification (final > complete > terminal > none).
 *
 *  @internal
 */
function text_color(kind: StateKind, suffix: string): string {
  switch (kind) {
    case 'final':    return vc(`text_final${suffix}`);
    case 'complete': return vc(`text_complete${suffix}`);
    case 'terminal': return vc(`text_terminal${suffix}`);
    default:         return '';
  }
}




/**
 *  Build the colored-HTML `headlabel=` / `taillabel=` fragment for a
 *  transition end, concatenating `name`, `probability`, and `action`
 *  fields when present.  Returns the empty string when nothing should
 *  be emitted.
 *
 *  Historical note: the original jssm-viz code passed `JssmTransitionList`
 *  wrappers to this builder by mistake, so this colored-HTML label path
 *  silently produced empty strings for years; only the simpler
 *  `taillabel="..."` form below kept user-visible labels rendering.
 *  Fixed during the merge.
 *
 *  @internal
 */
function colored_label<T>(tr: JssmTransition<string, T> | undefined, which: 'headlabel' | 'taillabel', color: string): string {
  if (!tr) { return ''; }
  const text = [tr.name, tr.probability, tr.action].filter(q => q).join('<br/>');
  if (!text) { return ''; }
  const body = color ? `<<font color="${color}">${text}</font>>` : `"${text}"`;
  return `${which}=${body};`;
}




/**
 *  Render the edge-feature list, including bidirectional fold-up and
 *  per-direction action / probability labels.  Suppressed-edge tracking
 *  uses an internally-owned `Set<string>` keyed by `"from|to"` for O(1)
 *  duplicate detection, replacing the previous `[string, string][]`
 *  accumulator and O(n) `find` probe.
 *
 *  @internal
 */
function states_to_edges_string<T>(u_jssm: jssm.Machine<T>, l_states: string[], state_index: Map<string, string>, state_kinds: Map<string, StateKind>): string {

  const strike      = new Set<string>();
  const kind_of     = (s: string): StateKind => state_kinds.get(s) ?? 'base';

  // `farrange` forces its members' left-to-right order by relaxing the rank
  // constraint of every real edge incident to a member, so the invisible
  // ordering chain (emitted in arranges_for) wins over the members' own edges.
  const farrange_members = new Set<string>(
    ((u_jssm._farrange_declaration as string[][]) || []).flat().map(String));
  const cf = (s: string, ex: string): string =>
    (farrange_members.has(String(s)) || farrange_members.has(String(ex))) ? 'constraint=false;' : '';

  // Render one solo directed edge `s -> ex` for transition `tr`.
  const solo_edge = (s: string, ex: string, tr: JssmTransition<string, T>): string => {
    const ex_kind     = kind_of(ex);
    const tailColor   = text_color(ex_kind, '_solo');
    const labelInline = colored_label(tr, 'taillabel', tailColor);
    const label       = transition_label(tr);
    const maybeLabel  = label ? `taillabel="${doublequote(label)}";` : '';
    const arrowHead   = arrow_for(tr);
    const edgeInline  = `${maybeLabel}arrowhead=${arrowHead};color="${line_color(ex_kind, tr.kind, '_solo')}"`;
    return `${node_of(s, state_index)}->${node_of(ex, state_index)} [${cf(s, ex)}${labelInline}${edgeInline}];`;
  };

  return l_states.map((s) =>

    u_jssm.list_exits(s).map((ex) => {

      if (strike.has(`${s}|${ex}`)) { return ''; }

      const forward = u_jssm.edges_between(s, ex);
      if (forward.length === 0) { return ''; }   // belt-and-suspenders; list_exits should always have a corresponding transition

      const reverse = (s !== ex) ? u_jssm.edges_between(ex, s) : [];

      // Bidirectional merge stays the default for the common case: exactly one
      // edge each way between two distinct states draws as a single `dir=both`
      // edge with head/tail labels.  Parallel edges (#325) or self-loops fall
      // through to one directed line per edge.
      if (forward.length === 1 && reverse.length === 1) {

        const edge_tr = forward[0];
        const pair_tr = reverse[0];

        const s_kind  = kind_of(s);
        const ex_kind = kind_of(ex);

        // colored-HTML labels (per-direction, with text colors)
        const headColor = text_color(s_kind,  '_1');
        const tailColor = text_color(ex_kind, '_2');

        const labelInline =
          colored_label(pair_tr, 'headlabel', headColor) +
          colored_label(edge_tr, 'taillabel', tailColor);

        // plain `headlabel="..."` / `taillabel="..."` fallback
        const label       = transition_label(edge_tr);
        const rlabel      = transition_label(pair_tr);
        const maybeLabel  = label  ? `taillabel="${doublequote(label)}";`  : '';
        const maybeRLabel = rlabel ? `headlabel="${doublequote(rlabel)}";` : '';

        const arrowHead = arrow_for(edge_tr);
        const arrowTail = arrow_for(pair_tr);

        const edgeInline = `${maybeLabel}${maybeRLabel}arrowhead=${arrowHead};arrowtail=${arrowTail};dir=both;color="${line_color(ex_kind, edge_tr.kind, '_1')}:${line_color(s_kind, pair_tr.kind, '_2')}"`;

        strike.add(`${ex}|${s}`);

        return `${node_of(s, state_index)}->${node_of(ex, state_index)} [${cf(s, ex)}${labelInline}${edgeInline}];`;
      }

      // one directed line per forward edge — parallel action edges (#325) and
      // self-loops (#531) draw each transition separately.  The reverse edges,
      // if any, render when the loop reaches the (ex, s) pair (not struck here).
      return forward.map((tr) => solo_edge(s, ex, tr)).join(' ');

    }).join(' ')

  ).join(' ');

}




/**
 *  Render `arrange`, `arrange_start`, `arrange_end`, `oarrange`, and `farrange`
 *  declarations to rank-grouped subgraphs (`rank=same`/`rank=min`/`rank=max`).
 *
 *  `arrange*` emit only a rank group. `oarrange`/`farrange` additionally emit an
 *  invisible left-to-right ordering chain (`a->b->c [style=invis]`) so the listed
 *  states keep their written order on the rank. `oarrange` is best-effort (it
 *  yields to hard rank constraints, never reshaping the graph); `farrange`'s
 *  ordering is forced by also relaxing its members' real edges via
 *  `constraint=false`, emitted in {@link states_to_edges_string}.
 *
 *  @internal
 */
function arranges_for<T>(u_jssm: jssm.Machine<T>, state_index: Map<string, string>): string {

  const group = (decls: string[][] | undefined, rank: string): string =>
    decls
      ? decls.map(d => `{rank=${rank}; ${d.map(di => node_of(di, state_index)).join('; ')};};`).join('\n')
      : '';

  // For each group, an invisible chain pinning left-to-right order: one
  // `prev->cur [style=invis]` edge per adjacent pair (empty for <2 members).
  const order_chain = (decls: string[][] | undefined): string =>
    decls
      ? decls.map(d => d.slice(1).map((di, i) =>
          `${node_of(d[i], state_index)}->${node_of(di, state_index)} [style=invis];`).join(' ')
        ).join('\n')
      : '';

  return group(u_jssm._arrange_declaration,       'same')
       + group(u_jssm._arrange_start_declaration, 'min')
       + group(u_jssm._arrange_end_declaration,   'max')
       + group(u_jssm._oarrange_declaration,      'same') + order_chain(u_jssm._oarrange_declaration)
       + group(u_jssm._farrange_declaration,      'same') + order_chain(u_jssm._farrange_declaration);

}




/**
 *  Slugify a group name into the body of a Graphviz `cluster_…` subgraph
 *  identifier.  Graphviz treats any `subgraph` whose name begins with the
 *  literal `cluster` as a visually-boxed cluster, so the emitted name is
 *  `cluster_<slug>_<index>`.  The slug alphabet is lowercase alphanumerics
 *  joined by `_`; a name that slugs to empty (e.g. `&"!!!"`) falls back to
 *  `g<index>` (the index alone, no slug component).  The `_<index>` suffix
 *  guarantees every group gets a unique cluster id even when two distinct
 *  names happen to slugify identically (e.g. `"Active Players"` and
 *  `"active-players"` both slug to `active_players`).
 *
 *  ```typescript
 *  cluster_id_for('Active Players', 0);  // 'cluster_active_players_0'
 *  cluster_id_for('!!!', 3);             // 'cluster_g3'
 *  ```
 *
 *  @param group The FSL group name.
 *  @param index The group's stable declaration-order index (0-based); included
 *  in the emitted id to prevent slug collisions.
 *  @returns A valid Graphviz subgraph identifier starting with `cluster_`.
 *
 *  @internal
 */
function cluster_id_for(group: string, index: number): string {
  const body = group.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return body ? `cluster_${body}_${index}` : `cluster_g${index}`;
}


/**
 *  Append group-membership chips to a node label.  Each extra group becomes a
 *  bracketed suffix (e.g. `Foo [overlap] [extra]`), so a node that the cluster
 *  tree can only place in its primary group still surfaces its other
 *  memberships visually.  With no chips the label is returned verbatim, so
 *  chip-free output is byte-identical to the historical label.
 *
 *  ```typescript
 *  label_with_chips('Foo', []);              // 'Foo'
 *  label_with_chips('Foo', ['a', 'b']);      // 'Foo [a] [b]'
 *  ```
 *
 *  @internal
 */
function label_with_chips(label: string, chips: string[]): string {
  if (chips.length === 0) { return label; }
  return `${label} ${chips.map(c => `[${doublequote(c)}]`).join(' ')}`;
}


/**
 *  Build the group→parent-group map used to lay groups out as a properly
 *  nested cluster tree.  Graphviz clusters must nest strictly (a node lives in
 *  exactly one innermost cluster, and clusters may not partially overlap), but
 *  the FSL group registry is a DAG — a sub-group may be referenced by several
 *  parents.  We therefore pick, for each group that is referenced as a
 *  `group`-kind member, a single *primary* parent: the earliest-declared group
 *  that lists it.  Groups with no parent are roots.
 *
 *  ```typescript
 *  // for `&inner:[a]; &outer:[&inner b];`
 *  // group_parent_map(reg, ['inner','outer']) === Map { 'inner' => 'outer' }
 *  ```
 *
 *  @internal
 */
function group_parent_map(registry: Map<string, JssmGroupMemberRef[]>, order: string[]): Map<string, string> {
  const parent = new Map<string, string>();
  for (const parent_name of order) {
    for (const member of registry.get(parent_name) ?? []) {
      if ((member.kind === 'group') && (!parent.has(member.name))) {
        parent.set(member.name, parent_name);
      }
    }
  }
  return parent;
}


/**
 *  Walk the primary-parent chain of a group up to its root, returning the
 *  ancestor set *including the group itself*.  Used both to nest clusters and
 *  to decide which of a state's memberships its primary cluster already
 *  represents (so the rest become chips).
 *
 *  @internal
 */
function group_ancestry(group: string, parents: Map<string, string>): Set<string> {
  const chain = new Set<string>();
  let cursor: string | undefined = group;
  while ((cursor !== undefined) && (!chain.has(cursor))) {
    chain.add(cursor);
    cursor = parents.get(cursor);
  }
  return chain;
}


/**
 *  Choose the *primary* cluster for a state: the innermost (smallest
 *  {@link membership_distance}) group containing it, ties broken by latest
 *  declaration order — the same precedence the config cascade uses, so a
 *  state's cluster placement agrees with the group whose style won.  Returns
 *  `undefined` for a state in no group.
 *
 *  @internal
 */
function primary_group_for<T>(u_jssm: jssm.Machine<T>, state: string, order: string[]): string | undefined {
  const containing = [ ...u_jssm.groupsOf(state) ];
  if (containing.length === 0) { return undefined; }
  return containing.reduce((best, g) => {
    const d_best = membership_distance(u_jssm._group_registry, state, best);
    const d_g    = membership_distance(u_jssm._group_registry, state, g);
    if (d_g !== d_best) { return d_g < d_best ? g : best; }
    return order.indexOf(g) > order.indexOf(best) ? g : best;
  });
}


/**
 *  Plan how each state's groups are rendered in `'cluster'` mode.  Produces,
 *  per state, the *primary* cluster it is placed in (or `undefined` for an
 *  ungrouped state) plus the *chip* groups — memberships the primary cluster's
 *  ancestry does not already represent, i.e. genuine overlap that nesting
 *  cannot show.
 *
 *  @returns `{ placement, chips }` where `placement` maps state → primary
 *  group, and `chips` maps state → the overflow group names (declaration
 *  order).
 *
 *  @internal
 */
function plan_cluster_groups<T>(u_jssm: jssm.Machine<T>, l_states: string[], order: string[], parents: Map<string, string>): { placement: Map<string, string>, chips: Map<string, string[]> } {

  const placement = new Map<string, string>();
  const chips     = new Map<string, string[]>();

  for (const s of l_states) {
    const primary = primary_group_for(u_jssm, s, order);
    if (primary === undefined) { continue; }

    placement.set(s, primary);

    const represented = group_ancestry(primary, parents);
    const overflow    = order.filter(g => u_jssm.groupsOf(s).has(g) && (!represented.has(g)));
    if (overflow.length) { chips.set(s, overflow); }
  }

  return { placement, chips };

}


/**
 *  Emit the nested-cluster DOT for a machine's groups, weaving each state's
 *  node statement into its primary cluster's `subgraph cluster_<group> { … }`
 *  block, deepest group innermost.  Roots (groups with no primary parent) are
 *  emitted at top level; ungrouped states are returned separately so the
 *  caller can place them outside every cluster.
 *
 *  The cluster tree follows {@link group_parent_map} — the strict-nesting
 *  subset of the group DAG — so output is always valid Graphviz even when the
 *  source groups genuinely overlap; the unrepresentable memberships travel as
 *  chips on the node label instead (see {@link plan_cluster_groups}).
 *
 *  ```typescript
 *  // for `&inner:[a]; &outer:[&inner b]; a -> b;` the result contains
 *  //   subgraph cluster_outer { label="outer"; … subgraph cluster_inner { … } }
 *  ```
 *
 *  @returns `{ clusters, ungrouped_nodes }` — the cluster DOT block and the
 *  node statements for states in no group.
 *
 *  @internal
 */
function groups_to_subgraph_string<T>(u_jssm: jssm.Machine<T>, l_states: string[], state_index: Map<string, string>, state_kinds: Map<string, StateKind>, hide_state_labels: boolean): { clusters: string, ungrouped_nodes: string } {

  const order   = u_jssm.groups();
  const parents = group_parent_map(u_jssm._group_registry, order);

  const { placement, chips } = plan_cluster_groups(u_jssm, l_states, order, parents);

  // spread_children_of[p] = child group names listed as mode:'spread' by parent p whose
  // primary parent is p.  Spread children do NOT get their own sub-cluster; their member
  // states are inlined directly into the parent cluster.
  const spread_children_of = new Map<string, string[]>();
  const is_spread_child    = new Set<string>();
  for (const p of order) {
    for (const member of u_jssm._group_registry.get(p) ?? []) {
      if (member.kind === 'group' && member.mode === 'spread' && parents.get(member.name) === p) {
        const bucket = spread_children_of.get(p) ?? [];
        bucket.push(member.name);
        spread_children_of.set(p, bucket);
        is_spread_child.add(member.name);
      }
    }
  }

  // children[g] = nested (non-spread) sub-groups whose primary parent is g, in declaration order
  const children = new Map<string, string[]>();
  for (const g of order) {
    const p = parents.get(g);
    if (p !== undefined && !is_spread_child.has(g)) {
      const bucket = children.get(p) ?? [];
      bucket.push(g);
      children.set(p, bucket);
    }
  }

  // members[g] = states placed directly in cluster g, in state-declaration order
  const members = new Map<string, string[]>();
  for (const s of l_states) {
    const g = placement.get(s);
    if (g !== undefined) {
      const bucket = members.get(g) ?? [];
      bucket.push(s);
      members.set(g, bucket);
    }
  }

  const node_line = (s: string): string =>
    state_node_line(u_jssm, s, state_index, state_kinds, hide_state_labels, chips.get(s) ?? []);

  const render_cluster = (g: string, index: number): string => {
    const direct_nodes  = (members.get(g) ?? []).map(node_line).join(' ');
    const spread_nodes  = (spread_children_of.get(g) ?? [])
      .flatMap(c => members.get(c) ?? [])
      .map(node_line)
      .join(' ');
    const inner_nodes   = [direct_nodes, spread_nodes].filter(Boolean).join(' ');
    const sub           = (children.get(g) ?? []).map(c => render_cluster(c, order.indexOf(c))).join(' ');
    const body          = [inner_nodes, sub].filter(Boolean).join(' ');
    if (!body) { return ''; }
    return `subgraph ${cluster_id_for(g, index)} { label="${doublequote(g)}"; ${body} };`;
  };

  const roots    = order.filter(g => parents.get(g) === undefined && !is_spread_child.has(g));
  const clusters = roots.map(g => render_cluster(g, order.indexOf(g))).filter(Boolean).join(' ');

  const ungrouped_nodes = l_states
    .filter(s => !placement.has(s))
    .map(node_line)
    .join(' ');

  return { clusters, ungrouped_nodes };

}


/**
 *  Build the per-state chip map for `'chips'` mode: every group a state
 *  belongs to, in declaration order, becomes a chip on its label, and no
 *  clusters are emitted at all.  This is the all-chips counterpart to the
 *  overflow-only chips produced by {@link plan_cluster_groups}.
 *
 *  ```typescript
 *  // for `&inner:[a]; &outer:[&inner b]; a -> b;`
 *  // chips_for_all_groups(m, ['a','b']) === Map { 'a' => ['inner','outer'], 'b' => ['outer'] }
 *  ```
 *
 *  @internal
 */
function chips_for_all_groups<T>(u_jssm: jssm.Machine<T>, l_states: string[]): Map<string, string[]> {
  const order = u_jssm.groups();
  const chips = new Map<string, string[]>();
  for (const s of l_states) {
    const groups = u_jssm.groupsOf(s);
    const mine   = order.filter(g => groups.has(g));
    if (mine.length) { chips.set(s, mine); }
  }
  return chips;
}


/**
 *  Options for the dot/SVG render entry points.
 *
 *  - `hide_state_labels` (default `false`) — when `true`, the rendered dot
 *    output omits the `label=` attribute on every state's node line.
 *    Graphviz then draws the box without any text inside.  Useful for
 *    diagrams where shape, color, or layout alone carry the meaning
 *    (icon-only diagrams, tutorial graphics, presentation slides).
 *  - `footer` — verbatim dot source inserted just before the closing `}`
 *    of the generated dot source (e.g. `labelloc="b"; label="caption";`).
 *  - `engine` — graphviz layout engine for the SVG render path (e.g.
 *    `dot`, `neato`, `circo`); honored by `fsl_to_svg_string`.
 *  - `render_groups` (default `'cluster'`) — how FSL state groups are drawn;
 *    see {@link RenderGroups}.  `'off'` reproduces the historical, group-blind
 *    output byte-for-byte.
 */
type VizRenderOpts = {
  hide_state_labels?: boolean,
  footer?: string,
  engine?: string,
  render_groups?: RenderGroups
};


/**
 *  Assemble the node-declaration block for a machine, honouring the
 *  `render_groups` mode:
 *
 *  - `'cluster'` — emit nested `subgraph cluster_<group> { … }` boxes via
 *    {@link groups_to_subgraph_string}, with each member node statement woven
 *    into its primary cluster and overlap memberships chipped onto the label.
 *  - `'chips'`   — emit a flat node list (no clusters) with *every* group
 *    membership rendered as a label chip (see {@link chips_for_all_groups}).
 *  - `'off'`     — emit the historical flat node list, ignoring groups
 *    entirely; output is byte-identical to the pre-groups renderer.
 *
 *  A machine that declares no groups produces the same flat node list in every
 *  mode, so `'cluster'`/`'chips'` are no-ops there.
 *
 *  @internal
 */
function node_block_for<T>(u_jssm: jssm.Machine<T>, l_states: string[], state_index: Map<string, string>, state_kinds: Map<string, StateKind>, hide_labels: boolean, mode: RenderGroups): string {

  if ((mode === 'off') || (u_jssm.groups().length === 0)) {
    return states_to_nodes_string(u_jssm, l_states, state_index, state_kinds, hide_labels);
  }

  if (mode === 'chips') {
    const chips = chips_for_all_groups(u_jssm, l_states);
    return states_to_nodes_string(u_jssm, l_states, state_index, state_kinds, hide_labels, chips);
  }

  const { clusters, ungrouped_nodes } =
    groups_to_subgraph_string(u_jssm, l_states, state_index, state_kinds, hide_labels);

  return `${clusters}${(clusters && ungrouped_nodes) ? ' ' : ''}${ungrouped_nodes}`;

}


/**
 *  Render a {@link jssm.Machine} as a graphviz dot string.
 *
 *  An optional `footer` may be supplied via `opts.footer`; it is emitted
 *  verbatim just before the closing `}` of the dot source, after all
 *  arrange declarations.  This is a function-argument-only feature for
 *  the moment — a machine-attribute equivalent is planned as a follow-up.
 *
 *  ```typescript
 *  import { sm } from 'jssm';
 *  import { machine_to_dot } from 'jssm/viz';
 *
 *  const dot = machine_to_dot(sm`a -> b;`);
 *  // 'digraph G { ... }'
 *
 *  // suppress state-name labels (boxes only, no text inside)
 *  const dot2 = machine_to_dot(sm`a -> b;`, { hide_state_labels: true });
 *
 *  const dot_with_footer = machine_to_dot(sm`a -> b;`, { footer: 'labelloc="b"; label="caption";' });
 *  // 'digraph G { ... labelloc="b"; label="caption"; }'
 *
 *  // render FSL state groups as nested clusters (the default)
 *  const grouped = machine_to_dot(sm`&g : [a b]; a -> b;`);
 *  // 'digraph G { ... subgraph cluster_g { label="g"; ... } ... }'
 *
 *  // or as label chips, with no cluster boxes
 *  const chipped = machine_to_dot(sm`&g : [a b]; a -> b;`, { render_groups: 'chips' });
 *  ```
 *
 *  @param u_jssm The machine to render.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A complete graphviz dot source string.
 */
function machine_to_dot<T>(u_jssm: jssm.Machine<T>, opts: VizRenderOpts = {}): string {

  const l_states     = u_jssm.states();
  const state_index  = slug_states(l_states);
  const state_kinds  = classify_states(u_jssm, l_states);
  const hide_labels  = opts.hide_state_labels === true;
  const mode: RenderGroups = opts.render_groups ?? 'cluster';

  const nodes    = node_block_for(u_jssm, l_states, state_index, state_kinds, hide_labels, mode);
  const edges    = states_to_edges_string(u_jssm, l_states, state_index, state_kinds);
  const arranges = arranges_for(u_jssm, state_index);

  const rank_dir = flow_direction_to_rankdir(u_jssm.flow() || 'down');
  const preamble = u_jssm.dot_preamble() || '';
  const footer   = opts?.footer ?? '';

  // `transition: {}` → default `edge [ … ]` attrs; `graph: {}` → graph-scope
  // attrs.  The graph background reconciles through the single `bgcolor` slot
  // (the `graph: {}` value already won last-wins in the compiler), so it is
  // never double-emitted; the remaining graph-scope keys flow through
  // `extra_graph_attrs`.
  const transition_config = u_jssm.default_transition_config();
  const graph_config      = u_jssm.default_graph_config();

  const edge_defaults     = edge_defaults_body(transition_config);
  const extra_graph_attrs = graph_attrs_body(graph_config);
  const bg_color          = graph_bg_color_from_config(graph_config, vc('graph_bg_color'));

  return dot_template(rank_dir, bg_color, nodes, edges, arranges, preamble, footer, edge_defaults, extra_graph_attrs);

}




/**
 *  Render an FSL string directly to graphviz dot source.
 *
 *  ```typescript
 *  import { fsl_to_dot } from 'jssm/viz';
 *  const dot = fsl_to_dot('a -> b;');
 *
 *  // suppress state-name labels
 *  const dot2 = fsl_to_dot('a -> b;', { hide_state_labels: true });
 *
 *  const dot_with_footer = fsl_to_dot('a -> b;', { footer: 'label="caption";' });
 *  // 'digraph G { ... label="caption"; }'
 *  ```
 *
 *  @param fsl The FSL source.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A complete graphviz dot source string.
 */
function fsl_to_dot(fsl: string, opts: VizRenderOpts = {}): string {
  return machine_to_dot(jssm.sm`${fsl}`, opts);
}




/**
 *  Render a graphviz dot source string to SVG using `@viz-js/viz`.  The
 *  underlying viz instance is lazy-initialized on first call and cached for
 *  the lifetime of the module.
 *
 *  ```typescript
 *  const svg = await dot_to_svg('digraph G { a -> b }');
 *  const svg_neato = await dot_to_svg('digraph G { a -> b }', { engine: 'neato' });
 *  ```
 *
 *  @param dot Graphviz dot source.
 *  @param options Optional renderer overrides.
 *  @param options.engine Graphviz layout engine to use (e.g. `'dot'`,
 *  `'neato'`, `'circo'`).  Unrecognized engine names cause `@viz-js/viz`
 *  to throw at render time.
 *  @returns A promise resolving to an SVG XML string.
 */
async function dot_to_svg(dot: string, options?: { engine?: string }): Promise<string> {
  const viz = await get_viz();
  return viz.renderString(dot, { format: 'svg', ...(options ?? {}) });
}




/**
 *  Render an FSL string directly to SVG.
 *
 *  ```typescript
 *  const svg = await fsl_to_svg_string('a -> b;');
 *  const svg_neato = await fsl_to_svg_string('a -> b;', { engine: 'neato' });
 *  ```
 *
 *  @param fsl The FSL source.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to an SVG XML string.
 */
async function fsl_to_svg_string(fsl: string, opts: VizRenderOpts = {}): Promise<string> {
  return dot_to_svg(fsl_to_dot(fsl, opts), opts);
}




/**
 *  Render a {@link jssm.Machine} to SVG.
 *
 *  @param u_jssm The machine to render.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to an SVG XML string.
 */
async function machine_to_svg_string<T>(u_jssm: jssm.Machine<T>, opts: VizRenderOpts = {}): Promise<string> {
  return dot_to_svg(machine_to_dot(u_jssm, opts));
}




/**
 *  Resolve a `DOMParser` constructor: prefer `globalThis.DOMParser` (browsers,
 *  jsdom test environment), fall back to the value passed to {@link configure},
 *  throw `JssmError` if neither is available.
 *
 *  @internal
 */
function get_dom_parser(): typeof globalThis.DOMParser {
  if (typeof globalThis.DOMParser === 'function') { return globalThis.DOMParser; }
  if (injected_dom_parser !== null)               { return injected_dom_parser; }
  throw new JssmError(undefined,
    'jssm/viz: *_svg_element requires a browser DOM. Use *_svg_string in Node, or call configure({ DOMParser }) with a parser from jsdom or @xmldom/xmldom.');
}




/**
 *  Render dot source to a parsed `SVGSVGElement`.  Browser-by-default; in
 *  Node, requires a `DOMParser` to have been injected via {@link configure}.
 *
 *  @param dot Graphviz dot source.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available.
 */
async function dot_to_svg_element(dot: string): Promise<SVGSVGElement> {
  const ParserCtor = get_dom_parser();
  const svg_string = await dot_to_svg(dot);
  const parser     = new ParserCtor();
  const doc        = parser.parseFromString(svg_string, 'image/svg+xml');
  return doc.documentElement as unknown as SVGSVGElement;
}




/**
 *  Render an FSL string directly to a parsed `SVGSVGElement`.
 *
 *  @param fsl The FSL source.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
async function fsl_to_svg_element(fsl: string, opts: VizRenderOpts = {}): Promise<SVGSVGElement> {
  return dot_to_svg_element(fsl_to_dot(fsl, opts));
}




/**
 *  Render a {@link jssm.Machine} to a parsed `SVGSVGElement`.
 *
 *  @param u_jssm The machine to render.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
async function machine_to_svg_element<T>(u_jssm: jssm.Machine<T>, opts: VizRenderOpts = {}): Promise<SVGSVGElement> {
  return dot_to_svg_element(machine_to_dot(u_jssm, opts));
}




/**
 *  Compatibility wrapper for {@link machine_to_dot}, retained from
 *  jssm-viz.  Will be removed in the next major.
 *
 *  @deprecated Use {@link machine_to_dot} instead.
 */
function dot<T>(machine: jssm.Machine<T>): string {
  return machine_to_dot(machine);
}




export {
  configure,
  dot, dot_to_svg,
  fsl_to_dot, fsl_to_svg_string, fsl_to_svg_element,
  machine_to_dot, machine_to_svg_string, machine_to_svg_element,
  version, build_time
};

export type { VizRenderOpts, RenderGroups };

/** @internal — test-only access to private helpers. */
export const _test = {
  doublequote,
  color8to6, u_color8to6, vc, node_of,
  slug_for, slug_states,
  shape_for_state, image_for_state, style_for_state,
  cluster_id_for, label_with_chips,
  group_parent_map, group_ancestry,
  primary_group_for, plan_cluster_groups,
  groups_to_subgraph_string, chips_for_all_groups,
  node_block_for,
  edge_attr_for, edge_defaults_body,
  graph_attr_for, graph_attrs_body, graph_bg_color_from_config
};
