import { JssmError } from './jssm_error';
import { parse } from './fsl_parser';
import { arrow_left_kind, arrow_right_kind } from './jssm_arrow';
import { find_repeated, name_bind_prop_and_state } from './jssm_util';
import { reduce as reduce_to_639 } from 'reduce-to-639-1';
/*********
 *
 *  Returns the source span of the `n`-th parse-tree node (1-based) matching
 *  `predicate`, or `undefined` if there are fewer than `n` matches or the
 *  matched node carries no location.  Used to point semantic compile errors
 *  at the offending statement when the tree was produced with
 *  `parse(input, { locations: true })`.
 *
 *  @internal
 *
 *  @param tree      The parse tree to scan.
 *  @param predicate Node test.
 *  @param n         1-based ordinal of the matching node to return.
 *
 *  @returns The matching node's `loc`, or `undefined`.
 *
 */
function nth_matching_loc(tree, predicate, n) {
    let count = 0;
    for (const node of tree) {
        if (predicate(node)) {
            count++;
            if (count === n) {
                return node.loc;
            }
        }
    }
    return undefined;
}
/*********
 *
 *  Internal method meant to perform factory assembly of an edge.  Not meant for
 *  external use.  Constructs a {@link JssmTransition} from a parsed
 *  semi-edge (`this_se`), a source state, a target state, and directionality.
 *
 *  @internal
 *
 *  @typeparam StateType The type of state names (usually `string`).
 *  @typeparam mDT       The type of the machine data member; usually omitted.
 *
 *  @param this_se    - The parsed semi-edge containing kind, action, and
 *                      probability metadata.
 *  @param from       - The source state of the transition.
 *  @param to         - The target state of the transition.
 *  @param isRight    - `true` if this is a left-to-right transition, `false`
 *                      for right-to-left.  Determines which arrow kind
 *                      extraction function is used.
 *  @param _wasList   - If the transition was expanded from a list (e.g.
 *                      `[A B C] -> D`), the original list of states.
 *  @param _wasIndex  - The index of `from` within `_wasList`, if applicable.
 *
 *  @returns A fully assembled {@link JssmTransition} edge object.
 *
 */
