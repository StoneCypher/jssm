import { JssmError }      from './jssm_error.js';
import { tonal_provider } from './jssm_viz_tonal.js';

import type { VizRenderProvider, VizRendererName } from './jssm_viz_provider.js';





/**
 *  The standard Graphviz drawing, as a provider: it asks for the machine's
 *  DOT with no layout overrides and has Graphviz draw it as SVG, which is
 *  exactly what jssm-viz has always produced.  Registered as `graphviz`.
 *
 *  ```typescript
 *  import { fsl_to_svg_string } from 'jssm-viz';
 *  const svg = await fsl_to_svg_string('graph_renderer: graphviz; a -> b;');
 *  ```
 *  @see register_renderer
 *  @see tonal_provider
 */
export const graphviz_provider: VizRenderProvider = {
  name   : 'graphviz',
  render : context => context.render_dot(context.to_dot(), 'svg')
};





/**
 *  The renderers every page starts with, keyed by name.  They can be
 *  selected but never replaced or removed, so `graph_renderer: graphviz;` and
 *  `graph_renderer: tonal;` mean the same thing on every page.
 */
const BUILTIN_RENDERERS: ReadonlyMap<string, VizRenderProvider> = new Map([
  [graphviz_provider.name, graphviz_provider],
  [tonal_provider.name,    tonal_provider]
]);

/** The renderer used when neither the render options nor the machine name one. */
const DEFAULT_RENDERER = graphviz_provider.name;

/**
 *  The live registry: the built-ins first, then application renderers in
 *  registration order.  Module-level on purpose, so a renderer registered
 *  once is visible to every render call and every `<fsl-viz>` that shares
 *  this copy of jssm-viz.
 */
const registry: Map<string, VizRenderProvider> = new Map(BUILTIN_RENDERERS);





/** Options for {@link register_renderer}. */
export type RegisterRendererOptions = {
  /**
   *  Allow the registration to replace an application renderer already
   *  registered under the same name.  Built-in renderers can never be
   *  replaced, with or without this flag.  Default `false`.
   */
  replace?: boolean
};





/**
 *  Throws unless `provider` is a usable renderer: a non-null object with a
 *  non-empty string `name` and a `render` function.
 *  @param provider The value to check.
 *  @param action   What the caller was doing, for the error message.
 *  @throws {JssmError} when `provider` is not a usable renderer.
 *  @internal
 */
function assert_renderer(provider: unknown, action: string): asserts provider is VizRenderProvider {
  const candidate = provider as Partial<VizRenderProvider> | null;
  if (typeof candidate !== 'object' || candidate === null) {
    throw new JssmError(undefined, `Cannot ${action}: a renderer must be an object with a name and a render function`);
  }
  if (typeof candidate.name !== 'string' || candidate.name === '') {
    throw new JssmError(undefined, `Cannot ${action}: a renderer needs a non-empty string name`);
  }
  if (typeof candidate.render !== 'function') {
    throw new JssmError(undefined, `Cannot ${action}: renderer "${candidate.name}" has no render function`);
  }
}





/**
 *  Adds a renderer to the registry under its `name`, so FSL can select it
 *  with `graph_renderer: <name>;` and render calls (or `<fsl-viz>`) can
 *  select it with `provider: '<name>'`, without any further code.
 *
 *  Registering a name that is already taken throws, so two libraries cannot
 *  silently take each other's name; pass `{ replace: true }` to replace an
 *  application renderer on purpose.  The built-in `graphviz` and `tonal`
 *  renderers can never be replaced.  A quoted FSL string can name any
 *  renderer (`graph_renderer: "my-cards";`), so any non-empty name works.
 *
 *  ```typescript
 *  import { register_renderer, fsl_to_svg_string } from 'jssm-viz';
 *
 *  // Standard Graphviz drawing, tagged with a class the page's CSS can style.
 *  register_renderer({
 *    name   : 'framed',
 *    render : async ctx => {
 *      const svg = await ctx.render_dot(ctx.to_dot(), 'svg');
 *      return svg.replace('<svg ', '<svg class="framed" ');
 *    }
 *  });
 *
 *  const svg = await fsl_to_svg_string('graph_renderer: framed; a -> b;');
 *  ```
 *  @param provider The renderer.  Its `name` is the key it is registered
 *                  under, and the name FSL and `provider` use to select it.
 *  @param options  See {@link RegisterRendererOptions}.
 *  @throws {JssmError} when `provider` is not an object with a non-empty
 *          string `name` and a `render` function; when `name` is a built-in
 *          renderer; or when `name` is already registered and
 *          `options.replace` is not `true`.
 *  @see unregister_renderer
 *  @see renderer_names
 *  @see renderer_for
 */
