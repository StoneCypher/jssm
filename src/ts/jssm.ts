
// whargarbl lots of these return arrays could/should be sets

type StateType = string;

import { reduce as reduce_to_639 } from 'reduce-to-639-1';





import {

  JssmGenericState, JssmGenericConfig,
  JssmTransition, JssmTransitionList, // JssmTransitionRule,
  JssmMachineInternalState,
  JssmParseTree,
  JssmStateDeclaration, JssmStateDeclarationRule,
  JssmCompileSe, JssmCompileSeStart, JssmCompileRule,
  JssmArrow, JssmArrowDirection, JssmArrowKind,
  JssmLayout,
  FslDirection, FslTheme,
  HookDescription, HookHandler

} from './jssm_types';





import {
  seq, weighted_rand_select, weighted_sample_select, histograph,
  weighted_histo_key, array_box_if_string, hook_name, named_hook_name
} from './jssm_util';





import { parse } from './jssm-dot';  // TODO FIXME WHARGARBL this could be post-typed

import { version } from './version'; // replaced from package.js in build





/* eslint-disable complexity */

function arrow_direction(arrow: JssmArrow): JssmArrowDirection {

  switch (String(arrow)) {

    case '->': case '→':
    case '=>': case '⇒':
    case '~>': case '↛':
      return 'right';

    case '<-': case '←':
    case '<=': case '⇐':
    case '<~': case '↚':
      return 'left';

    case '<->': case '↔':
    case '<-=>': case '←⇒': case '←=>': case '<-⇒':
    case '<-~>': case '←↛': case '←~>': case '<-↛':

    case '<=>': case '⇔':
    case '<=->': case '⇐→': case '⇐->': case '<=→':
    case '<=~>': case '⇐↛': case '⇐~>': case '<=↛':

    case '<~>': case '↮':
    case '<~->': case '↚→': case '↚->': case '<~→':
    case '<~=>': case '↚⇒': case '↚=>': case '<~⇒':
      return 'both';

    default:
      throw new Error(`arrow_direction: unknown arrow type ${arrow}`);

  }

}

/* eslint-enable complexity */





/* eslint-disable complexity */

function arrow_left_kind(arrow: JssmArrow): JssmArrowKind {

  switch (String(arrow)) {

    case '->': case '→':
    case '=>': case '⇒':
    case '~>': case '↛':
      return 'none';

    case '<-': case '←':
    case '<->': case '↔':
    case '<-=>': case '←⇒':
    case '<-~>': case '←↛':
      return 'legal';

    case '<=': case '⇐':
    case '<=>': case '⇔':
    case '<=->': case '⇐→':
    case '<=~>': case '⇐↛':
      return 'main';

    case '<~': case '↚':
    case '<~>': case '↮':
    case '<~->': case '↚→':
    case '<~=>': case '↚⇒':
      return 'forced';

    default:
      throw new Error(`arrow_direction: unknown arrow type ${arrow}`);

  }

}

/* eslint-enable complexity */





/* eslint-disable complexity */

function arrow_right_kind(arrow: JssmArrow): JssmArrowKind {

  switch (String(arrow)) {

    case '<-': case '←':
    case '<=': case '⇐':
    case '<~': case '↚':
      return 'none';

    case '->': case '→':
    case '<->': case '↔':
    case '<=->': case '⇐→':
    case '<~->': case '↚→':
      return 'legal';

    case '=>': case '⇒':
    case '<=>': case '⇔':
    case '<-=>': case '←⇒':
    case '<~=>': case '↚⇒':
      return 'main';

    case '~>': case '↛':
    case '<~>': case '↮':
    case '<-~>': case '←↛':
    case '<=~>': case '⇐↛':
      return 'forced';

    default:
      throw new Error(`arrow_direction: unknown arrow type ${arrow}`);

  }

}

/* eslint-enable complexity */





