/**
 * The render targets supported in v1, in canonical order (the CLI `--target`
 * enum and `--help` list order).  This tuple is the single runtime source of
 * truth: both the {@link RenderTarget} type and the `fsl-render` CLI's
 * `--target` enum derive from it, so a new target is declared in exactly one
 * place.  Future targets (mermaid, plantuml, scxml, ascii, fsl) land here in
 * v0.2+.
 * @example
 * RENDER_TARGETS.includes('gif' as RenderTarget);  // true
 */
export const RENDER_TARGETS = ['svg', 'dot', 'png', 'jpeg', 'html', 'gif'];
/**
 * Base error class for render-time failures.
 */
export class RenderError extends Error {
    constructor(message, opts = {}) {
        super(message);
        this.name = 'RenderError';
        this.path = opts.path;
        this.line = opts.line;
        this.column = opts.column;
    }
}
/**
 * Thrown when raster output is requested in a runtime that supports neither
 * native OffscreenCanvas nor `@resvg/resvg-wasm`.
 */
export class RasterizationUnsupportedError extends RenderError {
    constructor(message) {
        super(message);
        this.name = 'RasterizationUnsupportedError';
        Object.setPrototypeOf(this, RasterizationUnsupportedError.prototype);
    }
}
/**
 * Error class for `typegen`-time failures (parse error, unsupported target).
 *
 * Carries the same optional source-location fields as {@link RenderError} so
 * the plugin's error printer can report a path and line uniformly across
 * verbs. Distinct from `RenderError` because `typegen` is a separate verb
 * with its own failure surface — declarations, not images.
 */
export class TypegenError extends Error {
    constructor(message, opts = {}) {
        super(message);
        this.name = 'TypegenError';
        this.path = opts.path;
        this.line = opts.line;
        this.column = opts.column;
        Object.setPrototypeOf(this, TypegenError.prototype);
    }
}
