# Bare-functions API and `jssm/compat` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the default `jssm` import a set of bare functions over the machine value, with the 5.x `Machine` class preserved verbatim at `jssm/compat` as one-line delegates, so that importing only what you use tree-shakes the rest away.

**Architecture:** The 8,110-line `src/ts/jssm.ts` becomes `src/ts/machine/machine.ts` (fields, constructor, delegate methods, and the factories that need the constructor) plus eleven family files under `src/ts/machine/` that export functions whose first argument is the machine. The class is the runtime root: `machine.ts` imports every family at runtime; family files import the class **type only**, so no new import cycle exists. The machine value IS a `Machine` instance (decision 3), so every existing test keeps passing and is the compat contract. A new `src/ts/jssm.ts` is the barrel that re-exports the functions and the factories but not the class value; `src/ts/compat.ts` re-exports the barrel plus the class.

**Tech Stack:** TypeScript (target es2017, `strict: false`, `noImplicitReturns: true`), rollup + terser via `src/buildjs/run_build.cjs` stage config, vitest (spec / stoch / docs configs), fast-check, ESLint 10 flat config, typedoc, the docex extractor `src/buildjs/extract_examples.cjs`.

**Spec:** `notes/superpowers/specs/2026-09-10-bare-functions-api-design.md` (approved 2026-09-13; decisions 1–6). Program: `notes/superpowers/specs/2026-09-08-v6-landing-program-design.md`, sub-project 5. Inventory of the class this plan cites by line: produced 2026-09-13 against `src/ts/jssm.ts` at commit c33d9208 (188 members: 1 ctor, 160 methods, 20 getters, 3 setters, 4 private statics; 130 `_` fields; 8 `#` methods).

## Global Constraints

