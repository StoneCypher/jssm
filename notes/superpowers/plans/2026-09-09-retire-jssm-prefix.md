# Retire the `jssm-` Web-Component Prefix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every `jssm-` spelling from the web-component surface — synonym tags, child config tags, data attributes, CSS custom properties, class aliases, and error strings — leaving `fsl-` as the only spelling, and record the break.

**Architecture:** The three `*.define.ts` modules drop their `Jssm*` subclasses and register only the canonical tag; `wc_tag_helpers.ts` loses the synonym machinery; the instance host and bind helper read only `fsl-*` child tags and `data-fsl-*` attributes; `<fsl-viz>` exposes `--fsl-viz-*` custom properties. Tests flip from "synonym works" to "synonym is not registered". Docs, help pages, README, and site follow, and the manifest gains an entry.

**Tech Stack:** TypeScript, Lit web components, vitest with jsdom (`npx vitest run --config vitest.spec.config.ts <file> --coverage.enabled=false`), fast-check stoch suites (`vitest.stoch.config.ts`), Playwright e2e (not run locally; edit only).

**Spec:** `notes/superpowers/specs/2026-09-08-v6-landing-program-design.md` (sub-project 3), scope decided 2026-09-09 as "whole prefix": tags, child config tags, data attributes (canonical `data-fsl-*`), CSS custom properties (`--fsl-viz-*`), error strings.

## Global Constraints

- After this plan, `grep -rn "jssm-" src/ts/wc src/ts/e2e src/ts/tests/wc_*.ts` returns only lines that name the npm PACKAGE `jssm-viz` (e.g. `packages/jssm-viz`, "moved to jssm-viz"). Tag names, attribute names, CSS variables, class names, selectors, and error strings never contain `jssm-`.
- Canonical spellings: tags `fsl-viz`, `fsl-instance`, `fsl-bind`, `fsl-on`, `fsl-hook`, `fsl-action`; attributes `data-fsl-action`, `data-fsl-event`, `data-fsl-from-state`, `data-fsl-from-property`, `data-fsl-bind`, `data-fsl-bind-to` (dataset keys `fslAction`, `fslEvent`, `fslFromState`, `fslFromProperty`, `fslBind`, `fslBindTo`); CSS custom properties `--fsl-viz-min-height`, `--fsl-viz-max-height`; classes `FslViz`, `FslInstance`, `FslBind` only.
- Comments and docblocks that mention `jssm-` spellings are rewritten to the canonical spelling or removed; a historical note may say "the jssm- prefix was removed in 6.0".
- The `jssm-` references in `src/ts/jssm_constants.ts`, `jssm_theme.ts`, `jssm_types.ts`, `jssm_viz.ts` refer to the `jssm-viz` package and are out of scope; do not touch them.
- No fake tests, no golden files. A "not registered" assertion must be against the real `customElements` registry after importing the define module.
- Do not run `npm run make`, `npm run build`, or `npm install`. You may run `npx tsc --noEmit -p tsconfig.json`, `npx eslint <files>`, and vitest on single files with coverage disabled.
- One command per tool call. Never chain commands with `&&`, `||`, `;`, a pipe, or a newline.
- Commit with `git add <paths>` then `git commit -m "<conventional commit>"`; never `git add -A`.

---

### Task 1: Remove the prefix from the component sources and their tests

