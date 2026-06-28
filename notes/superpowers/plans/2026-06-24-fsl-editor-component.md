# `fsl-editor` Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (worktree work runs inline from the main session). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build `<fsl-editor>` — a reusable CodeMirror-based FSL editor web component (fsl #659): batteries-included (highlighting + linting + semantic overlay + completion, each toggleable), dual-mode (standalone or bound to a parent `<fsl-instance>`), white-labeled via the `--fsl-*` tokens.

**Architecture:** Three layers. (1) **CM adapters** (`editor/cm_adapters.ts`) — pure factories that turn the editor-agnostic service (`fslDiagnostics`/`fslCompletions`/`fslSemanticSpans`) into CodeMirror extensions. (2) **Editor theme** (`editor/cm_theme.ts`) — light/dark CM chrome + highlight, fed by the `--_fsl-*` tokens. (3) **The LitElement** (`fsl_editor_wc.ts`) — mounts an `EditorView` with the adapters behind Compartments, exposes attributes/events, and dual-mode-binds to `<fsl-instance>`. Verified in the spike: CodeMirror mounts and edits in jsdom (tests need `// @vitest-environment jsdom`).

**Tech Stack:** TypeScript, lit, CodeMirror 6 (`@codemirror/{view,state,commands,language,autocomplete,lint}`), jssm language service + `jssm/cm6`, vitest (jsdom).

## Global Constraints

- New `src/ts/**` code: **100% coverage** (`npm run vitest-spec`). wc tests need `// @vitest-environment jsdom` as the first line.
- CodeMirror packages + `lit` are **optional peer deps** (consistent with `jssm/cm6`); also devDeps for build/test.
- New canonical component: `define_canonical('fsl-editor', …)` — **no** `jssm-editor` synonym (new-component policy).
- Imports use `.js` extensions. Run npm from the Bash tool; iterate single files with `--coverage.enabled=false`, full gate at the end.
- The FSL StreamLanguage highlighter is `jssm/cm6` (`src/ts/cm6/fsl_language.ts` → `fsl()`), already in the repo.

## File Structure

- `src/ts/wc/editor/cm_adapters.ts` — `fslLintExtension()`, `fslCompletionExtension()`, `fslOverlayExtension()` (CM extensions from the service).
- `src/ts/wc/editor/cm_theme.ts` — `lightEditorTheme`, `darkEditorTheme` (chrome + highlight), reading `--_fsl-*`.
- `src/ts/wc/fsl_editor_wc.ts` — the `FslEditor` LitElement.
- `src/ts/wc/fsl_editor_wc.define.ts` — `define_canonical('fsl-editor', FslEditor)`.
- Tests: `src/ts/wc/tests/{cm_adapters,fsl_editor_wc}.spec.ts` (jsdom).
- `package.json` — add CM optional peers; exports `./wc/editor`, `./wc/editor/define`.

---

### Task 1: CM adapters (service → CodeMirror extensions)

**Files:**
- Create: `src/ts/wc/editor/cm_adapters.ts`
- Test: `src/ts/wc/tests/cm_adapters.spec.ts`

**Interfaces:**
- Consumes: `fslDiagnostics`, `fslCompletions`, `fslSemanticSpans` from `../../language_service/index.js`; `linter` from `@codemirror/lint`; `autocompletion` from `@codemirror/autocomplete`; `EditorView`, `Decoration`, `ViewPlugin` from `@codemirror/view`; `StateField`, `RangeSetBuilder` from `@codemirror/state`.
- Produces: `fslLintExtension(): Extension`, `fslCompletionExtension(): Extension`, `fslOverlayExtension(): Extension`.

- [ ] **Step 1: Write the failing test**

```ts
// src/ts/wc/tests/cm_adapters.spec.ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { fslOverlayExtension, fslCompletionExtension, fslLintExtension } from '../editor/cm_adapters.js';

function mount(doc: string, ext: import('@codemirror/state').Extension) {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  return new EditorView({ state: EditorState.create({ doc, extensions: [ext] }), parent });
}

describe('fslOverlayExtension', () => {
  it('decorates color values in a state block', () => {
    const view = mount('state s : { color: crimson; };', fslOverlayExtension());
    const marks = view.dom.querySelectorAll('.fsl-color');
    expect(marks.length).toBeGreaterThan(0);
    view.destroy();
  });
});

describe('fslCompletionExtension', () => {
  it('offers color values after a color key', async () => {
    const doc = 'state s : { color: ';
    const view = mount(doc, fslCompletionExtension());
    const ctx = new CompletionContext(view.state, doc.length, true);
    const source = view.state.languageDataAt<(c: CompletionContext) => unknown>('autocomplete', doc.length)[0];
    const result: any = await source(ctx);
    expect(result.options.map((o: any) => o.label)).toContain('Crimson');
    view.destroy();
  });
});

describe('fslLintExtension', () => {
  it('builds without throwing and attaches to a view', () => {
    const view = mount('a -> ;', fslLintExtension());
    expect(view.state.doc.toString()).toBe('a -> ;');
    view.destroy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run vitest-spec -- src/ts/wc/tests/cm_adapters.spec.ts --coverage.enabled=false`
