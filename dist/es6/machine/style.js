/*******
 *
 *  The style family: everything the viz layer reads to draw a machine — the
 *  graph-level settings (`graph_layout`, `dot_preamble`, `flow`,
 *  `default_transition_config`, `default_graph_config`), the theme stack
 *  (`all_themes`, `themes`, `set_themes`), the six per-kind style blocks
 *  (`standard_state_style`, `hooked_state_style`, `start_state_style`,
 *  `end_state_style`, `terminal_state_style`, `active_state_style`), and the
 *  unified config cascade (`resolve_state_config`, `style_for`).  Every
 *  function takes the machine as its first argument and reads its fields
 *  directly; the `Machine` class methods, getters, and the `themes` setter
 *  of the same names are one-line delegates onto these.
 *
 *  The construction-time helpers `transfer_state_properties` and
 *  `state_style_condense` live here too (the constructor imports them) and
 *  are public through the barrel, as they were before the split.  The former
 *  `#resolved_themes`, `#individual_state_config`, `#compose_state_config`
 *  methods and the `apply_state_style_key` / `merge_state_config` helpers
 *  are module-private.
 *
 */
import { JssmError } from '../jssm_error.js';
import { theme_mapping, base_theme } from '../jssm_theme.js';
import { is_start_state, is_end_state, state_is_terminal } from './query.js';
import { state_has_hooks } from './hooks.js';
import { groups_by_depth } from './groups.js';
/*********
 *
 *  An internal method meant to take a series of declarations and fold them into
 *  a single multi-faceted declaration, in the process of building a state.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 */
export function transfer_state_properties(state_decl) {
    state_decl.declarations.map((d) => {
        switch (d.key) {
            case 'shape': {
                state_decl.shape = d.value;
                break;
            }
            case 'color': {
                state_decl.color = d.value;
                break;
            }
            case 'corners': {
                state_decl.corners = d.value;
                break;
            }
            case 'line-style': {
                state_decl.lineStyle = d.value;
                break;
            }
            case 'text-color': {
                state_decl.textColor = d.value;
                break;
            }
            case 'background-color': {
                state_decl.backgroundColor = d.value;
                break;
            }
            case 'state-label': {
                state_decl.stateLabel = d.value;
                break;
            }
            case 'border-color': {
                state_decl.borderColor = d.value;
                break;
            }
            case 'image': {
                state_decl.image = d.value;
                break;
            }
            case 'url': {
                state_decl.url = d.value;
                break;
            }
            case 'state_property': {
                state_decl.property = { name: d.name, value: d.value };
                break;
            }
            default: {
                throw new JssmError(undefined, `Unknown state property: '${JSON.stringify(d)}'`);
            }
        }
    });
    return state_decl;
}
/**
 *
 *  Applies one parsed state-style key/value pair onto a condensing
 *  {@link JssmStateConfig}, remapping the kebab-case FSL key to its camelCase
 *  field and rejecting redefinition.  Exists as the switch body of
 *  {@link state_style_condense}, one call per list element.
 *
 *  Not a doctest: `apply_state_style_key` is module-private and cannot be imported from `'jssm'`.
 *  ```typescript
 *  const cfg = {};
 *  apply_state_style_key(cfg, { key: 'color', value: 'red' });  // cfg.color === 'red'
 *  ```
 *  @throws {JssmError} If the key was already set, or is not a recognized
 *  style name.
 *  @see state_style_condense
 *  @internal
 */
