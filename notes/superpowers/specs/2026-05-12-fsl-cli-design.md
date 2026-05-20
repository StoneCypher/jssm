# Unified `fsl` CLI with constellation library API — design

**Date:** 2026-05-12
**Status:** Approved (design phase). Awaiting implementation plan.
**Author:** John Haugeland
**Tracker:** #1090 "Unify tracker for jssm-cli" (umbrella)

## Motivation

`jssm` has had a long-standing aspirational CLI line in `CLAUDE.md` ("a library with a function, as well as a CLI") and a multi-month tooling roadmap in `src/doc_md/todo.md`. The roadmap describes a constellation of FSL-language tools — runner, visualizer, formatter, linter, static analyzer, test framework, doc generator, scaffolder, format converters, web playground, LSP server, MCP server — and converges on a single architectural decision: ship them as **subcommands of one unified CLI**, not as separate binaries. One install, one help system, one config, one brand.

This design ratifies that direction and specifies the v1 implementation: the dispatcher, the plugin contract, and the first subcommand (`fsl-render`). Once shipped, every later tool in the roadmap slots into the established contract as another plugin — no further dispatcher work is needed.

## Goals

- A single `fsl` command (with `jssm` as alias) that dispatches subcommands to plugins on `PATH`.
- A **plugin contract** rigorous enough that third-party plugins are first-class — they get the same lifecycle and capabilities as first-party ones.
- A first plugin (`fsl-render`) that produces SVG, DOT, PNG, JPEG, and HTML-wrapped outputs from FSL input.
- **Constellation library principle:** every subcommand is also an exported library function with paired single/set variants. The CLI is the human-facing wrapper; the library is the canonical implementation. Tools that consume jssm programmatically (VS Code extension, LSP server, MCP server, downstream test frameworks, third-party tooling) call the library directly without shelling out.
- Runtime portability: the library half (`jssm/cli` exports) works in Node, modern browsers, Deno, Bun, Cloudflare Workers / edge runtimes, mobile WebViews, Unity WebGL, and React Native (with caveats noted in the compatibility matrix).
- No bump to the existing `engines.node` floor of `>=10.0.0`. The CLI binaries run wherever Node runs.

## Non-goals (deferred)

- **Configuration file** (`.fslrc.toml`). Defer to v0.2. Once shipped, a config dependency becomes its own subsystem (precedence chain, schema, search-up-the-tree behavior); v1 is shipped before that's tackled.
- **REPL mode** (invoking `fsl` with no subcommand). Defer to v0.3. The todo's REPL sketch is rich (load/state/actions/go/render inline) and warrants focused design work after dispatch and rendering are battle-tested.
- **Subcommands beyond render:** `lint`, `fmt`, `check`, `test`, `typegen`, `new`, `playground`, `mcp`, `lsp`, `convert` are all v0.x+ work, each its own focused release against the v1 contract.
- **Render targets beyond v1's five:** Mermaid, PlantUML, SCXML, ASCII, FSL pretty-print are all v0.2+ and need new library code before they can be exposed as render targets.
- **Public plugin-authoring docs.** v1 ships the contract inside this spec. Public-facing `docs/plugin-authoring.md` comes with v0.2, once the contract has been validated by writing more than one first-party plugin.
- **Static plugin auditor** (`fsl-audit` / `eslint-plugin-fsl`). v0.2+. Documented here so the contract is designed with audit-ability in mind, but not implemented.
- **Visual regression image diffing** for raster outputs. v0.2+ tool decision; v1 tests are substring-based.

## Decisions

