/**
 * Small, pure helpers shared by the `native:*` codegen targets: turning
 * arbitrary FSL identifiers into a safe host symbol, and escaping arbitrary
 * text into a single-quoted host string literal. Kept target-agnostic because
 * TypeScript and JavaScript share both rules.
 */

/**
 * Escape arbitrary text for embedding inside a single-quoted JS/TS string
 * literal. Backslashes and single quotes are escaped; control characters that
 * would break or silently corrupt a one-line literal (newline, carriage
 * return, tab, form feed, vertical tab, backspace, NUL) are turned into their
 * escape sequences.
 *
 * @param raw - The text to embed
 * @returns The escaped body (without the surrounding quotes)
 *
 * @example
 *   jsStringLiteralBody("it's\n");
 *   // "it\\'s\\n"
 */
export function jsStringLiteralBody(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\v/g, '\\v')
    .replace(/\x08/g, '\\b')   // \b in a regex is a word boundary; match the byte
    .replace(/\0/g, '\\x00');  // NUL as \x00 to avoid octal-escape ambiguity
}

/**
 * Derive a valid PascalCase host symbol from an arbitrary label.
 *
 * Non-identifier characters split the label into words, each word is
 * capitalized, and a leading digit is prefixed with `M` so the result is a
 * legal identifier. An empty or all-punctuation label falls back to
 * `fallback`.
 *
 * @param label - The raw label (e.g. a file basename or `--name` value)
 * @param fallback - Symbol to use when `label` yields nothing usable
 * @returns A legal PascalCase identifier
 *
 * @example
 *   toSymbol('traffic-light', 'Machine'); // 'TrafficLight'
 *   toSymbol('2fa flow',     'Machine');  // 'M2faFlow'
 *   toSymbol('!!!',          'Machine');  // 'Machine'
 */
export function toSymbol(label: string, fallback: string): string {
  const words = label.split(/[^A-Za-z0-9]+/).filter(w => w.length > 0);
  if (words.length === 0) return fallback;
  const pascal = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return /^[0-9]/.test(pascal) ? `M${pascal}` : pascal;
}
