
/*******
 *
 *  Container-type protocol for FSL (§4.2 of the v6 megaspec).
 *
 *  Implements the three open container types named in §4.2 — **list**
 *  (`array of T`), **map** (`map<K, V>`), and **set** (`set of K`) — as a
 *  self-contained, parser-decoupled, fully typed module.  Each container is a
 *  small immutable record wrapping a plain JavaScript collection; every
 *  operation is a **pure function** that returns a new container rather than
 *  mutating its argument, so the val-record snapshot / rollback machinery of
 *  §5 can keep a prior configuration alive simply by holding the prior value.
 *
 *  Two §4.2 invariants shape the whole module:
 *
 *  - **Keys and set members are numbers or strings only.**  The spec restricts
 *    them to types with decidable equality / hash / serialize.  Every key or
 *    member that crosses a public boundary is validated and rejected with
 *    {@link ContainerKeyError} otherwise.
 *  - **Values are any type.**  Map and list values are unconstrained.
 *
 *  Equality is **structural deep equality** (§6): two containers compare equal
 *  when their contents compare equal, recursing through nested containers,
 *  arrays, and plain objects, with `NaN` treated as equal to itself so that a
 *  snapshot containing `NaN` round-trips.  `snapshot` / `restore` give a
 *  defensive structural copy in each direction, so a captured snapshot is
 *  insulated from later mutation of any mutable values it happens to hold.
 *
 *  No parser coupling: this module knows nothing about FSL source, the parse
 *  tree, or the `Machine` class.  It is the runtime substrate those layers
 *  build on.
 *
 */


/*******
 *
 *  The only types admissible as a map key or a set member (§4.2): a `number`
 *  or a `string`.  Restricting members to these keeps equality, hashing, and
 *  serialization decidable, which the finite-checking tier depends on.
 *
 *  ```typescript
 *  const k: ContainerKey = 'a';
 *  const n: ContainerKey = 7;
 *  ```
 *
 */

type ContainerKey = number | string;


/*******
 *
 *  A discriminant tag identifying which of the three §4.2 container kinds a
 *  value is.  Stored on every container so that mixed collections of
 *  containers can be discriminated without `instanceof`.
 *
 *  ```typescript
 *  const k: ContainerKind = 'map';
 *  ```
 *
 */

type ContainerKind = 'list' | 'map' | 'set';


/*******
 *
 *  An FSL **list** (`array of T`, §4.2): an ordered, index-addressable
 *  sequence of values of a single element type `T`.  The backing `items`
 *  array is treated as immutable — every list operation returns a fresh
 *  `FslList` rather than mutating it in place.
 *
 *  ```typescript
 *  const xs: FslList<number> = make_list([1, 2, 3]);
 *  xs.kind;          // 'list'
 *  xs.items.length;  // 3
 *  ```
 *
 *  @see make_list
 *
 */

type FslList<T> = {
  readonly kind  : 'list';
  readonly items : ReadonlyArray<T>;
};


/*******
 *
 *  An FSL **map** (`map<K, V>`, §4.2): an association from keys (numbers or
 *  strings) to values of any type, with insertion order preserved.  The
 *  backing `entries` array is treated as immutable; every map operation
 *  returns a fresh `FslMap`.
 *
 *  Insertion order is preserved across updates: re-assigning an existing key
 *  keeps its original position, while a new key appends.
 *
 *  ```typescript
 *  const m: FslMap<number> = make_map([['a', 1], ['b', 2]]);
 *  m.kind;            // 'map'
 *  m.entries.length;  // 2
 *  ```
 *
 *  @see make_map
 *
 */

type FslMap<V> = {
  readonly kind    : 'map';
  readonly entries : ReadonlyArray<readonly [ContainerKey, V]>;
};


/*******
 *
 *  An FSL **set** (`set of K`, §4.2): an unordered collection of distinct
 *  members, each a number or string.  Insertion order is preserved for
 *  reproducible iteration / serialization.  The backing `members` array is
 *  treated as immutable; every set operation returns a fresh `FslSet`.
 *
 *  ```typescript
 *  const s: FslSet = make_set([1, 2, 3]);
 *  s.kind;            // 'set'
 *  s.members.length;  // 3
 *  ```
 *
 *  @see make_set
 *
 */

