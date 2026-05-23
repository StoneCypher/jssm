# fsl CLI Unified JSON Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement issue #631 — a layered, source-agnostic JSON configuration loader for the `fsl` CLI and the `jssm/cli` library, wired into the existing `fsl render` subcommand. Discovery walks up from cwd for `<project>/.fsl/config.json`, layered under `~/.fsl/config.json`, both supporting an `extends` chain. The loader is reusable from Node CLIs, GitHub Actions, editor plugins, static-site generators, and browsers (via a `fetch`-based reader).

**Architecture:** Pure-vs-Node split. The merge engine, extends resolution, schema validation, defaults, and machine-attribute extraction live as pure modules (no Node API references). The Node orchestrator (`loadConfig`) and the fs-backed sources wrap them. `extends.ts` takes a reader callback so the same logic serves Node (`fs.readFile`) and browser (`fetch`). Every layer is a `PartialConfig`; the merge engine deep-merges them in precedence order with arrays-replace semantics.

**Tech Stack:**
- TypeScript 4.7 (project's existing version)
- vitest (spec suite + stoch suite, already configured)
- ajv 8 (JSON Schema validation, already a devDep)
- fast-check (stochastic property tests, already a devDep)
- No new runtime dependencies

**Reference spec:** `notes/superpowers/specs/2026-05-22-fsl-cli-config-design.md`

---

## Conventions used in this plan

- All file paths are relative to the repo root unless absolute.
- Test runs (per file): `npx vitest run <file> --config vitest.spec.config.ts --reporter=verbose`
- Full CLI spec subset: `npm run vitest-spec`
- Stoch subset: `npm run vitest-stoch`
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `build:`). Scope: `cli/config` for the loader and its tests; `cli/render` for the integration into the render plugin.
- The package version is **NOT** bumped in this plan. Per `CLAUDE.md`, version bumps happen via `/sc-commit` and require explicit user authorization. The plan ends at "ready for review."
- All tasks follow TDD: write failing test → confirm it fails → write minimal code → confirm it passes → commit.
- Coverage target: 100% on new files (project standard, commit `43aee18`). Every branch, every line, every function.
- vitest spec files use globals (`describe`, `it`, `expect` are ambient — no imports needed). See `vitest.spec.config.ts`.
- Never commit with `--no-verify`. If a pre-commit hook fails, fix the underlying issue and make a new commit.
- After every Write/Edit, run `mcp__ide__getDiagnostics` before declaring the step done (per user's standing instruction in CLAUDE.md memory).

---

## File structure

### New source files

```
src/ts/cli/config/
├── types.ts                       # PartialConfig, ResolvedConfig, error classes
├── defaults.ts                    # Built-in default ResolvedConfig
├── schema.ts                      # JSON Schema constant + validateConfig() via ajv
├── merge.ts                       # mergeConfigs() — deep-merge an ordered array
├── extends.ts                     # resolveExtends() — takes a reader callback
├── loader.ts                      # loadConfig() — Node-environment orchestrator
└── sources/
    ├── from-file.ts               # loadConfigFile() — fs-backed reader
    ├── from-discovery.ts          # discoverUserGlobalConfig(), discoverProjectConfig()
    ├── from-machine.ts            # extractMachineAttributes() — empty mapping table
    └── from-flags.ts              # flagsToConfig() — apply flag → config-path mapping
```

### New test files

```
src/ts/tests/cli/config/
├── types.spec.ts                  # types + error classes
├── defaults.spec.ts               # default shape
├── schema.spec.ts                 # validateConfig accept/reject
├── merge.spec.ts                  # deep-merge cases
├── merge.stoch.ts                 # algebraic invariants
├── extends.spec.ts                # resolution, cycles, depth, paths
├── from-file.spec.ts              # parse, IO errors
├── from-discovery.spec.ts         # walk-up, ~/.fsl, both missing
├── from-machine.spec.ts           # empty table, future-proof shape
├── from-flags.spec.ts             # mapping mechanics
├── loader.spec.ts                 # orchestrator end-to-end with mocks
├── integration.spec.ts            # real fs fixtures
└── fixtures/
    ├── projects/
    │   ├── no-config/
    │   ├── basic-config/
    │   │   └── .fsl/config.json
    │   ├── extends-chain/
    │   │   ├── base.json
    │   │   ├── middle.json
    │   │   └── .fsl/config.json
    │   ├── extends-cycle/
    │   │   ├── a.json
    │   │   ├── b.json
    │   │   └── .fsl/config.json
    │   ├── invalid-json/
    │   │   └── .fsl/config.json
    │   └── schema-violation/
    │       └── .fsl/config.json
    └── home/                       # simulated ~/.fsl/ root for tests
        └── .fsl/
            └── config.json
```

### Modified files

- `src/ts/cli/lib.ts` — re-export the new public API.
- `src/ts/cli/subcommands/render/plugin.ts` — call `loadConfig`, add `--config` and `--no-config` flags, layer flags on top.
- `src/ts/cli/subcommands/render/render.ts` — accept resolved config values from the orchestrator. (Minimal change — only adds optional defaults derived from config.)
- `README.md` — new "Configuration" section linking to `notes/fsl-config.md`. (May be auto-generated from `src/doc_md/`; verify and update the right source.)

### New documentation

- `notes/fsl-config.md` — durable reference for the config format, layer ordering, extends semantics, error catalogue.

### Unchanged

- `src/ts/jssm.ts`, `src/ts/jssm_viz.ts`, all core machine code.
- `src/ts/cli/cli-utils.ts`, `src/ts/cli/dispatcher.ts`, `src/ts/cli/fsl.ts`, `src/ts/cli/fsl-render.ts`.
- All existing render targets and the rasterize module.

---

## Task 1: Config types and error classes

**Files:**
- Create: `src/ts/cli/config/types.ts`
- Test: `src/ts/tests/cli/config/types.spec.ts`

The pure foundation. Defines `PartialConfig`, `ResolvedConfig`, every per-subcommand section interface (most empty), the `Reader` callback type, and the full error class hierarchy.

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/cli/config/types.spec.ts`:

```ts
import type {
  PartialConfig,
  ResolvedConfig,
  RenderConfig,
  LintConfig,
  FmtConfig,
  TestConfig,
  CheckConfig,
  TypegenConfig,
  Reader,
} from '../../../cli/config/types';
import {
  ConfigError,
  ConfigParseError,
  ConfigSchemaError,
  ConfigExtendsError,
  ConfigIOError,
} from '../../../cli/config/types';

describe('cli/config/types', () => {

  it('ResolvedConfig contains every planned subcommand section', () => {
    const r: ResolvedConfig = {
      include: ['**/*.fsl'],
      exclude: [],
      render:  { defaultTarget: 'svg', scale: 3, quality: 85 },
      lint:    {},
      fmt:     {},
      test:    {},
      check:   {},
      typegen: {},
      new:     {},
      convert: {},
      playground: {},
      mcp:     {},
      lsp:     {},
      repl:    {},
    };
    expect(r.render.defaultTarget).toBe('svg');
  });

  it('PartialConfig allows omitting every field', () => {
    const p: PartialConfig = {};
    expect(p).toEqual({});
  });

  it('PartialConfig allows extends as string or array', () => {
    const p1: PartialConfig = { extends: './base.json' };
    const p2: PartialConfig = { extends: ['./a.json', './b.json'] };
    expect(p1.extends).toBe('./base.json');
    expect(Array.isArray(p2.extends)).toBe(true);
  });

  it('PartialConfig allows $schema for editor autocomplete', () => {
    const p: PartialConfig = { $schema: 'https://stonecypher.github.io/jssm/schemas/fsl-config.json' };
    expect(p.$schema).toContain('stonecypher.github.io');
  });

  it('RenderConfig has all v1 fields', () => {
    const r: RenderConfig = {
      defaultTarget: 'png',
      outDir: 'build',
      scale: 4,
      width: 800,
      height: 600,
      quality: 90,
      theme: 'dark',
    };
    expect(r.defaultTarget).toBe('png');
  });

  it('Reader type accepts a path-to-string async function', async () => {
    const r: Reader = async (p: string) => `read:${p}`;
    expect(await r('foo')).toBe('read:foo');
  });

  it('ConfigError is abstract via its concrete subclasses', () => {
    const e = new ConfigParseError('parse fail', { path: '/x.json' });
    expect(e).toBeInstanceOf(ConfigError);
    expect(e).toBeInstanceOf(Error);
    expect(e.kind).toBe('parse');
    expect(e.path).toBe('/x.json');
    expect(e.name).toBe('ConfigParseError');
  });

  it('ConfigSchemaError carries violations', () => {
    const violations = [{ keyword: 'type', instancePath: '/scale', message: 'must be number' }] as any[];
    const e = new ConfigSchemaError('schema fail', { path: '/x.json', violations });
    expect(e.kind).toBe('schema');
    expect(e.violations).toEqual(violations);
  });

  it('ConfigExtendsError carries the chain', () => {
    const chain = ['/a.json', '/b.json', '/a.json'];
    const e = new ConfigExtendsError('cycle', { chain });
    expect(e.kind).toBe('extends');
    expect(e.chain).toEqual(chain);
  });

  it('ConfigIOError carries the underlying errno', () => {
    const cause = Object.assign(new Error('ENOENT'), { code: 'ENOENT', errno: -2 });
    const e = new ConfigIOError('cannot read', { path: '/x', cause: cause as NodeJS.ErrnoException });
    expect(e.kind).toBe('io');
    expect(e.cause.code).toBe('ENOENT');
  });

});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/types.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module '../../../cli/config/types'`.

- [ ] **Step 3: Implement `src/ts/cli/config/types.ts`**

```ts
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

/** Signature for an injected config-file reader (fs.readFile, fetch, etc.). */
export type Reader = (path: string) => Promise<string>;

/** A `Render` target — must match the union in `src/ts/cli/types.ts`. */
export type RenderTargetName = 'svg' | 'dot' | 'png' | 'jpeg' | 'html';

/** Render subcommand configuration; fully populated in v1. */
export interface RenderConfig {
  /** Default render target when none specified on CLI. Default: `'svg'`. */
  defaultTarget?: RenderTargetName;
  /** Output directory for multi-file render. */
  outDir?: string;
  /** Output zoom scale (100 = 3x SVG natural size). Default: `3`. */
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
  /** The underlying Node errno error. */
  public readonly cause: NodeJS.ErrnoException;
  constructor(message: string, opts: { path?: string; cause: NodeJS.ErrnoException }) {
    super(message, { path: opts.path });
    this.cause = opts.cause;
    Object.setPrototypeOf(this, ConfigIOError.prototype);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ts/tests/cli/config/types.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 10 tests.

- [ ] **Step 5: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics` (or the equivalent IDE call).
Expected: no errors on `src/ts/cli/config/types.ts` or `src/ts/tests/cli/config/types.spec.ts`. Any TS errors, lint warnings, or deprecations must be resolved before the commit.

- [ ] **Step 6: Commit**

```bash
git add src/ts/cli/config/types.ts src/ts/tests/cli/config/types.spec.ts
git commit -m "feat(cli/config): types and error classes"
```

---

## Task 2: Built-in defaults

**Files:**
- Create: `src/ts/cli/config/defaults.ts`
- Test: `src/ts/tests/cli/config/defaults.spec.ts`

The lowest-precedence layer. Must be calibrated to today's hard-coded `fsl render` values so projects with no config behave identically to today.

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/cli/config/defaults.spec.ts`:

```ts
import { defaults } from '../../../cli/config/defaults';

describe('cli/config/defaults', () => {

  it('include defaults to glob for all .fsl files', () => {
    expect(defaults.include).toEqual(['**/*.fsl']);
  });

  it('exclude defaults to node_modules', () => {
    expect(defaults.exclude).toEqual(['**/node_modules/**']);
  });

  it('render.defaultTarget is svg', () => {
    expect(defaults.render.defaultTarget).toBe('svg');
  });

  it('render.scale is 3 (matches current hard-coded value)', () => {
    expect(defaults.render.scale).toBe(3);
  });

  it('render.quality is 85 (matches current hard-coded value)', () => {
    expect(defaults.render.quality).toBe(85);
  });

  it('every per-subcommand section is present', () => {
    expect(defaults.lint).toBeDefined();
    expect(defaults.fmt).toBeDefined();
    expect(defaults.test).toBeDefined();
    expect(defaults.check).toBeDefined();
    expect(defaults.typegen).toBeDefined();
    expect(defaults.new).toBeDefined();
    expect(defaults.convert).toBeDefined();
    expect(defaults.playground).toBeDefined();
    expect(defaults.mcp).toBeDefined();
    expect(defaults.lsp).toBeDefined();
    expect(defaults.repl).toBeDefined();
  });

  it('defaults is deep-frozen so callers cannot mutate it', () => {
    expect(Object.isFrozen(defaults)).toBe(true);
    expect(Object.isFrozen(defaults.render)).toBe(true);
    expect(Object.isFrozen(defaults.include)).toBe(true);
  });

});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/defaults.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module '../../../cli/config/defaults'`.

- [ ] **Step 3: Implement `src/ts/cli/config/defaults.ts`**

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ts/tests/cli/config/defaults.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 7 tests.

- [ ] **Step 5: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`.
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ts/cli/config/defaults.ts src/ts/tests/cli/config/defaults.spec.ts
git commit -m "feat(cli/config): built-in defaults calibrated to today's render behavior"
```

---

## Task 3: Schema and validation

**Files:**
- Create: `src/ts/cli/config/schema.ts`
- Test: `src/ts/tests/cli/config/schema.spec.ts`

A hand-written JSON Schema (kept in sync with TS types by tests) plus a `validateConfig` function using ajv. Auto-generation from TS types is deferred to a follow-up — for v1, the schema is small enough to maintain by hand.

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/cli/config/schema.spec.ts`:

```ts
import { validateConfig, CONFIG_SCHEMA } from '../../../cli/config/schema';
import { ConfigSchemaError } from '../../../cli/config/types';

describe('cli/config/schema', () => {

  it('CONFIG_SCHEMA is a valid JSON Schema draft 07 object', () => {
    expect(CONFIG_SCHEMA.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(CONFIG_SCHEMA.type).toBe('object');
    expect(CONFIG_SCHEMA.additionalProperties).toBe(false);
  });

  it('accepts an empty object', () => {
    expect(() => validateConfig({}, { path: '/x' })).not.toThrow();
  });

  it('accepts $schema and extends fields', () => {
    expect(() => validateConfig({
      $schema: 'https://example/schema.json',
      extends: './base.json',
    }, { path: '/x' })).not.toThrow();
  });

  it('accepts extends as an array', () => {
    expect(() => validateConfig({ extends: ['./a.json', './b.json'] }, { path: '/x' })).not.toThrow();
  });

  it('accepts a complete render config', () => {
    expect(() => validateConfig({
      render: {
        defaultTarget: 'png',
        outDir: 'build',
        scale: 4,
        width: 800,
        height: 600,
        quality: 90,
        theme: 'dark',
      },
    }, { path: '/x' })).not.toThrow();
  });

  it('rejects unknown top-level keys', () => {
    expect(() => validateConfig({ totally_made_up: true } as any, { path: '/x' })).toThrow(ConfigSchemaError);
  });

  it('rejects render.defaultTarget not in the enum', () => {
    expect(() => validateConfig({ render: { defaultTarget: 'tiff' } } as any, { path: '/x' })).toThrow(ConfigSchemaError);
  });

  it('rejects non-numeric render.scale', () => {
    expect(() => validateConfig({ render: { scale: 'big' } } as any, { path: '/x' })).toThrow(ConfigSchemaError);
  });

  it('rejects extends as a number', () => {
    expect(() => validateConfig({ extends: 42 } as any, { path: '/x' })).toThrow(ConfigSchemaError);
  });

  it('ConfigSchemaError carries the violations array and the path', () => {
    try {
      validateConfig({ render: { scale: 'big' } } as any, { path: '/foo/.fsl/config.json' });
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigSchemaError);
      const err = e as ConfigSchemaError;
      expect(err.path).toBe('/foo/.fsl/config.json');
      expect(err.violations.length).toBeGreaterThan(0);
    }
  });

});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/schema.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module '../../../cli/config/schema'`.

- [ ] **Step 3: Implement `src/ts/cli/config/schema.ts`**

```ts
/**
 * JSON Schema for the `fsl` config file, plus the `validateConfig`
 * function used by the loader.
 *
 * The schema is hand-written in v1; a follow-up will generate it from the
 * TS types via `ts-json-schema-generator`. Until then, when types in
 * `types.ts` change, update this file in lockstep.
 *
 * Pure module — uses ajv directly with no Node API references.
 */

import Ajv, { ErrorObject } from 'ajv';
import type { PartialConfig } from './types';
import { ConfigSchemaError } from './types';

/** Empty per-subcommand-section schema; reserves the key. */
const emptySection = { type: 'object', additionalProperties: true } as const;

/** The JSON Schema (draft-07) used at runtime and published for editor autocomplete. */
export const CONFIG_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://stonecypher.github.io/jssm/schemas/fsl-config.json',
  title: 'fsl Configuration',
  description: 'Unified configuration for the fsl CLI and the jssm/cli library.',
  type: 'object',
  additionalProperties: false,
  properties: {
    $schema: { type: 'string' },
    extends: {
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } },
      ],
    },
    include: { type: 'array', items: { type: 'string' } },
    exclude: { type: 'array', items: { type: 'string' } },
    render: {
      type: 'object',
      additionalProperties: false,
      properties: {
        defaultTarget: { type: 'string', enum: ['svg', 'dot', 'png', 'jpeg', 'html'] },
        outDir: { type: 'string' },
        scale: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        quality: { type: 'number' },
        theme: { type: 'string' },
      },
    },
    lint: emptySection,
    fmt: emptySection,
    test: emptySection,
    check: emptySection,
    typegen: emptySection,
    new: emptySection,
    convert: emptySection,
    playground: emptySection,
    mcp: emptySection,
    lsp: emptySection,
    repl: emptySection,
  },
} as const;

