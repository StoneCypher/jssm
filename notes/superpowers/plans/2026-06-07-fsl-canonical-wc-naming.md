# `fsl-*` Canonical Web-Component Naming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `fsl-*` the canonical custom-element tags and `Fsl*` the canonical exported classes across all six web components, with `jssm-*` / `Jssm*` retained as non-breaking aliases.

**Architecture:** Each registered component's canonical class holds the implementation (`FslViz`); the alias is a thin subclass (`class JssmViz extends FslViz {}`), registered via a shared `define_with_synonym` helper. Cross-component discovery/binding is made prefix-agnostic (matches `fsl-` or `jssm-`) via a shared tag helper. Source files rename `jssm_*_wc.ts` → `fsl_*_wc.ts`; rollup input paths follow. Subpaths and `dist/` output names are unchanged.

**Tech Stack:** TypeScript, Lit 3, Rollup, Vitest (jsdom), `@custom-elements-manifest/analyzer`.

**Reference spec:** `notes/superpowers/specs/2026-06-07-fsl-canonical-wc-naming-design.md`

**Conventions:**
- Run WC tests: `npx vitest run --config vitest.spec.config.ts <file> --coverage.enabled=false`.
- Each renamed file: use `git mv` so history follows, then edit.
- After edits: `npm run typescript` to catch TS errors before committing.
- Both prefixes must register and bind; keep explicit `jssm-*` synonym coverage in every component's tests.
- No golden/snapshot tests; substring assertions only.

---

## Task 1: Shared helpers — `define_with_synonym` + prefix-agnostic tag matching

**Files:**
- Create: `src/ts/wc/wc_tag_helpers.ts`
- Create: `src/ts/wc/tests/wc_tag_helpers.spec.ts`

- [ ] **Step 1: Write failing tests** (`src/ts/wc/tests/wc_tag_helpers.spec.ts`, `// @vitest-environment jsdom`)

```ts
/**
 * @vitest-environment jsdom
 */
import { wc_suffix_matches, closest_wc, define_with_synonym } from '../wc_tag_helpers';

describe('wc_suffix_matches', () => {
  it('matches both fsl- and jssm- prefixes for a suffix', () => {
    expect(wc_suffix_matches('FSL-VIZ', 'viz')).toBe(true);
    expect(wc_suffix_matches('jssm-viz', 'viz')).toBe(true);
    expect(wc_suffix_matches('div', 'viz')).toBe(false);
    expect(wc_suffix_matches('fsl-vizard', 'viz')).toBe(false);
  });
});

describe('closest_wc', () => {
  it('finds the nearest ancestor with either prefix for a suffix', () => {
    document.body.innerHTML = '<fsl-instance><div id="k"></div></fsl-instance>';
    const k = document.getElementById('k')!;
    expect(closest_wc(k, 'instance')?.tagName.toLowerCase()).toBe('fsl-instance');
    document.body.innerHTML = '<jssm-instance><span id="j"></span></jssm-instance>';
    const j = document.getElementById('j')!;
    expect(closest_wc(j, 'instance')?.tagName.toLowerCase()).toBe('jssm-instance');
  });
});

describe('define_with_synonym', () => {
  it('registers both tags with distinct constructors', () => {
    class A extends HTMLElement {}
    class B extends A {}
    define_with_synonym('fsl-twosyn-x', 'jssm-twosyn-x', A, B);
    expect(customElements.get('fsl-twosyn-x')).toBe(A);
    expect(customElements.get('jssm-twosyn-x')).toBe(B);
  });
  it('is idempotent (guards on customElements.get)', () => {
    class A extends HTMLElement {}
    class B extends A {}
    define_with_synonym('fsl-twosyn-y', 'jssm-twosyn-y', A, B);
    expect(() => define_with_synonym('fsl-twosyn-y', 'jssm-twosyn-y', A, B)).not.toThrow();
    expect(customElements.get('fsl-twosyn-y')).toBe(A);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run --config vitest.spec.config.ts src/ts/wc/tests/wc_tag_helpers.spec.ts --coverage.enabled=false` → FAIL (module not found).

- [ ] **Step 3: Implement** (`src/ts/wc/wc_tag_helpers.ts`)

