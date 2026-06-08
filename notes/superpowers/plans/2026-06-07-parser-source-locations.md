# FSL Parser Source Locations + CM6 Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in source locations to the FSL parser AST, surface them on `compile()`'s semantic errors, and rewrite the CM6 sketch linter to map both parse and semantic errors to precise editor diagnostics.

**Architecture:** pegjs action blocks attach a `loc` (and curated `*_loc` sub-spans) to AST object nodes only when `parse(input, { locations: true })` is set, so the default output and machine construction are byte-for-byte unchanged. `compile()` stays field-name-driven (it ignores `loc`) and gains a tree-scan helper that attaches the offending node's span to semantic `JssmError`s. A pure, dependency-injected `diagnosticsFor` helper makes the linter logic unit-testable headlessly.

**Tech Stack:** TypeScript, PEG.js 0.10 (`npm run peg` regenerates `src/ts/fsl_parser.ts`), Vitest (spec + stoch configs, 100% coverage on spec), CodeMirror 6 (sketch only).

**Design spec:** `notes/superpowers/specs/2026-06-07-parser-source-locations-design.md`

---

## Conventions for every task

- **Fast TDD loop after a grammar (`.peg`) edit:** `npm run peg` then `npm run vitest-spec <file>`. Pure-TS edits (compiler/error/types) skip `npm run peg`.
- **Run one spec file:** `npx vitest run --config vitest.spec.config.ts src/ts/tests/<file>.spec.ts`
- **Run one stoch file:** `npx vitest run --config vitest.stoch.config.ts src/ts/tests/<file>.stoch.ts`
- **No new `any` tokens** anywhere under `src/ts/**` (the `audit` step in `npm run vet` scans for the literal word `any`, including tests). Use `unknown` + guards or the typed `loc?` fields added in Task 1.
- **`fsl_parser.ts` is generated** — never hand-edit it; edit `src/ts/fsl_parser.peg` and run `npm run peg`. It is excluded from coverage, so grammar code needs no tests of its own beyond the located parse tests.
- **Commit after each task** with a Conventional Commits message. Do **not** bump the version mid-plan; the version bump happens once via `/sc-commit` in the final task.
- **Baseline first:** before Task 1, run `npm install` in this worktree, then `npm run peg && npm run vitest-spec` and confirm green. If red, stop and report.

---

## File structure

**Modify:**
- `src/ts/fsl_parser.peg` — add `options.locations`-gated `loc`/`*_loc` to object nodes (Tasks 2–11).
- `src/ts/jssm_types.ts` — `FslSourceLocation` type, optional `loc`/`*_loc` fields, `source_location?` on `JssmErrorExtendedInfo` (Task 1).
- `src/ts/jssm_error.ts` — read/store `source_location` (Task 13).
- `src/ts/jssm_compiler.ts` — `nth_matching_loc` helper + attach `source_location` at semantic-error throw sites (Tasks 14–15).
- `sketch/cm6-editor/editor.js` — use the new helper, import `compile` (Task 17).

**Create:**
- `src/ts/tests/locations.spec.ts` — opt-in guard + object-node + sub-span tests (Tasks 2–11).
- `src/ts/tests/locations.stoch.ts` — generic "every node" well-formedness walk (Task 12).
- `src/ts/tests/error_locations.spec.ts` — compiler semantic-error location tests (Task 15).
- `sketch/cm6-editor/diagnostics.mjs` — pure `diagnosticsFor(text, parse, compile)` (Task 16).
- `src/ts/tests/diagnostics_helper.spec.ts` — unit tests for `diagnosticsFor` (Task 16).

---

## Task 1: Types foundation

**Files:**
- Modify: `src/ts/jssm_types.ts` (add type near `JssmCompileSe`/`JssmCompileSeStart` ~`:581`–`:619`, and `JssmErrorExtendedInfo` `:942`)

- [ ] **Step 1: Add the `FslSourceLocation` type and export it**

Add near the other compiler-intermediate types (after `JssmCompileRule`, ~`:566`):

```ts
/**
 *  A source span produced by the FSL parser when `parse(input, { locations:
 *  true })` is used.  Mirrors PEG.js's native `location()` shape: byte
 *  `offset`s (0-based, half-open) plus 1-based `line`/`column` for display.
 *
 *  ```typescript
 *  const [t] = parse('a -> b;', { locations: true });
 *  // t.loc === { start: { offset: 0, line: 1, column: 1 },
 *  //             end:   { offset: 7, line: 1, column: 8 } }
 *  ```
 */
type FslSourcePoint    = { offset: number, line: number, column: number };
type FslSourceLocation = { start: FslSourcePoint, end: FslSourcePoint };
```

- [ ] **Step 2: Add optional location fields to the parse-tree node types**

In `JssmCompileSe` (`:581`) add (keep existing fields):

```ts
  loc            ? : FslSourceLocation,
  to_loc         ? : FslSourceLocation,
  l_action_loc   ? : FslSourceLocation,
  r_action_loc   ? : FslSourceLocation,
```

In `JssmCompileSeStart` (`:608`) add:

```ts
  loc            ? : FslSourceLocation,
  from_loc       ? : FslSourceLocation,
  value_loc      ? : FslSourceLocation,
  name_loc       ? : FslSourceLocation,
```

- [ ] **Step 3: Add `source_location` to `JssmErrorExtendedInfo`**

Change `JssmErrorExtendedInfo` (`:942`) to:

```ts
type JssmErrorExtendedInfo = {
  requested_state? : StateType | undefined,
  source_location? : FslSourceLocation
};
```

- [ ] **Step 4: Export `FslSourceLocation`**

In the `export { ... }` type block (near `:1255` where `JssmErrorExtendedInfo` is exported), add `FslSourceLocation,` (and `FslSourcePoint,` if you want it public; it is referenced only by `FslSourceLocation`, exporting the pair is fine).

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. (If `fsl_parser.ts` is missing, run `npm run peg` first.)

- [ ] **Step 6: Commit**

```bash
git add src/ts/jssm_types.ts
git commit -m "feat(types): add FslSourceLocation and optional loc fields for opt-in parser locations"
```

---

## Task 2: Opt-in guard + located transition nodes (grammar core)

This task proves the opt-in contract and tags the most important node: transitions.

