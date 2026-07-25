/**
 * The subset Open Sans Regular font as raw TrueType bytes, ready to hand to
 * resvg via `font.fontBuffers`.
 *
 * Decoded once on first call and cached; the same buffer is returned on every
 * subsequent call (resvg treats it as read-only).
 * @returns the decoded TrueType font bytes
 * @example
 *   new Resvg(svg, { font: { fontBuffers: [bundledFontBytes()] } });
 */
export declare function bundledFontBytes(): Uint8Array;
