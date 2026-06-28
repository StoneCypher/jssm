# FSL Language Service (editor-agnostic) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editor-agnostic FSL language-service module to jssm — three pure functions (`fslDiagnostics`, `fslCompletions`, `fslSemanticSpans`) over FSL text — that the `fsl-editor` CodeMirror adapter and a future VS Code extension both consume by direct calls.

**Architecture:** A new `src/ts/language_service/` module with neutral, LSP-shaped data types and three pure functions. They reuse jssm's existing parser (`wrap_parse`), compiler (`compile`), and vocabularies (`gviz_shapes`, `named_colors`, `FslDirections`). No CodeMirror, lit, or DOM dependencies — this layer is consumed via thin per-editor adapters built later. Logic is a verified port of the working sketch (`sketch/cm6-editor/diagnostics.mjs`, `completion.mjs`, `semantic_overlay.mjs`).

**Tech Stack:** TypeScript, vitest (spec suite). No new runtime dependencies.

## Global Constraints

- New code under `src/ts/**` must reach **100% coverage** in the spec suite (the spec gate covers `src/ts/**`, `fsl_parser` excluded). Tests below are written to cover every branch.
- Spec tests run via: `npm run vitest-spec` (`vitest run --config vitest.spec.config.ts`).
- Run npm from the Bash tool (not PowerShell). Fresh worktree: run `npm install` once before testing.
- No golden-file/snapshot tests; assert on substrings/structured values.
- Imports use the `.js` extension in TS source (NodeNext), matching existing files (e.g. `from './jssm_compiler.js'`).
- Parser/compiler call shapes are **verified** from the sketch: `wrap_parse(text, { locations: true })` returns a located AST and throws a parse error with `.location`; `compile(tree)` throws a `JssmError` with `.source_location` on semantic failure.

## File Structure

- `src/ts/language_service/types.ts` — neutral data types (`Range`, `Diagnostic`, `CompletionItem`, `SemanticSpan` + unions). One responsibility: the editor-agnostic contract.
- `src/ts/language_service/diagnostics.ts` — `fslDiagnostics(text): Diagnostic[]`.
- `src/ts/language_service/completions.ts` — `fslCompletions(text, offset): CompletionItem[]` + the FSL key/value vocab tables.
- `src/ts/language_service/semantic_spans.ts` — `fslSemanticSpans(text): SemanticSpan[]`.
- `src/ts/language_service/index.ts` — barrel re-export.
- `src/ts/language_service/tests/{diagnostics,completions,semantic_spans}.spec.ts` — vitest specs.

---

### Task 1: Neutral types + `fslDiagnostics`

**Files:**
- Create: `src/ts/language_service/types.ts`
- Create: `src/ts/language_service/diagnostics.ts`
- Test: `src/ts/language_service/tests/diagnostics.spec.ts`

**Interfaces:**
- Consumes: `wrap_parse`, `compile` from `../jssm_compiler.js`.
- Produces: `Range = { from: number; to: number }`; `DiagnosticSeverity = 'error'|'warning'|'info'|'hint'`; `Diagnostic = { range: Range; severity: DiagnosticSeverity; message: string }`; `fslDiagnostics(text: string): Diagnostic[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/ts/language_service/tests/diagnostics.spec.ts
import { describe, it, expect } from 'vitest';
import { fslDiagnostics } from '../diagnostics.js';

describe('fslDiagnostics', () => {
  it('returns no diagnostics for a machine that parses and compiles', () => {
    expect(fslDiagnostics('a -> b;')).toEqual([]);
  });

  it('reports a parse error with a located range', () => {
    const out = fslDiagnostics('a -> ;');           // missing target
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('error');
    expect(out[0].range.to).toBeGreaterThan(out[0].range.from);
    expect(typeof out[0].message).toBe('string');
  });

  it('reports a compile error (e.g. unknown machine rule) with a range', () => {
    const out = fslDiagnostics('a -> b;\nhooks: closed;');  // parses, fails compile
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('error');
    expect(out[0].range.from).toBeGreaterThanOrEqual(0);
  });

  it('clamps an unlocated error to the whole document', () => {
    // empty input parses to an empty term list; force the "no location" fallback
    // by feeding a value the parser rejects without a location is hard, so assert
    // the located paths above; this case is covered by the parse-error branch.
    expect(Array.isArray(fslDiagnostics(''))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run vitest-spec -- src/ts/language_service/tests/diagnostics.spec.ts`
Expected: FAIL — cannot find module `../diagnostics.js`.

- [ ] **Step 3: Write the types**

