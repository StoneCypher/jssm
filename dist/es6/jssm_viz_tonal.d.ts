import type { VizRenderProvider } from './jssm_viz_provider.js';
/**
 * SVG shape data, compatible with Lucide's IconNode entries. Supported tags are
 * path, circle, ellipse, rect, line, polyline and polygon; attributes are validated.
 */
export type TonalIconNode = readonly [tag: string, attributes: Readonly<Record<string, string | number | undefined>>];
/** Library-neutral SVG data; no DOM, raw markup or external assets are required. */
export type TonalSvgIcon = ({
    path: string | readonly string[];
} | {
    nodes: readonly TonalIconNode[];
}) & {
    /** Defaults to 0 0 24 24. Supply the library's native coordinate system. */
    viewBox?: string;
    /** Defaults to none; currentColor uses the state's text color. */
    fill?: string;
    /** Defaults to currentColor. Use none for solid icons. */
    stroke?: string;
    stroke_width?: number;
};
/** Built-in traffic signals, an emoji grapheme, or portable SVG icon-library data. */
export type TonalIcon = 'traffic-red' | 'traffic-yellow' | 'traffic-green' | 'traffic-off' | TonalSvgIcon | {
    emoji: string;
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
    /** Characters per body line before Graphviz measures it; default 24. Titles stay on one line. */
    wrap_columns?: number;
    /** Set for reproducible exports; use different prefixes for diagrams sharing a document. */
    id_prefix?: string;
}
/** Opt-in SVG renderer with tonal state headers, annotations and a navy background. */
export declare const tonal_provider: VizRenderProvider;
