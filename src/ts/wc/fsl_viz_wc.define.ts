import { FslViz } from './fsl_viz_wc.js';
import { define_canonical } from './wc_tag_helpers.js';

// The retired synonym tag and its class alias were removed in 6.0; the
// only spelling is `<fsl-viz>` / {@link FslViz}.
define_canonical('fsl-viz', FslViz);

export { FslViz } from './fsl_viz_wc.js';

/**
 * The renderer registry, exported beside the element so a page that loads
 * `<fsl-viz>` from the self-contained CDN build can register its own
 * renderers.
 *
 * The CDN build (`jssm-viz/cdn/viz`) bundles a private copy of jssm-viz, so
 * importing `register_renderer` from `jssm-viz` itself would fill a different
 * registry than the one this element reads.  These come through
 * `./fsl_viz_wc.js`, which takes them from the same module the element
 * renders with, so registering here is what `graph_renderer: <name>;` and
 * `provider="<name>"` see.
 *
 * ```html
 * <script type="module">
 *   import { register_renderer } from 'https://cdn.jsdelivr.net/npm/jssm-viz@6/dist/cdn/viz.js';
 *
 *   register_renderer({
 *     name   : 'framed',
 *     render : async ctx => {
 *       const svg = await ctx.render_dot(ctx.to_dot(), 'svg');
 *       return svg.replace('<svg ', '<svg class="framed" ');
 *     }
 *   });
 * </script>
 *
 * <fsl-viz fsl="graph_renderer: framed; a -> b;"></fsl-viz>
 * ```
 * @throws {JssmError} from `register_renderer` when the renderer has no
 *         name or `render` function, takes a built-in name, or takes a name
 *         already registered without `{ replace: true }`.
 * @see register_renderer
 * @see unregister_renderer
 * @see renderer_names
 * @see renderer_for
 */
export { register_renderer, unregister_renderer, renderer_names, renderer_for, graphviz_provider } from './fsl_viz_wc.js';
export type { RegisterRendererOptions, VizRendererName, VizRenderProvider, VizRenderContext } from './fsl_viz_wc.js';
