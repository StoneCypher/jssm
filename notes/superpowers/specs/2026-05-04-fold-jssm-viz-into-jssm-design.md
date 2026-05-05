# Folding `jssm-viz` into `jssm` — design

**Date:** 2026-05-04
**Status:** Approved (design phase). Awaiting implementation plan.
**Author:** John Haugeland

## Motivation

`jssm-viz` was originally split into a separate npm package because, at the time, keeping visualization code out of the main library was the only reliable way to keep `viz.js` (~2 MB of WebAssembly) from leaking into bundles that only needed state-machine logic. Bundler tree-shaking, `package.json#exports` subpaths, and import maps have all matured since then. Keeping the two libraries separate now costs more (lockstep version bumps, parallel build pipelines, parallel test runners, parallel docs) than it saves.

This design folds `jssm-viz` back into `jssm` as a subpath export (`jssm/viz`), upgrades the visualization engine from the dead `viz.js@2.1.2` (2018) to the current `@viz-js/viz@3.26.0`, and deprecates the standalone `jssm-viz` npm package via a shim release.

## Goals

- Single repository, single build pipeline, single test runner.
- Zero forced cost on users who only need state-machine logic — `import { sm } from 'jssm'` must not pull viz code into bundles.
- Existing `jssm-viz` consumers must keep working without code changes for at least one shim release.
- Clean upgrade to `@viz-js/viz@3` (active, ESM-native, no `Module`/`render` global pollution).
- Two new convenience functions enabled by `@viz-js/viz@3`: `fsl_to_svg_element` and `machine_to_svg_element`.
- Optional `configure({ DOMParser })` injection point that solves the IIFE-globals problem and the Node-DOM problem with one mechanism.

## Non-goals (deferred to follow-ups)

- Comprehensive golden-file SVG test coverage. Out of scope; structural smoke tests only this iteration.
- Formalizing the `_state_declarations` / `_arrange_*` private-by-convention internals into accessor methods. After the merge, those become intra-package access; urgency disappears.
- Backporting `@viz-js/viz@3` to the standalone `jssm-viz` codebase. The shim delegates to `jssm/viz`; there is no parallel v2 fork to maintain.
- A Deno build of `jssm/viz`. Viz.js v3's WebAssembly path on Deno is not validated; deferred.
- Removing the `jssm-viz` package from npm. `npm deprecate` is the correct tool — unpublishing breaks every existing consumer's lockfile.

## Decisions

| Topic | Decision |
|---|---|
| Standalone `jssm-viz` package fate | Deprecate via final shim release. |
| Module access pattern | Subpath export only (`jssm/viz`). No flat re-export. |
| `@viz-js/viz` dependency declaration | `optionalDependencies`. |
| Test scope | Port + structural smoke tests (~14 cases). |
| New `*_svg_element` functions | Yes, included in this iteration. |
| Browser unified strategy | Dynamic `import('@viz-js/viz')` + import maps. Same code path for IIFE and `<script type="module">`. |
| Node `*_svg_element` behavior | Throws clear `JssmError` by default. Optional `configure({ DOMParser })` enables it. |
| Version bump | jssm 5.108.0 → 5.109.0 (minor). jssm-viz 5.104.2 → 5.109.0 (minor, matches jssm). |

## Architecture

### File layout

```
src/ts/
  jssm.ts                    (unchanged)
  jssm_compiler.ts           (unchanged)
  jssm_types.ts              (unchanged)
  jssm_arrow.ts              (unchanged)
  jssm_constants.ts          (unchanged)
  jssm_error.ts              (unchanged)
  jssm_util.ts               (unchanged)
  jssm_theme.ts              (unchanged)
  fsl_parser.peg / .ts       (unchanged)
  themes/                    (unchanged)
  jssm_viz.ts                NEW. Ported from jssm-viz/src/ts/jssm-viz.ts.
                             Imports types/Machine from './jssm_types' and './jssm'
                             instead of from the npm package. Drops the re-export
                             of `jssm` itself. Uses './version' for version/build_time
                             (single source of truth).
  jssm_viz_colors.ts         NEW. Ported from jssm-viz/src/ts/default_colors.ts;
                             renamed for consistency with the existing jssm_* prefix.
  tests/
    viz_dot.spec.ts          NEW. Dot-output smoke tests.
    viz_svg_string.spec.ts   NEW. SVG-string rendering smoke tests.
    viz_svg_element.spec.ts  NEW. SVG-element rendering tests; @jest-environment jsdom.
```