function apply_state_style_key(state_style, key, machine) {
    switch (key.key) {
        case 'shape': {
            if (state_style.shape !== undefined) {
                throw new JssmError(machine, `cannot redefine 'shape' in state_style_condense, already defined`);
            }
            state_style.shape = key.value;
            return;
        }
        case 'color': {
            if (state_style.color !== undefined) {
                throw new JssmError(machine, `cannot redefine 'color' in state_style_condense, already defined`);
            }
            state_style.color = key.value;
            return;
        }
        case 'text-color': {
            if (state_style.textColor !== undefined) {
                throw new JssmError(machine, `cannot redefine 'text-color' in state_style_condense, already defined`);
            }
            state_style.textColor = key.value;
            return;
        }
        case 'corners': {
            if (state_style.corners !== undefined) {
                throw new JssmError(machine, `cannot redefine 'corners' in state_style_condense, already defined`);
            }
            state_style.corners = key.value;
            return;
        }
        case 'line-style': {
            if (state_style.lineStyle !== undefined) {
                throw new JssmError(machine, `cannot redefine 'line-style' in state_style_condense, already defined`);
            }
            state_style.lineStyle = key.value;
            return;
        }
        case 'background-color': {
            if (state_style.backgroundColor !== undefined) {
                throw new JssmError(machine, `cannot redefine 'background-color' in state_style_condense, already defined`);
            }
            state_style.backgroundColor = key.value;
            return;
        }
        case 'state-label': {
            if (state_style.stateLabel !== undefined) {
                throw new JssmError(machine, `cannot redefine 'state-label' in state_style_condense, already defined`);
            }
            state_style.stateLabel = key.value;
            return;
        }
        case 'border-color': {
            if (state_style.borderColor !== undefined) {
                throw new JssmError(machine, `cannot redefine 'border-color' in state_style_condense, already defined`);
            }
            state_style.borderColor = key.value;
            return;
        }
        case 'url': {
            if (state_style.url !== undefined) {
                throw new JssmError(machine, `cannot redefine 'url' in state_style_condense, already defined`);
            }
            state_style.url = key.value;
            return;
        }
        default: {
            // TODO do that <never> trick to assert this list is complete
            throw new JssmError(machine, `unknown state style key in condense: ${key.key}`);
        }
    }
}
/**
 *
 *  Collapse a list of individual state-style key/value pairs into a single
 *  {@link JssmStateConfig} object, remapping FSL-style kebab-case keys to the
 *  camelCase field names the runtime uses.
 *
 *  The parser emits state styling as a flat array like
 *  `[{ key: 'color', value: 'red' }, { key: 'line-style', value: 'dashed' }]`
 *  because that is the most natural shape for the grammar to produce.  This
 *  helper runs once per style bucket during `Machine` construction to turn
 *  those arrays into the compact `{ color, lineStyle, ... }` objects the
 *  graph-rendering code expects.
 *
 *  @example
 *  import { state_style_condense } from 'jssm';
 *
 *  const condensed = state_style_condense([
 *    { key: 'color',      value: 'red' },
 *    { key: 'shape',      value: 'oval' },
 *    { key: 'line-style', value: 'dashed' }
 *  ]);
 *  condensed;                         // => { color: 'red', shape: 'oval', lineStyle: 'dashed' }
 *
 *  state_style_condense(undefined);   // => {}
 *
 *  @param jssk The list of style keys to condense.  `undefined` is accepted
 *  and yields an empty config.
 *  @param machine Optional `Machine` reference, used only so that any
 *  {@link JssmError} thrown can point at the offending machine in its
 *  diagnostic message.
 *  @returns A `JssmStateConfig` object containing every key from `jssk`
 *  remapped into its camelCase field.
 *  @throws {JssmError} If `jssk` is neither an array nor `undefined`, if any
 *  element is not an object, if the same key appears more than once, or if a
 *  key is not one of the recognized style names.
 *  @internal
 */
