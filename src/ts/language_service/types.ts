/**
 * Editor-agnostic data types for the FSL language service.
 *
 * These are the neutral contract every editor adapter (CodeMirror, VS Code, a
 * future LSP server) converts to/from. Shapes are kept aligned with LSP types so
 * an LSP wrapper is a near-mechanical mapping.
 */

/** A character-offset range in the FSL source. */
export interface Range { from: number; to: number; }

/** Diagnostic severity, aligned with LSP severities. */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/** An editor-agnostic diagnostic (one parse/compile problem). */
export interface Diagnostic { range: Range; severity: DiagnosticSeverity; message: string; }

/** What a completion item suggests, so adapters can pick an icon. */
export type CompletionKind = 'key' | 'value-color' | 'value-shape' | 'value-enum';

/** An editor-agnostic completion suggestion. */
export interface CompletionItem { label: string; kind: CompletionKind; detail?: string; }

/** Parser-derived semantic role of a source span. */
export type SemanticSpanKind = 'color' | 'state' | 'enum';

/** An editor-agnostic semantic span (for decorations / semantic tokens). */
export interface SemanticSpan extends Range { kind: SemanticSpanKind; value?: string; }
