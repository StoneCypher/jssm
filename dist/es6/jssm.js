// whargarbl lots of these return arrays could/should be sets
import { circular_buffer } from 'circular_buffer_js';
import { FslDirections } from './jssm_types';
import { arrow_direction, arrow_left_kind, arrow_right_kind } from './jssm_arrow';
import { compile, make, wrap_parse } from './jssm_compiler';
import { theme_mapping, base_theme } from './jssm_theme';
import { seq, unique, find_repeated, weighted_rand_select, weighted_sample_select, histograph, weighted_histo_key, array_box_if_string, name_bind_prop_and_state, gen_splitmix32, sleep } from './jssm_util';
import * as constants from './jssm_constants';
const { shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars } = constants;
import { version, build_time } from './version'; // replaced from package.js in build
import { JssmError } from './jssm_error';
/*********
 *
 *  An internal method meant to take a series of declarations and fold them into
 *  a single multi-faceted declaration, in the process of building a state.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 */
function transfer_state_properties(state_decl) {
    state_decl.declarations.map((d) => {
        switch (d.key) {
            case 'shape':
                state_decl.shape = d.value;
                break;
            case 'color':
                state_decl.color = d.value;
                break;
            case 'corners':
                state_decl.corners = d.value;
                break;
            case 'line-style':
                state_decl.lineStyle = d.value;
                break;
            case 'text-color':
                state_decl.textColor = d.value;
                break;
            case 'background-color':
                state_decl.backgroundColor = d.value;
                break;
            case 'state-label':
                state_decl.stateLabel = d.value;
                break;
            case 'border-color':
                state_decl.borderColor = d.value;
                break;
            case 'image':
                state_decl.image = d.value;
                break;
            case 'url':
                state_decl.url = d.value;
                break;
            case 'state_property':
                state_decl.property = { name: d.name, value: d.value };
                break;
            default: throw new JssmError(undefined, `Unknown state property: '${JSON.stringify(d)}'`);
        }
    });
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
function state_style_condense(jssk, machine) {
    const state_style = {};
    if (Array.isArray(jssk)) {
        jssk.forEach((key, i) => {
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
                    state_style.url = key.value;
                    break;
                default:
                    // TODO do that <never> trick to assert this list is complete
                    throw new JssmError(machine, `unknown state style key in condense: ${key.key}`);
            }
        });
    }
    else if (jssk === undefined) {
        // do nothing, undefined is legal and means we should return the empty container above
    }
    else {
        throw new JssmError(machine, 'state_style_condense received a non-array');
    }
    return state_style;
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
class Machine {
    // whargarbl this badly needs to be broken up, monolith master
    constructor({ start_states, end_states = [], failed_outputs = [], initial_state, start_states_no_enforce, complete = [], transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, npm_name, state_declaration, property_definition, state_property, fsl_version, dot_preamble = undefined, arrange_declaration = [], arrange_start_declaration = [], arrange_end_declaration = [], theme = ['default'], flow = 'down', graph_layout = 'dot', instance_name, history, data, default_state_config, default_active_state_config, default_hooked_state_config, default_terminal_state_config, default_start_state_config, default_end_state_config, allows_override, config_allows_override, rng_seed, time_source, timeout_source, clear_timeout_source }) {
        this._time_source = () => new Date().getTime();
        this._create_started = this._time_source();
        this._instance_name = instance_name;
        this._states = new Map();
        this._state_declarations = new Map();
        this._edges = [];
        this._edge_map = new Map();
        this._outbound_edge_ids = new Map();
        this._named_transitions = new Map();
        this._actions = new Map();
        this._reverse_actions = new Map();
        this._reverse_action_targets = new Map(); // todo
        this._start_states = new Set(start_states);
        this._end_states = new Set(end_states); // todo consider what to do about incorporating complete too
        this._failed_outputs = new Set(failed_outputs);
        this._machine_author = array_box_if_string(machine_author);
        this._machine_comment = machine_comment;
        this._machine_contributor = array_box_if_string(machine_contributor);
        this._machine_definition = machine_definition;
        this._machine_language = machine_language;
        this._machine_license = machine_license;
        this._machine_name = machine_name;
        this._machine_version = machine_version;
        this._npm_name = npm_name;
        this._raw_state_declaration = state_declaration || [];
        this._fsl_version = fsl_version;
        this._arrange_declaration = arrange_declaration;
        this._arrange_start_declaration = arrange_start_declaration;
        this._arrange_end_declaration = arrange_end_declaration;
        this._dot_preamble = dot_preamble;
        this._themes = theme;
        this._flow = flow;
        this._graph_layout = graph_layout;
        this._has_hooks = false;
        this._has_basic_hooks = false;
        this._has_named_hooks = false;
        this._has_entry_hooks = false;
        this._has_exit_hooks = false;
        this._has_after_hooks = false;
        this._has_global_action_hooks = false;
        this._has_transition_hooks = false;
        // no need for a boolean for single hooks, just test for undefinedness
        this._has_forced_transitions = false;
        this._hooks = new Map();
        this._named_hooks = new Map();
        this._entry_hooks = new Map();
        this._exit_hooks = new Map();
        this._after_hooks = new Map();
        this._global_action_hooks = new Map();
        this._any_action_hook = undefined;
        this._standard_transition_hook = undefined;
        this._main_transition_hook = undefined;
        this._forced_transition_hook = undefined;
        this._any_transition_hook = undefined;
        this._has_post_hooks = false;
        this._has_post_basic_hooks = false;
        this._has_post_named_hooks = false;
        this._has_post_entry_hooks = false;
        this._has_post_exit_hooks = false;
        this._has_post_global_action_hooks = false;
        this._has_post_transition_hooks = false;
        // no need for a boolean for single hooks, just test for undefinedness
        this._code_allows_override = allows_override;
        this._config_allows_override = config_allows_override;
        if ((allows_override === false) && (config_allows_override === true)) {
            throw new JssmError(undefined, "Code specifies no override, but config tries to permit; config may not be less strict than code");
        }
        this._post_hooks = new Map();
        this._post_named_hooks = new Map();
        this._post_entry_hooks = new Map();
        this._post_exit_hooks = new Map();
        this._post_global_action_hooks = new Map();
        this._post_any_action_hook = undefined;
        this._post_standard_transition_hook = undefined;
        this._post_main_transition_hook = undefined;
        this._post_forced_transition_hook = undefined;
        this._post_any_transition_hook = undefined;
        this._pre_everything_hook = undefined;
        this._everything_hook = undefined;
        this._pre_post_everything_hook = undefined;
        this._post_everything_hook = undefined;
        this._data = data;
        this._property_keys = new Set();
        this._default_properties = new Map();
        this._state_properties = new Map();
        this._required_properties = new Set();
        this._state_style = state_style_condense(default_state_config, this);
        this._active_state_style = state_style_condense(default_active_state_config, this);
        this._hooked_state_style = state_style_condense(default_hooked_state_config, this);
        this._terminal_state_style = state_style_condense(default_terminal_state_config, this);
        this._start_state_style = state_style_condense(default_start_state_config, this);
        this._end_state_style = state_style_condense(default_end_state_config, this);
        this._history_length = history || 0;
        this._history = new circular_buffer(this._history_length);
        this._state_labels = new Map();
        this._rng_seed = rng_seed !== null && rng_seed !== void 0 ? rng_seed : new Date().getTime();
        this._rng = gen_splitmix32(this._rng_seed);
        this._timeout_source = timeout_source !== null && timeout_source !== void 0 ? timeout_source : ((f, a) => setTimeout(f, a));
        this._clear_timeout_source = clear_timeout_source !== null && clear_timeout_source !== void 0 ? clear_timeout_source : ((h) => clearTimeout(h));
        this._timeout_handle = undefined;
        this._timeout_target = undefined;
        this._timeout_target_time = undefined;
        this._after_mapping = new Map();
        this._event_handlers = new Map();
        this._event_listener_count = 0;
        this._firing_error = false;
        // consolidate the state declarations
        if (state_declaration) {
            state_declaration.map((state_decl) => {
                if (this._state_declarations.has(state_decl.state)) { // no repeats
                    throw new JssmError(this, `Added the same state declaration twice: ${JSON.stringify(state_decl.state)}`);
                }
                this._state_declarations.set(state_decl.state, transfer_state_properties(state_decl));
            });
        }
        // walk the decls for labels; aggregate them when found
        [...this._state_declarations].map(sd => {
            const [key, decl] = sd, labelled = decl.declarations.filter(d => d.key === 'state-label');
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
        const seen_edges = new Map();
        // walk the transitions
        transitions.map((tr) => {
            if (tr.from === undefined) {
                throw new JssmError(this, `transition must define 'from': ${JSON.stringify(tr)}`);
            }
            if (tr.to === undefined) {
                throw new JssmError(this, `transition must define 'to': ${JSON.stringify(tr)}`);
            }
            // get the cursors.  what a mess
            const cursor_from = this._states.get(tr.from)
                || { name: tr.from, from: [], to: [], complete: complete.includes(tr.from) };
            if (!(this._states.has(tr.from))) {
                this._new_state(cursor_from);
            }
            const cursor_to = this._states.get(tr.to)
                || { name: tr.to, from: [], to: [], complete: complete.includes(tr.to) };
            if (!(this._states.has(tr.to))) {
                this._new_state(cursor_to);
            }
            // guard against existing connections being re-added — O(1) via the
            // from -> Set<to> index instead of an O(out-degree) `cursor_from.to`
            // array scan.  Behaviour is identical: the same duplicate (from, to)
            // pair throws the same JssmError.  #673
            let seen_to = seen_edges.get(tr.from);
            if (seen_to === undefined) {
                seen_to = new Set();
                seen_edges.set(tr.from, seen_to);
            }
            if (seen_to.has(tr.to)) {
                throw new JssmError(this, `already has ${JSON.stringify(tr.from)} to ${JSON.stringify(tr.to)}`);
            }
            else {
                seen_to.add(tr.to);
                cursor_from.to.push(tr.to);
                cursor_to.from.push(tr.from);
            }
            // add the edge; note its id
            this._edges.push(tr);
            const thisEdgeId = this._edges.length - 1;
            if (tr.forced_only) {
                this._has_forced_transitions = true;
            }
            // guard against repeating a transition name
            if (tr.name) {
                if (this._named_transitions.has(tr.name)) {
                    throw new JssmError(this, `named transition "${JSON.stringify(tr.name)}" already created`);
                }
                else {
                    this._named_transitions.set(tr.name, thisEdgeId);
                }
            }
            // set up the after mapping, if any
            if (tr.after_time) {
                this._after_mapping.set(tr.from, [tr.to, tr.after_time]);
            }
            // set up the mapping, so that edges can be looked up by endpoint pairs
            const from_mapping = this._edge_map.get(tr.from) || new Map();
            if (!(this._edge_map.has(tr.from))) {
                this._edge_map.set(tr.from, from_mapping);
            }
            //    const to_mapping = from_mapping.get(tr.to);
            from_mapping.set(tr.to, thisEdgeId); // already checked that this mapping doesn't exist, above
            // outbound adjacency: every edge originating at tr.from, regardless of action/target.
            // _edge_map above keys a single edge per (from, to) and overwrites on collision, which
            // is fine for lookup_transition_for but loses information for edges_between when several
            // edges share endpoints across distinct actions.  This index preserves every edge id and
            // lets edges_between scan only one state's exits, not all of _edges.
            let outbound = this._outbound_edge_ids.get(tr.from);
            if (!outbound) {
                outbound = [];
                this._outbound_edge_ids.set(tr.from, outbound);
            }
            outbound.push(thisEdgeId);
            // set up the action mapping, so that actions can be looked up by origin
            if (tr.action) {
                // forward mapping first by action name
                let actionMap = this._actions.get(tr.action);
                if (!(actionMap)) {
                    actionMap = new Map();
                    this._actions.set(tr.action, actionMap);
                }
                if (actionMap.has(tr.from)) {
                    throw new JssmError(this, `action ${JSON.stringify(tr.action)} already attached to origin ${JSON.stringify(tr.from)}`);
                }
                else {
                    actionMap.set(tr.from, thisEdgeId);
                }
                // reverse mapping first by state origin name
                let rActionMap = this._reverse_actions.get(tr.from);
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
        // set initial state either from the specified or the start state list.  validate admission behavior.
        if (initial_state) {
            if (!(this._states.has(initial_state))) {
                throw new JssmError(this, `requested start state ${initial_state} does not exist`);
            }
            if ((!(start_states_no_enforce)) && (!(start_states.includes(initial_state)))) {
                throw new JssmError(this, `requested start state ${initial_state} is not in start state list; add {start_states_no_enforce:true} to constructor options if desired`);
            }
            this._state = initial_state;
        }
        else {
            this._state = start_states[0];
        }
        // done building, do checks
        // assert all props are valid
        // _state_properties keys are always JSON.stringify([string, string]),
        // built by name_bind_prop_and_state which throws on non-strings — so the
        // non-array / non-string else-arms below are unreachable, not untested.
        this._state_properties.forEach((_value, key) => {
            const inside = JSON.parse(key);
            /* v8 ignore else */
            if (Array.isArray(inside)) {
                const j_property = inside[0];
                /* v8 ignore else */
                if (typeof j_property === 'string') {
                    const j_state = inside[1];
                    /* v8 ignore else */
                    if (typeof j_state === 'string') {
                        if (!(this.known_prop(j_property))) {
                            throw new JssmError(this, `State "${j_state}" has property "${j_property}" which is not globally declared`);
                        }
                    }
                }
            }
        });
        // assert all required properties are serviced
        this._required_properties.forEach(dp_key => {
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
        if (!(this.has_state(this.state()))) {
            throw new JssmError(this, `Current start state "${this.state()}" does not exist`);
        }
        // assert all starting states are valid
        start_states.forEach((ss, ssi) => {
            if (!(this.has_state(ss))) {
                throw new JssmError(this, `Start state ${ssi} "${ss}" does not exist`);
            }
        });
        // assert chosen starting state is valid
        if (!(start_states.length === this._start_states.size)) {
            throw new JssmError(this, `Start states cannot be repeated`);
        }
        this._created = this._time_source();
        this.auto_set_state_timeout();
        this._arrange_declaration.forEach((arrange_pair) => arrange_pair.forEach((possibleState) => {
            if (!(this._states.has(possibleState))) {
                throw new JssmError(this, `Cannot arrange state that does not exist "${possibleState}"`);
            }
        }));
    }
    /********
     *
     *  Internal method for fabricating states.  Not meant for external use.
     *
     *  @internal
     *
     */
    _new_state(state_config) {
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
     *  @returns The current state name.
     *
     */
    state() {
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
    label_for(state) {
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
    display_text(state) {
        var _a;
        return (_a = this._state_labels.get(state)) !== null && _a !== void 0 ? _a : state;
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
    data() {
        return structuredClone(this._data);
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
    prop(name) {
        const bound_name = name_bind_prop_and_state(name, this.state());
        if (this._state_properties.has(bound_name)) {
            return this._state_properties.get(bound_name);
        }
        else if (this._default_properties.has(name)) {
            return this._default_properties.get(name);
        }
        else {
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
    strict_prop(name) {
        const bound_name = name_bind_prop_and_state(name, this.state());
        if (this._state_properties.has(bound_name)) {
            return this._state_properties.get(bound_name);
        }
        else if (this._default_properties.has(name)) {
            return this._default_properties.get(name);
        }
        else {
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
    props() {
        const ret = {};
        this.known_props().forEach(p => ret[p] = this.prop(p));
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
    known_prop(prop_name) {
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
    known_props() {
        return [...this._property_keys];
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
    is_start_state(whichState) {
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
    is_end_state(whichState) {
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
    failed_outputs() {
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
    is_failed_output(whichState) {
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
    is_failed() {
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
    state_is_final(whichState) {
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
    is_final() {
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
    serialize(comment) {
        return {
            comment,
            state: this._state,
            data: this._data,
            jssm_version: version,
            history: this._history.toArray(),
            history_capacity: this._history.capacity,
            timestamp: new Date().getTime(),
        };
    }
    /** Get the graph layout direction (e.g. `'LR'`, `'TB'`).  Set via the
     *  FSL `graph_layout` directive.
     *  @returns The layout string, or the default if not set.
     */
    graph_layout() {
        return this._graph_layout;
    }
    /** Get the Graphviz DOT preamble string, injected before the graph body
     *  during visualization.  Set via the FSL `dot_preamble` directive.
     *  @returns The preamble string.
     */
    dot_preamble() {
        return this._dot_preamble;
    }
    /** Get the machine's author list.  Set via the FSL `machine_author` directive.
     *  @returns An array of author name strings.
     */
    machine_author() {
        return this._machine_author;
    }
    /** Get the machine's comment string.  Set via the FSL `machine_comment` directive.
     *  @returns The comment string.
     */
    machine_comment() {
        return this._machine_comment;
    }
    /** Get the machine's contributor list.  Set via the FSL `machine_contributor` directive.
     *  @returns An array of contributor name strings.
     */
    machine_contributor() {
        return this._machine_contributor;
    }
    /** Get the machine's definition string.  Set via the FSL `machine_definition` directive.
     *  @returns The definition string.
     */
    machine_definition() {
        return this._machine_definition;
    }
    /** Get the machine's language (ISO 639-1).  Set via the FSL `machine_language` directive.
     *  @returns The language code string.
     */
    machine_language() {
        return this._machine_language;
    }
    /** Get the machine's license string.  Set via the FSL `machine_license` directive.
     *  @returns The license string.
     */
    machine_license() {
        return this._machine_license;
    }
    /** Get the machine's name.  Set via the FSL `machine_name` directive.
     *  @returns The machine name string.
     */
    machine_name() {
        return this._machine_name;
    }
    /** Get the npm package name associated with the machine.  Set via the FSL `npm_name` directive.
     *  Returns `undefined` when not present.
     *  @returns The npm package name string, or `undefined`.
     *  @see machine_name
     */
    npm_name() {
        return this._npm_name;
    }
    /** Get the machine's version string.  Set via the FSL `machine_version` directive.
     *  @returns The version string.
     */
    machine_version() {
        return this._machine_version;
    }
    /** Get the raw state declaration objects as parsed from the FSL source.
     *  @returns An array of raw state declaration objects.
     */
    raw_state_declarations() {
        return this._raw_state_declaration;
    }
    /** Get the processed state declaration for a specific state.
     *  @param which - The state to look up.
     *  @returns The {@link JssmStateDeclaration} for the given state.
     */
    state_declaration(which) {
        return this._state_declarations.get(which);
    }
    /** Get all processed state declarations as a Map.
     *  @returns A `Map` from state name to {@link JssmStateDeclaration}.
     */
    state_declarations() {
        return this._state_declarations;
    }
    /** Get the FSL language version this machine was compiled under.
     *  @returns The FSL version string.
     */
    fsl_version() {
        return this._fsl_version;
    }
    /** Get the complete internal state of the machine as a serializable
     *  structure.  Includes actions, edges, edge map, named transitions,
     *  reverse actions, current state, and states map.
     *  @returns A {@link JssmMachineInternalState} snapshot.
     */
    machine_state() {
        return {
            internal_state_impl_version: 1,
            actions: this._actions,
            edge_map: this._edge_map,
            edges: this._edges,
            named_transitions: this._named_transitions,
            reverse_actions: this._reverse_actions,
            // reverse_action_targets : this._reverse_action_targets,
            state: this._state,
            states: this._states
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
    states() {
        return Array.from(this._states.keys());
    }
    /** Get the internal state descriptor for a given state name.
     *  @param whichState - The state to look up.
     *  @returns The {@link JssmGenericState} descriptor.
     *  @throws {JssmError} If the state does not exist.
     */
    state_for(whichState) {
        const state = this._states.get(whichState);
        if (state) {
            return state;
        }
        else {
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
    has_state(whichState) {
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
    list_edges() {
        return this._edges;
    }
    /** Get the map of named transitions (transitions with explicit names).
     *  @returns A `Map` from transition name to edge index.
     */
    list_named_transitions() {
        return this._named_transitions;
    }
    /** List all distinct action names defined anywhere in the machine.
     *  @returns An array of action name strings.
     */
    list_actions() {
        return Array.from(this._actions.keys());
    }
    /** Whether any actions are defined on this machine.
     *  @returns `true` if the machine has at least one action.
     */
    get uses_actions() {
        return Array.from(this._actions.keys()).length > 0;
    }
    /** Whether any forced (`~>`) transitions exist in this machine.
     *  @returns `true` if at least one forced transition is defined.
     */
    get uses_forced_transitions() {
        return this._has_forced_transitions;
    }
    /*********
     *
     *  Check if the code that built the machine allows overriding state and data.
     *
     *  @returns The override permission from the FSL source code.
     *
     */
    get code_allows_override() {
        return this._code_allows_override;
    }
    /*********
     *
     *  Check if the machine config allows overriding state and data.
     *
     *  @returns The override permission from the runtime config.
     *
     */
    get config_allows_override() {
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
    get allows_override() {
        // code false?  config true, throw.  config false, false.  config undefined, false.
        if (this._code_allows_override === false) {
            /* istanbul ignore next */
            if (this._config_allows_override === true) {
                /* istanbul ignore next */
                throw new JssmError(this, "Code specifies no override, but config tries to permit; config may not be less strict than code; should be unreachable");
            }
            else {
                return false;
            }
        }
        // code true?  config true, true.  config false, false.  config undefined, true.
        if (this._code_allows_override === true) {
            if (this._config_allows_override === false) {
                return false;
            }
            else {
                return true;
            }
        }
        // code must be undefined.  config false, false.  config true, true.  config undefined, false.
        if (this._config_allows_override === true) {
            return true;
        }
        else {
            return false;
        }
    }
    /** List all available theme names.
     *  @returns An array of theme name strings.
     */
    all_themes() {
        return [...theme_mapping.keys()]; // constructor sets this to "default" otherwise
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
    all_state_name_chars() {
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
    all_state_name_first_chars() {
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
    all_action_label_chars() {
        return action_label_chars;
    }
    /** Get the active theme(s) for this machine.  Always stored as an array
     *  internally; the union return type exists for setter compatibility.
     *  @returns The current theme or array of themes.
     */
    get themes() {
        return this._themes; // constructor sets this to "default" otherwise
    }
    /** Set the active theme(s).  Accepts a single theme name or an array.
     *  @param to - A theme name or array of theme names to apply.
     */
    set themes(to) {
        if (typeof to === 'string') {
            this._themes = [to];
        }
        else {
            this._themes = to;
        }
    }
    /** Get the flow direction for graph layout (e.g. `'right'`, `'down'`).
     *  Set via the FSL `flow` directive.
     *  @returns The current flow direction.
     */
    flow() {
        return this._flow;
    }
    /** Look up a transition's edge index by source and target state names.
     *  @param from - Source state name.
     *  @param to   - Target state name.
     *  @returns The edge index in the edges array, or `undefined` if no
     *  such transition exists.
     */
    get_transition_by_state_names(from, to) {
        const emg = this._edge_map.get(from);
        if (emg) {
            return emg.get(to);
        }
        else {
            return undefined;
        }
    }
    /** Look up the full transition object for a given source→target pair.
     *  @param from - Source state name.
     *  @param to   - Target state name.
     *  @returns The {@link JssmTransition} object, or `undefined` if none exists.
     */
    lookup_transition_for(from, to) {
        const id = this.get_transition_by_state_names(from, to);
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
    list_transitions(whichState = this.state()) {
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
    list_entrances(whichState = this.state()) {
        var _a, _b;
        const guaranteed = ((_a = this._states.get(whichState)) !== null && _a !== void 0 ? _a : { from: undefined });
        return (_b = guaranteed.from) !== null && _b !== void 0 ? _b : [];
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
    list_exits(whichState = this.state()) {
        var _a, _b;
        const guaranteed = ((_a = this._states.get(whichState)) !== null && _a !== void 0 ? _a : { to: undefined });
        return (_b = guaranteed.to) !== null && _b !== void 0 ? _b : [];
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
    probable_exits_for(whichState) {
        const wstate = this._states.get(whichState);
        if (!(wstate)) {
            throw new JssmError(this, `No such state ${JSON.stringify(whichState)} in probable_exits_for`);
        }
        const wstate_to = wstate.to, 
        // every transition that exits whichState
        all_exits = wstate_to
            .map((ws) => this.lookup_transition_for(whichState, ws))
            .filter(Boolean), 
        // forced-only exits cannot be reached by transition(), so they are
        // never legal probabilistic outcomes
        legal_exits = all_exits.filter((e) => !e.forced_only), 
        // if any legal exit declares a probability, filter to those only so
        // that probability-bearing edges are not diluted by their peers
        probability_bearing = legal_exits.filter((e) => e.probability !== undefined);
        return (probability_bearing.length > 0) ? probability_bearing : legal_exits;
    }
    /** Take a single random transition from the current state, weighted by
     *  edge probabilities.
     *  @returns `true` if a transition was taken, `false` otherwise.
     */
    probabilistic_transition() {
        const selected = weighted_rand_select(this.probable_exits_for(this.state()), undefined, this._rng);
        return this.transition(selected.to);
    }
    /** Take `n` consecutive probabilistic transitions and return the sequence
     *  of states visited (before each transition).
     *  @param n - Number of steps to walk.
     *  @returns An array of state names visited during the walk.
     */
    probabilistic_walk(n) {
        return seq(n)
            .map(() => {
            const state_was = this.state();
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
    probabilistic_histo_walk(n) {
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
    actions(whichState = this.state()) {
        const wstate = this._reverse_actions.get(whichState);
        if (wstate) {
            return Array.from(wstate.keys());
        }
        else {
            if (this.has_state(whichState)) {
                return [];
            }
            else {
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
    list_states_having_action(whichState) {
        const wstate = this._actions.get(whichState);
        if (wstate) {
            return Array.from(wstate.keys());
        }
        else {
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
    list_exit_actions(whichState = this.state()) {
        const ra_base = this._reverse_actions.get(whichState);
        if (!(ra_base)) {
            if (this.has_state(whichState)) {
                return [];
            }
            throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
        }
        return Array.from(ra_base.values())
            .map((edgeId) => this._edges[edgeId])
            .filter((o) => o.from === whichState)
            .map((filtered) => filtered.action);
    }
    /** List all action exits from a state with their probabilities.
     *  @param whichState - The state to inspect.  Defaults to the current state.
     *  @returns An array of `{ action, probability }` objects.
     *  @throws {JssmError} If the state does not exist.
     */
    probable_action_exits(whichState = this.state()) {
        const ra_base = this._reverse_actions.get(whichState);
        if (!(ra_base)) {
            if (this.has_state(whichState)) {
                return [];
            }
            throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
        }
        return Array.from(ra_base.values())
            .map((edgeId) => this._edges[edgeId])
            .filter((o) => o.from === whichState)
            .map((filtered) => ({
            action: filtered.action,
            probability: filtered.probability
        }));
    }
    /** Check whether a state has no incoming transitions (unreachable after start).
     *  @param whichState - The state to check.
     *  @returns `true` if the state has zero entrances.
     *  @throws {JssmError} If the state does not exist.
     */
    is_unenterable(whichState) {
        if (!(this.has_state(whichState))) {
            throw new JssmError(this, `No such state ${whichState}`);
        }
        return this.list_entrances(whichState).length === 0;
    }
    /** Check whether any state in the machine is unenterable.
     *  @returns `true` if at least one state has no incoming transitions.
     */
    has_unenterables() {
        return this.states().some((x) => this.is_unenterable(x));
    }
    /** Check whether the current state is terminal (has no exits).
     *  @returns `true` if the current state has zero exits.
     */
    is_terminal() {
        return this.state_is_terminal(this.state());
    }
    /** Check whether a specific state is terminal (has no exits).
     *  @param whichState - The state to check.
     *  @returns `true` if the state has zero exits.
     *  @throws {JssmError} If the state does not exist.
     */
    state_is_terminal(whichState) {
        if (!(this.has_state(whichState))) {
            throw new JssmError(this, `No such state ${whichState}`);
        }
        return this.list_exits(whichState).length === 0;
    }
    /** Check whether any state in the machine is terminal.
     *  @returns `true` if at least one state has no exits.
     */
    has_terminals() {
        return this.states().some((x) => this.state_is_terminal(x));
    }
    /** Check whether the current state is complete (every exit has an action).
     *  @returns `true` if the current state is complete.
     */
    is_complete() {
        return this.state_is_complete(this.state());
    }
    /** Check whether a specific state is complete (every exit has an action).
     *  @param whichState - The state to check.
     *  @returns `true` if the state is complete.
     *  @throws {JssmError} If the state does not exist.
     */
    state_is_complete(whichState) {
        const wstate = this._states.get(whichState);
        if (wstate) {
            return wstate.complete;
        }
        else {
            throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
        }
    }
    /** Check whether any state in the machine is complete.
     *  @returns `true` if at least one state is complete.
     */
    has_completes() {
        return this.states().some((x) => this.state_is_complete(x));
    }
    on(name, filterOrFn, maybeFn) {
        return this._subscribe(name, filterOrFn, maybeFn, false);
    }
    once(name, filterOrFn, maybeFn) {
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
    off(name, handler) {
        const set = this._event_handlers.get(name);
        if (set === undefined) {
            return false;
        }
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
    _unsubscribe_entry(set, entry) {
        if (set.delete(entry)) {
            this._event_listener_count--;
        }
    }
    /**
     *  Shared registration core used by {@link Machine.on} and
     *  {@link Machine.once}.  Normalizes the optional filter argument and
     *  installs the entry into the per-event subscription set.
     *
     *  @internal
     */
    _subscribe(name, filterOrFn, maybeFn, once) {
        let filter;
        let handler;
        if (typeof filterOrFn === 'function') {
            filter = undefined;
            handler = filterOrFn;
        }
        else {
            filter = filterOrFn;
            handler = maybeFn;
        }
        if (typeof handler !== 'function') {
            throw new JssmError(this, `event handler for "${name}" must be a function`);
        }
        let set = this._event_handlers.get(name);
        if (set === undefined) {
            set = new Set();
            this._event_handlers.set(name, set);
        }
        const entry = { handler, filter, once };
        set.add(entry);
        this._event_listener_count++;
        return () => { this._unsubscribe_entry(set, entry); };
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
    _fire_one(entry, set, name, detail) {
        // filter check
        if (entry.filter !== undefined) {
            for (const k of Object.keys(entry.filter)) {
                if (entry.filter[k] !== detail[k]) {
                    return;
                }
            }
        }
        // once removal happens BEFORE invocation so a throwing handler still
        // gets removed and so re-entrant `on` calls during the handler see
        // the post-removal state.
        if (entry.once) {
            this._unsubscribe_entry(set, entry);
        }
        try {
            entry.handler(detail);
        }
        catch (err) {
            if (name === 'error' || this._firing_error) {
                // surface to stderr as a last resort but never recurse;
                // `console` is in the JS standard library and present in every
                // supported runtime, so guarding it would just add an untestable
                // branch.  See #638.
                // eslint-disable-next-line no-console
                console.error(err);
            }
            else {
                this._firing_error = true;
                try {
                    this._fire('error', {
                        error: err,
                        source_event: name,
                        source_detail: detail,
                        handler: entry.handler
                    });
                }
                finally {
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
    _fire(name, detail) {
        const set = this._event_handlers.get(name);
        if (set === undefined || set.size === 0) {
            return;
        }
        // Fast-path: single subscriber — capture entry before invoking so that
        // even if the handler mutates `set` (via off/once auto-removal) we hold a
        // stable reference.  Behaviorally identical to a 1-element snapshot.
        if (set.size === 1) {
            const only = set.values().next().value;
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
    set_hook(HookDesc) {
        switch (HookDesc.kind) {
            case 'hook': {
                // Nested by `from` then `to`; avoids JSON.stringify on every transition (#642).
                let inner = this._hooks.get(HookDesc.from);
                if (inner === undefined) {
                    inner = new Map();
                    this._hooks.set(HookDesc.from, inner);
                }
                inner.set(HookDesc.to, HookDesc.handler);
                this._has_hooks = true;
                this._has_basic_hooks = true;
                break;
            }
            case 'named': {
                // Nested by `from` then `to` then `action`; same rationale as 'hook' (#642).
                let inner = this._named_hooks.get(HookDesc.from);
                if (inner === undefined) {
                    inner = new Map();
                    this._named_hooks.set(HookDesc.from, inner);
                }
                let inner2 = inner.get(HookDesc.to);
                if (inner2 === undefined) {
                    inner2 = new Map();
                    inner.set(HookDesc.to, inner2);
                }
                inner2.set(HookDesc.action, HookDesc.handler);
                this._has_hooks = true;
                this._has_named_hooks = true;
                break;
            }
            case 'global action':
                this._global_action_hooks.set(HookDesc.action, HookDesc.handler);
                this._has_hooks = true;
                this._has_global_action_hooks = true;
                break;
            case 'any action':
                this._any_action_hook = HookDesc.handler;
                this._has_hooks = true;
                break;
            case 'standard transition':
                this._standard_transition_hook = HookDesc.handler;
                this._has_transition_hooks = true;
                this._has_hooks = true;
                break;
            case 'main transition':
                this._main_transition_hook = HookDesc.handler;
                this._has_transition_hooks = true;
                this._has_hooks = true;
                break;
            case 'forced transition':
                this._forced_transition_hook = HookDesc.handler;
                this._has_transition_hooks = true;
                this._has_hooks = true;
                break;
            case 'any transition':
                this._any_transition_hook = HookDesc.handler;
                this._has_hooks = true;
                break;
            case 'entry':
                this._entry_hooks.set(HookDesc.to, HookDesc.handler);
                this._has_hooks = true;
                this._has_entry_hooks = true;
                break;
            case 'exit':
                this._exit_hooks.set(HookDesc.from, HookDesc.handler);
                this._has_hooks = true;
                this._has_exit_hooks = true;
                break;
            case 'after':
                this._after_hooks.set(HookDesc.from, HookDesc.handler);
                this._has_hooks = true;
                this._has_after_hooks = true;
                break;
            case 'post hook': {
                // Nested by `from` then `to`; same rationale as 'hook' (#642).
                let inner = this._post_hooks.get(HookDesc.from);
                if (inner === undefined) {
                    inner = new Map();
                    this._post_hooks.set(HookDesc.from, inner);
                }
                inner.set(HookDesc.to, HookDesc.handler);
                this._has_post_hooks = true;
                this._has_post_basic_hooks = true;
                break;
            }
            case 'post named': {
                // Nested by `from` then `to` then `action`; same rationale as 'hook' (#642).
                let inner = this._post_named_hooks.get(HookDesc.from);
                if (inner === undefined) {
                    inner = new Map();
                    this._post_named_hooks.set(HookDesc.from, inner);
                }
                let inner2 = inner.get(HookDesc.to);
                if (inner2 === undefined) {
                    inner2 = new Map();
                    inner.set(HookDesc.to, inner2);
                }
                inner2.set(HookDesc.action, HookDesc.handler);
                this._has_post_hooks = true;
                this._has_post_named_hooks = true;
                break;
            }
            case 'post global action':
                this._post_global_action_hooks.set(HookDesc.action, HookDesc.handler);
                this._has_post_hooks = true;
                this._has_post_global_action_hooks = true;
                break;
            case 'post any action':
                this._post_any_action_hook = HookDesc.handler;
                this._has_post_hooks = true;
                break;
            case 'post standard transition':
                this._post_standard_transition_hook = HookDesc.handler;
                this._has_post_transition_hooks = true;
                this._has_post_hooks = true;
                break;
            case 'post main transition':
                this._post_main_transition_hook = HookDesc.handler;
                this._has_post_transition_hooks = true;
                this._has_post_hooks = true;
                break;
            case 'post forced transition':
                this._post_forced_transition_hook = HookDesc.handler;
                this._has_post_transition_hooks = true;
                this._has_post_hooks = true;
                break;
            case 'post any transition':
                this._post_any_transition_hook = HookDesc.handler;
                this._has_post_hooks = true;
                break;
            case 'post entry':
                this._post_entry_hooks.set(HookDesc.to, HookDesc.handler);
                this._has_post_entry_hooks = true;
                this._has_post_hooks = true;
                break;
            case 'post exit':
                this._post_exit_hooks.set(HookDesc.from, HookDesc.handler);
                this._has_post_exit_hooks = true;
                this._has_post_hooks = true;
                break;
            case 'pre everything':
                this._pre_everything_hook = HookDesc.handler;
                this._has_hooks = true;
                break;
            case 'everything':
                this._everything_hook = HookDesc.handler;
                this._has_hooks = true;
                break;
            case 'pre post everything':
                this._pre_post_everything_hook = HookDesc.handler;
                this._has_post_hooks = true;
                break;
            case 'post everything':
                this._post_everything_hook = HookDesc.handler;
                this._has_post_hooks = true;
                break;
            default:
                throw new JssmError(this, `Unknown hook type ${HookDesc.kind}, should be impossible`);
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
    remove_hook(HookDesc) {
        let removed = false;
        switch (HookDesc.kind) {
            case 'hook': {
                const inner = this._hooks.get(HookDesc.from);
                if (inner !== undefined && inner.has(HookDesc.to)) {
                    inner.delete(HookDesc.to);
                    removed = true;
                }
                break;
            }
            case 'named': {
                const inner = this._named_hooks.get(HookDesc.from);
                const inner2 = inner === undefined ? undefined : inner.get(HookDesc.to);
                if (inner2 !== undefined && inner2.has(HookDesc.action)) {
                    inner2.delete(HookDesc.action);
                    removed = true;
                }
                break;
            }
            case 'global action':
                removed = this._global_action_hooks.delete(HookDesc.action);
                break;
            case 'any action':
                if (this._any_action_hook !== undefined) {
                    this._any_action_hook = undefined;
                    removed = true;
                }
                break;
            case 'standard transition':
                if (this._standard_transition_hook !== undefined) {
                    this._standard_transition_hook = undefined;
                    removed = true;
                }
                break;
            case 'main transition':
                if (this._main_transition_hook !== undefined) {
                    this._main_transition_hook = undefined;
                    removed = true;
                }
                break;
            case 'forced transition':
                if (this._forced_transition_hook !== undefined) {
                    this._forced_transition_hook = undefined;
                    removed = true;
                }
                break;
            case 'any transition':
                if (this._any_transition_hook !== undefined) {
                    this._any_transition_hook = undefined;
                    removed = true;
                }
                break;
            case 'entry':
                removed = this._entry_hooks.delete(HookDesc.to);
                break;
            case 'exit':
                removed = this._exit_hooks.delete(HookDesc.from);
                break;
            case 'after':
                removed = this._after_hooks.delete(HookDesc.from);
                break;
            case 'post hook': {
                const inner = this._post_hooks.get(HookDesc.from);
                if (inner !== undefined && inner.has(HookDesc.to)) {
                    inner.delete(HookDesc.to);
                    removed = true;
                }
                break;
            }
            case 'post named': {
                const inner = this._post_named_hooks.get(HookDesc.from);
                const inner2 = inner === undefined ? undefined : inner.get(HookDesc.to);
                if (inner2 !== undefined && inner2.has(HookDesc.action)) {
                    inner2.delete(HookDesc.action);
                    removed = true;
                }
                break;
            }
            case 'post global action':
                removed = this._post_global_action_hooks.delete(HookDesc.action);
                break;
            case 'post any action':
                if (this._post_any_action_hook !== undefined) {
                    this._post_any_action_hook = undefined;
                    removed = true;
                }
                break;
            case 'post standard transition':
                if (this._post_standard_transition_hook !== undefined) {
                    this._post_standard_transition_hook = undefined;
                    removed = true;
                }
                break;
            case 'post main transition':
                if (this._post_main_transition_hook !== undefined) {
                    this._post_main_transition_hook = undefined;
                    removed = true;
                }
                break;
            case 'post forced transition':
                if (this._post_forced_transition_hook !== undefined) {
                    this._post_forced_transition_hook = undefined;
                    removed = true;
                }
                break;
            case 'post any transition':
                if (this._post_any_transition_hook !== undefined) {
                    this._post_any_transition_hook = undefined;
                    removed = true;
                }
                break;
            case 'post entry':
                removed = this._post_entry_hooks.delete(HookDesc.to);
                break;
            case 'post exit':
                removed = this._post_exit_hooks.delete(HookDesc.from);
                break;
            case 'pre everything':
                if (this._pre_everything_hook !== undefined) {
                    this._pre_everything_hook = undefined;
                    removed = true;
                }
                break;
            case 'everything':
                if (this._everything_hook !== undefined) {
                    this._everything_hook = undefined;
                    removed = true;
                }
                break;
            case 'pre post everything':
                if (this._pre_post_everything_hook !== undefined) {
                    this._pre_post_everything_hook = undefined;
                    removed = true;
                }
                break;
            case 'post everything':
                if (this._post_everything_hook !== undefined) {
                    this._post_everything_hook = undefined;
                    removed = true;
                }
                break;
            default:
                throw new JssmError(this, `Unknown hook type ${HookDesc.kind}, should be impossible`);
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
    hook(from, to, handler) {
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
    hook_action(from, to, action, handler) {
        this.set_hook({ kind: 'named', from, to, action, handler });
        return this;
    }
    /** Register a pre-transition hook on any edge triggered by a specific action.
     *  @param action  - The action name to hook.
     *  @param handler - Callback invoked before any transition with this action.
     *  @returns `this` for chaining.
     */
    hook_global_action(action, handler) {
        this.set_hook({ kind: 'global action', action, handler });
        return this;
    }
    /** Register a pre-transition hook on any action-driven transition.
     *  @param handler - Callback invoked before any action transition.
     *  @returns `this` for chaining.
     */
    hook_any_action(handler) {
        this.set_hook({ kind: 'any action', handler });
        return this;
    }
    /** Register a pre-transition hook on any standard (`->`) transition.
     *  @param handler - Callback invoked before any legal transition.
     *  @returns `this` for chaining.
     */
    hook_standard_transition(handler) {
        this.set_hook({ kind: 'standard transition', handler });
        return this;
    }
    /** Register a pre-transition hook on any main-path (`=>`) transition.
     *  @param handler - Callback invoked before any main transition.
     *  @returns `this` for chaining.
     */
    hook_main_transition(handler) {
        this.set_hook({ kind: 'main transition', handler });
        return this;
    }
    /** Register a pre-transition hook on any forced (`~>`) transition.
     *  @param handler - Callback invoked before any forced transition.
     *  @returns `this` for chaining.
     */
    hook_forced_transition(handler) {
        this.set_hook({ kind: 'forced transition', handler });
        return this;
    }
    /** Register a pre-transition hook on any transition regardless of kind.
     *  @param handler - Callback invoked before every transition.
     *  @returns `this` for chaining.
     */
    hook_any_transition(handler) {
        this.set_hook({ kind: 'any transition', handler });
        return this;
    }
    /** Register a hook that fires when entering a specific state.
     *  @param to      - The state being entered.
     *  @param handler - Callback invoked on entry.
     *  @returns `this` for chaining.
     */
    hook_entry(to, handler) {
        this.set_hook({ kind: 'entry', to, handler });
        return this;
    }
    /** Register a hook that fires when leaving a specific state.
     *  @param from    - The state being exited.
     *  @param handler - Callback invoked on exit.
     *  @returns `this` for chaining.
     */
    hook_exit(from, handler) {
        this.set_hook({ kind: 'exit', from, handler });
        return this;
    }
    /** Register a hook that fires after leaving a specific state (post-exit).
     *  @param from    - The state that was exited.
     *  @param handler - Callback invoked after exit completes.
     *  @returns `this` for chaining.
     */
    hook_after(from, handler) {
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
    post_hook(from, to, handler) {
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
    post_hook_action(from, to, action, handler) {
        this.set_hook({ kind: 'post named', from, to, action, handler });
        return this;
    }
    /** Post-transition hook on any edge triggered by a specific action.
     *  @param action  - The action name.
     *  @param handler - Callback invoked after any transition with this action.
     *  @returns `this` for chaining.
     */
    post_hook_global_action(action, handler) {
        this.set_hook({ kind: 'post global action', action, handler });
        return this;
    }
    /** Post-transition hook on any action-driven transition.
     *  @param handler - Callback invoked after any action transition.
     *  @returns `this` for chaining.
     */
    post_hook_any_action(handler) {
        this.set_hook({ kind: 'post any action', handler });
        return this;
    }
    /** Post-transition hook on any standard (`->`) transition.
     *  @param handler - Callback invoked after any legal transition.
     *  @returns `this` for chaining.
     */
    post_hook_standard_transition(handler) {
        this.set_hook({ kind: 'post standard transition', handler });
        return this;
    }
    /** Post-transition hook on any main-path (`=>`) transition.
     *  @param handler - Callback invoked after any main transition.
     *  @returns `this` for chaining.
     */
    post_hook_main_transition(handler) {
        this.set_hook({ kind: 'post main transition', handler });
        return this;
    }
    /** Post-transition hook on any forced (`~>`) transition.
     *  @param handler - Callback invoked after any forced transition.
     *  @returns `this` for chaining.
     */
    post_hook_forced_transition(handler) {
        this.set_hook({ kind: 'post forced transition', handler });
        return this;
    }
    /** Post-transition hook on any transition regardless of kind.
     *  @param handler - Callback invoked after every transition.
     *  @returns `this` for chaining.
     */
    post_hook_any_transition(handler) {
        this.set_hook({ kind: 'post any transition', handler });
        return this;
    }
    /** Post-transition hook that fires after entering a specific state.
     *  @param to      - The state that was entered.
     *  @param handler - Callback invoked after entry.
     *  @returns `this` for chaining.
     */
    post_hook_entry(to, handler) {
        this.set_hook({ kind: 'post entry', to, handler });
        return this;
    }
    /** Post-transition hook that fires after leaving a specific state.
     *  @param from    - The state that was exited.
     *  @param handler - Callback invoked after exit.
     *  @returns `this` for chaining.
     */
    post_hook_exit(from, handler) {
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
    hook_pre_everything(handler) {
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
    hook_everything(handler) {
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
    hook_post_everything(handler) {
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
    hook_pre_post_everything(handler) {
        this.set_hook({ kind: 'pre post everything', handler });
        return this;
    }
    /** Get the current RNG seed used for probabilistic transitions.
     *  @returns The numeric seed value.
     */
    get rng_seed() {
        return this._rng_seed;
    }
    /** Set the RNG seed.  Pass `undefined` to reseed from the current time.
     *  Resets the internal PRNG so subsequent probabilistic operations use the
     *  new seed.
     *  @param to - The seed value, or `undefined` for time-based seeding.
     */
    set rng_seed(to) {
        if (typeof to === 'undefined') {
            this._rng_seed = new Date().getTime();
        }
        else {
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
    edges_between(from, to) {
        var _a;
        // Filter only this state's outbound edges instead of the full _edges array.
        // For machines with E total edges and average out-degree d, this is O(d)
        // instead of O(E) — a large win on dense graphs where d << E.  The `?? []`
        // covers from-states that have no outgoing edges (terminal states) and
        // states that don't exist at all, both of which return [] without iterating.
        const outbound = (_a = this._outbound_edge_ids.get(from)) !== null && _a !== void 0 ? _a : [];
        const result = [];
        for (const edgeId of outbound) {
            const edge = this._edges[edgeId];
            if (edge.to === to) {
                result.push(edge);
            }
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
    override(newState, newData) {
        if (this.allows_override) {
            if (this._states.has(newState)) {
                const fromState = this._state;
                const oldData = this._data;
                this._state = newState;
                this._data = newData;
                this._fire('override', {
                    from: fromState,
                    to: newState,
                    old_data: oldData,
                    new_data: newData
                });
                if (oldData !== newData) {
                    this._fire('data-change', {
                        from: fromState,
                        to: newState,
                        old_data: oldData,
                        new_data: newData,
                        cause: 'override'
                    });
                }
            }
            else {
                throw new JssmError(this, `Cannot override state to "${newState}", a state that does not exist`);
            }
        }
        else {
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
    _fire_hook_rejection(hook_name, fromState, newState, fromAction, oldData, newData, wasForced) {
        this._fire('rejection', {
            from: fromState,
            to: newState,
            action: fromAction,
            data: oldData,
            next_data: newData,
            reason: 'hook',
            hook_name,
            forced: wasForced
        });
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
    transition_impl(newStateOrAction, newData, wasForced, wasAction) {
        let valid = false, trans_type, newState, fromAction = undefined;
        if (wasForced) {
            if (this.valid_force_transition(newStateOrAction, newData)) {
                valid = true;
                trans_type = 'forced';
                newState = newStateOrAction;
            }
        }
        else if (wasAction) {
            if (this.valid_action(newStateOrAction, newData)) {
                const edge = this.current_action_edge_for(newStateOrAction);
                valid = true;
                trans_type = edge.kind;
                newState = edge.to;
                fromAction = newStateOrAction;
            }
        }
        else {
            if (this.valid_transition(newStateOrAction, newData)) {
                if (this._has_transition_hooks || this._has_post_transition_hooks) {
                    trans_type = this.edges_between(this._state, newStateOrAction)[0].kind; // TODO this won't do the right thing if various edges have different types
                }
                valid = true;
                newState = newStateOrAction;
            }
        }
        // hook_args is read only inside the `_has_hooks` / `_has_post_hooks`
        // blocks below.  Skip building it for hook-free machines (every
        // chain/dense/hub/messy benchmark shape) so the hot path stops allocating
        // a 7-field object it never reads.  The NonNullable cast keeps the type
        // unchanged for all downstream uses without introducing an impossible
        // (uncoverable) branch; the value is only dereferenced under the guards
        // that imply it was built.  #670
        const hook_args_obj = (this._has_hooks || this._has_post_hooks)
            ? {
                data: this._data,
                action: fromAction,
                from: this._state,
                to: newState,
                next_data: newData,
                forced: wasForced,
                trans_type
            }
            : undefined;
        const hook_args = hook_args_obj;
        // 'action' event fires when an action is attempted, regardless of whether
        // it ultimately succeeds — matches the issue spec for observation events.
        // Gated on live listener count so we skip the detail-object allocation
        // when nothing is subscribed.  Gate is read at fire time, so a listener
        // registered inside a pre-hook still receives the event.  #671
        if (wasAction) {
            if (this._event_listener_count !== 0) {
                this._fire('action', {
                    action: newStateOrAction,
                    from: this._state,
                    to: newState,
                    data: this._data,
                    next_data: newData
                });
            }
        }
        // Captured pre-transition source state so 'data-change' detail and similar
        // events can name where we came from.
        const fromState = this._state;
        const oldData = this._data;
        if (valid) {
            if (this._has_hooks) {
                // once validity is known, clear old 'after' timeout clause
                this.clear_state_timeout();
                let data_changed = false;
                // 0. pre everything hook (fires before all other pre-hooks)
                if (this._pre_everything_hook !== undefined) {
                    const outcome = abstract_everything_hook_step(this._pre_everything_hook, Object.assign(Object.assign({}, hook_args), { hook_name: 'pre everything' }));
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('pre everything', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                if (wasAction) {
                    // 1a. any action hook
                    const outcome = abstract_hook_step(this._any_action_hook, hook_args);
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('any action', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                    // 1b. global specific action hook
                    const outcome2 = abstract_hook_step(this._global_action_hooks.get(newStateOrAction), hook_args);
                    if (outcome2.pass === false) {
                        this._fire_hook_rejection('global action', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome2)) {
                        data_changed = true;
                    }
                }
                // 2. after hook
                if (this._has_after_hooks) {
                    const ah = this._after_hooks.get(newStateOrAction);
                    const outcome = abstract_hook_step(ah, hook_args);
                    // there's no such thing as after not passing, so, omit the result pass check.
                    // after hooks are post-exit and informational — their outcome never changes
                    // data, so there's no data_changed branch here (it would be unreachable).
                    _update_hook_fields(hook_args, outcome);
                }
                // 3. any transition hook
                if (this._any_transition_hook !== undefined) {
                    const outcome = abstract_hook_step(this._any_transition_hook, hook_args);
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('any transition', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 4. exit hook
                if (this._has_exit_hooks) {
                    const outcome = abstract_hook_step(this._exit_hooks.get(this._state), hook_args);
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('exit', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 5. named transition / action hook
                if (this._has_named_hooks) {
                    if (wasAction) {
                        // Nested lookup: from -> to -> action.  Each step is a small Map keyed by
                        // an already-interned state/action name; no per-call string allocation.
                        const byTo = this._named_hooks.get(this._state);
                        const byAct = byTo === undefined ? undefined : byTo.get(newState);
                        const nh = byAct === undefined ? undefined : byAct.get(newStateOrAction);
                        const outcome = abstract_hook_step(nh, hook_args);
                        if (outcome.pass === false) {
                            this._fire_hook_rejection('named', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                    }
                }
                // 6. regular hook
                if (this._has_basic_hooks) {
                    // Nested lookup: from -> to.  See note on _hooks declaration (#642).
                    const byTo = this._hooks.get(this._state);
                    const h = byTo === undefined ? undefined : byTo.get(newState);
                    const outcome = abstract_hook_step(h, hook_args);
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('hook', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 7. edge type hook
                // 7a. standard transition hook
                if (trans_type === 'legal') {
                    const outcome = abstract_hook_step(this._standard_transition_hook, hook_args);
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('standard transition', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 7b. main type hook
                if (trans_type === 'main') {
                    const outcome = abstract_hook_step(this._main_transition_hook, hook_args);
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('main transition', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 7c. forced transition hook
                if (trans_type === 'forced') {
                    const outcome = abstract_hook_step(this._forced_transition_hook, hook_args);
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('forced transition', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 8. entry hook
                if (this._has_entry_hooks) {
                    const outcome = abstract_hook_step(this._entry_hooks.get(newState), hook_args);
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('entry', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // 9. everything hook (fires after all other pre-hooks)
                if (this._everything_hook !== undefined) {
                    const outcome = abstract_everything_hook_step(this._everything_hook, Object.assign(Object.assign({}, hook_args), { hook_name: 'everything' }));
                    if (outcome.pass === false) {
                        this._fire_hook_rejection('everything', fromState, newState, fromAction, oldData, newData, wasForced);
                        return false;
                    }
                    if (_update_hook_fields(hook_args, outcome)) {
                        data_changed = true;
                    }
                }
                // all hooks passed!  let's now establish the result
                if (this._history_length) {
                    this._history.shove([this._state, this._data]);
                }
                this._state = newState;
                if (data_changed) {
                    this._data = hook_args.data;
                }
                else if (newData !== undefined) {
                    this._data = newData;
                }
                // success fallthrough to posthooks; intentionally no return here
                // look for "posthooks begin here"
                // or without hooks
            }
            else {
                if (this._history_length) {
                    this._history.shove([this._state, this._data]);
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
        }
        else {
            // Gated on live listener count so we skip the detail-object allocation
            // when nothing is subscribed.  A listener still receives the event
            // because the gate is read at fire time.  #671
            if (this._event_listener_count !== 0) {
                this._fire('rejection', {
                    from: fromState,
                    to: newStateOrAction,
                    action: fromAction,
                    data: oldData,
                    next_data: newData,
                    reason: 'invalid',
                    forced: wasForced
                });
            }
            return false;
        }
        // posthooks begin here
        if (this._has_post_hooks) {
            // 0. pre post everything hook (fires before all other post-hooks)
            if (this._pre_post_everything_hook !== undefined) {
                this._pre_post_everything_hook(Object.assign(Object.assign({}, hook_args), { hook_name: 'pre post everything' }));
            }
            if (wasAction) {
                // 1. any action posthook
                if (this._post_any_action_hook !== undefined) {
                    this._post_any_action_hook(hook_args);
                }
                // 2. global specific action hook
                const pgah = this._post_global_action_hooks.get(hook_args.action);
                if (pgah !== undefined) {
                    pgah(hook_args);
                }
            }
            // 3. any transition hook
            if (this._post_any_transition_hook !== undefined) {
                this._post_any_transition_hook(hook_args);
            }
            // 4. exit hook
            if (this._has_post_exit_hooks) {
                const peh = this._post_exit_hooks.get(hook_args.from); // todo this is probably from instead
                if (peh !== undefined) {
                    peh(hook_args);
                }
            }
            // 5. named transition / action hook
            if (this._has_post_named_hooks) {
                if (wasAction) {
                    // Nested lookup: from -> to -> action.  See note on _post_named_hooks (#642).
                    const byTo = this._post_named_hooks.get(hook_args.from);
                    const byAct = byTo === undefined ? undefined : byTo.get(hook_args.to);
                    const pnh = byAct === undefined ? undefined : byAct.get(hook_args.action);
                    if (pnh !== undefined) {
                        pnh(hook_args);
                    }
                }
            }
            // 6. regular hook
            if (this._has_post_basic_hooks) {
                // Nested lookup: from -> to.  See note on _post_hooks (#642).
                const byTo = this._post_hooks.get(hook_args.from);
                const hook = byTo === undefined ? undefined : byTo.get(hook_args.to);
                if (hook !== undefined) {
                    hook(hook_args);
                }
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
                if (hook !== undefined) {
                    hook(hook_args);
                }
            }
            // 9. post everything hook (fires after all other post-hooks)
            if (this._post_everything_hook !== undefined) {
                this._post_everything_hook(Object.assign(Object.assign({}, hook_args), { hook_name: 'post everything' }));
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
            const newData_after = this._data;
            this._fire('exit', {
                state: fromState,
                to: newState,
                action: fromAction,
                data: newData_after
            });
            this._fire('transition', {
                from: fromState,
                to: newState,
                action: fromAction,
                data: newData_after,
                next_data: newData,
                trans_type,
                forced: wasForced
            });
            this._fire('entry', {
                state: newState,
                from: fromState,
                action: fromAction,
                data: newData_after
            });
            if (oldData !== newData_after) {
                this._fire('data-change', {
                    from: fromState,
                    to: newState,
                    action: fromAction,
                    old_data: oldData,
                    new_data: newData_after,
                    cause: 'transition'
                });
            }
            if (this.state_is_terminal(newState)) {
                this._fire('terminal', { state: newState, data: newData_after });
            }
            if (this.state_is_complete(newState)) {
                this._fire('complete', { state: newState, data: newData_after });
            }
        }
        // possibly re-establish new 'after' clause
        this.auto_set_state_timeout();
        return true;
    }
    /** If the current state has an `after` timeout configured, schedule it.
     *  Called internally after each transition.
     */
    auto_set_state_timeout() {
        const after_res = this._after_mapping.get(this._state);
        if (after_res !== undefined) {
            const [next_state, after_time] = after_res;
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
        ret.push([this.state(), this.data()]);
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
    set history_length(to) {
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
    action(actionName, newData) {
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
    get standard_state_style() {
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
    get hooked_state_style() {
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
    get start_state_style() {
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
    get end_state_style() {
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
    get terminal_state_style() {
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
    get active_state_style() {
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
     *  @param state The state to compute the composite style for.
     *
     *  @returns The fully composited {@link JssmStateConfig} for the given state.
     *
     */
    style_for(state) {
        // first look up the themes
        const themes = [];
        this._themes.forEach(th => {
            const theme_impl = theme_mapping.get(th);
            if (theme_impl !== undefined) {
                themes.push(theme_impl);
            }
        });
        // basic state style
        const layers = [base_theme.state];
        themes.reverse().map(theme => {
            if (theme.state) {
                layers.push(theme.state);
            }
        });
        layers.push(this._state_style);
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
                if (theme.terminal) {
                    layers.push(theme.terminal);
                }
            });
            layers.push(this._terminal_state_style);
        }
        // start state style
        if (this.is_start_state(state)) {
            layers.push(base_theme.start);
            themes.map(theme => {
                if (theme.start) {
                    layers.push(theme.start);
                }
            });
            layers.push(this._start_state_style);
        }
        // end state style
        if (this.is_end_state(state)) {
            layers.push(base_theme.end);
            themes.map(theme => {
                if (theme.end) {
                    layers.push(theme.end);
                }
            });
            layers.push(this._end_state_style);
        }
        // active state style
        if (this.state() === state) {
            layers.push(base_theme.active);
            themes.map(theme => {
                if (theme.active) {
                    layers.push(theme.active);
                }
            });
            layers.push(this._active_state_style);
        }
        const individual_style = {}, decl = this._state_declarations.get(state);
        individual_style.color = decl === null || decl === void 0 ? void 0 : decl.color;
        individual_style.textColor = decl === null || decl === void 0 ? void 0 : decl.textColor;
        individual_style.borderColor = decl === null || decl === void 0 ? void 0 : decl.borderColor;
        individual_style.backgroundColor = decl === null || decl === void 0 ? void 0 : decl.backgroundColor;
        individual_style.lineStyle = decl === null || decl === void 0 ? void 0 : decl.lineStyle;
        individual_style.corners = decl === null || decl === void 0 ? void 0 : decl.corners;
        individual_style.shape = decl === null || decl === void 0 ? void 0 : decl.shape;
        individual_style.image = decl === null || decl === void 0 ? void 0 : decl.image;
        individual_style.url = decl === null || decl === void 0 ? void 0 : decl.url;
        layers.push(individual_style);
        return layers.reduce((acc, cur) => {
            const composite_state = acc;
            Object.keys(cur).forEach(key => { var _a; return composite_state[key] = (_a = cur[key]) !== null && _a !== void 0 ? _a : composite_state[key]; });
            return composite_state;
        }, {});
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
    do(actionName, newData) {
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
    transition(newState, newData) {
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
    go(newState, newData) {
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
    force_transition(newState, newData) {
        return this.transition_impl(newState, newData, true, false);
    }
    /** Get the edge index for an action from the current state.
     *  @param action - The action name.
     *  @returns The edge index, or `undefined` if the action is not available.
     */
    current_action_for(action) {
        const action_base = this._actions.get(action);
        return action_base
            ? action_base.get(this.state())
            : undefined;
    }
    /** Get the full transition object for an action from the current state.
     *  @param action - The action name.
     *  @returns The {@link JssmTransition} object.
     *  @throws {JssmError} If the action is not available from the current state.
     */
    current_action_edge_for(action) {
        const idx = this.current_action_for(action);
        if ((idx === undefined) || (idx === null)) {
            throw new JssmError(this, `No such action ${JSON.stringify(action)}`);
        }
        return this._edges[idx];
    }
    /** Check whether an action is available from the current state.
     *  @param action   - The action name to check.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the action can be taken.
     */
    valid_action(action, _newData) {
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
    valid_transition(newState, _newData) {
        // todo whargarbl implement data stuff
        // todo major incomplete whargarbl comeback
        const transition_for = this.lookup_transition_for(this.state(), newState);
        if (!(transition_for)) {
            return false;
        }
        if (transition_for.forced_only) {
            return false;
        }
        return true;
    }
    /** Check whether a forced transition to a given state exists from the
     *  current state.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if a forced (or any) transition exists.
     */
    valid_force_transition(newState, _newData) {
        // todo whargarbl implement data stuff
        // todo major incomplete whargarbl comeback
        return (this.lookup_transition_for(this.state(), newState) !== undefined);
    }
    /** Get the instance name of this machine, if one was assigned at creation.
     *  @returns The instance name string, or `undefined`.
     */
    instance_name() {
        return this._instance_name;
    }
    /** Get the creation date of this machine as a `Date` object.
     *  @returns A `Date` representing when the machine was created.
     */
    get creation_date() {
        return new Date(Math.floor(this.creation_timestamp));
    }
    /** Get the creation timestamp (milliseconds since epoch).
     *  @returns The timestamp as a number.
     */
    get creation_timestamp() {
        return this._created;
    }
    /** Get the timestamp when construction began (before parsing).
     *  @returns The start-of-construction timestamp as a number.
     */
    get create_start_time() {
        return this._create_started;
    }
    /** Schedule an automatic transition to `next_state` after `after_time`
     *  milliseconds.  Only one timeout may be active at a time.
     *  @param next_state - The state to transition to when the timer fires.
     *  @param after_time - Delay in milliseconds.
     *  @throws {JssmError} If a timeout is already pending.
     */
    set_state_timeout(next_state, after_time) {
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
                if (ah !== undefined) {
                    ah({ data: this._data, next_data: this._data });
                }
            }
            this._fire('timeout', { from: from_state, to: next_state, after_time });
            this.go(next_state);
        }, after_time);
        this._timeout_target = next_state;
        this._timeout_target_time = after_time;
    }
    /** Cancel any pending state timeout.  Safe to call when no timeout is active.
     */
    clear_state_timeout() {
        if (this._timeout_handle === undefined) {
            return; // calling with no timeout is a no-op, means it can be called glad-handedly
        }
        this._clear_timeout_source(this._timeout_handle);
        this._timeout_handle = undefined;
        this._timeout_target = undefined;
        this._timeout_target_time = undefined;
    }
    /** Get the configured `after` timeout for a given state, if any.
     *  @param which_state - The state to look up.
     *  @returns A `[targetState, delayMs]` tuple, or `undefined` if no timeout
     *  is configured for that state.
     */
    state_timeout_for(which_state) {
        return this._after_mapping.get(which_state);
    }
    /** Get the configured `after` timeout for the current state, if any.
     *  @returns A `[targetState, delayMs]` tuple, or `undefined`.
     */
    current_state_timeout() {
        return (this._timeout_target !== undefined)
            ? [this._timeout_target, this._timeout_target_time]
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
    sm(template_strings, ...remainder /* , arguments */) {
        return sm(template_strings, ...remainder);
    }
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
function sm(template_strings, ...remainder /* , arguments */) {
    // foo`a${1}b${2}c` will come in as (['a','b','c'],1,2)
    // this includes when a and c are empty strings
    // therefore template_strings will always have one more el than template_args
    // therefore map the smaller container and toss the last one on on the way out
    return new Machine(make(template_strings.reduce(
    // in general avoiding `arguments` is smart.  however with the template
    // string notation, as designed, it's not really worth the hassle
    /* eslint-disable prefer-rest-params */
    (acc, val, idx) => `${acc}${remainder[idx - 1]}${val}` // arguments[0] is never loaded, so args doesn't need to be gated
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
function from(MachineAsString, ExtraConstructorFields) {
    const to_decorate = make(MachineAsString);
    if (ExtraConstructorFields !== undefined) {
        Object.keys(ExtraConstructorFields).map(key => {
            if (key === 'allows_override') {
                to_decorate['config_allows_override'] = ExtraConstructorFields['allows_override'];
            }
            else {
                to_decorate[key] = ExtraConstructorFields[key];
            }
        });
    }
    return new Machine(to_decorate);
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
function is_hook_complex_result(hr) {
    if (hr !== null && typeof hr === 'object') {
        if (typeof hr.pass === 'boolean') {
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
function _update_hook_fields(hook_args, res) {
    if (Object.prototype.hasOwnProperty.call(res, 'data')) {
        hook_args.data = res.data;
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
function is_hook_rejection(hr) {
    if (hr === true) {
        return false;
    }
    if (hr === undefined) {
        return false;
    }
    if (hr === false) {
        return true;
    }
    if (is_hook_complex_result(hr)) {
        return (!(hr.pass));
    }
    throw new TypeError('unknown hook rejection type result');
}
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
function abstract_hook_step(maybe_hook, hook_args) {
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
        if (result === null) {
            return { pass: false };
        }
        if (is_hook_complex_result(result)) {
            return result;
        }
        throw new TypeError(`Unknown hook result type ${result}`);
    }
    else {
        return { pass: true };
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
function abstract_everything_hook_step(maybe_hook, hook_args) {
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
        if (result === null) {
            return { pass: false };
        }
        if (is_hook_complex_result(result)) {
            return result;
        }
        throw new TypeError(`Unknown hook result type ${result}`);
    }
    else {
        return { pass: true };
    }
}
/**
 * Compares two semantic version strings.
 *
 * @param {string} v1 - First version string (e.g., "5.104.2")
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
 */
function compareVersions(v1, v2) {
    var _a, _b;
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = (_a = parts1[i]) !== null && _a !== void 0 ? _a : 0;
        const num2 = (_b = parts2[i]) !== null && _b !== void 0 ? _b : 0;
        if (num1 !== num2) {
            return num1 - num2;
        }
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
function deserialize(machine_string, ser) {
    // Refuse to deserialize data from future versions
    if (compareVersions(ser.jssm_version, version) > 0) {
        throw new Error(`Cannot deserialize from future version ${ser.jssm_version} ` +
            `(current version is ${version}). Please upgrade jssm to deserialize this data.`);
    }
    const machine = from(machine_string, { data: ser.data, history: ser.history_capacity });
    machine._state = ser.state;
    ser.history.forEach(history_item => machine._history.push(history_item));
    return machine;
}
export { version, build_time, transfer_state_properties, Machine, deserialize, compareVersions, make, wrap_parse as parse, compile, sm, from, arrow_direction, arrow_left_kind, arrow_right_kind, 
// WHARGARBL TODO these should be exported to a utility library
seq, unique, find_repeated, weighted_rand_select, histograph, weighted_sample_select, weighted_histo_key, gen_splitmix32, sleep, constants, shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars, is_hook_rejection, is_hook_complex_result, abstract_hook_step, abstract_everything_hook_step, state_style_condense, FslDirections
//  FslThemes
 };