**Files:**
- Modify: `src/ts/wc/fsl_viz_wc.define.ts`, `src/ts/wc/fsl_bind_wc.define.ts`, `src/ts/wc/fsl_instance_wc.define.ts`
- Modify: `src/ts/wc/wc_tag_helpers.ts`
- Modify: `src/ts/wc/fsl_instance_wc.ts` (selectors at ~1004, ~1039, ~1286–1300; dataset reads at ~1291–1294; docblocks at ~587, ~650, ~950, ~986–988, ~1249, ~1258)
- Modify: `src/ts/wc/fsl_bind_wc.ts` (~44, ~92, ~142–146, ~155, ~165, ~172–173, ~186–188, ~198, ~203, ~227, ~261)
- Modify: `src/ts/wc/fsl_hook_wc.ts` (~20, ~55, ~97, ~158, ~167, ~200, ~206, ~221, ~230, ~251, ~260, ~278, ~284)
- Modify: `src/ts/wc/fsl_viz_wc.ts` (~26, ~90, ~96–97, ~105, ~108, ~163, ~208, ~520)
- Modify: `src/ts/wc/fsl_info_panel_wc.ts` (~9, ~37), `src/ts/wc/fsl_effective_properties_wc.ts` (~9, ~24), `src/ts/wc/widgets.define.ts` (~5), the `// New component: canonical fsl-* only` comments in the panel `*.define.ts` files
- Modify tests: `src/ts/wc/tests/wc_tag_helpers.spec.ts`, `fsl_viz_wc.spec.ts`, `fsl_instance_wc.spec.ts`, `fsl_bind.spec.ts`, `fsl_hook.spec.ts`, `fsl_on.spec.ts`, `fsl_action.spec.ts`, `cem.spec.ts`, `bundle_shape.spec.ts`, `fsl_effective_properties_wc.spec.ts`, `fsl_info_panel_wc.spec.ts`; `src/ts/tests/wc_instance.stoch.ts`, `src/ts/tests/wc_bind_hook.stoch.ts`; `src/ts/e2e/viz_sizing.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `wc_tag_helpers.ts` exports only `wc_suffix_matches(tag_name, suffix)` (matches `fsl-<suffix>` only), `closest_wc(el, suffix)` (selector `fsl-<suffix>`), and `define_canonical(tag, Class)`. `define_with_synonym` is deleted. The three define modules export only `FslViz` / `FslBind` / `FslInstance`.

- [ ] **Step 1: Write the failing tests (registration and helpers)**

In `src/ts/wc/tests/wc_tag_helpers.spec.ts` replace the file body with:

```typescript
import { describe, it, expect } from 'vitest';
import { wc_suffix_matches, closest_wc, define_canonical } from '../wc_tag_helpers';

describe('wc_tag_helpers (fsl- only, 6.0)', () => {

  it('matches the fsl- prefix for a suffix, case-insensitively', () => {
    expect(wc_suffix_matches('FSL-VIZ', 'viz')).toBe(true);
    expect(wc_suffix_matches('fsl-viz', 'viz')).toBe(true);
    expect(wc_suffix_matches('fsl-vizard', 'viz')).toBe(false);
    expect(wc_suffix_matches('div', 'viz')).toBe(false);
  });

  it('no longer matches the retired jssm- prefix', () => {
    expect(wc_suffix_matches('jssm-viz', 'viz')).toBe(false);
    expect(wc_suffix_matches('JSSM-INSTANCE', 'instance')).toBe(false);
  });

  it('closest_wc finds an fsl- ancestor and ignores a jssm- one', () => {
    document.body.innerHTML = '<fsl-instance><span id="f"></span></fsl-instance><jssm-instance><span id="j"></span></jssm-instance>';
    const f = document.getElementById('f')!;
    const j = document.getElementById('j')!;
    expect(closest_wc(f, 'instance')?.tagName.toLowerCase()).toBe('fsl-instance');
    expect(closest_wc(j, 'instance')).toBeNull();
  });

  it('define_canonical registers the tag once and is idempotent', () => {
    class A extends HTMLElement {}
    define_canonical('fsl-onesyn-x', A);
    expect(customElements.get('fsl-onesyn-x')).toBe(A);
    expect(() => define_canonical('fsl-onesyn-x', A)).not.toThrow();
    expect(customElements.get('jssm-onesyn-x')).toBeUndefined();
  });

});
```

In `fsl_viz_wc.spec.ts`, `fsl_instance_wc.spec.ts`, and `fsl_bind.spec.ts`, replace every "registers the jssm-… synonym" / "synonym renders identically" / "mixed-prefix" test with one test per define module:

```typescript
  it('does not register the retired jssm-viz tag (removed in 6.0)', () => {
    expect(customElements.get('jssm-viz')).toBeUndefined();
    expect(document.createElement('jssm-viz')).not.toBeInstanceOf(FslViz);
  });
