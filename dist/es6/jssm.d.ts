declare type StateType = string;
import { JssmGenericState, JssmGenericConfig, JssmTransition, JssmTransitionList, // JssmTransitionRule,
JssmMachineInternalState, JssmParseTree, JssmStateDeclaration, JssmArrow, JssmArrowDirection, JssmArrowKind, JssmLayout, FslDirection, FslTheme, HookDescription, HookHandler } from './jssm_types';
import { seq, weighted_rand_select, weighted_sample_select, histograph, weighted_histo_key } from './jssm_util';
import { shapes, gviz_shapes, named_colors } from './jssm_constants';
import { version } from './version';
/*********
 *
 *  Return the direction of an arrow - `right`, `left`, or `both`.
 *
 *  ```typescript
 *  import { arrow_direction } from './jssm';
 *
 *  arrow_direction('->');    // 'right'
 *  arrow_direction('<~=>');  // 'both'
 *  ```
 *
 */
declare function arrow_direction(arrow: JssmArrow): JssmArrowDirection;
/*********
 *
 *  Return the direction of an arrow - `right`, `left`, or `both`.
 *
 *  ```typescript
 *  import { arrow_left_kind } from './jssm';
 *
 *  arrow_left_kind('<-');    // 'legal'
 *  arrow_left_kind('<=');    // 'main'
 *  arrow_left_kind('<~');    // 'forced'
 *  arrow_left_kind('<->');   // 'legal'
 *  arrow_left_kind('->');    // 'none'
 *  ```
 *
 */
declare function arrow_left_kind(arrow: JssmArrow): JssmArrowKind;
/*********
 *
 *  Return the direction of an arrow - `right`, `left`, or `both`.
 *
 *  ```typescript
 *  import { arrow_left_kind } from './jssm';
 *
 *  arrow_left_kind('->');    // 'legal'
 *  arrow_left_kind('=>');    // 'main'
 *  arrow_left_kind('~>');    // 'forced'
 *  arrow_left_kind('<->');   // 'legal'
 *  arrow_left_kind('<-');    // 'none'
 *  ```
 *
 */
declare function arrow_right_kind(arrow: JssmArrow): JssmArrowKind;
/*********
 *
 *  This method wraps the parser call that comes from the peg grammar,
 *  {@link parse}.  Generally neither this nor that should be used directly
 *  unless you mean to develop plugins or extensions for the machine.
 *
 *  Parses the intermediate representation of a compiled string down to a
 *  machine configuration object.  If you're using this (probably don't,) you're
 *  probably also using {@link compile} and {@link Machine.constructor}.
 *
 *  ```typescript
 *  import { parse, compile, Machine } from './jssm';
 *
 *  const intermediate = wrap_parse('a -> b;', {});
 *  // [ {key:'transition', from:'a', se:{kind:'->',to:'b'}} ]
 *
 *  const cfg = compile(intermediate);
 *  // { start_states:['a'], transitions: [{ from:'a', to:'b', kind:'legal', forced_only:false, main_path:false }] }
 *
 *  const machine = new Machine(cfg);
 *  // Machine { _instance_name: undefined, _state: 'a', ...
 *  ```
 *
 *  This method is mostly for plugin and intermediate tool authors, or people
 *  who need to work with the machine's intermediate representation.
 *
 *  # Hey!
 *
 *  Most people looking at this want either the `sm` operator or method `from`,
 *  which perform all the steps in the chain.  The library's author mostly uses
 *  operator `sm`, and mostly falls back to `.from` when needing to parse
 *  strings dynamically instead of from template literals.
 *
 *  Operator {@link sm}:
 *
 *  ```typescript
 *  import { sm } from './jssm';
 *
 *  const switch = sm`on <=> off;`;
 *  ```
 *
 *  Method {@link from}:
 *
 *  ```typescript
 *  import * as jssm from './jssm';
 *
 *  const toggle = jssm.from('up <=> down;');
 *  ```
 *
 *  `wrap_parse` itself is an internal convenience method for alting out an
 *  object as the options call.  Not generally meant for external use.
 *
 */