type FslSet = {
  readonly kind    : 'set';
  readonly members : ReadonlyArray<ContainerKey>;
};


/*******
 *
 *  Any of the three §4.2 containers, discriminated by its `kind` tag.
 *
 *  ```typescript
 *  const c: FslContainer = make_set(['x']);
 *  c.kind;  // 'set'
 *  ```
 *
 */

type FslContainer = FslList<unknown> | FslMap<unknown> | FslSet;


/*******
 *
 *  Error raised when a value that is required to be a valid container key or
 *  set member (a `number` or a `string`, §4.2) is something else.  A dedicated
 *  error type keeps the module self-contained — no `Machine` context is needed
 *  to raise it — while still letting callers discriminate the bad-key path
 *  with `instanceof`.
 *
 *  `NaN` is rejected even though it is a `number`: it is not a usable key,
 *  because it never compares equal to itself, so a `NaN` key could never be
 *  read back.
 *
 *  ```typescript
 *  try {
 *    map_set(make_map<number>([]), {} as any, 1);
 *  } catch (e) {
 *    e instanceof ContainerKeyError;  // true
 *  }
 *  ```
 *
 *  @param key  - The offending value that was supplied where a key/member was
 *                required.
 *  @param role - What the value was being used as — `'key'` for a map key or
 *                `'member'` for a set member — so the message names the right
 *                role.
 *
 */

class ContainerKeyError extends Error {

  readonly key  : unknown;
  readonly role : 'key' | 'member';

  constructor(key: unknown, role: 'key' | 'member') {
    // A `ContainerKeyError` only ever names a value that *failed* the §4.2
    // key rule, which a string never does — so `key` here is always a
    // non-string and `String(key)` is the right rendering.
    super(`container ${role} must be a number or string; got ${String(key)}`);
    this.name = 'ContainerKeyError';
    this.key  = key;
    this.role = role;
  }

}


/*******
 *
 *  Error raised by a read that addresses something not present — an
 *  out-of-range list index, or a missing map key on a strict read.  Keeping a
 *  dedicated type lets callers distinguish a genuine miss from any other
 *  failure with `instanceof`.
 *
 *  ```typescript
 *  try {
 *    list_get(make_list([1]), 5);
 *  } catch (e) {
 *    e instanceof ContainerRangeError;  // true
 *  }
 *  ```
 *
 *  @param message - A human-readable description of what was out of range.
 *
 */

class ContainerRangeError extends Error {

  constructor(message: string) {
    super(message);
    this.name = 'ContainerRangeError';
  }

}


/*******
 *
 *  Predicate guarding the §4.2 key/member rule: `true` exactly for a `number`
 *  that is not `NaN`, or a `string`.  Used internally to validate keys and set
 *  members before they are stored.
 *
 *  ```typescript
 *  is_container_key('a');   // true
 *  is_container_key(3);     // true
 *  is_container_key(NaN);   // false
 *  is_container_key(true);  // false
 *  ```
 *
 *  @param value - The candidate key or member.
 *
 *  @returns `true` if `value` is a usable container key/member.
 *
 */

function is_container_key(value: unknown): value is ContainerKey {

  if (typeof value === 'string') {
    return true;
  }

  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }

  return false;

}


/*******
 *
 *  Validates a candidate key/member, returning it narrowed to
 *  {@link ContainerKey}, or throwing {@link ContainerKeyError} if it fails the
 *  §4.2 rule.  Internal helper behind the public constructors and operations.
 *
 *  @param value - The candidate key or member.
 *  @param role  - `'key'` or `'member'`, used only to phrase the error.
 *
 *  @returns `value`, typed as a {@link ContainerKey}.
 *
 *  @throws {ContainerKeyError} If `value` is not a non-`NaN` number or string.
 *
 */

function require_container_key(value: unknown, role: 'key' | 'member'): ContainerKey {

  if (is_container_key(value)) {
    return value;
  }

  throw new ContainerKeyError(value, role);

}


