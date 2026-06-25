/**
 * Editor-agnostic FSL diagnostics: parse then compile, reporting problems as
 * neutral {@link Diagnostic}s. Adapters map these to CodeMirror lint diagnostics,
 * VS Code markers, or LSP `Diagnostic`s.
 */

import { wrap_parse, compile } from '../jssm_compiler.js';
import type { Diagnostic, Range } from './types.js';

/** Build a clamped range from a parser/compiler location, or the whole doc. */
function range_from(loc: { start: { offset: number }; end: { offset: number } } | undefined,
                    text: string): Range {
  if (!loc) { return { from: 0, to: Math.max(text.length, 1) }; }
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
export function fslDiagnostics(text: string): Diagnostic[] {
  let tree: unknown;
  try {
    tree = wrap_parse(text, { locations: true });
  } catch (err) {
    const e = err as { location?: { start: { offset: number }; end: { offset: number } }; message?: string };
    return [{ range: range_from(e.location, text), severity: 'error', message: e.message ?? String(err) }];
  }
  try {
    compile(tree);
  } catch (err) {
    const e = err as { source_location?: { start: { offset: number }; end: { offset: number } }; message?: string };
    return [{ range: range_from(e.source_location, text), severity: 'error', message: e.message ?? String(err) }];
  }
  return [];
}
