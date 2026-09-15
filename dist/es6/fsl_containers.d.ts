/*******
 *
 *  FSL container-type protocol (megaspec §4.2) — pure, host-agnostic
 *  implementations of the three bounded container kinds the language exposes:
 *  **list** (`array of T`), **set** (`set of (number | string)`), and **map**
 *  (`map<(number | string), V>`).
 *
 *  Everything here is a free, side-effect-free function — no parser, no
 *  runtime, no machine coupling — so the same code defines the container
 *  semantics whether it runs in the compiler, a host runtime, or the
 *  conformance suite.  Phase 2 wires the literal syntax (`[…]`, `#[…]`,
 *  `#{…}`); this module is the semantic core those literals lower to.
 *
 *  Three design commitments come straight from §4.2 / §6 / §15 and shape every
 *  function below:
 *
 *  - **Immutable / by-value.** No operation mutates its input.  Every
 *    "update" (`list_set`, `set_add`, `map_put`, …) returns a *new* container,
 *    and every constructor takes a defensive copy.  This is the by-value
 *    capture / acyclic-data posture (§13) and the substrate the undo-log
 *    journal (§15, "log `(slot, old-value)`") and snapshot/rollback ride on.
 *
 *  - **Decidable keys / members.** Set members and map keys are **numbers or
 *    strings only** (§4.2: "decidable equality/hash/serialize"); values may be
 *    *any* type.  Members/keys are compared by JS `SameValueZero` so a set or
 *    map never holds two members that are `===`-equal.
 *
 *  - **Structural value-equality + canonical snapshot.** Containers compare by
 *    **structural deep equality** (§6), never by reference, and serialise to a
 *    **canonical** shape with **stable key order** (§15) so two structurally
 *    equal containers always produce byte-identical snapshots across hosts.
 *
 *  ```typescript
 *  import { list_of, list_push, set_of, set_has, map_of, map_get, equals } from './fsl_containers';
 *
 *  const xs = list_push(list_of(1, 2), 3);    // FslList<number> [1, 2, 3]
 *  const s  = set_of(3, 1, 2, 1);             // FslSet → members {1, 2, 3}
 *  const m  = map_of([['a', 1], ['b', 2]]);   // FslMap<string, number>
 *
 *  set_has(s, 2);                             // true
 *  map_get(m, 'b');                           // 2
 *  equals(xs, list_of(1, 2, 3));              // true  (structural, not reference)
 *  ```
 *
 */
import { FslError } from './fsl_errors';
/**
 *  The three container kinds of §4.2.  Stored on every container as its `kind`
 *  discriminant so {@link equals}, {@link snapshot}, and {@link compare} can
 *  dispatch structurally without `instanceof`.
 */
type ContainerKind = 'list' | 'set' | 'map';
/**
 *  The decidable scalar domain for set members and map keys (§4.2: keys /
 *  set-members are "numbers/strings only").  Values, by contrast, may be any
 *  type, so they stay `unknown` throughout.
 */
type Scalar = number | string;
/**
 *  An immutable §4.2 **list** — the `array of T` container.  Ordered, allows
 *  duplicate and `undefined` elements, and its elements may be any type `T`
 *  (including nested containers).  The backing array is frozen on
 *  construction; every operation returns a fresh `FslList`.
 */
interface FslList<T> {
    readonly kind: 'list';
    readonly items: ReadonlyArray<T>;
}
/**
 *  An immutable §4.2 **set** — the `set of (number | string)` container.  An
 *  unordered collection of distinct members; membership is `SameValueZero`, so
 *  no two `===`-equal members coexist.  Stored as a frozen array in
 *  first-insertion order; canonical (sorted) order is materialised only at
 *  snapshot/compare time.
 */
interface FslSet {
    readonly kind: 'set';
    readonly members: ReadonlyArray<Scalar>;
}
/**
 *  An immutable §4.2 **map** — the `map<(number | string), V>` container.
 *  Keys are numbers or strings (decidable); values may be any type `V`.  Stored
 *  as parallel frozen key/value arrays in first-insertion order; canonical
 *  (sorted-by-key) order is materialised only at snapshot/compare time.
 */
interface FslMap<V> {
    readonly kind: 'map';
    readonly keys: ReadonlyArray<Scalar>;
    readonly values: ReadonlyArray<V>;
}
/**
 *  Any FSL container — the union the structural protocol ({@link equals},
 *  {@link compare}, {@link snapshot}, {@link deep_clone}) operates over.
 */
type FslContainer = FslList<unknown> | FslSet | FslMap<unknown>;
/**
 *  Raised when a value required to be a §4.2 container key or set member — a
 *  finite number or a string — is something else.  A dedicated subclass of
 *  {@link FslError} so callers can branch on either `instanceof ContainerKeyError`
 *  or the shared `error.kind === 'type_error'` taxonomy discriminant of §11,
 *  while the message still names the offending value and its role.
 *
 *  `NaN` and `±Infinity` are rejected even though they are `number`s: neither is
 *  a usable key (`NaN` never compares equal to itself; infinities are not finite
 *  scalars), so a key built from one could never be read back.
 *  @param key   The offending value supplied where a key / member was required.
 *  @param role  What it was being used as — `'key'` (map) or `'member'` (set) —
 *               so the message names the right role.
 *  @example
 *    try { map_get(map_of<number>([]), {} as never); }
 *    catch (e) {
 *      e instanceof ContainerKeyError;   // → true
 *      (e as ContainerKeyError).kind;    // → 'type_error'
 *      (e as ContainerKeyError).role;    // → 'key'
 *    }
 */