| Topic | Decision |
|---|---|
| Code location | Inside the existing `jssm` package. New `src/ts/cli/` directory mirrors the eventual `@jssm/cli` package layout for future monorepo split. |
| Bin entries | `fsl`, `jssm` (alias), `fsl-render`. Three names, two functional binaries. |
| Plugin discovery | `fsl <name>` probes `PATH` for `fsl-<name>`. Git-style. Reserved names (`help`, `version`, `--help`, `--version`) handled by dispatcher directly. |
| In-process vs. spawn | Uniform plugin contract; dispatcher transparently in-processes Node-resolvable plugins via dynamic `import()` and spawns the rest. (Reading 3 of the dispatch model.) |
| Plugin contract surface | Plugin exports `default async function cli(argv: string[]): Promise<number>`. No process.exit, no signal handlers, no argv mutation. |
| Argv parsing approach | Custom argv parsing, ~50 lines per binary. Shared `parseFslArgs` helper exported from `jssm/cli` for plugin authors to optionally use. No CLI framework dependency. |
| Engines floor | Unchanged at `>=10.0.0`. Custom argv parsing has no Node-version requirements. |
| v1 render targets | SVG, DOT, PNG, JPEG, HTML wrapper. (Mermaid, PlantUML, SCXML, ASCII, FSL pretty-print listed in spec as v0.2+ to settle the dispatcher contract for the full target list.) |
| Rasterization strategy | Feature-detected: native `OffscreenCanvas` where available (browser, Deno, Bun, mobile, Unity WebGL); `@resvg/resvg-wasm` fallback elsewhere (Node primarily). |
| Rasterization dependency | `@resvg/resvg-wasm` under `optionalDependencies`. Runtime check + friendly install hint if missing. |
| Default render output destination | Sibling file for single input (`m.fsl` → `m.svg`); explicit `--out-dir` required for multi-input. `--stdout` and `-o -` for stream-friendly output. |
| Multi-input error handling | Continue past failed inputs. Exit code = max of all per-input exit codes (worst-wins). |
| Test approach | Substring/regex assertions on output content + structural assertions (element counts, magic bytes, expected dimensions). No golden files, no snapshot files. |
| Test coverage target | 100%, matching the existing project standard. |

## Architecture

### Dispatcher flow

```
fsl <subcommand> <args...>
   │
   ▼
1. argv split: subcommand = argv[0], remaining = argv[1..]
2. Is subcommand a reserved name (help, version, --help, --version)?
     yes → handle in dispatcher, exit
     no  → continue
3. Probe PATH for fsl-<subcommand>
     not found → print "fsl: 'X' is not a known subcommand" to stderr, exit 1
     found     → continue with resolved path
4. Decide dispatch mode:
     - Path inside calling project's node_modules AND .js/.mjs/.cjs extension
       → in-process: dynamic import() the module, call default export
     - Otherwise → spawn as subprocess, forward stdin/stdout/stderr, passthrough args
5. Capture exit code (return value from cli() in-process, or subprocess exit code)
6. Return that exit code from fsl
```

The dispatcher is ~80-100 lines: argv split (10), PATH probing (15), in-process eligibility check (10), in-process invocation with argv/exit-code/argv restoration safety (20), spawn fallback (15), help/version handling (15), error reporting (15).

### Plugin contract

**Every plugin module exports:**

```ts
export default async function cli(argv: string[]): Promise<number>;
```

- `argv` is the args **after** the subcommand name. For `fsl render machine.fsl --target=svg`, the plugin receives `['machine.fsl', '--target=svg']`.
- Return value is the process exit code.

**Plugin behavior rules (the in-process safety contract):**

1. **MUST NOT call `process.exit()`** — return the exit code instead.
2. **MUST NOT register `process.on('uncaughtException')` or similar global handlers** — use try/catch within `cli()`.
3. **MUST NOT mutate `process.argv`** — read args via the function parameter.
4. **SHOULD write user output to stdout, diagnostics and errors to stderr.** This makes piping work (`fsl render m.fsl --target=dot | dot -Tpng`).
5. **SHOULD respect `--help`** by printing usage to stdout and returning `0`. The shared `parseFslArgs` helper handles this by default.
6. **SHOULD respect `--version`** by printing `<plugin-name> <semver>` to stdout and returning `0`.

Plugins that violate these rules still work via spawn fallback. The dispatcher detects ineligibility (no shebang to be safe, file outside `node_modules`, file extension not `.js`/`.mjs`/`.cjs`) and forces spawn. The cost is one process startup (~50ms) per invocation. Plugin authors get a fast path for free by being well-behaved.

**Exit code convention:**

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | User error: bad args, missing file, invalid input |
| 2 | Plugin internal error: bug, unexpected state |
| >2 | Plugin-specific (documented per plugin) |

Matches `grep`, `diff`, `prettier` convention. Shell scripts can rely on it.

**What the dispatcher guarantees the plugin:**

