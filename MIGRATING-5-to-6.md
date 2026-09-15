# Migrating from jssm 5.x to 6.0

jssm 6.0 changes what the default `jssm` import gives you: bare functions
over a machine value, instead of the `Machine` class.  The class did not go
anywhere — it moved to the `jssm/compat` subpath, unchanged.

The manifest of every 5 → 6 break is `v6_breaking_changes.json` at the root
of the repository; this document walks through each one.





## TL;DR: the two-line escape hatch

Change every:

```typescript
import { Machine, sm } from 'jssm';
```

to:

```typescript
import { Machine, sm } from 'jssm/compat';
```

That is the entire required change for the API break.  `jssm/compat` exports
the 5.x `Machine` class verbatim, plus everything the default entry exports,
so a file can mix the two styles while it migrates.  The language-level
breaks further down (bareword names, probabilistic list weights, the web
component prefix) apply to both entries.





## Functions instead of methods

Through the default `jssm` entry, every 5.x method is now a function that
takes the machine as its first argument:

```typescript
import { sm, state, transition, act, hook } from 'jssm';

const light = sm`Red 'next' -> Green 'next' -> Yellow 'next' -> Red;`;

state(light);                  // 'Red'      — was light.state()
transition(light, 'Green');    // true       — was light.transition('Green')
act(light, 'next');            // true       — was light.action('next') / light.do('next')
hook(light, 'Red', 'Green', () => true);     // was light.hook('Red', 'Green', ...)
```

Getters become plain functions and setters become `set_<name>`:

```typescript
import { from, history, history_length, set_history_length, set_rng_seed, set_themes } from 'jssm';

const m = from('a -> b -> c;', { history: 3 });

history(m);                    // was m.history
history_length(m);             // was m.history_length
set_history_length(m, 10);     // was m.history_length = 10
set_rng_seed(m, 42);           // was m.rng_seed = 42
set_themes(m, 'ocean');        // was m.themes = 'ocean'
```

The class constructor's function form is `create(config)`; `sm`, `fsl`,
`from`, and `deserialize` are unchanged and return the same value.

Why: 6.0 delivers the function API and the per-family module split, so a
module that imports only functions and is handed a machine from elsewhere
sheds the `Machine` class entirely.  A bundle that constructs a machine via
`sm` / `from` / `create` still carries the compat class and every family in
6.0, because the value those factories return is a `Machine` instance
(decision 3); the full size win lands when a later major drops the prototype
from the default value.

### What still works on the default entry

In 6.0 the value `sm` / `fsl` / `from` / `create` return **is** a `Machine`
instance.  The functions read its fields and never touch the prototype, and:

- method calls on that value (`light.transition('Green')`) keep working;
- `instanceof Machine` keeps working for code that imports the class from
  `jssm/compat`;
- `import type { Machine, JssmMachine } from 'jssm'` still names the type.

What no longer compiles is importing `Machine` **as a value** from the
default entry — `new Machine(cfg)` or `x instanceof Machine` against
`import { Machine } from 'jssm'` — because the default entry exports it as a
type only.  Use `create(cfg)`, or import the class from `jssm/compat`.

A later major may drop the prototype from the machine value; code that
migrates to the functions now will not notice when it does.

### Method-to-function table

Generated from the `Machine` class source by
`node src/scripts/make_method_function_table.cjs`; every public member of
the 5.x class appears once.

