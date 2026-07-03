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
