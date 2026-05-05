
import * as jssm                 from './jssm';
import { JssmError }              from './jssm_error';
import { default_viz_colors }     from './jssm_viz_colors';
import { version, build_time }    from './version';

import type { Viz }               from '@viz-js/viz';




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
 *  Build a graphviz-safe node identifier for a state, by index.
 *
 *  @internal
 */
function node_of(state: string, l_states: string[]): string {
  return `n${l_states.indexOf(state)}`;
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
  if (color8.length !== 9) { throw new JssmError(undefined, `not a color8: ${color8}`); }
  if (color8[0] !== '#')   { throw new JssmError(undefined, `not a color8: ${color8}`); }
  return `#${color8.substring(1, 7)}`;
}




/**
 *  Variant of {@link color8to6} that passes `undefined` through.
 *
 *  @internal
 */
function u_color8to6(color8?: string): string | undefined {
  if (color8 === undefined) { return undefined; }
  return color8to6(color8);
}




/**
 *  Read the border color from a state declaration, projecting from
 *  `#RRGGBBAA` to `#RRGGBB`.  Returns `undefined` if not declared.
 *
 *  @internal
 */
function border_color_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return u_color8to6(state_decl.borderColor);
}




/**
 *  Read the text color from a state declaration.  Returns `undefined` if
 *  not declared.
 *
 *  @internal
 */
function text_color_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return u_color8to6(state_decl.textColor);
}




/**
 *  Read the background color from a state declaration.  Returns `undefined`
 *  if not declared.
 *
 *  @internal
 */
function background_color_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return u_color8to6(state_decl.backgroundColor);
}




/**
 *  Read the graphviz shape for a state declaration.  Returns `undefined` if
 *  not declared.
 *
 *  @internal
 */
function shape_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return state_decl.shape;
}




/**
 *  Read the image filename for a state declaration.  Returns `undefined` if
 *  not declared.  Wired into dot output via `states_to_nodes_string`; the
 *  `image` property was added to jssm in commit `a045569`.
 *
 *  @internal
 */
function image_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return state_decl.image;
}




/**
 *  Compose a graphviz `style` string for a state, combining `corners` and
 *  `line-style` declarations.  Returns either the empty string or a
 *  `corners,line,filled`-shape string.
 *
 *  @internal
 */
