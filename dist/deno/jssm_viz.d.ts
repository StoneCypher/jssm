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
    slug_for: typeof slug_for;
    slug_states: typeof slug_states;
    shape_for_state: typeof shape_for_state;
    image_for_state: typeof image_for_state;
    style_for_state: typeof style_for_state;
};
