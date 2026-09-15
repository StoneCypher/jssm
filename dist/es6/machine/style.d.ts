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
import type { Machine } from './machine.js';
import type { JssmStateConfig, JssmStateDeclaration, JssmStateStyleKeyList, JssmTransitionConfig, JssmGraphConfig, FslTheme, FslDirection } from '../jssm_types.js';
type StateType = string;
/*********
 *
 *  An internal method meant to take a series of declarations and fold them into
 *  a single multi-faceted declaration, in the process of building a state.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 */
export declare function transfer_state_properties(state_decl: JssmStateDeclaration): JssmStateDeclaration;
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
export declare function state_style_condense(jssk: JssmStateStyleKeyList, machine?: any): JssmStateConfig;
/**
 * Get the graph layout direction (e.g. `'LR'`, `'TB'`).  Set via the
 *  FSL `graph_layout` directive.
 *  @param m The machine to read.
 *  @returns The layout string, or the default if not set.
 */
export declare function graph_layout<mDT>(m: Machine<mDT>): string;
/**
 * Get the Graphviz DOT preamble string, injected before the graph body
 *  during visualization.  Set via the FSL `dot_preamble` directive.
 *  @param m The machine to read.
 *  @returns The preamble string.
 */
export declare function dot_preamble<mDT>(m: Machine<mDT>): string;
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
export declare function default_transition_config<mDT>(m: Machine<mDT>): JssmTransitionConfig | undefined;
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
export declare function default_graph_config<mDT>(m: Machine<mDT>): JssmGraphConfig | undefined;
/**
 * List all available theme names.
 *  @param m The machine asked; the table is the library's, the same for every machine.
 *  @returns An array of theme name strings.
 */
export declare function all_themes<mDT>(m: Machine<mDT>): FslTheme[];
/**
 * Get the active theme(s) for this machine.  Always stored as an array
 *  internally; the union return type exists for setter compatibility.
 *  @param m The machine to read.
 *  @returns The current theme or array of themes.
 */
export declare function themes<mDT>(m: Machine<mDT>): FslTheme | FslTheme[];
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
export declare function set_themes<mDT>(m: Machine<mDT>, to: FslTheme | FslTheme[]): void;
/**
 * Get the flow direction for graph layout (e.g. `'right'`, `'down'`).
 *  Set via the FSL `flow` directive.
 *  @param m The machine to read.
 *  @returns The current flow direction.
 */
export declare function flow<mDT>(m: Machine<mDT>): FslDirection;
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
export declare function standard_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
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
export declare function hooked_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
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
export declare function start_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
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
export declare function end_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
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
export declare function terminal_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
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
export declare function active_state_style<mDT>(m: Machine<mDT>): JssmStateConfig;
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
export declare function resolve_state_config<mDT>(m: Machine<mDT>, state: StateType): JssmStateConfig;
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
export declare function style_for<mDT>(m: Machine<mDT>, state: StateType): JssmStateConfig;
export {};
