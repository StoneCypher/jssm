
// whargarbl lots of these return arrays could/should be sets

type StateType = string;

import { reduce as reduce_to_639 } from 'reduce-to-639-1';
import { circular_buffer }         from 'circular_buffer_js';





import {

  JssmGenericState, JssmGenericConfig, JssmStateConfig,
  JssmTransition, JssmTransitions, JssmTransitionList, // JssmTransitionRule,
  JssmMachineInternalState,
  JssmAllowsOverride,
  JssmAllowIslands,
  JssmDefaultSize,
  JssmParseTree,
  JssmStateDeclaration, JssmStateDeclarationRule,
  JssmStateStyleKey, JssmStateStyleKeyList,
  JssmTransitionConfig, JssmGraphConfig,
  JssmCompileSe, JssmCompileSeStart, JssmCompileRule,
  JssmLayout, JssmHistory,
  JssmArrowKind,
  JssmSerialization,
  JssmPropertyDefinition,
  FslDirection, FslDirections, FslTheme,
  HookDescription, HookHandler, HookContext, HookResult, HookComplexResult, EverythingHookContext, EverythingHookHandler, PostEverythingHookHandler,
  JssmEventName, JssmEventDetailMap, JssmEventFilter, JssmEventHandler, JssmUnsubscribe,
  JssmBaseTheme,
  JssmGroupRegistry, JssmGroupHooks, JssmStateHooks,
  JssmRng

} from './jssm_types';





import { arrow_direction, arrow_left_kind, arrow_right_kind } from './jssm_arrow';
import { compile, make, makeTransition, wrap_parse,
         transitive_members, membership_distance }            from './jssm_compiler';
import { theme_mapping, base_theme }                          from './jssm_theme';





import {
  seq,
  unique, find_repeated,
  weighted_rand_select, weighted_sample_select,
  histograph, weighted_histo_key,
  array_box_if_string,
  name_bind_prop_and_state,
  gen_splitmix32,
  sleep
} from './jssm_util';

import { Interner, pair_key } from './jssm_intern';





import * as constants from './jssm_constants';
const { shapes, gviz_shapes, named_colors,
        state_name_chars, state_name_first_chars, action_label_chars } = constants;





import { parse }               from './fsl_parser';
import { version, build_time } from './version';    // replaced from package.js in build
import { JssmError }           from './jssm_error';





/**
 *  Internal record holding a single registered event subscription: the
 *  handler, its optional filter, and a flag for `once` semantics.  Not
 *  exported.
 *
 *  @internal
 */
type JssmEventEntry<mDT, Ev extends JssmEventName> = {
  handler : JssmEventHandler<mDT, Ev>,
  filter? : JssmEventFilter<mDT, Ev>,
  once    : boolean
};



/*********
 *
 *  An internal method meant to take a series of declarations and fold them into
 *  a single multi-faceted declaration, in the process of building a state.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 */

