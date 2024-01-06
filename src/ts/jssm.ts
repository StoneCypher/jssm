
// whargarbl lots of these return arrays could/should be sets

type StateType = string;

import { reduce as reduce_to_639 } from 'reduce-to-639-1';
import { circular_buffer }         from 'circular_buffer_js';





import {

  JssmGenericState, JssmGenericConfig, JssmStateConfig,
  JssmTransition, JssmTransitions, JssmTransitionList, // JssmTransitionRule,
  JssmMachineInternalState,
  JssmAllowsOverride,
  JssmParseTree,
  JssmStateDeclaration, JssmStateDeclarationRule,
  JssmStateStyleKey, JssmStateStyleKeyList,
  JssmCompileSe, JssmCompileSeStart, JssmCompileRule,
  JssmLayout, JssmHistory,
  JssmArrowKind,
  JssmSerialization,
  JssmPropertyDefinition,
  FslDirection, FslDirections, FslTheme,
  HookDescription, HookHandler, HookContext, HookResult, HookComplexResult,
  JssmBaseTheme,
  JssmRng

} from './jssm_types';





import { arrow_direction, arrow_left_kind, arrow_right_kind } from './jssm_arrow';
import { compile, make, makeTransition, wrap_parse }          from './jssm_compiler';
import { theme_mapping, base_theme }                          from './jssm_theme';





import {
  seq,
  unique, find_repeated,
  weighted_rand_select, weighted_sample_select,
  histograph, weighted_histo_key,
  array_box_if_string,
  name_bind_prop_and_state, hook_name, named_hook_name,
  gen_splitmix32
} from './jssm_util';





import * as constants from './jssm_constants';
const { shapes, gviz_shapes, named_colors } = constants;





import { parse }               from './fsl_parser';
import { version, build_time } from './version';    // replaced from package.js in build
import { JssmError }           from './jssm_error';





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

      case 'state_property'   : state_decl.property        = { name: d.name, value: d.value }; break;

      default: throw new JssmError(undefined, `Unknown state property: '${JSON.stringify(d)}'`);

    }

  } );

  return state_decl;

}





function state_style_condense(jssk: JssmStateStyleKeyList): JssmStateConfig {

  const state_style: JssmStateConfig = {};

  if (Array.isArray(jssk)) {

    jssk.forEach( (key, i) => {

      if (typeof key !== 'object') {
        throw new JssmError(this, `invalid state item ${i} in state_style_condense list: ${JSON.stringify(key)}`);
      }

      switch (key.key) {

        case 'shape':
          if (state_style.shape !== undefined) {
            throw new JssmError(this, `cannot redefine 'shape' in state_style_condense, already defined`);
          }
          state_style.shape = key.value;
          break;

        case 'color':
          if (state_style.color !== undefined) {
            throw new JssmError(this, `cannot redefine 'color' in state_style_condense, already defined`);
          }
          state_style.color = key.value;
          break;

        case 'text-color':
          if (state_style.textColor !== undefined) {
            throw new JssmError(this, `cannot redefine 'text-color' in state_style_condense, already defined`);
          }
          state_style.textColor = key.value;
          break;

        case 'corners':
          if (state_style.corners !== undefined) {
            throw new JssmError(this, `cannot redefine 'corners' in state_style_condense, already defined`);
          }
          state_style.corners = key.value;
          break;

        case 'line-style':
          if (state_style.lineStyle !== undefined) {
            throw new JssmError(this, `cannot redefine 'line-style' in state_style_condense, already defined`);
          }
          state_style.lineStyle = key.value;
          break;

        case 'background-color':
          if (state_style.backgroundColor !== undefined) {
            throw new JssmError(this, `cannot redefine 'background-color' in state_style_condense, already defined`);
          }
          state_style.backgroundColor = key.value;
          break;

        case 'state-label':
          if (state_style.stateLabel !== undefined) {
            throw new JssmError(this, `cannot redefine 'state-label' in state_style_condense, already defined`);
          }
          state_style.stateLabel = key.value;
          break;

        case 'border-color':
          if (state_style.borderColor !== undefined) {
            throw new JssmError(this, `cannot redefine 'border-color' in state_style_condense, already defined`);
          }
          state_style.borderColor = key.value;
          break;

        default:
          // TODO do that <never> trick to assert this list is complete
          throw new JssmError(this, `unknown state style key in condense: ${(key as any).key}`);

      }

    });

  } else if (jssk === undefined) {
    // do nothing, undefined is legal and means we should return the empty container above
  } else {
    throw new JssmError(this, 'state_style_condense received a non-array');
  }

  return state_style;

}





// TODO add a lotta docblock here

class Machine<mDT> {


  _state                  : StateType;
  _states                 : Map<StateType, JssmGenericState>;
  _edges                  : Array< JssmTransition<StateType, mDT> >;
  _edge_map               : Map<StateType, Map<StateType, number>>;
  _named_transitions      : Map<StateType, number>;
  _actions                : Map<StateType, Map<StateType, number>>;
  _reverse_actions        : Map<StateType, Map<StateType, number>>;
  _reverse_action_targets : Map<StateType, Map<StateType, number>>;