/*******
 *
 *  Structural deep-equality test (§6) used by every container comparison and
 *  by `set`/`map` membership.  Recurses through {@link FslContainer}s, plain
 *  arrays, and plain objects; treats `NaN` as equal to itself (so a snapshot
 *  holding `NaN` round-trips); and otherwise falls back to `Object.is` for
 *  scalars (so `+0` and `-0` are distinguished, matching IEEE intent).
 *
 *  Containers are compared by content, never by identity, so two
 *  independently constructed maps with the same entries compare equal.
 *
 *  ```typescript
 *  deep_equal(make_list([1, 2]), make_list([1, 2]));  // true
 *  deep_equal({ a: [1] }, { a: [1] });                // true
 *  deep_equal(NaN, NaN);                               // true
 *  deep_equal(0, -0);                                  // false
 *  ```
 *
 *  @param a - First value.
 *  @param b - Second value.
 *
 *  @returns `true` if `a` and `b` are structurally deep-equal.
 *
 */

function deep_equal(a: unknown, b: unknown): boolean {

  if (Object.is(a, b)) {
    return true;
  }

  // Object.is already accepted NaN===NaN and rejected +0/-0; from here on
  // only structural recursion can rescue a mismatch.

  if ((typeof a !== 'object') || (typeof b !== 'object')) {
    return false;
  }

  if ((a === null) || (b === null)) {
    return false;
  }

  const a_array = Array.isArray(a);
  const b_array = Array.isArray(b);

  if (a_array !== b_array) {
    return false;
  }

  if (a_array && b_array) {
    return arrays_deep_equal(a as unknown[], b as unknown[]);
  }

  return records_deep_equal(a as Record<string, unknown>, b as Record<string, unknown>);

}


/*******
 *
 *  Element-wise structural comparison of two arrays.  Internal helper behind
 *  {@link deep_equal}; arrays of unequal length are never equal.
 *
 *  @param a - First array.
 *  @param b - Second array.
 *
 *  @returns `true` if the arrays are the same length and deep-equal elementwise.
 *
 */

function arrays_deep_equal(a: unknown[], b: unknown[]): boolean {

  if (a.length !== b.length) {
    return false;
  }

  return a.every((el, i) => deep_equal(el, b[i]));

}


/*******
 *
 *  Key-wise structural comparison of two plain objects.  Internal helper
 *  behind {@link deep_equal}; objects with differing key sets are never equal.
 *  Both `FslContainer`s and arbitrary records flow through here, so the `kind`
 *  discriminant participates in equality automatically — a list never equals a
 *  set even with identical-looking contents.
 *
 *  @param a - First record.
 *  @param b - Second record.
 *
 *  @returns `true` if the records have the same keys and deep-equal values.
 *
 */

function records_deep_equal(a: Record<string, unknown>, b: Record<string, unknown>): boolean {

  const a_keys = Object.keys(a);
  const b_keys = Object.keys(b);

  if (a_keys.length !== b_keys.length) {
    return false;
  }

  return a_keys.every(k =>
    Object.prototype.hasOwnProperty.call(b, k) && deep_equal(a[k], b[k])
  );

}


/*******
 *
 *  Produces a defensive structural deep copy of an arbitrary value, used by
 *  {@link snapshot} and {@link restore} so that captured container state is
 *  insulated from later mutation of any mutable value it transitively holds.
 *  Recurses through arrays and plain objects (including the container records
 *  themselves); scalars and `null` pass through by value.
 *
 *  ```typescript
 *  const src = { a: [1, 2] };
 *  const cp  = deep_clone(src);
 *  cp.a.push(3);
 *  src.a.length;  // still 2 — the copy is independent
 *  ```
 *
 *  @param value - The value to copy.
 *
 *  @returns A structurally independent deep copy of `value`.
 *
 */

function deep_clone<T>(value: T): T {

  if ((typeof value !== 'object') || (value === null)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(el => deep_clone(el)) as unknown as T;
  }

  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = deep_clone(v);
  }

  return out as T;

}


// ---------------------------------------------------------------------------
//  list  (array of T)
// ---------------------------------------------------------------------------


/*******
 *
 *  Constructs an {@link FslList} from an array of elements.  The input is
 *  defensively copied, so later mutation of the source array does not leak
 *  into the list.  Element values are unconstrained (any type, §4.2).
 *
 *  ```typescript
 *  make_list([1, 2, 3]);   // FslList<number> over [1, 2, 3]
 *  make_list<string>([]);  // an empty list
 *  ```
 *
 *  @param items - The initial elements; defaults to empty.
 *
 *  @returns A new list over a private copy of `items`.
 *
 */