| 5.x method | 6.0 function |
|---|---|
| `m.state(...)` | `state(m, ...)` |
| `m.label_for(...)` | `label_for(m, ...)` |
| `m.display_text(...)` | `display_text(m, ...)` |
| `m.data(...)` | `data(m, ...)` |
| `m.set_data(...)` | `set_data(m, ...)` |
| `m.prop(...)` | `prop(m, ...)` |
| `m.strict_prop(...)` | `strict_prop(m, ...)` |
| `m.props(...)` | `props(m, ...)` |
| `m.known_prop(...)` | `known_prop(m, ...)` |
| `m.known_props(...)` | `known_props(m, ...)` |
| `m.val(...)` | `val(m, ...)` |
| `m.set_val(...)` | `set_val(m, ...)` |
| `m.vals(...)` | `vals(m, ...)` |
| `m.known_val(...)` | `known_val(m, ...)` |
| `m.known_vals(...)` | `known_vals(m, ...)` |
| `m.val_type(...)` | `val_type(m, ...)` |
| `m.is_start_state(...)` | `is_start_state(m, ...)` |
| `m.start_state_weights(...)` | `start_state_weights(m, ...)` |
| `m.sample_start_state(...)` | `sample_start_state(m, ...)` |
| `m.is_end_state(...)` | `is_end_state(m, ...)` |
| `m.failed_outputs(...)` | `failed_outputs(m, ...)` |
| `m.is_failed_output(...)` | `is_failed_output(m, ...)` |
| `m.is_failed(...)` | `is_failed(m, ...)` |
| `m.state_is_final(...)` | `state_is_final(m, ...)` |
| `m.is_final(...)` | `is_final(m, ...)` |
| `m.serialize(...)` | `serialize(m, ...)` |
| `m.canonical(...)` | `canonical(m, ...)` |
| `m.graph_layout(...)` | `graph_layout(m, ...)` |
| `m.dot_preamble(...)` | `dot_preamble(m, ...)` |
| `m.default_transition_config(...)` | `default_transition_config(m, ...)` |
| `m.default_graph_config(...)` | `default_graph_config(m, ...)` |
| `m.machine_author(...)` | `machine_author(m, ...)` |
| `m.machine_comment(...)` | `machine_comment(m, ...)` |
| `m.machine_contributor(...)` | `machine_contributor(m, ...)` |
| `m.machine_definition(...)` | `machine_definition(m, ...)` |
| `m.machine_language(...)` | `machine_language(m, ...)` |
| `m.machine_license(...)` | `machine_license(m, ...)` |
| `m.machine_name(...)` | `machine_name(m, ...)` |
| `m.editor_config(...)` | `editor_config(m, ...)` |
| `m.npm_name(...)` | `npm_name(m, ...)` |
| `m.default_size(...)` | `default_size(m, ...)` |
| `m.machine_version(...)` | `machine_version(m, ...)` |
| `m.raw_state_declarations(...)` | `raw_state_declarations(m, ...)` |
| `m.state_declaration(...)` | `state_declaration(m, ...)` |
| `m.state_declarations(...)` | `state_declarations(m, ...)` |
| `m.fsl_version(...)` | `fsl_version(m, ...)` |
| `m.machine_state(...)` | `machine_state(m, ...)` |
| `m.states(...)` | `states(m, ...)` |
| `m.state_for(...)` | `state_for(m, ...)` |
| `m.has_state(...)` | `has_state(m, ...)` |
| `m.list_edges(...)` | `list_edges(m, ...)` |
| `m.list_named_transitions(...)` | `list_named_transitions(m, ...)` |
| `m.list_actions(...)` | `list_actions(m, ...)` |
| `m.uses_actions` | `uses_actions(m)` |
| `m.uses_forced_transitions` | `uses_forced_transitions(m)` |
| `m.code_allows_override` | `code_allows_override(m)` |
| `m.config_allows_override` | `config_allows_override(m)` |
| `m.allows_override` | `allows_override(m)` |
| `m.allow_islands` | `allow_islands(m)` |
| `m.all_themes(...)` | `all_themes(m, ...)` |
| `m.all_state_name_chars(...)` | `all_state_name_chars(m, ...)` |
| `m.all_state_name_first_chars(...)` | `all_state_name_first_chars(m, ...)` |
| `m.all_action_label_chars(...)` | `all_action_label_chars(m, ...)` |
| `m.themes` | `themes(m)` |
| `m.themes = v` | `set_themes(m, v)` |
| `m.flow(...)` | `flow(m, ...)` |
| `m.get_transition_by_state_names(...)` | `get_transition_by_state_names(m, ...)` |
| `m.lookup_transition_for(...)` | `lookup_transition_for(m, ...)` |
| `m.list_transitions(...)` | `list_transitions(m, ...)` |
| `m.list_entrances(...)` | `list_entrances(m, ...)` |
| `m.list_exits(...)` | `list_exits(m, ...)` |
| `m.probable_exits_for(...)` | `probable_exits_for(m, ...)` |
| `m.probabilistic_transition(...)` | `probabilistic_transition(m, ...)` |
| `m.probabilistic_walk(...)` | `probabilistic_walk(m, ...)` |
| `m.probabilistic_histo_walk(...)` | `probabilistic_histo_walk(m, ...)` |
| `m.stochastic_runs(...)` | `stochastic_runs(m, ...)` |
| `m.stochastic_summary(...)` | `stochastic_summary(m, ...)` |
| `m.actions(...)` | `actions(m, ...)` |
| `m.list_states_having_action(...)` | `list_states_having_action(m, ...)` |
| `m.list_exit_actions(...)` | `list_exit_actions(m, ...)` |
| `m.probable_action_exits(...)` | `probable_action_exits(m, ...)` |
| `m.is_unenterable(...)` | `is_unenterable(m, ...)` |
| `m.has_unenterables(...)` | `has_unenterables(m, ...)` |
| `m.is_terminal(...)` | `is_terminal(m, ...)` |
| `m.state_is_terminal(...)` | `state_is_terminal(m, ...)` |
| `m.has_terminals(...)` | `has_terminals(m, ...)` |
| `m.isIn(...)` | `isIn(m, ...)` |
| `m.groupsOf(...)` | `groupsOf(m, ...)` |
| `m.groups(...)` | `groups(m, ...)` |
| `m.statesIn(...)` | `statesIn(m, ...)` |
| `m.is_complete(...)` | `is_complete(m, ...)` |
| `m.state_is_complete(...)` | `state_is_complete(m, ...)` |
| `m.has_completes(...)` | `has_completes(m, ...)` |
| `m.on(...)` | `on(m, ...)` |
| `m.once(...)` | `once(m, ...)` |
| `m.off(...)` | `off(m, ...)` |
| `m.set_hook(...)` | `set_hook(m, ...)` |
| `m.remove_hook(...)` | `remove_hook(m, ...)` |
| `m.hook(...)` | `hook(m, ...)` |
| `m.hook_action(...)` | `hook_action(m, ...)` |
| `m.hook_global_action(...)` | `hook_global_action(m, ...)` |
| `m.hook_any_action(...)` | `hook_any_action(m, ...)` |
| `m.hook_standard_transition(...)` | `hook_standard_transition(m, ...)` |
| `m.hook_main_transition(...)` | `hook_main_transition(m, ...)` |
| `m.hook_forced_transition(...)` | `hook_forced_transition(m, ...)` |
| `m.hook_any_transition(...)` | `hook_any_transition(m, ...)` |
| `m.hook_entry(...)` | `hook_entry(m, ...)` |
| `m.hook_exit(...)` | `hook_exit(m, ...)` |
| `m.hook_after(...)` | `hook_after(m, ...)` |
| `m.hook_after_any(...)` | `hook_after_any(m, ...)` |
| `m.post_hook(...)` | `post_hook(m, ...)` |
| `m.post_hook_action(...)` | `post_hook_action(m, ...)` |
| `m.post_hook_global_action(...)` | `post_hook_global_action(m, ...)` |
| `m.post_hook_any_action(...)` | `post_hook_any_action(m, ...)` |
| `m.post_hook_standard_transition(...)` | `post_hook_standard_transition(m, ...)` |
| `m.post_hook_main_transition(...)` | `post_hook_main_transition(m, ...)` |
| `m.post_hook_forced_transition(...)` | `post_hook_forced_transition(m, ...)` |
| `m.post_hook_any_transition(...)` | `post_hook_any_transition(m, ...)` |
| `m.post_hook_entry(...)` | `post_hook_entry(m, ...)` |
| `m.post_hook_exit(...)` | `post_hook_exit(m, ...)` |
| `m.hook_pre_everything(...)` | `hook_pre_everything(m, ...)` |
| `m.hook_everything(...)` | `hook_everything(m, ...)` |
| `m.hook_post_everything(...)` | `hook_post_everything(m, ...)` |
| `m.hook_pre_post_everything(...)` | `hook_pre_post_everything(m, ...)` |
| `m.rng_seed` | `rng_seed(m)` |
| `m.rng_seed = v` | `set_rng_seed(m, v)` |
| `m.edges_between(...)` | `edges_between(m, ...)` |
| `m.override(...)` | `override(m, ...)` |
| `m.auto_set_state_timeout(...)` | `auto_set_state_timeout(m, ...)` |
| `m.history` | `history(m)` |
| `m.history_inclusive` | `history_inclusive(m)` |
| `m.history_length` | `history_length(m)` |
| `m.history_length = v` | `set_history_length(m, v)` |
| `m.action(...)` | `action(m, ...)` |
| `m.act(...)` | `act(m, ...)` |
| `m.standard_state_style` | `standard_state_style(m)` |
| `m.hooked_state_style` | `hooked_state_style(m)` |
| `m.start_state_style` | `start_state_style(m)` |
| `m.end_state_style` | `end_state_style(m)` |
| `m.terminal_state_style` | `terminal_state_style(m)` |
| `m.active_state_style` | `active_state_style(m)` |
| `m.hook_registry(...)` | `hook_registry(m, ...)` |
| `m.hooks_on(...)` | `hooks_on(m, ...)` |
| `m.has_hook(...)` | `has_hook(m, ...)` |
| `m.state_has_hooks(...)` | `state_has_hooks(m, ...)` |
| `m.resolve_state_config(...)` | `resolve_state_config(m, ...)` |
| `m.style_for(...)` | `style_for(m, ...)` |
| `m.do(...)` | `act(m, ...)` / `action(m, ...)` (`do` is a reserved word; `Machine.do()` is deprecated, StoneCypher/fsl#1992) |
| `m.transition(...)` | `transition(m, ...)` |
| `m.go(...)` | `go(m, ...)` |
| `m.force_transition(...)` | `force_transition(m, ...)` |
| `m.current_action_for(...)` | `current_action_for(m, ...)` |
| `m.current_action_edge_for(...)` | `current_action_edge_for(m, ...)` |
| `m.valid_action(...)` | `valid_action(m, ...)` |
| `m.valid_transition(...)` | `valid_transition(m, ...)` |
| `m.valid_force_transition(...)` | `valid_force_transition(m, ...)` |
| `m.instance_name(...)` | `instance_name(m, ...)` |
| `m.creation_date` | `creation_date(m)` |
| `m.creation_timestamp` | `creation_timestamp(m)` |
| `m.create_start_time` | `create_start_time(m)` |
| `m.set_state_timeout(...)` | `set_state_timeout(m, ...)` |
| `m.clear_state_timeout(...)` | `clear_state_timeout(m, ...)` |
| `m.state_timeout_for(...)` | `state_timeout_for(m, ...)` |
| `m.current_state_timeout(...)` | `current_state_timeout(m, ...)` |
| `` m.sm`...` `` | the top-level `` sm`...` `` (the machine already carries its options) |
| `` m.fsl`...` `` | the top-level `` fsl`...` `` (the machine already carries its options) |

The `_`-prefixed members of the class (`_fire`, `_data_ref`, `_new_state`,
…) were internal in 5.x and remain so; they have no public function form.





## `do()` → `act()` / `action()`

`do` is a JavaScript reserved word, so `import { do } from 'jssm'` and a bare
`do(m, 'next')` cannot exist.  The function form of the action-firing method
is `act`, and `action` is an alias of the very same function object:

```typescript
import { sm, act, action } from 'jssm';

const light = sm`Red 'next' -> Green 'next' -> Yellow 'next' -> Red;`;

act(light, 'next');       // true
action(light, 'next');    // true — same function as act
```

On the class, `Machine.act()` was added so the same spelling works on both
entries, and `Machine.do()` is **deprecated**: it keeps working in 6.0 as a
delegate to `act`, and its removal is a later breaking change tracked as
[StoneCypher/fsl#1992](https://github.com/StoneCypher/fsl/issues/1992).
`Machine.action()` is unchanged.





## The 6.0 breaks, one by one

Each entry below is one record of `v6_breaking_changes.json`.  Two are
language-level and affect FSL source; one affects the web components; one is
this document's subject; one is packaging.

### Default jssm import is bare functions, not the Machine class

**Status:** landed.

**Breaks:** Through the default `jssm` entry, importing `Machine` as a value
is gone: `import { Machine } from "jssm"` now yields a type only, so
`new Machine(...)` and `instanceof Machine` against that import no longer
compile.  Method calls on the machines `sm` / `fsl` / `from` / `create`
return still work in 6.0, because the value is a `Machine` instance; a later
major may drop the prototype.  `Machine.do()` still works but is deprecated
in favor of `act()` / `action()`, because `do` is a reserved word and has no
function form (removal tracked as StoneCypher/fsl#1992).

**Migration:** Zero-edit escape hatch: change the import specifier to
`jssm/compat` (`import { Machine, sm } from 'jssm/compat'`) and every 5.x
spelling, including `new Machine(...)`, keeps working verbatim.  Or migrate
to the function form: `transition(m, x)` instead of `m.transition(x)`,
`history(m)` for the getter `m.history`, `set_history_length(m, n)` for the
setter, `act(m, 'name')` or `action(m, 'name')` for `m.do('name')` /
`m.action('name')`, and `create(config)` for `new Machine(config)`.  The
table above is the full mapping.

### Bareword names restricted to identifier-like characters

**Status:** landed.  Issue: StoneCypher/jssm#754.

**Breaks:** Any 5.x document whose unquoted state / transition / property /
enum-member name contains a character outside the Unicode identifier
classes, or begins with a digit.  First character must be `\p{L}` (a Unicode
letter), `\p{Nl}` (a letter-number), or `_`; continuation characters may
additionally be `\p{Mn}` / `\p{Mc}` (combining marks), `\p{Nd}` (decimal
digits), or `\p{Pc}` (connector punctuation) — so a digit is valid only
after the first character, never as it.

**Migration:** Quote the affected names (`"in-progress"`, `"node.start"`,
`"1"`) or rename them to identifier form (`in_progress`).

Before — 5.x accepted both of these barewords:

```fsl
1st 'begin' -> in-progress 'finish' -> done;
```

After — quote the two names that are no longer identifiers:

```fsl
"1st" 'begin' -> "in-progress" 'finish' -> done;
```

Or rename them, which keeps every name a bareword:

```fsl
first_pass 'begin' -> in_progress 'finish' -> done;
```

Both rejections name the offending character and spell out the repair:

```
The bareword "1st" starts with a digit, which is not allowed in an unquoted name; quote it ("1st")
The bareword "in-progress" contains "-", which is not allowed in an unquoted name; quote it ("in-progress") or rename it (in_progress)
```

Non-ASCII names are unaffected: `\p{L}` is *every* Unicode letter, so
`état -> 状態;` needs no quotes in 6.0, exactly as in 5.x.  What the rule
excludes is symbols and punctuation, not alphabets.

### A probabilistic transition onto a list shares its weight across the members

**Status:** landed.

**Breaks:** Any 5.x document whose probabilistic transition targets a list
(or a group reference) AND has sibling edges from the same state — the
list's or group's members now draw less often than before.  In 6.0,
`a 50% -> [b c]` compiles to `a -> b 25%` and `a -> c 25%` (5.x: 50% each).

**Migration:** Multiply the outer probability by the member count to keep
5.x odds (`a 50% -> [b c]` becomes `a 100% -> [b c]`), or write inner
weights (`a 50% -> [b 20% c 80%]`).

Before — one 5.x source, read two different ways:

```fsl
a 50% -> [b c];
a 50% -> d;
```

In 5.x that compiled to three edges each weighted 50 (`a->b 50`,
`a->c 50`, `a->d 50`), so `b`, `c` and `d` each drew one time in three.
In 6.0 the very same source compiles to `a->b 25`, `a->c 25`, `a->d 50`:
the list keeps the 50 it was handed and its two members split it, so `d`
now draws half the time instead of a third.

After — multiply the outer probability by the member count to restore the
5.x odds:

```fsl
a 100% -> [b c];
a 50% -> d;
```

compiling to `a->b 50`, `a->c 50`, `a->d 50` — the 5.x numbers exactly.

Or give the members their own weights, a form 6.0 adds and 5.x had no
spelling for:

```fsl
a 50% -> [b 20% c 80%];
a 50% -> d;
```

compiling to `a->b 10`, `a->c 40`, `a->d 50`.

### Web components drop the jssm- prefix entirely

**Status:** landed.

**Breaks:** Any page using a `jssm-*` tag, a `data-jssm-*` attribute, a
`--jssm-viz-*` CSS property, or importing a `Jssm*` class from the
web-component bundles.  Also breaks: the `jssm/wc/instance` and
`jssm/wc/viz` exports `parse_jssm_on_element`, `JSSM_ON_EVENT_NAMES`,
`ParsedJssmOn`, `jssm_handler_registry`, `JssmInstanceHost`, and
`JssmVizErrorDetail`, and the `JssmHookProxy` / `JssmHookUserHandler` /
`JssmHookRegistry` / `JssmHookInstallSpec` backward-compat aliases, are
renamed or removed.

**Migration:** Rename: `<jssm-x>` → `<fsl-x>`; `data-jssm-x` → `data-fsl-x`;
`--jssm-viz-x` → `--fsl-viz-x`; `JssmX` → `FslX`.  Identifier renames:
`parse_jssm_on_element` → `parse_fsl_on_element`; `JSSM_ON_EVENT_NAMES` →
`FSL_ON_EVENT_NAMES`; `ParsedJssmOn` → `ParsedFslOn`;
`jssm_handler_registry` → `fsl_handler_registry`; `JssmInstanceHost` →
`FslInstanceHost` (now one shared export instead of a per-module duplicate);
`JssmVizErrorDetail` → `FslVizErrorDetail`; `JssmHookProxy` →
`FslHookProxy`; `JssmHookUserHandler` → `FslHookUserHandler`;
`JssmHookRegistry` → `FslHookRegistry`; `JssmHookInstallSpec` →
`FslHookInstallSpec`.  Also: a leftover `jssm-*` companion child (e.g. a
stray `<jssm-hook>` or `<jssm-on>`) is no longer stripped from a host's
inline-text FSL source and will corrupt it — remove or rename such children
to `fsl-*`.

Before — 5.x markup, every affected spelling in one page:

```html
<style>
  jssm-viz { --jssm-viz-max-height: 240px; }
</style>

<jssm-instance fsl="Off 'flip' -> On 'flip' -> Off;">
  <input type="button" value="flip" data-jssm-action="flip">
  <jssm-viz></jssm-viz>
</jssm-instance>
```

After — the same page in 6.0, with `jssm-` rewritten to `fsl-` in all four
places (two tags, one data attribute, one CSS custom property):

```html
<style>
  fsl-viz { --fsl-viz-max-height: 240px; }
</style>

<fsl-instance fsl="Off 'flip' -> On 'flip' -> Off;">
  <input type="button" value="flip" data-fsl-action="flip">
  <fsl-viz></fsl-viz>
</fsl-instance>
```

Nothing is aliased any more, and nothing warns.  In 6.0 `<jssm-instance>`
and `<jssm-viz>` are not registered custom elements, so the browser leaves
them as inert unknown elements; `[data-jssm-action]` is not a selector the
host scans; and `--jssm-viz-max-height` is not read by any stylesheet.  A
page left on the 5.x spellings renders and does nothing — so grep for
`jssm-` in your markup and CSS rather than waiting for an error.

### Main jssm package ships ESM only; es5/iife relocate to compatibility packages

**Status:** landed.  The main `jssm` package ships ESM only: its `exports`
are `.` (`dist/jssm.es6.mjs`), `./compat` (`dist/jssm.compat.es6.mjs`), and
the grammar JSON — there is no `main`, no `require` condition, and no
bundled global.  The CommonJS and IIFE builds are published as their own
packages, **`jssm-commonjs`** and **`jssm-iife`**.  The repository does
still *build* `dist/jssm.es5.cjs` and `dist/jssm.es5.iife.js`, because the
benchmark harness (`src/buildjs/benchmark.cjs`,
`src/buildjs/benchmark_scaling.cjs`) and `src/scripts/graviton_envelope.cjs`
load them; neither path is in the package's `files` array, so no consumer
ever receives one.  (Ruled 2026-09-14.)

**Breaks:** Consumers that relied on the main `jssm` package directly
providing a CJS/require entry, an iife global build, or an es5 build.

**Migration:** Install `jssm-commonjs` to `require()`, or `jssm-iife` for a
`<script>` tag or a CDN global.  ESM consumers are unaffected.

Before and after, for `require()` consumers:

```javascript
// 5.x
const { Machine, sm } = require('jssm');

// 6.0 — the 5.x class API
const { Machine, sm } = require('jssm-commonjs/compat');

// 6.0 — the bare-function API
const { sm, state, act } = require('jssm-commonjs');
```

`jssm-commonjs` mirrors the main package's two entries: `.` is the function
API and `./compat` adds the `Machine` class, since a CommonJS package can
carry subpaths.

Before and after, for script-tag consumers:

```html
<!-- 5.x -->
<script src="https://cdn.jsdelivr.net/npm/jssm@5/dist/jssm.es5.iife.js"></script>

<!-- 6.0 -->
<script src="https://cdn.jsdelivr.net/npm/jssm-iife@6/dist/jssm.iife.js"></script>
```

The global is still named `jssm`, and it carries the class entry alongside
the functions — `jssm.Machine` is there — because a global has no subpaths
to split them across.
