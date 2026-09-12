# Bare-functions API and `jssm/compat` — design (DRAFT, pending John's review)

**Date:** 2026-09-10
**Program:** v6 landing, sub-project 5 (see `2026-09-08-v6-landing-program-design.md`)
**Manifest id:** `bare-functions-default-api` (megaspec §27)
**Status:** decisions 1–2 approved in conversation 2026-09-09/10; sections marked ASSUMED are the controller's defaults, presented for approval; sections marked OPEN need John.

## Decisions so far

1. **Functions are the source of truth; the class delegates.** (approved 2026-09-09) A plain machine record plus functions grouped by family; `Machine` in `jssm/compat` becomes thin delegators; the existing spec suite runs against compat as the contract. Real tree-shaking.
2. **The machine value is a mutable record operated on in place.** (approved 2026-09-10) `transition(m, x)` mutates `m` and returns a boolean, exactly today's semantics with the receiver moved to the first argument. Hooks, timers, events, history keep their current behavior.

## Shape (ASSUMED unless marked OPEN)

### The record

`JssmMachine<mDT>` is the exported opaque type of the value every function takes first. Concretely it is the current class's instance state: every `_field` on `Machine` today becomes a field of the record (same names, same types, same hidden-class layout so the dispatch-path perf work survives). The record is created by `create(config)` (today's constructor body) and by the existing `sm`/`fsl` tagged templates and `from(source, extra)`, which return the record.

