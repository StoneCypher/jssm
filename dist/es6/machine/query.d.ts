/*******
 *
 *  The query family: everything that reads the machine without moving it —
 *  the current state, labels, the start / end / failed / final / terminal /
 *  complete predicates, the machine attribute accessors (`machine_*`,
 *  `editor_config`, `npm_name`, `default_size`, `fsl_version`, the state
 *  declarations, `machine_state`), the state and edge lists, the override
 *  and island policies, the grammar character tables, and the edge lookups
 *  (`get_transition_by_state_names`, `lookup_transition_for`, `edges_between`,
 *  `current_action_for`, `current_action_edge_for`).  Every function takes
 *  the machine as its first argument and reads its fields directly; the
 *  `Machine` class methods and getters of the same names are one-line
 *  delegates onto these.
 *
 *  Every export here is public and re-exported by the `jssm` barrel.
 *
 */
import type { Machine } from './machine.js';
import type { JssmGenericState, JssmTransition, JssmTransitionList, JssmMachineInternalState, JssmAllowsOverride, JssmAllowIslands, JssmEditorConfig, JssmDefaultSize, JssmParsedSemver, JssmStateDeclaration } from '../jssm_types.js';
type StateType = string;
/*********
 *
 *  Get the current state of a machine.
 *
 *  @example
 *  import { from, transition, state } from 'jssm';
 *
 *  const lswitch = from('on <=> off;');
 *  state(lswitch);             // => 'on'
 *
 *  transition(lswitch, 'off');
 *  state(lswitch);             // => 'off'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns The current state name.
 *
 */
export declare function state<mDT>(m: Machine<mDT>): StateType;
/*********
 *
 *  Get the label for a given state, if any; return `undefined` otherwise.
 *
 *  See also {@link display_text}.
 *
 *  @example
 *  import { from, label_for } from 'jssm';
 *
 *  const lswitch = from('a -> b; state a: { label: "Foo!"; };');
 *  label_for(lswitch, 'a');              // => 'Foo!'
 *  label_for(lswitch, 'b');              // => undefined
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m     The machine to read.
 *  @param state The state to get the label for.
 *
 *  @returns The label string, or `undefined` if no label is set.
 *
 */
export declare function label_for<mDT>(m: Machine<mDT>, state: StateType): string;
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
 *  @example
 *  import { from, display_text } from 'jssm';
 *
 *  const lswitch = from('a -> b; state a: { label: "Foo!"; };');
 *  display_text(lswitch, 'a');              // => 'Foo!'
 *  display_text(lswitch, 'b');              // => 'b'
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m     The machine to read.
 *  @param state The state to get display text for.
 *
 *  @returns The label if one exists, otherwise the state's name.
 *
 */
export declare function display_text<mDT>(m: Machine<mDT>, state: StateType): string;
/********
 *
 *  Check whether a given state is a valid start state (either because it was
 *  explicitly named as such, or because it was the first mentioned state.)
 *
 *  @example
 *  import { sm, is_start_state } from 'jssm';
 *
 *  const example = sm`a -> b;`;
 *
 *  is_start_state(example, 'a');   // => true
 *  is_start_state(example, 'b');   // => false
 *
 *  const example2 = sm`start_states: [a b]; a -> b;`;
 *
 *  is_start_state(example2, 'a');   // => true
 *  is_start_state(example2, 'b');   // => true
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The name of the state to check
 *
 *  @returns Whether the state is a start state.
 *
 */
export declare function is_start_state<mDT>(m: Machine<mDT>, whichState: StateType): boolean;
/********
 *
 *  Check whether a given state is a declared end state.
 *
 *  @example
 *  import { sm, is_end_state } from 'jssm';
 *
 *  const example = sm`a -> b;`;
 *
 *  is_end_state(example, 'a');   // => false
 *  is_end_state(example, 'b');   // => false
 *
 *  const example2 = sm`end_states: [a b]; a -> b;`;
 *
 *  is_end_state(example2, 'a');   // => true
 *  is_end_state(example2, 'b');   // => true
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The name of the state to check
 *
 *  @returns Whether the state is a declared end state.
 *
 */
