# fsl CLI: Unified JSON Configuration File — Design

> **Issue:** #631  
> **Status:** Design — ready for implementation planning  
> **Date:** 2026-05-22  
> **Author:** John Haugeland (with Claude collaboration)

---

## Summary

A unified, layered JSON configuration system for the `fsl` CLI and the `jssm/cli` library. Lets users encode per-project, per-user, and per-machine settings in `.fsl/config.json` instead of remembering every CLI flag invocation. The loader is **source-agnostic** — the same merge engine serves the CLI, the future Web Component embed, and any other surface (LSP, MCP) that needs effective config values.

v1 scope: build the loader and wire it into the only subcommand that exists today (`fsl render`). Future subcommands (#620–#630) plug in by adding their own per-subcommand section to the schema and their own flag→config mapping table.

---

## Goals

- **One config, many subcommands.** Each subcommand owns a top-level key; the loader doesn't know or care which subcommand is asking.
- **Predictable layering.** Defaults → user-global → project → machine source → invocation flags. Each layer optional; precedence stable.
- **Source-agnostic merge.** The merge engine is a pure function over partial configs; collecting layers from the filesystem (CLI), the DOM (WC), the request context (MCP), or anywhere else is per-environment glue.
- **Schema-validated.** JSON Schema generated from TS types; ajv validates every layer; editor autocomplete via `$schema`.
- **Zero-breakage rollout.** Projects with no config behave identically to today.

## Non-goals (v1)

- JSONC / comment support.
- TOML support.
- A `fsl config` subcommand for inspection.
- A `--validate-config` standalone CLI verb (validation runs implicitly on every load).
- Per-file-glob config sections (e.g., "different lint rules for `src/legacy/**`"); v1 has one config per project root.
- SchemaStore submission for autocomplete-without-`$schema` (follow-up).
- Machine-attribute-driven config population (the layer is wired in v1, but the extraction mapping table starts empty — fills in as features land).

---

## Architecture

### File layout

Files are tagged **Pure** (browser-safe, no Node APIs) or **Node** (requires `fs`, `path`, `os`, etc.).

```
src/ts/cli/config/
├── merge.ts            # mergeConfigs() — environment-agnostic core           [Pure]
├── extends.ts          # resolveExtends(raw, basePath, reader) — takes        [Pure]
│                       #   a reader callback, no direct fs imports
├── schema.ts           # ajv validation + generated schema bundle             [Pure]
├── defaults.ts         # built-in defaults (the lowest layer, always present) [Pure]
├── types.ts            # PartialConfig, ResolvedConfig, all error classes     [Pure]
├── loader.ts           # loadConfig() — Node-environment orchestrator         [Node]
└── sources/
    ├── from-file.ts        # loadConfigFile(path) — fs-backed reader          [Node]
    ├── from-discovery.ts   # discoverUserGlobalConfig()                       [Node]
    │                       # discoverProjectConfig({ from })                  [Node]
    ├── from-machine.ts     # extractMachineAttributes(source) — pure parser   [Pure]
    └── from-flags.ts       # flagsToConfig(flags, mapping)                    [Pure]
```

Future per-environment glue (out of v1 scope, slots reserved):

```
src/ts/cli/config/sources/
├── from-wc-attrs.ts        # Web Component element attrs/props → PartialConfig  [Pure]
├── from-mcp-context.ts     # MCP request context → PartialConfig                [Pure]
└── from-fetch.ts           # browser/edge: fetch-based config loader            [Pure]
```

### Browser / Node split

The **Pure** files compose into a browser-safe subset that ships zero Node API references:

- `merge.ts`, `extends.ts`, `schema.ts`, `defaults.ts`, `types.ts`
- `sources/from-machine.ts`, `sources/from-flags.ts`

A browser consumer (the future Web Component, an in-browser playground, an edge worker) imports only these and supplies its own layer collector — typically a `fetch`-based reader passed to `resolveExtends`.

The **Node** files (`loader.ts`, `sources/from-file.ts`, `sources/from-discovery.ts`) wrap the pure core with filesystem discovery and orchestration.

v1 ships these from a single `jssm/cli` subpath; if browser-bundle size becomes a concern, a follow-up can split into `jssm/cli/config-core` (Pure) and `jssm/cli/config-node` (Node) without breaking the public API.

### Module responsibilities

| Module | Purpose | Side effects |
|---|---|---|
| `merge.ts` | Deep-merge an array of `PartialConfig`s in precedence order | None |
| `extends.ts` | Resolve `"extends"` chain via injected reader callback | None (reader-injected) |
| `schema.ts` | Validate a `PartialConfig` against the JSON Schema (ajv) | None |
| `defaults.ts` | Compile-time-constant default `ResolvedConfig` | None |
| `types.ts` | Type definitions and error classes | n/a |
| `loader.ts` | Node-environment orchestrator: discover → load → extract → flag → merge | fs |
| `sources/from-file.ts` | Read + parse one config file, drive extends resolution with an fs reader | fs |
| `sources/from-discovery.ts` (`discoverUserGlobalConfig`) | Look for `~/.fsl/config.json`, return its `PartialConfig` (or `null`) | fs |
| `sources/from-discovery.ts` (`discoverProjectConfig`) | Walk upward from `from` for `.fsl/config.json`, return its `PartialConfig` (or `null`) | fs |
| `sources/from-machine.ts` | Parse FSL source, extract config-relevant attributes | Parser invocation only |
| `sources/from-flags.ts` | Apply a flag→config-path mapping to produce a top-layer `PartialConfig` | None |

### Public API exported via `jssm/cli`

```ts
import {
  // Orchestrator (Node-only)
  loadConfig,                    // Node convenience: discover + extract + flags + merge

  // Composable pieces (mostly Pure)
  mergeConfigs,                  // Pure: deep-merge an ordered array of PartialConfigs
  resolveExtends,                // Pure: resolve `extends` via injected reader callback
  defaults,                      // Pure: built-in default ResolvedConfig

  // Source helpers
  loadConfigFile,                // Node: read one file (uses fs reader internally)
  discoverUserGlobalConfig,      // Node: locate and load ~/.fsl/config.json (or null)
  discoverProjectConfig,         // Node: walk upward from `from` for .fsl/config.json (or null)
  extractMachineAttributes,      // Pure: parse FSL source, return PartialConfig
  flagsToConfig,                 // Pure: apply flag→config-path mapping

  // Validation
  validateConfig,                // Pure: ajv-validate a PartialConfig against the schema

  // Errors
  ConfigError,                   // abstract base
  ConfigParseError,
  ConfigSchemaError,
  ConfigExtendsError,
  ConfigIOError,

  // Types
  type PartialConfig,
  type ResolvedConfig,
  type RenderConfig,
  type Reader,                   // signature for injected config-file readers
  // ... per-subcommand config types
} from 'jssm/cli';
```

The split lets non-CLI consumers (Actions, editor plugins, SSGs, browser) compose their own layer-collection pipeline using `mergeConfigs` + the pure pieces, without inheriting `loadConfig`'s CLI-specific assumptions (cwd walk-up, user-global, etc.).

---

## Layering model

### Layer order (CLI environment, lowest to highest precedence)

```
1. Built-in defaults              ← compiled into the library
2. User-global config             ← ~/.fsl/config.json (with extends chain resolved)
3. Project config                 ← walking up from cwd for .fsl/config.json (with extends chain resolved)
4. Machine source attributes      ← intrinsic to the .fsl artifact being processed
5. Invocation flags (CLI)         ← the active invoker overrides everything else
```

### Layer order (Web Component environment, when implemented)

```
1. Built-in defaults
2. Optional fetched config        ← if the WC was passed a config URL to fetch
3. Machine source attributes
4. Element properties / attributes  ← <jssm-machine target="svg" scale="2">
```

The merge engine is identical between environments; only the layer-collection step differs.

### Deep-merge semantics

Used between every adjacent pair of layers, and within each extends chain:

| Case | Behavior |
|---|---|
| Two objects | Merge keys recursively, later wins per-key |
| Two arrays | **Replace** — later array wholly replaces former (not concat, not union) |
| Scalars | Later wins |
| Type mismatch (object vs array, etc.) | Later wins, no warning |
| `null` from a later layer | Explicitly clears the value (lets users reset a default) |
| `undefined` from a later layer | No effect on the accumulator (layer didn't speak to that key) |

### Why replace-arrays over concat

```jsonc
// defaults                      { "lint": { "rules": ["no-unused-states"] } }
// project config overrides:     { "lint": { "rules": ["custom-rule"] } }
// Effective with REPLACE:       { "lint": { "rules": ["custom-rule"] } }            ← what the user expects
// Effective with CONCAT:        { "lint": { "rules": ["no-unused-states", "custom-rule"] } }   ← surprising
```

Replace is surprising once (when a user expects concat); concat is surprising every time (when defaults silently accumulate).

---

## `extends` resolution

```jsonc
{
  "extends": "../base/fsl.config.json",       // string form
  // or
  "extends": ["./a.json", "./b.json"],        // array form, applied in order
  "render": { "scale": 4 }
}
```

### Rules

- **Paths are relative to the file containing the `extends`** (not relative to cwd).
- **Cycle detection:** track visited absolute paths through the recursion stack; on revisit, throw `ConfigExtendsError` with the cycle path.
- **Depth limit:** 32 nested extends. Beyond that → `ConfigExtendsError`. Anything deeper is almost certainly a mistake.
- **Merge order within a chain:** resolve bottom-up — the deepest base is the foundation; each level merges on top; the file's own keys merge last.
- **Array form:** files in the array merge in order before the file's own keys.
- **Path-escape policy:** absolute paths permitted; `../` permitted; no sandboxing in v1 (user wrote the config; user owns the filesystem).

### Resolution algorithm

The function takes a `reader: Reader` callback so the same logic serves both the Node case (`fs.readFile`) and the browser case (`fetch`):

```ts
type Reader = (path: string) => Promise<string>;
```

```
resolveExtends(raw, basePath, reader, visited = []):
  if basePath ∈ visited → throw ConfigExtendsError("cycle: " + visited + basePath)
  if |visited| ≥ 32 → throw ConfigExtendsError("depth exceeded")
  validateSchema(raw)
  if raw.extends:
    paths = (string-or-array of raw.extends).map(p => resolvePath(p, basePath))
    bases = await Promise.all(paths.map(async p => {
      text = await reader(p)
      raw  = parseJson(text)
      return resolveExtends(raw, p, reader, [...visited, basePath])
    }))
    return mergeConfigs([...bases, omitKey(raw, 'extends')])
  return omitKey(raw, 'extends')
```

The CLI passes `fs.readFile` as the reader (via `from-file.ts`); a browser consumer passes `fetch`-wrapping reader (via `from-fetch.ts` when it's added).

---

## Types

### `ResolvedConfig` — complete, with every field set

```ts
interface ResolvedConfig {
  // Cross-subcommand
  include: string[];         // default: ['**/*.fsl']
  exclude: string[];         // default: ['**/node_modules/**']

  // Per-subcommand sections — one slot per planned subcommand
  render:  RenderConfig;     // v1: fully populated
  lint:    LintConfig;       // v1: typed but empty
  fmt:     FmtConfig;        // v1: typed but empty
  test:    TestConfig;       // v1: typed but empty
  check:   CheckConfig;      // v1: typed but empty
  typegen: TypegenConfig;    // v1: typed but empty
  new:     NewConfig;        // v1: typed but empty
  convert: ConvertConfig;    // v1: typed but empty
  playground: PlaygroundConfig;  // v1: typed but empty
  mcp:     McpConfig;        // v1: typed but empty
  lsp:     LspConfig;        // v1: typed but empty
  repl:    ReplConfig;       // v1: typed but empty
}
```

Empty interfaces are deliberate — they reserve the schema slot without committing to fields ahead of feature design.

### `RenderConfig` — the only fully populated section in v1

```ts
interface RenderConfig {
  defaultTarget: 'svg' | 'dot' | 'png' | 'jpeg' | 'html';   // default: 'svg'
  outDir?:       string;
  scale:         number;     // default: 3   (matches today's hard-coded value)
  width?:        number;
  height?:       number;
  quality:       number;     // default: 85
  theme?:        string;     // reserved for #607
}
```

Calibrated to today's behavior so a project with no config file behaves identically to the current `fsl render`.

### `PartialConfig` — what users actually write

```ts
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

type PartialConfig = DeepPartial<ResolvedConfig> & {
  $schema?: string;
  extends?: string | string[];
};
```

### Error class hierarchy

```ts
abstract class ConfigError extends Error {
  abstract readonly kind: 'parse' | 'schema' | 'extends' | 'io';
  readonly path?:   string;
  readonly line?:   number;
  readonly column?: number;
}

class ConfigParseError    extends ConfigError { readonly kind = 'parse'; }
class ConfigSchemaError   extends ConfigError { readonly kind = 'schema'; readonly violations: AjvError[]; }
class ConfigExtendsError  extends ConfigError { readonly kind = 'extends'; readonly chain: string[]; }
class ConfigIOError       extends ConfigError { readonly kind = 'io'; readonly cause: NodeJS.ErrnoException; }
```

All formatted by the CLI's existing FSL-error formatter for visual consistency.

---

## Schema strategy

### Generation

JSON Schema is **generated** from the TS types at build time using `ts-json-schema-generator` (or equivalent). Output written to `schemas/fsl-config.json`. TS types are the single source of truth; no hand-maintained schema drift.

Build step added to `npm run make` (and to `npm run build` transitively). Pre-commit / CI verifies the committed schema matches what regeneration would produce.

### Publication

Schema published via the existing GitHub Pages site at:

```
https://stonecypher.github.io/jssm/schemas/fsl-config.json
```

Users can reference it in their config for editor autocomplete:

```json
{
  "$schema": "https://stonecypher.github.io/jssm/schemas/fsl-config.json",
  ...
}
```

SchemaStore submission (for autocomplete without an explicit `$schema` field) deferred to a follow-up.

### Validation

Every loaded layer (file-source and extends-chain bases) is validated against the schema before merging. Failures throw `ConfigSchemaError` with the ajv error array intact (so callers can format violations as they please) and a human-readable summary message.

---

## Machine-source-attribute extraction

```ts
function extractMachineAttributes(machineSource: string): PartialConfig
```

Parses the FSL source, walks the machine-attribute block, and maps known config-relevant attributes into a `PartialConfig`. The **mapping table starts deliberately small in v1** — almost nothing in today's grammar is invocation-config-shaped — but the architectural slot is real and active.

### Initial mapping table (v1)

| Machine attribute | Config path | Status |
|---|---|---|
| *(none in v1)* | | The extractor returns `{}` for all current FSL inputs |
| *(future)* `theme : "neon";` | `render.theme` | Lands with #607 |
| *(future)* `display_short_names : true;` | `render.displayShortNames` | Lands with that TODO item |
| *(future)* `chain_delimiter : "/";` | `render.chainDelimiter` | Lands with that TODO item |

The function ships with the empty table, but the wiring, ordering, validation, and call site are real. Adding a row later is a one-line change with no plumbing work.

---

## CLI integration: `fsl-render`

### Today

`src/ts/cli/subcommands/render/plugin.ts:cli(argv)` parses flags, then directly dispatches to `render` / `renderSet`.

### After v1

```ts
const RENDER_FLAG_TO_CONFIG = {
  target:    'render.defaultTarget',
  output:    null,               // per-invocation only, never sourced from config
  'out-dir': 'render.outDir',
  scale:     'render.scale',
  width:     'render.width',
  height:    'render.height',
  quality:   'render.quality',
} as const;

export async function cli(argv: string[]): Promise<number> {
  const parsed = parseFslArgs(argv, RENDER_FLAG_SPEC);

  const config = await loadConfig({
    cwd:                process.cwd(),
    projectRoot:        undefined,     // walks up from cwd (CLI default)
    machinePath:        parsed.positional[0],
    flags:              parsed.flags,
    flagMapping:        RENDER_FLAG_TO_CONFIG,
    explicitConfigPath: parsed.flags.config as string | undefined,
    skipConfig:         parsed.flags['no-config'] === true,
    skipUserGlobal:     false,         // CLI picks up ~/.fsl by default
  });

  return runRender(parsed.positional, config.render);
}
```

### `loadConfig` options (full)

```ts
interface LoadConfigOptions {
  cwd:                  string;            // base for walk-up discovery
  projectRoot?:         string;            // if set, anchor discovery here instead of walking from cwd
  machinePath?:         string;            // if set, run extractMachineAttributes on its content
  flags?:               Record<string, unknown>;
  flagMapping?:         Record<string, string | null>;   // flag-key → config-dot-path (null = ignored)
  explicitConfigPath?:  string;            // bypasses project discovery; loads exactly this file
  skipConfig?:          boolean;           // skip ALL discovery (defaults + flags only)
  skipUserGlobal?:      boolean;           // skip ~/.fsl layer specifically (useful in CI, Actions, sandboxes)
}
```

The two new options (`projectRoot`, `skipUserGlobal`) are what make `loadConfig` directly usable by Actions, editor plugins, and SSGs — not just the CLI.

### Two new flags on `fsl-render`

| Flag | Purpose |
|---|---|
| `--config <path>` | Explicit config file path; bypasses discovery |
| `--no-config` | Skip config loading entirely (defaults + flags only); useful for CI and tests |

### Backward compatibility (load-bearing)

A project with no `.fsl/config.json` and no `~/.fsl/config.json` must behave identically to today. `defaults.ts` is calibrated to today's hard-coded values:

- `render.defaultTarget = 'svg'`
- `render.scale = 3`
- `render.quality = 85`

Every existing CLI test in `src/ts/tests/cli/` must pass unchanged. No regression.

---

## Testing strategy

### Coverage target

100% on every new file in `src/ts/cli/config/` and `src/ts/cli/config/sources/`. Project standard (commit `43aee18`). Vitest-based, runs under the existing `vitest-spec` suite (`vitest.spec.config.ts`).

### Test layout

```
src/ts/tests/cli/config/
├── merge.spec.ts                # deep-merge: objects, arrays-replace, nulls, type-mismatch
├── extends.spec.ts              # chain resolution, cycle detection, depth limit, path semantics
├── schema.spec.ts               # ajv validation: valid configs, every error class
├── defaults.spec.ts             # defaults shape, every required field has a value
├── from-file.spec.ts            # JSON parse errors, IO errors, file shapes
├── from-discovery.spec.ts       # cwd-walk-up, ~/.fsl discovery, both missing
├── from-machine.spec.ts         # extractor with v1 empty mapping; future-proof shape test
├── from-flags.spec.ts           # flag → config-path mapping
├── loader.spec.ts               # end-to-end loadConfig with mocked fs
├── integration.spec.ts          # end-to-end with real fixtures on real fs
└── fixtures/
    ├── projects/
    │   ├── no-config/
    │   ├── basic-config/
    │   ├── extends-chain/
    │   ├── extends-cycle/
    │   ├── invalid-json/
    │   └── schema-violation/
    └── home-fsl-fixtures/
```

### Stochastic suite — `src/ts/tests/cli/config/merge.stoch.ts`

Fuzzes random `PartialConfig` trees and asserts algebraic invariants:

| Invariant | Property |
|---|---|
| Identity | `merge([x])` deep-equals `x` |
| Defaults absorption | `merge([defaults, defaults])` deep-equals `defaults` |
| Right-bias | for any leaf `k`, `merge([{k: a}, {k: b}]).k === b` |
| Associativity | `merge([a, b, c])` deep-equals `merge([merge([a, b]), c])` |

These four invariants catch entire classes of merge bugs that example-based tests miss. Uses `fast-check` (already a devDep). Runs under `vitest-stoch`.

### Test discipline

- No fake tests, no characterization tests (per CLAUDE.md). If a test exposes a bug, fix the source and assert correct behavior.
- No golden-file / snapshot tests (per `feedback_no_golden_file_tests`); use substring assertions for rendered messages.
- The known flake in `dispatcher.spec.ts` stays as-is — separately tracked.

---

## Documentation deliverables

- **`notes/fsl-config.md`** — durable reference for the config format, layer ordering, extends semantics, complete error catalogue. Source of truth.
- **`README.md` of the project** — one new "Configuration" section linking to the notes doc; no duplication.
- **JSDoc** on every exported function (per CLAUDE.md).

---

## Decisions log

| Decision | Choice | Alternatives considered |
|---|---|---|
| Loader pattern | Pure functions (option A) | Class instance; module singleton |
| Config file location | `.fsl/config.json` (directory) | `fsl.config.json`; `.fslrc.json`; both |
| extends support | Yes, full (paths, cycles, depth limit) | None; same-repo-only |
| extends file reading | Reader callback injected into `resolveExtends` | Hardcoded `fs.readFile` |
| Array merge semantics | Replace | Concat; union |
| `null` semantics | Explicit clear | Treat as missing |
| File format | JSON only | JSONC; TOML |
| Schema generation | From TS types via build step | Hand-maintained JSON Schema |
| Schema hosting | GitHub Pages | SchemaStore; embed-only |
| User-global location | `~/.fsl/config.json` | XDG/AppData per-platform |
| Project discovery | Walk cwd upward (git-style); overridable via `projectRoot` | cwd-only; explicit only |
| Discovery exports | Two functions (`discoverUserGlobalConfig`, `discoverProjectConfig`) | One combined function |
| `skipUserGlobal` option | Yes (escape hatch for CI/Actions/sandboxes) | Always include user-global |
| Browser/Node split | Mark each file Pure/Node; ship one subpath in v1; reserve right to split into `config-core` / `config-node` later | Hard split now; no split ever |

---

## Consumers — canonical usage patterns

The split between the source-agnostic core (Pure files) and the Node orchestrator (`loadConfig`) is the load-bearing design choice that makes the config loader reusable across very different environments. The canonical patterns below are the design's correctness criteria — if any of these would be awkward, the architecture is wrong.

### 1. `fsl` CLI (today)

The orchestrator is built for this:

```ts
const config = await loadConfig({ cwd: process.cwd(), flags, flagMapping, machinePath });
```

Picks up `~/.fsl/config.json`, walks up from cwd for `.fsl/config.json`, extracts machine attributes, applies CLI flags. The default behavior.

### 2. GitHub Action (Node-based)

Skip user-global (no ambient runner state) and anchor discovery explicitly:

```ts
import * as core from '@actions/core';
import { loadConfig } from 'jssm/cli';

const config = await loadConfig({
  cwd:            process.env.GITHUB_WORKSPACE!,
  projectRoot:    process.env.GITHUB_WORKSPACE!,    // don't walk up out of the checkout
  skipUserGlobal: true,                              // ignore runner's home dir
  flags:          inputsToFlags(core),
  flagMapping:    ACTION_INPUT_TO_CONFIG,
});
core.setOutput('effective-config', JSON.stringify(config));   // for "why did CI differ" debugging
```

### 3. Editor plugin (VS Code extension, LSP, Neovim plugin)

Anchor to the workspace root the editor provides; keep user-global because users do want their editor to pick up personal settings:

```ts
const config = await loadConfig({
  cwd:            workspace.rootPath,
  projectRoot:    workspace.rootPath,
  // skipUserGlobal omitted: editor plugins typically WANT ~/.fsl/
});
```

A future LSP would re-load on `didChangeWatchedFiles` notifications for `**/.fsl/config.json`.

### 4. Node-based static-site generator (Eleventy, Docusaurus, VitePress, Astro, Nextra)

Same shape as an editor plugin — anchor to the SSG's content root:

```ts
const config = await loadConfig({
  cwd:         siteContentDir,
  projectRoot: siteContentDir,
});

// Then use config.render to control how machines in the docs get rendered to SVG
```

For non-Node SSGs (Hugo in Go, Jekyll in Ruby), shell out to the `fsl` CLI — same code path via the CLI's existing config discovery.

### 5. Browser (Web Component, in-browser playground, edge worker)

Use the Pure subset directly; skip `loadConfig` entirely (it's Node-only):

```ts
import {
  mergeConfigs,
  defaults,
  extractMachineAttributes,
  flagsToConfig,
  resolveExtends,
} from 'jssm/cli';

// Optional: fetch an extends-able config from a URL
const fetchReader: Reader = async (url) => (await fetch(url)).text();
const baseConfig = configUrl
  ? await resolveExtends(await (await fetch(configUrl)).json(), configUrl, fetchReader)
  : {};

const config = mergeConfigs([
  defaults,
  baseConfig,
  extractMachineAttributes(fslSource),
  flagsToConfig(wcAttrs, WC_ATTR_TO_CONFIG),
]);
```

The Web Component case ships zero Node API references; the browser bundler never sees `fs` / `path` / `os`.

### 6. Test harness / library user (programmatic, full control)

Use `mergeConfigs` to compose arbitrary layer arrays:

```ts
const config = mergeConfigs([
  defaults,
  { render: { scale: 5 } },
  { render: { theme: 'dark' } },
]);
```

No filesystem, no flags, no discovery. The merge engine is a pure function over inputs — no hidden behavior.

---

## Out of scope (deferred to follow-up issues)

- JSONC support
- TOML support
- SchemaStore submission
- `fsl config` subcommand for inspection / `init` / validation
- Per-file-glob config sections (different rules for subtrees)
- Machine-attribute extraction beyond the empty v1 table (each row lands with its feature)
- Web Component layer collector (`from-wc-attrs.ts`)
- MCP layer collector (`from-mcp-context.ts`)

---

## Implementation sequencing (high-level — plan will refine)

Steps marked **[Pure]** can be implemented and tested without any filesystem; **[Node]** requires fs.

1. Types + error classes (`types.ts`) **[Pure]**
2. Defaults (`defaults.ts`) **[Pure]**
3. Schema generation infrastructure + `schema.ts` + `validateConfig` **[Pure]**
4. Merge engine (`merge.ts`) + stochastic suite **[Pure]**
5. Extends resolution (`extends.ts`) — reader-callback shape **[Pure]**
6. Machine-attribute extractor (`sources/from-machine.ts`) — empty table **[Pure]**
7. Flag mapper (`sources/from-flags.ts`) **[Pure]**
8. File source (`sources/from-file.ts`) — wraps `extends.ts` with an fs reader **[Node]**
9. Discovery — `discoverUserGlobalConfig`, `discoverProjectConfig` (`sources/from-discovery.ts`) **[Node]**
10. Public `loadConfig` orchestrator (`loader.ts`) **[Node]**
11. Integrate into `fsl-render` (`plugin.ts`) — `--config`, `--no-config` flags
12. End-to-end integration tests with real fixtures
13. Documentation (`notes/fsl-config.md`) + README section
14. Final review: backward-compat verification, coverage check, IDE diagnostics, browser-subset sanity check (no Node API references in the Pure tree)

Steps 1–7 (the Pure tree) are independently parallelizable across subagents — none depend on filesystem mocking. Steps 8–14 are mostly sequential.

Each step is independently testable; subagent dispatch maps cleanly onto this sequence.

---

## Pairs with

- **#619** — fsl CLI tracking issue (parent)
- **#620–#630** — sister subcommand issues; each will adopt this config when implemented
- **#607** — custom theme files; will populate `render.theme` and the machine-attribute mapping table
- `notes/superpowers/specs/2026-05-12-fsl-cli-design.md` — original CLI design
- `notes/superpowers/plans/2026-05-12-fsl-cli.md` — original CLI implementation plan
