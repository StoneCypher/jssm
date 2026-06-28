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

export { render }    from './subcommands/render/render.js';
export { renderSet } from './subcommands/render/renderSet.js';
export type { RenderSetItem, RenderSetItemOk, RenderSetItemErr } from './subcommands/render/renderSet.js';

// ─── Codegen verb (megaspec §25) ─────────────────────────────────────────

export { codegen }    from './subcommands/codegen/codegen.js';
export { codegenSet } from './subcommands/codegen/codegenSet.js';
export type { CodegenSetItem, CodegenSetItemOk, CodegenSetItemErr } from './subcommands/codegen/codegenSet.js';
export { extractSurface } from './subcommands/codegen/surface.js';
export type { MachineSurface, SurfaceTransition } from './subcommands/codegen/surface.js';

export type {
  CodegenTarget,
  CodegenOptions,
  CodegenArtifact,
} from './codegen-types.js';

export { CodegenError, CodegenUndecidedError } from './codegen-types.js';

// ─── Interchange (megaspec §25 import / export) ───────────────────────────

export { exportMachine } from './subcommands/export/export.js';
export type { ExportOptions } from './subcommands/export/export.js';

export { importMachine } from './subcommands/import/import.js';
export type { ImportOptions } from './subcommands/import/import.js';

export type {
  ExportFormat,
  ImportFormat,
  InterchangeModel,
  InterchangeEdge,
  ConversionResult,
} from './subcommands/interchange/types.js';

export { InterchangeError } from './subcommands/interchange/types.js';

export { parseFslArgs } from './cli-utils.js';
export type { ParseSpec, ParseResult, FlagSpec, FlagType } from './cli-utils.js';

export type {
  RenderTarget,
  RenderOptions,
  RenderResult,
  TextResult,
  RasterResult,
} from './types.js';

export { RenderError, RasterizationUnsupportedError } from './types.js';

// ─── Config loader (issue #631) ──────────────────────────────────────────

export { loadConfig } from './config/loader.js';
export type { LoadConfigOptions } from './config/loader.js';

export { mergeConfigs } from './config/merge.js';
export { resolveExtends } from './config/extends.js';
export { defaults } from './config/defaults.js';
export { validateConfig, CONFIG_SCHEMA } from './config/schema.js';

export { loadConfigFile } from './config/sources/from-file.js';
export { discoverUserGlobalConfig, discoverProjectConfig } from './config/sources/from-discovery.js';
export { extractMachineAttributes } from './config/sources/from-machine.js';
export { flagsToConfig } from './config/sources/from-flags.js';
export type { FlagMapping } from './config/sources/from-flags.js';

export {
  ConfigError,
  ConfigParseError,
  ConfigSchemaError,
  ConfigExtendsError,
  ConfigIOError,
} from './config/types.js';

export type {
  PartialConfig,
  ResolvedConfig,
  RenderConfig,
  LintConfig,
  FormatConfig,
  TestConfig,
  CheckConfig,
  TypegenConfig,
  CodegenConfig,
  InitConfig,
  ImportConfig,
  ExportConfig,
  McpConfig,
  LspConfig,
  ReplConfig,
  RegistryConfig,
  Reader,
} from './config/types.js';