export declare function is_end_state<mDT>(m: Machine<mDT>, whichState: StateType): boolean;
/********
 *
 *  Get the set of states declared as failure outputs for this machine.
 *  Returns an array of state labels, or an empty array when none were
 *  declared.  A state in this list means the machine is in a failure
 *  condition when it occupies that state.
 *
 *  @param m The machine to read.
 *
 *  @returns The declared failure-output state names, as a fresh array.
 *
 *  @see {@link is_failed_output} to test a single state
 *  @see {@link is_failed} to test the current state
 *
 */
export declare function failed_outputs<mDT>(m: Machine<mDT>): Array<StateType>;
/********
 *
 *  Check whether a given state is declared as a failure output.
 *
 *  @param m          The machine to read.
 *  @param whichState The name of the state to check
 *
 *  @returns Whether the state is a declared failure output.
 *
 *  @see {@link failed_outputs} for the full failure-output set
 *  @see {@link is_failed} to test the current state
 *
 */
export declare function is_failed_output<mDT>(m: Machine<mDT>, whichState: StateType): boolean;
/********
 *
 *  Check whether the machine is currently in a failure state — that is,
 *  whether its current state is one of the declared `failed_outputs`.
 *
 *  @param m The machine to read.
 *
 *  @returns Whether the current state is a declared failure output.
 *
 *  @see {@link failed_outputs} for the full failure-output set
 *  @see {@link is_failed_output} to test an arbitrary state
 *
 */
export declare function is_failed<mDT>(m: Machine<mDT>): boolean;
/********
 *
 *  Check whether a given state is final (either has no exits or is marked
 *  `complete`.)
 *
 *  @example
 *  import { sm, state_is_final } from 'jssm';
 *
 *  const final_test = sm`first -> second;`;
 *
 *  state_is_final(final_test, 'first');   // => false
 *  state_is_final(final_test, 'second');  // => true
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The name of the state to check for finality
 *
 *  @returns Whether the state is terminal or complete.
 *
 */
export declare function state_is_final<mDT>(m: Machine<mDT>, whichState: StateType): boolean;
/********
 *
 *  Check whether the current state is final (either has no exits or is marked
 *  `complete`.)
 *
 *  @example
 *  import { sm, transition, is_final } from 'jssm';
 *
 *  const final_test = sm`first -> second;`;
 *
 *  is_final(final_test);   // => false
 *  transition(final_test, 'second');
 *  is_final(final_test);   // => true
 *
 *  @param m The machine to read.
 *
 *  @returns Whether the current state is terminal or complete.
 *
 */
export declare function is_final<mDT>(m: Machine<mDT>): boolean;
/**
 *  The RFC 8785 canonical-config identity of the current configuration
 *  (`{v, state, data}`) — the byte-stable, replay-derivable core used for
 *  hashing.  Excludes envelope fields (timestamp/comment/history).
 *  @param m The machine to read.
 *  @returns The canonical config string.
 *  @example
 *    import { sm, canonical } from 'jssm';
 *    canonical(sm`a -> b;`).includes('"state":"a"');  // => true
 */
export declare function canonical<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's author list.  Set via the FSL `machine_author` directive.
 *  @param m The machine to read.
 *  @returns An array of author name strings.
 */
export declare function machine_author<mDT>(m: Machine<mDT>): Array<string>;
/**
 * Get the machine's comment string.  Set via the FSL `machine_comment` directive.
 *  @param m The machine to read.
 *  @returns The comment string.
 */
export declare function machine_comment<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's contributor list.  Set via the FSL `machine_contributor` directive.
 *  @param m The machine to read.
 *  @returns An array of contributor name strings.
 */
export declare function machine_contributor<mDT>(m: Machine<mDT>): Array<string>;
/**
 * Get the machine's definition string.  Set via the FSL `machine_definition` directive.
 *  @param m The machine to read.
 *  @returns The definition string.
 */
export declare function machine_definition<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's natural language as an ISO 639-1 code.  Set via the FSL
 *  `machine_language` directive, which accepts a language name or code, or a
 *  BCP-47 tag whose region subtag is dropped (`en-us` -> `en`).  Unrecognized
 *  values resolve to `undefined`.
 *  @param m The machine to read.
 *  @returns The ISO 639-1 language code (e.g. `'en'`), or `undefined` if the
 *           supplied value did not resolve to a known language.
 */
