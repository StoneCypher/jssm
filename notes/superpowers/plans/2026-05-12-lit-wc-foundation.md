# Lit Web Component Foundation — `<jssm-viz>` + Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Lit-based `<jssm-viz>` web component, plus all foundational infrastructure (Lit dependency, CEM generation, bundler + CDN build pipelines, jsdom test config, `package.json#exports` for WC subpaths, `sideEffects` whitelist) so that subsequent components (`<jssm-editor>`, `<jssm-playground>`) and framework wrappers (React, Vue, Svelte, Solid, Angular) can be added as mechanical extensions of this scaffold.

**Architecture:** New `src/ts/wc/` directory holds Lit components in pairs — `jssm_viz_wc.ts` (class, no side effects) and `jssm_viz_wc.define.ts` (registers `<jssm-viz>` with `customElements`). SVG output is injected into the shadow tree via Lit's `unsafeHTML` directive — the trust boundary is "the SVG that @viz-js/viz emitted from this FSL," named explicitly in code. Three Rollup configs build the component: one es6 bundler-friendly build (Lit external) and one CDN-friendly bundled build (Lit inlined). A new `jest-wc.config.cjs` uses jsdom so Lit lifecycle runs in tests. `custom-elements.json` is emitted at the repo root by `@custom-elements-manifest/analyzer` and committed for downstream wrapper-generation tooling. Tests use substring assertions only — no golden files, no snapshot matching.

**Tech Stack:** TypeScript 4.7, Jest 29 (jsdom env), Lit 3, Rollup 4, `@custom-elements-manifest/analyzer`, the existing `jssm` and `jssm/viz` public APIs.

**Reference spec:** `notes/superpowers/specs/2026-05-12-editor-widget-packaging-design.md`

**Out of scope for this plan (future plans cover):**
- `<jssm-editor>` and `<jssm-playground>` components (defer until in-widget editor library is chosen).
- Generator pipeline for framework wrappers (React/Vue/Svelte/Solid).
- Angular hand-written shim.
- SSR support.

---

## Conventions used in this plan

- All file paths are relative to the repo root unless absolute.
- Test runs: `npx jest <file> -c jest-wc.config.cjs --color --verbose` for WC tests; `npx jest <file> -c jest-spec.config.cjs --color --verbose` for non-WC tests. Full suites: `npm run jest-wc` and `npm run jest-spec`.
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `build:`).
- Work happens on a feature branch — do NOT switch branches automatically (per `feedback_branch_switches.md` in memory). The user creates / approves the branch before execution begins, OR the worktree skill handles isolation.
- The package version is **NOT** bumped in this plan. Per `CLAUDE.md`, version bumps happen via `/sc-commit` and require explicit user authorization. This plan ends at "ready to ship 5.113.0."
- All TDD-style tasks: write failing test → confirm it fails → write minimal code → confirm it passes → commit.
- No golden-file tests; no snapshot tests. Substring assertions over rendered / built output only.
- After each code-writing task: run `npm run typescript` to catch TS diagnostics before the commit step.
- All raw HTML / SVG injection uses Lit's `unsafeHTML` directive from `lit/directives/unsafe-html.js`, never `.innerHTML=` property bindings or element `.innerHTML` assignments. The directive name communicates the trust boundary in code.

---

## File structure

**New files (created in this plan):**

- `src/ts/wc/jssm_viz_wc.ts` — `JssmViz` Lit class. No side effects. Declares the `HTMLElementTagNameMap` entry for `'jssm-viz'`. Renders SVG output by calling `fsl_to_svg_string` from `../jssm_viz` and injecting via `unsafeHTML`.
- `src/ts/wc/jssm_viz_wc.define.ts` — Side-effect file that registers the tag via `customElements.define('jssm-viz', JssmViz)` guarded by `customElements.get`.
- `src/ts/wc/tests/jssm_viz_wc.spec.ts` — jsdom-environment Jest spec covering render, prop reactivity, error event, engine override.
- `src/ts/wc/tests/bundle_shape.spec.ts` — Node-environment Jest spec that reads built `dist/wc/viz.js` and `dist/cdn/viz.js` and asserts substring presence / absence.
- `src/ts/wc/tests/cem.spec.ts` — Node-environment Jest spec asserting the structural content of `custom-elements.json`.
- `rollup.config.wc.viz.es6.js` — Rollup config for the bundler-friendly WC build. Externalizes `lit`, `lit/decorators.js`, `lit/directives/unsafe-html.js`, and `@viz-js/viz` so consumers' bundlers dedupe.
- `rollup.config.wc.viz.cdn.js` — Rollup config for the CDN-friendly WC build. Bundles `lit` and its directives inline. `@viz-js/viz` stays external (WASM payload is multi-MB).
- `jest-wc.config.cjs` — Jest config for WC tests. `testEnvironment: 'jsdom'`. Same SWC transform as the spec config. Coverage scope limited to `src/ts/wc/**`.
- `custom-elements-manifest.config.mjs` — Configuration for `@custom-elements-manifest/analyzer`. Scans `src/ts/wc/*.ts`, ignores `*.define.ts` and tests, writes `custom-elements.json` at the repo root.
- `custom-elements.json` — Generated CEM file. Committed.
- `src/doc_md/WebComponents.md` — User-facing usage guide for the `jssm/wc/*` subpaths.

**Modified files:**

- `package.json` — Add `lit` and `@custom-elements-manifest/analyzer` to `devDependencies`; add `lit` to `peerDependencies` and `peerDependenciesMeta` (optional); add the `sideEffects` whitelist; add `./wc/viz`, `./wc/viz/define`, `./cdn/viz`, and `./custom-elements.json` to `exports`; add new files to the top-level `files` array; add new npm scripts (`make_wc_viz_es6`, `make_wc_viz_cdn`, `build:cem`, `jest-wc`); chain into `make` and `jest`.
- `jest-spec.config.cjs` — Add `src/ts/wc/` and `src/ts/wc/tests/` to `coveragePathIgnorePatterns` and `testPathIgnorePatterns` so the existing spec suite ignores WC code.
- `src/doc_md/DocLandingPage.md` — Link to `WebComponents.md`.
- `base_README.md` — Add a Web Components section with CDN and npm one-liners.

