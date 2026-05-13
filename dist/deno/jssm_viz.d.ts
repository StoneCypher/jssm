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
 *  Build a graphviz-safe node identifier for a state, by index.  Accepts
 *  either a `string[]` (used historically; O(n) per call) or a
 *  precomputed `Map<state, index>` (used by rendering hot paths; O(1)
 *  per call).  The map form is used during dot generation; the array
 *  form is retained for direct test access via `_test`.
 *
 *  @internal
 */
declare function node_of(state: string, state_index: string[] | Map<string, number>): string;
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
 *  const dot_with_footer = machine_to_dot(sm`a -> b;`, { footer: 'labelloc="b"; label="caption";' });
 *  // 'digraph G { ... labelloc="b"; label="caption"; }'
 *  ```
 *
 *  @param u_jssm The machine to render.
 *  @param opts Optional rendering options.
 *  @param opts.footer Optional verbatim dot source inserted just before the closing `}`.
 *  @returns A complete graphviz dot source string.
 */
declare function machine_to_dot<T>(u_jssm: jssm.Machine<T>, opts?: {
    footer?: string;
}): string;
/**
 *  Render an FSL string directly to graphviz dot source.
 *
 *  ```typescript
 *  import { fsl_to_dot } from 'jssm/viz';
 *  const dot = fsl_to_dot('a -> b;');
 *
 *  const dot_with_footer = fsl_to_dot('a -> b;', { footer: 'label="caption";' });
 *  // 'digraph G { ... label="caption"; }'
 *  ```
 *
 *  @param fsl The FSL source.
 *  @param opts Optional rendering options.
 *  @param opts.footer Optional verbatim dot source inserted just before the closing `}`.
 *  @returns A complete graphviz dot source string.
 */
declare function fsl_to_dot(fsl: string, opts?: {
    footer?: string;
}): string;
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
 *  @param opts Optional rendering options.
 *  @param opts.footer Optional verbatim dot source inserted just before the closing `}` of the intermediate dot source.
 *  @returns A promise resolving to an SVG XML string.
 */
declare function fsl_to_svg_string(fsl: string, opts?: {
    footer?: string;
}): Promise<string>;
/**
 *  Render a {@link jssm.Machine} to SVG.
 *
 *  @param u_jssm The machine to render.
 *  @param opts Optional rendering options.
 *  @param opts.footer Optional verbatim dot source inserted just before the closing `}` of the intermediate dot source.
 *  @returns A promise resolving to an SVG XML string.
 */
declare function machine_to_svg_string<T>(u_jssm: jssm.Machine<T>, opts?: {
    footer?: string;
}): Promise<string>;
/**
 *  Render an FSL string directly to a parsed `SVGSVGElement`.
 *
 *  @param fsl The FSL source.
 *  @param opts Optional rendering options.
 *  @param opts.footer Optional verbatim dot source inserted just before the closing `}` of the intermediate dot source.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
declare function fsl_to_svg_element(fsl: string, opts?: {
    footer?: string;
}): Promise<SVGSVGElement>;
/**
 *  Render a {@link jssm.Machine} to a parsed `SVGSVGElement`.
 *
 *  @param u_jssm The machine to render.
 *  @param opts Optional rendering options.
 *  @param opts.footer Optional verbatim dot source inserted just before the closing `}` of the intermediate dot source.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
declare function machine_to_svg_element<T>(u_jssm: jssm.Machine<T>, opts?: {
    footer?: string;
}): Promise<SVGSVGElement>;
/**
 *  Compatibility wrapper for {@link machine_to_dot}, retained from
 *  jssm-viz.  Will be removed in the next major.
 *
 *  @deprecated Use {@link machine_to_dot} instead.
 */
declare function dot<T>(machine: jssm.Machine<T>): string;
export { configure, dot, dot_to_svg, fsl_to_dot, fsl_to_svg_string, fsl_to_svg_element, machine_to_dot, machine_to_svg_string, machine_to_svg_element, version, build_time };
/** @internal — test-only access to private helpers. */
export declare const _test: {
    color8to6: typeof color8to6;
    u_color8to6: typeof u_color8to6;
    vc: typeof vc;
    node_of: typeof node_of;
    shape_for_state: typeof shape_for_state;
    image_for_state: typeof image_for_state;
    style_for_state: typeof style_for_state;
};
