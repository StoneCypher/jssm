/**
 *  Bundle entry for the `jssm/fence` subpath: host-agnostic static rendering
 *  of FSL markdown fences — HTML parts stacks with editor-parity
 *  highlighting, animated walk GIFs, and a whole-document Markdown
 *  transformer — plus the reusable primitives behind them (GIF89a encoder,
 *  walk planner, SVG patching).
 *  @see render_fence_html
 *  @see transform_markdown
 */
export { render_fence_html, render_fence_gif, transform_markdown } from './fsl_fence_render.js';
export { encode_gif, quantize, lzw_encode } from './fsl_gif.js';
export { plan_walk } from './fsl_walk.js';
export { highlight_fsl_runs, highlight_fsl_html } from './fsl_fence_highlight.js';
export { extract_state_fills, patch_state_fill } from './fsl_svg_patch.js';