export declare function machine_language<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's license string.  Set via the FSL `machine_license` directive.
 *  @param m The machine to read.
 *  @returns The license string.
 */
export declare function machine_license<mDT>(m: Machine<mDT>): string;
/**
 * Get the machine's name.  Set via the FSL `machine_name` directive.
 *  @param m The machine to read.
 *  @returns The machine name string.
 */
export declare function machine_name<mDT>(m: Machine<mDT>): string;
/**
 * The editor/panel defaults declared in the FSL `editor: {}` block, or
 *  `undefined` when none was given.  Read by the all-widgets web control
 *  (fsl#1334) — `panels` drives `request` panel mode.
 *  @param m The machine to read.
 *  @returns `{ stochastic_run_count?, panels? }`, or `undefined`.
 *  @example
 *    import { sm, editor_config } from 'jssm';
 *    const m = sm`editor: { panels: [history]; }; a -> b;`;
 *    editor_config(m);  // => { panels: ['history'] }
 */
export declare function editor_config<mDT>(m: Machine<mDT>): JssmEditorConfig | undefined;
/**
 * Get the npm package name associated with the machine.  Set via the FSL `npm_name` directive.
 *  Returns `undefined` when not present.
 *  @param m The machine to read.
 *  @returns The npm package name string, or `undefined`.
 *  @see machine_name
 */
export declare function npm_name<mDT>(m: Machine<mDT>): string;
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
 *  @param m The machine to read.
 *  @returns The size-hint object, or `undefined` if not set.
 *  @see npm_name
 */
export declare function default_size<mDT>(m: Machine<mDT>): JssmDefaultSize | undefined;
/**
 * Get the machine's declared version, parsed.  Set via the FSL
 *  `machine_version` directive, which takes a semver triple; the parser
 *  breaks it into numeric `major`/`minor`/`patch` fields and keeps the
 *  exact source text in `full`.  Returns `undefined` when the directive
 *  was not given.
 *  @param m The machine to read.
 *  @returns The parsed {@link JssmParsedSemver}, or `undefined` if unset.
 *  @example
 *    import { sm, machine_version } from 'jssm';
 *    const m = sm`machine_version: 1.2.3; a -> b;`;
 *    machine_version(m);  // => { major: 1, minor: 2, patch: 3, full: '1.2.3' }
 *  @see fsl_version
 */
export declare function machine_version<mDT>(m: Machine<mDT>): JssmParsedSemver | undefined;
/**
 * Get the raw state declaration objects as parsed from the FSL source.
 *  @param m The machine to read.
 *  @returns An array of raw state declaration objects.
 */
export declare function raw_state_declarations<mDT>(m: Machine<mDT>): Array<object>;
/**
 * Get the processed state declaration for a specific state.
 *  @param m     The machine to read.
 *  @param which The state to look up.
 *  @returns The {@link JssmStateDeclaration} for the given state.
 */
export declare function state_declaration<mDT>(m: Machine<mDT>, which: StateType): JssmStateDeclaration;
/**
 * Get all processed state declarations as a Map.
 *  @param m The machine to read.
 *  @returns A `Map` from state name to {@link JssmStateDeclaration}.
 */
export declare function state_declarations<mDT>(m: Machine<mDT>): Map<StateType, JssmStateDeclaration>;
/**
 * Get the FSL language version this machine declares, parsed.  Set via
 *  the FSL `fsl_version` directive, which takes a semver triple; the
 *  parser breaks it into numeric `major`/`minor`/`patch` fields and keeps
 *  the exact source text in `full`.  Returns `undefined` when the
 *  directive was not given.
 *  @param m The machine to read.
 *  @returns The parsed {@link JssmParsedSemver}, or `undefined` if unset.
 *  @example
 *    import { sm, fsl_version } from 'jssm';
 *    const m = sm`fsl_version: 1.0.0; a -> b;`;
 *    fsl_version(m);  // => { major: 1, minor: 0, patch: 0, full: '1.0.0' }
 *  @see machine_version
 */
export declare function fsl_version<mDT>(m: Machine<mDT>): JssmParsedSemver | undefined;
/**
 * Get the complete internal state of the machine as a serializable
 *  structure.  Includes actions, edges, edge map, named transitions,
 *  reverse actions, current state, and states map.
 *  @param m The machine to read.
 *  @returns A {@link JssmMachineInternalState} snapshot.
 */
