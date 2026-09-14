/**
 * Editor-agnostic FSL diagnostics: parse then compile, reporting problems as
 * neutral {@link Diagnostic}s. Adapters map these to CodeMirror lint diagnostics,
 * VS Code markers, or LSP `Diagnostic`s.
 *
 * Parse errors (peg.js) carry `.location`; compile errors carry
 * `.source_location` *when they reference a parsed node* — but machine-level
 * compile errors (e.g. an empty machine, an unknown machine rule) have none, so
 * the location is treated as optional and falls back to the whole document.
 *
 * Some validity checks (e.g. a `required` property that no state defines) live
 * in the {@link Machine} constructor, a stage past `compile`. We therefore also
 * construct the machine so the editor surfaces those construction-time errors
 * instead of calling such a machine valid. The `Machine` class is imported from
 * `machine/machine.js` directly because the default `jssm` entry exports
 * `Machine` as a type only since 6.0 (intra-core code never routes through
 * `jssm/compat`). This is a diamond, not a cycle: both this module and the
 * `jssm` barrel depend on `machine/machine.js`, and nothing under `machine/`
 * imports `language_service/`.
 */
import type { Diagnostic } from './types.js';
/**
 * Parse then compile `text`, returning a list of diagnostics — empty when the
 * machine parses and compiles cleanly.
 * @example
 *   fslDiagnostics('a -> b;');            // => []
 *   fslDiagnostics('a -> ;')[0].severity; // => 'error'
 *   // a `required` property no state defines is a construction-time error:
 *   fslDiagnostics('property p required; a -> b;')[0].severity; // => 'error'
 */
export declare function fslDiagnostics(text: string): Diagnostic[];