declare class ContainerKeyError extends FslError {
    readonly key: unknown;
    readonly role: 'key' | 'member';
    constructor(key: unknown, role: 'key' | 'member');
}
/**
 *  Raised by a strict read that addresses something not present — an
 *  out-of-range list index, or a missing map key on a strict read.  A dedicated
 *  subclass of {@link FslError} (taxonomy `kind === 'out_of_bounds'`) so a
 *  genuine miss can be told apart from any other failure by either
 *  `instanceof ContainerRangeError` or the shared `error.kind` discriminant.
 *  @param message  Human-readable description of what was out of range.
 *  @example
 *    try { list_at(list_of(1), 5); }
 *    catch (e) {
 *      e instanceof ContainerRangeError;   // → true
 *      (e as ContainerRangeError).kind;    // → 'out_of_bounds'
 *    }
 */
declare class ContainerRangeError extends FslError {
    constructor(message: string);
}
/**
 *  Predicate for the §4.2 key / member rule: `true` exactly for a string, or a
 *  **finite** number (rejecting `NaN` and `±Infinity`).  The boolean companion
 *  to {@link require_scalar}, which throws on the same inputs this returns
 *  `false` for; exposed so callers can test a candidate key without a try/catch.
 *  @param value  The candidate key or member.
 *  @returns      `true` iff `value` is a usable container key / member.
 *  @example
 *    is_container_key('a')        // → true
 *    is_container_key(3)          // → true
 *    is_container_key(NaN)        // → false
 *    is_container_key(Infinity)   // → false
 *    is_container_key(true)       // → false
 */
declare function is_container_key(value: unknown): value is Scalar;
/**
 *  Reject a candidate set member / map key that is not a §4.2 decidable scalar
 *  (a finite number or a string).  `NaN`, `±Infinity`, booleans, objects, and
 *  `null`/`undefined` are all refused, because none of them has the stable,
 *  decidable equality and ordering a key store requires.
 *  @param key   The candidate member or key.
 *  @param role  Whether it is used as a map `'key'` or a set `'member'`; only
 *               affects the error wording.  Defaults to `'key'`.
 *  @returns     The same value, narrowed to {@link Scalar}, when it is valid.
 *  @throws      {ContainerKeyError} when `key` is not a finite number or string.
 *  @example
 *    require_scalar('a')              // → 'a'
 *    require_scalar(7)                // → 7
 *    require_scalar(NaN)              // throws ContainerKeyError (not a decidable key)
 *    require_scalar({}, 'member')     // throws ContainerKeyError (role 'member')
 */
declare function require_scalar(key: unknown, role?: 'key' | 'member'): Scalar;
/**
 *  Render an arbitrary rejected key as a short, safe string for an error
 *  message.  Kept separate so {@link require_scalar} stays a single clear
 *  expression and the (rarely-hit) formatting branch is testable on its own.
 *  Objects, arrays, and functions are rendered by brand (`[object Object]`,
 *  `[object Array]`, …) rather than by their own `toString`, so a hostile or
 *  null-prototype key can never break — or spoof — the error message.
 *  @param key  The rejected value.
 *  @returns    A human-readable description.
 *  @example
 *    stringify_for_error(NaN)         // → 'NaN'
 *    stringify_for_error(undefined)   // → 'undefined'
 *    stringify_for_error({})          // → '[object Object]'
 *    stringify_for_error([1, 2])      // → '[object Array]'
 */
declare function stringify_for_error(key: unknown): string;
/**
 *  Total order over decidable scalars, used to put set members and map keys in
 *  **canonical** order for snapshot / compare (§15 "stable key order").  All
 *  numbers sort below all strings (a fixed, deterministic cross-type rule);
 *  within a type, numbers sort numerically and strings sort by UTF-16 code
 *  unit (`<`).  Total and antisymmetric, so it never reports two distinct
 *  scalars as equal.
 *  @param a  The left scalar.
 *  @param b  The right scalar.
 *  @returns  `-1`, `0`, or `1` as `a` sorts before, equal to, or after `b`.
 *  @example
 *    scalar_compare(1, 2)       // → -1
 *    scalar_compare(9, 'a')     // → -1   (numbers precede strings)
 *    scalar_compare('b', 'a')   // → 1
 */
declare function scalar_compare(a: Scalar, b: Scalar): -1 | 0 | 1;
/**
 *  Construct a §4.2 **list** from explicit elements.  Elements may be any type
 *  and duplicates are kept (a list is ordered, not a set).  The backing array
 *  is copied and frozen, so later mutation of the argument list can never reach
 *  inside the container.
 *  @param items  The elements, in order.
 *  @returns      A new immutable {@link FslList}.
 *  @example
 *    list_of(1, 2, 3)     // → list [1, 2, 3]
 *    list_of()            // → empty list []
 *    list_of('a', 'a')    // → list ['a', 'a']  (duplicates kept)
 */
