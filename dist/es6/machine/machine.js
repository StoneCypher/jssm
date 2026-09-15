// whargarbl lots of these return arrays could/should be sets
import { circular_buffer } from 'circular_buffer_js';
import { make, transitive_members } from '../jssm_compiler.js';
import { array_box_if_string, name_bind_prop_and_state, gen_splitmix32, } from '../jssm_util.js';
import { Interner, pair_key } from '../jssm_intern.js';
import * as constants from '../jssm_constants.js';
const { shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars, is_state_name_first_char, is_state_name_char } = constants;
import { version, } from '../version.js'; // replaced from package.js in build
import { JssmError } from '../jssm_error.js';
// The bare-function families.  Each family file imports this class as a
// type only, so these are one-way runtime edges: the class is the runtime
// root and every member below is a one-line delegate onto its family.
import { on, once, off, fire, fire_one, has_subscribers } from './events.js';
import { history, history_inclusive, history_length, set_history_length } from './history.js';
import { set_state_timeout, clear_state_timeout, state_timeout_for, current_state_timeout, auto_set_state_timeout, DEFAULT_TIME_SOURCE, DEFAULT_TIMEOUT_SOURCE, DEFAULT_CLEAR_TIMEOUT_SOURCE } from './timers.js';
// The public movers (transition / go / force_transition / act / action / do)
// call transition_impl directly, not the family's public one-liners, so the
// class path keeps its 5.x frame depth.
import { transition_impl, override, valid_action, valid_transition, valid_force_transition, fire_hook_rejection, fire_boundary_actions } from './transition.js';
import { set_hook, remove_hook, hook, hook_action, hook_global_action, hook_any_action, hook_standard_transition, hook_main_transition, hook_forced_transition, hook_any_transition, hook_entry, hook_exit, hook_after, hook_after_any, post_hook, post_hook_action, post_hook_global_action, post_hook_any_action, post_hook_standard_transition, post_hook_main_transition, post_hook_forced_transition, post_hook_any_transition, post_hook_entry, post_hook_exit, hook_pre_everything, hook_everything, hook_post_everything, hook_pre_post_everything, hook_registry, hooks_on, has_hook, state_has_hooks } from './hooks.js';
import { data, set_data, data_ref, prop, strict_prop, props, known_prop, known_props, val, set_val, vals, known_val, known_vals, val_type, validate_val_value } from './data.js';
import { state, label_for, display_text, is_start_state, is_end_state, failed_outputs, is_failed_output, is_failed, state_is_final, is_final, canonical, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, editor_config, npm_name, default_size, machine_version, raw_state_declarations, state_declaration, state_declarations, fsl_version, machine_state, states, state_for, has_state, list_edges, list_named_transitions, list_actions, uses_actions, uses_forced_transitions, code_allows_override, config_allows_override, allows_override, allow_islands, all_state_name_chars, all_state_name_first_chars, all_action_label_chars, get_transition_by_state_names, lookup_transition_for, list_transitions, list_entrances, list_exits, actions, list_states_having_action, list_exit_actions, probable_action_exits, is_unenterable, has_unenterables, is_terminal, state_is_terminal, has_terminals, is_complete, state_is_complete, has_completes, edges_between, current_action_for, current_action_edge_for } from './query.js';
import { start_state_weights, sample_start_state, probable_exits_for, probabilistic_transition, probabilistic_walk, probabilistic_histo_walk, stochastic_runs, stochastic_summary, rng_seed, set_rng_seed } from './stochastic.js';
import { isIn, groupsOf, groups, statesIn } from './groups.js';
import { graph_layout, dot_preamble, default_transition_config, default_graph_config, all_themes, themes, set_themes, flow, standard_state_style, hooked_state_style, start_state_style, end_state_style, terminal_state_style, active_state_style, resolve_state_config, style_for, transfer_state_properties, state_style_condense } from './style.js';
import { new_state, serialize, instance_name, creation_date, creation_timestamp, create_start_time, find_connected_components } from './create.js';
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
class Machine {
    // whargarbl this badly needs to be broken up, monolith master
    constructor({ start_states, start_state_weights, end_states = [], failed_outputs = [], initial_state, start_states_no_enforce, complete = [], transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, npm_name, default_size, state_declaration, property_definition, val_definition, vals, state_property, fsl_version, dot_preamble, arrange_declaration = [], arrange_start_declaration = [], arrange_end_declaration = [], oarrange_declaration = [], farrange_declaration = [], theme = ['default'], flow = 'down', graph_layout = 'dot', instance_name, history, boundary_depth_limit, data, default_state_config, default_active_state_config, default_hooked_state_config, default_terminal_state_config, default_start_state_config, default_end_state_config, default_transition_config, default_graph_config, group_registry, group_metadata, group_hooks, state_hooks, allows_override, config_allows_override, allow_islands, editor_config, rng_seed, time_source, timeout_source, clear_timeout_source }) {
        this._time_source = time_source !== null && time_source !== void 0 ? time_source : DEFAULT_TIME_SOURCE;
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
        this._state_interner = new Interner();
        this._action_interner = new Interner();
        this._state_id = NaN;
        this._edge_id_by_pair = new Map();
        this._edge_id_by_action_pair = new Map();
        this._edge_to_ids = [];
        this._start_states = new Set(start_states);
        // Skip the intermediate array `.map()` builds for the common unweighted
        // case (construct() is benchmarked) — an unweighted machine gets a
        // freshly-allocated empty Map directly, not `new Map([].map(...))`.
        this._start_state_weights = start_state_weights === undefined
            ? new Map()
            : new Map(start_state_weights.map(s => [s.name, s.share]));
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
        this._default_size = default_size;
        this._raw_state_declaration = state_declaration || [];
        this._fsl_version = fsl_version;
        this._arrange_declaration = arrange_declaration;
        this._arrange_start_declaration = arrange_start_declaration;
        this._arrange_end_declaration = arrange_end_declaration;
        this._oarrange_declaration = oarrange_declaration;
        this._farrange_declaration = farrange_declaration;
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
        this._after_any_hook = undefined;
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
        this._allow_islands = allow_islands !== null && allow_islands !== void 0 ? allow_islands : true;
        this._editor_config = editor_config;
        // tri-state: undefined is a legal, distinct value here — do not truthy-collapse
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
        this._state_property_first_state = new Map();
        this._val_keys = new Set();
        this._val_types = new Map();
        this._val_values = new Map();
        this._required_vals = new Set();
        this._state_style = state_style_condense(default_state_config, this);
        this._active_state_style = state_style_condense(default_active_state_config, this);
        this._hooked_state_style = state_style_condense(default_hooked_state_config, this);
        this._terminal_state_style = state_style_condense(default_terminal_state_config, this);
        this._start_state_style = state_style_condense(default_start_state_config, this);
        this._end_state_style = state_style_condense(default_end_state_config, this);
        // Consolidated `transition: {}` and `graph: {}` default-config blocks,
        // stored verbatim so the viz layer can project them onto Graphviz `edge [ … ]`
        // defaults and graph-scope attributes respectively.  Both are kept as the
        // compiler's de-duplicated `{ key, value }[]` lists (last-wins already
        // applied, so iterating in order yields the winning value per key).
        this._default_transition_config = default_transition_config;
        this._default_graph_config = default_graph_config;
        // Overlapping-state-group tables.  The registry/hooks are stored as-is; the
        // raw per-group `{ declarations }` blocks are condensed once into style
        // configs here (a single declaration block, so the intra-block redefine
        // guard in `state_style_condense` still applies), while depth-ordered
        // merging across groups happens later in `resolve_state_config`.
        this._group_registry = group_registry !== null && group_registry !== void 0 ? group_registry : new Map();
        this._group_hooks = group_hooks !== null && group_hooks !== void 0 ? group_hooks : new Map();
        this._state_hooks = state_hooks !== null && state_hooks !== void 0 ? state_hooks : new Map();
        this._group_metadata = new Map();
        if (group_metadata) { // group-free machines skip a throwaway Map allocation
            group_metadata.forEach((raw, group_name) => 
            // `raw.declarations` is the parser's raw style-item list — structurally
            // a JssmStateStyleKeyList, but typed as JssmStateDeclarationRule[] on
            // JssmStateConfig — so it condenses through the same path as the
            // `default_*_state_config` blocks (intra-block redefine still throws).
            this._group_metadata.set(group_name, state_style_condense(raw.declarations, this)));
        }
        this._group_order = [...this._group_registry.keys()];
        // Deep/transitive inverse index: for each declared group, flatten its
        // transitive member states (reusing the compiler's `transitive_members`)
        // and record that group against every one of them.  A `memo` shared across
        // groups memoizes overlapping sub-group resolution.
        this._state_to_groups = new Map();
        {
            const memo = new Map();
            for (const group_name of this._group_order) {
                for (const member of transitive_members(this._group_registry, group_name, memo)) {
                    let bucket = this._state_to_groups.get(member);
                    if (bucket === undefined) {
                        bucket = new Set();
                        this._state_to_groups.set(member, bucket);
                    }
                    bucket.add(group_name);
                }
            }
        }
        this._static_state_config_cache = new Map();
        this._history_length = history || 0;
        this._history = new circular_buffer(this._history_length);
        this._state_labels = new Map();
        this._rng_seed = rng_seed !== null && rng_seed !== void 0 ? rng_seed : Date.now();
        this._rng = gen_splitmix32(this._rng_seed);
        this._timeout_source = timeout_source !== null && timeout_source !== void 0 ? timeout_source : DEFAULT_TIMEOUT_SOURCE;
        this._clear_timeout_source = clear_timeout_source !== null && clear_timeout_source !== void 0 ? clear_timeout_source : DEFAULT_CLEAR_TIMEOUT_SOURCE;
        this._timeout_handle = undefined;
        this._timeout_target = undefined;
        this._timeout_target_time = undefined;
        this._after_mapping = new Map();
        this._event_handlers = new Map();
        this._event_listener_count = 0;
        this._firing_error = false;
        this._committing_transition = false;
        // Boundary-hook action cascade guard.  Limit defaults to 100 but is
        // configurable via the `boundary_depth_limit` constructor option so tests
        // can tighten the cap and deep pipelines can raise it.
        this._boundary_depth = 0;
        this._boundary_depth_limit = boundary_depth_limit !== null && boundary_depth_limit !== void 0 ? boundary_depth_limit : 100;
        // consolidate the state declarations
        if (state_declaration) {
            for (const state_decl of state_declaration) {
                if (this._state_declarations.has(state_decl.state)) { // no repeats
                    throw new JssmError(this, `Added the same state declaration twice: ${JSON.stringify(state_decl.state)}`);
                }
                this._state_declarations.set(state_decl.state, transfer_state_properties(state_decl));
            }
        }
        // walk the decls for labels; aggregate them when found
        for (const [key, decl] of this._state_declarations) {
            const labelled = decl.declarations.filter(d => d.key === 'state-label');
            if (labelled.length > 1) {
                throw new JssmError(this, `state ${key} may only have one state-label; has ${labelled.length}`);
            }
            if (labelled.length === 1) {
                this._state_labels.set(key, labelled[0].value);
            }
        }
        // Duplicate-edge guard for the construction loop below, keyed
        // from -> (to -> Set<slot>).  A "slot" distinguishes edges that share a
        // (from, to) pair: an action's name for an actioned edge, or '' for the one
        // permitted plain action-less edge.  Multiple edges between the same pair
        // are allowed when they carry distinct actions (#325; the self-loop case is
        // #531), since they dispatch unambiguously through `action(name)`.  A
        // probability-bearing action-less edge is exempt from the guard entirely,
        // so a weighted fan-out may name the same target more than once.  The
        // nested Map+Set keeps the check O(1) per edge rather than an O(out-degree)
        // scan (which made construction O(V*E) on dense graphs).  #673
        const seen_edges = new Map();
        // complete.includes was an O(|complete|) array scan per newly-created
        // state — O(V·C) overall; one Set turns it into O(V)
        const complete_set = new Set(complete);
        // walk the transitions.  single-lookup cursor fetches: each endpoint was
        // previously a get followed by a has on the same key (four hashes per
        // edge); the undefined check on the get's result carries the same
        // information.  #706
        for (const tr of transitions) {
            if (tr.from === undefined) {
                throw new JssmError(this, `transition must define 'from': ${JSON.stringify(tr)}`);
            }
            if (tr.to === undefined) {
                throw new JssmError(this, `transition must define 'to': ${JSON.stringify(tr)}`);
            }
            // get the cursors.  what a mess
            let cursor_from = this._states.get(tr.from);
            if (cursor_from === undefined) {
                cursor_from = { name: tr.from, from: [], to: [], complete: complete_set.has(tr.from) };
                new_state(this, cursor_from);
            }
            let cursor_to = this._states.get(tr.to);
            if (cursor_to === undefined) {
                cursor_to = { name: tr.to, from: [], to: [], complete: complete_set.has(tr.to) };
                new_state(this, cursor_to);
            }
            // record (from -> to) adjacency once per distinct target, even when
            // several edges connect the pair, so the `to`/`from` arrays stay sets of
            // state names.  #673
            let to_slots = seen_edges.get(tr.from);
            if (to_slots === undefined) {
                to_slots = new Map();
                seen_edges.set(tr.from, to_slots);
            }
            let slots = to_slots.get(tr.to);
            if (slots === undefined) {
                slots = new Set();
                to_slots.set(tr.to, slots);
                cursor_from.to.push(tr.to);
                cursor_to.from.push(tr.from);
            }
            // duplicate-edge guard.  A probability- or share-bearing action-less
            // edge is exempt (a weighted fan-out may repeat a target — including a
            // list-target fan-out whose members carry only `share`, 6.0 list
            // weights, with no declared `probability`); every other edge claims a
            // slot — its action name, or '' for the one plain action-less edge —
            // and a repeated slot throws.  Distinct actions between the same pair
            // coexist (#325/#531).
            const edge_exempt = (!tr.action) && ((tr.probability !== undefined) || (tr.share !== undefined));
            if (!edge_exempt) {
                const slot = tr.action || '';
                if (slots.has(slot)) {
                    throw new JssmError(this, `already has ${JSON.stringify(tr.from)} to ${JSON.stringify(tr.to)}`
                        + (tr.action ? ` on action ${JSON.stringify(tr.action)}` : ''));
                }
                slots.add(slot);
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
                this._named_transitions.set(tr.name, thisEdgeId);
            }
            // set up the after mapping, if any
            if (tr.after_time) {
                this._after_mapping.set(tr.from, [tr.to, tr.after_time]);
            }
            // set up the mapping, so that edges can be looked up by endpoint pairs
            let from_mapping = this._edge_map.get(tr.from);
            if (from_mapping === undefined) {
                from_mapping = new Map();
                this._edge_map.set(tr.from, from_mapping);
            }
            // first-declared wins: when several edges share a (from, to) pair (parallel
            // action edges, #325), lookup_transition_for resolves to the first one
            // declared, so it agrees with edges_between(...)[0].
            if (!from_mapping.has(tr.to)) {
                from_mapping.set(tr.to, thisEdgeId);
            }
            // numeric mirror of the (from, to) endpoint mapping.  intern() rather
            // than id_of(): idempotent, and returns number (not number|undefined)
            // since both endpoints were just created above if missing.
            const from_id = this._state_interner.intern(tr.from);
            const to_id = this._state_interner.intern(tr.to);
            // first-declared wins (see _edge_map above): the transition fast-path that
            // reads this index resolves parallel (from, to) pairs to the first edge.
            const pair = pair_key(from_id, to_id);
            if (!this._edge_id_by_pair.has(pair)) {
                this._edge_id_by_pair.set(pair, thisEdgeId);
            }
            this._edge_to_ids[thisEdgeId] = to_id;
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
                actionMap.set(tr.from, thisEdgeId);
                // reverse mapping first by state origin name
                let rActionMap = this._reverse_actions.get(tr.from);
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
            for (const pr of property_definition) {
                this._property_keys.add(pr.name);
                if (Object.prototype.hasOwnProperty.call(pr, 'default_value')) {
                    this._default_properties.set(pr.name, pr.default_value);
                }
                if (Object.prototype.hasOwnProperty.call(pr, 'required') && (pr.required === true)) {
                    this._required_properties.add(pr.name);
                }
            }
        }
        if (Array.isArray(val_definition)) {
            for (const vd of val_definition) {
                this._val_keys.add(vd.name);
                this._val_types.set(vd.name, vd.val_type);
                if (Object.prototype.hasOwnProperty.call(vd, 'required') && (vd.required === true)) {
                    if (Object.prototype.hasOwnProperty.call(vd, 'default_value')) {
                        throw new JssmError(this, `The val "${vd.name}" is required, but also has a default; these conflict`);
                    }
                    this._required_vals.add(vd.name);
                }
            }
            const supplied = (vals && (typeof vals === 'object')) ? vals : {};
            for (const name of Object.keys(supplied)) {
                if (!this._val_keys.has(name)) {
                    throw new JssmError(this, `Cannot supply value for undeclared val "${name}"`);
                }
            }
            this._val_keys.forEach(name => {
                const vtype = this._val_types.get(name);
                let value;
                if (Object.prototype.hasOwnProperty.call(supplied, name)) {
                    value = supplied[name];
                }
                else {
                    const vd = val_definition.find(d => d.name === name);
                    if (vd && Object.prototype.hasOwnProperty.call(vd, 'default_value')) {
                        value = vd.default_value;
                    }
                    else if (this._required_vals.has(name)) {
                        throw new JssmError(this, `The val "${name}" is required, but no value was supplied`);
                    }
                    else {
                        // vals are non-null by default (megaspec §4.4): a val that is
                        // neither supplied, defaulted, nor required has no value of its
                        // declared type, so it is a construction error rather than undefined.
                        throw new JssmError(this, `The val "${name}" has no value: give it a default, declare it required, or supply it at construction (vals are non-null by default)`);
                    }
                }
                validate_val_value(name, vtype, value, this);
                this._val_values.set(name, value);
            });
        }
        if (Array.isArray(state_property)) {
            for (const sp of state_property) {
                this._state_properties.set(sp.name, sp.default_value);
                // Record the unserialized (property, state) pair for post-build
                // validation.  The compiler writes both fields; a hand-built config
                // that carries only the serialized name pays one JSON.parse here,
                // which is what every binding used to pay at validation time (#734).
                let j_property = sp.property, j_state = sp.state;
                if ((j_property === undefined) || (j_state === undefined)) {
                    const inside = JSON.parse(sp.name);
                    j_property = inside[0];
                    j_state = inside[1];
                }
                if (!(this._state_property_first_state.has(j_property))) {
                    this._state_property_first_state.set(j_property, j_state);
                }
            }
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
        this._state_id = this._state_interner.intern(this._state);
        // done building, do checks
        // assert all props are valid
        // provenance pairs were recorded at insertion — first state per property,
        // in first-binding order — replacing the old JSON.parse of every
        // serialized key; the error fires for the same binding it always did,
        // because the first property in first-binding order whose name is
        // undeclared owns the earliest undeclared binding.
        this._state_property_first_state.forEach((j_state, j_property) => {
            if (!(this.known_prop(j_property))) {
                throw new JssmError(this, `State "${j_state}" has property "${j_property}" which is not globally declared`);
            }
        });
        // assert all required properties are serviced
        // states() allocates a fresh array per call, so take it once rather than
        // once per required property
        const all_states_for_props = this.states();
        this._required_properties.forEach(dp_key => {
            if (this._default_properties.has(dp_key)) {
                throw new JssmError(this, `The property "${dp_key}" is required, but also has a default; these conflict`);
            }
            for (const s of all_states_for_props) {
                const bound_name = name_bind_prop_and_state(dp_key, s);
                if (!(this._state_properties.has(bound_name))) {
                    throw new JssmError(this, `State "${s}" is missing required property "${dp_key}"`);
                }
            }
        });
        // assert chosen starting state is valid
        if (!(this.has_state(this.state()))) {
            throw new JssmError(this, `Current start state "${this.state()}" does not exist`);
        }
        // assert all starting states are valid
        for (const [ssi, ss] of start_states.entries()) {
            if (!(this.has_state(ss))) {
                throw new JssmError(this, `Start state ${ssi} "${ss}" does not exist`);
            }
        }
        // assert chosen starting state is valid
        if (start_states.length !== this._start_states.size) {
            throw new JssmError(this, `Start states cannot be repeated`);
        }
        // assert connectivity constraints imposed by allow_islands
        if (this._allow_islands !== true) {
            const components = find_connected_components(this._states, this._edges);
            if (this._allow_islands === false) {
                if (components.length > 1) {
                    throw new JssmError(this, `allow_islands is false but the state graph has ${components.length} disconnected components`);
                }
            }
            else {
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
        for (const declaration of [this._arrange_declaration, this._oarrange_declaration, this._farrange_declaration]) {
            for (const arrange_pair of declaration) {
                for (const possibleState of arrange_pair) {
                    if (!(this._states.has(possibleState))) {
                        throw new JssmError(this, `Cannot arrange state that does not exist "${possibleState}"`);
                    }
                }
            }
        }
    }
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
    _new_state(state_config) {
        return new_state(this, state_config);
    }
    /**
     *  Get the current state of a machine.  Delegates to the query family's
     *  {@link state}, which carries the full contract and example.
     *  @see state
     */
    state() {
        return state(this);
    }
    /**
     *  Get the label for a given state, if any.  Delegates to the query
     *  family's {@link label_for}, which carries the full contract and example.
     *  @see label_for
     */
    label_for(state) {
        return label_for(this, state);
    }
    /**
     *  Get whatever the node should show as text.  Delegates to the query
     *  family's {@link display_text}, which carries the full contract and
     *  example.
     *  @see display_text
     */
    display_text(state) {
        return display_text(this, state);
    }
    /**
     *  Get the current data of a machine, as a deep clone.  Delegates to the
     *  data family's {@link data}, which carries the full contract and example.
     *  @see data
     */
    data() {
        return data(this);
    }
    /**
     *  Replace the machine's data in place, without a transition.  Delegates
     *  to the data family's {@link set_data}, which carries the full contract
     *  and example.
     *  @returns The machine, for chaining.
     *  @see set_data
     */
    set_data(newData) {
        return set_data(this, newData);
    }
    /**
     *  The machine's current data by REFERENCE — no clone.  Delegates to the
     *  data family's {@link data_ref}, which carries the full contract; kept
     *  on the class because the same-package panels (`fsl_bind_wc`) and tests
     *  reach it by this name.
     *  @returns The live data value; treat as read-only.
     *  @see data_ref
     *  @internal
     */
    _data_ref() {
        return data_ref(this);
    }
    /**
     *  Get the current value of a given property name, or `undefined`.
     *  Delegates to the data family's {@link prop}, which carries the full
     *  contract and example.
     *  @see prop
     */
    prop(name) {
        return prop(this, name);
    }
    /**
     *  Get the current value of a given property name, throwing when it is
     *  missing.  Delegates to the data family's {@link strict_prop}, which
     *  carries the full contract and example.
     *  @throws {JssmError} If the property is not defined on the current state
     *  and has no default.
     *  @see strict_prop
     */
    strict_prop(name) {
        return strict_prop(this, name);
    }
    /**
     *  Get the current value of every prop, as an object.  Delegates to the
     *  data family's {@link props}, which carries the full contract and
     *  example.
     *  @see props
     */
    props() {
        return props(this);
    }
    /**
     *  Check whether a given string is a known property's name.  Delegates to
     *  the data family's {@link known_prop}.
     *  @see known_prop
     */
    known_prop(prop_name) {
        return known_prop(this, prop_name);
    }
    /**
     *  List all known property names.  Delegates to the data family's
     *  {@link known_props}.
     *  @see known_props
     */
    known_props() {
        return known_props(this);
    }
    /**
     *  Read the current value of a declared machine `val`.  Delegates to the
     *  data family's {@link val}, which carries the full contract and example.
     *  @throws {JssmError} If `name` is not a declared val.
     *  @see val
     */
    val(name) {
        return val(this, name);
    }
    /**
     *  Set the value of a declared machine `val`, validating it against the
     *  val's declared type.  Delegates to the data family's {@link set_val},
     *  which carries the full contract and example.
     *  @throws {JssmError} If `name` is not a declared val, or `value` violates the type.
     *  @see set_val
     */
    set_val(name, value) {
        set_val(this, name, value);
    }
    /**
     *  Return a plain object mapping every declared val name to its current
     *  value.  Delegates to the data family's {@link vals}.
     *  @see vals
     */
    vals() {
        return vals(this);
    }
    /**
     *  Check whether a string is the name of a declared `val`.  Delegates to
     *  the data family's {@link known_val}.
     *  @see known_val
     */
    known_val(name) {
        return known_val(this, name);
    }
    /**
     *  List every declared `val` name, in declaration order.  Delegates to the
     *  data family's {@link known_vals}.
     *  @see known_vals
     */
    known_vals() {
        return known_vals(this);
    }
    /**
     *  Return the declared type descriptor of a `val`.  Delegates to the data
     *  family's {@link val_type}.
     *  @throws {JssmError} If `name` is not a declared val.
     *  @see val_type
     */
    val_type(name) {
        return val_type(this, name);
    }
    /**
     *  Check whether a given state is a valid start state.  Delegates to the
     *  query family's {@link is_start_state}, which carries the full contract
     *  and example.
     *  @see is_start_state
     */
    is_start_state(whichState) {
        return is_start_state(this, whichState);
    }
    /**
     *  The initial distribution declared by a weighted `start_states` list
     *  (6.0).  Delegates to the stochastic family's
     *  {@link start_state_weights}, which carries the full contract and
     *  example.
     *  @see start_state_weights
     */
    start_state_weights() {
        return start_state_weights(this);
    }
    /**
     *  Draws a start state from the weighted start distribution using the
     *  machine's RNG.  Delegates to the stochastic family's
     *  {@link sample_start_state}, which carries the full contract and
     *  example.
     *  @see sample_start_state
     */
    sample_start_state() {
        return sample_start_state(this);
    }
    /**
     *  Check whether a given state is a declared end state.  Delegates to the
     *  query family's {@link is_end_state}, which carries the full contract
     *  and example.
     *  @see is_end_state
     */
    is_end_state(whichState) {
        return is_end_state(this, whichState);
    }
    /**
     *  Get the set of states declared as failure outputs for this machine.
     *  Delegates to the query family's {@link failed_outputs}.
     *  @see failed_outputs
     */
    failed_outputs() {
        return failed_outputs(this);
    }
    /**
     *  Check whether a given state is declared as a failure output.  Delegates
     *  to the query family's {@link is_failed_output}.
     *  @see is_failed_output
     */
    is_failed_output(whichState) {
        return is_failed_output(this, whichState);
    }
    /**
     *  Check whether the machine is currently in a failure state.  Delegates
     *  to the query family's {@link is_failed}.
     *  @see is_failed
     */
    is_failed() {
        return is_failed(this);
    }
    /**
     *  Check whether a given state is final (either has no exits or is marked
     *  `complete`.)  Delegates to the query family's {@link state_is_final},
     *  which carries the full contract and example.
     *  @see state_is_final
     */
    state_is_final(whichState) {
        return state_is_final(this, whichState);
    }
    /**
     *  Check whether the current state is final.  Delegates to the query
     *  family's {@link is_final}, which carries the full contract and example.
     *  @see is_final
     */
    is_final() {
        return is_final(this);
    }
    /**
     *  Serialize the current machine to a structure.  Delegates to the create
     *  family's {@link serialize}, which carries the full contract.
     *  @see serialize
     */
    serialize(comment) {
        return serialize(this, comment);
    }
    /**
     *  The RFC 8785 canonical-config identity of the current configuration.
     *  Delegates to the query family's {@link canonical}, which carries the
     *  full contract and example.
     *  @returns The canonical config string.
     *  @see canonical
     */
    canonical() {
        return canonical(this);
    }
    /**
     * Get the graph layout direction.  Delegates to the style family's
     *  {@link graph_layout}.
     *  @see graph_layout
     */
    graph_layout() {
        return graph_layout(this);
    }
    /**
     * Get the Graphviz DOT preamble string.  Delegates to the style family's
     *  {@link dot_preamble}.
     *  @see dot_preamble
     */
    dot_preamble() {
        return dot_preamble(this);
    }
    /**
     * Get the consolidated `transition: {}` default-config block.  Delegates
     *  to the style family's {@link default_transition_config}, which carries
     *  the full contract and example.
     *  @see default_transition_config
     */
    default_transition_config() {
        return default_transition_config(this);
    }
    /**
     * Get the consolidated `graph: {}` default-config block.  Delegates to
     *  the style family's {@link default_graph_config}, which carries the full
     *  contract and example.
     *  @see default_graph_config
     */
    default_graph_config() {
        return default_graph_config(this);
    }
    /**
     * Get the machine's author list.  Delegates to the query family's
     *  {@link machine_author}.
     *  @see machine_author
     */
    machine_author() {
        return machine_author(this);
    }
    /**
     * Get the machine's comment string.  Delegates to the query family's
     *  {@link machine_comment}.
     *  @see machine_comment
     */
    machine_comment() {
        return machine_comment(this);
    }
    /**
     * Get the machine's contributor list.  Delegates to the query family's
     *  {@link machine_contributor}.
     *  @see machine_contributor
     */
    machine_contributor() {
        return machine_contributor(this);
    }
    /**
     * Get the machine's definition string.  Delegates to the query family's
     *  {@link machine_definition}.
     *  @see machine_definition
     */
    machine_definition() {
        return machine_definition(this);
    }
    /**
     * Get the machine's natural language as an ISO 639-1 code.  Delegates to
     *  the query family's {@link machine_language}, which carries the full
     *  contract.
     *  @see machine_language
     */
    machine_language() {
        return machine_language(this);
    }
    /**
     * Get the machine's license string.  Delegates to the query family's
     *  {@link machine_license}.
     *  @see machine_license
     */
    machine_license() {
        return machine_license(this);
    }
    /**
     * Get the machine's name.  Delegates to the query family's
     *  {@link machine_name}.
     *  @see machine_name
     */
    machine_name() {
        return machine_name(this);
    }
    /**
     * The editor/panel defaults declared in the FSL `editor: {}` block, or
     *  `undefined`.  Delegates to the query family's {@link editor_config},
     *  which carries the full contract and example.
     *  @see editor_config
     */
    editor_config() {
        return editor_config(this);
    }
    /**
     * Get the npm package name associated with the machine, or `undefined`.
     *  Delegates to the query family's {@link npm_name}.
     *  @see npm_name
     */
    npm_name() {
        return npm_name(this);
    }
    /**
     * Get the render-size hint for the machine's visualization, or
     *  `undefined`.  Delegates to the query family's {@link default_size},
     *  which carries the full contract.
     *  @see default_size
     */
    default_size() {
        return default_size(this);
    }
    /**
     * Get the machine's declared version, parsed, or `undefined`.  Delegates
     *  to the query family's {@link machine_version}, which carries the full
     *  contract and example.
     *  @see machine_version
     */
    machine_version() {
        return machine_version(this);
    }
    /**
     * Get the raw state declaration objects as parsed from the FSL source.
     *  Delegates to the query family's {@link raw_state_declarations}.
     *  @see raw_state_declarations
     */
    raw_state_declarations() {
        return raw_state_declarations(this);
    }
    /**
     * Get the processed state declaration for a specific state.  Delegates to
     *  the query family's {@link state_declaration}.
     *  @see state_declaration
     */
    state_declaration(which) {
        return state_declaration(this, which);
    }
    /**
     * Get all processed state declarations as a Map.  Delegates to the query
     *  family's {@link state_declarations}.
     *  @see state_declarations
     */
    state_declarations() {
        return state_declarations(this);
    }
    /**
     * Get the FSL language version this machine declares, parsed, or
     *  `undefined`.  Delegates to the query family's {@link fsl_version},
     *  which carries the full contract and example.
     *  @see fsl_version
     */
    fsl_version() {
        return fsl_version(this);
    }
    /**
     * Get the complete internal state of the machine as a serializable
     *  structure.  Delegates to the query family's {@link machine_state}.
     *  @see machine_state
     */
    machine_state() {
        return machine_state(this);
    }
    /**
     *  List all the states known by the machine.  Delegates to the query
     *  family's {@link states}, which carries the full contract and example.
     *  @see states
     */
    states() {
        return states(this);
    }
    /**
     * Get the internal state descriptor for a given state name.  Delegates to
     *  the query family's {@link state_for}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_for
     */
    state_for(whichState) {
        return state_for(this, whichState);
    }
    /**
     *  Check whether the machine knows a given state.  Delegates to the query
     *  family's {@link has_state}, which carries the full contract and example.
     *  @see has_state
     */
    has_state(whichState) {
        return has_state(this, whichState);
    }
    /**
     *  Lists all edges of a machine.  Delegates to the query family's
     *  {@link list_edges}, which carries the full contract and example.
     *  @see list_edges
     */
    list_edges() {
        return list_edges(this);
    }
    /**
     * Get the map of named transitions.  Delegates to the query family's
     *  {@link list_named_transitions}.
     *  @see list_named_transitions
     */
    list_named_transitions() {
        return list_named_transitions(this);
    }
    /**
     * List all distinct action names defined anywhere in the machine.
     *  Delegates to the query family's {@link list_actions}.
     *  @see list_actions
     */
    list_actions() {
        return list_actions(this);
    }
    /**
     * Whether any actions are defined on this machine.  Delegates to the
     *  query family's {@link uses_actions}.
     *  @see uses_actions
     */
    get uses_actions() {
        return uses_actions(this);
    }
    /**
     * Whether any forced (`~>`) transitions exist in this machine.  Delegates
     *  to the query family's {@link uses_forced_transitions}.
     *  @see uses_forced_transitions
     */
    get uses_forced_transitions() {
        return uses_forced_transitions(this);
    }
    /**
     *  Check if the code that built the machine allows overriding state and
     *  data.  Delegates to the query family's {@link code_allows_override}.
     *  @see code_allows_override
     */
    get code_allows_override() {
        return code_allows_override(this);
    }
    /**
     *  Check if the machine config allows overriding state and data.
     *  Delegates to the query family's {@link config_allows_override}.
     *  @see config_allows_override
     */
    get config_allows_override() {
        return config_allows_override(this);
    }
    /**
     *  Check if a machine allows overriding state and data, resolving code
     *  and config.  Delegates to the query family's {@link allows_override},
     *  which carries the full contract.
     *  @see allows_override
     */
    get allows_override() {
        return allows_override(this);
    }
    /**
     *  Return the effective island policy for this machine.  Delegates to the
     *  query family's {@link allow_islands}, which carries the full contract.
     *  @see allow_islands
     */
    get allow_islands() {
        return allow_islands(this);
    }
    /**
     * List all available theme names.  Delegates to the style family's
     *  {@link all_themes}.
     *  @see all_themes
     */
    all_themes() {
        return all_themes(this);
    }
    /**
     * List the ASCII character ranges accepted in any but the first position
     *  of a state name.  Delegates to the query family's
     *  {@link all_state_name_chars}, which carries the full contract and
     *  example.
     *  @see all_state_name_chars
     */
    all_state_name_chars() {
        return all_state_name_chars(this);
    }
    /**
     * List the ASCII character ranges accepted in the first position of a
     *  state name.  Delegates to the query family's
     *  {@link all_state_name_first_chars}, which carries the full contract
     *  and example.
     *  @see all_state_name_first_chars
     */
    all_state_name_first_chars() {
        return all_state_name_first_chars(this);
    }
    /**
     * List the character ranges accepted inside a single-quoted FSL action
     *  label.  Delegates to the query family's {@link all_action_label_chars},
     *  which carries the full contract and example.
     *  @see all_action_label_chars
     */
    all_action_label_chars() {
        return all_action_label_chars(this);
    }
    /**
     * Get the active theme(s) for this machine.  Delegates to the style
     *  family's {@link themes}.
     *  @see themes
     */
    get themes() {
        return themes(this);
    }
    /**
     * Set the active theme(s).  Delegates to the style family's
     *  {@link set_themes}, which carries the full contract and example
     *  (including the config-cache invalidation).
     *  @see set_themes
     */
    set themes(to) {
        set_themes(this, to);
    }
    /**
     * Get the flow direction for graph layout.  Delegates to the style
     *  family's {@link flow}.
     *  @see flow
     */
    flow() {
        return flow(this);
    }
    /**
     * Look up a transition's edge index by source and target state names.
     *  Delegates to the query family's {@link get_transition_by_state_names}.
     *  @see get_transition_by_state_names
     */
    get_transition_by_state_names(from, to) {
        return get_transition_by_state_names(this, from, to);
    }
    /**
     * Look up the full transition object for a given source→target pair.
     *  Delegates to the query family's {@link lookup_transition_for}.
     *  @see lookup_transition_for
     */
    lookup_transition_for(from, to) {
        return lookup_transition_for(this, from, to);
    }
    /**
     *  List all transitions attached to a state, sorted by entrance and exit.
     *  Delegates to the query family's {@link list_transitions}, which carries
     *  the full contract and example.
     *  @see list_transitions
     */
    list_transitions(whichState = this.state()) {
        return list_transitions(this, whichState);
    }
    /**
     *  List all entrances attached to a state.  Delegates to the query
     *  family's {@link list_entrances}, which carries the full contract and
     *  example.
     *  @see list_entrances
     */
    list_entrances(whichState = this.state()) {
        return list_entrances(this, whichState);
    }
    /**
     *  List all exits attached to a state.  Delegates to the query family's
     *  {@link list_exits}, which carries the full contract and example.
     *  @see list_exits
     */
    list_exits(whichState = this.state()) {
        return list_exits(this, whichState);
    }
    /**
     * Get the transitions available from a state for use by the probabilistic
     *  walk system.  Delegates to the stochastic family's
     *  {@link probable_exits_for}, which carries the full contract.
     *  @throws {JssmError} If the state does not exist.
     *  @see probable_exits_for
     */
    probable_exits_for(whichState) {
        return probable_exits_for(this, whichState);
    }
    /**
     * Take a single random transition from the current state, weighted by
     *  edge probabilities.  Delegates to the stochastic family's
     *  {@link probabilistic_transition}, which carries the full contract.
     *  @see probabilistic_transition
     */
    probabilistic_transition() {
        return probabilistic_transition(this);
    }
    /**
     * Take `n` consecutive probabilistic transitions and return the states
     *  visited.  Delegates to the stochastic family's
     *  {@link probabilistic_walk}, which carries the full contract.
     *  @see probabilistic_walk
     */
    probabilistic_walk(n) {
        return probabilistic_walk(this, n);
    }
    /**
     * Take `n` probabilistic steps and return a histograph of the visits.
     *  Delegates to the stochastic family's {@link probabilistic_histo_walk},
     *  which carries the full contract.
     *  @see probabilistic_histo_walk
     */
    probabilistic_histo_walk(n) {
        return probabilistic_histo_walk(this, n);
    }
    /**
     * Lazily yield one {@link JssmStochasticRun} at a time.  Delegates to the
     *  stochastic family's {@link stochastic_runs} generator, which carries
     *  the full contract and example; `yield*` forwards every yielded run and
     *  the generator's completion unchanged.
     *  @see stochastic_runs
     */
    *stochastic_runs(opts = {}) {
        yield* stochastic_runs(this, opts);
    }
    /**
     * Run many weighted-random walks and return aggregate statistics.
     *  Delegates to the stochastic family's {@link stochastic_summary}, which
     *  carries the full contract and example.
     *  @see stochastic_summary
     */
    stochastic_summary(opts = {}) {
        return stochastic_summary(this, opts);
    }
    /**
     *  List all actions available from a state.  Delegates to the query
     *  family's {@link actions}, which carries the full contract and example.
     *  @throws {JssmError} If the state does not exist.
     *  @see actions
     */
    actions(whichState = this.state()) {
        return actions(this, whichState);
    }
    /**
     *  List all states that have a specific action attached.  Delegates to
     *  the query family's {@link list_states_having_action}, which carries the
     *  full contract and example.
     *  @throws {JssmError} If no state has the action.
     *  @see list_states_having_action
     */
    list_states_having_action(whichState) {
        return list_states_having_action(this, whichState);
    }
    /**
     * List all action names available as exits from a given state.  Delegates
     *  to the query family's {@link list_exit_actions}, which carries the full
     *  contract and example.
     *  @throws {JssmError} If the state does not exist.
     *  @see list_exit_actions
     */
    list_exit_actions(whichState = this.state()) {
        return list_exit_actions(this, whichState);
    }
    /**
     * List all action exits from a state with their probabilities and shares.
     *  Delegates to the query family's {@link probable_action_exits}, which
     *  carries the full contract.
     *  @throws {JssmError} If the state does not exist.
     *  @see probable_action_exits
     */
    probable_action_exits(whichState = this.state()) {
        return probable_action_exits(this, whichState);
    }
    /**
     * Check whether a state has no incoming transitions.  Delegates to the
     *  query family's {@link is_unenterable}.
     *  @throws {JssmError} If the state does not exist.
     *  @see is_unenterable
     */
    is_unenterable(whichState) {
        return is_unenterable(this, whichState);
    }
    /**
     * Check whether any state in the machine is unenterable.  Delegates to
     *  the query family's {@link has_unenterables}.
     *  @see has_unenterables
     */
    has_unenterables() {
        return has_unenterables(this);
    }
    /**
     * Check whether the current state is terminal (has no exits).  Delegates
     *  to the query family's {@link is_terminal}.
     *  @see is_terminal
     */
    is_terminal() {
        return is_terminal(this);
    }
    /**
     * Check whether a specific state is terminal (has no exits).  Delegates
     *  to the query family's {@link state_is_terminal}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_is_terminal
     */
    state_is_terminal(whichState) {
        return state_is_terminal(this, whichState);
    }
    /**
     * Check whether any state in the machine is terminal.  Delegates to the
     *  query family's {@link has_terminals}.
     *  @see has_terminals
     */
    has_terminals() {
        return has_terminals(this);
    }
    /**
     *  Reports whether the machine's CURRENT state is a transitive member of a
     *  named group.  Delegates to the groups family's {@link isIn}, which
     *  carries the full contract and example.
     *  @see isIn
     */
    isIn(groupName) {
        return isIn(this, groupName);
    }
    /**
     *  Lists every group that transitively contains a given state.  Delegates
     *  to the groups family's {@link groupsOf}, which carries the full
     *  contract and example.
     *  @see groupsOf
     */
    groupsOf(state) {
        return groupsOf(this, state);
    }
    /**
     *  Lists all declared group names, in source declaration order.  Delegates
     *  to the groups family's {@link groups}, which carries the full contract
     *  and example.
     *  @see groups
     */
    groups() {
        return groups(this);
    }
    /**
     *  Lists every state that is a transitive member of a named group.
     *  Delegates to the groups family's {@link statesIn}, which carries the
     *  full contract and example.
     *  @throws {JssmError} If `groupName` is not a declared group.
     *  @see statesIn
     */
    statesIn(groupName) {
        return statesIn(this, groupName);
    }
    /**
     * Check whether the current state is complete.  Delegates to the query
     *  family's {@link is_complete}.
     *  @see is_complete
     */
    is_complete() {
        return is_complete(this);
    }
    /**
     * Check whether a specific state is complete.  Delegates to the query
     *  family's {@link state_is_complete}.
     *  @throws {JssmError} If the state does not exist.
     *  @see state_is_complete
     */
    state_is_complete(whichState) {
        return state_is_complete(this, whichState);
    }
    /**
     * Check whether any state in the machine is complete.  Delegates to the
     *  query family's {@link has_completes}.
     *  @see has_completes
     */
    has_completes() {
        return has_completes(this);
    }
    on(name, filterOrFn, maybeFn) {
        // the family exports only the two documented shapes; split here so the
        // union-typed implementation parameter never widens the public signature
        return (typeof filterOrFn === 'function')
            ? on(this, name, filterOrFn)
            : on(this, name, filterOrFn, maybeFn);
    }
    once(name, filterOrFn, maybeFn) {
        return (typeof filterOrFn === 'function')
            ? once(this, name, filterOrFn)
            : once(this, name, filterOrFn, maybeFn);
    }
    /**
     *  Remove a previously-registered event handler.  Delegates to the events
     *  family's {@link off}.
     *  @see off
     */
    off(name, handler) {
        return off(this, name, handler);
    }
    /**
     *  Invoke a single event-handler entry.  Delegates to the events family's
     *  {@link fire_one}.
     *  @internal
     */
    // PERF: this and the sibling dispatch methods (_fire, _fire_boundary_actions,
    // _fire_hook_rejection, _has_subscribers) are intentionally underscore-
    // convention, NOT `#`-private.  They are called on the per-transition hot
    // path (_fire_boundary_actions runs on every transition), and a `#`-private
    // method cannot be inlined the way its `_` twin can (brand check), so
    // privatizing them in 5.162.8 cost ~20-25% on transition/action dispatch.
    // Do not re-privatize.  StoneCypher/fsl#1959
    _fire_one(entry, set, name, detail) {
        fire_one(this, entry, set, name, detail);
    }
    /**
     *  Whether at least one live subscriber is registered for `name`.
     *  Delegates to the events family's {@link has_subscribers}.
     *  @internal
     */
    _has_subscribers(name) {
        return has_subscribers(this, name);
    }
    /**
     *  Dispatch an event to every registered subscriber.  Delegates to the
     *  events family's {@link fire}.
     *  @internal
     */
    _fire(name, detail) {
        fire(this, name, detail);
    }
    /**
     *  Low-level hook registration.  Delegates to the hooks family's
     *  {@link set_hook}, which carries the full contract, the descriptor
     *  validation, and the examples.
     *  @throws JssmError if the descriptor is mis-shaped.
     *  @see set_hook
     */
    set_hook(HookDesc) {
        set_hook(this, HookDesc);
    }
    /**
     *  Remove a previously-registered hook.  Delegates to the hooks family's
     *  {@link remove_hook}.
     *  @returns `true` if a hook was removed, `false` otherwise.
     *  @see remove_hook
     */
    remove_hook(HookDesc) {
        return remove_hook(this, HookDesc);
    }
    /**
     *  Register a pre-transition hook on a specific edge.  Delegates to the
     *  hooks family's {@link hook}.
     *  @returns `this` for chaining.
     *  @see hook
     */
    hook(from, to, handler) {
        return hook(this, from, to, handler);
    }
    /**
     *  Register a pre-transition hook on a specific action-labeled edge.
     *  Delegates to the hooks family's {@link hook_action}.
     *  @returns `this` for chaining.
     *  @see hook_action
     */
    hook_action(from, to, action, handler) {
        return hook_action(this, from, to, action, handler);
    }
    /**
     *  Register a pre-transition hook on any edge triggered by a specific
     *  action.  Delegates to the hooks family's {@link hook_global_action}.
     *  @returns `this` for chaining.
     *  @see hook_global_action
     */
    hook_global_action(action, handler) {
        return hook_global_action(this, action, handler);
    }
    /**
     *  Register a pre-transition hook on any action-driven transition.
     *  Delegates to the hooks family's {@link hook_any_action}.
     *  @returns `this` for chaining.
     *  @see hook_any_action
     */
    hook_any_action(handler) {
        return hook_any_action(this, handler);
    }
    /**
     *  Register a pre-transition hook on any standard (`->`) transition.
     *  Delegates to the hooks family's {@link hook_standard_transition}.
     *  @returns `this` for chaining.
     *  @see hook_standard_transition
     */
    hook_standard_transition(handler) {
        return hook_standard_transition(this, handler);
    }
    /**
     *  Register a pre-transition hook on any main-path (`=>`) transition.
     *  Delegates to the hooks family's {@link hook_main_transition}.
     *  @returns `this` for chaining.
     *  @see hook_main_transition
     */
    hook_main_transition(handler) {
        return hook_main_transition(this, handler);
    }
    /**
     *  Register a pre-transition hook on any forced (`~>`) transition.
     *  Delegates to the hooks family's {@link hook_forced_transition}.
     *  @returns `this` for chaining.
     *  @see hook_forced_transition
     */
    hook_forced_transition(handler) {
        return hook_forced_transition(this, handler);
    }
    /**
     *  Register a pre-transition hook on any transition regardless of kind.
     *  Delegates to the hooks family's {@link hook_any_transition}.
     *  @returns `this` for chaining.
     *  @see hook_any_transition
     */
    hook_any_transition(handler) {
        return hook_any_transition(this, handler);
    }
    /**
     *  Register a hook that fires when entering a specific state.  Delegates
     *  to the hooks family's {@link hook_entry}.
     *  @returns `this` for chaining.
     *  @see hook_entry
     */
    hook_entry(to, handler) {
        return hook_entry(this, to, handler);
    }
    /**
     *  Register a hook that fires when leaving a specific state.  Delegates to
     *  the hooks family's {@link hook_exit}.
     *  @returns `this` for chaining.
     *  @see hook_exit
     */
    hook_exit(from, handler) {
        return hook_exit(this, from, handler);
    }
    /**
     *  Register a hook that fires when a state's `after` timer elapses.
     *  Delegates to the hooks family's {@link hook_after}, which carries the
     *  full contract and example.
     *  @returns `this` for chaining.
     *  @see hook_after
     */
    hook_after(from, handler) {
        return hook_after(this, from, handler);
    }
    /**
     *  Register a hook that fires when ANY state's `after` timer elapses.
     *  Delegates to the hooks family's {@link hook_after_any}, which carries
     *  the full contract and example.
     *  @returns `this` for chaining.
     *  @see hook_after_any
     */
    hook_after_any(handler) {
        return hook_after_any(this, handler);
    }
    /**
     *  Post-transition hook on a specific edge.  Delegates to the hooks
     *  family's {@link post_hook}.
     *  @returns `this` for chaining.
     *  @see post_hook
     */
    post_hook(from, to, handler) {
        return post_hook(this, from, to, handler);
    }
    /**
     *  Post-transition hook on a specific action-labeled edge.  Delegates to
     *  the hooks family's {@link post_hook_action}.
     *  @returns `this` for chaining.
     *  @see post_hook_action
     */
    post_hook_action(from, to, action, handler) {
        return post_hook_action(this, from, to, action, handler);
    }
    /**
     *  Post-transition hook on any edge triggered by a specific action.
     *  Delegates to the hooks family's {@link post_hook_global_action}.
     *  @returns `this` for chaining.
     *  @see post_hook_global_action
     */
    post_hook_global_action(action, handler) {
        return post_hook_global_action(this, action, handler);
    }
    /**
     *  Post-transition hook on any action-driven transition.  Delegates to
     *  the hooks family's {@link post_hook_any_action}.
     *  @returns `this` for chaining.
     *  @see post_hook_any_action
     */
    post_hook_any_action(handler) {
        return post_hook_any_action(this, handler);
    }
    /**
     *  Post-transition hook on any standard (`->`) transition.  Delegates to
     *  the hooks family's {@link post_hook_standard_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_standard_transition
     */
    post_hook_standard_transition(handler) {
        return post_hook_standard_transition(this, handler);
    }
    /**
     *  Post-transition hook on any main-path (`=>`) transition.  Delegates to
     *  the hooks family's {@link post_hook_main_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_main_transition
     */
    post_hook_main_transition(handler) {
        return post_hook_main_transition(this, handler);
    }
    /**
     *  Post-transition hook on any forced (`~>`) transition.  Delegates to
     *  the hooks family's {@link post_hook_forced_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_forced_transition
     */
    post_hook_forced_transition(handler) {
        return post_hook_forced_transition(this, handler);
    }
    /**
     *  Post-transition hook on any transition regardless of kind.  Delegates
     *  to the hooks family's {@link post_hook_any_transition}.
     *  @returns `this` for chaining.
     *  @see post_hook_any_transition
     */
    post_hook_any_transition(handler) {
        return post_hook_any_transition(this, handler);
    }
    /**
     *  Post-transition hook that fires after entering a specific state.
     *  Delegates to the hooks family's {@link post_hook_entry}.
     *  @returns `this` for chaining.
     *  @see post_hook_entry
     */
    post_hook_entry(to, handler) {
        return post_hook_entry(this, to, handler);
    }
    /**
     *  Post-transition hook that fires after leaving a specific state.
     *  Delegates to the hooks family's {@link post_hook_exit}.
     *  @returns `this` for chaining.
     *  @see post_hook_exit
     */
    post_hook_exit(from, handler) {
        return post_hook_exit(this, from, handler);
    }
    /**
     *  Register a pre-transition hook that fires before all other pre-hooks.
     *  Delegates to the hooks family's {@link hook_pre_everything}.
     *  @returns `this` for chaining.
     *  @see hook_pre_everything
     */
    hook_pre_everything(handler) {
        return hook_pre_everything(this, handler);
    }
    /**
     *  Register a pre-transition hook that fires after all other pre-hooks.
     *  Delegates to the hooks family's {@link hook_everything}.
     *  @returns `this` for chaining.
     *  @see hook_everything
     */
    hook_everything(handler) {
        return hook_everything(this, handler);
    }
    /**
     *  Register a post-transition hook that fires after all other post-hooks.
     *  Delegates to the hooks family's {@link hook_post_everything}.
     *  @returns `this` for chaining.
     *  @see hook_post_everything
     */
    hook_post_everything(handler) {
        return hook_post_everything(this, handler);
    }
    /**
     *  Register a post-transition hook that fires before all other post-hooks.
     *  Delegates to the hooks family's {@link hook_pre_post_everything}.
     *  @returns `this` for chaining.
     *  @see hook_pre_post_everything
     */
    hook_pre_post_everything(handler) {
        return hook_pre_post_everything(this, handler);
    }
    /**
     * Get the current RNG seed used for probabilistic transitions.  Delegates
     *  to the stochastic family's {@link rng_seed}.
     *  @see rng_seed
     */
    get rng_seed() {
        return rng_seed(this);
    }
    /**
     * Set the RNG seed.  Delegates to the stochastic family's
     *  {@link set_rng_seed}, which carries the full contract.
     *  @see set_rng_seed
     */
    set rng_seed(to) {
        set_rng_seed(this, to);
    }
    // remove_hook(HookDesc: HookDescription) {
    //   throw new JssmError(this, 'TODO: Should remove hook here');
    // }
    /**
     * Get all edges between two states (there can be multiple with
     *  different actions).  Delegates to the query family's
     *  {@link edges_between}, which carries the full contract.
     *  @see edges_between
     */
    edges_between(from, to) {
        return edges_between(this, from, to);
    }
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
    override(newState, newData) {
        if (arguments.length >= 2) {
            override(this, newState, newData);
        }
        else {
            override(this, newState);
        }
    }
    /**
     *  Fire a `'rejection'` event caused by a hook vetoing a pending transition.
     *  Delegates to the transition family's {@link fire_hook_rejection}.
     *  @internal
     */
    _fire_hook_rejection(hook_name, fromState, newState, fromAction, oldData, newData, wasForced) {
        fire_hook_rejection(this, hook_name, fromState, newState, fromAction, oldData, newData, wasForced);
    }
    /**
     *  Fire the FSL boundary-hook actions for an already-committed state
     *  change.  Delegates to the transition family's {@link fire_boundary_actions}.
     *  @internal
     */
    _fire_boundary_actions(prev_state, next_state) {
        fire_boundary_actions(this, prev_state, next_state);
    }
    /**
     *  Shared transition core.  Delegates to the transition family's
     *  {@link transition_impl}, which carries the full contract.  The public
     *  movers on this class (`transition`, `go`, `force_transition`, `act`,
     *  `action`, `do`) call the family function directly rather than this
     *  delegate, so the class path is no deeper than it was in 5.x.
     *  @internal
     */
    transition_impl(newStateOrAction, newData, wasForced, wasAction, dataProvided = newData !== undefined) {
        return transition_impl(this, newStateOrAction, newData, wasForced, wasAction, dataProvided);
    }
    /**
     *  If the current state has an `after` timeout configured, schedule it.
     *  Delegates to the timers family's {@link auto_set_state_timeout}.
     *  @see auto_set_state_timeout
     */
    auto_set_state_timeout() {
        auto_set_state_timeout(this);
    }
    /**
     *  Get a truncated history of the recent states and data of the machine,
     *  without the current state.  Delegates to the history family's
     *  {@link history}, which carries the full contract and examples.
     *  @see history
     */
    get history() {
        return history(this);
    }
    /**
     *  Get a truncated history of the recent states and data of the machine,
     *  including the current state.  Delegates to the history family's
     *  {@link history_inclusive}.
     *  @see history_inclusive
     */
    get history_inclusive() {
        return history_inclusive(this);
    }
    /**
     *  Find out how long a history this machine is keeping.  Delegates to the
     *  history family's {@link history_length}; the setter delegates to
     *  {@link set_history_length}.
     *  @see history_length
     *  @see set_history_length
     */
    get history_length() {
        return history_length(this);
    }
    set history_length(to) {
        set_history_length(this, to);
    }
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
    action(actionName, newData) {
        // arity, not undefined-comparison: an explicit `undefined` is a real
        // data assignment (StoneCypher/fsl#1264)
        return transition_impl(this, actionName, newData, false, true, arguments.length >= 2);
    }
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
    act(actionName, newData) {
        return transition_impl(this, actionName, newData, false, true, arguments.length >= 2);
    }
    /**
     *  Get the standard style for a single state.  Delegates to the style
     *  family's {@link standard_state_style}, which carries the full contract
     *  and example.
     *  @see standard_state_style
     */
    get standard_state_style() {
        return standard_state_style(this);
    }
    /**
     *  Get the hooked state style.  Delegates to the style family's
     *  {@link hooked_state_style}, which carries the full contract and
     *  example.
     *  @see hooked_state_style
     */
    get hooked_state_style() {
        return hooked_state_style(this);
    }
    /**
     *  Get the start state style.  Delegates to the style family's
     *  {@link start_state_style}, which carries the full contract and example.
     *  @see start_state_style
     */
    get start_state_style() {
        return start_state_style(this);
    }
    /**
     *  Get the end state style.  Delegates to the style family's
     *  {@link end_state_style}, which carries the full contract and example.
     *  @see end_state_style
     */
    get end_state_style() {
        return end_state_style(this);
    }
    /**
     *  Get the terminal state style.  Delegates to the style family's
     *  {@link terminal_state_style}, which carries the full contract and
     *  example.
     *  @see terminal_state_style
     */
    get terminal_state_style() {
        return terminal_state_style(this);
    }
    /**
     *  Get the style for the active state.  Delegates to the style family's
     *  {@link active_state_style}, which carries the full contract and
     *  example.
     *  @see active_state_style
     */
    get active_state_style() {
        return active_state_style(this);
    }
    /**
     *  Generate the uniform observational-hook registry.  Delegates to the
     *  hooks family's {@link hook_registry}, which carries the full contract
     *  and examples.
     *  @returns Every registered hook as a {@link HookRegistryEntry}.
     *  @see hook_registry
     */
    hook_registry() {
        return hook_registry(this);
    }
    /**
     *  Return every registry entry observing the given target.  Delegates to
     *  the hooks family's {@link hooks_on}.
     *  @returns The matching {@link HookRegistryEntry} rows (possibly empty).
     *  @see hooks_on
     */
    hooks_on(query) {
        return hooks_on(this, query);
    }
    /**
     *  Is at least one observational hook bound to the given target?
     *  Delegates to the hooks family's {@link has_hook}.
     *  @returns `true` when a matching hook exists.
     *  @see has_hook
     */
    has_hook(query, phase) {
        return has_hook(this, query, phase);
    }
    /**
     *  Does the given state carry any observational hook?  Delegates to the
     *  hooks family's {@link state_has_hooks}.
     *  @returns `true` when the state is observed by at least one hook.
     *  @see state_has_hooks
     */
    state_has_hooks(state) {
        return state_has_hooks(this, state);
    }
    /**
     *  Resolves the full unified style/config cascade for a state.  Delegates
     *  to the style family's {@link resolve_state_config}, which carries the
     *  full contract and example.
     *  @see resolve_state_config
     */
    resolve_state_config(state) {
        return resolve_state_config(this, state);
    }
    /**
     *  Gets the composite style for a specific node — the public viz entry
     *  point.  Delegates to the style family's {@link style_for}, which
     *  carries the full contract.
     *  @see style_for
     */
    style_for(state) {
        return style_for(this, state);
    }
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
    do(actionName, newData) {
        return transition_impl(this, actionName, newData, false, true, arguments.length >= 2);
    }
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
    transition(newState, newData) {
        return transition_impl(this, newState, newData, false, false, arguments.length >= 2);
    }
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
    go(newState, newData) {
        return transition_impl(this, newState, newData, false, false, arguments.length >= 2);
    }
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
    force_transition(newState, newData) {
        return transition_impl(this, newState, newData, true, false, arguments.length >= 2);
    }
    /**
     * Get the edge index for an action from the current state.  Delegates to
     *  the query family's {@link current_action_for}, which carries the full
     *  contract.
     *  @see current_action_for
     */
    current_action_for(action) {
        return current_action_for(this, action);
    }
    /**
     * Get the full transition object for an action from the current state.
     *  Delegates to the query family's {@link current_action_edge_for}.
     *  @throws {JssmError} If the action is not available from the current state.
     *  @see current_action_edge_for
     */
    current_action_edge_for(action) {
        return current_action_edge_for(this, action);
    }
    /**
     * Check whether an action is available from the current state.  Delegates
     *  to the transition family's {@link valid_action}.
     *  @param action   - The action name to check.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the action can be taken.
     *  @see valid_action
     */
    valid_action(action, _newData) {
        return valid_action(this, action, _newData);
    }
    /**
     * Check whether a transition to a given state is legal (non-forced) from
     *  the current state.  Delegates to the transition family's
     *  {@link valid_transition}.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the transition is legal.
     *  @see valid_transition
     */
    valid_transition(newState, _newData) {
        return valid_transition(this, newState, _newData);
    }
    /**
     * Check whether a forced transition to a given state exists from the
     *  current state.  Delegates to the transition family's
     *  {@link valid_force_transition}.
     *  @param newState - The target state.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if a forced (or any) transition exists.
     *  @see valid_force_transition
     */
    valid_force_transition(newState, _newData) {
        return valid_force_transition(this, newState, _newData);
    }
    /**
     * Get the instance name of this machine.  Delegates to the create family's
     *  {@link instance_name}.
     *  @see instance_name
     */
    instance_name() {
        return instance_name(this);
    }
    /**
     * Get the creation date of this machine as a `Date` object.  Delegates to
     *  the create family's {@link creation_date}.
     *  @see creation_date
     */
    get creation_date() {
        return creation_date(this);
    }
    /**
     * Get the creation timestamp (milliseconds since epoch).  Delegates to the
     *  create family's {@link creation_timestamp}.
     *  @see creation_timestamp
     */
    get creation_timestamp() {
        return creation_timestamp(this);
    }
    /**
     * Get the timestamp when construction began (before parsing).  Delegates
     *  to the create family's {@link create_start_time}.
     *  @see create_start_time
     */
    get create_start_time() {
        return create_start_time(this);
    }
    /**
     *  Schedule an automatic transition to `next_state` after `after_time`
     *  milliseconds.  Delegates to the timers family's
     *  {@link set_state_timeout}, which carries the full contract.
     *  @throws JssmError If a timeout is already pending.
     *  @see set_state_timeout
     */
    set_state_timeout(next_state, after_time) {
        set_state_timeout(this, next_state, after_time);
    }
    /**
     *  Cancel any pending state timeout.  Delegates to the timers family's
     *  {@link clear_state_timeout}.
     *  @see clear_state_timeout
     */
    clear_state_timeout() {
        clear_state_timeout(this);
    }
    /**
     *  Get the configured `after` timeout for a given state, if any.
     *  Delegates to the timers family's {@link state_timeout_for}.
     *  @see state_timeout_for
     */
    state_timeout_for(which_state) {
        return state_timeout_for(this, which_state);
    }
    /**
     *  Get the pending state timeout, if any.  Delegates to the timers
     *  family's {@link current_state_timeout}.
     *  @see current_state_timeout
     */
    current_state_timeout() {
        return current_state_timeout(this);
    }
    /**
     * Convenience method to create a new machine from a tagged template literal.
     *  Equivalent to calling the top-level `sm` function.
     *  @param template_strings - The template string array.
     *  @param remainder        - Interpolated values.
     *  @returns A new {@link Machine} instance.
     */
    sm(template_strings, ...remainder /* , arguments */) {
        return sm(template_strings, ...remainder);
    }
    /**
     * Convenience method to create a new machine from a tagged template literal;
     *  an exact alias of {@link Machine.sm}, matching the top-level {@link fsl}.
     *  @param template_strings - The template string array.
     *  @param remainder        - Interpolated values.
     *  @returns A new {@link Machine} instance.
     */
    fsl(template_strings, ...remainder /* , arguments */) {
        return sm(template_strings, ...remainder);
    }
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
function create(config) {
    return new Machine(config);
}
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
function sm(template_strings, ...remainder /* , arguments */) {
    // foo`a${1}b${2}c` will come in as (['a','b','c'],1,2)
    // this includes when a and c are empty strings
    // therefore template_strings will always have one more el than template_args
    // therefore map the smaller container and toss the last one on on the way out
    return new Machine(make(template_strings.reduce(
    // in general avoiding `arguments` is smart.  however with the template
    // string notation, as designed, it's not really worth the hassle
    (acc, val, idx) => `${acc}${remainder[idx - 1]}${val}` // arguments[0] is never loaded, so args doesn't need to be gated
    )));
}
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
function fsl(template_strings, ...remainder /* , arguments */) {
    return sm(template_strings, ...remainder);
}
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
function from(MachineAsString, ExtraConstructorFields) {
    const to_decorate = make(MachineAsString);
    if (ExtraConstructorFields !== undefined) {
        for (const [key, value] of Object.entries(ExtraConstructorFields)) {
            if (key === 'allows_override') {
                to_decorate['config_allows_override'] = ExtraConstructorFields.allows_override;
            }
            else {
                to_decorate[key] = value;
            }
        }
    }
    return new Machine(to_decorate);
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
function compareVersions(v1, v2) {
    var _a, _b;
    const hyphen1 = v1.indexOf('-'), hyphen2 = v2.indexOf('-');
    const main1 = (hyphen1 === -1) ? v1 : v1.slice(0, hyphen1), main2 = (hyphen2 === -1) ? v2 : v2.slice(0, hyphen2), pre1 = (hyphen1 === -1) ? undefined : v1.slice(hyphen1 + 1), pre2 = (hyphen2 === -1) ? undefined : v2.slice(hyphen2 + 1);
    const parts1 = main1.split('.').map(Number);
    const parts2 = main2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = (_a = parts1[i]) !== null && _a !== void 0 ? _a : 0;
        const num2 = (_b = parts2[i]) !== null && _b !== void 0 ? _b : 0;
        if (num1 !== num2) {
            return num1 - num2;
        }
    }
    // numeric parts equal; a version with a prerelease precedes one without
    if (pre1 === undefined && pre2 === undefined) {
        return 0;
    }
    if (pre1 === undefined) {
        return 1;
    }
    if (pre2 === undefined) {
        return -1;
    }
    // both have prereleases: compare dot-separated identifiers per semver
    const ids1 = pre1.split('.'), ids2 = pre2.split('.');
    for (let i = 0; i < Math.max(ids1.length, ids2.length); i++) {
        const id1 = ids1[i];
        if (id1 === undefined) {
            return -1;
        } // shorter identifier set precedes
        const id2 = ids2[i];
        if (id2 === undefined) {
            return 1;
        }
        const n1 = /^\d+$/.test(id1) ? Number(id1) : undefined, n2 = /^\d+$/.test(id2) ? Number(id2) : undefined;
        if (n1 !== undefined && n2 !== undefined) {
            if (n1 !== n2) {
                return n1 - n2;
            }
        }
        else if (n1 !== undefined) {
            return -1;
        } // numeric below alphanumeric
        else if (n2 !== undefined) {
            return 1;
        }
        else if (id1 !== id2) {
            return (id1 < id2) ? -1 : 1;
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
function deserialize(machine_string, ser) {
    var _a;
    // Refuse to deserialize data from future versions
    if (compareVersions(ser.jssm_version, version) > 0) {
        throw new Error(`Cannot deserialize from future version ${ser.jssm_version} ` +
            `(current version is ${version}). Please upgrade jssm to deserialize this data.`);
    }
    const machine = from(machine_string, { data: ser.data, history: ser.history_capacity });
    machine._state = ser.state;
    machine._state_id = (_a = machine._state_interner.id_of(ser.state)) !== null && _a !== void 0 ? _a : NaN;
    // `from()` armed the *initial* state's `after` timer; the restored state may
    // differ, so that timer is both a ghost (it targets the wrong state) and a
    // gap (the restored state's own `after` was never armed).  Clear it and arm
    // the restored state's timer instead.  clear must precede arm because
    // set_state_timeout throws if a timer is already pending.  StoneCypher/fsl#1946
    machine.clear_state_timeout();
    machine.auto_set_state_timeout();
    for (const history_item of ser.history)
        machine._history.push(history_item);
    return machine;
}
export { Machine, create, deserialize, compareVersions, sm, fsl, from, 
// WHARGARBL TODO these should be exported to a utility library
shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars, is_state_name_first_char, is_state_name_char,
//  FslThemes
 };
