import * as jssm from './jssm.js';
import { version, build_time } from './version.js';
import type { JssmGroupMemberRef, JssmTransitionConfig, JssmGraphConfig } from './jssm_types.js';
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
declare type RenderGroups = 'cluster' | 'chips' | 'off';
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
declare function configure(opts: {
    DOMParser?: typeof globalThis.DOMParser;
}): void;
/**
 *  Look up a color from the default viz palette by key, returning empty
 *  string if the key is unknown (so it disappears in feature concatenation).
 *
 *  @internal
 */
declare function vc(col: string): string;
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
declare function doublequote(txt: string): string;
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
declare function slug_for(state: string): string;
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
declare function slug_states(states: string[]): Map<string, string>;
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
declare function node_of(state: string, state_index: string[] | Map<string, number> | Map<string, string>): string;
/**
 *  Convert an 8-channel hex color (`#RRGGBBAA`) to a 6-channel hex color
 *  (`#RRGGBB`), discarding the alpha channel.  Throws if the input is not
 *  a 9-character `#`-prefixed string.
 *
 *  Graphviz dot does not support alpha; this is a lossy projection.
 *
 *  @internal
 */
declare function color8to6(color8: string): string;
/**
 *  Variant of {@link color8to6} that passes `undefined` through.
 *
 *  @internal
 */
declare function u_color8to6(color8?: string): string | undefined;
/**
 *  Read the graphviz shape for a state through {@link jssm.Machine.style_for},
 *  so theme-supplied shapes are honoured along with per-state declarations.
 *  Returns `undefined` if neither a theme nor a state declaration supplies a
 *  shape.
 *
 *  @internal
 */
declare function shape_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined;
/**
 *  Read the image filename for a state through {@link jssm.Machine.style_for},
 *  so theme-supplied images are honoured along with per-state declarations.
 *  Returns `undefined` if neither a theme nor a state declaration supplies an
 *  image.
 *
 *  @internal
 */
declare function image_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined;
/**
 *  Compose a graphviz `style` string for a state by looking up its merged
 *  style via {@link jssm.Machine.style_for}, then delegating to
 *  {@link compose_style_string}.  Theme-supplied `corners` and `lineStyle`
 *  are honoured along with per-state declarations.
 *
 *  @internal
 */
declare function style_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string;
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
declare function edge_attr_for(key: string, value: string): string | undefined;
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
declare function edge_defaults_body(config: JssmTransitionConfig | undefined): string;
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
declare function graph_attr_for(key: string, value: string): string | undefined;
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
declare function graph_bg_color_from_config(config: JssmGraphConfig | undefined, fallback: string): string;
/**
 *  Project the graph-scope attributes of a {@link JssmGraphConfig} that are NOT
 *  the background color (handled via {@link graph_bg_color_from_config}) onto
 *  one Graphviz graph attribute statement per key (e.g. `color="…";`).  Returns
 *  the empty string when nothing applies, so machines without graph-scope color
 *  attributes are byte-identical to before.
 *
 *  @internal
 */
declare function graph_attrs_body(config: JssmGraphConfig | undefined): string;
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
declare type StateKind = 'final' | 'complete' | 'terminal' | 'base';
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
declare function cluster_id_for(group: string, index: number): string;
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
declare function label_with_chips(label: string, chips: string[]): string;
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
declare function group_parent_map(registry: Map<string, JssmGroupMemberRef[]>, order: string[]): Map<string, string>;
/**
 *  Walk the primary-parent chain of a group up to its root, returning the
 *  ancestor set *including the group itself*.  Used both to nest clusters and
 *  to decide which of a state's memberships its primary cluster already
 *  represents (so the rest become chips).
 *
 *  @internal
 */
declare function group_ancestry(group: string, parents: Map<string, string>): Set<string>;
/**
 *  Choose the *primary* cluster for a state: the innermost (smallest
 *  {@link membership_distance}) group containing it, ties broken by latest
 *  declaration order — the same precedence the config cascade uses, so a
 *  state's cluster placement agrees with the group whose style won.  Returns
 *  `undefined` for a state in no group.
 *
 *  @internal
 */