```ts
/**
 * Shared helpers for the dual-prefix (`fsl-` canonical, `jssm-` synonym)
 * web-component naming convention.  Centralizes the "match either prefix"
 * rule so it lives in exactly one place.
 */

/** True when `tag_name` is `fsl-<suffix>` or `jssm-<suffix>` (case-insensitive). */
export function wc_suffix_matches(tag_name: string, suffix: string): boolean {
  const lower = tag_name.toLowerCase();
  return lower === `fsl-${suffix}` || lower === `jssm-${suffix}`;
}

/** Nearest ancestor (or self) whose tag is `fsl-<suffix>` or `jssm-<suffix>`. */
export function closest_wc(el: Element, suffix: string): Element | null {
  return el.closest(`fsl-${suffix}, jssm-${suffix}`);
}

/**
 * Register a canonical tag and its synonym tag.  `customElements.define`
 * requires a distinct constructor per tag, so callers pass the canonical
 * class and a thin subclass for the synonym.  Idempotent via
 * `customElements.get` guards.
 */
export function define_with_synonym(
  canonical_tag : string,
  synonym_tag   : string,
  CanonicalClass: CustomElementConstructor,
  SynonymClass  : CustomElementConstructor,
): void {
  if (!customElements.get(canonical_tag)) customElements.define(canonical_tag, CanonicalClass);
  if (!customElements.get(synonym_tag))   customElements.define(synonym_tag,   SynonymClass);
}
```

- [ ] **Step 4: Run, verify pass.** **Step 5: Commit** `feat(wc): add dual-prefix tag helpers (define_with_synonym, closest_wc)`.

---

## Task 2: `viz` — rename + flip canonical to `FslViz` / `fsl-viz`

**Files:**
- Rename: `src/ts/wc/jssm_viz_wc.ts` → `src/ts/wc/fsl_viz_wc.ts`
- Rename: `src/ts/wc/jssm_viz_wc.define.ts` → `src/ts/wc/fsl_viz_wc.define.ts`
- Rename: `src/ts/wc/tests/jssm_viz_wc.spec.ts` → `src/ts/wc/tests/fsl_viz_wc.spec.ts`

- [ ] **Step 1: `git mv` the three files** to their `fsl_*` names.

- [ ] **Step 2: Flip the class in `fsl_viz_wc.ts`** — rename `export class JssmViz` → `export class FslViz`; update the `@element jssm-viz` JSDoc → `@element fsl-viz`; update `HTMLElementTagNameMap` to `'fsl-viz': FslViz;` (keep `'jssm-viz'` too). Replace the wiring (around the old line 151/169): `this.closest('jssm-instance')` → `closest_wc(this, 'instance')` and `customElements.whenDefined('jssm-instance')` → `customElements.whenDefined('fsl-instance')`; import `closest_wc` from `./wc_tag_helpers.js`. Update the `console.warn` text from `<jssm-viz>` → `<fsl-viz>`. Update the internal type `JssmInstanceHost` import path if it changes (see Task 3).

- [ ] **Step 3: Flip `fsl_viz_wc.define.ts`** to:

```ts
import { FslViz } from './fsl_viz_wc.js';
import { define_with_synonym } from './wc_tag_helpers.js';

/** Thin subclass so `<jssm-viz>` can register under a distinct constructor. */
class JssmViz extends FslViz {}

define_with_synonym('fsl-viz', 'jssm-viz', FslViz, JssmViz);

declare global {
  interface HTMLElementTagNameMap {
    'jssm-viz': JssmViz;
  }
}

export { FslViz, JssmViz };
```

