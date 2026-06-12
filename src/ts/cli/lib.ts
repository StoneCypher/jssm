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

// ─── Config loader (issue #631) ──────────────────────────────────────────

export { loadConfig } from './config/loader';
export type { LoadConfigOptions } from './config/loader';

export { mergeConfigs } from './config/merge';
export { resolveExtends } from './config/extends';
export { defaults } from './config/defaults';
export { validateConfig, CONFIG_SCHEMA } from './config/schema';

export { loadConfigFile } from './config/sources/from-file';
export { discoverUserGlobalConfig, discoverProjectConfig } from './config/sources/from-discovery';
export { extractMachineAttributes } from './config/sources/from-machine';
export { flagsToConfig } from './config/sources/from-flags';
export type { FlagMapping } from './config/sources/from-flags';

export {
  ConfigError,
  ConfigParseError,
  ConfigSchemaError,
  ConfigExtendsError,
  ConfigIOError,
} from './config/types';

export type {
  PartialConfig,
  ResolvedConfig,
  RenderConfig,
  LintConfig,
  FormatConfig,
  TestConfig,
  CheckConfig,
  CodegenConfig,
  InitConfig,
  ImportConfig,
  ExportConfig,
  McpConfig,
  LspConfig,
  ReplConfig,
  RegistryConfig,
  Reader,
} from './config/types';