  _start_states           : Set<StateType>;
  _end_states             : Set<StateType>;

  _machine_author?        : Array<string>;
  _machine_comment?       : string;
  _machine_contributor?   : Array<string>;
  _machine_definition?    : string;
  _machine_language?      : string;
  _machine_license?       : string;
  _machine_name?          : string;
  _machine_version?       : string;
  _fsl_version?           : string;
  _raw_state_declaration? : Array<Object>;
  _state_declarations     : Map<StateType, JssmStateDeclaration>;

  _data? : mDT;

  _instance_name : string;

  _rng_seed : number;
  _rng      : JssmRng;

  _graph_layout              : JssmLayout;
  _dot_preamble              : string;
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
  _has_global_action_hooks  : boolean;
  _has_transition_hooks     : boolean;
  // no boolean for the single hooks, just check if they're defined

  _has_forced_transitions   : boolean;

  _hooks                    : Map<string, HookHandler<mDT>>;
  _named_hooks              : Map<string, HookHandler<mDT>>;
  _entry_hooks              : Map<string, HookHandler<mDT>>;
  _exit_hooks               : Map<string, HookHandler<mDT>>;
  _global_action_hooks      : Map<string, HookHandler<mDT>>;
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

  _post_hooks                    : Map<string, HookHandler<mDT>>;
  _post_named_hooks              : Map<string, HookHandler<mDT>>;
  _post_entry_hooks              : Map<string, HookHandler<mDT>>;
  _post_exit_hooks               : Map<string, HookHandler<mDT>>;
  _post_global_action_hooks      : Map<string, HookHandler<mDT>>;
  _post_any_action_hook          : HookHandler<mDT> | undefined;
  _post_standard_transition_hook : HookHandler<mDT> | undefined;
  _post_main_transition_hook     : HookHandler<mDT> | undefined;
  _post_forced_transition_hook   : HookHandler<mDT> | undefined;
  _post_any_transition_hook      : HookHandler<mDT> | undefined;

  _property_keys       : Set<string>;
  _default_properties  : Map<string, any>;
  _state_properties    : Map<string, any>;
  _required_properties : Set<string>;

  _history        : JssmHistory<mDT>;
  _history_length : number;

  _state_style          : JssmStateConfig;
  _active_state_style   : JssmStateConfig;
  _hooked_state_style   : JssmStateConfig;
  _terminal_state_style : JssmStateConfig;
  _start_state_style    : JssmStateConfig;
  _end_state_style      : JssmStateConfig;

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