function transfer_state_properties(state_decl: JssmStateDeclaration): JssmStateDeclaration {

  state_decl.declarations.map( (d: JssmStateDeclarationRule) => {

    switch (d.key) {

      case 'shape'            : state_decl.shape           = d.value; break;
      case 'color'            : state_decl.color           = d.value; break;
      case 'corners'          : state_decl.corners         = d.value; break;
      case 'line-style'       : state_decl.lineStyle       = d.value; break;

      case 'text-color'       : state_decl.textColor       = d.value; break;
      case 'background-color' : state_decl.backgroundColor = d.value; break;
      case 'state-label'      : state_decl.stateLabel      = d.value; break;
      case 'border-color'     : state_decl.borderColor     = d.value; break;

      case 'image'            : state_decl.image           = d.value; break;
      case 'url'              : state_decl.url             = d.value; break;

      case 'state_property'   : state_decl.property        = { name: d.name, value: d.value }; break;

      default: throw new JssmError(undefined, `Unknown state property: '${JSON.stringify(d)}'`);

    }

  } );

  return state_decl;

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
 *  ```typescript
 *  state_style_condense([
 *    { key: 'color',      value: 'red' },
 *    { key: 'shape',      value: 'oval' },
 *    { key: 'line-style', value: 'dashed' }
 *  ]);
 *  // => { color: 'red', shape: 'oval', lineStyle: 'dashed' }
 *
 *  state_style_condense(undefined);
 *  // => {}
 *  ```
 *
 *  @param jssk The list of style keys to condense.  `undefined` is accepted
 *  and yields an empty config.
 *
 *  @param machine Optional `Machine` reference, used only so that any
 *  {@link JssmError} thrown can point at the offending machine in its
 *  diagnostic message.
 *
 *  @returns A `JssmStateConfig` object containing every key from `jssk`
 *  remapped into its camelCase field.
 *
 *  @throws {JssmError} If `jssk` is neither an array nor `undefined`, if any
 *  element is not an object, if the same key appears more than once, or if a
 *  key is not one of the recognized style names.
 *
 *  @internal
 *
 */

function state_style_condense(jssk: JssmStateStyleKeyList, machine?: any): JssmStateConfig {

  const state_style: JssmStateConfig = {};

  if (Array.isArray(jssk)) {

    jssk.forEach( (key, i) => {

      if (typeof key !== 'object') {
        throw new JssmError(machine, `invalid state item ${i} in state_style_condense list: ${JSON.stringify(key)}`);
      }

      switch (key.key) {

        case 'shape':
          if (state_style.shape !== undefined) {
            throw new JssmError(machine, `cannot redefine 'shape' in state_style_condense, already defined`);
          }
          state_style.shape = key.value;
          break;

        case 'color':
          if (state_style.color !== undefined) {
            throw new JssmError(machine, `cannot redefine 'color' in state_style_condense, already defined`);
          }
          state_style.color = key.value;
          break;

        case 'text-color':
          if (state_style.textColor !== undefined) {
            throw new JssmError(machine, `cannot redefine 'text-color' in state_style_condense, already defined`);
          }
          state_style.textColor = key.value;
          break;

        case 'corners':
          if (state_style.corners !== undefined) {
            throw new JssmError(machine, `cannot redefine 'corners' in state_style_condense, already defined`);
          }
          state_style.corners = key.value;
          break;

        case 'line-style':
          if (state_style.lineStyle !== undefined) {
            throw new JssmError(machine, `cannot redefine 'line-style' in state_style_condense, already defined`);
          }
          state_style.lineStyle = key.value;
          break;

        case 'background-color':
          if (state_style.backgroundColor !== undefined) {
            throw new JssmError(machine, `cannot redefine 'background-color' in state_style_condense, already defined`);
          }
          state_style.backgroundColor = key.value;
          break;

        case 'state-label':
          if (state_style.stateLabel !== undefined) {
            throw new JssmError(machine, `cannot redefine 'state-label' in state_style_condense, already defined`);
          }
          state_style.stateLabel = key.value;
          break;

        case 'border-color':
          if (state_style.borderColor !== undefined) {
            throw new JssmError(machine, `cannot redefine 'border-color' in state_style_condense, already defined`);
          }
          state_style.borderColor = key.value;
          break;

        case 'url':
          if (state_style.url !== undefined) {
            throw new JssmError(machine, `cannot redefine 'url' in state_style_condense, already defined`);
          }
          state_style.url = (key as any).value;
          break;

        default:
          // TODO do that <never> trick to assert this list is complete
          throw new JssmError(machine, `unknown state style key in condense: ${(key as any).key}`);

      }

    });

  } else if (jssk === undefined) {
    // do nothing, undefined is legal and means we should return the empty container above
  } else {
    throw new JssmError(machine, 'state_style_condense received a non-array');
  }

  return state_style;

}





/*********
 *
 *  Shallow-merges one {@link JssmStateConfig} style tier over another, with
 *  later-wins, undefined-skipping semantics — the across-tier folding primitive
 *  for the unified config cascade in {@link Machine.resolve_state_config}.
 *
 *  Every defined key in `over` replaces the corresponding key in the result;
 *  keys whose `over` value is `undefined` leave the `base` value untouched.
 *  Unlike {@link state_style_condense} — which throws when a key is redefined
 *  *within a single declaration block* — this NEVER throws on a key collision,
 *  because the cascade deliberately layers more-specific tiers (group, per-state,
 *  active) over less-specific ones (theme, kind defaults) and the later tier is
 *  meant to win.  Neither input is mutated; a fresh object is returned.
 *
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

function merge_state_config(base: JssmStateConfig, over: JssmStateConfig): JssmStateConfig {

  const merged: JssmStateConfig = { ...base };

  Object.keys(over).forEach(key => {
    if (over[key] !== undefined) {
      merged[key] = over[key];
    }
  });

  return merged;

}





/*******
 *
 *  Core finite state machine class.  Holds the full graph of states and
 *  transitions, the current state, hooks, data, properties, and all runtime
 *  behavior.  Typically created via the {@link sm} tagged template literal
 *  rather than constructed directly.
 *
 *  ```typescript
 *  import { sm } from 'jssm';
 *
 *  const light = sm`Red 'next' => Green 'next' => Yellow 'next' => Red;`;
 *  light.state();       // 'Red'
 *  light.action('next'); // true
 *  light.state();       // 'Green'
 *  ```
 *
 *  @typeparam mDT The machine data type — the type of the value stored in
 *  `.data()`.  Defaults to `undefined` when no data is used.
 *
 */



/*********
 *
 *  Partition a state graph into its connected components using an undirected
 *  BFS over state names.  Each edge (from, to) is treated as bidirectional so
 *  that island membership is topology-based rather than flow-based.
 *
 *  Used at construction time to enforce the `allow_islands` constraint.
 *
 *  @param states  The machine's state map (keys are state names).
 *  @param edges   The machine's edge list; only `from` and `to` are used.
 *  @returns       An array of components, each component an array of state names.
 *
 */

function find_connected_components<mDT>(
  states : Map<StateType, JssmGenericState>,
  edges  : Array<JssmTransition<StateType, mDT>>
): Array<Array<StateType>> {

  // Build undirected adjacency list
  const adj: Map<StateType, Set<StateType>> = new Map();
  for (const name of states.keys()) {
    adj.set(name, new Set());
  }
  for (const edge of edges) {
    adj.get(edge.from)!.add(edge.to);
    adj.get(edge.to)!.add(edge.from);
  }

  const visited : Set<StateType>             = new Set();
  const result  : Array<Array<StateType>>    = [];

  for (const start of states.keys()) {
    if (visited.has(start)) { continue; }

    // BFS to collect this component
    const component : Array<StateType> = [];
    const queue     : Array<StateType> = [start];
    visited.add(start);

    while (queue.length > 0) {
      const node      = queue.shift()!;
      component.push(node);
      for (const neighbor of adj.get(node)!) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    result.push(component);
  }

  return result;

}



class Machine<mDT> {


  _state                  : StateType;
  _states                 : Map<StateType, JssmGenericState>;
  _edges                  : Array< JssmTransition<StateType, mDT> >;
  _edge_map               : Map<StateType, Map<StateType, number>>;
  _outbound_edge_ids      : Map<StateType, Array<number>>;   // from -> [edgeIds]; lets edges_between filter only that state's exits instead of the whole _edges array
  _named_transitions      : Map<StateType, number>;
  _actions                : Map<StateType, Map<StateType, number>>;
  _reverse_actions        : Map<StateType, Map<StateType, number>>;
  _reverse_action_targets : Map<StateType, Map<StateType, number>>;

  // Interned-id machinery (lever 1 of the interning perf trail).  Additive
  // numeric mirrors of the hot-path string maps; every string map above stays
  // authoritative for its other readers.  See
  // notes/superpowers/plans/2026-06-12-integer-state-interning.md
  _state_interner         : Interner;
  _action_interner        : Interner;
  // The interned id of the current state.  NaN — never undefined — when the
  // current state is unknown to the interner (only reachable by deserializing
  // a foreign state name); NaN pair_keys can never match a stored key, so
  // every dispatch lookup misses, which is exactly the string-map behavior.
  _state_id               : number;
  _edge_id_by_pair        : Map<number, number>;  // pair_key(from_id, to_id)     -> edge id
  _edge_id_by_action_pair : Map<number, number>;  // pair_key(action_id, from_id) -> edge id
  _edge_to_ids            : Array<number>;        // edge id -> interned id of edge.to

  _start_states           : Set<StateType>;
  _end_states             : Set<StateType>;
  _failed_outputs         : Set<StateType>;

  _machine_author?        : Array<string>;
  _machine_comment?       : string;
  _machine_contributor?   : Array<string>;
  _machine_definition?    : string;
  _machine_language?      : string;
  _machine_license?       : string;
  _machine_name?          : string;
  _machine_version?       : string;
  _npm_name?              : string;
  _default_size?          : JssmDefaultSize;
  _fsl_version?           : string;
  _raw_state_declaration? : Array<Object>;
  _state_declarations     : Map<StateType, JssmStateDeclaration>;

  _data? : mDT;

  _instance_name : string;

  _rng_seed : number;
  _rng      : JssmRng;

  _graph_layout              : JssmLayout;
  _dot_preamble              : string;
  _default_transition_config : JssmTransitionConfig | undefined;
  _default_graph_config      : JssmGraphConfig      | undefined;
  _arrange_declaration       : Array<Array<StateType>>;
  _arrange_start_declaration : Array<Array<StateType>>;
  _arrange_end_declaration   : Array<Array<StateType>>;

  _themes : FslTheme[];
  _flow   : FslDirection;

  _has_hooks                : boolean;
  _has_basic_hooks          : boolean;
  _has_named_hooks          : boolean;
  _has_entry_hooks          : boolean;
  _has_exit_hooks           : boolean;
  _has_after_hooks          : boolean;
  _has_global_action_hooks  : boolean;
  _has_transition_hooks     : boolean;
  // no boolean for the single hooks, just check if they're defined

  _has_forced_transitions   : boolean;

  // Numeric interned hook stores (interning lever 2, #729; supersedes the
  // #642 nested-string-map strategy).  Keys are pair_key(from_id, to_id) for
  // the pair maps, an interned action id for the global-action map, and a
  // state id for entry/exit.  _after_hooks stays string-keyed on purpose: it
  // is probed only from the cold state-timeout path (after-hooks are the
  // `after`-timer's companion and never fire on dispatch; fsl#1327), keyed by
  // the timed state's name, so there is no benchmark pressure to intern it.
  _hooks                    : Map<number, HookHandler<mDT>>;
  _named_hooks              : Map<number, Map<number, HookHandler<mDT>>>;
  _entry_hooks              : Map<number, HookHandler<mDT>>;
  _exit_hooks               : Map<number, HookHandler<mDT>>;
  _after_hooks              : Map<string, HookHandler<mDT>>;
  _global_action_hooks      : Map<number, HookHandler<mDT>>;
  _any_action_hook          : HookHandler<mDT> | undefined;
  _standard_transition_hook : HookHandler<mDT> | undefined;
  _main_transition_hook     : HookHandler<mDT> | undefined;
  _forced_transition_hook   : HookHandler<mDT> | undefined;
  _any_transition_hook      : HookHandler<mDT> | undefined;


  _has_post_hooks                : boolean;
  _has_post_basic_hooks          : boolean;
  _has_post_named_hooks          : boolean;
  _has_post_entry_hooks          : boolean;
  _has_post_exit_hooks           : boolean;
  _has_post_global_action_hooks  : boolean;
  _has_post_transition_hooks     : boolean;
  // no boolean for the single hooks, just check if they're defined

  _code_allows_override   : JssmAllowsOverride;
  _config_allows_override : JssmAllowsOverride;
  _allow_islands          : JssmAllowIslands;

  // Same numeric keying as `_hooks` / `_named_hooks`; see comment above.  #729
  _post_hooks                    : Map<number, HookHandler<mDT>>;
  _post_named_hooks              : Map<number, Map<number, HookHandler<mDT>>>;
  _post_entry_hooks              : Map<number, HookHandler<mDT>>;
  _post_exit_hooks               : Map<number, HookHandler<mDT>>;
  _post_global_action_hooks      : Map<number, HookHandler<mDT>>;
  _post_any_action_hook          : HookHandler<mDT> | undefined;
  _post_standard_transition_hook : HookHandler<mDT> | undefined;
  _post_main_transition_hook     : HookHandler<mDT> | undefined;
  _post_forced_transition_hook   : HookHandler<mDT> | undefined;
  _post_any_transition_hook      : HookHandler<mDT> | undefined;

  _pre_everything_hook           : EverythingHookHandler<mDT> | undefined;
  _everything_hook               : EverythingHookHandler<mDT> | undefined;
  _pre_post_everything_hook      : PostEverythingHookHandler<mDT> | undefined;
  _post_everything_hook          : PostEverythingHookHandler<mDT> | undefined;

  _property_keys       : Set<string>;
  _default_properties  : Map<string, any>;
  _state_properties    : Map<string, any>;
  _required_properties : Set<string>;

  // property name -> first state that bound it, in first-binding order;
  // recorded at insertion so post-build validation needn't JSON.parse the
  // serialized _state_properties keys back apart (#734)
  _state_property_first_state : Map<string, StateType>;

  _history        : JssmHistory<mDT>;
  _history_length : number;

  _state_style          : JssmStateConfig;
  _active_state_style   : JssmStateConfig;
  _hooked_state_style   : JssmStateConfig;
  _terminal_state_style : JssmStateConfig;
  _start_state_style    : JssmStateConfig;
  _end_state_style      : JssmStateConfig;

  // Overlapping-state-group runtime tables, carried from the compile pass.
  // `_group_registry` is the ordered direct-membership table (states + nested/
  // spread sub-group refs); `_group_metadata` holds each group's RAW style
  // `{ declarations }` block, condensed lazily in the config cascade;
  // `_group_hooks`/`_state_hooks` store boundary-hook payloads for the parked
  // hook-firing task (3b) — stored here, never fired in this tier.
  _group_registry  : JssmGroupRegistry;
  _group_metadata  : Map<string, JssmStateConfig>;
  _group_hooks     : JssmGroupHooks;
  _state_hooks     : JssmStateHooks;

  // Deep/transitive inverse membership index: each state maps to every group
  // that transitively contains it (direct, nested, or spread).  Built once at
  // construction so `groupsOf`/`isIn` are O(1)-ish lookups.
  _state_to_groups : Map<StateType, Set<string>>;

  // Declared group names in declaration order (the registry's key order).
  _group_order     : string[];

  // Memoized tiers 1–5 (static) of the config cascade, keyed by state.  The
  // dynamic `active_state` overlay (tier 6) is recomputed per call against the
  // current state, so this stays valid as the machine transitions.
  _static_state_config_cache : Map<StateType, JssmStateConfig>;

  _state_labels : Map<string, string>;

  _time_source    : () => number;
  _create_started : number;
  _created        : number;

  _after_mapping : Map<string, [string, number]>;

  _timeout_source       : ( Function, number ) => number;
  _clear_timeout_source : ( h ) => void;
  _timeout_handle       : number | undefined;
  _timeout_target       : string | undefined;
  _timeout_target_time  : number | undefined;

  // Typed event registry: a small in-house `Map<EventName, Set<EventEntry>>`
  // chosen over Node's `EventEmitter` so the bundle stays browser-clean and
  // the per-event detail typing is preserved.  See #638.
  _event_handlers : Map<JssmEventName, Set<JssmEventEntry<any, any>>>;
  // Live count of registered event subscriptions across all event names.
  // Maintained by _subscribe (single add site) and _unsubscribe_entry (the
  // sole removal helper) so transition_impl can skip building observation-
  // event detail objects when nothing is listening.  See #670.
  _event_listener_count : number;
  _firing_error   : boolean;  // re-entry guard for the `error` event

  // Re-entrancy depth of FSL boundary-hook action firing.  A boundary action
  // (`on enter &g do 'X'`) can drive a further transition, which crosses more
  // boundaries, which fires more actions — an unbounded run-to-completion
  // cascade.  `_boundary_depth` counts how many boundary-firing frames are on
  // the stack; `_fire_boundary_actions` throws a JssmError once it exceeds
  // `_boundary_depth_limit` rather than recursing into a stack overflow.  See
  // the overlapping-state-group feature (boundary-hook firing).
  //
  // `_boundary_depth_limit` is configurable via the `boundary_depth_limit`
  // constructor option (default 100) so that legitimate deep pipelines can
  // raise the cap without touching the source, and tests can lower it to
  // make runaway-detection tests cheap.
  _boundary_depth       : number;
  _boundary_depth_limit : number;


  // whargarbl this badly needs to be broken up, monolith master
  constructor({

    start_states,
    end_states                = [],
    failed_outputs            = [],
    initial_state,
    start_states_no_enforce,
    complete                  = [],
    transitions,
    machine_author,
    machine_comment,
    machine_contributor,
    machine_definition,
    machine_language,
    machine_license,
    machine_name,
    machine_version,
    npm_name,
    default_size,
    state_declaration,
    property_definition,
    state_property,
    fsl_version,
    dot_preamble              = undefined,
    arrange_declaration       = [],
    arrange_start_declaration = [],
    arrange_end_declaration   = [],
    theme                     = ['default'],
    flow                      = 'down',
    graph_layout              = 'dot',
    instance_name,
    history,
    boundary_depth_limit,
    data,
    default_state_config,
    default_active_state_config,
    default_hooked_state_config,
    default_terminal_state_config,
    default_start_state_config,
    default_end_state_config,
    default_transition_config,
    default_graph_config,
    group_registry,
    group_metadata,
    group_hooks,
    state_hooks,
    allows_override,
    config_allows_override,
    allow_islands,
    rng_seed,
    time_source,
    timeout_source,
    clear_timeout_source

  }: JssmGenericConfig<StateType, mDT>) {

    this._time_source                   = () => new Date().getTime();

    this._create_started                = this._time_source();

    this._instance_name = instance_name;

    this._states                 = new Map();
    this._state_declarations     = new Map();
    this._edges                  = [];
    this._edge_map               = new Map();
    this._outbound_edge_ids      = new Map();
    this._named_transitions      = new Map();
    this._actions                = new Map();
    this._reverse_actions        = new Map();
    this._reverse_action_targets = new Map();   // todo

    this._state_interner         = new Interner();
    this._action_interner        = new Interner();
    this._state_id               = NaN;
    this._edge_id_by_pair        = new Map();
    this._edge_id_by_action_pair = new Map();
    this._edge_to_ids            = [];

    this._start_states   = new Set(start_states);
    this._end_states     = new Set(end_states);   // todo consider what to do about incorporating complete too
    this._failed_outputs = new Set(failed_outputs);

    this._machine_author        = array_box_if_string(machine_author);
    this._machine_comment       = machine_comment;
    this._machine_contributor   = array_box_if_string(machine_contributor);
    this._machine_definition    = machine_definition;
    this._machine_language      = machine_language;
    this._machine_license       = machine_license;
    this._machine_name          = machine_name;
    this._machine_version       = machine_version;
    this._npm_name              = npm_name;
    this._default_size          = default_size;
    this._raw_state_declaration = state_declaration || [];
    this._fsl_version           = fsl_version;

    this._arrange_declaration       = arrange_declaration;
    this._arrange_start_declaration = arrange_start_declaration;
    this._arrange_end_declaration   = arrange_end_declaration;

    this._dot_preamble = dot_preamble;
    this._themes       = theme;
    this._flow         = flow;
    this._graph_layout = graph_layout;

    this._has_hooks               = false;
    this._has_basic_hooks         = false;
    this._has_named_hooks         = false;
    this._has_entry_hooks         = false;
    this._has_exit_hooks          = false;
    this._has_after_hooks         = false;
    this._has_global_action_hooks = false;
    this._has_transition_hooks    = false;
    // no need for a boolean for single hooks, just test for undefinedness

    this._has_forced_transitions   = false;

    this._hooks                    = new Map();
    this._named_hooks              = new Map();
    this._entry_hooks              = new Map();
    this._exit_hooks               = new Map();
    this._after_hooks              = new Map();
    this._global_action_hooks      = new Map();
    this._any_action_hook          = undefined;
    this._standard_transition_hook = undefined;
    this._main_transition_hook     = undefined;
    this._forced_transition_hook   = undefined;
    this._any_transition_hook      = undefined;

    this._has_post_hooks               = false;
    this._has_post_basic_hooks         = false;
    this._has_post_named_hooks         = false;
    this._has_post_entry_hooks         = false;
    this._has_post_exit_hooks          = false;
    this._has_post_global_action_hooks = false;
    this._has_post_transition_hooks    = false;
    // no need for a boolean for single hooks, just test for undefinedness

    this._code_allows_override   = allows_override;
    this._config_allows_override = config_allows_override;
    this._allow_islands          = allow_islands ?? true;

    if ( (allows_override === false) && (config_allows_override === true) ) {
      throw new JssmError(undefined, "Code specifies no override, but config tries to permit; config may not be less strict than code");
    }

    this._post_hooks                    = new Map();
    this._post_named_hooks              = new Map();
    this._post_entry_hooks              = new Map();
    this._post_exit_hooks               = new Map();
    this._post_global_action_hooks      = new Map();
    this._post_any_action_hook          = undefined;
    this._post_standard_transition_hook = undefined;
    this._post_main_transition_hook     = undefined;
    this._post_forced_transition_hook   = undefined;
    this._post_any_transition_hook      = undefined;

    this._pre_everything_hook           = undefined;
    this._everything_hook               = undefined;
    this._pre_post_everything_hook      = undefined;
    this._post_everything_hook          = undefined;

    this._data                          = data;

    this._property_keys                 = new Set();
    this._default_properties            = new Map();
    this._state_properties              = new Map();
    this._required_properties           = new Set();
    this._state_property_first_state    = new Map();

    this._state_style                   = state_style_condense(default_state_config, this);
    this._active_state_style            = state_style_condense(default_active_state_config, this);
    this._hooked_state_style            = state_style_condense(default_hooked_state_config, this);
    this._terminal_state_style          = state_style_condense(default_terminal_state_config, this);
    this._start_state_style             = state_style_condense(default_start_state_config, this);
    this._end_state_style               = state_style_condense(default_end_state_config, this);

    // Consolidated `transition: {}` and `graph: {}` default-config blocks,
    // stored verbatim so the viz layer can project them onto Graphviz `edge [ … ]`
    // defaults and graph-scope attributes respectively.  Both are kept as the
    // compiler's de-duplicated `{ key, value }[]` lists (last-wins already
    // applied, so iterating in order yields the winning value per key).
    this._default_transition_config     = default_transition_config;
    this._default_graph_config          = default_graph_config;

    // Overlapping-state-group tables.  The registry/hooks are stored as-is; the
    // raw per-group `{ declarations }` blocks are condensed once into style
    // configs here (a single declaration block, so the intra-block redefine
    // guard in `state_style_condense` still applies), while depth-ordered
    // merging across groups happens later in `resolve_state_config`.
    this._group_registry = group_registry ?? new Map();
    this._group_hooks    = group_hooks    ?? new Map();
    this._state_hooks    = state_hooks    ?? new Map();

    this._group_metadata = new Map();
    (group_metadata ?? new Map()).forEach(
      (raw: JssmStateConfig, group_name: string) =>
        // `raw.declarations` is the parser's raw style-item list — structurally
        // a JssmStateStyleKeyList, but typed as JssmStateDeclarationRule[] on
        // JssmStateConfig — so it condenses through the same path as the
        // `default_*_state_config` blocks (intra-block redefine still throws).
        this._group_metadata.set(
          group_name,
          state_style_condense(raw.declarations as unknown as JssmStateStyleKeyList, this)
        )
    );

    this._group_order = [ ...this._group_registry.keys() ];

    // Deep/transitive inverse index: for each declared group, flatten its
    // transitive member states (reusing the compiler's `transitive_members`)
    // and record that group against every one of them.  A `memo` shared across
    // groups memoizes overlapping sub-group resolution.
    this._state_to_groups = new Map();
    {
      const memo: Map<string, string[]> = new Map();
      this._group_order.forEach((group_name: string) => {
        transitive_members(this._group_registry, group_name, memo).forEach((member: string) => {
          let bucket: Set<string> | undefined = this._state_to_groups.get(member);
          if (bucket === undefined) {
            bucket = new Set();
            this._state_to_groups.set(member, bucket);
          }
          bucket.add(group_name);
        });
      });
    }

    this._static_state_config_cache = new Map();

    this._history_length                = history || 0;
    this._history                       = new circular_buffer(this._history_length);

    this._state_labels                  = new Map();

    this._rng_seed                      = rng_seed ?? new Date().getTime();
    this._rng                           = gen_splitmix32(this._rng_seed);

    this._timeout_source                = timeout_source ?? ( (f: Function, a: number) => setTimeout(f, a) );
    this._clear_timeout_source          = clear_timeout_source ?? ( (h: number) => clearTimeout(h) );
    this._timeout_handle                = undefined;
    this._timeout_target                = undefined;
    this._timeout_target_time           = undefined;

    this._after_mapping                 = new Map();

    this._event_handlers                = new Map();
    this._event_listener_count          = 0;
    this._firing_error                  = false;

    // Boundary-hook action cascade guard.  Limit defaults to 100 but is
    // configurable via the `boundary_depth_limit` constructor option so tests
    // can tighten the cap and deep pipelines can raise it.
    this._boundary_depth                = 0;
    this._boundary_depth_limit          = boundary_depth_limit ?? 100;


    // consolidate the state declarations
    if (state_declaration) {
      state_declaration.map((state_decl: JssmStateDeclaration) => {

        if (this._state_declarations.has(state_decl.state)) { // no repeats
          throw new JssmError(this, `Added the same state declaration twice: ${JSON.stringify(state_decl.state)}`);
        }

        this._state_declarations.set(state_decl.state, transfer_state_properties(state_decl));

      });
    }


    // walk the decls for labels; aggregate them when found
    [... this._state_declarations].map(sd => {

      const [key, decl] = sd,
            labelled    = decl.declarations.filter(d => d.key === 'state-label');

      if (labelled.length > 1) {
        throw new JssmError(this, `state ${key} may only have one state-label; has ${labelled.length}`);
      }

      if (labelled.length === 1) {
        this._state_labels.set(key, labelled[0].value);
      }

    });



    // O(1) duplicate-edge guard for the construction loop below: from -> Set<to>.
    // Keyed by source state; mirrors each state's `to` array with constant-time
    // membership so the dedup check is O(1) per edge rather than an O(out-degree)
    // array scan (which made construction O(V*E) on dense graphs).  #673
    const seen_edges: Map<StateType, Set<StateType>> = new Map();

    // walk the transitions.  single-lookup cursor fetches: each endpoint was
    // previously a get followed by a has on the same key (four hashes per
    // edge); the undefined check on the get's result carries the same
    // information.  #706
    for (const tr of transitions) {

      if ( tr.from === undefined ) { throw new JssmError(this, `transition must define 'from': ${JSON.stringify(tr)}`); }
      if ( tr.to   === undefined ) { throw new JssmError(this, `transition must define 'to': ${JSON.stringify(tr)}`); }

      // get the cursors.  what a mess
      let cursor_from: JssmGenericState | undefined = this._states.get(tr.from);
      if (cursor_from === undefined) {
        cursor_from = { name: tr.from, from: [], to: [], complete: complete.includes(tr.from) };
        this._new_state(cursor_from);
      }

      let cursor_to: JssmGenericState | undefined = this._states.get(tr.to);
      if (cursor_to === undefined) {
        cursor_to = { name: tr.to, from: [], to: [], complete: complete.includes(tr.to) };
        this._new_state(cursor_to);
      }

      // guard against existing connections being re-added — O(1) via the
      // from -> Set<to> index instead of an O(out-degree) `cursor_from.to`
      // array scan.  Behaviour is identical: the same duplicate (from, to)
      // pair throws the same JssmError.  #673
      let seen_to: Set<StateType> | undefined = seen_edges.get(tr.from);
      if (seen_to === undefined) {
        seen_to = new Set();
        seen_edges.set(tr.from, seen_to);
      }
      if (seen_to.has(tr.to)) {
        throw new JssmError(this, `already has ${JSON.stringify(tr.from)} to ${JSON.stringify(tr.to)}`);
      } else {
        seen_to.add(tr.to);
        cursor_from.to.push(tr.to);
        cursor_to.from.push(tr.from);
      }

      // add the edge; note its id
      this._edges.push(tr);
      const thisEdgeId: number = this._edges.length - 1;
      if (tr.forced_only) { this._has_forced_transitions = true; }

      // guard against repeating a transition name
      if (tr.name) {
        if (this._named_transitions.has(tr.name)) {
          throw new JssmError(this, `named transition "${JSON.stringify(tr.name)}" already created`);
        } else {
          this._named_transitions.set(tr.name, thisEdgeId);
        }
      }

      // set up the after mapping, if any
      if (tr.after_time) {
        this._after_mapping.set(tr.from, [tr.to, tr.after_time])
      }

      // set up the mapping, so that edges can be looked up by endpoint pairs
      let from_mapping: Map<StateType, number> | undefined = this._edge_map.get(tr.from);
      if (from_mapping === undefined) {
        from_mapping = new Map();
        this._edge_map.set(tr.from, from_mapping);
      }

      //    const to_mapping = from_mapping.get(tr.to);
      from_mapping.set(tr.to, thisEdgeId); // already checked that this mapping doesn't exist, above

      // numeric mirror of the (from, to) endpoint mapping.  intern() rather
      // than id_of(): idempotent, and returns number (not number|undefined)
      // since both endpoints were just created above if missing.
      const from_id = this._state_interner.intern(tr.from);
      const to_id   = this._state_interner.intern(tr.to);
      this._edge_id_by_pair.set(pair_key(from_id, to_id), thisEdgeId);
      this._edge_to_ids[thisEdgeId] = to_id;

      // outbound adjacency: every edge originating at tr.from, regardless of action/target.
      // _edge_map above keys a single edge per (from, to) and overwrites on collision, which
      // is fine for lookup_transition_for but loses information for edges_between when several
      // edges share endpoints across distinct actions.  This index preserves every edge id and
      // lets edges_between scan only one state's exits, not all of _edges.
      let outbound: Array<number> = this._outbound_edge_ids.get(tr.from);
      if (!outbound) {
        outbound = [];
        this._outbound_edge_ids.set(tr.from, outbound);
      }
      outbound.push(thisEdgeId);

      // set up the action mapping, so that actions can be looked up by origin
      if (tr.action) {


        // forward mapping first by action name
        let actionMap: Map<StateType, number> = this._actions.get(tr.action);
        if (!(actionMap)) {
          actionMap = new Map();
          this._actions.set(tr.action, actionMap);
        }

        if (actionMap.has(tr.from)) {
          throw new JssmError(this, `action ${JSON.stringify(tr.action)} already attached to origin ${JSON.stringify(tr.from)}`);
        } else {
          actionMap.set(tr.from, thisEdgeId);
        }


        // reverse mapping first by state origin name
        let rActionMap: Map<StateType, number> = this._reverse_actions.get(tr.from);
        if (!(rActionMap)) {
          rActionMap = new Map();
          this._reverse_actions.set(tr.from, rActionMap);
        }

        // no need to test for reverse mapping pre-presence;
        // forward mapping already covers collisions
        rActionMap.set(tr.action, thisEdgeId);

        // numeric mirror of the (action, from) dispatch mapping
        const action_id = this._action_interner.intern(tr.action);
        this._edge_id_by_action_pair.set(pair_key(action_id, from_id), thisEdgeId);


        // reverse mapping first by state target name
        if (!(this._reverse_action_targets.has(tr.to))) {
          this._reverse_action_targets.set(tr.to, new Map());
        }

        /* todo comeback
           fundamental problem is roActionMap needs to be a multimap
                const roActionMap = this._reverse_action_targets.get(tr.to);  // wasteful - already did has - refactor
                if (roActionMap) {
                  if (roActionMap.has(tr.action)) {
                    throw new JssmError(this, `ro-action ${tr.to} already attached to action ${tr.action}`);
                  } else {
                    roActionMap.set(tr.action, thisEdgeId);
                  }
                } else {
                  throw new JssmError(this, `should be impossible - flow doesn\'t know .set precedes .get yet again.  severe error?');
                }
        */
      }

    }


    if (Array.isArray(property_definition)) {

      property_definition.forEach(pr => {

        this._property_keys.add(pr.name);

        if (pr.hasOwnProperty('default_value')) {
          this._default_properties.set(pr.name, pr.default_value);
        }

        if (pr.hasOwnProperty('required') && (pr.required === true)) {
          this._required_properties.add(pr.name);
        }

      });

    }


    if (Array.isArray(state_property)) {

      state_property.forEach(sp => {

        this._state_properties.set(sp.name, sp.default_value);

        // Record the unserialized (property, state) pair for post-build
        // validation.  The compiler writes both fields; a hand-built config
        // that carries only the serialized name pays one JSON.parse here,
        // which is what every binding used to pay at validation time (#734).
        let j_property = sp.property,
            j_state    = sp.state;

        if ((j_property === undefined) || (j_state === undefined)) {
          const inside = JSON.parse(sp.name);
          j_property   = inside[0];
          j_state      = inside[1];
        }

        if (!(this._state_property_first_state.has(j_property))) {
          this._state_property_first_state.set(j_property, j_state);
        }

      });

    }


    // set initial state either from the specified or the start state list.  validate admission behavior.
    if (initial_state) {

      if (! (this._states.has(initial_state)) ) {
        throw new JssmError(this, `requested start state ${initial_state} does not exist`);
      }

      if ( (! (start_states_no_enforce) ) && (! (start_states.includes(initial_state) )) ) {
        throw new JssmError(this, `requested start state ${initial_state} is not in start state list; add {start_states_no_enforce:true} to constructor options if desired`);
      }

      this._state    = initial_state;
      this._state_id = this._state_interner.intern(this._state);

    } else {
      this._state    = start_states[0];
      this._state_id = this._state_interner.intern(this._state);
    }


    // done building, do checks

    // assert all props are valid
    // provenance pairs were recorded at insertion — first state per property,
    // in first-binding order — replacing the old JSON.parse of every
    // serialized key; the error fires for the same binding it always did,
    // because the first property in first-binding order whose name is
    // undeclared owns the earliest undeclared binding.
    this._state_property_first_state.forEach( (j_state, j_property) => {
      if (!(this.known_prop(j_property))) {
        throw new JssmError(this, `State "${j_state}" has property "${j_property}" which is not globally declared`);
      }
    });

    // assert all required properties are serviced
    // states() allocates a fresh array per call, so take it once rather than
    // once per required property
    const all_states_for_props = this.states();
    this._required_properties.forEach( dp_key => {
      if (this._default_properties.has(dp_key)) {
        throw new JssmError(this, `The property "${dp_key}" is required, but also has a default; these conflict`);
      }
      all_states_for_props.forEach(s => {
        const bound_name = name_bind_prop_and_state(dp_key, s);
        if (!(this._state_properties.has(bound_name))) {
          throw new JssmError(this, `State "${s}" is missing required property "${dp_key}"`);
        }
      });
    });

    // assert chosen starting state is valid
    if (!(this.has_state( this.state() ))) {
      throw new JssmError(this, `Current start state "${this.state()}" does not exist`);
    }

    // assert all starting states are valid
    start_states.forEach( (ss, ssi) => {
      if (!(this.has_state(ss))) {
        throw new JssmError(this, `Start state ${ssi} "${ss}" does not exist`);
      }
    });

    // assert chosen starting state is valid
    if (!( start_states.length === this._start_states.size )) {
      throw new JssmError(this, `Start states cannot be repeated`);
    }

    // assert connectivity constraints imposed by allow_islands
    if (this._allow_islands !== true) {
      const components = find_connected_components(this._states, this._edges);
      if (this._allow_islands === false) {
        if (components.length > 1) {
          throw new JssmError(this, `allow_islands is false but the state graph has ${components.length} disconnected components`);
        }
      } else {
        // 'with_start': every component must contain at least one start state
        for (const component of components) {
          const has_start = component.some(s => this._start_states.has(s));
          if (!has_start) {
            throw new JssmError(this, `allow_islands is 'with_start' but a connected component has no start state: [${[...component].join(', ')}]`);
          }
        }
      }
    }


    this._created = this._time_source();
    this.auto_set_state_timeout();

    this._arrange_declaration.forEach( (arrange_pair: string[]) =>
      arrange_pair.forEach( (possibleState: string) => {
        if (!(this._states.has(possibleState))) {
          throw new JssmError(this, `Cannot arrange state that does not exist "${possibleState}"`);
        }
      })
    );

  }





  /********
   *
   *  Internal method for fabricating states.  Not meant for external use.
   *
   *  @internal
   *
   */

  _new_state(state_config: JssmGenericState): StateType {

    if (this._states.has(state_config.name)) {
      throw new JssmError(this, `state ${JSON.stringify(state_config.name)} already exists`);
    }

    this._states.set(state_config.name, state_config);
    this._state_interner.intern(state_config.name);
    return state_config.name;

  }





  /*********
   *
   *  Get the current state of a machine.
   *
   *  ```typescript
   *  import * as jssm from 'jssm';
   *
   *  const lswitch = jssm.from('on <=> off;');
   *  console.log( lswitch.state() );             // 'on'
   *
   *  lswitch.transition('off');
   *  console.log( lswitch.state() );             // 'off'
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns The current state name.
   *
   */

  state(): StateType {
    return this._state;
  }





  /*********
   *
   *  Get the label for a given state, if any; return `undefined` otherwise.
   *
   *  ```typescript
   *  import * as jssm from 'jssm';
   *
   *  const lswitch = jssm.from('a -> b; state a: { label: "Foo!"; };');
   *  console.log( lswitch.label_for('a') );              // 'Foo!'
   *  console.log( lswitch.label_for('b') );              // undefined
   *  ```
   *
   *  See also {@link display_text}.
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param state The state to get the label for.
   *
   *  @returns The label string, or `undefined` if no label is set.
   *
   */

  label_for(state: StateType): string {
    return this._state_labels.get(state);
  }





  /*********
   *
   *  Get whatever the node should show as text.
   *
   *  Currently, this means to get the label for a given state, if any;
   *  otherwise to return the node's name.  However, this definition is expected
   *  to grow with time, and it is currently considered ill-advised to manually
   *  parse this text.
   *
   *  See also {@link label_for}.
   *
   *  ```typescript
   *  import * as jssm from 'jssm';
   *
   *  const lswitch = jssm.from('a -> b; state a: { label: "Foo!"; };');
   *  console.log( lswitch.display_text('a') );              // 'Foo!'
   *  console.log( lswitch.display_text('b') );              // 'b'
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param state The state to get display text for.
   *
   *  @returns The label if one exists, otherwise the state's name.
   *
   */

  display_text(state: StateType): string {
    return this._state_labels.get(state) ?? state;
  }





  /*********
   *
   *  Get the current data of a machine.
   *
   *  ```typescript
   *  import * as jssm from 'jssm';
   *
   *  const lswitch = jssm.from('on <=> off;', {data: 1});
   *  console.log( lswitch.data() );              // 1
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns A deep clone of the machine's current data value.
   *
   */

  data(): mDT {
    return structuredClone( this._data );
  }





  /*********
   *
   *  Get the current value of a given property name.  Checks the current
   *  state's properties first, then falls back to the global default.
   *  Returns `undefined` if neither exists.  For a throwing variant, see
   *  {@link strict_prop}.
   *
   *  ```typescript
   *  const m = sm`property color default "grey"; a -> b;
   *               state b: { property color "blue"; };`;
   *
   *  m.prop('color');  // 'grey'  (default, because state is 'a')
   *  m.go('b');
   *  m.prop('color');  // 'blue'  (state 'b' overrides the default)
   *  m.prop('size');   // undefined (no such property)
   *  ```
   *
   *  @param name The relevant property name to look up.
   *
   *  @returns The value behind the prop name, or `undefined` if not defined.
   *
   */

  prop(name: string): any {

    const bound_name = name_bind_prop_and_state(name, this.state());

    if (this._state_properties.has(bound_name)) {
      return this._state_properties.get(bound_name);

    } else if (this._default_properties.has(name)) {
      return this._default_properties.get(name);

    } else {
      return undefined;
    }

  }





  /*********
   *
   *  Get the current value of a given property name.  If missing on the state
   *  and without a global default, throws a {@link JssmError}, unlike
   *  {@link prop}, which would return `undefined` instead.
   *
   *  ```typescript
   *  const m = sm`property color default "grey"; a -> b;`;
   *
   *  m.strict_prop('color');  // 'grey'
   *  m.strict_prop('size');   // throws JssmError
   *  ```
   *
   *  @param name The relevant property name to look up.
   *
   *  @returns The value behind the prop name.
   *
   *  @throws {JssmError} If the property is not defined on the current state
   *  and has no default.
   *
   */

  strict_prop(name: string): any {

    const bound_name = name_bind_prop_and_state(name, this.state());

    if (this._state_properties.has(bound_name)) {
      return this._state_properties.get(bound_name);

    } else if (this._default_properties.has(name)) {
      return this._default_properties.get(name);

    } else {
      throw new JssmError(this, `Strictly requested a prop '${name}' which doesn't exist on current state '${this.state()}' and has no default`);
    }

  }





  /*********
   *
   *  Get the current value of every prop, as an object.  If no current definition
   *  exists for a prop — that is, if the prop was defined without a default and
   *  the current state also doesn't define the prop — then that prop will be listed
   *  in the returned object with a value of `undefined`.
   *
   *  ```typescript
   *  const traffic_light = sm`
   *
   *    property can_go     default true;
   *    property hesitate   default true;
   *    property stop_first default false;
   *
   *    Off -> Red => Green => Yellow => Red;
   *    [Red Yellow Green] ~> [Off FlashingRed];
   *    FlashingRed -> Red;
   *
   *    state Red:         { property stop_first true;  property can_go false; };
   *    state Off:         { property stop_first true;  };
   *    state FlashingRed: { property stop_first true;  };
   *    state Green:       { property hesitate   false; };
   *
   *  `;
   *
   *  traffic_light.state();  // Off
   *  traffic_light.props();  // { can_go: true,  hesitate: true,  stop_first: true;  }
   *
   *  traffic_light.go('Red');
   *  traffic_light.props();  // { can_go: false, hesitate: true,  stop_first: true;  }
   *
   *  traffic_light.go('Green');
   *  traffic_light.props();  // { can_go: true,  hesitate: false, stop_first: false; }
   *  ```
   *
   *  @returns An object mapping every known property name to its current value
   *  (or `undefined` if the property has no default and the current state
   *  doesn't define it).
   *
   */

  props(): object {

    const ret: object = {};
    this.known_props().forEach(
      p =>
        ret[p] = this.prop(p)
    );

    return ret;

  }





  // TODO: sparse_props — like props() but omits undefined entries
  // sparse_props(name: string): object { }

  // TODO: strict_props — like props() but throws on any undefined entry
  // strict_props(name: string): object { }





  /*********
   *
   *  Check whether a given string is a known property's name.
   *
   *  ```typescript
   *  const example = sm`property foo default 1; a->b;`;
   *
   *  example.known_prop('foo');  // true
   *  example.known_prop('bar');  // false
   *  ```
   *
   *  @param prop_name The relevant property name to look up
   *
   */

  known_prop(prop_name: string): boolean {
    return this._property_keys.has(prop_name);
  }





  /*********
   *
   *  List all known property names.  If you'd also like values, use
   *  {@link props} instead.  The order of the properties is not defined, and
   *  the properties generally will not be sorted.
   *
   *  ```typescript
   *  const m = sm`property color default "grey"; property size default 1; a -> b;`;
   *
   *  m.known_props();  // ['color', 'size']
   *  ```
   *
   *  @returns An array of all property name strings defined on this machine.
   *
   */

  known_props(): string[] {
    return [... this._property_keys];
  }





  /********
   *
   *  Check whether a given state is a valid start state (either because it was
   *  explicitly named as such, or because it was the first mentioned state.)
   *
   *  ```typescript
   *  import { sm, is_start_state } from 'jssm';
   *
   *  const example = sm`a -> b;`;
   *
   *  console.log( final_test.is_start_state('a') );   // true
   *  console.log( final_test.is_start_state('b') );   // false
   *
   *  const example = sm`start_states: [a b]; a -> b;`;
   *
   *  console.log( final_test.is_start_state('a') );   // true
   *  console.log( final_test.is_start_state('b') );   // true
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param whichState The name of the state to check
   *
   */

  is_start_state(whichState: StateType): boolean {
    return this._start_states.has(whichState);
  }





  /********
   *
   *  Check whether a given state is a valid start state (either because it was
   *  explicitly named as such, or because it was the first mentioned state.)
   *
   *  ```typescript
   *  import { sm, is_end_state } from 'jssm';
   *
   *  const example = sm`a -> b;`;
   *
   *  console.log( final_test.is_start_state('a') );   // false
   *  console.log( final_test.is_start_state('b') );   // true
   *
   *  const example = sm`end_states: [a b]; a -> b;`;
   *
   *  console.log( final_test.is_start_state('a') );   // true
   *  console.log( final_test.is_start_state('b') );   // true
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param whichState The name of the state to check
   *
   */

  is_end_state(whichState: StateType): boolean {
    return this._end_states.has(whichState);
  }




  /********
   *
   *  Get the set of states declared as failure outputs for this machine.
   *  Returns an array of state labels, or an empty array when none were
   *  declared.  A state in this list means the machine is in a failure
   *  condition when it occupies that state.
   *
   *  @see {@link is_failed_output} to test a single state
   *  @see {@link is_failed} to test the current state
   *
   */

  failed_outputs(): Array<StateType> {
    return [...this._failed_outputs];
  }




  /********
   *
   *  Check whether a given state is declared as a failure output.
   *
   *  @param whichState The name of the state to check
   *
   *  @see {@link failed_outputs} for the full failure-output set
   *  @see {@link is_failed} to test the current state
   *
   */

  is_failed_output(whichState: StateType): boolean {
    return this._failed_outputs.has(whichState);
  }




  /********
   *
   *  Check whether the machine is currently in a failure state — that is,
   *  whether its current state is one of the declared `failed_outputs`.
   *
   *  @see {@link failed_outputs} for the full failure-output set
   *  @see {@link is_failed_output} to test an arbitrary state
   *
   */

  is_failed(): boolean {
    return this._failed_outputs.has(this._state);
  }





  /********
   *
   *  Check whether a given state is final (either has no exits or is marked
   *  `complete`.)
   *
   *  ```typescript
   *  import { sm, state_is_final } from 'jssm';
   *
   *  const final_test = sm`first -> second;`;
   *
   *  console.log( final_test.state_is_final('first') );   // false
   *  console.log( final_test.state_is_final('second') );  // true
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param whichState The name of the state to check for finality
   *
   */

  state_is_final(whichState: StateType): boolean {
    return ((this.state_is_terminal(whichState)) || (this.state_is_complete(whichState)));
  }





  /********
   *
   *  Check whether the current state is final (either has no exits or is marked
   *  `complete`.)
   *
   *  ```typescript
   *  import { sm, is_final } from 'jssm';
   *
   *  const final_test = sm`first -> second;`;
   *
   *  console.log( final_test.is_final() );   // false
   *  state.transition('second');
   *  console.log( final_test.is_final() );   // true
   *  ```
   *
   */

  is_final(): boolean {
    //  return ((!this.is_changing()) && this.state_is_final(this.state()));
    return this.state_is_final(this.state());
  }





  /********
   *
   *  Serialize the current machine, including all defining state but not the
   *  machine string, to a structure.  This means you will need the machine
   *  string to recreate (to not waste repeated space;) if you want the machine
   *  string embedded, call {@link serialize_with_string} instead.
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param comment An optional comment string to embed in the serialized
   *  output for identification or debugging.
   *
   *  @returns A {@link JssmSerialization} object containing the machine's
   *  current state, data, and timestamp.
   *
   */

  serialize(comment?: string | undefined): JssmSerialization<mDT> {

    return {

      comment,
      state            : this._state,
      data             : this._data,
      jssm_version     : version,
      history          : this._history.toArray(),
      history_capacity : this._history.capacity,
      timestamp        : new Date().getTime(),

    };

  }





  /** Get the graph layout direction (e.g. `'LR'`, `'TB'`).  Set via the
   *  FSL `graph_layout` directive.
   *  @returns The layout string, or the default if not set.
   */
  graph_layout(): string {
    return this._graph_layout;
  }

  /** Get the Graphviz DOT preamble string, injected before the graph body
   *  during visualization.  Set via the FSL `dot_preamble` directive.
   *  @returns The preamble string.
   */
  dot_preamble(): string {
    return this._dot_preamble;
  }

  /** Get the consolidated `transition: {}` default-config block: the ordered,
   *  de-duplicated `{ key, value }[]` list of edge-default style items compiled
   *  from a `transition: {}` block (e.g. `transition: { color: blue; }`).  The
   *  viz layer projects this onto a Graphviz `edge [ … ]` default statement so
   *  every edge inherits it.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *  sm`a -> b; transition: { color: blue; };`.default_transition_config();
   *  // [ { key: 'color', value: '#0000ffff' } ]
   *  ```
   *
   *  @returns The transition-config item list, or `undefined` if the machine
   *  declared no `transition: {}` block.
   *  @see default_graph_config
   */
  default_transition_config(): JssmTransitionConfig | undefined {
    return this._default_transition_config;
  }

  /** Get the consolidated `graph: {}` default-config block: the ordered,
   *  de-duplicated `{ key, value }[]` list of graph-scope style items.  The
   *  compiler folds the deprecated top-level graph keywords
   *  (`graph_bg_color` → `background-color`, plus `graph_layout`, `theme`,
   *  `flow`, `dot_preamble`) into this list first, then lets an explicit
   *  `graph: {}` block win on key conflict.  The viz layer projects the
   *  graph-meaningful keys onto graph-scope Graphviz attributes (e.g.
   *  `background-color` → `bgcolor`).
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *  sm`a -> b; graph: { background-color: #ffffff; };`.default_graph_config();
   *  // [ { key: 'background-color', value: '#ffffffff' } ]
   *  ```
   *
   *  @returns The graph-config item list, or `undefined` if the machine has no
   *  graph config (no `graph: {}` block and no deprecated graph keyword).
   *  @see default_transition_config
   */
  default_graph_config(): JssmGraphConfig | undefined {
    return this._default_graph_config;
  }



  /** Get the machine's author list.  Set via the FSL `machine_author` directive.
   *  @returns An array of author name strings.
   */
  machine_author(): Array<string> {
    return this._machine_author;
  }

  /** Get the machine's comment string.  Set via the FSL `machine_comment` directive.
   *  @returns The comment string.
   */
  machine_comment(): string {
    return this._machine_comment;
  }

  /** Get the machine's contributor list.  Set via the FSL `machine_contributor` directive.
   *  @returns An array of contributor name strings.
   */
  machine_contributor(): Array<string> {
    return this._machine_contributor;
  }

  /** Get the machine's definition string.  Set via the FSL `machine_definition` directive.
   *  @returns The definition string.
   */
  machine_definition(): string {
    return this._machine_definition;
  }

  /** Get the machine's language (ISO 639-1).  Set via the FSL `machine_language` directive.
   *  @returns The language code string.
   */
  machine_language(): string {
    return this._machine_language;
  }

  /** Get the machine's license string.  Set via the FSL `machine_license` directive.
   *  @returns The license string.
   */
  machine_license(): string {
    return this._machine_license;
  }

  /** Get the machine's name.  Set via the FSL `machine_name` directive.
   *  @returns The machine name string.
   */
  machine_name(): string {
    return this._machine_name;
  }

  /** Get the npm package name associated with the machine.  Set via the FSL `npm_name` directive.
   *  Returns `undefined` when not present.
   *  @returns The npm package name string, or `undefined`.
   *  @see machine_name
   */
  npm_name(): string {
    return this._npm_name;
  }

  /** Get the render-size hint for the machine's visualization.  Set via the
   *  FSL `default_size` directive.  Returns `undefined` when not present.
   *
   *  The three FSL forms each produce a different subset of fields:
   *
   *  - `default_size: 800;`       → `{ width: 800 }`
   *  - `default_size: 800 600;`   → `{ width: 800, height: 600 }`
   *  - `default_size: height 600;` → `{ height: 600 }`
   *
   *  This is a hint, not a hard constraint.  Renderers may ignore it.
   *
   *  @returns The size-hint object, or `undefined` if not set.
   *  @see npm_name
   */
  default_size(): JssmDefaultSize | undefined {
    return this._default_size;
  }

  /** Get the machine's version string.  Set via the FSL `machine_version` directive.
   *  @returns The version string.
   */
  machine_version(): string {
    return this._machine_version;
  }

  /** Get the raw state declaration objects as parsed from the FSL source.
   *  @returns An array of raw state declaration objects.
   */
  raw_state_declarations(): Array<Object> {
    return this._raw_state_declaration;
  }

  /** Get the processed state declaration for a specific state.
   *  @param which - The state to look up.
   *  @returns The {@link JssmStateDeclaration} for the given state.
   */
  state_declaration(which: StateType): JssmStateDeclaration {
    return this._state_declarations.get(which);
  }

  /** Get all processed state declarations as a Map.
   *  @returns A `Map` from state name to {@link JssmStateDeclaration}.
   */
  state_declarations(): Map<StateType, JssmStateDeclaration> {
    return this._state_declarations;
  }

  /** Get the FSL language version this machine was compiled under.
   *  @returns The FSL version string.
   */
  fsl_version(): string {
    return this._fsl_version;
  }



  /** Get the complete internal state of the machine as a serializable
   *  structure.  Includes actions, edges, edge map, named transitions,
   *  reverse actions, current state, and states map.
   *  @returns A {@link JssmMachineInternalState} snapshot.
   */
  machine_state(): JssmMachineInternalState<mDT> {

    return {

      internal_state_impl_version : 1,

      actions                     : this._actions,
      edge_map                    : this._edge_map,
      edges                       : this._edges,
      named_transitions           : this._named_transitions,
      reverse_actions             : this._reverse_actions,
      // reverse_action_targets : this._reverse_action_targets,
      state                       : this._state,
      states                      : this._states

    };

  }





  /*********
   *
   *  List all the states known by the machine.  Please note that the order of
   *  these states is not guaranteed.
   *
   *  ```typescript
   *  import * as jssm from 'jssm';
   *
   *  const lswitch = jssm.from('on <=> off;');
   *  console.log( lswitch.states() );             // ['on', 'off']
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns An array of all state names in the machine.
   *
   */

  states(): Array<StateType> {
    return Array.from(this._states.keys());
  }





  /** Get the internal state descriptor for a given state name.
   *  @param whichState - The state to look up.
   *  @returns The {@link JssmGenericState} descriptor.
   *  @throws {JssmError} If the state does not exist.
   */
  state_for(whichState: StateType): JssmGenericState {

    const state: JssmGenericState = this._states.get(whichState);

    if (state) {
      return state;
    } else {
      throw new JssmError(this, 'No such state', { requested_state: whichState });
    }

  }





  /*********
   *
   *  Check whether the machine knows a given state.
   *
   *  ```typescript
   *  import * as jssm from 'jssm';
   *
   *  const lswitch = jssm.from('on <=> off;');
   *
   *  console.log( lswitch.has_state('off') );     // true
   *  console.log( lswitch.has_state('dance') );   // false
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param whichState The state to be checked for existence.
   *
   *  @returns `true` if the state exists, `false` otherwise.
   *
   */

  has_state(whichState: StateType): boolean {
    return this._states.get(whichState) !== undefined;
  }





  /*********
   *
   *  Lists all edges of a machine.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const lswitch = sm`on 'toggle' <=> 'toggle' off;`;
   *
   *  lswitch.list_edges();
   *  [
   *    {
   *      from: 'on',
   *      to: 'off',
   *      kind: 'main',
   *      forced_only: false,
   *      main_path: true,
   *      action: 'toggle'
   *    },
   *    {
   *      from: 'off',
   *      to: 'on',
   *      kind: 'main',
   *      forced_only: false,
   *      main_path: true,
   *      action: 'toggle'
   *    }
   *  ]
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns An array of all {@link JssmTransition} edge objects.
   *
   */

  list_edges(): Array<JssmTransition<StateType, mDT>> {
    return this._edges;
  }

  /** Get the map of named transitions (transitions with explicit names).
   *  @returns A `Map` from transition name to edge index.
   */
  list_named_transitions(): Map<StateType, number> {
    return this._named_transitions;
  }

  /** List all distinct action names defined anywhere in the machine.
   *  @returns An array of action name strings.
   */
  list_actions(): Array<StateType> {
    return Array.from(this._actions.keys());
  }

  /** Whether any actions are defined on this machine.
   *  @returns `true` if the machine has at least one action.
   */
  get uses_actions(): boolean {
    // Map.size answers emptiness without materializing the key list
    return this._actions.size > 0;
  }

  /** Whether any forced (`~>`) transitions exist in this machine.
   *  @returns `true` if at least one forced transition is defined.
   */
  get uses_forced_transitions(): boolean {
    return this._has_forced_transitions;
  }





  /*********
   *
   *  Check if the code that built the machine allows overriding state and data.
   *
   *  @returns The override permission from the FSL source code.
   *
   */

  get code_allows_override(): JssmAllowsOverride {
    return this._code_allows_override;
  }





  /*********
   *
   *  Check if the machine config allows overriding state and data.
   *
   *  @returns The override permission from the runtime config.
   *
   */

  get config_allows_override(): JssmAllowsOverride {
    return this._config_allows_override;
  }





  /*********
   *
   *  Check if a machine allows overriding state and data.  Resolves the
   *  combined effect of code and config permissions — config may not be
   *  less strict than code.
   *
   *  @returns The effective override permission.
   *
   */

  get allows_override(): JssmAllowsOverride {

    // code false?  config true, throw.  config false, false.  config undefined, false.
    if (this._code_allows_override === false) {
      /* istanbul ignore next */
      if (this._config_allows_override === true) {
        /* istanbul ignore next */
        throw new JssmError(this, "Code specifies no override, but config tries to permit; config may not be less strict than code; should be unreachable");
      } else {
        return false;
      }
    }

    // code true?  config true, true.  config false, false.  config undefined, true.
    if (this._code_allows_override === true) {
      if (this._config_allows_override === false) {
        return false;
      } else {
        return true;
      }
    }

    // code must be undefined.  config false, false.  config true, true.  config undefined, false.
    if (this._config_allows_override === true) {
      return true;
    } else {
      return false;
    }

  }




  /*********
   *
   *  Return the effective island policy for this machine.  `true` means
   *  disconnected components are allowed (the default), `false` requires a
   *  single connected component, and `'with_start'` allows islands only when
   *  every component contains at least one start state.
   *
   *  @returns The island policy stored in the machine.
   *
   */

  get allow_islands(): JssmAllowIslands {
    return this._allow_islands;
  }





  /** List all available theme names.
   *  @returns An array of theme name strings.
   */
  all_themes(): FslTheme[] {
    return [... theme_mapping.keys()];     // constructor sets this to "default" otherwise
  }

  /** List the character ranges accepted by the FSL grammar in any but the
   *  first position of a state name (atom).  Each entry is an inclusive
   *  `{from, to}` range of single Unicode characters.
   *
   *  @returns An array of `{from, to}` inclusive character ranges.
   *
   *  @example
   *  import { sm } from 'jssm';
   *  const m = sm`a -> b;`;
   *  m.all_state_name_chars().some(r => '+' >= r.from && '+' <= r.to);  // => true
   */
  all_state_name_chars(): ReadonlyArray<{ from: string, to: string }> {
    return state_name_chars;
  }

  /** List the character ranges accepted by the FSL grammar in the first
   *  position of a state name (atom).  Narrower than
   *  {@link all_state_name_chars}: notably omits `+`, `(`, `)`, `&`, `#`, `@`.
   *
   *  @returns An array of `{from, to}` inclusive character ranges.
   *
   *  @example
   *  import { sm } from 'jssm';
   *  const m = sm`a -> b;`;
   *  m.all_state_name_first_chars().some(r => '+' >= r.from && '+' <= r.to);  // => false
   */
  all_state_name_first_chars(): ReadonlyArray<{ from: string, to: string }> {
    return state_name_first_chars;
  }

  /** List the character ranges accepted inside a single-quoted FSL action
   *  label without escaping.  Space is allowed; the apostrophe `'` is
   *  explicitly excluded since it terminates the label.
   *
   *  @returns An array of `{from, to}` inclusive character ranges.
   *
   *  @example
   *  import { sm } from 'jssm';
   *  const m = sm`a -> b;`;
   *  m.all_action_label_chars().some(r => ' ' >= r.from && ' ' <= r.to);   // => true
   *  m.all_action_label_chars().some(r => "'" >= r.from && "'" <= r.to);   // => false
   */
  all_action_label_chars(): ReadonlyArray<{ from: string, to: string }> {
    return action_label_chars;
  }

  /** Get the active theme(s) for this machine.  Always stored as an array
   *  internally; the union return type exists for setter compatibility.
   *  @returns The current theme or array of themes.
   */
  get themes(): FslTheme | FslTheme[] {
    return this._themes;     // constructor sets this to "default" otherwise
  }

  /** Set the active theme(s).  Accepts a single theme name or an array.
   *  @param to - A theme name or array of theme names to apply.
   */
  set themes(to: FslTheme | FslTheme[]) {
    if (typeof to === 'string') {
      this._themes = [to];
    } else {
      this._themes = to;
    }
  }

  /** Get the flow direction for graph layout (e.g. `'right'`, `'down'`).
   *  Set via the FSL `flow` directive.
   *  @returns The current flow direction.
   */
  flow(): FslDirection {
    return this._flow;
  }



  /** Look up a transition's edge index by source and target state names.
   *  @param from - Source state name.
   *  @param to   - Target state name.
   *  @returns The edge index in the edges array, or `undefined` if no
   *  such transition exists.
   */
  get_transition_by_state_names(from: StateType, to: StateType): number {

    const emg: Map<StateType, number> = this._edge_map.get(from);

    if (emg) {
      return emg.get(to);
    } else {
      return undefined;
    }

  }



  /** Look up the full transition object for a given source→target pair.
   *  @param from - Source state name.
   *  @param to   - Target state name.
   *  @returns The {@link JssmTransition} object, or `undefined` if none exists.
   */
  lookup_transition_for(from: StateType, to: StateType): JssmTransition<StateType, mDT> {
    const id: number = this.get_transition_by_state_names(from, to);
    return ((id === undefined) || (id === null)) ? undefined : this._edges[id];
  }





  /********
   *
   *  List all transitions attached to the current state, sorted by entrance and
   *  exit.  The order of each sublist is not defined.  A node could appear in
   *  both lists.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
   *
   *  light.state();               // 'red'
   *  light.list_transitions();    // { entrances: [ 'yellow', 'off' ], exits: [ 'green', 'off' ] }
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param whichState The state whose transitions to have listed
   *
   */

  list_transitions(whichState: StateType = this.state()): JssmTransitionList {
    return { entrances: this.list_entrances(whichState), exits: this.list_exits(whichState) };
  }





  /********
   *
   *  List all entrances attached to the current state.  Please note that the
   *  order of the list is not defined.  This list includes both unforced and
   *  forced entrances; if this isn't desired, consider
   *  {@link list_unforced_entrances} or {@link list_forced_entrances} as
   *  appropriate.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
   *
   *  light.state();               // 'red'
   *  light.list_entrances();      // [ 'yellow', 'off' ]
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param whichState The state whose entrances to have listed
   *
   */

  list_entrances(whichState: StateType = this.state()): Array<StateType> {

    const guaranteed = (this._states.get(whichState) ?? { from: undefined });
    return guaranteed.from ?? [];

  }





  /********
   *
   *  List all exits attached to the current state.  Please note that the order
   *  of the list is not defined.  This list includes both unforced and forced
   *  exits; if this isn't desired, consider {@link list_unforced_exits} or
   *  {@link list_forced_exits} as appropriate.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
   *
   *  light.state();               // 'red'
   *  light.list_exits();          // [ 'green', 'off' ]
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param whichState The state whose exits to have listed
   *
   */

  list_exits(whichState: StateType = this.state()): Array<StateType> {

    const guaranteed = (this._states.get(whichState) ?? { to: undefined });
    return guaranteed.to ?? [];

  }





  /** Get the transitions available from a state for use by the probabilistic
   *  walk system.
   *
   *  If any exit declares a `probability`, only those probability-bearing
   *  exits are returned, so that non-probability peers cannot dilute the
   *  declared distribution.  If no exit declares a `probability`, every
   *  legal (non-forced) exit is returned, which `weighted_rand_select`
   *  treats as equal weight.  Forced-only exits (`~>`) are always excluded,
   *  since they cannot be taken by an ordinary `transition()` call.
   *
   *  Fixes StoneCypher/fsl#1325, in which the function previously returned
   *  every exit unconditionally — including forced-only exits and exits
   *  with no `probability`, which distorted the weighted distribution.
   *
   *  @param whichState - The state to inspect.
   *  @returns An array of {@link JssmTransition} edges exiting the state,
   *  filtered as described above.  May be empty.
   *  @throws {JssmError} If the state does not exist.
   */
  probable_exits_for(whichState: StateType): Array<JssmTransition<StateType, mDT>> {

    const wstate: JssmGenericState = this._states.get(whichState);
    if (!(wstate)) { throw new JssmError(this, `No such state ${JSON.stringify(whichState)} in probable_exits_for`); }

    // single pass over the state's exits, replacing the old map -> filter ->
    // filter -> filter chain and its three intermediate arrays; selection and
    // ordering semantics are unchanged
    const legal_exits          : Array<JssmTransition<StateType, mDT>> = [],
          probability_bearing  : Array<JssmTransition<StateType, mDT>> = [];

    for (const ws of wstate.to) {

      // wstate.to is built from the same edge set lookup_transition_for
      // resolves against, so the lookup cannot miss; the guard mirrors the
      // old defensive .filter(Boolean) and is equally unreachable.
      const edge: JssmTransition<StateType, mDT> = this.lookup_transition_for(whichState, ws);
      /* v8 ignore next */
      if (!edge) { continue; }

      // forced-only exits cannot be reached by transition(), so they are
      // never legal probabilistic outcomes
      if (edge.forced_only) { continue; }

      legal_exits.push(edge);

      // if any legal exit declares a probability, only those are returned, so
      // that probability-bearing edges are not diluted by their peers
      if (edge.probability !== undefined) { probability_bearing.push(edge); }

    }

    return (probability_bearing.length > 0) ? probability_bearing : legal_exits;

  }

  /** Take a single random transition from the current state, weighted by
   *  edge probabilities.
   *  @returns `true` if a transition was taken, `false` otherwise.
   */
  probabilistic_transition(): boolean {
    const selected: JssmTransition<StateType, mDT> = weighted_rand_select(this.probable_exits_for(this.state()), undefined, this._rng);
    return this.transition(selected.to);
  }

  /** Take `n` consecutive probabilistic transitions and return the sequence
   *  of states visited (before each transition).
   *  @param n - Number of steps to walk.
   *  @returns An array of state names visited during the walk.
   */
  probabilistic_walk(n: number): Array<StateType> {
    return seq(n)
      .map((): StateType => {
        const state_was: StateType = this.state();
        this.probabilistic_transition();
        return state_was;
      })
      .concat([this.state()]);
  }

  /** Take `n` probabilistic steps and return a histograph of how many times
   *  each state was visited.
   *  @param n - Number of steps to walk.
   *  @returns A `Map` from state name to visit count.
   */
  probabilistic_histo_walk(n: number): Map<StateType, number> {
    return histograph(this.probabilistic_walk(n));
  }





  /********
   *
   *  List all actions available from this state.  Please note that the order of
   *  the actions is not guaranteed.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const machine = sm`
   *    red 'next' -> green 'next' -> yellow 'next' -> red;
   *    [red yellow green] 'shutdown' ~> off 'start' -> red;
   *  `;
   *
   *  console.log( machine.state() );    // logs 'red'
   *  console.log( machine.actions() );  // logs ['next', 'shutdown']
   *
   *  machine.action('next');            // true
   *  console.log( machine.state() );    // logs 'green'
   *  console.log( machine.actions() );  // logs ['next', 'shutdown']
   *
   *  machine.action('shutdown');        // true
   *  console.log( machine.state() );    // logs 'off'
   *  console.log( machine.actions() );  // logs ['start']
   *
   *  machine.action('start');           // true
   *  console.log( machine.state() );    // logs 'red'
   *  console.log( machine.actions() );  // logs ['next', 'shutdown']
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param whichState The state whose actions to list.  Defaults to the
   *  current state.
   *
   *  @returns An array of action names available from the given state.
   *
   */

  actions(whichState: StateType = this.state()): Array<StateType> {

    const wstate: Map<StateType, number> = this._reverse_actions.get(whichState);

    if (wstate) {
      return Array.from(wstate.keys());
    } else {
      if (this.has_state(whichState)) {
        return [];
      } else {
        throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
      }
    }
  }





  /********
   *
   *  List all states that have a specific action attached.  Please note that
   *  the order of the states is not guaranteed.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const machine = sm`
   *    red 'next' -> green 'next' -> yellow 'next' -> red;
   *    [red yellow green] 'shutdown' ~> off 'start' -> red;
   *  `;
   *
   *  console.log( machine.list_states_having_action('next') );    // ['red', 'green', 'yellow']
   *  console.log( machine.list_states_having_action('start') );   // ['off']
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param whichState The action to be checked for associated states
   *
   */

  list_states_having_action(whichState: StateType): Array<StateType> {

    const wstate: Map<StateType, number> = this._actions.get(whichState);

    if (wstate) {
      return Array.from(wstate.keys());
    } else {
      throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
    }

  }





  // comeback
  /*
    list_entrance_actions(whichState: mNT = this.state() ) : Array<mNT> {
      return [... (this._reverse_action_targets.get(whichState) || new Map()).values()] // wasteful
             .map( (edgeId:any) => (this._edges[edgeId] : any)) // whargarbl burn out any
             .filter( (o:any) => o.to === whichState)
             .map( filtered => filtered.from );
    }
  */

  /** List all action names available as exits from a given state.
   *
   *  Returns the empty array (does not throw) when `whichState` exists but has
   *  no action-named exits — including terminal states, states whose only
   *  exits are plain `->` transitions, and states in machines that use no
   *  actions at all.  Only nonexistent states cause a throw.
   *
   *  @param whichState - The state to inspect.  Defaults to the current state.
   *  @returns An array of action name strings, possibly empty.
   *  @throws {JssmError} If the state does not exist.
   *
   *  @example
   *    const m = sm`a 'go' -> b; b -> c;`;
   *    m.list_exit_actions('a');  // => ['go']
   *    m.list_exit_actions('b');  // => []
   *    m.list_exit_actions('c');  // => []
   *    expect(() => m.list_exit_actions('z')).toThrow();
   */
  list_exit_actions(whichState: StateType = this.state()): Array<StateType> { // these are mNT, not ?mNT

    const ra_base: Map<StateType, number> = this._reverse_actions.get(whichState);

    if (!(ra_base)) {
      if (this.has_state(whichState)) {
        return [];
      }
      throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
    }

    return Array.from(ra_base.values())
      .map((edgeId: number): JssmTransition<StateType, mDT> => this._edges[edgeId])
      .filter((o: JssmTransition<StateType, mDT>): boolean => o.from === whichState)
      .map((filtered: JssmTransition<StateType, mDT>): StateType => filtered.action);

  }





  /** List all action exits from a state with their probabilities.
   *  @param whichState - The state to inspect.  Defaults to the current state.
   *  @returns An array of `{ action, probability }` objects.
   *  @throws {JssmError} If the state does not exist.
   */
  probable_action_exits(whichState: StateType = this.state()): Array<any> { // these are mNT   // TODO FIXME no any
    const ra_base: Map<StateType, number> = this._reverse_actions.get(whichState);
    if (!(ra_base)) {
      if (this.has_state(whichState)) {
        return [];
      }
      throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
    }

    return Array.from(ra_base.values())
      .map((edgeId: number): JssmTransition<StateType, mDT> => this._edges[edgeId])
      .filter((o: JssmTransition<StateType, mDT>): boolean => o.from === whichState)
      .map((filtered): any => ({
        action: filtered.action,          // TODO FIXME no any
        probability: filtered.probability
      })
      );
  }



  /** Check whether a state has no incoming transitions (unreachable after start).
   *  @param whichState - The state to check.
   *  @returns `true` if the state has zero entrances.
   *  @throws {JssmError} If the state does not exist.
   */
  is_unenterable(whichState: StateType): boolean {
    if (!(this.has_state(whichState))) { throw new JssmError(this, `No such state ${whichState}`); }
    return this.list_entrances(whichState).length === 0;
  }

  /** Check whether any state in the machine is unenterable.
   *  @returns `true` if at least one state has no incoming transitions.
   */
  has_unenterables(): boolean {
    return this.states().some((x: StateType): boolean => this.is_unenterable(x));
  }



  /** Check whether the current state is terminal (has no exits).
   *  @returns `true` if the current state has zero exits.
   */
  is_terminal(): boolean {
    return this.state_is_terminal(this.state());
  }

  /** Check whether a specific state is terminal (has no exits).
   *  @param whichState - The state to check.
   *  @returns `true` if the state has zero exits.
   *  @throws {JssmError} If the state does not exist.
   */
  state_is_terminal(whichState: StateType): boolean {
    if (!(this.has_state(whichState))) { throw new JssmError(this, `No such state ${whichState}`); }
    return this.list_exits(whichState).length === 0;
  }

  /** Check whether any state in the machine is terminal.
   *  @returns `true` if at least one state has no exits.
   */
  has_terminals(): boolean {
    return this.states().some((x): boolean => this.state_is_terminal(x));
  }





  /********
   *
   *  Reports whether the machine's CURRENT state is a transitive member of a
   *  named group.  Membership is deep: a state counts as in `groupName` if it
   *  belongs to that group directly, or via any nested (`&child`) or spread
   *  (`...&child`) sub-group, at any depth.  An undeclared group simply has no
   *  members, so this returns `false` rather than throwing.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const m = sm`&busy : [working]; idle 'go' -> working;`;
   *  m.isIn('busy');     // false — current state is 'idle'
   *  m.action('go');
   *  m.isIn('busy');     // true  — current state is now 'working'
   *  m.isIn('nonesuch'); // false — undeclared group has no members
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param groupName The group to test the current state against.
   *
   *  @returns `true` if the current state is a transitive member of `groupName`.
   *
   *  @see groupsOf
   *  @see statesIn
   *
   */

  isIn(groupName: string): boolean {
    return this.groupsOf(this.state()).has(groupName);
  }





  /********
   *
   *  Lists every group that transitively contains a given state.  Membership is
   *  deep — direct, nested, and spread sub-group containment all count — and the
   *  result is the precomputed inverse-index entry for the state, so the lookup
   *  is constant-time.  A state that belongs to no group (or a state name that
   *  appears in no group) yields an empty `Set`.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
   *  m.groupsOf('a');     // Set { 'inner', 'outer' }  — deep through &inner
   *  m.groupsOf('b');     // Set { 'outer' }
   *  m.groupsOf('z');     // Set {}                    — not in any group
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param state The state whose containing groups are wanted.
   *
   *  @returns A `Set` of every group name transitively containing `state`;
   *  empty when `state` belongs to no group.
   *
   *  @see isIn
   *  @see groups
   *
   */

  groupsOf(state: StateType): Set<string> {
    return new Set(this._state_to_groups.get(state) ?? []);
  }





  /********
   *
   *  Lists all declared group names, in source declaration order.  The order
   *  matches the order the `&group : [ … ];` declarations appear in the FSL, and
   *  is the same order used to break depth-specificity ties in the config
   *  cascade.  Machines that declare no groups return an empty array.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const m = sm`&first : [a]; &second : [b]; a -> b;`;
   *  m.groups();  // [ 'first', 'second' ]
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns The declared group names, in declaration order.
   *
   *  @see groupsOf
   *  @see statesIn
   *
   */

  groups(): string[] {
    return [ ...this._group_order ];
  }





  /********
   *
   *  Lists every state that is a transitive member of a named group — the
   *  flattened membership of the group, descending through nested and spread
   *  sub-groups, in member-declaration order.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const m = sm`&inner : [a b]; &outer : [&inner c]; a -> b -> c;`;
   *  m.statesIn('outer');  // [ 'a', 'b', 'c' ]
   *  m.statesIn('inner');  // [ 'a', 'b' ]
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param groupName The group whose transitive member states are wanted.
   *
   *  @returns The transitive member states of `groupName`, in declaration order.
   *
   *  @throws {JssmError} If `groupName` is not a declared group.
   *
   *  @see groups
   *  @see groupsOf
   *
   */

  statesIn(groupName: string): Array<StateType> {
    if (!(this._group_registry.has(groupName))) {
      throw new JssmError(this, `No such group ${JSON.stringify(groupName)}`);
    }
    return transitive_members(this._group_registry, groupName, new Map());
  }



  /** Check whether the current state is complete (every exit has an action).
   *  @returns `true` if the current state is complete.
   */
  is_complete(): boolean {
    return this.state_is_complete(this.state());
  }

  /** Check whether a specific state is complete (every exit has an action).
   *  @param whichState - The state to check.
   *  @returns `true` if the state is complete.
   *  @throws {JssmError} If the state does not exist.
   */
  state_is_complete(whichState: StateType): boolean {
    const wstate: JssmGenericState = this._states.get(whichState);
    if (wstate) { return wstate.complete; }
    else { throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`); }
  }

  /** Check whether any state in the machine is complete.
   *  @returns `true` if at least one state is complete.
   */
  has_completes(): boolean {
    return this.states().some((x): boolean => this.state_is_complete(x));
  }



  /**
   *  Subscribe to a typed observation event.  Hooks (`set_hook` and friends)
   *  intercept and may cancel a transition; events fire alongside the same
   *  state-machine moments but cannot influence the outcome.  This is the
   *  surface most users actually want for "tell me when state changes".
   *
   *  Handlers run synchronously, in registration order.  A throwing handler
   *  does not block subsequent handlers — its exception is caught and
   *  re-emitted as an `error` event whose detail names the original event
   *  and the offending handler.
   *
   *  ```typescript
   *  const m = sm`a -> b -> c;`;
   *
   *  m.on('transition', e => console.log(`${e.from} -> ${e.to}`));
   *  m.on('entry', { state: 'b' }, e => console.log(`entered ${e.state}`));
   *
   *  const off = m.on('transition', () => {});
   *  off();  // unsubscribe
   *  ```
   *
   *  @typeparam Ev      The event name (drives the detail type).
   *  @param name        The event name to subscribe to.
   *  @param filterOrFn  Either a filter object or, when calling the no-filter
   *                     form, the handler itself.
   *  @param maybeFn     The handler, when a filter object was supplied.
   *  @returns A function that unsubscribes when called.
   *
   *  @see Machine.off
   *  @see Machine.once
   */
  on<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
  on<Ev extends JssmEventName>(name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
  on<Ev extends JssmEventName>(
    name: Ev,
    filterOrFn: JssmEventFilter<mDT, Ev> | JssmEventHandler<mDT, Ev>,
    maybeFn?: JssmEventHandler<mDT, Ev>
  ): JssmUnsubscribe {
    return this._subscribe(name, filterOrFn, maybeFn, false);
  }



  /**
   *  Subscribe to a typed observation event for one matching delivery, then
   *  auto-remove.  Accepts the same `(name, handler)` and `(name, filter,
   *  handler)` shapes as {@link Machine.on}.
   *
   *  ```typescript
   *  m.once('terminal', e => console.log(`done at ${e.state}`));
   *  ```
   *
   *  @typeparam Ev      The event name.
   *  @param name        The event name.
   *  @param filterOrFn  A filter object or the handler (no-filter form).
   *  @param maybeFn     The handler, when a filter was supplied.
   *  @returns A function that unsubscribes early if called before the
   *           handler has fired.
   *
   *  @see Machine.on
   *  @see Machine.off
   */
  once<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
  once<Ev extends JssmEventName>(name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
  once<Ev extends JssmEventName>(
    name: Ev,
    filterOrFn: JssmEventFilter<mDT, Ev> | JssmEventHandler<mDT, Ev>,
    maybeFn?: JssmEventHandler<mDT, Ev>
  ): JssmUnsubscribe {
    return this._subscribe(name, filterOrFn, maybeFn, true);
  }



  /**
   *  Remove a previously-registered event handler.  Match is by reference —
   *  the same function value passed to {@link Machine.on} or
   *  {@link Machine.once}.  Returns `true` if a subscription was found and
   *  removed, `false` otherwise.
   *
   *  ```typescript
   *  const fn = (e: any) => console.log(e);
   *  m.on('transition', fn);
   *  m.off('transition', fn);  // true
   *  m.off('transition', fn);  // false
   *  ```
   *
   *  @param name    The event name.
   *  @param handler The handler reference to remove.
   *  @returns `true` if removed, `false` if no match was registered.
   */
  off<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): boolean {
    const set = this._event_handlers.get(name);
    if (set === undefined) { return false; }
    for (const entry of set) {
      if (entry.handler === handler) {
        this._unsubscribe_entry(set, entry);
        return true;
      }
    }
    return false;
  }

  /**
   *  Remove one event-subscription entry from its set and keep
   *  {@link Machine._event_listener_count} in sync.  The count is decremented
   *  only when the entry was actually present, so calling a stale unsubscribe
   *  closure (or removing an already-fired `once` entry) is idempotent and
   *  cannot drive the count negative.
   *
   *  @param set   The per-event-name subscription set.
   *  @param entry The entry to remove.
   *  @internal
   */
  _unsubscribe_entry(set: Set<JssmEventEntry<any, any>>, entry: JssmEventEntry<any, any>): void {
    if (set.delete(entry)) { this._event_listener_count--; }
  }



  /**
   *  Shared registration core used by {@link Machine.on} and
   *  {@link Machine.once}.  Normalizes the optional filter argument and
   *  installs the entry into the per-event subscription set.
   *
   *  @internal
   */
  _subscribe<Ev extends JssmEventName>(
    name: Ev,
    filterOrFn: JssmEventFilter<mDT, Ev> | JssmEventHandler<mDT, Ev>,
    maybeFn: JssmEventHandler<mDT, Ev> | undefined,
    once: boolean
  ): JssmUnsubscribe {

    let filter: JssmEventFilter<mDT, Ev> | undefined;
    let handler: JssmEventHandler<mDT, Ev>;

    if (typeof filterOrFn === 'function') {
      filter  = undefined;
      handler = filterOrFn as JssmEventHandler<mDT, Ev>;
    } else {
      filter  = filterOrFn;
      handler = maybeFn as JssmEventHandler<mDT, Ev>;
    }

    if (typeof handler !== 'function') {
      throw new JssmError(this, `event handler for "${name}" must be a function`);
    }

    let set = this._event_handlers.get(name);
    if (set === undefined) {
      set = new Set();
      this._event_handlers.set(name, set);
    }

    const entry: JssmEventEntry<mDT, Ev> = { handler, filter, once };
    set.add(entry);
    this._event_listener_count++;

    return () => { this._unsubscribe_entry(set!, entry); };
  }



  /**
   *  Invoke a single event-handler entry, respecting its filter, once-removal
   *  semantics, and the error re-fire / recursion-guard logic.  Extracted so
   *  {@link _fire} can share identical behavior between the size-1 fast-path
   *  and the general snapshotted loop.
   *
   *  @param entry  - The subscriber descriptor to invoke.
   *  @param set    - The live Set that owns `entry`; needed for once-removal.
   *  @param name   - The event name being dispatched (used in error re-fires).
   *  @param detail - The event payload forwarded to the handler.
   *
   *  @internal
   */
  _fire_one<Ev extends JssmEventName>(
    entry  : JssmEventEntry<mDT, Ev>,
    set    : Set<JssmEventEntry<any, any>>,
    name   : Ev,
    detail : JssmEventDetailMap<mDT>[Ev]
  ): void {

    // filter check
    if (entry.filter !== undefined) {
      for (const k of Object.keys(entry.filter)) {
        if ((entry.filter as any)[k] !== (detail as any)[k]) { return; }
      }
    }

    // once removal happens BEFORE invocation so a throwing handler still
    // gets removed and so re-entrant `on` calls during the handler see
    // the post-removal state.
    if (entry.once) { this._unsubscribe_entry(set, entry); }

    try {
      entry.handler(detail);
    } catch (err) {
      if (name === 'error' || this._firing_error) {
        // surface to stderr as a last resort but never recurse;
        // `console` is in the JS standard library and present in every
        // supported runtime, so guarding it would just add an untestable
        // branch.  See #638.
        // eslint-disable-next-line no-console
        console.error(err);
      } else {
        this._firing_error = true;
        try {
          this._fire('error', {
            error         : err,
            source_event  : name,
            source_detail : detail,
            handler       : entry.handler as unknown as Function
          });
        } finally {
          this._firing_error = false;
        }
      }
    }
  }



  /**
   *  Dispatch an event to every registered subscriber in registration
   *  order.  Filters are checked first; non-matching handlers are skipped
   *  without invoking the handler.  Exceptions thrown by a handler are
   *  caught and re-emitted as an `error` event so subsequent handlers
   *  still run.
   *
   *  Re-entry into the `error` event itself is guarded — if an `error`
   *  handler throws, the new exception is swallowed rather than rebroadcast
   *  to avoid an infinite loop.
   *
   *  When exactly one subscriber is registered the common case avoids the
   *  `Array.from(set)` snapshot allocation by capturing the lone entry into a
   *  local first — equivalent to a 1-element snapshot but allocation-free.
   *  The general path still snapshots for re-entrancy safety.
   *
   *  @internal
   */
  _fire<Ev extends JssmEventName>(name: Ev, detail: JssmEventDetailMap<mDT>[Ev]): void {

    const set = this._event_handlers.get(name);
    if (set === undefined || set.size === 0) { return; }

    // Fast-path: single subscriber — capture entry before invoking so that
    // even if the handler mutates `set` (via off/once auto-removal) we hold a
    // stable reference.  Behaviorally identical to a 1-element snapshot.
    if (set.size === 1) {
      const only = set.values().next().value as JssmEventEntry<mDT, Ev>;
      this._fire_one(only, set, name, detail);
      return;
    }

    // General path: snapshot so handlers can `off()` mid-loop without
    // disturbing iteration.
    const entries = Array.from(set);
    for (const entry of entries) {
      this._fire_one(entry, set, name, detail);
    }
  }



  /** Low-level hook registration.  Installs a handler described by a
   *  {@link HookDescription} into the appropriate internal map.  Prefer the
   *  convenience wrappers ({@link hook}, {@link hook_entry}, etc.) over
   *  calling this directly.
   *  @param HookDesc - A hook descriptor specifying kind, states, and handler.
   */
  set_hook(HookDesc: HookDescription<mDT>) {

    switch (HookDesc.kind) {

      case 'hook': {
        // Numeric pair key (#729).  intern() rather than id_of(): a hook may
        // name a state the machine doesn't have — it gets an id no live state
        // can match, so it registers silently and never fires, as before.
        this._hooks.set(
          pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to)),
          HookDesc.handler,
        );
        this._has_hooks       = true;
        this._has_basic_hooks = true;
        break;
      }

      case 'named': {
        // Numeric pair key, then action id; the per-pair action map stays a
        // map because the action interner may keep growing (#729).
        const pk = pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to));
        let inner = this._named_hooks.get(pk);
        if (inner === undefined) {
          inner = new Map();
          this._named_hooks.set(pk, inner);
        }
        inner.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
        this._has_hooks       = true;
        this._has_named_hooks = true;
        break;
      }

      case 'global action':
        this._global_action_hooks.set( this._action_interner.intern(HookDesc.action), HookDesc.handler );
        this._has_hooks               = true;
        this._has_global_action_hooks = true;
        break;

      case 'any action':
        this._any_action_hook = HookDesc.handler;
        this._has_hooks = true;
        break;

      case 'standard transition':
        this._standard_transition_hook = HookDesc.handler;
        this._has_transition_hooks     = true;
        this._has_hooks                = true;
        break;

      case 'main transition':
        this._main_transition_hook = HookDesc.handler;
        this._has_transition_hooks = true;
        this._has_hooks            = true;
        break;

      case 'forced transition':
        this._forced_transition_hook = HookDesc.handler;
        this._has_transition_hooks   = true;
        this._has_hooks              = true;
        break;

      case 'any transition':
        this._any_transition_hook = HookDesc.handler;
        this._has_hooks = true;
        break;

      case 'entry':
        this._entry_hooks.set( this._state_interner.intern(HookDesc.to), HookDesc.handler );
        this._has_hooks       = true;
        this._has_entry_hooks = true;
        break;

      case 'exit':
        this._exit_hooks.set( this._state_interner.intern(HookDesc.from), HookDesc.handler );
        this._has_hooks      = true;
        this._has_exit_hooks = true;
        break;

      case 'after':
        this._after_hooks.set( HookDesc.from, HookDesc.handler );
        this._has_hooks       = true;
        this._has_after_hooks = true;
        break;


      case 'post hook': {
        // Numeric pair key; same rationale as 'hook' (#729).
        this._post_hooks.set(
          pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to)),
          HookDesc.handler,
        );
        this._has_post_hooks       = true;
        this._has_post_basic_hooks = true;
        break;
      }

      case 'post named': {
        // Numeric pair key, then action id; same rationale as 'named' (#729).
        const pk = pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to));
        let inner = this._post_named_hooks.get(pk);
        if (inner === undefined) {
          inner = new Map();
          this._post_named_hooks.set(pk, inner);
        }
        inner.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
        this._has_post_hooks       = true;
        this._has_post_named_hooks = true;
        break;
      }

      case 'post global action':
        this._post_global_action_hooks.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
        this._has_post_hooks               = true;
        this._has_post_global_action_hooks = true;
        break;

      case 'post any action':
        this._post_any_action_hook = HookDesc.handler;
        this._has_post_hooks       = true;
        break;

      case 'post standard transition':
        this._post_standard_transition_hook = HookDesc.handler;
        this._has_post_transition_hooks     = true;
        this._has_post_hooks                = true;
        break;

      case 'post main transition':
        this._post_main_transition_hook = HookDesc.handler;
        this._has_post_transition_hooks = true;
        this._has_post_hooks            = true;
        break;

      case 'post forced transition':
        this._post_forced_transition_hook = HookDesc.handler;
        this._has_post_transition_hooks   = true;
        this._has_post_hooks              = true;
        break;

      case 'post any transition':
        this._post_any_transition_hook = HookDesc.handler;
        this._has_post_hooks           = true;
        break;

      case 'post entry':
        this._post_entry_hooks.set(this._state_interner.intern(HookDesc.to), HookDesc.handler);
        this._has_post_entry_hooks = true;
        this._has_post_hooks       = true;
        break;

      case 'post exit':
        this._post_exit_hooks.set(this._state_interner.intern(HookDesc.from), HookDesc.handler);
        this._has_post_exit_hooks = true;
        this._has_post_hooks      = true;
        break;

      case 'pre everything':
        this._pre_everything_hook = HookDesc.handler;
        this._has_hooks           = true;
        break;

      case 'everything':
        this._everything_hook = HookDesc.handler;
        this._has_hooks       = true;
        break;

      case 'pre post everything':
        this._pre_post_everything_hook = HookDesc.handler;
        this._has_post_hooks           = true;
        break;

      case 'post everything':
        this._post_everything_hook = HookDesc.handler;
        this._has_post_hooks       = true;
        break;


      default:
        throw new JssmError(this, `Unknown hook type ${(HookDesc as any).kind}, should be impossible`);

    }

    // fire the registration event for inspector tools (#638)
    this._fire('hook-registration', { description: HookDesc });
  }



  /**
   *  Remove a previously-registered hook described by a
   *  {@link HookDescription}.  Match is by `kind` + identifying keys
   *  (`from`/`to`/`action`/etc.), not by handler reference — there is one
   *  hook per slot in the registry, so the description uniquely identifies
   *  which one to clear.  Fires a `hook-removal` event for inspector tools.
   *
   *  This is the symmetric counterpart of {@link Machine.set_hook} for the
   *  event-bridging use case (#638).  Reasoning about hooks via observation
   *  events requires being able to observe their disappearance too.
   *
   *  ```typescript
   *  const m = sm`a -> b;`;
   *  const fn = () => true;
   *  m.set_hook({ kind: 'hook', from: 'a', to: 'b', handler: fn });
   *  m.remove_hook({ kind: 'hook', from: 'a', to: 'b', handler: fn });
   *  ```
   *
   *  @param HookDesc - A hook descriptor identifying the hook to remove.
   *  @returns `true` if a hook was removed, `false` otherwise.
   */
  remove_hook(HookDesc: HookDescription<mDT>): boolean {

    let removed = false;

    switch (HookDesc.kind) {

      case 'hook': {
        // id_of, not intern: removal of an unknown name reports false and
        // must not grow the interner tables (#729).
        const fid = this._state_interner.id_of(HookDesc.from),
              tid = this._state_interner.id_of(HookDesc.to);
        removed = (fid !== undefined) && (tid !== undefined) && this._hooks.delete(pair_key(fid, tid));
        break;
      }

      case 'named': {
        const fid = this._state_interner.id_of(HookDesc.from),
              tid = this._state_interner.id_of(HookDesc.to),
              aid = this._action_interner.id_of(HookDesc.action);
        const inner = ((fid === undefined) || (tid === undefined)) ? undefined : this._named_hooks.get(pair_key(fid, tid));
        removed = (inner !== undefined) && (aid !== undefined) && inner.delete(aid);
        break;
      }

      case 'global action': {
        const aid = this._action_interner.id_of(HookDesc.action);
        removed = (aid !== undefined) && this._global_action_hooks.delete(aid);
        break;
      }

      case 'any action':
        if (this._any_action_hook !== undefined) { this._any_action_hook = undefined; removed = true; }
        break;

      case 'standard transition':
        if (this._standard_transition_hook !== undefined) { this._standard_transition_hook = undefined; removed = true; }
        break;

      case 'main transition':
        if (this._main_transition_hook !== undefined) { this._main_transition_hook = undefined; removed = true; }
        break;

      case 'forced transition':
        if (this._forced_transition_hook !== undefined) { this._forced_transition_hook = undefined; removed = true; }
        break;

      case 'any transition':
        if (this._any_transition_hook !== undefined) { this._any_transition_hook = undefined; removed = true; }
        break;

      case 'entry': {
        const tid = this._state_interner.id_of(HookDesc.to);
        removed = (tid !== undefined) && this._entry_hooks.delete(tid);
        break;
      }

      case 'exit': {
        const fid = this._state_interner.id_of(HookDesc.from);
        removed = (fid !== undefined) && this._exit_hooks.delete(fid);
        break;
      }

      case 'after':
        removed = this._after_hooks.delete(HookDesc.from);
        break;

      case 'post hook': {
        const fid = this._state_interner.id_of(HookDesc.from),
              tid = this._state_interner.id_of(HookDesc.to);
        removed = (fid !== undefined) && (tid !== undefined) && this._post_hooks.delete(pair_key(fid, tid));
        break;
      }

      case 'post named': {
        const fid = this._state_interner.id_of(HookDesc.from),
              tid = this._state_interner.id_of(HookDesc.to),
              aid = this._action_interner.id_of(HookDesc.action);
        const inner = ((fid === undefined) || (tid === undefined)) ? undefined : this._post_named_hooks.get(pair_key(fid, tid));
        removed = (inner !== undefined) && (aid !== undefined) && inner.delete(aid);
        break;
      }

      case 'post global action': {
        const aid = this._action_interner.id_of(HookDesc.action);
        removed = (aid !== undefined) && this._post_global_action_hooks.delete(aid);
        break;
      }

      case 'post any action':
        if (this._post_any_action_hook !== undefined) { this._post_any_action_hook = undefined; removed = true; }
        break;

      case 'post standard transition':
        if (this._post_standard_transition_hook !== undefined) { this._post_standard_transition_hook = undefined; removed = true; }
        break;

      case 'post main transition':
        if (this._post_main_transition_hook !== undefined) { this._post_main_transition_hook = undefined; removed = true; }
        break;

      case 'post forced transition':
        if (this._post_forced_transition_hook !== undefined) { this._post_forced_transition_hook = undefined; removed = true; }
        break;

      case 'post any transition':
        if (this._post_any_transition_hook !== undefined) { this._post_any_transition_hook = undefined; removed = true; }
        break;

      case 'post entry': {
        const tid = this._state_interner.id_of(HookDesc.to);
        removed = (tid !== undefined) && this._post_entry_hooks.delete(tid);
        break;
      }

      case 'post exit': {
        const fid = this._state_interner.id_of(HookDesc.from);
        removed = (fid !== undefined) && this._post_exit_hooks.delete(fid);
        break;
      }

      case 'pre everything':
        if (this._pre_everything_hook !== undefined) { this._pre_everything_hook = undefined; removed = true; }
        break;

      case 'everything':
        if (this._everything_hook !== undefined) { this._everything_hook = undefined; removed = true; }
        break;

      case 'pre post everything':
        if (this._pre_post_everything_hook !== undefined) { this._pre_post_everything_hook = undefined; removed = true; }
        break;

      case 'post everything':
        if (this._post_everything_hook !== undefined) { this._post_everything_hook = undefined; removed = true; }
        break;

      default:
        throw new JssmError(this, `Unknown hook type ${(HookDesc as any).kind}, should be impossible`);

    }

    if (removed) {
      this._fire('hook-removal', { description: HookDesc });
    }

    return removed;
  }



  /** Register a pre-transition hook on a specific edge.  Fires before
   *  transitioning from `from` to `to`.  If the handler returns `false`, the
   *  transition is blocked.
   *
   *  ```typescript
   *  const m = sm`a -> b -> c;`;
   *  m.hook('a', 'b', () => console.log('a->b'));
   *  ```
   *
   *  @param from    - Source state name.
   *  @param to      - Target state name.
   *  @param handler - Callback invoked before the transition.
   *  @returns `this` for chaining.
   */
  hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'hook', from, to, handler });
    return this;

  }



  /** Register a pre-transition hook on a specific action-labeled edge.
   *  @param from    - Source state name.
   *  @param to      - Target state name.
   *  @param action  - The action label that triggers this hook.
   *  @param handler - Callback invoked before the transition.
   *  @returns `this` for chaining.
   */
  hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'named', from, to, action, handler });
    return this;

  }



  /** Register a pre-transition hook on any edge triggered by a specific action.
   *  @param action  - The action name to hook.
   *  @param handler - Callback invoked before any transition with this action.
   *  @returns `this` for chaining.
   */
  hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'global action', action, handler });
    return this;

  }



  /** Register a pre-transition hook on any action-driven transition.
   *  @param handler - Callback invoked before any action transition.
   *  @returns `this` for chaining.
   */
  hook_any_action(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'any action', handler });
    return this;

  }



  /** Register a pre-transition hook on any standard (`->`) transition.
   *  @param handler - Callback invoked before any legal transition.
   *  @returns `this` for chaining.
   */
  hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'standard transition', handler });
    return this;

  }



  /** Register a pre-transition hook on any main-path (`=>`) transition.
   *  @param handler - Callback invoked before any main transition.
   *  @returns `this` for chaining.
   */
  hook_main_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'main transition', handler });
    return this;

  }



  /** Register a pre-transition hook on any forced (`~>`) transition.
   *  @param handler - Callback invoked before any forced transition.
   *  @returns `this` for chaining.
   */
  hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'forced transition', handler });
    return this;

  }



  /** Register a pre-transition hook on any transition regardless of kind.
   *  @param handler - Callback invoked before every transition.
   *  @returns `this` for chaining.
   */
  hook_any_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'any transition', handler });
    return this;

  }



  /** Register a hook that fires when entering a specific state.
   *  @param to      - The state being entered.
   *  @param handler - Callback invoked on entry.
   *  @returns `this` for chaining.
   */
  hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'entry', to, handler });
    return this;

  }



  /** Register a hook that fires when leaving a specific state.
   *  @param from    - The state being exited.
   *  @param handler - Callback invoked on exit.
   *  @returns `this` for chaining.
   */
  hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'exit', from, handler });
    return this;

  }



  /** Register a hook that fires when a state's `after` timer elapses — the
   *  delay-over companion to `a after 5s -> b;` style time transitions.  It
   *  does NOT fire when the state is entered or left by ordinary dispatch;
   *  use {@link hook_entry} / {@link hook_exit} for those.  (Versions through
   *  5.143.28 also spuriously fired it on entering the state, the jssm side
   *  of StoneCypher/fsl#1327.)
   *  @param from    - The state whose `after` timer is being watched.
   *  @param handler - Callback invoked when the timer fires, just before the
   *                   timed transition is taken; informational — its outcome
   *                   cannot reject the transition.
   *  @returns `this` for chaining.
   *
   *  @example
   *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
   *    let calls = 0;
   *    m.hook_after('a', () => { calls += 1; });
   *    m.go('c');
   *    m.go('a');
   *    // ordinary dispatch never fires it; only the timer elapsing does:
   *    calls;  // => 0
   *    m.clear_state_timeout();
   *
   *  @see hook_entry
   *  @see hook_exit
   *  @see set_state_timeout
   */
  hook_after(from: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'after', from, handler });
    return this;

  }





  /** Post-transition hook on a specific edge.  Fires after the transition
   *  from `from` to `to` has completed.  Cannot block the transition.
   *  @param from    - Source state name.
   *  @param to      - Target state name.
   *  @param handler - Callback invoked after the transition.
   *  @returns `this` for chaining.
   */
  post_hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post hook', from, to, handler });
    return this;

  }



  /** Post-transition hook on a specific action-labeled edge.
   *  @param from    - Source state name.
   *  @param to      - Target state name.
   *  @param action  - The action label.
   *  @param handler - Callback invoked after the transition.
   *  @returns `this` for chaining.
   */
  post_hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post named', from, to, action, handler });
    return this;

  }



  /** Post-transition hook on any edge triggered by a specific action.
   *  @param action  - The action name.
   *  @param handler - Callback invoked after any transition with this action.
   *  @returns `this` for chaining.
   */
  post_hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post global action', action, handler });
    return this;

  }



  /** Post-transition hook on any action-driven transition.
   *  @param handler - Callback invoked after any action transition.
   *  @returns `this` for chaining.
   */
  post_hook_any_action(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post any action', handler });
    return this;

  }



  /** Post-transition hook on any standard (`->`) transition.
   *  @param handler - Callback invoked after any legal transition.
   *  @returns `this` for chaining.
   */
  post_hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post standard transition', handler });
    return this;

  }



  /** Post-transition hook on any main-path (`=>`) transition.
   *  @param handler - Callback invoked after any main transition.
   *  @returns `this` for chaining.
   */
  post_hook_main_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post main transition', handler });
    return this;

  }



  /** Post-transition hook on any forced (`~>`) transition.
   *  @param handler - Callback invoked after any forced transition.
   *  @returns `this` for chaining.
   */
  post_hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post forced transition', handler });
    return this;

  }



  /** Post-transition hook on any transition regardless of kind.
   *  @param handler - Callback invoked after every transition.
   *  @returns `this` for chaining.
   */
  post_hook_any_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post any transition', handler });
    return this;

  }



  /** Post-transition hook that fires after entering a specific state.
   *  @param to      - The state that was entered.
   *  @param handler - Callback invoked after entry.
   *  @returns `this` for chaining.
   */
  post_hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post entry', to, handler });
    return this;

  }



  /** Post-transition hook that fires after leaving a specific state.
   *  @param from    - The state that was exited.
   *  @param handler - Callback invoked after exit.
   *  @returns `this` for chaining.
   */
  post_hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post exit', from, handler });
    return this;

  }



  /** Register a pre-transition hook that fires **before** all other pre-hooks
   *  on every transition.  If the handler returns `false`, the transition is
   *  blocked.  The handler receives an {@link EverythingHookContext} whose
   *  `hook_name` is `'pre everything'`.
   *
   *  ```typescript
   *  const m = sm`a -> b -> c;`;
   *  m.hook_pre_everything(({ hook_name }) => {
   *    console.log(`${hook_name} fired`);
   *    return true;
   *  });
   *  ```
   *
   *  @param handler - Callback invoked before all other pre-hooks.
   *  @returns `this` for chaining.
   */
  hook_pre_everything(handler: EverythingHookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'pre everything', handler });
    return this;

  }



  /** Register a pre-transition hook that fires **after** all other pre-hooks
   *  on every transition.  If the handler returns `false`, the transition is
   *  blocked.  The handler receives an {@link EverythingHookContext} whose
   *  `hook_name` is `'everything'`.
   *
   *  ```typescript
   *  const m = sm`a -> b -> c;`;
   *  m.hook_everything(({ hook_name }) => {
   *    console.log(`${hook_name} fired`);
   *    return true;
   *  });
   *  ```
   *
   *  @param handler - Callback invoked after all other pre-hooks.
   *  @returns `this` for chaining.
   */
  hook_everything(handler: EverythingHookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'everything', handler });
    return this;

  }



  /** Register a post-transition hook that fires **after** all other
   *  post-hooks on every transition.  Cannot block the transition.  The
   *  handler receives an {@link EverythingHookContext} whose `hook_name` is
   *  `'post everything'`.
   *
   *  ```typescript
   *  const m = sm`a -> b -> c;`;
   *  m.hook_post_everything(({ hook_name }) => {
   *    console.log(`${hook_name} fired`);
   *  });
   *  ```
   *
   *  @param handler - Callback invoked after all other post-hooks.
   *  @returns `this` for chaining.
   */
  hook_post_everything(handler: PostEverythingHookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post everything', handler });
    return this;

  }



  /** Register a post-transition hook that fires **before** all other
   *  post-hooks on every transition.  Cannot block the transition.  The
   *  handler receives an {@link EverythingHookContext} whose `hook_name` is
   *  `'pre post everything'`.
   *
   *  ```typescript
   *  const m = sm`a -> b -> c;`;
   *  m.hook_pre_post_everything(({ hook_name }) => {
   *    console.log(`${hook_name} fired`);
   *  });
   *  ```
   *
   *  @param handler - Callback invoked before all other post-hooks.
   *  @returns `this` for chaining.
   */
  hook_pre_post_everything(handler: PostEverythingHookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'pre post everything', handler });
    return this;

  }





  /** Get the current RNG seed used for probabilistic transitions.
   *  @returns The numeric seed value.
   */
  get rng_seed(): number {
    return this._rng_seed;
  }

  /** Set the RNG seed.  Pass `undefined` to reseed from the current time.
   *  Resets the internal PRNG so subsequent probabilistic operations use the
   *  new seed.
   *  @param to - The seed value, or `undefined` for time-based seeding.
   */
  set rng_seed(to: number | undefined) {

    if (typeof to === 'undefined') {
      this._rng_seed = new Date().getTime();
    } else {
      this._rng_seed = to;
    }

    this._rng = gen_splitmix32(this._rng_seed);

  }





  // remove_hook(HookDesc: HookDescription) {
  //   throw new JssmError(this, 'TODO: Should remove hook here');
  // }



  /** Get all edges between two states (there can be multiple with
   *  different actions).
   *  @param from - Source state name.
   *  @param to   - Target state name.
   *  @returns An array of matching {@link JssmTransition} objects.
   */
  edges_between(from: string, to: string): JssmTransition<StateType, mDT>[] {
    // Filter only this state's outbound edges instead of the full _edges array.
    // For machines with E total edges and average out-degree d, this is O(d)
    // instead of O(E) — a large win on dense graphs where d << E.  The `?? []`
    // covers from-states that have no outgoing edges (terminal states) and
    // states that don't exist at all, both of which return [] without iterating.
    const outbound: Array<number> = this._outbound_edge_ids.get(from) ?? [];
    const result: JssmTransition<StateType, mDT>[] = [];
    for (const edgeId of outbound) {
      const edge: JssmTransition<StateType, mDT> = this._edges[edgeId];
      if (edge.to === to) { result.push(edge); }
    }
    return result;
  }



  /*********
   *
   *  Replace the current state and data with no regard to the graph.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const machine = sm`a -> b -> c;`;
   *  console.log( machine.state() );    // 'a'
   *
   *  machine.go('b');
   *  machine.go('c');
   *  console.log( machine.state() );    // 'c'
   *
   *  machine.override('a');
   *  console.log( machine.state() );    // 'a'
   *  ```
   *
   */

  override(newState: StateType, newData?: mDT | undefined) {

    if (this.allows_override) {

      if (this._states.has(newState)) {
        const fromState = this._state;
        const oldData   = this._data;
        this._state    = newState;
        this._state_id = this._state_interner.intern(newState);
        this._data  = newData;
        this._fire('override', {
          from     : fromState,
          to       : newState,
          old_data : oldData,
          new_data : newData
        });
        if (oldData !== newData) {
          this._fire('data-change', {
            from     : fromState,
            to       : newState,
            old_data : oldData,
            new_data : newData,
            cause    : 'override'
          });
        }
        // An override is still a real state change that may cross group/state
        // boundaries, so its boundary-hook actions fire too (depth-bounded).
        this._fire_boundary_actions(fromState, newState);
      } else {
        throw new JssmError(this, `Cannot override state to "${newState}", a state that does not exist`);
      }

    } else {
      throw new JssmError(this, "Code specifies no override, but config tries to permit; config may not be less strict than code");
    }

  }



  /*********
   *
   *  Fire a `'rejection'` event caused by a hook vetoing a pending transition.
   *  Extracted from the per-call closures inside {@link transition_impl} so
   *  that it is allocated once at class-definition time rather than on every
   *  hooked transition.
   *
   *  @param hook_name  Name of the hook that rejected (e.g. `'exit'`).
   *  @param fromState  State the machine was in when the transition was
   *    attempted; used as the `from` field of the rejection event.
   *  @param newState   State that would have been entered had the hook
   *    passed; used as the `to` field of the rejection event.
   *  @param fromAction Action name when the transition was initiated by an
   *    action call; `undefined` for plain state transitions.
   *  @param oldData    Machine data at the moment the transition was
   *    attempted, before any hook mutations.
   *  @param newData    The `next_data` value passed to the transition call.
   *  @param wasForced  Whether the transition was attempted via
   *    `force_transition`.
   *
   *  @see transition_impl
   *  @see _fire
   *
   *  @internal
   *
   */

  _fire_hook_rejection(
    hook_name : string,
    fromState : StateType,
    newState  : StateType,
    fromAction: StateType | undefined,
    oldData   : mDT,
    newData   : mDT | undefined,
    wasForced : boolean
  ): void {
    this._fire('rejection', {
      from      : fromState,
      to        : newState,
      action    : fromAction,
      data      : oldData,
      next_data : newData,
      reason    : 'hook',
      hook_name,
      forced    : wasForced
    });
  }



  /*********
   *
   *  Fire the FSL boundary-hook actions for a single, already-committed state
   *  change.  In FSL, `do` is a synonym for `action`, so `on enter &g do 'X';`
   *  means "when the machine crosses INTO group `g`, dispatch machine action
   *  `X`" — and likewise `on exit` / plain-state subjects.  This is the runtime
   *  that fires those parked hooks.
   *
   *  Crossing semantics (statechart convention — exits before enters):
   *
   *  1. `prev_groups` / `next_groups` are the deep (transitive) group sets of
   *     the old and new states, from `_state_to_groups`.
   *  2. **Exits** fire first: every group in `prev_groups \ next_groups` with an
   *     `onExit`, plus the plain `prev_state`'s `onExit` (when the state name
   *     actually changed).
   *  3. **Enters** fire next: every group in `next_groups \ prev_groups` with an
   *     `onEnter`, plus the plain `next_state`'s `onEnter` (when the state name
   *     changed).
   *  4. A group present in BOTH sets is a transition *within* that group and
   *     fires neither of its boundary hooks.  `prev_state === next_state` fires
   *     nothing at all.
   *  5. "Fire its action" is `this.action(label)`.  If that action is not valid
   *     from the current state, `action` is a safe no-op (returns `false`) — an
   *     inapplicable boundary action never throws.
   *  6. Multi-membership and nesting both fan out naturally: a state in groups
   *     A and B fires both; crossing an inner and an outer boundary fires both
   *     levels.
   *
   *  Because firing an action can drive a further transition (which crosses
   *  more boundaries, which fires more actions), this is a bounded
   *  run-to-completion: `_boundary_depth` tracks the live cascade depth and a
   *  cascade deeper than `_boundary_depth_limit` throws a {@link JssmError}
   *  rather than overflowing the stack or hanging.  The limit defaults to 100
   *  and is configurable via the `boundary_depth_limit` constructor option.
   *
   *  @param prev_state The state the machine was in before this commit.
   *  @param next_state The state the machine is in now (already committed).
   *
   *  @throws {JssmError} If cascaded boundary firing exceeds `_boundary_depth_limit`
   *    (a probable infinite loop).
   *
   *  @see action
   *  @see transition_impl
   *
   *  @internal
   *
   */

  _fire_boundary_actions(prev_state: StateType, next_state: StateType): void {

    // Nothing crosses a boundary when the state name is unchanged.
    if (prev_state === next_state) { return; }

    // Skip entirely for machines that declared no boundary hooks at all — the
    // overwhelming common case, and it keeps the hot transition path free of
    // set arithmetic.
    if (this._group_hooks.size === 0 && this._state_hooks.size === 0) { return; }

    if (this._boundary_depth >= this._boundary_depth_limit) {
      throw new JssmError(
        this,
        `boundary-hook action cascade exceeded depth limit (${this._boundary_depth_limit}) `
          + `crossing from ${JSON.stringify(prev_state)} to ${JSON.stringify(next_state)} `
          + `(possible infinite loop)`
      );
    }

    const prev_groups: Set<string> = this._state_to_groups.get(prev_state) ?? new Set();
    const next_groups: Set<string> = this._state_to_groups.get(next_state) ?? new Set();

    // The labels to dispatch, gathered before any firing so that re-entrant
    // transitions caused by an early action cannot perturb which boundaries the
    // *current* crossing fires.  Exits precede enters (statechart convention).
    const labels: string[] = [];

    // Exits: groups left (in prev but not next), then the plain prev state.
    for (const group of prev_groups) {
      if (!next_groups.has(group)) {
        const label: string | undefined = this._group_hooks.get(group)?.onExit;
        if (label !== undefined) { labels.push(label); }
      }
    }
    const prev_state_exit: string | undefined = this._state_hooks.get(prev_state)?.onExit;
    if (prev_state_exit !== undefined) { labels.push(prev_state_exit); }

    // Enters: groups entered (in next but not prev), then the plain next state.
    for (const group of next_groups) {
      if (!prev_groups.has(group)) {
        const label: string | undefined = this._group_hooks.get(group)?.onEnter;
        if (label !== undefined) { labels.push(label); }
      }
    }
    const next_state_enter: string | undefined = this._state_hooks.get(next_state)?.onEnter;
    if (next_state_enter !== undefined) { labels.push(next_state_enter); }

    if (labels.length === 0) { return; }

    // Each dispatched action re-enters transition_impl, which (on success) calls
    // back here for the boundary it just crossed.  The depth counter brackets
    // the whole fan-out so a self-perpetuating cascade is bounded, not infinite.
    this._boundary_depth += 1;
    try {
      for (const label of labels) {
        this.action(label);   // safe no-op (returns false) if inapplicable here
      }
    } finally {
      this._boundary_depth -= 1;
    }

  }



  /*********
   *
   *  Shared transition core used by {@link transition}, {@link force_transition},
   *  and {@link action}.  Runs validation, fires the full hook pipeline (pre-
   *  everything, any-action, after, any-transition, exit, named, basic,
   *  edge-type, entry, everything), commits the new state if nothing
   *  rejected, and returns whether the transition succeeded.
   *
   *  Not meant for external use.  Call one of the public wrappers instead:
   *  - `transition` for an ordinary legal transition
   *  - `force_transition` to bypass the legality check
   *  - `action` to dispatch by action name rather than target state
   *
   *  @remarks
   *  Known sharp edges, carried over from the original `// TODO` comments:
   *  - The forced-ness behavior needs to be cleaned up a lot here.
   *  - The callbacks are not fully correct across the forced / action / plain
   *    cases and should be revisited.
   *  - When multiple edges exist between two states with different `kind`
   *    values, only the first edge's kind is used to pick the edge-type hook.
   *
   *  @typeparam mDT The type of the machine data member; usually omitted.
   *
   *  @param newStateOrAction The target state name (for a plain or forced
   *  transition) or the action name (when `wasAction` is true).
   *
   *  @param newData Optional replacement machine data to install alongside
   *  the transition.  Hooks may further override this via complex results.
   *
   *  @param wasForced `true` if the caller invoked `force_transition`, in
   *  which case legality is checked against `valid_force_transition` rather
   *  than `valid_transition`.
   *
   *  @param wasAction `true` if the caller invoked `action`, in which case
   *  `newStateOrAction` is an action name and the target state is looked up
   *  via the current action edge.
   *
   *  @returns `true` if the transition was valid and every hook passed;
   *  `false` if the transition was invalid or any hook rejected.
   *
   *  @internal
   *
   */

  transition_impl(newStateOrAction: StateType, newData: mDT | undefined, wasForced: boolean, wasAction: boolean): boolean {


    let valid      : boolean               = false,
        trans_type : string,
        newState   : StateType,
        newStateId : number                = NaN,
        actionId   : number                = NaN,
        fromAction : StateType | undefined = undefined;

    if (wasForced) {
      // numeric inline of valid_force_transition: any existing edge
      // qualifies, forced or not.  one string probe (the user's target name)
      // plus one numeric probe, replacing two string probes.
      const to_id  = this._state_interner.id_of(newStateOrAction);
      const edgeId = (to_id === undefined) ? undefined : this._edge_id_by_pair.get(pair_key(this._state_id, to_id));
      if (edgeId !== undefined) {
        valid      = true;
        trans_type = 'forced';
        newState   = newStateOrAction;
        newStateId = to_id;
      }

    } else if (wasAction) {
      // single numeric resolution: the old path looked the action up twice,
      // once inside valid_action and again inside current_action_edge_for.
      // aid is captured for the numeric hook probes below (#729).
      const aid    = this._action_interner.id_of(newStateOrAction);
      const edgeId = (aid === undefined) ? undefined : this._edge_id_by_action_pair.get(pair_key(aid, this._state_id));
      if (edgeId !== undefined) {
        const edge: JssmTransition<StateType, mDT> = this._edges[edgeId];
        valid      = true;
        trans_type = edge.kind;
        newState   = edge.to;
        newStateId = this._edge_to_ids[edgeId];
        fromAction = newStateOrAction;
        actionId   = aid;
      }

    } else {
      // numeric inline of valid_transition: the edge must exist and must not
      // be forced_only (truthiness, matching the old refusal exactly)
      const to_id  = this._state_interner.id_of(newStateOrAction);
      const edgeId = (to_id === undefined) ? undefined : this._edge_id_by_pair.get(pair_key(this._state_id, to_id));
      if ((edgeId !== undefined) && (!(this._edges[edgeId].forced_only))) {
        if (this._has_transition_hooks || this._has_post_transition_hooks) {
          // first matching outbound edge's kind, without building the result
          // array edges_between allocated here on every hooked transition.
          // First-match semantics are kept deliberately: _edge_map is
          // last-wins for multi-edge (from, to) pairs, so lookup_transition_for
          // could disagree with the old edges_between(...)[0].  #735
          // TODO this won't do the right thing if various edges have different types
          for (const ob_eid of this._outbound_edge_ids.get(this._state)) {
            const ob_edge = this._edges[ob_eid];
            if (ob_edge.to === newStateOrAction) { trans_type = ob_edge.kind; break; }
          }
        }
        valid      = true;
        newState   = newStateOrAction;
        newStateId = to_id;
      }
    }


    // hook_args is read only inside the `_has_hooks` / `_has_post_hooks`
    // blocks below.  Skip building it for hook-free machines (every
    // chain/dense/hub/messy benchmark shape) so the hot path stops allocating
    // a 7-field object it never reads.  The NonNullable cast keeps the type
    // unchanged for all downstream uses without introducing an impossible
    // (uncoverable) branch; the value is only dereferenced under the guards
    // that imply it was built.  #670
    // NOTE (#735): the { ...hook_args, hook_name } spreads at the four
    // everything-hook sites are contractual, not waste — handlers may capture
    // their context, and each captured context must durably carry its own
    // hook_name (pinned by the simultaneous-everything-hook specs).  A shared
    // mutated object cannot satisfy that; do not "optimize" the spreads away.
    const hook_args_obj = (this._has_hooks || this._has_post_hooks)
      ? {
          data       : this._data,
          action     : fromAction,
          from       : this._state,
          to         : newState,
          next_data  : newData,
          forced     : wasForced,
          trans_type
        }
      : undefined;
    const hook_args = hook_args_obj as NonNullable<typeof hook_args_obj>;

    // 'action' event fires when an action is attempted, regardless of whether
    // it ultimately succeeds — matches the issue spec for observation events.
    // Gated on live listener count so we skip the detail-object allocation
    // when nothing is subscribed.  Gate is read at fire time, so a listener
    // registered inside a pre-hook still receives the event.  #671
    if (wasAction) {
      if (this._event_listener_count !== 0) {
        this._fire('action', {
          action    : newStateOrAction,
          from      : this._state,
          to        : newState,
          data      : this._data,
          next_data : newData
        });
      }
    }

    // Captured pre-transition source state so 'data-change' detail and similar
    // events can name where we came from.  fromStateId mirrors it for the
    // numeric post-hook probes: by the time they run, _state_id is already
    // the destination (#729).
    const fromState: StateType   = this._state;
    const fromStateId: number    = this._state_id;
    const oldData: mDT           = this._data;


    if (valid) {

      // once validity is known, clear old 'after' timeout clause.  This must
      // happen for hook-free machines too: leaving it inside the hooks branch
      // let a pending 'after' timer survive a manual transition away, firing a
      // ghost go() later and crashing re-entry to the after-state with
      // "already timing out".
      this.clear_state_timeout();

      if (this._has_hooks) {

        let data_changed = false;

        // 0. pre everything hook (fires before all other pre-hooks)
        if (this._pre_everything_hook !== undefined) {
          const outcome = abstract_everything_hook_step(this._pre_everything_hook, { ...hook_args, hook_name: 'pre everything' });
          if (outcome.pass === false) { this._fire_hook_rejection('pre everything', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }
        }

        if (wasAction) {
          // 1a. any action hook
          const outcome = abstract_hook_step(this._any_action_hook, hook_args);
          if (outcome.pass === false) { this._fire_hook_rejection('any action', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }

          // 1b. global specific action hook
          const outcome2 = abstract_hook_step(this._global_action_hooks.get(actionId), hook_args);
          if (outcome2.pass === false) { this._fire_hook_rejection('global action', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome2)) { data_changed = true; }
        }

        // 2. (removed) After hooks do NOT fire on dispatch.  They are the
        // `after`-timer's companion (fsl#698: "delay over!") and fire only from
        // the state-timeout path.  Through v5.143.28 a probe here keyed on
        // newStateOrAction spuriously fired them on entering the hooked state —
        // or on a same-named action — making one timer elapse read as two
        // handler calls (StoneCypher/fsl#1327).

        // 3. any transition hook
        if (this._any_transition_hook !== undefined) {
          const outcome = abstract_hook_step(this._any_transition_hook, hook_args);
          if (outcome.pass === false) { this._fire_hook_rejection('any transition', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }
        }

        // 4. exit hook
        if (this._has_exit_hooks) {
          const outcome = abstract_hook_step(this._exit_hooks.get(this._state_id), hook_args);
          if (outcome.pass === false) { this._fire_hook_rejection('exit', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }
        }

        // 5. named transition / action hook
        if (this._has_named_hooks) {
          if (wasAction) {

            // Numeric pair probe, then the action id captured at dispatch (#729).
            const byPair = this._named_hooks.get(pair_key(this._state_id, newStateId));
            const nh     = byPair === undefined ? undefined : byPair.get(actionId);
            const outcome = abstract_hook_step(nh, hook_args);

            if (outcome.pass === false) { this._fire_hook_rejection('named', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
            if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }

          }
        }

        // 6. regular hook
        if (this._has_basic_hooks) {

          // Numeric pair probe (#729); one integer hash replaces two string maps.
          const h = this._hooks.get(pair_key(this._state_id, newStateId));
          const outcome = abstract_hook_step(h, hook_args);

          if (outcome.pass === false) { this._fire_hook_rejection('hook', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }

        }

        // 7. edge type hook

        // 7a. standard transition hook
        if (trans_type === 'legal') {
          const outcome = abstract_hook_step(this._standard_transition_hook, hook_args);
          if (outcome.pass === false) { this._fire_hook_rejection('standard transition', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }
        }

        // 7b. main type hook
        if (trans_type === 'main') {
          const outcome = abstract_hook_step(this._main_transition_hook, hook_args);
          if (outcome.pass === false) { this._fire_hook_rejection('main transition', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }
        }

        // 7c. forced transition hook
        if (trans_type === 'forced') {
          const outcome = abstract_hook_step(this._forced_transition_hook, hook_args);
          if (outcome.pass === false) { this._fire_hook_rejection('forced transition', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }
        }

        // 8. entry hook
        if (this._has_entry_hooks) {
          const outcome = abstract_hook_step(this._entry_hooks.get(newStateId), hook_args);
          if (outcome.pass === false) { this._fire_hook_rejection('entry', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }
        }

        // 9. everything hook (fires after all other pre-hooks)
        if (this._everything_hook !== undefined) {
          const outcome = abstract_everything_hook_step(this._everything_hook, { ...hook_args, hook_name: 'everything' });
          if (outcome.pass === false) { this._fire_hook_rejection('everything', fromState, newState, fromAction, oldData, newData, wasForced); return false; }
          if (_update_hook_fields(hook_args, outcome)) { data_changed = true; }
        }

        // all hooks passed!  let's now establish the result

        if (this._history_length) {
          this._history.shove([ this._state, this._data ]);
        }

        this._state    = newState;
        this._state_id = newStateId;

        if (data_changed) {
          this._data = hook_args.data;
        } else if (newData !== undefined) {
          this._data = newData;
        }

        // success fallthrough to posthooks; intentionally no return here
        // look for "posthooks begin here"


      // or without hooks
      } else {

        if (this._history_length) {
          this._history.shove([ this._state, this._data ]);
        }

        this._state    = newState;
        this._state_id = newStateId;

        // TODO known bug: this gives no way to set data to undefined
        //   see https://github.com/StoneCypher/fsl/issues/1264
        if (newData !== undefined) {
          this._data = newData;
        }

        // success fallthrough to posthooks; intentionally no return here
        // look for "posthooks begin here"

      }

    // not valid
    } else {
      // Gated on live listener count so we skip the detail-object allocation
      // when nothing is subscribed.  A listener still receives the event
      // because the gate is read at fire time.  #671
      if (this._event_listener_count !== 0) {
        this._fire('rejection', {
          from      : fromState,
          to        : newStateOrAction,   // we never resolved a real target
          action    : fromAction,
          data      : oldData,
          next_data : newData,
          reason    : 'invalid',
          forced    : wasForced
        });
      }
      return false;
    }

    // posthooks begin here

    if (this._has_post_hooks) {

      // 0. pre post everything hook (fires before all other post-hooks)
      if (this._pre_post_everything_hook !== undefined) {
        this._pre_post_everything_hook({ ...hook_args, hook_name: 'pre post everything' });
      }

      if (wasAction) {
        // 1. any action posthook
        if (this._post_any_action_hook !== undefined) { this._post_any_action_hook(hook_args); }

        // 2. global specific action hook
        const pgah = this._post_global_action_hooks.get(actionId)
        if (pgah !== undefined) { pgah(hook_args); }
      }

      // 3. any transition hook
      if (this._post_any_transition_hook !== undefined) {
        this._post_any_transition_hook(hook_args);
      }

      // 4. exit hook
      if (this._has_post_exit_hooks) {
        const peh = this._post_exit_hooks.get(fromStateId);
        if (peh !== undefined) { peh(hook_args); }
      }

      // 5. named transition / action hook
      if (this._has_post_named_hooks) {
        if (wasAction) {
          // Numeric pair probe, then the action id captured at dispatch (#729).
          const byPair = this._post_named_hooks.get(pair_key(fromStateId, newStateId));
          const pnh    = byPair === undefined ? undefined : byPair.get(actionId);

          if (pnh !== undefined) { pnh(hook_args); }
        }
      }

      // 6. regular hook
      if (this._has_post_basic_hooks) {
        // Numeric pair probe (#729).
        const hook = this._post_hooks.get(pair_key(fromStateId, newStateId));
        if (hook !== undefined) { hook(hook_args); }
      }

      // 7. edge type hook

      // 7a. standard transition hook
      if (trans_type === 'legal') {
        if (this._post_standard_transition_hook !== undefined) {
          this._post_standard_transition_hook(hook_args);
        }
      }

      // 7b. main type hook
      if (trans_type === 'main') {
        if (this._post_main_transition_hook !== undefined) {
          this._post_main_transition_hook(hook_args);
        }
      }

      // 7c. forced transition hook
      if (trans_type === 'forced') {
        if (this._post_forced_transition_hook !== undefined) {
          this._post_forced_transition_hook(hook_args);
        }
      }

      // 8. entry hook
      if (this._has_post_entry_hooks) {
        const hook = this._post_entry_hooks.get(newStateId);
        if (hook !== undefined) { hook(hook_args); }
      }

      // 9. post everything hook (fires after all other post-hooks)
      if (this._post_everything_hook !== undefined) {
        this._post_everything_hook({ ...hook_args, hook_name: 'post everything' });
      }

    }

    // Observation events (#638) fire after the state is committed.  Each call
    // builds a detail literal at the call site, so guard the whole block on a
    // live subscription count: with zero listeners (the common hot-path case,
    // and every benchmark shape) we skip all of these allocations entirely.
    // Read after pre-hooks, so a listener a pre-hook installed is still seen.
    // ('action' above and 'rejection' on the invalid path are intentionally
    // NOT under this gate — they fire regardless, and `_fire` itself no-ops
    // cheaply when that specific event has no subscribers.)  #670
    if (this._event_listener_count !== 0) {
      const newData_after: mDT = this._data;
      this._fire('exit', {
        state  : fromState,
        to     : newState,
        action : fromAction,
        data   : newData_after
      });
      this._fire('transition', {
        from       : fromState,
        to         : newState,
        action     : fromAction,
        data       : newData_after,
        next_data  : newData,
        trans_type,
        forced     : wasForced
      });
      this._fire('entry', {
        state  : newState,
        from   : fromState,
        action : fromAction,
        data   : newData_after
      });
      if (oldData !== newData_after) {
        this._fire('data-change', {
          from     : fromState,
          to       : newState,
          action   : fromAction,
          old_data : oldData,
          new_data : newData_after,
          cause    : 'transition'
        });
      }
      // one state-record fetch answers both checks; newState is known-valid
      // here, and the public state_is_terminal / state_is_complete pair would
      // each redo has_state plus its own map walk.  Same predicates:
      // terminal = no exits, complete = the constructor-set flag.  #735
      const new_state_rec: JssmGenericState = this._states.get(newState);
      if (new_state_rec.to.length === 0) {
        this._fire('terminal', { state: newState, data: newData_after });
      }
      if (new_state_rec.complete) {
        this._fire('complete', { state: newState, data: newData_after });
      }
    }

    // FSL boundary-hook actions (`on enter/exit &g do 'X'`) fire after the
    // state is committed and after the observation events, matching the
    // statechart "exits before enters" convention.  Cascades are depth-bounded
    // inside the helper.
    this._fire_boundary_actions(fromState, newState);

    // possibly re-establish new 'after' clause
    this.auto_set_state_timeout();

    return true;

  }





  /** If the current state has an `after` timeout configured, schedule it.
   *  Called internally after each transition.
   */
  auto_set_state_timeout(): void {

    const after_res = this._after_mapping.get(this._state);
    if (after_res !== undefined) {
      const [ next_state, after_time ] = after_res;
      this.set_state_timeout(next_state, after_time);
    }

  }





  /*********
   *
   *  Get a truncated history of the recent states and data of the machine.
   *  Turned off by default; configure with `.from('...', {data: 5})` by length,
   *  or set `.history_length` at runtime.
   *
   *  History *does not contain the current state*.  If you want that, call
   *  `.history_inclusive` instead.
   *
   *  ```typescript
   *  const foo = jssm.from(
   *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
   *    { history: 3 }
   *  );
   *
   *  foo.action('next');
   *  foo.action('next');
   *  foo.action('next');
   *  foo.action('next');
   *
   *  foo.history;  // [ ['b',undefined], ['c',undefined], ['d',undefined] ]
   *  ```
   *
   *  Notice that the machine's current state, `e`, is not in the returned list.
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   */

  get history() {
    return this._history.toArray();
  }





  /*********
   *
   *  Get a truncated history of the recent states and data of the machine,
   *  including the current state.  Turned off by default; configure with
   *  `.from('...', {data: 5})` by length, or set `.history_length` at runtime.
   *
   *  History inclusive contains the current state.  If you only want past
   *  states, call `.history` instead.
   *
   *  The list returned will be one longer than the history buffer kept, as the
   *  history buffer kept gets the current state added to it to produce this
   *  list.
   *
   *  ```typescript
   *  const foo = jssm.from(
   *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
   *    { history: 3 }
   *  );
   *
   *  foo.action('next');
   *  foo.action('next');
   *  foo.action('next');
   *  foo.action('next');
   *
   *  foo.history_inclusive;  // [ ['b',undefined], ['c',undefined], ['d',undefined], ['e',undefined] ]
   *  ```
   *
   *  Notice that the machine's current state, `e`, is in the returned list.
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   */

  get history_inclusive() {
    const ret = this._history.toArray();
    ret.push([ this.state(), this.data() ]);
    return ret;
  }





  /*********
   *
   *  Find out how long a history this machine is keeping.  Defaults to zero.
   *  Settable directly.
   *
   *  ```typescript
   *  const foo = jssm.from("a -> b;");
   *  foo.history_length;                                  // 0
   *
   *  const bar = jssm.from("a -> b;", { history: 3 });
   *  foo.history_length;                                  // 3
   *  foo.history_length = 5;
   *  foo.history_length;                                  // 5
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   */

  get history_length() {
    return this._history_length;
  }

  set history_length(to: number) {
    this._history_length = to;
    this._history.resize(to, true);
  }





  /********
   *
   *  Instruct the machine to complete an action.  Synonym for {@link do}.
   *
   *  ```typescript
   *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
   *
   *  light.state();               // 'red'
   *  light.action('next');        // true
   *  light.state();               // 'green'
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param actionName The action to engage
   *
   *  @param newData The data change to insert during the action
   *
   *  @returns `true` if the action was valid and the transition occurred,
   *  `false` otherwise.
   *
   */

  action(actionName: StateType, newData?: mDT): boolean {
    return this.transition_impl(actionName, newData, false, true);
  }





  /********
   *
   *  Get the standard style for a single state.  ***Does not*** include
   *  composition from an applied theme, or things from the underlying base
   *  stylesheet; only the modifications applied by this machine.
   *
   *  ```typescript
   *  const light = sm`a -> b;`;
   *  console.log(light.standard_state_style);
   *  // {}
   *
   *  const light = sm`a -> b; state: { shape: circle; };`;
   *  console.log(light.standard_state_style);
   *  // { shape: 'circle' }
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns The {@link JssmStateConfig} for standard states.
   *
   */

  get standard_state_style(): JssmStateConfig {
    return this._state_style;
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
   *  ```typescript
   *  const light = sm`a -> b;`;
   *  console.log(light.hooked_state_style);
   *  // {}
   *
   *  const light = sm`a -> b; hooked_state: { shape: circle; };`;
   *  console.log(light.hooked_state_style);
   *  // { shape: 'circle' }
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns The {@link JssmStateConfig} for hooked states.
   *
   */

  get hooked_state_style(): JssmStateConfig {
    return this._hooked_state_style;
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
   *  ```typescript
   *  const light = sm`a -> b;`;
   *  console.log(light.start_state_style);
   *  // {}
   *
   *  const light = sm`a -> b; start_state: { shape: circle; };`;
   *  console.log(light.start_state_style);
   *  // { shape: 'circle' }
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns The {@link JssmStateConfig} for start states.
   *
   */

  get start_state_style(): JssmStateConfig {
    return this._start_state_style;
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
   *  ```typescript
   *  const light = sm`a -> b;`;
   *  console.log(light.standard_state_style);
   *  // {}
   *
   *  const light = sm`a -> b; end_state: { shape: circle; };`;
   *  console.log(light.standard_state_style);
   *  // { shape: 'circle' }
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns The {@link JssmStateConfig} for end states.
   *
   */

  get end_state_style(): JssmStateConfig {
    return this._end_state_style;
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
   *  ```typescript
   *  const light = sm`a -> b;`;
   *  console.log(light.terminal_state_style);
   *  // {}
   *
   *  const light = sm`a -> b; terminal_state: { shape: circle; };`;
   *  console.log(light.terminal_state_style);
   *  // { shape: 'circle' }
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns The {@link JssmStateConfig} for terminal states.
   *
   */

  get terminal_state_style(): JssmStateConfig {
    return this._terminal_state_style;
  }





  /********
   *
   *  Get the style for the active state.  ***Does not*** include
   *  composition from an applied theme, or things from the underlying base
   *  stylesheet; only the modifications applied by this machine.
   *
   *  ```typescript
   *  const light = sm`a -> b;`;
   *  console.log(light.active_state_style);
   *  // {}
   *
   *  const light = sm`a -> b; active_state: { shape: circle; };`;
   *  console.log(light.active_state_style);
   *  // { shape: 'circle' }
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @returns The {@link JssmStateConfig} for the active state.
   *
   */

  get active_state_style(): JssmStateConfig {
    return this._active_state_style;
  }





  /*
   */

  // TODO COMEBACK IMPLEMENTME FIXME

  // has_hooks(state: StateType): false {
  //   return false;
  // }





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
   *  @returns The resolved {@link JssmBaseTheme} stack, base-most first.
   *
   *  @internal
   *
   */

  _resolved_themes(): JssmBaseTheme[] {

    const themes: JssmBaseTheme[] = [];

    this._themes.forEach(th => {
      const theme_impl = theme_mapping.get(th);
      if (theme_impl !== undefined) {
        themes.push(theme_impl);
      }
    });

    return themes.reverse();

  }




  /********
   *
   *  Reads the condensed per-state style fields (`color`, `shape`, …) out of a
   *  state's declaration into a fresh {@link JssmStateConfig} — the tier-5
   *  "`state foo : { … }`" contribution of the config cascade.  A state with no
   *  declaration yields an all-`undefined` config (which contributes nothing
   *  once folded with {@link merge_state_config}).
   *
   *  @param state The state whose per-state declared style is wanted.
   *
   *  @returns The per-state style config (fields may be `undefined`).
   *
   *  @internal
   *
   */

  _individual_state_config(state: StateType): JssmStateConfig {

    const decl: JssmStateDeclaration = this._state_declarations.get(state);

    return {
      color           : decl?.color,
      textColor       : decl?.textColor,
      borderColor     : decl?.borderColor,
      backgroundColor : decl?.backgroundColor,
      lineStyle       : decl?.lineStyle,
      corners         : decl?.corners,
      shape           : decl?.shape,
      image           : decl?.image,
      url             : decl?.url
    };

  }




  /********
   *
   *  Orders the groups a state belongs to by nesting depth for the config
   *  cascade — outermost first, innermost last — so that, folded in order,
   *  the innermost (nearest / smallest {@link membership_distance}) group's
   *  metadata wins.  Equal-distance groups are ordered by group declaration
   *  order, so a later-declared group of the same depth wins the tie.
   *
   *  Concretely: groups are sorted by descending membership distance (largest
   *  distance applied first / wins least), and for equal distances by
   *  ascending declaration index (later index applied last / wins most).
   *
   *  @param state The state whose containing groups are being ordered.
   *
   *  @returns The containing group names, ordered for outer→inner folding
   *  (the last entry wins).
   *
   *  @internal
   *
   */

  _groups_by_depth(state: StateType): string[] {

    const containing: string[] = [ ...this.groupsOf(state) ];

    if (containing.length < 2) { return containing; }

    return containing.sort((ga: string, gb: string): number => {

      const da: number = membership_distance(this._group_registry, state, ga),
            db: number = membership_distance(this._group_registry, state, gb);

      // Larger distance (more "outer") sorts earlier so it is applied first and
      // overridden by nearer groups.
      if (da !== db) { return db - da; }

      // Equal depth: earlier-declared group sorts earlier (applied first), so
      // the later-declared group of the same depth wins the tie.
      return this._group_order.indexOf(ga) - this._group_order.indexOf(gb);

    });

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
   *  Tiers, folded least-specific → most-specific with {@link merge_state_config}
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
   *    4. group metadata, depth-ordered outer→inner (see {@link _groups_by_depth}),
   *       each group's RAW `{ declarations }` already condensed at construction.
   *    5. the per-state `state foo : { … }` config.
   *
   *  @param state  The state to resolve config for.
   *  @param active Whether to include the active-state theme layers (true only
   *                for the machine's currently-occupied state).
   *
   *  @returns The composited tiers-1–5 {@link JssmStateConfig} for the state.
   *
   *  @internal
   *
   */

  _compose_state_config(state: StateType, active: boolean): JssmStateConfig {

    const themes: JssmBaseTheme[] = this._resolved_themes();

    let acc: JssmStateConfig = {};

    // tier 1 — theme defaults (base, then selected themes)
    acc = merge_state_config(acc, base_theme.state);
    themes.forEach(theme => {
      if (theme.state) { acc = merge_state_config(acc, theme.state); }
    });

    // tier 2 — default_state_config (implicit root over all states)
    acc = merge_state_config(acc, this._state_style);

    // tier 3 — static per-kind defaults, selected by structural kind
    if (this.state_is_terminal(state)) {
      acc = merge_state_config(acc, base_theme.terminal);
      themes.forEach(theme => { if (theme.terminal) { acc = merge_state_config(acc, theme.terminal); } });
      acc = merge_state_config(acc, this._terminal_state_style);
    }

    if (this.is_start_state(state)) {
      acc = merge_state_config(acc, base_theme.start);
      themes.forEach(theme => { if (theme.start) { acc = merge_state_config(acc, theme.start); } });
      acc = merge_state_config(acc, this._start_state_style);
    }

    if (this.is_end_state(state)) {
      acc = merge_state_config(acc, base_theme.end);
      themes.forEach(theme => { if (theme.end) { acc = merge_state_config(acc, theme.end); } });
      acc = merge_state_config(acc, this._end_state_style);
    }

    // tier 3 (active kind) — active-state THEME layers, below per-state so a
    // per-state block still wins (preserving the historical layer order).
    if (active) {
      acc = merge_state_config(acc, base_theme.active);
      themes.forEach(theme => { if (theme.active) { acc = merge_state_config(acc, theme.active); } });
    }

    // tier 4 — group metadata, outer→inner (inner / nearest group wins)
    this._groups_by_depth(state).forEach((group_name: string) => {
      const group_cfg: JssmStateConfig | undefined = this._group_metadata.get(group_name);
      if (group_cfg !== undefined) { acc = merge_state_config(acc, group_cfg); }
    });

    // tier 5 — per-state `state foo : { … }`
    acc = merge_state_config(acc, this._individual_state_config(state));

    return acc;

  }




  /********
   *
   *  Resolves the full unified style/config cascade for a state — the runtime
   *  successor to the ad-hoc layer merge {@link style_for} used to perform.
   *
   *  For any state OTHER than the current one, this returns the memoized static
   *  resolution (tiers 1–5; see {@link _compose_state_config}) — theme →
   *  `default_state_config` → per-kind defaults → depth-ordered group metadata →
   *  per-state config.  The cache is keyed by state and never invalidated, since
   *  those tiers do not depend on which state is current.
   *
   *  For the machine's CURRENTLY-occupied state the result is recomputed each
   *  call (never cached) and additionally carries the dynamic `active_state`
   *  layers: the active-state THEME layers fold in just below the per-state
   *  config (tier 3-active), and the user `active_state : { … }` overlay folds
   *  in LAST (tier 6), on top of everything, so it wins over per-state config.
   *  Every fold uses {@link merge_state_config}, so a key set at a lower tier is
   *  overridden — never rejected — by a higher one.
   *
   *  ```typescript
   *  import { sm } from 'jssm';
   *
   *  const m = sm`&busy : [working]; idle 'go' -> working; state &busy : { color: orange; };`;
   *  m.resolve_state_config('working').color;  // '#ffa500ff' — from group &busy
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param state The state to compute the composite config for.
   *
   *  @returns The fully composited {@link JssmStateConfig} for the state,
   *  including the active overlay when the state is current.
   *
   *  @see style_for
   *
   */

  resolve_state_config(state: StateType): JssmStateConfig {

    // The current state carries the dynamic active layers and is recomputed
    // each call so the overlay tracks transitions; it is never memoized.
    if (this.state() === state) {
      const acc: JssmStateConfig = this._compose_state_config(state, true);
      // tier 6 — user active_state overlay, on top of per-state config.
      return merge_state_config(acc, this._active_state_style);
    }

    // Non-current states: tiers 1–5 only, memoized.
    const cached: JssmStateConfig | undefined = this._static_state_config_cache.get(state);
    if (cached !== undefined) { return cached; }

    const resolved: JssmStateConfig = this._compose_state_config(state, false);
    this._static_state_config_cache.set(state, resolved);
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
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param state The state to compute the composite style for.
   *
   *  @returns The fully composited {@link JssmStateConfig} for the given state.
   *
   *  @see resolve_state_config
   *
   */

  style_for(state: StateType): JssmStateConfig {
    return this.resolve_state_config(state);
  }





  /********
   *
   *  Instruct the machine to complete an action.  Synonym for {@link action}.
   *
   *  ```typescript
   *  const light = sm`
   *    off 'start' -> red;
   *    red 'next' -> green 'next' -> yellow 'next' -> red;
   *    [red yellow green] 'shutdown' ~> off;
   *  `;
   *
   *  light.state();       // 'off'
   *  light.do('start');   // true
   *  light.state();       // 'red'
   *  light.do('next');    // true
   *  light.state();       // 'green'
   *  light.do('next');    // true
   *  light.state();       // 'yellow'
   *  light.do('dance');   // !! false - no such action
   *  light.state();       // 'yellow'
   *  light.do('start');   // !! false - yellow does not have the action start
   *  light.state();       // 'yellow'
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param actionName The action to engage
   *
   *  @param newData The data change to insert during the action
   *
   *  @returns `true` if the action was valid and the transition occurred,
   *  `false` otherwise.
   *
   */

  do(actionName: StateType, newData?: mDT): boolean {
    return this.transition_impl(actionName, newData, false, true);
  }





  /********
   *
   *  Instruct the machine to complete a transition.  Synonym for {@link go}.
   *
   *  ```typescript
   *  const light = sm`
   *    off 'start' -> red;
   *    red 'next' -> green 'next' -> yellow 'next' -> red;
   *    [red yellow green] 'shutdown' ~> off;
   *  `;
   *
   *  light.state();       // 'off'
   *  light.go('red');     // true
   *  light.state();       // 'red'
   *  light.go('green');   // true
   *  light.state();       // 'green'
   *  light.go('blue');    // !! false - no such state
   *  light.state();       // 'green'
   *  light.go('red');     // !! false - green may not go directly to red, only to yellow
   *  light.state();       // 'green'
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param newState The state to switch to
   *
   *  @param newData The data change to insert during the transition
   *
   *  @returns `true` if the transition was legal and occurred, `false` otherwise.
   *
   */

  transition(newState: StateType, newData?: mDT): boolean {
    return this.transition_impl(newState, newData, false, false);
  }





  /********
   *
   *  Instruct the machine to complete a transition.  Synonym for {@link transition}.
   *
   *  ```typescript
   *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
   *
   *  light.state();       // 'red'
   *  light.go('green');   // true
   *  light.state();       // 'green'
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param newState The state to switch to
   *
   *  @param newData The data change to insert during the transition
   *
   *  @returns `true` if the transition was legal and occurred, `false` otherwise.
   *
   */

  go(newState: StateType, newData?: mDT): boolean {
    return this.transition_impl(newState, newData, false, false);
  }





  /********
   *
   *  Instruct the machine to complete a forced transition (which will reject if
   *  called with a normal {@link transition} call.)
   *
   *  ```typescript
   *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
   *
   *  light.state();                     // 'red'
   *  light.transition('off');           // false
   *  light.state();                     // 'red'
   *  light.force_transition('off');     // true
   *  light.state();                     // 'off'
   *  ```
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   *  @param newState The state to switch to
   *
   *  @param newData The data change to insert during the transition
   *
   *  @returns `true` if a transition (forced or otherwise) existed and occurred,
   *  `false` otherwise.
   *
   */

  force_transition(newState: StateType, newData?: mDT): boolean {
    return this.transition_impl(newState, newData, true, false);
  }





  /** Get the edge index for an action from the current state.
   *  Interned dispatch: resolves via the numeric (action, from) index —
   *  unknown action names miss without throwing.
   *  @param action - The action name.
   *  @returns The edge index, or `undefined` if the action is not available.
   */
  current_action_for(action: StateType): number {
    const action_id = this._action_interner.id_of(action);
    return (action_id === undefined)
      ? undefined
      : this._edge_id_by_action_pair.get(pair_key(action_id, this._state_id));
  }

  /** Get the full transition object for an action from the current state.
   *  @param action - The action name.
   *  @returns The {@link JssmTransition} object.
   *  @throws {JssmError} If the action is not available from the current state.
   */
  current_action_edge_for(action: StateType): JssmTransition<StateType, mDT> {
    const idx: number = this.current_action_for(action);
    if ((idx === undefined) || (idx === null)) { throw new JssmError(this, `No such action ${JSON.stringify(action)}`); }
    return this._edges[idx];
  }

  /** Check whether an action is available from the current state.
   *  @param action   - The action name to check.
   *  @param _newData - Reserved for future data validation.
   *  @returns `true` if the action can be taken.
   */
  valid_action(action: StateType, _newData?: mDT): boolean {  // todo comeback unignore newData
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return this.current_action_for(action) !== undefined;
  }

  /** Check whether a transition to a given state is legal (non-forced) from
   *  the current state.
   *  @param newState - The target state.
   *  @param _newData - Reserved for future data validation.
   *  @returns `true` if the transition is legal.
   */
  valid_transition(newState: StateType, _newData?: mDT): boolean {  // todo comeback unignore newData
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    const transition_for: JssmTransition<StateType, mDT> = this.lookup_transition_for(this.state(), newState);

    if (!(transition_for)) { return false; }
    if (transition_for.forced_only) { return false; }

    return true;

  }

  /** Check whether a forced transition to a given state exists from the
   *  current state.
   *  @param newState - The target state.
   *  @param _newData - Reserved for future data validation.
   *  @returns `true` if a forced (or any) transition exists.
   */
  valid_force_transition(newState: StateType, _newData?: mDT): boolean {  // todo comeback unignore newData
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return (this.lookup_transition_for(this.state(), newState) !== undefined);
  }

  /** Get the instance name of this machine, if one was assigned at creation.
   *  @returns The instance name string, or `undefined`.
   */
  instance_name(): string | undefined {
    return this._instance_name;
  }



  /** Get the creation date of this machine as a `Date` object.
   *  @returns A `Date` representing when the machine was created.
   */
  get creation_date(): Date {
    return new Date(Math.floor( this.creation_timestamp ));
  }

  /** Get the creation timestamp (milliseconds since epoch).
   *  @returns The timestamp as a number.
   */
  get creation_timestamp(): number {
    return this._created;
  }

  /** Get the timestamp when construction began (before parsing).
   *  @returns The start-of-construction timestamp as a number.
   */
  get create_start_time(): number {
    return this._create_started;
  }



  /** Schedule an automatic transition to `next_state` after `after_time`
   *  milliseconds.  Only one timeout may be active at a time.
   *  @param next_state - The state to transition to when the timer fires.
   *  @param after_time - Delay in milliseconds.
   *  @throws {JssmError} If a timeout is already pending.
   */
  set_state_timeout(next_state: StateType, after_time: number) {

    if (this._timeout_handle !== undefined) {
      throw new JssmError(this, `Asked to set a state timeout to ${next_state}:${after_time}, but already timing out to ${this._timeout_target}:${this._timeout_target_time}`);
    }

    this._timeout_handle = this._timeout_source(

      // it seems like istanbul can't see this line being followed, even though it is, actively
      // this is enforced by the "after mapping runs normally with very short time" tests in after_mapping.spec
      // we'll mark it no-check so that our coverage numbers aren't wrecked

      /* istanbul ignore next */
      /* v8 ignore next 10 */
      () => {
        const from_state = this.state();
        this.clear_state_timeout();

        if (this._has_after_hooks) {
          const ah = this._after_hooks.get(from_state);
          if (ah !== undefined) { ah({ data: this._data, next_data: this._data }); }
        }

        this._fire('timeout', { from: from_state, to: next_state, after_time });

        this.go(next_state);
      },

      after_time

    );

    this._timeout_target      = next_state;
    this._timeout_target_time = after_time;

  }



  /** Cancel any pending state timeout.  Safe to call when no timeout is active.
   */
  clear_state_timeout() {

    if (this._timeout_handle === undefined) {
      return;  // calling with no timeout is a no-op, means it can be called glad-handedly
    }

    this._clear_timeout_source( this._timeout_handle );

    this._timeout_handle      = undefined;
    this._timeout_target      = undefined;
    this._timeout_target_time = undefined;

  }



  /** Get the configured `after` timeout for a given state, if any.
   *  @param which_state - The state to look up.
   *  @returns A `[targetState, delayMs]` tuple, or `undefined` if no timeout
   *  is configured for that state.
   */
  state_timeout_for(which_state: StateType): [StateType, number] | undefined {
    return this._after_mapping.get(which_state);
  }



  /** Get the configured `after` timeout for the current state, if any.
   *  @returns A `[targetState, delayMs]` tuple, or `undefined`.
   */
  current_state_timeout(): [StateType, number] | undefined {
    return (this._timeout_target !== undefined)
      ? [ this._timeout_target, this._timeout_target_time ]
      : undefined;
  }



  /** Convenience method to create a new machine from a tagged template literal.
   *  Equivalent to calling the top-level `sm` function.
   *  @param template_strings - The template string array.
   *  @param remainder        - Interpolated values.
   *  @returns A new {@link Machine} instance.
   */
  /* eslint-disable no-use-before-define */
  /* eslint-disable class-methods-use-this */
  sm(template_strings: TemplateStringsArray, ...remainder /* , arguments */): Machine<mDT> {
    return sm(template_strings, ...remainder);
  }
  /* eslint-enable class-methods-use-this */
  /* eslint-enable no-use-before-define */


}





/*********
 *
 *  Create a state machine from a template string.  This is one of the two main
 *  paths for working with JSSM, alongside {@link from}.
 *
 *  Use this method when you want to work directly and conveniently with a
 *  constant template expression.  Use `.from` when you want to pull from
 *  dynamic strings.
 *
 *
 *  ```typescript
 *  import * as jssm from 'jssm';
 *
 *  const lswitch = jssm.from('on <=> off;');
 *  ```
 *
 *  @typeparam mDT The type of the machine data member; usually omitted
 *
 *  @param template_strings The assembled code
 *
 *  @param remainder The mechanic for template argument insertion
 *
 */

function sm<mDT>(template_strings: TemplateStringsArray, ...remainder /* , arguments */): Machine<mDT> {

  // foo`a${1}b${2}c` will come in as (['a','b','c'],1,2)
  // this includes when a and c are empty strings
  // therefore template_strings will always have one more el than template_args
  // therefore map the smaller container and toss the last one on on the way out

  return new Machine(make(template_strings.reduce(

    // in general avoiding `arguments` is smart.  however with the template
    // string notation, as designed, it's not really worth the hassle

    /* eslint-disable prefer-rest-params */
    (acc, val, idx): string =>
      `${acc}${remainder[idx - 1]}${val}`  // arguments[0] is never loaded, so args doesn't need to be gated
    /* eslint-enable  prefer-rest-params */

  )));

}





/*********
 *
 *  Create a state machine from an implementation string.  This is one of the
 *  two main paths for working with JSSM, alongside {@link sm}.
 *
 *  Use this method when you want to conveniently pull a state machine from a
 *  string dynamically.  Use operator `sm` when you just want to work with a
 *  template expression.
 *
 *  ```typescript
 *  import * as jssm from 'jssm';
 *
 *  const lswitch = jssm.from('on <=> off;');
 *  ```
 *
 *  @typeparam mDT The type of the machine data member; usually omitted
 *
 *  @param MachineAsString The FSL code to evaluate
 *
 *  @param ExtraConstructorFields Extra non-code configuration to pass at creation time
 *
 */

function from<mDT>(MachineAsString: string, ExtraConstructorFields?: Partial< JssmGenericConfig<StateType, mDT> > | undefined): Machine<mDT> {

  const to_decorate = make<StateType, mDT>( MachineAsString );

  if (ExtraConstructorFields !== undefined) {
    Object.keys(ExtraConstructorFields).map(key => {
      if (key === 'allows_override') {
        to_decorate['config_allows_override'] = ExtraConstructorFields['allows_override'];
      } else {
        to_decorate[key] = ExtraConstructorFields[key];
      }
    });
  }

  return new Machine<mDT>( to_decorate );

}





/**
 *
 *  Type guard that narrows an unknown value to a {@link HookComplexResult}.
 *
 *  A hook complex result is an object with at minimum a boolean `pass` field,
 *  and may optionally also carry replacement `data` / `next_data` fields that
 *  the machine should adopt if the hook passes.  This helper is used by the
 *  hook-dispatch machinery to tell "hook returned a complex object" from
 *  "hook returned a bare boolean / null / undefined".
 *
 *  ```typescript
 *  is_hook_complex_result({ pass: true });                 // true
 *  is_hook_complex_result({ pass: false, data: { x: 1 }}); // true
 *  is_hook_complex_result(true);                           // false
 *  is_hook_complex_result(null);                           // false
 *  is_hook_complex_result({ other: 'thing' });             // false
 *  ```
 *
 *  @typeparam mDT The type of the machine data member; usually omitted.
 *
 *  @param hr The value to test.
 *
 *  @returns `true` if `hr` is a non-null object with a boolean `pass` field;
 *  `false` otherwise.  When `true`, TypeScript narrows `hr` to
 *  `HookComplexResult<mDT>`.
 *
 */

function is_hook_complex_result<mDT>(hr: unknown): hr is HookComplexResult<mDT> {

  if (hr !== null && typeof hr === 'object') {
    if (typeof (hr as any).pass === 'boolean') {
      return true;
    }
  }

  return false;

}



/**
 *
 *  Apply any data-field updates from a hook's complex result into `hook_args`,
 *  and return whether data actually changed.
 *
 *  This is the hoisted, allocation-free replacement for the `update_fields`
 *  inner function that used to be re-created on every hooked transition inside
 *  {@link Machine.transition_impl}.  By moving it to module scope the function
 *  object is allocated once at module load time.
 *
 *  When the result does not carry a `data` property (the common case —
 *  most hooks return `true` or `undefined`) the function returns `false`
 *  immediately without touching `hook_args`.
 *
 *  ```typescript
 *  const args = { data: 'old', next_data: undefined, ... };
 *  const changed = _update_hook_fields(args, { pass: true, data: 'new', next_data: undefined });
 *  // changed === true, args.data === 'new'
 *  ```
 *
 *  @param hook_args  The shared hook-argument object for the current
 *    transition.  Mutated in-place when the result carries `data`.
 *  @param res        The normalised complex result returned by
 *    {@link abstract_hook_step} or {@link abstract_everything_hook_step}.
 *
 *  @returns `true` if `res` contained a `data` property (i.e. the hook
 *    mutated the machine's data); `false` otherwise.
 *
 *  @see Machine.transition_impl
 *  @see abstract_hook_step
 *
 */

function _update_hook_fields<mDT>(hook_args: HookContext<mDT>, res: HookComplexResult<mDT>): boolean {
  if (Object.prototype.hasOwnProperty.call(res, 'data')) {
    hook_args.data      = res.data;
    hook_args.next_data = res.next_data;
    return true;
  }
  return false;
}





/**
 *
 *  Normalize any legal hook return value to a single "did it reject?" boolean.
 *
 *  Hooks in jssm may return any of the following to indicate success:
 *  `true`, `undefined`, or a complex result whose `pass` field is `true`.
 *  They may return any of the following to indicate rejection:
 *  `false`, or a complex result whose `pass` field is `false`.  This helper
 *  collapses all of those shapes into one boolean so callers don't have to
 *  re-implement the matrix.
 *
 *  ```typescript
 *  is_hook_rejection(true);            // false (pass)
 *  is_hook_rejection(undefined);       // false (pass)
 *  is_hook_rejection(false);           // true  (reject)
 *  is_hook_rejection({ pass: true });  // false (pass)
 *  is_hook_rejection({ pass: false }); // true  (reject)
 *  ```
 *
 *  @typeparam mDT The type of the machine data member; usually omitted.
 *
 *  @param hr A hook result of any legal shape.
 *
 *  @returns `true` if the hook rejected the transition; `false` if it passed.
 *
 *  @throws {TypeError} If `hr` is not a recognized hook result shape (for
 *  example, a number or a plain object without a `pass` field).
 *
 */

function is_hook_rejection<mDT>(hr: HookResult<mDT>): boolean {

  if (hr === true)      { return false; }
  if (hr === undefined) { return false; }
  if (hr === false)     { return true;  }

  if (is_hook_complex_result(hr)) {
    return (!(hr.pass));
  }

  throw new TypeError('unknown hook rejection type result');

}





/**
 *
 *  Shared, frozen outcomes for the simple hook results.  The transition
 *  cascade runs up to ~10 hook steps per transition, and the overwhelmingly
 *  common results — no hook installed, or a hook returning `undefined` /
 *  `true` / `false` — previously allocated a fresh one-field object each
 *  time, just to have `.pass` read once and be discarded.  Callers only read
 *  `pass` and probe for an own `data` property ({@link _update_hook_fields}),
 *  so a shared instance is observationally identical; freezing turns that
 *  read-only contract from incidental into enforced.  Complex results (hooks
 *  returning `{ pass, data, ... }`) still pass through untouched.  #705
 *
 *  @see abstract_hook_step
 *  @see abstract_everything_hook_step
 *
 *  @internal
 *
 */

const HOOK_PASSED   : HookComplexResult<any> = Object.freeze({ pass: true  });   // eslint-disable-line @typescript-eslint/no-explicit-any
const HOOK_REJECTED : HookComplexResult<any> = Object.freeze({ pass: false });   // eslint-disable-line @typescript-eslint/no-explicit-any





/**
 *
 *  Invoke an optional transition/action hook and normalize its return value
 *  into a {@link HookComplexResult}.
 *
 *  This is the central adapter the transition pipeline uses to run every
 *  non-"everything" hook kind (basic, named, entry, exit, after, action, etc).
 *  It accepts `undefined` for the hook slot because most hooks are not set on
 *  most machines; when no hook is installed the step is a no-op pass.
 *
 *  The valid return shapes from a hook and their normalized meanings are:
 *  - `undefined` → `{ pass: true }`
 *  - `true`      → `{ pass: true }`
 *  - `false`     → `{ pass: false }`
 *  - `null`      → `{ pass: false }`
 *  - a complex result object → returned as-is
 *
 *  Anything else is a programmer error and throws.
 *
 *  @typeparam mDT The type of the machine data member; usually omitted.
 *
 *  @param maybe_hook The hook handler to call, or `undefined` for the
 *  "no hook installed" case.
 *
 *  @param hook_args The context object passed to the hook.  Includes the
 *  current and proposed state, current and proposed data, action name, and
 *  transition kind.
 *
 *  @returns A {@link HookComplexResult} describing whether the hook passed
 *  and, optionally, any data replacements it requested.
 *
 *  @throws {TypeError} If the hook returns a value that is not one of the
 *  legal shapes listed above.
 *
 *  @internal
 *
 */

function abstract_hook_step<mDT>(maybe_hook: HookHandler<mDT> | undefined, hook_args: HookContext<mDT>): HookComplexResult<mDT> {

  if (maybe_hook !== undefined) {

    const result = maybe_hook(hook_args);

    if (result === undefined) {
      return HOOK_PASSED;
    }

    if (result === true) {
      return HOOK_PASSED;
    }

    if (result === false) {
      return HOOK_REJECTED;
    }

    if (result === null) {
      return HOOK_REJECTED;
    }

    if (is_hook_complex_result<mDT>(result)) {
      return result;
    }

    throw new TypeError(`Unknown hook result type ${result}`);

  } else {
    return HOOK_PASSED;
  }

}



/**
 *
 *  Invoke an optional "everything" hook and normalize its return value into
 *  a {@link HookComplexResult}.
 *
 *  Mechanically identical to {@link abstract_hook_step}, but typed for the
 *  everything-hook family (`pre_everything_hook` and `everything_hook`),
 *  whose context object carries an extra `hook_name` field identifying which
 *  bracket of the pipeline is firing.  Separated from `abstract_hook_step`
 *  so TypeScript can enforce that the hook handler and the context object
 *  agree on shape.
 *
 *  The valid return shapes and their meanings are the same as for
 *  `abstract_hook_step`:
 *  - `undefined` or `true` → `{ pass: true }`
 *  - `false` or `null`     → `{ pass: false }`
 *  - a complex result      → returned as-is
 *
 *  @typeparam mDT The type of the machine data member; usually omitted.
 *
 *  @param maybe_hook The everything-hook handler, or `undefined` when none
 *  is installed.
 *
 *  @param hook_args The everything-hook context object.  Differs from a
 *  normal hook context in that it also includes `hook_name`.
 *
 *  @returns A {@link HookComplexResult} describing whether the hook passed
 *  and any data replacements it requested.
 *
 *  @throws {TypeError} If the hook returns a value outside the legal shapes.
 *
 *  @internal
 *
 */

function abstract_everything_hook_step<mDT>(maybe_hook: EverythingHookHandler<mDT> | undefined, hook_args: EverythingHookContext<mDT>): HookComplexResult<mDT> {

  if (maybe_hook !== undefined) {

    const result = maybe_hook(hook_args);

    if (result === undefined) {
      return HOOK_PASSED;
    }

    if (result === true) {
      return HOOK_PASSED;
    }

    if (result === false) {
      return HOOK_REJECTED;
    }

    if (result === null) {
      return HOOK_REJECTED;
    }

    if (is_hook_complex_result<mDT>(result)) {
      return result;
    }

    throw new TypeError(`Unknown hook result type ${result}`);

  } else {
    return HOOK_PASSED;
  }

}



/**
 * Compares two semantic version strings, including prerelease versions.
 *
 * The numeric (`major.minor.patch`) parts compare numerically, with missing
 * segments treated as zero.  Prerelease parts (everything after the first
 * `-`) follow semver precedence: a version *with* a prerelease precedes the
 * same version *without* one; prerelease identifiers compare dot-by-dot,
 * numeric identifiers numerically and below alphanumeric ones, alphanumeric
 * identifiers in ASCII order, and a shorter identifier set precedes a longer
 * one that it prefixes.
 *
 * @param {string} v1 - First version string (e.g., "5.104.2" or "6.0.0-alpha.1")
 * @param {string} v2 - Second version string (e.g., "5.103.1")
 *
 * @returns {number} - Negative if v1 < v2, 0 if equal, positive if v1 > v2
 *
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("5.104.2", "5.103.1");  // => 1
 *
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("5.104.2", "6.0.0");  // => -1
 *
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("5.104.2", "5.104.2");  // => 0
 *
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("6.0.0-alpha.1", "6.0.0");  // => -1
 *
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("6.0.0-alpha.1", "6.0.0-alpha.2");  // => -1
 *
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("6.0.0-beta.1", "6.0.0-alpha.1");  // => 1
 */

function compareVersions(v1: string, v2: string): number {

  const hyphen1 = v1.indexOf('-'),
        hyphen2 = v2.indexOf('-');

  const main1 = (hyphen1 === -1)? v1 : v1.slice(0, hyphen1),
        main2 = (hyphen2 === -1)? v2 : v2.slice(0, hyphen2),
        pre1  = (hyphen1 === -1)? undefined : v1.slice(hyphen1 + 1),
        pre2  = (hyphen2 === -1)? undefined : v2.slice(hyphen2 + 1);

  const parts1 = main1.split('.').map(Number);
  const parts2 = main2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;

    if (num1 !== num2) {
      return num1 - num2;
    }
  }

  // numeric parts equal; a version with a prerelease precedes one without
  if (pre1 === undefined && pre2 === undefined) { return  0; }
  if (pre1 === undefined)                       { return  1; }
  if (pre2 === undefined)                       { return -1; }

  // both have prereleases: compare dot-separated identifiers per semver
  const ids1 = pre1.split('.'),
        ids2 = pre2.split('.');

  for (let i = 0; i < Math.max(ids1.length, ids2.length); i++) {

    const id1 = ids1[i],
          id2 = ids2[i];

    if (id1 === undefined) { return -1; }  // shorter identifier set precedes
    if (id2 === undefined) { return  1; }

    const n1 = /^[0-9]+$/.test(id1)? Number(id1) : undefined,
          n2 = /^[0-9]+$/.test(id2)? Number(id2) : undefined;

    if (n1 !== undefined && n2 !== undefined) {
      if (n1 !== n2) { return n1 - n2; }
    } else if (n1 !== undefined) { return -1; }  // numeric below alphanumeric
      else if (n2 !== undefined) { return  1; }
      else if (id1 !== id2)      { return (id1 < id2)? -1 : 1; }

  }

  return 0;

}





/**
 * Deserializes a previously serialized machine state.
 *
 * This function recreates a machine from a serialization object, restoring its
 * state, data, and history. For security and compatibility reasons, it will
 * refuse to deserialize data from future versions of the library.
 *
 * @typeparam mDT - The type of the machine data member
 *
 * @param {string} machine_string - The FSL string defining the machine structure
 * @param {JssmSerialization<mDT>} ser - The serialization object to restore from
 *
 * @returns {Machine<mDT>} - The restored machine instance
 *
 * @throws {Error} If the serialization is from a future version
 *
 * @example
 * import { from, deserialize } from 'jssm';
 * const machine    = from("a -> b;");
 * const serialized = machine.serialize();
 * const restored   = deserialize("a -> b;", serialized);
 * restored.state();  // => 'a'
 */

function deserialize<mDT>(machine_string: string, ser: JssmSerialization<mDT>): Machine<mDT> {

  // Refuse to deserialize data from future versions
  if (compareVersions(ser.jssm_version, version) > 0) {
    throw new Error(
      `Cannot deserialize from future version ${ser.jssm_version} ` +
      `(current version is ${version}). Please upgrade jssm to deserialize this data.`
    );
  }

  const machine  = from(machine_string, { data: ser.data, history: ser.history_capacity });
  machine._state    = ser.state;
  machine._state_id = machine._state_interner.id_of(ser.state) ?? NaN;

  ser.history.forEach( history_item =>
    machine._history.push(history_item)
  );

  return machine;

}





export {

  version,
    build_time,

  transfer_state_properties,

  Machine,
  deserialize,
  compareVersions,

  make,
  wrap_parse as parse,
  compile,

  sm,
  from,

  arrow_direction,
  arrow_left_kind,
  arrow_right_kind,

  // WHARGARBL TODO these should be exported to a utility library
  seq,
  unique,
  find_repeated,
  weighted_rand_select,
  histograph,
  weighted_sample_select,
  weighted_histo_key,
  gen_splitmix32,
  sleep,

  constants,

  shapes,
  gviz_shapes,
  named_colors,

  state_name_chars,
  state_name_first_chars,
  action_label_chars,

  is_hook_rejection,
    is_hook_complex_result,
    abstract_hook_step,
    abstract_everything_hook_step,

  state_style_condense,

  FslDirections
//  FslThemes

};
