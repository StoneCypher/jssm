/**
 * Apply a `flag-name → config-dot-path` mapping to produce a
 * `PartialConfig` suitable as the top layer of a config stack.
 *
 * Each subcommand owns its mapping table. Flags whose mapping is `null`
 * are per-invocation-only and never written to the config layer.
 *
 * Pure module — no I/O, no global state.
 */

import type { PartialConfig } from '../types';

/** A mapping from flag name to dotted config path, or `null` to skip. */
export type FlagMapping = Record<string, string | null>;

/**
 * @param flags - Parsed flags (typed as `Record<string, unknown>` because
 *   flag values can be strings, numbers, booleans, arrays, or undefined).
 * @param mapping - Per-subcommand flag → config-path table.
 * @returns A `PartialConfig` representing the flag overrides.
 *
 * @example
 *   flagsToConfig({ target: 'png' }, { target: 'render.defaultTarget' });
 *   // { render: { defaultTarget: 'png' } }
 */
export function flagsToConfig(
  flags: Record<string, unknown>,
  mapping: FlagMapping,
): PartialConfig {
  const out: Record<string, unknown> = {};
  for (const flagName of Object.keys(flags)) {
    const target = mapping[flagName];
    if (target == null) continue;                  // null mapping = skip
    const value = flags[flagName];
    if (value === undefined) continue;             // undefined flag = no override
    setDotted(out, target, value);
  }
  return out as PartialConfig;
}

const setDotted = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const parts = path.split('.');
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!(k in cur) || typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
};