declare function wrap_parse(input: string, options?: Object): any;
/*********
 *
 *  Compile a machine's JSON intermediate representation to a config object.  If
 *  you're using this (probably don't,) you're probably also using
 *  {@link parse} to get the IR, and the object constructor
 *  {@link Machine.construct} to turn the config object into a workable machine.
 *
 *  ```typescript
 *  import { parse, compile, Machine } from './jssm';
 *
 *  const intermediate = parse('a -> b;');
 *  // [ {key:'transition', from:'a', se:{kind:'->',to:'b'}} ]
 *
 *  const cfg = compile(intermediate);
 *  // { start_states:['a'], transitions: [{ from:'a', to:'b', kind:'legal', forced_only:false, main_path:false }] }
 *
 *  const machine = new Machine(cfg);
 *  // Machine { _instance_name: undefined, _state: 'a', ...
 *  ```
 *
 *  This method is mostly for plugin and intermediate tool authors, or people
 *  who need to work with the machine's intermediate representation.
 *
 *  # Hey!
 *
 *  Most people looking at this want either the `sm` operator or method `from`,
 *  which perform all the steps in the chain.  The library's author mostly uses
 *  operator `sm`, and mostly falls back to `.from` when needing to parse
 *  strings dynamically instead of from template literals.
 *
 *  Operator {@link sm}:
 *
 *  ```typescript
 *  import { sm } from './jssm';
 *
 *  const switch = sm`on <=> off;`;
 *  ```
 *
 *  Method {@link from}:
 *
 *  ```typescript
 *  import * as jssm from './jssm';
 *
 *  const toggle = jssm.from('up <=> down;');
 *  ```
 *
 */
declare function compile<mDT>(tree: JssmParseTree): JssmGenericConfig<mDT>;
/*********
 *
 *  An internal convenience wrapper for parsing then compiling a machine string.
 *  Not generally meant for external use.  Please see {@link compile} or
 *  {@link sm}.
 *
 */
declare function make<mDT>(plan: string): JssmGenericConfig<mDT>;
/*********
 *
 *  An internal method meant to take a series of declarations and fold them into
 *  a single multi-faceted declaration, in the process of building a state.  Not
 *  generally meant for external use.
 *
 */