declare function list_of<T>(...items: ReadonlyArray<T>): FslList<T>;
/**
 *  Construct a §4.2 **list** from an existing array (the form the `[…]` literal
 *  lowers to).  Like {@link list_of} but takes the elements as one array
 *  argument rather than as rest parameters.
 *  @param items  The source array; copied defensively.
 *  @returns      A new immutable {@link FslList}.
 *  @example
 *    list_from([1, 2, 3])   // → list [1, 2, 3]
 *    list_from([])          // → empty list []
 */
declare function list_from<T>(items: ReadonlyArray<T>): FslList<T>;
/**
 *  Element count of a list — the §4.2 `length`.
 *  @param list  The list.
 *  @returns     The number of elements.
 *  @example
 *    list_length(list_of(1, 2, 3))   // → 3
 *    list_length(list_of())          // → 0
 */
declare function list_length<T>(list: FslList<T>): number;
/**
 *  Resolve a possibly-negative list index against the length, or `undefined`
 *  when it lands outside `0 .. length-1`.  Negative indices count from the back
 *  (`-1` is the last element), the §8 / §4.2 convention shared across the
 *  language.
 *  @param index   The requested index; may be negative.
 *  @param length  The list length.
 *  @returns       The resolved in-range index, or `undefined` if out of range.
 *  @example
 *    resolve_list_index(0, 3)    // → 0
 *    resolve_list_index(-1, 3)   // → 2
 *    resolve_list_index(3, 3)    // → undefined
 *    resolve_list_index(-4, 3)   // → undefined
 */
declare function resolve_list_index(index: number, length: number): number | undefined;
/**
 *  Read the element at `index` — §4.2 access.  Supports negative-from-the-back
 *  indexing; an out-of-range index yields `undefined`.
 *  @param list   The list.
 *  @param index  The position; negative counts from the back.
 *  @returns      The element, or `undefined` if out of range.
 *  @example
 *    list_get(list_of(10, 20, 30), 1)    // → 20
 *    list_get(list_of(10, 20, 30), -1)   // → 30
 *    list_get(list_of(10, 20, 30), 9)    // → undefined
 */
declare function list_get<T>(list: FslList<T>, index: number): T | undefined;
/**
 *  Strict element read — §4.2 access that throws on a miss instead of returning
 *  `undefined`, so an out-of-range index is never silently confused with a
 *  stored `undefined`.  Negative-from-the-back indexing applies, same as
 *  {@link list_get}; for the lenient form use {@link list_get}.
 *  @param list   The list.
 *  @param index  The position; negative counts from the back.
 *  @returns      The element at the resolved index.
 *  @throws       {ContainerRangeError} if the resolved index is out of range.
 *  @example
 *    list_at(list_of(10, 20, 30), 1)    // → 20
 *    list_at(list_of(10, 20, 30), -1)   // → 30
 *    list_at(list_of(10, 20, 30), 9)    // throws ContainerRangeError
 */
declare function list_at<T>(list: FslList<T>, index: number): T;
/**
 *  Return a copy of `list` with the element at `index` replaced by `value` —
 *  §4.2 update (`items[i] := x` of §9, in its pure form).  The input is never
 *  mutated.  An out-of-range index returns the list unchanged (no element is
 *  appended and nothing is dropped); negative-from-the-back indexing applies.
 *  @param list   The source list.
 *  @param index  The position to overwrite; negative counts from the back.
 *  @param value  The replacement element.
 *  @returns      A new list, or the original (by value) when `index` is out of range.
 *  @example
 *    list_set(list_of(1, 2, 3), 1, 9)     // → list [1, 9, 3]
 *    list_set(list_of(1, 2, 3), -1, 9)    // → list [1, 2, 9]
 *    list_set(list_of(1, 2, 3), 9, 0)     // → list [1, 2, 3]  (out of range, unchanged)
 */
declare function list_set<T>(list: FslList<T>, index: number, value: T): FslList<T>;
/**
 *  Return a copy of `list` with `value` appended — §4.2 push.
 *  @param list   The source list.
 *  @param value  The element to append.
 *  @returns      A new list one element longer.
 *  @example
 *    list_push(list_of(1, 2), 3)   // → list [1, 2, 3]
 *    list_push(list_of(), 'x')     // → list ['x']
 */
declare function list_push<T>(list: FslList<T>, value: T): FslList<T>;
/**
 *  Return a copy of `list` with its last element removed, paired with that
 *  element — §4.2 pop.  On an empty list returns the empty list and `undefined`
 *  (total: pop never throws).
 *  @param list  The source list.
 *  @returns     A `[remaining, popped]` pair; `popped` is `undefined` when empty.
 *  @example
 *    list_pop(list_of(1, 2, 3))   // → [ list [1, 2], 3 ]
 *    list_pop(list_of())          // → [ list [], undefined ]
 */
