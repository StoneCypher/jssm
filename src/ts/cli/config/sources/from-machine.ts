/**
 * Extract config-relevant attributes from an FSL machine source.
 *
 * The v1 mapping table is **deliberately empty** — almost nothing in
 * today's grammar is invocation-config-shaped. The function exists so
 * the layer slot is wired and tested; concrete mappings land alongside
 * the features that need them (e.g. issue #607 will add `theme`).
 *
 * Pure module — does not throw on invalid FSL; returns `{}` instead, so
 * config layering never blocks on parser errors.
 * @param machineSource - FSL source text.
 * @returns A `PartialConfig` derived from machine attributes (empty in v1).
 * @example
 *   extractMachineAttributes("a 'next' -> b;");
 *   // {}
 *
 *   // Future (after issue #607 lands):
 *   //   extractMachineAttributes('theme : "neon"; a -> b;');
 *   //   // { render: { theme: 'neon' } }
 */

import type { PartialConfig } from '../types';

export function extractMachineAttributes(_machineSource: string): PartialConfig {
  // v1: empty mapping table. Function exists so the architectural layer
  // slot is real, tested, and wired into the loader.
  return {};
}