Expected: FAIL — cannot find module `../editor/cm_adapters.js`.

- [ ] **Step 3: Write `cm_adapters.ts`**

```ts
// src/ts/wc/editor/cm_adapters.ts
import { EditorView, Decoration, type DecorationSet, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { type Extension } from '@codemirror/state';
import { linter, type Diagnostic as CmDiagnostic } from '@codemirror/lint';
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { fslDiagnostics, fslCompletions, fslSemanticSpans } from '../../language_service/index.js';

/** Lint extension: maps `fslDiagnostics` to CodeMirror diagnostics. */
export function fslLintExtension(): Extension {
  return linter((view): CmDiagnostic[] =>
    fslDiagnostics(view.state.doc.toString()).map(d => ({
      from: Math.min(d.range.from, view.state.doc.length),
      to:   Math.min(Math.max(d.range.to, d.range.from + 1), view.state.doc.length),
      severity: d.severity === 'error' ? 'error' : d.severity === 'warning' ? 'warning' : 'info',
      message:  d.message,
    })));
}

/** Completion extension: maps `fslCompletions` to a CodeMirror completion source. */
export function fslCompletionExtension(): Extension {
  return autocompletion({
    override: [ (context: CompletionContext): CompletionResult | null => {
      const line = context.state.doc.lineAt(context.pos);
      const before = line.text.slice(0, context.pos - line.from);
      const typed = /([\w-]*)$/.exec(before)?.[1] ?? '';
      const items = fslCompletions(context.state.doc.toString(), context.pos);
      if (!items.length) { return null; }
      return {
        from: context.pos - typed.length,
        options: items.map(i => ({ label: i.label, type: i.kind === 'value-color' ? 'enum' : i.kind, detail: i.detail })),
        validFor: /^[\w-]*$/,
      };
    } ],
  });
}

/** Build the decoration set for the current document from semantic spans. */
function buildOverlay(view: EditorView): DecorationSet {
  const text = view.state.doc.toString();
  const len = view.state.doc.length;
  const decos = fslSemanticSpans(text)
    .filter(s => s.from < s.to && s.to <= len)
    .sort((a, b) => a.from - b.from)
    .map(s => Decoration.mark({ class: `fsl-${s.kind}`, attributes: s.value ? { title: s.value } : {} }).range(s.from, s.to));
  return Decoration.set(decos, true);
}

/** Semantic overlay extension: color/state/enum decorations from `fslSemanticSpans`. */
export function fslOverlayExtension(): Extension {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = buildOverlay(view); }
    update(u: ViewUpdate) { if (u.docChanged) { this.decorations = buildOverlay(u.view); } }
  }, { decorations: v => v.decorations });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run vitest-spec -- src/ts/wc/tests/cm_adapters.spec.ts --coverage.enabled=false`
Expected: PASS (3 tests). If the completion `languageDataAt` lookup is awkward, assert via a mounted `startCompletion` instead; the override source is the unit under test.

- [ ] **Step 5: Commit**

```bash
git add src/ts/wc/editor/cm_adapters.ts src/ts/wc/tests/cm_adapters.spec.ts
git commit -m "feat(wc): CodeMirror adapters over the FSL language service"
```

---

### Task 2: Editor theme (light/dark, token-fed)

**Files:**
- Create: `src/ts/wc/editor/cm_theme.ts`
- Test: `src/ts/wc/tests/cm_theme.spec.ts`

**Interfaces:**
- Consumes: `EditorView` from `@codemirror/view`; `HighlightStyle`, `syntaxHighlighting`, `defaultHighlightStyle` from `@codemirror/language`; `tags` from `@lezer/highlight`.
- Produces: `lightEditorTheme: Extension`, `darkEditorTheme: Extension`.

- [ ] **Step 1–5:** Port the verified sketch `editor_theme.mjs` (light chrome + `defaultHighlightStyle`; dark chrome + a Material-ish `HighlightStyle`), but read colors from the `--_fsl-*` tokens where applicable (e.g. selection/cursor from `--_fsl-accent`). Test asserts both are valid `Extension`s by mounting a view with each (jsdom) and confirming `.cm-editor` is present. Commit `feat(wc): light/dark CodeMirror editor themes (token-fed)`.

