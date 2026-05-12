
import * as jssm                 from './jssm';
import { JssmError }              from './jssm_error';
import { default_viz_colors }     from './jssm_viz_colors';
import { version, build_time }    from './version';

import type { Viz }               from '@viz-js/viz';
import type { JssmTransition, JssmStateConfig } from './jssm_types';




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
 *  Build a graphviz-safe node identifier for a state, by index.  Accepts
 *  either a `string[]` (used historically; O(n) per call) or a
 *  precomputed `Map<state, index>` (used by rendering hot paths; O(1)
 *  per call).  The map form is used during dot generation; the array
 *  form is retained for direct test access via `_test`.
 *
 *  @internal
 */
function node_of(state: string, state_index: string[] | Map<string, number>): string {
  return Array.isArray(state_index)
    ? `n${state_index.indexOf(state)}`
    : `n${state_index.get(state)}`;
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
 *  Build the graphviz `digraph G { ... }` envelope from rendered fragments.
 *
 *  @internal
 */
function dot_template(rank_dir: string, graph_bg_color: string, nodes: string, edges: string, arranges: string, preamble = ''): string {
  return `digraph G {
${preamble}

${rank_dir}
fontname="Open Sans";
style=filled;
bgcolor="${graph_bg_color}";
node [fontsize=14; shape=box; style=filled; fillcolor=white; fontname="Times New Roman"];
edge [fontsize=6; fontname="Open Sans"];

${nodes}

${edges}

${arranges}
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
 *  theme-supplied values (corners, lineStyle, image, shape, colours) are
 *  honoured uniformly.  A single `style_for` call per state — downstream
 *  helpers operate on the cached result rather than re-querying.
 *
 *  @internal
 */
function states_to_nodes_string<T>(u_jssm: jssm.Machine<T>, l_states: string[], state_index: Map<string, number>, state_kinds: Map<string, StateKind>): string {

  return l_states.map((s) => {

    const style     = u_jssm.style_for(s);
    const fillcolor = style.backgroundColor || default_fillcolor_for(state_kinds.get(s) ?? 'base');

    const features = [
      ['label',     u_jssm.display_text(s)],
      ['shape',     style.shape       || ''],
      ['color',     style.borderColor || ''],
      ['style',     compose_style_string(style)],
      ['fontcolor', style.textColor   || ''],
      ['image',     style.image       || ''],
      ['fillcolor', fillcolor]
    ]
      .filter(r => r[1])
      .map(r => `${r[0]}="${r[1]}"`)
      .join(' ');

    return `${node_of(s, state_index)} [${features}];`;

  }).join(' ');

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
function states_to_edges_string<T>(u_jssm: jssm.Machine<T>, l_states: string[], state_index: Map<string, number>, state_kinds: Map<string, StateKind>): string {

  const doublequote = (txt: string) => txt.replace(/"/g, '\\"');
  const strike      = new Set<string>();
  const kind_of     = (s: string): StateKind => state_kinds.get(s) ?? 'base';

  return l_states.map((s) =>

    u_jssm.list_exits(s).map((ex) => {

      if (strike.has(`${s}|${ex}`)) { return ''; }

      const edge_tr = u_jssm.lookup_transition_for(s, ex);
      if (!edge_tr) { return ''; }    // belt-and-suspenders; list_exits should always have a corresponding transition

      const pair_tr = u_jssm.lookup_transition_for(ex, s);
      const double  = (pair_tr !== undefined) && (s !== ex);

      const s_kind  = kind_of(s);
      const ex_kind = kind_of(ex);

      // colored-HTML labels (per-direction, with text colors)
      const headColor = text_color(s_kind,  double ? '_1' : '_solo');
      const tailColor = text_color(ex_kind, double ? '_2' : '_solo');

      const labelInline =
        colored_label(double ? pair_tr : undefined, 'headlabel', headColor) +
        colored_label(edge_tr,                       'taillabel', tailColor);

      // plain `headlabel="..."` / `taillabel="..."` fallback
      const label       = transition_label(edge_tr);
      const rlabel      = transition_label(pair_tr);
      const maybeLabel  = label  ? `taillabel="${doublequote(label)}";`  : '';
      const maybeRLabel = rlabel ? `headlabel="${doublequote(rlabel)}";` : '';

      const arrowHead = arrow_for(edge_tr);
      const arrowTail = arrow_for(pair_tr);

      const edgeInline = double
        ? `${maybeLabel}${maybeRLabel}arrowhead=${arrowHead};arrowtail=${arrowTail};dir=both;color="${line_color(ex_kind, edge_tr.kind, '_1')}:${line_color(s_kind, (pair_tr ?? { kind: 'legal' }).kind, '_2')}"`
        : `${maybeLabel}arrowhead=${arrowHead};color="${line_color(ex_kind, edge_tr.kind, '_solo')}"`;

      if (pair_tr) { strike.add(`${ex}|${s}`); }

      return `${node_of(s, state_index)}->${node_of(ex, state_index)} [${labelInline}${edgeInline}];`;

    }).join(' ')

  ).join(' ');

}




/**
 *  Render `arrange`, `arrange_start`, and `arrange_end` declarations to
 *  rank-grouped subgraphs (`rank=same`/`rank=min`/`rank=max`).
 *
 *  @internal
 */
function arranges_for<T>(u_jssm: jssm.Machine<T>, state_index: Map<string, number>): string {

  const group = (decls: string[][] | undefined, rank: string): string =>
    decls
      ? decls.map(d => `{rank=${rank}; ${d.map(di => node_of(di, state_index)).join('; ')};};`).join('\n')
      : '';

  return group(u_jssm._arrange_declaration,       'same')
       + group(u_jssm._arrange_start_declaration, 'min')
       + group(u_jssm._arrange_end_declaration,   'max');

}




/**
 *  Render a {@link jssm.Machine} as a graphviz dot string.
 *
 *  ```typescript
 *  import { sm } from 'jssm';
 *  import { machine_to_dot } from 'jssm/viz';
 *
 *  const dot = machine_to_dot(sm`a -> b;`);
 *  // 'digraph G { ... }'
 *  ```
 *
 *  @param u_jssm The machine to render.
 *  @returns A complete graphviz dot source string.
 */
function machine_to_dot<T>(u_jssm: jssm.Machine<T>): string {

  const l_states    = u_jssm.states();
  const state_index = new Map<string, number>(l_states.map((s, i) => [s, i] as [string, number]));
  const state_kinds = classify_states(u_jssm, l_states);

  const nodes    = states_to_nodes_string(u_jssm, l_states, state_index, state_kinds);
  const edges    = states_to_edges_string(u_jssm, l_states, state_index, state_kinds);
  const arranges = arranges_for(u_jssm, state_index);

  const rank_dir = flow_direction_to_rankdir(u_jssm.flow() || 'down');
  const preamble = u_jssm.dot_preamble() || '';

  return dot_template(rank_dir, vc('graph_bg_color'), nodes, edges, arranges, preamble);

}




/**
 *  Render an FSL string directly to graphviz dot source.
 *
 *  ```typescript
 *  import { fsl_to_dot } from 'jssm/viz';
 *  const dot = fsl_to_dot('a -> b;');
 *  ```
 *
 *  @param fsl The FSL source.
 *  @returns A complete graphviz dot source string.
 */
function fsl_to_dot(fsl: string): string {
  return machine_to_dot(jssm.sm`${fsl}`);
}




/**
 *  Render a graphviz dot source string to SVG using `@viz-js/viz`.  The
 *  underlying viz instance is lazy-initialized on first call and cached for
 *  the lifetime of the module.
 *
 *  ```typescript
 *  const svg = await dot_to_svg('digraph G { a -> b }');
 *  ```
 *
 *  @param dot Graphviz dot source.
 *  @returns A promise resolving to an SVG XML string.
 */
async function dot_to_svg(dot: string): Promise<string> {
  const viz = await get_viz();
  return viz.renderString(dot, { format: 'svg' });
}




/**
 *  Render an FSL string directly to SVG.
 *
 *  @param fsl The FSL source.
 *  @returns A promise resolving to an SVG XML string.
 */
async function fsl_to_svg_string(fsl: string): Promise<string> {
  return dot_to_svg(fsl_to_dot(fsl));
}




/**
 *  Render a {@link jssm.Machine} to SVG.
 *
 *  @param u_jssm The machine to render.
 *  @returns A promise resolving to an SVG XML string.
 */
async function machine_to_svg_string<T>(u_jssm: jssm.Machine<T>): Promise<string> {
  return dot_to_svg(machine_to_dot(u_jssm));
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
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
async function fsl_to_svg_element(fsl: string): Promise<SVGSVGElement> {
  return dot_to_svg_element(fsl_to_dot(fsl));
}




/**
 *  Render a {@link jssm.Machine} to a parsed `SVGSVGElement`.
 *
 *  @param u_jssm The machine to render.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
async function machine_to_svg_element<T>(u_jssm: jssm.Machine<T>): Promise<SVGSVGElement> {
  return dot_to_svg_element(machine_to_dot(u_jssm));
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

/** @internal — test-only access to private helpers. */
export const _test = {
  color8to6, u_color8to6, vc, node_of,
  shape_for_state, image_for_state, style_for_state
};
