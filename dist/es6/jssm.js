import { reduce as reduce_to_639 } from 'reduce-to-639-1';
import { seq, weighted_rand_select, weighted_sample_select, histograph, weighted_histo_key, array_box_if_string } from './jssm_util';
import { parse } from './jssm-dot';
import { version } from './version';
function arrow_direction(arrow) {
    switch (String(arrow)) {
        case '->':
        case '→':
        case '=>':
        case '⇒':
        case '~>':
        case '↛':
            return 'right';
        case '<-':
        case '←':
        case '<=':
        case '⇐':
        case '<~':
        case '↚':
            return 'left';
        case '<->':
        case '↔':
        case '<-=>':
        case '←⇒':
        case '←=>':
        case '<-⇒':
        case '<-~>':
        case '←↛':
        case '←~>':
        case '<-↛':
        case '<=>':
        case '⇔':
        case '<=->':
        case '⇐→':
        case '⇐->':
        case '<=→':
        case '<=~>':
        case '⇐↛':
        case '⇐~>':
        case '<=↛':
        case '<~>':
        case '↮':
        case '<~->':
        case '↚→':
        case '↚->':
        case '<~→':
        case '<~=>':
        case '↚⇒':
        case '↚=>':
        case '<~⇒':
            return 'both';
        default:
            throw new Error(`arrow_direction: unknown arrow type ${arrow}`);
    }
}
function arrow_left_kind(arrow) {
    switch (String(arrow)) {
        case '->':
        case '→':
        case '=>':
        case '⇒':
        case '~>':
        case '↛':
            return 'none';
        case '<-':
        case '←':
        case '<->':
        case '↔':
        case '<-=>':
        case '←⇒':
        case '<-~>':
        case '←↛':
            return 'legal';
        case '<=':
        case '⇐':
        case '<=>':
        case '⇔':
        case '<=->':
        case '⇐→':
        case '<=~>':
        case '⇐↛':
            return 'main';
        case '<~':
        case '↚':
        case '<~>':
        case '↮':
        case '<~->':
        case '↚→':
        case '<~=>':
        case '↚⇒':
            return 'forced';
        default:
            throw new Error(`arrow_direction: unknown arrow type ${arrow}`);
    }
}
function arrow_right_kind(arrow) {
    switch (String(arrow)) {
        case '<-':
        case '←':
        case '<=':
        case '⇐':
        case '<~':
        case '↚':
            return 'none';
        case '->':
        case '→':
        case '<->':
        case '↔':
        case '<=->':
        case '⇐→':
        case '<~->':
        case '↚→':
            return 'legal';
        case '=>':
        case '⇒':
        case '<=>':
        case '⇔':
        case '<-=>':
        case '←⇒':
        case '<~=>':
        case '↚⇒':
            return 'main';
        case '~>':
        case '↛':
        case '<~>':
        case '↮':
        case '<-~>':
        case '←↛':
        case '<=~>':
        case '⇐↛':
            return 'forced';
        default:
            throw new Error(`arrow_direction: unknown arrow type ${arrow}`);
    }
}
function makeTransition(this_se, from, to, isRight, _wasList, _wasIndex) {
    const kind = isRight ? arrow_right_kind(this_se.kind) : arrow_left_kind(this_se.kind), edge = {
        from,
        to,
        kind,
        forced_only: kind === 'forced',
        main_path: kind === 'main'
    };
    const action = isRight ? 'r_action' : 'l_action', probability = isRight ? 'r_probability' : 'l_probability';
    if (this_se[action]) {
        edge.action = this_se[action];
    }
    if (this_se[probability]) {
        edge.probability = this_se[probability];
    }
    return edge;
}
function compile_rule_transition_step(acc, from, to, this_se, next_se) {
    const edges = [];
    const uFrom = (Array.isArray(from) ? from : [from]), uTo = (Array.isArray(to) ? to : [to]);
    uFrom.map((f) => {
        uTo.map((t) => {
            const right = makeTransition(this_se, f, t, true);
            if (right.kind !== 'none') {
                edges.push(right);
            }
            const left = makeTransition(this_se, t, f, false);
            if (left.kind !== 'none') {
                edges.push(left);
            }
        });
    });
    const new_acc = acc.concat(edges);
    if (next_se) {
        return compile_rule_transition_step(new_acc, to, next_se.to, next_se, next_se.se);
    }
    else {
        return new_acc;
    }
}
function compile_rule_handle_transition(rule) {
    return compile_rule_transition_step([], rule.from, rule.se.to, rule.se, rule.se.se);
}
function compile_rule_handler(rule) {
    if (rule.key === 'transition') {
        return { agg_as: 'transition', val: compile_rule_handle_transition(rule) };
    }
    if (rule.key === 'machine_language') {
        return { agg_as: 'machine_language', val: reduce_to_639(rule.value) };
    }
    if (rule.key === 'state_declaration') {
        if (!rule.name) {
            throw new Error('State declarations must have a name');
        }
        return { agg_as: 'state_declaration', val: { state: rule.name, declarations: rule.value } };
    }
    if (['arrange_declaration', 'arrange_start_declaration',
        'arrange_end_declaration'].includes(rule.key)) {
        return { agg_as: rule.key, val: [rule.value] };
    }
    const tautologies = [
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
function compile(tree) {
    const results = {
        graph_layout: [],
        transition: [],
        start_states: [],
        end_states: [],
        state_config: [],
        state_declaration: [],
        fsl_version: [],
        machine_author: [],
        machine_comment: [],
        machine_contributor: [],
        machine_definition: [],
        machine_language: [],
        machine_license: [],
        machine_name: [],
        machine_reference: [],
        theme: [],
        flow: [],
        dot_preamble: [],
        arrange_declaration: [],
        arrange_start_declaration: [],
        arrange_end_declaration: [],
        machine_version: []
    };
    tree.map((tr) => {
        const rule = compile_rule_handler(tr), agg_as = rule.agg_as, val = rule.val;
        results[agg_as] = results[agg_as].concat(val);
    });
    const assembled_transitions = [].concat(...results['transition']);
    const result_cfg = {
        start_states: results.start_states.length ? results.start_states : [assembled_transitions[0].from],
        transitions: assembled_transitions
    };
    const oneOnlyKeys = [
        'graph_layout', 'machine_name', 'machine_version', 'machine_comment',
        'fsl_version', 'machine_license', 'machine_definition', 'machine_language',
        'theme', 'flow', 'dot_preamble'
    ];
    oneOnlyKeys.map((oneOnlyKey) => {
        if (results[oneOnlyKey].length > 1) {
            throw new Error(`May only have one ${oneOnlyKey} statement maximum: ${JSON.stringify(results[oneOnlyKey])}`);
        }
        else {
            if (results[oneOnlyKey].length) {
                result_cfg[oneOnlyKey] = results[oneOnlyKey][0];
            }
        }
    });
    ['arrange_declaration', 'arrange_start_declaration', 'arrange_end_declaration',
        'machine_author', 'machine_contributor', 'machine_reference', 'state_declaration'].map((multiKey) => {
        if (results[multiKey].length) {
            result_cfg[multiKey] = results[multiKey];
        }
    });
    return result_cfg;
}
function make(plan) {
    return compile(parse(plan, {}));
}
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
            case 'linestyle':
                state_decl.linestyle = d.value;
                break;
            case 'text-color':
                state_decl.textColor = d.value;
                break;
            case 'background-color':
                state_decl.backgroundColor = d.value;
                break;
            case 'border-color':
                state_decl.borderColor = d.value;
                break;
            default: throw new Error(`Unknown state property: '${JSON.stringify(d)}'`);
        }
    });
    return state_decl;
}
class Machine {
    constructor({ start_states, complete = [], transitions, machine_author, machine_comment, machine_contributor, machine_definition, machine_language, machine_license, machine_name, machine_version, state_declaration, fsl_version, dot_preamble = undefined, arrange_declaration = [], arrange_start_declaration = [], arrange_end_declaration = [], theme = 'default', flow = 'down', graph_layout = 'dot' }) {
        this._state = start_states[0];
        this._states = new Map();
        this._state_declarations = new Map();
        this._edges = [];
        this._edge_map = new Map();
        this._named_transitions = new Map();
        this._actions = new Map();
        this._reverse_actions = new Map();
        this._reverse_action_targets = new Map();
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
        if (state_declaration) {
            state_declaration.map((state_decl) => {
                if (this._state_declarations.has(state_decl.state)) {
                    throw new Error(`Added the same state declaration twice: ${JSON.stringify(state_decl.state)}`);
                }
                this._state_declarations.set(state_decl.state, transfer_state_properties(state_decl));
            });
        }
        transitions.map((tr) => {
            if (tr.from === undefined) {
                throw new Error(`transition must define 'from': ${JSON.stringify(tr)}`);
            }
            if (tr.to === undefined) {
                throw new Error(`transition must define 'to': ${JSON.stringify(tr)}`);
            }
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
            if (cursor_from.to.includes(tr.to)) {
                throw new Error(`already has ${JSON.stringify(tr.from)} to ${JSON.stringify(tr.to)}`);
            }
            else {
                cursor_from.to.push(tr.to);
                cursor_to.from.push(tr.from);
            }
            this._edges.push(tr);
            const thisEdgeId = this._edges.length - 1;
            if (tr.name) {
                if (this._named_transitions.has(tr.name)) {
                    throw new Error(`named transition "${JSON.stringify(tr.name)}" already created`);
                }
                else {
                    this._named_transitions.set(tr.name, thisEdgeId);
                }
            }
            const from_mapping = this._edge_map.get(tr.from) || new Map();
            if (!(this._edge_map.has(tr.from))) {
                this._edge_map.set(tr.from, from_mapping);
            }
            from_mapping.set(tr.to, thisEdgeId);
            if (tr.action) {
                let actionMap = this._actions.get(tr.action);
                if (!(actionMap)) {
                    actionMap = new Map();
                    this._actions.set(tr.action, actionMap);
                }
                if (actionMap.has(tr.from)) {
                    throw new Error(`action ${JSON.stringify(tr.action)} already attached to origin ${JSON.stringify(tr.from)}`);
                }
                else {
                    actionMap.set(tr.from, thisEdgeId);
                }
                let rActionMap = this._reverse_actions.get(tr.from);
                if (!(rActionMap)) {
                    rActionMap = new Map();
                    this._reverse_actions.set(tr.from, rActionMap);
                }
                rActionMap.set(tr.action, thisEdgeId);
                if (!(this._reverse_action_targets.has(tr.to))) {
                    this._reverse_action_targets.set(tr.to, new Map());
                }
            }
        });
    }
    _new_state(state_config) {
        if (this._states.has(state_config.name)) {
            throw new Error(`state ${JSON.stringify(state_config.name)} already exists`);
        }
        this._states.set(state_config.name, state_config);
        return state_config.name;
    }
    state() {
        return this._state;
    }
    state_is_final(whichState) {
        return ((this.state_is_terminal(whichState)) && (this.state_is_complete(whichState)));
    }
    is_final() {
        return this.state_is_final(this.state());
    }
    graph_layout() {
        return this._graph_layout;
    }
    dot_preamble() {
        return this._dot_preamble;
    }
    machine_author() {
        return this._machine_author;
    }
    machine_comment() {
        return this._machine_comment;
    }
    machine_contributor() {
        return this._machine_contributor;
    }
    machine_definition() {
        return this._machine_definition;
    }
    machine_language() {
        return this._machine_language;
    }
    machine_license() {
        return this._machine_license;
    }
    machine_name() {
        return this._machine_name;
    }
    machine_version() {
        return this._machine_version;
    }
    raw_state_declarations() {
        return this._raw_state_declaration;
    }
    state_declaration(which) {
        return this._state_declarations.get(which);
    }
    state_declarations() {
        return this._state_declarations;
    }
    fsl_version() {
        return this._fsl_version;
    }
    machine_state() {
        return {
            internal_state_impl_version: 1,
            actions: this._actions,
            edge_map: this._edge_map,
            edges: this._edges,
            named_transitions: this._named_transitions,
            reverse_actions: this._reverse_actions,
            state: this._state,
            states: this._states
        };
    }
    states() {
        return Array.from(this._states.keys());
    }
    state_for(whichState) {
        const state = this._states.get(whichState);
        if (state) {
            return state;
        }
        else {
            throw new Error(`no such state ${JSON.stringify(state)}`);
        }
    }
    has_state(whichState) {
        return this._states.get(whichState) !== undefined;
    }
    list_edges() {
        return this._edges;
    }
    list_named_transitions() {
        return this._named_transitions;
    }
    list_actions() {
        return Array.from(this._actions.keys());
    }
    theme() {
        return this._theme;
    }
    flow() {
        return this._flow;
    }
    get_transition_by_state_names(from, to) {
        const emg = this._edge_map.get(from);
        if (emg) {
            return emg.get(to);
        }
        else {
            return undefined;
        }
    }
    lookup_transition_for(from, to) {
        const id = this.get_transition_by_state_names(from, to);
        return ((id === undefined) || (id === null)) ? undefined : this._edges[id];
    }
    list_transitions(whichState = this.state()) {
        return { entrances: this.list_entrances(whichState), exits: this.list_exits(whichState) };
    }
    list_entrances(whichState = this.state()) {
        return (this._states.get(whichState)
            || { from: undefined }).from
            || [];
    }
    list_exits(whichState = this.state()) {
        return (this._states.get(whichState)
            || { to: undefined }).to
            || [];
    }
    probable_exits_for(whichState) {
        const wstate = this._states.get(whichState);
        if (!(wstate)) {
            throw new Error(`No such state ${JSON.stringify(whichState)} in probable_exits_for`);
        }
        const wstate_to = wstate.to, wtf = wstate_to
            .map((ws) => this.lookup_transition_for(this.state(), ws))
            .filter(Boolean);
        return wtf;
    }
    probabilistic_transition() {
        const selected = weighted_rand_select(this.probable_exits_for(this.state()));
        return this.transition(selected.to);
    }
    probabilistic_walk(n) {
        return seq(n)
            .map(() => {
            const state_was = this.state();
            this.probabilistic_transition();
            return state_was;
        })
            .concat([this.state()]);
    }
    probabilistic_histo_walk(n) {
        return histograph(this.probabilistic_walk(n));
    }
    actions(whichState = this.state()) {
        const wstate = this._reverse_actions.get(whichState);
        if (wstate) {
            return Array.from(wstate.keys());
        }
        else {
            throw new Error(`No such state ${JSON.stringify(whichState)}`);
        }
    }
    list_states_having_action(whichState) {
        const wstate = this._actions.get(whichState);
        if (wstate) {
            return Array.from(wstate.keys());
        }
        else {
            throw new Error(`No such state ${JSON.stringify(whichState)}`);
        }
    }
    list_exit_actions(whichState = this.state()) {
        const ra_base = this._reverse_actions.get(whichState);
        if (!(ra_base)) {
            throw new Error(`No such state ${JSON.stringify(whichState)}`);
        }
        return Array.from(ra_base.values())
            .map((edgeId) => this._edges[edgeId])
            .filter((o) => o.from === whichState)
            .map((filtered) => filtered.action);
    }
    probable_action_exits(whichState = this.state()) {
        const ra_base = this._reverse_actions.get(whichState);
        if (!(ra_base)) {
            throw new Error(`No such state ${JSON.stringify(whichState)}`);
        }
        return Array.from(ra_base.values())
            .map((edgeId) => this._edges[edgeId])
            .filter((o) => o.from === whichState)
            .map((filtered) => ({ action: filtered.action,
            probability: filtered.probability
        }));
    }
    is_unenterable(whichState) {
        if (!(this.has_state(whichState))) {
            throw new Error(`No such state ${whichState}`);
        }
        return this.list_entrances(whichState).length === 0;
    }
    has_unenterables() {
        return this.states().some((x) => this.is_unenterable(x));
    }
    is_terminal() {
        return this.state_is_terminal(this.state());
    }
    state_is_terminal(whichState) {
        if (!(this.has_state(whichState))) {
            throw new Error(`No such state ${whichState}`);
        }
        return this.list_exits(whichState).length === 0;
    }
    has_terminals() {
        return this.states().some((x) => this.state_is_terminal(x));
    }
    is_complete() {
        return this.state_is_complete(this.state());
    }
    state_is_complete(whichState) {
        const wstate = this._states.get(whichState);
        if (wstate) {
            return wstate.complete;
        }
        else {
            throw new Error(`No such state ${JSON.stringify(whichState)}`);
        }
    }
    has_completes() {
        return this.states().some((x) => this.state_is_complete(x));
    }
    action(name, newData) {
        if (this.valid_action(name, newData)) {
            const edge = this.current_action_edge_for(name);
            this._state = edge.to;
            return true;
        }
        else {
            return false;
        }
    }
    transition(newState, newData) {
        if (this.valid_transition(newState, newData)) {
            this._state = newState;
            return true;
        }
        else {
            return false;
        }
    }
    force_transition(newState, newData) {
        if (this.valid_force_transition(newState, newData)) {
            this._state = newState;
            return true;
        }
        else {
            return false;
        }
    }
    current_action_for(action) {
        const action_base = this._actions.get(action);
        return action_base ? action_base.get(this.state()) : undefined;
    }
    current_action_edge_for(action) {
        const idx = this.current_action_for(action);
        if ((idx === undefined) || (idx === null)) {
            throw new Error(`No such action ${JSON.stringify(action)}`);
        }
        return this._edges[idx];
    }
    valid_action(action, _newData) {
        return this.current_action_for(action) !== undefined;
    }
    valid_transition(newState, _newData) {
        const transition_for = this.lookup_transition_for(this.state(), newState);
        if (!(transition_for)) {
            return false;
        }
        if (transition_for.forced_only) {
            return false;
        }
        return true;
    }
    valid_force_transition(newState, _newData) {
        return (this.lookup_transition_for(this.state(), newState) !== undefined);
    }
    sm(template_strings, ...remainder) {
        return sm(template_strings, ...remainder);
    }
}
function sm(template_strings, ...remainder) {
    return new Machine(make(template_strings.reduce((acc, val, idx) => `${acc}${remainder[idx - 1]}${val}`)));
}
export { version, transfer_state_properties, Machine, make, parse, compile, sm, arrow_direction, arrow_left_kind, arrow_right_kind, seq, weighted_rand_select, histograph, weighted_sample_select, weighted_histo_key };
//# sourceMappingURL=jssm.js.map