import type { Machine } from './jssm.js';
import type { JssmTransition } from './jssm_types.js';
import type { VizRenderOpts } from './jssm_viz.js';
/** Layout changes a drawing provider can request without rebuilding FSL semantics. */
export interface VizLayoutOverrides {
    /** Keep opposite transitions independent, including their labels and arrow types. */
    separate_edges?: boolean;
    /** Additional DOT attributes by original state name. Values are trusted DOT fragments. */
    nodes?: ReadonlyMap<string, string>;
    /** Additional DOT attributes for each directed transition. Values are trusted DOT fragments. */
    edge?: (transition: JssmTransition<string, unknown>) => string;
    /** Trusted DOT statements applied after the machine's graph defaults. */
    graph?: string;
}
/** Services supplied to a renderer; custom providers need no global registration. */
export interface VizRenderContext {
    machine: Machine<unknown>;
    options: VizRenderOpts;
    /** Stable, collision-resolved DOT names keyed by original state name. */
    state_ids: ReadonlyMap<string, string>;
    /** Display labels including the requested group-membership chips. */
    state_labels: ReadonlyMap<string, string>;
    to_dot: (overrides?: VizLayoutOverrides) => string;
    /** Uses configure({ viz }) when supplied, otherwise the bundled Graphviz adapter. */
    render_dot: (dot: string, format: string) => Promise<string>;
}
/** A trusted SVG producer. The result is embedded as SVG by the chart component. */
export interface VizRenderProvider {
    name: string;
    render: (context: VizRenderContext) => string | Promise<string>;
}