function makeTransition<mDT>(

  this_se    : JssmCompileSe,
  from       : string,
  to         : string,
  isRight    : boolean,
  _wasList?  : Array<string>,
  _wasIndex? : number

): JssmTransition<mDT> {

  const kind: JssmArrowKind = isRight ? arrow_right_kind(this_se.kind) : arrow_left_kind(this_se.kind),
    edge: JssmTransition<mDT> = {
      from,
      to,
      kind,
      forced_only: kind === 'forced',
      main_path: kind === 'main'
    };

  //  if ((wasList  !== undefined) && (wasIndex === undefined)) { throw new TypeError("Must have an index if transition was in a list"); }
  //  if ((wasIndex !== undefined) && (wasList  === undefined)) { throw new TypeError("Must be in a list if transition has an index");   }
  /*
    if (typeof edge.to === 'object') {

      if (edge.to.key === 'cycle') {
        if (wasList === undefined) { throw "Must have a waslist if a to is type cycle"; }
        const nextIndex = wrapBy(wasIndex, edge.to.value, wasList.length);
        edge.to = wasList[nextIndex];
      }

    }
  */
  const action: string = isRight ? 'r_action' : 'l_action',
    probability: string = isRight ? 'r_probability' : 'l_probability';

  if (this_se[action]) { edge.action = this_se[action]; }
  if (this_se[probability]) { edge.probability = this_se[probability]; }

  return edge;

}





function wrap_parse(input: string, options?: Object) {
  return parse(input, options || {});
}





function compile_rule_transition_step<mDT>(

  acc     : Array<JssmTransition<mDT>>,
  from    : string,
  to      : string,
  this_se : JssmCompileSe,
  next_se : JssmCompileSe

): Array<JssmTransition<mDT>> { // todo typescript describe the parser representation of a transition step extension

  const edges: Array<JssmTransition<mDT>> = [];

  const uFrom: Array<string> = (Array.isArray(from) ? from : [from]),
    uTo: Array<string> = (Array.isArray(to) ? to : [to]);

  uFrom.map((f: string) => {
    uTo.map((t: string) => {

      const right: JssmTransition<mDT> = makeTransition(this_se, f, t, true);
      if (right.kind !== 'none') { edges.push(right); }

      const left: JssmTransition<mDT> = makeTransition(this_se, t, f, false);
      if (left.kind !== 'none') { edges.push(left); }

    });
  });

  const new_acc: Array<JssmTransition<mDT>> = acc.concat(edges);

  if (next_se) {
    return compile_rule_transition_step(new_acc, to, next_se.to, next_se, next_se.se);
  } else {
    return new_acc;
  }

}



function compile_rule_handle_transition(rule: JssmCompileSeStart<StateType>): any { // TODO FIXME no any // todo typescript describe the parser representation of a transition
  return compile_rule_transition_step([], rule.from, rule.se.to, rule.se, rule.se.se);
}



function compile_rule_handler(rule: JssmCompileSeStart<StateType>): JssmCompileRule {

  if (rule.key === 'transition') {
    return { agg_as: 'transition', val: compile_rule_handle_transition(rule) };
  }

  if (rule.key === 'machine_language') {
    return { agg_as: 'machine_language', val: reduce_to_639(rule.value) };
  }

  if (rule.key === 'state_declaration') {
    if (!rule.name) { throw new Error('State declarations must have a name'); }
    return { agg_as: 'state_declaration', val: { state: rule.name, declarations: rule.value } };
  }

  if (['arrange_declaration', 'arrange_start_declaration',
    'arrange_end_declaration'].includes(rule.key)) {
    return { agg_as: rule.key, val: [rule.value] };
  }

  const tautologies: Array<string> = [
    'graph_layout', 'start_states', 'end_states', 'machine_name', 'machine_version',
    'machine_comment', 'machine_author', 'machine_contributor', 'machine_definition',
    'machine_reference', 'machine_license', 'fsl_version', 'state_config', 'theme',
    'flow', 'dot_preamble'
  ];

  if (tautologies.includes(rule.key)) {
    return { agg_as: rule.key, val: rule.value };
  }

  throw new Error(`compile_rule_handler: Unknown rule: ${JSON.stringify(rule)}`);

}