const ajv = new Ajv({ allErrors: true });
const validator = ajv.compile(CONFIG_SCHEMA as object);

/**
 * Validate a parsed config object against the schema. Throws
 * `ConfigSchemaError` with the full ajv violation array on failure.
 *
 * @param config - The parsed object from a config file (or assembled in code)
 * @param opts.path - Source path for the error message (optional but recommended)
 * @throws ConfigSchemaError if the object violates the schema
 *
 * @example
 *   validateConfig({ render: { defaultTarget: 'svg' } }, { path: '/x.json' });
 *   // returns void
 *
 * @example
 *   validateConfig({ render: { defaultTarget: 'tiff' } }, { path: '/x.json' });
 *   // throws ConfigSchemaError
 */
export function validateConfig(config: unknown, opts: { path?: string } = {}): asserts config is PartialConfig {
  const ok = validator(config);
  if (!ok) {
    const violations = (validator.errors ?? []) as ErrorObject[];
    const summary = violations.map(v => `${v.instancePath || '/'}: ${v.message}`).join('; ');
    throw new ConfigSchemaError(`config schema violation${opts.path ? ` in ${opts.path}` : ''}: ${summary}`, {
      path: opts.path,
      violations,
    });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ts/tests/cli/config/schema.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 10 tests.

- [ ] **Step 5: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`. Verify ajv import resolves correctly. If ajv types complain, the project may need `@types/ajv` (check `npm list ajv` first; ajv 8+ ships its own types).

- [ ] **Step 6: Commit**

```bash
git add src/ts/cli/config/schema.ts src/ts/tests/cli/config/schema.spec.ts
git commit -m "feat(cli/config): JSON Schema and ajv validation"
```

---

## Task 4: Merge engine + stochastic invariants

**Files:**
- Create: `src/ts/cli/config/merge.ts`
- Test: `src/ts/tests/cli/config/merge.spec.ts`
- Test: `src/ts/tests/cli/config/merge.stoch.ts`

The pure deep-merge function. Arrays replace, scalars overwrite, objects merge recursively, `null` clears.

- [ ] **Step 1: Write the failing example-based test**

Create `src/ts/tests/cli/config/merge.spec.ts`:

```ts
import { mergeConfigs } from '../../../cli/config/merge';
import type { PartialConfig } from '../../../cli/config/types';

describe('cli/config/merge', () => {

  it('merging an empty list returns an empty object', () => {
    expect(mergeConfigs([])).toEqual({});
  });

  it('merging a single layer returns that layer', () => {
    const a: PartialConfig = { render: { scale: 5 } };
    expect(mergeConfigs([a])).toEqual(a);
  });

  it('later layer overrides earlier for scalars', () => {
    const out = mergeConfigs([
      { render: { scale: 3 } },
      { render: { scale: 7 } },
    ]);
    expect(out.render?.scale).toBe(7);
  });

  it('objects merge recursively per-key', () => {
    const out = mergeConfigs([
      { render: { scale: 3, outDir: 'a' } },
      { render: { scale: 7 } },
    ]);
    expect(out.render).toEqual({ scale: 7, outDir: 'a' });
  });

  it('arrays REPLACE (do not concat or union)', () => {
    const out = mergeConfigs([
      { include: ['a', 'b'] },
      { include: ['c'] },
    ]);
    expect(out.include).toEqual(['c']);
  });

  it('null from a later layer clears a value', () => {
    const out = mergeConfigs([
      { render: { outDir: 'a' } },
      { render: { outDir: null as any } },
    ]);
    expect(out.render?.outDir).toBeNull();
  });

  it('undefined from a later layer does NOT override an earlier value', () => {
    const out = mergeConfigs([
      { render: { scale: 5 } },
      { render: { scale: undefined } },
    ]);
    expect(out.render?.scale).toBe(5);
  });

  it('type mismatch: later wins (object replaced by array)', () => {
    const out = mergeConfigs([
      { render: { theme: 'dark' } as any },
      { render: ['unexpected'] as any },
    ]);
    expect(out.render).toEqual(['unexpected']);
  });

  it('three layers merge in order', () => {
    const out = mergeConfigs([
      { render: { scale: 1, outDir: 'a', quality: 10 } },
      { render: { scale: 2, outDir: 'b' } },
      { render: { scale: 3 } },
    ]);
    expect(out.render).toEqual({ scale: 3, outDir: 'b', quality: 10 });
  });

  it('does not mutate input layers', () => {
    const a: PartialConfig = { render: { scale: 1 } };
    const b: PartialConfig = { render: { scale: 2 } };
    mergeConfigs([a, b]);
    expect(a.render?.scale).toBe(1);
    expect(b.render?.scale).toBe(2);
  });

  it('handles deeply-nested merges', () => {
    const out = mergeConfigs([
      { render: { theme: 'a', outDir: 'x' } },
      { render: { theme: 'b' } },
    ]);
    expect(out.render).toEqual({ theme: 'b', outDir: 'x' });
  });

});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/merge.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module '../../../cli/config/merge'`.

- [ ] **Step 3: Implement `src/ts/cli/config/merge.ts`**

```ts
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

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

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
 * Merge an ordered list of partial configs.
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
 */
export function mergeConfigs(layers: ReadonlyArray<PartialConfig>): PartialConfig {
  let acc: PartialConfig = {};
  for (const layer of layers) {
    acc = mergeTwo(acc, layer) as PartialConfig;
  }
  return acc;
}
```

- [ ] **Step 4: Run to verify the example test passes**

Run: `npx vitest run src/ts/tests/cli/config/merge.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 11 tests.

- [ ] **Step 5: Write the stochastic invariants test**

Create `src/ts/tests/cli/config/merge.stoch.ts`:

```ts
import * as fc from 'fast-check';
import { mergeConfigs } from '../../../cli/config/merge';
import type { PartialConfig } from '../../../cli/config/types';

// Generator: random plausible PartialConfig.
const arbConfig = (): fc.Arbitrary<PartialConfig> =>
  fc.record({
    include:  fc.option(fc.array(fc.string(), { maxLength: 5 }), { nil: undefined }),
    exclude:  fc.option(fc.array(fc.string(), { maxLength: 5 }), { nil: undefined }),
    render:   fc.option(fc.record({
      defaultTarget: fc.option(fc.constantFrom('svg', 'dot', 'png', 'jpeg', 'html') as fc.Arbitrary<'svg' | 'dot' | 'png' | 'jpeg' | 'html'>, { nil: undefined }),
      scale: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
      quality: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
      outDir: fc.option(fc.string(), { nil: undefined }),
    }, { requiredKeys: [] }), { nil: undefined }),
  }, { requiredKeys: [] }) as fc.Arbitrary<PartialConfig>;

describe('mergeConfigs — algebraic invariants', () => {

  it('identity: merging a single layer equals that layer', () => {
    fc.assert(fc.property(arbConfig(), (x) => {
      expect(mergeConfigs([x])).toEqual(x);
    }), { numRuns: 200 });
  });

  it('idempotent on equal layers: merge([x, x]) deep-equals x', () => {
    fc.assert(fc.property(arbConfig(), (x) => {
      expect(mergeConfigs([x, x])).toEqual(x);
    }), { numRuns: 200 });
  });

  it('right-bias on scalar leaves: merge([{render:{scale:a}}, {render:{scale:b}}]).render.scale === b', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 10 }), fc.integer({ min: 1, max: 10 }), (a, b) => {
      const merged = mergeConfigs([
        { render: { scale: a } },
        { render: { scale: b } },
      ]);
      expect(merged.render?.scale).toBe(b);
    }), { numRuns: 200 });
  });

  it('associativity: merge([a,b,c]) deep-equals merge([merge([a,b]), c])', () => {
    fc.assert(fc.property(arbConfig(), arbConfig(), arbConfig(), (a, b, c) => {
      const left = mergeConfigs([a, b, c]);
      const right = mergeConfigs([mergeConfigs([a, b]), c]);
      expect(left).toEqual(right);
    }), { numRuns: 200 });
  });

});
```

- [ ] **Step 6: Run the stochastic test**

Run: `npx vitest run src/ts/tests/cli/config/merge.stoch.ts --config vitest.stoch.config.ts --reporter=verbose`
Expected: PASS, 4 invariants, each fuzzed 200 times.

If any invariant fails, fast-check will report a shrunk counterexample. Fix the merge implementation, not the test, and re-run.

- [ ] **Step 7: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`.

- [ ] **Step 8: Commit**

```bash
git add src/ts/cli/config/merge.ts src/ts/tests/cli/config/merge.spec.ts src/ts/tests/cli/config/merge.stoch.ts
git commit -m "feat(cli/config): merge engine with arrays-replace semantics + stoch invariants"
```

---

## Task 5: Extends resolution with reader callback

**Files:**
- Create: `src/ts/cli/config/extends.ts`
- Test: `src/ts/tests/cli/config/extends.spec.ts`

Pure module — takes a `Reader` callback so the same code serves Node (`fs.readFile`) and browser (`fetch`). Handles paths, cycles, depth limit.

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/cli/config/extends.spec.ts`:

```ts
import { resolveExtends } from '../../../cli/config/extends';
import { ConfigExtendsError } from '../../../cli/config/types';
import type { Reader, PartialConfig } from '../../../cli/config/types';

// Build a reader from an in-memory file map for testing.
const makeReader = (files: Record<string, string>): Reader => async (path: string) => {
  if (!(path in files)) throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
  return files[path];
};

describe('cli/config/extends', () => {

  it('returns the input unchanged when no extends present', async () => {
    const reader = makeReader({});
    const out = await resolveExtends({ render: { scale: 4 } }, '/p/.fsl/config.json', reader);
    expect(out).toEqual({ render: { scale: 4 } });
  });

  it('resolves a single string extends', async () => {
    const reader = makeReader({
      '/p/base.json': JSON.stringify({ render: { scale: 2, outDir: 'b' } }),
    });
    const out = await resolveExtends(
      { extends: './base.json', render: { scale: 9 } },
      '/p/.fsl/config.json',
      reader,
    );
    expect(out.render).toEqual({ scale: 9, outDir: 'b' });
  });

  it('resolves array extends in order (later wins)', async () => {
    const reader = makeReader({
      '/p/a.json': JSON.stringify({ render: { scale: 1, outDir: 'a', quality: 10 } }),
      '/p/b.json': JSON.stringify({ render: { scale: 2, outDir: 'b' } }),
    });
    const out = await resolveExtends(
      { extends: ['./a.json', './b.json'], render: { scale: 9 } },
      '/p/.fsl/config.json',
      reader,
    );
    expect(out.render).toEqual({ scale: 9, outDir: 'b', quality: 10 });
  });

  it('strips the extends key from the returned config', async () => {
    const reader = makeReader({
      '/p/base.json': JSON.stringify({ render: { scale: 1 } }),
    });
    const out = await resolveExtends(
      { extends: './base.json' } as PartialConfig,
      '/p/.fsl/config.json',
      reader,
    );
    expect('extends' in out).toBe(false);
  });

  it('resolves paths relative to the file that contains the extends', async () => {
    const reader = makeReader({
      '/p/nested/dir/base.json': JSON.stringify({ render: { scale: 7 } }),
    });
    const out = await resolveExtends(
      { extends: './base.json' },
      '/p/nested/dir/.fsl/config.json',   // basePath
      reader,
    );
    // The extends path resolves relative to basePath's dirname.
    expect(out.render?.scale).toBe(7);
  });

  it('throws ConfigExtendsError on a cycle', async () => {
    const reader = makeReader({
      '/p/a.json': JSON.stringify({ extends: './b.json' }),
      '/p/b.json': JSON.stringify({ extends: './a.json' }),
    });
    await expect(resolveExtends(
      { extends: './a.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toBeInstanceOf(ConfigExtendsError);
  });

  it('throws ConfigExtendsError when depth exceeds 32', async () => {
    // Build a 33-deep chain.
    const files: Record<string, string> = {};
    for (let i = 0; i < 33; i++) {
      files[`/p/n${i}.json`] = JSON.stringify({ extends: `./n${i + 1}.json` });
    }
    files['/p/n33.json'] = JSON.stringify({ render: { scale: 1 } });
    const reader = makeReader(files);
    await expect(resolveExtends(
      { extends: './n0.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toBeInstanceOf(ConfigExtendsError);
  });

  it('propagates the reader error wrapped (e.g. ENOENT)', async () => {
    const reader = makeReader({});
    await expect(resolveExtends(
      { extends: './missing.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toThrow(/missing\.json|ENOENT/);
  });

  it('resolves nested extends (a extends b extends c)', async () => {
    const reader = makeReader({
      '/p/c.json': JSON.stringify({ render: { scale: 1, outDir: 'c-dir', quality: 99 } }),
      '/p/b.json': JSON.stringify({ extends: './c.json', render: { scale: 2, outDir: 'b-dir' } }),
      '/p/a.json': JSON.stringify({ extends: './b.json', render: { scale: 3 } }),
    });
    const out = await resolveExtends(
      { extends: './a.json' },
      '/p/.fsl/config.json',
      reader,
    );
    expect(out.render).toEqual({ scale: 3, outDir: 'b-dir', quality: 99 });
  });

  it('validates each base file against the schema and rejects violations', async () => {
    const { ConfigSchemaError } = await import('../../../cli/config/types');
    const reader = makeReader({
      '/p/bad-base.json': JSON.stringify({ render: { defaultTarget: 'tiff' } }),
    });
    await expect(resolveExtends(
      { extends: './bad-base.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toBeInstanceOf(ConfigSchemaError);
  });

  it('throws ConfigParseError when a base file is malformed JSON', async () => {
    const { ConfigParseError } = await import('../../../cli/config/types');
    const reader = makeReader({
      '/p/bad.json': '{ this is not json',
    });
    await expect(resolveExtends(
      { extends: './bad.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toBeInstanceOf(ConfigParseError);
  });

});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/extends.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module '../../../cli/config/extends'`.

- [ ] **Step 3: Implement `src/ts/cli/config/extends.ts`**

```ts
/**
 * Resolve a `PartialConfig`'s `extends` chain into a single merged
 * `PartialConfig`. Pure module — takes a `Reader` callback so the same
 * logic serves Node (`fs.readFile`) and browser (`fetch`).
 *
 * Resolution rules (per the design spec):
 *   - paths relative to the file containing the extends
 *   - cycle detection via the recursion stack
 *   - depth limit: 32 nested extends
 *   - merge order: bases resolve bottom-up first; the file's own keys merge last
 *   - array form: bases merge in order before the file's own keys
 */

import type { PartialConfig, Reader } from './types';
import { ConfigExtendsError, ConfigParseError } from './types';
import { mergeConfigs } from './merge';
import { validateConfig } from './schema';

const MAX_DEPTH = 32;

// Pure path-join: resolve `rel` relative to the directory containing `from`.
// Cross-platform-safe; assumes POSIX-style separators in the input paths.
const dirnameOf = (path: string): string => {
  const ix = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return ix === -1 ? '.' : path.slice(0, ix);
};

const joinPath = (dir: string, rel: string): string => {
  // If `rel` looks absolute (POSIX `/` or Windows `X:\`), return as-is.
  if (/^([a-zA-Z]:)?[/\\]/.test(rel)) return rel;
  const parts = (dir + '/' + rel).split(/[/\\]+/);
  const out: string[] = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  const prefix = /^[a-zA-Z]:/.test(parts[0] ?? '') ? '' : '/';
  return prefix + out.join('/');
};

const omitKey = <T extends Record<string, unknown>>(obj: T, key: string): T => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) if (k !== key) out[k] = obj[k];
  return out as T;
};

/**
 * Resolve `raw.extends` into the fully merged effective config.
 *
 * @param raw - The parsed config object (may or may not have `extends`).
 * @param basePath - Absolute path of the file `raw` came from; extends paths resolve relative to its dirname.
 * @param reader - Async function that turns a path into the file's text. The CLI passes `fs.readFile`; the WC will pass a fetch wrapper.
 * @returns The merged config, with the `extends` key stripped.
 * @throws ConfigExtendsError on cycle or depth overrun.
 * @throws ConfigParseError if a base file is malformed JSON.
 *
 * @example
 *   const cfg = await resolveExtends(parsed, '/p/.fsl/config.json', fs.readFile);
 */
export async function resolveExtends(
  raw: PartialConfig,
  basePath: string,
  reader: Reader,
  visited: ReadonlyArray<string> = [],
): Promise<PartialConfig> {
  if (visited.includes(basePath)) {
    throw new ConfigExtendsError(
      `extends cycle detected: ${[...visited, basePath].join(' -> ')}`,
      { path: basePath, chain: [...visited, basePath] },
    );
  }
  if (visited.length >= MAX_DEPTH) {
    throw new ConfigExtendsError(
      `extends depth ${MAX_DEPTH} exceeded`,
      { path: basePath, chain: [...visited, basePath] },
    );
  }

  if (!raw.extends) {
    return omitKey(raw as Record<string, unknown>, 'extends') as PartialConfig;
  }

  const extendsList = typeof raw.extends === 'string' ? [raw.extends] : raw.extends;
  const baseDir = dirnameOf(basePath);
  const nextVisited = [...visited, basePath];

  const bases: PartialConfig[] = [];
  for (const rel of extendsList) {
    const absPath = joinPath(baseDir, rel);
    const text = await reader(absPath);
    let parsed: PartialConfig;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new ConfigParseError(`malformed JSON in ${absPath}: ${(e as Error).message}`, { path: absPath });
    }
    // Every parsed file (including recursive bases) must satisfy the schema.
    // The top-level caller (from-file.ts) validates the entry point; this
    // line validates every base reached via the extends chain.
    validateConfig(parsed, { path: absPath });
    const resolved = await resolveExtends(parsed, absPath, reader, nextVisited);
    bases.push(resolved);
  }

  const ownKeys = omitKey(raw as Record<string, unknown>, 'extends') as PartialConfig;
  return mergeConfigs([...bases, ownKeys]);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ts/tests/cli/config/extends.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 11 tests.

- [ ] **Step 5: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`.

- [ ] **Step 6: Commit**

```bash
git add src/ts/cli/config/extends.ts src/ts/tests/cli/config/extends.spec.ts
git commit -m "feat(cli/config): extends resolution with injected reader callback"
```

---

## Task 6: Machine-attribute extractor (empty v1 table)

**Files:**
- Create: `src/ts/cli/config/sources/from-machine.ts`
- Test: `src/ts/tests/cli/config/from-machine.spec.ts`

Pure module — runs the existing FSL parser, walks the machine-attribute block, returns a `PartialConfig`. v1 mapping table is empty; the function reserves the layer slot.

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/cli/config/from-machine.spec.ts`:

```ts
import { extractMachineAttributes } from '../../../cli/config/sources/from-machine';

describe('cli/config/sources/from-machine', () => {

  it('returns an empty PartialConfig for a typical machine in v1', () => {
    const fsl = `
      a 'next' -> b 'next' -> c;
    `;
    const out = extractMachineAttributes(fsl);
    expect(out).toEqual({});
  });

  it('returns an empty PartialConfig for a machine with current attribute syntax', () => {
    const fsl = `
      machine_name: "traffic light";
      machine_author: "Test";
      a 'next' -> b;
    `;
    const out = extractMachineAttributes(fsl);
    expect(out).toEqual({});
  });

  it('returns an empty PartialConfig for invalid FSL (does not throw)', () => {
    // The extractor should be robust to broken FSL — config layering should
    // not block on parser errors. The caller has separate diagnostic paths.
    const out = extractMachineAttributes('not actually fsl');
    expect(out).toEqual({});
  });

  it('returns a plain object (not frozen, callers may merge)', () => {
    const out = extractMachineAttributes('a -> b;');
    expect(Object.isFrozen(out)).toBe(false);
  });

});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/from-machine.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement `src/ts/cli/config/sources/from-machine.ts`**

```ts
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
 *
 * @param machineSource - FSL source text.
 * @returns A `PartialConfig` derived from machine attributes (empty in v1).
 *
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ts/tests/cli/config/from-machine.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 4 tests.

- [ ] **Step 5: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`.

- [ ] **Step 6: Commit**

```bash
git add src/ts/cli/config/sources/from-machine.ts src/ts/tests/cli/config/from-machine.spec.ts
git commit -m "feat(cli/config): machine-attribute extractor with empty v1 mapping table"
```

---

## Task 7: Flag mapper

**Files:**
- Create: `src/ts/cli/config/sources/from-flags.ts`
- Test: `src/ts/tests/cli/config/from-flags.spec.ts`

Pure module — applies a `flag-name → config-dot-path` mapping to produce the highest-precedence layer for the CLI environment.

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/cli/config/from-flags.spec.ts`:

```ts
import { flagsToConfig } from '../../../cli/config/sources/from-flags';

describe('cli/config/sources/from-flags', () => {

  it('returns an empty config when no flags map', () => {
    expect(flagsToConfig({}, {})).toEqual({});
  });

  it('maps a single flag to its config path', () => {
    const out = flagsToConfig(
      { target: 'png' },
      { target: 'render.defaultTarget' },
    );
    expect(out).toEqual({ render: { defaultTarget: 'png' } });
  });

  it('maps multiple flags into the same section', () => {
    const out = flagsToConfig(
      { target: 'png', scale: 4 },
      { target: 'render.defaultTarget', scale: 'render.scale' },
    );
    expect(out).toEqual({ render: { defaultTarget: 'png', scale: 4 } });
  });

  it('maps multiple flags into multiple sections', () => {
    const out = flagsToConfig(
      { target: 'png', 'log-level': 'debug' },
      { target: 'render.defaultTarget', 'log-level': 'lint.logLevel' as any },
    );
    expect((out as any).render?.defaultTarget).toBe('png');
    expect((out as any).lint?.logLevel).toBe('debug');
  });

  it('skips flags whose value is undefined', () => {
    const out = flagsToConfig(
      { target: undefined, scale: 4 },
      { target: 'render.defaultTarget', scale: 'render.scale' },
    );
    expect(out).toEqual({ render: { scale: 4 } });
  });

  it('skips flags whose mapping is null (per-invocation-only flags)', () => {
    const out = flagsToConfig(
      { output: 'foo.svg', target: 'png' },
      { output: null, target: 'render.defaultTarget' },
    );
    expect(out).toEqual({ render: { defaultTarget: 'png' } });
  });

  it('skips flags not present in the mapping', () => {
    const out = flagsToConfig(
      { target: 'png', mystery: true },
      { target: 'render.defaultTarget' },
    );
    expect(out).toEqual({ render: { defaultTarget: 'png' } });
  });

  it('handles a top-level (non-section) mapping', () => {
    const out = flagsToConfig(
      { include: ['**/*.fsl'] },
      { include: 'include' },
    );
    expect(out).toEqual({ include: ['**/*.fsl'] });
  });

});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/from-flags.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement `src/ts/cli/config/sources/from-flags.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ts/tests/cli/config/from-flags.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 8 tests.

- [ ] **Step 5: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`.

- [ ] **Step 6: Commit**

```bash
git add src/ts/cli/config/sources/from-flags.ts src/ts/tests/cli/config/from-flags.spec.ts
git commit -m "feat(cli/config): flag mapper with dotted config-path support"
```

---

## Task 8: File source (fs-backed reader)

**Files:**
- Create: `src/ts/cli/config/sources/from-file.ts`
- Test: `src/ts/tests/cli/config/from-file.spec.ts`
- Test fixtures: `src/ts/tests/cli/config/fixtures/projects/basic-config/.fsl/config.json`
- Test fixtures: `src/ts/tests/cli/config/fixtures/projects/invalid-json/.fsl/config.json`
- Test fixtures: `src/ts/tests/cli/config/fixtures/projects/extends-chain/.fsl/config.json`
- Test fixtures: `src/ts/tests/cli/config/fixtures/projects/extends-chain/base.json`
- Test fixtures: `src/ts/tests/cli/config/fixtures/projects/extends-chain/middle.json`

Node module — wraps `resolveExtends` with `fs.readFile` as the reader. Reads, parses, validates, resolves extends, returns a `PartialConfig`.

- [ ] **Step 1: Create test fixtures**

Create `src/ts/tests/cli/config/fixtures/projects/basic-config/.fsl/config.json`:

```json
{
  "$schema": "https://stonecypher.github.io/jssm/schemas/fsl-config.json",
  "render": {
    "defaultTarget": "png",
    "scale": 4
  }
}
```

Create `src/ts/tests/cli/config/fixtures/projects/invalid-json/.fsl/config.json`:

```
{ this is not valid json
```

Create `src/ts/tests/cli/config/fixtures/projects/extends-chain/base.json`:

```json
{
  "render": { "scale": 1, "outDir": "from-base", "quality": 50 }
}
```

Create `src/ts/tests/cli/config/fixtures/projects/extends-chain/middle.json`:

```json
{
  "extends": "./base.json",
  "render": { "scale": 2, "outDir": "from-middle" }
}
```

Create `src/ts/tests/cli/config/fixtures/projects/extends-chain/.fsl/config.json`:

```json
{
  "extends": "../middle.json",
  "render": { "scale": 3 }
}
```

- [ ] **Step 2: Write the failing test**

Create `src/ts/tests/cli/config/from-file.spec.ts`:

```ts
import { resolve } from 'path';
import { loadConfigFile } from '../../../cli/config/sources/from-file';
import { ConfigParseError, ConfigIOError, ConfigSchemaError } from '../../../cli/config/types';

const fixture = (rel: string): string => resolve(__dirname, 'fixtures/projects', rel);

describe('cli/config/sources/from-file', () => {

  it('loads a valid config file', async () => {
    const out = await loadConfigFile(fixture('basic-config/.fsl/config.json'));
    expect(out.render?.defaultTarget).toBe('png');
    expect(out.render?.scale).toBe(4);
  });

  it('strips the $schema key after validation', async () => {
    const out = await loadConfigFile(fixture('basic-config/.fsl/config.json'));
    expect('$schema' in out).toBe(false);
  });

  it('resolves a multi-level extends chain', async () => {
    const out = await loadConfigFile(fixture('extends-chain/.fsl/config.json'));
    expect(out.render).toEqual({ scale: 3, outDir: 'from-middle', quality: 50 });
  });

  it('throws ConfigParseError on malformed JSON', async () => {
    await expect(loadConfigFile(fixture('invalid-json/.fsl/config.json')))
      .rejects.toBeInstanceOf(ConfigParseError);
  });

  it('throws ConfigIOError when the file does not exist', async () => {
    await expect(loadConfigFile(fixture('totally-missing/.fsl/config.json')))
      .rejects.toBeInstanceOf(ConfigIOError);
  });

  it('throws ConfigSchemaError when the config violates the schema', async () => {
    // Create a tmp schema-violating file inline to keep the fixture tree clean.
    const tmpDir = await import('os').then(os => os.tmpdir());
    const fs = await import('fs/promises');
    const tmp = `${tmpDir}/fsl-config-bad-${process.pid}.json`;
    await fs.writeFile(tmp, JSON.stringify({ render: { defaultTarget: 'tiff' } }));
    try {
      await expect(loadConfigFile(tmp)).rejects.toBeInstanceOf(ConfigSchemaError);
    } finally {
      await fs.unlink(tmp);
    }
  });

});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/from-file.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module`.

- [ ] **Step 4: Implement `src/ts/cli/config/sources/from-file.ts`**

```ts
/**
 * Filesystem-backed config file loader. Wraps `resolveExtends` with
 * `fs.readFile` as the reader, runs schema validation, returns the
 * fully-merged `PartialConfig`.
 *
 * Node-only — uses `fs/promises`.
 */

import { readFile } from 'fs/promises';
import type { PartialConfig, Reader } from '../types';
import { ConfigIOError, ConfigParseError } from '../types';
import { resolveExtends } from '../extends';
import { validateConfig } from '../schema';

const fsReader: Reader = async (path: string) => {
  try {
    return await readFile(path, 'utf8');
  } catch (e) {
    const errno = e as NodeJS.ErrnoException;
    throw new ConfigIOError(`cannot read config file ${path}: ${errno.message}`, {
      path,
      cause: errno,
    });
  }
};

/**
 * Read, parse, validate, and resolve the extends chain of one config file.
 *
 * @param path - Absolute or cwd-relative path to a config file.
 * @returns The fully-merged `PartialConfig` (with `extends` stripped).
 * @throws ConfigIOError if the file cannot be read.
 * @throws ConfigParseError if the file is not valid JSON.
 * @throws ConfigSchemaError if the parsed object violates the schema.
 * @throws ConfigExtendsError on cycle or depth overrun.
 *
 * @example
 *   const cfg = await loadConfigFile('/project/.fsl/config.json');
 *   // { render: { scale: 4, ... } }
 */
export async function loadConfigFile(path: string): Promise<PartialConfig> {
  const text = await fsReader(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new ConfigParseError(`malformed JSON in ${path}: ${(e as Error).message}`, { path });
  }
  validateConfig(parsed, { path });
  const resolved = await resolveExtends(parsed as PartialConfig, path, fsReader);
  // Strip $schema if present — it's purely an editor-autocomplete hint.
  const out: Record<string, unknown> = { ...(resolved as Record<string, unknown>) };
  delete out.$schema;
  return out as PartialConfig;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/ts/tests/cli/config/from-file.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 6 tests.

- [ ] **Step 6: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`.

- [ ] **Step 7: Commit**

```bash
git add src/ts/cli/config/sources/from-file.ts src/ts/tests/cli/config/from-file.spec.ts src/ts/tests/cli/config/fixtures/
git commit -m "feat(cli/config): file source with fs reader, schema validation, extends chain"
```

---

## Task 9: Discovery (user-global + project)

**Files:**
- Create: `src/ts/cli/config/sources/from-discovery.ts`
- Test: `src/ts/tests/cli/config/from-discovery.spec.ts`
- Test fixture: `src/ts/tests/cli/config/fixtures/home/.fsl/config.json`

Node module — two separate exports. `discoverUserGlobalConfig` checks the user-global path; `discoverProjectConfig` walks up from a given directory.

- [ ] **Step 1: Create the home-fixture file**

Create `src/ts/tests/cli/config/fixtures/home/.fsl/config.json`:

```json
{
  "render": { "scale": 5 }
}
```

- [ ] **Step 2: Write the failing test**

Create `src/ts/tests/cli/config/from-discovery.spec.ts`:

```ts
import { resolve, join } from 'path';
import * as os from 'os';
import {
  discoverUserGlobalConfig,
  discoverProjectConfig,
} from '../../../cli/config/sources/from-discovery';

const fixtureRoot = resolve(__dirname, 'fixtures');
const fakeHome    = resolve(fixtureRoot, 'home');

describe('cli/config/sources/from-discovery', () => {

  describe('discoverUserGlobalConfig', () => {

    it('returns null when ~/.fsl/config.json does not exist', async () => {
      // Point at a directory we know has no .fsl/
      const out = await discoverUserGlobalConfig({ home: resolve(fixtureRoot, 'projects/no-config') });
      expect(out).toBeNull();
    });

    it('returns the parsed config when ~/.fsl/config.json exists', async () => {
      const out = await discoverUserGlobalConfig({ home: fakeHome });
      expect(out?.render?.scale).toBe(5);
    });

    it('defaults to os.homedir() when no home option is passed', async () => {
      // Smoke test: it should not throw on the runner's real home dir.
      const out = await discoverUserGlobalConfig();
      // Either null (no ~/.fsl on runner) or a parsed object — both fine.
      expect(out === null || typeof out === 'object').toBe(true);
    });

  });

  describe('discoverProjectConfig', () => {

    it('returns null when no .fsl/config.json exists in cwd or any ancestor', async () => {
      const out = await discoverProjectConfig({ from: resolve(fixtureRoot, 'projects/no-config') });
      expect(out).toBeNull();
    });

    it('returns the parsed config when .fsl/config.json exists at the from directory', async () => {
      const out = await discoverProjectConfig({ from: resolve(fixtureRoot, 'projects/basic-config') });
      expect(out?.render?.defaultTarget).toBe('png');
    });

    it('walks up from a child directory and finds an ancestor .fsl/config.json', async () => {
      // The basic-config fixture's .fsl/config.json should be found from a subdirectory.
      // We synthesize a subdirectory path that doesn't exist on disk —
      // walk-up looks at ancestors, not the leaf itself, so a non-existent
      // leaf path is fine.
      const childPath = resolve(fixtureRoot, 'projects/basic-config/some/nested/child');
      const out = await discoverProjectConfig({ from: childPath });
      expect(out?.render?.defaultTarget).toBe('png');
    });

    it('stops walking at the filesystem root without throwing', async () => {
      // os.tmpdir() is a path where we're confident there's no .fsl/config.json above.
      // (If it ever does have one, the test will see that config, not crash.)
      const out = await discoverProjectConfig({ from: os.tmpdir() });
      // Either null or an unrelated config — neither should crash.
      expect(out === null || typeof out === 'object').toBe(true);
    });

  });

});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/from-discovery.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module`.

- [ ] **Step 4: Implement `src/ts/cli/config/sources/from-discovery.ts`**

```ts
/**
 * Discover the user-global and project-level config files.
 *
 * Two separately exported functions so non-CLI consumers (GitHub Actions,
 * editor plugins, SSGs) can pick which one(s) to call. The CLI's
 * `loadConfig` orchestrator calls both.
 *
 * Node-only — uses `fs` and `os`.
 */

import { access, constants } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname, parse } from 'path';
import type { PartialConfig } from '../types';
import { loadConfigFile } from './from-file';

const CONFIG_BASENAME = join('.fsl', 'config.json');

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Look for `~/.fsl/config.json` (or `<home>/.fsl/config.json` if `home`
 * is provided for testing).
 *
 * @param opts.home - Override the home directory (test seam).
 * @returns The parsed config, or `null` if the file does not exist.
 * @throws ConfigParseError / ConfigSchemaError / ConfigIOError if the file exists but is malformed.
 *
 * @example
 *   const userCfg = await discoverUserGlobalConfig();
 *   // null on a fresh machine, a PartialConfig if the user wrote one.
 */
export async function discoverUserGlobalConfig(opts: { home?: string } = {}): Promise<PartialConfig | null> {
  const path = join(opts.home ?? homedir(), CONFIG_BASENAME);
  if (!(await exists(path))) return null;
  return loadConfigFile(path);
}

/**
 * Walk up from `from` looking for a directory containing `.fsl/config.json`.
 * Returns the first one found; null if none up to the filesystem root.
 *
 * @param opts.from - Directory to start walking from. Walks toward the
 *   filesystem root.
 * @returns The parsed config, or `null` if none exists in any ancestor.
 * @throws ConfigParseError / ConfigSchemaError / ConfigIOError if a file is found but malformed.
 *
 * @example
 *   const projCfg = await discoverProjectConfig({ from: process.cwd() });
 */
export async function discoverProjectConfig(opts: { from: string }): Promise<PartialConfig | null> {
  let cur = opts.from;
  const root = parse(cur).root;
  // Cap iterations defensively in case of symlink loops or weird filesystems.
  for (let i = 0; i < 64; i++) {
    const candidate = join(cur, CONFIG_BASENAME);
    if (await exists(candidate)) return loadConfigFile(candidate);
    if (cur === root) return null;
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
  return null;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/ts/tests/cli/config/from-discovery.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 7 tests.

- [ ] **Step 6: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`.

- [ ] **Step 7: Commit**

```bash
git add src/ts/cli/config/sources/from-discovery.ts src/ts/tests/cli/config/from-discovery.spec.ts src/ts/tests/cli/config/fixtures/home/
git commit -m "feat(cli/config): user-global + project discovery as two separate exports"
```

---

## Task 10: Loader orchestrator

**Files:**
- Create: `src/ts/cli/config/loader.ts`
- Test: `src/ts/tests/cli/config/loader.spec.ts`

Node module — the CLI-environment convenience function. Orchestrates discovery, machine-attribute extraction, flag mapping, and the merge. Two new options for Actions/editor/SSG callers: `projectRoot` and `skipUserGlobal`.

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/cli/config/loader.spec.ts`:

```ts
import { resolve } from 'path';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { loadConfig } from '../../../cli/config/loader';

const fixtureRoot = resolve(__dirname, 'fixtures');

describe('cli/config/loader', () => {

  it('returns defaults when nothing else is set', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/no-config'),
      skipUserGlobal: true,
    });
    expect(out.render.defaultTarget).toBe('svg');
    expect(out.render.scale).toBe(3);
    expect(out.render.quality).toBe(85);
  });

  it('layers project config over defaults', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      skipUserGlobal: true,
    });
    expect(out.render.defaultTarget).toBe('png');
    expect(out.render.scale).toBe(4);
    // unset in project config — should fall through to defaults
    expect(out.render.quality).toBe(85);
  });

  it('layers user-global below project', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      home: resolve(fixtureRoot, 'home'),
    });
    // project overrides user-global; user-global overrode defaults for scale
    expect(out.render.scale).toBe(4);          // from project (wins)
  });

  it('uses user-global when project is absent', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/no-config'),
      home: resolve(fixtureRoot, 'home'),
    });
    expect(out.render.scale).toBe(5);          // from user-global
  });

  it('applies flag overrides on top', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      skipUserGlobal: true,
      flags: { target: 'jpeg', scale: 7 },
      flagMapping: { target: 'render.defaultTarget', scale: 'render.scale' },
    });
    expect(out.render.defaultTarget).toBe('jpeg');
    expect(out.render.scale).toBe(7);
  });

  it('skipConfig returns defaults+flags only', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      skipConfig: true,
      flags: { target: 'png' },
      flagMapping: { target: 'render.defaultTarget' },
    });
    expect(out.render.defaultTarget).toBe('png');
    expect(out.render.scale).toBe(3);          // defaults — project config was skipped
  });

  it('explicitConfigPath bypasses discovery', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/no-config'),
      explicitConfigPath: resolve(fixtureRoot, 'projects/basic-config/.fsl/config.json'),
      skipUserGlobal: true,
    });
    expect(out.render.defaultTarget).toBe('png');
  });

  it('projectRoot anchors discovery (no walk-up)', async () => {
    // Even if a sibling dir has a config, projectRoot should anchor us to
    // a directory without one.
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      projectRoot: resolve(fixtureRoot, 'projects/no-config'),
      skipUserGlobal: true,
    });
    expect(out.render.defaultTarget).toBe('svg');  // defaults
  });

  it('skipUserGlobal ignores ~/.fsl even if it exists', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/no-config'),
      home: resolve(fixtureRoot, 'home'),
      skipUserGlobal: true,
    });
    expect(out.render.scale).toBe(3);          // defaults, not 5 from home
  });

  it('extracts machine attributes when machinePath is provided', async () => {
    const tmp = `${tmpdir()}/fsl-loader-machine-${process.pid}.fsl`;
    await writeFile(tmp, 'a -> b;');
    try {
      const out = await loadConfig({
        cwd: resolve(fixtureRoot, 'projects/no-config'),
        skipUserGlobal: true,
        machinePath: tmp,
      });
      // v1 extractor returns {} — machine layer is empty
      expect(out.render.defaultTarget).toBe('svg');
    } finally {
      await rm(tmp);
    }
  });

});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/ts/tests/cli/config/loader.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — `Cannot find module`.

