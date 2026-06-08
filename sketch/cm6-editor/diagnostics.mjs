/**
 * Run parse -> compile over `text` and return CM6-style diagnostics plus a
 * status summary.  Pure and DOM-free: pass in `parse` and `compile`.
 *
 * @param {string}   text     FSL source.
 * @param {Function} parse    parse(text, options) -> AST (located when asked).
 * @param {Function} compile  compile(ast) -> config (throws JssmError on
 *                            semantic failure).
 * @returns {{ ok: boolean, status: string,
 *             diagnostics: Array<{from:number,to:number,severity:string,message:string}> }}
 */
export function diagnosticsFor(text, parse, compile) {
  let tree;

  try {
    tree = parse(text, { locations: true });
  } catch (err) {
    const loc = err && err.location;
    if (!loc) {
      return { ok: false, status: (err && err.message) || String(err),
               diagnostics: [{ from: 0, to: Math.max(text.length, 1), severity: 'error',
                               message: (err && err.message) || String(err) }] };
    }
    const from = loc.start.offset;
    const to   = Math.max(loc.end.offset, from + 1);
    return { ok: false, status: err.message,
             diagnostics: [{ from, to, severity: 'error', message: err.message }] };
  }

  try {
    compile(tree);
  } catch (err) {
    const loc = err && err.source_location;
    if (loc) {
      const from = loc.start.offset;
      const to   = Math.max(loc.end.offset, from + 1);
      return { ok: false, status: err.message,
               diagnostics: [{ from, to, severity: 'error', message: err.message }] };
    }
    return { ok: false, status: (err && err.message) || String(err),
             diagnostics: [{ from: 0, to: Math.max(text.length, 1), severity: 'error',
                             message: (err && err.message) || String(err) }] };
  }

  return { ok: true, status: 'parses and compiles cleanly', diagnostics: [] };
}