function compile<mDT>(tree: JssmParseTree): JssmGenericConfig<mDT> {

  const results: {
    graph_layout              : Array<JssmLayout>,
    transition                : Array<JssmTransition<mDT>>,
    start_states              : Array<string>,
    end_states                : Array<string>,
    state_config              : Array<any>,           // TODO COMEBACK no any
    state_declaration         : Array<string>,
    fsl_version               : Array<string>,
    machine_author            : Array<string>,
    machine_comment           : Array<string>,
    machine_contributor       : Array<string>,
    machine_definition        : Array<string>,
    machine_language          : Array<string>,
    machine_license           : Array<string>,
    machine_name              : Array<string>,
    machine_reference         : Array<string>,
    theme                     : Array<string>,
    flow                      : Array<string>,
    dot_preamble              : Array<string>,
    arrange_declaration       : Array<Array<string>>, // TODO COMEBACK CHECKME
    arrange_start_declaration : Array<Array<string>>, // TODO COMEBACK CHECKME
    arrange_end_declaration   : Array<Array<string>>, // TODO COMEBACK CHECKME
    machine_version           : Array<string>         // TODO COMEBACK semver
  } = {
    graph_layout              : [],
    transition                : [],
    start_states              : [],
    end_states                : [],
    state_config              : [],
    state_declaration         : [],
    fsl_version               : [],
    machine_author            : [],
    machine_comment           : [],
    machine_contributor       : [],
    machine_definition        : [],
    machine_language          : [],
    machine_license           : [],
    machine_name              : [],
    machine_reference         : [],
    theme                     : [],
    flow                      : [],
    dot_preamble              : [],
    arrange_declaration       : [],
    arrange_start_declaration : [],
    arrange_end_declaration   : [],
    machine_version           : []
  };

  tree.map((tr: JssmCompileSeStart<StateType>) => {

    const rule   : JssmCompileRule = compile_rule_handler(tr),
          agg_as : string          = rule.agg_as,
          val    : any             = rule.val;                  // TODO FIXME no any

    results[agg_as] = results[agg_as].concat(val);

  });

  const assembled_transitions: Array<JssmTransition<mDT>> = [].concat(...results['transition']);

  const result_cfg: JssmGenericConfig<mDT> = {
    start_states: results.start_states.length ? results.start_states : [assembled_transitions[0].from],
    transitions: assembled_transitions
  };

  const oneOnlyKeys: Array<string> = [
    'graph_layout', 'machine_name', 'machine_version', 'machine_comment',
    'fsl_version', 'machine_license', 'machine_definition', 'machine_language',
    'theme', 'flow', 'dot_preamble'
  ];

  oneOnlyKeys.map((oneOnlyKey: string) => {
    if (results[oneOnlyKey].length > 1) {
      throw new Error(
        `May only have one ${oneOnlyKey} statement maximum: ${JSON.stringify(results[oneOnlyKey])}`
      );
    } else {
      if (results[oneOnlyKey].length) {
        result_cfg[oneOnlyKey] = results[oneOnlyKey][0];
      }
    }
  });

  ['arrange_declaration', 'arrange_start_declaration', 'arrange_end_declaration',
    'machine_author', 'machine_contributor', 'machine_reference', 'state_declaration'].map(
      (multiKey: string) => {
        if (results[multiKey].length) {
          result_cfg[multiKey] = results[multiKey];
        }
      }
    );

  return result_cfg;

}





function make<mDT>(plan: string): JssmGenericConfig<mDT> {
  return compile(wrap_parse(plan));
}





function transfer_state_properties(state_decl: JssmStateDeclaration): JssmStateDeclaration {

  state_decl.declarations.map((d: JssmStateDeclarationRule) => {

    switch (d.key) {

      case 'shape'            : state_decl.shape           = d.value; break;
      case 'color'            : state_decl.color           = d.value; break;
      case 'corners'          : state_decl.corners         = d.value; break;
      case 'linestyle'        : state_decl.linestyle       = d.value; break;

      case 'text-color'       : state_decl.textColor       = d.value; break;
      case 'background-color' : state_decl.backgroundColor = d.value; break;
      case 'border-color'     : state_decl.borderColor     = d.value; break;

      default: throw new Error(`Unknown state property: '${JSON.stringify(d)}'`);

    }

  });

  return state_decl;

}