- [ ] **Step 3: Implement `src/ts/cli/config/loader.ts`**

```ts
/**
 * The CLI-environment orchestrator. Collects every config layer (defaults,
 * user-global, project, machine attributes, flag overrides) and merges
 * them into a `ResolvedConfig`.
 *
 * Non-CLI consumers (GitHub Actions, editor plugins, static-site
 * generators) can use this same function — pass `skipUserGlobal: true`
 * for reproducibility and/or `projectRoot` to anchor discovery.
 *
 * Browser consumers should skip this and use `mergeConfigs` + the pure
 * helpers directly.
 *
 * Node-only.
 */

import { readFile } from 'fs/promises';
import type { PartialConfig, ResolvedConfig } from './types';
import type { FlagMapping } from './sources/from-flags';
import { mergeConfigs } from './merge';
import { defaults } from './defaults';
import { discoverUserGlobalConfig, discoverProjectConfig } from './sources/from-discovery';
import { loadConfigFile } from './sources/from-file';
import { extractMachineAttributes } from './sources/from-machine';
import { flagsToConfig } from './sources/from-flags';

/** Options accepted by `loadConfig`. */
export interface LoadConfigOptions {
  /** Base for walk-up discovery. Usually `process.cwd()`. */
  cwd: string;
  /** Anchor discovery here instead of walking up from cwd. */
  projectRoot?: string;
  /** If set, run `extractMachineAttributes` on this file's content. */
  machinePath?: string;
  /** Parsed CLI flags. */
  flags?: Record<string, unknown>;
  /** Flag → config-dot-path mapping table. */
  flagMapping?: FlagMapping;
  /** Bypass project discovery; load exactly this file. */
  explicitConfigPath?: string;
  /** Skip ALL discovery (defaults + flags only). */
  skipConfig?: boolean;
  /** Skip the ~/.fsl layer specifically (Action / CI / sandbox use). */
  skipUserGlobal?: boolean;
  /** Override home directory (test seam). */
  home?: string;
}

/**
 * Load and merge every config layer for the CLI environment.
 *
 * @returns A complete `ResolvedConfig` with defaults populated.
 * @throws Any of the `Config*Error` classes if a discovered file is malformed.
 *
 * @example
 *   const cfg = await loadConfig({ cwd: process.cwd(), flags, flagMapping });
 */
export async function loadConfig(opts: LoadConfigOptions): Promise<ResolvedConfig> {
  const layers: PartialConfig[] = [defaults];

  if (!opts.skipConfig) {
    if (opts.explicitConfigPath) {
      const explicit = await loadConfigFile(opts.explicitConfigPath);
      layers.push(explicit);
    } else {
      if (!opts.skipUserGlobal) {
        const userGlobal = await discoverUserGlobalConfig({ home: opts.home });
        if (userGlobal) layers.push(userGlobal);
      }
      const projectFrom = opts.projectRoot ?? opts.cwd;
      const project = await discoverProjectConfig({ from: projectFrom });
      if (project) layers.push(project);
    }
  }

  if (opts.machinePath) {
    try {
      const source = await readFile(opts.machinePath, 'utf8');
      layers.push(extractMachineAttributes(source));
    } catch {
      // Reading the machine for attribute extraction is best-effort; if the
      // file is missing or unreadable, the render step will surface that as
      // its own error. Don't double-report here.
    }
  }

  if (opts.flags && opts.flagMapping) {
    layers.push(flagsToConfig(opts.flags, opts.flagMapping));
  }

  return mergeConfigs(layers) as ResolvedConfig;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/ts/tests/cli/config/loader.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS, 10 tests.

- [ ] **Step 5: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`.