export declare function machine_state<mDT>(m: Machine<mDT>): JssmMachineInternalState<mDT>;
/*********
 *
 *  List all the states known by the machine.  Please note that the order of
 *  these states is not guaranteed.
 *
 *  @example
 *  import { from, states } from 'jssm';
 *
 *  const lswitch = from('on <=> off;');
 *  states(lswitch).sort();             // => ['off', 'on']
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns An array of all state names in the machine.
 *
 */
export declare function states<mDT>(m: Machine<mDT>): Array<StateType>;
/**
 * Get the internal state descriptor for a given state name.
 *  @param m          The machine to read.
 *  @param whichState The state to look up.
 *  @returns The {@link JssmGenericState} descriptor.
 *  @throws {JssmError} If the state does not exist.
 */
export declare function state_for<mDT>(m: Machine<mDT>, whichState: StateType): JssmGenericState;
/*********
 *
 *  Check whether the machine knows a given state.
 *
 *  @example
 *  import { from, has_state } from 'jssm';
 *
 *  const lswitch = from('on <=> off;');
 *
 *  has_state(lswitch, 'off');     // => true
 *  has_state(lswitch, 'dance');   // => false
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state to be checked for existence.
 *
 *  @returns `true` if the state exists, `false` otherwise.
 *
 */
export declare function has_state<mDT>(m: Machine<mDT>, whichState: StateType): boolean;
/*********
 *
 *  Lists all edges of a machine.  Each edge is a {@link JssmTransition}
 *  record such as `{ from: 'on', to: 'off', kind: 'main', forced_only: false,
 *  main_path: true, action: 'toggle' }`.
 *
 *  @example
 *  import { sm, list_edges } from 'jssm';
 *
 *  const lswitch = sm`on 'toggle' <=> 'toggle' off;`;
 *
 *  list_edges(lswitch).length;                                      // => 2
 *  list_edges(lswitch).map(e => [e.from, e.to, e.kind, e.action]);  // => [ ['on', 'off', 'main', 'toggle'], ['off', 'on', 'main', 'toggle'] ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to read.
 *
 *  @returns An array of all {@link JssmTransition} edge objects.
 *
 */
export declare function list_edges<mDT>(m: Machine<mDT>): Array<JssmTransition<StateType, mDT>>;
/**
 * Get the map of named transitions (transitions with explicit names).
 *  @param m The machine to read.
 *  @returns A `Map` from transition name to edge index.
 */
export declare function list_named_transitions<mDT>(m: Machine<mDT>): Map<StateType, number>;
/**
 * List all distinct action names defined anywhere in the machine.
 *  @param m The machine to read.
 *  @returns An array of action name strings.
 */
export declare function list_actions<mDT>(m: Machine<mDT>): Array<StateType>;
/**
 * Whether any actions are defined on this machine.
 *  @param m The machine to read.
 *  @returns `true` if the machine has at least one action.
 */
export declare function uses_actions<mDT>(m: Machine<mDT>): boolean;
/**
 * Whether any forced (`~>`) transitions exist in this machine.
 *  @param m The machine to read.
 *  @returns `true` if at least one forced transition is defined.
 */
export declare function uses_forced_transitions<mDT>(m: Machine<mDT>): boolean;
/*********
 *
 *  Check if the code that built the machine allows overriding state and data.
 *
 *  @param m The machine to read.
 *
 *  @returns The override permission from the FSL source code.
 *
 */
export declare function code_allows_override<mDT>(m: Machine<mDT>): JssmAllowsOverride;
/*********
 *
 *  Check if the machine config allows overriding state and data.
 *
 *  @param m The machine to read.
 *
 *  @returns The override permission from the runtime config.
 *
 */
export declare function config_allows_override<mDT>(m: Machine<mDT>): JssmAllowsOverride;
/*********
 *
 *  Check if a machine allows overriding state and data.  Resolves the
 *  combined effect of code and config permissions — config may not be
 *  less strict than code.
 *
 *  @param m The machine to read.
 *
 *  @returns The effective override permission.
 *
 */