**Unchanged:** `src/ts/jssm.ts`, `src/ts/jssm_viz.ts`, `src/ts/jssm_compiler.ts`, etc. The WC layer is a pure consumer of existing `fsl_to_svg_string` output.

---

## Task 1: Add Lit, CEM analyzer, and required `package.json` metadata

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Edit `package.json` to add the new dependencies**

In `devDependencies`, add (alphabetized into existing list):

```json
"@custom-elements-manifest/analyzer": "^0.10.4",
"lit": "^3.2.1",
```

Add a new top-level `peerDependencies` block (between `dependencies` and `optionalDependencies`):

```json
"peerDependencies": {
  "lit": ">=3"
},
"peerDependenciesMeta": {
  "lit": { "optional": true }
},
```

At the same top level, add the `sideEffects` whitelist (alongside `type`, `main`, etc.):

```json
"sideEffects": [
  "./dist/wc/*.define.js",
  "./dist/cdn/**"
],
```

(`jest-environment-jsdom@^30` is already present in `devDependencies` — no change needed there.)

- [ ] **Step 2: Run `npm install` to lock new versions**

Run: `npm install`
Expected: completes without errors. `package-lock.json` updated.

- [ ] **Step 3: Verify Lit imports resolve**

Run:
```bash
node --input-type=module -e "import('lit').then(m => console.log(Object.keys(m).slice(0,5).join(',')))"
```
Expected output contains substrings `LitElement`, `html`, `css`. (Order may vary; verify each substring is present in the output line.)

- [ ] **Step 4: Verify the CEM analyzer CLI exists**

Run: `npx custom-elements-manifest --help`
Expected: prints usage banner. The substring `analyze` appears in the output.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Lit 3 and CEM analyzer for web-component foundation"
```

---

## Task 2: Create the jsdom Jest config for WC tests

**Files:**
- Create: `jest-wc.config.cjs`
- Modify: `jest-spec.config.cjs`
- Modify: `package.json`
- Create + delete (within this task): `src/ts/wc/tests/sanity.spec.ts`

- [ ] **Step 1: Write the failing sanity test that proves jsdom is active**

Create `src/ts/wc/tests/sanity.spec.ts`:

```ts
/**
 * @jest-environment jsdom
 */

describe('jsdom environment sanity', () => {

  it('has a document', () => {
    expect(typeof document).toBe('object');
    expect(document.createElement('div').tagName).toBe('DIV');
  });

  it('has customElements', () => {
    expect(typeof customElements).toBe('object');
    expect(typeof customElements.define).toBe('function');
  });

});
```

- [ ] **Step 2: Run the test under the (not-yet-existing) WC config to verify it fails because the config does not exist**

Run: `npx jest src/ts/wc/tests/sanity.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: FAIL. Error contains substring `Can't find a root directory` or `jest-wc.config.cjs` not found.

- [ ] **Step 3: Create `jest-wc.config.cjs`**

```js
module.exports = {

  testEnvironment            : 'jsdom',

  coverageProvider           : 'v8',

  moduleFileExtensions       : ['js', 'ts'],
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/wc/tests/"],
  testPathIgnorePatterns     : ["/node_modules/", "\\.claude/worktrees/"],
  testMatch                  : ['<rootDir>/src/ts/wc/**/*.spec.ts'],

  transform                  : { '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript', decorators: true }, target: 'es2020' } }] },

  verbose                    : false,
  collectCoverage            : true,
  coverageDirectory          : "coverage/wc/",

  coverageThreshold : {
    global : {
      branches   : 100,
      functions  : 100,
      lines      : 100,
      statements : 100,
    },
  },

  collectCoverageFrom        : ["src/ts/wc/**/{!(tests),}.{js,ts}"],

  reporters : [
    ['default', {}],
  ],

};
```

- [ ] **Step 4: Run the sanity test under the new config and verify it passes**

Run: `npx jest src/ts/wc/tests/sanity.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: PASS. Both `it` blocks green. Coverage may report 0/0 since no source files exist yet — that is fine for now.

- [ ] **Step 5: Update `jest-spec.config.cjs` to exclude the WC directory**

Open `jest-spec.config.cjs`. Edit the `coveragePathIgnorePatterns` line to append two entries:

```js
coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/tests/", "/src/ts/jssm_viz.ts", "/src/ts/jssm_viz_colors.ts", "/src/ts/wc/", "/src/ts/wc/tests/"],
```

Edit the `testPathIgnorePatterns` line to append the WC tests directory:

```js
testPathIgnorePatterns     : ["/node_modules/", "\\.claude/worktrees/", "/src/ts/wc/tests/"],
```

- [ ] **Step 6: Add the `jest-wc` npm script**

Open `package.json`. In `scripts`, insert immediately after the `jest-spec` line:

```json
"jest-wc": "jest -c jest-wc.config.cjs --color --verbose",
```

Modify the `jest` aggregate script to include `jest-wc`:

```json
"jest": "npm run jest-stoch && npm run jest-spec && npm run jest-wc",
```

- [ ] **Step 7: Run the new `jest-wc` script**

Run: `npm run jest-wc`
Expected: PASS — sanity test runs and passes. Output contains substring `1 passed` or `2 passed`.

- [ ] **Step 8: Delete the scratch sanity test**

```bash
rm src/ts/wc/tests/sanity.spec.ts
```

The sanity test was only there to bootstrap the jsdom config. Real tests in Task 3 replace it.

- [ ] **Step 9: Commit**

```bash
git add jest-wc.config.cjs jest-spec.config.cjs package.json
git commit -m "build: add jsdom Jest config for web-component tests"
```

---

## Task 3: Create the `JssmViz` Lit class skeleton and verify tag registration

**Files:**
- Create: `src/ts/wc/jssm_viz_wc.ts`
- Create: `src/ts/wc/jssm_viz_wc.define.ts`
- Create: `src/ts/wc/tests/jssm_viz_wc.spec.ts`

- [ ] **Step 1: Write the failing test for tag registration**

Create `src/ts/wc/tests/jssm_viz_wc.spec.ts`:

```ts
/**
 * @jest-environment jsdom
 */