function make_list<T>(items: ReadonlyArray<T> = []): FslList<T> {
  return { kind: 'list', items: items.slice() };
}


/*******
 *
 *  Number of elements in a list.
 *
 *  ```typescript
 *  list_size(make_list([1, 2, 3]));  // 3
 *  list_size(make_list([]));         // 0
 *  ```
 *
 *  @param list - The list to measure.
 *
 *  @returns The element count.
 *
 */

function list_size<T>(list: FslList<T>): number {
  return list.items.length;
}


/*******
 *
 *  Reads the element at `index`, supporting Python-style negative-from-the-back
 *  indexing (§8): `-1` is the last element.  A strict read — an out-of-range
 *  index throws rather than returning `undefined`, so a miss is never silently
 *  confused with a stored `undefined`.
 *
 *  ```typescript
 *  list_get(make_list([10, 20, 30]),  0);  // 10
 *  list_get(make_list([10, 20, 30]), -1);  // 30
 *  ```
 *
 *  @param list  - The list to read.
 *  @param index - Zero-based index; negative counts from the end.
 *
 *  @returns The element at the resolved index.
 *
 *  @throws {ContainerRangeError} If the resolved index is out of range.
 *
 *  @see list_size
 *
 */

function list_get<T>(list: FslList<T>, index: number): T {

  const resolved = (index < 0) ? (list.items.length + index) : index;

  if ((resolved < 0) || (resolved >= list.items.length)) {
    throw new ContainerRangeError(
      `list index ${index} out of range for length ${list.items.length}`
    );
  }

  return list.items[resolved];

}


/*******
 *
 *  Returns a new list with the element at `index` replaced by `value`,
 *  leaving the original list unchanged.  Negative indices count from the back
 *  (§8); an out-of-range index throws.
 *
 *  ```typescript
 *  const a = make_list([1, 2, 3]);
 *  const b = list_set(a, 1, 99);
 *  b.items;  // [1, 99, 3]
 *  a.items;  // [1, 2, 3]  (unchanged)
 *  ```
 *
 *  @param list  - The source list.
 *  @param index - Index to overwrite; negative counts from the end.
 *  @param value - The replacement element.
 *
 *  @returns A new list with the element replaced.
 *
 *  @throws {ContainerRangeError} If the resolved index is out of range.
 *
 */

function list_set<T>(list: FslList<T>, index: number, value: T): FslList<T> {

  const resolved = (index < 0) ? (list.items.length + index) : index;

  if ((resolved < 0) || (resolved >= list.items.length)) {
    throw new ContainerRangeError(
      `list index ${index} out of range for length ${list.items.length}`
    );
  }

  const next = list.items.slice();
  next[resolved] = value;

  return { kind: 'list', items: next };

}


/*******
 *
 *  Returns a new list with `value` appended to the end.
 *
 *  ```typescript
 *  list_push(make_list([1, 2]), 3).items;  // [1, 2, 3]
 *  ```
 *
 *  @param list  - The source list.
 *  @param value - The element to append.
 *
 *  @returns A new list one element longer.
 *
 */

function list_push<T>(list: FslList<T>, value: T): FslList<T> {
  return { kind: 'list', items: [...list.items, value] };
}


/*******
 *
 *  Returns the last element together with a new list that no longer contains
 *  it — the immutable analogue of `Array.prototype.pop`.
 *
 *  ```typescript
 *  const { value, rest } = list_pop(make_list([1, 2, 3]));
 *  value;       // 3
 *  rest.items;  // [1, 2]
 *  ```
 *
 *  @param list - The source list; must be non-empty.
 *
 *  @returns An object with the removed `value` and the shortened `rest` list.
 *
 *  @throws {ContainerRangeError} If `list` is empty.
 *
 */

function list_pop<T>(list: FslList<T>): { value: T; rest: FslList<T> } {

  if (list.items.length === 0) {
    throw new ContainerRangeError('cannot pop from an empty list');
  }

  const value = list.items[list.items.length - 1];
  const rest  = { kind: 'list', items: list.items.slice(0, -1) } as FslList<T>;

  return { value, rest };

}