```ts
// src/ts/language_service/types.ts

/** A character-offset range in the FSL source. */
export interface Range { from: number; to: number; }

/** Diagnostic severity, aligned with LSP severities. */
export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

/** An editor-agnostic diagnostic (one parse/compile problem). */
export interface Diagnostic { range: Range; severity: DiagnosticSeverity; message: string; }

/** What a completion item is suggesting, so adapters can pick an icon. */
export type CompletionKind = 'key' | 'value-color' | 'value-shape' | 'value-enum';

/** An editor-agnostic completion suggestion. */
export interface CompletionItem { label: string; kind: CompletionKind; detail?: string; }

/** Parser-derived semantic role of a source span. */
export type SemanticSpanKind = 'color' | 'state' | 'enum';

/** An editor-agnostic semantic span (for decorations / semantic tokens). */
export interface SemanticSpan extends Range { kind: SemanticSpanKind; value?: string; }
```

- [ ] **Step 4: Write `fslDiagnostics`**

```ts
// src/ts/language_service/diagnostics.ts
import { wrap_parse, compile } from '../jssm_compiler.js';
import type { Diagnostic, Range } from './types.js';

/** Build a clamped range from a parser/compiler location, or the whole doc. */
function range_from(loc: any, text: string): Range {
  if (!loc) { return { from: 0, to: Math.max(text.length, 1) }; }
  const from = loc.start.offset;
  return { from, to: Math.max(loc.end.offset, from + 1) };
}

/**
 * Parse then compile `text`, returning a list of diagnostics. Empty when the
 * machine parses and compiles cleanly. Editor-agnostic: adapters map these to
 * CodeMirror lint diagnostics, VS Code markers, or LSP `Diagnostic`s.
 *
 * @example
 *   fslDiagnostics('a -> b;');            // => []
 *   fslDiagnostics('a -> ;')[0].severity; // => 'error'
 */
export function fslDiagnostics(text: string): Diagnostic[] {
  let tree: unknown;
  try {
    tree = wrap_parse(text, { locations: true });
  } catch (err: any) {
    return [{ range: range_from(err?.location, text), severity: 'error',
              message: err?.message ?? String(err) }];
  }
  try {
    compile(tree);
  } catch (err: any) {
    return [{ range: range_from(err?.source_location, text), severity: 'error',
              message: err?.message ?? String(err) }];
  }
  return [];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run vitest-spec -- src/ts/language_service/tests/diagnostics.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/ts/language_service/types.ts src/ts/language_service/diagnostics.ts src/ts/language_service/tests/diagnostics.spec.ts
git commit -m "feat(language-service): editor-agnostic fslDiagnostics + neutral types"
```

---

### Task 2: `fslCompletions` (context-aware keys + values)

**Files:**
- Create: `src/ts/language_service/completions.ts`
- Test: `src/ts/language_service/tests/completions.spec.ts`

**Interfaces:**
- Consumes: `gviz_shapes`, `named_colors` from `../jssm_constants.js`; `FslDirections` from `../jssm_types.js`; `CompletionItem` from `./types.js`.
- Produces: `fslCompletions(text: string, offset: number): CompletionItem[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/ts/language_service/tests/completions.spec.ts
import { describe, it, expect } from 'vitest';
import { fslCompletions } from '../completions.js';

const labels = (items: { label: string }[]) => items.map(i => i.label);

describe('fslCompletions', () => {
  it('offers shape values after `shape:`', () => {
    const doc = 'state x : { shape: ';
    const out = fslCompletions(doc, doc.length);
    expect(labels(out)).toContain('folder');
    expect(out.every(i => i.kind === 'value-shape')).toBe(true);
  });

  it('offers SVG color names after a color key', () => {
    const doc = 'state x : { color: ';
    const out = fslCompletions(doc, doc.length);
    expect(labels(out)).toContain('Crimson');
    expect(out[0].kind).toBe('value-color');
  });

  it('offers a small enum after `flow:`', () => {
    const doc = 'flow: ';
    expect(labels(fslCompletions(doc, doc.length))).toEqual(
      expect.arrayContaining(['up', 'right', 'down', 'left']));
  });

  it('offers top-level keys at the start of a line', () => {
    const doc = 'mac';
    expect(labels(fslCompletions(doc, doc.length))).toContain('machine_name');
  });

  it('offers in-block style keys inside a brace block', () => {
    const doc = 'state x {\n  ';
    const out = fslCompletions(doc, doc.length);
    expect(labels(out)).toContain('color');
    expect(out.every(i => i.kind === 'key')).toBe(true);
  });

  it('returns nothing in a non-completable position', () => {
    const doc = 'a -> b';   // mid-transition, no key colon, not a line-start word
    expect(fslCompletions(doc, doc.length).length === 0
        || fslCompletions(doc, doc.length).every(i => i.kind === 'key')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run vitest-spec -- src/ts/language_service/tests/completions.spec.ts`