`jssm-viz/src/ts/generated_code/` (the embedded viz.js v2 build) is **not** brought over. We consume `@viz-js/viz` from `node_modules` via `optionalDependencies` instead.

The `_state_declarations` / `_arrange_*` reads in the viz code stay as-is; they are now intra-package, TS-visible, and de-facto-public via the existing `_` prefix convention.

### Public API surface of `jssm/viz`

Functions ported from current jssm-viz (signatures unchanged):

```ts
function dot(machine: Machine<any>): void                           // deprecated, no-op alias
function dot_to_svg(dot: string): Promise<string>
function fsl_to_dot(fsl: string): string
function fsl_to_svg_string(fsl: string): Promise<string>
function machine_to_dot(machine: Machine<any>): string
function machine_to_svg_string(machine: Machine<any>): Promise<string>
```

New functions (browser-by-default, throw in Node without `DOMParser`):

```ts
function fsl_to_svg_element(fsl: string): Promise<SVGSVGElement>
function machine_to_svg_element(machine: Machine<any>): Promise<SVGSVGElement>
```

New configuration entry point:

```ts
function configure(opts: { DOMParser?: typeof globalThis.DOMParser }): void
```

- No-op + zero allocations if never called.
- Sets a module-level DOM parser used by `*_svg_element` if `globalThis.DOMParser` is unavailable.
- Idempotent — last call wins.
- Throws `JssmError` if passed a value that isn't constructor-shaped.

Re-exports (unchanged from current jssm-viz):

```ts
export { version, build_time } from './version';
```

The current jssm-viz re-export of `jssm` itself is dropped — redundant once they are the same package.

### Internal behavior

- A single `viz_instance: Promise<Viz> | null` is cached at module scope. The first render call awaits `instance()` from `@viz-js/viz`; subsequent renders reuse the cached promise.
- `*_string` functions return `Promise<string>` to preserve the current async signature even though `@viz-js/viz@3` renders synchronously after init. This keeps current jssm-viz callers working without changes.
- `*_svg_element` resolves the DOM parser in this order: `globalThis.DOMParser` → injected via `configure()` → throw `JssmError` with message: `"jssm/viz: *_svg_element requires a browser DOM. Use *_svg_string in Node, or parse the string yourself with jsdom/xmldom."`.

## Build pipeline & packaging

### `package.json` changes

```json
{
  "exports": {
    ".": {
      "require": { "types": "./jssm.es5.d.cts", "default": "./dist/jssm.es5.cjs" },
      "import":  { "types": "./jssm.es6.d.ts",  "default": "./dist/jssm.es6.mjs" },
      "default": { "types": "./jssm.es5.d.cts", "default": "./dist/jssm.es5.cjs" },
      "browser": "./dist/jssm.es5.iife.js"
    },
    "./viz": {
      "require": { "types": "./jssm_viz.d.cts", "default": "./dist/jssm_viz.cjs" },
      "import":  { "types": "./jssm_viz.d.ts",  "default": "./dist/jssm_viz.mjs" },
      "browser": "./dist/jssm_viz.iife.js"
    }
  },
  "optionalDependencies": {
    "@viz-js/viz": "^3.26.0"
  }
}
```

Removed from existing config:
- `@types/viz.js` from `devDependencies` (`@viz-js/viz@3` ships its own types).
- Any reference to `viz.js@^2`.

Added to `devDependencies`:
- `@viz-js/viz@^3.26.0` (so we can build/test locally; runtime declaration is via `optionalDependencies`).
- `jsdom@^24` (test-only; powers `viz_svg_element.spec.ts`).

### Rollup configuration

Three new configs:

```
rollup.config.viz.es6.js     → dist/jssm_viz.mjs        (@viz-js/viz external)
rollup.config.viz.es5.js     → dist/jssm_viz.cjs        (@viz-js/viz external)
rollup.config.viz.iife.js    → dist/jssm_viz.iife.js   (@viz-js/viz external; uses dynamic import())
```

Notes:
- ESM/CJS builds mark `@viz-js/viz` as external. Bundlers and Node resolve it from the user's `node_modules`. This is different from old jssm-viz, which pre-bundled viz.js into `generated_code/`. The change: deduped if the user has `@viz-js/viz` elsewhere, smaller dist tarball, single source of truth for the viz version.
- The IIFE build also externalizes `@viz-js/viz`. The library uses dynamic `import('@viz-js/viz')` internally. Rollup's IIFE format preserves dynamic imports as-is when their target is external (unlike static imports of externals, which require a `globals` mapping). The browser then resolves the dynamic import against whatever import map the host page declares. This unifies the IIFE and `<script type="module">` strategies — same code path either way.
- The Rollup IIFE `output.name` is `jssm_viz` (snake_case to match the source file name; matches the Q5 decision implicitly used in the documentation examples).
- No Deno build for `jssm/viz` this iteration (see Non-goals).