export function state_style_condense(jssk, machine) {
    const state_style = {};
    if (Array.isArray(jssk)) {
        for (const [i, key] of jssk.entries()) {
            if (typeof key !== 'object') {
                throw new JssmError(machine, `invalid state item ${i} in state_style_condense list: ${JSON.stringify(key)}`);
            }
            apply_state_style_key(state_style, key, machine);
        }
    }
    else if (jssk === undefined) {
        // do nothing, undefined is legal and means we should return the empty container above
    }
    else {
        throw new JssmError(machine, 'state_style_condense received a non-array');
    }
    return state_style;
}
/*********
 *
 *  Shallow-merges one {@link JssmStateConfig} style tier over another, with
 *  later-wins, undefined-skipping semantics — the across-tier folding primitive
 *  for the unified config cascade in {@link resolve_state_config}.
 *
 *  Every defined key in `over` replaces the corresponding key in the result;
 *  keys whose `over` value is `undefined` leave the `base` value untouched.
 *  Unlike {@link state_style_condense} — which throws when a key is redefined
 *  *within a single declaration block* — this NEVER throws on a key collision,
 *  because the cascade deliberately layers more-specific tiers (group, per-state,
 *  active) over less-specific ones (theme, kind defaults) and the later tier is
 *  meant to win.  Neither input is mutated; a fresh object is returned.
 *
 *  Not a doctest: `merge_state_config` is module-private and cannot be imported from `'jssm'`.
 *  ```typescript
 *  merge_state_config({ color: 'red', shape: 'box' }, { color: 'blue' });
 *  // => { color: 'blue', shape: 'box' }
 *
 *  merge_state_config({ color: 'red' }, { color: undefined, shape: 'oval' });
 *  // => { color: 'red', shape: 'oval' }  (undefined `over` keys are ignored)
 *  ```
 *
 *  @param base The lower-precedence style tier (the accumulator so far).
 *  @param over The higher-precedence style tier; its defined keys win.
 *
 *  @returns A new {@link JssmStateConfig} with `over`'s defined keys layered
 *  over `base`.
 *
 *  @internal
 *
 */
function merge_state_config(base, over) {
    const merged = Object.assign({}, base);
    for (const [key, value] of Object.entries(over)) {
        if (value !== undefined) {
            merged[key] = value;
        }
    }
    return merged;
}
/**
 * Get the graph layout direction (e.g. `'LR'`, `'TB'`).  Set via the
 *  FSL `graph_layout` directive.
 *  @param m The machine to read.
 *  @returns The layout string, or the default if not set.
 */
export function graph_layout(m) {
    return m._graph_layout;
}
/**
 * Get the Graphviz DOT preamble string, injected before the graph body
 *  during visualization.  Set via the FSL `dot_preamble` directive.
 *  @param m The machine to read.
 *  @returns The preamble string.
 */
export function dot_preamble(m) {
    return m._dot_preamble;
}
/**
 * Get the consolidated `transition: {}` default-config block: the ordered,
 *  de-duplicated `{ key, value }[]` list of edge-default style items compiled
 *  from a `transition: {}` block (e.g. `transition: { color: blue; }`).  The
 *  viz layer projects this onto a Graphviz `edge [ … ]` default statement so
 *  every edge inherits it.
 *
 *  @example
 *  import { sm, default_transition_config } from 'jssm';
 *  default_transition_config(sm`a -> b; transition: { color: blue; };`);   // => [ { key: 'color', value: '#0000ffff' } ]
 *
 *  @param m The machine to read.
 *  @returns The transition-config item list, or `undefined` if the machine
 *  declared no `transition: {}` block.
 *  @see default_graph_config
 */
export function default_transition_config(m) {
    return m._default_transition_config;
}
/**
 * Get the consolidated `graph: {}` default-config block: the ordered,
 *  de-duplicated `{ key, value }[]` list of graph-scope style items.  The
 *  compiler folds the deprecated top-level graph keywords
 *  (`graph_bg_color` → `background-color`, plus `graph_layout`, `theme`,
 *  `flow`, `dot_preamble`) into this list first, then lets an explicit
 *  `graph: {}` block win on key conflict.  The viz layer projects the
 *  graph-meaningful keys onto graph-scope Graphviz attributes (e.g.
 *  `background-color` → `bgcolor`).
 *
 *  @example
 *  import { sm, default_graph_config } from 'jssm';
 *  default_graph_config(sm`a -> b; graph: { background-color: #ffffff; };`);   // => [ { key: 'background-color', value: '#ffffffff' } ]
 *
 *  @param m The machine to read.
 *  @returns The graph-config item list, or `undefined` if the machine has no
 *  graph config (no `graph: {}` block and no deprecated graph keyword).
 *  @see default_transition_config
 */
