/**
 * Two-layer static FSL highlighter: the SAME `fslLanguage` stream grammar and
 * `fslSemanticSpans` parser overlay the CodeMirror editor uses, merged into
 * flat runs and (optionally) serialized to HTML. There is no third
 * tokenizer — this is the parity guarantee between the editor and any
 * static render (markdown fences, the cookbook, docs).
 */
/** One classified slice of highlighted FSL source. */
export interface HighlightRun {
    text: string;
    /** Space-separated classes: `fsl-tok-*` token layer, `fsl-sem-*` semantic layer. */
    classes: string;
    /** The state name, present exactly on semantic state-name runs. */
    state?: string;
}
/**
 *  Tokenize FSL source through the SAME two layers the editor uses — the
 *  `fslLanguage` stream grammar for token classes and `fslSemanticSpans` for
 *  parser-derived roles — merged into flat runs whose concatenated text
 *  reproduces the source byte-for-byte.  Semantic classes overlay token
 *  classes (both are kept).
 *
 *  This is the parity guarantee: there is no third tokenizer, so static
 *  output can never disagree with the editor.
 *  @param source  FSL source text to classify.
 *  @returns       Flat, gap-free, order-preserving runs; `runs.map(r => r.text).join('')` is `source`.
 *  @example
 *  highlight_fsl_runs('Red -> Green;').find(r => r.state === 'Red');
 *  // { text: 'Red', classes: 'fsl-tok-variableName fsl-sem-state', state: 'Red' }
 */
export declare function highlight_fsl_runs(source: string): HighlightRun[];
/**
 *  Render FSL source as highlighted HTML (`<pre class="fsl-code">` inner
 *  content) using {@link highlight_fsl_runs}.  Semantic state-name spans get
 *  `data-state`; when `inline_colors` (default true) and the state appears in
 *  `state_colors`, an inline `style="color:…"` ties the code block's state
 *  names to the diagram's node colors with zero host CSS.
 *  @param source  FSL source text to render.
 *  @param opts.state_colors    Maps a state name to its diagram fill color (e.g. from `extract_state_fills`).
 *  @param opts.inline_colors   Whether to emit inline `style="color:…"` for matched states. Defaults to `true`.
 *  @returns       HTML markup for the highlighted source; unclassed runs are emitted as escaped text with no wrapping span.
 *  @example
 *  highlight_fsl_html('Red -> Green;', { state_colors: new Map([['Red', '#a00']]) });
 *  // '…<span class="… fsl-sem-state" data-state="Red" style="color:#a00">Red</span>…'
 */
export declare function highlight_fsl_html(source: string, opts?: {
    state_colors?: ReadonlyMap<string, string>;
    inline_colors?: boolean;
}): string;