Consumers never construct the record literal themselves; `create` is the only constructor. The type is exported so signatures can name it, and its fields are not part of the public contract (documented as internal, like today's `_` fields).

### Function naming

Every public method becomes a function of the same snake_case name with the machine first: `m.transition(x)` → `transition(m, x)`; `m.list_exits(s)` → `list_exits(m, s)`. Getters become plain functions: `m.history` → `history(m)`; setters become `set_<name>(m, v)`: `m.rng_seed = 3` → `set_rng_seed(m, 3)`, `m.themes = t` → `set_themes(m, t)`, `m.history_length = n` → `set_history_length(m, n)`. The template-tag methods `m.sm` / `m.fsl` (which create a new machine sharing options) are dropped from the function surface; the top-level `sm`/`fsl` cover them.

Name collisions with existing top-level exports: `state` (the function) is fine; `from` stays the constructor-from-string; `data`/`props`/`vals` are fine. `do` is a reserved word as an identifier only in some positions and is legal as an export name in ESM; keep `do(m, action)` for parity but also export `act(m, action)`? OPEN (recommend: keep `do` only, since `import { do }` is legal ESM and `action(m, x)` already exists as the boolean form).

### Module layout (families)

The 8,035-line `jssm.ts` splits by family into files under `src/ts/machine/`, each exporting functions over `JssmMachine`:

| file | families (approx. members) |
|---|---|
| `create.ts` | `create`, `sm`, `fsl`, `from`, `deserialize`, `serialize`, `canonical`, `compareVersions` (the constructor body and construction-time validation) |
| `query.ts` | state queries and introspection: `state`, `states`, `state_for`, `has_state`, `is_start_state`, `is_end_state`, `is_final`, `is_terminal`, `state_is_*`, `has_*`, `failed_outputs`, `list_edges`, `list_named_transitions`, `list_actions`, `list_transitions`, `list_entrances`, `list_exits`, `edges_between`, `get_transition_by_state_names`, `lookup_transition_for`, `current_action_for`, `current_action_edge_for`, `valid_*`, `actions`, `list_states_having_action`, `list_exit_actions`, `probable_action_exits`, the `machine_*` / `fsl_version` / `npm_name` / `default_size` / `editor_config` / `raw_state_declarations` / `state_declaration(s)` / `machine_state` / `instance_name` / `creation_*` accessors, `label_for`, `display_text`, the `all_*_chars` tables, `flow`, `graph_layout`, `dot_preamble`, `default_*_config`, `uses_actions`, `uses_forced_transitions`, `*_allows_override`, `allow_islands` |
| `data.ts` | `data`, `set_data`, `prop`, `strict_prop`, `props`, `known_prop(s)`, `val`, `set_val`, `vals`, `known_val(s)`, `val_type`, `_data_ref` |
| `transition.ts` | `transition`, `go`, `force_transition`, `action`, `do`, `override`, `transition_impl`, `_fire_hook_rejection`, `_fire_boundary_actions`, the reentrancy guard |
| `hooks.ts` | `set_hook`, `remove_hook`, every `hook_*` / `post_hook_*` / `hook_*_everything` convenience, `hook_registry`, `hooks_on`, `has_hook`, `state_has_hooks`, `_recompute_hook_flags`, `_validate_hook_description`, the `abstract_*_hook_step` helpers and `is_hook_*` predicates |
| `events.ts` | `on`, `once`, `off`, `_fire`, `_fire_one`, `_has_subscribers`, `_subscribe`, `_unsubscribe_entry` |
| `timers.ts` | `set_state_timeout`, `clear_state_timeout`, `state_timeout_for`, `current_state_timeout`, `auto_set_state_timeout` |
| `history.ts` | `history`, `history_inclusive`, `history_length`, `set_history_length` |
| `stochastic.ts` | `probable_exits_for`, `probabilistic_transition`, `probabilistic_walk`, `probabilistic_histo_walk`, `stochastic_runs`, `stochastic_summary`, `_stochastic_one_walk`, `_assert_selectable_exit_pool`, `rng_seed`, `set_rng_seed`, and (from sub-project 4) `start_state_weights`, `sample_start_state` |
| `groups.ts` | `isIn`, `groupsOf`, `groups`, `statesIn`, `_groups_by_depth` |
| `style.ts` | `themes`, `set_themes`, `all_themes`, `*_state_style`, `resolve_state_config`, `style_for`, `_resolved_themes`, `_individual_state_config`, `_compose_state_config` |

`src/ts/jssm.ts` becomes the barrel that re-exports every function plus the non-machine exports it has today (`compile`, `parse`, `make`, constants, util re-exports, `version`, the language service, fence helpers), and is what the package's `.` entry resolves to. `#`-private methods become module-private functions in their family file (they are already `_`/`#` internals; nothing public changes).

### The compat class

`src/ts/compat/machine.ts` defines `class Machine<mDT>` whose constructor calls `create` and whose every member is a one-line delegate: `transition(x) { return transition(this, x); }`. To keep `this` usable as the record without copying, the class holds the record fields directly: `create` is written as `init(record, config)` over an object the class passes as `this` (so `new Machine(cfg)` and `create(cfg)` produce structurally identical records; the class instance simply also has the prototype). Getters/setters delegate to the function pairs. `jssm/compat` (`src/ts/compat/index.ts`) re-exports `Machine`, `sm`/`fsl`/`from` variants that return class instances, `deserialize` returning a class instance, and everything else the 5.x `jssm` entry exported, so `import { Machine, sm } from 'jssm/compat'` is a drop-in for `import { Machine, sm } from 'jssm'` at 5.x.

OPEN: whether `create(cfg)` returns a bare record (no prototype) or, for 6.0, the function entry ALSO returns class instances (cheapest path: the record IS a `Machine` instance and the bare functions read its fields; tree-shaking of methods still works because nothing on the prototype is referenced unless imported). Recommend the second for 6.0: identical objects everywhere, zero duplication risk, `instanceof Machine` keeps working for people who mix the two entries; a 7.0 can drop the prototype.

### Entry points and packaging

`package.json` exports: `.` → the functions barrel; `./compat` → the class entry. Both carry `types`. `sideEffects: false` stays. A bundle-size spec asserts that a rollup build importing only `{ sm, transition, state }` from `.` is smaller than a build importing `Machine` from `./compat` by a stated margin (measured once the split exists; the spec pins "smaller", not a number, to avoid a golden number).

The `jssm.es6.d.ts` root declaration is regenerated as usual; a second `jssm.compat.d.ts` (or a `dist/compat.d.ts` under the subpath) carries the class types.

### Sibling packages and the web components (OPEN)

`jssm-viz`, `jssm-fence`, `jssm-cli`, the web components, the language service, `fsl_walk`, and codegen call methods on a machine they are handed. Options: (a) leave them on the class API via `jssm/compat` in 6.0 and migrate in 6.x minors; (b) migrate them to the functions now. Recommend (a) for 6.0: it is zero-risk for the release and the migration is mechanical and attributable per package later. Under the recommended "record is a Machine instance" answer above, (a) costs nothing at runtime.

### The contract check

The existing spec suite (10k tests) imports `../jssm` and calls methods on the results of `sm`/`from`. After the split, `src/ts/jssm.ts` exports functions AND the machines it returns are class instances (recommended option), so the whole suite passes unchanged as the compat contract. A second, smaller suite `src/ts/tests/bare_functions.spec.ts` exercises every exported function once against the same fixtures the docblock examples use, and a stoch suite drives random walks through `transition(m, x)` and `m.transition(x)` on two machines built from the same source with the same seed, asserting identical state/history/data after each step.

Coverage: the 100% gate applies to the new `src/ts/machine/**` files (they inherit the existing coverage because the compat class calls them for every test path).

### Docs

README source: the default-import examples move to functions (`import { sm, transition, state } from 'jssm'`), with a "Coming from 5.x" box pointing at `jssm/compat`. Every `Machine.` docblock example becomes a function example. `MIGRATING-5-to-6.md` gets the two-line escape hatch and a method-to-function table generated from the export list (not hand-typed).

## Out of scope

Persistent/immutable machines (recorded as the v7 direction); renaming methods (parity only); removing any method.

## Questions for John (OPEN items above)

1. Does `create` return a plain record, or is the record a `Machine` instance in 6.0 (recommended)?
2. Do the sibling packages and web components stay on `jssm/compat` for 6.0 (recommended) or migrate now?
3. Keep `do(m, x)` as the only spelling (recommended), or add an alias?
4. Any family boundary you want drawn differently before the plan is written?
