# Folding `jssm-viz` into `jssm` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the visualization library `jssm-viz` into `jssm` as a `jssm/viz` subpath export, upgrade the visualization engine from `viz.js@2.1.2` to `@viz-js/viz@3.26+`, and add two new convenience functions plus an optional `configure({ DOMParser })` injection point.

**Architecture:** New `src/ts/jssm_viz.ts` (with `jssm_viz_colors.ts`) as a sibling to `jssm.ts`. Subpath-only `package.json#exports` field. Three new Rollup configs (es6/cjs/iife) producing `dist/jssm_viz.{mjs,cjs,iife.cjs}`. `@viz-js/viz` is loaded via a cached `instance()` promise and externalized in all bundles, with the IIFE relying on dynamic `import()` resolved through the host's import map. `*_svg_element` functions throw a clear `JssmError` in Node unless the user calls `configure({ DOMParser })`.

**Tech Stack:** TypeScript 4.7, Jest 29 (ts-jest), Rollup 4, PEG.js, `@viz-js/viz@3`, jsdom (devDep, for testing only).

**Reference spec:** `docs/superpowers/specs/2026-05-04-fold-jssm-viz-into-jssm-design.md`

---

## Conventions used in this plan

- All file paths are relative to the repo root unless absolute.
- Test runs: `npx jest <file> -c jest-spec.config.cjs --color --verbose`. Full spec suite: `npm run jest-spec`.
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `build:`).
- The package version is **NOT** bumped in this plan. Per `CLAUDE.md`, version bumps happen via `/sc-commit` and require explicit user authorization. The plan ends at "ready to ship 5.109.0".
- All TDD-style tasks: write failing test → confirm it fails → write minimal code → confirm it passes → commit.

---

## File structure

**New files:**

- `src/ts/jssm_viz_colors.ts` — Default color palette for graphviz output. Ports `default_colors.ts` from jssm-viz with no semantic changes; renamed for `jssm_*` prefix consistency.
- `src/ts/jssm_viz.ts` — The visualization module. Ported from jssm-viz/src/ts/jssm-viz.ts with API updated for `@viz-js/viz@3`; adds `image_for_state`, `fsl_to_svg_element`, `machine_to_svg_element`, and `configure`.
- `src/ts/tests/viz_dot.spec.ts` — Dot-string smoke tests (~12 cases). Runs in default Node env.
- `src/ts/tests/viz_svg_string.spec.ts` — SVG-string smoke tests (~2 cases). Runs in default Node env.
- `src/ts/tests/viz_svg_element.spec.ts` — SVG-element smoke tests (~3 cases). Uses `@jest-environment jsdom` docblock.
- `rollup.config.viz.es6.js` — ES6 bundle for `jssm/viz`. `@viz-js/viz` external.
- `rollup.config.viz.es5.js` — CJS bundle for `jssm/viz`. `@viz-js/viz` external.
- `rollup.config.viz.iife.js` — IIFE bundle for `jssm/viz`. `@viz-js/viz` external (via dynamic import).
- `src/doc_md/Visualization.md` — User-facing usage guide for `jssm/viz`.
- `MIGRATING-jssm-viz.md` — One-page migration guide (top-level for visibility).

**Modified files:**

