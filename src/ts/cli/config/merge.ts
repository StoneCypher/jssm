/**
 * Pure deep-merge for an ordered array of `PartialConfig` layers.
 *
 * Semantics:
 *   - objects merge recursively per-key, later wins per-key
 *   - arrays REPLACE (later array wholly replaces former — not concat, not union)
 *   - scalars: later wins
 *   - `null` from a later layer explicitly clears (sets to null)
 *   - `undefined` from a later layer does NOT override an earlier value
 *   - type mismatch (object on one side, array on the other): later wins
 *
 * Input layers are never mutated.
 */

import type { PartialConfig } from './types';

/**
 * Return true if `v` is a plain object (not an array, not null, not a class instance).
 *
 * @param v - Value to test.
 */
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

/**
 * Merge two values according to the layer-merge semantics.
 *
 * @param a - The earlier (lower-precedence) value.
 * @param b - The later (higher-precedence) value.
 * @returns The merged result; neither input is mutated.
 */
const mergeTwo = (a: unknown, b: unknown): unknown => {
  if (b === undefined) return a;
  if (b === null) return null;
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: Record<string, unknown> = { ...a };
    for (const k of Object.keys(b)) {
      const merged = mergeTwo(a[k], b[k]);
      if (merged === undefined) {
        delete out[k];
      } else {
        out[k] = merged;
      }
    }
    return out;
  }
  // arrays, scalars, or type mismatch — later wins
  return b;
};

/**
 * Merge an ordered list of partial configs into a single `PartialConfig`.
 *
 * Layers are applied left-to-right: the last layer has the highest precedence.
 * The merge is deep for plain objects but arrays REPLACE rather than concatenate
 * (consistent with how most CLI config systems treat array-valued settings).
 *
 * @param layers - From lowest precedence (first) to highest (last).
 * @returns A new object; inputs are never mutated.
 *
 * @example
 *   mergeConfigs([
 *     { render: { scale: 3 } },
 *     { render: { scale: 7 } },
 *   ]);
 *   // { render: { scale: 7 } }
 *
 * @example
 *   mergeConfigs([]);
 *   // {}
 *
 * @see mergeTwo for the per-value merge semantics.
 */
export function mergeConfigs(layers: ReadonlyArray<PartialConfig>): PartialConfig {
  let acc: PartialConfig = {};
  for (const layer of layers) {
    acc = mergeTwo(acc, layer) as PartialConfig;
  }
  return acc;
}