- [ ] **Step 6: Commit**

```bash
git add src/ts/cli/config/loader.ts src/ts/tests/cli/config/loader.spec.ts
git commit -m "feat(cli/config): loadConfig orchestrator with Action/editor/SSG-friendly options"
```

---

## Task 11: Re-export from lib.ts

**Files:**
- Modify: `src/ts/cli/lib.ts`
- Test: `src/ts/tests/cli/lib.spec.ts` (existing — extend it)

Make the new API visible to library consumers via the `jssm/cli` subpath.

- [ ] **Step 1: Read the existing `lib.spec.ts`**

Run: read `src/ts/tests/cli/lib.spec.ts` to confirm the existing assertion style for re-exports. Existing tests check that each named export is importable.

- [ ] **Step 2: Extend `lib.spec.ts`** (add new cases, don't remove existing)

Append to `src/ts/tests/cli/lib.spec.ts`:

```ts
describe('cli/lib — config re-exports', () => {

  it('exports the loadConfig orchestrator', async () => {
    const { loadConfig } = await import('../../cli/lib');
    expect(typeof loadConfig).toBe('function');
  });

  it('exports mergeConfigs (pure)', async () => {
    const { mergeConfigs } = await import('../../cli/lib');
    expect(typeof mergeConfigs).toBe('function');
    expect(mergeConfigs([])).toEqual({});
  });

  it('exports resolveExtends (pure)', async () => {
    const { resolveExtends } = await import('../../cli/lib');
    expect(typeof resolveExtends).toBe('function');
  });

  it('exports defaults (pure constant)', async () => {
    const { defaults } = await import('../../cli/lib');
    expect(defaults.render.defaultTarget).toBe('svg');
  });

  it('exports validateConfig (pure)', async () => {
    const { validateConfig } = await import('../../cli/lib');
    expect(typeof validateConfig).toBe('function');
  });

  it('exports loadConfigFile, discoverUserGlobalConfig, discoverProjectConfig', async () => {
    const lib = await import('../../cli/lib');
    expect(typeof lib.loadConfigFile).toBe('function');
    expect(typeof lib.discoverUserGlobalConfig).toBe('function');
    expect(typeof lib.discoverProjectConfig).toBe('function');
  });

  it('exports extractMachineAttributes and flagsToConfig', async () => {
    const lib = await import('../../cli/lib');
    expect(typeof lib.extractMachineAttributes).toBe('function');
    expect(typeof lib.flagsToConfig).toBe('function');
  });

  it('exports all four ConfigError classes', async () => {
    const lib = await import('../../cli/lib');
    expect(typeof lib.ConfigError).toBe('function');
    expect(typeof lib.ConfigParseError).toBe('function');
    expect(typeof lib.ConfigSchemaError).toBe('function');
    expect(typeof lib.ConfigExtendsError).toBe('function');
    expect(typeof lib.ConfigIOError).toBe('function');
  });

});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/ts/tests/cli/lib.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: FAIL — exports not present.

- [ ] **Step 4: Edit `src/ts/cli/lib.ts`** — append the new exports

Add to the bottom of `src/ts/cli/lib.ts`:

```ts
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
  FmtConfig,
  TestConfig,
  CheckConfig,
  TypegenConfig,
  NewConfig,
  ConvertConfig,
  PlaygroundConfig,
  McpConfig,
  LspConfig,
  ReplConfig,
  Reader,
} from './config/types';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/ts/tests/cli/lib.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: PASS — all new export assertions succeed; pre-existing assertions still pass.