- `package.json` — Add `./viz` to `exports`, add `optionalDependencies` with `@viz-js/viz`, add `@viz-js/viz` and `jsdom` to `devDependencies`, remove `@types/viz.js`, add `make_viz_*` and `min_viz_*` scripts and chain into `make`.
- `jest-spec.config.cjs` — Add `jssm_viz.ts` and `jssm_viz_colors.ts` to `coveragePathIgnorePatterns` (smoke-only test scope; comprehensive coverage is a deferred follow-up per the spec's Non-goals).
- `src/doc_md/DocLandingPage.md` — Link to `Visualization.md`.
- `base_README.md` — Add a Visualization section with canonical examples.

**Unchanged:**

- `src/ts/jssm.ts`, `src/ts/jssm_compiler.ts`, `src/ts/jssm_types.ts`, etc. The viz module reads existing public-by-convention internals (`_state_declarations`, `_arrange_*`); no changes to core jssm code are needed for this iteration.

---

## Task 1: Add dependencies for viz code and test environment

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Edit `package.json` to add the new dependencies**

In the `devDependencies` block, add:

```json
"@viz-js/viz": "^3.26.0",
"jsdom": "^24.1.0",
"@types/jsdom": "^21.1.7",
```

In `devDependencies`, **remove** the existing entry:

```json
"@types/viz.js": "^2.1.2",
```

(The `@types/viz.js` entry is the dead types package for old viz.js v2; `@viz-js/viz@3` ships its own types.)

Add a new `optionalDependencies` block at the same level as `dependencies`:

```json
"optionalDependencies": {
  "@viz-js/viz": "^3.26.0"
}
```

- [ ] **Step 2: Install**

```
npm install
```

Expected: completes without errors. `node_modules/@viz-js/viz` and `node_modules/jsdom` exist.

- [ ] **Step 3: Verify the install**

```
node -e "import('@viz-js/viz').then(m => console.log(typeof m.instance))"
```

Expected output: `function`

- [ ] **Step 4: Commit**

```
git add package.json package-lock.json
git commit -m "build: add @viz-js/viz and jsdom for jssm/viz subpath"
```

---

## Task 2: Port the viz colors module

**Files:**
- Create: `src/ts/jssm_viz_colors.ts`

- [ ] **Step 1: Create `src/ts/jssm_viz_colors.ts`**

```ts

/**
 *  Default color palette for jssm/viz dot/svg output.  Used by the graphviz
 *  rendering helpers in jssm_viz.ts to colorize nodes and edges based on
 *  state type (terminal/final/complete/normal) and arrow kind
 *  (legal/main/forced).
 *
 *  Keys are flat strings of the form `<arrow_kind>_<modifier>_<position>`
 *  (e.g. `legal_final_solo`, `main_terminal_2`); also the special node fill
 *  colors (`fill_final`, `fill_terminal`, `fill_complete`) and the graph
 *  background.
 */

const default_viz_colors = {

  'graph_bg_color'       : '#eeeeee',

  'fill_final'           : '#ddddff',
  'fill_terminal'        : '#ffdddd',
  'fill_complete'        : '#ddffdd',


  'legal_1'              : '#888888',
  'legal_2'              : '#777777',
  'legal_solo'           : '#777777',

  'legal_final_1'        : '#7777aa',
  'legal_final_2'        : '#666699',
  'legal_final_solo'     : '#666699',

  'legal_terminal_1'     : '#aa7777',
  'legal_terminal_2'     : '#996666',
  'legal_terminal_solo'  : '#996666',

  'legal_complete_1'     : '#77aa77',
  'legal_complete_2'     : '#669966',
  'legal_complete_solo'  : '#669966',


  'main_1'               : '#444444',
  'main_2'               : '#333333',
  'main_solo'            : '#333333',

  'main_final_1'         : '#333366',
  'main_final_2'         : '#222255',
  'main_final_solo'      : '#222255',

  'main_terminal_1'      : '#663333',
  'main_terminal_2'      : '#552222',
  'main_terminal_solo'   : '#552222',

  'main_complete_1'      : '#336633',
  'main_complete_2'      : '#225522',
  'main_complete_solo'   : '#225522',


  'forced_1'             : '#cccccc',
  'forced_2'             : '#bbbbbb',
  'forced_solo'          : '#bbbbbb',

  'forced_final_1'       : '#bbbbee',
  'forced_final_2'       : '#aaaadd',
  'forced_final_solo'    : '#aaaadd',

  'forced_terminal_1'    : '#eebbbb',
  'forced_terminal_2'    : '#ddaaaa',
  'forced_terminal_solo' : '#ddaaaa',

  'forced_complete_1'    : '#bbeebb',
  'forced_complete_2'    : '#aaddaa',
  'forced_complete_solo' : '#aaddaa',


  'text_final_1'         : '#000088',
  'text_final_2'         : '#000088',
  'text_final_solo'      : '#000088',

  'text_terminal_1'      : '#880000',
  'text_terminal_2'      : '#880000',
  'text_terminal_solo'   : '#880000',

  'text_complete_1'      : '#007700',
  'text_complete_2'      : '#007700',
  'text_complete_solo'   : '#007700'

};


export { default_viz_colors };
```

- [ ] **Step 2: Verify TypeScript compiles**

```
npx tsc --noEmit src/ts/jssm_viz_colors.ts
```

Expected: no output (success).

- [ ] **Step 3: Commit**

```
git add src/ts/jssm_viz_colors.ts
git commit -m "feat(viz): port default color palette as jssm_viz_colors"
```

---

## Task 3: Bootstrap the jssm_viz module skeleton with a smoke test

**Files:**
- Create: `src/ts/jssm_viz.ts`
- Create: `src/ts/tests/viz_dot.spec.ts`
- Modify: `jest-spec.config.cjs`

- [ ] **Step 1: Create the failing smoke test**

Create `src/ts/tests/viz_dot.spec.ts`:

```ts

/* eslint-disable max-len */

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('jssm_viz module loads', () => {

  test('exports version as string', () =>
    expect(typeof jv.version)
      .toBe('string'));

  test('exports build_time as number', () =>
    expect(typeof jv.build_time)
      .toBe('number'));

});
```

- [ ] **Step 2: Run the test and verify it fails**

```
npx jest src/ts/tests/viz_dot.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: FAIL — `Cannot find module '../jssm_viz'`.

- [ ] **Step 3: Create the module skeleton**

Create `src/ts/jssm_viz.ts`:

```ts

import * as jssm                 from './jssm';
import { JssmError }              from './jssm_error';
import { default_viz_colors }     from './jssm_viz_colors';
import { version, build_time }    from './version';

import type { Viz }               from '@viz-js/viz';





/**
 *  Cached viz.js instance.  First render call awaits {@link instance}; later
 *  calls reuse the resolved promise.  Internal.
 */
let viz_instance_promise: Promise<Viz> | null = null;

/**
 *  DOM parser injected via {@link configure} for environments without a
 *  global `DOMParser` (e.g. Node).  Internal.
 */
let injected_dom_parser: typeof globalThis.DOMParser | null = null;





/**
 *  Returns a cached @viz-js/viz instance, lazily instantiated on first call.
 *  Internal helper for the rendering functions.
 *
 *  @internal
 */
async function get_viz(): Promise<Viz> {

  if (viz_instance_promise === null) {
    const mod = await import('@viz-js/viz');
    viz_instance_promise = mod.instance();
  }

  return viz_instance_promise;

}





/**
 *  Inject runtime configuration for jssm/viz.  Currently only accepts a
 *  custom `DOMParser` constructor for use by `*_svg_element` functions in
 *  environments that do not provide one globally (e.g. Node + jsdom).
 *
 *  Idempotent — last call wins.  No-op if called with no recognized keys.
 *
 *  ```typescript
 *  // Node, with jsdom:
 *  import { JSDOM } from 'jsdom';
 *  import { configure, fsl_to_svg_element } from 'jssm/viz';
 *
 *  configure({ DOMParser: new JSDOM().window.DOMParser });
 *  const el = await fsl_to_svg_element('a -> b;');
 *  ```
 *
 *  @param opts Configuration overrides.
 *  @param opts.DOMParser Constructor compatible with the WHATWG `DOMParser`
 *  interface.  Used as a fallback when `globalThis.DOMParser` is undefined.
 *
 *  @throws {JssmError} if `DOMParser` is provided and is not a constructor.
 */
function configure(opts: { DOMParser?: typeof globalThis.DOMParser }): void {

  if (opts.DOMParser !== undefined) {
    if (typeof opts.DOMParser !== 'function') {
      throw new JssmError(undefined,
        'jssm/viz: configure({ DOMParser }) — value must be a constructor');
    }
    injected_dom_parser = opts.DOMParser;
  }

}





export {
  configure,
  version, build_time
};
```

- [ ] **Step 4: Add new files to coverage exclusion**

Edit `jest-spec.config.cjs`. Replace the existing `coveragePathIgnorePatterns` line with:

```js
  coveragePathIgnorePatterns : ["/node_modules/", "/src/ts/tests/", "/src/ts/jssm_viz.ts", "/src/ts/jssm_viz_colors.ts"],
```

(Keeps the smoke-test scope from tanking the existing 90% threshold.  Comprehensive viz coverage is a deferred follow-up per the spec.)

- [ ] **Step 5: Run the test and verify it passes**

```
npx jest src/ts/tests/viz_dot.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```
git add src/ts/jssm_viz.ts src/ts/tests/viz_dot.spec.ts jest-spec.config.cjs
git commit -m "feat(viz): scaffold jssm_viz module with version exports and configure()"
```

---

## Task 4: Port pure helpers (color8to6, vc, node_of)

**Files:**
- Modify: `src/ts/jssm_viz.ts`
- Modify: `src/ts/tests/viz_dot.spec.ts`

- [ ] **Step 1: Add failing tests for color8to6**

Append to `src/ts/tests/viz_dot.spec.ts`:

```ts

describe('color8to6 helper', () => {

  test('strips alpha channel from #RRGGBBAA', () =>
    expect(jv._test.color8to6('#11223344'))
      .toBe('#112233'));

  test('throws on non-#-prefixed input', () =>
    expect(() => jv._test.color8to6('11223344'))
      .toThrow());

  test('throws on length mismatch', () =>
    expect(() => jv._test.color8to6('#1122'))
      .toThrow());

  test('u_color8to6 returns undefined for undefined input', () =>
    expect(jv._test.u_color8to6(undefined))
      .toBeUndefined());

});
```

- [ ] **Step 2: Run and verify it fails**

```
npx jest src/ts/tests/viz_dot.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: FAIL — `Cannot read properties of undefined (reading 'color8to6')`.

- [ ] **Step 3: Add helpers and a test-only export to jssm_viz.ts**

In `src/ts/jssm_viz.ts`, add (above the `export {` block):

```ts

/**
 *  Look up a color from the default viz palette by key, returning empty
 *  string if the key is unknown (so it disappears in feature concatenation).
 *
 *  @internal
 */
function vc(col: string): string {
  return (default_viz_colors as Record<string, string>)[col] ?? '';
}





/**
 *  Build a graphviz-safe node identifier for a state, by index.
 *
 *  @internal
 */
function node_of(state: string, l_states: string[]): string {
  return `n${l_states.indexOf(state)}`;
}





/**
 *  Convert an 8-channel hex color (`#RRGGBBAA`) to a 6-channel hex color
 *  (`#RRGGBB`), discarding the alpha channel.  Throws if the input is not
 *  a 9-character `#`-prefixed string.
 *
 *  Graphviz dot does not support alpha; this is a lossy projection.
 *
 *  @internal
 */
function color8to6(color8: string): string {
  if (color8.length !== 9) { throw new JssmError(undefined, `not a color8: ${color8}`); }
  if (color8[0] !== '#')   { throw new JssmError(undefined, `not a color8: ${color8}`); }
  return `#${color8.substring(1, 7)}`;
}





/**
 *  Variant of {@link color8to6} that passes `undefined` through.
 *
 *  @internal
 */
function u_color8to6(color8?: string): string | undefined {
  if (color8 === undefined) { return undefined; }
  return color8to6(color8);
}
```

Then update the `export {` block to add a test-only namespace:

```ts
export {
  configure,
  version, build_time
};

/** @internal — test-only access to private helpers. */
export const _test = { color8to6, u_color8to6, vc, node_of };
```

- [ ] **Step 4: Run and verify it passes**

```
npx jest src/ts/tests/viz_dot.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: PASS, 6 tests total (2 from Task 3 + 4 new).

- [ ] **Step 5: Commit**

```
git add src/ts/jssm_viz.ts src/ts/tests/viz_dot.spec.ts
git commit -m "feat(viz): port color and node_of helpers"
```

---

## Task 5: Port state-declaration readers (incl. new image_for_state)

**Files:**
- Modify: `src/ts/jssm_viz.ts`
- Modify: `src/ts/tests/viz_dot.spec.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/ts/tests/viz_dot.spec.ts`:

```ts

describe('state-declaration readers', () => {

  test('image_for_state reads image property from declaration', () => {
    const m = sm`state c: { image: foo.png; }; a -> c;`;
    expect(jv._test.image_for_state(m, 'c'))
      .toBe('foo.png');
  });

  test('image_for_state returns undefined for state without image', () => {
    const m = sm`state c: { color: red; }; a -> c;`;
    expect(jv._test.image_for_state(m, 'c'))
      .toBeUndefined();
  });

  test('shape_for_state reads shape', () => {
    const m = sm`state c: { shape: circle; }; a -> c;`;
    expect(jv._test.shape_for_state(m, 'c'))
      .toBe('circle');
  });

});
```

- [ ] **Step 2: Run and verify it fails**

Expected: FAIL — `image_for_state` and `shape_for_state` undefined on `_test`.

- [ ] **Step 3: Add the readers and the dependency on `_state_declarations`**

In `src/ts/jssm_viz.ts`, add (above the helpers block):

```ts

/**
 *  Read the border color from a state declaration, projecting from
 *  `#RRGGBBAA` to `#RRGGBB`.  Returns `undefined` if not declared.
 *
 *  @internal
 */
function border_color_for_state(u_jssm: jssm.Machine<string>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return u_color8to6(state_decl.borderColor);
}





/**
 *  Read the text color from a state declaration.  Returns `undefined` if
 *  not declared.
 *
 *  @internal
 */
function text_color_for_state(u_jssm: jssm.Machine<string>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return u_color8to6(state_decl.textColor);
}





/**
 *  Read the background color from a state declaration.  Returns `undefined`
 *  if not declared.
 *
 *  @internal
 */
function background_color_for_state(u_jssm: jssm.Machine<string>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return u_color8to6(state_decl.backgroundColor);
}





/**
 *  Read the graphviz shape for a state declaration.  Returns `undefined` if
 *  not declared.
 *
 *  @internal
 */
function shape_for_state(u_jssm: jssm.Machine<string>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return state_decl.shape;
}





/**
 *  Read the image filename for a state declaration.  Returns `undefined` if
 *  not declared.  Wired into dot output via `states_to_nodes_string`; the
 *  `image` property was added to jssm in commit `a045569`.
 *
 *  @internal
 */
function image_for_state(u_jssm: jssm.Machine<string>, state: string): string | undefined {
  const decls = u_jssm._state_declarations;
  if (!decls) { return undefined; }
  const state_decl = decls.get(state);
  if (!state_decl) { return undefined; }
  return (state_decl as any).image;
}





/**
 *  Compose a graphviz `style` string for a state, combining `corners` and
 *  `line-style` declarations.  Returns either the empty string or a
 *  `corners,line,filled`-shape string.
 *
 *  @internal
 */
function style_for_state(u_jssm: jssm.Machine<string>, state: string): string {
  const decls = u_jssm._state_declarations;
  if (!decls) { return ''; }
  const state_decl = decls.get(state);
  if (!state_decl) { return ''; }

  const corners = {
    rounded : 'rounded',
    lined   : 'diagonals',
    regular : 'regular'
  }[state_decl.corners ?? 'regular'];

  const lines = {
    dashed : 'dashed',
    dotted : 'dotted',
    solid  : 'solid'
  }[state_decl.lineStyle ?? 'solid'];

  const style = [corners, lines]
                  .filter(f => f !== '')
                  .join(',');

  return style ? `${style},filled` : '';
}
```

Update the `_test` export:

```ts
export const _test = {
  color8to6, u_color8to6, vc, node_of,
  border_color_for_state, text_color_for_state, background_color_for_state,
  shape_for_state, image_for_state, style_for_state
};
```

- [ ] **Step 4: Run and verify it passes**

```
npx jest src/ts/tests/viz_dot.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: PASS, 9 tests total.

- [ ] **Step 5: Commit**

```
git add src/ts/jssm_viz.ts src/ts/tests/viz_dot.spec.ts
git commit -m "feat(viz): port state-declaration readers and add image_for_state"
```

---

## Task 6: Port `states_to_nodes_string` and the dot template

**Files:**
- Modify: `src/ts/jssm_viz.ts`

This task ports `states_to_nodes_string`, `states_to_edges_string`, `arranges_for`, `flow_direction_to_rankdir`, `dot_template`, and the public `machine_to_dot` / `fsl_to_dot` / `dot` (compat alias) in one batch — they are tightly coupled and don't have clean isolated test surfaces. The next task (Task 7) writes integration tests against the public surface that exercise all of them.

- [ ] **Step 1: Add the rendering helpers**

In `src/ts/jssm_viz.ts`, add (after the helpers block, before the test-only export):

```ts

/**
 *  Convert an FSL flow direction (`up`/`right`/`down`/`left`) to a graphviz
 *  `rankdir=` declaration line.  Throws on unknown input.
 *
 *  @internal
 */
function flow_direction_to_rankdir(flow_direction: string): string {
  switch (flow_direction) {
    case 'up'    : return 'rankdir=BT;';
    case 'right' : return 'rankdir=LR;';
    case 'down'  : return 'rankdir=TB;';
    case 'left'  : return 'rankdir=RL;';
    default      : throw new JssmError(undefined, `unknown flow direction '${flow_direction}'`);
  }
}





/**
 *  Build the graphviz `digraph G { ... }` envelope from rendered fragments.
 *
 *  @internal
 */
function dot_template(rank_dir: string, graph_bg_color: string, nodes: string, edges: string, arranges: string, preamble = ''): string {
  return `digraph G {
${preamble}

${rank_dir}
fontname="Open Sans";
style=filled;
bgcolor="${graph_bg_color}";
node [fontsize=14; shape=box; style=filled; fillcolor=white; fontname="Times New Roman"];
edge [fontsize=6; fontname="Open Sans"];

${nodes}

${edges}

${arranges}
}`;
}





/**
 *  Render the node-feature list for one machine, one node per state.
 *
 *  @internal
 */
function states_to_nodes_string(u_jssm: jssm.Machine<string>, l_states: string[]): string {

  return l_states.map((s) => {

    const style        = u_jssm.style_for(s);
    const border_color = style.borderColor;
    const bgcolor      = style.backgroundColor;
    const fgcolor      = style.textColor;

    const terminal  = u_jssm.state_is_terminal(s);
    const final_    = u_jssm.state_is_final(s);
    const complete  = u_jssm.state_is_complete(s);
    const use_label = u_jssm.display_text(s);
    const image     = image_for_state(u_jssm, s);

    const features = [
      ['label',     use_label],
      ['shape',     style.shape                  || ''],
      ['color',     border_color                 || ''],
      ['style',     style_for_state(u_jssm, s)   || ''],
      ['fontcolor', fgcolor                      || ''],
      ['image',     image                        || ''],
      ['fillcolor', bgcolor ? bgcolor :
                    (final_   ? vc('fill_final') :
                    (complete ? vc('fill_complete') :
                    (terminal ? vc('fill_terminal') : '')))]
    ]
      .filter(r => r[1])
      .map(r => `${r[0]}="${r[1]}"`)
      .join(' ');

    return `${node_of(s, l_states)} [${features}];`;

  }).join(' ');

}





/**
 *  Render the edge-feature list, including bidirectional fold-up and
 *  per-direction action / probability labels.  Pushed strikes prevent
 *  duplicate emission of bidirectional edges.
 *
 *  @internal
 */
function states_to_edges_string(u_jssm: jssm.Machine<string>, l_states: string[], strike: [string, string][]): string {

  return u_jssm.states().map((s) =>

    u_jssm.list_exits(s).map((ex) => {

      if (strike.find(row => (row[0] === s) && (row[1] == ex))) {
        return '';
      }

      const doublequote = (txt: string) => txt.replace(/"/g, '\\"');

      const edge      = u_jssm.list_transitions(s);
      const edge_tr   = u_jssm.lookup_transition_for(s, ex);
      const pair      = u_jssm.list_transitions(ex);
      const pair_id   = u_jssm.get_transition_by_state_names(ex, s);
      const pair_tr   = u_jssm.lookup_transition_for(ex, s);
      const double    = pair_id && (s !== ex);

      const if_obj_field = (obj: any, field: string) => obj ? (obj[field] ?? '') : '';

      const h_final    = u_jssm.state_is_final(s);
      const h_complete = u_jssm.state_is_complete(s);
      const h_terminal = u_jssm.state_is_terminal(s);

      const t_final    = u_jssm.state_is_final(ex);
      const t_complete = u_jssm.state_is_complete(ex);
      const t_terminal = u_jssm.state_is_terminal(ex);

      const lineColor = (final_: boolean, complete: boolean, terminal: boolean, lkind: string, suffix = '_solo') =>
        final_   ? vc(`${lkind}_final${suffix}`)    :
        complete ? vc(`${lkind}_complete${suffix}`) :
        terminal ? vc(`${lkind}_terminal${suffix}`) :
                   vc(`${lkind}${suffix}`);

      const textColor = (final_: boolean, complete: boolean, terminal: boolean, suffix = '_solo'): string =>
        final_   ? vc(`text_final${suffix}`)    :
        complete ? vc(`text_complete${suffix}`) :
        terminal ? vc(`text_terminal${suffix}`) :
                   '';

      const headColor = textColor(h_final, h_complete, h_terminal, double ? '_1' : '_solo');
      const tailColor = textColor(t_final, t_complete, t_terminal, double ? '_2' : '_solo');

      const labelInline = [
        [pair, 'probability', 'headlabel', 'name', 'action', double, headColor],
        [edge, 'probability', 'taillabel', 'name', 'action', true,   tailColor]
      ]
        .map((r: any) => ({
          which   : r[2],
          whether : (r[5] ? ([(if_obj_field(r[0], r[5])), (if_obj_field(r[0], r[1])), (if_obj_field(r[0], r[3]))].filter(q => q).join('<br/>') || '') : ''),
          color   : r[6]
        }))
        .filter(present => present.whether)
        .map(r => `${r.which}=${r.color ? `<<font color="${r.color}">${r.whether}</font>>` : `"${r.whether}"`};`)
        .join(' ');

      const label      = edge_tr ? ([`${(edge_tr.action || '')}`, `${(edge_tr.probability || '')}`].filter(x => x !== '').join('\n') || undefined) : undefined;
      const maybeLabel = label ? `taillabel="${doublequote(label)}";` : '';

      const rlabel      = pair_tr ? ([`${(pair_tr.action || '')}`, `${(pair_tr.probability || '')}`].filter(x => x !== '').join('\n') || undefined) : undefined;
      const maybeRLabel = rlabel ? `headlabel="${doublequote(rlabel)}";` : '';

      const tc1 = lineColor(t_final, t_complete, t_terminal, edge_tr.kind, '_1');
      const tc2 = lineColor(h_final, h_complete, h_terminal, (pair_tr || { kind: 'legal' }).kind, '_2');
      const tcd = lineColor(t_final, t_complete, t_terminal, edge_tr.kind, '_solo');

      const arrowHead = edge_tr.forced_only ? 'ediamond' : (edge_tr.main_path ? 'normal;weight=5' : 'empty');
      const arrowTail = pair_tr ? (pair_tr.forced_only ? 'ediamond' : (pair_tr.main_path ? 'normal;weight=5' : 'empty')) : '';

      const edgeInline = edge ? (double
        ? `${maybeLabel}${maybeRLabel}arrowhead=${arrowHead};arrowtail=${arrowTail};dir=both;color="${tc1}:${tc2}"`
        : `${maybeLabel}arrowhead=${arrowHead};color="${tcd}"`) : '';

      if (pair) { strike.push([ex, s]); }

      return `${node_of(s, l_states)}->${node_of(ex, l_states)} [${labelInline}${edgeInline}];`;

    }).join(' ')

  ).join(' ');

}





/**
 *  Render `arrange`, `arrange_start`, and `arrange_end` declarations to
 *  rank-grouped subgraphs (`rank=same`/`rank=min`/`rank=max`).
 *
 *  @internal
 */
function arranges_for(u_jssm: jssm.Machine<string>, l_states: string[]): string {
  let decl = '';

  if (u_jssm._arrange_declaration) {
    decl += u_jssm._arrange_declaration.map(d => `{rank=same; ${d.map(di => node_of(di, l_states)).join('; ')};};`).join('\n');
  }

  if (u_jssm._arrange_start_declaration) {
    decl += u_jssm._arrange_start_declaration.map(d => `{rank=min; ${d.map(di => node_of(di, l_states)).join('; ')};};`).join('\n');
  }

  if (u_jssm._arrange_end_declaration) {
    decl += u_jssm._arrange_end_declaration.map(d => `{rank=max; ${d.map(di => node_of(di, l_states)).join('; ')};};`).join('\n');
  }

  return decl;
}





/**
 *  Render a {@link jssm.Machine} as a graphviz dot string.
 *
 *  ```typescript
 *  import { sm } from 'jssm';
 *  import { machine_to_dot } from 'jssm/viz';
 *
 *  const dot = machine_to_dot(sm`a -> b;`);
 *  // 'digraph G { ... }'
 *  ```
 *
 *  @param u_jssm The machine to render.
 *  @returns A complete graphviz dot source string.
 */
function machine_to_dot(u_jssm: jssm.Machine<string>): string {

  const l_states = u_jssm.states();
  const nodes    = states_to_nodes_string(u_jssm, l_states);

  const strike: [string, string][] = [];
  const edges    = states_to_edges_string(u_jssm, l_states, strike);

  const arranges = arranges_for(u_jssm, l_states);

  const rank_dir = flow_direction_to_rankdir(u_jssm.flow() || 'down');
  const preamble = u_jssm.dot_preamble() || '';

  return dot_template(rank_dir, vc('graph_bg_color'), nodes, edges, arranges, preamble);

}





/**
 *  Render an FSL string directly to graphviz dot source.
 *
 *  ```typescript
 *  import { fsl_to_dot } from 'jssm/viz';
 *  const dot = fsl_to_dot('a -> b;');
 *  ```
 *
 *  @param fsl The FSL source.
 *  @returns A complete graphviz dot source string.
 */
function fsl_to_dot(fsl: string): string {
  return machine_to_dot(jssm.sm`${fsl}`);
}





/**
 *  Deprecated, no-op compat alias retained from jssm-viz.  Does nothing.
 *  Will be removed in the next major.
 *
 *  @deprecated Use {@link machine_to_dot} instead.
 */
function dot(_machine: jssm.Machine<any>): void {
  // intentionally no-op; preserved for binary compat with old jssm-viz
}
```

Update the public exports:

```ts
export {
  configure,
  dot,
  fsl_to_dot,
  machine_to_dot,
  version, build_time
};
```

- [ ] **Step 2: Compile-check**

```
npx tsc --noEmit -p tsconfig.json
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/ts/jssm_viz.ts
git commit -m "feat(viz): port dot rendering pipeline (machine_to_dot, fsl_to_dot, helpers)"
```

---

## Task 7: Add structural smoke tests for dot output

**Files:**
- Modify: `src/ts/tests/viz_dot.spec.ts`

- [ ] **Step 1: Append the dot integration tests**

Append to `src/ts/tests/viz_dot.spec.ts`:

```ts

describe('machine_to_dot output structure', () => {

  test('produces a digraph G { ... } envelope', () => {
    const dot = jv.machine_to_dot(sm`a -> b;`);
    expect(dot).toMatch(/^digraph G \{/);
    expect(dot).toMatch(/\}\s*$/);
  });

  test('contains node identifiers for all states', () => {
    const dot = jv.machine_to_dot(sm`alpha -> beta;`);
    expect(dot).toMatch(/n0/);
    expect(dot).toMatch(/n1/);
    expect(dot).toMatch(/label="alpha"/);
    expect(dot).toMatch(/label="beta"/);
  });

  test('fsl_to_dot is equivalent to machine_to_dot(sm`...`)', () => {
    const a = jv.machine_to_dot(sm`a -> b;`);
    const b = jv.fsl_to_dot('a -> b;');
    expect(a).toBe(b);
  });

});





describe('state-styling renders into dot', () => {

  test('shape: circle produces shape="circle"', () => {
    const dot = jv.machine_to_dot(sm`state c: { shape: circle; }; a -> c;`);
    expect(dot).toMatch(/shape="circle"/);
  });

  test('color: red produces a color attribute', () => {
    const dot = jv.machine_to_dot(sm`state c: { color: "#FF0000FF"; }; a -> c;`);
    expect(dot).toMatch(/color="#FF0000"/);
  });

  test('corners: rounded produces style with rounded', () => {
    const dot = jv.machine_to_dot(sm`state c: { corners: rounded; }; a -> c;`);
    expect(dot).toMatch(/style="rounded[^"]*filled"/);
  });

  test('line-style: dashed produces style with dashed', () => {
    const dot = jv.machine_to_dot(sm`state c: { line-style: dashed; }; a -> c;`);
    expect(dot).toMatch(/style="[^"]*dashed[^"]*filled"/);
  });

  test('image: foo.png produces image="foo.png"', () => {
    const dot = jv.machine_to_dot(sm`state c: { image: "foo.png"; }; a -> c;`);
    expect(dot).toMatch(/image="foo\.png"/);
  });

});





describe('arrange declarations render into dot', () => {

  test('arrange [a b] produces a rank=same group', () => {
    const dot = jv.machine_to_dot(sm`a -> b; arrange: [a b];`);
    expect(dot).toMatch(/rank=same/);
  });

  test('arrange_start [a] produces a rank=min group', () => {
    const dot = jv.machine_to_dot(sm`a -> b; arrange_start: [a];`);
    expect(dot).toMatch(/rank=min/);
  });

  test('arrange_end [b] produces a rank=max group', () => {
    const dot = jv.machine_to_dot(sm`a -> b; arrange_end: [b];`);
    expect(dot).toMatch(/rank=max/);
  });

});





describe('flow direction renders into dot', () => {

  test('flow: right produces rankdir=LR', () => {
    const dot = jv.machine_to_dot(sm`flow: right; a -> b;`);
    expect(dot).toMatch(/rankdir=LR/);
  });

  test('default flow (down) produces rankdir=TB', () => {
    const dot = jv.machine_to_dot(sm`a -> b;`);
    expect(dot).toMatch(/rankdir=TB/);
  });

});
```

- [ ] **Step 2: Run all dot tests and verify they pass**

```
npx jest src/ts/tests/viz_dot.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: PASS. ~22 tests total.

If any fail, the most likely cause is FSL syntax — confirm the exact directive form (`arrange: [a b];` vs `arrange [a b];`) by searching `src/ts/fsl_parser.peg` for `arrange`. Adjust the test inputs to match. The implementation reads `_arrange_declaration` regardless of source directive name.

- [ ] **Step 3: Commit**

```
git add src/ts/tests/viz_dot.spec.ts
git commit -m "test(viz): add structural smoke tests for dot output"
```

---

## Task 8: Add async render functions (`dot_to_svg`, `fsl_to_svg_string`, `machine_to_svg_string`) and tests

**Files:**
- Create: `src/ts/tests/viz_svg_string.spec.ts`
- Modify: `src/ts/jssm_viz.ts`

- [ ] **Step 1: Create the failing svg-string test file**

Create `src/ts/tests/viz_svg_string.spec.ts`:

```ts

/* eslint-disable max-len */

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('SVG string rendering', () => {

  test('fsl_to_svg_string resolves with SVG content', async () => {
    const svg = await jv.fsl_to_svg_string('a -> b;');
    expect(svg).toMatch(/<\?xml|<svg/);
  });

  test('machine_to_svg_string resolves with SVG content', async () => {
    const svg = await jv.machine_to_svg_string(sm`a -> b;`);
    expect(svg).toMatch(/<\?xml|<svg/);
  });

  test('dot_to_svg accepts a raw dot string', async () => {
    const svg = await jv.dot_to_svg('digraph G { a -> b; }');
    expect(svg).toMatch(/<\?xml|<svg/);
  });

});
```

- [ ] **Step 2: Run and verify it fails**

```
npx jest src/ts/tests/viz_svg_string.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: FAIL — `jv.fsl_to_svg_string is not a function` (and similar).

- [ ] **Step 3: Add the SVG-string functions**

In `src/ts/jssm_viz.ts`, add (after `fsl_to_dot`):

```ts

/**
 *  Render a graphviz dot source string to SVG using `@viz-js/viz`.  The
 *  underlying viz instance is lazy-initialized on first call and cached for
 *  the lifetime of the module.
 *
 *  ```typescript
 *  const svg = await dot_to_svg('digraph G { a -> b }');
 *  ```
 *
 *  @param dot Graphviz dot source.
 *  @returns A promise resolving to an SVG XML string.
 */
async function dot_to_svg(dot: string): Promise<string> {
  const viz = await get_viz();
  return viz.renderString(dot, { format: 'svg' });
}





/**
 *  Render an FSL string directly to SVG.
 *
 *  @param fsl The FSL source.
 *  @returns A promise resolving to an SVG XML string.
 */
async function fsl_to_svg_string(fsl: string): Promise<string> {
  return dot_to_svg(fsl_to_dot(fsl));
}





/**
 *  Render a {@link jssm.Machine} to SVG.
 *
 *  @param u_jssm The machine to render.
 *  @returns A promise resolving to an SVG XML string.
 */
async function machine_to_svg_string(u_jssm: jssm.Machine<string>): Promise<string> {
  return dot_to_svg(machine_to_dot(u_jssm));
}
```

Update the exports:

```ts
export {
  configure,
  dot, dot_to_svg,
  fsl_to_dot, fsl_to_svg_string,
  machine_to_dot, machine_to_svg_string,
  version, build_time
};
```

- [ ] **Step 4: Run and verify it passes**

```
npx jest src/ts/tests/viz_svg_string.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: PASS, 3 tests. (The first test will be slow — ~500ms to 1.5s — because of WASM init.)

- [ ] **Step 5: Commit**

```
git add src/ts/jssm_viz.ts src/ts/tests/viz_svg_string.spec.ts
git commit -m "feat(viz): add SVG string rendering via @viz-js/viz@3"
```

---

## Task 9: Add `*_svg_element` functions with jsdom-environment tests

**Files:**
- Create: `src/ts/tests/viz_svg_element.spec.ts`
- Modify: `src/ts/jssm_viz.ts`

- [ ] **Step 1: Create the failing svg-element test file**

Create `src/ts/tests/viz_svg_element.spec.ts`:

```ts

/* eslint-disable max-len */

/**
 * @jest-environment jsdom
 */

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;





describe('SVG element rendering (jsdom env)', () => {

  test('fsl_to_svg_element resolves to an SVGElement', async () => {
    const el = await jv.fsl_to_svg_element('a -> b;');
    expect(el).toBeDefined();
    expect(el.nodeName.toLowerCase()).toBe('svg');
  });

  test('machine_to_svg_element resolves to an SVGElement', async () => {
    const el = await jv.machine_to_svg_element(sm`a -> b;`);
    expect(el).toBeDefined();
    expect(el.nodeName.toLowerCase()).toBe('svg');
  });

});
```

- [ ] **Step 2: Run and verify it fails**

```
npx jest src/ts/tests/viz_svg_element.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: FAIL — `jv.fsl_to_svg_element is not a function`.

- [ ] **Step 3: Add the svg-element functions**

In `src/ts/jssm_viz.ts`, add (after `machine_to_svg_string`):

```ts

/**
 *  Resolve a `DOMParser` constructor: prefer `globalThis.DOMParser` (browsers,
 *  jsdom test environment), fall back to the value passed to {@link configure},
 *  throw `JssmError` if neither is available.
 *
 *  @internal
 */
function get_dom_parser(): typeof globalThis.DOMParser {
  if (typeof globalThis.DOMParser === 'function') { return globalThis.DOMParser; }
  if (injected_dom_parser !== null)               { return injected_dom_parser; }
  throw new JssmError(undefined,
    'jssm/viz: *_svg_element requires a browser DOM. Use *_svg_string in Node, or call configure({ DOMParser }) with a parser from jsdom or @xmldom/xmldom.');
}





/**
 *  Render dot source to a parsed `SVGSVGElement`.  Browser-by-default; in
 *  Node, requires a `DOMParser` to have been injected via {@link configure}.
 *
 *  @param dot Graphviz dot source.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available.
 */
async function dot_to_svg_element(dot: string): Promise<SVGSVGElement> {
  const ParserCtor = get_dom_parser();
  const svg_string = await dot_to_svg(dot);
  const parser     = new ParserCtor();
  const doc        = parser.parseFromString(svg_string, 'image/svg+xml');
  return doc.documentElement as unknown as SVGSVGElement;
}





/**
 *  Render an FSL string directly to a parsed `SVGSVGElement`.
 *
 *  @param fsl The FSL source.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
async function fsl_to_svg_element(fsl: string): Promise<SVGSVGElement> {
  return dot_to_svg_element(fsl_to_dot(fsl));
}





/**
 *  Render a {@link jssm.Machine} to a parsed `SVGSVGElement`.
 *
 *  @param u_jssm The machine to render.
 *  @returns A promise resolving to a parsed `SVGSVGElement`.
 *  @throws {JssmError} if no `DOMParser` is available (Node without `configure`).
 */
async function machine_to_svg_element(u_jssm: jssm.Machine<string>): Promise<SVGSVGElement> {
  return dot_to_svg_element(machine_to_dot(u_jssm));
}
```

Update the exports:

```ts
export {
  configure,
  dot, dot_to_svg,
  fsl_to_dot, fsl_to_svg_string, fsl_to_svg_element,
  machine_to_dot, machine_to_svg_string, machine_to_svg_element,
  version, build_time
};
```

- [ ] **Step 4: Run and verify it passes**

```
npx jest src/ts/tests/viz_svg_element.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```
git add src/ts/jssm_viz.ts src/ts/tests/viz_svg_element.spec.ts
git commit -m "feat(viz): add fsl_to_svg_element and machine_to_svg_element"
```

---

## Task 10: Add Node-environment "throws clear error" test for `*_svg_element` and configure() tests

**Files:**
- Modify: `src/ts/tests/viz_dot.spec.ts`

This test runs in the default Node environment (no jsdom). It confirms the friendly error message for users who call `*_svg_element` in Node without configure.

- [ ] **Step 1: Append the throw test and configure tests**

Append to `src/ts/tests/viz_dot.spec.ts`:

```ts

describe('*_svg_element in Node without configure', () => {

  test('fsl_to_svg_element rejects with a clear JssmError', async () => {
    await expect(jv.fsl_to_svg_element('a -> b;'))
      .rejects.toThrow(/requires a browser DOM/);
  });

  test('machine_to_svg_element rejects with a clear JssmError', async () => {
    await expect(jv.machine_to_svg_element(sm`a -> b;`))
      .rejects.toThrow(/requires a browser DOM/);
  });

});





describe('configure() input validation', () => {

  test('throws on non-constructor DOMParser', () => {
    expect(() => jv.configure({ DOMParser: 'not a constructor' as any }))
      .toThrow(/must be a constructor/);
  });

  test('no-op for empty options object', () => {
    expect(() => jv.configure({}))
      .not.toThrow();
  });

});
```

- [ ] **Step 2: Run and verify all dot tests still pass**

```
npx jest src/ts/tests/viz_dot.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: PASS, ~26 tests total.

- [ ] **Step 3: Run the full new viz suite together**

```
npx jest src/ts/tests/viz_dot.spec.ts src/ts/tests/viz_svg_string.spec.ts src/ts/tests/viz_svg_element.spec.ts -c jest-spec.config.cjs --verbose
```

Expected: PASS, ~31 tests total.

- [ ] **Step 4: Run the full spec suite to make sure nothing else broke**

```
npm run jest-spec
```

Expected: PASS. Coverage report shows existing files still ≥90%.

- [ ] **Step 5: Commit**

```
git add src/ts/tests/viz_dot.spec.ts
git commit -m "test(viz): cover Node *_svg_element error path and configure validation"
```

---

## Task 11: Add Rollup config files for the viz subpath

**Files:**
- Create: `rollup.config.viz.es6.js`
- Create: `rollup.config.viz.es5.js`
- Create: `rollup.config.viz.iife.js`

- [ ] **Step 1: Create the ES6 viz rollup config**

Create `rollup.config.viz.es6.js`:

```js

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from "rollup-plugin-dts";


const config = [{

  input: 'dist/es6/jssm_viz.js',

  output: {
    file   : 'dist/jssm_viz.es6.js',
    format : 'es',
    name   : 'jssm_viz'
  },

  external : ['@viz-js/viz'],

  plugins : [
    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : ['.js', '.json', '.ts', '.tsx'],
      preferBuiltins : false
    }),
    commonjs(),
    replace({
      preventAssignment      : true,
      'process.env.NODE_ENV' : JSON.stringify('production')
    })
  ]
}, {

  input: 'dist/es6/jssm_viz.d.ts',

  output: {
    file   : './jssm_viz.es6.d.ts',
    format : 'es'
  },

  plugins : [dts()]
}];


export default config;
```

- [ ] **Step 2: Create the ES5 / CJS viz rollup config**

Create `rollup.config.viz.es5.js`:

```js

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';
import dts         from "rollup-plugin-dts";


const config = [{

  input: 'dist/es6/jssm_viz.js',

  output: {
    file   : 'dist/jssm_viz.es5.cjs.js',
    format : 'cjs',
    name   : 'jssm_viz'
  },

  external : ['@viz-js/viz'],

  plugins : [
    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : false,
      extensions     : ['.js', '.json', '.ts', '.tsx'],
      preferBuiltins : false
    }),
    commonjs(),
    replace({
      preventAssignment      : true,
      'process.env.NODE_ENV' : JSON.stringify('production')
    })
  ]
}, {

  input: 'dist/es6/jssm_viz.d.ts',

  output: {
    file   : './jssm_viz.es5.d.cts',
    format : 'es'
  },

  plugins : [dts()]
}];


export default config;
```

- [ ] **Step 3: Create the IIFE viz rollup config**

Create `rollup.config.viz.iife.js`:

```js

import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import replace     from '@rollup/plugin-replace';


const config = [{

  input: 'dist/es6/jssm_viz.js',

  output: {
    file   : 'dist/jssm_viz.es5.iife.js',
    format : 'iife',
    name   : 'jssm_viz',
    inlineDynamicImports: false
  },

  external : ['@viz-js/viz'],

  plugins : [
    nodeResolve({
      mainFields     : ['module', 'main'],
      browser        : true,
      extensions     : ['.js', '.json', '.ts', '.tsx'],
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

The dynamic `import('@viz-js/viz')` inside `jssm_viz.ts` is preserved as-is by Rollup IIFE format because the module is marked `external`. Browsers resolve the dynamic import against the document's import map.

- [ ] **Step 4: Verify TypeScript compile pipeline produces the expected input file**

```
npx tsc --build tsconfig.json
ls dist/es6/jssm_viz.js
```

Expected: file exists.

- [ ] **Step 5: Test the ES6 rollup config end-to-end**

```
npx rollup -c rollup.config.viz.es6.js
ls dist/jssm_viz.es6.js
```

Expected: bundle produced. Inspect it for `import('@viz-js/viz')` (preserved as a dynamic import string).

- [ ] **Step 6: Commit**

```
git add rollup.config.viz.es6.js rollup.config.viz.es5.js rollup.config.viz.iife.js
git commit -m "build(viz): add rollup configs for jssm/viz subpath (es6, cjs, iife)"
```

---

## Task 12: Add `make_viz_*` and `min_viz_*` npm scripts; chain into `make`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the new scripts to `package.json`**

In `scripts`, add the new build/minify entries (alongside the existing `make_*` and `min_*`):

```json
"make_viz_cjs"   : "rollup -c rollup.config.viz.es5.js",
"make_viz_es6"   : "rollup -c rollup.config.viz.es6.js",
"make_viz_iife"  : "rollup -c rollup.config.viz.iife.js",
"min_viz_iife"   : "mv dist/jssm_viz.es5.iife.js dist/jssm_viz.es5.iife.nonmin.cjs && terser dist/jssm_viz.es5.iife.nonmin.cjs > dist/jssm_viz.iife.cjs",
"min_viz_cjs"    : "mv dist/jssm_viz.es5.cjs.js dist/jssm_viz.es5.nonmin.cjs && terser dist/jssm_viz.es5.nonmin.cjs > dist/jssm_viz.cjs",
"min_viz_es6"    : "mv dist/jssm_viz.es6.js dist/jssm_viz.es6.nonmin.cjs && terser dist/jssm_viz.es6.nonmin.cjs > dist/jssm_viz.mjs",
```

Update the existing `make` script to chain the new entries. Replace the current `make` value:

```json
"make": "npm run clean && npm run makever && npm run peg && npm run typescript && npm run make_iife && npm run make_es6 && npm run make_deno && npm run make_cjs && npm run make_viz_iife && npm run make_viz_es6 && npm run make_viz_cjs && npm run minify && npm run min_iife && npm run min_es6 && npm run min_cjs && npm run min_deno && npm run min_viz_iife && npm run min_viz_es6 && npm run min_viz_cjs && rm ./dist/es6/*.nonmin.js"
```

- [ ] **Step 2: Run the full make**

```
npm run make
```

Expected: completes without errors. Output files exist:

```
ls dist/jssm_viz.cjs dist/jssm_viz.mjs dist/jssm_viz.iife.cjs jssm_viz.es5.d.cts jssm_viz.es6.d.ts
```

If `make` fails, the most likely cause is path or filename mismatch in a rollup config or a min_viz_* script. Inspect intermediate files to diagnose.

- [ ] **Step 3: Add the typedoc input**

In `package.json`, update the `docs` script to include `jssm_viz.ts`:

```json
"docs": "typedoc src/ts/jssm.ts src/ts/jssm_viz.ts src/ts/jssm_types.ts src/ts/jssm_constants.ts src/ts/jssm_error.ts src/ts/jssm_util.ts src/ts/version.ts --options typedoc-options.cjs"
```

- [ ] **Step 4: Commit**

```
git add package.json
git commit -m "build(viz): chain make_viz_* and min_viz_* into make pipeline"
```

---

## Task 13: Add `./viz` subpath to `package.json` exports

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the subpath to `exports`**

In `package.json`, replace the existing `exports` block with:

```json
"exports": {
  ".": {
    "require": {
      "types"   : "./jssm.es5.d.cts",
      "default" : "./dist/jssm.es5.cjs"
    },
    "import": {
      "types"   : "./jssm.es6.d.ts",
      "default" : "./dist/jssm.es6.mjs"
    },
    "default": {
      "types"   : "./jssm.es5.d.cts",
      "default" : "./dist/jssm.es5.cjs"
    },
    "browser": "./dist/jssm.es5.iife.cjs"
  },
  "./viz": {
    "require": {
      "types"   : "./jssm_viz.es5.d.cts",
      "default" : "./dist/jssm_viz.cjs"
    },
    "import": {
      "types"   : "./jssm_viz.es6.d.ts",
      "default" : "./dist/jssm_viz.mjs"
    },
    "browser" : "./dist/jssm_viz.iife.cjs"
  }
}
```

- [ ] **Step 2: Smoke-test the subpath resolves correctly**

```
node -e "import('./dist/jssm_viz.mjs').then(m => console.log(Object.keys(m).sort().join(', ')))"
```

Expected output (key set may vary by export ordering, but all of these must appear):

```
build_time, configure, dot, dot_to_svg, fsl_to_dot, fsl_to_svg_element, fsl_to_svg_string, machine_to_dot, machine_to_svg_element, machine_to_svg_string, version
```

- [ ] **Step 3: Smoke-test through the package's resolver**

```
node -e "import('jssm/viz').then(m => console.log(typeof m.fsl_to_svg_string)).catch(e => console.error(e.message))"
```

Expected output: `function`. If it errors with `Package subpath './viz' is not defined`, the `exports` field is misformatted.

- [ ] **Step 4: Commit**

```
git add package.json
git commit -m "feat: expose jssm/viz as a package.json#exports subpath"
```

---

## Task 14: Run the full build and full test suite end-to-end

**Files:** none modified by this task; only verification.

- [ ] **Step 1: Clean build**

```
npm run clean
npm run make
```

Expected: completes without errors. All artifacts present:

```
ls dist/jssm.es5.cjs dist/jssm.es6.mjs dist/jssm.es5.iife.cjs
ls dist/jssm_viz.cjs dist/jssm_viz.mjs dist/jssm_viz.iife.cjs
```

- [ ] **Step 2: Full test suite**

```
npm run test
```

Expected: PASS. (`test` runs `make` then `jest` which is `jest-stoch && jest-spec`.)

- [ ] **Step 3: Vet**

```
npm run vet
```

Expected: PASS. (`vet` is `eslint && audit`.) The eslint rule set may flag style nits in the new file — fix inline if so. The `audit` step scans for FIXME/TODO/CHECKME tokens; since the ported viz code originally had several, expect this step to report counts. As long as it does not error, this is fine.

- [ ] **Step 4: Full build (vet + test + site + changelog + docs + cloc + readme)**

```
npm run build
```

Expected: PASS. Note that `readme` regenerates `README.md` from `src/doc_md/*.md`, so the README will reflect the new Visualization page once Task 15 lands.

- [ ] **Step 5: Commit any vet/audit/eslint fixes that came out of this**

If anything was modified during steps 1–4 (e.g., eslint auto-fixes), commit with:

```
git add -u
git commit -m "fix(viz): address eslint and audit findings from full build"
```

If nothing changed, skip this step.

---

## Task 15: Add user-facing visualization documentation

**Files:**
- Create: `src/doc_md/Visualization.md`
- Modify: `src/doc_md/DocLandingPage.md`

- [ ] **Step 1: Create `src/doc_md/Visualization.md`**

```markdown
# Visualization

`jssm/viz` is the visualization subpath of `jssm`.  It renders state machines
to graphviz dot source or to SVG using
[`@viz-js/viz`](https://www.npmjs.com/package/@viz-js/viz), a WebAssembly
build of Graphviz.

The viz subpath is opt-in: `import { sm } from 'jssm'` does not pull in
`@viz-js/viz`.  Visualization is only loaded when you import from `jssm/viz`.





&nbsp;

&nbsp;

# Installation

`@viz-js/viz` is declared as an `optionalDependency` of jssm.  In nearly all
environments, npm installs it automatically.

```sh
npm install jssm
```

If your platform cannot build `@viz-js/viz`, npm will skip it without failing
the install.  Visualization will throw a clear error at runtime in that case.

For browser-only usage (no npm), the IIFE bundles can be loaded from a CDN
(see "Browser, IIFE" below).





&nbsp;

&nbsp;

# Node — string output

```typescript
import { sm } from 'jssm';
import { fsl_to_svg_string, machine_to_svg_string } from 'jssm/viz';

// from FSL source:
const svg1 = await fsl_to_svg_string('a -> b;');

// from a Machine instance:
const m    = sm`a -> b;`;
const svg2 = await machine_to_svg_string(m);
```

`*_svg_string` returns an SVG XML string suitable for writing to a file,
serving over HTTP, or interpolating into HTML.





&nbsp;

&nbsp;

# Browser, ESM — element output

```html
<script type="module">
  import { sm }                     from 'https://esm.sh/jssm';
  import { fsl_to_svg_element }     from 'https://esm.sh/jssm/viz';

  const el = await fsl_to_svg_element('a -> b;');
  document.getElementById('chart').appendChild(el);
</script>
```

`fsl_to_svg_element` and `machine_to_svg_element` return a parsed
`SVGSVGElement` you can append directly to the DOM, skipping the
`innerHTML = svg_string` step.





&nbsp;

&nbsp;

# Browser, IIFE — with import map

For classic `<script>`-tag setups, declare an import map in the page so the
dynamic `import('@viz-js/viz')` inside jssm/viz can be resolved:

```html
<script type="importmap">
  { "imports": { "@viz-js/viz": "https://cdn.jsdelivr.net/npm/@viz-js/viz/+esm" } }
</script>

<script src="https://cdn.jsdelivr.net/npm/jssm/dist/jssm.es5.iife.cjs"></script>
<script src="https://cdn.jsdelivr.net/npm/jssm/dist/jssm_viz.iife.cjs"></script>

<script>
  jssm_viz.fsl_to_svg_string('a -> b;')
    .then(svg => document.getElementById('chart').innerHTML = svg);
</script>
```

The import map is document-scoped; the same map services both classic
script-tag loads and `<script type="module">` loads on the same page.





&nbsp;

&nbsp;

# Node — element output (advanced)

`*_svg_element` requires a `DOMParser`.  In the browser, this is provided
automatically.  In Node, you must inject one — typically from `jsdom`:

```typescript
import { JSDOM }                    from 'jsdom';
import { configure, fsl_to_svg_element } from 'jssm/viz';

configure({ DOMParser: new JSDOM().window.DOMParser });

const el = await fsl_to_svg_element('a -> b;');
// el is a parsed SVGSVGElement
```

Most Node users prefer `fsl_to_svg_string` and skip this step.





&nbsp;

&nbsp;

# API

| Function                    | Returns                       | Notes                                  |
|-----------------------------|-------------------------------|----------------------------------------|
| `fsl_to_dot(fsl)`           | `string`                      | Sync.  Pure dot generation.            |
| `machine_to_dot(machine)`   | `string`                      | Sync.  Pure dot generation.            |
| `dot_to_svg(dot)`           | `Promise<string>`             | Async (WASM init on first call).       |
| `fsl_to_svg_string(fsl)`    | `Promise<string>`             | Async.                                 |
| `machine_to_svg_string(m)`  | `Promise<string>`             | Async.                                 |
| `fsl_to_svg_element(fsl)`   | `Promise<SVGSVGElement>`      | Browser-only by default.               |
| `machine_to_svg_element(m)` | `Promise<SVGSVGElement>`      | Browser-only by default.               |
| `configure(opts)`           | `void`                        | Inject DOMParser; idempotent.          |
```

- [ ] **Step 2: Link the new page from the docs landing page**

Open `src/doc_md/DocLandingPage.md`, find an existing list of doc-page links, and add a line referencing `Visualization.md` in a position consistent with the existing ordering. Use the same syntax as the surrounding entries — the typedoc-pages plugin uses page-name references like `{@page Visualization.md Visualization}`. (Inspect adjacent links and copy the form exactly.)

- [ ] **Step 3: Rebuild the docs**

```
npm run docs
```

Expected: completes without errors. New page appears under `docs/docs/pages/Visualization.html`.

- [ ] **Step 4: Commit**

```
git add src/doc_md/Visualization.md src/doc_md/DocLandingPage.md
git commit -m "docs(viz): add Visualization page covering jssm/viz usage"
```

---

## Task 16: Update `base_README.md` and add `MIGRATING-jssm-viz.md`

**Files:**
- Modify: `base_README.md`
- Create: `MIGRATING-jssm-viz.md`

- [ ] **Step 1: Locate the readme template**

```
ls base_README.md src/doc_md/
```

`base_README.md` may not exist as such — `npm run readme` runs `node ./src/buildjs/make_readme.cjs` which assembles the README from doc_md sources. Read `src/buildjs/make_readme.cjs` to confirm the inputs and adjust the next step accordingly.

- [ ] **Step 2: If `base_README.md` exists, add a Visualization section**

Insert after the Quick Start / installation section (find a sensible location near Getting Started):

```markdown
## Visualization

`jssm` ships with a visualization subpath that renders state machines to
SVG using Graphviz (via [`@viz-js/viz`](https://www.npmjs.com/package/@viz-js/viz)).

```typescript
import { sm }                  from 'jssm';
import { fsl_to_svg_string }   from 'jssm/viz';

const svg = await fsl_to_svg_string('a -> b;');
```

The viz subpath is opt-in — importing only from `jssm` does not pull in
`@viz-js/viz`. See the [Visualization](./src/doc_md/Visualization.md) doc
page for browser, ESM, and IIFE usage patterns.
```

If `base_README.md` does not exist (i.e., the README is purely generated from `src/doc_md/`), add the Visualization callout to the appropriate doc_md source file (likely `src/doc_md/GettingStarted.md`) instead, with a wording that fits the surrounding tutorial.

- [ ] **Step 3: Create `MIGRATING-jssm-viz.md` at the repo root**

```markdown
# Migrating from `jssm-viz` to `jssm/viz`

Starting with **jssm 5.109.0**, the visualization library `jssm-viz` is part
of `jssm` itself, exposed as the `jssm/viz` subpath.

The standalone `jssm-viz` package is deprecated.  It will continue to work
(via a thin shim that re-exports from `jssm/viz`) but receive no further
updates.





## TL;DR

Change every:

```typescript
import { fsl_to_svg_string } from 'jssm-viz';
```

to:

```typescript
import { fsl_to_svg_string } from 'jssm/viz';
```

That is the entire required change.  The function signatures are unchanged.





## What's new in `jssm/viz`

### `fsl_to_svg_element` and `machine_to_svg_element`

Returns a parsed `SVGSVGElement` directly instead of a string, skipping the
`innerHTML = svg_string` step.  Browser-only by default; in Node, requires
`configure({ DOMParser })`.

```typescript
import { fsl_to_svg_element } from 'jssm/viz';

const el = await fsl_to_svg_element('a -> b;');
document.getElementById('chart').appendChild(el);
```

### `configure(opts)`

Optional one-time configuration entry point.  Currently accepts a custom
`DOMParser` constructor for Node + jsdom usage of `*_svg_element`.





## Under the hood

The visualization engine has been upgraded from `viz.js@2.1.2` (2018) to
`@viz-js/viz@3.x` (current).  The new engine is ESM-native, has its own
TypeScript types, does not pollute window globals, and renders synchronously
after a one-time WASM initialization.  Existing `*_svg_string` functions
still return promises — only the internal cold-start is async.

If you reached into `jssm-viz` internals (anything not in the documented
API), those internals have changed.  The supported public API is unchanged.
```

- [ ] **Step 4: Commit**

```
git add MIGRATING-jssm-viz.md base_README.md
git commit -m "docs: add migration guide for jssm-viz consumers"
```

(If `base_README.md` was not modified because the README is fully generated, drop it from the `git add` invocation.)

---

## Task 17: Manual browser smoke test

**Files:** none modified.

This is a manual verification step against the actual IIFE bundle in a real browser. It cannot be automated cheaply because the unified browser strategy depends on the document's import map being honored — that is a browser behavior, not a Node behavior.

- [ ] **Step 1: Create a temporary smoke-test HTML file**

```sh
mkdir -p tmp/manual-smoke
```

Create `tmp/manual-smoke/index.html`:

```html
<!doctype html>
<html>
<head>
  <title>jssm/viz IIFE smoke test</title>
  <script type="importmap">
    { "imports": { "@viz-js/viz": "https://cdn.jsdelivr.net/npm/@viz-js/viz@3/+esm" } }
  </script>
  <script src="../../dist/jssm.es5.iife.cjs"></script>
  <script src="../../dist/jssm_viz.iife.cjs"></script>
</head>
<body>
  <div id="chart"></div>
  <script>
    jssm_viz.fsl_to_svg_string('a -> b -> c -> a;')
      .then(svg => { document.getElementById('chart').innerHTML = svg; })
      .catch(err => { document.getElementById('chart').textContent = 'ERROR: ' + err.message; });
  </script>
</body>
</html>
```

- [ ] **Step 2: Serve and open in a browser**

```sh
npx --yes http-server tmp/manual-smoke -p 8085
```

Open `http://localhost:8085/` in Chrome. Then in Firefox. Then in Safari (if on macOS).

Expected: a small graphviz-rendered SVG showing nodes a, b, c connected in a cycle.

If any browser shows "ERROR: ...", that browser's import-map handling for dynamic imports in IIFE-loaded scripts is not behaving as the design assumes. Note the browser/version and proceed; it is acceptable to ship 5.109.0 with a documented note about that browser if Chrome and Firefox both work.

- [ ] **Step 3: Stop the server, remove the temp directory**

```sh
rm -rf tmp/manual-smoke
```

- [ ] **Step 4: Commit nothing** (this task produces no repo changes if the test passed). If a fix was needed during the smoke test, commit it with a `fix(viz): ...` message describing the cause.

---

## Done

At this point, jssm has the `jssm/viz` subpath, all tests pass, the build pipeline produces all expected artifacts, and the documentation is in place. The work is **ready** for a 5.109.0 release.

**Out of scope of this plan (handled separately by the user):**

1. Bump the package version to 5.109.0 (handled by `/sc-commit` per `CLAUDE.md`).
2. Publish to npm.
3. Cut and publish the `jssm-viz@5.109.0` shim release (separate repo).
4. Run `npm deprecate jssm-viz "..."` after the shim release is verified.
5. Archive the `StoneCypher/jssm-viz` GitHub repository.

---

## Self-review notes

This plan covers every item in the spec:

- **File layout** (spec §Architecture/File layout) → Tasks 2, 3, 8, 9, plus Rollup configs in Task 11.
- **Public API surface** (spec §Architecture/Public API) → Tasks 3 (configure, version, build_time), 4–5 (helpers and readers), 6 (machine_to_dot, fsl_to_dot, dot), 8 (svg_string), 9 (svg_element).
- **Build pipeline & packaging** (spec §Build pipeline) → Tasks 1 (deps), 11 (rollup), 12 (npm scripts), 13 (exports field).
- **Browser unified strategy** (spec §Browser usage strategy) → Tasks 11 (IIFE config), 15 (docs), 17 (manual verification).
- **Testing strategy** (spec §Testing strategy) → Tasks 3, 4, 5, 7, 8, 9, 10, 14.
- **Migration & rollout** (spec §Migration & rollout) → Tasks 15, 16. Steps in different repos (shim, deprecation, archive) are listed in "Out of scope".
- **Versioning** (spec §Versioning) → "Out of scope" — handled by `/sc-commit`.

Type and identifier consistency check: `viz_instance_promise`, `injected_dom_parser`, `get_viz`, `get_dom_parser`, `dot_to_svg_element` are used consistently across tasks 3, 8, 9. `_test` namespace export is added in Task 4 and extended in Task 5; same identifier throughout. Function signatures in Task 6 (`states_to_nodes_string`, `states_to_edges_string`, `arranges_for`, etc.) match what Task 7 calls into via `machine_to_dot`. Test file names (`viz_dot.spec.ts`, `viz_svg_string.spec.ts`, `viz_svg_element.spec.ts`) are stable across all tasks.

No placeholder strings ("TBD", "TODO", "implement later") in any code or command block.