/*******
 *
 *  Whether any element of the list is structurally deep-equal (§6) to `value`.
 *  Unlike native `Array.prototype.includes`, this matches by structure, so a
 *  list of objects or nested containers can be searched by content.
 *
 *  ```typescript
 *  list_includes(make_list([{ a: 1 }]), { a: 1 });  // true
 *  list_includes(make_list([1, 2, 3]),  9);         // false
 *  ```
 *
 *  @param list  - The list to search.
 *  @param value - The value to look for.
 *
 *  @returns `true` if an element deep-equals `value`.
 *
 *  @see deep_equal
 *
 */

function list_includes<T>(list: FslList<T>, value: T): boolean {
  return list.items.some(el => deep_equal(el, value));
}


// ---------------------------------------------------------------------------
//  map  (map<K, V>)
// ---------------------------------------------------------------------------


/*******
 *
 *  Constructs an {@link FslMap} from an iterable of `[key, value]` pairs.
 *  Keys are validated against the §4.2 rule (number or string).  When a key
 *  repeats in the input, the **last** assignment wins but the entry keeps the
 *  position of its first appearance, matching the insertion-order semantics of
 *  a JavaScript `Map`.  Values are unconstrained.
 *
 *  ```typescript
 *  make_map([['a', 1], ['b', 2]]).entries;  // [['a', 1], ['b', 2]]
 *  make_map([['a', 1], ['a', 9]]).entries;  // [['a', 9]]
 *  make_map<number>([]);                     // an empty map
 *  ```
 *
 *  @param pairs - Initial `[key, value]` pairs; defaults to empty.
 *
 *  @returns A new map.
 *
 *  @throws {ContainerKeyError} If any key is not a non-`NaN` number or string.
 *
 */

function make_map<V>(pairs: Iterable<readonly [ContainerKey, V]> = []): FslMap<V> {

  let acc = { kind: 'map', entries: [] } as FslMap<V>;

  for (const [key, value] of pairs) {
    acc = map_set(acc, key, value);
  }

  return acc;

}


/*******
 *
 *  Number of entries in a map.
 *
 *  ```typescript
 *  map_size(make_map([['a', 1], ['b', 2]]));  // 2
 *  ```
 *
 *  @param map - The map to measure.
 *
 *  @returns The entry count.
 *
 */

function map_size<V>(map: FslMap<V>): number {
  return map.entries.length;
}


/*******
 *
 *  Whether `key` is present in the map.  The key is validated against the
 *  §4.2 rule first, so an ill-typed key is reported as such rather than simply
 *  reading as absent.
 *
 *  ```typescript
 *  map_has(make_map([['a', 1]]), 'a');  // true
 *  map_has(make_map([['a', 1]]), 'z');  // false
 *  ```
 *
 *  @param map - The map to query.
 *  @param key - The key to look for.
 *
 *  @returns `true` if `key` is present.
 *
 *  @throws {ContainerKeyError} If `key` is not a non-`NaN` number or string.
 *
 */

function map_has<V>(map: FslMap<V>, key: ContainerKey): boolean {
  const valid = require_container_key(key, 'key');
  return map.entries.some(([k]) => k === valid);
}


/*******
 *
 *  Strict map read: returns the value stored under `key`, throwing if the key
 *  is absent so that a miss is never silently confused with a stored
 *  `undefined`.  For a non-throwing read use {@link map_get_or}.
 *
 *  ```typescript
 *  map_get(make_map([['a', 1]]), 'a');  // 1
 *  ```
 *
 *  @param map - The map to read.
 *  @param key - The key to read.
 *
 *  @returns The value stored under `key`.
 *
 *  @throws {ContainerKeyError}   If `key` is not a number or string.
 *  @throws {ContainerRangeError} If `key` is absent from the map.
 *
 *  @see map_get_or
 *
 */

function map_get<V>(map: FslMap<V>, key: ContainerKey): V {

  const valid = require_container_key(key, 'key');
  const found = map.entries.find(([k]) => k === valid);

  if (found === undefined) {
    const printable = (typeof valid === 'string') ? `"${valid}"` : String(valid);
    throw new ContainerRangeError(`map has no key ${printable}`);
  }

  return found[1];

}