declare function list_pop<T>(list: FslList<T>): [FslList<T>, T | undefined];
/**
 *  Half-open code-index slice `[lo, hi)` of a list, with negative-from-the-back
 *  bounds and clamping — §4.2 slice.  Omitting `hi` slices to the end.  Always
 *  returns a new list (a copy even when it spans the whole input).
 *  @param list  The source list.
 *  @param lo    Start bound (inclusive); negative counts from the back.
 *  @param hi    End bound (exclusive); negative counts from the back; defaults to the end.
 *  @returns     A new list of the selected elements.
 *  @example
 *    list_slice(list_of(1, 2, 3, 4), 1, 3)    // → list [2, 3]
 *    list_slice(list_of(1, 2, 3, 4), 1)       // → list [2, 3, 4]
 *    list_slice(list_of(1, 2, 3, 4), 1, -1)   // → list [2, 3]
 */
declare function list_slice<T>(list: FslList<T>, lo: number, hi?: number): FslList<T>;
/**
 *  Test membership of `value` in a list by structural deep equality — §4.2
 *  `in` over a list (§6 "structural deep equality for containers/ADTs").  Unlike
 *  set membership this is a linear scan and compares *values* deeply, so a list
 *  of containers matches on structure, not reference.
 *  @param list   The list to scan.
 *  @param value  The element to look for.
 *  @returns      `true` iff some element is structurally equal to `value`.
 *  @example
 *    list_includes(list_of(1, 2, 3), 2)                    // → true
 *    list_includes(list_of(1, 2, 3), 9)                    // → false
 *    list_includes(list_of(list_of(1)), list_of(1))        // → true  (deep)
 */
declare function list_includes<T>(list: FslList<T>, value: T): boolean;
/**
 *  Construct a §4.2 **set** from explicit members (the form the `#[…]` literal
 *  lowers to).  Members must be numbers or strings (§4.2); duplicates collapse
 *  by `SameValueZero`, and first-insertion order is preserved for iteration
 *  (canonical order is applied only at snapshot/compare time).
 *  @param members  The candidate members; numbers / strings only.
 *  @returns        A new immutable {@link FslSet} of the distinct members.
 *  @throws         `Error` if any member is not a finite number or string.
 *  @example
 *    set_of(1, 2, 3)        // → set {1, 2, 3}
 *    set_of(1, 1, 2)        // → set {1, 2}     (deduped)
 *    set_of('a', 1)         // → set {'a', 1}   (mixed scalars allowed)
 */
declare function set_of(...members: ReadonlyArray<Scalar>): FslSet;
/**
 *  Construct a §4.2 **set** from an array of candidate members.  Like
 *  {@link set_of} but takes the members as one array argument; this is the
 *  shared builder both `set_of` and the deserialiser call.
 *  @param members  The candidate members; numbers / strings only.
 *  @returns        A new immutable {@link FslSet} of the distinct members.
 *  @throws         `Error` if any member is not a finite number or string.
 *  @example
 *    set_from([1, 2, 2, 3])   // → set {1, 2, 3}
 *    set_from([])             // → empty set {}
 */
declare function set_from(members: ReadonlyArray<Scalar>): FslSet;
/**
 *  Member count of a set — its §4.2 `size`.
 *  @param set  The set.
 *  @returns    The number of distinct members.
 *  @example
 *    set_size(set_of(1, 2, 3))   // → 3
 *    set_size(set_of(1, 1))      // → 1
 */
declare function set_size(set: FslSet): number;
/**
 *  Test membership — §4.2 `in` over a set.  Uses `SameValueZero` (the same
 *  equality the constructor dedupes by), so it is O(n) but exact for the
 *  number / string member domain.
 *  @param set     The set.
 *  @param member  The candidate member.
 *  @returns       `true` iff `member` is in the set.
 *  @throws        {ContainerKeyError} if `member` is not a finite number or string.
 *  @example
 *    set_has(set_of(1, 2, 3), 2)     // → true
 *    set_has(set_of(1, 2, 3), 9)     // → false
 *    set_has(set_of('a'), 'b')       // → false
 */
declare function set_has(set: FslSet, member: Scalar): boolean;
/**
 *  Return a copy of `set` with `member` added — §4.2 set update.  Adding a
 *  member already present returns the original set (by value), so `set_add` is
 *  idempotent.
 *  @param set     The source set.
 *  @param member  The member to add; number / string only.
 *  @returns       A new set including `member`, or the original if already present.
 *  @throws        `Error` if `member` is not a finite number or string.
 *  @example
 *    set_add(set_of(1, 2), 3)    // → set {1, 2, 3}
 *    set_add(set_of(1, 2), 2)    // → set {1, 2}      (idempotent)
 */
declare function set_add(set: FslSet, member: Scalar): FslSet;
/**
 *  Return a copy of `set` with `member` removed — §4.2 set update.  Removing a
 *  member that is absent returns the original set (by value).
 *  @param set     The source set.
 *  @param member  The member to remove.
 *  @returns       A new set without `member`, or the original if it was absent.
 *  @throws        {ContainerKeyError} if `member` is not a finite number or string.
 *  @example
 *    set_remove(set_of(1, 2, 3), 2)   // → set {1, 3}
 *    set_remove(set_of(1, 2, 3), 9)   // → set {1, 2, 3}  (absent, unchanged)
 */
