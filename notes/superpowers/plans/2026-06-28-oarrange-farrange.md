# oarrange / farrange Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new FSL layout clauses — `oarrange` (same-rank + best-effort left-to-right order) and `farrange` (same-rank + forced order, may reshape layout) — siblings of `arrange`.

**Architecture:** Both mirror `arrange` through the pipeline (grammar → compiler aggregation → `JssmGenericConfig` → `Machine` field + nonexistent-state validation) and diverge only in viz emission. `arrange` emits `{rank=same; …}`. `oarrange` additionally emits an invisible ordering chain (`A->B->C [style=invis]`) — verified to order free same-rank nodes and to yield non-destructively to hard rank constraints. `farrange` emits the same chain **and** sets `constraint=false` on every real edge incident to a farrange member — verified to force order across spine nodes (at the cost of reshaping vertical layout).

**Tech Stack:** PEG.js grammar (`src/ts/fsl_parser.peg` → regen via `npm run peg`), TypeScript, vitest (spec suite, 100% coverage gate), `@viz-js/viz` for dot→svg.

## Global Constraints

- 100% spec coverage required (`npx vitest run --config vitest.spec.config.ts`); every new branch needs a test. Iterate single files with `--coverage.enabled=false`, full run at the end.
- Never bump the version manually (that's `/sc-commit`'s job at release time).
- Run each shell command standalone (no `&&`/`;`/pipe chaining).
- `npm run peg` regenerates `src/ts/fsl_parser.ts` from the `.peg`; it must be run after any grammar edit (the `.ts` is generated, never hand-edited).
- Mirror `arrange` exactly where noted; `arrange` has NO public getter, so neither new clause gets one (no getter DocBlock/test obligations).
- Scope: `oarrange` and `farrange` only. Do NOT add start/end variants (YAGNI).

---

### Task 1: Grammar — `oarrange` and `farrange` declarations

**Files:**
- Modify: `src/ts/fsl_parser.peg` (after `ArrangeEndDeclaration`, ~line 1588; and the `ArrangeDeclaration` alternatives, ~1590–1593)
- Regenerate: `src/ts/fsl_parser.ts` (via `npm run peg`)
- Test: `src/ts/tests/parser.spec.ts` (or the existing parser spec; locate with grep)

**Interfaces:**
- Produces: parse nodes `{ key: 'oarrange_declaration', value: string[] }` and `{ key: 'farrange_declaration', value: string[] }`, where `value` is a `LabelOrLabelList` (same shape as `arrange_declaration`).

- [ ] **Step 1: Write the failing test** — confirm both keywords parse to the right node.

```typescript
// in the parser spec
import { wrap_parse } from '../jssm_compiler.js';   // adjust path to match the file
it('parses oarrange and farrange declarations', () => {
  const o = wrap_parse('a -> b; oarrange [a b];') as any[];
  expect(o.some(n => n.key === 'oarrange_declaration')).toBe(true);
  const f = wrap_parse('a -> b; farrange [a b];') as any[];
  expect(f.some(n => n.key === 'farrange_declaration')).toBe(true);
});
```

- [ ] **Step 2: Run it, verify it fails** — `npx vitest run --config vitest.spec.config.ts <parser-spec> --coverage.enabled=false` → FAIL (parse error on `oarrange`).

- [ ] **Step 3: Add the grammar rules.** After `ArrangeEndDeclaration` (before `ArrangeDeclaration`):

```pegjs
OArrangeDeclaration "oarrange declaration"
  = "oarrange"      WS? value:LabelOrLabelList WS? ";" WS? {
      const node: any = { key: 'oarrange_declaration', value };
      if (options.locations) { node.loc = location(); }
      return node;
    }

FArrangeDeclaration "farrange declaration"
  = "farrange"      WS? value:LabelOrLabelList WS? ";" WS? {
      const node: any = { key: 'farrange_declaration', value };
      if (options.locations) { node.loc = location(); }
      return node;
    }
```

