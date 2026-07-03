/**
 * Render targets supported in v1. Future targets (mermaid, plantuml, scxml,
 * ascii, fsl) will be added in v0.2+.
 */
export declare type RenderTarget = 'svg' | 'dot' | 'png' | 'jpeg' | 'html' | 'gif';
/**
 * Options accepted by `render()` and `renderSet()`.
 *
 * `width`, `height`, and `scale` size raster output and are mutually
 * exclusive: `width`/`height` fit to an exact pixel extent, `scale` is a
 * zoom percentage (100 = 3x the SVG's natural size). They are silently
 * ignored for text targets (svg/dot/html).
 *
 * `delay` and `maxFrames` apply only to the `gif` target and are silently
 * ignored otherwise.
 */
export interface RenderOptions {
    target: RenderTarget;
    width?: number;
    height?: number;
    scale?: number;
    quality?: number;
    /** Per-frame delay in centiseconds (gif only; default 70). */
    delay?: number;
    /** Walk-length ceiling on the animated gif's frame count (gif only; default 64). */
    maxFrames?: number;
}
/**
 * A text-shaped render result (svg / dot / html).
 */
export interface TextResult {
    target: Extract<RenderTarget, 'svg' | 'dot' | 'html'>;
    kind: 'text';
    content: string;
}
/**
 * A raster-shaped render result (png / jpeg / gif).
 */
export interface RasterResult {
    target: Extract<RenderTarget, 'png' | 'jpeg' | 'gif'>;
    kind: 'raster';
    buffer: Uint8Array;
}
export declare type RenderResult = TextResult | RasterResult;
/**
 * Base error class for render-time failures.
 */
export declare class RenderError extends Error {
    readonly path?: string;
    readonly line?: number;
    readonly column?: number;
    constructor(message: string, opts?: {
        path?: string;
        line?: number;
        column?: number;
    });
}
/**
 * Thrown when raster output is requested in a runtime that supports neither
 * native OffscreenCanvas nor `@resvg/resvg-wasm`.
 */
export declare class RasterizationUnsupportedError extends RenderError {
    constructor(message: string);
}