/*******
 *
 *  Lenient map read: returns the value stored under `key`, or `fallback` when
 *  the key is absent.  Pairs with {@link map_get} for callers that prefer a
 *  default to an exception.
 *
 *  ```typescript
 *  map_get_or(make_map([['a', 1]]), 'a', 0);  // 1
 *  map_get_or(make_map([['a', 1]]), 'z', 0);  // 0
 *  ```
 *
 *  @param map      - The map to read.
 *  @param key      - The key to read.
 *  @param fallback - Value to return when `key` is absent.
 *
 *  @returns The stored value, or `fallback` if `key` is absent.
 *
 *  @throws {ContainerKeyError} If `key` is not a number or string.
 *
 *  @see map_get
 *
 */

function map_get_or<V>(map: FslMap<V>, key: ContainerKey, fallback: V): V {

  const valid = require_container_key(key, 'key');
  const found = map.entries.find(([k]) => k === valid);

  return (found === undefined) ? fallback : found[1];

}


/*******
 *
 *  Returns a new map with `key` bound to `value`, leaving the original map
 *  unchanged.  An existing key is updated **in place** (its insertion position
 *  is preserved); a new key is appended.  The key is validated against the
 *  §4.2 rule.
 *
 *  ```typescript
 *  const a = make_map([['x', 1]]);
 *  const b = map_set(a, 'y', 2);
 *  b.entries;  // [['x', 1], ['y', 2]]
 *  a.entries;  // [['x', 1]]  (unchanged)
 *  map_set(make_map([['x', 1]]), 'x', 9).entries;  // [['x', 9]]
 *  ```
 *
 *  @param map   - The source map.
 *  @param key   - The key to assign.
 *  @param value - The value to bind.
 *
 *  @returns A new map with `key` bound to `value`.
 *
 *  @throws {ContainerKeyError} If `key` is not a non-`NaN` number or string.
 *
 */

function map_set<V>(map: FslMap<V>, key: ContainerKey, value: V): FslMap<V> {

  const valid    = require_container_key(key, 'key');
  const existing = map.entries.findIndex(([k]) => k === valid);

  if (existing === -1) {
    return { kind: 'map', entries: [...map.entries, [valid, value]] };
  }

  const next = map.entries.slice();
  next[existing] = [valid, value];

  return { kind: 'map', entries: next };

}


/*******
 *
 *  Returns a new map with `key` removed, leaving the original unchanged.
 *  Removing an absent key is a no-op that returns an equal map (a fresh
 *  object, never the same reference, so callers can treat the result
 *  uniformly).  The key is validated against the §4.2 rule.
 *
 *  ```typescript
 *  map_delete(make_map([['a', 1], ['b', 2]]), 'a').entries;  // [['b', 2]]
 *  map_delete(make_map([['a', 1]]), 'z').entries;            // [['a', 1]]
 *  ```
 *
 *  @param map - The source map.
 *  @param key - The key to remove.
 *
 *  @returns A new map without `key`.
 *
 *  @throws {ContainerKeyError} If `key` is not a non-`NaN` number or string.
 *
 */

function map_delete<V>(map: FslMap<V>, key: ContainerKey): FslMap<V> {
  const valid = require_container_key(key, 'key');
  return { kind: 'map', entries: map.entries.filter(([k]) => k !== valid) };
}


/*******
 *
 *  The keys of a map, in insertion order, as a plain array.
 *
 *  ```typescript
 *  map_keys(make_map([['a', 1], ['b', 2]]));  // ['a', 'b']
 *  ```
 *
 *  @param map - The map to read.
 *
 *  @returns A new array of the map's keys.
 *
 */

function map_keys<V>(map: FslMap<V>): ContainerKey[] {
  return map.entries.map(([k]) => k);
}


/*******
 *
 *  The values of a map, in insertion order, as a plain array.
 *
 *  ```typescript
 *  map_values(make_map([['a', 1], ['b', 2]]));  // [1, 2]
 *  ```
 *
 *  @param map - The map to read.
 *
 *  @returns A new array of the map's values.
 *
 */

function map_values<V>(map: FslMap<V>): V[] {
  return map.entries.map(([, v]) => v);
}


// ---------------------------------------------------------------------------
//  set  (set of K)
// ---------------------------------------------------------------------------


