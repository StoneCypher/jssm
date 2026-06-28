/**
 * CodeMirror adapters over the editor-agnostic FSL language service. Each
 * factory turns the neutral service output (`fslDiagnostics`, `fslCompletions`,
 * `fslSemanticSpans`) into a CodeMirror extension. The pure mapping functions
 * are exported alongside the extensions so they can be unit-tested directly.
 */
import { EditorView, type DecorationSet } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import { type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import { type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
/** Map FSL diagnostics to CodeMirror diagnostics, clamped to the document. */
export declare function fslToCmDiagnostics(text: string, docLength: number): CmDiagnostic[];
/** Linter source: diagnostics for the view's current document. */
export declare function fslLintSource(view: EditorView): CmDiagnostic[];
/** Lint extension wiring `fslLintSource` into `@codemirror/lint`. */
export declare function fslLintExtension(): Extension;
/** Completion source: context-aware FSL completions at the caret. */
export declare function fslCompletionSource(context: CompletionContext): CompletionResult | null;
/** Autocomplete extension overriding sources with `fslCompletionSource`. */
export declare function fslCompletionExtension(): Extension;
/** Build the decoration set (color / state / enum marks) for `text`. */
export declare function buildFslDecorations(text: string): DecorationSet;
/** Overlay extension: a view plugin that rebuilds decorations on doc change. */
export declare function fslOverlayExtension(): Extension;