class Machine<mDT> {


  _state: StateType;
  _states: Map<StateType, JssmGenericState>;
  _edges: Array<JssmTransition<mDT>>;
  _edge_map: Map<StateType, Map<StateType, number>>;
  _named_transitions: Map<StateType, number>;
  _actions: Map<StateType, Map<StateType, number>>;
  _reverse_actions: Map<StateType, Map<StateType, number>>;
  _reverse_action_targets: Map<StateType, Map<StateType, number>>;

  _machine_author?: Array<string>;
  _machine_comment?: string;
  _machine_contributor?: Array<string>;
  _machine_definition?: string;
  _machine_language?: string;
  _machine_license?: string;
  _machine_name?: string;
  _machine_version?: string;
  _fsl_version?: string;
  _raw_state_declaration?: Array<Object>;
  _state_declarations: Map<StateType, JssmStateDeclaration>;

  _graph_layout: JssmLayout;
  _dot_preamble: string;
  _arrange_declaration: Array<Array<StateType>>;
  _arrange_start_declaration: Array<Array<StateType>>;
  _arrange_end_declaration: Array<Array<StateType>>;

  _theme: FslTheme;
  _flow: FslDirection;

  _has_hooks       : boolean;

  _has_basic_hooks : boolean;
  _has_named_hooks : boolean;
  _has_entry_hooks : boolean;
  _has_exit_hooks  : boolean;
  // no boolean for _has_any_transition_hook

  _hooks                    : Map<string, Function>;
  _named_hooks              : Map<string, Function>;
  _entry_hooks              : Map<string, Function>;
  _exit_hooks               : Map<string, Function>;
  _global_action_hooks      : Map<string, Function>;
  _any_action_hook          : HookHandler | undefined;
  _standard_transition_hook : HookHandler | undefined;
  _main_transition_hook     : HookHandler | undefined;
  _forced_transition_hook   : HookHandler | undefined;
  _any_transition_hook      : HookHandler | undefined;