- [ ] **Step 4: Update `fsl_viz_wc.spec.ts`** — import `{ FslViz, JssmViz }` from `'../fsl_viz_wc.define'`; flip the primary registration/`createElement`/`customElements.get` assertions to `fsl-viz`/`FslViz`; keep the existing `jssm-viz` synonym tests (now asserting it's the alias). Add a test: `<jssm-viz>` nested inside `<fsl-instance>` binds and rerenders (mixed-prefix). Keep `// @vitest-environment jsdom`.

- [ ] **Step 5:** `npm run typescript` (expect 0 errors) → `npx vitest run --config vitest.spec.config.ts src/ts/wc/tests/fsl_viz_wc.spec.ts --coverage.enabled=false` (PASS). Note: this depends on `fsl-instance` existing (Task 3) for the mixed-prefix test — sequence Task 3 first or mark that one test pending until Task 3 lands.

- [ ] **Step 6: Commit** `refactor(wc): fsl-viz canonical, jssm-viz alias (FslViz/JssmViz)`.

---

## Task 3: `instance` — rename + flip + prefix-agnostic discovery

**Files:**
- Rename: `src/ts/wc/jssm_instance_wc.ts` → `src/ts/wc/fsl_instance_wc.ts`
- Rename: `src/ts/wc/jssm_instance_wc.define.ts` → `src/ts/wc/fsl_instance_wc.define.ts`
- Rename: `src/ts/wc/tests/jssm_instance_wc.spec.ts` → `src/ts/wc/tests/fsl_instance_wc.spec.ts`

- [ ] **Step 1: `git mv` the three files.**

- [ ] **Step 2: Flip the class** — `export class JssmInstance` → `export class FslInstance`; `@element jssm-instance` → `@element fsl-instance`; `HTMLElementTagNameMap` `'fsl-instance': FslInstance;` (keep `'jssm-instance'`). Update internal error strings `jssm-instance: …` → `fsl-instance: …`. Export any host type (e.g. `JssmInstanceHost`) under both old and new names if other files import it (`export type { FslInstanceHost, FslInstanceHost as JssmInstanceHost }`).

- [ ] **Step 3: Make discovery prefix-agnostic** in `resolve_fsl_source` and child-discovery: replace `n.tagName.toLowerCase().startsWith('jssm-')` with a check matching both `fsl-` and `jssm-` companion prefixes (import a helper or inline `const t = n.tagName.toLowerCase(); if (t.startsWith('fsl-') || t.startsWith('jssm-'))`). Replace `closest('jssm-action')` → `closest_wc(el, 'action')`. Replace any other hardcoded `jssm-<suffix>` selectors (`querySelectorAll`/`closest`) used for hook/on/action discovery with both-prefix selectors (`'fsl-on, jssm-on'`, etc.). Import helpers from `./wc_tag_helpers.js`.

- [ ] **Step 4: Flip `fsl_instance_wc.define.ts`:**

```ts
import { FslInstance } from './fsl_instance_wc.js';
import { define_with_synonym } from './wc_tag_helpers.js';

class JssmInstance extends FslInstance {}

define_with_synonym('fsl-instance', 'jssm-instance', FslInstance, JssmInstance);

declare global {
  interface HTMLElementTagNameMap {
    'jssm-instance': JssmInstance;
  }
}

export { FslInstance, JssmInstance };
```

- [ ] **Step 5: Update `fsl_instance_wc.spec.ts`** — flip primary to `fsl-instance`/`FslInstance`; keep `jssm-instance` synonym coverage; add a mixed-prefix discovery test (a `<jssm-on>`/`<fsl-on>` child discovered under an `<fsl-instance>`).

- [ ] **Step 6:** `npm run typescript` → run the instance spec → PASS. **Step 7: Commit** `refactor(wc): fsl-instance canonical + prefix-agnostic child discovery`.

---

## Task 4: `bind` — rename + flip

**Files:**
- Rename: `src/ts/wc/jssm_bind_wc.ts` → `src/ts/wc/fsl_bind_wc.ts`
- Rename: `src/ts/wc/jssm_bind_wc.define.ts` → `src/ts/wc/fsl_bind_wc.define.ts`
- Rename: `src/ts/wc/tests/jssm_bind.spec.ts` → `src/ts/wc/tests/fsl_bind.spec.ts`

- [ ] **Step 1: `git mv`.** **Step 2:** flip class `JssmBind` → `FslBind`, `@element fsl-bind`, `HTMLElementTagNameMap 'fsl-bind'` (keep `'jssm-bind'`); fix any `jssm-bind` strings; make any `closest`/discovery prefix-agnostic via `wc_tag_helpers`. **Step 3:** flip `.define.ts` to the `define_with_synonym('fsl-bind','jssm-bind', FslBind, JssmBind)` pattern (mirror Task 2 Step 3). **Step 4:** update spec — primary `fsl-bind`, keep `jssm-bind` coverage. **Step 5:** `npm run typescript` → run spec → PASS. **Step 6: Commit** `refactor(wc): fsl-bind canonical, jssm-bind alias`.

---

## Task 5: `hook` — rename + flip class

**Files:**
- Rename: `src/ts/wc/jssm_hook_wc.ts` → `src/ts/wc/fsl_hook_wc.ts`
- Rename: `src/ts/wc/tests/jssm_hook.spec.ts` → `src/ts/wc/tests/fsl_hook.spec.ts`

- [ ] **Step 1: `git mv`.** **Step 2:** flip the exported class `JssmHook` → `FslHook` (keep `export { FslHook, FslHook as JssmHook }` if it was exported); update tag references `jssm-hook` → `fsl-hook` in logic/strings; ensure discovery comparisons accept both prefixes (`fsl-hook`/`jssm-hook`) via `wc_tag_helpers`. If `jssm-hook` is registered anywhere, register `fsl-hook` as canonical via `define_with_synonym`; if it's a declarative inert tag, no registration — just discovery + docs. **Step 3:** update spec — primary `fsl-hook`, keep `jssm-hook` coverage (both discovered by instance). **Step 4:** `npm run typescript` → run spec → PASS. **Step 5: Commit** `refactor(wc): fsl-hook canonical, jssm-hook alias`.

---

## Task 6: `on` + `action` declarative tags

**Files:**
- Rename: `src/ts/wc/tests/jssm_on.spec.ts` → `src/ts/wc/tests/fsl_on.spec.ts`
- Rename: `src/ts/wc/tests/jssm_action.spec.ts` → `src/ts/wc/tests/fsl_action.spec.ts`

These tags are discovered by `<fsl-instance>` (handled prefix-agnostically in Task 3); they have no standalone class/define files.

- [ ] **Step 1: `git mv` the two specs.** **Step 2:** flip primary assertions to `fsl-on` / `fsl-action`; keep `jssm-on` / `jssm-action` synonym coverage; add a mixed-prefix case each. **Step 3:** `npm run typescript` → run both specs → PASS. **Step 4: Commit** `refactor(wc): fsl-on / fsl-action canonical declarative tags`.

---

## Task 7: Rollup WC config input paths

**Files:**
- Modify: `rollup.config.wc.viz.es6.js`, `rollup.config.wc.viz.cdn.js`, `rollup.config.wc.instance.es6.js`, `rollup.config.wc.instance.cdn.js`

- [ ] **Step 1:** In each, change the `input` from `dist/es6/wc/jssm_viz_wc.js` / `...jssm_viz_wc.define.js` (and instance equivalents) → `fsl_viz_wc.js` / `fsl_viz_wc.define.js` / `fsl_instance_wc.js` / `fsl_instance_wc.define.js`. **Output filenames stay** (`dist/wc/viz.js`, `dist/cdn/viz.js`, `dist/wc/instance.js`, `dist/cdn/instance.js`).
- [ ] **Step 2:** `npm run make_ci` (builds the wc bundles from the renamed sources) → expect success; `dist/wc/viz.js` etc. produced. **Step 3: Commit** `build(wc): point rollup wc configs at renamed fsl_*_wc sources`.

---

## Task 8: CEM regeneration + `cem.spec.ts`

**Files:**
- Modify: `src/ts/wc/tests/cem.spec.ts`
- Regenerate: `custom-elements.json`

- [ ] **Step 1:** Run `npm run build:cem`; confirm `custom-elements.json` now lists `"fsl-viz"`, `"fsl-instance"` (canonical, from `@element`). **Step 2:** Update `cem.spec.ts` — assert the `fsl-*` canonical tag names are present (and that `jssm-*` aliases still appear in the bundles where relevant). **Step 3:** run `cem.spec.ts` → PASS. **Step 4: Commit** `build(wc): regenerate CEM with fsl-* canonical names`.

---

## Task 9: `bundle_shape.spec.ts`

**Files:**
- Modify: `src/ts/wc/tests/bundle_shape.spec.ts`

- [ ] **Step 1:** Update assertions so both `fsl-viz`/`jssm-viz` and `fsl-instance`/`jssm-instance` are asserted present in `dist/wc/*` and `dist/cdn/*` (both registrations survive bundling). Keep the `package.json` exposure assertions (`./dist/wc/viz.js` etc.) unchanged — output names didn't move. **Step 2:** `npm run make_ci` then run `bundle_shape.spec.ts` → PASS. **Step 3: Commit** `test(wc): bundle_shape asserts both fsl-* and jssm-* survive bundling`.

---

## Task 10: Documentation

**Files:**
- Modify: `src/doc_md/WebComponents.md`, `base_README.md`, `src/doc_md/DocLandingPage.md`

- [ ] **Step 1:** Lead all examples with `fsl-*` tags and `Fsl*` class imports; add a short note: "`jssm-*` tags and `Jssm*` classes are accepted as aliases." Update the import-side-effect lines (`import 'jssm/wc/viz/define'`) — subpaths unchanged, only the in-markup tag examples change (`<fsl-viz>`). **Step 2: Commit** `docs(wc): lead with fsl-* tags, note jssm-* aliases`.

---

## Task 11: Full build + verification

- [ ] **Step 1:** `npm run typescript` → 0 errors.
- [ ] **Step 2:** `npm run make_ci` then `npm run vitest` → all suites pass at 100% spec coverage (the dual-registration paths keep `define_with_synonym` branches covered).
- [ ] **Step 3:** `npm run build` (full) → passes end-to-end (regenerates dist/docs/changelog/readme/cloc/CEM). **Do not bump the version here** — `/sc-commit` does that.
- [ ] **Step 4:** `git status` clean except intended changes. Ready for `/sc-commit` → PR → land.

---

## Self-review notes

- **Spec coverage:** mechanism (Task 1), prefix-agnostic wiring (Tasks 2–3), all six components (Tasks 2–6), CEM (8), rollup inputs (7), tests with synonym coverage (each component task), docs (10), unchanged subpaths/outputs (asserted in 9). Covered.
- **Ordering:** Task 1 → Task 3 (instance, defines `fsl-instance`) → Task 2 (viz, binds to `fsl-instance`) → 4/5/6 (parallel-safe after 1&3) → 7 → 8/9 → 10 → 11. Subagent-driven: run 1 and 3 first; 2/4/5/6 can fan out after; then 7→8/9→10→11.
- **Synonym coverage** retained in every component's tests, which also keeps the helper's branches at 100%.
- **No version bump** in this plan; `/sc-commit` handles it.
