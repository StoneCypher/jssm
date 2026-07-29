/**
 * Render-failure error classes shared by the fence-owned rasterizer
 * (`fsl_rasterize.ts`) and the CLI's render verbs.
 *
 * Lives at the fence/core level rather than under `cli/`: jssm-fence may not
 * depend on jssm-cli, and once the packages split, a class defined in cli
 * and bundled twice would break `instanceof` across the boundary at runtime.
 * `cli/types.ts` re-exports both classes from here, so every existing
 * importer keeps the same class identity.
 * @see fsl_rasterize.ts
 */

/**
 * Base error class for render-time failures.
 */
export class RenderError extends Error {
  public readonly path?: string;
  public readonly line?: number;
  public readonly column?: number;

  constructor(message: string, opts: { path?: string; line?: number; column?: number } = {}) {
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
  constructor(message: string) {
    super(message);
    this.name = 'RasterizationUnsupportedError';
    Object.setPrototypeOf(this, RasterizationUnsupportedError.prototype);
  }
}