### Build script chaining

Append to the existing `make` target:
- After `make_iife` / `make_es6` / `make_cjs`: add `make_viz_iife`, `make_viz_es6`, `make_viz_cjs`.
- After `min_iife` / `min_es6` / `min_cjs`: add `min_viz_iife`, `min_viz_es6`, `min_viz_cjs`.

Names follow the existing convention literally so the script tail stays scannable.

### Typedoc

Add `src/ts/jssm_viz.ts` to the `docs` script's input list.

## Browser usage strategy (unified)

Same library code path for IIFE and `<script type="module">`. Both rely on the host page providing an import map for `@viz-js/viz`:

```html
<script type="importmap">
  { "imports": { "@viz-js/viz": "https://cdn.jsdelivr.net/npm/@viz-js/viz/+esm" } }
</script>
```

Then either form works:

```html
<!-- IIFE -->
<script src="https://cdn.jsdelivr.net/npm/jssm/dist/jssm.es5.iife.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jssm/dist/jssm_viz.iife.js"></script>
<script>
  jssm_viz.fsl_to_svg_string('a -> b;').then(svg => /* ... */);
</script>

<!-- ESM, same import map -->
<script type="module">
  import { fsl_to_svg_string } from 'https://esm.sh/jssm/viz';
  fsl_to_svg_string('a -> b;').then(svg => /* ... */);
</script>
```

Dynamic `import()` from inside the IIFE honors the document's import map, so the resolution mechanism is identical for both delivery formats.

## Testing strategy

Tests live in `src/ts/tests/` and run under the existing `jest-spec` config — no new Jest config needed. `jsdom` is added to `devDependencies` only.

### Inventory (~14 cases)

```
viz_dot.spec.ts
  ├─ machine_to_dot   → output begins with 'digraph G {'
  ├─ machine_to_dot   → contains both state names of a two-state machine
  ├─ fsl_to_dot       → equivalent output to machine_to_dot(sm`...`)
  ├─ state shape      → state c: { shape: circle; }        produces shape="circle"
  ├─ state color      → state c: { color: red; }           produces color="..."
  ├─ state corners    → state c: { corners: rounded; }     produces style="rounded,..."
  ├─ state line-style → state c: { line-style: dashed; }   produces style="...,dashed"
  ├─ state image      → state c: { image: foo.png; }       produces image="foo.png"
  ├─ arrange          → arrange [a b];                     produces rank=same group
  ├─ arrange_start    → arrange_start [a];                 produces rank=min group
  ├─ arrange_end      → arrange_end [a];                   produces rank=max group
  └─ flow direction   → flow: right;                       produces rankdir=LR

viz_svg_string.spec.ts
  ├─ fsl_to_svg_string     → resolves with content matching /^<\?xml|^<svg/
  └─ machine_to_svg_string → resolves with content matching /^<\?xml|^<svg/

viz_svg_element.spec.ts   (@jest-environment jsdom)
  ├─ fsl_to_svg_element     → resolves to an SVGSVGElement (instanceof check)
  └─ machine_to_svg_element → resolves to an SVGSVGElement (instanceof check)
```

The state declaration `image` test is a deliberate addition. The most recent jssm commit (`a045569`) added the `image` property to the grammar and to `JssmStateDeclaration`, but the current jssm-viz code does not read it through to dot output. **As part of porting**, the new `jssm_viz.ts` adds an `image_for_state(...)` helper that returns the declaration's `image` value (or `undefined`), and includes it in the feature list emitted by `states_to_nodes_string`. The `image` test in `viz_dot.spec.ts` pins that wiring against regression. This is the only behavioral change to the viz code in this iteration; everything else is a faithful port.

### Build pipeline integration

`npm run jest` (and therefore `npm run test` and `npm run build`) executes the new specs automatically because they match the existing `jest-spec.config.cjs` test pattern. No CI config changes — `npm run ci_build` runs `vet` + `test`, both of which now cover viz.

### Deprecation shim test

In the jssm-viz repo (not this one): a single test imports from `'jssm-viz'` and asserts `typeof fsl_to_svg_string === 'function'`. Confirms the shim does not accidentally break the re-export chain.

## Migration & rollout

### Sequence