- [ ] **Step 6: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics`.

- [ ] **Step 7: Commit**

```bash
git add src/ts/cli/lib.ts src/ts/tests/cli/lib.spec.ts
git commit -m "feat(cli): re-export config loader API via jssm/cli subpath"
```

---

## Task 12: Integrate into `fsl-render`

**Files:**
- Modify: `src/ts/cli/subcommands/render/plugin.ts`
- Test: `src/ts/tests/cli/integration.spec.ts` (existing — extend; do not break)

Wire `loadConfig` into the render plugin so config-file values populate render defaults. Add `--config` and `--no-config` flags. Pre-existing behavior must be unchanged when no config file is present.

- [ ] **Step 1: Read the existing `plugin.ts` and `integration.spec.ts`**

Read `src/ts/cli/subcommands/render/plugin.ts` and `src/ts/tests/cli/integration.spec.ts` to understand the current shape and existing assertions. Existing tests use real spawning of `dist/cli/fsl-render.cjs` against fixtures.

- [ ] **Step 2: Write new failing tests**

Append to `src/ts/tests/cli/integration.spec.ts` (do not modify existing tests):

```ts
describe('cli integration — config file (issue #631)', () => {
  const configFixtureDir = resolve(__dirname, 'cli/config/fixtures/projects/basic-config');

  it('--no-config makes invocation behave identically to today (regression guard)', async () => {
    // The existing render fixtures rely on no config file influencing output.
    // Running with --no-config explicit should produce the same SVG as without.
    // This test ensures backward-compat by construction.
    const { stdout: a } = await runFsl(['render', '--stdout', '--no-config', renderFixture('traffic-light.fsl')]);
    const { stdout: b } = await runFsl(['render', '--stdout', renderFixture('traffic-light.fsl')]);
    expect(a).toBe(b);  // identical output
  });

  it('--config <path> loads that file', async () => {
    // basic-config has render.defaultTarget = 'png'. So omitting --target
    // and using the config should produce PNG.
    const { stdout } = await runFsl(['render', '--stdout', '--config',
      resolve(configFixtureDir, '.fsl/config.json'),
      renderFixture('traffic-light.fsl'),
    ]);
    // PNG magic bytes: 89 50 4E 47 ...
    expect(stdout.slice(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4E, 0x47]));
  });

  it('discovered .fsl/config.json sets render defaults when run in that directory', async () => {
    // cd into a project with .fsl/config.json present and invoke fsl render
    // — should pick up the project's defaults.
    const { stdout } = await runFsl(
      ['render', '--stdout', renderFixture('traffic-light.fsl')],
      { cwd: configFixtureDir }
    );
    // basic-config sets defaultTarget=png
    expect(stdout.slice(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4E, 0x47]));
  });

  it('explicit --target overrides config', async () => {
    const { stdout } = await runFsl(
      ['render', '--stdout', '--target=svg', renderFixture('traffic-light.fsl')],
      { cwd: configFixtureDir }
    );
    expect(stdout.toString().slice(0, 5)).toBe('<?xml');  // SVG, not PNG
  });
});
```

Notes for the test author: the helpers `runFsl`, `renderFixture` and the import of `resolve` are pre-existing in `integration.spec.ts`. Confirm names before referencing; if names differ, use whatever the file already defines for spawning the dispatcher binary and locating render fixtures.

- [ ] **Step 3: Run to verify the new tests fail**

Run: `npx vitest run src/ts/tests/cli/integration.spec.ts --config vitest.spec.config.ts --reporter=verbose`
Expected: the new tests FAIL (—config flag unknown; default target not picked up). Pre-existing tests still PASS.

- [ ] **Step 4: Modify `src/ts/cli/subcommands/render/plugin.ts`**

Apply these changes to the plugin file:

a. Add two new flags to `SPEC`:

```ts
const SPEC = {
  flags: {
    target:   { short: 't' as const, enum: ['svg','dot','png','jpeg','html'] as const, default: 'svg' },
    output:   { short: 'o' as const },
    'out-dir': {},
    stdout:   { boolean: true as const },
    width:    { type: 'number' as const },
    height:   { type: 'number' as const },
    scale:    { type: 'number' as const },
    quality:  { type: 'number' as const, default: 85 },
    config:   {},                                              // NEW
    'no-config': { boolean: true as const },                   // NEW
    help:     { short: 'h' as const, boolean: true as const },
    version:  { short: 'V' as const, boolean: true as const },
  },
  usage: 'fsl-render [options] <fsl-paths...>',
};
```

b. Add the flag mapping table near the top of the file:

```ts
const RENDER_FLAG_TO_CONFIG = {
  target:    'render.defaultTarget',
  output:    null,
  'out-dir': 'render.outDir',
  stdout:    null,
  width:     'render.width',
  height:    'render.height',
  scale:     'render.scale',
  quality:   'render.quality',
  config:    null,
  'no-config': null,
  help:      null,
  version:   null,
} as const;
```

c. After the early-exit for `--help` and `--version`, call the loader and use its values as the effective defaults. Replace the existing flag-reading block:

```ts
  // Existing (REPLACE these lines):
  const target  = parsed.flags.target as RenderTarget;
  // ... through `const quality = parsed.flags.quality as number | undefined;`

  // With:
  const config = await loadConfig({
    cwd:                process.cwd(),
    machinePath:        parsed.positional[0],
    flags:              parsed.flags,
    flagMapping:        RENDER_FLAG_TO_CONFIG,
    explicitConfigPath: parsed.flags.config as string | undefined,
    skipConfig:         parsed.flags['no-config'] === true,
  });

  const target  = config.render.defaultTarget as RenderTarget;
  const output  = parsed.flags.output as string | undefined;
  const outDir  = (parsed.flags['out-dir'] as string | undefined) ?? config.render.outDir;
  const stdout  = parsed.flags.stdout === true;
  const width   = config.render.width;
  const height  = config.render.height;
  const scale   = config.render.scale;
  const quality = config.render.quality;
