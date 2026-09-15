type StateType = string;
import { JssmGenericState, JssmGenericConfig, JssmStateConfig, JssmTransition, JssmTransitionList, // JssmTransitionRule,
JssmMachineInternalState, JssmAllowsOverride, JssmAllowIslands, JssmEditorConfig, JssmStochasticOptions, JssmStochasticRun, JssmStochasticSummary, JssmDefaultSize, JssmParsedSemver, JssmStateDeclaration, JssmTransitionConfig, JssmGraphConfig, JssmLayout, JssmHistory, JssmSerialization, JssmValType, FslDirection, FslTheme, HookDescription, HookHandler, EverythingHookHandler, PostEverythingHookHandler, HookPhase, HookRegistryEntry, HookQuery, JssmEventName, JssmEventDetailMap, JssmEventFilter, JssmEventHandler, JssmUnsubscribe, JssmGroupRegistry, JssmGroupHooks, JssmStateHooks, JssmRng } from '../jssm_types.js';
import { Interner } from '../jssm_intern.js';
declare const shapes: string[], gviz_shapes: string[], named_colors: string[], state_name_chars: readonly {
    from: string;
    to: string;
}[], state_name_first_chars: readonly {
    from: string;
    to: string;
}[], action_label_chars: readonly {
    from: string;
    to: string;
}[], is_state_name_first_char: (ch: string) => boolean, is_state_name_char: (ch: string) => boolean;
import type { JssmEventEntry } from './events.js';
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
 *  @typeParam mDT The machine data type — the type of the value stored in
 *  `.data()`.  Defaults to `undefined` when no data is used.
 *
 */