  // whargarbl this badly needs to be broken up, monolith master
  constructor({

    start_states,
    end_states                = [],
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
    data,
    default_state_config,
    default_active_state_config,
    default_hooked_state_config,
    default_terminal_state_config,
    default_start_state_config,
    default_end_state_config,
    allows_override,
    config_allows_override,
    rng_seed,
    time_source,
    timeout_source,
    clear_timeout_source

  }: JssmGenericConfig<StateType, mDT>) {

    this._time_source                   = () => new Date().getTime();

    this._create_started                = this._time_source();

    this._instance_name = instance_name;

    this._state                  = start_states[0];
    this._states                 = new Map();
    this._state_declarations     = new Map();
    this._edges                  = [];
    this._edge_map               = new Map();
    this._named_transitions      = new Map();
    this._actions                = new Map();
    this._reverse_actions        = new Map();
    this._reverse_action_targets = new Map();   // todo

    this._start_states = new Set(start_states);
    this._end_states   = new Set(end_states);   // todo consider what to do about incorporating complete too

    this._machine_author        = array_box_if_string(machine_author);
    this._machine_comment       = machine_comment;
    this._machine_contributor   = array_box_if_string(machine_contributor);
    this._machine_definition    = machine_definition;
    this._machine_language      = machine_language;
    this._machine_license       = machine_license;
    this._machine_name          = machine_name;
    this._machine_version       = machine_version;
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
    this._has_global_action_hooks = false;
    this._has_transition_hooks    = true;
    // no need for a boolean for single hooks, just test for undefinedness

    this._has_forced_transitions   = false;

    this._hooks                    = new Map();
    this._named_hooks              = new Map();
    this._entry_hooks              = new Map();
    this._exit_hooks               = new Map();
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
    this._has_post_transition_hooks    = true;
    // no need for a boolean for single hooks, just test for undefinedness

    this._code_allows_override   = allows_override;
    this._config_allows_override = config_allows_override;

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

    this._data                          = data;

    this._property_keys                 = new Set();
    this._default_properties            = new Map();
    this._state_properties              = new Map();
    this._required_properties           = new Set();

    this._state_style                   = state_style_condense(default_state_config);
    this._active_state_style            = state_style_condense(default_active_state_config);
    this._hooked_state_style            = state_style_condense(default_hooked_state_config);
    this._terminal_state_style          = state_style_condense(default_terminal_state_config);
    this._start_state_style             = state_style_condense(default_start_state_config);
    this._end_state_style               = state_style_condense(default_end_state_config);

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



    // walk the transitions
    transitions.map((tr: JssmTransition<StateType, mDT>) => {

      if ( tr.from === undefined ) { throw new JssmError(this, `transition must define 'from': ${JSON.stringify(tr)}`); }
      if ( tr.to   === undefined ) { throw new JssmError(this, `transition must define 'to': ${JSON.stringify(tr)}`); }

      // get the cursors.  what a mess
      const cursor_from: JssmGenericState
        = this._states.get(tr.from)
        || { name: tr.from, from: [], to: [], complete: complete.includes(tr.from) };

      if (!(this._states.has(tr.from))) {
        this._new_state(cursor_from);
      }

      const cursor_to: JssmGenericState
        = this._states.get(tr.to)
        || { name: tr.to, from: [], to: [], complete: complete.includes(tr.to) };

      if (!(this._states.has(tr.to))) {
        this._new_state(cursor_to);
      }

      // guard against existing connections being re-added
      if (cursor_from.to.includes(tr.to)) {
        throw new JssmError(this, `already has ${JSON.stringify(tr.from)} to ${JSON.stringify(tr.to)}`);
      } else {
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
      const from_mapping: Map<StateType, number> = this._edge_map.get(tr.from) || new Map();
      if (!(this._edge_map.has(tr.from))) {
        this._edge_map.set(tr.from, from_mapping);
      }

      //    const to_mapping = from_mapping.get(tr.to);
      from_mapping.set(tr.to, thisEdgeId); // already checked that this mapping doesn't exist, above

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

    });


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
      });

    }


    // done building, do checks

    // assert all props are valid
    this._state_properties.forEach( (_value, key) => {
      const inside = JSON.parse(key);
      if (Array.isArray(inside)) {
        const j_property = inside[0];
        if (typeof j_property === 'string') {
          const j_state = inside[1];
          if (typeof j_state === 'string') {
            if (!(this.known_prop(j_property))) {
              throw new JssmError(this, `State "${j_state}" has property "${j_property}" which is not globally declared`);
            }
          }
        }
      }
    });

    // assert all required properties are serviced
    this._required_properties.forEach( dp_key => {
      if (this._default_properties.has(dp_key)) {
        throw new JssmError(this, `The property "${dp_key}" is required, but also has a default; these conflict`);
      }
      this.states().forEach(s => {
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
   */

  data(): mDT {
    return this._data;
  }





  // NEEDS_DOCS
  /*********
   *
   *  Get the current value of a given property name.
   *
   *  ```typescript
   *
   *  ```
   *
   *  @param name The relevant property name to look up
   *
   *  @returns The value behind the prop name.  Because functional props are
   *  evaluated as getters, this can be anything.
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





  // NEEDS_DOCS
  /*********
   *
   *  Get the current value of a given property name.  If missing on the state
   *  and without a global default, throw, unlike {@link prop}, which would
   *  return `undefined` instead.
   *
   *  ```typescript
   *
   *  ```
   *
   *  @param name The relevant property name to look up
   *
   *  @returns The value behind the prop name.  Because functional props are
   *  evaluated as getters, this can be anything.
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





  // NEEDS_DOCS
  // COMEBACK add prop_map, sparse_props and strict_props to doc text when implemented
  /*********
   *
   *  Get the current value of every prop, as an object.  If no current definition
   *  exists for a prop - that is, if the prop was defined without a default and
   *  the current state also doesn't define the prop - then that prop will be listed
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
   */

  props(): object {

    const ret: object = {};
    this.known_props().forEach(
      p =>
        ret[p] = this.prop(p)
    );

    return ret;

  }





  // NEEDS_DOCS
  // TODO COMEBACK
  /*********
   *
   *  Get the current value of every prop, as an object.  Compare
   *  {@link prop_map}, which returns a `Map`.
   *
   *  ```typescript
   *
   *  ```
   *
   */

  // sparse_props(name: string): object {

  // }





  // NEEDS_DOCS
  // TODO COMEBACK
  /*********
   *
   *  Get the current value of every prop, as an object.  Compare
   *  {@link prop_map}, which returns a `Map`.  Akin to {@link strict_prop},
   *  this throws if a required prop is missing.
   *
   *  ```typescript
   *
   *  ```
   *
   */

  // strict_props(name: string): object {

  // }





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





  // NEEDS_DOCS

  /*********
   *
   *  List all known property names.  If you'd also like values, use
   *  {@link props} instead.  The order of the properties is not defined, and
   *  the properties generally will not be sorted.
   *
   *  ```typescript
   *  ```
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





  graph_layout(): string {
    return this._graph_layout;
  }

  dot_preamble(): string {
    return this._dot_preamble;
  }



  machine_author(): Array<string> {
    return this._machine_author;
  }

  machine_comment(): string {
    return this._machine_comment;
  }

  machine_contributor(): Array<string> {
    return this._machine_contributor;
  }

  machine_definition(): string {
    return this._machine_definition;
  }

  machine_language(): string {
    return this._machine_language;
  }

  machine_license(): string {
    return this._machine_license;
  }

  machine_name(): string {
    return this._machine_name;
  }

  machine_version(): string {
    return this._machine_version;
  }

  raw_state_declarations(): Array<Object> {
    return this._raw_state_declaration;
  }

  state_declaration(which: StateType): JssmStateDeclaration {
    return this._state_declarations.get(which);
  }

  state_declarations(): Map<StateType, JssmStateDeclaration> {
    return this._state_declarations;
  }

  fsl_version(): string {
    return this._fsl_version;
  }



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
   */

  states(): Array<StateType> {
    return Array.from(this._states.keys());
  }





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
   *  @param whichState The state to be checked for extance
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
   */

  list_edges(): Array<JssmTransition<StateType, mDT>> {
    return this._edges;
  }

  list_named_transitions(): Map<StateType, number> {
    return this._named_transitions;
  }

  list_actions(): Array<StateType> {
    return Array.from(this._actions.keys());
  }

  get uses_actions(): boolean {
    return Array.from(this._actions.keys()).length > 0;
  }

  get uses_forced_transitions(): boolean {
    return this._has_forced_transitions;
  }





  /*********
   *
   *  Check if the code that built the machine allows overriding state and data.
   *
   */

  get code_allows_override(): JssmAllowsOverride {
    return this._code_allows_override;
  }





  /*********
   *
   *  Check if the machine config allows overriding state and data.
   *
   */

  get config_allows_override(): JssmAllowsOverride {
    return this._config_allows_override;
  }





  /*********
   *
   *  Check if a machine allows overriding state and data.
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





  all_themes(): FslTheme[] {
    return [... theme_mapping.keys()];     // constructor sets this to "default" otherwise
  }

  // This will always return an array of FSL themes; the reason we spuriously
  // add the single type is that the setter and getter need matching accept/return
  // types, and the setter can take both as a convenience

  get themes(): FslTheme | FslTheme[] {
    return this._themes;     // constructor sets this to "default" otherwise
  }

  set themes(to: FslTheme | FslTheme[]) {
    if (typeof to === 'string') {
      this._themes = [to];
    } else {
      this._themes = to;
    }
  }

  flow(): FslDirection {
    return this._flow;
  }



  get_transition_by_state_names(from: StateType, to: StateType): number {

    const emg: Map<StateType, number> = this._edge_map.get(from);

    if (emg) {
      return emg.get(to);
    } else {
      return undefined;
    }

  }



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





  probable_exits_for(whichState: StateType): Array<JssmTransition<StateType, mDT>> {

    const wstate: JssmGenericState = this._states.get(whichState);
    if (!(wstate)) { throw new JssmError(this, `No such state ${JSON.stringify(whichState)} in probable_exits_for`); }

    const wstate_to: Array<StateType> = wstate.to,

      wtf: Array<JssmTransition<StateType, mDT>> // wstate_to_filtered -> wtf
        = wstate_to
          .map((ws): JssmTransition<StateType, mDT> => this.lookup_transition_for(this.state(), ws))
          .filter(Boolean);

    return wtf;

  }

  probabilistic_transition(): boolean {
    const selected: JssmTransition<StateType, mDT> = weighted_rand_select(this.probable_exits_for(this.state()), undefined, this._rng);
    return this.transition(selected.to);
  }

  probabilistic_walk(n: number): Array<StateType> {
    return seq(n)
      .map((): StateType => {
        const state_was: StateType = this.state();
        this.probabilistic_transition();
        return state_was;
      })
      .concat([this.state()]);
  }

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
   *  @param whichState The state whose actions to have listed
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

  list_exit_actions(whichState: StateType = this.state()): Array<StateType> { // these are mNT, not ?mNT

    const ra_base: Map<StateType, number> = this._reverse_actions.get(whichState);

    if (!(ra_base)) {
      throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
    }

    return Array.from(ra_base.values())
      .map((edgeId: number): JssmTransition<StateType, mDT> => this._edges[edgeId])
      .filter((o: JssmTransition<StateType, mDT>): boolean => o.from === whichState)
      .map((filtered: JssmTransition<StateType, mDT>): StateType => filtered.action);

  }





  probable_action_exits(whichState: StateType = this.state()): Array<any> { // these are mNT   // TODO FIXME no any
    const ra_base: Map<StateType, number> = this._reverse_actions.get(whichState);
    if (!(ra_base)) { throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`); }

    return Array.from(ra_base.values())
      .map((edgeId: number): JssmTransition<StateType, mDT> => this._edges[edgeId])
      .filter((o: JssmTransition<StateType, mDT>): boolean => o.from === whichState)
      .map((filtered): any => ({
        action: filtered.action,          // TODO FIXME no any
        probability: filtered.probability
      })
      );
  }



  // TODO FIXME test that is_unenterable on non-state throws
  is_unenterable(whichState: StateType): boolean {
    if (!(this.has_state(whichState))) { throw new JssmError(this, `No such state ${whichState}`); }
    return this.list_entrances(whichState).length === 0;
  }

  has_unenterables(): boolean {
    return this.states().some((x: StateType): boolean => this.is_unenterable(x));
  }



  is_terminal(): boolean {
    return this.state_is_terminal(this.state());
  }

  // TODO FIXME test that state_is_terminal on non-state throws
  state_is_terminal(whichState: StateType): boolean {
    if (!(this.has_state(whichState))) { throw new JssmError(this, `No such state ${whichState}`); }
    return this.list_exits(whichState).length === 0;
  }

  has_terminals(): boolean {
    return this.states().some((x): boolean => this.state_is_terminal(x));
  }



  is_complete(): boolean {
    return this.state_is_complete(this.state());
  }

  state_is_complete(whichState: StateType): boolean {
    const wstate: JssmGenericState = this._states.get(whichState);
    if (wstate) { return wstate.complete; }
    else { throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`); }
  }

  has_completes(): boolean {
    return this.states().some((x): boolean => this.state_is_complete(x));
  }



  // basic toolable hook call.  convenience wrappers will follow, like
  // hook(from, to, handler) and exit_hook(from, handler) and etc
  set_hook(HookDesc: HookDescription<mDT>) {

    switch (HookDesc.kind) {

      case 'hook':
        this._hooks.set( hook_name(HookDesc.from, HookDesc.to), HookDesc.handler );
        this._has_hooks       = true;
        this._has_basic_hooks = true;
        break;

      case 'named':
        this._named_hooks.set( named_hook_name(HookDesc.from, HookDesc.to, HookDesc.action), HookDesc.handler );
        this._has_hooks       = true;
        this._has_named_hooks = true;
        break;

      case 'global action':
        this._global_action_hooks.set( HookDesc.action, HookDesc.handler );
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
        this._entry_hooks.set( HookDesc.to, HookDesc.handler );
        this._has_hooks       = true;
        this._has_entry_hooks = true;
        break;

      case 'exit':
        this._exit_hooks.set( HookDesc.from, HookDesc.handler );
        this._has_hooks      = true;
        this._has_exit_hooks = true;
        break;


      case 'post hook':
        this._post_hooks.set( hook_name(HookDesc.from, HookDesc.to), HookDesc.handler );
        this._has_post_hooks       = true;
        this._has_post_basic_hooks = true;
        break;

      case 'post named':
        this._post_named_hooks.set( named_hook_name(HookDesc.from, HookDesc.to, HookDesc.action), HookDesc.handler );
        this._has_post_hooks       = true;
        this._has_post_named_hooks = true;
        break;

      case 'post global action':
        this._post_global_action_hooks.set(HookDesc.action, HookDesc.handler);
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
        this._post_entry_hooks.set(HookDesc.to, HookDesc.handler);
        this._has_post_entry_hooks = true;
        this._has_post_hooks       = true;
        break;

      case 'post exit':
        this._post_exit_hooks.set(HookDesc.from, HookDesc.handler);
        this._has_post_exit_hooks = true;
        this._has_post_hooks      = true;
        break;


      default:
        throw new JssmError(this, `Unknown hook type ${(HookDesc as any).kind}, should be impossible`);

    }
  }



  hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'hook', from, to, handler });
    return this;

  }



  hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'named', from, to, action, handler });
    return this;

  }



  hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'global action', action, handler });
    return this;

  }



  hook_any_action(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'any action', handler });
    return this;

  }



  hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'standard transition', handler });
    return this;

  }



  hook_main_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'main transition', handler });
    return this;

  }



  hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'forced transition', handler });
    return this;

  }



  hook_any_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'any transition', handler });
    return this;

  }



  hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'entry', to, handler });
    return this;

  }



  hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'exit', from, handler });
    return this;

  }





  post_hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post hook', from, to, handler });
    return this;

  }



  post_hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post named', from, to, action, handler });
    return this;

  }



  post_hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post global action', action, handler });
    return this;

  }



  post_hook_any_action(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post any action', handler });
    return this;

  }



  post_hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post standard transition', handler });
    return this;

  }



  post_hook_main_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post main transition', handler });
    return this;

  }



  post_hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post forced transition', handler });
    return this;

  }



  post_hook_any_transition(handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post any transition', handler });
    return this;

  }



  post_hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post entry', to, handler });
    return this;

  }



  post_hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT> {

    this.set_hook({ kind: 'post exit', from, handler });
    return this;

  }





  get rng_seed(): number {
    return this._rng_seed;
  }

  set rng_seed(to: number | undefined) {

    if (typeof to === 'undefined') {
      this._rng_seed = new Date().getTime();
    } else {
      this._rng_seed = to;
    }

  }





  // remove_hook(HookDesc: HookDescription) {
  //   throw new JssmError(this, 'TODO: Should remove hook here');
  // }



  edges_between(from: string, to: string): JssmTransition<StateType, mDT>[] {
    return this._edges.filter( edge => ((edge.from === from) && (edge.to === to)) );
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
        this._state = newState;
        this._data  = newData;
      } else {
        throw new JssmError(this, `Cannot override state to "${newState}", a state that does not exist`);
      }

    } else {
      throw new JssmError(this, "Code specifies no override, but config tries to permit; config may not be less strict than code");
    }

  }



  transition_impl(newStateOrAction: StateType, newData: mDT | undefined, wasForced: boolean, wasAction: boolean): boolean {

    // TODO the forced-ness behavior needs to be cleaned up a lot here
    // TODO all the callbacks are wrong on forced, action, etc

    let valid      : boolean               = false,
        trans_type : string,
        newState   : StateType,
        fromAction : StateType | undefined = undefined;

    if (wasForced) {
      if (this.valid_force_transition(newStateOrAction, newData)) {
        valid      = true;
        trans_type = 'forced';
        newState   = newStateOrAction;
      }

    } else if (wasAction) {
      if (this.valid_action(newStateOrAction, newData)) {
        const edge: JssmTransition<StateType, mDT> = this.current_action_edge_for(newStateOrAction);
        valid                                      = true;
        trans_type                                 = edge.kind;
        newState                                   = edge.to;
        fromAction                                 = newStateOrAction;
      }

    } else {
      if (this.valid_transition(newStateOrAction, newData)) {
        if (this._has_transition_hooks) {
          trans_type = this.edges_between(this._state, newStateOrAction)[0].kind;  // TODO this won't do the right thing if various edges have different types
        }
        valid    = true;
        newState = newStateOrAction;
      }
    }


    const hook_args = {
      data       : this._data,
      action     : fromAction,
      from       : this._state,
      to         : newState,
      next_data  : newData,
      forced     : wasForced,
      trans_type
    };

    if (valid) {

      if (this._has_hooks) {

        // once validity is known, clear old 'after' timeout clause
        this.clear_state_timeout();

        function update_fields(res: HookComplexResult<mDT>) {
          if (res.hasOwnProperty('data')) {
            hook_args.data      = res.data;
            hook_args.next_data = res.next_data;
            data_changed        = true;
          }
        }

        let data_changed = false;

        if (wasAction) {
          // 1. any action hook
          const outcome = abstract_hook_step(this._any_action_hook, hook_args);
          if (outcome.pass === false) { return false; }
          update_fields(outcome);

          // 2. global specific action hook
          const outcome2 = abstract_hook_step(this._global_action_hooks.get(newStateOrAction), hook_args);
          if (outcome2.pass === false) { return false; }
          update_fields(outcome2);
        }

        // 3. any transition hook
        if (this._any_transition_hook !== undefined) {
          const outcome = abstract_hook_step(this._any_transition_hook, hook_args);
          if (outcome.pass === false) { return false; }
          update_fields(outcome);
        }

        // 4. exit hook
        if (this._has_exit_hooks) {
          const outcome = abstract_hook_step(this._exit_hooks.get(this._state), hook_args);
          if (outcome.pass === false) { return false; }
          update_fields(outcome);
        }

        // 5. named transition / action hook
        if (this._has_named_hooks) {
          if (wasAction) {

            const nhn: string = named_hook_name(this._state, newState, newStateOrAction),
                  outcome     = abstract_hook_step(this._named_hooks.get(nhn), hook_args);

            if (outcome.pass === false) { return false; }
            update_fields(outcome);

          }
        }

        // 6. regular hook
        if (this._has_basic_hooks) {

          const hn: string = hook_name(this._state, newState),
                outcome    = abstract_hook_step(this._hooks.get(hn), hook_args);

          if (outcome.pass === false) { return false; }
          update_fields(outcome);

        }

        // 7. edge type hook

        // 7a. standard transition hook
        if (trans_type === 'legal') {
          const outcome = abstract_hook_step(this._standard_transition_hook, hook_args);
          if (outcome.pass === false) { return false; }
          update_fields(outcome);
        }

        // 7b. main type hook
        if (trans_type === 'main') {
          const outcome = abstract_hook_step(this._main_transition_hook, hook_args);
          if (outcome.pass === false) { return false; }
          update_fields(outcome);
        }

        // 7c. forced transition hook
        if (trans_type === 'forced') {
          const outcome = abstract_hook_step(this._forced_transition_hook, hook_args);
          if (outcome.pass === false) { return false; }
          update_fields(outcome);
        }

        // 8. entry hook
        if (this._has_entry_hooks) {
          const outcome = abstract_hook_step(this._entry_hooks.get(newState), hook_args);
          if (outcome.pass === false) { return false; }
          update_fields(outcome);
        }

        // all hooks passed!  let's now establish the result

        if (this._history_length) {
          this._history.shove([ this._state, this._data ]);
        }

        this._state = newState;

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

        this._state = newState;

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
      return false;
    }

    // posthooks begin here

    if (this._has_post_hooks) {

      if (wasAction) {
        // 1. any action posthook
        if (this._post_any_action_hook !== undefined) { this._post_any_action_hook(hook_args); }

        // 2. global specific action hook
        const pgah = this._post_global_action_hooks.get(hook_args.action)
        if (pgah !== undefined) { pgah(hook_args); }
      }

      // 3. any transition hook
      if (this._post_any_transition_hook !== undefined) {
        this._post_any_transition_hook(hook_args);
      }

      // 4. exit hook
      if (this._has_post_exit_hooks) {
        const peh = this._post_exit_hooks.get(hook_args.from);  // todo this is probably from instead
        if (peh !== undefined) { peh(hook_args); }
      }

      // 5. named transition / action hook
      if (this._has_post_named_hooks) {
        if (wasAction) {
          const nhn: string = named_hook_name(hook_args.from, hook_args.to, hook_args.action),
                pnh         = this._post_named_hooks.get(nhn);

          if (pnh !== undefined) { pnh(hook_args); }
        }
      }

      // 6. regular hook
      if (this._has_post_basic_hooks) {
        const hook = this._post_hooks.get(hook_name(hook_args.from, hook_args.to));
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
        const hook = this._post_entry_hooks.get(hook_args.to);
        if (hook !== undefined) { hook(hook_args); }
      }

    }

    // possibly re-establish new 'after' clause
    this.auto_set_state_timeout();

    return true;

  }





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
   *  Gets the composite style for a specific node by individually imposing the
   *  style layers on a given object, after determining which layers are
   *  appropriate.
   *
   *  The order of composition is base, then theme, then user content.  Each
   *  item in the stack will be composited independently.  First, the base state
   *  style, then the theme state style, then the user state style.
   *
   *  After the three state styles, we'll composite the hooked styles; then the
   *  terminal styles; then the start styles; then the end styles; finally, the
   *  active styles.  Remember, last wins.
   *
   *  The base state style must exist.  All other styles are optional.
   *
   *  @typeparam mDT The type of the machine data member; usually omitted
   *
   */

  style_for(state: StateType): JssmStateConfig {


    // first look up the themes
    const themes: JssmBaseTheme[] = [];

    this._themes.forEach(th => {

      const theme_impl = theme_mapping.get(th);

      if (theme_impl !== undefined) {
        themes.push(theme_impl);
      }

    });

    // basic state style
    const layers = [ base_theme.state ];


    themes.reverse().map(theme => {
      if (theme.state) { layers.push(theme.state); }
    });

    if (this._state_style) { layers.push(this._state_style); }


    // hooked state style
    // if (this.has_hooks(state)) {
    //   layers.push(base_theme.hooked);
    //   themes.map(theme => {
    //     if (theme.hooked) { layers.push(theme.hooked); }
    //   });
    //   if (this._hooked_state_style) { layers.push(this._hooked_state_style); }
    // }


    // terminal state style
    if (this.state_is_terminal(state)) {
      layers.push(base_theme.terminal);
      themes.map(theme => {
        if (theme.terminal) { layers.push(theme.terminal); }
      });
      if (this._terminal_state_style) { layers.push(this._terminal_state_style); }
    }


    // start state style
    if (this.is_start_state(state)) {
      layers.push(base_theme.start);
      themes.map(theme => {
        if (theme.start) { layers.push(theme.start); }
      });
      if (this._start_state_style) { layers.push(this._start_state_style); }
    }


    // end state style
    if (this.is_end_state(state)) {
      layers.push(base_theme.end);
      themes.map(theme => {
        if (theme.end) { layers.push(theme.end); }
      });
      if (this._end_state_style) { layers.push(this._end_state_style); }
    }


    // active state style
    if (this.state() === state) {
      layers.push(base_theme.active);
      themes.map(theme => {
        if (theme.active) { layers.push(theme.active); }
      });
      if (this._active_state_style) { layers.push(this._active_state_style); }
    }


    const individual_style : JssmStateConfig      = {},
          decl             : JssmStateDeclaration = this._state_declarations.get(state);

    individual_style.color           = decl?.color;
    individual_style.textColor       = decl?.textColor;
    individual_style.borderColor     = decl?.borderColor;
    individual_style.backgroundColor = decl?.backgroundColor;
    individual_style.lineStyle       = decl?.lineStyle;
    individual_style.corners         = decl?.corners;
    individual_style.shape           = decl?.shape;

    layers.push(individual_style);


    return layers.reduce((acc: JssmStateConfig, cur: JssmStateConfig) => {

      const composite_state: JssmStateConfig = acc;
      Object.keys(cur).forEach(key => composite_state[key] = cur[key] ?? composite_state[key]);

      return composite_state;

    }, {} as JssmStateConfig);

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
   */

  force_transition(newState: StateType, newData?: mDT): boolean {
    return this.transition_impl(newState, newData, true, false);
  }





  current_action_for(action: StateType): number {
    const action_base: Map<StateType, number> = this._actions.get(action);
    return action_base
      ? action_base.get(this.state())
      : undefined;
  }

  current_action_edge_for(action: StateType): JssmTransition<StateType, mDT> {
    const idx: number = this.current_action_for(action);
    if ((idx === undefined) || (idx === null)) { throw new JssmError(this, `No such action ${JSON.stringify(action)}`); }
    return this._edges[idx];
  }

  valid_action(action: StateType, _newData?: mDT): boolean {  // todo comeback unignore newData
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return this.current_action_for(action) !== undefined;
  }

  valid_transition(newState: StateType, _newData?: mDT): boolean {  // todo comeback unignore newData
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    const transition_for: JssmTransition<StateType, mDT> = this.lookup_transition_for(this.state(), newState);

    if (!(transition_for)) { return false; }
    if (transition_for.forced_only) { return false; }

    return true;

  }

  valid_force_transition(newState: StateType, _newData?: mDT): boolean {  // todo comeback unignore newData
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return (this.lookup_transition_for(this.state(), newState) !== undefined);
  }

  instance_name(): string | undefined {
    return this._instance_name;
  }



  get creation_date(): Date {
    return new Date(Math.floor( this.creation_timestamp ));
  }

  get creation_timestamp(): number {
    return this._created;
  }

  get create_start_time(): number {
    return this._create_started;
  }



  set_state_timeout(next_state: StateType, after_time: number) {

    if (this._timeout_handle !== undefined) {
      throw new JssmError(this, `Asked to set a state timeout to ${next_state}:${after_time}, but already timing out to ${this._timeout_target}:${this._timeout_target_time}`);
    }

    this._timeout_handle = this._timeout_source(

      // it seems like istanbul can't see this line being followed, even though it is, actively
      // this is enforced by the "after mapping runs normally with very short time" tests in after_mapping.spec
      // we'll mark it no-check so that our coverage numbers aren't wrecked

      /* istanbul ignore next */
      () => {
        this.clear_state_timeout();
        this.go(next_state)
      },

      after_time

    );

    this._timeout_target      = next_state;
    this._timeout_target_time = after_time;

  }



  clear_state_timeout() {

    if (this._timeout_handle === undefined) {
      return;  // calling with no timeout is a no-op, means it can be called glad-handedly
    }

    this._clear_timeout_source( this._timeout_handle );

    this._timeout_handle      = undefined;
    this._timeout_target      = undefined;
    this._timeout_target_time = undefined;

  }



  state_timeout_for(which_state: StateType): [StateType, number] | undefined {
    return this._after_mapping.get(which_state);
  }



  current_state_timeout(): [StateType, number] | undefined {
    return (this._timeout_target !== undefined)
      ? [ this._timeout_target, this._timeout_target_time ]
      : undefined;
  }



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





function is_hook_complex_result<mDT>(hr: unknown): hr is HookComplexResult<mDT> {

  if (typeof hr === 'object') {
    if (typeof (hr as any).pass === 'boolean') {
      return true;
    }
  }

  return false;

}





function is_hook_rejection<mDT>(hr: HookResult<mDT>): boolean {

  if (hr === true)      { return false; }
  if (hr === undefined) { return false; }
  if (hr === false)     { return true;  }

  if (is_hook_complex_result(hr)) {
    return (!(hr.pass));
  }

  throw new TypeError('unknown hook rejection type result');

}





function abstract_hook_step<mDT>(maybe_hook: HookHandler<mDT> | undefined, hook_args: HookContext<mDT>): HookComplexResult<mDT> {

  if (maybe_hook !== undefined) {

    const result = maybe_hook(hook_args);

    if (result === undefined) {
      return { pass: true };
    }

    if (result === true) {
      return { pass: true };
    }

    if (result === false) {
      return { pass: false };
    }

    if (is_hook_complex_result<mDT>(result)) {
      return result;
    }

    throw new TypeError(`Unknown hook result type ${result}`);

  } else {
    return { pass: true };
  }

}





function deserialize<mDT>(machine_string: string, ser: JssmSerialization<mDT>): Machine<mDT> {

  const machine  = from(machine_string, { data: ser.data, history: ser.history_capacity });
  machine._state = ser.state;

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

  constants,

  shapes,
  gviz_shapes,
  named_colors,

  is_hook_rejection,
    is_hook_complex_result,
    abstract_hook_step,

  state_style_condense,

  FslDirections
//  FslThemes

};
