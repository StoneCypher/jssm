# Editor / visualizer widget packaging — design

**Date:** 2026-05-12
**Status:** Approved (design phase). Awaiting implementation plan.
**Author:** John Haugeland

## Motivation

The folded-in `jssm-viz` provides headless SVG rendering, but not an interactive editor. The legacy `jssm-viz-demo` repo provides an Ace-based playground but was never engineered as a reusable widget — it is one static HTML page that copies files out of `node_modules`. The full feature inventory of that playground is captured in [`notes/editor_todos.json`](../../editor_todos.json).

For the rewrite, we want to ship reusable widgets, not a static demo page. Three widget triplets are planned per UI framework:

1. **Text UI** — an FSL source editor (`<jssm-editor>`).
2. **Graphic renderer** — a live SVG visualization of the current machine (`<jssm-viz>`).
3. **Graphic renderer with control widgets** — the editor, the visualization, and the supporting controls (theme picker, zoom, share URL, export, examples, etc.) wired together as a playground (`<jssm-playground>`).

Target consumer environments include vanilla HTML, React, Vue, Svelte, Solid, Preact, Qwik, Angular, and ultimately ~50–60 framework or framework-version combinations.

This design specifies how those widgets are authored, generated, published, and consumed — without splitting the repo or the published npm artifact.

## Goals

- One published npm package — `jssm` — exposes the headless core, the SVG core, the three Lit web components, and the per-framework wrappers via `package.json#exports` subpaths.
- One git repository, one build pipeline, one version, one CHANGELOG, one issue tracker.
- Adding the Nth framework wrapper is a generator target, not a new package or release artifact.
- A user who only imports `jssm` (or `jssm/viz`) carries zero widget, zero framework, and zero Lit code in their bundle.
- A user who imports `jssm/react/playground` carries Lit + the three WCs + the React wrappers, and nothing from Vue / Svelte / Angular / etc.
- Web components must be usable from a plain `<script type="module">` against a CDN, with no build step.
- The Lit-flavored class/define split convention is followed throughout, so consumers can rename tags, subclass, or guard against double-registration.
- `custom-elements.json` (CEM) is published at the package root and is the canonical contract every wrapper is generated from.

## Non-goals (deferred to follow-ups)

- Choice of in-widget text editor (Monaco vs. CodeMirror 6 vs. retain Ace). Captured as a separate decision in `editor_todos.json`; not blocking this packaging design.
- SSR (`@lit-labs/ssr`, Declarative Shadow DOM). Client-only on first ship; SSR support is a follow-up per wrapper.
- Scoped Custom Element Registries. The browser API is not yet universal; the class/define split is the mitigation for now.
- Independent versioning of any wrapper. All wrappers ship in lockstep with `jssm` by construction.
- A dedicated documentation site for each wrapper. CEM-driven auto-generated reference docs are sufficient for v1.
- An `@jssm/*` npm scope. Single-package design makes scope ownership unnecessary.

## Decisions

| Topic | Decision |
|---|---|
| Package boundary | Single `jssm` package; everything reached via subpath exports. |
| Widget framework | Lit (decided in a prior session). |
| Widget set per framework | Triplet: `editor`, `viz`, `playground`. |
| Web Component registration | Class/define split: class export has no side effects; `<name>/define` subpath registers the tag. |
| CDN distribution | Per-component bundled ESM under `jssm/cdn/<widget>.js`. No monolithic CDN bundle. |
| Bundler distribution | ESM with deps externalized under `jssm/wc/<widget>` and `jssm/<framework>/<widget>`. |
| Theming API | CSS Custom Properties on each host element, declared via JSDoc `@cssproperty` and surfaced through CEM. |
| Wrapper authoring | Generated from `custom-elements.json` by per-framework generators under `tools/generators/`. Generated source committed for reviewability. |
| Hand-written wrappers | Angular only (NgZone / change-detection / two-way-binding requirements). All others are pure generator output plus types. |
| Framework runtime dependencies | `peerDependencies` for each framework, all marked optional via `peerDependenciesMeta`. |
| Versioning | Lockstep with `jssm` core. No independent wrapper versions. |
| Test tiers | Full coverage on WC classes; substring-assertion tests on generator output; per-framework smoke tests (mount + prop + event). |
| Tree-shaking contract | `sideEffects` whitelist names every `*.define.js` and the explicit CDN files; everything else is pure. Enforced by a bundle-analyzer CI check. |
| Tag-name scheme | `jssm-editor`, `jssm-viz`, `jssm-playground`. Renaming is a consumer's prerogative via the class export. |
| Initial framework wrapper set | React, Vue, Svelte, Solid, Angular. Others added incrementally once the pipeline is proven. |
| In-widget text editor library | **CodeMirror 6.** Decided 2026-05-12 after a survey including Monaco, CM5, Ace, Lexical, TipTap, Slate, CodeJar + Shiki, Theia, and Sandpack. Rationale: bundle size irrelevant (viz.js WASM already multi-MB), strongest custom-language story via Lezer for future grammar work, best a11y/mobile story among modern editors. |
| FSL highlighting strategy | `StreamLanguage` tokenizer (hand-written, ~120 lines) + separate `linter` driven by the existing `fsl_parser.parse()`. Tokenizer never blocks on the parser; a failing parse does not kill highlighting. Captured as redistributable `codemirror-lang-fsl`-shaped package at the `jssm/cm6` subpath. |
| CM6 CDN distribution | esm.sh + importmap pinning each `@codemirror/*` package to a specific version, chained with `?external=` so the browser dedupes a single `@codemirror/state` singleton. Required to avoid dual-instance `instanceof` failures. The meta `codemirror` npm package is NOT used (its esm.sh wrapper drops re-exports); `basicSetup` is composed manually from individual extensions. |