```

Note: `output` and `stdout` remain per-invocation only (never sourced from config); the flag mapping table marks them `null`. `outDir` falls through to config if the flag is unset.

d. Add the import at the top:

```ts
import { loadConfig } from '../../config/loader';
```

- [ ] **Step 5: Run the full CLI test suite**

Run: `npm run vitest-spec`
Expected: every existing CLI test passes, plus the new config integration tests pass.

If any pre-existing test fails, the integration broke backward-compat — the defaults are not calibrated correctly or a flag's fallthrough was lost. Fix before continuing.

- [ ] **Step 6: Rebuild the CLI dist** (needed for spawned integration tests)

Run: `npm run make_cli`
Expected: `dist/cli/fsl.cjs`, `dist/cli/fsl-render.cjs`, `dist/cli/lib.cjs`, `dist/cli/lib.mjs` rebuilt.

- [ ] **Step 7: Check IDE diagnostics**

Run: `mcp__ide__getDiagnostics` on `plugin.ts`.

- [ ] **Step 8: Commit**

```bash
git add src/ts/cli/subcommands/render/plugin.ts src/ts/tests/cli/integration.spec.ts
git commit -m "feat(cli/render): consume config file via loadConfig; add --config and --no-config flags"
```

---

## Task 13: Documentation

**Files:**
- Create: `notes/fsl-config.md`
- Modify: `src/doc_md/readme.md` (or whatever the readme source file is — verify via `npm run readme`'s source script `./src/buildjs/make_readme.cjs`)

Durable docs in `notes/`, public docs sourced from `src/doc_md/`.

- [ ] **Step 1: Write `notes/fsl-config.md`**

```markdown
# fsl CLI Configuration