declare class Machine<mDT> {
    _state: StateType;
    _states: Map<StateType, JssmGenericState>;
    _edges: Array<JssmTransition<StateType, mDT>>;
    _edge_map: Map<StateType, Map<StateType, number>>;
    _outbound_edge_ids: Map<StateType, Array<number>>;
    _named_transitions: Map<StateType, number>;
    _actions: Map<StateType, Map<StateType, number>>;
    _reverse_actions: Map<StateType, Map<StateType, number>>;
    _reverse_action_targets: Map<StateType, Map<StateType, number>>;
    _state_interner: Interner;
    _action_interner: Interner;
    _state_id: number;
    _edge_id_by_pair: Map<number, number>;
    _edge_id_by_action_pair: Map<number, number>;
    _edge_to_ids: Array<number>;
    _start_states: Set<StateType>;
    _start_state_weights: Map<StateType, number>;
    _end_states: Set<StateType>;
    _failed_outputs: Set<StateType>;
    _machine_author?: Array<string>;
    _machine_comment?: string;
    _machine_contributor?: Array<string>;
    _machine_definition?: string;
    _machine_language?: string;
    _machine_license?: string;
    _machine_name?: string;
    _machine_version?: JssmParsedSemver;
    _npm_name?: string;
    _default_size?: JssmDefaultSize;
    _fsl_version?: JssmParsedSemver;
    _raw_state_declaration?: Array<object>;
    _state_declarations: Map<StateType, JssmStateDeclaration>;
    _data?: mDT;
    _instance_name: string;
    _rng_seed: number;
    _rng: JssmRng;
    _graph_layout: JssmLayout;
    _dot_preamble: string;
    _default_transition_config: JssmTransitionConfig | undefined;
    _default_graph_config: JssmGraphConfig | undefined;
    _arrange_declaration: Array<Array<StateType>>;
    _arrange_start_declaration: Array<Array<StateType>>;
    _arrange_end_declaration: Array<Array<StateType>>;
    _oarrange_declaration: Array<Array<StateType>>;
    _farrange_declaration: Array<Array<StateType>>;
    _themes: FslTheme[];
    _flow: FslDirection;
    _has_hooks: boolean;
    _has_basic_hooks: boolean;
    _has_named_hooks: boolean;
    _has_entry_hooks: boolean;
    _has_exit_hooks: boolean;
    _has_after_hooks: boolean;
    _has_global_action_hooks: boolean;
    _has_transition_hooks: boolean;
    _has_forced_transitions: boolean;
    _hooks: Map<number, HookHandler<mDT>>;
    _named_hooks: Map<number, Map<number, HookHandler<mDT>>>;
    _entry_hooks: Map<number, HookHandler<mDT>>;
    _exit_hooks: Map<number, HookHandler<mDT>>;
    _after_hooks: Map<string, HookHandler<mDT>>;
    _after_any_hook: HookHandler<mDT> | undefined;
    _global_action_hooks: Map<number, HookHandler<mDT>>;
    _any_action_hook: HookHandler<mDT> | undefined;
    _standard_transition_hook: HookHandler<mDT> | undefined;
    _main_transition_hook: HookHandler<mDT> | undefined;
    _forced_transition_hook: HookHandler<mDT> | undefined;
    _any_transition_hook: HookHandler<mDT> | undefined;
    _has_post_hooks: boolean;
    _has_post_basic_hooks: boolean;
    _has_post_named_hooks: boolean;
    _has_post_entry_hooks: boolean;
    _has_post_exit_hooks: boolean;
    _has_post_global_action_hooks: boolean;
    _has_post_transition_hooks: boolean;
    _code_allows_override: JssmAllowsOverride;
    _config_allows_override: JssmAllowsOverride;
    _allow_islands: JssmAllowIslands;
    _editor_config?: JssmEditorConfig;
    _post_hooks: Map<number, HookHandler<mDT>>;
    _post_named_hooks: Map<number, Map<number, HookHandler<mDT>>>;
    _post_entry_hooks: Map<number, HookHandler<mDT>>;
    _post_exit_hooks: Map<number, HookHandler<mDT>>;
    _post_global_action_hooks: Map<number, HookHandler<mDT>>;
    _post_any_action_hook: HookHandler<mDT> | undefined;
    _post_standard_transition_hook: HookHandler<mDT> | undefined;
    _post_main_transition_hook: HookHandler<mDT> | undefined;
    _post_forced_transition_hook: HookHandler<mDT> | undefined;
    _post_any_transition_hook: HookHandler<mDT> | undefined;
    _pre_everything_hook: EverythingHookHandler<mDT> | undefined;
    _everything_hook: EverythingHookHandler<mDT> | undefined;
    _pre_post_everything_hook: PostEverythingHookHandler<mDT> | undefined;
    _post_everything_hook: PostEverythingHookHandler<mDT> | undefined;
    _property_keys: Set<string>;
    _default_properties: Map<string, any>;
    _state_properties: Map<string, any>;
    _required_properties: Set<string>;
    _state_property_first_state: Map<string, StateType>;
    _val_keys: Set<string>;
    _val_types: Map<string, JssmValType>;
    _val_values: Map<string, any>;
    _required_vals: Set<string>;
    _history: JssmHistory<mDT>;
    _history_length: number;
    _state_style: JssmStateConfig;
    _active_state_style: JssmStateConfig;
    _hooked_state_style: JssmStateConfig;
    _terminal_state_style: JssmStateConfig;
    _start_state_style: JssmStateConfig;
    _end_state_style: JssmStateConfig;
    _group_registry: JssmGroupRegistry;
    _group_metadata: Map<string, JssmStateConfig>;
    _group_hooks: JssmGroupHooks;
    _state_hooks: JssmStateHooks;
    _state_to_groups: Map<StateType, Set<string>>;
    _group_order: string[];
    _static_state_config_cache: Map<StateType, JssmStateConfig>;
    _state_labels: Map<string, string>;
    _time_source: () => number;
    _create_started: number;
    _created: number;
    _after_mapping: Map<string, [string, number]>;
    _timeout_source: (f: () => void, a: number) => number;
    _clear_timeout_source: (h: number) => void;
    _timeout_handle: number | undefined;
    _timeout_target: string | undefined;
    _timeout_target_time: number | undefined;
    _event_handlers: Map<JssmEventName, Set<JssmEventEntry<any, any>>>;
    _event_listener_count: number;
    _firing_error: boolean;
    _committing_transition: boolean;
    _boundary_depth: number;
    _boundary_depth_limit: number;
    constructor({ start_states, start_state_weights, end_states, failed_outputs, initial_state, start_states_no_enforce, complete, transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, npm_name, default_size, state_declaration, property_definition, val_definition, vals, state_property, fsl_version, dot_preamble, arrange_declaration, arrange_start_declaration, arrange_end_declaration, oarrange_declaration, farrange_declaration, theme, flow, graph_layout, instance_name, history, boundary_depth_limit, data, default_state_config, default_active_state_config, default_hooked_state_config, default_terminal_state_config, default_start_state_config, default_end_state_config, default_transition_config, default_graph_config, group_registry, group_metadata, group_hooks, state_hooks, allows_override, config_allows_override, allow_islands, editor_config, rng_seed, time_source, timeout_source, clear_timeout_source }: JssmGenericConfig<StateType, mDT>);
    /********
     *
     *  Internal method for fabricating states.  Not meant for external use.
     *  Delegates to the create family's {@link new_state}, which carries the
     *  full contract.
     *
     *  @see new_state
     *
     *  @internal
     *
     */
    _new_state(state_config: JssmGenericState): StateType;
    /**
     *  Get the current state of a machine.  Delegates to the query family's
     *  {@link state}, which carries the full contract and example.
     *  @see state
     */
    state(): StateType;
    /**
     *  Get the label for a given state, if any.  Delegates to the query
     *  family's {@link label_for}, which carries the full contract and example.
     *  @see label_for
     */
    label_for(state: StateType): string;
    /**
     *  Get whatever the node should show as text.  Delegates to the query
     *  family's {@link display_text}, which carries the full contract and
     *  example.
     *  @see display_text
     */
    display_text(state: StateType): string;
    /**
     *  Get the current data of a machine, as a deep clone.  Delegates to the
     *  data family's {@link data}, which carries the full contract and example.
     *  @see data
     */
    data(): mDT;
    /**
     *  Replace the machine's data in place, without a transition.  Delegates
     *  to the data family's {@link set_data}, which carries the full contract
     *  and example.
     *  @returns The machine, for chaining.
     *  @see set_data
     */
    set_data(newData: mDT): Machine<mDT>;
    /**
     *  The machine's current data by REFERENCE — no clone.  Delegates to the
     *  data family's {@link data_ref}, which carries the full contract; kept
     *  on the class because the same-package panels (`fsl_bind_wc`) and tests
     *  reach it by this name.
     *  @returns The live data value; treat as read-only.
     *  @see data_ref
     *  @internal
     */
    _data_ref(): mDT;
    /**
     *  Get the current value of a given property name, or `undefined`.
     *  Delegates to the data family's {@link prop}, which carries the full
     *  contract and example.
     *  @see prop
     */
    prop(name: string): any;
    /**
     *  Get the current value of a given property name, throwing when it is
     *  missing.  Delegates to the data family's {@link strict_prop}, which
     *  carries the full contract and example.
     *  @throws {JssmError} If the property is not defined on the current state
     *  and has no default.
     *  @see strict_prop
     */
    strict_prop(name: string): any;
    /**
     *  Get the current value of every prop, as an object.  Delegates to the
     *  data family's {@link props}, which carries the full contract and
     *  example.
     *  @see props
     */
    props(): object;
    /**
     *  Check whether a given string is a known property's name.  Delegates to
     *  the data family's {@link known_prop}.
     *  @see known_prop
     */
    known_prop(prop_name: string): boolean;
    /**
     *  List all known property names.  Delegates to the data family's
     *  {@link known_props}.
     *  @see known_props
     */
    known_props(): string[];
    /**
     *  Read the current value of a declared machine `val`.  Delegates to the
     *  data family's {@link val}, which carries the full contract and example.
     *  @throws {JssmError} If `name` is not a declared val.
     *  @see val
     */
    val(name: string): any;
    /**
     *  Set the value of a declared machine `val`, validating it against the
     *  val's declared type.  Delegates to the data family's {@link set_val},
     *  which carries the full contract and example.
     *  @throws {JssmError} If `name` is not a declared val, or `value` violates the type.
     *  @see set_val
     */
    set_val(name: string, value: any): void;
    /**
     *  Return a plain object mapping every declared val name to its current
     *  value.  Delegates to the data family's {@link vals}.
     *  @see vals
     */
    vals(): object;
    /**
     *  Check whether a string is the name of a declared `val`.  Delegates to
     *  the data family's {@link known_val}.
     *  @see known_val
     */
    known_val(name: string): boolean;
    /**
     *  List every declared `val` name, in declaration order.  Delegates to the
     *  data family's {@link known_vals}.
     *  @see known_vals
     */
    known_vals(): string[];
    /**
     *  Return the declared type descriptor of a `val`.  Delegates to the data
     *  family's {@link val_type}.
     *  @throws {JssmError} If `name` is not a declared val.
     *  @see val_type
     */
    val_type(name: string): JssmValType;
    /**
     *  Check whether a given state is a valid start state.  Delegates to the
     *  query family's {@link is_start_state}, which carries the full contract
     *  and example.
     *  @see is_start_state
     */
    is_start_state(whichState: StateType): boolean;
    /**
     *  The initial distribution declared by a weighted `start_states` list
     *  (6.0).  Delegates to the stochastic family's
     *  {@link start_state_weights}, which carries the full contract and
     *  example.
     *  @see start_state_weights
     */
    start_state_weights(): Map<StateType, number>;
    /**
     *  Draws a start state from the weighted start distribution using the
     *  machine's RNG.  Delegates to the stochastic family's
     *  {@link sample_start_state}, which carries the full contract and
     *  example.
     *  @see sample_start_state
     */
    sample_start_state(): StateType;
    /**
     *  Check whether a given state is a declared end state.  Delegates to the
     *  query family's {@link is_end_state}, which carries the full contract
     *  and example.
     *  @see is_end_state
     */
    is_end_state(whichState: StateType): boolean;
    /**
     *  Get the set of states declared as failure outputs for this machine.
     *  Delegates to the query family's {@link failed_outputs}.
     *  @see failed_outputs
     */
    failed_outputs(): Array<StateType>;
    /**
     *  Check whether a given state is declared as a failure output.  Delegates
     *  to the query family's {@link is_failed_output}.
     *  @see is_failed_output
     */
    is_failed_output(whichState: StateType): boolean;
    /**
     *  Check whether the machine is currently in a failure state.  Delegates
     *  to the query family's {@link is_failed}.
     *  @see is_failed
     */
    is_failed(): boolean;
    /**
     *  Check whether a given state is final (either has no exits or is marked
     *  `complete`.)  Delegates to the query family's {@link state_is_final},
     *  which carries the full contract and example.
     *  @see state_is_final
     */
    state_is_final(whichState: StateType): boolean;
    /**
     *  Check whether the current state is final.  Delegates to the query
     *  family's {@link is_final}, which carries the full contract and example.
     *  @see is_final
     */
    is_final(): boolean;
    /**
     *  Serialize the current machine to a structure.  Delegates to the create
     *  family's {@link serialize}, which carries the full contract.
     *  @see serialize
     */
    serialize(comment?: string): JssmSerialization<mDT>;
    /**
     *  The RFC 8785 canonical-config identity of the current configuration.
     *  Delegates to the query family's {@link canonical}, which carries the
     *  full contract and example.
     *  @returns The canonical config string.
     *  @see canonical
     */
    canonical(): string;
    /**
     * Get the graph layout direction.  Delegates to the style family's
     *  {@link graph_layout}.
     *  @see graph_layout
     */
    graph_layout(): string;
    /**
     * Get the Graphviz DOT preamble string.  Delegates to the style family's
     *  {@link dot_preamble}.
     *  @see dot_preamble
     */
    dot_preamble(): string;
    /**
     * Get the consolidated `transition: {}` default-config block.  Delegates
     *  to the style family's {@link default_transition_config}, which carries
     *  the full contract and example.
     *  @see default_transition_config
     */
    default_transition_config(): JssmTransitionConfig | undefined;
    /**
     * Get the consolidated `graph: {}` default-config block.  Delegates to
     *  the style family's {@link default_graph_config}, which carries the full
     *  contract and example.
     *  @see default_graph_config
     */
    default_graph_config(): JssmGraphConfig | undefined;
    /**
     * Get the machine's author list.  Delegates to the query family's
     *  {@link machine_author}.
     *  @see machine_author
     */
    machine_author(): Array<string>;
    /**
     * Get the machine's comment string.  Delegates to the query family's
     *  {@link machine_comment}.
     *  @see machine_comment
     */
    machine_comment(): string;
    /**
     * Get the machine's contributor list.  Delegates to the query family's
     *  {@link machine_contributor}.
     *  @see machine_contributor
     */
    machine_contributor(): Array<string>;
    /**
     * Get the machine's definition string.  Delegates to the query family's
     *  {@link machine_definition}.
     *  @see machine_definition
     */
    machine_definition(): string;
    /**
     * Get the machine's natural language as an ISO 639-1 code.  Delegates to
     *  the query family's {@link machine_language}, which carries the full
     *  contract.
     *  @see machine_language
     */
    machine_language(): string;
    /**
     * Get the machine's license string.  Delegates to the query family's
     *  {@link machine_license}.
     *  @see machine_license
     */
    machine_license(): string;
    /**
     * Get the machine's name.  Delegates to the query family's
     *  {@link machine_name}.
     *  @see machine_name
     */
    machine_name(): string;
    /**
     * The editor/panel defaults declared in the FSL `editor: {}` block, or
     *  `undefined`.  Delegates to the query family's {@link editor_config},
     *  which carries the full contract and example.
     *  @see editor_config
     */
    editor_config(): JssmEditorConfig | undefined;
    /**
     * Get the npm package name associated with the machine, or `undefined`.
     *  Delegates to the query family's {@link npm_name}.
     *  @see npm_name
     */
    npm_name(): string;
    /**
     * Get the render-size hint for the machine's visualization, or
     *  `undefined`.  Delegates to the query family's {@link default_size},
     *  which carries the full contract.
     *  @see default_size
     */
    default_size(): JssmDefaultSize | undefined;
    /**
     * Get the machine's declared version, parsed, or `undefined`.  Delegates
     *  to the query family's {@link machine_version}, which carries the full
     *  contract and example.
     *  @see machine_version
     */
    machine_version(): JssmParsedSemver | undefined;
    /**
     * Get the raw state declaration objects as parsed from the FSL source.
     *  Delegates to the query family's {@link raw_state_declarations}.
     *  @see raw_state_declarations
     */
    raw_state_declarations(): Array<object>;
    /**
     * Get the processed state declaration for a specific state.  Delegates to
     *  the query family's {@link state_declaration}.
     *  @see state_declaration
     */
    state_declaration(which: StateType): JssmStateDeclaration;
    /**
     * Get all processed state declarations as a Map.  Delegates to the query
     *  family's {@link state_declarations}.
     *  @see state_declarations
     */
    state_declarations(): Map<StateType, JssmStateDeclaration>;
    /**
     * Get the FSL language version this machine declares, parsed, or
     *  `undefined`.  Delegates to the query family's {@link fsl_version},
     *  which carries the full contract and example.
     *  @see fsl_version
     */
    fsl_version(): JssmParsedSemver | undefined;
    /**
     * Get the complete internal state of the machine as a serializable
     *  structure.  Delegates to the query family's {@link machine_state}.
     *  @see machine_state
     */
    machine_state(): JssmMachineInternalState<mDT>;
    /**
     *  List all the states known by the machine.  Delegates to the query
     *  family's {@link states}, which carries the full contract and example.
     *  @see states
     */
    states(): Array<StateType>;
    /**
     * Get the internal state descriptor for a given state name.  Delegates to
     *  the query family's {@link state_for}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_for
     */
    state_for(whichState: StateType): JssmGenericState;
    /**
     *  Check whether the machine knows a given state.  Delegates to the query
     *  family's {@link has_state}, which carries the full contract and example.
     *  @see has_state
     */
    has_state(whichState: StateType): boolean;
    /**
     *  Lists all edges of a machine.  Delegates to the query family's
     *  {@link list_edges}, which carries the full contract and example.
     *  @see list_edges
     */
    list_edges(): Array<JssmTransition<StateType, mDT>>;
    /**
     * Get the map of named transitions.  Delegates to the query family's
     *  {@link list_named_transitions}.
     *  @see list_named_transitions
     */
    list_named_transitions(): Map<StateType, number>;
    /**
     * List all distinct action names defined anywhere in the machine.
     *  Delegates to the query family's {@link list_actions}.
     *  @see list_actions
     */
    list_actions(): Array<StateType>;
    /**
     * Whether any actions are defined on this machine.  Delegates to the
     *  query family's {@link uses_actions}.
     *  @see uses_actions
     */
    get uses_actions(): boolean;
    /**
     * Whether any forced (`~>`) transitions exist in this machine.  Delegates
     *  to the query family's {@link uses_forced_transitions}.
     *  @see uses_forced_transitions
     */
    get uses_forced_transitions(): boolean;
    /**
     *  Check if the code that built the machine allows overriding state and
     *  data.  Delegates to the query family's {@link code_allows_override}.
     *  @see code_allows_override
     */
    get code_allows_override(): JssmAllowsOverride;
    /**
     *  Check if the machine config allows overriding state and data.
     *  Delegates to the query family's {@link config_allows_override}.
     *  @see config_allows_override
     */
    get config_allows_override(): JssmAllowsOverride;
    /**
     *  Check if a machine allows overriding state and data, resolving code
     *  and config.  Delegates to the query family's {@link allows_override},
     *  which carries the full contract.
     *  @see allows_override
     */
    get allows_override(): JssmAllowsOverride;
    /**
     *  Return the effective island policy for this machine.  Delegates to the
     *  query family's {@link allow_islands}, which carries the full contract.
     *  @see allow_islands
     */
    get allow_islands(): JssmAllowIslands;
    /**
     * List all available theme names.  Delegates to the style family's
     *  {@link all_themes}.
     *  @see all_themes
     */
    all_themes(): FslTheme[];
    /**
     * List the ASCII character ranges accepted in any but the first position
     *  of a state name.  Delegates to the query family's
     *  {@link all_state_name_chars}, which carries the full contract and
     *  example.
     *  @see all_state_name_chars
     */
    all_state_name_chars(): ReadonlyArray<{
        from: string;
        to: string;
    }>;
    /**
     * List the ASCII character ranges accepted in the first position of a
     *  state name.  Delegates to the query family's
     *  {@link all_state_name_first_chars}, which carries the full contract
     *  and example.
     *  @see all_state_name_first_chars
     */
    all_state_name_first_chars(): ReadonlyArray<{
        from: string;
        to: string;
    }>;
    /**
     * List the character ranges accepted inside a single-quoted FSL action
     *  label.  Delegates to the query family's {@link all_action_label_chars},
     *  which carries the full contract and example.
     *  @see all_action_label_chars
     */
    all_action_label_chars(): ReadonlyArray<{
        from: string;
        to: string;
    }>;
    /**
     * Get the active theme(s) for this machine.  Delegates to the style
     *  family's {@link themes}.
     *  @see themes
     */
    get themes(): FslTheme | FslTheme[];
    /**
     * Set the active theme(s).  Delegates to the style family's
     *  {@link set_themes}, which carries the full contract and example
     *  (including the config-cache invalidation).
     *  @see set_themes
     */
    set themes(to: FslTheme | FslTheme[]);
    /**
     * Get the flow direction for graph layout.  Delegates to the style
     *  family's {@link flow}.
     *  @see flow
     */
    flow(): FslDirection;
    /**
     * Look up a transition's edge index by source and target state names.
     *  Delegates to the query family's {@link get_transition_by_state_names}.
     *  @see get_transition_by_state_names
     */
    get_transition_by_state_names(from: StateType, to: StateType): number;
    /**
     * Look up the full transition object for a given source→target pair.
     *  Delegates to the query family's {@link lookup_transition_for}.
     *  @see lookup_transition_for
     */
    lookup_transition_for(from: StateType, to: StateType): JssmTransition<StateType, mDT>;
    /**
     *  List all transitions attached to a state, sorted by entrance and exit.
     *  Delegates to the query family's {@link list_transitions}, which carries
     *  the full contract and example.
     *  @see list_transitions
     */
    list_transitions(whichState?: StateType): JssmTransitionList;
    /**
     *  List all entrances attached to a state.  Delegates to the query
     *  family's {@link list_entrances}, which carries the full contract and
     *  example.
     *  @see list_entrances
     */
    list_entrances(whichState?: StateType): Array<StateType>;
    /**
     *  List all exits attached to a state.  Delegates to the query family's
     *  {@link list_exits}, which carries the full contract and example.
     *  @see list_exits
     */
    list_exits(whichState?: StateType): Array<StateType>;
    /**
     * Get the transitions available from a state for use by the probabilistic
     *  walk system.  Delegates to the stochastic family's
     *  {@link probable_exits_for}, which carries the full contract.
     *  @throws {JssmError} If the state does not exist.
     *  @see probable_exits_for
     */
    probable_exits_for(whichState: StateType): Array<JssmTransition<StateType, mDT>>;
    /**
     * Take a single random transition from the current state, weighted by
     *  edge probabilities.  Delegates to the stochastic family's
     *  {@link probabilistic_transition}, which carries the full contract.
     *  @see probabilistic_transition
     */
    probabilistic_transition(): boolean;
    /**
     * Take `n` consecutive probabilistic transitions and return the states
     *  visited.  Delegates to the stochastic family's
     *  {@link probabilistic_walk}, which carries the full contract.
     *  @see probabilistic_walk
     */
    probabilistic_walk(n: number): Array<StateType>;
    /**
     * Take `n` probabilistic steps and return a histograph of the visits.
     *  Delegates to the stochastic family's {@link probabilistic_histo_walk},
     *  which carries the full contract.
     *  @see probabilistic_histo_walk
     */
    probabilistic_histo_walk(n: number): Map<StateType, number>;
    /**
     * Lazily yield one {@link JssmStochasticRun} at a time.  Delegates to the
     *  stochastic family's {@link stochastic_runs} generator, which carries
     *  the full contract and example; `yield*` forwards every yielded run and
     *  the generator's completion unchanged.
     *  @see stochastic_runs
     */
    stochastic_runs(opts?: JssmStochasticOptions): Generator<JssmStochasticRun>;
    /**
     * Run many weighted-random walks and return aggregate statistics.
     *  Delegates to the stochastic family's {@link stochastic_summary}, which
     *  carries the full contract and example.
     *  @see stochastic_summary
     */
    stochastic_summary(opts?: JssmStochasticOptions): JssmStochasticSummary;
    /**
     *  List all actions available from a state.  Delegates to the query
     *  family's {@link actions}, which carries the full contract and example.
     *  @throws {JssmError} If the state does not exist.
     *  @see actions
     */
    actions(whichState?: StateType): Array<StateType>;
    /**
     *  List all states that have a specific action attached.  Delegates to
     *  the query family's {@link list_states_having_action}, which carries the
     *  full contract and example.
     *  @throws {JssmError} If no state has the action.
     *  @see list_states_having_action
     */
    list_states_having_action(whichState: StateType): Array<StateType>;
    /**
     * List all action names available as exits from a given state.  Delegates
     *  to the query family's {@link list_exit_actions}, which carries the full
     *  contract and example.
     *  @throws {JssmError} If the state does not exist.
     *  @see list_exit_actions
     */
    list_exit_actions(whichState?: StateType): Array<StateType>;
    /**
     * List all action exits from a state with their probabilities and shares.
     *  Delegates to the query family's {@link probable_action_exits}, which
     *  carries the full contract.
     *  @throws {JssmError} If the state does not exist.
     *  @see probable_action_exits
     */
    probable_action_exits(whichState?: StateType): Array<any>;
    /**
     * Check whether a state has no incoming transitions.  Delegates to the
     *  query family's {@link is_unenterable}.
     *  @throws {JssmError} If the state does not exist.
     *  @see is_unenterable
     */
    is_unenterable(whichState: StateType): boolean;
    /**
     * Check whether any state in the machine is unenterable.  Delegates to
     *  the query family's {@link has_unenterables}.
     *  @see has_unenterables
     */
    has_unenterables(): boolean;
    /**
     * Check whether the current state is terminal (has no exits).  Delegates
     *  to the query family's {@link is_terminal}.
     *  @see is_terminal
     */
    is_terminal(): boolean;
    /**
     * Check whether a specific state is terminal (has no exits).  Delegates
     *  to the query family's {@link state_is_terminal}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_is_terminal
     */
    state_is_terminal(whichState: StateType): boolean;
    /**
     * Check whether any state in the machine is terminal.  Delegates to the
     *  query family's {@link has_terminals}.
     *  @see has_terminals
     */
    has_terminals(): boolean;
    /**
     *  Reports whether the machine's CURRENT state is a transitive member of a
     *  named group.  Delegates to the groups family's {@link isIn}, which
     *  carries the full contract and example.
     *  @see isIn
     */
    isIn(groupName: string): boolean;
    /**
     *  Lists every group that transitively contains a given state.  Delegates
     *  to the groups family's {@link groupsOf}, which carries the full
     *  contract and example.
     *  @see groupsOf
     */
    groupsOf(state: StateType): Set<string>;
    /**
     *  Lists all declared group names, in source declaration order.  Delegates
     *  to the groups family's {@link groups}, which carries the full contract
     *  and example.
     *  @see groups
     */
    groups(): string[];
    /**
     *  Lists every state that is a transitive member of a named group.
     *  Delegates to the groups family's {@link statesIn}, which carries the
     *  full contract and example.
     *  @throws {JssmError} If `groupName` is not a declared group.
     *  @see statesIn
     */
    statesIn(groupName: string): Array<StateType>;
    /**
     * Check whether the current state is complete.  Delegates to the query
     *  family's {@link is_complete}.
     *  @see is_complete
     */
    is_complete(): boolean;
    /**
     * Check whether a specific state is complete.  Delegates to the query
     *  family's {@link state_is_complete}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_is_complete
     */
    state_is_complete(whichState: StateType): boolean;
    /**
     * Check whether any state in the machine is complete.  Delegates to the
     *  query family's {@link has_completes}.
     *  @see has_completes
     */
    has_completes(): boolean;
    /**
     *  Subscribe to a typed observation event.  Delegates to the events
     *  family's {@link on}, which carries the full contract and examples.
     *  @see on
     */
    on<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    on<Ev extends JssmEventName>(name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    /**
     *  Subscribe to a typed observation event for one matching delivery, then
     *  auto-remove.  Delegates to the events family's {@link once}.
     *  @see once
     */
    once<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    once<Ev extends JssmEventName>(name: Ev, filter: JssmEventFilter<mDT, Ev>, handler: JssmEventHandler<mDT, Ev>): JssmUnsubscribe;
    /**
     *  Remove a previously-registered event handler.  Delegates to the events
     *  family's {@link off}.
     *  @see off
     */
    off<Ev extends JssmEventName>(name: Ev, handler: JssmEventHandler<mDT, Ev>): boolean;
    /**
     *  Invoke a single event-handler entry.  Delegates to the events family's
     *  {@link fire_one}.
     *  @internal
     */
    _fire_one<Ev extends JssmEventName>(entry: JssmEventEntry<mDT, Ev>, set: Set<JssmEventEntry<any, any>>, name: Ev, detail: JssmEventDetailMap<mDT>[Ev]): void;
    /**
     *  Whether at least one live subscriber is registered for `name`.
     *  Delegates to the events family's {@link has_subscribers}.
     *  @internal
     */
    _has_subscribers(name: JssmEventName): boolean;
    /**
     *  Dispatch an event to every registered subscriber.  Delegates to the
     *  events family's {@link fire}.
     *  @internal
     */
    _fire<Ev extends JssmEventName>(name: Ev, detail: JssmEventDetailMap<mDT>[Ev]): void;
    /**
     *  Low-level hook registration.  Delegates to the hooks family's
     *  {@link set_hook}, which carries the full contract, the descriptor
     *  validation, and the examples.
     *  @throws JssmError if the descriptor is mis-shaped.
     *  @see set_hook
     */
    set_hook(HookDesc: HookDescription<mDT>): void;
    /**
     *  Remove a previously-registered hook.  Delegates to the hooks family's
     *  {@link remove_hook}.
     *  @returns `true` if a hook was removed, `false` otherwise.
     *  @see remove_hook
     */
    remove_hook(HookDesc: HookDescription<mDT>): boolean;
    /**
     *  Register a pre-transition hook on a specific edge.  Delegates to the
     *  hooks family's {@link hook}.
     *  @returns `this` for chaining.
     *  @see hook
     */
    hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on a specific action-labeled edge.
     *  Delegates to the hooks family's {@link hook_action}.
     *  @returns `this` for chaining.
     *  @see hook_action
     */
    hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any edge triggered by a specific
     *  action.  Delegates to the hooks family's {@link hook_global_action}.
     *  @returns `this` for chaining.
     *  @see hook_global_action
     */
    hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any action-driven transition.
     *  Delegates to the hooks family's {@link hook_any_action}.
     *  @returns `this` for chaining.
     *  @see hook_any_action
     */
    hook_any_action(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any standard (`->`) transition.
     *  Delegates to the hooks family's {@link hook_standard_transition}.
     *  @returns `this` for chaining.
     *  @see hook_standard_transition
     */
    hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any main-path (`=>`) transition.
     *  Delegates to the hooks family's {@link hook_main_transition}.
     *  @returns `this` for chaining.
     *  @see hook_main_transition
     */
    hook_main_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any forced (`~>`) transition.
     *  Delegates to the hooks family's {@link hook_forced_transition}.
     *  @returns `this` for chaining.
     *  @see hook_forced_transition
     */
    hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook on any transition regardless of kind.
     *  Delegates to the hooks family's {@link hook_any_transition}.
     *  @returns `this` for chaining.
     *  @see hook_any_transition
     */
    hook_any_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a hook that fires when entering a specific state.  Delegates
     *  to the hooks family's {@link hook_entry}.
     *  @returns `this` for chaining.
     *  @see hook_entry
     */
    hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a hook that fires when leaving a specific state.  Delegates to
     *  the hooks family's {@link hook_exit}.
     *  @returns `this` for chaining.
     *  @see hook_exit
     */
    hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a hook that fires when a state's `after` timer elapses.
     *  Delegates to the hooks family's {@link hook_after}, which carries the
     *  full contract and example.
     *  @returns `this` for chaining.
     *  @see hook_after
     */
    hook_after(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a hook that fires when ANY state's `after` timer elapses.
     *  Delegates to the hooks family's {@link hook_after_any}, which carries
     *  the full contract and example.
     *  @returns `this` for chaining.
     *  @see hook_after_any
     */
    hook_after_any(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on a specific edge.  Delegates to the hooks
     *  family's {@link post_hook}.
     *  @returns `this` for chaining.
     *  @see post_hook
     */
    post_hook(from: string, to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on a specific action-labeled edge.  Delegates to
     *  the hooks family's {@link post_hook_action}.
     *  @returns `this` for chaining.
     *  @see post_hook_action
     */
    post_hook_action(from: string, to: string, action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any edge triggered by a specific action.
     *  Delegates to the hooks family's {@link post_hook_global_action}.
     *  @returns `this` for chaining.
     *  @see post_hook_global_action
     */
    post_hook_global_action(action: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any action-driven transition.  Delegates to
     *  the hooks family's {@link post_hook_any_action}.
     *  @returns `this` for chaining.
     *  @see post_hook_any_action
     */
    post_hook_any_action(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any standard (`->`) transition.  Delegates to
     *  the hooks family's {@link post_hook_standard_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_standard_transition
     */
    post_hook_standard_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any main-path (`=>`) transition.  Delegates to
     *  the hooks family's {@link post_hook_main_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_main_transition
     */
    post_hook_main_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any forced (`~>`) transition.  Delegates to
     *  the hooks family's {@link post_hook_forced_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_forced_transition
     */
    post_hook_forced_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook on any transition regardless of kind.  Delegates
     *  to the hooks family's {@link post_hook_any_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_any_transition
     */
    post_hook_any_transition(handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook that fires after entering a specific state.
     *  Delegates to the hooks family's {@link post_hook_entry}.
     *  @returns `this` for chaining.
     *  @see post_hook_entry
     */
    post_hook_entry(to: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Post-transition hook that fires after leaving a specific state.
     *  Delegates to the hooks family's {@link post_hook_exit}.
     *  @returns `this` for chaining.
     *  @see post_hook_exit
     */
    post_hook_exit(from: string, handler: HookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook that fires before all other pre-hooks.
     *  Delegates to the hooks family's {@link hook_pre_everything}.
     *  @returns `this` for chaining.
     *  @see hook_pre_everything
     */
    hook_pre_everything(handler: EverythingHookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a pre-transition hook that fires after all other pre-hooks.
     *  Delegates to the hooks family's {@link hook_everything}.
     *  @returns `this` for chaining.
     *  @see hook_everything
     */
    hook_everything(handler: EverythingHookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a post-transition hook that fires after all other post-hooks.
     *  Delegates to the hooks family's {@link hook_post_everything}.
     *  @returns `this` for chaining.
     *  @see hook_post_everything
     */
    hook_post_everything(handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
    /**
     *  Register a post-transition hook that fires before all other post-hooks.
     *  Delegates to the hooks family's {@link hook_pre_post_everything}.
     *  @returns `this` for chaining.
     *  @see hook_pre_post_everything
     */
    hook_pre_post_everything(handler: PostEverythingHookHandler<mDT>): Machine<mDT>;
    /**
     * Get the current RNG seed used for probabilistic transitions.  Delegates
     *  to the stochastic family's {@link rng_seed}.
     *  @see rng_seed
     */
    get rng_seed(): number;
    /**
     * Set the RNG seed.  Delegates to the stochastic family's
     *  {@link set_rng_seed}, which carries the full contract.
     *  @see set_rng_seed
     */
    set rng_seed(to: number | undefined);
    /**
     * Get all edges between two states (there can be multiple with
     *  different actions).  Delegates to the query family's
     *  {@link edges_between}, which carries the full contract.
     *  @see edges_between
     */
    edges_between(from: string, to: string): JssmTransition<StateType, mDT>[];
    /*********
     *
     *  Replace the current state — and, when a data argument is provided, the
     *  data — with no regard to the graph.  The class form of the transition
     *  family's {@link override}, which carries the full contract and example.
     *  The data argument is arity-detected (StoneCypher/fsl#1264), so the
     *  delegate forwards it only when it was given.
     *
     *  @param newState The state to teleport to; must exist in the graph.
     *
     *  @param newData Replacement data.  Omit to keep the current data; pass
     *  `undefined` explicitly to clear it.
     *
     *  @throws {JssmError} If the machine's config does not set
     *  `allows_override: true`, or if `newState` does not exist.
     *
     *  @see override
     *
     */
    override(newState: StateType, newData?: mDT): void;
    /**
     *  Fire a `'rejection'` event caused by a hook vetoing a pending transition.
     *  Delegates to the transition family's {@link fire_hook_rejection}.
     *  @internal
     */
    _fire_hook_rejection(hook_name: string, fromState: StateType, newState: StateType, fromAction: StateType | undefined, oldData: mDT, newData: mDT | undefined, wasForced: boolean): void;
    /**
     *  Fire the FSL boundary-hook actions for an already-committed state
     *  change.  Delegates to the transition family's {@link fire_boundary_actions}.
     *  @internal
     */
    _fire_boundary_actions(prev_state: StateType, next_state: StateType): void;
    /**
     *  Shared transition core.  Delegates to the transition family's
     *  {@link transition_impl}, which carries the full contract.  The public
     *  movers on this class (`transition`, `go`, `force_transition`, `act`,
     *  `action`, `do`) call the family function directly rather than this
     *  delegate, so the class path is no deeper than it was in 5.x.
     *  @internal
     */
    transition_impl(newStateOrAction: StateType, newData: mDT | undefined, wasForced: boolean, wasAction: boolean, dataProvided?: boolean): boolean;
    /**
     *  If the current state has an `after` timeout configured, schedule it.
     *  Delegates to the timers family's {@link auto_set_state_timeout}.
     *  @see auto_set_state_timeout
     */
    auto_set_state_timeout(): void;
    /**
     *  Get a truncated history of the recent states and data of the machine,
     *  without the current state.  Delegates to the history family's
     *  {@link history}, which carries the full contract and examples.
     *  @see history
     */
    get history(): Array<[StateType, mDT]>;
    /**
     *  Get a truncated history of the recent states and data of the machine,
     *  including the current state.  Delegates to the history family's
     *  {@link history_inclusive}.
     *  @see history_inclusive
     */
    get history_inclusive(): Array<[StateType, mDT]>;
    /**
     *  Find out how long a history this machine is keeping.  Delegates to the
     *  history family's {@link history_length}; the setter delegates to
     *  {@link set_history_length}.
     *  @see history_length
     *  @see set_history_length
     */
    get history_length(): number;
    set history_length(to: number);
    /********
     *
     *  Instruct the machine to complete an action.  Synonym for {@link act}
     *  (and for the deprecated {@link do}); the class form of the transition
     *  family's {@link act}, which carries the full contract and example.
     *
     *  ```typescript
     *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();               // 'red'
     *  light.action('next');        // true
     *  light.state();               // 'green'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param actionName The action to engage
     *
     *  @param newData The data change to insert during the action; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the action was valid and the transition occurred,
     *  `false` otherwise.
     *
     *  @see act
     *
     */
    action(actionName: StateType, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete an action.  The class form of the
     *  transition family's {@link act}, which carries the full contract and
     *  example; {@link action} is its synonym and {@link do} its deprecated
     *  synonym.  New in 6.0 so the deprecation advice on `do()` holds on both
     *  entries.
     *
     *  ```typescript
     *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();               // 'red'
     *  light.act('next');           // true
     *  light.state();               // 'green'
     *  light.act('dance');          // false - no such action
     *  light.state();               // 'green'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param actionName The action to engage
     *
     *  @param newData The data change to insert during the action; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the action was valid and the transition occurred,
     *  `false` otherwise.
     *
     *  @see act
     *
     */
    act(actionName: StateType, newData?: mDT): boolean;
    /**
     *  Get the standard style for a single state.  Delegates to the style
     *  family's {@link standard_state_style}, which carries the full contract
     *  and example.
     *  @see standard_state_style
     */
    get standard_state_style(): JssmStateConfig;
    /**
     *  Get the hooked state style.  Delegates to the style family's
     *  {@link hooked_state_style}, which carries the full contract and
     *  example.
     *  @see hooked_state_style
     */
    get hooked_state_style(): JssmStateConfig;
    /**
     *  Get the start state style.  Delegates to the style family's
     *  {@link start_state_style}, which carries the full contract and example.
     *  @see start_state_style
     */
    get start_state_style(): JssmStateConfig;
    /**
     *  Get the end state style.  Delegates to the style family's
     *  {@link end_state_style}, which carries the full contract and example.
     *  @see end_state_style
     */
    get end_state_style(): JssmStateConfig;
    /**
     *  Get the terminal state style.  Delegates to the style family's
     *  {@link terminal_state_style}, which carries the full contract and
     *  example.
     *  @see terminal_state_style
     */
    get terminal_state_style(): JssmStateConfig;
    /**
     *  Get the style for the active state.  Delegates to the style family's
     *  {@link active_state_style}, which carries the full contract and
     *  example.
     *  @see active_state_style
     */
    get active_state_style(): JssmStateConfig;
    /**
     *  Generate the uniform observational-hook registry.  Delegates to the
     *  hooks family's {@link hook_registry}, which carries the full contract
     *  and examples.
     *  @returns Every registered hook as a {@link HookRegistryEntry}.
     *  @see hook_registry
     */
    hook_registry(): HookRegistryEntry[];
    /**
     *  Return every registry entry observing the given target.  Delegates to
     *  the hooks family's {@link hooks_on}.
     *  @returns The matching {@link HookRegistryEntry} rows (possibly empty).
     *  @see hooks_on
     */
    hooks_on(query: HookQuery): HookRegistryEntry[];
    /**
     *  Is at least one observational hook bound to the given target?
     *  Delegates to the hooks family's {@link has_hook}.
     *  @returns `true` when a matching hook exists.
     *  @see has_hook
     */
    has_hook(query: HookQuery, phase?: HookPhase): boolean;
    /**
     *  Does the given state carry any observational hook?  Delegates to the
     *  hooks family's {@link state_has_hooks}.
     *  @returns `true` when the state is observed by at least one hook.
     *  @see state_has_hooks
     */
    state_has_hooks(state: StateType): boolean;
    /**
     *  Resolves the full unified style/config cascade for a state.  Delegates
     *  to the style family's {@link resolve_state_config}, which carries the
     *  full contract and example.
     *  @see resolve_state_config
     */
    resolve_state_config(state: StateType): JssmStateConfig;
    /**
     *  Gets the composite style for a specific node — the public viz entry
     *  point.  Delegates to the style family's {@link style_for}, which
     *  carries the full contract.
     *  @see style_for
     */
    style_for(state: StateType): JssmStateConfig;
    /********
     *
     *  Instruct the machine to complete an action.  Synonym for {@link action}
     *  and {@link act}; the class form of the transition family's {@link act},
     *  which carries the full contract and example.  Prefer `act()` — `do` is a
     *  JavaScript reserved word, so it has no function form and is deprecated
     *  here.
     *
     *  ```typescript
     *  import { sm } from 'jssm/compat';
     *
     *  const light = sm`
     *    off 'start' -> red;
     *    red 'next' -> green 'next' -> yellow 'next' -> red;
     *    [red yellow green] 'shutdown' ~> off;
     *  `;
     *
     *  light.state();        // 'off'
     *  light.act('start');   // true  - the preferred spelling
     *  light.state();        // 'red'
     *  light.do('next');     // true  - still works, but deprecated
     *  light.state();        // 'green'
     *  light.act('dance');   // !! false - no such action
     *  light.state();        // 'green'
     *  ```
     *
     *  @deprecated Use act() or action(); do is a JavaScript reserved word and has no function form. Removal is tracked as StoneCypher/fsl#1992.
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param actionName The action to engage
     *
     *  @param newData The data change to insert during the action; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the action was valid and the transition occurred,
     *  `false` otherwise.
     *
     *  @see act
     *
     */
    do(actionName: StateType, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete a transition.  Synonym for {@link go};
     *  the class form of the transition family's {@link transition}, which
     *  carries the full contract and example.
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
     *  light.go('blue');    // !! false - no such state
     *  light.state();       // 'red'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the transition was legal and occurred, `false` otherwise.
     *
     *  @see transition
     *
     */
    transition(newState: StateType, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete a transition.  Synonym for {@link transition};
     *  the class form of the transition family's {@link go}.
     *
     *  ```typescript
     *  const light = sm`red -> green -> yellow -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
     *
     *  light.state();       // 'red'
     *  light.go('green');   // true
     *  light.state();       // 'green'
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if the transition was legal and occurred, `false` otherwise.
     *
     *  @see go
     *
     */
    go(newState: StateType, newData?: mDT): boolean;
    /********
     *
     *  Instruct the machine to complete a forced transition (which will reject if
     *  called with a normal {@link transition} call.)  The class form of the
     *  transition family's {@link force_transition}, which carries the full
     *  contract and example.
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition; omit to
     *  keep the current data (StoneCypher/fsl#1264)
     *
     *  @returns `true` if a transition (forced or otherwise) existed and occurred,
     *  `false` otherwise.
     *
     *  @see force_transition
     *
     */
    force_transition(newState: StateType, newData?: mDT): boolean;
    /**
     * Get the edge index for an action from the current state.  Delegates to
     *  the query family's {@link current_action_for}, which carries the full
     *  contract.
     *  @see current_action_for
     */
    current_action_for(action: StateType): number;
    /**
     * Get the full transition object for an action from the current state.
     *  Delegates to the query family's {@link current_action_edge_for}.
     *  @throws {JssmError} If the action is not available from the current state.
     *  @see current_action_edge_for
     */
    current_action_edge_for(action: StateType): JssmTransition<StateType, mDT>;
    /**
     * Check whether an action is available from the current state.  Delegates
     *  to the transition family's {@link valid_action}.
     *  @param action   - The action name to check.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the action can be taken.
     *  @see valid_action
     */
    valid_action(action: StateType, _newData?: mDT): boolean;
    /**
     * Check whether a transition to a given state is legal (non-forced) from
     *  the current state.  Delegates to the transition family's
     *  {@link valid_transition}.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the transition is legal.
     *  @see valid_transition
     */
    valid_transition(newState: StateType, _newData?: mDT): boolean;
    /**
     * Check whether a forced transition to a given state exists from the
     *  current state.  Delegates to the transition family's
     *  {@link valid_force_transition}.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if a forced (or any) transition exists.
     *  @see valid_force_transition
     */
    valid_force_transition(newState: StateType, _newData?: mDT): boolean;
    /**
     * Get the instance name of this machine.  Delegates to the create family's
     *  {@link instance_name}.
     *  @see instance_name
     */
    instance_name(): string | undefined;
    /**
     * Get the creation date of this machine as a `Date` object.  Delegates to
     *  the create family's {@link creation_date}.
     *  @see creation_date
     */
    get creation_date(): Date;
    /**
     * Get the creation timestamp (milliseconds since epoch).  Delegates to the
     *  create family's {@link creation_timestamp}.
     *  @see creation_timestamp
     */
    get creation_timestamp(): number;
    /**
     * Get the timestamp when construction began (before parsing).  Delegates
     *  to the create family's {@link create_start_time}.
     *  @see create_start_time
     */
    get create_start_time(): number;
    /**
     *  Schedule an automatic transition to `next_state` after `after_time`
     *  milliseconds.  Delegates to the timers family's
     *  {@link set_state_timeout}, which carries the full contract.
     *  @throws JssmError If a timeout is already pending.
     *  @see set_state_timeout
     */
    set_state_timeout(next_state: StateType, after_time: number): void;
    /**
     *  Cancel any pending state timeout.  Delegates to the timers family's
     *  {@link clear_state_timeout}.
     *  @see clear_state_timeout
     */
    clear_state_timeout(): void;
    /**
     *  Get the configured `after` timeout for a given state, if any.
     *  Delegates to the timers family's {@link state_timeout_for}.
     *  @see state_timeout_for
     */
    state_timeout_for(which_state: StateType): [StateType, number] | undefined;
    /**
     *  Get the pending state timeout, if any.  Delegates to the timers
     *  family's {@link current_state_timeout}.
     *  @see current_state_timeout
     */
    current_state_timeout(): [StateType, number] | undefined;
    /**
     * Convenience method to create a new machine from a tagged template literal.
     *  Equivalent to calling the top-level `sm` function.
     *  @param template_strings - The template string array.
     *  @param remainder        - Interpolated values.
     *  @returns A new {@link Machine} instance.
     */
    sm(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
    /**
     * Convenience method to create a new machine from a tagged template literal;
     *  an exact alias of {@link Machine.sm}, matching the top-level {@link fsl}.
     *  @param template_strings - The template string array.
     *  @param remainder        - Interpolated values.
     *  @returns A new {@link Machine} instance.
     */
    fsl(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
}
/*******
 *
 *  Constructs a machine from a configuration object.  This is the function
 *  form of `new Machine(config)`: the value it returns is the machine record
 *  every other function in this package takes as its first argument.  In
 *  6.0 that record is also a `Machine` instance, so `instanceof Machine`
 *  holds and the 5.x methods remain reachable through `jssm/compat`.
 *
 *  @example
 *  import { create, state, transition } from 'jssm';
 *
 *  const m = create({
 *    start_states : ['a'],
 *    transitions  : [ { from: 'a', to: 'b', kind: 'legal', forced_only: false, main_path: false } ],
 *  });
 *
 *  state(m);             // => 'a'
 *  transition(m, 'b');   // => true
 *  state(m);             // => 'b'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param config The machine configuration; the same shape `compile` produces from FSL.
 *
 *  @returns The new machine at its start state.
 *
 *  @see sm
 *  @see from
 *
 */
declare function create<mDT>(config: JssmGenericConfig<StateType, mDT>): Machine<mDT>;
/*******
 *
 *  The type of the machine value the bare functions operate on.  Named so
 *  signatures can say what they take without naming the compat class; in 6.0
 *  it is the same type as `Machine`.
 *
 */
type JssmMachine<mDT = unknown> = Machine<mDT>;
/*********
 *
 *  Create a state machine from a template string.  This is one of the two main
 *  paths for working with JSSM, alongside {@link from}.
 *
 *  Use this function when you want to work directly and conveniently with a
 *  constant template expression.  Use `from` when you want to pull from
 *  dynamic strings.
 *
 *  @example
 *  import { sm, state, transition } from 'jssm';
 *
 *  const lswitch = sm`on <=> off;`;
 *  state(lswitch);              // => 'on'
 *  transition(lswitch, 'off');  // => true
 *  state(lswitch);              // => 'off'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param template_strings The assembled code
 *
 *  @param remainder The mechanic for template argument insertion
 *
 */
declare function sm<mDT>(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
/*********
 *
 *  Create a state machine from a template string; an exact alias of {@link sm}.
 *
 *  Prefer this spelling in JavaScript and TypeScript sources that will be
 *  syntax-highlighted.  Highlighters dispatch a tagged template to a grammar by
 *  matching the tag name, and `sm` is two generic letters that collide with
 *  ordinary identifiers — `small`, `session manager`, a local variable.  `fsl`
 *  names the language unambiguously, so a highlighter can key on it without
 *  risking false positives on unrelated code.
 *
 *  Identical to {@link sm} in every respect: same parameters, same return, same
 *  errors.  Neither is deprecated.
 *
 *  @example
 *  import { fsl, state } from 'jssm';
 *
 *  const lswitch = fsl`on <=> off;`;
 *  state(lswitch);  // => 'on'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param template_strings The assembled code
 *
 *  @param remainder The mechanic for template argument insertion
 *
 *  @see sm
 *  @see from
 *
 */
declare function fsl<mDT>(template_strings: TemplateStringsArray, ...remainder: any[]): Machine<mDT>;
/*********
 *
 *  Create a state machine from an implementation string.  This is one of the
 *  two main paths for working with JSSM, alongside {@link sm}.
 *
 *  Use this function when you want to conveniently pull a state machine from
 *  a string dynamically.  Use the template tag `sm` when you just want to
 *  work with a template expression.
 *
 *  @example
 *  import { from, state, data } from 'jssm';
 *
 *  const lswitch = from('on <=> off;', { data: 1 });
 *  state(lswitch);  // => 'on'
 *  data(lswitch);   // => 1
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param MachineAsString The FSL code to evaluate
 *
 *  @param ExtraConstructorFields Extra non-code configuration to pass at creation time
 *
 */
declare function from<mDT>(MachineAsString: string, ExtraConstructorFields?: Partial<JssmGenericConfig<StateType, mDT>>): Machine<mDT>;
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
 * @param {string} v1 - First version string (e.g., "5.104.2" or "6.0.0-alpha.1")
 * @param {string} v2 - Second version string (e.g., "5.103.1")
 * @returns {number} - Negative if v1 < v2, 0 if equal, positive if v1 > v2
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("5.104.2", "5.103.1");  // => 1
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("5.104.2", "6.0.0");  // => -1
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("5.104.2", "5.104.2");  // => 0
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("6.0.0-alpha.1", "6.0.0");  // => -1
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("6.0.0-alpha.1", "6.0.0-alpha.2");  // => -1
 * @example
 * import { compareVersions } from 'jssm';
 * compareVersions("6.0.0-beta.1", "6.0.0-alpha.1");  // => 1
 */
declare function compareVersions(v1: string, v2: string): number;
/**
 * Deserializes a previously serialized machine state.
 *
 * This function recreates a machine from a serialization object, restoring its
 * state, data, and history. For security and compatibility reasons, it will
 * refuse to deserialize data from future versions of the library.
 * @template mDT - The type of the machine data member
 * @param {string} machine_string - The FSL string defining the machine structure
 * @param {JssmSerialization<mDT>} ser - The serialization object to restore from
 * @returns {Machine<mDT>} - The restored machine instance
 * @throws {Error} If the serialization is from a future version
 * @example
 * import { from, deserialize, serialize, state, transition } from 'jssm';
 * const machine    = from("a -> b;");
 * transition(machine, 'b');
 * const serialized = serialize(machine);
 * const restored   = deserialize("a -> b;", serialized);
 * state(restored);  // => 'b'
 */
declare function deserialize<mDT>(machine_string: string, ser: JssmSerialization<mDT>): Machine<mDT>;
export { Machine, create, deserialize, compareVersions, sm, fsl, from, shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars, is_state_name_first_char, is_state_name_char, };
export type { JssmMachine };