declare function set_remove(set: FslSet, member: Scalar): FslSet;
/**
 *  Union of two sets — every member of either — §4.2 set algebra.  The result
 *  keeps left-then-right first-insertion order (canonicalised only at
 *  snapshot/compare time).
 *  @param a  The left set.
 *  @param b  The right set.
 *  @returns  A new set containing every member of `a` or `b`.
 *  @example
 *    set_union(set_of(1, 2), set_of(2, 3))   // → set {1, 2, 3}
 *    set_union(set_of(), set_of(1))          // → set {1}
 */
declare function set_union(a: FslSet, b: FslSet): FslSet;
/**
 *  Intersection of two sets — members in both — §4.2 set algebra.
 *  @param a  The left set.
 *  @param b  The right set.
 *  @returns  A new set of members present in both `a` and `b`.
 *  @example
 *    set_intersection(set_of(1, 2, 3), set_of(2, 3, 4))   // → set {2, 3}
 *    set_intersection(set_of(1), set_of(2))               // → empty set {}
 */
declare function set_intersection(a: FslSet, b: FslSet): FslSet;
/**
 *  Difference `a \ b` — members of `a` not in `b` — §4.2 set algebra.
 *  @param a  The set to subtract from.
 *  @param b  The set whose members are removed.
 *  @returns  A new set of members in `a` but not `b`.
 *  @example
 *    set_difference(set_of(1, 2, 3), set_of(2))   // → set {1, 3}
 *    set_difference(set_of(1, 2), set_of(1, 2))   // → empty set {}
 */
declare function set_difference(a: FslSet, b: FslSet): FslSet;
/**
 *  Construct a §4.2 **map** from `[key, value]` entry pairs (the form the
 *  `#{…}` literal lowers to).  Keys must be numbers or strings (§4.2); values
 *  may be any type.  A repeated key keeps the **last** value (later entries win,
 *  matching object-literal semantics), and first-insertion key order is
 *  preserved for iteration.
 *  @param entries  The `[key, value]` pairs.
 *  @returns        A new immutable {@link FslMap}.
 *  @throws         `Error` if any key is not a finite number or string.
 *  @example
 *    map_of([['a', 1], ['b', 2]])     // → map {'a': 1, 'b': 2}
 *    map_of([['a', 1], ['a', 9]])     // → map {'a': 9}   (last wins)
 *    map_of([])                       // → empty map {}
 */
declare function map_of<V>(entries: ReadonlyArray<readonly [Scalar, V]>): FslMap<V>;
/**
 *  Entry count of a map — its §4.2 `size`.
 *  @param map  The map.
 *  @returns    The number of key/value entries.
 *  @example
 *    map_size(map_of([['a', 1], ['b', 2]]))   // → 2
 *    map_size(map_of([]))                     // → 0
 */
declare function map_size<V>(map: FslMap<V>): number;
/**
 *  Test key presence — §4.2 `has`.  Distinct from {@link map_get}, because a
 *  key may legitimately map to `undefined` as a value.
 *  @param map  The map.
 *  @param key  The key to test.
 *  @returns    `true` iff `key` has an entry.
 *  @throws     {ContainerKeyError} if `key` is not a finite number or string.
 *  @example
 *    map_has(map_of([['a', 1]]), 'a')   // → true
 *    map_has(map_of([['a', 1]]), 'z')   // → false
 */
declare function map_has<V>(map: FslMap<V>, key: Scalar): boolean;
/**
 *  Read the value at `key` — §4.2 map access.  Returns `undefined` for an
 *  absent key (use {@link map_has} to distinguish "absent" from "present with
 *  value `undefined`").
 *  @param map  The map.
 *  @param key  The key to read.
 *  @returns    The value, or `undefined` if the key is absent.
 *  @throws     {ContainerKeyError} if `key` is not a finite number or string.
 *  @example
 *    map_get(map_of([['a', 1], ['b', 2]]), 'b')   // → 2
 *    map_get(map_of([['a', 1]]), 'z')             // → undefined
 */
declare function map_get<V>(map: FslMap<V>, key: Scalar): V | undefined;
/**
 *  Strict map read — §4.2 access that throws on an absent key instead of
 *  returning `undefined`, so a miss is never confused with a key stored with
 *  value `undefined`.  For the lenient form use {@link map_get}; for a default
 *  fallback use {@link map_get_or}.
 *  @param map  The map.
 *  @param key  The key to read.
 *  @returns    The value stored under `key`.
 *  @throws     {ContainerKeyError}   if `key` is not a finite number or string.
 *  @throws     {ContainerRangeError} if `key` is absent from the map.
 *  @example
 *    map_get_strict(map_of([['a', 1]]), 'a')   // → 1
 *    map_get_strict(map_of([['a', 1]]), 'z')   // throws ContainerRangeError
 */