The `fsl` CLI and `jssm/cli` library read a layered JSON configuration so per-project, per-user, and per-invocation settings live in files instead of long shell commands.

## File location

- **Project:** `<repo-root>/.fsl/config.json` (and ancestors — the loader walks up from `cwd`)
- **User-global:** `~/.fsl/config.json`

A `.fsl/` directory is used (not a single root file) so future related files — themes (issue #607), plugin cache, schemas — share one home.

## Minimal example

```json
{
  "$schema": "https://stonecypher.github.io/jssm/schemas/fsl-config.json",
  "render": {
    "defaultTarget": "png",
    "scale": 4,
    "outDir": "build/diagrams"
  }
}
```

The `$schema` field is optional; editors that recognize it (VS Code, IntelliJ family, Helix) will autocomplete and validate as you type.

## Layering

Lowest precedence first:

1. **Built-in defaults** — `{ render: { defaultTarget: 'svg', scale: 3, quality: 85 } }`, etc.
2. **`~/.fsl/config.json`** — user-global (with its own `extends` chain resolved).
3. **`<project>/.fsl/config.json`** — project (with its own `extends` chain resolved).
4. **Machine source attributes** — intrinsic to the FSL artifact being processed. (v1: empty mapping; future features populate this.)
5. **CLI flags** — the active invocation overrides everything else.

Each layer is optional. Missing layers are skipped silently.

## Extends

A config file can extend another:

```json
{
  "extends": "../base/fsl.config.json",
  "render": { "scale": 4 }
}
```

Paths are relative to the file containing the `extends`. Both string and array forms are accepted. Array form merges in order before the file's own keys.

Cycles are detected and rejected. Maximum depth is 32 nested extends.

## Merge semantics

- **Objects** merge recursively per-key; later layer wins per-key.
- **Arrays** REPLACE — later array wholly replaces former. (Not concat, not union.)
- **Scalars** — later wins.
- **`null`** from a later layer explicitly clears a value (useful for resetting a default).
- **`undefined`** in a later layer does NOT override an earlier value.
- **Type mismatch** (object vs array, etc.) — later wins.

## Per-subcommand sections

Each subcommand owns a top-level key. v1 only `render` is populated; future subcommands fill in their own section as they land.

```json
{
  "render":  { ... },
  "lint":    { ... },   // issue #620
  "fmt":     { ... },   // issue #621
  "test":    { ... },   // issue #622
  "check":   { ... },   // issue #623
  "typegen": { ... }    // issue #624
}
```

## CLI flags

- **`--config <path>`** — bypass discovery; load exactly this file.
- **`--no-config`** — skip config discovery entirely (defaults + flags only).

## Library API

```ts
import {
  loadConfig,                 // CLI orchestrator
  mergeConfigs,               // pure merge engine
  loadConfigFile,             // load one file
  discoverUserGlobalConfig,   // ~/.fsl/config.json
  discoverProjectConfig,      // walk up for .fsl/config.json
  extractMachineAttributes,   // pull config-shaped attrs from FSL source
  flagsToConfig,              // map flags to config paths
  validateConfig,             // ajv-validate against the schema
  defaults,                   // built-in defaults
  ConfigError,                // base error
  ConfigParseError,
  ConfigSchemaError,
  ConfigExtendsError,
  ConfigIOError,
} from 'jssm/cli';
```

The full design spec is at `notes/superpowers/specs/2026-05-22-fsl-cli-config-design.md`.

## Errors

| Error | When |
|---|---|
| `ConfigParseError` | File is not valid JSON |
| `ConfigSchemaError` | Parsed object violates the schema (carries `violations` array from ajv) |
| `ConfigExtendsError` | Extends chain has a cycle or exceeds depth 32 (carries `chain` array of paths) |
| `ConfigIOError` | Filesystem failure (permission denied, etc.) (carries `cause` errno) |

All inherit from the abstract `ConfigError` class; use `e.kind` to discriminate in catch blocks without instanceof chains.

## Consumers

The loader works in every modern JS environment. See `notes/superpowers/specs/2026-05-22-fsl-cli-config-design.md` § Consumers for canonical patterns for:

- The `fsl` CLI
- GitHub Actions (Node-based) — use `skipUserGlobal: true` and explicit `projectRoot`
- Editor plugins (VS Code / LSP / Neovim / Helix / Zed)
- Static-site generators (Eleventy / Docusaurus / VitePress / Astro / Nextra)
- Browser (Web Component, in-browser playground, edge worker) — pure subset only
- Test harnesses (pure `mergeConfigs` for full control)
```

- [ ] **Step 2: Find the README source file**

Run: `cat ./src/buildjs/make_readme.cjs` (or read the file) to identify which markdown file under `src/doc_md/` is the README source. (Likely `src/doc_md/readme.md` or `src/doc_md/intro.md` or similar.)

- [ ] **Step 3: Append a "Configuration" section to the README source**

In the README source file (whichever the previous step identified), add a new section near the bottom but before the License section:

```markdown
## Configuration

The `fsl` CLI reads a layered JSON config from `<project>/.fsl/config.json` (with optional `~/.fsl/config.json` for user-global defaults). Both support an `extends` chain.

```json
{
  "$schema": "https://stonecypher.github.io/jssm/schemas/fsl-config.json",
  "render": {
    "defaultTarget": "png",
    "scale": 4
  }
}
```

CLI flags override config values. Use `--config <path>` for an explicit file or `--no-config` to skip discovery entirely.

See [`notes/fsl-config.md`](./notes/fsl-config.md) for the full reference.
```

- [ ] **Step 4: Regenerate the README**

Run: `npm run readme`
Expected: `README.md` and `dist/deno/README.md` updated; no errors.

- [ ] **Step 5: Commit**

```bash
git add notes/fsl-config.md src/doc_md/ README.md dist/deno/README.md
git commit -m "docs(cli/config): user-facing reference and README section"
```

---

## Task 14: Backward-compat and final review

**Files:** none modified — verification only.

The single most load-bearing claim of the design: a project with no config file behaves identically to today. This task verifies it.

- [ ] **Step 1: Run the full project test suite**

Run: `npm test`
Expected: every test in every suite passes. Coverage on new files reads 100%.

(Note: per user memory `project_dispatcher_flaky_test`, one test in `dispatcher.spec.ts` is contention-flaky. If only that test fails, re-run; don't debug.)

- [ ] **Step 2: Verify coverage on new files**

Run: `npx vitest run src/ts/tests/cli/config/ --config vitest.spec.config.ts --coverage`
Expected: 100% on every file under `src/ts/cli/config/`.

If any file is below 100%, write the missing test cases for the uncovered lines and add a commit.

- [ ] **Step 3: Browser-subset sanity check**

Run: `grep -rn "from 'fs'\|from 'fs/promises'\|from 'path'\|from 'os'\|require('fs')\|require('path')\|require('os')" src/ts/cli/config/types.ts src/ts/cli/config/merge.ts src/ts/cli/config/extends.ts src/ts/cli/config/schema.ts src/ts/cli/config/defaults.ts src/ts/cli/config/sources/from-machine.ts src/ts/cli/config/sources/from-flags.ts`
Expected: **no matches**. If any Pure-tagged file imports a Node module, fix it (likely by moving the offending code into a Node-tagged source file).

- [ ] **Step 4: Verify no behavior change without a config file**

Run: `node dist/cli/fsl-render.cjs --stdout src/ts/tests/cli/fixtures/machines/traffic-light.fsl > /tmp/today.svg` (or equivalent on Windows: `node dist/cli/fsl-render.cjs --stdout src/ts/tests/cli/fixtures/machines/traffic-light.fsl > %TEMP%\today.svg`)

Run with `--no-config` flag explicitly:
`node dist/cli/fsl-render.cjs --no-config --stdout src/ts/tests/cli/fixtures/machines/traffic-light.fsl > /tmp/explicit.svg`

Diff them: `diff /tmp/today.svg /tmp/explicit.svg`
Expected: no difference.

- [ ] **Step 5: Run npm run build to confirm everything composes**

Run: `npm run build`
Expected: complete success including site, cookbook, fsl_tools, changelog, docs, cloc, readme.

(Per user memory: use `npm run build`, not `npm run make`, for any pre-release validation.)

- [ ] **Step 6: Final IDE diagnostics pass**

Run: `mcp__ide__getDiagnostics` on every new file and every modified file. Expected: zero errors, zero warnings.

- [ ] **Step 7: Commit any final fixes** (if any were needed)

```bash
git add <fixed-files>
git commit -m "chore(cli/config): final pre-review polish"
```

If no fixes were needed, skip this step.

---

## Definition of Done

All boxes ticked when:

- [ ] Every test passes under `npm test`.
- [ ] Coverage on every new file under `src/ts/cli/config/` is 100%.
- [ ] No Node API imports in any Pure-tagged file (browser-safe subset is genuinely browser-safe).
- [ ] A project with no config file produces identical output to today (backward-compat verified by diff).
- [ ] `npm run build` succeeds end-to-end including readme/docs/site/cookbook.
- [ ] `mcp__ide__getDiagnostics` is clean on all changed files.
- [ ] `notes/fsl-config.md` exists and covers the format, layering, extends, errors, and consumer patterns.
- [ ] README has a "Configuration" section linking to `notes/fsl-config.md`.
- [ ] All commits use Conventional Commits style.
- [ ] No new runtime dependencies added (ajv and fast-check were already devDeps).
- [ ] No fake tests, no characterization tests, no golden-file tests.
- [ ] All tasks above show `- [x]` checked.

---

## Out of scope (defer to follow-ups)

- JSONC support (comments in config)
- TOML support
- Auto-generation of the JSON Schema from TS types via `ts-json-schema-generator` (v1 hand-writes; in sync via tests)
- SchemaStore submission for autocomplete-without-`$schema`
- `fsl config` subcommand for inspection / init / validation
- Per-file-glob config sections
- Machine-attribute extraction beyond the empty v1 table (rows land with their features)
- `from-wc-attrs.ts` (Web Component layer collector)
- `from-mcp-context.ts` (MCP layer collector)
- `from-fetch.ts` (browser/edge reader)