export function default_graph_config(m) {
    return m._default_graph_config;
}
/**
 * List all available theme names.
 *  @param m The machine asked; the table is the library's, the same for every machine.
 *  @returns An array of theme name strings.
 */
export function all_themes(m) {
    return [...theme_mapping.keys()]; // constructor sets this to "default" otherwise
}
/**
 * Get the active theme(s) for this machine.  Always stored as an array
 *  internally; the union return type exists for setter compatibility.
 *  @param m The machine to read.
 *  @returns The current theme or array of themes.
 */
export function themes(m) {
    return m._themes; // constructor sets this to "default" otherwise
}
/**
 * Set the active theme(s).  Accepts a single theme name or an array.
 *  Also drops every memoized static state config, so styles resolved
 *  before the change re-resolve under the new theme stack.
 *
 *  @example
 *  import { sm, style_for, set_themes, themes } from 'jssm';
 *
 *  const m = sm`a -> b -> c;`;
 *  // b is a plain state; resolved (and memoized) under the default theme:
 *  style_for(m, 'b').backgroundColor;   // => 'white'
 *  set_themes(m, 'ocean');
 *  themes(m);                           // => ['ocean']
 *  // ocean's plain-state color, not the stale default:
 *  style_for(m, 'b').backgroundColor;   // => 'cadetblue1'
 *
 *  @param m The machine to re-theme.
 *  @param to - A theme name or array of theme names to apply.
 *  @see resolve_state_config
 */
export function set_themes(m, to) {
    m._themes = typeof to === 'string' ? [to] : to;
    // Themes feed tier 1 (and the per-kind/hooked theme layers) of
    // resolve_state_config's cascade, whose static resolution is memoized
    // per state.  Invalidate the memo so a theme assigned after a style has
    // been computed is not shadowed by the old theme's cached resolution —
    // the same rule set_hook / remove_hook apply for the hooked layer.
    m._static_state_config_cache.clear();
}
/**
 * Get the flow direction for graph layout (e.g. `'right'`, `'down'`).
 *  Set via the FSL `flow` directive.
 *  @param m The machine to read.
 *  @returns The current flow direction.
 */
export function flow(m) {
    return m._flow;
}
/********
 *
 *  Get the standard style for a single state.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  @example
 *  import { sm, standard_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  standard_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; state: { shape: circle; };`;
 *  standard_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for standard states.
 *
 */
export function standard_state_style(m) {
    return m._state_style;
}
/********
 *
 *  Get the hooked state style.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  The hooked style is only applied to nodes which have a named hook in the
 *  graph.  Open hooks set through the external API aren't graphed, because
 *  that would be literally every node.
 *
 *  @example
 *  import { sm, hooked_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  hooked_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; hooked_state: { shape: circle; };`;
 *  hooked_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for hooked states.
 *
 */
export function hooked_state_style(m) {
    return m._hooked_state_style;
}
/********
 *
 *  Get the start state style.  ***Does not*** include composition from an
 *  applied theme, or things from the underlying base stylesheet; only the
 *  modifications applied by this machine.
 *
 *  Start states are defined by the directive `start_states`, or in absentia,
 *  are the first mentioned state.
 *
 *  @example
 *  import { sm, start_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  start_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; start_state: { shape: circle; };`;
 *  start_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for start states.
 *
 */