```
1. Cut jssm 5.109.0 with the new /viz subpath.
   Existing jssm-viz still works untouched. No user is broken yet.

2. Cut jssm-viz 5.109.0 (shim release).
   Replaces the implementation with a thin re-export from jssm/viz.
   Bumps its dependency to "jssm": ">=5.109.0".
   This is the LAST jssm-viz release.

3. Run npm deprecate jssm-viz with the message below.
   Existing installs keep working; new installs see the deprecation warning.

4. Archive jssm-viz repo on GitHub (read-only) with a pinned README pointing
   at the new home.
```

Steps 1 and 2 should ideally land in the same publishing window. The *old* jssm-viz keeps working between them, so a gap is safe but undesirable.

### Shim source

Replaces everything in `jssm-viz/src/ts/`:

```ts
// jssm-viz/src/ts/jssm-viz.ts
export {
  dot, dot_to_svg,
  fsl_to_dot, fsl_to_svg_string,
  machine_to_dot, machine_to_svg_string,
  fsl_to_svg_element, machine_to_svg_element,
  configure,
  version, build_time
} from 'jssm/viz';
```

The shim's `package.json` strips its own dependencies down to just `"jssm": ">=5.109.0"`. `viz.js`/`@viz-js/viz`, `reduce-to-639-1`, `better_git_changelog`, `text_audit`, etc. all go away. The Rollup configs go away. The only test is the smoke described above.

### npm deprecation message

```
This package is deprecated. Use jssm@5.109+ and import from 'jssm/viz' instead.
The jssm-viz package will continue to work but receive no further updates.
See https://github.com/StoneCypher/jssm/blob/main/MIGRATING-jssm-viz.md
```

### Documentation changes (in this repo)

- `base_README.md`: add a Visualization section referencing the `jssm/viz` subpath, with examples for `fsl_to_svg_string` and `fsl_to_svg_element`. Replaces any "see jssm-viz" pointer.
- `src/doc_md/Visualization.md` (new): covers the four common usage patterns:
  - Node + string output
  - Browser ESM + element output
  - Browser IIFE + import map
  - Browser IIFE + `configure({ DOMParser })` (advanced; only needed in unusual setups)
- `src/doc_md/DocLandingPage.md`: link to `Visualization.md`.
- `src/doc_md/CHANGELOG.md`: regenerated by `better_git_changelog -b` as part of `npm run build`. The relevant commit subjects must be self-explanatory because they end up in the public changelog.
- `MIGRATING-jssm-viz.md` (new, top-level): a one-page migration guide:
  - "If you're on jssm-viz": change `import {...} from 'jssm-viz'` to `import {...} from 'jssm/viz'`. That is the entire required change.
  - "What's new": list the two `*_svg_element` functions and the optional `configure()`. Mention the `@viz-js/viz` upgrade as a footnote.

## Versioning

| Package | From | To | Why minor |
|---|---|---|---|
| `jssm` | 5.108.0 | 5.109.0 | Adding a subpath export is purely additive at the package level; no existing import changes behavior. |
| `jssm-viz` | 5.104.2 | 5.109.0 | Match jssm's number to make the version-sync convention obvious. Internal implementation is replaced wholesale, but the public surface is unchanged plus two additions. |
| `@viz-js/viz` floor | — | `^3.26.0` | Pin to the current major; receives bug fixes and graphviz feature additions without breaking changes. |

## Risks and open questions

- **`@viz-js/viz` import resolution from inside an IIFE**: the design assumes browsers honor the document's import map for dynamic `import()` calls regardless of which script form initiated them. This is per the HTML spec and works in evergreen browsers, but the IIFE codepath should be smoke-tested manually in Chrome/Firefox/Safari before the 5.109.0 release.
- **viz globals verification**: the precise globals `@viz-js/viz@3`'s IIFE attaches (if any) under various CDNs are worth a 5-minute manual check during implementation. Less critical than for v2 because v3's API is single-symbol clean, but worth confirming.
- **`@viz-js/viz` cold-start cost**: first render awaits WASM instantiation. This is identical to the current jssm-viz cost and is not a regression. Worth noting in the docs so users do not interpret it as a bug.
- **Lockstep version drift**: future jssm releases that add features touching `state_declarations` (recent example: the `image` property) need a corresponding update to `jssm_viz.ts`. Co-locating the code makes this easier to remember; explicit reminder belongs in the contributor guide.

## What this design replaces

- The standalone `jssm-viz` repository's build pipeline.
- The pre-bundled viz.js v2 in `jssm-viz/src/ts/generated_code/`.
- The `Module` / `render` window-globals approach that the old IIFE relied on.
- The `viz.js@2.1.2` (2018) dependency.
