/**
 * CodeMirror adapters over the editor-agnostic FSL language service. Each
 * factory turns the neutral service output (`fslDiagnostics`, `fslCompletions`,
 * `fslSemanticSpans`) into a CodeMirror extension. The pure mapping functions
 * are exported alongside the extensions so they can be unit-tested directly.
 */
import { Decoration, ViewPlugin } from '@codemirror/view';
import { linter } from '@codemirror/lint';
import { autocompletion } from '@codemirror/autocomplete';
import { fslDiagnostics, fslCompletions, fslSemanticSpans } from '../../language_service/index.js';
// ---- diagnostics -----------------------------------------------------------
/** Map FSL diagnostics to CodeMirror diagnostics, clamped to the document. */
export function fslToCmDiagnostics(text, docLength) {
    return fslDiagnostics(text).map(d => ({
        from: Math.min(d.range.from, docLength),
        to: Math.min(Math.max(d.range.to, d.range.from + 1), docLength),
        severity: d.severity,
        message: d.message,
    }));
}
/** Linter source: diagnostics for the view's current document. */
export function fslLintSource(view) {
    return fslToCmDiagnostics(view.state.doc.toString(), view.state.doc.length);
}
/** Lint extension wiring `fslLintSource` into `@codemirror/lint`. */
export function fslLintExtension() { return linter(fslLintSource); }
// ---- completion ------------------------------------------------------------
/** Map a service completion kind to a CodeMirror completion `type`. */
function cmType(kind) { return kind === 'key' ? 'property' : 'enum'; }
/** Completion source: context-aware FSL completions at the caret. */
export function fslCompletionSource(context) {
    const line = context.state.doc.lineAt(context.pos);
    const before = line.text.slice(0, context.pos - line.from);
    const typed = /([\w-]*)$/.exec(before)[1];
    const items = fslCompletions(context.state.doc.toString(), context.pos);
    if (!items.length) {
        return null;
    }
    return {
        from: context.pos - typed.length,
        options: items.map(i => ({ label: i.label, type: cmType(i.kind), detail: i.detail })),
        validFor: /^[\w-]*$/,
    };
}
/** Autocomplete extension overriding sources with `fslCompletionSource`. */
export function fslCompletionExtension() { return autocompletion({ override: [fslCompletionSource] }); }
// ---- semantic overlay ------------------------------------------------------
/** Build the decoration set (color / state / enum marks) for `text`. */
export function buildFslDecorations(text) {
    const decos = fslSemanticSpans(text)
        .sort((a, b) => a.from - b.from)
        .map(s => Decoration.mark({
        class: `fsl-${s.kind}`,
        attributes: s.value ? { title: s.value, style: `--fsl-chip:${s.value}` } : {},
    }).range(s.from, s.to));
    return Decoration.set(decos, true);
}
/** Overlay extension: a view plugin that rebuilds decorations on doc change. */
export function fslOverlayExtension() {
    return ViewPlugin.fromClass(class {
        constructor(view) { this.decorations = buildFslDecorations(view.state.doc.toString()); }
        update(u) { if (u.docChanged) {
            this.decorations = buildFslDecorations(u.state.doc.toString());
        } }
    }, { decorations: v => v.decorations });
}