Then add them to the `ArrangeDeclaration` alternatives (order doesn't matter — distinct first letters, no prefix overlap with `arrange`):

```pegjs
ArrangeDeclaration "arrange declaration"
  = ArrangeStartDeclaration
  / ArrangeEndDeclaration
  / OArrangeDeclaration
  / FArrangeDeclaration
  / RegularArrangeDeclaration
```

- [ ] **Step 4: Regenerate the parser** — Run: `npm run peg` (from repo root, via the Bash tool). Expected: regenerates `src/ts/fsl_parser.ts` with no error.

- [ ] **Step 5: Run the test, verify it passes** — same command as Step 2 → PASS.

- [ ] **Step 6: Commit** — `git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts <parser-spec>` then `git commit -m "feat(grammar): oarrange/farrange declarations"`.

---

### Task 2: Compiler — aggregate the new declarations

**Files:**
- Modify: `src/ts/jssm_compiler.ts` — the arrange aggregation list (~line 1010–1013); the `JssmGenericConfig` field types (~1247–1249); the defaults object (~1290–1292); and the second arrange list (~1429).
- Test: `src/ts/tests/` compiler spec (locate the one covering `compile`/`make`).

**Interfaces:**
- Consumes: parse nodes from Task 1.
- Produces: `config.oarrange_declaration: string[][]` and `config.farrange_declaration: string[][]` (arrays of state-name groups, same shape as `arrange_declaration`).

- [ ] **Step 1: Write the failing test.**

```typescript
import { make } from '../jssm_compiler.js';   // adjust path
it('compiles oarrange/farrange into config arrays', () => {
  const c = make('a -> b; oarrange [a b]; farrange [a b];') as any;
  expect(c.oarrange_declaration).toEqual([['a', 'b']]);
  expect(c.farrange_declaration).toEqual([['a', 'b']]);
});
```

- [ ] **Step 2: Run it, verify it fails** (`undefined` arrays).

- [ ] **Step 3: Implement.** In the aggregation membership check (currently lines ~1010–1013), add the two keys:

```typescript
if (['arrange_declaration', 'arrange_start_declaration',
  'arrange_end_declaration', 'oarrange_declaration',
  'farrange_declaration'].includes(rule.key)) {
  return { agg_as: rule.key, val: [rule.value] };
}
```

In the `JssmGenericConfig` type block, after `arrange_end_declaration` (~line 1249):

```typescript
    oarrange_declaration          : Array<Array<string>>,
    farrange_declaration          : Array<Array<string>>,
```

In the defaults object, after `arrange_end_declaration: []` (~line 1292):

```typescript
    oarrange_declaration          : [],
    farrange_declaration          : [],
```

At the second arrange list (~line 1429 — the list that whitelists which keys flow through; verify its purpose by reading context), add `'oarrange_declaration', 'farrange_declaration'` alongside the arrange entries.

- [ ] **Step 4: Run the test, verify it passes.**

- [ ] **Step 5: Commit** — `git commit -m "feat(compiler): aggregate oarrange/farrange declarations"`.

---

### Task 3: Machine — fields, constructor wiring, validation

**Files:**
- Modify: `src/ts/jssm.ts` — field declarations (~522–524); constructor destructure defaults (~702–704); constructor assignments (~775–777); nonexistent-state validation (~1285–1291). The `JssmGenericConfig` consumed here already carries the fields from Task 2.
- Test: the jssm machine spec covering construction/arrange validation (grep for `Cannot arrange state`).

**Interfaces:**
- Consumes: `config.oarrange_declaration`, `config.farrange_declaration` from Task 2.
- Produces: `Machine._oarrange_declaration: string[][]`, `Machine._farrange_declaration: string[][]` (read by Task 4's viz); construction throws `JssmError` ("Cannot arrange state that does not exist …") if any listed state is unknown.

- [ ] **Step 1: Write the failing tests.**

```typescript
it('stores oarrange/farrange and validates their states', () => {
  const m = sm`a -> b; oarrange [a b]; farrange [b a];`;
  expect((m as any)._oarrange_declaration).toEqual([['a', 'b']]);
  expect((m as any)._farrange_declaration).toEqual([['b', 'a']]);
});
it('rejects oarrange of a nonexistent state', () => {
  expect(() => sm`a -> b; oarrange [a z];`).toThrow(/does not exist/);
});
it('rejects farrange of a nonexistent state', () => {
  expect(() => sm`a -> b; farrange [a z];`).toThrow(/does not exist/);
});
```

- [ ] **Step 2: Run, verify they fail.**

- [ ] **Step 3: Implement.** Field declarations after `_arrange_end_declaration` (~524):

```typescript
  _oarrange_declaration      : Array<Array<StateType>>;
  _farrange_declaration      : Array<Array<StateType>>;
```

Constructor destructure after `arrange_end_declaration = []` (~704):

```typescript
    oarrange_declaration      = [],
    farrange_declaration      = [],
```

Constructor assignments after `this._arrange_end_declaration = …` (~777):

```typescript
    this._oarrange_declaration      = oarrange_declaration;
    this._farrange_declaration      = farrange_declaration;
```

Validation — extend the existing block (~1285–1291) so all three lists are checked. Replace the single `_arrange_declaration.forEach(...)` with a loop over all three:

```typescript
    [this._arrange_declaration, this._oarrange_declaration, this._farrange_declaration].forEach(
      (decl: StateType[][]) => decl.forEach((group: StateType[]) =>
        group.forEach((possibleState: StateType) => {
          if (!(this._states.has(possibleState))) {
            throw new JssmError(this, `Cannot arrange state that does not exist "${possibleState}"`);
          }
        })
      )
    );
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit** — `git commit -m "feat(machine): oarrange/farrange fields + validation"`.

---

### Task 4: Viz — emit oarrange/farrange to dot

**Files:**
- Modify: `src/ts/jssm_viz.ts` — `arranges_for` (~881–890) to emit the invisible ordering chains; `edges_for`/`solo_edge` (the edge body, ~820–868 + the `solo_edge` helper) to add `constraint=false` for farrange members; the assembly that calls these (`machine_to_dot`/`dot`, ~1235–1291) to compute and thread the farrange member set.
- Test: `src/ts/tests/` viz spec (grep for `rank=same` or `arranges`).

**Interfaces:**
- Consumes: `machine._oarrange_declaration`, `machine._farrange_declaration` from Task 3.
- Produces: dot text containing, per oarrange/farrange group, `{rank=same; …}` plus an invisible chain `n1->n2[style=invis]; n2->n3[style=invis];` (node ids via `node_of`); for farrange, every edge incident to a member additionally carries `constraint=false;`.

- [ ] **Step 1: Write the failing tests.** (Use the existing dot-producing entry — `machine_to_dot` or `fsl_to_dot`; match the spec's imports.)

```typescript
it('oarrange emits rank=same and an invisible ordering chain', () => {
  const dot = fsl_to_dot('a -> b; a -> c; oarrange [b c];');
  expect(dot).toMatch(/rank=same/);
  expect(dot).toMatch(/style=invis/);
});
it('farrange emits an invisible chain and constraint=false on member edges', () => {
  const dot = fsl_to_dot('a -> b; a -> c; farrange [b c];');
  expect(dot).toMatch(/style=invis/);
  expect(dot).toMatch(/constraint=false/);
});
it('a machine with neither emits no invis chain or constraint=false', () => {
  const dot = fsl_to_dot('a -> b;');
  expect(dot).not.toMatch(/style=invis/);
  expect(dot).not.toMatch(/constraint=false/);
});
```

- [ ] **Step 2: Run, verify they fail.**

- [ ] **Step 3a: Emit ordering chains in `arranges_for`.** Add a helper that, for each group, emits the rank=same group (reuse the existing `group(...)` for rank=same) plus an invisible chain. Append to the `arranges_for` return:

```typescript
  // ordered variants: rank=same (via `group`) + an invisible left-to-right chain.
  const chain = (decls: string[][] | undefined): string =>
    decls
      ? decls.map(d => d.slice(1).map((di, i) =>
          `${node_of(d[i], state_index)}->${node_of(di, state_index)} [style=invis];`).join(' ')
        ).join('\n')
      : '';

  return group(u_jssm._arrange_declaration,       'same')
       + group(u_jssm._arrange_start_declaration, 'min')
       + group(u_jssm._arrange_end_declaration,   'max')
       + group(u_jssm._oarrange_declaration,      'same') + chain(u_jssm._oarrange_declaration)
       + group(u_jssm._farrange_declaration,      'same') + chain(u_jssm._farrange_declaration);
```

- [ ] **Step 3b: Thread the farrange member set into edge rendering.** In the assembly (`machine_to_dot`/`dot`, where `edges_for` is called), compute:

```typescript
  const farrange_members = new Set<string>((u_jssm._farrange_declaration || []).flat().map(String));
```

Pass `farrange_members` to `edges_for`. In `edges_for` (and its inner `solo_edge`), when building an edge's inline attrs, prepend `constraint=false;` when either endpoint is a member:

```typescript
  const cf = (s: string, ex: string): string =>
    (farrange_members.has(String(s)) || farrange_members.has(String(ex))) ? 'constraint=false;' : '';
```

Insert `${cf(s, ex)}` into the bidirectional-merge edge attrs (line ~854/858) and into `solo_edge`'s attrs.

- [ ] **Step 4: Run, verify pass.** Also run the existing viz spec to confirm no regression.

- [ ] **Step 5: Empirical sanity check (no test, just verify).** From repo root: build a quick script reading `fsl_to_svg_string` of `'Root->A; Root->B; Root->C; oarrange [c b a];'` and confirm rendered node x-order is c,b,a. (Mechanism verified during design; this guards the wiring.)

- [ ] **Step 6: Commit** — `git commit -m "feat(viz): render oarrange/farrange ordering to dot"`.

---

### Task 5: Documentation

**Files:**
- Modify: `notes/fsl-grammar-reference.md` (add `oarrange` / `farrange` next to `arrange`).
- Modify: `src/doc_md/todo.md` if it tracks arrange (check; update the layout-clause entry).
- Note: `README.md` is generated (`npm run readme`); update its SOURCE if arrange is documented there (grep `src/doc_md` for "arrange"). Do not hand-edit `README.md`.

**Interfaces:** none (docs only).

- [ ] **Step 1: Locate arrange docs** — `grep -rn "arrange" notes/ src/doc_md/`. For each place arrange is explained, add a sibling note:
  - `oarrange [a b c];` — same as `arrange` (same rank) but also orders the listed states left-to-right (best-effort; yields to hard rank constraints, never reshapes the graph).
  - `farrange [a b c];` — like `oarrange` but forces the order by relaxing the members' rank constraints (`constraint=false`); can reshape the vertical layout, so use when order matters more than the default flow.

- [ ] **Step 2: Apply the doc edits** (actual prose, not placeholders).

- [ ] **Step 3: Commit** — `git commit -m "docs: document oarrange/farrange layout clauses"`.

---

### Task 6: Full verification

- [ ] **Step 1: Full spec suite + coverage** — `npx vitest run --config vitest.spec.config.ts`. Expected: all pass, 100% coverage (statements/branches/functions/lines). If a new branch is uncovered, add a test in the owning task's spec.
- [ ] **Step 2: Type check** — `npx tsc --noEmit -p tsconfig.json`. Expected: clean.
- [ ] **Step 3: IDE diagnostics** — check changed files are clean.