declare function map_get_strict<V>(map: FslMap<V>, key: Scalar): V;
/**
 *  Defaulting map read — returns the value stored under `key`, or `fallback`
 *  when the key is absent.  The middle ground between lenient {@link map_get}
 *  (returns `undefined` on a miss) and strict {@link map_get_strict} (throws):
 *  the caller supplies the miss value.
 *  @param map       The map.
 *  @param key       The key to read.
 *  @param fallback  Value returned when `key` is absent.
 *  @returns         The stored value, or `fallback` if `key` is absent.
 *  @throws          {ContainerKeyError} if `key` is not a finite number or string.
 *  @example
 *    map_get_or(map_of([['a', 1]]), 'a', 0)   // → 1
 *    map_get_or(map_of([['a', 1]]), 'z', 0)   // → 0   (absent → fallback)
 */
declare function map_get_or<V>(map: FslMap<V>, key: Scalar, fallback: V): V;
/**
 *  Return a copy of `map` with `key` set to `value` — §4.2 map update
 *  (`rec.f := y` of §9, in its pure form).  Updating an existing key keeps its
 *  position; a new key is appended.
 *  @param map    The source map.
 *  @param key    The key to set; number / string only.
 *  @param value  The value to store; any type.
 *  @returns      A new map with the entry set.
 *  @throws       `Error` if `key` is not a finite number or string.
 *  @example
 *    map_put(map_of([['a', 1]]), 'b', 2)   // → map {'a': 1, 'b': 2}
 *    map_put(map_of([['a', 1]]), 'a', 9)   // → map {'a': 9}   (replaces in place)
 */
declare function map_put<V>(map: FslMap<V>, key: Scalar, value: V): FslMap<V>;
/**
 *  Return a copy of `map` with `key`'s entry removed — §4.2 map update.
 *  Removing an absent key returns the original map (by value).
 *  @param map  The source map.
 *  @param key  The key to delete.
 *  @returns    A new map without `key`, or the original if it was absent.
 *  @throws     {ContainerKeyError} if `key` is not a finite number or string.
 *  @example
 *    map_remove(map_of([['a', 1], ['b', 2]]), 'a')   // → map {'b': 2}
 *    map_remove(map_of([['a', 1]]), 'z')             // → map {'a': 1}  (absent, unchanged)
 */
declare function map_remove<V>(map: FslMap<V>, key: Scalar): FslMap<V>;
/**
 *  All keys of a map, in first-insertion order — §4.2 `keys`.
 *  @param map  The map.
 *  @returns    A fresh array of the keys.
 *  @example
 *    map_keys(map_of([['a', 1], ['b', 2]]))   // → ['a', 'b']
 */
declare function map_keys<V>(map: FslMap<V>): Array<Scalar>;
/**
 *  All values of a map, in key-insertion order — §4.2 `values`.
 *  @param map  The map.
 *  @returns    A fresh array of the values.
 *  @example
 *    map_values(map_of([['a', 1], ['b', 2]]))   // → [1, 2]
 */
declare function map_values<V>(map: FslMap<V>): Array<V>;
/**
 *  All `[key, value]` entries of a map, in key-insertion order — §4.2
 *  `entries`.
 *  @param map  The map.
 *  @returns    A fresh array of `[key, value]` pairs.
 *  @example
 *    map_entries(map_of([['a', 1], ['b', 2]]))   // → [['a', 1], ['b', 2]]
 */
declare function map_entries<V>(map: FslMap<V>): Array<[Scalar, V]>;
/**
 *  Type guard recognising any of the three FSL containers by its `kind`
 *  discriminant.  Used by the structural protocol to decide whether to recurse
 *  into a container or treat a value as an opaque leaf.
 *  @param value  Any value.
 *  @returns      `true` iff `value` is an {@link FslList}, {@link FslSet}, or {@link FslMap}.
 *  @example
 *    is_container(list_of(1))   // → true
 *    is_container(42)           // → false
 *    is_container(null)         // → false
 */
declare function is_container(value: unknown): value is FslContainer;
/**
 *  Structural deep equality over arbitrary values — the §6 equality that the
 *  containers compare by.  Two FSL containers are equal when they are the same
 *  kind and structurally equal *as values* (sets ignore member order; maps
 *  ignore key order; lists are order-sensitive).  Non-container values fall
 *  back to nested arrays/plain-objects recursively and `SameValueZero` at the
 *  leaves (so `NaN` equals `NaN`, distinct from `===`).
 *  @param a  The left value.
 *  @param b  The right value.
 *  @returns  `true` iff `a` and `b` are structurally equal.
 *  @example
 *    deep_equal(list_of(1, 2), list_of(1, 2))           // → true
 *    deep_equal(set_of(1, 2), set_of(2, 1))             // → true   (order-free)
 *    deep_equal(list_of(1, 2), list_of(2, 1))           // → false  (lists ordered)
 *    deep_equal(NaN, NaN)                               // → true
 */
declare function deep_equal(a: unknown, b: unknown): boolean;
/**
 *  `SameValueZero` equality for leaf scalars — like `===` but with `NaN` equal
 *  to `NaN` (and `+0`/`-0` equal).  The leaf rule for {@link deep_equal} and the
 *  member/key equality the containers dedupe by.
 *  @param a  The left value.
 *  @param b  The right value.
 *  @returns  `true` iff `a` and `b` are the same value (zero-style).
 *  @example
 *    same_value_zero(1, 1)       // → true
 *    same_value_zero(NaN, NaN)   // → true
 *    same_value_zero(0, -0)      // → true
 *    same_value_zero(1, 2)       // → false
 */