function makeTransition(this_se, from, to, isRight, _wasList, _wasIndex) {
    const kind = isRight
        ? arrow_right_kind(this_se.kind)
        : arrow_left_kind(this_se.kind), edge = {
        from,
        to,
        kind,
        after_time: isRight ? this_se.r_after : this_se.l_after,
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
    if (this_se[action] != null) {
        edge.action = this_se[action];
    }
    if (this_se[probability] != null) {
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
 *  ## Opt-in source locations
 *
 *  Pass `{ locations: true }` to attach source-span information to every
 *  object node in the AST.  Each node gains a `loc` field of type
 *  {@link FslSourceLocation} covering its full statement span.  Selected nodes
 *  also gain curated sub-span fields that pinpoint individual tokens within the
 *  statement:
 *
 *  - Transition nodes: `from_loc` (source state), `to_loc` (target state, on
 *    the nested `se` object), `l_action_loc` / `r_action_loc` (action labels).
 *  - State-declaration nodes: `name_loc` (state name), plus `value_loc` on
 *    each color-bearing item inside the declaration block.
 *  - Machine-attribute nodes (`machine_name`, `fsl_version`, etc.): `value_loc`
 *    (the attribute value token).
 *
 *  Without `{ locations: true }` the AST is byte-for-byte identical to the
 *  default output; no `loc` or `*_loc` fields are present.
 *
 *  ```typescript
 *  const tree = wrap_parse('a -> b;', { locations: true });
 *  // tree[0].loc  === { start: { offset: 0, line: 1, column: 1 },
 *  //                    end:   { offset: 7, line: 1, column: 8 } }
 *  // tree[0].from_loc.start.offset === 0   // 'a'
 *  // tree[0].se.to_loc.start.offset === 5  // 'b'
 *  ```
 *
 *  @see {@link FslSourceLocation}
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
 *  @param options Things to control about the instance.  Pass
 *                 `{ locations: true }` to enable opt-in source location
 *                 tracking on every AST node.
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
    // manually rehandled to carry the val type descriptor through
    if (rule.key === 'val_definition') {
        // numeric-looking enum members would type-mismatch their own defaults: an
        // enum member parses as a string, but a numeric default parses as a number,
        // so they never compare equal.  Reject them at compile time (jssm#759).
        if (rule.val_type.kind === 'enum') {
            const numeric_members = rule.val_type.members.filter((m) => /^[0-9]/.test(m));
            if (numeric_members.length) {
                throw new JssmError(undefined, `Enum val "${rule.name}" has numeric-looking members ${JSON.stringify(numeric_members)}; `
                    + 'enum members must not begin with a digit (a numeric default parses as a number and never '
                    + 'matches the string member) — quote or rename them', { source_location: rule.loc });
            }
        }
        const ret = { agg_as: 'val_definition', val: { name: rule.name, val_type: rule.val_type } };
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
            throw new JssmError(undefined, 'State declarations must have a name', { source_location: rule.loc });
        }
        return { agg_as: 'state_declaration', val: { state: rule.name, declarations: rule.value } };
    }
    if (['arrange_declaration', 'arrange_start_declaration',
        'arrange_end_declaration'].includes(rule.key)) {
        return { agg_as: rule.key, val: [rule.value] };
    }
    // things that can only exist once and are just a value under their own name
    const tautologies = [
        'graph_layout', 'start_states', 'end_states', 'failed_outputs', 'machine_name', 'machine_version',
        'machine_comment', 'machine_author', 'machine_contributor', 'machine_definition',
        'machine_reference', 'machine_license', 'fsl_version', 'state_config', 'theme',
        'flow', 'dot_preamble', 'allows_override', 'allow_islands', 'default_state_config',
        'default_start_state_config', 'default_end_state_config',
        'default_hooked_state_config', 'default_active_state_config',
        'default_terminal_state_config', 'npm_name', 'default_size'
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
 *  ## Source-location-aware error reporting
 *
 *  `compile()` ignores `loc` and `*_loc` fields during machine construction —
 *  the resulting config is identical whether or not the tree was parsed with
 *  `{ locations: true }`.  However, when those fields are present, `compile()`
 *  attaches the offending node's source span to any semantic {@link JssmError}
 *  it throws, via the error's `source_location` field
 *  (type {@link FslSourceLocation}).  This lets downstream tooling (e.g. a
 *  CodeMirror 6 linter) map the error to a precise editor range without any
 *  additional source-scanning.
 *
 *  ```typescript
 *  import { parse, compile } from 'jssm';
 *
 *  try {
 *    compile(parse('fsl_version: 1.0.0;\nfsl_version: 2.0.0;\na -> b;',
 *                  { locations: true }));
 *  } catch (err) {
 *    // err.source_location.start.offset points at the second fsl_version line
 *    console.log(err.source_location);
 *  }
 *  ```
 *
 *  @see {@link FslSourceLocation}
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
 *  @param tree The parse tree to be boiled down into a machine config.  If the
 *              tree was produced with `parse(input, { locations: true })`, any
 *              semantic error thrown will carry a `source_location` span
 *              pointing at the offending statement.
 *
 */
function compile(tree) {
    const results = {
        graph_layout: [],
        transition: [],
        start_states: [],
        end_states: [],
        failed_outputs: [],
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
        npm_name: [],
        default_size: [],
        property_definition: [],
        val_definition: [],
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
        allows_override: [],
        allow_islands: []
    };
    // Accumulate by in-place push, not `results[agg_as].concat(val)`: concat
    // recopies and reallocates the whole bucket per rule, which made this loop
    // O(n^2) over edge-heavy machines — two-thirds of construct() self-time
    // (#700).  Array-valued rules spread one level, matching concat's behavior.
    for (const tr of tree) {
        const rule = compile_rule_handler(tr), val = rule.val, // TODO FIXME no any
        bucket = results[rule.agg_as];
        if (Array.isArray(val)) {
            for (const v of val) {
                bucket.push(v);
            }
        }
        else {
            bucket.push(val);
        }
    }
    const property_keys = results['property_definition'].map(pd => pd.name), repeat_props = find_repeated(property_keys);
    if (repeat_props.length) {
        const dup = repeat_props[0][0];
        throw new JssmError(undefined, `Cannot repeat property definitions.  Saw ${JSON.stringify(repeat_props)}`, { source_location: nth_matching_loc(tree, (n) => n.key === 'property_definition' && n.name === dup, 2) });
    }
    const val_keys = results['val_definition'].map(vd => vd.name), repeat_vals = find_repeated(val_keys);
    if (repeat_vals.length) {
        const dup = repeat_vals[0][0];
        throw new JssmError(undefined, `Cannot redefine val names.  Saw ${JSON.stringify(repeat_vals)}`, { source_location: nth_matching_loc(tree, (n) => n.key === 'val_definition' && n.name === dup, 2) });
    }
    // a val and a property may not share a name (megaspec §5; jssm#757)
    const val_prop_collisions = val_keys.filter(name => property_keys.includes(name));
    if (val_prop_collisions.length) {
        const dup = val_prop_collisions[0];
        throw new JssmError(undefined, `A val and a property cannot share the name ${JSON.stringify(dup)}.  Saw collisions ${JSON.stringify(val_prop_collisions)}`, { source_location: nth_matching_loc(tree, (n) => n.key === 'val_definition' && n.name === dup, 1) });
    }
    const assembled_transitions = [].concat(...results['transition']);
    const result_cfg = {
        start_states: results.start_states.length ? results.start_states : [assembled_transitions[0].from],
        end_states: results.end_states,
        failed_outputs: results.failed_outputs,
        transitions: assembled_transitions,
        state_property: [],
    };
    const oneOnlyKeys = [
        'graph_layout', 'machine_name', 'machine_version', 'machine_comment',
        'fsl_version', 'machine_license', 'machine_definition', 'machine_language',
        'flow', 'dot_preamble', 'allows_override', 'allow_islands', 'npm_name', 'default_size'
    ];
    oneOnlyKeys.map((oneOnlyKey) => {
        if (results[oneOnlyKey].length > 1) {
            throw new JssmError(undefined, `May only have one ${oneOnlyKey} statement maximum: ${JSON.stringify(results[oneOnlyKey])}`, { source_location: nth_matching_loc(tree, (n) => n.key === oneOnlyKey, 2) });
        }
        else {
            if (results[oneOnlyKey].length) {
                result_cfg[oneOnlyKey] = results[oneOnlyKey][0];
            }
        }
    });
    ['arrange_declaration', 'arrange_start_declaration', 'arrange_end_declaration',
        'machine_author', 'machine_contributor', 'machine_reference', 'theme',
        'state_declaration', 'property_definition', 'val_definition', 'default_state_config',
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
                    throw new JssmError(undefined, `A state may only bind a property once (${sd.state} re-binds ${decl.name})`, { source_location: nth_matching_loc(tree, (n) => n.key === 'state_declaration' && n.name === sd.state, 1) });
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
make, makeTransition, wrap_parse, nth_matching_loc };