export function start_state_style(m) {
    return m._start_state_style;
}
/********
 *
 *  Get the end state style.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  End states are defined in the directive `end_states`, and are distinct
 *  from terminal states.  End states are voluntary successful endpoints for a
 *  process.  Terminal states are states that cannot be exited.  By example,
 *  most error states are terminal states, but not end states.  Also, since
 *  some end states can be exited and are determined by hooks, such as
 *  recursive or iterative nodes, there is such a thing as an end state that
 *  is not a terminal state.
 *
 *  @example
 *  import { sm, end_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  end_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; end_state: { shape: circle; };`;
 *  end_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for end states.
 *
 */
export function end_state_style(m) {
    return m._end_state_style;
}
/********
 *
 *  Get the terminal state style.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  Terminal state styles are automatically determined by the machine.  Any
 *  state without a valid exit transition is terminal.
 *
 *  @example
 *  import { sm, terminal_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  terminal_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; terminal_state: { shape: circle; };`;
 *  terminal_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for terminal states.
 *
 */
export function terminal_state_style(m) {
    return m._terminal_state_style;
}
/********
 *
 *  Get the style for the active state.  ***Does not*** include
 *  composition from an applied theme, or things from the underlying base
 *  stylesheet; only the modifications applied by this machine.
 *
 *  @example
 *  import { sm, active_state_style } from 'jssm';
 *
 *  const plain = sm`a -> b;`;
 *  active_state_style(plain);    // => {}
 *
 *  const styled = sm`a -> b; active_state: { shape: circle; };`;
 *  active_state_style(styled);   // => { shape: 'circle' }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The {@link JssmStateConfig} for the active state.
 *
 */
export function active_state_style(m) {
    return m._active_state_style;
}
/********
 *
 *  Returns the list of resolved theme implementations for this machine, in
 *  the order they should layer (outer/base-most first).  Each declared theme
 *  name is mapped through {@link theme_mapping}; unknown names are skipped.
 *
 *  The list is reversed relative to declaration order to match the historical
 *  layering of {@link style_for}: a later-declared theme layers under an
 *  earlier-declared one.
 *
 *  @param m The machine whose theme names are resolved.
 *
 *  @returns The resolved {@link JssmBaseTheme} stack, base-most first.
 *
 *  @internal
 *
 */
function resolved_themes(m) {
    const themes = [];
    for (const th of m._themes) {
        const theme_impl = theme_mapping.get(th);
        if (theme_impl !== undefined) {
            themes.push(theme_impl);
        }
    }
    return themes.reverse();
}
/********
 *
 *  Reads the condensed per-state style fields (`color`, `shape`, …) out of a
 *  state's declaration into a fresh {@link JssmStateConfig} — the tier-5
 *  "`state foo : { … }`" contribution of the config cascade.  A state with no
 *  declaration yields an all-`undefined` config (which contributes nothing
 *  once folded with `merge_state_config`).
 *
 *  @param m The machine whose state declarations are read.
 *
 *  @param state The state whose per-state declared style is wanted.
 *
 *  @returns The per-state style config (fields may be `undefined`).
 *
 *  @internal
 *
 */