(Exact theme code is the sketch's `editor_theme.mjs`, already verified in-browser; reproduce it here under `src/ts/wc/editor/cm_theme.ts` with the token reads.)

---

### Task 3: The `FslEditor` LitElement

**Files:**
- Create: `src/ts/wc/fsl_editor_wc.ts`
- Test: `src/ts/wc/tests/fsl_editor_wc.spec.ts`

**Interfaces:**
- Consumes: `LitElement`, `html`, `css` from `lit`; `property` from `lit/decorators.js`; `EditorView`, `keymap` from `@codemirror/view`; `EditorState`, `Compartment` from `@codemirror/state`; `defaultKeymap`, `history`, `historyKeymap` from `@codemirror/commands`; `completionKeymap` from `@codemirror/autocomplete`; `fsl` from `../cm6/fsl_language.js`; the adapters + themes; `fslTokens` from `./fsl_tokens.js`.
- Produces: `class FslEditor extends LitElement` with reactive props `fsl` (string), `readonly` (boolean), `theme` (`'light'|'dark'`), `noLint`/`noOverlay`/`noCompletion` (booleans, attrs `no-lint`/`no-overlay`/`no-completion`). Fires `change` (`{ fsl }`) and `fsl-error` (`{ message, location }`). Exposes `part="editor"`.

- [ ] **Steps:** Mount an `EditorView` in `firstUpdated` into a `part="editor"` div in the shadow root; assemble extensions = `[fsl(), baseKeymap, themeCompartment.of(...), lintCompartment.of(noLint? []: fslLintExtension()), overlayCompartment.of(...), completionCompartment.of(...), updateListener]`. `willUpdate` reflects `fsl` prop → editor doc (guarded against feedback), `theme` → reconfigure theme compartment, the `no-*` flags → reconfigure their compartments. The CM update listener debounces and fires `change`. Include `fslTokens` in `static styles`. **Tests (jsdom):** set `fsl`, read the editor doc; toggle `no-overlay` and assert `.fsl-color` marks appear/vanish; dispatch an edit in CM and assert a `change` event with the new fsl; set `theme="dark"` and assert the dark chrome class. Commit per green sub-step.

---

### Task 4: Dual-mode binding to `<fsl-instance>`

**Files:**
- Modify: `src/ts/wc/fsl_editor_wc.ts`
- Possibly modify: `src/ts/wc/fsl_instance_wc.ts` (rebuild-on-`fsl`-change, if absent)
- Test: extend `fsl_editor_wc.spec.ts`

**Interfaces:**
- Consumes: `closest_wc` from `./wc_tag_helpers.js`; the instance host's `.machine` + `fsl` setter.

- [ ] **Steps:** In `connectedCallback`, `closest_wc(this, 'instance')`; if found, seed the editor from the host's FSL and, on `change`, write back to the host (`host.fsl = newFsl`) so the machine rebuilds. **First verify** whether `fsl-instance` rebuilds its machine when its `fsl` property changes (read `fsl_instance_wc.ts`); if not, add a minimal `willUpdate`/`updated` rebuild there (with its own test). **Tests (jsdom):** nest `<fsl-editor>` in `<fsl-instance fsl="a -> b;">`, edit in the editor, assert the host's machine reflects the new FSL. Commit.

---

### Task 5: Registration, exports, packaging, README

**Files:**
- Create: `src/ts/wc/fsl_editor_wc.define.ts`
- Modify: `package.json` (exports + optional peers), `README` (if generated, the source), a rollup config for the cdn/es6 editor bundle (mirror `rollup.config.wc.viz.*`).
- Test: `src/ts/wc/tests/fsl_editor_wc.define.spec.ts` (registers `fsl-editor`).

- [ ] **Steps:** `define_canonical('fsl-editor', FslEditor)`; add `./wc/editor` + `./wc/editor/define` exports and `@codemirror/{view,commands,autocomplete,lint}` to `peerDependencies` + `peerDependenciesMeta` (optional); add the rollup config + `make_wc_editor_*` scripts mirroring viz. Test asserts `customElements.get('fsl-editor')` after importing the define module (jsdom). Full `vitest-spec` gate at the end. Commit.

## Execution Status (2026-06-25)

- ✅ **Task 1** CM adapters — gated 100% (`917783fb`)
- ✅ **Task 2** editor themes — gated 100% (`94b8463c`)
- ✅ **Task 3** `FslEditor` standalone — gated 100% (`40c99dff`)
- ⏸️ **Task 4** dual-mode binding — **deferred to `StoneCypher/fsl#1387`**: it needs `fsl-instance` to rebuild its machine on live `fsl` change (a behavioral change to a shipped component, non-obvious state/subscription semantics). The editor's `change` event + echo-guarded two-way binding already exist, so the editor side is ready when the host gains live-rebuild.
- 🟡 **Task 5** registration ✅ done (`53b775f0`). **Remaining:** distribution bundling — rollup CDN/es6 configs, `package.json` `exports`/`files`, `custom-elements.json` entry, README, `bundle_shape` assertions. Heavy (the CDN bundle inlines CodeMirror) and needs a full `npm run build`; tracked as the follow-on packaging step.

## Self-Review

- **Spec coverage:** Realizes §6 (component API, internals, dual-mode) and §7 (packaging). Adapters (Task 1) consume Foundation A; theme (Task 2) consumes Foundation B's tokens.
- **Risk noted:** CodeMirror-in-jsdom confirmed working by spike (pragma required). The `fsl-instance` rebuild-on-`fsl` dependency (Task 4) is verified before relying on it.
- **Type consistency:** adapter factory names (`fslLintExtension`/`fslCompletionExtension`/`fslOverlayExtension`) and theme names (`lightEditorTheme`/`darkEditorTheme`) are used unchanged in Task 3.
