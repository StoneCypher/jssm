import { JssmTransition, JssmCompileSe, JssmCompileSeStart, JssmParseTree, JssmParseOptions, JssmGenericConfig, JssmGroupRegistry, FslSourceLocation } from './jssm_types.js';
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
declare function nth_matching_loc<StateType, mDT>(tree: JssmParseTree<StateType, mDT>, predicate: (node: JssmCompileSeStart<StateType, mDT>) => boolean, n: number): FslSourceLocation | undefined;
/*********
 *
 *  Internal method meant to perform factory assembly of an edge.  Not meant for
 *  external use.  Constructs a {@link JssmTransition} from a parsed
 *  semi-edge (`this_se`), a source state, a target state, and directionality.
 *
 *  @internal
 *
 *  @typeParam StateType The type of state names (usually `string`).
 *  @typeParam mDT       The type of the machine data member; usually omitted.
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
declare function makeTransition<StateType, mDT>(this_se: JssmCompileSe<StateType, mDT>, from: StateType, to: StateType, isRight: boolean, _wasList?: Array<StateType>, _wasIndex?: number): JssmTransition<StateType, mDT>;
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
 *  @typeParam StateType The type of state names in the resulting tree; the
 *                       grammar itself always produces `string`s, so only
 *                       override this when threading a caller's own state
 *                       naming through to {@link compile}.
 *  @typeParam mDT       The type of the machine data member; usually omitted.
 *
 *  @param input The FSL code to be evaluated
 *
 *  @param options Things to control about the parse.  Pass
 *                 `{ locations: true }` to enable opt-in source location
 *                 tracking on every AST node.  When omitted, an empty options
 *                 object is passed through to the parser.
 *
 *  @returns The machine's intermediate representation: a flat
 *           {@link JssmParseTree} with one node per top-level FSL statement.
 *
 *  @throws {SyntaxError} The generated PEG.js parser's `SyntaxError` when
 *                        `input` is not valid FSL.
 *
 *  @see {@link compile}
 *  @see {@link make}
 *  @see {@link JssmParseOptions}
 *
 */
declare function wrap_parse<StateType = string, mDT = unknown>(input: string, options?: JssmParseOptions): JssmParseTree<StateType, mDT>;
/*********
 *
 *  Builds the ordered {@link JssmGroupRegistry} from every `named_list` node
 *  in a parse tree, preserving declaration order of each group's direct
 *  members.  Only direct members are stored; transitive (flattened)
 *  membership is resolved separately by {@link transitive_members} so the
 *  group→group graph survives for later precedence/viz work.
 *
 *  ```typescript
 *  build_group_registry(parse('&g : [a b];'));
 *  // Map { 'g' => [ { kind:'state', name:'a' }, { kind:'state', name:'b' } ] }
 *  ```
 *
 *  @param tree The parse tree to scan for group declarations.
 *
 *  @returns A `Map` from group name to its ordered direct members.
 *
 *  @throws {JssmError} If two `named_list` nodes declare the same group name.
 *
 *  @see transitive_members
 *  @see group_registry_cycle_check
 */
declare function build_group_registry<StateType, mDT>(tree: JssmParseTree<StateType, mDT>): JssmGroupRegistry;
/*********
 *
 *  Walks the group→group edges of a {@link JssmGroupRegistry} (both `nest`
 *  and `spread` members count as edges) and throws on a cycle.  A cycle
 *  would make transitive membership non-terminating, so it is rejected at
 *  compile time.
 *
 *  ```typescript
 *  group_registry_cycle_check(build_group_registry(parse('&a:[&b]; &b:[&a];')));
 *  // throws JssmError: Group membership cycle detected: &a -> &b -> &a
 *  ```
 *
 *  @param registry The ordered group registry to validate.
 *
 *  @throws {JssmError} If any group transitively contains itself.
 *
 *  @see build_group_registry
 */
declare function group_registry_cycle_check(registry: JssmGroupRegistry): void;
/*********
 *
 *  Resolves a group to its ordered, flat list of member STATE names,
 *  splicing each nested or spread sub-group's resolved members in at the
 *  position the sub-group occupies.  `nest` and `spread` produce the same
 *  state set here; their structural distinction is retained only in the
 *  registry for later viz/precedence.  Results are cached in `memo` so a
 *  group shared by several parents resolves once.
 *
 *  Assumes the registry is acyclic — run {@link group_registry_cycle_check}
 *  first.
 *
 *  ```typescript
 *  const reg = build_group_registry(parse('&inner:[a b]; &outer:[&inner c];'));
 *  transitive_members(reg, 'outer', new Map());  // [ 'a', 'b', 'c' ]
 *  ```
 *
 *  @param registry The ordered group registry.
 *  @param group    The group name to flatten.
 *  @param memo     A cache from group name to its already-resolved state
 *                  list; shared across calls to memoize overlapping work.
 *
 *  @returns The ordered member state names.
 *
 *  @see build_group_registry
 */