function individual_state_config(m, state) {
    const decl = m._state_declarations.get(state);
    return {
        color: decl === null || decl === void 0 ? void 0 : decl.color,
        textColor: decl === null || decl === void 0 ? void 0 : decl.textColor,
        borderColor: decl === null || decl === void 0 ? void 0 : decl.borderColor,
        backgroundColor: decl === null || decl === void 0 ? void 0 : decl.backgroundColor,
        lineStyle: decl === null || decl === void 0 ? void 0 : decl.lineStyle,
        corners: decl === null || decl === void 0 ? void 0 : decl.corners,
        shape: decl === null || decl === void 0 ? void 0 : decl.shape,
        image: decl === null || decl === void 0 ? void 0 : decl.image,
        url: decl === null || decl === void 0 ? void 0 : decl.url
    };
}
/********
 *
 *  Folds the static tiers 1–5 of the unified config cascade for a state, plus
 *  — when `active` is set — the active-state THEME layers, which historically
 *  sit just below the per-state config so that a `state foo : { … }` block
 *  still overrides a theme's `active` styling.  The user `active_state : { … }`
 *  overlay (tier 6) is NOT applied here; it is layered on top by
 *  {@link resolve_state_config} so it wins over per-state config.
 *
 *  Tiers, folded least-specific → most-specific with `merge_state_config`
 *  (later wins, never throwing on a cross-tier key collision):
 *
 *    1. theme defaults — `base_theme.state`, then each selected theme's
 *       `.state` block.
 *    2. `default_state_config` (the implicit `state : { … }` root over every
 *       state).
 *    3. static per-kind defaults selected by structural kind — terminal,
 *       then start, then end — each contributing its `base_theme.<kind>`,
 *       selected themes' `.<kind>`, and the machine's `default_<kind>_state_config`.
 *       When `active`, the active-state theme layers (`base_theme.active` and
 *       each selected theme's `.active`) are folded here too.
 *    4. group metadata, depth-ordered outer→inner (see {@link groups_by_depth}),
 *       each group's RAW `{ declarations }` already condensed at construction.
 *    5. the per-state `state foo : { … }` config.
 *
 *  @param m      The machine whose cascade inputs are read.
 *  @param state  The state to resolve config for.
 *  @param active Whether to include the active-state theme layers (true only
 *                for the machine's currently-occupied state).
 *
 *  @returns The composited tiers-1–5 {@link JssmStateConfig} for the state.
 *
 *  @internal
 *
 */
function compose_state_config(m, state, active) {
    const themes = resolved_themes(m);
    let acc = {};
    // tier 1 — theme defaults (base, then selected themes)
    acc = merge_state_config(acc, base_theme.state);
    for (const theme of themes) {
        if (theme.state) {
            acc = merge_state_config(acc, theme.state);
        }
    }
    // tier 2 — default_state_config (implicit root over all states)
    acc = merge_state_config(acc, m._state_style);
    // tier 2.5 — hooked-state styling, applied when the state carries any
    // observational or boundary hook.  Sits above the root default and below
    // the per-kind/group/per-state tiers, preserving the historical layer
    // order the pre-cascade `style_for` used.  See {@link state_has_hooks}.
    if (state_has_hooks(m, state)) {
        acc = merge_state_config(acc, base_theme.hooked);
        for (const theme of themes) {
            if (theme.hooked) {
                acc = merge_state_config(acc, theme.hooked);
            }
        }
        acc = merge_state_config(acc, m._hooked_state_style);
    }
    // tier 3 — static per-kind defaults, selected by structural kind
    if (state_is_terminal(m, state)) {
        acc = merge_state_config(acc, base_theme.terminal);
        for (const theme of themes) {
            if (theme.terminal) {
                acc = merge_state_config(acc, theme.terminal);
            }
        }
        acc = merge_state_config(acc, m._terminal_state_style);
    }
    if (is_start_state(m, state)) {
        acc = merge_state_config(acc, base_theme.start);
        for (const theme of themes) {
            if (theme.start) {
                acc = merge_state_config(acc, theme.start);
            }
        }
        acc = merge_state_config(acc, m._start_state_style);
    }
    if (is_end_state(m, state)) {
        acc = merge_state_config(acc, base_theme.end);
        for (const theme of themes) {
            if (theme.end) {
                acc = merge_state_config(acc, theme.end);
            }
        }
        acc = merge_state_config(acc, m._end_state_style);
    }
    // tier 3 (active kind) — active-state THEME layers, below per-state so a
    // per-state block still wins (preserving the historical layer order).
    if (active) {
        acc = merge_state_config(acc, base_theme.active);
        for (const theme of themes) {
            if (theme.active) {
                acc = merge_state_config(acc, theme.active);
            }
        }
    }
    // tier 4 — group metadata, outer→inner (inner / nearest group wins)
    for (const group_name of groups_by_depth(m, state)) {
        const group_cfg = m._group_metadata.get(group_name);
        if (group_cfg !== undefined) {
            acc = merge_state_config(acc, group_cfg);
        }
    }
    // tier 5 — per-state `state foo : { … }`
    acc = merge_state_config(acc, individual_state_config(m, state));
    return acc;
}
/********
 *
 *  Resolves the full unified style/config cascade for a state — the runtime
 *  successor to the ad-hoc layer merge {@link style_for} used to perform.
 *
 *  For any state OTHER than the current one, this returns the memoized static
 *  resolution (tiers 1–5; see `compose_state_config`) — theme →
 *  `default_state_config` → per-kind defaults → depth-ordered group metadata →
 *  per-state config.  The cache is keyed by state; those tiers do not depend
 *  on which state is current, so it survives transitions, but the mutable
 *  cascade inputs each clear it when they change — hook registration and
 *  removal ({@link set_hook}, {@link remove_hook}; the hooked layer) and
 *  theme assignment ({@link set_themes}; tier 1 and the per-kind theme
 *  layers).
 *
 *  For the machine's CURRENTLY-occupied state the result is recomputed each
 *  call (never cached) and additionally carries the dynamic `active_state`
 *  layers: the active-state THEME layers fold in just below the per-state
 *  config (tier 3-active), and the user `active_state : { … }` overlay folds
 *  in LAST (tier 6), on top of everything, so it wins over per-state config.
 *  Every fold uses `merge_state_config`, so a key set at a lower tier is
 *  overridden — never rejected — by a higher one.
 *
 *  @example
 *  import { sm, resolve_state_config } from 'jssm';
 *
 *  const m = sm`&busy : [working]; idle 'go' -> working; state &busy : { color: orange; };`;
 *  // from group &busy:
 *  resolve_state_config(m, 'working').color;  // => '#ffa500ff'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose cascade is resolved.
 *
 *  @param state The state to compute the composite config for.
 *
 *  @returns The fully composited {@link JssmStateConfig} for the state,
 *  including the active overlay when the state is current.
 *
 *  @see style_for
 *
 */