## Architecture

### File layout

```
src/
  ts/                          (unchanged — headless jssm core)
  viz/                         (unchanged — headless jssm/viz core; see 2026-05-04 spec)

  wc/                          NEW. Lit web components.
    editor.ts                  Class export. No side effects. Declares HTMLElementTagNameMap entry.
    editor.define.ts           Side-effect register: `if (!customElements.get('jssm-editor')) define(...)`.
    viz.ts                     Class export.
    viz.define.ts              Side-effect register.
    playground.ts              Class export. Composes editor + viz + control bar via slots.
    playground.define.ts       Side-effect register.
    index.ts                   Imports all three `*.define.ts` files. Side-effect entry for "load everything."
    shared/                    Internal helpers shared across the three components. NOT exported.

  react/                       NEW. Generated React wrappers.
    editor.tsx                 GENERATED from CEM by tools/generators/react.ts.
    viz.tsx                    GENERATED.
    playground.tsx             GENERATED.
    index.ts                   Re-exports all three.

  vue/                         NEW. Generated Vue wrappers (same shape).
  svelte/                      NEW. Generated Svelte wrappers / types (Svelte consumes WCs natively).
  solid/                       NEW. Generated Solid wrappers / types.

  angular/                     NEW. Hand-written Angular directives plus generated types.
    editor.directive.ts        Hand-written shim: NgZone + ChangeDetectorRef + two-way binding glue.
    viz.directive.ts           Hand-written.
    playground.directive.ts    Hand-written.
    editor.types.ts            GENERATED prop/event types from CEM.
    viz.types.ts               GENERATED.
    playground.types.ts        GENERATED.
    jssm.module.ts             NgModule that declares + exports the three directives.

tools/
  cem/                         CEM analyzer config (custom-elements-manifest.config.mjs).
  generators/
    react.ts                   Reads custom-elements.json, emits src/react/*.
    vue.ts                     Same shape.
    svelte.ts                  Mostly emits types; native consumption otherwise.
    solid.ts                   Same shape as Svelte.
    angular.ts                 Emits src/angular/*.types.ts only; directives are hand-maintained.
    shared/                    Common AST helpers across generators.

tests/
  wc/                          Full coverage on Lit components (@web/test-runner or Playwright CT).
  generators/                  Substring-assertion tests: regenerate, assert key identifiers/args appear in output.
  smoke/
    react/                     One-file-per-widget mount/prop/event smoke.
    vue/
    svelte/
    solid/
    angular/

custom-elements.json           Generated at package root on every build.
```

`jssm/viz` (headless SVG rendering) is unchanged from the 2026-05-04 spec; the Lit `<jssm-viz>` component consumes it.

### `package.json#exports`

The map is long but mechanical and generated by the build step from a single config table — never hand-edited.

