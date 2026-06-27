/**
 * Canonical (RFC 8785 / JCS) serialization — the byte-stable string that makes
 * hashing a config or tape well-defined. Locale-independent by construction:
 * object keys are sorted by UTF-16 code unit, never via locale-aware APIs.
 *
 * @see https://www.rfc-editor.org/rfc/rfc8785
 */

const CANONICAL_FORMAT_VERSION = 1;

// Code-unit comparator. Plain `<`/`>` on JS strings already compares by UTF-16
// code unit (NOT locale) — that is exactly RFC 8785's rule. localeCompare/Intl
// are deliberately avoided so output never depends on the host locale.
function code_unit_less(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Serialize `value` to RFC 8785 canonical JSON.
 *
 * @param value - Any JSON-serializable value (object keys are sorted; arrays
 *   keep order; `undefined` object values are omitted).
 * @returns The canonical JSON string (no insignificant whitespace).
 *
 * @example
 *   canonicalize({ b: 1, a: 2 });   // '{"a":2,"b":1}'
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);   // RFC 8785 number/string/bool/null formatting = JSON.stringify in ES
  }
  if (Array.isArray(value)) {
    return '[' + value.map(v => canonicalize(v === undefined ? null : v)).join(',') + ']';
  }
  const obj  = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort(code_unit_less);
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

/**
 * The canonical config-identity string of a run's final configuration: the
 * version tag, state, and data. Replay-derivable; the unit M6 will hash.
 *
 * @param state - The machine's final state.
 * @param data - The machine's final extended data.
 * @returns The canonical `{v, state, data}` string.
 *
 * @example
 *   canonical_config('Locked', { n: 1 }); // '{"data":{"n":1},"state":"Locked","v":1}'
 */
function canonical_config(state: unknown, data: unknown): string {
  return canonicalize({ v: CANONICAL_FORMAT_VERSION, state, data });
}

export { CANONICAL_FORMAT_VERSION, canonicalize, canonical_config };