import '../jssm_viz_wc.define';
import { JssmViz } from '../jssm_viz_wc';

describe('JssmViz registration', () => {

  it('registers the jssm-viz tag', () => {
    expect(customElements.get('jssm-viz')).toBe(JssmViz);
  });

  it('creates an element with createElement', () => {
    const el = document.createElement('jssm-viz');
    expect(el).toBeInstanceOf(JssmViz);
  });

});
```

- [ ] **Step 2: Run the test and verify it fails because the source files do not exist**

Run: `npx jest src/ts/wc/tests/jssm_viz_wc.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: FAIL. Error contains substring `Cannot find module '../jssm_viz_wc.define'` or similar.

- [ ] **Step 3: Create `src/ts/wc/jssm_viz_wc.ts` with the class (no functional render yet)**

```ts
import { LitElement, html, css, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';

/**
 * Web component that renders a jssm machine as inline SVG.
 *
 * @element jssm-viz
 * @cssproperty [--jssm-viz-min-height=100px] - Minimum height of the rendered SVG container.
 * @fires {CustomEvent<{ message: string; location?: unknown }>} viz-error - Fires when the FSL source fails to parse or render.
 */
export class JssmViz extends LitElement {

  static styles = css`
    :host {
      display: block;
      min-height: var(--jssm-viz-min-height, 100px);
    }
    .container {
      width: 100%;
      height: 100%;
    }
  `;

  /** FSL source to render. */
  @property({ type: String }) fsl = '';

  /** Optional Graphviz layout engine override (e.g. 'dot', 'neato'). */
  @property({ type: String }) engine: string | undefined = undefined;

  @state() private _svg: string = '';

  render(): TemplateResult {
    return html`<div class="container"></div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'jssm-viz': JssmViz;
  }
}
```

Note: no `@customElement` decorator on the class. Registration is the responsibility of the define file (next step) and is the only side-effect entry consumers ever depend on.

- [ ] **Step 4: Create `src/ts/wc/jssm_viz_wc.define.ts`**

```ts
import { JssmViz } from './jssm_viz_wc.js';

if (!customElements.get('jssm-viz')) {
  customElements.define('jssm-viz', JssmViz);
}

export { JssmViz };
```

The `.js` extension on the import is required by the ESM resolution rules used by the build, even though the source is `.ts`. Rollup and SWC both rewrite this correctly.

- [ ] **Step 5: Run the registration test and verify it passes**

Run: `npx jest src/ts/wc/tests/jssm_viz_wc.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: PASS. Both tests green. Output contains substring `2 passed`.

- [ ] **Step 6: Run TypeScript compilation to verify no type errors**

Run: `npm run typescript`
Expected: completes with no errors. Exit code 0.

- [ ] **Step 7: Commit**

```bash
git add src/ts/wc/jssm_viz_wc.ts src/ts/wc/jssm_viz_wc.define.ts src/ts/wc/tests/jssm_viz_wc.spec.ts
git commit -m "feat(wc): scaffold JssmViz Lit element with class/define split"
```

---

## Task 4: `JssmViz` — render SVG when `fsl` property changes

**Files:**
- Modify: `src/ts/wc/jssm_viz_wc.ts`
- Modify: `src/ts/wc/tests/jssm_viz_wc.spec.ts`

- [ ] **Step 1: Add a failing test for SVG rendering on fsl prop change**

Append to `src/ts/wc/tests/jssm_viz_wc.spec.ts`:

```ts
describe('JssmViz rendering', () => {

  it('renders an SVG containing both state names when fsl is set', async () => {
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    el.fsl = 'Off -> On;';
    await (el as any).updateComplete;
    // The component performs async rendering after updateComplete; flush microtasks.
    await new Promise(resolve => setTimeout(resolve, 50));
    await (el as any).updateComplete;

    const tree_html = el.shadowRoot!.innerHTML;
    expect(tree_html).toContain('<svg');
    expect(tree_html).toContain('Off');
    expect(tree_html).toContain('On');

    document.body.removeChild(el);
  });

});
```

- [ ] **Step 2: Run the test and verify it fails because rendering is not yet implemented**

Run: `npx jest src/ts/wc/tests/jssm_viz_wc.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: FAIL. Error message contains substring `Expected substring: "<svg"` or similar.

- [ ] **Step 3: Implement the rendering logic in `JssmViz`**

Replace the body of `src/ts/wc/jssm_viz_wc.ts` with:

```ts
import { LitElement, html, css, TemplateResult, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { fsl_to_svg_string } from '../jssm_viz.js';

/**
 * Web component that renders a jssm machine as inline SVG.
 *
 * @element jssm-viz
 * @cssproperty [--jssm-viz-min-height=100px] - Minimum height of the rendered SVG container.
 * @fires {CustomEvent<{ message: string; location?: unknown }>} viz-error - Fires when the FSL source fails to parse or render.
 */
export class JssmViz extends LitElement {

  static styles = css`
    :host {
      display: block;
      min-height: var(--jssm-viz-min-height, 100px);
    }
    .container {
      width: 100%;
      height: 100%;
    }
  `;

  /** FSL source to render. */
  @property({ type: String }) fsl = '';

  /** Optional Graphviz layout engine override (e.g. 'dot', 'neato'). */
  @property({ type: String }) engine: string | undefined = undefined;

  @state() private _svg: string = '';

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('fsl') || changed.has('engine')) {
      this._renderSvg();
    }
  }

  private async _renderSvg(): Promise<void> {
    const source = this.fsl;
    if (!source) {
      this._svg = '';
      return;
    }
    try {
      const result = await fsl_to_svg_string(source, this.engine ? { engine: this.engine } : undefined);
      // Guard against stale results: only commit if fsl has not changed since this render started.
      if (this.fsl === source) {
        this._svg = result;
      }
    } catch (e: any) {
      this._svg = '';
      this.dispatchEvent(new CustomEvent('viz-error', {
        detail   : { message: String(e?.message ?? e), location: e?.location },
        bubbles  : true,
        composed : true,
      }));
    }
  }

  render(): TemplateResult {
    // SVG content originates from @viz-js/viz (Graphviz WASM), which emits
    // sanitized SVG. unsafeHTML is required because Lit's template-literal
    // interpolation otherwise escapes the markup as text. The directive name
    // makes the trust boundary explicit at the call site.
    return html`<div class="container">${unsafeHTML(this._svg)}</div>`;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'jssm-viz': JssmViz;
  }
}
```

- [ ] **Step 4: Run the rendering test**

Run: `npx jest src/ts/wc/tests/jssm_viz_wc.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: PASS. All three tests green.

