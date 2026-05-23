/**
 * Public types and error classes for the `jssm/cli` config loader.
 *
 * This module is **Pure** — no Node API references — so it can be bundled
 * into browser, edge-worker, and other non-Node environments without
 * pulling in `fs`/`path`/`os`.
 *
 * See `notes/superpowers/specs/2026-05-22-fsl-cli-config-design.md` for the
 * full architectural design.
 */

import type { RenderTarget } from '../types';

/** Signature for an injected config-file reader (fs.readFile, fetch, etc.). */
export type Reader = (path: string) => Promise<string>;

/** A render target alias — re-exports `RenderTarget` from the parent CLI types module so the config types stay in sync automatically. */
export type RenderTargetName = RenderTarget;

/** Render subcommand configuration; fully populated in v1. */
export interface RenderConfig {
  /** Default render target when none specified on CLI. Default: `'svg'`. */
  defaultTarget?: RenderTargetName;
  /** Output directory for multi-file render. */
  outDir?: string;
  /** Output zoom scale. Default: `3`. */
  scale?: number;
  /** Output pixel width (raster). Mutually exclusive with `height` and `scale`. */
  width?: number;
  /** Output pixel height (raster). Mutually exclusive with `width` and `scale`. */
  height?: number;
  /** JPEG quality 1-100. Default: `85`. */
  quality?: number;
  /** Named theme (reserved for issue #607). */
  theme?: string;
}

/** Lint subcommand configuration — empty in v1; fields land with issue #620. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LintConfig {}

/** Fmt subcommand configuration — empty in v1; fields land with issue #621. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FmtConfig {}

/** Test subcommand configuration — empty in v1; fields land with issue #622. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TestConfig {}

/** Check subcommand configuration — empty in v1; fields land with issue #623. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CheckConfig {}

/** Typegen subcommand configuration — empty in v1; fields land with issue #624. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TypegenConfig {}

/** Scaffolder subcommand configuration — empty in v1; fields land with issue #625. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NewConfig {}

/** Converter subcommand configuration — empty in v1; fields land with issue #626. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ConvertConfig {}

/** Playground subcommand configuration — empty in v1; fields land with issue #627. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PlaygroundConfig {}

/** MCP server subcommand configuration — empty in v1; fields land with issue #628. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface McpConfig {}

/** LSP server subcommand configuration — empty in v1; fields land with issue #629. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LspConfig {}

/** REPL subcommand configuration — empty in v1; fields land with issue #630. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ReplConfig {}

/** The fully-merged, defaults-populated configuration the loader returns. */
export interface ResolvedConfig {
  include: string[];
  exclude: string[];
  render: Required<Pick<RenderConfig, 'defaultTarget' | 'scale' | 'quality'>> & RenderConfig;
  lint: LintConfig;
  fmt: FmtConfig;
  test: TestConfig;
  check: CheckConfig;
  typegen: TypegenConfig;
  new: NewConfig;
  convert: ConvertConfig;
  playground: PlaygroundConfig;
  mcp: McpConfig;
  lsp: LspConfig;
  repl: ReplConfig;
}

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/** What users actually write in their config file — every field optional. */
export type PartialConfig = DeepPartial<ResolvedConfig> & {
  $schema?: string;
  extends?: string | string[];
};

/** Base class for all config errors. */
export abstract class ConfigError extends Error {
  /** Discriminator for catch-block branching without instanceof chains. */
  public abstract readonly kind: 'parse' | 'schema' | 'extends' | 'io';
  /** Source file path, if known. */
  public readonly path?: string;
  /** Source line, if known. */
  public readonly line?: number;
  /** Source column, if known. */
  public readonly column?: number;

  constructor(message: string, opts: { path?: string; line?: number; column?: number } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.path = opts.path;
    this.line = opts.line;
    this.column = opts.column;
  }
}

/** Thrown when a config file is not valid JSON. */
export class ConfigParseError extends ConfigError {
  public readonly kind = 'parse' as const;
  constructor(message: string, opts: { path?: string; line?: number; column?: number } = {}) {
    super(message, opts);
    Object.setPrototypeOf(this, ConfigParseError.prototype);
  }
}

/** Thrown when a parsed config violates the schema. */
export class ConfigSchemaError extends ConfigError {
  public readonly kind = 'schema' as const;
  /** Raw ajv error array — callers may format as they please. */
  public readonly violations: ReadonlyArray<unknown>;
  constructor(message: string, opts: { path?: string; line?: number; column?: number; violations: ReadonlyArray<unknown> }) {
    super(message, opts);
    this.violations = opts.violations;
    Object.setPrototypeOf(this, ConfigSchemaError.prototype);
  }
}

/** Thrown on extends-chain failures: missing path, cycle, depth exceeded. */
export class ConfigExtendsError extends ConfigError {
  public readonly kind = 'extends' as const;
  /** The chain of file paths leading to the failure. */
  public readonly chain: ReadonlyArray<string>;
  constructor(message: string, opts: { path?: string; chain: ReadonlyArray<string> }) {
    super(message, { path: opts.path });
    this.chain = opts.chain;
    Object.setPrototypeOf(this, ConfigExtendsError.prototype);
  }
}

/** Thrown on filesystem failures (permission denied, etc.). */
export class ConfigIOError extends ConfigError {
  public readonly kind = 'io' as const;
  /** The underlying Node errno error. (Named `errno` rather than `cause` to avoid shadowing the native ES2022 Error.cause field.) */
  public readonly errno: NodeJS.ErrnoException;
  constructor(message: string, opts: { path?: string; errno: NodeJS.ErrnoException }) {
    super(message, { path: opts.path });
    this.errno = opts.errno;
    Object.setPrototypeOf(this, ConfigIOError.prototype);
  }
}