export function resolve_state_config(m, state) {
    // The current state carries the dynamic active layers and is recomputed
    // each call so the overlay tracks transitions; it is never memoized.
    // (`m._state` is the body of the query family's `state(m)`, read inline
    // because the parameter keeps its 5.x name and would shadow the function.)
    if (m._state === state) {
        const acc = compose_state_config(m, state, true);
        // tier 6 — user active_state overlay, on top of per-state config.
        return merge_state_config(acc, m._active_state_style);
    }
    // Non-current states: tiers 1–5 only, memoized.
    const cached = m._static_state_config_cache.get(state);
    if (cached !== undefined) {
        return cached;
    }
    const resolved = compose_state_config(m, state, false);
    m._static_state_config_cache.set(state, resolved);
    return resolved;
}
/********
 *
 *  Gets the composite style for a specific node — the public viz entry point,
 *  now a thin wrapper over the unified config cascade in
 *  {@link resolve_state_config}.
 *
 *  The order of composition runs least-specific to most-specific: theme
 *  defaults, then the `default_state_config` root, then per-kind defaults
 *  (terminal, start, end), then depth-ordered group metadata (inner groups
 *  winning over outer), then the per-state config, and finally — for the
 *  current state only — the active overlay.  Last wins at every tier.
 *
 *  @example
 *  import { sm, style_for, resolve_state_config } from 'jssm';
 *
 *  const m = sm`a -> b; state b : { shape: circle; };`;
 *  style_for(m, 'b').shape;   // => 'circle'
 *  style_for(m, 'b');         // => resolve_state_config(m, 'b')
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose cascade is resolved.
 *
 *  @param state The state to compute the composite style for.
 *
 *  @returns The fully composited {@link JssmStateConfig} for the given state.
 *
 *  @see resolve_state_config
 *
 */
export function style_for(m, state) {
    return resolve_state_config(m, state);
}