- A clean snapshot of `process.argv` (real args come via the function parameter; the snapshot is just for the plugin not to be surprised).
- `process.stdout`, `process.stderr`, `process.stdin` connected to the user's terminal/pipes as expected.
- Working directory matches where the user ran `fsl`.
- Environment variables passthrough (`process.env` untouched).

The dispatcher does **not** sandbox the plugin. A misbehaving plugin can still corrupt state (e.g., `process.chdir()`, monkey-patching `console.log`). Documented as plugin-author responsibility, not enforced.

**Discovery rules:**

- `fsl <name>` → look for `fsl-<name>` on `PATH`.
- Reserved names refused for forwarding: `help`, `version`, `--help`, `--version`. These are only reserved as the *subcommand* slot — i.e., `fsl --help` is handled by the dispatcher, but `fsl render --help` is forwarded to `fsl-render` (because `render` is the subcommand and `--help` is one of its args).
- If two `fsl-<name>` exist on `PATH`, the first directory in `PATH` wins. PATH is searched in order; on Windows the separator is `;`, on Unix-likes it's `:` — Node's `process.env.PATH` works the same as the platform shell.
- The dispatcher prints to stderr in `--verbose` mode where the plugin was resolved from.

## `fsl-render` command surface

### Usage

```
fsl-render [options] <fsl-paths...>
fsl render [options] <fsl-paths...>          # via dispatcher
```

### Positional arguments

- One or more `.fsl` file paths. Globs are expanded by the shell; the plugin treats each expanded path as a literal input. No internal glob expansion in v1.
- The single literal `-` means read FSL from stdin. Mutually exclusive with file paths.

### Flags

| Flag | Short | Argument | Default | Meaning |
|------|-------|----------|---------|---------|
| `--target` | `-t` | `svg\|dot\|png\|jpeg\|html` | `svg` | Output format |
| `--output` | `-o` | path | (see defaults below) | Single explicit output path. Use `-` for stdout. |
| `--out-dir` | | dir path | (see defaults below) | Output directory; each input produces one file in here |
| `--stdout` | | (boolean) | false | Force stdout (single input only) |
| `--width` | | integer | (target default) | Raster pixel width (png/jpeg only) |
| `--quality` | | 1-100 | 85 | JPEG quality (jpeg only) |
| `--help` | `-h` | (boolean) | | Print usage to stdout, exit 0 |
| `--version` | `-V` | (boolean) | | Print version to stdout, exit 0 |

### Default output behavior

With no `-o`, no `--out-dir`, no `--stdout`:

| Inputs | Default destination |
|--------|---------------------|
| Single file `m.fsl` | Sibling file `m.<ext>` (overwrites if exists) |
| Stdin (`-`) | Stdout |
| Multiple files | **Error**: "fsl-render: error: specify --out-dir for multi-file render" |

Rationale: a developer running `fsl-render mymachine.fsl` should immediately get `mymachine.svg` next to the input. For multi-file or pipe scenarios, opt-in flags exist.

### Conflict rules

- `--output`, `--out-dir`, `--stdout` are mutually exclusive. Specifying two or more is exit 1.
- `--output -` is equivalent to `--stdout`.
- `--output` requires single input. Multi-input + `--output` is exit 1.
- `--out-dir` works for any input count. Names derive from input basenames.
- `--width` and `--quality` are **silent-ignored** for non-applicable targets (svg, dot, html) so scripted multi-target invocations work without conditional flag-building.

### Stdin behavior

- `fsl-render` invoked with no positional args AND a TTY stdin → exit 1 with "fsl-render: error: no input (provide a file or pipe FSL via stdin)".
- `fsl-render` invoked with no positional args AND a piped stdin → read FSL from stdin, treat as single input, write to stdout (default for stdin input).
- Explicit `-` positional always reads stdin regardless of TTY state.

### Error reporting

All errors go to stderr in this format:

```
fsl-render: error: <message>
  at <path or input> line <n>, column <c>          # if applicable
```

- Parse errors include line/column from the FSL parser.
- File I/O errors include the path.
- Multi-input runs report one error per failed input but continue processing the rest. Exit code is the worst (highest) across inputs.

### `--help` output