```

(same shape for `jssm-instance` / `FslInstance` and `jssm-bind` / `FslBind`). Delete any import of `JssmViz`, `JssmInstance`, `JssmBind`.

In `fsl_viz_wc.spec.ts` line ~336–340, change the stylesheet assertions to `--fsl-viz-max-height` and `--fsl-viz-min-height`. In `cem.spec.ts` line ~33–35, change to `--fsl-viz-min-height`. In `bundle_shape.spec.ts`, every "contains the jssm-… synonym tag name string" / "calls customElements.define for jssm-…" test becomes its negation: `expect(built).not.toContain('jssm-viz')` (respectively `jssm-instance`), keeping the `fsl-` positive assertions.

In `fsl_instance_wc.spec.ts` (~86–115, ~633–640), `fsl_on.spec.ts`, `fsl_hook.spec.ts`, `fsl_action.spec.ts`, `fsl_bind.spec.ts`, `wc_instance.stoch.ts` (~50, ~79, ~148–155, ~370–375), `wc_bind_hook.stoch.ts` (~179, ~237, ~243, ~300, ~333, ~338): replace every `jssm-on` / `jssm-hook` / `jssm-action` / `jssm-bind` / `jssm-instance` element creation and every `data-jssm-*` attribute with the canonical spelling. Where a test deliberately exercised BOTH prefixes (e.g. `fc.constantFrom('fsl-instance', 'jssm-instance')`), keep only the `fsl-` value. Add one discovery-negative test to `fsl_instance_wc.spec.ts`:

```typescript
  it('ignores retired jssm-on / jssm-hook / jssm-action children (removed in 6.0)', () => {
    const host = document.createElement('fsl-instance') as FslInstance;
    host.setAttribute('fsl', "a 'go' -> b;");
    const on = document.createElement('jssm-on');
    on.setAttribute('event', 'transition');
    on.textContent = 'globalThis.__retired_on_fired = true;';
    host.appendChild(on);
    document.body.appendChild(host);
    (globalThis as any).__retired_on_fired = false;
    host.machine!.action('go');
    expect((globalThis as any).__retired_on_fired).toBe(false);
    host.remove();
  });
```

Adjust the attribute/`textContent` form to whatever `fsl-on` actually uses (read `parse_jssm_on_element` in `fsl_instance_wc.ts`; the point is that the `jssm-on` child is not discovered).

In `src/ts/e2e/viz_sizing.spec.ts` (~12, ~47) rename the custom property to `--fsl-viz-max-height`.

- [ ] **Step 2: Run the touched specs to confirm failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/wc/tests/wc_tag_helpers.spec.ts src/ts/wc/tests/fsl_viz_wc.spec.ts src/ts/wc/tests/fsl_instance_wc.spec.ts src/ts/wc/tests/fsl_bind.spec.ts --coverage.enabled=false`
Expected: FAIL (synonyms are still registered; `define_with_synonym` still imported).

- [ ] **Step 3: Rewrite the helpers**

Replace `src/ts/wc/wc_tag_helpers.ts` with:

```typescript
/**
 * Shared helpers for the `fsl-*` web-component tag convention.  The `jssm-*`
 * synonym prefix was removed in 6.0; every registration and lookup now
 * matches exactly one spelling, so the rule lives in one place.
 */

/**
 * Returns true when `tag_name` is exactly `fsl-<suffix>` (case-insensitive).
 * @param tag_name - The element tag name to test (e.g. `"FSL-VIZ"`).
 * @param suffix   - The suffix to match after the prefix (e.g. `"viz"`).
 * @returns `true` when `tag_name` is `fsl-<suffix>`.
 * @example
 * wc_suffix_matches('FSL-VIZ', 'viz');    // true
 * wc_suffix_matches('jssm-viz', 'viz');   // false — the jssm- prefix was removed in 6.0
 * wc_suffix_matches('fsl-vizard', 'viz'); // false — suffix must match exactly
 */
export function wc_suffix_matches(tag_name: string, suffix: string): boolean {
  return tag_name.toLowerCase() === `fsl-${suffix}`;
}

/**
 * Returns the nearest ancestor of `el` (or `el` itself) whose tag is
 * `fsl-<suffix>`, or `null` if none exists.
 * @param el     - The element to start the search from.
 * @param suffix - The suffix to match (e.g. `"instance"`).
 * @returns The closest matching ancestor element, or `null`.
 * @example
 * // <fsl-instance><div id="k"></div></fsl-instance>
 * closest_wc(document.getElementById('k'), 'instance'); // <fsl-instance>
 * @see wc_suffix_matches
 */
export function closest_wc(el: Element, suffix: string): Element | null {
  return el.closest(`fsl-${suffix}`);
}

/**
 * Registers a canonical `fsl-*` custom-element tag.  Idempotent: skips the
 * `define` call when the tag is already registered.
 * @param canonical_tag - The `fsl-*` tag name (e.g. `"fsl-info-panel"`).
 * @param CanonicalClass - Constructor to register under `canonical_tag`.
 * @example
 * class FslInfoPanel extends HTMLElement {}
 * define_canonical('fsl-info-panel', FslInfoPanel);
 */
export function define_canonical(
  canonical_tag : string,
  CanonicalClass: CustomElementConstructor,
): void {
  if (!customElements.get(canonical_tag)) customElements.define(canonical_tag, CanonicalClass);
}
```

- [ ] **Step 4: Rewrite the three define modules**

`src/ts/wc/fsl_viz_wc.define.ts` becomes:

```typescript
import { FslViz } from './fsl_viz_wc.js';
import { define_canonical } from './wc_tag_helpers.js';

// The `<jssm-viz>` synonym and the `JssmViz` alias were removed in 6.0; the
// only spelling is `<fsl-viz>` / {@link FslViz}.
define_canonical('fsl-viz', FslViz);

export { FslViz } from './fsl_viz_wc.js';
```

Same shape for `fsl_bind_wc.define.ts` (`fsl-bind`, `FslBind`) and `fsl_instance_wc.define.ts` (`fsl-instance`, `FslInstance`). Delete the `declare global { interface HTMLElementTagNameMap { 'jssm-…' } }` blocks; the `fsl-…` map entries live in the component modules (`fsl_viz_wc.ts:~520`, `fsl_bind_wc.ts:~261`) — delete the `'jssm-…'` lines there too.

- [ ] **Step 5: Instance host, bind, hook, viz**

In `fsl_instance_wc.ts`:
- `:scope > fsl-on, :scope > jssm-on` → `:scope > fsl-on`; same for `fsl-hook` and `fsl-action`.
- `[data-jssm-action]` → `[data-fsl-action]`; `el.dataset['jssmEvent']` → `el.dataset['fslEvent']`, `jssmAction` → `fslAction`, `jssmFromState` → `fslFromState`, `jssmFromProperty` → `fslFromProperty`.
- Every docblock/comment mentioning `<jssm-…>` or `data-jssm-…` is rewritten to the `fsl-` spelling; the method `_install_jssm_on_children` and `_discover_jssm_actions` are renamed `_install_fsl_on_children` / `_discover_fsl_actions` (update all call sites; grep for them).

In `fsl_bind_wc.ts`: `[data-jssm-bind]` → `[data-fsl-bind]`; the `data-jssm-bind-to` read → `data-fsl-bind-to` (dataset `fslBindTo`); error strings `<jssm-bind>: …` → `<fsl-bind>: …`; comments likewise.

In `fsl_hook_wc.ts`: every `<jssm-hook …>` in error strings and docblocks → `<fsl-hook …>`; the `//# sourceURL=jssm-hook:` debug id → `fsl-hook:`.

In `fsl_viz_wc.ts`: `--jssm-viz-min-height` / `--jssm-viz-max-height` → `--fsl-viz-min-height` / `--fsl-viz-max-height` in both the `@cssproperty` docs and the stylesheet; docblocks mentioning `<jssm-instance>` → `<fsl-instance>`.

In `fsl_info_panel_wc.ts`, `fsl_effective_properties_wc.ts`, `widgets.define.ts`, and the panel `*.define.ts` comments: rewrite the deprecated-alias sentences to plain `fsl-` statements.

- [ ] **Step 6: Verify no stragglers**

Run: `grep -rn "jssm-\|jssm_on\|jssmAction\|jssmBind\|jssmEvent\|jssmFrom" src/ts/wc src/ts/e2e src/ts/tests/wc_instance.stoch.ts src/ts/tests/wc_bind_hook.stoch.ts`
Expected: only lines naming the `jssm-viz` package (in `bundle_shape.spec.ts` around lines 304–402). Anything else is a straggler — fix it.

- [ ] **Step 7: Type-check, lint, run the affected suites**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.
Run: `npx eslint src/ts/wc src/ts/e2e/viz_sizing.spec.ts src/ts/tests/wc_instance.stoch.ts src/ts/tests/wc_bind_hook.stoch.ts`
Expected: clean.
Run: `npx vitest run --config vitest.spec.config.ts src/ts/wc --coverage.enabled=false`
Expected: PASS.
Run: `npx vitest run --config vitest.stoch.config.ts src/ts/tests/wc_instance.stoch.ts src/ts/tests/wc_bind_hook.stoch.ts --coverage.enabled=false`
Expected: PASS.

`bundle_shape.spec.ts` and `cem.spec.ts` read built artifacts (`dist/`, `custom-elements.json`) that only a full build regenerates; if they fail solely because the committed artifacts still contain `jssm-`, say so in the report under concerns — the controller rebuilds before merge. Do not edit `dist/` or `custom-elements.json` by hand.

- [ ] **Step 8: Commit**

```
git add src/ts/wc src/ts/e2e/viz_sizing.spec.ts src/ts/tests/wc_instance.stoch.ts src/ts/tests/wc_bind_hook.stoch.ts
git commit -m "feat(wc)!: retire the jssm- prefix — tags, child tags, data attributes, CSS properties"
```

---

