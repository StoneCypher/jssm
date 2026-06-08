
import { JssmError } from './jssm_error';
import { parse }     from './fsl_parser';

import {
  arrow_direction,
  arrow_left_kind,
  arrow_right_kind
} from './jssm_arrow';

import {
  find_repeated,
  name_bind_prop_and_state
} from './jssm_util';

import {
  JssmTransition,
    JssmTransitions,
  JssmArrowKind,
  JssmCompileSe,
    JssmCompileSeStart,
  JssmCompileRule,
  JssmParseTree,
  JssmStateConfig,
  JssmGenericConfig,
  JssmStateDeclaration,
  JssmLayout,
  JssmPropertyDefinition,
  JssmAllowsOverride,
  JssmTransitionStyleKey,
  JssmGraphStyleKey,
  JssmColor,
  JssmGroupMemberRef,
  JssmGroupRegistry,
  JssmBoundaryHooks,
  JssmGroupHooks,
  JssmStateHooks
} from './jssm_types';

import { reduce as reduce_to_639 } from 'reduce-to-639-1';





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

function makeTransition<StateType, mDT>(

  this_se    : JssmCompileSe<StateType, mDT>,
  from       : StateType,
  to         : StateType,
  isRight    : boolean,
  _wasList?  : Array<StateType>,
  _wasIndex? : number

): JssmTransition<StateType, mDT> {

  const kind: JssmArrowKind = isRight
                            ? arrow_right_kind(this_se.kind)
                            : arrow_left_kind(this_se.kind),

        edge: JssmTransition<StateType, mDT> = {
          from,
          to,
          kind,
          after_time  : isRight? this_se.r_after : this_se.l_after,
          forced_only : kind === 'forced',
          main_path   : kind === 'main'
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

function wrap_parse(input: string, options?: Object) {
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
      ? { kind: 'state', name: member } as JssmGroupMemberRef
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

  tree.forEach((node: any) => {                                       // TODO FIXME no any
    if (node.key === 'named_list') {
      if (registry.has(node.name)) {
        throw new JssmError(undefined, `Cannot redeclare group: &${node.name}`);
      }
      registry.set(node.name, normalize_group_members(node.value));
    }
  });

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

    (registry.get(group) ?? []).forEach((member: JssmGroupMemberRef) => {
      if (member.kind === 'group') {
        walk(member.name, [...path, group]);
      }
    });

    visiting.delete(group);
    visited.add(group);

  };

  registry.forEach((_members: JssmGroupMemberRef[], group: string) => walk(group, []));

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

  (registry.get(group) ?? []).forEach((member: JssmGroupMemberRef) => {
    if (member.kind === 'state') {
      out.push(member.name);
    } else {
      transitive_members(registry, member.name, memo).forEach((s: string) => out.push(s));
    }
  });

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

  registry.forEach((members: JssmGroupMemberRef[]) => {
    members.forEach((member: JssmGroupMemberRef) => {
      if ((member.kind === 'group') && (!registry.has(member.name))) {
        throw new JssmError(undefined, `Unresolved group reference: &${member.name}`);
      }
    });
  });

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

  while (frontier.length) {

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





/*********
 *
 *  Arbitrates transitions that compete for the same `(source_state, action)`
 *  pair after group-as-source expansion, returning a new edge list in which
 *  each such pair keeps exactly one winner and every transient
 *  conflict-resolution tag (`__source_group`, `__specificity`) has been
 *  stripped.  Edges without an `action`, and `(from, action)` pairs claimed
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
 *  @param edges The assembled, post-expansion edge list (tags still present).
 *
 *  @returns A new edge list with contested pairs resolved and tags removed;
 *           surviving edges keep their original relative order.
 *
 *  @see resolve_group_refs
 *  @see membership_distance
 *  @internal
 */

function resolve_transition_conflicts<StateType, mDT>(
  edges: Array<JssmTransition<StateType, mDT>>
): Array<JssmTransition<StateType, mDT>> {

  type Tagged = JssmTransition<StateType, mDT> & {
    __decl_id?      : number,
    __source_group? : string,
    __specificity?  : number
  };

  type DeclEntry = {
    decl_id      : number,
    indices      : Array<number>,
    source_group : string | undefined,
    specificity  : number
  };

  const tagged: Array<Tagged> = edges as Array<Tagged>;

  // Group edge indices by (from, action), then by declaration within each, so
  // sibling edges of one fan-out (shared decl_id) never override each other.
  const buckets: Map<string, Map<number, DeclEntry>> = new Map();

  tagged.forEach((edge: Tagged, index: number) => {
    if (edge.action == null) { return; }                 // actionless edges never contest on action
    const key: string = `${String(edge.from)} ${String(edge.action)}`;

    let by_decl: Map<number, DeclEntry> | undefined = buckets.get(key);
    if (by_decl === undefined) { by_decl = new Map(); buckets.set(key, by_decl); }

    const decl_id: number = edge.__decl_id as number;
    const entry: DeclEntry | undefined = by_decl.get(decl_id);
    if (entry === undefined) {
      by_decl.set(decl_id, {
        decl_id,
        indices      : [index],
        source_group : edge.__source_group,
        specificity  : edge.__specificity ?? Infinity
      });
    } else {
      entry.indices.push(index);
    }
  });

  const dropped: Set<number> = new Set();

  buckets.forEach((by_decl: Map<number, DeclEntry>) => {

    const decls: Array<DeclEntry> = [...by_decl.values()];
    if (decls.length < 2) { return; }                    // a single declaration cannot conflict

    const state_decls : Array<DeclEntry> = decls.filter((d: DeclEntry) => d.source_group === undefined);
    const group_decls : Array<DeclEntry> = decls.filter((d: DeclEntry) => d.source_group !== undefined);

    // Rule 1: any state-specific declaration wins — drop every group-sourced
    // edge silently, keep every state-specific edge (runtime rejects genuine
    // user dupes among the state declarations).
    if (state_decls.length) {
      group_decls.forEach((d: DeclEntry) => d.indices.forEach((i: number) => dropped.add(i)));
      return;
    }

    // Rule 2 + 3: among group-sourced declarations, smallest specificity wins;
    // ties break by later declaration order (larger decl_id).
    let winner: DeclEntry = group_decls[0];
    group_decls.forEach((d: DeclEntry) => {
      const nearer    : boolean = d.specificity < winner.specificity;
      const tie_later : boolean = (d.specificity === winner.specificity) && (d.decl_id > winner.decl_id);
      if (nearer || tie_later) { winner = d; }
    });

    group_decls.forEach((d: DeclEntry) => {
      if (d.decl_id !== winner.decl_id) {
        d.indices.forEach((i: number) => dropped.add(i));
        // eslint-disable-next-line no-console
        console.warn(
          `jssm: group &${d.source_group} transition for state '${String(tagged[d.indices[0]].from)}' `
          + `on action '${String(tagged[d.indices[0]].action)}' is overridden by nearer group `
          + `&${winner.source_group}`
        );
      }
    });

  });

  // Emit survivors in original order, stripping the transient tags.
  const out: Array<JssmTransition<StateType, mDT>> = [];

  tagged.forEach((edge: Tagged, index: number) => {
    if (dropped.has(index)) { return; }
    delete edge.__decl_id;
    delete edge.__source_group;
    delete edge.__specificity;
    out.push(edge);
  });

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

  const resolved: Array<any> = [];                                   // TODO FIXME no any
  let   decl_id : number      = 0;                                   // one id per source declaration

  tree.forEach((node: any) => {                                       // TODO FIXME no any

    // Hook subjects that are group refs are validated here (state subjects
    // need no validation — states are never pre-declared).
    if ((node.key === 'hook_decl') && is_group_ref(node.subject)) {
      require_resolvable(node.subject.name);
    }

    if (node.key !== 'transition') {
      resolved.push(node);
      return;
    }

    // Every transition declaration gets one id so conflict resolution can
    // tell distinct declarations apart from the sibling edges of a single
    // declaration's list/group fan-out (which must never override each other).
    const this_decl: number = decl_id++;

    // Every `to` along the arrow chain is a target; a group ref there is
    // rewritten in place to its ordered member-state array.
    for (let link = node.se; link; link = link.se) {
      if (is_group_ref(link.to)) {
        require_resolvable(link.to.name);
        link.to = transitive_members(registry, link.to.name, memo) as unknown as StateType;
      }
    }

    // A group-ref SOURCE fans out to one transition node per transitive
    // member, each tagged with the originating group and that member's
    // membership distance (its specificity) for later conflict resolution.
    if (is_group_ref(node.from)) {
      const group_name: string = node.from.name;
      require_resolvable(group_name);
      transitive_members(registry, group_name, memo).forEach((member: string) => {
        resolved.push({
          ...node,
          from           : member as unknown as StateType,
          __decl_id      : this_decl,
          __source_group : group_name,
          __specificity  : membership_distance(registry, member, group_name)
        });
      });
    } else {
      resolved.push({ ...node, __decl_id: this_decl });
    }

  });

  return resolved as JssmParseTree<StateType, mDT>;

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

function compile_rule_transition_step<StateType, mDT>(

  acc     : Array<JssmTransition<StateType, mDT>>,
  from    : StateType,
  to      : StateType,
  this_se : JssmCompileSe<StateType, mDT>,
  next_se : JssmCompileSe<StateType, mDT>

): Array<JssmTransition<StateType, mDT>> { // todo typescript describe the parser representation of a transition step extension

  const edges: Array<JssmTransition<StateType, mDT>> = [];

  const uFrom : Array<StateType> = ( Array.isArray(from) ? from : [from] ),
        uTo   : Array<StateType> = ( Array.isArray(to)   ? to   : [to]   );

  uFrom.map( (f: StateType) => {
    uTo.map( (t: StateType) => {

      const right: JssmTransition<StateType, mDT> = makeTransition(this_se, f, t, true);
      if (right.kind !== 'none') { edges.push(right); }

      const left: JssmTransition<StateType, mDT> = makeTransition(this_se, t, f, false);
      if (left.kind !== 'none') { edges.push(left); }

    });
  });

  const new_acc: Array<JssmTransition<StateType, mDT>> = acc.concat(edges);

  if (next_se) {
    return compile_rule_transition_step(new_acc, to, next_se.to, next_se, next_se.se);
  } else {
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
    // carries `__source_group` / `__specificity`.  Stamp these onto the edges
    // leaving the declared source so resolve_transition_conflicts can
    // arbitrate competing (from, action) pairs across DISTINCT declarations.
    // The right-direction edges are the source-driven ones, so tag only the
    // edges whose `from` is the declaration's source state.
    const decl_id     : number           = (rule as any).__decl_id;               // TODO FIXME no any
    const source_group: string | undefined = (rule as any).__source_group;        // TODO FIXME no any
    const specificity : number | undefined = (rule as any).__specificity;         // TODO FIXME no any
    edges.forEach((edge: JssmTransition<StateType, mDT>) => {
      if (edge.from === rule.from) {
        (edge as any).__decl_id = decl_id;                                         // TODO FIXME no any
        if (source_group !== undefined) {
          (edge as any).__source_group = source_group;                            // TODO FIXME no any
          (edge as any).__specificity  = specificity;                             // TODO FIXME no any
        }
      }
    });

    return { agg_as: 'transition', val: edges };
  }

  if (rule.key === 'machine_language') {
    return { agg_as: 'machine_language', val: reduce_to_639(rule.value) };
  }

  // manually rehandled to make `undefined` as a property safe
  if (rule.key === 'property_definition') {
    const ret: { agg_as: string, val: { name: string, default_value?: unknown, required?: boolean } }
             = { agg_as: 'property_definition', val: { name: rule.name } };

    if (rule.hasOwnProperty('default_value')) {
      ret.val.default_value = rule.default_value;
    }

    if (rule.hasOwnProperty('required')) {
      ret.val.required = rule.required;
    }

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
    if (!rule.name) { throw new JssmError(undefined, 'State declarations must have a name'); }
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
    'arrange_end_declaration'].includes(rule.key)) {
    return { agg_as: rule.key, val: [rule.value] };
  }

  // things that can only exist once and are just a value under their own name
  const tautologies: Array<string> = [
    'graph_layout', 'graph_bg_color', 'start_states', 'end_states', 'machine_name',
    'machine_version', 'machine_comment', 'machine_author', 'machine_contributor',
    'machine_definition', 'machine_reference', 'machine_license', 'fsl_version',
    'state_config', 'theme', 'flow', 'dot_preamble', 'allows_override',
    'default_state_config', 'default_transition_config', 'default_graph_config',
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

  Object.keys(aliases).forEach((alias_key: string) => {
    aliases[alias_key].forEach((value: unknown) => {
      if (WARN_DEPRECATED_GRAPH_ALIASES.has(alias_key)) {
        // eslint-disable-next-line no-console
        console.warn(
          `jssm: top-level \`${alias_key}\` is deprecated; prefer a \`graph: {}\` config block`
        );
      }
      folded.push({ key: canonical_graph_alias_key(alias_key), value } as JssmGraphStyleKey);
    });
  });

  explicit_block.forEach((item: JssmGraphStyleKey) => folded.push(item));

  // De-duplicate by canonical key, last-wins, holding first-seen position.
  const seen_at: Map<string, number> = new Map();
  const result : Array<JssmGraphStyleKey> = [];

  folded.forEach((item: JssmGraphStyleKey) => {
    const existing_index: number | undefined = seen_at.get(item.key);
    if (existing_index === undefined) {
      seen_at.set(item.key, result.length);
      result.push(item);
    } else {
      result[existing_index] = item;
    }
  });

  return result;

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

function compile<StateType, mDT>(tree: JssmParseTree<StateType, mDT>): JssmGenericConfig<StateType, mDT> {

  const results: {
    graph_layout                  : Array<JssmLayout>,
    graph_bg_color                : Array<JssmColor>,
    transition                    : Array<JssmTransition<StateType, mDT>>,
    start_states                  : Array<StateType>,
    end_states                    : Array<StateType>,
    state_config                  : Array<any>,           // TODO COMEBACK no any
    state_declaration             : Array<JssmStateDeclaration>,
    fsl_version                   : Array<string>,
    machine_author                : Array<string>,
    machine_comment               : Array<string>,
    machine_contributor           : Array<string>,
    machine_definition            : Array<string>,
    machine_language              : Array<string>,
    machine_license               : Array<string>,
    machine_name                  : Array<string>,
    machine_reference             : Array<string>,
    property_definition           : Array<JssmPropertyDefinition>,
    state_property                : { [name: string]: JssmPropertyDefinition },
    theme                         : Array<string>,
    flow                          : Array<string>,
    dot_preamble                  : Array<string>,
    arrange_declaration           : Array<Array<string>>, // TODO COMEBACK CHECKME
    arrange_start_declaration     : Array<Array<string>>, // TODO COMEBACK CHECKME
    arrange_end_declaration       : Array<Array<string>>, // TODO COMEBACK CHECKME
    machine_version               : Array<string>,        // TODO COMEBACK semver
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
    allows_override               : Array<JssmAllowsOverride>
  } = {
    graph_layout                  : [],
    graph_bg_color                : [],
    transition                    : [],
    start_states                  : [],
    end_states                    : [],
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
    property_definition           : [],
    state_property                : {},
    theme                         : [],
    flow                          : [],
    dot_preamble                  : [],
    arrange_declaration           : [],
    arrange_start_declaration     : [],
    arrange_end_declaration       : [],
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
    allows_override               : []
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

  resolved_tree.map((tr: JssmCompileSeStart<StateType, mDT>) => {

    const rule   : JssmCompileRule<StateType> = compile_rule_handler(tr),
          agg_as : string                     = rule.agg_as,
          val    : any                        = rule.val;                  // TODO FIXME no any

    results[agg_as] = results[agg_as].concat(val)

  });

  const property_keys = results['property_definition'].map(pd => pd.name),
        repeat_props  = find_repeated(property_keys);

  if (repeat_props.length) {
    throw new JssmError(undefined, `Cannot repeat property definitions.  Saw ${JSON.stringify(repeat_props)}`);
  }

  // Assemble all edges, then arbitrate group-expanded edges that compete for
  // the same (source_state, action) by depth-specificity before any further
  // processing (the runtime would otherwise reject the duplicates outright).
  const assembled_transitions: JssmTransitions<StateType, mDT> =
    resolve_transition_conflicts([].concat(...results['transition']));

  const result_cfg: JssmGenericConfig<StateType, mDT> = {
    start_states   : results.start_states.length ? results.start_states : [assembled_transitions[0].from],
    end_states     : results.end_states,
    transitions    : assembled_transitions,
    state_property : [],
  };

  // Carry the ordered group registry through to the machine config, but only
  // when groups were actually declared, so group-free machines are unchanged.
  if (group_registry.size) {
    result_cfg.group_registry = group_registry;
  }

  // Group metadata: each `state &g : { … }` block becomes one per-group
  // JssmStateConfig entry, keyed by group name and NOT fanned out to members,
  // so the runtime cascade can resolve it with depth-specificity later.
  if (results.group_metadata.length) {
    const group_metadata: Map<string, JssmStateConfig> = new Map();
    results.group_metadata.forEach((gm: { group: string, declarations: Array<any> }) => {  // TODO FIXME no any
      group_metadata.set(gm.group, { declarations: gm.declarations });
    });
    result_cfg.group_metadata = group_metadata;
  }

  // Boundary hooks: route each `on enter|exit <subject> do '<action>';` into
  // group_hooks (group subject) or state_hooks (plain-state subject), merging
  // an enter and an exit declaration for the same subject into one entry.
  if (results.hook_decl.length) {
    const group_hooks: JssmGroupHooks = new Map();
    const state_hooks: JssmStateHooks = new Map();

    const merge_hook = (table: Map<string, JssmBoundaryHooks>, subject: string, event: 'enter' | 'exit', action: string): void => {
      const existing: JssmBoundaryHooks = table.get(subject) ?? {};
      if (event === 'enter') { existing.onEnter = action; } else { existing.onExit = action; }
      table.set(subject, existing);
    };

    results.hook_decl.forEach((decl: any) => {                       // TODO FIXME no any
      if (is_group_ref(decl.subject)) {
        merge_hook(group_hooks, decl.subject.name, decl.event, decl.action);
      } else {
        merge_hook(state_hooks, decl.subject, decl.event, decl.action);
      }
    });

    if (group_hooks.size) { result_cfg.group_hooks = group_hooks; }
    if (state_hooks.size) { result_cfg.state_hooks = state_hooks; }
  }

  const oneOnlyKeys: Array<string> = [
    'graph_layout', 'graph_bg_color', 'machine_name', 'machine_version',
    'machine_comment', 'fsl_version', 'machine_license', 'machine_definition',
    'machine_language', 'flow', 'dot_preamble', 'allows_override'
  ];

  oneOnlyKeys.map((oneOnlyKey: string) => {
    if (results[oneOnlyKey].length > 1) {
      throw new JssmError(undefined,
        `May only have one ${oneOnlyKey} statement maximum: ${JSON.stringify(results[oneOnlyKey])}`
      );
    } else {
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
   'default_active_state_config', 'default_transition_config'].map(
      (multiKey: string) => {
        if (results[multiKey].length) {
          result_cfg[multiKey] = results[multiKey];
        }
      }
    );

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

  if (!result_cfg.default_graph_config.length) {
    delete result_cfg.default_graph_config;
  }

  // re-walk state declarations, already wrapped up, to get state properties,
  // which go out in a different datastructure
  results.state_declaration.forEach(sd => {
    sd.declarations.forEach(decl => {

      if (decl.key === 'state_property') {
        const label = name_bind_prop_and_state(decl.name, sd.state)

        if (result_cfg.state_property.findIndex(c => c.name === label) !== -1) {
          throw new JssmError(undefined, `A state may only bind a property once (${sd.state} re-binds ${decl.name})`);
        } else {
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

function make<StateType, mDT>(plan: string): JssmGenericConfig<StateType, mDT> {
  return compile(wrap_parse(plan));
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

  wrap_parse

};