```
fsl-render — render FSL machines to images and data formats

Usage:
  fsl-render [options] <fsl-paths...>
  fsl-render [options] -                    # read from stdin

Options:
  -t, --target FORMAT        Output format: svg, dot, png, jpeg, html (default: svg)
  -o, --output PATH          Single explicit output path; "-" for stdout
      --out-dir DIR          Output directory for multi-file render
      --stdout               Force stdout (single input only)
      --width PX             Raster pixel width (png, jpeg only)
      --quality 1-100        JPEG quality (default: 85)
  -h, --help                 Show this help and exit
  -V, --version              Show version and exit

Examples:
  fsl-render machine.fsl
      → machine.svg next to input

  fsl-render *.fsl --target=png --out-dir=./diagrams
      → one .png per input in ./diagrams

  cat machine.fsl | fsl-render --target=dot | dot -Tpng > out.png
      → DOT to stdout, piped to system Graphviz
```

## Package layout

### Source tree additions

```
src/ts/cli/
  fsl.ts                  # dispatcher binary entry (shebang)
  fsl-render.ts           # render plugin binary entry (shebang)
  dispatcher.ts           # PATH probe, in-process vs. spawn decision, exit-code handling
  cli-utils.ts            # exported parseFslArgs helper, shared argv parsing primitives
  lib.ts                  # re-exports for `jssm/cli` subpath: render, renderSet, parseFslArgs
  subcommands/
    render/
      render.ts           # library function: render(fsl: string, opts): Promise<RenderResult>
      renderSet.ts        # library function: renderSet(inputs[], opts): Promise<RenderResult[]>
      rasterize.ts        # feature-detected SVG → raster (OffscreenCanvas or resvg-wasm)
      targets/
        svg.ts            # SVG target (delegates to jssm/viz)
        dot.ts            # DOT target (delegates to jssm/viz)
        png.ts            # PNG target (calls rasterize)
        jpeg.ts           # JPEG target (calls rasterize)
        html.ts           # HTML wrapper template
      types.ts            # RenderResult, RenderTarget, RenderOptions, RenderError
```

The `cli/` directory mirrors the eventual `@jssm/cli` package layout, so when the monorepo split happens later it's a directory move plus a `package.json` extraction — not a refactor.

### `package.json` additions

```jsonc
{
  "bin": {
    "fsl": "./dist/cli/fsl.cjs",
    "jssm": "./dist/cli/fsl.cjs",
    "fsl-render": "./dist/cli/fsl-render.cjs"
  },
  "exports": {
    ".": { /* existing */ },
    "./viz": { /* existing */ },
    "./cli": {
      "require": { "types": "./jssm.cli.d.cts", "default": "./dist/cli/lib.cjs" },
      "import":  { "types": "./jssm.cli.d.ts",  "default": "./dist/cli/lib.mjs" }
    }
  },
  "optionalDependencies": {
    "@viz-js/viz": "^3.26.0",
    "@resvg/resvg-wasm": "^2.6.0"
  }
}
```

Library consumers: `import { render, renderSet, parseFslArgs } from 'jssm/cli'`. CLI binaries are installed by npm into `node_modules/.bin/` (or globally when `npm i -g jssm`).

### Build pipeline integration

Two new Rollup configs:

```
rollup.config.cli.cjs.js      # builds dist/cli/{fsl,fsl-render,lib}.cjs
rollup.config.cli.esm.js      # builds dist/cli/lib.mjs (library form)
```

- Binary outputs get a `#!/usr/bin/env node` shebang via `output.banner`.
- `@resvg/resvg-wasm` import in `rasterize.ts` is marked external (resolved from `node_modules` at runtime, not bundled).
- `jssm/viz` is external — CLI imports from the library, not re-bundles it.
- New scripts: `make_cli` (rollup), `min_cli` (terser). These slot into the existing `make` pipeline alongside `make_*` / `min_*`.

## Rasterization strategy

PNG and JPEG render targets call a shared `rasterize.ts` function that performs runtime feature detection:

```ts
async function rasterize(svg: string, target: 'png' | 'jpeg', opts: RasterOptions): Promise<Uint8Array> {
  if (typeof OffscreenCanvas !== 'undefined') {
    return rasterizeViaCanvas(svg, target, opts);   // browser, Deno, Bun, edge workers, mobile, Unity WebGL
  }
  return rasterizeViaResvgWasm(svg, target, opts);  // Node, anything without native Canvas
}
```