/*******
 *
 *  Constructs an {@link FslSet} from an iterable of members, dropping
 *  duplicates and preserving first-seen order.  Members are validated against
 *  the §4.2 rule (number or string).
 *
 *  ```typescript
 *  make_set([1, 2, 2, 3]).members;  // [1, 2, 3]
 *  make_set<never>([]);              // an empty set  (see overload via [])
 *  ```
 *
 *  @param members - Initial members; defaults to empty.
 *
 *  @returns A new set with distinct members.
 *
 *  @throws {ContainerKeyError} If any member is not a non-`NaN` number or string.
 *
 */

function make_set(members: Iterable<ContainerKey> = []): FslSet {

  let acc = { kind: 'set', members: [] } as FslSet;

  for (const member of members) {
    acc = set_add(acc, member);
  }

  return acc;

}


/*******
 *
 *  Number of members in a set.
 *
 *  ```typescript
 *  set_size(make_set([1, 2, 3]));  // 3
 *  ```
 *
 *  @param set - The set to measure.
 *
 *  @returns The member count.
 *
 */

function set_size(set: FslSet): number {
  return set.members.length;
}


/*******
 *
 *  Whether `member` is in the set.  Membership is by value (`===`); the
 *  member is validated against the §4.2 rule first.
 *
 *  ```typescript
 *  set_has(make_set([1, 2, 3]), 2);  // true
 *  set_has(make_set([1, 2, 3]), 9);  // false
 *  ```
 *
 *  @param set    - The set to query.
 *  @param member - The candidate member.
 *
 *  @returns `true` if `member` is present.
 *
 *  @throws {ContainerKeyError} If `member` is not a non-`NaN` number or string.
 *
 */

function set_has(set: FslSet, member: ContainerKey): boolean {
  const valid = require_container_key(member, 'member');
  return set.members.includes(valid);
}


/*******
 *
 *  Returns a new set with `member` added, leaving the original unchanged.
 *  Adding a member that is already present is a no-op that still returns a
 *  fresh, equal set.  The member is validated against the §4.2 rule.
 *
 *  ```typescript
 *  set_add(make_set([1, 2]), 3).members;  // [1, 2, 3]
 *  set_add(make_set([1, 2]), 2).members;  // [1, 2]   (already present)
 *  ```
 *
 *  @param set    - The source set.
 *  @param member - The member to add.
 *
 *  @returns A new set including `member`.
 *
 *  @throws {ContainerKeyError} If `member` is not a non-`NaN` number or string.
 *
 */

function set_add(set: FslSet, member: ContainerKey): FslSet {

  const valid = require_container_key(member, 'member');

  if (set.members.includes(valid)) {
    return { kind: 'set', members: set.members.slice() };
  }

  return { kind: 'set', members: [...set.members, valid] };

}


/*******
 *
 *  Returns a new set with `member` removed, leaving the original unchanged.
 *  Removing an absent member is a no-op that returns a fresh, equal set.  The
 *  member is validated against the §4.2 rule.
 *
 *  ```typescript
 *  set_remove(make_set([1, 2, 3]), 2).members;  // [1, 3]
 *  set_remove(make_set([1, 2, 3]), 9).members;  // [1, 2, 3]
 *  ```
 *
 *  @param set    - The source set.
 *  @param member - The member to remove.
 *
 *  @returns A new set without `member`.
 *
 *  @throws {ContainerKeyError} If `member` is not a non-`NaN` number or string.
 *
 */

function set_remove(set: FslSet, member: ContainerKey): FslSet {
  const valid = require_container_key(member, 'member');
  return { kind: 'set', members: set.members.filter(m => m !== valid) };
}


/*******
 *
 *  The set union: a new set containing every member of either `a` or `b`, in
 *  the order they are first seen (members of `a`, then any of `b` not already
 *  present).
 *
 *  ```typescript
 *  set_union(make_set([1, 2]), make_set([2, 3])).members;  // [1, 2, 3]
 *  ```
 *
 *  @param a - First set.
 *  @param b - Second set.
 *
 *  @returns A new set, the union of `a` and `b`.
 *
 */

function set_union(a: FslSet, b: FslSet): FslSet {
  return b.members.reduce((acc, m) => set_add(acc, m), make_set(a.members));
}