- **House rules (every task, every agent, verbatim):** Do not use compound commands, which can't be matched against allow rules, so they prompt — and every prompt halts the session until I respond, stranding all work if I am away. Compound commands are commands joined by &&, ||, ;, a pipe, or a newline — and any other form that bundles multiple commands into one tool call (subshell chaining, wrapper scripts written only to combine commands) is the same violation. Do not search for forms the hook doesn't catch; the rule is one command per call, in letter and in spirit. Never place any option between `git` and the subcommand, nor between `npm` and the subcommand. Do not use the affect-signature skill or write to any affect-payload file. Do not switch branches. Do not push. Commit pathspec-scoped (`git add <paths>`, never `git add -A`).
- **Do not change `package.json` `version`** or any workspace manifest version. Do not run `npm install`, `npm run make`, `npm run build`, `npm test`, or `npm run ci_build` (the controller runs builds). Allowed: `npx tsc --noEmit -p tsconfig.json`, `npx tsc --noEmit -p tsconfig.test.json`, `npx eslint <paths>`, `npx vitest run --config vitest.spec.config.ts <file> --coverage.enabled=false`, `npx vitest run --config vitest.stoch.config.ts <file> --coverage.enabled=false`, and the whole-suite forms of those two vitest commands (no `--coverage.enabled=false` needed for whole-suite runs).
- **Do not edit** anything under `dist/`, `packages/*/dist/`, `src/ts/wc/generated/`, `src/ts/fsl_parser.ts`, or `src/ts/version.ts`.
- **Behavior parity is the contract.** Every existing spec, stoch, docs, and uspec test passes unchanged except for the import-path edits Task 1 names. Never weaken, skip, or delete a test to make it pass; never pin a bug with a test; no golden-file or snapshot tests; no fake tests (a test whose expected value is computed by the code under test).
- **Coverage gate:** the spec suite requires 100% over `src/ts/**` (`vitest.spec.config.ts`). Every new file must reach it; the family functions inherit coverage from the delegates, but new branches (the `act`/`action`/`do` trio, `create`, the compat entry) need direct tests.
- **ESLint:** `npx eslint src/ts src/buildjs` must report 0 errors (warnings that match the existing file style may remain).
- **DocBlocks:** every exported function keeps the method's docblock, moved verbatim with `this.` → `m.` in prose and `@example` code rewritten to the function form (`import { sm, transition } from 'jssm'`). Every new entity gets a one-line summary, param meaning, return meaning, and a realistic example. Examples in `@example` tags become doctests once Task 7 adds the family files to the extractor; write them to run.
- **Naming (decision 5 and the spec's Function naming section):** snake_case function of the same name as the method, machine first; getters become functions; setters become `set_<name>`; the action-firing function is `act` with `action` as an alias (`export { act as action }`); nothing named `do` is exported as a function; `Machine.do()` stays as a `@deprecated` delegate.
- **Hot-path frame depth:** the class delegates for `transition`, `go`, `force_transition`, `act`, `do`, and `action` call `transition_impl(this, …)` directly (today's depth is class method → `transition_impl`), not the public one-liner wrapper, so the class path gains no frame. The functions `transition(m, x)` etc. are themselves one-liners over `transition_impl`.
- **Perf memory:** fields stay `_`-underscore plain properties (see the standing PERF comment at `jssm.ts:608-613`); never convert to `#`.
- **Doctests move with their members (ruling from the Task 4 review, 2026-09-13):** when a member whose docblock carries a real `@example` tag moves into a family file, that family file must be added to `ENTRY_POINTS` in `src/buildjs/extract_examples.cjs` in the same task, and each moved `@example` body must start with an explicit `import { … } from 'jssm'` line naming every identifier it uses (the extractor only hoists imports it finds inside example bodies). Before running the docs suite, delete `src/ts/tests/generated/*.docex.ts` and run `node src/buildjs/extract_examples.cjs`; stale generated files persist locally and make the docs count meaningless otherwise. Report the extractor's per-file counts and total; the total may only grow.
- **SDD ledger:** `.superpowers/sdd/2026-09-13-bare-functions-api/progress.md` in this worktree is authoritative for task state, rulings, and parked minors. Heartbeat files go in the controller's scratchpad `heartbeats/` directory at the path each brief names.

---

## File map

| Path | Responsibility | Created / modified |
|---|---|---|
| `src/ts/machine/machine.ts` | The `Machine<mDT>` class: field declarations (`jssm.ts:606-842`), the constructor (`846-1534`, body unchanged except `this.#x()`/private-static calls become family-function calls), one-line delegates for every member, and after the class: `create`, `sm`, `fsl`, `from`, `deserialize`, `compareVersions`, `type JssmMachine`. | created in Task 1 by `git mv src/ts/jssm.ts src/ts/machine/machine.ts`, then shrunk task by task |
| `src/ts/machine/events.ts` | `on`, `once`, `off`, `fire`, `fire_one`, `has_subscribers`, `subscribe`, `unsubscribe_entry`, `type JssmEventEntry` | Task 2 |
| `src/ts/machine/history.ts` | `history`, `history_inclusive`, `history_length`, `set_history_length` | Task 2 |
| `src/ts/machine/timers.ts` | `set_state_timeout`, `clear_state_timeout`, `state_timeout_for`, `current_state_timeout`, `auto_set_state_timeout`, `DEFAULT_TIME_SOURCE`, `DEFAULT_TIMEOUT_SOURCE`, `DEFAULT_CLEAR_TIMEOUT_SOURCE` | Task 2 |
| `src/ts/machine/transition.ts` | `transition_impl`, `transition`, `go`, `force_transition`, `act` (+ `action` alias), `override`, `valid_action`, `valid_transition`, `valid_force_transition`, `fire_hook_rejection`, `fire_boundary_actions` | Task 3 |
| `src/ts/machine/hooks.ts` | `set_hook`, `remove_hook`, `recompute_hook_flags`, `validate_hook_description`, the 26 `hook_*`/`post_hook_*` wrappers, `hook_registry`, `hooks_on`, `has_hook`, `state_has_hooks`, the four `entry_*` matchers, `is_hook_complex_result`, `is_hook_rejection`, `update_hook_fields`, `abstract_hook_step`, `abstract_everything_hook_step`, `HOOK_PASSED`, `HOOK_REJECTED`, `hook_required_fields`, `hook_spatial_fields` | Task 4 |
| `src/ts/machine/data.ts` | `data`, `set_data`, `data_ref`, `prop`, `strict_prop`, `props`, `known_prop`, `known_props`, `val`, `set_val`, `vals`, `known_val`, `known_vals`, `val_type`, `validate_val_value` | Task 5 |
| `src/ts/machine/query.ts` | the 62 query members of the inventory (state, label_for, display_text, is_start_state, is_end_state, failed_outputs, is_failed_output, is_failed, state_is_final, is_final, canonical, the `machine_*` / `editor_config` / `npm_name` / `default_size` / `fsl_version` / `raw_state_declarations` / `state_declaration(s)` / `machine_state` accessors, states, state_for, has_state, list_edges, list_named_transitions, list_actions, uses_actions, uses_forced_transitions, code_allows_override, config_allows_override, allows_override, allow_islands, all_state_name_chars, all_state_name_first_chars, all_action_label_chars, get_transition_by_state_names, lookup_transition_for, list_transitions, list_entrances, list_exits, actions, list_states_having_action, list_exit_actions, probable_action_exits, is_unenterable, has_unenterables, is_terminal, state_is_terminal, has_terminals, is_complete, state_is_complete, has_completes, edges_between, current_action_for, current_action_edge_for) | Task 5 |
| `src/ts/machine/stochastic.ts` | `start_state_weights`, `sample_start_state`, `probable_exits_for`, `assert_selectable_exit_pool`, `probabilistic_transition`, `probabilistic_walk`, `probabilistic_histo_walk`, `stochastic_one_walk`, `stochastic_runs`, `stochastic_summary`, `rng_seed`, `set_rng_seed`, `STOCHASTIC_DEFAULT_RUNS`, `STOCHASTIC_DEFAULT_MAX_STEPS` | Task 6 |
| `src/ts/machine/groups.ts` | `isIn`, `groupsOf`, `groups`, `statesIn`, `groups_by_depth` | Task 6 |
| `src/ts/machine/style.ts` | `graph_layout`, `dot_preamble`, `default_transition_config`, `default_graph_config`, `all_themes`, `themes`, `set_themes`, `flow`, the six `*_state_style` getters as functions, `resolved_themes`, `individual_state_config`, `compose_state_config`, `resolve_state_config`, `style_for`, `transfer_state_properties`, `apply_state_style_key`, `state_style_condense`, `merge_state_config` | Task 6 |
| `src/ts/machine/create.ts` | `new_state`, `serialize`, `instance_name`, `creation_date`, `creation_timestamp`, `create_start_time`, `find_connected_components` | Task 6 |
| `src/ts/jssm.ts` | The barrel: explicit re-exports of every public function, the factories, `type { Machine, JssmMachine }`, and every non-class export the old file had (its lines 83 and 8027-8110). Never exports the `Machine` value. | Task 1 |
| `src/ts/compat.ts` | `export * from './jssm.js'; export { Machine } from './machine/machine.js';` | Task 1 |
| `rollup.config.core.js`, `rollup.config.pkg_commonjs.js`, `rollup.config.pkg_iife.js`, `package.json` (scripts, exports, files), `packages/jssm-commonjs/package.json`, `src/buildjs/build_config_features.cjs` and its specs, `src/buildjs/extract_examples.cjs`, `typedoc-options.cjs` or the `docs` script | Build wiring for the compat entry and the moved doc examples | Task 1 (Task 7 for the extractor's family files) |
| `src/ts/tests/bare_functions_<family>.spec.ts` (one per task 2–6), `src/ts/tests/bare_vs_class.stoch.ts`, `src/ts/tests/entry_points.spec.ts`, `src/ts/tests/compat_bundle_size.spec.ts` | Direct tests of the function surface, the class/function parity walk, the entry-point contract, the tree-shaking claim | Tasks 1–7 |
| `src/md/README_base.md`, `src/doc_md/*.md`, `src/help/tutorials/*.md`, `MIGRATING-5-to-6.md` (created), `src/scripts/make_method_function_table.cjs` (created), `v6_breaking_changes.json` | Docs, migration table, manifest status | Task 7 |

## Patterns every extraction task follows

**A method becomes a function.** Given (from `jssm.ts:7120-7154`):

```typescript
  transition(newState: StateType, newData?: mDT): boolean {
    return this.transition_impl(newState, newData, false, false, arguments.length >= 2);
  }
```

the family file gets, docblock moved with it:

```typescript
export function transition<mDT>(m: Machine<mDT>, newState: StateType, newData?: mDT): boolean {
  return transition_impl(m, newState, newData, false, false, arguments.length >= 3);
}
```

(Note the `>= 3`: with the machine in argument slot 0, the data argument is the third. The class delegates keep `>= 2`. Ruling from Task 3, 2026-09-13, where the implementer caught the plan's original `>= 2` in the function form.)

and the class keeps a delegate that preserves `arguments.length` semantics (never forward `newData` through a wrapper that would turn an omitted argument into an explicit `undefined`; see the fsl#1264 note at `jssm.ts:6174-6176`):

```typescript
  transition(newState: StateType, newData?: mDT): boolean {
    return transition_impl(this, newState, newData, false, false, arguments.length >= 2);
  }
```

Inside a moved body every `this.` becomes `m.`; every `this.method(` becomes a call to the family function with `m` first; every `this.#private(` becomes a call to a module-private function in the same family file; every `Machine._static(` becomes a module function. Field reads stay as `m._field` (fields are plain `_` properties; nothing is `#`).

**A getter becomes a function; a setter becomes `set_<name>`:**

```typescript
export function history_length<mDT>(m: Machine<mDT>): number { return m._history_length; }
export function set_history_length<mDT>(m: Machine<mDT>, to: number): void { m._history_length = to; m._history.resize(to); }
```

with class delegates `get history_length() { return history_length(this); }` and `set history_length(to: number) { set_history_length(this, to); }`. Check the real setter body at `jssm.ts:6142-6145` before writing it; the line above is the shape, not the text.

**Type-only import of the class in every family file:**

```typescript
import type { Machine } from './machine.js';
```

(`import type` is erased at emit, so `machine.ts` → family → `machine.ts` is not a runtime cycle. Verify after each task with `npx rollup -c rollup.config.core.js` only if the controller asks; otherwise rely on `tsc`.)

**Module-private helpers** (the former `#` methods, TS `private` methods, and `private static`s) are plain `function`s in the family file, not exported, unless another family needs them, in which case they are exported from the family file but NOT listed in the barrel.

**Test for each extracted function** goes in `src/ts/tests/bare_functions_<family>.spec.ts`, imports the functions from `'../machine/<family>'` (or `'../jssm'` for public ones), builds machines with `sm` from `'../jssm'`, and asserts behavior with values the test computes independently. Minimum per function: one success path and, where the method documents a failure, the failure. Pattern:

```typescript
import { describe, test, expect } from 'vitest';
import { sm, transition, state, go, force_transition, act, action } from '../jssm';

describe('bare functions — transition family', () => {

  test('transition moves along a declared edge and reports true', () => {
    const m = sm`a -> b -> c;`;
    expect(transition(m, 'b')).toBe(true);
    expect(state(m)).toBe('b');
  });

  test('transition refuses an undeclared edge, leaves the state, reports false', () => {
    const m = sm`a -> b -> c;`;
    expect(transition(m, 'c')).toBe(false);
    expect(state(m)).toBe('a');
  });

  test('act and action are the same function object', () => {
    expect(action).toBe(act);
  });

});
```

**Parity stoch test** (`src/ts/tests/bare_vs_class.stoch.ts`, created in Task 2 and extended in every later task): two machines from the same FSL with the same `rng_seed`, one driven through the class, one through the functions, must agree after every step:

```typescript
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { sm, state, history, data, transition, act, probabilistic_transition, set_rng_seed } from '../jssm';

const SOURCE = `a 'go' -> b 'go' -> c 'go' -> a; a 'jump' -> c; c 'reset' -> a; b -> a;`;

describe('class and function surfaces agree', () => {

  test('a random program of actions and transitions leaves both machines in the same state, history, and data', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 2 ** 31 - 1 }),
      fc.array(fc.oneof(
        fc.constantFrom('go', 'jump', 'reset').map(a => ({ kind: 'act' as const, a })),
        fc.constantFrom('a', 'b', 'c').map(s => ({ kind: 'transition' as const, s })),
        fc.constant({ kind: 'probabilistic' as const }),
      ), { minLength: 1, maxLength: 40 }),
      (seed, program) => {
        const via_class = sm`${SOURCE}`;
        const via_fns   = sm`${SOURCE}`;
        via_class.rng_seed = seed;
        set_rng_seed(via_fns, seed);
        for (const step of program) {
          let r1: boolean, r2: boolean;
          if (step.kind === 'act')          { r1 = via_class.act(step.a);          r2 = act(via_fns, step.a); }
          else if (step.kind === 'transition') { r1 = via_class.transition(step.s); r2 = transition(via_fns, step.s); }
          else                              { r1 = via_class.probabilistic_transition(); r2 = probabilistic_transition(via_fns); }
          expect(r2).toBe(r1);
          expect(state(via_fns)).toBe(via_class.state());
        }
        expect(history(via_fns).toArray()).toEqual(via_class.history.toArray());
        expect(data(via_fns)).toEqual(via_class.data());
      }
    ), { numRuns: 200 });
  });

});
```

(Check `JssmHistory`'s real API for the array view before using `toArray()`; use whatever the class's own tests use.)

---

### Task 1: Scaffold the split — move the class, create the barrel and the compat entry, wire the builds

**Files:**
- Move: `src/ts/jssm.ts` → `src/ts/machine/machine.ts` (with `git mv`)
- Create: `src/ts/jssm.ts` (barrel), `src/ts/compat.ts`
- Modify: `rollup.config.core.js`, `rollup.config.pkg_commonjs.js`, `rollup.config.pkg_iife.js`, `package.json` (scripts `make_core` untouched; add `min_compat`; `exports`, `files`), `packages/jssm-commonjs/package.json` (`exports`), `src/buildjs/build_config_features.cjs`, `src/buildjs/tests/build_config_features.spec.ts` and `build_config.spec.ts` (only if they enumerate stage-5 finishers), `src/buildjs/extract_examples.cjs` (entry list), the `docs` script in `package.json` (typedoc entry list gains `src/ts/compat.ts`), every `src/ts/**` file that imports the `Machine` **value** from `./jssm.js`
- Test: `src/ts/tests/entry_points.spec.ts` (create), `src/ts/tests/published_files.spec.ts` (exists; covers new `files` entries automatically)

**Interfaces:**
- Consumes: nothing.
- Produces: `src/ts/machine/machine.ts` exporting `Machine`, `JssmMachine`, `create`, `sm`, `fsl`, `from`, `deserialize`, `compareVersions`, and (temporarily, until Tasks 2–6 move them) every module-level helper the old file exported; `src/ts/jssm.ts` exporting everything the old file exported EXCEPT the `Machine` value (`Machine` is exported as a type only); `src/ts/compat.ts`; `create<mDT>(config: JssmGenericConfig<StateType, mDT>): Machine<mDT>`; `type JssmMachine<mDT = unknown> = Machine<mDT>`.

- [ ] **Step 1: Move the file**

```bash
git mv src/ts/jssm.ts src/ts/machine/machine.ts
```

Then in `src/ts/machine/machine.ts` rewrite every relative import from `'./x.js'` to `'../x.js'` (the imports at old lines 6–7, 13–43, 50–53, 59–70, 76, 83, 129–131 and the re-export lines 8086–8110). `reduce-to-639-1` and `circular_buffer_js` are bare specifiers; leave them.

- [ ] **Step 2: Add `create` and `JssmMachine` to `machine.ts`**

Directly after the class's closing brace (old line 7453), before `sm`:

```typescript
/*******
 *
 *  Constructs a machine from a configuration object.  This is the function
 *  form of `new Machine(config)`: the value it returns is the machine record
 *  every other function in this package takes as its first argument.  In
 *  6.0 that record is also a `Machine` instance, so `instanceof Machine`
 *  holds and the 5.x methods remain reachable through `jssm/compat`.
 *
 *  ```typescript
 *  import { create, state } from 'jssm';
 *  const m = create({ start_states: ['a'], transitions: [{ from: 'a', to: 'b', kind: 'legal' }] });
 *  state(m);   // 'a'
 *  ```
 *
 *  @param config The machine configuration; the same shape `compile` produces from FSL.
 *
 *  @returns The new machine at its start state.
 *
 *  @see sm
 *  @see from
 *
 */

function create<mDT>(config: JssmGenericConfig<StateType, mDT>): Machine<mDT> {
  return new Machine<mDT>(config);
}



/*******
 *
 *  The type of the machine value the bare functions operate on.  Named so
 *  signatures can say what they take without naming the compat class; in 6.0
 *  it is the same type as `Machine`.
 *
 */

type JssmMachine<mDT = unknown> = Machine<mDT>;
```

Add `create` to the file's `export { … }` block and `export type { JssmMachine }` beside it. Write the example with a real minimal config shape — check `JssmGenericConfig` in `src/ts/jssm_types.ts` and the `transitions` element type before committing the example, because Task 7 turns it into a doctest.

- [ ] **Step 3: Write the barrel `src/ts/jssm.ts`**

```typescript
/*******
 *
 *  The default `jssm` entry: bare functions over a machine value, plus the
 *  factories that build one.  The `Machine` class itself is available from
 *  `jssm/compat`; from here it is reachable as a type only, so a 5.x
 *  `new Machine(...)` through this entry is a compile-time error rather than
 *  a runtime surprise (v6 breaking change `bare-functions-default-api`).
 *
 */

export {
  create, sm, fsl, from, deserialize, compareVersions,
  transfer_state_properties, state_style_condense,
  is_hook_rejection, is_hook_complex_result, abstract_hook_step, abstract_everything_hook_step,
  shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars,
  is_state_name_first_char, is_state_name_char,
} from './machine/machine.js';

export type { Machine, JssmMachine } from './machine/machine.js';

export { fslDiagnostics, fslCompletions, fslSemanticSpans } from './language_service/index.js';
export { fsl_fence_lang, parse_fence_info } from './fsl_markdown_fence.js';
export type { FencePart, FenceImageFormat, FenceDimensionUnit, FenceDimension, FenceDescriptor } from './fsl_markdown_fence.js';
// … and every remaining re-export from the old file's lines 8099–8110, verbatim, one statement each
```

Copy the old file's trailing re-export block (lines 8086–8110) into the barrel exactly, adjusting nothing but the fact that they now live here. Remove those re-exports from `machine.ts` (it should export only what it defines). As Tasks 2–6 move functions into family files, they append explicit `export { … } from './machine/<family>.js'` lines here; the barrel never uses `export *`.

- [ ] **Step 4: Write `src/ts/compat.ts`**

```typescript
/*******
 *
 *  The 5.x class API, unchanged: `import { Machine, sm } from 'jssm/compat'`
 *  is a drop-in for the 5.x `import { Machine, sm } from 'jssm'`.  Everything
 *  the default entry exports is re-exported here too, so a file can mix the
 *  two styles during a migration.
 *
 */

export * from './jssm.js';
export { Machine } from './machine/machine.js';
```

- [ ] **Step 5: Fix value imports of `Machine` inside `src/ts`**

Run `npx tsc --noEmit -p tsconfig.json` and `npx tsc --noEmit -p tsconfig.test.json`. Every error of the form "'Machine' cannot be used as a value because it was exported using 'export type'" names a file that does `new Machine(` or `instanceof Machine` through `./jssm.js`. For production files under `src/ts/` (expected: some of `jssm_viz.ts`, `wc/*.ts`, `cli/**`, `fsl_walk.ts`, `language_service/**`), change that one import to `'./machine/machine.js'` (or the right relative path): intra-core code reaches the class directly, never through `compat.js`, because the barrel re-exports modules such as `fsl_replay` and the language service, and an import of `compat.js` from one of those would put a `jssm.ts` ↔ `compat.ts` cycle into the default entry's graph (ruling from the Task 1 review, 2026-09-13; decision 4's "stay on compat" is about sibling *packages* and consumers). For test files, change the `Machine` import to `'../compat'` (keep `sm`/`from`/etc. imports on `'../jssm'` untouched). Record the list of files changed in the ledger; it is the "siblings still on compat" inventory for 6.x follow-ups.

- [ ] **Step 6: Wire the compat bundle**

In `rollup.config.core.js`, add to the array a second bundle and a second dts build:

```javascript
  // jssm/compat — the class entry, es only (cjs/iife consumers get compat through their own packages)
  {
    input: 'dist/es6/compat.js',
    output: [ { file: 'dist/jssm.compat.es6.js', format: 'es', name: 'jssm' } ],
    plugins: [ /* same three plugins as the core bundle, same options */ ],
  },
  {
    input: 'dist/es6/compat.d.ts',
    output: [ { file: './jssm.compat.d.ts', format: 'es' } ],
    plugins: [dts()],
  },
```

In `package.json` scripts add, modeled on `min_es6`:

```
"min_compat": "mv dist/jssm.compat.es6.js dist/jssm.compat.nonmin.cjs && terser dist/jssm.compat.nonmin.cjs > dist/jssm.compat.es6.mjs"
```

(The `&&` inside an npm script is the existing convention for these scripts and is not a tool-call compound command; do not run it by hand.) In `src/buildjs/build_config_features.cjs` add beside `min_es6`:

```javascript
  min_compat:   { script: 'min_compat',   stages: [5], optional: true, defaultEnabled: true, requires: ['make_core'] },
```

and update `src/buildjs/tests/build_config.spec.ts` line 121's cascade expectation and any finisher list in `build_config_features.spec.ts` that enumerates stage-5 minifiers, so they include `min_compat`. In `package.json`:

```json
  "exports": {
    ".":        { "types": "./jssm.es6.d.ts",    "import": "./dist/jssm.es6.mjs",        "default": "./dist/jssm.es6.mjs" },
    "./compat": { "types": "./jssm.compat.d.ts", "import": "./dist/jssm.compat.es6.mjs", "default": "./dist/jssm.compat.es6.mjs" },
    "./grammar": "./dist/grammars/fsl.tmLanguage.json",
    "./grammars/fsl.tmLanguage.json": "./dist/grammars/fsl.tmLanguage.json"
  },
  "files": [ "dist/jssm.es6.mjs", "dist/jssm.compat.es6.mjs", "dist/grammars/fsl.tmLanguage.json", "jssm.es6.d.ts", "jssm.compat.d.ts", "MIGRATING-jssm-viz.md" ]
```

In `rollup.config.pkg_commonjs.js` add a second cjs bundle from `dist/es6/compat.js` to `packages/jssm-commonjs/dist/compat.cjs` and a dts build to `packages/jssm-commonjs/dist/compat.d.cts`; in `packages/jssm-commonjs/package.json` add `"./compat": { "types": "./dist/compat.d.cts", "require": "./dist/compat.cjs", "default": "./dist/compat.cjs" }`. In `rollup.config.pkg_iife.js` change the bundle input to `dist/es6/compat.js` (a global has no subpaths, so the IIFE carries the superset; update the header comment to say so) and leave its dts input as `dist/es6/compat.d.ts`. Check `rollup.config.wc.viz.cdn.js` / `wc.instance.cdn.js` do not bundle `jssm.js` by name; if they do, leave them (they are the web components, unaffected).

In `src/buildjs/extract_examples.cjs`, wherever the entry list names `jssm.ts`, add `machine/machine.ts` so the 22 class examples keep being doctested (the extractor output count must stay 27 total until Task 7 adds families). In the `docs` script's typedoc argument list add `src/ts/compat.ts`.

- [ ] **Step 7: Write the failing entry-point test**

`src/ts/tests/entry_points.spec.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import * as jssm   from '../jssm';
import * as compat from '../compat';

describe('package entry points (decision 3: the record is a Machine instance)', () => {

  test('the default entry exports no Machine value', () => {
    expect((jssm as Record<string, unknown>).Machine).toBeUndefined();
  });

  test('the compat entry exports the Machine class and everything the default entry has', () => {
    expect(typeof compat.Machine).toBe('function');
    for (const key of Object.keys(jssm)) {
      expect(key in compat, key).toBe(true);
    }
  });

  test('create, sm, and from return Machine instances', () => {
    expect(jssm.sm`a -> b;`).toBeInstanceOf(compat.Machine);
    expect(jssm.from('a -> b;')).toBeInstanceOf(compat.Machine);
    expect(jssm.create({ start_states: ['a'], transitions: [] })).toBeInstanceOf(compat.Machine);
  });

  test('create builds the same machine as the class constructor', () => {
    const cfg = { start_states: ['a'], transitions: [{ from: 'a', to: 'b', kind: 'legal' as const }] };
    expect(jssm.create(cfg).states()).toEqual(new compat.Machine(cfg).states());
  });

});
```

Adjust the `transitions` element to the real `JssmTransition` config shape (see `jssm_types.ts`); the point is a machine with one edge.

- [ ] **Step 8: Run it to see it fail, then the whole suites**

```bash
npx vitest run --config vitest.spec.config.ts src/ts/tests/entry_points.spec.ts --coverage.enabled=false
```

Expected before Steps 2–4 are complete: module-not-found for `../compat`. After: PASS. Then:

```bash
npx tsc --noEmit -p tsconfig.json
```
```bash
npx tsc --noEmit -p tsconfig.test.json
```
```bash
npx eslint src/ts src/buildjs
```
```bash
npx vitest run --config vitest.spec.config.ts
```
```bash
npx vitest run --config vitest.stoch.config.ts
```
```bash
npx vitest run --config vitest.docs.config.ts
```

Expected: 0 tsc errors, 0 eslint errors, every suite green with the same counts as before (spec 10960 passed / 33 todo, stoch 1040, docs 27) plus the new entry-point tests, and 100% coverage in the spec run.

- [ ] **Step 9: Commit**

```bash
git add src/ts/jssm.ts src/ts/machine/machine.ts src/ts/compat.ts src/ts/tests/entry_points.spec.ts rollup.config.core.js rollup.config.pkg_commonjs.js rollup.config.pkg_iife.js package.json packages/jssm-commonjs/package.json src/buildjs/build_config_features.cjs src/buildjs/tests src/buildjs/extract_examples.cjs
```

plus every file Step 5 touched, then:

```bash
git commit -m "refactor(core)!: move Machine to src/ts/machine and make src/ts/jssm.ts a barrel; add the jssm/compat entry"
```

---

### Task 2: Extract the events, history, and timers families

**Files:**
- Create: `src/ts/machine/events.ts`, `src/ts/machine/history.ts`, `src/ts/machine/timers.ts`
- Modify: `src/ts/machine/machine.ts` (members → delegates; module consts move out), `src/ts/jssm.ts` (barrel lines)
- Test: `src/ts/tests/bare_functions_events.spec.ts`, `src/ts/tests/bare_functions_history.spec.ts`, `src/ts/tests/bare_functions_timers.spec.ts`, `src/ts/tests/bare_vs_class.stoch.ts` (create)

**Interfaces:**
- Consumes: `Machine` type from Task 1.
- Produces (events.ts): `on<mDT, Ev extends JssmEventName>(m, name, filterOrFn, maybeFn?): JssmUnsubscribe` (keep the two overload signatures from `jssm.ts:3849-3850`), `once` (same shape, `3879-3880`), `off(m, name, handler): boolean`, `fire<mDT, Ev>(m, name, detail): void` (was `_fire`, `4085-4105`; docblock at `4043-4059`), `has_subscribers(m, name): boolean` (was `_has_subscribers`, `4060-4083`), `fire_one` (was `_fire_one`, `3978-4039`), and module-private `subscribe`, `unsubscribe_entry` (were `#subscribe` `3935-3974`, `#unsubscribe_entry` `3919-3931`); `type JssmEventEntry` moves here from old lines 137–147 and is exported for `machine.ts`'s field type. `fire` and `has_subscribers` are exported from the module for the other families but NOT added to the barrel.
- Produces (history.ts): `history(m)`, `history_inclusive(m)`, `history_length(m): number`, `set_history_length(m, to: number): void` (from `6039-6145`; write the missing docblock for the setter).
- Produces (timers.ts): `set_state_timeout(m, next_state, after_time)`, `clear_state_timeout(m)`, `state_timeout_for(m, which_state)`, `current_state_timeout(m)`, `auto_set_state_timeout(m)` (from `6015-6033` and `7330-7418`), and the three `DEFAULT_*_SOURCE` consts (old lines 575–597), exported for `machine.ts`'s constructor, not in the barrel.

- [ ] **Step 1: Write the failing tests**

`src/ts/tests/bare_functions_events.spec.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { sm, on, once, off, transition } from '../jssm';

describe('bare functions — events family', () => {

  test('on subscribes to transition events and the unsubscribe stops them', () => {
    const m = sm`a -> b -> c;`;
    const seen: string[] = [];
    const unsub = on(m, 'transition', ev => { seen.push(ev.to); });
    transition(m, 'b');
    unsub();
    transition(m, 'c');
    expect(seen).toEqual(['b']);
  });

  test('once fires exactly one time', () => {
    const m = sm`a -> b -> c;`;
    let count = 0;
    once(m, 'transition', () => { count += 1; });
    transition(m, 'b');
    transition(m, 'c');
    expect(count).toBe(1);
  });

  test('off removes a handler and reports whether it was present', () => {
    const m = sm`a -> b;`;
    const h = () => {};
    on(m, 'transition', h);
    expect(off(m, 'transition', h)).toBe(true);
    expect(off(m, 'transition', h)).toBe(false);
  });

});
```

Before writing these, read `src/ts/tests/events.spec.ts` for the real event names and detail shapes (`JssmEventDetailMap`) and mirror them; the assertions above are the intent. `bare_functions_history.spec.ts`: `history(m)` after two transitions holds the prior states in order; `set_history_length(m, 1)` then a transition leaves length 1; `history_inclusive(m)` ends with the current state. `bare_functions_timers.spec.ts`: use the injected time/timeout sources the way `src/ts/tests/after_mapping.spec.ts` does (`time_source`, `timeout_source` in the config) so nothing sleeps: `set_state_timeout(m, 'b', 10)` then `current_state_timeout(m)` is `['b', 10]`; firing the captured timeout callback moves the machine to `b`; `clear_state_timeout(m)` makes `current_state_timeout(m)` undefined; `state_timeout_for(m, 'a')` reflects an `after` mapping declared in FSL.

Create `src/ts/tests/bare_vs_class.stoch.ts` from the pattern section, restricted for now to `transition` and `state`/`history`/`data` (the `act` and `probabilistic_transition` arms are added in Tasks 3 and 6; leave `TODO` markers out — add the arms when the functions exist).

- [ ] **Step 2: Run them to see them fail**

```bash
npx vitest run --config vitest.spec.config.ts src/ts/tests/bare_functions_events.spec.ts --coverage.enabled=false
```

Expected: FAIL, `on` is not exported from `../jssm` (and likewise for the other two files).

- [ ] **Step 3: Extract**

Create the three family files following the patterns section, moving each member's docblock with it and rewriting `@example` code to the function form. In `machine.ts` reduce each member to a delegate. `_fire`, `_has_subscribers`, `_fire_one` keep underscore-free names in the family file (`fire`, `has_subscribers`, `fire_one`); the class keeps `_fire`, `_has_subscribers`, `_fire_one` as delegates because `transition_impl` (still in the class until Task 3) and tests reach them by those names. Move `JssmEventEntry` and the three `DEFAULT_*_SOURCE` consts; import them into `machine.ts`.

Add to the barrel:

```typescript
export { on, once, off } from './machine/events.js';
export { history, history_inclusive, history_length, set_history_length } from './machine/history.js';
export { set_state_timeout, clear_state_timeout, state_timeout_for, current_state_timeout, auto_set_state_timeout } from './machine/timers.js';
```

- [ ] **Step 4: Run the new tests, then the whole suites**

Same six commands as Task 1 Step 8. Expected: everything green, counts unchanged plus the new tests, coverage 100%.

- [ ] **Step 5: Commit**

```bash
git add src/ts/machine/events.ts src/ts/machine/history.ts src/ts/machine/timers.ts src/ts/machine/machine.ts src/ts/jssm.ts src/ts/tests/bare_functions_events.spec.ts src/ts/tests/bare_functions_history.spec.ts src/ts/tests/bare_functions_timers.spec.ts src/ts/tests/bare_vs_class.stoch.ts
```
```bash
git commit -m "refactor(core): extract the events, history, and timers families as bare functions"
```

---

### Task 3: Extract the transition family; `act`/`action` replace `do`

**Files:**
- Create: `src/ts/machine/transition.ts`
- Modify: `src/ts/machine/machine.ts`, `src/ts/jssm.ts`
- Test: `src/ts/tests/bare_functions_transition.spec.ts`, `src/ts/tests/bare_vs_class.stoch.ts` (add the `act` arm), `src/ts/tests/synonym.spec.ts` (exists; read it — it may assert `do`/`action` synonymy and must keep passing)

**Interfaces:**
- Consumes: `fire`, `has_subscribers` from events.ts; `clear_state_timeout`, `auto_set_state_timeout` from timers.ts; the hook step helpers (`abstract_hook_step`, `abstract_everything_hook_step`, `is_hook_rejection`, `_update_hook_fields`, `HOOK_PASSED`, `HOOK_REJECTED`) which still live in `machine.ts` until Task 4 — import them from `'./machine.js'` **as values** for now (this one runtime edge from transition.ts back to machine.ts is temporary; Task 4 removes it by moving those helpers to hooks.ts. Record it in the ledger so Task 4's reviewer checks it is gone).
- Produces: `transition_impl(m, newStateOrAction, newData, wasForced, wasAction, dataProvided = newData !== undefined): boolean` (from `5457-6009`); `transition(m, newState, newData?)`, `go(m, …)`, `force_transition(m, …)` (from `7120-7218`); `act(m, actionName, newData?): boolean` with `export { act as action }` (from `action` at `6151-6178`; the `do` docblock at `7077-7114` has the better example — merge the two docblocks onto `act`); `override(m, newState, newData?)` (from `5204-5280`); `valid_action`, `valid_transition`, `valid_force_transition` (from `7250-7292`); `fire_hook_rejection(m, …)` and `fire_boundary_actions(m, prev, next)` (from `5284-5453`, exported from the module for hooks/groups, not in the barrel). All of these preserve the `arguments.length >= 2` data-provision rule.
- Class changes: `act(actionName, newData?)` added as a delegate; `action()` and `do()` remain as delegates; `do()` gets `@deprecated Use act() or action(); do is a JavaScript reserved word and has no function form. Removal is tracked as StoneCypher/fsl#1992.` in its docblock; `transition`, `go`, `force_transition`, `act`, `action`, `do` delegates call `transition_impl(this, …)` directly (frame-depth rule).

- [ ] **Step 1: Write the failing tests**

`src/ts/tests/bare_functions_transition.spec.ts` covers, each with an independently known expected value: `transition` legal/illegal; `go` is `transition` (same result and state); `force_transition` succeeds on a forced edge (`a ~> b`) and fails on a plain one when overrides are off; `act` fires a named action and returns false for an unknown one; `action` is the same function object as `act`; `override` moves to any state when `allows_override` permits and throws (or returns per the docblock) when it does not — read `jssm.ts:5204-5280` and `src/ts/tests/override.spec.ts` if present for the true contract; `valid_transition`/`valid_action`/`valid_force_transition` predict what the corresponding call would return without moving the machine; data provision: `transition(m, 'b')` leaves data alone, `transition(m, 'b', undefined)` sets it to `undefined` (the fsl#1264 rule) — assert both through `data(m)` (import from `'../compat'`'s method `m.data()` until Task 5 provides the function). Also a class-side test: `m.act('go')` works, `m.do('go')` still works and equals `m.action('go')` in effect.

Extend `bare_vs_class.stoch.ts` with the `act` arm from the pattern section.

- [ ] **Step 2: Run to see them fail**

```bash
npx vitest run --config vitest.spec.config.ts src/ts/tests/bare_functions_transition.spec.ts --coverage.enabled=false
```

Expected: FAIL on the missing exports.

- [ ] **Step 3: Extract**

Move `transition_impl` whole. Inside it, rewrite: `this.` → `m.`; `this._fire(` → `fire(m, `; `this._has_subscribers(` → `has_subscribers(m, `; `this._fire_hook_rejection(` → `fire_hook_rejection(m, `; `this._fire_boundary_actions(` → `fire_boundary_actions(m, `; `this.clear_state_timeout()` → `clear_state_timeout(m)`; `this.auto_set_state_timeout()` → `auto_set_state_timeout(m)`. In `fire_hook_rejection` and `fire_boundary_actions`, `this.action(` → `act(m, ` (note both re-enter the machine; keep the reentrancy guard fields `_committing_transition`, `_boundary_depth`, `_boundary_depth_limit` exactly as they are). Do not restructure `transition_impl`; this task is a move, and the final review diffs the moved body against the old one.

Barrel:

```typescript
export { transition, go, force_transition, act, action, override, valid_action, valid_transition, valid_force_transition } from './machine/transition.js';
```

- [ ] **Step 4: Run the new tests, then the whole suites** (the six commands). Expected green, counts unchanged plus new tests, coverage 100%. Additionally run the stoch parity file three times (three separate commands) so the random program gets several draws.

- [ ] **Step 5: Commit**

```bash
git add src/ts/machine/transition.ts src/ts/machine/machine.ts src/ts/jssm.ts src/ts/tests/bare_functions_transition.spec.ts src/ts/tests/bare_vs_class.stoch.ts
```
```bash
git commit -m "refactor(core)!: extract the transition family; act/action are the function forms, Machine.do() is deprecated (fsl#1992)"
```

---

### Task 4: Extract the hooks family

**Files:**
- Create: `src/ts/machine/hooks.ts`
- Modify: `src/ts/machine/machine.ts`, `src/ts/machine/transition.ts` (import the hook step helpers from hooks.ts instead of machine.ts), `src/ts/jssm.ts`
- Test: `src/ts/tests/bare_functions_hooks.spec.ts`

**Interfaces:**
- Consumes: `fire` from events.ts.
- Produces: `set_hook(m, desc)`, `remove_hook(m, desc): boolean` (`4161-4583`); module-private `validate_hook_description`, `recompute_hook_flags` (`4116-4158`, `4587-4661`); the 26 wrappers `hook`, `hook_action`, `hook_global_action`, `hook_any_action`, `hook_standard_transition`, `hook_main_transition`, `hook_forced_transition`, `hook_any_transition`, `hook_entry`, `hook_exit`, `hook_after`, `hook_after_any`, `post_hook`, `post_hook_action`, `post_hook_global_action`, `post_hook_any_action`, `post_hook_standard_transition`, `post_hook_main_transition`, `post_hook_forced_transition`, `post_hook_any_transition`, `post_hook_entry`, `post_hook_exit`, `hook_pre_everything`, `hook_everything`, `hook_post_everything`, `hook_pre_post_everything` (`4665-5133`; each returns `m` so chaining works exactly as the class returned `this`); `hook_registry(m)`, `hooks_on(m, query)`, `has_hook(m, query, phase?)`, `state_has_hooks(m, state)` (`6382-6757`); module functions `entry_touches_state`, `entry_matches_edge`, `entry_matches_action`, `entry_matches_group` (the private statics `6549-6642`); moved from after the class: `is_hook_complex_result`, `update_hook_fields` (was `_update_hook_fields`), `is_hook_rejection`, `HOOK_PASSED`, `HOOK_REJECTED`, `abstract_hook_step`, `abstract_everything_hook_step` (old `7600-7915`); moved from before the class: `hook_required_fields`, `hook_spatial_fields` (old `85-123`). The barrel exports the public ones (`set_hook`, `remove_hook`, the 26 wrappers, `hook_registry`, `hooks_on`, `has_hook`, `state_has_hooks`, `is_hook_rejection`, `is_hook_complex_result`, `abstract_hook_step`, `abstract_everything_hook_step`) and moves the last four off the `machine.js` re-export line in the barrel.

- [ ] **Step 1: Write the failing tests** — `bare_functions_hooks.spec.ts`: `hook(m, 'a', 'b', handler)` returns `m` and the handler sees the transition and can veto it (return `false` → `transition` returns false and state stays); `remove_hook` returns true then false; `hook_registry(m)` lists the installed hook with its `from`/`to`; `hooks_on(m, { state: 'a' })` finds it; `has_hook` agrees; `state_has_hooks(m, 'a')` true / `'c'` false; one `post_hook_*` and one everything-hook wrapper exercised. Read `src/ts/tests/hook_registry.stoch.ts` and `machine_hook_kinds.stoch.ts` for the registry entry shapes.

- [ ] **Step 2: Run to see them fail** (the single-file vitest command). Expected: missing exports.

- [ ] **Step 3: Extract** per the patterns. `set_hook` and `remove_hook` read `m._state_interner` / `m._action_interner` and every hook store; keep the bodies verbatim apart from `this.` → `m.`. Update `transition.ts` to import the step helpers from `'./hooks.js'` and delete the temporary value import from `'./machine.js'` (verify with a grep that `transition.ts` has only `import type` from `./machine.js`).

- [ ] **Step 4: Run the new tests, then the whole suites** (six commands). Expected green; coverage 100%.

- [ ] **Step 5: Commit**

```bash
git add src/ts/machine/hooks.ts src/ts/machine/transition.ts src/ts/machine/machine.ts src/ts/jssm.ts src/ts/tests/bare_functions_hooks.spec.ts
```
```bash
git commit -m "refactor(core): extract the hooks family as bare functions"
```

---

### Task 5: Extract the data and query families

**Files:**
- Create: `src/ts/machine/data.ts`, `src/ts/machine/query.ts`
- Modify: `src/ts/machine/machine.ts`, `src/ts/jssm.ts`
- Test: `src/ts/tests/bare_functions_data.spec.ts`, `src/ts/tests/bare_functions_query.spec.ts`, `bare_vs_class.stoch.ts` (switch its `data`/`state`/`history` reads to the functions if it used methods)

**Interfaces:**
- Consumes: `fire` from events.ts (for `set_data`).
- Produces (data.ts): `data`, `set_data` (returns `m`), `data_ref` (was `_data_ref`; keep the class's `_data_ref` delegate because `src/ts/wc/fsl_bind_wc.ts:89` and tests call it), `prop`, `strict_prop`, `props`, `known_prop`, `known_props`, `val`, `set_val`, `vals`, `known_val`, `known_vals`, `val_type` (from `1657-2086`); `validate_val_value` moves here from old lines 161–212 (exported for the constructor, not in the barrel).
- Produces (query.ts): the 62 query members listed in the file map, each `name(m, …)`; getters (`uses_actions`, `uses_forced_transitions`, `code_allows_override`, `config_allows_override`, `allows_override`, `allow_islands`) become functions of `m`. `state(m)` is the plain field read. The three `all_*_chars` functions keep reading the constants tables.
- Barrel: one `export { … } from './machine/data.js'` line and one from `query.js` listing exactly the public names.

- [ ] **Step 1: Write the failing tests** — data: `data(m)` returns a structured clone (mutating the result does not change the machine); `set_data(m, x)` then `data(m)` equals `x` and returns `m`; `prop`/`strict_prop` against a machine declaring `property: p 1;` and a state override (read `src/ts/tests/properties.stoch.ts` for the syntax); `val`/`set_val`/`val_type` with a typed val and a wrong-typed set that throws `JssmError`; `known_*` predicates. query: at least one test per exported function, grouped by describe; pick machines from `src/ts/tests/machine_queries.stoch.ts` and `machine_core.stoch.ts` so expected values are visibly derivable from the FSL text (e.g. `list_exits(m, 'a')` on `a -> b; a -> c;` is `['b', 'c']`).

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Extract** per the patterns. `list_transitions`, `list_entrances`, `list_exits`, `actions`, `list_exit_actions`, `probable_action_exits` have a default parameter `whichState = this.state()`; write it as `whichState: StateType = state(m)` in the function and keep `= this.state()` in the delegate.

- [ ] **Step 4: Run the new tests, then the whole suites.** Expected green; coverage 100%.

- [ ] **Step 5: Commit**

```bash
git add src/ts/machine/data.ts src/ts/machine/query.ts src/ts/machine/machine.ts src/ts/jssm.ts src/ts/tests/bare_functions_data.spec.ts src/ts/tests/bare_functions_query.spec.ts src/ts/tests/bare_vs_class.stoch.ts
```
```bash
git commit -m "refactor(core): extract the data and query families as bare functions"
```

---

### Task 6: Extract the stochastic, groups, style, and create families; the class is delegates only

**Files:**
- Create: `src/ts/machine/stochastic.ts`, `src/ts/machine/groups.ts`, `src/ts/machine/style.ts`, `src/ts/machine/create.ts`
- Modify: `src/ts/machine/machine.ts`, `src/ts/jssm.ts`
- Test: `src/ts/tests/bare_functions_stochastic.spec.ts`, `bare_functions_groups.spec.ts`, `bare_functions_style.spec.ts`, `bare_functions_create.spec.ts`, `bare_vs_class.stoch.ts` (add the `probabilistic_transition` arm)

**Interfaces:**
- Consumes: `state`, `editor_config`, `is_start_state`, `is_end_state`, `state_is_terminal` from query.ts; `state_has_hooks` from hooks.ts; `transition` from transition.ts (for `probabilistic_transition`); `fire` if any moved body emits.
- Produces (stochastic.ts): `start_state_weights`, `sample_start_state`, `probable_exits_for`, `probabilistic_transition`, `probabilistic_walk`, `probabilistic_histo_walk`, `stochastic_runs` (generator), `stochastic_summary`, `rng_seed(m): number`, `set_rng_seed(m, to)`, module-private `assert_selectable_exit_pool`, `stochastic_one_walk`; `STOCHASTIC_DEFAULT_RUNS`, `STOCHASTIC_DEFAULT_MAX_STEPS` (old lines 569–571) exported here and re-exported by the barrel.
- Produces (groups.ts): `isIn`, `groupsOf`, `groups`, `statesIn`; `groups_by_depth` (was `#groups_by_depth`, exported for style.ts, not in the barrel).
- Produces (style.ts): `graph_layout`, `dot_preamble`, `default_transition_config`, `default_graph_config`, `all_themes`, `themes(m)`, `set_themes(m, to)` (busts `_static_state_config_cache` as the setter does at `2933`), `flow`, `standard_state_style`, `hooked_state_style`, `start_state_style`, `end_state_style`, `terminal_state_style`, `active_state_style`, `resolve_state_config`, `style_for`; module-private `resolved_themes`, `individual_state_config`, `compose_state_config`; moved from before the class: `transfer_state_properties` (export, barrel), `apply_state_style_key` (private), `state_style_condense` (export, barrel), `merge_state_config` (private). The barrel's `machine.js` re-export line loses `transfer_state_properties` and `state_style_condense`; they come from `style.js` now.
- Produces (create.ts): `new_state(m, state_config)` (was `_new_state`; the constructor calls it; keep the class `_new_state` delegate because tests call it), `serialize(m, comment?)`, `instance_name(m)`, `creation_date(m)`, `creation_timestamp(m)`, `create_start_time(m)`; `find_connected_components` (old 506–562, exported for the constructor, not in the barrel).
- After this task `machine.ts` contains: imports, the field block, the constructor, delegates only, and after the class `create`, `sm`, `fsl`, `from`, `deserialize`, `compareVersions`, `JssmMachine`, the export block. No `#` methods, no private statics, no module-level helper that a family owns.

- [ ] **Step 1: Write the failing tests** — stochastic: `set_rng_seed` then `probabilistic_walk(m, 20)` is reproducible across two machines; `stochastic_summary` respects `runs`; `sample_start_state` honors `start_states: [a 90% b 10%]` roughly (a chi-square-free bound: with seed fixed, 1000 draws yield more `a` than `b`); groups: on a machine with `&g: [a b];` `groups(m)` is `['g']`, `statesIn(m, 'g')` is `['a','b']`, `groupsOf(m, 'a')` has `g`, `isIn(m, 'g')` reflects the current state; style: `themes`/`set_themes` round-trip and `resolve_state_config` reflects a theme change (cache busting), `style_for` equals `resolve_state_config`, `flow(m)` on `flow: left;`; create: `serialize(m)` round-trips through `deserialize` (state, history, data), `instance_name`, the three creation-time functions are monotone and `creation_date` is a `Date` of `creation_timestamp`. Add the `probabilistic_transition` arm to the parity stoch test.

- [ ] **Step 2: Run to see them fail.**

- [ ] **Step 3: Extract** per the patterns, then verify the class shape with `grep -c "#" src/ts/machine/machine.ts` style checks: no `#` method definitions remain, no `private static`, and the only functions defined after the class are the six listed above.

- [ ] **Step 4: Run the new tests, the parity stoch file three times, then the whole suites.** Expected green; coverage 100%.

- [ ] **Step 5: Commit**

```bash
git add src/ts/machine/stochastic.ts src/ts/machine/groups.ts src/ts/machine/style.ts src/ts/machine/create.ts src/ts/machine/machine.ts src/ts/jssm.ts src/ts/tests/bare_functions_stochastic.spec.ts src/ts/tests/bare_functions_groups.spec.ts src/ts/tests/bare_functions_style.spec.ts src/ts/tests/bare_functions_create.spec.ts src/ts/tests/bare_vs_class.stoch.ts
```
```bash
git commit -m "refactor(core): extract the stochastic, groups, style, and create families; Machine is delegates only"
```

---

### Task 7: Contract checks, doctests, bundle size, docs, manifest

**Files:**
- Create: `src/ts/tests/bare_functions_surface.spec.ts`, `src/ts/tests/compat_bundle_size.spec.ts`, `src/scripts/make_method_function_table.cjs`, `MIGRATING-5-to-6.md`
- Modify: `src/buildjs/extract_examples.cjs` (add `machine/*.ts` family files), `src/md/README_base.md`, `src/doc_md/WhatAreStateMachines.md`, `src/doc_md/WebComponents.md`, `src/help/tutorials/*.md` and any other `src/doc_md` / `src/help` file that teaches `.do(` or `new Machine(` / `import { Machine } from 'jssm'`, `v6_breaking_changes.json`, `package.json` `files` (add `MIGRATING-5-to-6.md`)
- Test: the two new spec files; the docs suite (doctests) must pass with the family examples added

**Interfaces:**
- Consumes: every family module.
- Produces: `src/scripts/make_method_function_table.cjs` — reads `src/ts/machine/machine.ts`, lists every public method/getter/setter name of the class and the corresponding function name (`name` → `name`, getter → `name`, setter → `set_name`, `do` → `act` / `action`, `sm`/`fsl` methods → the top-level `sm`/`fsl`), writes a Markdown table to stdout; `MIGRATING-5-to-6.md` embeds that table under a heading and starts with the two-line escape hatch.

- [ ] **Step 1: Surface test** — `bare_functions_surface.spec.ts`: for every public method of `compat.Machine.prototype` (own property names, excluding `constructor`, names starting with `_`, `do`, `sm`, `fsl`), assert that `jssm` (the barrel namespace) exports a function of the same name, or `set_<name>` for a setter-only property, and that `act` and `action` exist and `jssm.do` does not. This is the generative contract that no method was left without a function (it computes the expectation from the class's *names*, not from the functions' behavior, so it is not a fake test).

- [ ] **Step 2: Bundle-size test** — `compat_bundle_size.spec.ts`, guarded like `published_files.spec.ts` with `describe.skipIf(!existsSync(resolve(root, 'dist/es6/compat.js')))`: use rollup's JS API (`import { rollup } from 'rollup'`) with a virtual entry plugin to bundle (a) `export { sm, transition, state } from '<root>/dist/es6/jssm.js'` and (b) `export { Machine } from '<root>/dist/es6/compat.js'`, `treeshake: true`, no minification, and assert `a.length < b.length` (no numeric golden). Use `@rollup/plugin-node-resolve` as the core config does. If the ci-lite legs lack `dist/es6`, the guard skips it; the release build runs it.

- [ ] **Step 3: Doctests** — add `machine/events.ts`, `machine/history.ts`, `machine/timers.ts`, `machine/transition.ts`, `machine/hooks.ts`, `machine/data.ts`, `machine/query.ts`, `machine/stochastic.ts`, `machine/groups.ts`, `machine/style.ts`, `machine/create.ts` to the extractor's entry list, run the extractor (`node src/buildjs/extract_examples.cjs`), then `npx vitest run --config vitest.docs.config.ts`. Every `@example` must pass; fix the example, never the extractor, unless the extractor mis-parses a valid docblock (report that in the ledger). Note the extractor cannot carry `@ts-expect-error` in an example.

- [ ] **Step 4: Docs sweep** — README source: the quick-start uses `import { sm, transition, state } from 'jssm'`; add a "Coming from 5.x" box: `import { Machine, sm } from 'jssm/compat'` is a drop-in. Replace every taught `.do(` with `.act(` and every `import { Machine } from 'jssm'` with the compat form across `src/doc_md`, `src/help`, and the docblocks. Do not touch tests' `.do(` calls (they cover the deprecated delegate). Write the table script and `MIGRATING-5-to-6.md` (sections: the escape hatch; functions vs methods with the generated table; `do` → `act`/`action`; the other 6.0 breaks in `v6_breaking_changes.json` each get a paragraph copied from its `migration` field). Add `MIGRATING-5-to-6.md` to `package.json` `files`.

- [ ] **Step 5: Manifest** — in `v6_breaking_changes.json` set `bare-functions-default-api` to `"status": "landed"`, and correct its `breaks` and `migration` text to the truth of decision 3: through the default entry, `import { Machine }` as a value is gone and `new Machine(...)` no longer compiles; method calls on machines returned by `sm`/`from`/`create` still work in 6.0 because the value is a `Machine` instance; `jssm/compat` restores the class import verbatim; `do()` is deprecated in favor of `act()`/`action()` (fsl#1992). Update `implementation` to name the family files and the compat entry.

- [ ] **Step 6: Whole-suite runs** — the six commands plus `node src/scripts/make_method_function_table.cjs` (prints a table with no `do` row on the function side). Expected green, docs count increased by the family examples, coverage 100%.

- [ ] **Step 7: Commit**

```bash
git add src/ts/tests/bare_functions_surface.spec.ts src/ts/tests/compat_bundle_size.spec.ts src/scripts/make_method_function_table.cjs MIGRATING-5-to-6.md src/buildjs/extract_examples.cjs src/md/README_base.md src/doc_md src/help v6_breaking_changes.json package.json
```
```bash
git commit -m "docs(v6)!: bare-functions contract tests, doctests for the family files, MIGRATING-5-to-6, manifest landed"
```

---

## After the tasks (controller, not an implementer)

1. Final whole-branch review (Opus) with the spec, this plan, and the ledger; one fix wave; one scoped re-review.
2. `npm install` sanity (revert the known lockfile/cli-dist churn), then `npm run build` in the **foreground** with the 10-minute timeout (background builds get killed for memory on this machine); confirm spec/stoch/docs counts and that `dist/jssm.compat.es6.mjs`, `jssm.compat.d.ts`, `packages/jssm-commonjs/dist/compat.cjs` exist and `published_files.spec.ts` passed.
3. Bump the alpha (`6.0.0-alpha.18`), commit the release build, push, PR against `docs_26-07-04_fable-v6-to-v16`.
4. Sub-project 6 (landing) owns: the graviton `construct()`/transition envelope over the whole v6 line, the README rewrite beyond the quick-start, stale root `.d.ts` cleanup, `/sc-commit` to 6.0.0, the PR to main, Trusted Publisher entries.

## Self-review notes

- Spec coverage: decisions 1–6 map to Tasks 1 (3), 1 (4, siblings on compat via Step 5), 3 (5), 2–6 (1, 6), 2 (2); the contract check, bundle-size spec, docs, and manifest are Task 7; entry points and packaging are Task 1.
- Type consistency: every function takes `m: Machine<mDT>` first; setters are `set_<name>`; `act`/`action` are one object; internal cross-family functions (`fire`, `has_subscribers`, `fire_hook_rejection`, `fire_boundary_actions`, `groups_by_depth`, `new_state`, `validate_val_value`, `find_connected_components`, the `DEFAULT_*_SOURCE`s, `hook_required_fields`) are module exports never listed in the barrel.
- Known temporary edge: Task 3's value import of the hook step helpers from `machine.ts`, removed in Task 4.
- Not in this plan: migrating the sibling packages to functions (decision 4 defers to 6.x), removing `do()` (fsl#1992), the format packages' minified-size trend (size_chart picks it up at landing).
