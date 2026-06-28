/**
 * Editor-agnostic FSL diagnostics: parse then compile, reporting problems as
 * neutral {@link Diagnostic}s. Adapters map these to CodeMirror lint diagnostics,
 * VS Code markers, or LSP `Diagnostic`s.
 *
 * Parse errors (peg.js) carry `.location`; compile errors carry
 * `.source_location` *when they reference a parsed node* — but machine-level
 * compile errors (e.g. an empty machine, an unknown machine rule) have none, so
 * the location is treated as optional and falls back to the whole document.
 */
import type { Diagnostic } from './types.js';
/**
 * Parse then compile `text`, returning a list of diagnostics — empty when the
 * machine parses and compiles cleanly.
 *
 * @example
 *   fslDiagnostics('a -> b;');            // => []
 *   fslDiagnostics('a -> ;')[0].severity; // => 'error'
 */
export declare function fslDiagnostics(text: string): Diagnostic[];
