/** Options shared by the static fence renderers. */
export interface FenceRenderOptions {
    /** Inline state colors in code spans (default true).  @see highlight_fsl_html */
    inline_colors?: boolean;
}
/**
 *  Render one FSL markdown fence to static HTML per the fence convention:
 *  parts stack top-down in the order written, sized by width/height, with
 *  editor-parity code highlighting whose state names carry the diagram's own
 *  node colors.  Invalid FSL renders a visible error box — this function
 *  never throws for bad machine source.
 *  @param source - The FSL machine source (fence body).
 *  @param info - The fence info string (e.g. `'fsl image code width=300'`).
 *  @param opts.inline_colors - Whether code spans carry inline diagram colors (default true).
 *  @returns The rendered `<div class="fsl-fence">…</div>` markup.
 *  @example
 *  await render_fence_html('Red => Green => Red;', 'fsl');
 *  // '<div class="fsl-fence" …><svg…/svg><pre class="fsl-code">…</pre></div>'
 */
export declare function render_fence_html(source: string, info: string, opts?: FenceRenderOptions): Promise<string>;
/**
 *  Replace every fsl/jssm fenced code block in a Markdown string with its
 *  rendered static HTML; all other content passes through byte-identical.
 *  Each fence is isolated — a broken machine becomes its own error box and
 *  the rest of the document still renders.  Backtick fences of length ≥3
 *  are recognized; tilde fences are out of scope (v1, spec §9).
 *  @param markdown - The full Markdown document source.
 *  @param opts.inline_colors - Whether code spans carry inline diagram colors (default true).
 *  @returns The document with every `fsl`/`jssm` fence replaced by rendered HTML.
 *  @example
 *  await transform_markdown('# Doc\n\n```fsl\na -> b;\n```\n');
 *  // '# Doc\n\n<div class="fsl-fence">…</div>\n'
 */
export declare function transform_markdown(markdown: string, opts?: FenceRenderOptions): Promise<string>;
/** Options for {@link render_fence_gif}. */
export interface GifRenderOptions {
    /** Per-frame delay, centiseconds.  Default 70 (~0.7s). */
    delay_cs?: number;
    /** Netscape loop count; 0 = forever (default). */
    loop?: number;
    /** Walk-length ceiling; longer walks truncate.  Default 64. */
    max_frames?: number;
    /** Raster zoom percentage; 100 = 3× natural (the CLI raster convention). Default 100. */
    scale?: number;
    /** Fill painted on the walked state each frame.  Default '#ff9930'. */
    highlight_fill?: string;
}
/**
 *  Render an FSL machine as a looping animated GIF that walks its states:
 *  main-path (`=>`) states in order when a main path exists, else an
 *  every-edge tour.  Graphviz lays the machine out ONCE; each frame patches
 *  one state's fill in the SVG string and rasterizes — identical geometry
 *  across frames, no layout jitter.
 *  @param source - The FSL machine source.
 *  @param opts.delay_cs - Per-frame delay in centiseconds (default 70).
 *  @param opts.loop - Netscape loop count, 0 = forever (default 0).
 *  @param opts.max_frames - Walk-length ceiling; longer walks truncate (default 64).
 *  @param opts.scale - Raster zoom percentage, 100 = 3× natural size (default 100).
 *  @param opts.highlight_fill - Fill painted on the walked state (default '#ff9930').
 *  @returns The encoded GIF89a bytes.
 *  @throws {JssmError} on invalid FSL (programmatic callers want exceptions;
 *  the HTML renderers catch and box instead).
 *  @example
 *  const gif = await render_fence_gif('Red => Green => Yellow => Red;');
 *  // Uint8Array starting "GIF89a", three frames, looping forever
 *  @see plan_walk
 *  @see encode_gif
 */
export declare function render_fence_gif(source: string, opts?: GifRenderOptions): Promise<Uint8Array>;