/*******
 *
 *  The set intersection: a new set of the members present in **both** `a` and
 *  `b`, in `a`'s order.
 *
 *  ```typescript
 *  set_intersection(make_set([1, 2, 3]), make_set([2, 3, 4])).members;  // [2, 3]
 *  ```
 *
 *  @param a - First set.
 *  @param b - Second set.
 *
 *  @returns A new set, the intersection of `a` and `b`.
 *
 */

function set_intersection(a: FslSet, b: FslSet): FslSet {
  return { kind: 'set', members: a.members.filter(m => b.members.includes(m)) };
}


/*******
 *
 *  The set difference `a \ b`: a new set of the members of `a` that are not in
 *  `b`, in `a`'s order.
 *
 *  ```typescript
 *  set_difference(make_set([1, 2, 3]), make_set([2])).members;  // [1, 3]
 *  ```
 *
 *  @param a - The set to subtract from.
 *  @param b - The set of members to remove.
 *
 *  @returns A new set, `a` with every member of `b` removed.
 *
 */

function set_difference(a: FslSet, b: FslSet): FslSet {
  return { kind: 'set', members: a.members.filter(m => !b.members.includes(m)) };
}


// ---------------------------------------------------------------------------
//  cross-cutting:  equality + snapshot / restore
// ---------------------------------------------------------------------------


/*******
 *
 *  Structural value-equality for two containers (§6).  Two containers are
 *  equal exactly when their {@link deep_equal} comparison holds — same kind,
 *  same contents (recursively).  A list and a set with the same surface
 *  contents are **not** equal, because their `kind` discriminants differ.
 *
 *  ```typescript
 *  containers_equal(make_set([1, 2]), make_set([1, 2]));    // true
 *  containers_equal(make_list([1, 2]), make_set([1, 2]));   // false
 *  containers_equal(make_map([['a', 1]]), make_map([['a', 1]]));  // true
 *  ```
 *
 *  @param a - First container.
 *  @param b - Second container.
 *
 *  @returns `true` if `a` and `b` are structurally equal.
 *
 *  @see deep_equal
 *
 */

function containers_equal(a: FslContainer, b: FslContainer): boolean {
  return deep_equal(a, b);
}


/*******
 *
 *  Captures a defensive deep copy of a container for the val-record rollback
 *  snapshot of §5.  The returned value is structurally independent of `value`,
 *  so later mutation of any mutable value the container transitively holds can
 *  never disturb the captured configuration.
 *
 *  ```typescript
 *  const live = make_list([{ n: 1 }]);
 *  const snap = snapshot(live);
 *  containers_equal(snap, live);  // true — equal, but independent
 *  ```
 *
 *  @param value - The container to snapshot.
 *
 *  @returns A deep, independent copy of `value`.
 *
 *  @see restore
 *  @see deep_clone
 *
 */

function snapshot<C extends FslContainer>(value: C): C {
  return deep_clone(value);
}


/*******
 *
 *  Restores a container from a snapshot taken by {@link snapshot}, again as a
 *  defensive deep copy so that the stored snapshot stays pristine and can be
 *  restored from more than once.
 *
 *  ```typescript
 *  const snap     = snapshot(make_map([['a', 1]]));
 *  const restored = restore(snap);
 *  containers_equal(restored, snap);  // true
 *  ```
 *
 *  @param value - A snapshot previously produced by {@link snapshot}.
 *
 *  @returns A deep, independent copy of `value`.
 *
 *  @see snapshot
 *
 */

function restore<C extends FslContainer>(value: C): C {
  return deep_clone(value);
}


export {

  // predicates / helpers
  is_container_key,
  deep_equal,
  deep_clone,

  // list
  make_list, list_size, list_get, list_set,
  list_push, list_pop, list_includes,

  // map
  make_map, map_size, map_has, map_get, map_get_or,
  map_set, map_delete, map_keys, map_values,

  // set
  make_set, set_size, set_has, set_add, set_remove,
  set_union, set_intersection, set_difference,

  // cross-cutting
  containers_equal, snapshot, restore,

  // errors
  ContainerKeyError, ContainerRangeError

};

export type {
  ContainerKey,
  ContainerKind,
  FslList,
  FslMap,
  FslSet,
  FslContainer
};