declare function same_value_zero(a: unknown, b: unknown): boolean;
/**
 *  Structural equality of two containers known to be the same union — the
 *  per-kind core of {@link deep_equal}.  Lists compare element-wise in order;
 *  sets compare as unordered member collections of equal size; maps compare as
 *  unordered key→value collections of equal size with deep-equal values.
 *  @param a  The left container.
 *  @param b  The right container.
 *  @returns  `true` iff the two containers are structurally equal.
 *  @example
 *    container_equal(map_of([['a', 1]]), map_of([['a', 1]]))   // → true
 *    container_equal(set_of(1, 2), set_of(1, 2, 3))            // → false  (size differs)
 */
declare function container_equal(a: FslContainer, b: FslContainer): boolean;
/**
 *  Element-wise structural equality of two array-likes — the list and
 *  nested-array case of {@link deep_equal}.
 *  @param a  The left array.
 *  @param b  The right array.
 *  @returns  `true` iff both arrays have equal length and deep-equal elements in order.
 *  @example
 *    array_equal([1, 2], [1, 2])   // → true
 *    array_equal([1, 2], [1])      // → false
 */
declare function array_equal(a: ReadonlyArray<unknown>, b: ReadonlyArray<unknown>): boolean;
/**
 *  Recognise a plain data object — a non-null object that is neither an array
 *  nor an FSL container — so {@link deep_equal} can recurse into record-shaped
 *  values (the §4.2 `record` lowering) without misclassifying containers or
 *  arrays.
 *  @param value  Any value.
 *  @returns      `true` iff `value` is a plain (record-shaped) object.
 *  @example
 *    is_plain_object({ x: 1 })      // → true
 *    is_plain_object([1, 2])        // → false
 *    is_plain_object(list_of(1))    // → false
 *    is_plain_object(null)          // → false
 */
declare function is_plain_object(value: unknown): value is Record<string, unknown>;
/**
 *  Structural equality of two plain objects — the record case of
 *  {@link deep_equal}.  Equal when they have the same set of own enumerable keys
 *  and deep-equal values at each.
 *  @param a  The left object.
 *  @param b  The right object.
 *  @returns  `true` iff the two objects are structurally equal.
 *  @example
 *    object_equal({ x: 1, y: 2 }, { y: 2, x: 1 })   // → true  (key order ignored)
 *    object_equal({ x: 1 }, { x: 1, y: 2 })         // → false
 */
declare function object_equal(a: Record<string, unknown>, b: Record<string, unknown>): boolean;
/**
 *  Value-equality of two **containers** — the public §6 `=` over containers, a
 *  thin typed wrapper over {@link deep_equal} for callers who already hold
 *  {@link FslContainer}s.
 *  @param a  The left container.
 *  @param b  The right container.
 *  @returns  `true` iff structurally equal.
 *  @example
 *    equals(list_of(1, 2, 3), list_of(1, 2, 3))   // → true
 *    equals(set_of(1, 2), set_of(2, 1))           // → true
 *    equals(map_of([['a', 1]]), map_of([['a', 2]]))   // → false
 */
declare function equals(a: FslContainer, b: FslContainer): boolean;
/**
 *  The canonical, plain-JSON **snapshot** of a container (§15: "canonical
 *  serialization … stable key order").  Lists keep element order; sets and maps
 *  are emitted in {@link scalar_compare} **sorted** order so two structurally
 *  equal containers always serialise to identical, byte-stable shapes — the
 *  property the undo-log snapshot / cross-host repro equality relies on.
 *  Returns ordinary frozen arrays / objects (no class instances), so the result
 *  round-trips through `JSON.stringify`/`parse` unchanged.
 *  @param value  A container, or any nested value reachable from one.
 *  @returns      A canonical, frozen, JSON-safe snapshot.
 *  @example
 *    snapshot(list_of(1, 2))
 *    // → { kind:'list', items:[1, 2] }
 *    snapshot(set_of(3, 1, 2))
 *    // → { kind:'set', members:[1, 2, 3] }            (sorted, canonical)
 *    snapshot(map_of([['b', 1], ['a', 2]]))
 *    // → { kind:'map', entries:[['a', 2], ['b', 1]] }  (sorted by key)
 */
declare function snapshot(value: unknown): unknown;
/**
 *  A deep **by-value clone** of a container — the by-value snapshot the §15
 *  undo-log journal logs as a slot's `old-value`, and the defensive copy a host
 *  takes before letting a hook mutate borrowed state.  Structurally identical to
 *  the input ({@link equals} of input and clone is always `true`) but shares no
 *  mutable backing array, so mutating one can never reach the other.  Preserves
 *  insertion* order (it is a faithful copy, not a canonicalisation — use
 *  {@link snapshot} for the canonical form).
 *  @param value  A container, or any nested value reachable from one.
 *  @returns      A deep, frozen, independent copy.
 *  @example
 *    const a = list_of(1, 2, 3);
 *    const b = deep_clone(a);
 *    equals(a, b);          // → true
 *    (a.items === b.items); // → false  (independent backing arrays)
 */