```jsonc
{
  "exports": {
    ".":                              "./dist/index.js",
    "./viz":                          "./dist/viz/index.js",

    "./wc":                           "./dist/wc/index.js",
    "./wc/editor":                    "./dist/wc/editor.js",
    "./wc/editor/define":             "./dist/wc/editor.define.js",
    "./wc/viz":                       "./dist/wc/viz.js",
    "./wc/viz/define":                "./dist/wc/viz.define.js",
    "./wc/playground":                "./dist/wc/playground.js",
    "./wc/playground/define":         "./dist/wc/playground.define.js",

    "./react":                        "./dist/react/index.js",
    "./react/editor":                 "./dist/react/editor.js",
    "./react/viz":                    "./dist/react/viz.js",
    "./react/playground":             "./dist/react/playground.js",

    "./vue":                          "./dist/vue/index.js",
    "./vue/editor":                   "./dist/vue/editor.js",
    "./vue/viz":                      "./dist/vue/viz.js",
    "./vue/playground":               "./dist/vue/playground.js",

    "./svelte":                       "./dist/svelte/index.js",
    "./svelte/editor":                "./dist/svelte/editor.js",
    "./svelte/viz":                   "./dist/svelte/viz.js",
    "./svelte/playground":            "./dist/svelte/playground.js",

    "./solid":                        "./dist/solid/index.js",
    "./solid/editor":                 "./dist/solid/editor.js",
    "./solid/viz":                    "./dist/solid/viz.js",
    "./solid/playground":             "./dist/solid/playground.js",

    "./angular":                      "./dist/angular/index.js",
    "./angular/editor":               "./dist/angular/editor.js",
    "./angular/viz":                  "./dist/angular/viz.js",
    "./angular/playground":           "./dist/angular/playground.js",

    "./cdn/editor":                   "./dist/cdn/editor.js",
    "./cdn/viz":                      "./dist/cdn/viz.js",
    "./cdn/playground":               "./dist/cdn/playground.js",

    "./custom-elements.json":         "./custom-elements.json"
  }
}
```

Each entry expands at publish time to a `{ "types", "import", "default" }` conditional export. The expansion happens in the build step so the committed `package.json` stays human-readable.

### `peerDependencies` + `peerDependenciesMeta`

All framework runtimes are optional peers. This is what makes single-package distribution painless: a user who installs `jssm` for state-machine logic gets zero peer warnings.

```jsonc
{
  "peerDependencies": {
    "lit":               ">=3",
    "react":             ">=18",
    "react-dom":         ">=18",
    "vue":               ">=3",
    "svelte":            ">=4",
    "solid-js":          ">=1.8",
    "@angular/core":     ">=17",
    "@angular/common":   ">=17"
  },
  "peerDependenciesMeta": {
    "lit":             { "optional": true },
    "react":           { "optional": true },
    "react-dom":       { "optional": true },
    "vue":             { "optional": true },
    "svelte":          { "optional": true },
    "solid-js":        { "optional": true },
    "@angular/core":   { "optional": true },
    "@angular/common": { "optional": true }
  }
}
```

Lit itself is an optional peer rather than a hard dependency: users of `jssm` or `jssm/viz` should not carry Lit's runtime. Users of any `jssm/wc/*` or `jssm/<framework>/*` subpath must have Lit installed; their package manager will warn if it is missing once a WC subpath is imported.

### `sideEffects` whitelist

```jsonc
{
  "sideEffects": [
    "./dist/wc/*.define.js",
    "./dist/wc/index.js",
    "./dist/cdn/**"
  ]
}
```

Everything else — class modules, generated framework wrappers, helpers — must be pure. Imports such as `import { JssmEditor } from 'jssm/wc/editor'` and `import { JssmEditor } from 'jssm/react/editor'` must be tree-shakeable down to the symbols actually used.

A CI bundle-analyzer test verifies the contract: a fixture React app that imports only `jssm/react/editor` must not contain symbols from `jssm/vue/*`, `jssm/angular/*`, etc. Any drift fails the build.

### Two-build pattern

- **Bundler builds** — `dist/wc/*` and `dist/<framework>/*` — externalize Lit, the consuming framework, and any heavy dependencies. These are what `npm install` consumers get.
- **CDN builds** — `dist/cdn/*` — per-component, self-contained, bundled. Used for `<script type="module" src="https://cdn.jsdelivr.net/npm/jssm/cdn/playground.js">`. No monolithic "everything" bundle is produced; CDN users want one widget on one page.

### Class/define split — canonical pattern

For each widget:

```ts
// src/wc/editor.ts — class export, no side effects
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * @element jssm-editor
 * @cssproperty [--jssm-editor-bg=#1e1e1e]
 * @cssproperty [--jssm-editor-fg=#d4d4d4]
 * @fires {CustomEvent<string>} fsl-change  Fired when the FSL source changes.
 * @slot toolbar  Replaces the default top toolbar.
 */
export class JssmEditor extends LitElement {
  @property() fsl = '';
  // ...
}

declare global {
  interface HTMLElementTagNameMap {
    'jssm-editor': JssmEditor;
  }
}
```

```ts
// src/wc/editor.define.ts — side-effect register
import { JssmEditor } from './editor.js';

if (!customElements.get('jssm-editor')) {
  customElements.define('jssm-editor', JssmEditor);
}
```

Consumer experiences:

```ts
// Common: just want the tag working
import 'jssm/wc/editor/define';

// Advanced: rename or subclass
import { JssmEditor } from 'jssm/wc/editor';
customElements.define('my-fsl-editor', class extends JssmEditor { /* … */ });

// Load all three at once
import 'jssm/wc';

// React
import { JssmEditor } from 'jssm/react/editor';
<JssmEditor fsl="Off -> On;" onFslChange={e => /* … */} />

// CDN
<script type="module" src="https://cdn.jsdelivr.net/npm/jssm/cdn/playground.js"></script>
<jssm-playground fsl="Off -> On -> Off;"></jssm-playground>
```

### Generator pipeline

1. `npm run build:cem` — `@custom-elements-manifest/analyzer` reads `src/wc/*.ts` and emits `custom-elements.json` at the repo root.
2. `npm run build:wrappers` — runs each generator in `tools/generators/` against `custom-elements.json`. Outputs go to `src/<framework>/`.
3. `npm run make` — per-target **Rollup** builds compile `dist/`. Each artifact has its own config (`rollup.config.core.js`, `rollup.config.viz.js`, `rollup.config.wc.<widget>.es6.js`, `rollup.config.wc.<widget>.cdn.js`, …) and the `make` script chains one `rollup -c` invocation per target; there is no single multi-entry config. The project bundles with Rollup and tests with Vitest — it does not use Vite.
4. `npm test` — runs the WC suite, the generator substring-assertion suites, and every smoke suite.

Generated files are checked in. `npm run build:wrappers` updates them; the diff is reviewable in PRs. CI re-runs `npm run build:wrappers` and fails if the working tree is dirty afterwards — proving that the committed wrapper source is in sync with the current CEM. The check is structural, not byte-exact: it verifies "the generator is deterministic and committed output matches what the current generator would produce," not "the output looks identical to a previously-blessed fixture."

### Testing tiers

- **WC tier** — full coverage. Lifecycle, properties, slots, events, accessibility, CSS variable application. The bug surface lives here.
- **Generator tier** — substring-assertion tests in `tests/generators/`. Each generator is run against a fixed CEM snapshot; the test asserts that key identifiers, prop names, event names, and import statements appear in the output. Robust to formatter / ordering / whitespace changes while still catching real contract breaks. No golden-file diffs.
- **Smoke tier** — per framework, per widget: mount, set one prop, fire one event, assert. Confirms the wrapper plumbing is connected. Deeper bugs are core bugs by construction.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Global tag-name collision with another WC library using `jssm-*` names | Class/define split lets consumers rename. Long-term: Scoped Custom Element Registries once browser support is universal. |
| Angular's NgZone / change-detection mismatch with WC events | Hand-written directive shim, documented as the one wrapper that is not generated. Pattern mirrors Ionic / Material Web / Spectrum. |
| Bundle bloat for users on weak tree-shaking bundlers | `sideEffects` whitelist + CI bundle-analyzer test. Documented minimum Vite / Rollup / esbuild / webpack versions. |
| SSR breakage on Next.js / Nuxt / SvelteKit | Out of scope for v1; client-only ship with a documented `noSSR` flag per wrapper. `@lit-labs/ssr` follow-up. |
| Generator drift between framework targets | Shared AST helpers in `tools/generators/shared/`. Substring-assertion tests catch missing prop names, event names, and identifiers. The "regenerate-and-fail-on-dirty-tree" CI check catches divergence between committed wrappers and current generator output. |
| Lockstep-versioning patch noise | Acceptable cost. Single-package correctness guarantees (no version skew between wrapper and core) outweigh the noise of per-patch releases. |
| Long `exports` map readability | Map is generated from a single config table in the build step; committed `package.json` is authoritative but not hand-maintained. |

