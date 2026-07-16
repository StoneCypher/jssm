// whargarbl lots of these return arrays could/should be sets
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Machine_instances, _Machine_unsubscribe_entry, _Machine_subscribe, _Machine_fire_one, _Machine_has_subscribers, _Machine_fire, _Machine_validate_hook_description, _Machine_recompute_hook_flags, _Machine_fire_hook_rejection, _Machine_fire_boundary_actions, _Machine_resolved_themes, _Machine_individual_state_config, _Machine_groups_by_depth, _Machine_compose_state_config;
import { circular_buffer } from 'circular_buffer_js';
import { make, transitive_members, membership_distance } from './jssm_compiler.js';
import { theme_mapping, base_theme } from './jssm_theme.js';
import { seq, weighted_rand_select, histograph, array_box_if_string, name_bind_prop_and_state, gen_splitmix32, } from './jssm_util.js';
import { Interner, pair_key, un_pair_key } from './jssm_intern.js';
import * as constants from './jssm_constants.js';
const { shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars } = constants;
const empty_string_set = new Set();
// Editor-agnostic FSL language service (diagnostics / completions / semantic spans).
export { fslDiagnostics, fslCompletions, fslSemanticSpans } from './language_service/index.js';
// The spatial fields (besides `handler`, which every hook needs) that each
// hook kind requires, mirroring exactly what `set_hook` reads per case.  Used
// to validate a HookDescription so a mis-shaped one is rejected rather than
// silently registering a dead hook — e.g. an `exit` hook given `to` instead of
// `from` would otherwise intern `undefined` and never fire (#734).  Typed as a
// `Record` over the kind union so the table is exhaustive at compile time:
// adding a hook kind without listing its fields is a build error.
const hook_required_fields = {
    'hook': ['from', 'to'],
    'named': ['from', 'to', 'action'],
    'global action': ['action'],
    'any action': [],
    'standard transition': [],
    'main transition': [],
    'forced transition': [],
    'any transition': [],
    'entry': ['to'],
    'exit': ['from'],
    'after': ['from'],
    'after any': [],
    'post hook': ['from', 'to'],
    'post named': ['from', 'to', 'action'],
    'post global action': ['action'],
    'post any action': [],
    'post standard transition': [],
    'post main transition': [],
    'post forced transition': [],
    'post any transition': [],
    'post entry': ['to'],
    'post exit': ['from'],
    'pre everything': [],
    'everything': [],
    'pre post everything': [],
    'post everything': [],
};
// The spatial fields a hook descriptor can carry, checked against the per-kind
// requirements above.
const hook_spatial_fields = ['from', 'to', 'action'];
import { version, } from './version.js'; // replaced from package.js in build
import { JssmError } from './jssm_error.js';
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
/**
 *
 *  Applies one parsed state-style key/value pair onto a condensing
 *  {@link JssmStateConfig}, remapping the kebab-case FSL key to its camelCase
 *  field and rejecting redefinition.  Exists as the switch body of
 *  {@link state_style_condense}, one call per list element.
 *
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
function state_style_condense(jssk, machine) {
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
function merge_state_config(base, over) {
    const merged = Object.assign({}, base);
    for (const [key, value] of Object.entries(over)) {
        if (value !== undefined) {
            merged[key] = value;
        }
    }
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
 *  @typeParam mDT The machine data type — the type of the value stored in
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
function find_connected_components(states, edges) {
    // Build undirected adjacency list
    const adj = new Map();
    for (const name of states.keys()) {
        adj.set(name, new Set());
    }
    for (const edge of edges) {
        adj.get(edge.from).add(edge.to);
        adj.get(edge.to).add(edge.from);
    }
    const visited = new Set();
    const result = [];
    for (const start of states.keys()) {
        if (visited.has(start)) {
            continue;
        }
        // BFS to collect this component
        const component = [];
        const queue = [start];
        visited.add(start);
        const enqueue_unvisited = (neighbor) => {
            if (visited.has(neighbor)) {
                return;
            }
            visited.add(neighbor);
            queue.push(neighbor);
        };
        // index-pointer pop: Array.shift is O(n) per pop, making the BFS O(V²)
        // worst case; reading by cursor keeps it O(V + E)
        let head = 0;
        while (head < queue.length) {
            const node = queue[head++];
            component.push(node);
            for (const neighbor of adj.get(node)) {
                enqueue_unvisited(neighbor);
            }
        }
        result.push(component);
    }
    return result;
}
/** Default number of independent Monte-Carlo runs when none is declared. */
export const STOCHASTIC_DEFAULT_RUNS = 1000;
/** Default per-run step cap (montecarlo) / walk length (steady_state). */
export const STOCHASTIC_DEFAULT_MAX_STEPS = 1000;
/**
 *  Default time / timeout sources, hoisted to module scope so machines that
 *  don't override them (nearly all) share three singletons instead of
 *  allocating three fresh closures per construction.
 *  @internal
 */