- [ ] **Step 5: Run TypeScript compilation**

Run: `npm run typescript`
Expected: completes with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/ts/wc/jssm_viz_wc.ts src/ts/wc/tests/jssm_viz_wc.spec.ts
git commit -m "feat(wc): JssmViz renders SVG on fsl prop change"
```

---

## Task 5: `JssmViz` — `viz-error` event on bad FSL

**Files:**
- Modify: `src/ts/wc/tests/jssm_viz_wc.spec.ts`

(Implementation already present from Task 4; this task adds explicit coverage and locks the contract.)

- [ ] **Step 1: Add a failing test for the `viz-error` event**

Append to the `JssmViz rendering` describe in `src/ts/wc/tests/jssm_viz_wc.spec.ts`:

```ts
  it('fires viz-error when fsl fails to parse', async () => {
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    const errorEvent: Promise<CustomEvent> = new Promise(resolve => {
      el.addEventListener('viz-error', e => resolve(e as CustomEvent), { once: true });
    });

    el.fsl = 'this is not valid fsl !!!';

    const evt = await errorEvent;
    expect(evt.type).toBe('viz-error');
    expect(typeof evt.detail.message).toBe('string');
    expect(evt.detail.message.length).toBeGreaterThan(0);
    expect(evt.bubbles).toBe(true);
    expect(evt.composed).toBe(true);

    document.body.removeChild(el);
  });
```

- [ ] **Step 2: Run the test and verify it passes (implementation already exists from Task 4)**

Run: `npx jest src/ts/wc/tests/jssm_viz_wc.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: PASS.

If it FAILS: this is a real bug. The most likely cause is that `fsl_to_svg_string` does not throw synchronously for malformed input, or the WC swallows the error. Fix `_renderSvg` in `src/ts/wc/jssm_viz_wc.ts` so the throw is caught and the event is dispatched.

- [ ] **Step 3: Commit**

```bash
git add src/ts/wc/tests/jssm_viz_wc.spec.ts
git commit -m "test(wc): cover JssmViz viz-error event for bad fsl"
```

---

## Task 6: `JssmViz` — `engine` prop reaches the renderer

**Files:**
- Modify: `src/ts/wc/tests/jssm_viz_wc.spec.ts`

(Implementation already present from Task 4; this task adds explicit coverage.)

- [ ] **Step 1: Add a failing test for the engine override**

Append to the `JssmViz rendering` describe:

```ts
  it('passes engine override into fsl_to_svg_string', async () => {
    // Strategy: set an obviously-broken engine name and assert that EITHER a
    // viz-error fires (because viz.js rejects the engine) OR the SVG renders
    // anyway (because viz.js silently fell back). Both outcomes prove the
    // engine prop reached the renderer. What we are NOT testing is whether
    // viz.js supports the given engine name.
    const el = document.createElement('jssm-viz');
    document.body.appendChild(el);

    let saw_error = false;
    el.addEventListener('viz-error', () => { saw_error = true; });

    el.fsl    = 'Off -> On;';
    el.engine = 'definitely-not-an-engine';

    await (el as any).updateComplete;
    await new Promise(resolve => setTimeout(resolve, 100));
    await (el as any).updateComplete;

    const tree_html = el.shadowRoot!.innerHTML;
    expect(saw_error || tree_html.includes('<svg')).toBe(true);

    document.body.removeChild(el);
  });
```

- [ ] **Step 2: Run the test and verify it passes**

Run: `npx jest src/ts/wc/tests/jssm_viz_wc.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ts/wc/tests/jssm_viz_wc.spec.ts
git commit -m "test(wc): cover JssmViz engine prop override"
```

---

## Task 7: Configure the CEM analyzer and emit `custom-elements.json`