  // whargarbl this badly needs to be broken up, monolith master
  constructor({
    start_states,
    complete = [],
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
    fsl_version,
    dot_preamble = undefined,
    arrange_declaration = [],
    arrange_start_declaration = [],
    arrange_end_declaration = [],
    theme = 'default',
    flow = 'down',
    graph_layout = 'dot'
  }: JssmGenericConfig<mDT>) {

    this._state = start_states[0];
    this._states = new Map();
    this._state_declarations = new Map();
    this._edges = [];
    this._edge_map = new Map();
    this._named_transitions = new Map();
    this._actions = new Map();
    this._reverse_actions = new Map();
    this._reverse_action_targets = new Map();   // todo

    this._machine_author = array_box_if_string(machine_author);
    this._machine_comment = machine_comment;
    this._machine_contributor = array_box_if_string(machine_contributor);
    this._machine_definition = machine_definition;
    this._machine_language = machine_language;
    this._machine_license = machine_license;
    this._machine_name = machine_name;
    this._machine_version = machine_version;
    this._raw_state_declaration = state_declaration || [];
    this._fsl_version = fsl_version;

    this._arrange_declaration = arrange_declaration;
    this._arrange_start_declaration = arrange_start_declaration;
    this._arrange_end_declaration = arrange_end_declaration;

    this._dot_preamble = dot_preamble;
    this._theme = theme;
    this._flow = flow;
    this._graph_layout = graph_layout;

    this._has_hooks       = false;

    this._has_basic_hooks = false;
    this._has_named_hooks = false;
    this._has_entry_hooks = false;
    this._has_exit_hooks  = false;
    // no need for a boolean has any transition hook, as it's one or nothing, so just test that for undefinedness

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
    this._standard_transition_hook = undefined;


    if (state_declaration) {
      state_declaration.map((state_decl: JssmStateDeclaration) => {

        if (this._state_declarations.has(state_decl.state)) { // no repeats
          throw new Error(`Added the same state declaration twice: ${JSON.stringify(state_decl.state)}`);
        }

        this._state_declarations.set(state_decl.state, transfer_state_properties(state_decl));

      });
    }


    transitions.map((tr: JssmTransition<mDT>) => {

      if (tr.from === undefined) { throw new Error(`transition must define 'from': ${JSON.stringify(tr)}`); }
      if (tr.to === undefined) { throw new Error(`transition must define 'to': ${JSON.stringify(tr)}`); }

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
        throw new Error(`already has ${JSON.stringify(tr.from)} to ${JSON.stringify(tr.to)}`);
      } else {
        cursor_from.to.push(tr.to);
        cursor_to.from.push(tr.from);
      }

      // add the edge; note its id
      this._edges.push(tr);
      const thisEdgeId: number = this._edges.length - 1;

      // guard against repeating a transition name
      if (tr.name) {
        if (this._named_transitions.has(tr.name)) {
          throw new Error(`named transition "${JSON.stringify(tr.name)}" already created`);
        } else {
          this._named_transitions.set(tr.name, thisEdgeId);
        }
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
          throw new Error(`action ${JSON.stringify(tr.action)} already attached to origin ${JSON.stringify(tr.from)}`);
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
                    throw new Error(`ro-action ${tr.to} already attached to action ${tr.action}`);
                  } else {
                    roActionMap.set(tr.action, thisEdgeId);
                  }
                } else {
                  throw new Error('should be impossible - flow doesn\'t know .set precedes .get yet again.  severe error?');
                }
        */
      }

    });

  }

  _new_state(state_config: JssmGenericState): StateType {

    if (this._states.has(state_config.name)) {
      throw new Error(`state ${JSON.stringify(state_config.name)} already exists`);
    }

    this._states.set(state_config.name, state_config);
    return state_config.name;

  }



  state(): StateType {
    return this._state;
  }

  /* whargarbl todo major
     when we reimplement this, reintroduce this change to the is_final call

    is_changing(): boolean {
      return true; // todo whargarbl
    }
  */


  state_is_final(whichState: StateType): boolean {
    return ((this.state_is_terminal(whichState)) && (this.state_is_complete(whichState)));
  }

  is_final(): boolean {
    //  return ((!this.is_changing()) && this.state_is_final(this.state()));
    return this.state_is_final(this.state());
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
      internal_state_impl_version: 1,

      actions: this._actions,
      edge_map: this._edge_map,
      edges: this._edges,
      named_transitions: this._named_transitions,
      reverse_actions: this._reverse_actions,
      //    reverse_action_targets : this._reverse_action_targets,
      state: this._state,
      states: this._states
    };

  }

  /*
    load_machine_state(): boolean {
      return false; // todo whargarbl
    }
  */


  states(): Array<StateType> {
    return Array.from(this._states.keys());
  }

  state_for(whichState: StateType): JssmGenericState {
    const state: JssmGenericState = this._states.get(whichState);
    if (state) { return state; }
    else { throw new Error(`no such state ${JSON.stringify(state)}`); }
  }

  has_state(whichState: StateType): boolean {
    return this._states.get(whichState) !== undefined;
  }



  list_edges(): Array<JssmTransition<mDT>> {
    return this._edges;
  }

  list_named_transitions(): Map<StateType, number> {
    return this._named_transitions;
  }

  list_actions(): Array<StateType> {
    return Array.from(this._actions.keys());
  }



  theme(): FslTheme {
    return this._theme;  // constructor sets this to "default" otherwise
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



  lookup_transition_for(from: StateType, to: StateType): JssmTransition<mDT> {
    const id: number = this.get_transition_by_state_names(from, to);
    return ((id === undefined) || (id === null)) ? undefined : this._edges[id];
  }



  list_transitions(whichState: StateType = this.state()): JssmTransitionList {
    return { entrances: this.list_entrances(whichState), exits: this.list_exits(whichState) };
  }

  list_entrances(whichState: StateType = this.state()): Array<StateType> {
    return (this._states.get(whichState)
      || { from: undefined }).from
      || [];
  }

  list_exits(whichState: StateType = this.state()): Array<StateType> {
    return (this._states.get(whichState)
      || { to: undefined }).to
      || [];
  }



  probable_exits_for(whichState: StateType): Array<JssmTransition<mDT>> {

    const wstate: JssmGenericState = this._states.get(whichState);
    if (!(wstate)) { throw new Error(`No such state ${JSON.stringify(whichState)} in probable_exits_for`); }

    const wstate_to: Array<StateType> = wstate.to,

      wtf: Array<JssmTransition<mDT>> // wstate_to_filtered -> wtf
        = wstate_to
          .map((ws): JssmTransition<mDT> => this.lookup_transition_for(this.state(), ws))
          .filter(Boolean);

    return wtf;

  }

  probabilistic_transition(): boolean {
    const selected: JssmTransition<mDT> = weighted_rand_select(this.probable_exits_for(this.state()));
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



  actions(whichState: StateType = this.state()): Array<StateType> {
    const wstate: Map<StateType, number> = this._reverse_actions.get(whichState);
    if (wstate) { return Array.from(wstate.keys()); }
    else { throw new Error(`No such state ${JSON.stringify(whichState)}`); }
  }

  list_states_having_action(whichState: StateType): Array<StateType> {
    const wstate: Map<StateType, number> = this._actions.get(whichState);
    if (wstate) { return Array.from(wstate.keys()); }
    else { throw new Error(`No such state ${JSON.stringify(whichState)}`); }
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
    if (!(ra_base)) { throw new Error(`No such state ${JSON.stringify(whichState)}`); }

    return Array.from(ra_base.values())
      .map((edgeId: number): JssmTransition<mDT> => this._edges[edgeId])
      .filter((o: JssmTransition<mDT>): boolean => o.from === whichState)
      .map((filtered: JssmTransition<mDT>): StateType => filtered.action);
  }

  probable_action_exits(whichState: StateType = this.state()): Array<any> { // these are mNT   // TODO FIXME no any
    const ra_base: Map<StateType, number> = this._reverse_actions.get(whichState);
    if (!(ra_base)) { throw new Error(`No such state ${JSON.stringify(whichState)}`); }

    return Array.from(ra_base.values())
      .map((edgeId: number): JssmTransition<mDT> => this._edges[edgeId])
      .filter((o: JssmTransition<mDT>): boolean => o.from === whichState)
      .map((filtered): any => ({
        action: filtered.action,          // TODO FIXME no any
        probability: filtered.probability
      })
      );
  }



  // TODO FIXME test that is_unenterable on non-state throws
  is_unenterable(whichState: StateType): boolean {
    if (!(this.has_state(whichState))) { throw new Error(`No such state ${whichState}`); }
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
    if (!(this.has_state(whichState))) { throw new Error(`No such state ${whichState}`); }
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
    else { throw new Error(`No such state ${JSON.stringify(whichState)}`); }
  }

  has_completes(): boolean {
    return this.states().some((x): boolean => this.state_is_complete(x));
  }



  // basic toolable hook call.  convenience wrappers will follow, like
  // hook(from, to, handler) and exit_hook(from, handler) and etc
  set_hook(HookDesc: HookDescription) {

    switch (HookDesc.kind) {

      case 'hook':
        this._hooks.set(hook_name(HookDesc.from, HookDesc.to), HookDesc.handler);
        this._has_hooks = true;
        break;

      case 'named':
        this._named_hooks.set(named_hook_name(HookDesc.from, HookDesc.to, HookDesc.action), HookDesc.handler);
        this._has_hooks = true;
        break;

      case 'global action':
        this._global_action_hooks.set(HookDesc.action, HookDesc.handler);
        this._has_hooks = true;
        break;

      case 'any action':
        this._any_action_hook = HookDesc.handler;
        this._has_hooks = true;
        break;

      case 'standard transition':
        this._standard_transition_hook = HookDesc.handler;
        this._has_hooks = true;
        break;

      case 'main transition':
        this._main_transition_hook = HookDesc.handler;
        this._has_hooks = true;
        break;

      case 'forced transition':
        this._forced_transition_hook = HookDesc.handler;
        this._has_hooks = true;
        break;

      case 'any transition':
        this._any_transition_hook = HookDesc.handler;
        this._has_hooks = true;
        break;

      case 'entry':
        this._entry_hooks.set(HookDesc.to, HookDesc.handler);
        this._has_hooks = true;
        break;

      case 'exit':
        this._exit_hooks.set(HookDesc.from, HookDesc.handler);
        this._has_hooks = true;
        break;

      default:
        console.log(`Unknown hook type ${(HookDesc as any).kind}, should be impossible`);
        throw new RangeError(`Unknown hook type ${(HookDesc as any).kind}, should be impossible`);

    }
  }



  hook(from: string, to: string, handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'hook', from, to, handler });
    return this;

  }



  hook_action(from: string, to: string, action: string, handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'named', from, to, action, handler });
    return this;

  }



  hook_global_action(action: string, handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'global action', action, handler });
    return this;

  }



  hook_any_action(handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'any action', handler });
    return this;

  }



  hook_standard_transition(handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'standard transition', handler });
    return this;

  }



  hook_main_transition(handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'main transition', handler });
    return this;

  }



  hook_forced_transition(handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'forced transition', handler });
    return this;

  }



  hook_any_transition(handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'any transition', handler });
    return this;

  }



  hook_entry(to: string, handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'entry', to, handler });
    return this;

  }



  hook_exit(from: string, handler: HookHandler): Machine<mDT> {

    // TODO: should this throw if setting the hook fails, or ignore it and continue?
    this.set_hook({ kind: 'exit', from, handler });
    return this;

  }



  // remove_hook(HookDesc: HookDescription) {
  //   throw 'TODO: Should remove hook here';
  // }



  edges_between(from: string, to: string): JssmTransition<mDT>[] {
    return this._edges.filter( edge => ((edge.from === from) && (edge.to === to)) );
  }



  transition_impl(newStateOrAction: StateType, newData: mDT | undefined, wasForced: boolean, wasAction: boolean): boolean {

    // TODO the forced-ness behavior needs to be cleaned up a lot here
    // TODO all the callbacks are wrong on forced, action, etc

    let valid      : boolean = false,
        trans_type : string,
        newState   : StateType;

    if (wasForced) {
      if (this.valid_force_transition(newStateOrAction, newData)) {
        valid      = true;
        trans_type = 'forced';
        newState   = newStateOrAction;
      }

    } else if (wasAction) {
      if (this.valid_action(newStateOrAction, newData)) {
        const edge: JssmTransition<mDT> = this.current_action_edge_for(newStateOrAction);
        valid                           = true;
        trans_type                      = edge.kind;
        newState                        = edge.to;
      }

    } else {
      if (this.valid_transition(newStateOrAction, newData)) {
        valid      = true;
        trans_type = this.edges_between(this._state, newStateOrAction)[0].kind;  // TODO this won't do the right thing if various edges have different types
        newState   = newStateOrAction;
      }
    }

    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    if (valid) {

      if (this._has_hooks) {

        if (wasAction) {
          // 1. any action hook
          if (this._any_action_hook !== undefined) {
            if ( this._any_action_hook() === false ) { return false; }
          }

          // 2. global specific action hook
          const maybe_ga_hook: Function | undefined = this._global_action_hooks.get(newStateOrAction);
          if (maybe_ga_hook !== undefined) {
            if (maybe_ga_hook({ action: newStateOrAction, forced: wasForced }) === false) {
              return false;
            }
          }
        }

        // 3. any transition hook
        if (this._any_transition_hook !== undefined) {
          if ( this._any_transition_hook() === false ) { return false; }
        }

        // 4. exit hook
        const maybe_ex_hook: Function | undefined = this._exit_hooks.get(this._state);

        if (maybe_ex_hook !== undefined) {
          if (maybe_ex_hook({ from: this._state, forced: wasForced }) === false) {
            return false;
          }
        }

        // 5. named transition / action hook
        if (wasAction) {

          const nhn: string  = named_hook_name(this._state, newState, newStateOrAction),
                n_maybe_hook = this._named_hooks.get(nhn);

          if (n_maybe_hook !== undefined) {
            if (n_maybe_hook({ from: this._state, to: newState, action: newStateOrAction }) === false) {
              return false;
            }
          }

        }

        // 6. regular hook
        const hn: string = hook_name(this._state, newState),
          maybe_hook: Function | undefined = this._hooks.get(hn);

        if (maybe_hook !== undefined) {
          if (maybe_hook({ from: this._state, to: newState, forced: wasForced, action: wasAction? newStateOrAction : undefined }) === false) {
            return false;
          }
        }

        // 7. edge type hook

        // 7a. standard transition hook
        if (trans_type === 'legal') {
          if (this._standard_transition_hook !== undefined) {
            // todo handle actions
            // todo handle forced
            if (this._standard_transition_hook({ from: this._state, to: newState }) === false) {
              return false;
            }
          }
        }

        // 7b. main type hook
        if (trans_type === 'main') {
          if (this._main_transition_hook !== undefined) {
            // todo handle actions
            // todo handle forced
            if (this._main_transition_hook({ from: this._state, to: newState }) === false) {
              return false;
            }
          }
        }

        // 7c. forced transition hook
        if (trans_type === 'forced') {
          if (this._forced_transition_hook !== undefined) {
            // todo handle actions
            // todo handle forced
            if (this._forced_transition_hook({ from: this._state, to: newState }) === false) {
              return false;
            }
          }
        }

        // 8. entry hook
        const maybe_en_hook: Function | undefined = this._entry_hooks.get(newState);

        if (maybe_en_hook !== undefined) {
          if (maybe_en_hook({ to: newState, forced: wasForced }) === false) {
            return false;
          }
        }

        this._state = newState;
        return true;

      // or without hooks
      } else {

        this._state = newState;
        return true;

      }

    // not valid
    } else {
      return false;
    }

  }





  action(actionName: StateType, newData?: mDT): boolean {
    return this.transition_impl(actionName, newData, false, true);
  }

  transition(newState: StateType, newData?: mDT): boolean {
    return this.transition_impl(newState, newData, false, false);
  }


  // can leave machine in inconsistent state.  generally do not use

  force_transition(newState: StateType, newData?: mDT): boolean {
    return this.transition_impl(newState, newData, true, false);
  }





  current_action_for(action: StateType): number {
    const action_base: Map<StateType, number> = this._actions.get(action);
    return action_base
      ? action_base.get(this.state())
      : undefined;
  }

  current_action_edge_for(action: StateType): JssmTransition<mDT> {
    const idx: number = this.current_action_for(action);
    if ((idx === undefined) || (idx === null)) { throw new Error(`No such action ${JSON.stringify(action)}`); }
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
    const transition_for: JssmTransition<mDT> = this.lookup_transition_for(this.state(), newState);

    if (!(transition_for)) { return false; }
    if (transition_for.forced_only) { return false; }

    return true;

  }

  valid_force_transition(newState: StateType, _newData?: mDT): boolean {  // todo comeback unignore newData
    // todo whargarbl implement data stuff
    // todo major incomplete whargarbl comeback
    return (this.lookup_transition_for(this.state(), newState) !== undefined);
  }

  /* eslint-disable no-use-before-define */
  /* eslint-disable class-methods-use-this */
  sm(template_strings: TemplateStringsArray, ...remainder /* , arguments */): Machine<mDT> {
    return sm(template_strings, ...remainder);
  }
  /* eslint-enable class-methods-use-this */
  /* eslint-enable no-use-before-define */


}





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





export {

  version,

  transfer_state_properties,

  Machine,

  make,
  wrap_parse as parse,
  compile,

  sm,

  arrow_direction,
  arrow_left_kind,
  arrow_right_kind,

  // WHARGARBL TODO these should be exported to a utility library
  seq,
  weighted_rand_select,
  histograph,
  weighted_sample_select,
  weighted_histo_key

};
