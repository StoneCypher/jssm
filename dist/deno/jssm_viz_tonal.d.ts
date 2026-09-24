import type { VizRenderProvider } from './jssm_viz_provider.js';
/** Built-in traffic signals, or a monochrome SVG path in a 24 by 24 view box. */
export type TonalIcon = 'traffic-red' | 'traffic-yellow' | 'traffic-green' | 'traffic-off' | {
    path: string;
};
/** Optional explanatory content. These annotations never change the machine. */
export interface TonalStateContent {
    description?: string;
    /** Monospace prefix for the second line, such as the action name `Next`. */
    action?: string;
    detail?: string;
    icon?: TonalIcon;
}
/** Presentation settings for the tonal SVG provider. All dimensions are SVG points. */
export interface TonalRenderOptions {
    states?: Readonly<Record<string, TonalStateContent>>;
    background?: string;
    action_color?: string;
    /** Multiplier for forced connection strokes and arrowheads; default 0.7. */
    forced_opacity?: number;
    /** Dark overlay over the node's own color; default 0.1. */
    header_shade?: number;
    /** Characters per line before Graphviz measures the wrapped text; default 24. */
    wrap_columns?: number;
    /** Set for reproducible exports; use different prefixes for diagrams sharing a document. */
    id_prefix?: string;
}
/** Opt-in SVG renderer with tonal state headers, annotations and a navy background. */
export declare const tonal_provider: VizRenderProvider;