**Files:**
- Create: `custom-elements-manifest.config.mjs`
- Create: `custom-elements.json` (generated, committed)
- Create: `src/ts/wc/tests/cem.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing CEM presence-and-shape test**

Create `src/ts/wc/tests/cem.spec.ts`:

```ts
/**
 * @jest-environment node
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('custom-elements.json', () => {

  const cem_path = resolve(__dirname, '../../../../custom-elements.json');

  it('exists at the repo root', () => {
    expect(existsSync(cem_path)).toBe(true);
  });

  it('declares the jssm-viz tag', () => {
    const cem = readFileSync(cem_path, 'utf8');
    expect(cem).toContain('"jssm-viz"');
    expect(cem).toContain('JssmViz');
  });

  it('documents the fsl and engine properties', () => {
    const cem = readFileSync(cem_path, 'utf8');
    expect(cem).toContain('"fsl"');
    expect(cem).toContain('"engine"');
  });

  it('documents the viz-error event', () => {
    const cem = readFileSync(cem_path, 'utf8');
    expect(cem).toContain('"viz-error"');
  });

  it('documents the --jssm-viz-min-height CSS property', () => {
    const cem = readFileSync(cem_path, 'utf8');
    expect(cem).toContain('--jssm-viz-min-height');
  });

});
```

- [ ] **Step 2: Run the test and verify it fails (no CEM file yet)**

Run: `npx jest src/ts/wc/tests/cem.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: FAIL. First failure message references `existsSync` returning `false`.

- [ ] **Step 3: Create the CEM analyzer config**

Create `custom-elements-manifest.config.mjs`:

```js
export default {
  globs        : ['src/ts/wc/*.ts'],
  exclude      : ['src/ts/wc/*.define.ts', 'src/ts/wc/tests/**'],
  outdir       : '.',
  litelement   : true,
  dependencies : false,
  packagejson  : false,
};
```

- [ ] **Step 4: Add the `build:cem` npm script**

Open `package.json`. In `scripts`, insert after the `peg` line:

```json
"build:cem": "custom-elements-manifest analyze --config custom-elements-manifest.config.mjs",
```

- [ ] **Step 5: Run the CEM build and inspect the output**

Run: `npm run build:cem`
Expected: completes with no errors. File `custom-elements.json` is created at the repo root.

Verify substring presence:
```bash
node -e "console.log(require('fs').readFileSync('custom-elements.json','utf8').includes('jssm-viz'))"
```
Expected output: `true`.

- [ ] **Step 6: Run the CEM test and verify it passes**

Run: `npx jest src/ts/wc/tests/cem.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: PASS. All five tests green.

If any of the property / event / CSS-property assertions FAIL: the JSDoc in `src/ts/wc/jssm_viz_wc.ts` is missing or malformed. Add or fix the relevant `@property`, `@fires`, or `@cssproperty` tag. Re-run `npm run build:cem` and retry the test.

- [ ] **Step 7: Add `custom-elements.json` to the published `files` array and exports**

Open `package.json`. In `files`, add as the last entry of the array:

```json
"custom-elements.json"
```

In `exports`, after the existing `./viz` entry, add:

```json
"./custom-elements.json": "./custom-elements.json",
```

- [ ] **Step 8: Commit**

```bash
git add custom-elements-manifest.config.mjs custom-elements.json package.json src/ts/wc/tests/cem.spec.ts
git commit -m "build(wc): generate custom-elements.json from CEM analyzer"
```

---

## Task 8: Bundler-friendly Rollup build for `<jssm-viz>`

**Files:**
- Create: `rollup.config.wc.viz.es6.js`
- Create: `src/ts/wc/tests/bundle_shape.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Add a failing test for the built bundler artifact**

Create `src/ts/wc/tests/bundle_shape.spec.ts`:

```ts
/**
 * @jest-environment node
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('dist/wc/viz.js — bundler-friendly build', () => {

  const dist_path = resolve(__dirname, '../../../../dist/wc/viz.js');

  it('exists after running make_wc_viz_es6', () => {
    expect(existsSync(dist_path)).toBe(true);
  });

  it('exports the JssmViz class identifier', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('JssmViz');
  });

  it('contains the jssm-viz tag name string', () => {
    const built = readFileSync(dist_path, 'utf8');
    expect(built).toContain('jssm-viz');
  });

  it('does NOT inline Lit internals (lit is external for bundlers)', () => {
    const built = readFileSync(dist_path, 'utf8');
    // The string "LitElement" must appear, but only as an *import reference*,
    // not as inlined source. We sanity-check by counting occurrences: a
    // bundled-in Lit copy would have many; an externalized one has very few.
    const lit_element_hits = (built.match(/LitElement/g) || []).length;
    expect(lit_element_hits).toBeGreaterThan(0);
    expect(lit_element_hits).toBeLessThan(20);
  });

});
```

- [ ] **Step 2: Run the test and verify it fails (no dist file yet)**

Run: `npx jest src/ts/wc/tests/bundle_shape.spec.ts -c jest-wc.config.cjs --color --verbose`
Expected: FAIL. First assertion failure on `existsSync` returning `false`.

- [ ] **Step 3: Create the Rollup config for the bundler-friendly build**

Create `rollup.config.wc.viz.es6.js`:

```js
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';

const sharedPlugins = [
  nodeResolve({
    mainFields     : ['module', 'main'],
    browser        : true,
    extensions     : ['.js', '.json'],
    preferBuiltins : false
  }),
  commonjs(),
  replace({
    preventAssignment      : true,
    'process.env.NODE_ENV' : JSON.stringify('production')
  })
];

const sharedExternal = [
  'lit',
  'lit/decorators.js',
  'lit/directives/unsafe-html.js',
  '@viz-js/viz',
];

const config = [{

  input: 'dist/es6/wc/jssm_viz_wc.js',

  output: {
    file   : 'dist/wc/viz.js',
    format : 'es',
    name   : 'jssm_viz_wc',
  },

  external : sharedExternal,
  plugins  : sharedPlugins,

}, {

  input: 'dist/es6/wc/jssm_viz_wc.define.js',

  output: {
    file   : 'dist/wc/viz.define.js',
    format : 'es',
    name   : 'jssm_viz_wc_define',
  },

  // The define build externalizes the class build so it imports at runtime
  // rather than inlining — keeps the define module a thin "registration only"
  // wrapper that tree-shaking can keep small.
  external : [...sharedExternal, './jssm_viz_wc.js'],
  plugins  : sharedPlugins,

}];

export default config;
```

This config consumes the TypeScript-compiled output at `dist/es6/wc/jssm_viz_wc.js`. The existing `tsconfig.json` globs the whole `src/ts/` tree, so the `wc/` subdirectory is picked up automatically.

- [ ] **Step 4: Add the `make_wc_viz_es6` npm script and chain it into `make`**

Open `package.json`. In `scripts`, add after `make_viz_es6`:

```json
"make_wc_viz_es6": "rollup -c rollup.config.wc.viz.es6.js",
```

Modify the `make` script. Find this fragment:
```
&& npm run make_viz_iife && npm run make_viz_es6 && npm run make_viz_cjs
```
Replace with:
```
&& npm run make_viz_iife && npm run make_viz_es6 && npm run make_viz_cjs && npm run make_wc_viz_es6
```

- [ ] **Step 5: Ensure `dist/wc/` directory is created during `clean`**

Open `package.json`. Find the `clean` script. The existing version contains:
```
mkdir dist && mkdir docs
```
Replace with:
```
mkdir dist && cd dist && mkdir wc && cd .. && mkdir docs
```

(Per `feedback_windows_cmd_mkdir.md` in memory, the `cd parent && mkdir child && cd ..` pattern is required on Windows cmd because forward-slash compound paths fail there.)

- [ ] **Step 6: Run the build chain and verify dist/wc/viz.js exists**

Run: `npm run clean`
Then: `npm run typescript`
Then: `npm run make_wc_viz_es6`
Expected: completes with no errors. Files `dist/wc/viz.js` and `dist/wc/viz.define.js` are created.

Verify size is reasonable (Lit external → small):
```bash
node -e "console.log(require('fs').statSync('dist/wc/viz.js').size)"
```
Expected: a number less than `20000` (under 20 KB because Lit and viz are externalized).

- [ ] **Step 7: Run the bundle_shape test**

Run: `npx jest src/ts/wc/tests/bundle_shape.spec.ts -c jest-wc.config.cjs --color --verbose -t "bundler-friendly"`
Expected: PASS. All four tests in the `dist/wc/viz.js` describe block green.

- [ ] **Step 8: Commit**

```bash
git add rollup.config.wc.viz.es6.js package.json src/ts/wc/tests/bundle_shape.spec.ts
git commit -m "build(wc): bundler-friendly Rollup config for jssm-viz web component"
```

---

## Task 9: CDN-friendly Rollup build for `<jssm-viz>`

**Files:**
- Create: `rollup.config.wc.viz.cdn.js`
- Modify: `src/ts/wc/tests/bundle_shape.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Add a failing test for the CDN build**

Append to `src/ts/wc/tests/bundle_shape.spec.ts`:

```ts
describe('dist/cdn/viz.js — CDN-friendly build', () => {

  const cdn_path = resolve(__dirname, '../../../../dist/cdn/viz.js');

  it('exists after running make_wc_viz_cdn', () => {
    expect(existsSync(cdn_path)).toBe(true);
  });

  it('contains the jssm-viz tag name string', () => {
    const built = readFileSync(cdn_path, 'utf8');
    expect(built).toContain('jssm-viz');
  });

  it('inlines Lit (no lit imports remain)', () => {
    const built = readFileSync(cdn_path, 'utf8');
    // A truly bundled CDN file should have no bare-specifier imports left.
    expect(built).not.toMatch(/from\s+['"]lit['"]/);
    expect(built).not.toMatch(/from\s+['"]lit\/decorators\.js['"]/);
    expect(built).not.toMatch(/from\s+['"]lit\/directives\/unsafe-html\.js['"]/);
  });

  it('calls customElements.define for jssm-viz', () => {
    const built = readFileSync(cdn_path, 'utf8');
    expect(built).toContain('customElements.define');
  });

});
```

- [ ] **Step 2: Run the test and verify it fails (no CDN file yet)**

Run: `npx jest src/ts/wc/tests/bundle_shape.spec.ts -c jest-wc.config.cjs --color --verbose -t "CDN-friendly"`
Expected: FAIL. First assertion failure on `existsSync` returning `false`.

- [ ] **Step 3: Create the Rollup config for the CDN-friendly build**

Create `rollup.config.wc.viz.cdn.js`:

```js
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';

const config = [{

  input: 'dist/es6/wc/jssm_viz_wc.define.js',

  output: {
    file    : 'dist/cdn/viz.js',
    format  : 'es',
    name    : 'jssm_viz_wc_cdn',
    inlineDynamicImports: true,
  },

  // Lit and its directives are bundled in for the CDN build. @viz-js/viz
  // stays external — its WASM payload is multi-MB; bundling it would balloon
  // the CDN file beyond reason. CDN consumers load @viz-js/viz via an import
  // map alongside the script tag (same pattern as dist/jssm_viz.iife.cjs).
  external : [
    '@viz-js/viz',
  ],

  plugins : [
    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : ['.js', '.json'],
      preferBuiltins : false
    }),
    commonjs(),
    replace({
      preventAssignment      : true,
      'process.env.NODE_ENV' : JSON.stringify('production')
    })
  ]
}];

export default config;
```

- [ ] **Step 4: Ensure `dist/cdn/` directory is created during `clean`**

Open `package.json`. Find the `clean` script (already edited in Task 8). Update the `cd dist && mkdir wc && cd ..` fragment to also create `cdn`:

```
mkdir dist && cd dist && mkdir wc && mkdir cdn && cd .. && mkdir docs
```

- [ ] **Step 5: Add the CDN npm script and chain it into `make`**

Open `package.json`. In `scripts`, after the `make_wc_viz_es6` line, add:

```json
"make_wc_viz_cdn": "rollup -c rollup.config.wc.viz.cdn.js",
```

Modify the `make` script. Find:
```
&& npm run make_wc_viz_es6
```
Replace with:
```
&& npm run make_wc_viz_es6 && npm run make_wc_viz_cdn
```

- [ ] **Step 6: Run the build and verify dist/cdn/viz.js exists**

Run: `npm run clean`
Then: `npm run typescript`
Then: `npm run make_wc_viz_es6`
Then: `npm run make_wc_viz_cdn`
Expected: completes with no errors. File `dist/cdn/viz.js` is created.

Inspect size:
```bash
node -e "console.log(require('fs').statSync('dist/cdn/viz.js').size)"
```
Expected: between 20000 and 200000 bytes (Lit inlined; viz.js still external).

- [ ] **Step 7: Run the CDN bundle_shape test**

Run: `npx jest src/ts/wc/tests/bundle_shape.spec.ts -c jest-wc.config.cjs --color --verbose -t "CDN-friendly"`
Expected: PASS. All four CDN tests green.

- [ ] **Step 8: Commit**

```bash
git add rollup.config.wc.viz.cdn.js package.json src/ts/wc/tests/bundle_shape.spec.ts
git commit -m "build(wc): CDN-friendly Rollup config for jssm-viz web component"
```

---

## Task 10: Wire `dist/wc/*` and `dist/cdn/*` into `exports` and `files`

**Files:**
- Modify: `package.json`
- Modify: `src/ts/wc/tests/bundle_shape.spec.ts`

- [ ] **Step 1: Add a failing test for the exports map and files array**

Append to `src/ts/wc/tests/bundle_shape.spec.ts`:

```ts
describe('package.json exposure', () => {

  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../../../package.json'), 'utf8'));

  it('exposes the wc/viz subpath', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./wc/viz');
    expect(json).toContain('./dist/wc/viz.js');
  });

  it('exposes the wc/viz/define subpath', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./wc/viz/define');
    expect(json).toContain('./dist/wc/viz.define.js');
  });

  it('exposes the cdn/viz subpath', () => {
    const json = JSON.stringify(pkg.exports);
    expect(json).toContain('./cdn/viz');
    expect(json).toContain('./dist/cdn/viz.js');
  });

  it('declares the sideEffects whitelist', () => {
    expect(Array.isArray(pkg.sideEffects)).toBe(true);
    const json = JSON.stringify(pkg.sideEffects);
    expect(json).toContain('*.define.js');
    expect(json).toContain('dist/cdn');
  });

  it('declares lit as an optional peer', () => {
    expect(pkg.peerDependencies?.lit).toBeDefined();
    expect(pkg.peerDependenciesMeta?.lit?.optional).toBe(true);
  });

  it('lists the new wc and cdn dist files for publication', () => {
    const json = JSON.stringify(pkg.files);
    expect(json).toContain('dist/wc/viz.js');
    expect(json).toContain('dist/wc/viz.define.js');
    expect(json).toContain('dist/cdn/viz.js');
    expect(json).toContain('custom-elements.json');
  });

});
```

- [ ] **Step 2: Run the tests and verify they fail (exports and files not yet wired)**

Run: `npx jest src/ts/wc/tests/bundle_shape.spec.ts -c jest-wc.config.cjs --color --verbose -t "package.json exposure"`
Expected: FAIL on the first three tests (subpath assertions); the sideEffects / peer / custom-elements.json assertions may already pass from Task 1 and Task 7.

- [ ] **Step 3: Edit `package.json` exports**

In the `exports` block, add after the existing `./viz` entry:

```json
"./wc/viz": {
  "import": "./dist/wc/viz.js",
  "default": "./dist/wc/viz.js"
},
"./wc/viz/define": {
  "import": "./dist/wc/viz.define.js",
  "default": "./dist/wc/viz.define.js"
},
"./cdn/viz": "./dist/cdn/viz.js",
```

(`./custom-elements.json` was already added in Task 7.)

- [ ] **Step 4: Edit `package.json` files array**

In `files`, add these entries (existing alphabetical order is cosmetic; insertion point does not matter):

```json
"dist/wc/viz.js",
"dist/wc/viz.define.js",
"dist/cdn/viz.js",
```

- [ ] **Step 5: Run the exposure tests and verify they pass**

Run: `npx jest src/ts/wc/tests/bundle_shape.spec.ts -c jest-wc.config.cjs --color --verbose -t "package.json exposure"`
Expected: PASS. All six tests green.

- [ ] **Step 6: Commit**

```bash
git add package.json src/ts/wc/tests/bundle_shape.spec.ts
git commit -m "build(wc): wire wc/viz and cdn/viz subpath exports"
```

---

## Task 11: Documentation

**Files:**
- Create: `src/doc_md/WebComponents.md`
- Modify: `src/doc_md/DocLandingPage.md`
- Modify: `base_README.md`

- [ ] **Step 1: Create `src/doc_md/WebComponents.md`**

```markdown
# Web Components

`jssm` exposes web-component versions of its visualization layer for direct use in plain HTML or for wrapping by any framework. This page covers the first shipped widget, `<jssm-viz>`. Additional widgets (`<jssm-editor>`, `<jssm-playground>`) follow in later releases.

## Quick start — CDN

For static HTML pages with no build step:

```html
<script type="importmap">
  { "imports": { "@viz-js/viz": "https://cdn.jsdelivr.net/npm/@viz-js/viz@3/lib/viz-standalone.mjs" } }
</script>
<script type="module" src="https://cdn.jsdelivr.net/npm/jssm/dist/cdn/viz.js"></script>

<jssm-viz fsl="Off -> On -> Off;"></jssm-viz>
```

The import map is required so that `<jssm-viz>`'s dynamic import of `@viz-js/viz` resolves in the browser. Hosting providers other than jsDelivr work identically — substitute the base URL.

## Quick start — npm

```bash
npm install jssm lit
```

Side-effect import that registers the tag:

```ts
import 'jssm/wc/viz/define';
```

Then anywhere in your markup:

```html
<jssm-viz fsl="Off -> On -> Off;"></jssm-viz>
```

## Class export — rename or subclass

To register the class under a different tag name, or to subclass it:

```ts
import { JssmViz } from 'jssm/wc/viz';
import { css } from 'lit';

customElements.define('my-fsl-viz', class extends JssmViz {
  static styles = [
    super.styles,
    css`:host { background: #111; }`,
  ];
});
```

The class export has no side effects — importing it does not register any tag.

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `fsl` | `string` | `''` | FSL source to render. Changing this re-renders the SVG. |
| `engine` | `string \| undefined` | `undefined` | Optional Graphviz layout engine override (e.g. `'dot'`, `'neato'`, `'circo'`). |

## Events

| Event | Detail | Description |
|---|---|---|
| `viz-error` | `{ message: string; location?: unknown }` | Fired when the FSL source fails to parse or render. Bubbles and crosses shadow boundaries. |

## CSS custom properties

| Property | Default | Description |
|---|---|---|
| `--jssm-viz-min-height` | `100px` | Minimum height of the rendered SVG container. |

## See also

- `jssm/viz` headless API — same rendering pipeline, no shadow DOM. Use when wiring SVG into a custom layout.
- `custom-elements.json` at the package root — full programmatic description of every web component for use by framework-wrapper generators.
```

- [ ] **Step 2: Link from the doc landing page**

Open `src/doc_md/DocLandingPage.md`. Add a link to `WebComponents.md` near the existing Visualization link. If a clear topics list exists, insert there; otherwise append at the end:

```markdown
- [Web Components](WebComponents.md) — Lit-based reusable widgets (`<jssm-viz>` etc.)
```

- [ ] **Step 3: Add a Web Components section to base_README.md**

Open `base_README.md`. Search for the existing Visualization section. Immediately after it, insert:

```markdown
## Web Components

`jssm` ships Lit-based web components for use in plain HTML or as a base for framework wrappers.

CDN one-liner (with an import map for `@viz-js/viz`):

\`\`\`html
<script type="module" src="https://cdn.jsdelivr.net/npm/jssm/dist/cdn/viz.js"></script>
<jssm-viz fsl="Off -> On -> Off;"></jssm-viz>
\`\`\`

npm one-liner:

\`\`\`ts
import 'jssm/wc/viz/define';
// then use <jssm-viz fsl="..."> anywhere
\`\`\`

Full documentation: [src/doc_md/WebComponents.md](src/doc_md/WebComponents.md).
```

If `base_README.md` does not yet have a Visualization section, insert this Web Components section before the API Reference / TypeDoc section instead. Replace the escaped triple-backticks above (`\`\`\``) with actual triple-backticks when writing the file.

- [ ] **Step 4: Commit**

```bash
git add src/doc_md/WebComponents.md src/doc_md/DocLandingPage.md base_README.md
git commit -m "docs(wc): user-facing guide for jssm-viz web component"
```

---

## Task 12: Full-pipeline smoke — `make` + all tests green

**Files:**
- No new files. Final cross-check.

- [ ] **Step 1: Run the full clean build**

Run: `npm run clean`
Then: `npm run make`
Expected: completes with no errors. All existing artifacts (`dist/jssm.es5.cjs`, `dist/jssm.es6.mjs`, `dist/jssm_viz.cjs`, etc.) AND the new ones (`dist/wc/viz.js`, `dist/wc/viz.define.js`, `dist/cdn/viz.js`, `custom-elements.json`) exist.

Verify:
```bash
node -e "const fs=require('fs'); for (const f of ['dist/wc/viz.js','dist/wc/viz.define.js','dist/cdn/viz.js','custom-elements.json']) console.log(f, fs.existsSync(f))"
```
Expected: each line ends with `true`.

- [ ] **Step 2: Run all Jest suites**

Run: `npm run jest`
Expected: completes with no errors. Output indicates `jest-spec`, `jest-stoch`, and `jest-wc` all ran. The WC suite contains the substring `4 passed` (registration + rendering + error + engine) plus the bundle_shape and CEM tests.

- [ ] **Step 3: Run TypeScript compilation one last time**

Run: `npm run typescript`
Expected: exits 0. No type errors.

- [ ] **Step 4: Run the existing audit / lint**

Run: `npm run vet`
Expected: completes. If audit flags new files for TODO / CHECKME / FIXME markers, address them before commit.

- [ ] **Step 5: Inspect the WC bundle sizes for sanity**

Run:
```bash
node -e "const fs=require('fs'); for (const f of ['dist/wc/viz.js','dist/wc/viz.define.js','dist/cdn/viz.js']) console.log(f, fs.statSync(f).size, 'bytes')"
```
Expected rough thresholds:
- `dist/wc/viz.js` should be < 20 KB (Lit external, just the component).
- `dist/wc/viz.define.js` should be < 2 KB (essentially a one-liner register).
- `dist/cdn/viz.js` should be < 200 KB (Lit inlined; `@viz-js/viz` still external).

If `dist/cdn/viz.js` is over 200 KB, inspect with:
```bash
node -e "const c = require('fs').readFileSync('dist/cdn/viz.js','utf8'); console.log('size:', c.length, 'lit_hits:', (c.match(/LitElement/g)||[]).length, 'viz_hits:', (c.match(/@viz-js\/viz/g)||[]).length)"
```
A high `viz_hits` count means `@viz-js/viz` was accidentally inlined — check the `external` array in `rollup.config.wc.viz.cdn.js`.

- [ ] **Step 6: Commit any cleanups**

If audit / lint fixes or comment cleanups were needed during this task:

```bash
git add -u
git commit -m "chore: cleanup before WC foundation ship"
```

If no changes are needed, skip this commit step.

- [ ] **Step 7: Final readiness check**

Run: `git status`
Expected: clean working tree on the feature branch.

Run: `git log --oneline -20`
Expected: a contiguous sequence of commits prefixed `chore:`, `feat(wc):`, `build(wc):`, `test(wc):`, `docs(wc):` representing this plan's work.

The branch is now ready for `/sc-commit` to ship as 5.113.0.

---

## Self-review notes (recorded during plan authoring)

- **Spec coverage:** Plan covers every in-scope item of the spec for the WC tier and the `<jssm-viz>` widget. `<jssm-editor>`, `<jssm-playground>`, framework wrappers, and Angular shim are explicitly deferred and listed under "Out of scope" at the top of this plan.
- **Test approach:** All assertions are substring-based; no golden files or snapshot matchers anywhere. The `bundle_shape.spec.ts` `LitElement` hit-count check (`< 20`) is intentionally a band, not an exact match, per the no-golden-files preference.
- **HTML injection:** All raw SVG injection in the Lit component goes through `unsafeHTML` from `lit/directives/unsafe-html.js`. The directive name communicates the trust boundary at the call site; the trust source is `@viz-js/viz` output.
- **Class/define split:** No `@customElement` decorator on the class. Registration lives only in `*.define.ts`. The `sideEffects` whitelist names only the `*.define.js` files and the `dist/cdn/**` bundle path, so the class import is provably side-effect-free for bundlers.
- **Verification of generated CEM:** Task 7's tests assert structural presence of substrings (`"jssm-viz"`, `"fsl"`, `"engine"`, `"viz-error"`, `--jssm-viz-min-height`) — not whole-document equality. Substring-assertion pattern applied to generator output, as agreed.
- **Directory creation on Windows:** Tasks 8 and 9 update the `clean` script using the `cd parent && mkdir child && cd ..` idiom per `feedback_windows_cmd_mkdir.md`, matching the existing `coverage/cloc` pattern.
- **No version bumps in this plan.** Final commit lands at "ready to ship 5.113.0." `/sc-commit` handles the actual bump per `CLAUDE.md`.
