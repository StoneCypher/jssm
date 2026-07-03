/**
 * Render targets supported in v1. Future targets (mermaid, plantuml, scxml,
 * ascii, fsl) will be added in v0.2+.
 */
declare type RenderTarget = 'svg' | 'dot' | 'png' | 'jpeg' | 'html' | 'gif';
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
interface RenderOptions {
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
interface TextResult {
    target: Extract<RenderTarget, 'svg' | 'dot' | 'html'>;
    kind: 'text';
    content: string;
}
/**
 * A raster-shaped render result (png / jpeg / gif).
 */
interface RasterResult {
    target: Extract<RenderTarget, 'png' | 'jpeg' | 'gif'>;
    kind: 'raster';
    buffer: Uint8Array;
}
declare type RenderResult = TextResult | RasterResult;
/**
 * Base error class for render-time failures.
 */
declare class RenderError extends Error {
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
declare class RasterizationUnsupportedError extends RenderError {
    constructor(message: string);
}

/**
 * Render a single FSL source string to the requested output format.
 *
 * Returns a discriminated union: `kind: 'text'` for SVG / DOT / HTML, and
 * `kind: 'raster'` for PNG / JPEG / GIF. Use `kind` to narrow before
 * accessing `content` or `buffer`.
 *
 * @param fsl - FSL source text
 * @param opts.target - Output format ('svg' | 'dot' | 'png' | 'jpeg' | 'html' | 'gif')
 * @param opts.width - Fit raster output to this pixel width (raster only)
 * @param opts.height - Fit raster output to this pixel height (raster only)
 * @param opts.scale - Raster zoom percentage; 100 = 3x natural size (raster only)
 * @param opts.quality - JPEG quality 1-100 (silently ignored for non-jpeg)
 * @param opts.delay - Per-frame delay in centiseconds (gif only; silently ignored otherwise)
 * @param opts.maxFrames - Walk-length ceiling on the gif's frame count (gif only; silently ignored otherwise)
 * @returns RenderResult, discriminated by `kind`
 * @throws RenderError on parse, render, or target-dispatch failures
 * @throws RasterizationUnsupportedError on raster targets where no backend exists
 *
 * @example
 *   const r = await render(fslText, { target: 'svg' });
 *   if (r.kind === 'text') console.log(r.content);
 */
declare function render(fsl: string, opts: RenderOptions): Promise<RenderResult>;

interface RenderSetItemOk {
    ok: true;
    index: number;
    result: RenderResult;
}
interface RenderSetItemErr {
    ok: false;
    index: number;
    error: Error;
}
declare type RenderSetItem = RenderSetItemOk | RenderSetItemErr;
/**
 * Render multiple FSL source strings in parallel, returning one result
 * per input. Errors are captured per-input rather than aborting the whole
 * batch: callers can inspect which inputs succeeded and which failed.
 *
 * @param inputs - Array of FSL source strings
 * @param opts - Render options applied to every input
 * @returns Array of per-input results, same length and order as `inputs`
 *
 * @example
 *   const results = await renderSet([fsl1, fsl2], { target: 'svg' });
 *   for (const item of results) {
 *     if (item.ok) console.log('rendered #', item.index);
 *     else        console.error('failed #', item.index, item.error.message);
 *   }
 */
declare function renderSet(inputs: string[], opts: RenderOptions): Promise<RenderSetItem[]>;

declare type FlagType = 'string' | 'number' | 'boolean';
interface FlagSpec {
    short?: string;
    type?: FlagType;
    boolean?: boolean;
    enum?: readonly string[];
    default?: string | number | boolean;
}
interface ParseSpec {
    flags: Record<string, FlagSpec>;
    usage: string;
}
interface ParseResult<S extends ParseSpec> {
    positional: string[];
    flags: Record<string, string | number | boolean | undefined>;
    helpText: () => string;
}
/**
 * Parse a CLI-style argv array against a flag specification.
 *
 * Supported forms:
 *   --long=value     long flag with =
 *   --long value     long flag with space-separated value
 *   --bool           boolean long flag
 *   -s value         short flag with space value
 *   -svalue          short flag with attached value
 *   -b               boolean short flag
 *   --               terminate flag parsing; remaining args are positional
 *   -                positional (stdin sentinel)
 *
 * @param argv - The argument array to parse (e.g. process.argv.slice(2))
 * @param spec - The flag specification describing accepted flags, their types, and defaults
 * @returns A ParseResult containing positional args, parsed flag values, and a helpText() generator
 *
 * @throws Error if an unknown flag is seen, an enum value mismatches,
 *   or a numeric flag receives a non-numeric value.
 *
 * @example
 * ```ts
 * const spec = {
 *   flags: {
 *     target: { short: 't', enum: ['svg', 'png'], default: 'svg' },
 *     help:   { short: 'h', boolean: true },
 *   },
 *   usage: 'fsl-render [options] <fsl-paths...>',
 * } as const;
 *
 * const result = parseFslArgs(['--target=png', 'machine.fsl'], spec);
 * // result.flags.target === 'png'
 * // result.positional   === ['machine.fsl']
 * ```
 */
declare function parseFslArgs<S extends ParseSpec>(argv: string[], spec: S): ParseResult<S>;

export { RasterizationUnsupportedError, RenderError, parseFslArgs, render, renderSet };
export type { FlagSpec, FlagType, ParseResult, ParseSpec, RasterResult, RenderOptions, RenderResult, RenderSetItem, RenderSetItemErr, RenderSetItemOk, RenderTarget, TextResult };