const DEFAULT_TIME_SOURCE = () => Date.now();
const DEFAULT_TIMEOUT_SOURCE = (f, a) => {
    const handle = setTimeout(f, a);
    // In Node, setTimeout returns a Timeout with .unref(), so a pending `after`
    // timer does NOT by itself keep the process alive -- an abandoned machine can
    // be collected and the process can exit instead of hanging until the timer
    // fires go() on it.  The browser returns a plain number with no such method.
    // A consumer who wants the timer to hold the loop open can supply their own
    // timeout_source.  StoneCypher/fsl#1952
    const maybe_unref = handle;
    // The no-unref path is the browser's numeric handle; it can't be reached in
    // the node-only coverage environment, so the false branch is ignored here.
    /* v8 ignore next */
    if (typeof maybe_unref.unref === 'function') {
        maybe_unref.unref();
    }
    return handle;
};
const DEFAULT_CLEAR_TIMEOUT_SOURCE = (h) => clearTimeout(h);
class Machine {
    // whargarbl this badly needs to be broken up, monolith master
    constructor({ start_states, end_states = [], failed_outputs = [], initial_state, start_states_no_enforce, complete = [], transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, npm_name, default_size, state_declaration, property_definition, state_property, fsl_version, dot_preamble, arrange_declaration = [], arrange_start_declaration = [], arrange_end_declaration = [], oarrange_declaration = [], farrange_declaration = [], theme = ['default'], flow = 'down', graph_layout = 'dot', instance_name, history, boundary_depth_limit, data, default_state_config, default_active_state_config, default_hooked_state_config, default_terminal_state_config, default_start_state_config, default_end_state_config, default_transition_config, default_graph_config, group_registry, group_metadata, group_hooks, state_hooks, allows_override, config_allows_override, allow_islands, editor_config, rng_seed, time_source, timeout_source, clear_timeout_source }) {
        _Machine_instances.add(this);
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
                this._new_state(cursor_from);
            }
            let cursor_to = this._states.get(tr.to);
            if (cursor_to === undefined) {
                cursor_to = { name: tr.to, from: [], to: [], complete: complete_set.has(tr.to) };
                this._new_state(cursor_to);
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
            // duplicate-edge guard.  A probability-bearing action-less edge is exempt
            // (a weighted fan-out may repeat a target); every other edge claims a slot
            // — its action name, or '' for the one plain action-less edge — and a
            // repeated slot throws.  Distinct actions between the same pair coexist
            // (#325/#531).
            const edge_exempt = (!tr.action) && (tr.probability !== undefined);
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
     *
     *  @internal
     *
     */
    _new_state(state_config) {
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns A deep clone of the machine's current data value.
     *
     */
    data() {
        return structuredClone(this._data);
    }
    /*********
     *
     *  Replace the machine's data in place, without a transition.  This is the
     *  practical way to assign any value — including `undefined`, `null`, or
     *  `false` — outside a hook's complex return, closing the gap where an
     *  `undefined` assignment had no direct API (StoneCypher/fsl#1264).  Fires
     *  a `data-change` event with cause `'set_data'` when the value actually
     *  changes; unlike {@link override} it requires no `allows_override`
     *  config, because it never moves the state.
     *
     *  ```typescript
     *  import * as jssm from 'jssm';
     *
     *  const lswitch = jssm.from('on <=> off;', {data: 1});
     *  console.log( lswitch.data() );              // 1
     *
     *  lswitch.set_data(2);
     *  console.log( lswitch.data() );              // 2
     *
     *  lswitch.set_data(undefined);
     *  console.log( lswitch.data() );              // undefined
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newData The value to install as the machine's data.
     *
     *  @returns The machine, for chaining.
     *
     *  @see Machine.data
     *  @see override
     *
     */
    set_data(newData) {
        const oldData = this._data;
        this._data = newData;
        if (oldData !== newData) {
            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'data-change', {
                from: this._state,
                to: this._state,
                old_data: oldData,
                new_data: newData,
                cause: 'set_data'
            });
        }
        return this;
    }
    /**
     *  The machine's current data by REFERENCE — no clone.  The public
     *  {@link Machine.data} contract is a deep clone per call (a mutation
     *  boundary for external consumers, and deliberately untouched); that clone
     *  is `structuredClone` of the whole data value, which same-package
     *  read-only consumers — the fsl-bind and fsl-data-inspector panels, which
     *  read one dotted path or serialize per transition — should not pay on
     *  every event.  Callers MUST NOT mutate the returned value or store it
     *  beyond the current tick; anything crossing a trust boundary must use
     *  {@link Machine.data} instead.
     *
     *  ```typescript
     *  const m = jssm.from('on <=> off;', { data: { a: { b: 1 } } });
     *  m._data_ref().a.b;   // 1, zero-copy
     *  ```
     *  @returns The live data value; treat as read-only.
     *  @see Machine.data
     *  @internal
     */
    _data_ref() {
        return this._data;
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
        return this._default_properties.has(name) ? this._default_properties.get(name) : undefined;
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
        if (this._default_properties.has(name)) {
            return this._default_properties.get(name);
        }
        throw new JssmError(this, `Strictly requested a prop '${name}' which doesn't exist on current state '${this.state()}' and has no default`);
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
     *    state Red:         { property: stop_first true;  property: can_go false; };
     *    state Off:         { property: stop_first true;  };
     *    state FlashingRed: { property: stop_first true;  };
     *    state Green:       { property: hesitate   false; };
     *
     *  `;
     *
     *  traffic_light.state();  // Off
     *  traffic_light.props();  // { can_go: true,  hesitate: true,  stop_first: true  }
     *
     *  traffic_light.go('Red');
     *  traffic_light.props();  // { can_go: false, hesitate: true,  stop_first: true  }
     *
     *  traffic_light.go('Green');
     *  traffic_light.props();  // { can_go: true,  hesitate: false, stop_first: false }
     *  ```
     *
     *  @returns An object mapping every known property name to its current value
     *  (or `undefined` if the property has no default and the current state
     *  doesn't define it).
     *
     */
    props() {
        const ret = {};
        for (const p of this.known_props())
            ret[p] = this.prop(p);
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  string embedded, call `serialize_with_string` instead.
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
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
            timestamp: this._time_source(),
        };
    }
    /**
     * Get the graph layout direction (e.g. `'LR'`, `'TB'`).  Set via the
     *  FSL `graph_layout` directive.
     *  @returns The layout string, or the default if not set.
     */
    graph_layout() {
        return this._graph_layout;
    }
    /**
     * Get the Graphviz DOT preamble string, injected before the graph body
     *  during visualization.  Set via the FSL `dot_preamble` directive.
     *  @returns The preamble string.
     */
    dot_preamble() {
        return this._dot_preamble;
    }
    /**
     * Get the consolidated `transition: {}` default-config block: the ordered,
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
     *  @returns The transition-config item list, or `undefined` if the machine
     *  declared no `transition: {}` block.
     *  @see default_graph_config
     */
    default_transition_config() {
        return this._default_transition_config;
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
     *  ```typescript
     *  import { sm } from 'jssm';
     *  sm`a -> b; graph: { background-color: #ffffff; };`.default_graph_config();
     *  // [ { key: 'background-color', value: '#ffffffff' } ]
     *  ```
     *  @returns The graph-config item list, or `undefined` if the machine has no
     *  graph config (no `graph: {}` block and no deprecated graph keyword).
     *  @see default_transition_config
     */
    default_graph_config() {
        return this._default_graph_config;
    }
    /**
     * Get the machine's author list.  Set via the FSL `machine_author` directive.
     *  @returns An array of author name strings.
     */
    machine_author() {
        return this._machine_author;
    }
    /**
     * Get the machine's comment string.  Set via the FSL `machine_comment` directive.
     *  @returns The comment string.
     */
    machine_comment() {
        return this._machine_comment;
    }
    /**
     * Get the machine's contributor list.  Set via the FSL `machine_contributor` directive.
     *  @returns An array of contributor name strings.
     */
    machine_contributor() {
        return this._machine_contributor;
    }
    /**
     * Get the machine's definition string.  Set via the FSL `machine_definition` directive.
     *  @returns The definition string.
     */
    machine_definition() {
        return this._machine_definition;
    }
    /**
     * Get the machine's natural language as an ISO 639-1 code.  Set via the FSL
     *  `machine_language` directive, which accepts a language name or code, or a
     *  BCP-47 tag whose region subtag is dropped (`en-us` -> `en`).  Unrecognized
     *  values resolve to `undefined`.
     *  @returns The ISO 639-1 language code (e.g. `'en'`), or `undefined` if the
     *           supplied value did not resolve to a known language.
     */
    machine_language() {
        return this._machine_language;
    }
    /**
     * Get the machine's license string.  Set via the FSL `machine_license` directive.
     *  @returns The license string.
     */
    machine_license() {
        return this._machine_license;
    }
    /**
     * Get the machine's name.  Set via the FSL `machine_name` directive.
     *  @returns The machine name string.
     */
    machine_name() {
        return this._machine_name;
    }
    /**
     * The editor/panel defaults declared in the FSL `editor: {}` block, or
     *  `undefined` when none was given.  Read by the all-widgets web control
     *  (fsl#1334) — `panels` drives `request` panel mode.
     *  @returns `{ stochastic_run_count?, panels? }`, or `undefined`.
     *  @example
     *    const m = sm`editor: { panels: [history]; }; a -> b;`;
     *    m.editor_config();  // => { panels: ['history'] }
     */
    editor_config() {
        return this._editor_config;
    }
    /**
     * Get the npm package name associated with the machine.  Set via the FSL `npm_name` directive.
     *  Returns `undefined` when not present.
     *  @returns The npm package name string, or `undefined`.
     *  @see machine_name
     */
    npm_name() {
        return this._npm_name;
    }
    /**
     * Get the render-size hint for the machine's visualization.  Set via the
     *  FSL `default_size` directive.  Returns `undefined` when not present.
     *
     *  The three FSL forms each produce a different subset of fields:
     *
     *  - `default_size: 800;`       → `{ width: 800 }`
     *  - `default_size: 800 600;`   → `{ width: 800, height: 600 }`
     *  - `default_size: height 600;` → `{ height: 600 }`
     *
     *  This is a hint, not a hard constraint.  Renderers may ignore it.
     *  @returns The size-hint object, or `undefined` if not set.
     *  @see npm_name
     */
    default_size() {
        return this._default_size;
    }
    /**
     * Get the machine's declared version, parsed.  Set via the FSL
     *  `machine_version` directive, which takes a semver triple; the parser
     *  breaks it into numeric `major`/`minor`/`patch` fields and keeps the
     *  exact source text in `full`.  Returns `undefined` when the directive
     *  was not given.
     *  @returns The parsed {@link JssmParsedSemver}, or `undefined` if unset.
     *  @example
     *    const m = sm`machine_version: 1.2.3; a -> b;`;
     *    m.machine_version();  // => { major: 1, minor: 2, patch: 3, full: '1.2.3' }
     *  @see fsl_version
     */
    machine_version() {
        return this._machine_version;
    }
    /**
     * Get the raw state declaration objects as parsed from the FSL source.
     *  @returns An array of raw state declaration objects.
     */
    raw_state_declarations() {
        return this._raw_state_declaration;
    }
    /**
     * Get the processed state declaration for a specific state.
     *  @param which - The state to look up.
     *  @returns The {@link JssmStateDeclaration} for the given state.
     */
    state_declaration(which) {
        return this._state_declarations.get(which);
    }
    /**
     * Get all processed state declarations as a Map.
     *  @returns A `Map` from state name to {@link JssmStateDeclaration}.
     */
    state_declarations() {
        return this._state_declarations;
    }
    /**
     * Get the FSL language version this machine declares, parsed.  Set via
     *  the FSL `fsl_version` directive, which takes a semver triple; the
     *  parser breaks it into numeric `major`/`minor`/`patch` fields and keeps
     *  the exact source text in `full`.  Returns `undefined` when the
     *  directive was not given.
     *  @returns The parsed {@link JssmParsedSemver}, or `undefined` if unset.
     *  @example
     *    const m = sm`fsl_version: 1.0.0; a -> b;`;
     *    m.fsl_version();  // => { major: 1, minor: 0, patch: 0, full: '1.0.0' }
     *  @see machine_version
     */
    fsl_version() {
        return this._fsl_version;
    }
    /**
     * Get the complete internal state of the machine as a serializable
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns An array of all state names in the machine.
     *
     */
    states() {
        return [...this._states.keys()];
    }
    /**
     * Get the internal state descriptor for a given state name.
     *  @param whichState - The state to look up.
     *  @returns The {@link JssmGenericState} descriptor.
     *  @throws {JssmError} If the state does not exist.
     */
    state_for(whichState) {
        const state = this._states.get(whichState);
        if (state) {
            return state;
        }
        throw new JssmError(this, 'No such state', { requested_state: whichState });
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state to be checked for existence.
     *
     *  @returns `true` if the state exists, `false` otherwise.
     *
     */
    has_state(whichState) {
        return this._states.has(whichState);
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns An array of all {@link JssmTransition} edge objects.
     *
     */
    list_edges() {
        return this._edges;
    }
    /**
     * Get the map of named transitions (transitions with explicit names).
     *  @returns A `Map` from transition name to edge index.
     */
    list_named_transitions() {
        return this._named_transitions;
    }
    /**
     * List all distinct action names defined anywhere in the machine.
     *  @returns An array of action name strings.
     */
    list_actions() {
        return [...this._actions.keys()];
    }
    /**
     * Whether any actions are defined on this machine.
     *  @returns `true` if the machine has at least one action.
     */
    get uses_actions() {
        // Map.size answers emptiness without materializing the key list
        return this._actions.size > 0;
    }
    /**
     * Whether any forced (`~>`) transitions exist in this machine.
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
        // tri-state throughout: undefined is a legal, distinct value for both
        // fields — literal comparisons are semantics, not style
        // code false?  config true, throw.  config false, false.  config undefined, false.
        if (this._code_allows_override === false) {
            /* istanbul ignore next */
            if (this._config_allows_override === true) {
                /* istanbul ignore next */
                throw new JssmError(this, "Code specifies no override, but config tries to permit; config may not be less strict than code; should be unreachable");
            }
            return false;
        }
        // code true?  config true, true.  config false, false.  config undefined, true.
        if (this._code_allows_override === true) {
            return this._config_allows_override !== false;
        }
        // code must be undefined.  config false, false.  config true, true.  config undefined, false.
        return this._config_allows_override === true;
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
    get allow_islands() {
        return this._allow_islands;
    }
    /**
     * List all available theme names.
     *  @returns An array of theme name strings.
     */
    all_themes() {
        return [...theme_mapping.keys()]; // constructor sets this to "default" otherwise
    }
    /**
     * List the character ranges accepted by the FSL grammar in any but the
     *  first position of a state name (atom).  Each entry is an inclusive
     *  `{from, to}` range of single Unicode characters.
     *  @returns An array of `{from, to}` inclusive character ranges.
     *  @example
     *  import { sm } from 'jssm';
     *  const m = sm`a -> b;`;
     *  m.all_state_name_chars().some(r => '+' >= r.from && '+' <= r.to);  // => true
     */
    all_state_name_chars() {
        return state_name_chars;
    }
    /**
     * List the character ranges accepted by the FSL grammar in the first
     *  position of a state name (atom).  Narrower than
     *  {@link all_state_name_chars}: notably omits `+`, `(`, `)`, `&`, `#`, `@`.
     *  @returns An array of `{from, to}` inclusive character ranges.
     *  @example
     *  import { sm } from 'jssm';
     *  const m = sm`a -> b;`;
     *  m.all_state_name_first_chars().some(r => '+' >= r.from && '+' <= r.to);  // => false
     */
    all_state_name_first_chars() {
        return state_name_first_chars;
    }
    /**
     * List the character ranges accepted inside a single-quoted FSL action
     *  label without escaping.  Space is allowed; the apostrophe `'` is
     *  explicitly excluded since it terminates the label.
     *  @returns An array of `{from, to}` inclusive character ranges.
     *  @example
     *  import { sm } from 'jssm';
     *  const m = sm`a -> b;`;
     *  m.all_action_label_chars().some(r => ' ' >= r.from && ' ' <= r.to);   // => true
     *  m.all_action_label_chars().some(r => "'" >= r.from && "'" <= r.to);   // => false
     */
    all_action_label_chars() {
        return action_label_chars;
    }
    /**
     * Get the active theme(s) for this machine.  Always stored as an array
     *  internally; the union return type exists for setter compatibility.
     *  @returns The current theme or array of themes.
     */
    get themes() {
        return this._themes; // constructor sets this to "default" otherwise
    }
    /**
     * Set the active theme(s).  Accepts a single theme name or an array.
     *  Also drops every memoized static state config, so styles resolved
     *  before the change re-resolve under the new theme stack.
     *
     *  ```typescript
     *  const m = sm`a -> b;`;
     *  m.style_for('b');                 // resolved under the default theme
     *  m.themes = 'ocean';
     *  m.style_for('b').backgroundColor; // 'cadetblue1' — ocean, not a stale default
     *  ```
     *
     *  @param to - A theme name or array of theme names to apply.
     *
     *  @see resolve_state_config
     */
    set themes(to) {
        this._themes = typeof to === 'string' ? [to] : to;
        // Themes feed tier 1 (and the per-kind/hooked theme layers) of
        // resolve_state_config's cascade, whose static resolution is memoized
        // per state.  Invalidate the memo so a theme assigned after a style has
        // been computed is not shadowed by the old theme's cached resolution —
        // the same rule set_hook / remove_hook apply for the hooked layer.
        this._static_state_config_cache.clear();
    }
    /**
     * Get the flow direction for graph layout (e.g. `'right'`, `'down'`).
     *  Set via the FSL `flow` directive.
     *  @returns The current flow direction.
     */
    flow() {
        return this._flow;
    }
    /**
     * Look up a transition's edge index by source and target state names.
     *  @param from - Source state name.
     *  @param to   - Target state name.
     *  @returns The edge index in the edges array, or `undefined` if no
     *  such transition exists.
     */
    get_transition_by_state_names(from, to) {
        const emg = this._edge_map.get(from);
        return emg ? emg.get(to) : undefined;
    }
    /**
     * Look up the full transition object for a given source→target pair.
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  `list_unforced_entrances` or `list_forced_entrances` as
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  exits; if this isn't desired, consider `list_unforced_exits` or
     *  `list_forced_exits` as appropriate.
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The state whose exits to have listed
     *
     */
    list_exits(whichState = this.state()) {
        var _a, _b;
        const guaranteed = ((_a = this._states.get(whichState)) !== null && _a !== void 0 ? _a : { to: undefined });
        return (_b = guaranteed.to) !== null && _b !== void 0 ? _b : [];
    }
    /**
     * Get the transitions available from a state for use by the probabilistic
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
        // single pass over the state's exits, replacing the old map -> filter ->
        // filter -> filter chain and its three intermediate arrays; selection and
        // ordering semantics are unchanged
        const legal_exits = [], probability_bearing = [];
        // hoisted: every exit shares whichState, so probe _edge_map for the
        // from-side once instead of re-hashing the same key per exit inside
        // lookup_transition_for.  wstate.to is non-empty only when at least one
        // outbound edge exists, and every outbound edge creates the from-side
        // mapping at construction — so emg is defined whenever the loop runs.
        const emg = this._edge_map.get(whichState);
        for (const ws of wstate.to) {
            // wstate.to is built from the same edge set _edge_map indexes, so the
            // per-target get cannot miss; the guard mirrors the old defensive
            // .filter(Boolean) and is equally unreachable.
            const edge = this._edges[emg.get(ws)];
            /* v8 ignore next */
            if (!edge) {
                continue;
            }
            // forced-only exits cannot be reached by transition(), so they are
            // never legal probabilistic outcomes
            if (edge.forced_only) {
                continue;
            }
            legal_exits.push(edge);
            // if any legal exit declares a probability, only those are returned, so
            // that probability-bearing edges are not diluted by their peers
            if (edge.probability !== undefined) {
                probability_bearing.push(edge);
            }
        }
        return (probability_bearing.length > 0) ? probability_bearing : legal_exits;
    }
    /**
     * Guard for the random-selection paths ({@link Machine.probabilistic_transition},
     *  {@link Machine.stochastic_runs}): rejects a candidate pool whose total
     *  selectable weight is zero, because weighted selection over an all-zero
     *  pool has no meaningful answer (StoneCypher/fsl#1248).  Undeclared
     *  probabilities count as weight 1, matching {@link weighted_rand_select}.
     *  An empty pool is not this guard's concern (terminality is handled by the
     *  callers) and passes through untouched.
     *
     *  ```typescript
     *  const m = sm`a 0% -> b; a 0% -> c;`;
     *  m.probabilistic_transition();  // throws JssmError — every exit is 0%
     *  ```
     *  @param whichState - The state the pool exits from, named in the error.
     *  @param exits - The candidate pool, as built by {@link Machine.probable_exits_for}.
     *  @throws {JssmError} If the pool is non-empty and every candidate edge
     *  has probability 0 — including the case where explicit `0%` edges
     *  excluded their unweighted sibling edges from the candidate pool.
     *  @see probable_exits_for
     */
    _assert_selectable_exit_pool(whichState, exits) {
        if (exits.length === 0) {
            return;
        }
        let total = 0;
        for (const e of exits) {
            total += (e.probability === undefined) ? 1 : e.probability;
        }
        if (total > 0) {
            return;
        }
        throw new JssmError(this, `Cannot randomly select an exit from state ${JSON.stringify(whichState)}: every candidate edge has probability 0%.  Note that an explicit 0% edge excludes unweighted sibling edges from the candidate pool (StoneCypher/fsl#1248)`);
    }
    /**
     * Take a single random transition from the current state, weighted by
     *  edge probabilities.
     *  @returns `true` if a transition was taken, `false` otherwise.
     *  @throws {JssmError} If the candidate exit pool is non-empty but its
     *  total weight is zero — every candidate declares `0%` — per
     *  StoneCypher/fsl#1248.
     */
    probabilistic_transition() {
        const exits = this.probable_exits_for(this.state());
        this._assert_selectable_exit_pool(this.state(), exits);
        const selected = weighted_rand_select(exits, undefined, this._rng);
        return this.transition(selected.to);
    }
    /**
     * Take `n` consecutive probabilistic transitions and return the sequence
     *  of states visited (before each transition).
     *  @param n - Number of steps to walk.
     *  @returns An array of state names visited during the walk.
     *  @throws {JssmError} If a visited state's candidate exit pool is
     *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
     */
    probabilistic_walk(n) {
        return [...seq(n)
                .map(() => {
                const state_was = this.state();
                this.probabilistic_transition();
                return state_was;
            }), this.state()];
    }
    /**
     * Take `n` probabilistic steps and return a histograph of how many times
     *  each state was visited.
     *  @param n - Number of steps to walk.
     *  @returns A `Map` from state name to visit count.
     *  @throws {JssmError} If a visited state's candidate exit pool is
     *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
     */
    probabilistic_histo_walk(n) {
        return histograph(this.probabilistic_walk(n));
    }
    /**
     * One non-destructive weighted-random walk over the graph from `start`.
     *
     *  Reads the graph and advances the PRNG only — it never calls
     *  {@link Machine.transition}, so it fires no hooks, mutates no machine
     *  state, and touches no `data`.  A state with no probabilistic exits
     *  (a terminal, or a forced-only `~>` state) ends the walk.
     *
     *  Terminality is checked before the first transition and after every
     *  transition.  A terminal start therefore completes with length zero even
     *  when `max_steps` is zero, and a terminal reached on the final permitted
     *  transition is completed rather than step-capped.
     *
     *  @param start - State to begin the walk from.
     *  @param max_steps - Maximum transitions before the walk is step-capped.
     *  @param exit_memo - Per-run-set cache of {@link Machine.probable_exits_for}
     *    results.  The graph is immutable after construction, so a state's
     *    probable exits never change; sharing one memo across a generator's
     *    runs collapses runs×steps re-derivations (two array allocations and an
     *    exit rescan per step) to one per distinct state.  The memo only reuses
     *    the derived arrays — RNG draw order is untouched, so seeded walks
     *    reproduce exactly.
     *  @returns The {@link JssmStochasticRun} for this walk.
     *  @throws {JssmError} If a visited state's candidate exit pool is
     *  non-empty but all-zero-weight — see
     *  {@link Machine._assert_selectable_exit_pool} (StoneCypher/fsl#1248).
     */
    _stochastic_one_walk(start, max_steps, exit_memo) {
        const states = [start];
        const edges = [];
        let cur = start;
        let exits = exit_memo.get(cur);
        if (exits === undefined) {
            exits = this.probable_exits_for(cur);
            this._assert_selectable_exit_pool(cur, exits);
            exit_memo.set(cur, exits);
        }
        let terminated = exits.length === 0;
        for (let step = 0; step < max_steps && !terminated; step++) {
            const selected = weighted_rand_select(exits, undefined, this._rng);
            edges.push(`${cur}→${selected.to}`);
            cur = selected.to;
            states.push(cur);
            exits = exit_memo.get(cur);
            if (exits === undefined) {
                exits = this.probable_exits_for(cur);
                this._assert_selectable_exit_pool(cur, exits);
                exit_memo.set(cur, exits);
            }
            terminated = exits.length === 0;
        }
        return { states, edges, length: states.length - 1, terminated };
    }
    /**
     * Lazily yield one {@link JssmStochasticRun} at a time.
     *
     *  In `montecarlo` mode (default) yields `runs` independent walks from the
     *  current state, each ending at a terminal or after `max_steps`.  In
     *  `steady_state` mode yields exactly one walk of `max_steps` steps.  This
     *  is the lazy engine behind {@link Machine.stochastic_summary}; the
     *  fsl-stochastic panel drives it across animation frames.  A walk already
     *  at a terminal is reported as terminated with length zero, including when
     *  `max_steps` is zero.
     *
     *  Passing `seed` reseeds the machine for reproducible runs.  Unlike
     *  {@link Machine.stochastic_summary}, the generator does NOT restore the
     *  prior seed afterward — a direct caller's machine is left reseeded.
     *  @param opts - {@link JssmStochasticOptions}.
     *  @yields One {@link JssmStochasticRun} per completed walk.
     *  @returns A generator of per-run results.
     *  @example
     *  const m = sm`a 'go' -> b 'go' -> c;`;
     *  [...m.stochastic_runs({ runs: 2, seed: 1 })].length;  // => 2
     */
    *stochastic_runs(opts = {}) {
        var _a, _b, _c, _d, _e;
        if (opts.seed !== undefined) {
            this.rng_seed = opts.seed;
        }
        const mode = (_a = opts.mode) !== null && _a !== void 0 ? _a : 'montecarlo';
        const max_steps = (_b = opts.max_steps) !== null && _b !== void 0 ? _b : STOCHASTIC_DEFAULT_MAX_STEPS;
        const runs = (mode === 'steady_state')
            ? 1
            : ((_e = (_c = opts.runs) !== null && _c !== void 0 ? _c : (_d = this.editor_config()) === null || _d === void 0 ? void 0 : _d.stochastic_run_count) !== null && _e !== void 0 ? _e : STOCHASTIC_DEFAULT_RUNS);
        const start = this.state();
        // one probable-exits memo for the whole run set; see _stochastic_one_walk
        const exit_memo = new Map();
        for (let i = 0; i < runs; i++) {
            yield this._stochastic_one_walk(start, max_steps, exit_memo);
        }
    }
    /**
     * Run many weighted-random walks and return aggregate statistics.
     *
     *  Honors `%` transition probabilities (via the existing probabilistic
     *  machinery).  Non-destructive: the machine's current state and
     *  {@link Machine.rng_seed} are restored before returning, so calling this
     *  never perturbs the live machine.  `montecarlo` mode (default) reports
     *  per-run `path_lengths`, `terminal_reached`, and `capped`; `steady_state`
     *  mode runs one long walk and omits those fields.
     *
     *  Monte-Carlo runs count as `terminal_reached` when they start at a
     *  terminal or reach one on the final permitted transition.  Terminal
     *  starts contribute zero to `path_lengths`, even when `max_steps` is zero.
     *
     *  Timing (`after`) decorations and data-guard conditions are not modeled
     *  by this sampler; it walks the probabilistic graph topology.
     *  @param opts - {@link JssmStochasticOptions}.  `runs` defaults to the
     *  machine's declared `editor: { stochastic_run_count }` (fsl#1334) when
     *  present, otherwise {@link STOCHASTIC_DEFAULT_RUNS}.
     *  @returns A {@link JssmStochasticSummary}.
     *  @see Machine.stochastic_runs
     *  @see Machine.probabilistic_walk
     *  @see Machine.editor_config
     *  @example
     *  const m = sm`a 'go' -> b 'go' -> c;`;
     *  const s = m.stochastic_summary({ runs: 100, seed: 1 });
     *  s.terminal_reached;  // => 100
     */
    stochastic_summary(opts = {}) {
        var _a, _b, _c;
        const mode = (_a = opts.mode) !== null && _a !== void 0 ? _a : 'montecarlo';
        const saved_seed = this._rng_seed;
        if (opts.seed !== undefined) {
            this.rng_seed = opts.seed;
        }
        const effective_seed = this._rng_seed;
        const state_visits = new Map();
        const edge_traversals = new Map();
        const path_lengths = [];
        let terminal_reached = 0, capped = 0, runs = 0;
        try {
            const run_stream = this.stochastic_runs(Object.assign(Object.assign({}, opts), { mode }));
            for (const run of run_stream) {
                runs += 1;
                for (const s of run.states) {
                    state_visits.set(s, ((_b = state_visits.get(s)) !== null && _b !== void 0 ? _b : 0) + 1);
                }
                for (const e of run.edges) {
                    edge_traversals.set(e, ((_c = edge_traversals.get(e)) !== null && _c !== void 0 ? _c : 0) + 1);
                }
                if (mode === 'montecarlo') {
                    if (run.terminated) {
                        terminal_reached += 1;
                        path_lengths.push(run.length);
                    }
                    else {
                        capped += 1;
                    }
                }
            }
        }
        finally {
            // restore the PRNG so the call is non-destructive even when the loop throws
            this.rng_seed = saved_seed;
        }
        const total_visits = [...state_visits.values()].reduce((a, b) => a + b, 0);
        const state_visit_fraction = new Map();
        for (const [s, c] of state_visits) {
            state_visit_fraction.set(s, c / total_visits);
        }
        const summary = {
            mode, runs, seed: effective_seed,
            state_visits, state_visit_fraction, edge_traversals,
        };
        if (mode === 'montecarlo') {
            summary.path_lengths = path_lengths;
            summary.terminal_reached = terminal_reached;
            summary.capped = capped;
        }
        return summary;
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
            return [...wstate.keys()];
        }
        if (this.has_state(whichState)) {
            return [];
        }
        throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param whichState The action to be checked for associated states
     *
     */
    list_states_having_action(whichState) {
        const wstate = this._actions.get(whichState);
        if (wstate) {
            return [...wstate.keys()];
        }
        throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
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
    /**
     * List all action names available as exits from a given state.
     *
     *  Returns the empty array (does not throw) when `whichState` exists but has
     *  no action-named exits — including terminal states, states whose only
     *  exits are plain `->` transitions, and states in machines that use no
     *  actions at all.  Only nonexistent states cause a throw.
     *  @param whichState - The state to inspect.  Defaults to the current state.
     *  @returns An array of action name strings, possibly empty.
     *  @throws {JssmError} If the state does not exist.
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
        // `_reverse_actions` is keyed by edge.from (see its population), so every
        // action stored under whichState belongs to whichState by construction — no
        // from-filter is needed, and the keys are exactly the exit actions.
        return [...ra_base.keys()];
    }
    /**
     * List all action exits from a state with their probabilities.
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
        const exits = []; // TODO FIXME no any
        // `_reverse_actions` is keyed by edge.from, so every entry belongs to
        // whichState by construction; no from-filter is needed.
        ra_base.forEach((edgeId, action) => {
            exits.push({
                action,
                probability: this._edges[edgeId].probability
            });
        });
        return exits;
    }
    /**
     * Check whether a state has no incoming transitions (unreachable after start).
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
    /**
     * Check whether any state in the machine is unenterable.
     *  @returns `true` if at least one state has no incoming transitions.
     */
    has_unenterables() {
        return this.states().some((x) => this.is_unenterable(x));
    }
    /**
     * Check whether the current state is terminal (has no exits).
     *  @returns `true` if the current state has zero exits.
     */
    is_terminal() {
        return this.state_is_terminal(this.state());
    }
    /**
     * Check whether a specific state is terminal (has no exits).
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
    /**
     * Check whether any state in the machine is terminal.
     *  @returns `true` if at least one state has no exits.
     */
    has_terminals() {
        return this.states().some((x) => this.state_is_terminal(x));
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param groupName The group to test the current state against.
     *
     *  @returns `true` if the current state is a transitive member of `groupName`.
     *
     *  @see groupsOf
     *  @see statesIn
     *
     */
    isIn(groupName) {
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
    groupsOf(state) {
        return new Set(this._state_to_groups.get(state));
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The declared group names, in declaration order.
     *
     *  @see groupsOf
     *  @see statesIn
     *
     */
    groups() {
        return [...this._group_order];
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
    statesIn(groupName) {
        if (!(this._group_registry.has(groupName))) {
            throw new JssmError(this, `No such group ${JSON.stringify(groupName)}`);
        }
        return transitive_members(this._group_registry, groupName, new Map());
    }
    /**
     * Check whether the current state is complete (every exit has an action).
     *  @returns `true` if the current state is complete.
     */
    is_complete() {
        return this.state_is_complete(this.state());
    }
    /**
     * Check whether a specific state is complete (every exit has an action).
     *  @param whichState - The state to check.
     *  @returns `true` if the state is complete.
     *  @throws {JssmError} If the state does not exist.
     */
    state_is_complete(whichState) {
        const wstate = this._states.get(whichState);
        if (wstate) {
            return wstate.complete;
        }
        throw new JssmError(this, `No such state ${JSON.stringify(whichState)}`);
    }
    /**
     * Check whether any state in the machine is complete.
     *  @returns `true` if at least one state is complete.
     */
    has_completes() {
        return this.states().some((x) => this.state_is_complete(x));
    }
    on(name, filterOrFn, maybeFn) {
        return __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_subscribe).call(this, name, filterOrFn, maybeFn, false);
    }
    once(name, filterOrFn, maybeFn) {
        return __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_subscribe).call(this, name, filterOrFn, maybeFn, true);
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
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_unsubscribe_entry).call(this, set, entry);
                return true;
            }
        }
        return false;
    }
    set_hook(HookDesc) {
        __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_validate_hook_description).call(this, HookDesc);
        switch (HookDesc.kind) {
            case 'hook': {
                // Numeric pair key (#729).  intern() rather than id_of(): a hook may
                // name a state the machine doesn't have — it gets an id no live state
                // can match, so it registers silently and never fires, as before.
                this._hooks.set(pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to)), HookDesc.handler);
                this._has_hooks = true;
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
                this._has_hooks = true;
                this._has_named_hooks = true;
                break;
            }
            case 'global action': {
                this._global_action_hooks.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
                this._has_hooks = true;
                this._has_global_action_hooks = true;
                break;
            }
            case 'any action': {
                this._any_action_hook = HookDesc.handler;
                this._has_hooks = true;
                break;
            }
            case 'standard transition': {
                this._standard_transition_hook = HookDesc.handler;
                this._has_transition_hooks = true;
                this._has_hooks = true;
                break;
            }
            case 'main transition': {
                this._main_transition_hook = HookDesc.handler;
                this._has_transition_hooks = true;
                this._has_hooks = true;
                break;
            }
            case 'forced transition': {
                this._forced_transition_hook = HookDesc.handler;
                this._has_transition_hooks = true;
                this._has_hooks = true;
                break;
            }
            case 'any transition': {
                this._any_transition_hook = HookDesc.handler;
                this._has_hooks = true;
                break;
            }
            case 'entry': {
                this._entry_hooks.set(this._state_interner.intern(HookDesc.to), HookDesc.handler);
                this._has_hooks = true;
                this._has_entry_hooks = true;
                break;
            }
            case 'exit': {
                this._exit_hooks.set(this._state_interner.intern(HookDesc.from), HookDesc.handler);
                this._has_hooks = true;
                this._has_exit_hooks = true;
                break;
            }
            case 'after': {
                this._after_hooks.set(HookDesc.from, HookDesc.handler);
                this._has_hooks = true;
                this._has_after_hooks = true;
                break;
            }
            case 'after any': {
                this._after_any_hook = HookDesc.handler;
                this._has_hooks = true;
                this._has_after_hooks = true;
                break;
            }
            case 'post hook': {
                // Numeric pair key; same rationale as 'hook' (#729).
                this._post_hooks.set(pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to)), HookDesc.handler);
                this._has_post_hooks = true;
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
                this._has_post_hooks = true;
                this._has_post_named_hooks = true;
                break;
            }
            case 'post global action': {
                this._post_global_action_hooks.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
                this._has_post_hooks = true;
                this._has_post_global_action_hooks = true;
                break;
            }
            case 'post any action': {
                this._post_any_action_hook = HookDesc.handler;
                this._has_post_hooks = true;
                break;
            }
            case 'post standard transition': {
                this._post_standard_transition_hook = HookDesc.handler;
                this._has_post_transition_hooks = true;
                this._has_post_hooks = true;
                break;
            }
            case 'post main transition': {
                this._post_main_transition_hook = HookDesc.handler;
                this._has_post_transition_hooks = true;
                this._has_post_hooks = true;
                break;
            }
            case 'post forced transition': {
                this._post_forced_transition_hook = HookDesc.handler;
                this._has_post_transition_hooks = true;
                this._has_post_hooks = true;
                break;
            }
            case 'post any transition': {
                this._post_any_transition_hook = HookDesc.handler;
                this._has_post_hooks = true;
                break;
            }
            case 'post entry': {
                this._post_entry_hooks.set(this._state_interner.intern(HookDesc.to), HookDesc.handler);
                this._has_post_entry_hooks = true;
                this._has_post_hooks = true;
                break;
            }
            case 'post exit': {
                this._post_exit_hooks.set(this._state_interner.intern(HookDesc.from), HookDesc.handler);
                this._has_post_exit_hooks = true;
                this._has_post_hooks = true;
                break;
            }
            case 'pre everything': {
                this._pre_everything_hook = HookDesc.handler;
                this._has_hooks = true;
                break;
            }
            case 'everything': {
                this._everything_hook = HookDesc.handler;
                this._has_hooks = true;
                break;
            }
            case 'pre post everything': {
                this._pre_post_everything_hook = HookDesc.handler;
                this._has_post_hooks = true;
                break;
            }
            case 'post everything': {
                this._post_everything_hook = HookDesc.handler;
                this._has_post_hooks = true;
                break;
            }
            // No default: `_validate_hook_description` above rejects any unknown kind
            // before we reach here, so the switch is exhaustive over the known kinds.
        }
        // The hooked-state styling layer (tier 2.5 of resolve_state_config) depends
        // on which states carry hooks, so registering a hook can change the composed
        // style of a state.  The static config cache assumes tiers 1–5 are fixed
        // after construction; invalidate it so styling stays correct when a hook is
        // added after a style has already been computed and memoized.
        this._static_state_config_cache.clear();
        // fire the registration event for inspector tools (#638)
        __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'hook-registration', { description: HookDesc });
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
     *  @param HookDesc - A hook descriptor identifying the hook to remove.
     *  @returns `true` if a hook was removed, `false` otherwise.
     */
    remove_hook(HookDesc) {
        let removed = false;
        switch (HookDesc.kind) {
            case 'hook': {
                // id_of, not intern: removal of an unknown name reports false and
                // must not grow the interner tables (#729).
                const fid = this._state_interner.id_of(HookDesc.from), tid = this._state_interner.id_of(HookDesc.to);
                removed = (fid !== undefined) && (tid !== undefined) && this._hooks.delete(pair_key(fid, tid));
                break;
            }
            case 'named': {
                const fid = this._state_interner.id_of(HookDesc.from), tid = this._state_interner.id_of(HookDesc.to), aid = this._action_interner.id_of(HookDesc.action);
                const inner = ((fid === undefined) || (tid === undefined)) ? undefined : this._named_hooks.get(pair_key(fid, tid));
                removed = (inner !== undefined) && (aid !== undefined) && inner.delete(aid);
                break;
            }
            case 'global action': {
                const aid = this._action_interner.id_of(HookDesc.action);
                removed = (aid !== undefined) && this._global_action_hooks.delete(aid);
                break;
            }
            case 'any action': {
                if (this._any_action_hook !== undefined) {
                    this._any_action_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'standard transition': {
                if (this._standard_transition_hook !== undefined) {
                    this._standard_transition_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'main transition': {
                if (this._main_transition_hook !== undefined) {
                    this._main_transition_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'forced transition': {
                if (this._forced_transition_hook !== undefined) {
                    this._forced_transition_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'any transition': {
                if (this._any_transition_hook !== undefined) {
                    this._any_transition_hook = undefined;
                    removed = true;
                }
                break;
            }
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
            case 'after': {
                removed = this._after_hooks.delete(HookDesc.from);
                break;
            }
            case 'after any': {
                if (this._after_any_hook !== undefined) {
                    this._after_any_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'post hook': {
                const fid = this._state_interner.id_of(HookDesc.from), tid = this._state_interner.id_of(HookDesc.to);
                removed = (fid !== undefined) && (tid !== undefined) && this._post_hooks.delete(pair_key(fid, tid));
                break;
            }
            case 'post named': {
                const fid = this._state_interner.id_of(HookDesc.from), tid = this._state_interner.id_of(HookDesc.to), aid = this._action_interner.id_of(HookDesc.action);
                const inner = ((fid === undefined) || (tid === undefined)) ? undefined : this._post_named_hooks.get(pair_key(fid, tid));
                removed = (inner !== undefined) && (aid !== undefined) && inner.delete(aid);
                break;
            }
            case 'post global action': {
                const aid = this._action_interner.id_of(HookDesc.action);
                removed = (aid !== undefined) && this._post_global_action_hooks.delete(aid);
                break;
            }
            case 'post any action': {
                if (this._post_any_action_hook !== undefined) {
                    this._post_any_action_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'post standard transition': {
                if (this._post_standard_transition_hook !== undefined) {
                    this._post_standard_transition_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'post main transition': {
                if (this._post_main_transition_hook !== undefined) {
                    this._post_main_transition_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'post forced transition': {
                if (this._post_forced_transition_hook !== undefined) {
                    this._post_forced_transition_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'post any transition': {
                if (this._post_any_transition_hook !== undefined) {
                    this._post_any_transition_hook = undefined;
                    removed = true;
                }
                break;
            }
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
            case 'pre everything': {
                if (this._pre_everything_hook !== undefined) {
                    this._pre_everything_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'everything': {
                if (this._everything_hook !== undefined) {
                    this._everything_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'pre post everything': {
                if (this._pre_post_everything_hook !== undefined) {
                    this._pre_post_everything_hook = undefined;
                    removed = true;
                }
                break;
            }
            case 'post everything': {
                if (this._post_everything_hook !== undefined) {
                    this._post_everything_hook = undefined;
                    removed = true;
                }
                break;
            }
            default: {
                throw new JssmError(this, `Unknown hook type ${HookDesc.kind}, should be impossible`);
            }
        }
        if (removed) {
            // set_hook only ever turns the _has_* fast-path flags ON; they summarize
            // whole families, not counts, so a removal can't simply turn one off.
            // Rederive them all now, or a stale flag keeps the fast path doing work
            // whose last hook is gone -- most visibly _has_transition_hooks, which
            // would otherwise keep resolving trans_type and leaking it into every
            // hook context after the last transition-kind hook was removed.  #1954
            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_recompute_hook_flags).call(this);
            // See set_hook: the hooked-state styling layer depends on which states
            // carry hooks, so removing one can change a state's composed style.
            this._static_state_config_cache.clear();
            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'hook-removal', { description: HookDesc });
        }
        return removed;
    }
    /**
     * Register a pre-transition hook on a specific edge.  Fires before
     *  transitioning from `from` to `to`.  If the handler returns `false`, the
     *  transition is blocked.
     *
     *  ```typescript
     *  const m = sm`a -> b -> c;`;
     *  m.hook('a', 'b', () => console.log('a->b'));
     *  ```
     *  @param from    - Source state name.
     *  @param to      - Target state name.
     *  @param handler - Callback invoked before the transition.
     *  @returns `this` for chaining.
     */
    hook(from, to, handler) {
        this.set_hook({ kind: 'hook', from, to, handler });
        return this;
    }
    /**
     * Register a pre-transition hook on a specific action-labeled edge.
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
    /**
     * Register a pre-transition hook on any edge triggered by a specific action.
     *  @param action  - The action name to hook.
     *  @param handler - Callback invoked before any transition with this action.
     *  @returns `this` for chaining.
     */
    hook_global_action(action, handler) {
        this.set_hook({ kind: 'global action', action, handler });
        return this;
    }
    /**
     * Register a pre-transition hook on any action-driven transition.
     *  @param handler - Callback invoked before any action transition.
     *  @returns `this` for chaining.
     */
    hook_any_action(handler) {
        this.set_hook({ kind: 'any action', handler });
        return this;
    }
    /**
     * Register a pre-transition hook on any standard (`->`) transition.
     *  @param handler - Callback invoked before any legal transition.
     *  @returns `this` for chaining.
     */
    hook_standard_transition(handler) {
        this.set_hook({ kind: 'standard transition', handler });
        return this;
    }
    /**
     * Register a pre-transition hook on any main-path (`=>`) transition.
     *  @param handler - Callback invoked before any main transition.
     *  @returns `this` for chaining.
     */
    hook_main_transition(handler) {
        this.set_hook({ kind: 'main transition', handler });
        return this;
    }
    /**
     * Register a pre-transition hook on any forced (`~>`) transition.
     *  @param handler - Callback invoked before any forced transition.
     *  @returns `this` for chaining.
     */
    hook_forced_transition(handler) {
        this.set_hook({ kind: 'forced transition', handler });
        return this;
    }
    /**
     * Register a pre-transition hook on any transition regardless of kind.
     *  @param handler - Callback invoked before every transition.
     *  @returns `this` for chaining.
     */
    hook_any_transition(handler) {
        this.set_hook({ kind: 'any transition', handler });
        return this;
    }
    /**
     * Register a hook that fires when entering a specific state.
     *  @param to      - The state being entered.
     *  @param handler - Callback invoked on entry.
     *  @returns `this` for chaining.
     */
    hook_entry(to, handler) {
        this.set_hook({ kind: 'entry', to, handler });
        return this;
    }
    /**
     * Register a hook that fires when leaving a specific state.
     *  @param from    - The state being exited.
     *  @param handler - Callback invoked on exit.
     *  @returns `this` for chaining.
     */
    hook_exit(from, handler) {
        this.set_hook({ kind: 'exit', from, handler });
        return this;
    }
    /**
     * Register a hook that fires when a state's `after` timer elapses — the
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
     *  @example
     *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
     *    let calls = 0;
     *    m.hook_after('a', () => { calls += 1; });
     *    m.go('c');
     *    m.go('a');
     *    // ordinary dispatch never fires it; only the timer elapsing does:
     *    calls;  // => 0
     *    m.clear_state_timeout();
     *  @see hook_entry
     *  @see hook_exit
     *  @see set_state_timeout
     */
    hook_after(from, handler) {
        this.set_hook({ kind: 'after', from, handler });
        return this;
    }
    /**
     * Register a hook that fires when ANY state's `after` timer elapses — the
     *  whole-machine companion to {@link hook_after}, mirroring how
     *  {@link hook_any_transition} companions {@link hook}.  When the elapsing
     *  state also has a specific {@link hook_after}, the specific hook fires
     *  first and this one fires second; a specific after hook firing always
     *  implies the any-after hook fires too (StoneCypher/fsl#1299).  Like
     *  `hook_after` it is informational — its outcome cannot reject the timed
     *  transition — and it does NOT fire on ordinary dispatch.
     *  @param handler - Callback invoked whenever any `after` timer fires, just
     *                   before the timed transition is taken.
     *  @returns `this` for chaining.
     *  @example
     *    const m = sm`a after 1000 -> b; a -> c; c -> a;`;
     *    let calls = 0;
     *    m.hook_after_any(() => { calls += 1; });
     *    m.go('c');
     *    m.go('a');
     *    // ordinary dispatch never fires it; only a timer elapsing does:
     *    calls;  // => 0
     *    m.clear_state_timeout();
     *  @see hook_after
     *  @see hook_any_transition
     *  @see set_state_timeout
     */
    hook_after_any(handler) {
        this.set_hook({ kind: 'after any', handler });
        return this;
    }
    /**
     * Post-transition hook on a specific edge.  Fires after the transition
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
    /**
     * Post-transition hook on a specific action-labeled edge.
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
    /**
     * Post-transition hook on any edge triggered by a specific action.
     *  @param action  - The action name.
     *  @param handler - Callback invoked after any transition with this action.
     *  @returns `this` for chaining.
     */
    post_hook_global_action(action, handler) {
        this.set_hook({ kind: 'post global action', action, handler });
        return this;
    }
    /**
     * Post-transition hook on any action-driven transition.
     *  @param handler - Callback invoked after any action transition.
     *  @returns `this` for chaining.
     */
    post_hook_any_action(handler) {
        this.set_hook({ kind: 'post any action', handler });
        return this;
    }
    /**
     * Post-transition hook on any standard (`->`) transition.
     *  @param handler - Callback invoked after any legal transition.
     *  @returns `this` for chaining.
     */
    post_hook_standard_transition(handler) {
        this.set_hook({ kind: 'post standard transition', handler });
        return this;
    }
    /**
     * Post-transition hook on any main-path (`=>`) transition.
     *  @param handler - Callback invoked after any main transition.
     *  @returns `this` for chaining.
     */
    post_hook_main_transition(handler) {
        this.set_hook({ kind: 'post main transition', handler });
        return this;
    }
    /**
     * Post-transition hook on any forced (`~>`) transition.
     *  @param handler - Callback invoked after any forced transition.
     *  @returns `this` for chaining.
     */
    post_hook_forced_transition(handler) {
        this.set_hook({ kind: 'post forced transition', handler });
        return this;
    }
    /**
     * Post-transition hook on any transition regardless of kind.
     *  @param handler - Callback invoked after every transition.
     *  @returns `this` for chaining.
     */
    post_hook_any_transition(handler) {
        this.set_hook({ kind: 'post any transition', handler });
        return this;
    }
    /**
     * Post-transition hook that fires after entering a specific state.
     *  @param to      - The state that was entered.
     *  @param handler - Callback invoked after entry.
     *  @returns `this` for chaining.
     */
    post_hook_entry(to, handler) {
        this.set_hook({ kind: 'post entry', to, handler });
        return this;
    }
    /**
     * Post-transition hook that fires after leaving a specific state.
     *  @param from    - The state that was exited.
     *  @param handler - Callback invoked after exit.
     *  @returns `this` for chaining.
     */
    post_hook_exit(from, handler) {
        this.set_hook({ kind: 'post exit', from, handler });
        return this;
    }
    /**
     * Register a pre-transition hook that fires **before** all other pre-hooks
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
     *  @param handler - Callback invoked before all other pre-hooks.
     *  @returns `this` for chaining.
     */
    hook_pre_everything(handler) {
        this.set_hook({ kind: 'pre everything', handler });
        return this;
    }
    /**
     * Register a pre-transition hook that fires **after** all other pre-hooks
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
     *  @param handler - Callback invoked after all other pre-hooks.
     *  @returns `this` for chaining.
     */
    hook_everything(handler) {
        this.set_hook({ kind: 'everything', handler });
        return this;
    }
    /**
     * Register a post-transition hook that fires **after** all other
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
     *  @param handler - Callback invoked after all other post-hooks.
     *  @returns `this` for chaining.
     */
    hook_post_everything(handler) {
        this.set_hook({ kind: 'post everything', handler });
        return this;
    }
    /**
     * Register a post-transition hook that fires **before** all other
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
     *  @param handler - Callback invoked before all other post-hooks.
     *  @returns `this` for chaining.
     */
    hook_pre_post_everything(handler) {
        this.set_hook({ kind: 'pre post everything', handler });
        return this;
    }
    /**
     * Get the current RNG seed used for probabilistic transitions.
     *  @returns The numeric seed value.
     */
    get rng_seed() {
        return this._rng_seed;
    }
    /**
     * Set the RNG seed.  Pass `undefined` to reseed from the current time.
     *  Resets the internal PRNG so subsequent probabilistic operations use the
     *  new seed.
     *  @param to - The seed value, or `undefined` for time-based seeding.
     */
    set rng_seed(to) {
        this._rng_seed = to === undefined ? Date.now() : to;
        this._rng = gen_splitmix32(this._rng_seed);
    }
    // remove_hook(HookDesc: HookDescription) {
    //   throw new JssmError(this, 'TODO: Should remove hook here');
    // }
    /**
     * Get all edges between two states (there can be multiple with
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
        //
        // The match itself compares interned numeric state ids against the packed
        // _edge_to_ids array rather than dereferencing each edge object for a
        // string compare: non-matching edges never touch an edge object, which is
        // most of the cost on dense shapes (heavier edge objects degrade a deref
        // loop — the 5.142/5.143 regression mechanism).  Every state named by any
        // edge is interned at construction, so an unknown `to` provably has no
        // edges and returns [] immediately.
        const to_id = this._state_interner.id_of(to);
        if (to_id === undefined) {
            return [];
        }
        const outbound = (_a = this._outbound_edge_ids.get(from)) !== null && _a !== void 0 ? _a : [];
        const result = [];
        for (const edgeId of outbound) {
            if (this._edge_to_ids[edgeId] === to_id) {
                result.push(this._edges[edgeId]);
            }
        }
        return result;
    }
    /*********
     *
     *  Replace the current state — and, when a data argument is provided, the
     *  data — with no regard to the graph.
     *
     *  The data argument is arity-detected: omitting it preserves the current
     *  data, while explicitly passing `undefined` really sets the data to
     *  `undefined` (StoneCypher/fsl#1264).  Before 5.163 an omitted data
     *  argument silently cleared the data.
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
     *  @param newState The state to teleport to; must exist in the graph.
     *
     *  @param newData Replacement data.  Omit to keep the current data; pass
     *  `undefined` explicitly to clear it.
     *
     *  @throws {JssmError} If the machine's config does not set
     *  `allows_override: true`, or if `newState` does not exist.
     *
     *  @see set_data
     *
     */
    override(newState, newData) {
        // arity, not undefined-comparison: an omitted argument preserves the
        // data, an explicit `undefined` clears it (StoneCypher/fsl#1264)
        const dataProvided = arguments.length >= 2;
        if (this.allows_override) {
            if (this._states.has(newState)) {
                const fromState = this._state;
                const oldData = this._data;
                this._state = newState;
                this._state_id = this._state_interner.intern(newState);
                if (dataProvided) {
                    this._data = newData;
                }
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'override', {
                    from: fromState,
                    to: newState,
                    old_data: oldData,
                    new_data: this._data
                });
                if (dataProvided && (oldData !== newData)) {
                    __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'data-change', {
                        from: fromState,
                        to: newState,
                        old_data: oldData,
                        new_data: newData,
                        cause: 'override'
                    });
                }
                // An override is still a real state change that may cross group/state
                // boundaries, so its boundary-hook actions fire too (depth-bounded).
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_boundary_actions).call(this, fromState, newState);
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
     *  @typeParam mDT The type of the machine data member; usually omitted.
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
     *  @param dataProvided `true` when the caller explicitly supplied a data
     *  argument — even an explicitly-`undefined` one, which commits `undefined`
     *  as the new data (StoneCypher/fsl#1264).  When `false` the current data
     *  is preserved.  The public wrappers derive this from call arity; the
     *  default reproduces the old `!== undefined` inference for any direct
     *  callers.
     *
     *  @returns `true` if the transition was valid and every hook passed;
     *  `false` if the transition was invalid or any hook rejected.
     *
     *  @throws {JssmError} If called reentrantly from inside a hook that is still
     *  running in the enclosing transition's pre-commit pipeline — a hook that
     *  calls `transition`/`go`/`do`/`action`.  Committing the inner transition
     *  and then the outer one would silently discard the inner result, so the
     *  reentry is rejected instead (StoneCypher/fsl#1953).  Post-commit reentry
     *  (from a post-hook or the boundary-action cascade) is permitted.
     *
     *  @internal
     *
     */
    transition_impl(newStateOrAction, newData, wasForced, wasAction, dataProvided = newData !== undefined) {
        // Reject reentry from inside the pre-commit hook pipeline.  Without this, a
        // hook that itself transitions the machine would commit an inner transition
        // that this outer, not-yet-committed frame then silently overwrites.  Post-
        // commit reentry (post-hooks, the boundary-action cascade) is fine: the flag
        // is already cleared by then.  StoneCypher/fsl#1953
        if (this._committing_transition) {
            throw new JssmError(this, 'cannot start a transition from within a transition hook: the enclosing transition has not committed yet, so the inner result would be silently discarded');
        }
        let valid = false, 
        // deliberately `string`, not `JssmArrowKind`, though only arrow kinds are
        // ever assigned: declaring this local as the 4-member union makes tsc's
        // control-flow analysis narrow it across the whole of this (very large)
        // function, which overflows the checker's stack under `npm run make`.
        // The union is recovered at the hook boundary below -- see hook_args_obj.
        trans_type, newState, newStateId = NaN, actionId = NaN, fromAction;
        if (wasForced) {
            // numeric inline of valid_force_transition: any existing edge
            // qualifies, forced or not.  one string probe (the user's target name)
            // plus one numeric probe, replacing two string probes.
            const to_id = this._state_interner.id_of(newStateOrAction);
            const edgeId = (to_id === undefined) ? undefined : this._edge_id_by_pair.get(pair_key(this._state_id, to_id));
            if (edgeId !== undefined) {
                valid = true;
                trans_type = 'forced';
                newState = newStateOrAction;
                newStateId = to_id;
            }
        }
        else if (wasAction) {
            // single numeric resolution: the old path looked the action up twice,
            // once inside valid_action and again inside current_action_edge_for.
            // aid is captured for the numeric hook probes below (#729).
            const aid = this._action_interner.id_of(newStateOrAction);
            const edgeId = (aid === undefined) ? undefined : this._edge_id_by_action_pair.get(pair_key(aid, this._state_id));
            if (edgeId !== undefined) {
                const edge = this._edges[edgeId];
                valid = true;
                trans_type = edge.kind;
                newState = edge.to;
                newStateId = this._edge_to_ids[edgeId];
                fromAction = newStateOrAction;
                actionId = aid;
            }
        }
        else {
            // numeric inline of valid_transition: the edge must exist and must not
            // be forced_only (truthiness, matching the old refusal exactly)
            const to_id = this._state_interner.id_of(newStateOrAction);
            const edgeId = (to_id === undefined) ? undefined : this._edge_id_by_pair.get(pair_key(this._state_id, to_id));
            if ((edgeId !== undefined) && (!(this._edges[edgeId].forced_only))) {
                if (this._has_transition_hooks || this._has_post_transition_hooks) {
                    // kind of the dispatched edge.  _edge_id_by_pair and _edge_map are
                    // both first-declared-wins for parallel (from, to) pairs (see the
                    // constructor around _edge_map / _edge_id_by_pair), and
                    // _outbound_edge_ids fills in declaration order — so the old
                    // first-match outbound scan always resolved to this same edgeId.
                    // Direct read replaces the O(out-degree) object-deref scan; the
                    // first-declared-kind semantics are pinned by the parallel-edge
                    // transition-kind hook spec.  #735
                    trans_type = this._edges[edgeId].kind;
                }
                valid = true;
                newState = newStateOrAction;
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
                data: this._data,
                action: fromAction,
                from: this._state,
                to: newState,
                next_data: newData,
                forced: wasForced,
                // sound: the only values ever assigned to trans_type are an edge's
                // `kind` and the literal 'forced'.  The local is typed `string` only
                // to keep tsc's flow analysis off it (see its declaration above).
                trans_type: trans_type
            }
            : undefined;
        const hook_args = hook_args_obj;
        // 'action' event fires when an action is attempted, regardless of whether
        // it ultimately succeeds — matches the issue spec for observation events.
        // Gated on live listener count so we skip the detail-object allocation
        // when nothing is subscribed.  Gate is read at fire time, so a listener
        // registered inside a pre-hook still receives the event.  #671
        if (wasAction && this._event_listener_count !== 0) {
            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'action', {
                action: newStateOrAction,
                from: this._state,
                to: newState,
                data: this._data,
                next_data: newData
            });
        }
        // Captured pre-transition source state so 'data-change' detail and similar
        // events can name where we came from.  fromStateId mirrors it for the
        // numeric post-hook probes: by the time they run, _state_id is already
        // the destination (#729).
        const fromState = this._state;
        const fromStateId = this._state_id;
        const oldData = this._data;
        if (valid) {
            if (this._has_hooks) {
                // Open the pre-commit window: from here until the commit below, any
                // reentrant transition_impl call (a hook transitioning the machine)
                // throws instead of being silently reverted.  The `finally` below closes
                // it on every exit path; #fire_hook_rejection additionally clears it
                // before firing the rejection event so a rejection listener may itself
                // transition.  The pipeline body is intentionally left at its original
                // indentation to keep this fix's diff focused.  #1953
                this._committing_transition = true;
                try {
                    let data_changed = false;
                    // 0. pre everything hook (fires before all other pre-hooks)
                    if (this._pre_everything_hook !== undefined) {
                        const outcome = abstract_everything_hook_step(this._pre_everything_hook, Object.assign(Object.assign({}, hook_args), { hook_name: 'pre everything' }));
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'pre everything', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                    }
                    if (wasAction) {
                        // 1a. any action hook
                        const outcome = abstract_hook_step(this._any_action_hook, hook_args);
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'any action', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                        // 1b. global specific action hook
                        const outcome2 = abstract_hook_step(this._global_action_hooks.get(actionId), hook_args);
                        if (!outcome2.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'global action', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome2)) {
                            data_changed = true;
                        }
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
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'any transition', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                    }
                    // 4. exit hook
                    if (this._has_exit_hooks) {
                        const outcome = abstract_hook_step(this._exit_hooks.get(this._state_id), hook_args);
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'exit', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                    }
                    // shared by steps 5 and 6: pre-commit, this._state_id is still the
                    // from-state, so both probes key on the same pair; compute it once
                    const pre_pair_id = pair_key(this._state_id, newStateId);
                    // 5. named transition / action hook
                    if (this._has_named_hooks && wasAction) {
                        // Numeric pair probe, then the action id captured at dispatch (#729).
                        const byPair = this._named_hooks.get(pre_pair_id);
                        const nh = byPair === undefined ? undefined : byPair.get(actionId);
                        const outcome = abstract_hook_step(nh, hook_args);
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'named', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                    }
                    // 6. regular hook
                    if (this._has_basic_hooks) {
                        // Numeric pair probe (#729); one integer hash replaces two string maps.
                        const h = this._hooks.get(pre_pair_id);
                        const outcome = abstract_hook_step(h, hook_args);
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'hook', fromState, newState, fromAction, oldData, newData, wasForced);
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
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'standard transition', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                        // 7b. main type hook
                    }
                    else if (trans_type === 'main') {
                        const outcome = abstract_hook_step(this._main_transition_hook, hook_args);
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'main transition', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                        // 7c. forced transition hook
                    }
                    else if (trans_type === 'forced') {
                        const outcome = abstract_hook_step(this._forced_transition_hook, hook_args);
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'forced transition', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                    }
                    // 8. entry hook
                    if (this._has_entry_hooks) {
                        const outcome = abstract_hook_step(this._entry_hooks.get(newStateId), hook_args);
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'entry', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                    }
                    // 9. everything hook (fires after all other pre-hooks)
                    if (this._everything_hook !== undefined) {
                        const outcome = abstract_everything_hook_step(this._everything_hook, Object.assign(Object.assign({}, hook_args), { hook_name: 'everything' }));
                        if (!outcome.pass) {
                            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_hook_rejection).call(this, 'everything', fromState, newState, fromAction, oldData, newData, wasForced);
                            return false;
                        }
                        if (_update_hook_fields(hook_args, outcome)) {
                            data_changed = true;
                        }
                    }
                    // all hooks passed!  let's now establish the result
                    // a hook may have redirected the destination via a complex result's
                    // `state` (carried on hook_args.to).  Apply it now, validating it names
                    // a real state.  Pre-transition hooks (including entry/exit) fired for
                    // the original edge; the committed state and the post-hooks, observation
                    // events, and after-timer all reflect the override.  Last writer wins.
                    // StoneCypher/fsl#1947
                    if (hook_args.to !== newState) {
                        const override_id = this._state_interner.id_of(hook_args.to);
                        if (override_id === undefined) {
                            throw new JssmError(this, `A hook overrode the transition destination to '${hook_args.to}', which is not a state in this machine`);
                        }
                        newState = hook_args.to;
                        newStateId = override_id;
                    }
                    if (this._history_length) {
                        this._history.shove([this._state, this._data]);
                    }
                    this._state = newState;
                    this._state_id = newStateId;
                    if (data_changed) {
                        this._data = hook_args.next_data;
                    }
                    else if (dataProvided) {
                        this._data = newData;
                    }
                    // success fallthrough to posthooks; intentionally no return here
                    // look for "posthooks begin here"
                }
                finally {
                    // Close the pre-commit window on EVERY exit from the pipeline: normal
                    // fallthrough after commit, a hook veto's `return false`, the
                    // destination-override throw, or a user hook throwing.  Post-hooks and
                    // the boundary-action cascade run after this and may re-enter the
                    // machine coherently from the committed state.  #1953
                    this._committing_transition = false;
                }
                // or without hooks
            }
            else {
                if (this._history_length) {
                    this._history.shove([this._state, this._data]);
                }
                this._state = newState;
                this._state_id = newStateId;
                // provision is detected by caller arity, so an explicit `undefined`
                // commits while an omitted argument preserves (StoneCypher/fsl#1264)
                if (dataProvided) {
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
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'rejection', {
                    from: fromState,
                    to: newStateOrAction, // we never resolved a real target
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
                const pgah = this._post_global_action_hooks.get(actionId);
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
                const peh = this._post_exit_hooks.get(fromStateId);
                if (peh !== undefined) {
                    peh(hook_args);
                }
            }
            // shared by steps 5 and 6: post-commit this._state_id has moved on, so
            // the from-side of the pair comes from the captured fromStateId;
            // compute it once
            const post_pair_id = pair_key(fromStateId, newStateId);
            // 5. named transition / action hook
            if (this._has_post_named_hooks && wasAction) {
                // Numeric pair probe, then the action id captured at dispatch (#729).
                const byPair = this._post_named_hooks.get(post_pair_id);
                const pnh = byPair === undefined ? undefined : byPair.get(actionId);
                if (pnh !== undefined) {
                    pnh(hook_args);
                }
            }
            // 6. regular hook
            if (this._has_post_basic_hooks) {
                // Numeric pair probe (#729).
                const hook = this._post_hooks.get(post_pair_id);
                if (hook !== undefined) {
                    hook(hook_args);
                }
            }
            // 7. edge type hook
            // 7a. standard transition hook
            if (trans_type === 'legal' && this._post_standard_transition_hook !== undefined) {
                this._post_standard_transition_hook(hook_args);
            }
            // 7b. main type hook
            if (trans_type === 'main' && this._post_main_transition_hook !== undefined) {
                this._post_main_transition_hook(hook_args);
            }
            // 7c. forced transition hook
            if (trans_type === 'forced' && this._post_forced_transition_hook !== undefined) {
                this._post_forced_transition_hook(hook_args);
            }
            // 8. entry hook
            if (this._has_post_entry_hooks) {
                const hook = this._post_entry_hooks.get(newStateId);
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
            // per-name gates: each detail literal below is only built when that
            // specific event has a live subscriber — a single-purpose panel
            // listening only to 'transition' previously paid for the exit/entry/
            // data-change/terminal/complete allocations _fire then discarded.
            // Gates read at fire time, like the outer count, preserving #671.
            if (__classPrivateFieldGet(this, _Machine_instances, "m", _Machine_has_subscribers).call(this, 'exit')) {
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'exit', {
                    state: fromState,
                    to: newState,
                    action: fromAction,
                    data: newData_after
                });
            }
            if (__classPrivateFieldGet(this, _Machine_instances, "m", _Machine_has_subscribers).call(this, 'transition')) {
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'transition', {
                    from: fromState,
                    to: newState,
                    action: fromAction,
                    data: newData_after,
                    next_data: newData,
                    trans_type,
                    forced: wasForced
                });
            }
            if (__classPrivateFieldGet(this, _Machine_instances, "m", _Machine_has_subscribers).call(this, 'entry')) {
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'entry', {
                    state: newState,
                    from: fromState,
                    action: fromAction,
                    data: newData_after
                });
            }
            if ((oldData !== newData_after) && __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_has_subscribers).call(this, 'data-change')) {
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'data-change', {
                    from: fromState,
                    to: newState,
                    action: fromAction,
                    old_data: oldData,
                    new_data: newData_after,
                    cause: 'transition'
                });
            }
            // one state-record fetch answers both checks; newState is known-valid
            // here, and the public state_is_terminal / state_is_complete pair would
            // each redo has_state plus its own map walk.  Same predicates:
            // terminal = no exits, complete = the constructor-set flag.  #735
            const new_state_rec = this._states.get(newState);
            if ((new_state_rec.to.length === 0) && __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_has_subscribers).call(this, 'terminal')) {
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'terminal', { state: newState, data: newData_after });
            }
            if (new_state_rec.complete && __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_has_subscribers).call(this, 'complete')) {
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'complete', { state: newState, data: newData_after });
            }
        }
        // FSL boundary-hook actions (`on enter/exit &g do 'X'`) fire after the
        // state is committed and after the observation events, matching the
        // statechart "exits before enters" convention.  Cascades are depth-bounded
        // inside the helper.
        __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_boundary_actions).call(this, fromState, newState);
        // Clear the departed state's `after` timer and re-establish the new state's,
        // now that the transition has actually committed.  This clear runs only on a
        // successful commit -- a hook that VETOES the transition returns above, so
        // the machine stays put and its pending `after` timer is preserved
        // (StoneCypher/fsl#1945).  It still runs for hook-free machines, so a manual
        // transition away cannot leave a ghost timer to fire a stray go() later
        // (the fsl#1327 guarantee).  The clear must precede the arm because
        // set_state_timeout throws if a timer is already pending.
        this.clear_state_timeout();
        this.auto_set_state_timeout();
        return true;
    }
    /**
     * If the current state has an `after` timeout configured, schedule it.
     *  Called internally after each transition.
     */
    auto_set_state_timeout() {
        // called on every successful transition-commit.  Machines with no `after`
        // clauses at all (the overwhelmingly common case) previously still paid a
        // string hash + map probe here per transition; one integer size read
        // short-circuits that.
        if (this._after_mapping.size === 0) {
            return;
        }
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
        // arity, not undefined-comparison: an explicit `undefined` is a real
        // data assignment (StoneCypher/fsl#1264)
        return this.transition_impl(actionName, newData, false, true, arguments.length >= 2);
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @returns The {@link JssmStateConfig} for the active state.
     *
     */
    get active_state_style() {
        return this._active_state_style;
    }
    /********
     *
     *  Generate the uniform observational-hook registry — every currently
     *  registered hook projected onto a normalized `(kind, target, phase)` row
     *  (megaspec §12, → #1357).  The registry is *generated* on demand by
     *  walking the concrete per-kind storage tables rather than maintained as a
     *  second copy, so it can never drift from the tables {@link Machine.set_hook}
     *  actually dispatches into.  It is the single source of truth behind the
     *  introspection accessors ({@link Machine.has_hook}, {@link Machine.hooks_on})
     *  and the `hooked_state` viz styling.
     *
     *  Targets are normalized: edge hooks become `{ scope: 'edge', from, to }`
     *  (named hooks add `action`), entry/exit/after become `{ scope: 'state' }`,
     *  global-action hooks become `{ scope: 'action' }`, and the `any-*`,
     *  transition-class, and `everything` observers become `{ scope: 'global' }`.
     *
     *  ```typescript
     *  const m = sm`a 'go' -> b;`;
     *  m.hook_entry('b', () => true);
     *  m.hook_registry();
     *  // => [ { kind: 'entry', phase: 'pre', target: { scope: 'state', state: 'b' } } ]
     *  ```
     *
     *  @returns Every registered hook as a {@link HookRegistryEntry}, in a stable
     *  table-walk order (pre-phase tables first, then post-phase).
     *
     */
    hook_registry() {
        const entries = [];
        // The hot-path hook tables are keyed by interned integer ids (states and
        // actions) and, for edges, by `pair_key(from_id, to_id)`.  Decode each key
        // back to its original name so the registry speaks states/actions, never
        // ids.  The lone exception is `_after_hooks`, deliberately string-keyed.
        const state_name = (id) => this._state_interner.name_of(id);
        const action_name = (id) => this._action_interner.name_of(id);
        // edge tables: pair_key(from_id, to_id) -> handler
        const push_edges = (table, kind, phase) => {
            table.forEach((_handler, pk) => {
                const [fid, tid] = un_pair_key(pk);
                entries.push({ kind, phase, target: { scope: 'edge', from: state_name(fid), to: state_name(tid) } });
            });
        };
        // named-edge tables: pair_key(from_id, to_id) -> action_id -> handler
        const push_named = (table, kind, phase) => {
            table.forEach((byAction, pk) => {
                const [fid, tid] = un_pair_key(pk);
                const from = state_name(fid), to = state_name(tid);
                byAction.forEach((_handler, aid) => {
                    entries.push({ kind, phase, target: { scope: 'edge', from, to, action: action_name(aid) } });
                });
            });
        };
        // entry/exit tables: interned state_id -> handler
        const push_states = (table, kind, phase) => {
            table.forEach((_handler, sid) => {
                entries.push({ kind, phase, target: { scope: 'state', state: state_name(sid) } });
            });
        };
        // the `after` table is the lone string-keyed exception: state name -> handler
        const push_states_by_name = (table, kind, phase) => {
            table.forEach((_handler, state) => {
                entries.push({ kind, phase, target: { scope: 'state', state: state } });
            });
        };
        // global-action tables: interned action_id -> handler
        const push_actions = (table, kind, phase) => {
            table.forEach((_handler, aid) => {
                entries.push({ kind, phase, target: { scope: 'action', action: action_name(aid) } });
            });
        };
        const push_global = (handler, kind, phase) => {
            if (handler !== undefined) {
                entries.push({ kind, phase, target: { scope: 'global' } });
            }
        };
        // FSL boundary hooks: subject name -> { onEnter?, onExit? }, fired post-
        // commit.  Each present direction becomes its own row, all phase 'post'.
        const push_boundary = (table, enterKind, exitKind, target_of) => {
            table.forEach((bh, subject) => {
                if (bh.onEnter !== undefined) {
                    entries.push({ kind: enterKind, phase: 'post', target: target_of(subject) });
                }
                if (bh.onExit !== undefined) {
                    entries.push({ kind: exitKind, phase: 'post', target: target_of(subject) });
                }
            });
        };
        // pre-phase, edge- and state-keyed tables
        push_edges(this._hooks, 'hook', 'pre');
        push_named(this._named_hooks, 'named', 'pre');
        push_states(this._entry_hooks, 'entry', 'pre');
        push_states(this._exit_hooks, 'exit', 'pre');
        push_states_by_name(this._after_hooks, 'after', 'pre');
        push_actions(this._global_action_hooks, 'global action', 'pre');
        // pre-phase, global singletons
        push_global(this._any_action_hook, 'any action', 'pre');
        push_global(this._standard_transition_hook, 'standard transition', 'pre');
        push_global(this._main_transition_hook, 'main transition', 'pre');
        push_global(this._forced_transition_hook, 'forced transition', 'pre');
        push_global(this._any_transition_hook, 'any transition', 'pre');
        push_global(this._after_any_hook, 'after any', 'pre');
        push_global(this._pre_everything_hook, 'pre everything', 'pre');
        push_global(this._everything_hook, 'everything', 'pre');
        // post-phase, edge- and state-keyed tables
        push_edges(this._post_hooks, 'post hook', 'post');
        push_named(this._post_named_hooks, 'post named', 'post');
        push_states(this._post_entry_hooks, 'post entry', 'post');
        push_states(this._post_exit_hooks, 'post exit', 'post');
        push_actions(this._post_global_action_hooks, 'post global action', 'post');
        // post-phase, global singletons
        push_global(this._post_any_action_hook, 'post any action', 'post');
        push_global(this._post_standard_transition_hook, 'post standard transition', 'post');
        push_global(this._post_main_transition_hook, 'post main transition', 'post');
        push_global(this._post_forced_transition_hook, 'post forced transition', 'post');
        push_global(this._post_any_transition_hook, 'post any transition', 'post');
        push_global(this._pre_post_everything_hook, 'pre post everything', 'post');
        push_global(this._post_everything_hook, 'post everything', 'post');
        // FSL boundary hooks (post-commit): group and plain-state subjects
        push_boundary(this._group_hooks, 'group enter', 'group exit', (group) => ({ scope: 'group', group }));
        push_boundary(this._state_hooks, 'state enter', 'state exit', (state) => ({ scope: 'state', state: state }));
        return entries;
    }
    /********
     *
     *  Does a single registry entry reference the state `state`?  An entry
     *  references a state when it is a `'state'`-scoped hook on that state, or an
     *  `'edge'`-scoped hook whose `from` or `to` is that state.  `'action'`- and
     *  `'global'`-scoped entries reference no particular state.  This is the
     *  predicate behind both per-state introspection and the `hooked_state`
     *  styling layer.
     *
     *  @param entry The registry entry to test.
     *  @param state The state name to test membership of.
     *  @returns `true` when the entry observes that state.
     *
     */
    static _entry_touches_state(entry, state) {
        const t = entry.target;
        if (t.scope === 'state') {
            return t.state === state;
        }
        if (t.scope === 'edge') {
            return t.from === state || t.to === state;
        }
        return false;
    }
    /********
     *
     *  Does a single registry entry match a `{ from, to, action? }` edge query?
     *  Only `'edge'`-scoped entries can match.  When the query omits `action`
     *  the entry's action (if any) is ignored; when the query supplies `action`
     *  it must match exactly.
     *
     *  @param entry The registry entry to test.
     *  @param from  The edge origin to match.
     *  @param to    The edge destination to match.
     *  @param action Optional named action to match exactly.
     *  @returns `true` when the entry observes that edge.
     *
     */
    static _entry_matches_edge(entry, from, to, action) {
        const t = entry.target;
        if (t.scope !== 'edge') {
            return false;
        }
        if (t.from !== from || t.to !== to) {
            return false;
        }
        if (action !== undefined) {
            return t.action === action;
        }
        return true;
    }
    /********
     *
     *  Does a single registry entry match an action name?  Both `'action'`-scoped
     *  hooks (global-action hooks) and named-edge hooks carrying that action
     *  count as matches.
     *
     *  @param entry  The registry entry to test.
     *  @param action The action name to match.
     *  @returns `true` when the entry observes that action.
     *
     */
    static _entry_matches_action(entry, action) {
        const t = entry.target;
        if (t.scope === 'action') {
            return t.action === action;
        }
        if (t.scope === 'edge') {
            return t.action === action;
        }
        return false;
    }
    /********
     *
     *  Does a single registry entry match a named state group?  Only
     *  `'group'`-scoped entries (FSL group-boundary hooks) match.  Group hooks
     *  are matched by group name only — they deliberately do not propagate to
     *  member states, so a member-state query never returns them.
     *
     *  @param entry The registry entry to test.
     *  @param group The group name to match.
     *  @returns `true` when the entry observes that group's boundary.
     *
     */
    static _entry_matches_group(entry, group) {
        const t = entry.target;
        if (t.scope === 'group') {
            return t.group === group;
        }
        return false;
    }
    /********
     *
     *  Return every registry entry observing the given target (megaspec §12).
     *  The `query` selects the target shape:
     *
     *  - a bare **state name** matches entry/exit/after hooks on that state, its
     *    state-boundary hooks, and every edge hook touching it (`from` or `to`),
     *  - a `{ from, to, action? }` **edge** matches edge hooks on that
     *    transition (optionally narrowed to the named action),
     *  - a `{ action }` **action** matches global-action and named-edge hooks
     *    carrying that action,
     *  - a `{ group }` **group** matches that group's boundary hooks (group hooks
     *    are matched by name only and do not propagate to member states).
     *
     *  ```typescript
     *  const m = sm`a 'go' -> b;`;
     *  m.hook_entry('b', () => true);
     *  m.hooks_on('b').length;             // 1
     *  m.hooks_on({ from: 'a', to: 'b' }); // []  (no edge hook registered)
     *  ```
     *
     *  @param query The {@link HookQuery} naming the target to inspect.
     *  @returns The matching {@link HookRegistryEntry} rows (possibly empty).
     *
     */
    hooks_on(query) {
        const registry = this.hook_registry();
        if (typeof query === 'string') {
            return registry.filter(e => Machine._entry_touches_state(e, query));
        }
        // An edge query is distinguished by carrying `from` (it may *also* carry
        // `action`, which narrows the edge — so this must be tested before the
        // action-only case, whose discriminator `action` an edge query can share).
        if ('from' in query) {
            return registry.filter(e => Machine._entry_matches_edge(e, query.from, query.to, query.action));
        }
        if ('group' in query) {
            return registry.filter(e => Machine._entry_matches_group(e, query.group));
        }
        return registry.filter(e => Machine._entry_matches_action(e, query.action));
    }
    /********
     *
     *  Is at least one observational hook bound to the given target (megaspec
     *  §12)?  The `query` is read exactly as in {@link Machine.hooks_on}.  An
     *  optional `phase` narrows the test to pre- or post-transition hooks only;
     *  omitted, either phase satisfies it.
     *
     *  ```typescript
     *  const m = sm`a -> b;`;
     *  m.has_hook('b');                 // false
     *  m.hook_entry('b', () => true);
     *  m.has_hook('b');                 // true
     *  m.has_hook('b', 'post');         // false  (the entry hook is pre-phase)
     *  ```
     *
     *  @param query The {@link HookQuery} naming the target to inspect.
     *  @param phase Optional {@link HookPhase} to restrict the test to.
     *  @returns `true` when a matching hook exists.
     *
     */
    has_hook(query, phase) {
        const matches = this.hooks_on(query);
        if (phase === undefined) {
            return matches.length > 0;
        }
        return matches.some(e => e.phase === phase);
    }
    /********
     *
     *  Does the given state carry any observational hook — i.e. should it receive
     *  the `hooked_state` viz styling?  True when an entry/exit/after hook is
     *  bound to the state, any edge hook touches it, or the state has its own
     *  boundary hook.  Group-boundary hooks do *not* count here — they are
     *  matched by group only and never propagate to member states.  Powers the
     *  `hooked` styling layer in {@link Machine.resolve_state_config}; replaces
     *  the long-stubbed `has_hooks` placeholder (megaspec §12).
     *
     *  ```typescript
     *  const m = sm`a -> b;`;
     *  m.state_has_hooks('a');          // false
     *  m.hook_exit('a', () => true);
     *  m.state_has_hooks('a');          // true
     *  ```
     *
     *  @param state The state to test.
     *  @returns `true` when the state is observed by at least one hook.
     *
     */
    state_has_hooks(state) {
        // Boundary hooks are a separate mechanism that sets neither _has_hooks nor
        // _has_post_hooks, so the fast-out must also consult the boundary tables —
        // otherwise a state whose only hook is a boundary hook reports unhooked.
        if (!this._has_hooks
            && !this._has_post_hooks
            && (this._state_hooks.size === 0)
            && (this._group_hooks.size === 0)) {
            return false;
        }
        return this.hook_registry().some(e => Machine._entry_touches_state(e, state));
    }
    /********
     *
     *  Resolves the full unified style/config cascade for a state — the runtime
     *  successor to the ad-hoc layer merge {@link style_for} used to perform.
     *
     *  For any state OTHER than the current one, this returns the memoized static
     *  resolution (tiers 1–5; see `_compose_state_config`) — theme →
     *  `default_state_config` → per-kind defaults → depth-ordered group metadata →
     *  per-state config.  The cache is keyed by state; those tiers do not depend
     *  on which state is current, so it survives transitions, but the mutable
     *  cascade inputs each clear it when they change — hook registration and
     *  removal ({@link Machine.set_hook}, {@link Machine.remove_hook}; the
     *  hooked layer) and theme assignment (the `themes` setter; tier 1 and the
     *  per-kind theme layers).
     *
     *  For the machine's CURRENTLY-occupied state the result is recomputed each
     *  call (never cached) and additionally carries the dynamic `active_state`
     *  layers: the active-state THEME layers fold in just below the per-state
     *  config (tier 3-active), and the user `active_state : { … }` overlay folds
     *  in LAST (tier 6), on top of everything, so it wins over per-state config.
     *  Every fold uses `merge_state_config`, so a key set at a lower tier is
     *  overridden — never rejected — by a higher one.
     *
     *  ```typescript
     *  import { sm } from 'jssm';
     *
     *  const m = sm`&busy : [working]; idle 'go' -> working; state &busy : { color: orange; };`;
     *  m.resolve_state_config('working').color;  // '#ffa500ff' — from group &busy
     *  ```
     *
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param state The state to compute the composite config for.
     *
     *  @returns The fully composited {@link JssmStateConfig} for the state,
     *  including the active overlay when the state is current.
     *
     *  @see style_for
     *
     */
    resolve_state_config(state) {
        // The current state carries the dynamic active layers and is recomputed
        // each call so the overlay tracks transitions; it is never memoized.
        if (this.state() === state) {
            const acc = __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_compose_state_config).call(this, state, true);
            // tier 6 — user active_state overlay, on top of per-state config.
            return merge_state_config(acc, this._active_state_style);
        }
        // Non-current states: tiers 1–5 only, memoized.
        const cached = this._static_state_config_cache.get(state);
        if (cached !== undefined) {
            return cached;
        }
        const resolved = __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_compose_state_config).call(this, state, false);
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param state The state to compute the composite style for.
     *
     *  @returns The fully composited {@link JssmStateConfig} for the given state.
     *
     *  @see resolve_state_config
     *
     */
    style_for(state) {
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
        return this.transition_impl(actionName, newData, false, true, arguments.length >= 2);
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition
     *
     *  @returns `true` if the transition was legal and occurred, `false` otherwise.
     *
     */
    transition(newState, newData) {
        return this.transition_impl(newState, newData, false, false, arguments.length >= 2);
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
     *  @typeParam mDT The type of the machine data member; usually omitted
     *
     *  @param newState The state to switch to
     *
     *  @param newData The data change to insert during the transition
     *
     *  @returns `true` if the transition was legal and occurred, `false` otherwise.
     *
     */
    go(newState, newData) {
        return this.transition_impl(newState, newData, false, false, arguments.length >= 2);
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
     *  @typeParam mDT The type of the machine data member; usually omitted
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
        return this.transition_impl(newState, newData, true, false, arguments.length >= 2);
    }
    /**
     * Get the edge index for an action from the current state.
     *  Interned dispatch: resolves via the numeric (action, from) index —
     *  unknown action names miss without throwing.
     *  @param action - The action name.
     *  @returns The edge index, or `undefined` if the action is not available.
     */
    current_action_for(action) {
        const action_id = this._action_interner.id_of(action);
        return (action_id === undefined)
            ? undefined
            : this._edge_id_by_action_pair.get(pair_key(action_id, this._state_id));
    }
    /**
     * Get the full transition object for an action from the current state.
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
    /**
     * Check whether an action is available from the current state.
     *  @param action   - The action name to check.
     *  @param _newData - Reserved for future data validation.
     *  @returns `true` if the action can be taken.
     */
    valid_action(action, _newData) {
        // todo whargarbl implement data stuff
        // todo major incomplete whargarbl comeback
        return this.current_action_for(action) !== undefined;
    }
    /**
     * Check whether a transition to a given state is legal (non-forced) from
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
    /**
     * Check whether a forced transition to a given state exists from the
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
    /**
     * Get the instance name of this machine, if one was assigned at creation.
     *  @returns The instance name string, or `undefined`.
     */
    instance_name() {
        return this._instance_name;
    }
    /**
     * Get the creation date of this machine as a `Date` object.
     *  @returns A `Date` representing when the machine was created.
     */
    get creation_date() {
        return new Date(Math.floor(this.creation_timestamp));
    }
    /**
     * Get the creation timestamp (milliseconds since epoch).
     *  @returns The timestamp as a number.
     */
    get creation_timestamp() {
        return this._created;
    }
    /**
     * Get the timestamp when construction began (before parsing).
     *  @returns The start-of-construction timestamp as a number.
     */
    get create_start_time() {
        return this._create_started;
    }
    /**
     * Schedule an automatic transition to `next_state` after `after_time`
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
                // a specific after hook firing implies the any-after hook fires too,
                // afterward; and it also fires alone (StoneCypher/fsl#1299)
                if (this._after_any_hook !== undefined) {
                    this._after_any_hook({ data: this._data, next_data: this._data });
                }
            }
            __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'timeout', { from: from_state, to: next_state, after_time });
            this.go(next_state);
        }, after_time);
        this._timeout_target = next_state;
        this._timeout_target_time = after_time;
    }
    /**
      Cancel any pending state timeout.  Safe to call when no timeout is active.
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
    /**
     * Get the configured `after` timeout for a given state, if any.
     *  @param which_state - The state to look up.
     *  @returns A `[targetState, delayMs]` tuple, or `undefined` if no timeout
     *  is configured for that state.
     */
    state_timeout_for(which_state) {
        return this._after_mapping.get(which_state);
    }
    /**
     * Get the configured `after` timeout for the current state, if any.
     *  @returns A `[targetState, delayMs]` tuple, or `undefined`.
     */
    current_state_timeout() {
        return (this._timeout_target === undefined)
            ? undefined
            : [this._timeout_target, this._timeout_target_time];
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
}
_Machine_instances = new WeakSet(), _Machine_unsubscribe_entry = function _Machine_unsubscribe_entry(set, entry) {
    if (set.delete(entry)) {
        this._event_listener_count--;
    }
}, _Machine_subscribe = function _Machine_subscribe(name, filterOrFn, maybeFn, once) {
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
    return () => { __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_unsubscribe_entry).call(this, set, entry); };
}, _Machine_fire_one = function _Machine_fire_one(entry, set, name, detail) {
    // filter check
    if (entry.filter !== undefined) {
        for (const [k, v] of Object.entries(entry.filter)) {
            if (v !== detail[k]) {
                return;
            }
        }
    }
    // once removal happens BEFORE invocation so a throwing handler still
    // gets removed and so re-entrant `on` calls during the handler see
    // the post-removal state.
    if (entry.once) {
        __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_unsubscribe_entry).call(this, set, entry);
    }
    try {
        entry.handler(detail);
    }
    catch (error) {
        if (name === 'error' || this._firing_error) {
            // surface to stderr as a last resort but never recurse;
            // `console` is in the JS standard library and present in every
            // supported runtime, so guarding it would just add an untestable
            // branch.  See #638.
            console.error(error);
        }
        else {
            this._firing_error = true;
            try {
                __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'error', {
                    error: error,
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
}, _Machine_has_subscribers = function _Machine_has_subscribers(name) {
    const set = this._event_handlers.get(name);
    return (set !== undefined) && (set.size > 0);
}, _Machine_fire = function _Machine_fire(name, detail) {
    const set = this._event_handlers.get(name);
    if (set === undefined || set.size === 0) {
        return;
    }
    // Fast-path: single subscriber — capture entry before invoking so that
    // even if the handler mutates `set` (via off/once auto-removal) we hold a
    // stable reference.  Behaviorally identical to a 1-element snapshot.
    if (set.size === 1) {
        const only = set.values().next().value;
        __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_one).call(this, only, set, name, detail);
        return;
    }
    // General path: snapshot so handlers can `off()` mid-loop without
    // disturbing iteration.
    const entries = [...set];
    for (const entry of entries) {
        __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire_one).call(this, entry, set, name, detail);
    }
}, _Machine_validate_hook_description = function _Machine_validate_hook_description(HookDesc) {
    const required = hook_required_fields[HookDesc.kind];
    if (required === undefined) {
        throw new JssmError(this, `unknown hook kind ${JSON.stringify(HookDesc.kind)}`);
    }
    if (typeof HookDesc.handler !== 'function') {
        throw new JssmError(this, `${HookDesc.kind} hook requires a handler function`);
    }
    for (const field of hook_spatial_fields) {
        const needed = required.includes(field);
        const value = HookDesc[field];
        // a required spatial field must be a usable key: a non-empty string.
        // presence alone isn't enough — `action: false` or `from: ''` would
        // register a hook nothing can ever fire (fsl#653, fsl#659)
        if (needed && ((typeof value !== 'string') || (value === ''))) {
            throw new JssmError(this, `${HookDesc.kind} hook requires '${field}' to be a non-empty string`);
        }
        if (!needed && (value !== undefined)) {
            throw new JssmError(this, `${HookDesc.kind} hook does not take '${field}'`);
        }
    }
}, _Machine_recompute_hook_flags = function _Machine_recompute_hook_flags() {
    const nested_has = (m) => [...m.values()].some(inner => inner.size > 0);
    // pre-hook family flags
    this._has_basic_hooks = this._hooks.size > 0;
    this._has_named_hooks = nested_has(this._named_hooks);
    this._has_entry_hooks = this._entry_hooks.size > 0;
    this._has_exit_hooks = this._exit_hooks.size > 0;
    this._has_after_hooks = [this._after_hooks.size > 0, this._after_any_hook !== undefined].includes(true);
    this._has_global_action_hooks = this._global_action_hooks.size > 0;
    this._has_transition_hooks = [
        this._standard_transition_hook !== undefined,
        this._main_transition_hook !== undefined,
        this._forced_transition_hook !== undefined,
    ].includes(true);
    this._has_hooks = [
        this._has_basic_hooks,
        this._has_named_hooks,
        this._has_entry_hooks,
        this._has_exit_hooks,
        this._has_after_hooks,
        this._has_global_action_hooks,
        this._has_transition_hooks,
        this._any_action_hook !== undefined,
        this._any_transition_hook !== undefined,
        this._pre_everything_hook !== undefined,
        this._everything_hook !== undefined,
    ].includes(true);
    // post-hook family flags (mirror of the above)
    this._has_post_basic_hooks = this._post_hooks.size > 0;
    this._has_post_named_hooks = nested_has(this._post_named_hooks);
    this._has_post_entry_hooks = this._post_entry_hooks.size > 0;
    this._has_post_exit_hooks = this._post_exit_hooks.size > 0;
    this._has_post_global_action_hooks = this._post_global_action_hooks.size > 0;
    this._has_post_transition_hooks = [
        this._post_standard_transition_hook !== undefined,
        this._post_main_transition_hook !== undefined,
        this._post_forced_transition_hook !== undefined,
    ].includes(true);
    this._has_post_hooks = [
        this._has_post_basic_hooks,
        this._has_post_named_hooks,
        this._has_post_entry_hooks,
        this._has_post_exit_hooks,
        this._has_post_global_action_hooks,
        this._has_post_transition_hooks,
        this._post_any_action_hook !== undefined,
        this._post_any_transition_hook !== undefined,
        this._pre_post_everything_hook !== undefined,
        this._post_everything_hook !== undefined,
    ].includes(true);
}, _Machine_fire_hook_rejection = function _Machine_fire_hook_rejection(hook_name, fromState, newState, fromAction, oldData, newData, wasForced) {
    // Every hook veto in transition_impl's pre-commit pipeline exits through
    // here, so this is the single close point for the reentrancy guard on the
    // rejection path: clear it before firing the event so a `rejection` listener
    // may itself transition (the outer transition is abandoned, not reverted).
    // #1953
    this._committing_transition = false;
    __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_fire).call(this, 'rejection', {
        from: fromState,
        to: newState,
        action: fromAction,
        data: oldData,
        next_data: newData,
        reason: 'hook',
        hook_name,
        forced: wasForced
    });
}, _Machine_fire_boundary_actions = function _Machine_fire_boundary_actions(prev_state, next_state) {
    var _a, _b, _c, _d, _e, _f;
    // Nothing crosses a boundary when the state name is unchanged.
    if (prev_state === next_state) {
        return;
    }
    // Skip entirely for machines that declared no boundary hooks at all — the
    // overwhelming common case, and it keeps the hot transition path free of
    // set arithmetic.
    if (this._group_hooks.size === 0 && this._state_hooks.size === 0) {
        return;
    }
    if (this._boundary_depth >= this._boundary_depth_limit) {
        throw new JssmError(this, `boundary-hook action cascade exceeded depth limit (${this._boundary_depth_limit}) `
            + `crossing from ${JSON.stringify(prev_state)} to ${JSON.stringify(next_state)} `
            + `(possible infinite loop)`);
    }
    const prev_groups = (_a = this._state_to_groups.get(prev_state)) !== null && _a !== void 0 ? _a : empty_string_set;
    const next_groups = (_b = this._state_to_groups.get(next_state)) !== null && _b !== void 0 ? _b : empty_string_set;
    // The labels to dispatch, gathered before any firing so that re-entrant
    // transitions caused by an early action cannot perturb which boundaries the
    // *current* crossing fires.  Exits precede enters (statechart convention).
    const labels = [];
    // Exits: groups left (in prev but not next), then the plain prev state.
    for (const group of prev_groups) {
        if (next_groups.has(group)) {
            continue;
        }
        const label = (_c = this._group_hooks.get(group)) === null || _c === void 0 ? void 0 : _c.onExit;
        if (label !== undefined) {
            labels.push(label);
        }
    }
    const prev_state_exit = (_d = this._state_hooks.get(prev_state)) === null || _d === void 0 ? void 0 : _d.onExit;
    if (prev_state_exit !== undefined) {
        labels.push(prev_state_exit);
    }
    // Enters: groups entered (in next but not prev), then the plain next state.
    for (const group of next_groups) {
        if (prev_groups.has(group)) {
            continue;
        }
        const label = (_e = this._group_hooks.get(group)) === null || _e === void 0 ? void 0 : _e.onEnter;
        if (label !== undefined) {
            labels.push(label);
        }
    }
    const next_state_enter = (_f = this._state_hooks.get(next_state)) === null || _f === void 0 ? void 0 : _f.onEnter;
    if (next_state_enter !== undefined) {
        labels.push(next_state_enter);
    }
    if (labels.length === 0) {
        return;
    }
    // Each dispatched action re-enters transition_impl, which (on success) calls
    // back here for the boundary it just crossed.  The depth counter brackets
    // the whole fan-out so a self-perpetuating cascade is bounded, not infinite.
    this._boundary_depth += 1;
    try {
        for (const label of labels) {
            this.action(label); // safe no-op (returns false) if inapplicable here
        }
    }
    finally {
        this._boundary_depth -= 1;
    }
}, _Machine_resolved_themes = function _Machine_resolved_themes() {
    const themes = [];
    for (const th of this._themes) {
        const theme_impl = theme_mapping.get(th);
        if (theme_impl !== undefined) {
            themes.push(theme_impl);
        }
    }
    return themes.reverse();
}, _Machine_individual_state_config = function _Machine_individual_state_config(state) {
    const decl = this._state_declarations.get(state);
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
}, _Machine_groups_by_depth = function _Machine_groups_by_depth(state) {
    const containing = [...this.groupsOf(state)];
    if (containing.length < 2) {
        return containing;
    }
    return containing.sort((ga, gb) => {
        const da = membership_distance(this._group_registry, state, ga), db = membership_distance(this._group_registry, state, gb);
        // Larger distance (more "outer") sorts earlier so it is applied first and
        // overridden by nearer groups.
        if (da !== db) {
            return db - da;
        }
        // Equal depth: earlier-declared group sorts earlier (applied first), so
        // the later-declared group of the same depth wins the tie.
        return this._group_order.indexOf(ga) - this._group_order.indexOf(gb);
    });
}, _Machine_compose_state_config = function _Machine_compose_state_config(state, active) {
    const themes = __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_resolved_themes).call(this);
    let acc = {};
    // tier 1 — theme defaults (base, then selected themes)
    acc = merge_state_config(acc, base_theme.state);
    for (const theme of themes) {
        if (theme.state) {
            acc = merge_state_config(acc, theme.state);
        }
    }
    // tier 2 — default_state_config (implicit root over all states)
    acc = merge_state_config(acc, this._state_style);
    // tier 2.5 — hooked-state styling, applied when the state carries any
    // observational or boundary hook.  Sits above the root default and below
    // the per-kind/group/per-state tiers, preserving the historical layer
    // order the pre-cascade `style_for` used.  See {@link state_has_hooks}.
    if (this.state_has_hooks(state)) {
        acc = merge_state_config(acc, base_theme.hooked);
        for (const theme of themes) {
            if (theme.hooked) {
                acc = merge_state_config(acc, theme.hooked);
            }
        }
        acc = merge_state_config(acc, this._hooked_state_style);
    }
    // tier 3 — static per-kind defaults, selected by structural kind
    if (this.state_is_terminal(state)) {
        acc = merge_state_config(acc, base_theme.terminal);
        for (const theme of themes) {
            if (theme.terminal) {
                acc = merge_state_config(acc, theme.terminal);
            }
        }
        acc = merge_state_config(acc, this._terminal_state_style);
    }
    if (this.is_start_state(state)) {
        acc = merge_state_config(acc, base_theme.start);
        for (const theme of themes) {
            if (theme.start) {
                acc = merge_state_config(acc, theme.start);
            }
        }
        acc = merge_state_config(acc, this._start_state_style);
    }
    if (this.is_end_state(state)) {
        acc = merge_state_config(acc, base_theme.end);
        for (const theme of themes) {
            if (theme.end) {
                acc = merge_state_config(acc, theme.end);
            }
        }
        acc = merge_state_config(acc, this._end_state_style);
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
    for (const group_name of __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_groups_by_depth).call(this, state)) {
        const group_cfg = this._group_metadata.get(group_name);
        if (group_cfg !== undefined) {
            acc = merge_state_config(acc, group_cfg);
        }
    }
    // tier 5 — per-state `state foo : { … }`
    acc = merge_state_config(acc, __classPrivateFieldGet(this, _Machine_instances, "m", _Machine_individual_state_config).call(this, state));
    return acc;
};
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
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param hr The value to test.
 *  @returns `true` if `hr` is a non-null object with a boolean `pass` field;
 *  `false` otherwise.  When `true`, TypeScript narrows `hr` to
 *  `HookComplexResult<mDT>`.
 */
function is_hook_complex_result(hr) {
    return hr !== null && typeof hr === 'object' && typeof hr.pass === 'boolean';
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
 *  @param hook_args  The shared hook-argument object for the current
 *    transition.  Mutated in-place when the result carries `data`.
 *  @param res        The normalised complex result returned by
 *    {@link abstract_hook_step} or {@link abstract_everything_hook_step}.
 *  @returns `true` if `res` contained a `data` property (i.e. the hook
 *    mutated the machine's data); `false` otherwise.
 *  @see Machine.transition_impl
 *  @see abstract_hook_step
 */
function _update_hook_fields(hook_args, res) {
    // HOOK_PASSED is the shared frozen outcome for "no hook installed" and for
    // hooks returning true/undefined — the overwhelming majority of the up-to-
    // ~10 steps per hooked transition.  It can never carry `data`/`state` (frozen,
    // built without them), so one pointer compare replaces the hasOwnProperty
    // reflection call for the common case.
    if (res === HOOK_PASSED) {
        return false;
    }
    // a complex result's `state` redirects the transition's destination; carry it
    // on hook_args.to (the destination field), which transition_impl applies at
    // commit (last writer wins).  An explicit `state: undefined` is not a
    // redirect.  StoneCypher/fsl#1947
    if (Object.prototype.hasOwnProperty.call(res, 'state') && res.state !== undefined) {
        hook_args.to = res.state;
    }
    // Two channels (StoneCypher/fsl#1948): `data` overrides the value observed by
    // later hooks in this chain AND is the default committed value; `next_data`
    // overrides only the committed value.  So `data` sets both, then an explicit
    // `next_data` overrides the commit channel.  transition_impl commits
    // hook_args.next_data.  hasOwnProperty (not truthiness) so a falsy override
    // (false/null/0/''/undefined) still commits (fsl#1264/#935).
    let changed = false;
    if (Object.prototype.hasOwnProperty.call(res, 'data')) {
        hook_args.data = res.data;
        hook_args.next_data = res.data;
        changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(res, 'next_data')) {
        hook_args.next_data = res.next_data;
        changed = true;
    }
    return changed;
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
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param hr A hook result of any legal shape.
 *  @returns `true` if the hook rejected the transition; `false` if it passed.
 *  @throws {TypeError} If `hr` is not a recognized hook result shape (for
 *  example, a number or a plain object without a `pass` field).
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
 *  Shared, frozen outcomes for the simple hook results.  The transition
 *  cascade runs up to ~10 hook steps per transition, and the overwhelmingly
 *  common results — no hook installed, or a hook returning `undefined` /
 *  `true` / `false` — previously allocated a fresh one-field object each
 *  time, just to have `.pass` read once and be discarded.  Callers only read
 *  `pass` and probe for an own `data` property ({@link _update_hook_fields}),
 *  so a shared instance is observationally identical; freezing turns that
 *  read-only contract from incidental into enforced.  Complex results (hooks
 *  returning `{ pass, data, ... }`) still pass through untouched.  #705
 *  _update_hook_fields additionally identity-checks HOOK_PASSED to skip its
 *  own-property probe on the common no-op outcome.
 *  @see abstract_hook_step
 *  @see abstract_everything_hook_step
 *  @internal
 */
const HOOK_PASSED = Object.freeze({ pass: true });
const HOOK_REJECTED = Object.freeze({ pass: false });
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
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param maybe_hook The hook handler to call, or `undefined` for the
 *  "no hook installed" case.
 *  @param hook_args The context object passed to the hook.  Includes the
 *  current and proposed state, current and proposed data, action name, and
 *  transition kind.
 *  @returns A {@link HookComplexResult} describing whether the hook passed
 *  and, optionally, any data replacements it requested.
 *  @throws {TypeError} If the hook returns a value that is not one of the
 *  legal shapes listed above.
 *  @internal
 */
function abstract_hook_step(maybe_hook, hook_args) {
    if (maybe_hook === undefined) {
        return HOOK_PASSED;
    }
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
    if (is_hook_complex_result(result)) {
        return result;
    }
    throw new TypeError(`Unknown hook result type ${String(result)}`);
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
 *  @template mDT The type of the machine data member; usually omitted.
 *  @param maybe_hook The everything-hook handler, or `undefined` when none
 *  is installed.
 *  @param hook_args The everything-hook context object.  Differs from a
 *  normal hook context in that it also includes `hook_name`.
 *  @returns A {@link HookComplexResult} describing whether the hook passed
 *  and any data replacements it requested.
 *  @throws {TypeError} If the hook returns a value outside the legal shapes.
 *  @internal
 */
function abstract_everything_hook_step(maybe_hook, hook_args) {
    if (maybe_hook === undefined) {
        return HOOK_PASSED;
    }
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
    if (is_hook_complex_result(result)) {
        return result;
    }
    throw new TypeError(`Unknown hook result type ${String(result)}`);
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
 * import { from, deserialize } from 'jssm';
 * const machine    = from("a -> b;");
 * const serialized = machine.serialize();
 * const restored   = deserialize("a -> b;", serialized);
 * restored.state();  // => 'a'
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
export { transfer_state_properties, Machine, deserialize, compareVersions, sm, from, 
// WHARGARBL TODO these should be exported to a utility library
shapes, gviz_shapes, named_colors, state_name_chars, state_name_first_chars, action_label_chars, is_hook_rejection, is_hook_complex_result, abstract_hook_step, abstract_everything_hook_step, state_style_condense,
//  FslThemes
 };
export { fsl_fence_lang, parse_fence_info } from './fsl_markdown_fence';
export { FslDirections } from './jssm_types.js';
export { arrow_direction, arrow_left_kind, arrow_right_kind } from './jssm_arrow.js';
export { compile, wrap_parse as parse, make } from './jssm_compiler.js';
export { unique, find_repeated, weighted_sample_select, weighted_histo_key, sleep, seq, weighted_rand_select, histograph, gen_splitmix32 } from './jssm_util.js';
export { build_time, version } from './version.js';
export * as constants from './jssm_constants.js';
