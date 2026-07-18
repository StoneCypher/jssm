/**
 * Two-layer static FSL highlighter: the SAME `fslLanguage` stream grammar and
 * `fslSemanticSpans` parser overlay the CodeMirror editor uses, merged into
 * flat runs and (optionally) serialized to HTML. There is no third
 * tokenizer — this is the parity guarantee between the editor and any
 * static render (markdown fences, the cookbook, docs).
 */
import { highlightCode, classHighlighter } from '@lezer/highlight';
import { fslLanguage } from './cm6/fsl_language.js';
import { fslSemanticSpans } from './language_service/semantic_spans.js';
/**
 * Tokenize FSL source through the CM6 stream grammar ({@link fslLanguage}),
 * producing contiguous `[from, to)` runs whose CSS classes come from
 * `@lezer/highlight`'s `classHighlighter` (renamed `tok-*` -> `fsl-tok-*`).
 * Line breaks and any unstyled character become a classless 1-character run
 * so the run set always tiles the full source with no gaps. @internal
 */
function tokenize_layer(source) {
    const token_runs = [];
    let offset = 0;
    const tree = fslLanguage.parser.parse(source);
    highlightCode(source, tree, classHighlighter, (text, classes) => {
        token_runs.push({ from: offset, to: offset + text.length,
            classes: classes.replace(/\btok-/g, 'fsl-tok-') });
        offset += text.length;
    }, () => {
        token_runs.push({ from: offset, to: offset + 1, classes: '' });
        offset += 1;
    });
    return token_runs;
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
export function highlight_fsl_runs(source) {
    // layer 1: token classes from the CM6 stream grammar (editor parity)
    const token_runs = tokenize_layer(source);
    // layer 2: semantic overlay from the real parser
    const sem = fslSemanticSpans(source);
    // cut at every boundary from both layers
    const cuts = new Set([0, source.length]);
    for (const r of token_runs) {
        cuts.add(r.from);
        cuts.add(r.to);
    }
    for (const s of sem) {
        cuts.add(s.from);
        cuts.add(s.to);
    }
    const points = [...cuts].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < points.length - 1; ++i) {
        // `points` comes from sorting a `Set`, so consecutive entries are always
        // strictly increasing — `from < to` unconditionally; no `from >= to`
        // guard is reachable here.
        const from = points[i], to = points[i + 1];
        // `tokenize_layer` tiles `[0, source.length)` with no gaps (every
        // character lands in exactly one `putText`/`putBreak` run), and `cuts`
        // includes every token run's `from`/`to`, so no merged `[from, to)`
        // interval can straddle a token-run boundary. Every interval therefore
        // falls fully inside exactly one token run — `token` is never `undefined`.
        const token = token_runs.find(r => r.from <= from && to <= r.to);
        const span = sem.find(s => s.from <= from && to <= s.to);
        const text = source.slice(from, to);
        const classes = [
            token.classes,
            span === undefined ? '' : `fsl-sem-${span.kind}`,
        ].filter(Boolean).join(' ');
        const run = { text, classes };
        // `span.value` is the AST-resolved, already-unescaped state name (see
        // semantic_spans.ts's `kind: 'state'` branch) — not the run's own text,
        // which can be a fragment of a state name split across multiple runs by
        // the stream tokenizer (e.g. a digit-leading name) or can include quote
        // marks the parser already stripped. It is always defined for a
        // `state`-kind span produced by this parser.
        if ((span === null || span === void 0 ? void 0 : span.kind) === 'state') {
            run.state = span.value;
        }
        out.push(run);
    }
    return out;
}
/** Escape text for HTML body and attribute contexts. @internal */
function escape_html(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
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
export function highlight_fsl_html(source, opts = {}) {
    var _a;
    const inline = (_a = opts.inline_colors) !== null && _a !== void 0 ? _a : true;
    return highlight_fsl_runs(source).map(run => {
        var _a;
        if (run.classes === '') {
            return escape_html(run.text);
        }
        const attrs = [`class="${run.classes}"`];
        if (run.state !== undefined) {
            attrs.push(`data-state="${escape_html(run.state)}"`);
            const color = (_a = opts.state_colors) === null || _a === void 0 ? void 0 : _a.get(run.state);
            if (inline && color !== undefined) {
                attrs.push(`style="color:${escape_html(color)}"`);
            }
        }
        return `<span ${attrs.join(' ')}>${escape_html(run.text)}</span>`;
    }).join('');
}