declare function deep_clone<T>(value: T): T;
/**
 *  Kind ranks for {@link compare}: lists order before sets order before maps —
 *  a fixed, deterministic cross-kind rule so containers of different kinds sort
 *  in a stable, documented order rather than by an incidental property-name
 *  comparison of their snapshots.
 */
declare const KIND_RANK: Readonly<Record<ContainerKind, number>>;
/**
 *  Total order over two **containers** — the §6 `compare`, which orders even
 *  containers of the same kind so they can sort deterministically.  Orders
 *  first by kind via {@link KIND_RANK} (`list` < `set` < `map`), then
 *  structurally over the canonical snapshots: lists by element sequence, sets
 *  by their sorted member sequence, maps by their sorted key/value entry
 *  sequence.  Total and consistent with {@link equals} (`compare(a, b) === 0`
 *  iff `equals(a, b)`).
 *  @param a  The left container.
 *  @param b  The right container.
 *  @returns  `-1`, `0`, or `1` as `a` sorts before, equal to, or after `b`.
 *  @example
 *    compare(list_of(1, 2), list_of(1, 3))   // → -1
 *    compare(set_of(1, 2), set_of(2, 1))     // → 0   (order-free, equal)
 *    compare(list_of(1), set_of(1))          // → -1  (list kind precedes set)
 *    compare(map_of([['a', 1]]), set_of(1))  // → 1   (map kind follows set)
 */
declare function compare(a: FslContainer, b: FslContainer): -1 | 0 | 1;
/**
 *  Total order over two already-canonical snapshots — the recursive engine
 *  behind {@link compare}.  Comparing canonical snapshots means set/map order is
 *  already normalised, so this is a straightforward lexicographic walk over
 *  frozen arrays / objects / scalar leaves.  Cross-type leaves order by a fixed
 *  type rank so the order stays total over heterogeneous values.
 *  @param a  The left canonical snapshot.
 *  @param b  The right canonical snapshot.
 *  @returns  `-1`, `0`, or `1`.
 *  @example
 *    compare_snapshots([1, 2], [1, 3])   // → -1
 *    compare_snapshots(1, 'a')           // → -1   (number rank precedes string)
 */
declare function compare_snapshots(a: unknown, b: unknown): -1 | 0 | 1;
/**
 *  The ordering rank of a canonical-snapshot node — scalars (numbers / strings)
 *  below arrays below objects — so {@link compare_snapshots} can order
 *  heterogeneous values totally.  Booleans, `null`, and `undefined` (legal map
 *  values*) rank as scalars and tie-break inside {@link scalar_compare}'s
 *  caller via their coerced form.
 *  @param value  A canonical-snapshot node.
 *  @returns, {@link RANK_ARRAY}, or {@link RANK_OBJECT}.
 *  @example
 *    type_rank(7)        // → 0
 *    type_rank([1])      // → 1
 *    type_rank({ x:1 })  // → 2
 */
declare function type_rank(value: unknown): number;
/**
 *  Lexicographic order over two snapshot arrays — shorter-but-equal-prefix
 *  sorts first.  A helper for {@link compare_snapshots}.
 *  @param a  The left array.
 *  @param b  The right array.
 *  @returns  `-1`, `0`, or `1`.
 *  @example
 *    array_compare([1, 2], [1, 2, 3])   // → -1   (prefix sorts first)
 *    array_compare([2], [1])            // → 1
 */
declare function array_compare(a: ReadonlyArray<unknown>, b: ReadonlyArray<unknown>): -1 | 0 | 1;
/**
 *  Order over two snapshot objects by a sorted-key walk — a helper for
 *  {@link compare_snapshots}.  Both objects are canonical snapshots, so their
 *  key sets are deterministic; the walk compares key names first, then the value
 *  at each shared key.
 *  @param a  The left object.
 *  @param b  The right object.
 *  @returns  `-1`, `0`, or `1`.
 *  @example
 *    object_compare({ kind:'list' }, { kind:'set' })   // → -1
 */
declare function object_compare(a: Record<string, unknown>, b: Record<string, unknown>): -1 | 0 | 1;
export { list_of, list_from, list_length, resolve_list_index, list_get, list_at, list_set, list_push, list_pop, list_slice, list_includes, set_of, set_from, set_size, set_has, set_add, set_remove, set_union, set_intersection, set_difference, map_of, map_size, map_has, map_get, map_get_strict, map_get_or, map_put, map_remove, map_keys, map_values, map_entries, is_container, deep_equal, same_value_zero, equals, snapshot, deep_clone, compare, KIND_RANK, ContainerKeyError, ContainerRangeError, is_container_key, require_scalar, stringify_for_error, scalar_compare, container_equal, array_equal, is_plain_object, object_equal, compare_snapshots, type_rank, array_compare, object_compare };
export type { ContainerKind, Scalar, FslList, FslSet, FslMap, FslContainer };
