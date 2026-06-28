# Appearance Contract (FSL design tokens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (worktree work runs inline from the main session — subagents can't mutate sibling worktrees). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the shared `--fsl-*` design-token vocabulary every `fsl-*` component reads, so the suite white-labels consistently (embedder sets `--fsl-*` on any ancestor; built-in light/dark defaults otherwise).

**Architecture:** A single Lit `css` fragment, `fslTokens`, that components include in `static styles`. It maps each *public* token (`--fsl-color-surface`, …) onto a *private* resolved var (`--_fsl-surface`, …) via `var(--fsl-color-surface, <default>)`, so resolution is **embedder override → theme default → built-in fallback**. A `[theme="dark"]` host attribute swaps the built-in defaults. Custom properties inherit through shadow DOM, so an embedder's values reach every component with zero JS. `::part` and brand-slot conventions are documented here and declared per-component later.

**Tech Stack:** TypeScript, lit (`css`), vitest (spec suite, jsdom).

## Global Constraints

- New `src/ts/**` code must hit **100% coverage** (`npm run vitest-spec`). A `css` const export has no branches/functions; importing it in a test covers it.
- Run npm from the Bash tool. Iterate single files with `--coverage.enabled=false`; run full `vitest-spec` once at the end for the gate.
- Imports use `.js` extensions (NodeNext).

## File Structure

- `src/ts/wc/fsl_tokens.ts` — exports `fslTokens: CSSResult` (the token fragment) and documents the `::part` / brand-slot conventions in its docblock.
- `src/ts/wc/tests/fsl_tokens.spec.ts` — asserts the fragment's `cssText` defines the public vocabulary (with fallbacks), the dark defaults, and the private resolved vars.

---

### Task 1: The `fslTokens` fragment

**Files:**
- Create: `src/ts/wc/fsl_tokens.ts`
- Test: `src/ts/wc/tests/fsl_tokens.spec.ts`

**Interfaces:**
- Consumes: `css`, `CSSResult` from `lit`.
- Produces: `export const fslTokens: CSSResult`. Public tokens: `--fsl-color-surface`, `--fsl-color-text`, `--fsl-color-accent`, `--fsl-color-border`, `--fsl-color-muted`, `--fsl-font`, `--fsl-font-mono`, `--fsl-radius`, `--fsl-space-1..4`. Private resolved vars: the same names prefixed `--_fsl-` (e.g. `--_fsl-surface`).

- [ ] **Step 1: Write the failing test**

```ts
// src/ts/wc/tests/fsl_tokens.spec.ts
import { describe, it, expect } from 'vitest';
import { fslTokens } from '../fsl_tokens.js';

const css = fslTokens.cssText;

describe('fslTokens appearance contract', () => {
  it('maps each public token through a fallback', () => {
    for (const t of ['--fsl-color-surface', '--fsl-color-text', '--fsl-color-accent',
                     '--fsl-color-border', '--fsl-color-muted', '--fsl-font',
                     '--fsl-font-mono', '--fsl-radius']) {
      expect(css).toContain(`var(${t},`);
    }
  });

  it('provides dark-theme defaults under [theme="dark"]', () => {
    expect(css).toMatch(/:host\(\[theme="dark"\]\)/);
    expect(css).toContain('#1e1e22');   // dark surface default
  });

  it('exposes private resolved vars for components to consume', () => {
    for (const v of ['--_fsl-surface', '--_fsl-text', '--_fsl-accent', '--_fsl-radius']) {
      expect(css).toContain(v);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run vitest-spec -- src/ts/wc/tests/fsl_tokens.spec.ts --coverage.enabled=false`
Expected: FAIL — cannot find module `../fsl_tokens.js`.

- [ ] **Step 3: Write `fsl_tokens.ts`**

```ts
// src/ts/wc/fsl_tokens.ts
import { css, type CSSResult } from 'lit';

/**
 * Shared FSL appearance contract — the `--fsl-*` design-token vocabulary.
 *
 * Components include this in `static styles` and consume the **private**
 * `--_fsl-*` vars, which resolve: embedder's public `--fsl-*` token →
 * `[theme="dark"]` default → built-in light fallback. White-label by setting
 * `--fsl-*` on any ancestor (custom properties inherit through shadow DOM);
 * flip the built-in default with the host's `theme="dark"` attribute.
 *
 * Companion conventions (declared per-component): expose structural elements as
 * `::part(...)` (e.g. `part="toolbar"`, `"gutter"`, `"editor"`) and forward
 * child parts with `exportparts`; chrome components carry brand slots
 * (`<slot name="brand">` / `"logo">`).
 */
export const fslTokens: CSSResult = css`
  :host {
    --_fsl-surface: var(--fsl-color-surface, #ffffff);
    --_fsl-text:    var(--fsl-color-text,    #222222);
    --_fsl-accent:  var(--fsl-color-accent,  #5b9dff);
    --_fsl-border:  var(--fsl-color-border,  #e5e5e5);
    --_fsl-muted:   var(--fsl-color-muted,   #9aa0a6);
    --_fsl-font:      var(--fsl-font,      system-ui, -apple-system, "Segoe UI", sans-serif);
    --_fsl-font-mono: var(--fsl-font-mono, ui-monospace, Consolas, monospace);
    --_fsl-radius:  var(--fsl-radius, 6px);
    --_fsl-space-1: var(--fsl-space-1, 4px);
    --_fsl-space-2: var(--fsl-space-2, 8px);
    --_fsl-space-3: var(--fsl-space-3, 12px);
    --_fsl-space-4: var(--fsl-space-4, 16px);
  }
  :host([theme="dark"]) {
    --_fsl-surface: var(--fsl-color-surface, #1e1e22);
    --_fsl-text:    var(--fsl-color-text,    #d6d6d6);
    --_fsl-accent:  var(--fsl-color-accent,  #82aaff);
    --_fsl-border:  var(--fsl-color-border,  #2a2a2e);
    --_fsl-muted:   var(--fsl-color-muted,   #5a5f66);
  }
`;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run vitest-spec -- src/ts/wc/tests/fsl_tokens.spec.ts --coverage.enabled=false`
Expected: PASS (3 tests).

- [ ] **Step 5: Full coverage gate**

Run: `npm run vitest-spec`
Expected: PASS, 100% coverage (the new module is a single const, fully covered on import).

- [ ] **Step 6: Commit**

```bash
git add src/ts/wc/fsl_tokens.ts src/ts/wc/tests/fsl_tokens.spec.ts
git commit -m "feat(wc): shared --fsl-* appearance-contract design tokens"
```

## Self-Review

- **Spec coverage:** Foundation B (§5 of the design spec — token vocabulary, themed defaults, white-label-by-inheritance) is realized by the `fslTokens` fragment. `::part` / brand-slot conventions are documented in the module's docblock; they're *declared* per-component (Plan 3+), so no standalone task here.
- **Placeholder scan:** none — runnable test + complete module.
- **Type consistency:** `fslTokens: CSSResult` consumed unchanged by components in Plan 3.
