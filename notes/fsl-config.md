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

Each subcommand owns a top-level key, named for its CLI verb. v1 only populates `render`; the other sections are reserved (empty objects accepted) and fill in as their verbs land, using the v6 verb vocabulary from the megaspec (`notes/superpowers/specs/2026-06-09-fsl-megaspec.md` §25):

```json
{
  "render":   { ... },
  "lint":     { ... },
  "format":   { ... },
  "test":     { ... },
  "check":    { ... },
  "typegen":  { ... },
  "codegen":  { ... },
  "init":     { ... },
  "import":   { ... },
  "export":   { ... },
  "mcp":      { ... },
  "lsp":      { ... },
  "repl":     { ... }
}
```

Note that `typegen` and `codegen` are distinct: **typegen** exports types to support a *user* of the machine (a typed surface for consumers); **codegen** generates an *implementation* of the machine directly, frequently in a different language (essentially cross-compiling).

## The registry section

`registry` maps machine/system names to the files that define them, and is consumed by every name-resolving verb (megaspec §25). It is reserved-but-validated in v1: a string→string map is accepted today so configs written now stay valid when the consuming verbs land.

```json
{
  "registry": {
    "traffic":  "./machines/traffic-light.fsl",
    "elevator": "../shared/elevator.fsl"
  }
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
  resolveExtends,             // pure extends-chain resolver (injected reader)
  loadConfigFile,             // load one file
  discoverUserGlobalConfig,   // ~/.fsl/config.json
  discoverProjectConfig,      // walk up for .fsl/config.json
  extractMachineAttributes,   // pull config-shaped attrs from FSL source
  flagsToConfig,              // map flags to config paths
  validateConfig,             // ajv-validate against the schema
  CONFIG_SCHEMA,              // the JSON Schema object itself
  defaults,                   // built-in defaults
  ConfigError,                // abstract base error
  ConfigParseError,
  ConfigSchemaError,
  ConfigExtendsError,
  ConfigIOError,
} from 'jssm/cli';
```

The full design spec is preserved verbatim on the feature's tracker issue, StoneCypher/jssm#631 (the `notes/superpowers/specs/` copy was retired 2026-07-08).

## Errors

| Error | When |
|---|---|
| `ConfigParseError` | File is not valid JSON |
| `ConfigSchemaError` | Parsed object violates the schema (carries `violations` array from ajv) |
| `ConfigExtendsError` | Extends chain has a cycle or exceeds depth 32 (carries `chain` array of paths) |
| `ConfigIOError` | Filesystem failure (permission denied, etc.) (carries the underlying Node errno error as `errno` — named so to avoid shadowing the native ES2022 `Error.cause`) |

All inherit from the abstract `ConfigError` class; use `e.kind` (`'parse' | 'schema' | 'extends' | 'io'`) to discriminate in catch blocks without instanceof chains.

## Consumers

The loader works in every modern JS environment. See the design spec's § Consumers (preserved on StoneCypher/jssm#631) for canonical patterns for:

- The `fsl` CLI
- GitHub Actions (Node-based) — use `skipUserGlobal: true` and explicit `projectRoot`
- Editor plugins (VS Code / LSP / Neovim / Helix / Zed)
- Static-site generators (Eleventy / Docusaurus / VitePress / Astro / Nextra)
- Browser (Web Component, in-browser playground, edge worker) — pure subset only
- Test harnesses (pure `mergeConfigs` for full control)
