import { JssmError } from './jssm_error';
import { parse } from './fsl_parser';
import { arrow_left_kind, arrow_right_kind } from './jssm_arrow';
import { find_repeated, name_bind_prop_and_state } from './jssm_util';
import { reduce as reduce_to_639 } from 'reduce-to-639-1';
/*********
 *
 *  Internal method meant to perform factory assembly of an edge.  Not meant for
 *  external use.
 *
 *  @internal
 *
 *  @typeparam mDT The type of the machine data member; usually omitted
 *
 */
// TODO add at-param to docblock
function makeTransition(this_se, from, to, isRight, _wasList, _wasIndex) {
    const kind = isRight
        ? arrow_right_kind(this_se.kind)
        : arrow_left_kind(this_se.kind), edge = {
        from,
        to,
        kind,
        forced_only: kind === 'forced',
        main_path: kind === 'main'
    };
    //  if ((wasList  !== undefined) && (wasIndex === undefined)) { throw new JssmError(undefined, `Must have an index if transition was in a list"); }
    //  if ((wasIndex !== undefined) && (wasList  === undefined)) { throw new JssmError(undefined, `Must be in a list if transition has an index");   }
    /*
      if (typeof edge.to === 'object') {
  
        if (edge.to.key === 'cycle') {
          if (wasList === undefined) { throw new JssmError(undefined, "Must have a waslist if a to is type cycle"); }
          const nextIndex = wrapBy(wasIndex, edge.to.value, wasList.length);
          edge.to = wasList[nextIndex];
        }
  
      }
    */
    const action = isRight ? 'r_action' : 'l_action', probability = isRight ? 'r_probability' : 'l_probability';
    if (this_se[action]) {
        edge.action = this_se[action];
    }
    if (this_se[probability]) {
        edge.probability = this_se[probability];
    }
    return edge;
}
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
 *  import { parse, compile, Machine } from 'jssm';
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
 *  import { sm } from 'jssm';
 *
 *  const lswitch = sm`on <=> off;`;
 *  ```
 *
 *  Method {@link from}:
 *
 *  ```typescript
 *  import * as jssm from 'jssm';
 *
 *  const toggle = jssm.from('up <=> down;');
 *  ```
 *
 *  `wrap_parse` itself is an internal convenience method for alting out an
 *  object as the options call.  Not generally meant for external use.
 *
 *  @param input The FSL code to be evaluated
 *
 *  @param options Things to control about the instance
 *
 */
function wrap_parse(input, options) {
    return parse(input, options || {});
}
/*********
 *
 *  Internal method performing one step in compiling rules for transitions.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 *  @typeparam mDT The type of the machine data member; usually omitted
 *
 */
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
/*********
 *
 *  Internal method performing one step in compiling rules for transitions.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 */
function compile_rule_handle_transition(rule) {
    return compile_rule_transition_step([], rule.from, rule.se.to, rule.se, rule.se.se);
}
/*********
 *
 *  Internal method performing one step in compiling rules for transitions.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 */
function compile_rule_handler(rule) {
    if (rule.key === 'transition') {
        return { agg_as: 'transition', val: compile_rule_handle_transition(rule) };
    }
    if (rule.key === 'machine_language') {
        return { agg_as: 'machine_language', val: reduce_to_639(rule.value) };
    }
    // manually rehandled to make `undefined` as a property safe
    if (rule.key === 'property_definition') {
        const ret = { agg_as: 'property_definition', val: { name: rule.name } };
        if (rule.hasOwnProperty('default_value')) {
            ret.val.default_value = rule.default_value;
        }
        if (rule.hasOwnProperty('required')) {
            ret.val.required = rule.required;
        }
        return ret;
    }
    // state properties are in here
    if (rule.key === 'state_declaration') {
        if (!rule.name) {
            throw new JssmError(undefined, 'State declarations must have a name');
        }
        return { agg_as: 'state_declaration', val: { state: rule.name, declarations: rule.value } };
    }
    if (['arrange_declaration', 'arrange_start_declaration',
        'arrange_end_declaration'].includes(rule.key)) {
        return { agg_as: rule.key, val: [rule.value] };
    }
    // things that can only exist once and are just a value under their own name
    const tautologies = [
        'graph_layout', 'start_states', 'end_states', 'machine_name', 'machine_version',
        'machine_comment', 'machine_author', 'machine_contributor', 'machine_definition',
        'machine_reference', 'machine_license', 'fsl_version', 'state_config', 'theme',
        'flow', 'dot_preamble', 'allows_override', 'default_state_config',
        'default_start_state_config', 'default_end_state_config',
        'default_hooked_state_config', 'default_active_state_config',
        'default_terminal_state_config'
    ];
    if (tautologies.includes(rule.key)) {
        return { agg_as: rule.key, val: rule.value };
    }
    throw new JssmError(undefined, `compile_rule_handler: Unknown rule: ${JSON.stringify(rule)}`);
}
/*********
 *
 *  Compile a machine's JSON intermediate representation to a config object.  If
 *  you're using this (probably don't,) you're probably also using
 *  {@link parse} to get the IR, and the object constructor
 *  {@link Machine.construct} to turn the config object into a workable machine.
 *
 *  ```typescript
 *  import { parse, compile, Machine } from 'jssm';
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
 *  import { sm } from 'jssm';
 *
 *  const lswitch = sm`on <=> off;`;
 *  ```
 *
 *  Method {@link from}:
 *
 *  ```typescript
 *  import * as jssm from 'jssm';
 *
 *  const toggle = jssm.from('up <=> down;');
 *  ```
 *
 *  @typeparam mDT The type of the machine data member; usually omitted
 *
 *  @param tree The parse tree to be boiled down into a machine config
 *
 */
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
        property_definition: [],
        state_property: {},
        theme: [],
        flow: [],
        dot_preamble: [],
        arrange_declaration: [],
        arrange_start_declaration: [],
        arrange_end_declaration: [],
        machine_version: [],
        default_state_config: [],
        default_active_state_config: [],
        default_hooked_state_config: [],
        default_terminal_state_config: [],
        default_start_state_config: [],
        default_end_state_config: [],
        allows_override: []
    };
    tree.map((tr) => {
        const rule = compile_rule_handler(tr), agg_as = rule.agg_as, val = rule.val; // TODO FIXME no any
        results[agg_as] = results[agg_as].concat(val);
    });
    const property_keys = results['property_definition'].map(pd => pd.name), repeat_props = find_repeated(property_keys);
    if (repeat_props.length) {
        throw new JssmError(undefined, `Cannot repeat property definitions.  Saw ${JSON.stringify(repeat_props)}`);
    }
    const assembled_transitions = [].concat(...results['transition']);
    const result_cfg = {
        start_states: results.start_states.length ? results.start_states : [assembled_transitions[0].from],
        end_states: results.end_states,
        transitions: assembled_transitions,
        state_property: [],
    };
    const oneOnlyKeys = [
        'graph_layout', 'machine_name', 'machine_version', 'machine_comment',
        'fsl_version', 'machine_license', 'machine_definition', 'machine_language',
        'flow', 'dot_preamble', 'allows_override'
    ];
    oneOnlyKeys.map((oneOnlyKey) => {
        if (results[oneOnlyKey].length > 1) {
            throw new JssmError(undefined, `May only have one ${oneOnlyKey} statement maximum: ${JSON.stringify(results[oneOnlyKey])}`);
        }
        else {
            if (results[oneOnlyKey].length) {
                result_cfg[oneOnlyKey] = results[oneOnlyKey][0];
            }
        }
    });
    ['arrange_declaration', 'arrange_start_declaration', 'arrange_end_declaration',
        'machine_author', 'machine_contributor', 'machine_reference', 'theme',
        'state_declaration', 'property_definition', 'default_state_config',
        'default_start_state_config', 'default_end_state_config',
        'default_hooked_state_config', 'default_terminal_state_config',
        'default_active_state_config'].map((multiKey) => {
        if (results[multiKey].length) {
            result_cfg[multiKey] = results[multiKey];
        }
    });
    // re-walk state declarations, already wrapped up, to get state properties,
    // which go out in a different datastructure
    results.state_declaration.forEach(sd => {
        sd.declarations.forEach(decl => {
            if (decl.key === 'state_property') {
                const label = name_bind_prop_and_state(decl.name, sd.state);
                if (result_cfg.state_property.findIndex(c => c.name === label) !== -1) {
                    throw new JssmError(undefined, `A state may only bind a property once (${sd.state} re-binds ${decl.name})`);
                }
                else {
                    result_cfg.state_property.push({ name: label, default_value: decl.value });
                }
            }
        });
    });
    return result_cfg;
}
/*********
 *
 *  An internal convenience wrapper for parsing then compiling a machine string.
 *  Not generally meant for external use.  Please see {@link compile} or
 *  {@link sm}.
 *
 *  @typeparam mDT The type of the machine data member; usually omitted
 *
 *  @param plan The FSL code to be evaluated and built into a machine config
 *
 */
function make(plan) {
    return compile(wrap_parse(plan));
}
export { compile, 
// compile_rule_handler,
// compile_rule_transition_step,
// compile_rule_handle_transition,
make, makeTransition, wrap_parse };