export function register_renderer(provider: VizRenderProvider, options: RegisterRendererOptions = {}): void {
  assert_renderer(provider, 'register a renderer');
  const { name } = provider;
  if (BUILTIN_RENDERERS.has(name)) {
    throw new JssmError(undefined, `Cannot register a renderer named "${name}": that is a built-in renderer, and built-ins cannot be replaced`);
  }
  if (registry.has(name) && options.replace !== true) {
    throw new JssmError(undefined, `A renderer named "${name}" is already registered; pass { replace: true } to replace it`);
  }
  registry.set(name, provider);
}





/**
 *  Removes an application renderer from the registry, so FSL and `provider`
 *  can no longer select it by name.
 *
 *  ```typescript
 *  import { unregister_renderer } from 'jssm-viz';
 *  unregister_renderer('framed');   // => true
 *  unregister_renderer('framed');   // => false, already gone
 *  ```
 *  @param name The name the renderer was registered under.
 *  @returns `true` if a renderer was removed, `false` if none was registered
 *           under that name.
 *  @throws {JssmError} when `name` is a built-in renderer, which cannot be
 *          removed.
 *  @see register_renderer
 */
export function unregister_renderer(name: string): boolean {
  if (BUILTIN_RENDERERS.has(name)) {
    throw new JssmError(undefined, `Cannot unregister "${name}": built-in renderers cannot be removed`);
  }
  return registry.delete(name);
}





/**
 *  Lists every renderer name FSL's `graph_renderer` and the `provider`
 *  render option can currently select: the built-ins first, then
 *  application renderers in the order they were registered.
 *
 *  ```typescript
 *  import { renderer_names } from 'jssm-viz';
 *  renderer_names();   // => ['graphviz', 'tonal']
 *  ```
 *  @returns A fresh array; changing it does not change the registry.
 *  @see register_renderer
 */
export function renderer_names(): string[] {
  return [...registry.keys()];
}





/**
 *  Looks up a registered renderer by name.
 *
 *  ```typescript
 *  import { renderer_for } from 'jssm-viz';
 *  renderer_for('tonal')?.name;   // => 'tonal'
 *  renderer_for('nope');          // => undefined
 *  ```
 *  @param name The name to look up, exactly as registered (case-sensitive).
 *  @returns The renderer, or `undefined` when no renderer has that name.
 *  @see renderer_names
 */
export function renderer_for(name: string): VizRenderProvider | undefined {
  return registry.get(name);
}





/**
 *  Picks the renderer for one render call.  The `provider` render option
 *  wins, either a renderer object (used as-is, no registration needed) or a
 *  registered name; otherwise the name the machine declares with FSL
 *  `graph_renderer`; otherwise `graphviz`.
 *
 *  ```typescript
 *  select_renderer(undefined, 'tonal').name;    // => 'tonal'
 *  select_renderer('graphviz', 'tonal').name;   // => 'graphviz'
 *  select_renderer(undefined, undefined).name;  // => 'graphviz'
 *  ```
 *  @param requested The `provider` render option, if any.
 *  @param declared  The machine's `graph_renderer`, if any.
 *  @returns The renderer to draw with.
 *  @throws {JssmError} when the selected name is not registered (the
 *          message names it, says where it came from, and lists the
 *          registered names), or when `requested` is an object that is not
 *          a usable renderer.
 *  @see register_renderer
 *  @internal
 */
export function select_renderer(requested: VizRendererName | VizRenderProvider | undefined, declared: string | undefined): VizRenderProvider {
  if (typeof requested === 'object') {
    assert_renderer(requested, 'render with the provider option');
    return requested;
  }
  const name: string = requested ?? declared ?? DEFAULT_RENDERER;
  const found        = registry.get(name);
  if (found === undefined) {
    const origin = requested === undefined ? 'named by the machine\'s graph_renderer' : 'requested by the provider option';
    throw new JssmError(undefined, `Unknown renderer "${name}", ${origin}.  Registered renderers: ${renderer_names().join(', ')}`);
  }
  return found;
}