declare function transitive_members(registry: JssmGroupRegistry, group: string, memo: Map<string, string[]>): string[];
/*********
 *
 *  Validates that every `group`-kind member of every group in the registry
 *  names a group that is itself declared.  A `&outer : [&missing]` whose
 *  `missing` group is never declared is a compile error — the analogue, on
 *  the membership side, of the unresolved transition/target reference rejected
 *  by {@link resolve_group_refs}.  Plain `state`-kind members are NOT checked:
 *  states are never pre-declared in FSL, so any label is acceptable there.
 *
 *  ```typescript
 *  // `&outer : [&missing];` throws:
 *  //   JssmError: Unresolved group reference: &missing
 *  ```
 *
 *  @param registry The compiled group registry to validate.
 *
 *  @throws {JssmError} If any group member references an undeclared group,
 *                      naming the unresolved member.
 *
 *  @see resolve_group_refs
 *  @see build_group_registry
 *  @internal
 */
declare function validate_group_members(registry: JssmGroupRegistry): void;
/*********
 *
 *  Computes the minimum membership distance from a source `state` up to a
 *  containing `group` — the specificity metric that drives group-vs-group
 *  conflict resolution.  Distance 1 means `state` is a direct member of
 *  `group`; distance 2 means `state` belongs to some sub-group nested (or
 *  spread) one hop inside `group`; and so on.  A smaller distance means the
 *  group is "nearer"/"more specific" to the state, so it wins.
 *
 *  The walk is a breadth-first descent over the group→group membership edges
 *  starting at `group`: a group dequeued at hop-count `h` contributes its
 *  direct `state` members at distance `h + 1`, and enqueues its `group`
 *  members at hop-count `h + 1`.  BFS guarantees the first time `state` is
 *  seen is via a shortest path; cycles cannot occur because the registry is
 *  validated acyclic by {@link group_registry_cycle_check} first, but a
 *  `visited` set guards against re-expansion regardless.
 *
 *  ```typescript
 *  // for `&Playing:[normal]; &Active:[&Playing];`
 *  // membership_distance(reg, 'normal', 'Playing') === 1
 *  // membership_distance(reg, 'normal', 'Active')  === 2
 *  ```
 *
 *  @param registry The compiled group registry.
 *  @param state    The source state whose distance is measured.
 *  @param group    The containing group to measure the distance to.
 *
 *  @returns The minimum membership distance (>= 1), or `Infinity` if `state`
 *           is not a transitive member of `group`.
 *
 *  @see transitive_members
 *  @internal
 */
declare function membership_distance(registry: JssmGroupRegistry, state: string, group: string): number;
/*********
 *
 *  Compile a machine's JSON intermediate representation to a config object.  If
 *  you're using this (probably don't,) you're probably also using
 *  {@link parse} to get the IR, and the object constructor
 *  {@link Machine.constructor} to turn the config object into a workable machine.
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
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param tree The parse tree to be boiled down into a machine config.  If the
 *              tree was produced with `parse(input, { locations: true })`, any
 *              semantic error thrown will carry a `source_location` span
 *              pointing at the offending statement.
 *
 *  @throws {JssmError} If the document declares no transitions (for example a
 *                      states-first document of only `state` blocks) — a
 *                      machine requires at least one transition; also for
 *                      repeated property definitions, group errors, and other
 *                      semantic problems noted throughout.
 *
 */
declare function compile<StateType, mDT>(tree: JssmParseTree<StateType, mDT>): JssmGenericConfig<StateType, mDT>;
/*********
 *
 *  An internal convenience wrapper for parsing then compiling a machine string.
 *  Not generally meant for external use.  Please see {@link compile} or
 *  {@link sm}.
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param plan The FSL code to be evaluated and built into a machine config
 *
 */
declare function make<StateType, mDT>(plan: string): JssmGenericConfig<StateType, mDT>;
export { compile, make, makeTransition, build_group_registry, group_registry_cycle_check, transitive_members, validate_group_members, membership_distance, wrap_parse, nth_matching_loc };