declare function transfer_state_properties(state_decl: JssmStateDeclaration): JssmStateDeclaration;
declare class Machine<mDT> {
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
    _instance_name: string;
    _graph_layout: JssmLayout;
    _dot_preamble: string;
    _arrange_declaration: Array<Array<StateType>>;
    _arrange_start_declaration: Array<Array<StateType>>;
    _arrange_end_declaration: Array<Array<StateType>>;
    _theme: FslTheme;
    _flow: FslDirection;
    _has_hooks: boolean;
    _has_basic_hooks: boolean;
    _has_named_hooks: boolean;
    _has_entry_hooks: boolean;
    _has_exit_hooks: boolean;
    _has_global_action_hooks: boolean;
    _has_transition_hooks: boolean;
    _hooks: Map<string, Function>;
    _named_hooks: Map<string, Function>;
    _entry_hooks: Map<string, Function>;
    _exit_hooks: Map<string, Function>;
    _global_action_hooks: Map<string, Function>;
    _any_action_hook: HookHandler | undefined;
    _standard_transition_hook: HookHandler | undefined;
    _main_transition_hook: HookHandler | undefined;
    _forced_transition_hook: HookHandler | undefined;
    _any_transition_hook: HookHandler | undefined;
    constructor({ start_states, complete, transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, state_declaration, fsl_version, dot_preamble, arrange_declaration, arrange_start_declaration, arrange_end_declaration, theme, flow, graph_layout, instance_name }: JssmGenericConfig<mDT>);
    _new_state(state_config: JssmGenericState): StateType;
    state(): StateType;
    state_is_final(whichState: StateType): boolean;
    is_final(): boolean;
    graph_layout(): string;
    dot_preamble(): string;
    machine_author(): Array<string>;
    machine_comment(): string;
    machine_contributor(): Array<string>;
    machine_definition(): string;
    machine_language(): string;
    machine_license(): string;
    machine_name(): string;
    machine_version(): string;
    raw_state_declarations(): Array<Object>;
    state_declaration(which: StateType): JssmStateDeclaration;
    state_declarations(): Map<StateType, JssmStateDeclaration>;
    fsl_version(): string;
    machine_state(): JssmMachineInternalState<mDT>;
    states(): Array<StateType>;
    state_for(whichState: StateType): JssmGenericState;
    has_state(whichState: StateType): boolean;
    list_edges(): Array<JssmTransition<mDT>>;
    list_named_transitions(): Map<StateType, number>;
    list_actions(): Array<StateType>;
    theme(): FslTheme;
    flow(): FslDirection;
    get_transition_by_state_names(from: StateType, to: StateType): number;
    lookup_transition_for(from: StateType, to: StateType): JssmTransition<mDT>;
    list_transitions(whichState?: StateType): JssmTransitionList;
    list_entrances(whichState?: StateType): Array<StateType>;
    list_exits(whichState?: StateType): Array<StateType>;
    probable_exits_for(whichState: StateType): Array<JssmTransition<mDT>>;
    probabilistic_transition(): boolean;
    probabilistic_walk(n: number): Array<StateType>;
    probabilistic_histo_walk(n: number): Map<StateType, number>;
    actions(whichState?: StateType): Array<StateType>;
    list_states_having_action(whichState: StateType): Array<StateType>;
    list_exit_actions(whichState?: StateType): Array<StateType>;
    probable_action_exits(whichState?: StateType): Array<any>;
    is_unenterable(whichState: StateType): boolean;
    has_unenterables(): boolean;
    is_terminal(): boolean;
    state_is_terminal(whichState: StateType): boolean;
    has_terminals(): boolean;
    is_complete(): boolean;
    state_is_complete(whichState: StateType): boolean;
    has_completes(): boolean;
    set_hook(HookDesc: HookDescription): void;
    hook(from: string, to: string, handler: HookHandler): Machine<mDT>;
    hook_action(from: string, to: string, action: string, handler: HookHandler): Machine<mDT>;
    hook_global_action(action: string, handler: HookHandler): Machine<mDT>;
    hook_any_action(handler: HookHandler): Machine<mDT>;
    hook_standard_transition(handler: HookHandler): Machine<mDT>;
    hook_main_transition(handler: HookHandler): Machine<mDT>;
    hook_forced_transition(handler: HookHandler): Machine<mDT>;
    hook_any_transition(handler: HookHandler): Machine<mDT>;
    hook_entry(to: string, handler: HookHandler): Machine<mDT>;
    hook_exit(from: string, handler: HookHandler): Machine<mDT>;
    edges_between(from: string, to: string): JssmTransition<mDT>[];
    transition_impl(newStateOrAction: StateType, newData: mDT | undefined, wasForced: boolean, wasAction: boolean): boolean;
    action(actionName: StateType, newData?: mDT): boolean;
    transition(newState: StateType, newData?: mDT): boolean;
    force_transition(newState: StateType, newData?: mDT): boolean;
    current_action_for(action: StateType): number;
    current_action_edge_for(action: StateType): JssmTransition<mDT>;
    valid_action(action: StateType, _newData?: mDT): boolean;
    valid_transition(newState: StateType, _newData?: mDT): boolean;
    valid_force_transition(newState: StateType, _newData?: mDT): boolean;
    instance_name(): string | undefined;
    sm(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
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
 *  import * as jssm from './jssm';
 *
 *  const switch = jssm.from('on <=> off;');
 *  ```
 *
 */
declare function sm<mDT>(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
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
 *  import * as jssm from './jssm';
 *
 *  const switch = jssm.from('on <=> off;');
 *  ```
 *
 */
declare function from<mDT>(MachineAsString: string, ExtraConstructorFields?: Partial<JssmGenericConfig<mDT>> | undefined): Machine<mDT>;
export { version, transfer_state_properties, Machine, make, wrap_parse as parse, compile, sm, from, arrow_direction, arrow_left_kind, arrow_right_kind, seq, weighted_rand_select, histograph, weighted_sample_select, weighted_histo_key, shapes, gviz_shapes, named_colors };
