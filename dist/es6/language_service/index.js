/**
 * Editor-agnostic FSL language service: the neutral intelligence the
 * `fsl-editor` CodeMirror adapter and a future VS Code extension both consume
 * by direct calls. Pure functions over FSL text; no editor or DOM dependencies.
 */
export { fslDiagnostics } from './diagnostics.js';
export { fslCompletions } from './completions.js';
export { fslSemanticSpans } from './semantic_spans.js';
