/**
 * Canonical (RFC 8785 / JCS) serialization — the byte-stable string that makes
 * hashing a config or tape well-defined. Locale-independent by construction:
 * object keys are sorted by UTF-16 code unit, never via locale-aware APIs.
 *
 * @see https://www.rfc-editor.org/rfc/rfc8785
 */
declare const CANONICAL_FORMAT_VERSION = 1;
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
declare function canonicalize(value: unknown): string;
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
declare function canonical_config(state: unknown, data: unknown): string;
export { CANONICAL_FORMAT_VERSION, canonicalize, canonical_config };