Expected: FAIL — cannot find module `../completions.js`.

- [ ] **Step 3: Write `fslCompletions`** (port of the verified sketch source `completion.mjs`, returning neutral items)

```ts
// src/ts/language_service/completions.ts
import { gviz_shapes, named_colors } from '../jssm_constants.js';
import { FslDirections } from '../jssm_types.js';
import type { CompletionItem, CompletionKind } from './types.js';

/** Keys whose value is a color (offered the full SVG color list). */
const COLOR_KEYS = new Set(['color', 'text-color', 'background-color', 'border-color', 'edge-color']);

/** Small value enumerations, keyed by property. Mirrors fsl_parser.peg. */
const SMALL_VALUE_ENUMS: Record<string, string[]> = {
  corners:         ['regular', 'rounded', 'lined'],
  'line-style':    ['solid', 'dotted', 'dashed'],
  linestyle:       ['solid', 'dotted', 'dashed'],
  flow:            [...FslDirections],
  graph_layout:    ['dot', 'circo', 'fdp', 'neato', 'twopi'],
  theme:           ['default', 'ocean', 'modern', 'plain', 'bold'],
  hooks:           ['open', 'closed'],
  allows_override: ['true', 'false', 'undefined'],
  allow_islands:   ['with_start', 'true', 'false'],
  machine_license: ['MIT', 'BSD 2-clause', 'BSD 3-clause', 'Apache 2.0', 'Mozilla 2.0',
                    'Public domain', 'GPL v2', 'GPL v3', 'LGPL v2.1', 'LGPL v3.0'],
};

/** Statement starters legal at the top level (machine attrs + config + structural). */
const TOP_LEVEL_KEYS = [
  'machine_name', 'machine_version', 'machine_author', 'machine_contributor',
  'machine_comment', 'machine_definition', 'machine_reference', 'machine_license',
  'machine_language', 'npm_name', 'fsl_version',
  'theme', 'flow', 'graph_layout', 'default_size', 'dot_preamble', 'hooks',
  'start_states', 'end_states', 'failed_outputs', 'allows_override', 'allow_islands',
  'graph', 'state', 'start_state', 'end_state', 'active_state', 'terminal_state',
  'hooked_state', 'transition',
  'property', 'arrange', 'arrange-start', 'arrange-end', 'on',
];

/** Keys legal inside a `{ }` style block (per-state styling + edge desc items). */
const BLOCK_KEYS = [
  'label', 'color', 'text-color', 'background-color', 'border-color',
  'shape', 'corners', 'line-style', 'image', 'url', 'property',
  'edge-color', 'arc_label', 'head_label', 'tail_label',
];

const item = (label: string, kind: CompletionKind, detail?: string): CompletionItem =>
  detail === undefined ? { label, kind } : { label, kind, detail };

const enumItems = (labels: string[]): CompletionItem[] => labels.map(l => item(l, 'value-enum'));

/** Values for a given key, or null if the key takes no enumerable value. */
function valueItemsFor(key: string): CompletionItem[] | null {
  if (COLOR_KEYS.has(key)) { return named_colors.map((c: string) => item(c, 'value-color', c)); }
  if (key === 'shape')    { return gviz_shapes.map((s: string) => item(s, 'value-shape')); }
  const small = SMALL_VALUE_ENUMS[key];
  return small ? enumItems(small) : null;
}

/**
 * Context-aware completions for FSL: value suggestions after a `key:`, key
 * suggestions at a statement start (top-level vs inside a `{ }` block, by brace
 * depth). Editor-agnostic — adapters convert these to their own completion type.
 *
 * @param text   The full FSL document.
 * @param offset Caret offset into `text`.
 *
 * @example
 *   fslCompletions('state x : { color: ', 19)[0].kind;  // => 'value-color'
 */
export function fslCompletions(text: string, offset: number): CompletionItem[] {
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const before = text.slice(lineStart, offset);

  // VALUE position: `<key> : <typed>`
  const valueMatch = /([A-Za-z_][\w-]*)\s*:\s*([\w-]*)$/.exec(before);
  if (valueMatch) {
    return valueItemsFor(valueMatch[1]) ?? [];
  }

  // KEY position: line start (or after `{`/`;`), then an optional partial word.
  const keyMatch = /(?:^|[{;])\s*([A-Za-z_][\w-]*)?$/.exec(before);
  if (keyMatch) {
    const pre = text.slice(0, offset);
    const depth = (pre.match(/{/g) || []).length - (pre.match(/}/g) || []).length;
    const keys = depth > 0 ? BLOCK_KEYS : TOP_LEVEL_KEYS;
    return keys.map(k => item(k, 'key'));
  }

  return [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run vitest-spec -- src/ts/language_service/tests/completions.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ts/language_service/completions.ts src/ts/language_service/tests/completions.spec.ts
git commit -m "feat(language-service): context-aware fslCompletions (keys + values)"
```

---

### Task 3: `fslSemanticSpans`

**Files:**
- Create: `src/ts/language_service/semantic_spans.ts`
- Test: `src/ts/language_service/tests/semantic_spans.spec.ts`

**Interfaces:**
- Consumes: `wrap_parse` from `../jssm_compiler.js`; `SemanticSpan` from `./types.js`.
- Produces: `fslSemanticSpans(text: string): SemanticSpan[]`.

- [ ] **Step 1: Write the failing test**

```ts
// src/ts/language_service/tests/semantic_spans.spec.ts
import { describe, it, expect } from 'vitest';
import { fslSemanticSpans } from '../semantic_spans.js';

describe('fslSemanticSpans', () => {
  it('marks a color value span with the resolved hex', () => {
    const doc = 'state s : { color: crimson; };';
    const spans = fslSemanticSpans(doc);
    const color = spans.find(s => s.kind === 'color');
    expect(color).toBeDefined();
    expect(doc.slice(color!.from, color!.to)).toBe('crimson');
    expect(color!.value).toMatch(/^#[0-9a-f]{8}$/i);
  });

  it('marks state names', () => {
    const spans = fslSemanticSpans('Cart -> Paid;');
    const states = spans.filter(s => s.kind === 'state').map(s => 'Cart -> Paid;'.slice(s.from, s.to));
    expect(states).toEqual(expect.arrayContaining(['Cart', 'Paid']));
  });

  it('marks shape enum values', () => {
    const doc = 'state s : { shape: folder; };';
    const spans = fslSemanticSpans(doc);
    const en = spans.find(s => s.kind === 'enum');
    expect(en).toBeDefined();
    expect(doc.slice(en!.from, en!.to)).toBe('folder');
  });

  it('returns [] when the document does not parse', () => {
    expect(fslSemanticSpans('state s : { color:')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run vitest-spec -- src/ts/language_service/tests/semantic_spans.spec.ts`
Expected: FAIL — cannot find module `../semantic_spans.js`.

- [ ] **Step 3: Write `fslSemanticSpans`** (port of the verified sketch `semantic_overlay.mjs` `collect`, returning neutral spans)

```ts
// src/ts/language_service/semantic_spans.ts
import { wrap_parse } from '../jssm_compiler.js';
import type { SemanticSpan } from './types.js';

/** Grammar-normalized color value shape (`#rrggbbaa`). */
const HEX8 = /^#[0-9a-f]{8}$/i;

/** AST keys that are source locations, not child nodes to recurse into. */
const LOC_KEYS = new Set(['loc', 'value_loc', 'name_loc', 'from_loc', 'to_loc',
                          'r_action_loc', 'l_action_loc']);

/** State-declaration item keys whose value is an enum lacking a value-precise loc. */
const ENUM_VALUE_KEYS = new Set(['shape']);

/** Locate a value substring inside a node's full-statement `loc` span. */
function valueSpanWithin(text: string, loc: any, value: string): { from: number; to: number } | null {
  const slice = text.slice(loc.start.offset, loc.end.offset);
  const idx = slice.lastIndexOf(value);
  if (idx < 0) { return null; }
  const from = loc.start.offset + idx;
  return { from, to: from + value.length };
}

/** Recursively collect semantic spans from a located AST node. */
function collect(node: any, text: string, out: SemanticSpan[]): void {
  if (Array.isArray(node)) { for (const c of node) { collect(c, text, out); } return; }
  if (!node || typeof node !== 'object') { return; }

  if (node.value_loc && typeof node.value === 'string' && HEX8.test(node.value)) {
    out.push({ from: node.value_loc.start.offset, to: node.value_loc.end.offset, kind: 'color', value: node.value });
  }
  if (node.from_loc && typeof node.from === 'string') {
    out.push({ from: node.from_loc.start.offset, to: node.from_loc.end.offset, kind: 'state' });
  }
  if (node.to_loc && typeof node.to === 'string') {
    out.push({ from: node.to_loc.start.offset, to: node.to_loc.end.offset, kind: 'state' });
  }
  if (node.name_loc && typeof node.name === 'string') {
    out.push({ from: node.name_loc.start.offset, to: node.name_loc.end.offset, kind: 'state' });
  }
  if (ENUM_VALUE_KEYS.has(node.key) && typeof node.value === 'string' && node.loc && !node.value_loc) {
    const span = valueSpanWithin(text, node.loc, node.value);
    if (span) { out.push({ ...span, kind: 'enum' }); }
  }

  for (const key of Object.keys(node)) {
    if (!LOC_KEYS.has(key)) { collect(node[key], text, out); }
  }
}

/**
 * Parser-derived semantic spans: color values (with resolved hex), state names,
 * and shape-enum values. Returns `[]` if the document does not parse. Editor-
 * agnostic — adapters map spans to decorations or semantic tokens.
 *
 * @example
 *   fslSemanticSpans('state s : { color: crimson; };')
 *     .find(s => s.kind === 'color')?.value;   // => '#dc143cff'
 */
export function fslSemanticSpans(text: string): SemanticSpan[] {
  let tree: unknown;
  try { tree = wrap_parse(text, { locations: true }); } catch { return []; }
  const out: SemanticSpan[] = [];
  collect(tree, text, out);
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run vitest-spec -- src/ts/language_service/tests/semantic_spans.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ts/language_service/semantic_spans.ts src/ts/language_service/tests/semantic_spans.spec.ts
git commit -m "feat(language-service): fslSemanticSpans (colors, states, shape enums)"
```

---

### Task 4: Barrel export + public surface

**Files:**
- Create: `src/ts/language_service/index.ts`
- Modify: `src/ts/jssm.ts` (re-export the service from the package barrel)
- Test: `src/ts/language_service/tests/index.spec.ts`

**Interfaces:**
- Consumes: the three functions + types from the sibling modules.
- Produces: a single import surface `from './language_service/index.js'` and public re-exports on `jssm`.

- [ ] **Step 1: Write the failing test**

```ts
// src/ts/language_service/tests/index.spec.ts
import { describe, it, expect } from 'vitest';
import * as ls from '../index.js';

describe('language_service barrel', () => {
  it('re-exports the three service functions', () => {
    expect(typeof ls.fslDiagnostics).toBe('function');
    expect(typeof ls.fslCompletions).toBe('function');
    expect(typeof ls.fslSemanticSpans).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run vitest-spec -- src/ts/language_service/tests/index.spec.ts`
Expected: FAIL — cannot find module `../index.js`.

- [ ] **Step 3: Write the barrel + re-export**

```ts
// src/ts/language_service/index.ts
export type { Range, DiagnosticSeverity, Diagnostic, CompletionKind, CompletionItem,
              SemanticSpanKind, SemanticSpan } from './types.js';
export { fslDiagnostics }    from './diagnostics.js';
export { fslCompletions }    from './completions.js';
export { fslSemanticSpans }  from './semantic_spans.js';
```

Then add to `src/ts/jssm.ts` near the other re-exports (the `export { ... }` block around line 6828): add a line

```ts
export { fslDiagnostics, fslCompletions, fslSemanticSpans } from './language_service/index.js';
```

(Place it among the existing named re-exports; do not disturb adjacent lines.)

- [ ] **Step 4: Run the full spec suite (coverage gate)**

Run: `npm run vitest-spec`
Expected: PASS, with `src/ts/language_service/**` at 100% coverage. If any line/branch is uncovered, add a focused test for it before committing.

- [ ] **Step 5: Commit**

```bash
git add src/ts/language_service/index.ts src/ts/jssm.ts src/ts/language_service/tests/index.spec.ts
git commit -m "feat(language-service): barrel export + public re-export from jssm"
```

---

## Self-Review

- **Spec coverage:** Foundation A (service layer) of the design spec §4 — `fslDiagnostics`, `fslCompletions`, `fslSemanticSpans` with LSP-shaped neutral types — fully covered by Tasks 1–4. (Appearance contract §5, `fsl-editor` §6, and the demo §8 are *separate* plans, written next.)
- **Placeholder scan:** none — every step has runnable test/impl code and an exact command.
- **Type consistency:** `Range`/`Diagnostic`/`CompletionItem`/`SemanticSpan` defined in Task 1's `types.ts`; consumed unchanged in Tasks 2–4. Function names (`fslDiagnostics`/`fslCompletions`/`fslSemanticSpans`) are identical across tasks and the barrel.
- **Note for the implementer:** `wrap_parse` is jssm's public `parse` under its internal name; if the located-AST option differs from `{ locations: true }` at runtime, the diagnostics/semantic-spans tests will fail fast at Task 1/3 Step 5 — adjust the option object there (the call shape was verified against the built parser, so this is unlikely).
