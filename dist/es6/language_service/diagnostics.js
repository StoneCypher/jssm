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
import { wrap_parse, compile } from '../jssm_compiler.js';
/** A clamped range from a parser/compiler location, or the whole document. */
function range_from(loc, text) {
    if (!loc) {
        return { from: 0, to: Math.max(text.length, 1) };
    }
    const from = loc.start.offset;
    return { from, to: Math.max(loc.end.offset, from + 1) };
}
/**
 * Parse then compile `text`, returning a list of diagnostics — empty when the
 * machine parses and compiles cleanly.
 *
 * @example
 *   fslDiagnostics('a -> b;');            // => []
 *   fslDiagnostics('a -> ;')[0].severity; // => 'error'
 */
export function fslDiagnostics(text) {
    let tree;
    try {
        tree = wrap_parse(text, { locations: true });
    }
    catch (err) {
        const e = err;
        return [{ range: range_from(e.location, text), severity: 'error', message: e.message }];
    }
    try {
        compile(tree);
    }
    catch (err) {
        const e = err;
        return [{ range: range_from(e.source_location, text), severity: 'error', message: e.message }];
    }
    return [];
}
