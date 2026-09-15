/*******
 *
 *  The groups family: the overlapping-state-group membership queries —
 *  `isIn`, `groupsOf`, `groups`, `statesIn` — over the tables the compiler
 *  carries into the machine (`_group_registry`, `_group_order`,
 *  `_state_to_groups`).  Every function takes the machine as its first
 *  argument and reads its fields directly; the `Machine` class methods of the
 *  same names are one-line delegates onto these.
 *
 *  `groups_by_depth` (formerly the class's `#groups_by_depth`) is exported
 *  for the style family's config cascade and is not part of the barrel.
 *
 */
import { JssmError } from '../jssm_error.js';
import { transitive_members, membership_distance } from '../jssm_compiler.js';
import { state } from './query.js';
/********
 *
 *  Reports whether the machine's CURRENT state is a transitive member of a
 *  named group.  Membership is deep: a state counts as in `groupName` if it
 *  belongs to that group directly, or via any nested (`&child`) or spread
 *  (`...&child`) sub-group, at any depth.  An undeclared group simply has no
 *  members, so this returns `false` rather than throwing.
 *
 *  @example
 *  import { sm, act, isIn } from 'jssm';
 *
 *  const m = sm`&busy : [working]; idle 'go' -> working;`;
 *  // the current state is 'idle':
 *  isIn(m, 'busy');     // => false
 *  act(m, 'go');
 *  // the current state is now 'working':
 *  isIn(m, 'busy');     // => true
 *  // an undeclared group has no members:
 *  isIn(m, 'nonesuch'); // => false
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose current state is tested.
 *
 *  @param groupName The group to test the current state against.
 *
 *  @returns `true` if the current state is a transitive member of `groupName`.
 *
 *  @see groupsOf
 *  @see statesIn
 *
 */
export function isIn(m, groupName) {
    return groupsOf(m, state(m)).has(groupName);
}
/********
 *
 *  Lists every group that transitively contains a given state.  Membership is
 *  deep — direct, nested, and spread sub-group containment all count — and the
 *  result is the precomputed inverse-index entry for the state, so the lookup
 *  is constant-time.  A state that belongs to no group (or a state name that
 *  appears in no group) yields an empty `Set`.
 *
 *  @example
 *  import { sm, groupsOf } from 'jssm';
 *
 *  const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
 *  // deep: a is in &outer through &inner
 *  groupsOf(m, 'a');     // => new Set(['inner', 'outer'])
 *  groupsOf(m, 'b');     // => new Set(['outer'])
 *  // z is in no group
 *  groupsOf(m, 'z');     // => new Set()
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose group index is read.
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
export function groupsOf(m, state) {
    return new Set(m._state_to_groups.get(state));
}
/********
 *
 *  Lists all declared group names, in source declaration order.  The order
 *  matches the order the `&group : [ … ];` declarations appear in the FSL, and
 *  is the same order used to break depth-specificity ties in the config
 *  cascade.  Machines that declare no groups return an empty array.
 *
 *  @example
 *  import { sm, groups } from 'jssm';
 *
 *  const m = sm`&first : [a]; &second : [b]; a -> b;`;
 *  groups(m);  // => [ 'first', 'second' ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose declared groups are listed.
 *
 *  @returns The declared group names, in declaration order.
 *
 *  @see groupsOf
 *  @see statesIn
 *
 */
export function groups(m) {
    return [...m._group_order];
}
/********
 *
 *  Lists every state that is a transitive member of a named group — the
 *  flattened membership of the group, descending through nested and spread
 *  sub-groups, in member-declaration order.
 *
 *  @example
 *  import { sm, statesIn } from 'jssm';
 *
 *  const m = sm`&inner : [a b]; &outer : [&inner c]; a -> b -> c;`;
 *  statesIn(m, 'outer');  // => [ 'a', 'b', 'c' ]
 *  statesIn(m, 'inner');  // => [ 'a', 'b' ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose group registry is read.
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
export function statesIn(m, groupName) {
    if (!(m._group_registry.has(groupName))) {
        throw new JssmError(m, `No such group ${JSON.stringify(groupName)}`);
    }
    return transitive_members(m._group_registry, groupName, new Map());
}
/********
 *
 *  Orders the groups a state belongs to by nesting depth for the config
 *  cascade — outermost first, innermost last — so that, folded in order,
 *  the innermost (nearest / smallest {@link membership_distance}) group's
 *  metadata wins.  Equal-distance groups are ordered by group declaration
 *  order, so a later-declared group of the same depth wins the tie.
 *
 *  Concretely: groups are sorted by descending membership distance (largest
 *  distance applied first / wins least), and for equal distances by
 *  ascending declaration index (later index applied last / wins most).
 *
 *  Exported for the style family's `compose_state_config`; not part of the
 *  `jssm` barrel.
 *
 *  @param m The machine whose group registry and declaration order are read.
 *
 *  @param state The state whose containing groups are being ordered.
 *
 *  @returns The containing group names, ordered for outer→inner folding
 *  (the last entry wins).
 *
 *  @internal
 *
 */
export function groups_by_depth(m, state) {
    const containing = [...groupsOf(m, state)];
    if (containing.length < 2) {
        return containing;
    }
    return containing.sort((ga, gb) => {
        const da = membership_distance(m._group_registry, state, ga), db = membership_distance(m._group_registry, state, gb);
        // Larger distance (more "outer") sorts earlier so it is applied first and
        // overridden by nearer groups.
        if (da !== db) {
            return db - da;
        }
        // Equal depth: earlier-declared group sorts earlier (applied first), so
        // the later-declared group of the same depth wins the tie.
        return m._group_order.indexOf(ga) - m._group_order.indexOf(gb);
    });
}