### Task 2: Docs, help pages, README, site, and the manifest entry

**Files:**
- Modify: `src/doc_md/WebComponents.md` (lines ~5, ~40, ~77–78, ~197)
- Modify: `src/doc_md/Environments_Browser.md` (~263)
- Modify: `src/doc_md/DocLandingPage.md` (~185)
- Modify: `src/help/tutorials/wc-viz.md`, `src/help/tutorials/wc-bind.md`, `src/help/tutorials/wc-instance.md`, `src/help/tutorials/wc-panels.md` (grep each for `jssm-`/`data-jssm`)
- Modify: `src/md/README_base.md` (~265)
- Modify: `v6_breaking_changes.json`
- Leave alone: every `jssm-viz-demo` URL and every mention of the `jssm-viz` package.

**Interfaces:** none.

- [ ] **Step 1: WebComponents.md**

Replace the tag-names callout (line ~5) with:

```markdown
> **Tag names:** every component is spelled `fsl-*` (`<fsl-viz>`, class `FslViz`). The `jssm-*` tags, the `Jssm*` class aliases, the `data-jssm-*` attributes, and the `--jssm-viz-*` CSS properties were deprecated in 5.x and **removed in 6.0** — rename them to the `fsl-` spelling (`<jssm-viz>` → `<fsl-viz>`, `data-jssm-action` → `data-fsl-action`, `--jssm-viz-max-height` → `--fsl-viz-max-height`).
```

Delete line ~40 ("The `<jssm-viz>` alias is also accepted…"). Rename the two CSS properties in the table (~77–78). Rewrite the events naming note (~197) to drop the "not a jssm- synonym" clause.

- [ ] **Step 2: The other docs**

`Environments_Browser.md` ~263: replace the bullet with "**`<jssm-viz>` was removed in 6.0** — write `<fsl-viz>`." `DocLandingPage.md` ~185: drop "; `<jssm-viz>` accepted as alias". `README_base.md` ~265: drop "; <jssm-viz> is an accepted alias". In each help tutorial, replace `jssm-` tag/attribute spellings with `fsl-`; where a page teaches the `data-fsl-action` attribute (wc-bind.md already does) leave it, and make sure `wc-instance.md` / `wc-bind.md` show `data-fsl-bind` / `data-fsl-bind-to` / `data-fsl-event` / `data-fsl-from-state` if they show the attribute forms at all.

- [ ] **Step 3: Manifest entry**

Append to the `changes` array in `v6_breaking_changes.json`:

```json
    {
      "id": "wc-jssm-prefix-removed",
      "title": "Web components drop the jssm- prefix entirely",
      "status": "landed",
      "decided": true,
      "issue": null,
      "decision": "Decided 2026-06-22 (fsl-* canonical, jssm-* deprecated, removed in v6); scope widened 2026-09-09 to the whole prefix: tags, child config tags, data attributes, CSS custom properties, class aliases, error strings.",
      "summary": "v6 web components are spelled fsl-* only. The <jssm-viz>, <jssm-instance>, <jssm-bind> synonym tags, the <jssm-on>/<jssm-hook>/<jssm-action> child spellings, the data-jssm-* attributes, the --jssm-viz-* CSS custom properties, and the JssmViz/JssmInstance/JssmBind class aliases are gone.",
      "breaks": "Any page using a jssm-* tag, a data-jssm-* attribute, a --jssm-viz-* CSS property, or importing a Jssm* class from the web-component bundles.",
      "migration": "Rename: <jssm-x> -> <fsl-x>; data-jssm-x -> data-fsl-x; --jssm-viz-x -> --fsl-viz-x; JssmX -> FslX.",
      "implementation": "Landed 2026-09 on the v6 line: define modules register fsl-* only, wc_tag_helpers matches fsl-* only, instance/bind/hook/viz read fsl-* tags and data-fsl-* attributes, tests assert the retired spellings are not registered."
    }
```

- [ ] **Step 4: Verify and commit**

Run: `node -e "JSON.parse(require('fs').readFileSync('v6_breaking_changes.json','utf8'))"`
Expected: no output.
Run: `grep -rn "jssm-viz>\|jssm-instance\|jssm-bind\|data-jssm\|--jssm-viz" src/doc_md src/help src/md src/site`
Expected: only the removal notices written above.

```
git add src/doc_md/WebComponents.md src/doc_md/Environments_Browser.md src/doc_md/DocLandingPage.md src/help/tutorials src/md/README_base.md v6_breaking_changes.json
git commit -m "docs(wc): document the 6.0 removal of the jssm- prefix"
```