declare function primary_group_for<T>(u_jssm: jssm.Machine<T>, state: string, order: string[]): string | undefined;
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
declare function plan_cluster_groups<T>(u_jssm: jssm.Machine<T>, l_states: string[], order: string[], parents: Map<string, string>): {
    placement: Map<string, string>;
    chips: Map<string, string[]>;
};
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
declare function groups_to_subgraph_string<T>(u_jssm: jssm.Machine<T>, l_states: string[], state_index: Map<string, string>, state_kinds: Map<string, StateKind>, hide_state_labels: boolean): {
    clusters: string;
    ungrouped_nodes: string;
};
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
declare function chips_for_all_groups<T>(u_jssm: jssm.Machine<T>, l_states: string[]): Map<string, string[]>;
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
declare type VizRenderOpts = {
    hide_state_labels?: boolean;
    footer?: string;
    engine?: string;
    render_groups?: RenderGroups;
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
declare function node_block_for<T>(u_jssm: jssm.Machine<T>, l_states: string[], state_index: Map<string, string>, state_kinds: Map<string, StateKind>, hide_labels: boolean, mode: RenderGroups): string;
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
declare function machine_to_dot<T>(u_jssm: jssm.Machine<T>, opts?: VizRenderOpts): string;
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
declare function fsl_to_dot(fsl: string, opts?: VizRenderOpts): string;
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
declare function dot_to_svg(dot: string, options?: {
    engine?: string;
}): Promise<string>;
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
declare function fsl_to_svg_string(fsl: string, opts?: VizRenderOpts): Promise<string>;
/**
 *  Render a {@link jssm.Machine} to SVG.
 *
 *  @param u_jssm The machine to render.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to an SVG XML string.
 */
declare function machine_to_svg_string<T>(u_jssm: jssm.Machine<T>, opts?: VizRenderOpts): Promise<string>;
/**
 *  Render an FSL string directly to a parsed `SVGSVGElement`.
 *
 *  @param fsl The FSL source.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
declare function fsl_to_svg_element(fsl: string, opts?: VizRenderOpts): Promise<SVGSVGElement>;
/**
 *  Render a {@link jssm.Machine} to a parsed `SVGSVGElement`.
 *
 *  @param u_jssm The machine to render.
 *  @param opts Optional render flags.  See {@link VizRenderOpts}.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
declare function machine_to_svg_element<T>(u_jssm: jssm.Machine<T>, opts?: VizRenderOpts): Promise<SVGSVGElement>;
/**
 *  Compatibility wrapper for {@link machine_to_dot}, retained from
 *  jssm-viz.  Will be removed in the next major.
 *
 *  @deprecated Use {@link machine_to_dot} instead.
 */
declare function dot<T>(machine: jssm.Machine<T>): string;
export { configure, dot, dot_to_svg, fsl_to_dot, fsl_to_svg_string, fsl_to_svg_element, machine_to_dot, machine_to_svg_string, machine_to_svg_element, version, build_time };
export type { VizRenderOpts, RenderGroups };
/** @internal — test-only access to private helpers. */
export declare const _test: {
    doublequote: typeof doublequote;
    color8to6: typeof color8to6;
    u_color8to6: typeof u_color8to6;
    vc: typeof vc;
    node_of: typeof node_of;
    slug_for: typeof slug_for;
    slug_states: typeof slug_states;
    shape_for_state: typeof shape_for_state;
    image_for_state: typeof image_for_state;
    style_for_state: typeof style_for_state;
    cluster_id_for: typeof cluster_id_for;
    label_with_chips: typeof label_with_chips;
    group_parent_map: typeof group_parent_map;
    group_ancestry: typeof group_ancestry;
    primary_group_for: typeof primary_group_for;
    plan_cluster_groups: typeof plan_cluster_groups;
    groups_to_subgraph_string: typeof groups_to_subgraph_string;
    chips_for_all_groups: typeof chips_for_all_groups;
    node_block_for: typeof node_block_for;
    edge_attr_for: typeof edge_attr_for;
    edge_defaults_body: typeof edge_defaults_body;
    graph_attr_for: typeof graph_attr_for;
    graph_attrs_body: typeof graph_attrs_body;
    graph_bg_color_from_config: typeof graph_bg_color_from_config;
};
