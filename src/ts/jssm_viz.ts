
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




export {
  configure,
  version, build_time
};

/** @internal — test-only access to private helpers. */
export const _test = {
  color8to6, u_color8to6, vc, node_of,
  border_color_for_state, text_color_for_state, background_color_for_state,
  shape_for_state, image_for_state, style_for_state
};
