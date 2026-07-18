
import { JssmError } from './jssm_error.js';
import { parse }     from './fsl_parser.js';

import {
  arrow_direction,
  arrow_left_kind,
  arrow_right_kind
} from './jssm_arrow.js';

import {
  find_repeated,
  name_bind_prop_and_state
} from './jssm_util.js';

import {
  JssmTransition,
    JssmTransitions,
  JssmArrow,
  JssmArrowKind,
  JssmCompileSe,
    JssmCompileSeStart,
  JssmCompileRule,
  JssmParseTree,
  JssmParseOptions,
  JssmStateConfig,
  JssmGenericConfig,
  JssmEditorConfig,
  JssmStateDeclaration,
  JssmLayout,
  JssmPropertyDefinition,
  JssmValDefinition,
  JssmAllowsOverride,
  JssmTransitionStyleKey,
  JssmGraphStyleKey,
  JssmColor,
  JssmGroupMemberRef,
  JssmGroupRegistry,
  JssmBoundaryHooks,
  JssmGroupHooks,
  JssmStateHooks,
  FslSourceLocation,
  JssmAllowIslands,
  JssmDefaultSize,
  JssmParsedSemver
} from './jssm_types.js';

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

function nth_matching_loc<StateType, mDT>(
  tree      : JssmParseTree<StateType, mDT>,
  predicate : (node: JssmCompileSeStart<StateType, mDT>) => boolean,
  n         : number
): FslSourceLocation | undefined {

  let count = 0;

  for (const node of tree) {
    if (!predicate(node)) {
    	continue;
    }

    count++;
    if (count === n) { return node.loc; }
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

function makeTransition<StateType, mDT>(

  this_se    : JssmCompileSe<StateType, mDT>,
  from       : StateType,
  to         : StateType,
  isRight    : boolean,
  _wasList?  : Array<StateType>,
  _wasIndex? : number

): JssmTransition<StateType, mDT> {

  // the explicit quotation syntax lets `""` through the grammar; a nameless
  // state can never be addressed, so reject at edge assembly (fsl#653)
  if ((from as unknown) === '') { throw new JssmError(undefined, 'A state name may not be the empty string (transition source)'); }
  if ((to   as unknown) === '') { throw new JssmError(undefined, 'A state name may not be the empty string (transition target)'); }

  // `this_se.kind` is typed `string` rather than JssmArrow — see the field's own
  // note in jssm_types.ts.  The classifiers reject anything that isn't a real
  // arrow, so an unsound value throws here rather than passing silently.
  const arrow: JssmArrow = this_se.kind as JssmArrow,

        kind: JssmArrowKind = isRight
                            ? arrow_right_kind(arrow)
                            : arrow_left_kind(arrow),

        // action and probability are pre-declared (as after_time always was)
        // so every compiled edge shares ONE hidden class regardless of which
        // optional fields its declaration carries.  The conditional assigns
        // below then overwrite a value instead of adding a property, keeping
        // the runtime _edges array monomorphic for the dispatch-path loads
        // (.kind / .to / .forced_only) that run on every transition.
        edge: JssmTransition<StateType, mDT> = {
          from,
          to,
          kind,
          after_time  : isRight? this_se.r_after : this_se.l_after,
          forced_only : kind === 'forced',
          main_path   : kind === 'main',
          action      : undefined,
          probability : undefined
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

  const action      : string = isRight ? 'r_action'      : 'l_action',
        probability : string = isRight ? 'r_probability' : 'l_probability';

  if (this_se[action]      != null) { edge.action      = this_se[action]; }
  if (this_se[probability] != null) { edge.probability = this_se[probability]; }

  // same rejection for `''` action quotation — an action nobody can name
  // can never be dispatched (fsl#653)
  if (edge.action === '') { throw new JssmError(undefined, 'An action name may not be the empty string'); }

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

function wrap_parse<StateType = string, mDT = unknown>(
  input    : string,
  options? : JssmParseOptions
): JssmParseTree<StateType, mDT> {
  return parse(input, options || {});
}





/*********
 *
 *  Normalizes a single parsed `named_list` value into an ordered array of
 *  {@link JssmGroupMemberRef}.  The grammar returns a bare `string[]` when a
 *  list contains only plain labels (the historical NamedList shape), and an
 *  array of member objects as soon as any `&`/`...&` group member appears.
 *  This collapses both forms into the uniform member-object shape used by
 *  the {@link JssmGroupRegistry}.
 *
 *  ```typescript
 *  normalize_group_members(['a', 'b']);
 *  // [ { kind: 'state', name: 'a' }, { kind: 'state', name: 'b' } ]
 *  ```
 *
 *  @param value The `value` field of a parsed `named_list` node — either a
 *               `string[]` of plain labels or an array of member objects.
 *
 *  @returns The ordered direct members as {@link JssmGroupMemberRef} objects.
 *
 *  @internal
 */

function normalize_group_members(value: Array<unknown>): JssmGroupMemberRef[] {
  return value.map((member: unknown) =>
    (typeof member === 'string')
      ? { kind: 'state', name: member }
      : member as JssmGroupMemberRef
  );
}





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

function build_group_registry<StateType, mDT>(tree: JssmParseTree<StateType, mDT>): JssmGroupRegistry {

  const registry: JssmGroupRegistry = new Map();

  for (const node of tree as Array<any>) {                            // TODO FIXME no any
    if (node.key !== 'named_list') {
    	continue;
    }

    if (registry.has(node.name)) {
      throw new JssmError(undefined, `Cannot redeclare group: &${node.name}`);
    }
    registry.set(node.name, normalize_group_members(node.value));
  }

  return registry;

}





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

function group_registry_cycle_check(registry: JssmGroupRegistry): void {

  const visiting : Set<string> = new Set();   // on the current DFS stack
  const visited  : Set<string> = new Set();   // fully explored, known acyclic

  const walk = (group: string, path: Array<string>): void => {

    if (visiting.has(group)) {
      const cycle: string = [...path, group].map((g: string) => `&${g}`).join(' -> ');
      throw new JssmError(undefined, `Group membership cycle detected: ${cycle}`);
    }

    if (visited.has(group)) { return; }

    visiting.add(group);

    const group_members: Array<JssmGroupMemberRef> = registry.get(group) ?? [];
    for (const member of group_members) {
      if (member.kind === 'group') {
        walk(member.name, [...path, group]);
      }
    }

    visiting.delete(group);
    visited.add(group);

  };

  for (const group of registry.keys()) { walk(group, []); }

}





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

function transitive_members(
  registry : JssmGroupRegistry,
  group    : string,
  memo     : Map<string, string[]>
): string[] {

  const cached: string[] | undefined = memo.get(group);
  if (cached !== undefined) { return cached; }

  const out: string[] = [];

  const group_members: Array<JssmGroupMemberRef> = registry.get(group) ?? [];
  for (const member of group_members) {
    if (member.kind === 'state') {
      out.push(member.name);
    } else {
      for (const s of transitive_members(registry, member.name, memo)) {
        out.push(s);
      }
    }
  }

  memo.set(group, out);
  return out;

}





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

function validate_group_members(registry: JssmGroupRegistry): void {

  for (const members of registry.values()) {
    for (const member of members) {
      if ((member.kind === 'group') && (!registry.has(member.name))) {
        throw new JssmError(undefined, `Unresolved group reference: &${member.name}`);
      }
    }
  }

}





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

function membership_distance(
  registry : JssmGroupRegistry,
  state    : string,
  group    : string
): number {

  const visited : Set<string>                      = new Set([group]);
  let   frontier: Array<{ group: string, hops: number }> = [{ group, hops: 0 }];

  while (frontier.length > 0) {

    const next: Array<{ group: string, hops: number }> = [];

    for (const { group: g, hops } of frontier) {
      const members: JssmGroupMemberRef[] = registry.get(g) ?? [];

      for (const member of members) {
        if (member.kind === 'state') {
          if (member.name === state) { return hops + 1; }
        } else if (!visited.has(member.name)) {
          visited.add(member.name);
          next.push({ group: member.name, hops: hops + 1 });
        }
      }
    }

    frontier = next;

  }

  return Infinity;

}





/**
 *  Transient conflict-resolution metadata for one compiled edge, carried
 *  BESIDE the edge in {@link edge_decl_meta} instead of stamped onto it.
 *  @internal
 */
type EdgeDeclMeta = {
  decl_id      : number,
  source_group : string | undefined,
  specificity  : number | undefined
};

// Carried in a side table rather than as `__decl_id`/`__source_group`/
// `__specificity` properties on the edges: the old stamp-then-`delete`
// pipeline forced a hidden-class transition per edge, and for group-sourced
// edges the delete (not last-added property) demoted the very objects that
// become the runtime `_edges` array into V8 dictionary mode for the machine's
// whole life, taxing every dispatch-path `.kind`/`.to`/`.forced_only` load.
// WeakMap keys are per-compile edge objects, so entries cannot leak across
// compiles and are collected with the edges.
const edge_decl_meta: WeakMap<object, EdgeDeclMeta> = new WeakMap();



/*********
 *
 *  Arbitrates transitions that compete for the same `(source_state, action)`
 *  pair after group-as-source expansion, returning a new edge list in which
 *  each such pair keeps exactly one winner.  The transient conflict-resolution
 *  metadata lives in {@link edge_decl_meta}, never on the edges themselves.
 *  Edges without an `action`, and `(from, action)` pairs claimed
 *  by a single edge, pass through untouched (so a genuine user-authored
 *  duplicate like `a 'x' -> b; a 'x' -> c;` still reaches — and is rejected
 *  by — the Machine constructor's one-action-per-origin check).
 *
 *  The winner for a contested pair is chosen by the inner-overrides-outer
 *  (statechart) rule:
 *
 *  1. A **state-specific** edge (one with no `__source_group`, i.e. authored
 *     directly rather than via a group source) always beats every
 *     group-sourced edge for that pair.  All state-specific edges survive
 *     (any duplication among them is the user's own and is left for the
 *     runtime to reject); all group-sourced edges are dropped silently —
 *     overriding a group with a state is the documented, expected case.
 *  2. Otherwise the contest is among group-sourced edges: the one with the
 *     SMALLEST `__specificity` (nearest / innermost group) wins.
 *  3. An equal-specificity tie breaks by **declaration order** — the edge
 *     appearing later in the source (later array index) wins.
 *
 *  Whenever a group-sourced edge is dropped in favor of another group-sourced
 *  edge, a `console.warn` names the overridden group, the overriding group,
 *  and the shared source state.
 *
 *  ```typescript
 *  // `&Playing:[normal]; &Active:[&Playing];
 *  //  &Playing 'error' -> buffering; &Active 'error' -> stopped;`
 *  // for `normal`: Playing (distance 1) beats Active (distance 2), so the
 *  // surviving edge is `normal 'error' -> buffering`.
 *  ```
 *
 *  @param edges The assembled, post-expansion edge list.
 *  @param has_group_sources Whether the machine declared any groups at all;
 *         when `false` no edge can carry a source group, the arbitration is a
 *         provable pass-through, and the bucketing work (one JSON key per
 *         actioned edge) is skipped entirely.
 *
 *  @returns The edge list with contested pairs resolved; surviving edges keep
 *           their original relative order.
 *
 *  @see resolve_group_refs
 *  @see membership_distance
 *  @internal
 */

function resolve_transition_conflicts<StateType, mDT>(
  edges: Array<JssmTransition<StateType, mDT>>,
  has_group_sources: boolean = true
): Array<JssmTransition<StateType, mDT>> {

  if (!has_group_sources) { return edges; }

  type DeclEntry = {
    decl_id      : number | undefined,
    indices      : Array<number>,
    source_group : string | undefined,
    specificity  : number
  };

  // Group edge indices by (from, action), then by declaration within each, so
  // sibling edges of one fan-out (shared decl_id) never override each other.
  // Reverse-direction edges (`<-` halves) carry no metadata and share the
  // `undefined` declaration bucket, exactly as the untagged edges did before.
  const buckets: Map<string, Map<number | undefined, DeclEntry>> = new Map();

  for (const [index, edge] of edges.entries()) {
    if (edge.action == null) { continue; }               // actionless edges never contest on action
    const key: string = JSON.stringify([String(edge.from), String(edge.action)]);

    let by_decl: Map<number | undefined, DeclEntry> | undefined = buckets.get(key);
    if (by_decl === undefined) { by_decl = new Map(); buckets.set(key, by_decl); }

    const meta: EdgeDeclMeta | undefined = edge_decl_meta.get(edge);
    const decl_id: number | undefined = meta === undefined ? undefined : meta.decl_id;
    const entry: DeclEntry | undefined = by_decl.get(decl_id);
    if (entry === undefined) {
      by_decl.set(decl_id, {
        decl_id,
        indices      : [index],
        source_group : meta === undefined ? undefined : meta.source_group,
        specificity  : (meta === undefined ? undefined : meta.specificity) ?? Infinity
      });
    } else {
      entry.indices.push(index);
    }
  }

  const dropped: Set<number> = new Set();

  // Arbitrates one (from, action) bucket of competing declarations, adding
  // each losing declaration's edge indices to `dropped`.
  const arbitrate_bucket = (by_decl: Map<number | undefined, DeclEntry>): void => {

    const decls: Array<DeclEntry> = [...by_decl.values()];
    if (decls.length < 2) { return; }                    // a single declaration cannot conflict

    const state_decls : Array<DeclEntry> = decls.filter((d: DeclEntry) => d.source_group === undefined);
    const group_decls : Array<DeclEntry> = decls.filter((d: DeclEntry) => d.source_group !== undefined);

    // Rule 1: any state-specific declaration wins — drop every group-sourced
    // edge silently, keep every state-specific edge (runtime rejects genuine
    // user dupes among the state declarations).
    if (state_decls.length > 0) {
      for (const d of group_decls) {
        for (const i of d.indices) { dropped.add(i); }
      }
      return;
    }

    // Rule 2 + 3: among group-sourced declarations, smallest specificity wins;
    // ties break by later declaration order (larger decl_id).
    let winner: DeclEntry = group_decls[0];
    for (const d of group_decls) {
      const nearer    : boolean = d.specificity < winner.specificity;
      const tie_later : boolean = (d.specificity === winner.specificity) && (d.decl_id > winner.decl_id);
      if (nearer || tie_later) { winner = d; }
    }

    for (const d of group_decls) {
      if (d.decl_id === winner.decl_id) {
        continue;
      }

      for (const i of d.indices) { dropped.add(i); }

      console.warn(
        `jssm: group &${d.source_group} transition for state '${String(edges[d.indices[0]].from)}' `
        + `on action '${String(edges[d.indices[0]].action)}' is overridden by nearer group `
        + `&${winner.source_group}`
      );
    }

  };

  for (const by_decl of buckets.values()) { arbitrate_bucket(by_decl); }

  // Emit survivors in original order.  No stripping: the metadata never
  // touched the edge objects, so their hidden classes are intact for the
  // runtime dispatch paths that will load from them for the machine's life.
  const out: Array<JssmTransition<StateType, mDT>> = [];

  for (const [index, edge] of edges.entries()) {
    if (dropped.has(index)) { continue; }
    out.push(edge);
  }

  return out;

}





/*********
 *
 *  Reports whether a parsed transition endpoint is a group reference
 *  (`&Name`), i.e. a `{ key: 'group_ref', name }` node.  Used to drive
 *  reference resolution and fan-out-target rewriting.
 *
 *  A plain label is a `string` (rejected by the `typeof` test), a list
 *  target is an `Array` (an object whose `.key` is `undefined`), and a
 *  cycle/stripe marker is an object with a different `.key` — all three
 *  return `false`.  The parser never emits a `null` endpoint, so the
 *  `typeof === 'object'` guard alone is sufficient.
 *
 *  @param endpoint A transition `from` or `to` value from the parse tree.
 *
 *  @returns `true` for a group-reference node, `false` for a plain label,
 *           a label list, or a cycle/stripe marker.
 *
 *  @internal
 */

function is_group_ref(endpoint: any): endpoint is { key: 'group_ref', name: string } {  // TODO FIXME no any
  return (typeof endpoint === 'object')
      && (endpoint.key === 'group_ref');
}





/*********
 *
 *  Resolves every `group_ref` used as a transition source/target or hook
 *  subject against the registry, throwing on an unresolved name, and produces
 *  a parse tree in which:
 *
 *  - every group-reference TARGET (any `to` position in an arrow chain) is
 *    rewritten in place to the ordered state array produced by
 *    {@link transitive_members}, so the existing list-target fan-out in
 *    {@link compile_rule_transition_step} expands it to one edge per member;
 *  - every group-reference SOURCE (a `from` position) is FANNED OUT to one
 *    transition node per transitive member, each carrying a transient
 *    `__source_group` (the declared group name) and `__specificity` (that
 *    member's {@link membership_distance} from the declared group) used only
 *    by {@link resolve_transition_conflicts} and stripped before emission.
 *
 *  Forward references resolve because the registry is built from the whole
 *  tree before this pass runs.  Non-transition nodes (state declarations,
 *  hook declarations, ...) pass through untouched, except that hook subjects
 *  are validated.
 *
 *  ```typescript
 *  // `&g : [a b]; foo -> &g;` rewrites the target to `['a','b']`, which
 *  // then fans out to `foo -> a; foo -> b;`.
 *  // `&g : [a b]; &g 'x' -> y;` fans the source out to two transition nodes
 *  // `a 'x' -> y;` and `b 'x' -> y;`.
 *  ```
 *
 *  @param tree     The parse tree to resolve; target/hook validation mutates
 *                  transition `to` links in place, but source fan-out is
 *                  returned as a NEW node array (the input is not reordered).
 *  @param registry The compiled group registry.
 *
 *  @returns The resolved parse tree, with group sources fanned out.
 *
 *  @throws {JssmError} If a `group_ref` (source, target, or hook subject)
 *                      names a group not present in the registry.
 *
 *  @see transitive_members
 *  @see membership_distance
 *  @see resolve_transition_conflicts
 *  @see compile_rule_transition_step
 */

function resolve_group_refs<StateType, mDT>(
  tree     : JssmParseTree<StateType, mDT>,
  registry : JssmGroupRegistry
): JssmParseTree<StateType, mDT> {

  const memo: Map<string, string[]> = new Map();

  const require_resolvable = (name: string): void => {
    if (!registry.has(name)) {
      throw new JssmError(undefined, `Unresolved group reference: &${name}`);
    }
  };

  // Rewrites every group-ref `to` along one transition's arrow chain, in
  // place, to its ordered member-state array.
  const rewrite_group_targets = (node: any): void => {              // TODO FIXME no any
    for (let link = node.se; link; link = link.se) {
      if (!is_group_ref(link.to)) {
        continue;
      }

      require_resolvable(link.to.name);
      link.to = transitive_members(registry, link.to.name, memo);
    }
  };

  const resolved: Array<any> = [];                                   // TODO FIXME no any
  let   decl_id : number      = 0;                                   // one id per source declaration

  for (const node of tree as Array<any>) {                            // TODO FIXME no any

    // Hook subjects that are group refs are validated here (state subjects
    // need no validation — states are never pre-declared).
    if ((node.key === 'hook_decl') && is_group_ref(node.subject)) {
      require_resolvable(node.subject.name);
    }

    if (node.key !== 'transition') {
      resolved.push(node);
      continue;
    }

    // Every transition declaration gets one id so conflict resolution can
    // tell distinct declarations apart from the sibling edges of a single
    // declaration's list/group fan-out (which must never override each other).
    const this_decl: number = decl_id++;

    // Every `to` along the arrow chain is a target; a group ref there is
    // rewritten in place to its ordered member-state array.
    rewrite_group_targets(node);

    // A group-ref SOURCE fans out to one transition node per transitive
    // member, each tagged with the originating group and that member's
    // membership distance (its specificity) for later conflict resolution.
    if (is_group_ref(node.from)) {
      const group_name: string = node.from.name;
      require_resolvable(group_name);
      for (const member of transitive_members(registry, group_name, memo)) {
        resolved.push({
          ...node,
          from           : member as unknown as StateType,
          __decl_id      : this_decl,
          __source_group : group_name,
          __specificity  : membership_distance(registry, member, group_name)
        });
      }
    } else if (registry.size === 0) {
      // No groups declared anywhere: the decl tag is only ever read by group
      // conflict arbitration, which cannot trigger, so skip the per-statement
      // node copy — a full shallow spread of every transition parse node
      // (5,000 copies on messy-5000) purely to carry an unread tag.
      resolved.push(node);
    } else {
      resolved.push({ ...node, __decl_id: this_decl });
    }

  }

  return resolved as JssmParseTree<StateType, mDT>;

}





/*********
 *
 *  Internal method performing one step in compiling rules for transitions.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 */

function compile_rule_transition_step<StateType, mDT>(

  acc     : Array<JssmTransition<StateType, mDT>>,
  from    : StateType,
  to      : StateType,
  this_se : JssmCompileSe<StateType, mDT>,
  next_se : JssmCompileSe<StateType, mDT>

): Array<JssmTransition<StateType, mDT>> { // todo typescript describe the parser representation of a transition step extension

  const uFrom : Array<StateType> = ( Array.isArray(from) ? from : [from] ),
        uTo   : Array<StateType> = ( Array.isArray(to)   ? to   : [to]   );

  for (const f of uFrom) {
    for (const t of uTo) {

      const right: JssmTransition<StateType, mDT> = makeTransition(this_se, f, t, true);
      if (right.kind !== 'none') { acc.push(right); }

      const left: JssmTransition<StateType, mDT> = makeTransition(this_se, t, f, false);
      if (left.kind === 'none') {
        // A one-way arrow has no reverse edge, so a probability/action/after
        // written AFTER the arrow ("a -> 40% b") lands in the reverse-edge slots
        // and used to be silently dropped.  Reject it loudly; the decoration
        // belongs before the arrow ("a 40% -> b").  The parser omits these
        // fields when absent (despite the non-optional type), so a loose view
        // lets `!= null` mean "was decorated".  StoneCypher/fsl#1950
        const rev = this_se as { l_probability?: number, l_action?: StateType, l_after?: number };
        if (rev.l_probability != null || rev.l_action != null || rev.l_after != null) {
          throw new JssmError(undefined, `A one-way arrow has no reverse edge, so a decoration written after it ("${String(from)} ${this_se.kind} 40% ${String(to)}") is discarded; write it before the arrow instead ("${String(from)} 40% ${this_se.kind} ${String(to)}").`);
        }
      } else {
        acc.push(left);
      }

    }
  }

  return next_se ? compile_rule_transition_step(acc, to, next_se.to, next_se, next_se.se) : acc;

}



/*********
 *
 *  Internal method performing one step in compiling rules for transitions.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 */

function compile_rule_handle_transition<StateType, mDT>(rule: JssmCompileSeStart<StateType, mDT>): any { // TODO FIXME no any // todo typescript describe the parser representation of a transition
  return compile_rule_transition_step<StateType, mDT>([], rule.from, rule.se.to, rule.se, rule.se.se);
}



/*********
 *
 *  Internal method performing one step in compiling rules for transitions.  Not
 *  generally meant for external use.
 *
 *  @internal
 *
 */

function compile_rule_handler<StateType, mDT>(rule: JssmCompileSeStart<StateType, mDT>): JssmCompileRule<StateType> {

  if (rule.key === 'transition') {
    const edges: Array<JssmTransition<StateType, mDT>> = compile_rule_handle_transition(rule);

    // Every transition node carries a transient `__decl_id` (assigned per
    // source declaration by resolve_group_refs); a group-sourced node also
    // carries `__source_group` / `__specificity`.  Record these in the
    // edge_decl_meta side table — NEVER as properties on the edges, which
    // would churn their hidden classes (see the note at edge_decl_meta) — so
    // resolve_transition_conflicts can arbitrate competing (from, action)
    // pairs across DISTINCT declarations.  The right-direction edges are the
    // source-driven ones, so only edges whose `from` is the declaration's
    // source state get an entry.
    const decl_id     : number | undefined = (rule as any).__decl_id;             // TODO FIXME no any
    const source_group: string | undefined = (rule as any).__source_group;        // TODO FIXME no any
    const specificity : number | undefined = (rule as any).__specificity;         // TODO FIXME no any
    // Group-free machines (registry.size === 0) reach here with UNTAGGED
    // nodes — resolve_group_refs passes them through untouched — and their
    // conflict arbitration is skipped outright, so the metadata would never
    // be read.  Skipping the per-edge WeakMap.set removes the one remaining
    // unconditional per-edge construction cost the side-table refactor added
    // (the week-over-week trail showed construct paying for it).
    if (decl_id !== undefined) {
      for (const edge of edges) {
        if (edge.from === rule.from) {
          edge_decl_meta.set(edge, { decl_id, source_group, specificity });
        }
      }
    }

    return { agg_as: 'transition', val: edges };
  }

  if (rule.key === 'machine_language') {
    // Accept BCP-47 language tags (e.g. `en-us`, `zh-Hant`) by reducing to the
    // primary language subtag before the ISO 639-1 lookup, so a regional tag
    // resolves to its base language (`en-us` -> `en`) instead of failing.
    // the grammar guarantees machine_language carries a string value; the cast
    // narrows away the state-declaration array arm for no-base-to-string
    const language_value = rule.value as string | number;
    const primary_subtag = String(language_value).split(/[-_]/, 1)[0];
    return { agg_as: 'machine_language', val: reduce_to_639(primary_subtag) };
  }

  // manually rehandled to make `undefined` as a property safe
  if (rule.key === 'property_definition') {
    const ret: { agg_as: string, val: { name: string, default_value?: unknown, required?: boolean } }
             = { agg_as: 'property_definition', val: { name: rule.name } };

    if (Object.prototype.hasOwnProperty.call(rule, 'default_value')) {
      ret.val.default_value = rule.default_value;
    }

    if (Object.prototype.hasOwnProperty.call(rule, 'required')) {
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
      const numeric_members = rule.val_type.members.filter((m: string) => /^[0-9]/.test(m));
      if (numeric_members.length) {
        throw new JssmError(undefined,
          `Enum val "${rule.name}" has numeric-looking members ${JSON.stringify(numeric_members)}; `
          + 'enum members must not begin with a digit (a numeric default parses as a number and never '
          + 'matches the string member) — quote or rename them',
          { source_location: rule.loc }
        );
      }
    }

    const ret: any = { agg_as: 'val_definition', val: { name: rule.name, val_type: rule.val_type } };
    if (rule.hasOwnProperty('default_value')) { ret.val.default_value = rule.default_value; }
    if (rule.hasOwnProperty('required'))      { ret.val.required      = rule.required;      }
    return ret;
  }

  // Group declarations are collected into the registry in a separate pass
  // (see build_group_registry); here we only need them to stop falling
  // through to the "Unknown rule" throw.  The aggregated value is unused.
  if (rule.key === 'named_list') {
    return { agg_as: 'named_list', val: [] };
  }

  // A boundary-hook declaration (`on enter|exit <subject> do 'action';`) is
  // collected raw; the compile pass routes it into group_hooks or state_hooks
  // by subject kind.  Runtime firing is a later task.
  if (rule.key === 'hook_decl') {
    return { agg_as: 'hook_decl', val: [rule] };
  }

  // state properties are in here
  if (rule.key === 'state_declaration') {
    if (!rule.name) {
      throw new JssmError(undefined, 'State declarations must have a name',
        { source_location: rule.loc });
    }
    // `state &g : { … }` (a group-ref subject) registers GROUP metadata keyed
    // by group name — NOT fanned out to per-member states — so the runtime
    // cascade can preserve depth.  A plain `state foo : { … }` keeps its
    // existing per-state behavior.
    if (is_group_ref(rule.name)) {
      return { agg_as: 'group_metadata', val: [{ group: (rule.name as any).name, declarations: rule.value }] };  // TODO FIXME no any
    }
    return { agg_as: 'state_declaration', val: { state: rule.name, declarations: rule.value } };
  }

  if (['arrange_declaration', 'arrange_start_declaration',
    'arrange_end_declaration', 'oarrange_declaration',
    'farrange_declaration'].includes(rule.key)) {
    return { agg_as: rule.key, val: [rule.value] };
  }

  // things that can only exist once and are just a value under their own name
  const tautologies: Array<string> = [
    'graph_layout', 'graph_bg_color', 'start_states', 'end_states', 'failed_outputs',
    'machine_name', 'machine_version', 'machine_comment', 'machine_author',
    'machine_contributor', 'machine_definition', 'machine_reference', 'machine_license',
    'fsl_version', 'state_config', 'theme', 'flow', 'dot_preamble', 'allows_override',
    'allow_islands', 'default_state_config', 'default_transition_config', 'default_graph_config',
    'default_start_state_config', 'default_end_state_config',
    'default_hooked_state_config', 'default_active_state_config',
    'default_terminal_state_config', 'npm_name', 'default_size', 'editor_config'
  ];

  if (tautologies.includes(rule.key)) {
    return { agg_as: rule.key, val: rule.value };
  }

  throw new JssmError(undefined, `compile_rule_handler: Unknown rule: ${JSON.stringify(rule)}`);

}





/*********
 *
 *  Maps a deprecated top-level graph keyword to the canonical key it occupies
 *  inside a consolidated `graph: {}` config block.  Aliases whose canonical key
 *  coincides with a `graph: {}` style item (currently only `graph_bg_color` →
 *  `background-color`) let an explicit block override the legacy form; the rest
 *  keep their own key because the block has no equivalent.
 *
 *  @param alias_key The deprecated top-level keyword, e.g. `graph_bg_color`
 *
 *  @returns The canonical key the value should carry inside `default_graph_config`
 *
 *  @see fold_graph_config
 */

function canonical_graph_alias_key(alias_key: string): string {
  if (alias_key === 'graph_bg_color') { return 'background-color'; }
  return alias_key;
}





/*********
 *
 *  Folds the deprecated top-level graph keywords (`graph_layout`,
 *  `graph_bg_color`, `dot_preamble`, `theme`, `flow`) into the consolidated
 *  `default_graph_config` list, then appends the items from an explicit
 *  `graph: {}` block so that, on a canonical-key conflict, the explicit block
 *  wins.
 *
 *  Only `graph_bg_color` emits a `console.warn` deprecation notice, because
 *  it is the only alias that has a direct `graph: {}` block replacement today
 *  (`graph: { background-color: … }`).  The other aliases (`graph_layout`,
 *  `theme`, `flow`, `dot_preamble`) fold silently — they have no block-level
 *  equivalent yet, so warning on them would be misleading spam.  The warning
 *  fires once per compile (the key can only appear once in a valid FSL source).
 *
 *  The result is de-duplicated by canonical key, last-wins, preserving the
 *  position of the first occurrence of each key (so a `graph: {}` override
 *  updates the value in place rather than reordering).
 *
 *  ```typescript
 *  fold_graph_config({ graph_bg_color: ['#fff'] }, []);
 *  // [ { key: 'background-color', value: '#fff' } ]
 *  ```
 *
 *  @param aliases       The collected values for each deprecated alias keyword
 *  @param explicit_block The items parsed from an explicit `graph: {}` block
 *
 *  @returns The consolidated, conflict-resolved graph-config item list
 *
 *  @see canonical_graph_alias_key
 */

const WARN_DEPRECATED_GRAPH_ALIASES = new Set(['graph_bg_color']);

function fold_graph_config(
  aliases       : { [alias_key: string]: Array<unknown> },
  explicit_block: Array<JssmGraphStyleKey>
): Array<JssmGraphStyleKey> {

  const folded: Array<JssmGraphStyleKey> = [];

  for (const [alias_key, values] of Object.entries(aliases)) {
    for (const value of values) {
      if (WARN_DEPRECATED_GRAPH_ALIASES.has(alias_key)) {
         
        console.warn(
          `jssm: top-level \`${alias_key}\` is deprecated; prefer a \`graph: {}\` config block`
        );
      }
      folded.push({ key: canonical_graph_alias_key(alias_key), value } as JssmGraphStyleKey);
    }
  }

  for (const item of explicit_block) {
    folded.push(item);
  }

  // De-duplicate by canonical key, last-wins, holding first-seen position.
  const seen_at: Map<string, number> = new Map();
  const result : Array<JssmGraphStyleKey> = [];

  for (const item of folded) {
    const existing_index: number | undefined = seen_at.get(item.key);
    if (existing_index === undefined) {
      seen_at.set(item.key, result.length);
      result.push(item);
    } else {
      result[existing_index] = item;
    }
  }

  return result;

}





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

function compile<StateType, mDT>(tree: JssmParseTree<StateType, mDT>): JssmGenericConfig<StateType, mDT> {

  const results: {
    graph_layout                  : Array<JssmLayout>,
    graph_bg_color                : Array<JssmColor>,
    transition                    : Array<JssmTransition<StateType, mDT>>,
    start_states                  : Array<StateType>,
    end_states                    : Array<StateType>,
    failed_outputs                : Array<StateType>,
    state_config                  : Array<any>,           // TODO COMEBACK no any
    state_declaration             : Array<JssmStateDeclaration>,
    fsl_version                   : Array<JssmParsedSemver>,
    machine_author                : Array<string>,
    machine_comment               : Array<string>,
    machine_contributor           : Array<string>,
    machine_definition            : Array<string>,
    machine_language              : Array<string>,
    machine_license               : Array<string>,
    machine_name                  : Array<string>,
    machine_reference             : Array<string>,
    npm_name                      : Array<string>,
    default_size                  : Array<JssmDefaultSize>,
    property_definition           : Array<JssmPropertyDefinition>,
    val_definition                : Array<JssmValDefinition>,
    state_property                : { [name: string]: JssmPropertyDefinition },
    theme                         : Array<string>,
    flow                          : Array<string>,
    dot_preamble                  : Array<string>,
    arrange_declaration           : Array<Array<string>>, // TODO COMEBACK CHECKME
    arrange_start_declaration     : Array<Array<string>>, // TODO COMEBACK CHECKME
    arrange_end_declaration       : Array<Array<string>>, // TODO COMEBACK CHECKME
    oarrange_declaration          : Array<Array<string>>,
    farrange_declaration          : Array<Array<string>>,
    machine_version               : Array<JssmParsedSemver>,
    default_state_config          : Array<JssmStateConfig>,
    default_active_state_config   : Array<JssmStateConfig>,
    default_hooked_state_config   : Array<JssmStateConfig>,
    default_terminal_state_config : Array<JssmStateConfig>,
    default_start_state_config    : Array<JssmStateConfig>,
    default_end_state_config      : Array<JssmStateConfig>,
    default_transition_config     : Array<JssmTransitionStyleKey>,
    default_graph_config          : Array<JssmGraphStyleKey>,
    named_list                    : Array<unknown>,
    group_metadata                : Array<{ group: string, declarations: Array<any> }>,  // TODO COMEBACK no any
    hook_decl                     : Array<any>,                                          // TODO COMEBACK no any
    allows_override               : Array<JssmAllowsOverride>,
    allow_islands                 : Array<JssmAllowIslands>,
    editor_config                 : Array<{ key: string; value: unknown }>
  } = {
    graph_layout                  : [],
    graph_bg_color                : [],
    transition                    : [],
    start_states                  : [],
    end_states                    : [],
    failed_outputs                : [],
    state_config                  : [],
    state_declaration             : [],
    fsl_version                   : [],
    machine_author                : [],
    machine_comment               : [],
    machine_contributor           : [],
    machine_definition            : [],
    machine_language              : [],
    machine_license               : [],
    machine_name                  : [],
    machine_reference             : [],
    npm_name                      : [],
    default_size                  : [],
    property_definition           : [],
    val_definition                : [],
    state_property                : {},
    theme                         : [],
    flow                          : [],
    dot_preamble                  : [],
    arrange_declaration           : [],
    arrange_start_declaration     : [],
    arrange_end_declaration       : [],
    oarrange_declaration          : [],
    farrange_declaration          : [],
    machine_version               : [],
    default_state_config          : [],
    default_active_state_config   : [],
    default_hooked_state_config   : [],
    default_terminal_state_config : [],
    default_start_state_config    : [],
    default_end_state_config      : [],
    default_transition_config     : [],
    default_graph_config          : [],
    named_list                    : [],
    group_metadata                : [],
    hook_decl                     : [],
    allows_override               : [],
    allow_islands                 : [],
    editor_config                 : []
  };

  // Build the ordered group registry, reject membership cycles and undeclared
  // sub-group members, then resolve/rewrite group references — group targets
  // fan out through the existing list-target machinery and group sources fan
  // out into per-member transition nodes (tagged for conflict resolution).
  // All before the main rule walk, so forward references resolve.
  const group_registry: JssmGroupRegistry = build_group_registry(tree);
  group_registry_cycle_check(group_registry);
  validate_group_members(group_registry);
  const resolved_tree: JssmParseTree<StateType, mDT> = resolve_group_refs(tree, group_registry);

  // Accumulate by in-place push, not `results[agg_as].concat(val)`: concat
  // recopies and reallocates the whole bucket per rule, which made this loop
  // O(n^2) over edge-heavy machines — two-thirds of construct() self-time
  // (#700).  Array-valued rules spread one level, matching concat's behavior.
  for (const tr of resolved_tree) {

    const rule   : JssmCompileRule<StateType> = compile_rule_handler(tr),
          val    : any                        = rule.val,                  // TODO FIXME no any
          bucket : any                        = results[rule.agg_as];

    if (Array.isArray(val)) {
      for (const v of val) { bucket.push(v); }
    } else {
      bucket.push(val);
    }

  }

  const property_keys = results['property_definition'].map(pd => pd.name),
        repeat_props  = find_repeated(property_keys);

  if (repeat_props.length > 0) {
    const dup = repeat_props[0][0];
    throw new JssmError(undefined,
      `Cannot repeat property definitions.  Saw ${JSON.stringify(repeat_props)}`,
      { source_location: nth_matching_loc(tree, (n) => n.key === 'property_definition' && n.name === dup, 2) }
    );
  }

  const val_keys    = results['val_definition'].map(vd => vd.name),
        repeat_vals = find_repeated(val_keys);

  if (repeat_vals.length) {
    const dup = repeat_vals[0][0];
    throw new JssmError(undefined,
      `Cannot redefine val names.  Saw ${JSON.stringify(repeat_vals)}`,
      { source_location: nth_matching_loc(tree, (n) => n.key === 'val_definition' && n.name === dup, 2) }
    );
  }

  // a val and a property may not share a name (megaspec §5; jssm#757)
  const val_prop_collisions = val_keys.filter(name => property_keys.includes(name));

  if (val_prop_collisions.length) {
    const dup = val_prop_collisions[0];
    throw new JssmError(undefined,
      `A val and a property cannot share the name ${JSON.stringify(dup)}.  Saw collisions ${JSON.stringify(val_prop_collisions)}`,
      { source_location: nth_matching_loc(tree, (n) => n.key === 'val_definition' && n.name === dup, 1) }
    );
  }

  // The accumulator is already flat (#700's per-rule push spreads one level)
  // and function-local, so it is passed straight to conflict arbitration —
  // never via `[].concat(...)`, whose argument-list spread is bounded by the
  // engine's maximum argument count and threw RangeError near 65k transition
  // statements (#703).  Arbitration settles group-expanded edges competing
  // for the same (source_state, action) by depth-specificity before any
  // further processing (the runtime would otherwise reject the duplicates).
  const assembled_transitions: JssmTransitions<StateType, mDT> =
    resolve_transition_conflicts(results['transition'], group_registry.size > 0);

  // A machine with no transitions cannot be constructed (and previously
  // crashed right here with a raw TypeError reading `[0].from`).  This is a
  // natural mid-authoring document shape — state blocks first, wiring later —
  // and the editor's lint shows this message verbatim, so name the actual
  // problem instead of leaking an internal error.
  if (assembled_transitions.length === 0) {
    throw new JssmError(undefined,
      'This machine has no transitions, only declarations; a machine requires at least one transition (like `a -> b;`)'
    );
  }

  const result_cfg: JssmGenericConfig<StateType, mDT> = {
    start_states   : results.start_states.length > 0 ? results.start_states : [assembled_transitions[0].from],
    end_states     : results.end_states,
    failed_outputs : results.failed_outputs,
    transitions    : assembled_transitions,
    state_property : [],
  };

  // Carry the ordered group registry through to the machine config, but only
  // when groups were actually declared, so group-free machines are unchanged.
  if (group_registry.size > 0) {
    result_cfg.group_registry = group_registry;
  }

  // Group metadata: each `state &g : { … }` block becomes one per-group
  // JssmStateConfig entry, keyed by group name and NOT fanned out to members,
  // so the runtime cascade can resolve it with depth-specificity later.
  if (results.group_metadata.length > 0) {
    const group_metadata: Map<string, JssmStateConfig> = new Map();
    for (const gm of results.group_metadata) {                       // TODO FIXME no any
      group_metadata.set(gm.group, { declarations: gm.declarations });
    }
    result_cfg.group_metadata = group_metadata;
  }

  // Boundary hooks: route each `on enter|exit <subject> do '<action>';` into
  // group_hooks (group subject) or state_hooks (plain-state subject), merging
  // an enter and an exit declaration for the same subject into one entry.
  if (results.hook_decl.length > 0) {
    const group_hooks: JssmGroupHooks = new Map();
    const state_hooks: JssmStateHooks = new Map();

    const merge_hook = (table: Map<string, JssmBoundaryHooks>, subject: string, event: 'enter' | 'exit', action: string): void => {
      const existing: JssmBoundaryHooks = table.get(subject) ?? {};
      if (event === 'enter') { existing.onEnter = action; } else { existing.onExit = action; }
      table.set(subject, existing);
    };

    for (const decl of results.hook_decl) {                          // TODO FIXME no any
      if (is_group_ref(decl.subject)) {
        merge_hook(group_hooks, decl.subject.name, decl.event, decl.action);
      } else {
        merge_hook(state_hooks, decl.subject, decl.event, decl.action);
      }
    }

    if (group_hooks.size > 0) { result_cfg.group_hooks = group_hooks; }
    if (state_hooks.size > 0) { result_cfg.state_hooks = state_hooks; }
  }

  const oneOnlyKeys: Array<string> = [
    'graph_layout', 'graph_bg_color', 'machine_name', 'machine_version',
    'machine_comment', 'fsl_version', 'machine_license', 'machine_definition',
    'machine_language', 'flow', 'dot_preamble', 'allows_override', 'allow_islands',
    'npm_name', 'default_size'
  ];

  for (const oneOnlyKey of oneOnlyKeys) {
    if (results[oneOnlyKey].length > 1) {
      throw new JssmError(undefined,
        `May only have one ${oneOnlyKey} statement maximum: ${JSON.stringify(results[oneOnlyKey])}`,
        { source_location: nth_matching_loc(tree, (n) => n.key === oneOnlyKey, 2) }
      );
    }
    if (results[oneOnlyKey].length > 0) {
      result_cfg[oneOnlyKey] = results[oneOnlyKey][0];
    }
  }

  const multiKeys: Array<string> = [
    'arrange_declaration', 'arrange_start_declaration', 'arrange_end_declaration',
    'oarrange_declaration', 'farrange_declaration',
    'machine_author', 'machine_contributor', 'machine_reference', 'theme',
    'state_declaration', 'property_definition', 'val_definition', 'default_state_config',
    'default_start_state_config', 'default_end_state_config',
    'default_hooked_state_config', 'default_terminal_state_config',
    'default_active_state_config', 'default_transition_config'
  ];

  for (const multiKey of multiKeys) {
    if (results[multiKey].length > 0) {
      result_cfg[multiKey] = results[multiKey];
    }
  }

  result_cfg.default_graph_config = fold_graph_config(
    {
      graph_layout   : results.graph_layout,
      graph_bg_color : results.graph_bg_color,
      dot_preamble   : results.dot_preamble,
      theme          : results.theme,
      flow           : results.flow
    },
    results.default_graph_config
  );

  if (result_cfg.default_graph_config.length === 0) {
    delete result_cfg.default_graph_config;
  }

  // Fold the `editor: {}` block's flat items into one object the web control
  // reads (fsl#1334). The grammar only emits the two whitelisted keys, so the
  // `else` is `panels`.
  if (results.editor_config.length > 0) {
    const ec: JssmEditorConfig = {};
    for (const item of results.editor_config) {
      if (item.key === 'stochastic_run_count') { ec.stochastic_run_count = item.value as number; }
      else                                     { ec.panels = item.value as Array<string>; }
    }
    result_cfg.editor_config = ec;
  }

  // re-walk state declarations, already wrapped up, to get state properties,
  // which go out in a different datastructure
  // Registers one state block declaration as a state property binding, when
  // it is one; throws on a duplicate (state, property) pair.
  const register_state_property = (sd: JssmStateDeclaration, decl: any): void => {  // TODO FIXME no any

    if (decl.key !== 'state_property') {
      return;
    }

    const label = name_bind_prop_and_state(decl.name, sd.state)

    if (result_cfg.state_property.some(c => c.name === label) ) {
      throw new JssmError(undefined,
        `A state may only bind a property once (${sd.state} re-binds ${decl.name})`,
        { source_location: nth_matching_loc(tree, (n) => n.key === 'state_declaration' && n.name === sd.state, 1) }
      );
    }
    // property/state carry the unserialized pair so the constructor can
    // validate bindings without JSON.parse-ing label back apart (#734)
    result_cfg.state_property.push({ name: label, default_value: decl.value, property: decl.name, state: sd.state });

  };

  for (const sd of results.state_declaration) {
    for (const decl of sd.declarations) {
      register_state_property(sd, decl);
    }
  }

  return result_cfg;

}





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

function make<StateType, mDT>(plan: string): JssmGenericConfig<StateType, mDT> {
  return compile(wrap_parse<StateType, mDT>(plan));
}





export {

  compile,
    // compile_rule_handler,
    // compile_rule_transition_step,
    // compile_rule_handle_transition,

  make,
    makeTransition,

  build_group_registry,
    group_registry_cycle_check,
    transitive_members,
    validate_group_members,
    membership_distance,

  wrap_parse,

  nth_matching_loc

};
