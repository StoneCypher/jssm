/**
 * Public surface of the `jssm/cli` library subpath.
 *
 * Consumed by:
 *   - Library users: `import { render, renderSet, parseFslArgs } from 'jssm/cli';`
 *   - The `fsl-render` plugin (internally, via direct module paths)
 *   - The dispatcher (only for type cross-references)
 *
 * Adding a new subcommand here means: (1) implement it under
 * `src/ts/cli/subcommands/<name>/`, (2) re-export its library function(s)
 * from this file, (3) ship its binary as `fsl-<name>.ts`.
 */

export { render }    from './subcommands/render/render';
export { renderSet } from './subcommands/render/renderSet';
export type { RenderSetItem, RenderSetItemOk, RenderSetItemErr } from './subcommands/render/renderSet';

export { parseFslArgs } from './cli-utils';
export type { ParseSpec, ParseResult, FlagSpec, FlagType } from './cli-utils';

export type {
  RenderTarget,
  RenderOptions,
  RenderResult,
  TextResult,
  RasterResult,
} from './types';

export { RenderError, RasterizationUnsupportedError } from './types';