## Open questions

- **Lit dependency declaration.** `peerDependenciesMeta: optional: true` is documented above. Alternative is making Lit a hard dependency for users of any `jssm/wc/*` subpath. The optional-peer approach is cleaner but relies on package-manager warnings catching the missing-peer case; needs verification on npm 10, pnpm 9, yarn 4.
- **CDN provider canonical link.** jsDelivr vs. unpkg vs. esm.sh. Pick one for docs; all three will work.
- ~~**Initial in-widget editor library.**~~ Resolved 2026-05-12: **CodeMirror 6**. A working sketch (`StreamLanguage` tokenizer + linter driven by `fsl_parser.parse()`) lives at `sketch/cm6-editor/` and `sketch/cm6-lang-fsl/` on `main` (imported from a sibling worktree). The `cm6-lang-fsl/` package is the seed for the `jssm/cm6` subpath. See "CM6 sketch artifacts" below.
- **Whether `jssm/wc/index` is worth shipping at all.** It registers all three widgets as a side effect. Convenient, but may encourage users to load Lit + three widgets when they need one. Decide before v1.

## CM6 sketch artifacts

A separate Claude session produced a CodeMirror 6 sketch on the
`worktree-cm6-editor-sketch` branch. The salvageable files were imported into
`main` on 2026-05-12 under `sketch/cm6-editor/` and `sketch/cm6-lang-fsl/`
(the PNG screenshots and the `servehere` devDependency change were dropped).
Outputs to integrate when `<jssm-editor>` lands:

- `sketch/cm6-lang-fsl/index.js` — CM6 `LanguageSupport` package for FSL. ~120
  lines. Exports `fslLanguage` (the `Language`) and `fsl()` (factory returning
  `LanguageSupport`). Shaped like a standard `@codemirror/lang-*` package.
  Token classes map to standard CM6 highlight tags (`keyword`, `propertyName`,
  `string`, `labelName`, `operator`, `number`, `comment`, `variableName`,
  `variableName.special`, `atom`, `bracket`, `punctuation`).
- `sketch/cm6-editor/editor.js` — wiring sketch demonstrating the linter pattern
  (calls `fsl_parser.parse()`, converts location info to CM6 diagnostics,
  updates a status bar). The Lit web component will absorb this into its
  `firstUpdated` / `updated` lifecycle.
- `sketch/cm6-editor/index.html` — importmap reference implementation. The
  importmap with pinned versions + `?external=` chains is the load-bearing
  CDN deduplication pattern; do NOT regress to the meta `codemirror` package
  or to jsdelivr's `+esm` shortcut.
- `sketch/cm6-editor/sample.fsl` — small traffic-light FSL that parses cleanly
  under the current grammar. Useful seed content.

To drop:

- `sketch/cm6-editor/index.html` as a *standalone demo* — replaced by the
  Lit web component shell in the future `<jssm-editor>` plan. The importmap
  it contains is what survives, not the page itself.
- The PNG screenshots at the worktree root.

Pitfalls documented in the sketch's handoff (see
`notes/superpowers/cm6-editor-handoff.md`) that future plans MUST avoid:

1. Do not import from the `codemirror` meta package on esm.sh — its
   auto-generated wrapper drops re-exports. Compose `basicSetup` from
   individual extensions instead.
2. Do not use jsdelivr's `+esm` shortcut for `@codemirror/*` — each bundle
   inlines its own `@codemirror/state`, breaking `instanceof Extension`
   checks. Use the pinned-version + `?external=` chain importmap pattern.
3. Many `.fsl` files in `src/machines/linguist/` do not parse against the
   current grammar (missing terminating semicolons; operator-bearing
   `jssm_version` lines). This is a separate bug. Sample FSL in CM6 tests
   should be hand-validated, not pulled from those files.

## References

- Folding `jssm-viz` into `jssm` design — `notes/superpowers/specs/2026-05-04-fold-jssm-viz-into-jssm-design.md`
- Editor / visualizer feature inventory — `notes/editor_todos.json`
- CM6 sketch handoff — `notes/superpowers/cm6-editor-handoff.md`
- CM6 sketch code — `sketch/cm6-editor/` (demo) and `sketch/cm6-lang-fsl/` (redistributable language package)