export declare function allows_override<mDT>(m: Machine<mDT>): JssmAllowsOverride;
/*********
 *
 *  Return the effective island policy for this machine.  `true` means
 *  disconnected components are allowed (the default), `false` requires a
 *  single connected component, and `'with_start'` allows islands only when
 *  every component contains at least one start state.
 *
 *  @param m The machine to read.
 *
 *  @returns The island policy stored in the machine.
 *
 */
export declare function allow_islands<mDT>(m: Machine<mDT>): JssmAllowIslands;
/**
 * List the ASCII character ranges accepted by the FSL grammar in any but
 *  the first position of a state name (atom): digits, letters, and
 *  underscore.  Each entry is an inclusive `{from, to}` range of single
 *  Unicode characters.  Non-ASCII characters are classified by
 *  {@link is_state_name_char}, the complete rule (#754).
 *  @param m The machine to read; the table is the grammar's, the same for every machine.
 *  @returns An array of `{from, to}` inclusive character ranges.
 *  @example
 *  import { sm, all_state_name_chars } from 'jssm';
 *  const m = sm`a -> b;`;
 *  all_state_name_chars(m).some(r => '_' >= r.from && '_' <= r.to);  // => true
 *  all_state_name_chars(m).some(r => '+' >= r.from && '+' <= r.to);  // => false
 */
