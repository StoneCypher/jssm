import * as jssm from './jssm';
import { version, build_time } from './version';
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
 *  Build a graphviz-safe node identifier for a state, by index.
 *
 *  @internal
 */
declare function node_of(state: string, l_states: string[]): string;
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
 *  Read the border color from a state declaration, projecting from
 *  `#RRGGBBAA` to `#RRGGBB`.  Returns `undefined` if not declared.
 *
 *  @internal
 */
declare function border_color_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined;
/**
 *  Read the text color from a state declaration.  Returns `undefined` if
 *  not declared.
 *
 *  @internal
 */
declare function text_color_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined;
/**
 *  Read the background color from a state declaration.  Returns `undefined`
 *  if not declared.
 *
 *  @internal
 */
declare function background_color_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined;
/**
 *  Read the graphviz shape for a state declaration.  Returns `undefined` if
 *  not declared.
 *
 *  @internal
 */
declare function shape_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined;
/**
 *  Read the image filename for a state declaration.  Returns `undefined` if
 *  not declared.  Wired into dot output via `states_to_nodes_string`; the
 *  `image` property was added to jssm in commit `a045569`.
 *
 *  @internal
 */
declare function image_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string | undefined;
/**
 *  Compose a graphviz `style` string for a state, combining `corners` and
 *  `line-style` declarations.  Returns either the empty string or a
 *  `corners,line,filled`-shape string.
 *
 *  @internal
 */
declare function style_for_state<T>(u_jssm: jssm.Machine<T>, state: string): string;
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
declare function machine_to_dot<T>(u_jssm: jssm.Machine<T>): string;
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
declare function fsl_to_dot(fsl: string): string;
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
declare function dot_to_svg(dot: string): Promise<string>;
/**
 *  Render an FSL string directly to SVG.
 *
 *  @param fsl The FSL source.
 *  @returns A promise resolving to an SVG XML string.
 */
declare function fsl_to_svg_string(fsl: string): Promise<string>;
/**
 *  Render a {@link jssm.Machine} to SVG.
 *
 *  @param u_jssm The machine to render.
 *  @returns A promise resolving to an SVG XML string.
 */
declare function machine_to_svg_string<T>(u_jssm: jssm.Machine<T>): Promise<string>;
/**
 *  Render an FSL string directly to a parsed `SVGSVGElement`.
 *
 *  @param fsl The FSL source.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
declare function fsl_to_svg_element(fsl: string): Promise<SVGSVGElement>;
/**
 *  Render a {@link jssm.Machine} to a parsed `SVGSVGElement`.
 *
 *  @param u_jssm The machine to render.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
declare function machine_to_svg_element<T>(u_jssm: jssm.Machine<T>): Promise<SVGSVGElement>;
/**
 *  Deprecated, no-op compat alias retained from jssm-viz.  Does nothing.
 *  Will be removed in the next major.
 *
 *  @deprecated Use {@link machine_to_dot} instead.
 */
declare function dot<T>(_machine: jssm.Machine<T>): void;
export { configure, dot, dot_to_svg, fsl_to_dot, fsl_to_svg_string, fsl_to_svg_element, machine_to_dot, machine_to_svg_string, machine_to_svg_element, version, build_time };
/** @internal — test-only access to private helpers. */
export declare const _test: {
    color8to6: typeof color8to6;
    u_color8to6: typeof u_color8to6;
    vc: typeof vc;
    node_of: typeof node_of;
    border_color_for_state: typeof border_color_for_state;
    text_color_for_state: typeof text_color_for_state;
    background_color_for_state: typeof background_color_for_state;
    shape_for_state: typeof shape_for_state;
    image_for_state: typeof image_for_state;
    style_for_state: typeof style_for_state;
};
