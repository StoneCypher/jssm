/**
 * Compile-time-constant default `ResolvedConfig`. The lowest layer of the
 * config stack — every loadConfig call starts here.
 *
 * **Calibrated to today's `fsl render` behavior** so a project with no
 * config file produces identical output to the current release.
 *
 * Deep-frozen so consumers cannot accidentally mutate the shared singleton.
 */

import type { ResolvedConfig } from './types';

/**
 * Recursively freezes an object and all of its nested object values in
 * place; returns the same reference so the call can be chained inline.
 */
const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === 'object') {
    for (const k of Object.keys(o)) {
      deepFreeze((o as Record<string, unknown>)[k]);
    }
    Object.freeze(o);
  }
  return o;
};

/**
 * The built-in defaults.
 *
 * @example
 *   import { defaults } from 'jssm/cli';
 *   const cfg = mergeConfigs([defaults, userConfig]);
 */
export const defaults: ResolvedConfig = deepFreeze({
  include: ['**/*.fsl'],
  exclude: ['**/node_modules/**'],
  render: {
    defaultTarget: 'svg',
    scale: 3,
    quality: 85,
  },
  lint: {},
  fmt: {},
  test: {},
  check: {},
  typegen: {},
  new: {},
  convert: {},
  playground: {},
  mcp: {},
  lsp: {},
  repl: {},
});