Feature detection on `OffscreenCanvas` is more durable than runtime sniffing — new runtimes "just work" as long as they ship the standard API.

`@resvg/resvg-wasm` is loaded lazily on first raster call. If the optional dep wasn't installed, a friendly error:

```
fsl-render: error: PNG/JPEG in this runtime requires @resvg/resvg-wasm
  install with: npm install @resvg/resvg-wasm
```

## Runtime compatibility matrix

| Runtime | `OffscreenCanvas` | WASM | Render targets working |
|---|---|---|---|
| Node 10-13 | no | yes (built-in) | SVG / DOT / HTML only (resvg-wasm requires Node 14+) |
| Node 14+ | no | yes | All (via resvg-wasm fallback) |
| Modern browsers (Chrome/Safari/Firefox/Edge) | yes | yes | All (Canvas path, fast) |
| iOS Safari 16.4+ | yes | yes | All |
| iOS Safari <16.4 | no | yes | All (resvg-wasm fallback) |
| Android Chrome | yes | yes | All |
| WKWebView (iOS 16.4+) | yes | yes | All |
| Android System WebView | yes | yes | All |
| Capacitor / Cordova / Ionic | (inherited from WebView) | (inherited) | All |
| Deno | yes (added 2024) | yes | All |
| Bun | yes | yes | All |
| Cloudflare Workers / Vercel Edge | yes | yes | All |
| Unity WebGL builds | yes | yes | All (with .jslib glue for C# interop) |
| React Native + Hermes 0.78+ | no | yes | All (resvg-wasm fallback) |
| React Native + Hermes <0.78 | no | no | **SVG/DOT/HTML only** — PNG/JPEG unavailable |
| React Native + JSC | no | yes | All (resvg-wasm fallback) |

The single runtime where raster genuinely doesn't work is React Native with Hermes older than v0.78 (October 2023). Documented as a known compatibility line.

## Test strategy

### Approach

Substring/regex assertions on output content, plus structural assertions for required elements. No golden files, no snapshot files. Substring tests double as documentation of what the renderer is contractually expected to produce, and are robust to incidental formatting drift in upstream renderers.

### What to test

| Layer | What's verified | How |
|-------|----------------|-----|
| Library functions (`render`, `renderSet`, `parseFslArgs`) | Output correctness, error shapes, option handling | Direct unit tests, in-process |
| `fsl-render` plugin (in-process path) | argv → exit code, stdout/stderr capture, library functions called correctly | Import the plugin's `cli()`, invoke with synthetic argv, capture streams |
| `fsl-render` plugin (spawn path) | Same as above, via subprocess | Spawn `node dist/cli/fsl-render.cjs ...`, capture streams + exit code |
| `fsl` dispatcher (in-process route) | PATH probe, in-process decision, exit-code forwarding | Mock PATH with fixture plugins; assert correct plugin module is `import()`-ed |
| `fsl` dispatcher (spawn route) | Plugin not Node-resolvable → spawn path taken | Resolve to non-Node fixture plugin (shell script); assert subprocess used |
| Plugin contract violations | Detected and handled gracefully | Synthetic plugin that calls `process.exit()` → dispatcher catches, recovers |
| Cross-runtime rasterization | PNG produced correctly via WASM (Node) and via mocked `OffscreenCanvas` (browser path) | Two test variants per raster target |

### Fixture layout

```
src/ts/tests/cli/
  fixtures/
    machines/
      traffic-light.fsl
      atm.fsl
      invalid.fsl              # parser-error fodder
    plugins/
      fsl-good.cjs             # contract-compliant plugin
      fsl-bad-exits.cjs        # calls process.exit() (in-process safety test)
      fsl-non-node.sh          # shell script plugin (spawn-path test)
      fsl-no-default.cjs       # missing default export (negative test)
```

Fixture plugins are added to `PATH` for the duration of the dispatch tests. This validates the real PATH-probe logic, not a mock.

### Example test patterns

```ts
it('renders traffic-light to SVG mentioning each state', async () => {
  const fsl = await readFile('fixtures/machines/traffic-light.fsl', 'utf8');
  const { svg } = await render(fsl, { target: 'svg' });
  expect(svg).toMatch(/^<\?xml[^>]+\?>\s*<svg/);
  expect(svg).toContain('</svg>');
  expect(svg).toMatch(/<text[^>]*>red<\/text>/);
  expect(svg).toMatch(/<text[^>]*>yellow<\/text>/);
  expect(svg).toMatch(/<text[^>]*>green<\/text>/);
  const pathCount = (svg.match(/<path/g) ?? []).length;
  expect(pathCount).toBeGreaterThanOrEqual(3);
});

it('renders to PNG with correct magic bytes and dimensions', async () => {
  const { buffer } = await render(fsl, { target: 'png', width: 800 });
  expect(buffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  const width = buffer.readUInt32BE(16);
  expect(width).toBe(800);
});

it('fsl-render reports parse errors with file path and line', async () => {
  const { stderr, exitCode } = await runPlugin(['fixtures/machines/invalid.fsl']);
  expect(exitCode).toBe(1);
  expect(stderr).toContain('fsl-render: error:');
  expect(stderr).toContain('fixtures/machines/invalid.fsl');
  expect(stderr).toMatch(/line \d+/);
});

it('dispatcher routes "fsl render" to fsl-render with identical output', async () => {
  const direct = await runPlugin(['fixtures/machines/traffic-light.fsl', '--target=dot', '--stdout']);
  const viaDispatch = await runDispatcher(['render', 'fixtures/machines/traffic-light.fsl', '--target=dot', '--stdout']);
  expect(viaDispatch.exitCode).toBe(direct.exitCode);
  expect(viaDispatch.stdout).toContain('digraph');
  expect(viaDispatch.stdout).toContain('"red"');
});
```

### Coverage target

100%, matching the existing project standard (commit `43aee18`).

### Configuration

- New `jest-cli.config.cjs` to run only the CLI suite as a fast subset.
- CLI tests integrate into the existing `npm run jest` umbrella.

## Future tooling (deferred to v0.2+, designed-for here)

These are out of scope for v1 but the v1 contract is designed to support them cleanly.

### Static plugin auditor

The plugin behavior rules (no `process.exit()`, no `process.on('uncaughtException')`, no `process.argv` mutation, must export default async `cli`) are mostly AST-detectable. v0.2+ work to ship the auditor in two forms sharing one rule engine:

1. **ESLint plugin** (`eslint-plugin-fsl`) — gets the rules into editor squigglies and into the plugin author's CI for free.
2. **`fsl audit <plugin-path>`** — another plugin (`fsl-audit`) that runs the same rule engine against a plugin's source tree. Useful for one-shot CI checks in plugin-registry workflows.

The shared rule library could ship as `@jssm/plugin-rules` or as an exported function from `jssm/cli`: `auditPluginSource(sourceText): Diagnostic[]`.

The fact that the auditor *itself* would be `fsl-audit` (a plugin) is a useful forcing function: the auditor would be the first non-render plugin shipped, doubling as the proof that the plugin contract supports more than one implementation.

### Further plugins (v0.2+ each)

| Plugin | Role |
|---|---|
| `fsl-lint` | Style and simple-correctness rules, rule plugin/extension hook |
| `fsl-fmt` | Auto-fix style, `--check` mode for CI, stdin/stdout for editor integration |
| `fsl-check` | Static analysis: reachability, dead/orphan state detection, hook signature validation |
| `fsl-test` | Model-based testing framework |
| `fsl-typegen` | Generate TypeScript types from machine declarations |
| `fsl-convert` | Round-trip between FSL and Mermaid/PlantUML/DOT/SCXML |
| `fsl-new` | Project scaffolder |
| `fsl-playground` | Web playground server |
| `fsl-mcp` | MCP server (long-running) |
| `fsl-lsp` | LSP server (long-running) |
| `fsl-audit` | Static plugin auditor (see above) |

### Further `fsl-render` targets (v0.2+)

| Target | Status | Notes |
|---|---|---|
| Mermaid | v0.2+ | Needs FSL → Mermaid converter in library |
| PlantUML | v0.2+ | Same shape as Mermaid |
| SCXML | v0.2+ | Needs FSL → SCXML serializer; existing tracker item #456 |
| ASCII | v0.2+ | Custom box-drawing renderer |
| FSL pretty-print | v0.2+ | Overlaps with `fsl-fmt`; render emits canonical FSL via the formatter library |
| WebP / AVIF | v0.3+ | Modern raster formats; `OffscreenCanvas.convertToBlob` supports both natively |

### Roadmap items the v1 contract enables

- **VS Code extension (LSP client)** — consumes `fsl-lsp` once shipped.
- **MCP server** — consumes `jssm/cli` library exports directly, no shelling.
- **Test framework** — consumes the renderer library to embed machine visualizations in test reports.
- **Web playground** — same constellation pattern as the rest; shipped as `fsl-playground` plugin and the playground UI lives in `@jssm/playground`.

## Decisions made, with rationale (one-line each)

- **Plugin discovery via PATH (git/cargo style)** rather than a registry, because PATH is already where users install npm-global packages and zero new infrastructure is needed.
- **Uniform plugin contract, transparent in-process for Node-resolvable plugins** (Reading 3), rather than spawn-everywhere or static built-ins, because it gives first-party plugins fast invocation while keeping third-party plugins on the same public contract.
- **`fsl` + `jssm` (alias) + `fsl-render`** as three bin entries — `jssm` preserves brand continuity for existing users, `fsl` matches the language brand and is the primary going forward.
- **Custom argv parsing with shared `parseFslArgs` helper** rather than a CLI framework dependency, because the parsing is small enough to be tractable, framework-agnostic plugin contracts attract more third-party authors, and zero new runtime deps preserves the existing jssm install profile.
- **No engines bump** because we deliberately avoided Node-version-gated APIs (no `util.parseArgs`); the CLI runs anywhere Node runs.
- **Sibling-file default output** rather than stdout, because rendering an image into a terminal stdout is rarely what the user wants; pipe-friendly flags exist for the cases it is.
- **Silent-ignore non-applicable flags** (`--width` on SVG) rather than error, because scripted multi-target invocations work without conditional flag-building.
- **Continue-on-error multi-input** with worst-wins exit code, rather than abort-on-first-error, because users expect to see all the broken inputs in one run rather than bisect.
- **`@resvg/resvg-wasm` + native `OffscreenCanvas`** rather than `sharp` (Node-only), `canvg` (quality issues), or pure-JS rasterization (doesn't really exist), because it's the only choice that works in every JS runtime the library targets without compromise.
- **Feature-detect `OffscreenCanvas` rather than sniff runtime identity**, because new runtimes appear faster than identity-sniffing can be updated.
- **Substring/structural test assertions** rather than golden files or snapshots, because incidental formatting drift in renderers is too high-churn for exact-match testing to be useful during development.

## Open questions for implementation phase

These were deferred from the brainstorm as implementation-detail rather than design decisions; they belong in the implementation plan, not this spec.

1. Exact shape of `parseFslArgs` helper API — declarative spec? Builder pattern? Pick during implementation, validate by writing `fsl-render` against it.
2. Exact heuristic for "Node-resolvable" plugin detection. Initial proposal: file is `.js`/`.mjs`/`.cjs`, located inside the running project's `node_modules`, has `package.json` adjacent declaring `"type"` and `"main"` or `"exports"`. Refine if the heuristic produces false positives or negatives in testing.
3. Should the dispatcher cache plugin-resolution results within a single session (e.g., for repeated `fsl <X>` invocations from a script)? Probably yes for performance, but the cache key needs care (PATH changes between calls invalidate it).
4. Should `RasterizationUnsupportedError` be its own error class (distinct from `RenderError`) so consumers can handle it specifically? Ergonomic win, low cost. Decide during implementation.
5. Should the `RenderResult` type include the original FSL source for downstream caching/debugging, or only the rendered output? Lean toward including for v1; revisit if it bloats memory in batch renders.
6. Exact line/column reporting format for parse errors — match an existing tool's convention (TypeScript's `(line,col): error TS...` style, or rustc's `--> path:line:col` style)? Decide during implementation.

## Spec self-review

Cross-checked:

- All "deferred" items in Non-goals correspond to items in the Future Tooling section — nothing is dropped without a forward pointer.
- Every entry in the Decisions table is referenced and explained in a section below.
- All "must"/"should" rules in the plugin contract are restated in the test strategy (Plugin contract violations row).
- The runtime compatibility matrix matches the rasterization strategy's feature-detection logic.
- The package.json additions match the source-tree additions (both bin entries, both exports subpaths).
- No section contradicts another. No placeholders. No unresolved TBDs in the body.