**Files:**
- Modify: `src/ts/fsl_parser.peg` (`Exp` `:785`, `Subexp` `:738`)
- Create: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/ts/tests/locations.spec.ts`:

```ts
/* eslint-disable max-len */

import * as jssm from '../jssm';
import type { FslSourceLocation } from '../jssm_types';

const slice = (src: string, loc: FslSourceLocation) =>
  src.slice(loc.start.offset, loc.end.offset);

describe('parser source locations — opt-in contract', () => {

  test('default parse attaches no loc', () => {
    const tree = jssm.parse('a -> b;');
    expect(tree[0].loc).toBeUndefined();
  });

  test('empty options attaches no loc', () => {
    const tree = jssm.parse('a -> b;', {});
    expect(tree[0].loc).toBeUndefined();
  });

  test('existing equality output is unchanged under default parse', () => {
    expect(jssm.parse('a -> b;')).toEqual(
      [{ key: 'transition', from: 'a', se: { kind: '->', to: 'b' } }]
    );
  });

});

describe('parser source locations — transitions', () => {

  test('transition node carries a loc starting at the source', () => {
    const src  = 'a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].loc).toBeDefined();
    expect(tree[0].loc!.start.offset).toBe(0);
    expect(slice(src, tree[0].loc!)).toContain('a -> b');
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run peg`
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/locations.spec.ts`
Expected: the "transitions" test FAILS (`tree[0].loc` is undefined); the opt-in-contract tests PASS already.

- [ ] **Step 3: Edit the grammar — `Exp` and `Subexp`**

In `Exp` (`:785`), change the action's tail from:

```pegjs
    const base: any = { key: 'transition', from: label };
    if (se) { base.se = se; }
    return base;
```

to:

```pegjs
    const base: any = { key: 'transition', from: label };
    if (se) { base.se = se; }
    if (options.locations) { base.loc = location(); }
    return base;
```

In `Subexp` (`:738`), change the tail from:

```pegjs
      if (tail) { base.se = tail; }

      return base;
```

to:

```pegjs
      if (tail) { base.se = tail; }

      if (options.locations) { base.loc = location(); }

      return base;
```

- [ ] **Step 4: Regenerate and run**

Run: `npm run peg`
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/locations.spec.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts src/ts/tests/locations.spec.ts
git commit -m "feat(parser): opt-in source locations on transition nodes"
```

---

## Task 3: Located machine-attribute nodes

The machine attributes (`MachineName`, `FslVersion`, etc.) share one shape: `{ key, value }`. Apply the identical mechanical transform to each.

**The mechanical transform (apply to every rule listed below):** wherever an action returns an object literal directly, bind it to a `const node`, add the gated `loc`, and return `node`. Example — `MachineName` (`:1013`):

Before:
```pegjs
MachineName
  = WS? "machine_name" WS? ":" WS? value:Label WS? ";" WS? { return { key: "machine_name", value }; }
```
After:
```pegjs
MachineName
  = WS? "machine_name" WS? ":" WS? value:Label WS? ";" WS? {
      const node = { key: "machine_name", value };
      if (options.locations) { node.loc = location(); }
      return node;
    }
```

**Files:**
- Modify: `src/ts/fsl_parser.peg`
- Modify: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the failing test**

Append to `locations.spec.ts`:

```ts
describe('parser source locations — machine attributes', () => {

  test('machine_name node carries a loc spanning the statement', () => {
    const src  = 'machine_name: foo;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('machine_name: foo;');
  });

  test('fsl_version node carries a loc', () => {
    const src  = 'fsl_version: 1.2.3; a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('fsl_version: 1.2.3;');
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run peg && npx vitest run --config vitest.spec.config.ts src/ts/tests/locations.spec.ts`
Expected: the two new tests FAIL.

> Note: the `&&` above is acceptable inside this plan's instructions, but when *you* run commands in the session, issue `npm run peg` and the vitest command as two separate calls (project rule: no compound shell commands).

- [ ] **Step 3: Apply the transform to all machine-attribute rules**

Apply the mechanical transform to each of these rules (all return `{ key, value }`):

`MachineAuthor` `:1001`, `MachineContributor` `:1004`, `MachineComment` `:1007`, `MachineDefinition` `:1010`, `MachineName` `:1013`, `MachineReference` `:1016`, `MachineVersion` `:1019`, `MachineLicense` `:1022`, `MachineLanguage` `:1025`, `FslVersion` `:1028`, `MachineTheme` `:1031`, `MachineFlow` `:1034`, `MachineHookDefinition` `:1037`, `DotPreamble` `:1040`.

Also apply it to `SemVer` (`:391`), whose action returns `{ major, minor, patch, full }` — bind to `const node`, add the gated `node.loc = location();`, return `node`.

- [ ] **Step 4: Regenerate and run**

Run: `npm run peg`
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/locations.spec.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts src/ts/tests/locations.spec.ts
git commit -m "feat(parser): opt-in source locations on machine-attribute nodes"
```

---

## Task 4: Located state-declaration nodes and items

**Files:**
- Modify: `src/ts/fsl_parser.peg`
- Modify: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
describe('parser source locations — state declarations', () => {

  test('state_declaration node carries a loc', () => {
    const src  = 'state alpha: { color: red; }; alpha -> beta;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].key).toBe('state_declaration');
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('state alpha:');
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run peg`, then the vitest command. Expected: new test FAILS.

- [ ] **Step 3: Apply the transform**

Apply the mechanical transform (bind to `const node`, gated `node.loc`, return `node`) to:

`StateDeclaration` `:1133` (`{ key, name, value }`), and each state-item rule that returns an object:
`SdStateLabel` `:1075`, `SdStateColor` `:1078`, `SdStateTextColor` `:1081`, `SdStateBackgroundColor` `:1084`, `SdStateBorderColor` `:1087`, `SdStateShape` `:1090`, `SdStateCorners` `:1093`, `SdStateLineStyle` `:1096` (two alternatives — apply to both), `SdStateImage` `:1101`, `SdStateUrl` `:1104`, `SdStateProperty` `:1108` (two alternatives — apply to both).

- [ ] **Step 4: Regenerate and run**

Run `npm run peg`, then the vitest command. Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts src/ts/tests/locations.spec.ts
git commit -m "feat(parser): opt-in source locations on state declarations and items"
```

---

## Task 5: Located config-block nodes and items

**Files:**
- Modify: `src/ts/fsl_parser.peg`
- Modify: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
describe('parser source locations — config blocks', () => {

  test('graph_layout config node carries a loc', () => {
    const src  = 'graph_layout: dot; a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('graph_layout: dot;');
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run `npm run peg`, then the vitest command. Expected: FAIL.

- [ ] **Step 3: Apply the transform**

Apply the mechanical transform to the config rules and their item rules:

Config value rules (`{ key, value }`): `ConfigGraphLayout` `:921`, `ConfigStartNodes` `:924`, `ConfigEndNodes` `:927`, `ConfigGraphBgColor` `:930`, `ConfigAllowsOverride` `:933`.

Config block rules (`{ config_kind, config_items }` or `{ key, value }`): `ConfigValidation` `:808`, `ConfigState` `:836`, `ConfigStartState` `:841`, `ConfigEndState` `:846`, `ConfigActiveState` `:851`, `ConfigTerminalState` `:856`, `ConfigHookedState` `:861`, `ConfigAction` `:888`, `ConfigTransition` `:912`.

Config item rules (`{ key, value }`): `ValidationItem` `:802`, `ActionItem` `:882`, `TransitionItem` `:901`, `GraphDefaultEdgeColor` `:908` (two alternatives), `SingleEdgeColor` `:632` (two alternatives), `TransitionLineStyle` `:636`.

- [ ] **Step 4: Regenerate and run**

Run `npm run peg`, then the vitest command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts src/ts/tests/locations.spec.ts
git commit -m "feat(parser): opt-in source locations on config blocks and items"
```

---

## Task 6: Located remaining object nodes

Covers the rest of the object-returning rules: named lists, arrange declarations, properties, arrow decorations/targets, stripe/cycle, arrow items, probability.

**Files:**
- Modify: `src/ts/fsl_parser.peg`
- Modify: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
describe('parser source locations — other top-level nodes', () => {

  test('named_list node carries a loc', () => {
    const src  = '&group: [a b c]; a -> b;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].key).toBe('named_list');
    expect(tree[0].loc).toBeDefined();
    expect(slice(src, tree[0].loc!)).toContain('&group:');
  });

  test('arrange declaration node carries a loc', () => {
    const src  = 'a -> b; arrange [a b];';
    const tree = jssm.parse(src, { locations: true });
    const node = tree.find(n => n.key === 'arrange_declaration');
    expect(node).toBeDefined();
    expect(node!.loc).toBeDefined();
    expect(slice(src, node!.loc!)).toContain('arrange [a b];');
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run `npm run peg`, then the vitest command. Expected: FAIL.

- [ ] **Step 3: Apply the transform**

Apply the mechanical transform to:

`NamedList` `:1140` (`{ key, name, value }`), `MachineProperty` `:1152` (four alternatives — apply to all four), `RegularArrangeDeclaration` `:1162`, `ArrangeStartDeclaration` `:1165`, `ArrangeEndDeclaration` `:1168`, `ArrowItem` `:629`, `ArrowProbability` `:647`, `Stripe` `:704` (two alternatives), `Cycle` `:708` (three alternatives).

For `ArrowDecoration` (`:729`, four alternatives returning `{ _kind, v }`): these are internal markers flattened by `Subexp`, and they already get their span via the parent `Subexp` node's `loc`. **Do not** add `loc` to them here; the action-label sub-span is handled in Task 10.

- [ ] **Step 4: Regenerate and run**

Run `npm run peg`, then the vitest command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts src/ts/tests/locations.spec.ts
git commit -m "feat(parser): opt-in source locations on remaining object nodes"
```

---

## Task 7: Sub-span — state name (`name_loc`)

Approach C: capture the exact span of a leaf into a sibling field, via a `location()`-gated inline sub-rule so the no-locations shape is untouched.

**Files:**
- Modify: `src/ts/fsl_parser.peg` (`StateDeclaration` `:1133`)
- Modify: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
describe('parser source locations — sub-spans', () => {

  test('state name sub-span pinpoints the name', () => {
    const src  = 'state alpha: { color: red; }; alpha -> beta;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].name_loc).toBeDefined();
    expect(slice(src, tree[0].name_loc!)).toBe('alpha');
  });

  test('state name sub-span absent without locations', () => {
    const tree = jssm.parse('state alpha: { color: red; };');
    expect(tree[0].name_loc).toBeUndefined();
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run `npm run peg`, then the vitest command. Expected: first new test FAILS.

- [ ] **Step 3: Edit `StateDeclaration`**

Change `StateDeclaration` (`:1133`) from:

```pegjs
StateDeclaration
  = WS? "state" WS name:Label WS? ":" WS? value:StateDeclarationDesc WS? ";" WS? { return { key:'state_declaration', name, value }; }
```

to:

```pegjs
StateDeclaration
  = WS? "state" WS
    name:( n:Label { return options.locations ? { __v: n, __loc: location() } : n; } )
    WS? ":" WS? value:StateDeclarationDesc WS? ";" WS? {
      const raw  = options.locations ? name.__v : name;
      const node: any = { key: 'state_declaration', name: raw, value };
      if (options.locations) { node.loc = location(); node.name_loc = name.__loc; }
      return node;
    }
```

- [ ] **Step 4: Regenerate and run**

Run `npm run peg`, then the vitest command. Expected: PASS. Also re-run the Task 4 state-declaration test to confirm no regression.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts src/ts/tests/locations.spec.ts
git commit -m "feat(parser): state-name sub-span (name_loc)"
```

---

## Task 8: Sub-spans — transition source/target (`from_loc`, `to_loc`)

**Files:**
- Modify: `src/ts/fsl_parser.peg` (`Exp` `:785`, `Subexp` `:738`)
- Modify: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
  test('transition from/to sub-spans pinpoint the states', () => {
    const src  = 'alpha -> beta;';
    const tree = jssm.parse(src, { locations: true });
    expect(slice(src, tree[0].from_loc!)).toBe('alpha');
    expect(slice(src, tree[0].se!.to_loc!)).toBe('beta');
  });
```

- [ ] **Step 2: Run to verify failure**

Run `npm run peg`, then the vitest command. Expected: FAIL.

- [ ] **Step 3: Edit `Exp` and `Subexp`**

`Exp` (`:785`) — capture the `from` label's span. Change:

```pegjs
Exp
  = label:ArrowTarget se:Subexp WS? ';' WS? {
```

to:

```pegjs
Exp
  = label:( l:ArrowTarget { return options.locations ? { __v: l, __loc: location() } : l; } )
    se:Subexp WS? ';' WS? {
```

and in the body replace `from: label` with the unwrapped value and add `from_loc`:

```pegjs
    const fromVal = options.locations ? label.__v : label;
    const base: any = { key: 'transition', from: fromVal };
    if (se) { base.se = se; }
    if (options.locations) { base.loc = location(); base.from_loc = label.__loc; }
    return base;
```

`Subexp` (`:738`) — capture the `label` (target) span. Change the `label : ArrowTarget` capture line:

```pegjs
    WS? label : ArrowTarget
```

to:

```pegjs
    WS? label : ( l:ArrowTarget { return options.locations ? { __v: l, __loc: location() } : l; } )
```

and in the body, where `to: label` is used and the node is finalized, unwrap and add `to_loc`:

```pegjs
      const toVal = options.locations ? label.__v : label;
      const base: any = { kind: arrow, to: toVal };
      // ... existing pre/post decoration loop unchanged ...
      if (tail) { base.se = tail; }
      if (options.locations) { base.loc = location(); base.to_loc = label.__loc; }
      return base;
```

> The decoration loops in `Subexp` reference `arrow`, `pre`, `post`, `tail` — leave those untouched; only the `to`/`label` handling and the trailing `loc` block change.

- [ ] **Step 4: Regenerate and run**

Run `npm run peg`, then the vitest command. Expected: PASS. Re-run the Task 2 transition test to confirm no regression (the equality test under default parse must still pass — verifies `to`/`from` remain bare values when locations are off).

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts src/ts/tests/locations.spec.ts
git commit -m "feat(parser): transition from/to sub-spans (from_loc, to_loc)"
```

---

## Task 9: Sub-span — machine-attribute value (`value_loc`)

Pick one representative attribute that takes a `Label` value: `MachineName`. (The same wrapper pattern can later be applied to other attributes; v1 wires `MachineName` to validate the mechanism end-to-end.)

**Files:**
- Modify: `src/ts/fsl_parser.peg` (`MachineName` `:1013`)
- Modify: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
  test('machine_name value sub-span pinpoints the value', () => {
    const src  = 'machine_name: foo;';
    const tree = jssm.parse(src, { locations: true });
    expect(tree[0].value_loc).toBeDefined();
    expect(slice(src, tree[0].value_loc!)).toBe('foo');
  });
```

- [ ] **Step 2: Run to verify failure**

Run `npm run peg`, then the vitest command. Expected: FAIL.

- [ ] **Step 3: Edit `MachineName`**

```pegjs
MachineName
  = WS? "machine_name" WS? ":" WS?
    value:( v:Label { return options.locations ? { __v: v, __loc: location() } : v; } )
    WS? ";" WS? {
      const raw = options.locations ? value.__v : value;
      const node: any = { key: "machine_name", value: raw };
      if (options.locations) { node.loc = location(); node.value_loc = value.__loc; }
      return node;
    }
```

- [ ] **Step 4: Regenerate and run**

Run `npm run peg`, then the vitest command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts src/ts/tests/locations.spec.ts
git commit -m "feat(parser): machine_name value sub-span (value_loc)"
```

---

## Task 10: Sub-span — action labels (`l_action_loc` / `r_action_loc`)

Action labels reach the node through `Subexp`'s decoration flattening. Capture the `ActionLabel` span on the decoration, then copy it onto the node alongside `l_action` / `r_action`.

**Files:**
- Modify: `src/ts/fsl_parser.peg` (`ArrowDecoration` `:729`, `Subexp` `:738`)
- Modify: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the failing test**

Append:

```ts
  test('action-label sub-spans pinpoint the labels', () => {
    const src  = "a 'go' -> 'stop' b;";
    const tree = jssm.parse(src, { locations: true });
    // pre-arrow action → r_action; post-arrow action → l_action (existing convention)
    expect(slice(src, tree[0].se!.r_action_loc!)).toBe("'go'");
    expect(slice(src, tree[0].se!.l_action_loc!)).toBe("'stop'");
  });
```

- [ ] **Step 2: Run to verify failure**

Run `npm run peg`, then the vitest command. Expected: FAIL.

- [ ] **Step 3: Edit `ArrowDecoration` action alternative**

Change the action alternative (`:731`) from:

```pegjs
  / v:ActionLabel       { return { _kind: 'action', v: v }; }
```

to:

```pegjs
  / v:ActionLabel       { return { _kind: 'action', v: v, loc: location() }; }
```

(The `loc` here is always computed; it is internal to the decoration object, which never escapes `Subexp`, so it does not affect the default AST shape.)

- [ ] **Step 4: Edit `Subexp` decoration loops to thread the action loc**

In `Subexp` (`:738`), in the `for (const d of pre)` loop, where it sets `base.r_action`, also set the loc when enabled:

```pegjs
        if (d._kind === 'action' && d.v != null) {
          base.r_action = d.v;
          if (options.locations) { base.r_action_loc = d.loc; }
        }
```

and in the `for (const d of post)` loop, where it sets `base.l_action`:

```pegjs
        if (d._kind === 'action' && d.v != null) {
          base.l_action = d.v;
          if (options.locations) { base.l_action_loc = d.loc; }
        }
```

- [ ] **Step 5: Regenerate and run**

Run `npm run peg`, then the vitest command. Expected: PASS. Re-run the whole `locations.spec.ts` to confirm no regression across all sub-spans.

- [ ] **Step 6: Commit**

```bash
git add src/ts/fsl_parser.peg src/ts/fsl_parser.ts src/ts/tests/locations.spec.ts
git commit -m "feat(parser): action-label sub-spans (l_action_loc, r_action_loc)"
```

> **Deferred (documented):** the color-value sub-span from the spec is intentionally **not** implemented here. Color values live in nested state/config item objects whose static types are loose; adding a typed `value_loc` there would require retyping those item structures. The item object itself already carries a whole-statement `loc` (Task 4/5), which is sufficient for diagnostics. Per-leaf color spans are deferred to the future semantic-features plan.

---

## Task 11: Whole-tree opt-in regression sweep

Lock the invariant that **no** existing equality test changed and that turning locations on never alters non-`loc` fields.

**Files:**
- Modify: `src/ts/tests/locations.spec.ts`

- [ ] **Step 1: Write the test**

Append a test that strips `*loc*` keys from a located parse and asserts it deep-equals the default parse:

```ts
describe('parser source locations — located output minus loc equals default', () => {

  const stripLoc = (value: unknown): unknown => {
    if (Array.isArray(value)) { return value.map(stripLoc); }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k === 'loc' || k.endsWith('_loc')) { continue; }
        out[k] = stripLoc(v);
      }
      return out;
    }
    return value;
  };

  const sources = [
    'a -> b;',
    'machine_name: foo; a -> b;',
    'state alpha: { color: red; }; alpha -> beta;',
    "a 'go' -> 'stop' b;",
    '&group: [a b c]; a -> b; arrange [a b];',
    'graph_layout: dot; a -> b;'
  ];

  for (const src of sources) {
    test(`stripping loc reproduces default parse: ${src}`, () => {
      const located = jssm.parse(src, { locations: true });
      const plain   = jssm.parse(src);
      expect(stripLoc(located)).toEqual(plain);
    });
  }

});
```

- [ ] **Step 2: Run**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/locations.spec.ts`
Expected: PASS. (If any case fails, a located edit leaked a non-`loc` field change — fix that rule.)

- [ ] **Step 3: Commit**

```bash
git add src/ts/tests/locations.spec.ts
git commit -m "test(parser): lock opt-in invariant (located minus loc equals default)"
```

---

## Task 12: Stochastic "every node" well-formedness

**Files:**
- Create: `src/ts/tests/locations.stoch.ts`

- [ ] **Step 1: Write the stochastic test**

Look at an existing `*.stoch.ts` (e.g. `src/ts/tests/transition_chain.stoch.ts`) for the `fast-check` import/style, then create `src/ts/tests/locations.stoch.ts`:

```ts
/* eslint-disable max-len */

import * as fc   from 'fast-check';
import * as jssm from '../jssm';

const isLoc = (v: unknown): v is { start: { offset: number }, end: { offset: number } } => {
  if (!v || typeof v !== 'object') { return false; }
  const o = v as Record<string, unknown>;
  const s = o.start as Record<string, unknown> | undefined;
  const e = o.end   as Record<string, unknown> | undefined;
  return !!s && !!e && typeof s.offset === 'number' && typeof e.offset === 'number';
};

const walk = (node: unknown, len: number, check: (loc: { start: { offset: number }, end: { offset: number } }) => void): void => {
  if (Array.isArray(node)) { node.forEach(n => walk(n, len, check)); return; }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if ((k === 'loc' || k.endsWith('_loc')) && isLoc(v)) { check(v); }
      else { walk(v, len, check); }
    }
  }
};

describe('parser source locations — stochastic well-formedness', () => {

  test('every loc is in-bounds and non-inverted for random valid machines', () => {
    const stateName = fc.stringMatching(/^[a-z][a-z0-9]{0,5}$/);
    const edge = fc.tuple(stateName, stateName).map(([a, b]) => `${a} -> ${b};`);

    fc.assert(fc.property(fc.array(edge, { minLength: 1, maxLength: 8 }), (edges) => {
      const src  = edges.join('\n');
      const tree = jssm.parse(src, { locations: true });
      walk(tree, src.length, (loc) => {
        expect(loc.start.offset).toBeGreaterThanOrEqual(0);
        expect(loc.end.offset).toBeLessThanOrEqual(src.length);
        expect(loc.start.offset).toBeLessThanOrEqual(loc.end.offset);
      });
    }));
  });

});
```

- [ ] **Step 2: Run**

Run: `npx vitest run --config vitest.stoch.config.ts src/ts/tests/locations.stoch.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/ts/tests/locations.stoch.ts
git commit -m "test(parser): stochastic loc well-formedness across random machines"
```

---

## Task 13: `JssmError` carries `source_location`

**Files:**
- Modify: `src/ts/jssm_error.ts`
- Modify: `src/ts/tests/` — add a small spec (or extend an existing error spec) `src/ts/tests/error_locations.spec.ts` (created here, extended in Task 15)

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/error_locations.spec.ts`:

```ts
/* eslint-disable max-len */

import { JssmError } from '../jssm_error';

describe('JssmError source_location', () => {

  test('stores a provided source_location', () => {
    const loc = { start: { offset: 3, line: 1, column: 4 }, end: { offset: 8, line: 1, column: 9 } };
    const err = new JssmError(undefined, 'boom', { source_location: loc });
    expect(err.source_location).toEqual(loc);
  });

  test('is undefined when no extended info is given', () => {
    const err = new JssmError(undefined, 'boom');
    expect(err.source_location).toBeUndefined();
  });

  test('message string is unchanged by source_location', () => {
    const loc = { start: { offset: 0, line: 1, column: 1 }, end: { offset: 1, line: 1, column: 2 } };
    const a = new JssmError(undefined, 'boom');
    const b = new JssmError(undefined, 'boom', { source_location: loc });
    expect(b.message).toBe(a.message);
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/error_locations.spec.ts`
Expected: FAIL (`source_location` not a property).

- [ ] **Step 3: Edit `JssmError`**

In `src/ts/jssm_error.ts`, import the type and add the field. Change the class fields and the JEEI destructure:

```ts
import { JssmErrorExtendedInfo, FslSourceLocation } from './jssm_types';
```

Add a field declaration (near `requested_state`, `:32`):

```ts
  source_location : FslSourceLocation | undefined;
```

Change the destructure (`:36`) from:

```ts
    const { requested_state } = (JEEI === undefined)
      ? { requested_state: undefined }
      : JEEI;
```

to:

```ts
    const { requested_state, source_location } = (JEEI === undefined)
      ? { requested_state: undefined, source_location: undefined }
      : JEEI;
```

After `this.requested_state = requested_state;` (`:65`), add:

```ts
    this.source_location = source_location;
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/error_locations.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/jssm_error.ts src/ts/tests/error_locations.spec.ts
git commit -m "feat(error): JssmError carries optional source_location"
```

---

## Task 14: `nth_matching_loc` compiler helper

A pure helper that returns the `loc` of the nth parse-tree node matching a predicate, or `undefined`. Unit-tested directly so all branches are covered regardless of the error paths.

**Files:**
- Modify: `src/ts/jssm_compiler.ts`
- Create test: `src/ts/tests/nth_matching_loc.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/nth_matching_loc.spec.ts`:

```ts
/* eslint-disable max-len */

import { nth_matching_loc } from '../jssm_compiler';

const L = (o: number) => ({ start: { offset: o, line: 1, column: o + 1 }, end: { offset: o + 1, line: 1, column: o + 2 } });

describe('nth_matching_loc', () => {

  const tree = [
    { key: 'fsl_version', value: '1', loc: L(0) },
    { key: 'machine_name', value: 'a', loc: L(1) },
    { key: 'fsl_version', value: '2', loc: L(2) },
  ] as any;

  test('returns the nth match loc', () => {
    expect(nth_matching_loc(tree, n => n.key === 'fsl_version', 2)).toEqual(L(2));
  });

  test('returns the first match loc for n=1', () => {
    expect(nth_matching_loc(tree, n => n.key === 'machine_name', 1)).toEqual(L(1));
  });

  test('returns undefined when fewer than n matches', () => {
    expect(nth_matching_loc(tree, n => n.key === 'machine_name', 2)).toBeUndefined();
  });

  test('returns undefined (not throw) when matched node has no loc', () => {
    const noLoc = [{ key: 'fsl_version', value: '1' }] as any;
    expect(nth_matching_loc(noLoc, n => n.key === 'fsl_version', 1)).toBeUndefined();
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/nth_matching_loc.spec.ts`
Expected: FAIL (`nth_matching_loc` not exported).

- [ ] **Step 3: Implement and export the helper**

In `src/ts/jssm_compiler.ts`, add (after the imports, before `makeTransition`):

```ts
/*********
 *
 *  Returns the source span of the `n`-th parse-tree node (1-based) matching
 *  `predicate`, or `undefined` if there are fewer than `n` matches or the
 *  matched node carries no location.  Used to point semantic compile errors
 *  at the offending statement when the tree was produced with
 *  `parse(input, { locations: true })`.
 *
 *  @internal
 *
 *  @param tree      The parse tree to scan.
 *  @param predicate Node test.
 *  @param n         1-based ordinal of the matching node to return.
 *
 *  @returns The matching node's `loc`, or `undefined`.
 *
 */

function nth_matching_loc<StateType, mDT>(
  tree      : JssmParseTree<StateType, mDT>,
  predicate : (node: JssmCompileSeStart<StateType, mDT>) => boolean,
  n         : number
): FslSourceLocation | undefined {

  let count = 0;

  for (const node of tree) {
    if (predicate(node)) {
      count++;
      if (count === n) { return node.loc; }
    }
  }

  return undefined;

}
```

Add `FslSourceLocation` to the type import from `./jssm_types` (the `import { ... } from './jssm_types'` block at `:16`). Add `nth_matching_loc` to the `export { ... }` block at the bottom (`:539`).

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/nth_matching_loc.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ts/jssm_compiler.ts src/ts/tests/nth_matching_loc.spec.ts
git commit -m "feat(compiler): add nth_matching_loc tree-scan helper"
```

---

## Task 15: Attach `source_location` to semantic compile errors

**Files:**
- Modify: `src/ts/jssm_compiler.ts` (`compile` `:368`, `compile_rule_handler` `:256`)
- Modify: `src/ts/tests/error_locations.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/ts/tests/error_locations.spec.ts`:

```ts
import { parse } from '../fsl_parser';
import { compile } from '../jssm_compiler';

const slice = (src: string, loc: any) => src.slice(loc.start.offset, loc.end.offset);

const compileErr = (src: string, located: boolean) => {
  try {
    compile(parse(src, located ? { locations: true } : {}) as any);
  } catch (e) {
    return e as any;
  }
  throw new Error('expected compile to throw');
};

describe('compiler semantic errors carry source_location when located', () => {

  test('duplicate one-only statement points at the second occurrence', () => {
    const src = 'fsl_version: 1.0.0;\nfsl_version: 2.0.0;\na -> b;';
    const err = compileErr(src, true);
    expect(err.source_location).toBeDefined();
    expect(slice(src, err.source_location)).toContain('fsl_version: 2.0.0;');
  });

  test('repeated property points at a duplicate', () => {
    const src = 'property foo default 1;\nproperty foo default 2;\na -> b;';
    const err = compileErr(src, true);
    expect(err.source_location).toBeDefined();
    expect(slice(src, err.source_location)).toContain('property foo');
  });

  test('no source_location without locations (message unchanged)', () => {
    const src = 'fsl_version: 1.0.0;\nfsl_version: 2.0.0;\na -> b;';
    const located   = compileErr(src, true);
    const unlocated = compileErr(src, false);
    expect(unlocated.source_location).toBeUndefined();
    expect(unlocated.base_message).toBe(located.base_message);
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/error_locations.spec.ts`
Expected: the two located tests FAIL (`source_location` undefined); the "no location" test PASSES.

- [ ] **Step 3: Wire `source_location` into the one-only error**

`compile` keeps a reference to the tree it received. In the `oneOnlyKeys.map(...)` block (`:468`), change the throw from:

```ts
      throw new JssmError(undefined,
        `May only have one ${oneOnlyKey} statement maximum: ${JSON.stringify(results[oneOnlyKey])}`
      );
```

to:

```ts
      throw new JssmError(undefined,
        `May only have one ${oneOnlyKey} statement maximum: ${JSON.stringify(results[oneOnlyKey])}`,
        { source_location: nth_matching_loc(tree, (n) => n.key === oneOnlyKey, 2) }
      );
```

- [ ] **Step 4: Wire `source_location` into the repeated-property error**

In the repeated-property check (`:449`), change:

```ts
  if (repeat_props.length) {
    throw new JssmError(undefined, `Cannot repeat property definitions.  Saw ${JSON.stringify(repeat_props)}`);
  }
```

to:

```ts
  if (repeat_props.length) {
    const dup = repeat_props[0];
    throw new JssmError(undefined,
      `Cannot repeat property definitions.  Saw ${JSON.stringify(repeat_props)}`,
      { source_location: nth_matching_loc(tree, (n) => n.key === 'property_definition' && n.name === dup, 2) }
    );
  }
```

- [ ] **Step 5: Wire `source_location` into the state-declaration errors**

In `compile_rule_handler` (`:283`), the "State declarations must have a name" throw becomes:

```ts
  if (rule.key === 'state_declaration') {
    if (!rule.name) {
      throw new JssmError(undefined, 'State declarations must have a name',
        { source_location: rule.loc });
    }
    return { agg_as: 'state_declaration', val: { state: rule.name, declarations: rule.value } };
  }
```

For the double-bind error in the state-property re-walk (`:501`), point at the offending state declaration by name:

```ts
        if (result_cfg.state_property.findIndex(c => c.name === label) !== -1) {
          throw new JssmError(undefined,
            `A state may only bind a property once (${sd.state} re-binds ${decl.name})`,
            { source_location: nth_matching_loc(tree, (n) => n.key === 'state_declaration' && n.name === sd.state, 1) }
          );
        } else {
```

> `compile_rule_handler` receives `rule` (a `JssmCompileSeStart`) which now has the optional `loc`. The state-property re-walk runs inside `compile`, which has `tree` in scope.

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/error_locations.spec.ts`
Expected: all PASS.

- [ ] **Step 7: Run the full spec suite for coverage**

Run: `npm run peg`
Run: `npm run vitest-spec`
Expected: PASS with **100% coverage** (the new `nth_matching_loc` branches and throw sites are all exercised). If a branch is uncovered, add a targeted case (e.g. a `state_declaration`-without-name source string) until green.

- [ ] **Step 8: Commit**

```bash
git add src/ts/jssm_compiler.ts src/ts/tests/error_locations.spec.ts
git commit -m "feat(compiler): attach source_location to semantic compile errors"
```

---

## Task 16: Pure `diagnosticsFor` helper for the editor

A dependency-injected, DOM-free helper that runs parse → compile and returns CM6-style diagnostics. Lives in the sketch but is unit-tested headlessly by injecting the TS-source `parse`/`compile`.

**Files:**
- Create: `sketch/cm6-editor/diagnostics.mjs`
- Create: `src/ts/tests/diagnostics_helper.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/diagnostics_helper.spec.ts`:

```ts
/* eslint-disable max-len */

// The helper is pure (no imports of its own); inject the TS-source parse/compile.
import { diagnosticsFor } from '../../../sketch/cm6-editor/diagnostics.mjs';
import { parse }   from '../fsl_parser';
import { compile } from '../jssm_compiler';

const run = (src: string) => diagnosticsFor(src, parse, compile);

describe('diagnosticsFor', () => {

  test('clean machine yields no diagnostics', () => {
    const { diagnostics, ok } = run('a -> b;');
    expect(ok).toBe(true);
    expect(diagnostics).toEqual([]);
  });

  test('syntax error yields a positioned diagnostic', () => {
    const { diagnostics, ok } = run('a -> ;');   // missing target
    expect(ok).toBe(false);
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].severity).toBe('error');
    expect(typeof diagnostics[0].from).toBe('number');
    expect(diagnostics[0].to).toBeGreaterThan(diagnostics[0].from);
  });

  test('semantic error is positioned at the offending statement', () => {
    const src = 'fsl_version: 1.0.0;\nfsl_version: 2.0.0;\na -> b;';
    const { diagnostics, ok } = run(src);
    expect(ok).toBe(false);
    expect(diagnostics.length).toBe(1);
    const d = diagnostics[0];
    expect(src.slice(d.from, d.to)).toContain('fsl_version: 2.0.0;');
  });

});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/diagnostics_helper.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the helper**

Create `sketch/cm6-editor/diagnostics.mjs` (no imports — `parse` and `compile` are injected):

```js
/**
 * Run parse -> compile over `text` and return CM6-style diagnostics plus a
 * status summary.  Pure and DOM-free: pass in `parse` and `compile`.
 *
 * @param {string}   text     FSL source.
 * @param {Function} parse    parse(text, options) -> AST (located when asked).
 * @param {Function} compile  compile(ast) -> config (throws JssmError on
 *                            semantic failure).
 * @returns {{ ok: boolean, status: string,
 *             diagnostics: Array<{from:number,to:number,severity:string,message:string}> }}
 */
export function diagnosticsFor(text, parse, compile) {
  let tree;

  try {
    tree = parse(text, { locations: true });
  } catch (err) {
    const loc = err && err.location;
    if (!loc) {
      return { ok: false, status: (err && err.message) || String(err),
               diagnostics: [{ from: 0, to: Math.max(text.length, 1), severity: 'error',
                               message: (err && err.message) || String(err) }] };
    }
    const from = loc.start.offset;
    const to   = Math.max(loc.end.offset, from + 1);
    return { ok: false, status: err.message,
             diagnostics: [{ from, to, severity: 'error', message: err.message }] };
  }

  try {
    compile(tree);
  } catch (err) {
    const loc = err && err.source_location;
    if (loc) {
      const from = loc.start.offset;
      const to   = Math.max(loc.end.offset, from + 1);
      return { ok: false, status: err.message,
               diagnostics: [{ from, to, severity: 'error', message: err.message }] };
    }
    return { ok: false, status: (err && err.message) || String(err),
             diagnostics: [{ from: 0, to: Math.max(text.length, 1), severity: 'error',
                             message: (err && err.message) || String(err) }] };
  }

  return { ok: true, status: 'parses and compiles cleanly', diagnostics: [] };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/diagnostics_helper.spec.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add sketch/cm6-editor/diagnostics.mjs src/ts/tests/diagnostics_helper.spec.ts
git commit -m "feat(sketch): pure diagnosticsFor helper (parse->compile->diagnostics)"
```

---

## Task 17: Wire the sketch linter to `diagnosticsFor`

**Files:**
- Modify: `sketch/cm6-editor/editor.js`

- [ ] **Step 1: Import `compile` and the helper**

After the existing `import { parse } ...` (`:12`), add:

```js
import { compile }         from "../../dist/es6/jssm_compiler.js";
import { diagnosticsFor }  from "./diagnostics.mjs";
```

> **Verify the `compile` path:** run `ls dist/es6/jssm_compiler.js` (after a build). If the TypeScript build does not emit that file, import `compile` from the package root es6 entry instead — check which of `dist/es6/jssm.js` / `dist/jssm.es6.mjs` exports `compile` and use that specifier. This is the spec's one open question; resolve it against the actual `dist` layout.

- [ ] **Step 2: Replace the linter body**

Replace the `fslLinter` definition (`:38`–`:62`) and the now-unused `offsetFromLineCol` (`:33`–`:36`) with:

```js
const fslLinter = linter((view) => {
  const text = view.state.doc.toString();
  const { ok, status, diagnostics } = diagnosticsFor(text, parse, compile);

  statusEl.textContent   = status;
  statusEl.dataset.state = ok ? "ok" : "err";

  return diagnostics.map(d => ({
    from     : Math.min(d.from, text.length),
    to       : Math.min(Math.max(d.to, d.from + 1), text.length),
    severity : d.severity,
    message  : d.message,
  }));
});
```

- [ ] **Step 3: Manual browser verification**

Build the es6 bundle so the sketch's `dist` imports resolve, then serve from the repo root (the sketch imports `../../dist/...`, so the doc root must be the repo root):

Run: `npm run make` (or the minimal subset that emits `dist/es6/*.js`)
Run (in a separate session, since it is long-running): `npx serve .`
Open: `http://localhost:3000/sketch/cm6-editor/`

Confirm by eye:
- A clean machine shows "parses and compiles cleanly".
- A syntax error (`a -> ;`) underlines the right span.
- A semantic error (two `fsl_version:` lines) now underlines the **second** `fsl_version` statement — previously this showed "parses cleanly".

- [ ] **Step 4: Commit**

```bash
git add sketch/cm6-editor/editor.js
git commit -m "feat(sketch): linter surfaces parse and semantic errors via diagnosticsFor"
```

---

## Task 18: Documentation

**Files:**
- Modify: `src/ts/jssm_compiler.ts` (docblocks for `parse`/`wrap_parse` `:116`, `compile` `:316`)
- Modify: `src/ts/jssm_types.ts` (docblocks already added in Task 1 — verify)
- Modify: `src/ts/jssm_error.ts` (docblock note for `source_location`)

- [ ] **Step 1: Document the `{ locations: true }` option**

In the `wrap_parse` docblock (`:116`) and the `compile` docblock (`:316`), add a paragraph documenting that `parse(input, { locations: true })` adds a `loc` (PEG.js-native `FslSourceLocation`) to AST object nodes plus curated `*_loc` sub-spans, that the default output is unchanged, and that `compile()` ignores `loc` for machine construction but attaches the offending node's span to semantic `JssmError`s. Reference `@see {@link FslSourceLocation}`.

- [ ] **Step 2: Document `JssmError.source_location`**

In the `JssmError` class docblock (`:8`), add a line describing `source_location` as the optional FSL source span of the offending statement, present when the error originated from a located parse tree.

- [ ] **Step 3: Verify diagnostics**

Run: `mcp__ide__getDiagnostics` (or `npx tsc --noEmit -p tsconfig.json`) and confirm no new warnings.

- [ ] **Step 4: Commit**

```bash
git add src/ts/jssm_compiler.ts src/ts/jssm_error.ts src/ts/jssm_types.ts
git commit -m "docs: document opt-in parser locations and JssmError.source_location"
```

---

## Task 19: Full build, version bump, PR

**Files:** none (build + release prep)

- [ ] **Step 1: Full verification build**

Run: `npm run build`
Expected: completes; regenerates README/docs/changelog/etc. Spec suite passes at 100% coverage; stoch + docs suites pass.

> If the typedoc step double-loads (the known nested-worktree failure), confirm this worktree is **outside** the repo tree (it is: `C:\Users\john\projects\worktrees\...`). If it still fails, run `npm run docs` alone to inspect.

- [ ] **Step 2: Review the generated artifact diff**

Run: `git status --short`
Confirm only expected artifacts changed (README, CHANGELOG, docs, dist, fsl_parser.ts). Stage and commit generated artifacts:

```bash
git add -- README.md CHANGELOG.md CHANGELOG.long.md src/doc_md docs dist coverage src/ts/fsl_parser.ts
git commit -m "build: regenerate artifacts for parser source locations"
```

> Use explicit pathspecs (not `git add -A`) per project practice.

- [ ] **Step 3: Version bump + final commit via `/sc-commit`**

Run the `/sc-commit` skill **on this branch** (it bumps the version, rebuilds, and commits — required before opening the PR, and required because every merge to `main` publishes a release).

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin worktree-stonecypher_jssm_feat_26-06-07_parser-source-locations
gh pr create --fill --title "feat: opt-in FSL parser source locations + CM6 diagnostics"
```

In the PR body, include `Closes #<issue>` only if an issue exists (none referenced here). Do **not** merge — `main` is protected; merging needs explicit permission.

---

## Self-review notes (for the implementer)

- **Spec coverage:** parser `loc` (Tasks 2–6), sub-spans (Tasks 7–10, color deferred with rationale), opt-in guard (Tasks 2, 11), compiler error locations (Tasks 14–15), `JssmError` channel (Task 13), linter wiring (Tasks 16–17), tests incl. stochastic (Task 12), docs (Task 18), build/release (Task 19). All spec sections map to a task.
- **Type consistency:** `FslSourceLocation`, `loc`, `from_loc`, `to_loc`, `name_loc`, `value_loc`, `l_action_loc`, `r_action_loc`, `source_location`, and `nth_matching_loc` are named identically across every task that references them.
- **Coverage gate:** the only new *runtime* `src/ts/**` code is in `jssm_error.ts` (no new branch) and `jssm_compiler.ts` (`nth_matching_loc` + throw-site args), each covered by Tasks 13–15; grammar code lives in the coverage-excluded `fsl_parser.ts`.
- **No new `any` tokens** in `src/ts/**` tests/source (the `audit` step scans for the literal word). The grammar's pre-existing `: any` casts are unchanged, not new.