function style_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string {
  const decls = u_jssm._state_declarations;
  if (!decls) { return ''; }
  const state_decl = decls.get(state);
  if (!state_decl) { return ''; }

  const corners = {
    rounded : 'rounded',
    lined   : 'diagonals',
    regular : 'regular'
  }[state_decl.corners ?? 'regular'];

  const lines = {
    dashed : 'dashed',
    dotted : 'dotted',
    solid  : 'solid'
  }[state_decl.lineStyle ?? 'solid'];

  const style = [corners, lines]
                  .filter(f => f !== '')
                  .join(',');

  return style ? `${style},filled` : '';
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
 *  Render the node-feature list for one machine, one node per state.
 *
 *  @internal
 */
function states_to_nodes_string<T>(u_jssm: jssm.Machine<T>, l_states: string[]): string {

  return l_states.map((s) => {

    const style        = u_jssm.style_for(s);
    const border_color = style.borderColor;
    const bgcolor      = style.backgroundColor;
    const fgcolor      = style.textColor;

    const terminal  = u_jssm.state_is_terminal(s);
    const final_    = u_jssm.state_is_final(s);
    const complete  = u_jssm.state_is_complete(s);
    const use_label = u_jssm.display_text(s);
    const image     = image_for_state(u_jssm, s);

    const features = [
      ['label',     use_label],
      ['shape',     style.shape                  || ''],
      ['color',     border_color                 || ''],
      ['style',     style_for_state(u_jssm, s)   || ''],
      ['fontcolor', fgcolor                      || ''],
      ['image',     image                        || ''],
      ['fillcolor', bgcolor ? bgcolor :
                    (final_   ? vc('fill_final') :
                    (complete ? vc('fill_complete') :
                    (terminal ? vc('fill_terminal') : '')))]
    ]
      .filter(r => r[1])
      .map(r => `${r[0]}="${r[1]}"`)
      .join(' ');

    return `${node_of(s, l_states)} [${features}];`;

  }).join(' ');

}




/**
 *  Render the edge-feature list, including bidirectional fold-up and
 *  per-direction action / probability labels.  Pushed strikes prevent
 *  duplicate emission of bidirectional edges.
 *
 *  @internal
 */
function states_to_edges_string<T>(u_jssm: jssm.Machine<T>, l_states: string[], strike: [string, string][]): string {

  return u_jssm.states().map((s) =>

    u_jssm.list_exits(s).map((ex) => {

      if (strike.find(row => (row[0] === s) && (row[1] == ex))) {
        return '';
      }

      const doublequote = (txt: string) => txt.replace(/"/g, '\\"');

      const edge_tr = u_jssm.lookup_transition_for(s, ex);
      if (!edge_tr) { return ''; }    // belt-and-suspenders; list_exits should always have a corresponding transition

      const pair_id = u_jssm.get_transition_by_state_names(ex, s);
      const pair_tr = u_jssm.lookup_transition_for(ex, s);
      const double  = (pair_id !== undefined) && (s !== ex);

      const if_obj_field = (obj: any, field: string) => obj ? (obj[field] ?? '') : '';

      const h_final    = u_jssm.state_is_final(s);
      const h_complete = u_jssm.state_is_complete(s);
      const h_terminal = u_jssm.state_is_terminal(s);

      const t_final    = u_jssm.state_is_final(ex);
      const t_complete = u_jssm.state_is_complete(ex);
      const t_terminal = u_jssm.state_is_terminal(ex);

      const lineColor = (final_: boolean, complete: boolean, terminal: boolean, lkind: string, suffix = '_solo') =>
        final_   ? vc(`${lkind}_final${suffix}`)    :
        complete ? vc(`${lkind}_complete${suffix}`) :
        terminal ? vc(`${lkind}_terminal${suffix}`) :
                   vc(`${lkind}${suffix}`);

      const textColor = (final_: boolean, complete: boolean, terminal: boolean, suffix = '_solo'): string =>
        final_   ? vc(`text_final${suffix}`)    :
        complete ? vc(`text_complete${suffix}`) :
        terminal ? vc(`text_terminal${suffix}`) :
                   '';

      const headColor = textColor(h_final, h_complete, h_terminal, double ? '_1' : '_solo');
      const tailColor = textColor(t_final, t_complete, t_terminal, double ? '_2' : '_solo');

      // The labelInline rows take the actual JssmTransition objects (edge_tr, pair_tr),
      // not the JssmTransitionList wrappers from list_transitions.  The original
      // jssm-viz code passed the lists by mistake, so this colored-HTML label path
      // silently produced empty strings for years; only the simpler `taillabel="..."`
      // form below kept user-visible labels rendering.  Fixed during the merge.
      const labelInline = [
        [pair_tr, 'probability', 'headlabel', 'name', 'action', double, headColor],
        [edge_tr, 'probability', 'taillabel', 'name', 'action', true,   tailColor]
      ]
        .map((r: any) => ({
          which   : r[2],
          whether : (r[5] ? ([(if_obj_field(r[0], r[5])), (if_obj_field(r[0], r[1])), (if_obj_field(r[0], r[3]))].filter(q => q).join('<br/>') || '') : ''),
          color   : r[6]
        }))
        .filter(present => present.whether)
        .map(r => `${r.which}=${r.color ? `<<font color="${r.color}">${r.whether}</font>>` : `"${r.whether}"`};`)
        .join(' ');

      const label      = ([`${(edge_tr.action || '')}`, `${(edge_tr.probability || '')}`].filter(x => x !== '').join('\n') || undefined);
      const maybeLabel = label ? `taillabel="${doublequote(label)}";` : '';

      const rlabel      = pair_tr ? ([`${(pair_tr.action || '')}`, `${(pair_tr.probability || '')}`].filter(x => x !== '').join('\n') || undefined) : undefined;
      const maybeRLabel = rlabel ? `headlabel="${doublequote(rlabel)}";` : '';

      const tc1 = lineColor(t_final, t_complete, t_terminal, edge_tr.kind, '_1');
      const tc2 = lineColor(h_final, h_complete, h_terminal, (pair_tr || { kind: 'legal' }).kind, '_2');
      const tcd = lineColor(t_final, t_complete, t_terminal, edge_tr.kind, '_solo');

      const arrowHead = edge_tr.forced_only ? 'ediamond' : (edge_tr.main_path ? 'normal;weight=5' : 'empty');
      const arrowTail = pair_tr ? (pair_tr.forced_only ? 'ediamond' : (pair_tr.main_path ? 'normal;weight=5' : 'empty')) : '';

      const edgeInline = double
        ? `${maybeLabel}${maybeRLabel}arrowhead=${arrowHead};arrowtail=${arrowTail};dir=both;color="${tc1}:${tc2}"`
        : `${maybeLabel}arrowhead=${arrowHead};color="${tcd}"`;

      if (pair_tr) { strike.push([ex, s]); }

      return `${node_of(s, l_states)}->${node_of(ex, l_states)} [${labelInline}${edgeInline}];`;

    }).join(' ')

  ).join(' ');

}




/**
 *  Render `arrange`, `arrange_start`, and `arrange_end` declarations to
 *  rank-grouped subgraphs (`rank=same`/`rank=min`/`rank=max`).
 *
 *  @internal
 */
function arranges_for<T>(u_jssm: jssm.Machine<T>, l_states: string[]): string {
  let decl = '';

  if (u_jssm._arrange_declaration) {
    decl += u_jssm._arrange_declaration.map(d => `{rank=same; ${d.map(di => node_of(di, l_states)).join('; ')};};`).join('\n');
  }

  if (u_jssm._arrange_start_declaration) {
    decl += u_jssm._arrange_start_declaration.map(d => `{rank=min; ${d.map(di => node_of(di, l_states)).join('; ')};};`).join('\n');
  }

  if (u_jssm._arrange_end_declaration) {
    decl += u_jssm._arrange_end_declaration.map(d => `{rank=max; ${d.map(di => node_of(di, l_states)).join('; ')};};`).join('\n');
  }

  return decl;
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

  const l_states = u_jssm.states();
  const nodes    = states_to_nodes_string(u_jssm, l_states);

  const strike: [string, string][] = [];
  const edges    = states_to_edges_string(u_jssm, l_states, strike);

  const arranges = arranges_for(u_jssm, l_states);

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
 *  Deprecated, no-op compat alias retained from jssm-viz.  Does nothing.
 *  Will be removed in the next major.
 *
 *  @deprecated Use {@link machine_to_dot} instead.
 */
function dot<T>(_machine: jssm.Machine<T>): void {
  // intentionally no-op; preserved for binary compat with old jssm-viz
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
  border_color_for_state, text_color_for_state, background_color_for_state,
  shape_for_state, image_for_state, style_for_state
};