export declare function all_state_name_chars<mDT>(m: Machine<mDT>): ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 * List the ASCII character ranges accepted by the FSL grammar in the first
 *  position of a state name (atom): letters and underscore (never a
 *  digit).  Non-ASCII characters are classified by
 *  {@link is_state_name_first_char}, the complete rule (#754).
 *  @param m The machine to read; the table is the grammar's, the same for every machine.
 *  @returns An array of `{from, to}` inclusive character ranges.
 *  @example
 *  import { sm, all_state_name_first_chars } from 'jssm';
 *  const m = sm`a -> b;`;
 *  all_state_name_first_chars(m).some(r => '_' >= r.from && '_' <= r.to);  // => true
 *  all_state_name_first_chars(m).some(r => '+' >= r.from && '+' <= r.to);  // => false
 */
export declare function all_state_name_first_chars<mDT>(m: Machine<mDT>): ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 * List the character ranges accepted inside a single-quoted FSL action
 *  label without escaping.  Space is allowed; the apostrophe `'` is
 *  explicitly excluded since it terminates the label.
 *  @param m The machine to read; the table is the grammar's, the same for every machine.
 *  @returns An array of `{from, to}` inclusive character ranges.
 *  @example
 *  import { sm, all_action_label_chars } from 'jssm';
 *  const m = sm`a -> b;`;
 *  all_action_label_chars(m).some(r => ' ' >= r.from && ' ' <= r.to);   // => true
 *  all_action_label_chars(m).some(r => "'" >= r.from && "'" <= r.to);   // => false
 */
export declare function all_action_label_chars<mDT>(m: Machine<mDT>): ReadonlyArray<{
    from: string;
    to: string;
}>;
/**
 * Look up a transition's edge index by source and target state names.
 *  @param m    The machine to read.
 *  @param from Source state name.
 *  @param to   Target state name.
 *  @returns The edge index in the edges array, or `undefined` if no
 *  such transition exists.
 */
export declare function get_transition_by_state_names<mDT>(m: Machine<mDT>, from: StateType, to: StateType): number;
/**
 * Look up the full transition object for a given source→target pair.
 *  @param m    The machine to read.
 *  @param from Source state name.
 *  @param to   Target state name.
 *  @returns The {@link JssmTransition} object, or `undefined` if none exists.
 */
export declare function lookup_transition_for<mDT>(m: Machine<mDT>, from: StateType, to: StateType): JssmTransition<StateType, mDT>;
/********
 *
 *  List all transitions attached to the current state, sorted by entrance and
 *  exit.  The order of each sublist is not defined.  A node could appear in
 *  both lists.
 *
 *  @example
 *  import { sm, state, list_transitions } from 'jssm';
 *
 *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);               // => 'red'
 *  list_transitions(light);    // => { entrances: [ 'yellow', 'off' ], exits: [ 'green', 'off' ] }
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state whose transitions to have listed; defaults to the current state.
 *
 *  @returns The entrances and exits of the state.
 *
 */
export declare function list_transitions<mDT>(m: Machine<mDT>, whichState?: StateType): JssmTransitionList;
/********
 *
 *  List all entrances attached to the current state.  Please note that the
 *  order of the list is not defined.  This list includes both unforced and
 *  forced entrances; if this isn't desired, consider
 *  `list_unforced_entrances` or `list_forced_entrances` as
 *  appropriate.
 *
 *  @example
 *  import { sm, state, list_entrances } from 'jssm';
 *
 *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);               // => 'red'
 *  list_entrances(light);      // => [ 'yellow', 'off' ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state whose entrances to have listed; defaults to the current state.
 *
 *  @returns The names of the states with an edge into `whichState`.
 *
 */
export declare function list_entrances<mDT>(m: Machine<mDT>, whichState?: StateType): Array<StateType>;
/********
 *
 *  List all exits attached to the current state.  Please note that the order
 *  of the list is not defined.  This list includes both unforced and forced
 *  exits; if this isn't desired, consider `list_unforced_exits` or
 *  `list_forced_exits` as appropriate.
 *
 *  @example
 *  import { sm, state, list_exits } from 'jssm';
 *
 *  const light = sm`red 'next' -> green 'next' -> yellow 'next' -> red; [red yellow green] 'shutdown' ~> off 'start' -> red;`;
 *
 *  state(light);               // => 'red'
 *  list_exits(light);          // => [ 'green', 'off' ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state whose exits to have listed; defaults to the current state.
 *
 *  @returns The names of the states with an edge out of `whichState`.
 *
 */
export declare function list_exits<mDT>(m: Machine<mDT>, whichState?: StateType): Array<StateType>;
/********
 *
 *  List all actions available from this state.  Please note that the order of
 *  the actions is not guaranteed.
 *
 *  @example
 *  import { sm, act, state, actions } from 'jssm';
 *
 *  const machine = sm`
 *    red 'next' -> green 'next' -> yellow 'next' -> red;
 *    [red yellow green] 'shutdown' ~> off 'start' -> red;
 *  `;
 *
 *  state(machine);             // => 'red'
 *  actions(machine).sort();    // => ['next', 'shutdown']
 *
 *  act(machine, 'next');       // => true
 *  state(machine);             // => 'green'
 *  actions(machine).sort();    // => ['next', 'shutdown']
 *
 *  act(machine, 'shutdown');   // => true
 *  state(machine);             // => 'off'
 *  actions(machine);           // => ['start']
 *
 *  act(machine, 'start');      // => true
 *  state(machine);             // => 'red'
 *  actions(machine).sort();    // => ['next', 'shutdown']
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The state whose actions to list.  Defaults to the
 *  current state.
 *
 *  @returns An array of action names available from the given state.
 *
 *  @throws {JssmError} If the state does not exist.
 *
 */
export declare function actions<mDT>(m: Machine<mDT>, whichState?: StateType): Array<StateType>;
/********
 *
 *  List all states that have a specific action attached.  Please note that
 *  the order of the states is not guaranteed.
 *
 *  @example
 *  import { sm, list_states_having_action } from 'jssm';
 *
 *  const machine = sm`
 *    red 'next' -> green 'next' -> yellow 'next' -> red;
 *    [red yellow green] 'shutdown' ~> off 'start' -> red;
 *  `;
 *
 *  list_states_having_action(machine, 'next').sort();    // => ['green', 'red', 'yellow']
 *  list_states_having_action(machine, 'start');          // => ['off']
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m          The machine to read.
 *  @param whichState The action to be checked for associated states
 *
 *  @returns The names of the states the action exits from.
 *
 *  @throws {JssmError} If no state has the action.
 *
 */
export declare function list_states_having_action<mDT>(m: Machine<mDT>, whichState: StateType): Array<StateType>;
/**
 * List all action names available as exits from a given state.
 *
 *  Returns the empty array (does not throw) when `whichState` exists but has
 *  no action-named exits — including terminal states, states whose only
 *  exits are plain `->` transitions, and states in machines that use no
 *  actions at all.  Only nonexistent states cause a throw.
 *  @param m          The machine to read.
 *  @param whichState The state to inspect.  Defaults to the current state.
 *  @returns An array of action name strings, possibly empty.
 *  @throws {JssmError} If the state does not exist.
 *  @example
 *    import { sm, list_exit_actions } from 'jssm';
 *    const m = sm`a 'go' -> b; b -> c;`;
 *    list_exit_actions(m, 'a');  // => ['go']
 *    list_exit_actions(m, 'b');  // => []
 *    list_exit_actions(m, 'c');  // => []
 *    expect(() => list_exit_actions(m, 'z')).toThrow();
 */
export declare function list_exit_actions<mDT>(m: Machine<mDT>, whichState?: StateType): Array<StateType>;
/**
 * List all action exits from a state with their probabilities and shares.
 *  @param m          The machine to read.
 *  @param whichState The state to inspect.  Defaults to the current state.
 *  @returns An array of `{ action, probability, share }` objects — `share`
 *           is the edge's within-list share (6.0 list weights), present
 *           only for an edge that landed on a list side with no declared
 *           `probability`; `undefined` otherwise, same as the edge itself.
 *  @throws {JssmError} If the state does not exist.
 */
export declare function probable_action_exits<mDT>(m: Machine<mDT>, whichState?: StateType): Array<any>;
/**
 * Check whether a state has no incoming transitions (unreachable after start).
 *  @param m          The machine to read.
 *  @param whichState The state to check.
 *  @returns `true` if the state has zero entrances.
 *  @throws {JssmError} If the state does not exist.
 */
export declare function is_unenterable<mDT>(m: Machine<mDT>, whichState: StateType): boolean;
/**
 * Check whether any state in the machine is unenterable.
 *  @param m The machine to read.
 *  @returns `true` if at least one state has no incoming transitions.
 */
export declare function has_unenterables<mDT>(m: Machine<mDT>): boolean;
/**
 * Check whether the current state is terminal (has no exits).
 *  @param m The machine to read.
 *  @returns `true` if the current state has zero exits.
 */
export declare function is_terminal<mDT>(m: Machine<mDT>): boolean;
/**
 * Check whether a specific state is terminal (has no exits).
 *  @param m          The machine to read.
 *  @param whichState The state to check.
 *  @returns `true` if the state has zero exits.
 *  @throws {JssmError} If the state does not exist.
 */
export declare function state_is_terminal<mDT>(m: Machine<mDT>, whichState: StateType): boolean;
/**
 * Check whether any state in the machine is terminal.
 *  @param m The machine to read.
 *  @returns `true` if at least one state has no exits.
 */
export declare function has_terminals<mDT>(m: Machine<mDT>): boolean;
/**
 * Check whether the current state is complete (every exit has an action).
 *  @param m The machine to read.
 *  @returns `true` if the current state is complete.
 */
export declare function is_complete<mDT>(m: Machine<mDT>): boolean;
/**
 * Check whether a specific state is complete (every exit has an action).
 *  @param m          The machine to read.
 *  @param whichState The state to check.
 *  @returns `true` if the state is complete.
 *  @throws {JssmError} If the state does not exist.
 */
export declare function state_is_complete<mDT>(m: Machine<mDT>, whichState: StateType): boolean;
/**
 * Check whether any state in the machine is complete.
 *  @param m The machine to read.
 *  @returns `true` if at least one state is complete.
 */
export declare function has_completes<mDT>(m: Machine<mDT>): boolean;
/**
 * Get all edges between two states (there can be multiple with
 *  different actions).
 *  @param m    The machine to read.
 *  @param from Source state name.
 *  @param to   Target state name.
 *  @returns An array of matching {@link JssmTransition} objects.
 */
export declare function edges_between<mDT>(m: Machine<mDT>, from: string, to: string): JssmTransition<StateType, mDT>[];
/**
 * Get the edge index for an action from the current state.
 *  Interned dispatch: resolves via the numeric (action, from) index —
 *  unknown action names miss without throwing.
 *  @param m      The machine to read.
 *  @param action The action name.
 *  @returns The edge index, or `undefined` if the action is not available.
 */
export declare function current_action_for<mDT>(m: Machine<mDT>, action: StateType): number;
/**
 * Get the full transition object for an action from the current state.
 *  @param m      The machine to read.
 *  @param action The action name.
 *  @returns The {@link JssmTransition} object.
 *  @throws {JssmError} If the action is not available from the current state.
 */
export declare function current_action_edge_for<mDT>(m: Machine<mDT>, action: StateType): JssmTransition<StateType, mDT>;
export {};
