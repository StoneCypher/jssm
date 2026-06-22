/*******
 *
 *  Self-contained algebraic-data-type (ADT) runtime for FSL v6.  Implements the
 *  value layer of megaspec §4.3 (sum types) and §4.4 (variants, nullability,
 *  aliases, function values) with no coupling to the parser, compiler, or
 *  machine runtime — every entity here is a pure function over plain data.
 *
 *  Five families live here:
 *
 *    - **Sum / variant constructors** — a tagged value `{ adt: tag, fields }`
 *      with payload-less and payloaded forms, plus tag/field inspection and a
 *      total `match` dispatcher.
 *    - **`option<T>`** — the closed variant `some(T) | none` of §4.4, with the
 *      usual `map` / `unwrap_or` recovery helpers.
 *    - **Nullable `T?`** — declared-only nullability: `null` and `undefined`
 *      are the inhabitants, and the helpers convert between the nullable and
 *      `option` worlds.
 *    - **Type aliases** — a tiny resolvable alias environment (§4.4), so a name
 *      such as `Celsius` resolves through to its underlying descriptor.
 *    - **Defunctionalized function values** — the `(tag, captures)` pair of
 *      §4.4: the body is a stable content tag, the captures are by-value
 *      acyclic data.  These **serialize, hash, and compare** like every other
 *      ADT, with **intensional** equality (same tag + equal captures), feeding
 *      the §15 snapshot / hash machinery.
 *
 *  Everything is total and pure: constructors never mutate their arguments,
 *  comparisons never throw, and the only deliberate refusals are the documented
 *  guards (cyclic captures, malformed tags).
 *
 */
/*******
 *
 *  Data shared across this module.  A defunctionalized capture must be acyclic
 *  by-value data, so the value vocabulary is JSON-shaped: scalars, arrays, and
 *  plain records — plus nested ADT and function values, which are themselves
 *  plain records.  This alias names that vocabulary without leaning on the
 *  audit-flagged loose escape type.
 *
 */
declare type FslAcyclic = null | undefined | boolean | number | string | FslAcyclic[] | {
    [key: string]: FslAcyclic;
};
/*******
 *
 *  A constructed sum-type (variant) value.  `adt` is the constructor tag (for
 *  example `circle`, `some`, or `leaf`); `fields` carries the named payload of
 *  that constructor and is the empty record for a payload-less constructor.
 *
 *  This is the §4.3 representation: a tag plus a typed product of fields, the
 *  sum-of-products that pattern matching (§7) destructures.
 *
 *  ```typescript
 *  // type Shape = circle(radius) | rect(w, h) | point;
 *  const c: AdtValue = { adt: 'circle', fields: { radius: 3 } };
 *  ```
 *
 */
declare type AdtValue = {
    readonly adt: string;
    readonly fields: Readonly<Record<string, FslAcyclic>>;
};
/*******
 *
 *  Constructs a sum-type value (§4.3) from a constructor tag and an optional
 *  field payload.  Payload-less constructors omit the second argument; the
 *  resulting `fields` is then the empty record.  The fields are shallow-frozen
 *  and copied, so the returned value is a fresh, immutable record that never
 *  aliases the caller's payload object.
 *
 *  ```typescript
 *  variant('point');                       // { adt: 'point', fields: {} }
 *  variant('circle', { radius: 3 });       // { adt: 'circle', fields: { radius: 3 } }
 *  variant('rect',   { w: 2, h: 5 });      // { adt: 'rect',   fields: { w: 2, h: 5 } }
 *  ```
 *
 *  @param tag    - The constructor name; must be a non-empty string.
 *  @param fields - The named payload for this constructor.  Defaults to the
 *                  empty record for payload-less constructors.
 *
 *  @returns A frozen {@link AdtValue} carrying the tag and a frozen copy of the
 *           fields.
 *
 *  @throws {JssmError} If `tag` is not a non-empty string.
 *
 *  @see variant_tag
 *  @see variant_field
 *  @see match
 *
 */
declare function variant(tag: string, fields?: Record<string, FslAcyclic>): AdtValue;
/*******
 *
 *  Predicate identifying a constructed sum-type value (§4.3).  Returns `true`
 *  only for a record carrying a string `adt` tag and a `fields` record, so it
 *  safely narrows arbitrary acyclic data before destructuring.
 *
 *  ```typescript
 *  is_variant( variant('point') );        // true
 *  is_variant( { radius: 3 } );           // false  (no adt tag)
 *  is_variant( 7 );                       // false
 *  is_variant( null );                    // false
 *  ```
 *
 *  @param value - The candidate value to test.
 *
 *  @returns `true` when `value` is a well-formed {@link AdtValue}.
 *
 *  @see variant
 *
 */
declare function is_variant(value: FslAcyclic): value is AdtValue;
/*******
 *
 *  Reads the constructor tag of a sum-type value (§4.3).  This is the
 *  discriminant a `case` expression switches on.
 *
 *  ```typescript
 *  variant_tag( variant('circle', { radius: 3 }) );   // 'circle'
 *  ```
 *
 *  @param value - The {@link AdtValue} to inspect.
 *
 *  @returns The constructor tag string.
 *
 *  @throws {JssmError} If `value` is not a well-formed variant.
 *
 *  @see variant
 *
 */
declare function variant_tag(value: AdtValue): string;
/*******
 *
 *  Reads a single named field from a sum-type value's payload (§4.3).  Returns
 *  the field's value, or `undefined` when the constructor carries no such field
 *  — the lookup never throws on a missing field, matching the declared-optional
 *  posture of §4.4.
 *
 *  ```typescript
 *  const r = variant('rect', { w: 2, h: 5 });
 *  variant_field(r, 'w');     // 2
 *  variant_field(r, 'depth'); // undefined
 *  ```
 *
 *  @param value - The {@link AdtValue} to read from.
 *  @param field - The field name to look up.
 *
 *  @returns The field's value, or `undefined` if absent.
 *
 *  @throws {JssmError} If `value` is not a well-formed variant.
 *
 *  @see variant
 *
 */
declare function variant_field(value: AdtValue, field: string): FslAcyclic;
/*******
 *
 *  Total pattern-match dispatcher over a sum-type value (§4.3 / §7).  Looks up
 *  the value's constructor tag in `arms` and applies the matching arm to the
 *  field payload; when no arm matches, applies the required-on-that-path
 *  `otherwise` fallback (the `else ->` of §7).  Because a fallback is demanded
 *  whenever the tag is unhandled, dispatch is total: it never falls through to
 *  an undefined result.
 *
 *  ```typescript
 *  const area = (s) => match(s, {
 *    circle : f => 3.14159 * f.radius * f.radius,
 *    rect   : f => f.w * f.h
 *  }, () => 0);
 *
 *  area( variant('circle', { radius: 2 }) );   // ~12.566
 *  area( variant('rect',   { w: 3, h: 4 }) );  // 12
 *  area( variant('point') );                   // 0  (otherwise)
 *  ```
 *
 *  @param value     - The {@link AdtValue} to dispatch on.
 *  @param arms      - A record mapping constructor tags to handlers; each
 *                     handler receives the matched value's field payload.
 *  @param otherwise - Fallback applied to the whole value when no arm matches.
 *
 *  @returns The result of the matched arm, or of `otherwise`.
 *
 *  @throws {JssmError} If `value` is not a well-formed variant.
 *
 *  @see variant
 *  @see variant_tag
 *
 */
declare function match<R>(value: AdtValue, arms: Record<string, (fields: Readonly<Record<string, FslAcyclic>>) => R>, otherwise: (value: AdtValue) => R): R;
/*******
 *
 *  Constructs the `some(value)` inhabitant of `option<T>` (§4.4): a present
 *  optional carrying a payload.  Represented as the variant `some` with a
 *  single `value` field, so it composes with {@link match} and the rest of the
 *  ADT surface.
 *
 *  ```typescript
 *  some(3);          // { adt: 'some', fields: { value: 3 } }
 *  is_some( some(3) );   // true
 *  ```
 *
 *  @param value - The payload to wrap.
 *
 *  @returns A frozen `some` {@link AdtValue}.
 *
 *  @see none
 *  @see is_some
 *  @see option_map
 *
 */
declare function some(value: FslAcyclic): AdtValue;
/*******
 *
 *  The singleton `none` inhabitant of `option<T>` (§4.4): an absent optional.
 *  Represented as the payload-less variant `none`.  Frozen, so it is safe to
 *  share as a constant.
 *
 *  ```typescript
 *  none;             // { adt: 'none', fields: {} }
 *  is_none( none );  // true
 *  ```
 *
 *  @see some
 *  @see is_none
 *
 */
declare const none: AdtValue;
/*******
 *
 *  Predicate testing whether an `option` value is `some` (§4.4).
 *
 *  ```typescript
 *  is_some( some(3) );   // true
 *  is_some( none );      // false
 *  ```
 *
 *  @param value - The {@link AdtValue} to test.
 *
 *  @returns `true` when `value` is a `some` variant.
 *
 *  @see some
 *  @see is_none
 *
 */
declare function is_some(value: AdtValue): boolean;
/*******
 *
 *  Predicate testing whether an `option` value is `none` (§4.4).
 *
 *  ```typescript
 *  is_none( none );      // true
 *  is_none( some(3) );   // false
 *  ```
 *
 *  @param value - The {@link AdtValue} to test.
 *
 *  @returns `true` when `value` is a `none` variant.
 *
 *  @see none
 *  @see is_some
 *
 */
declare function is_none(value: AdtValue): boolean;
/*******
 *
 *  Recovers a plain value from an `option`, supplying a fallback for `none`
 *  (§4.4).  This is the totalizing escape from the partial `unwrap`: it never
 *  throws.
 *
 *  ```typescript
 *  option_unwrap_or( some(3), 0 );   // 3
 *  option_unwrap_or( none,    0 );   // 0
 *  ```
 *
 *  @param value    - The {@link AdtValue} option to read.
 *  @param fallback - The value returned when `value` is `none`.
 *
 *  @returns The wrapped payload when `some`, otherwise `fallback`.
 *
 *  @see some
 *  @see none
 *
 */
declare function option_unwrap_or(value: AdtValue, fallback: FslAcyclic): FslAcyclic;
/*******
 *
 *  Maps a function over the payload of an `option`, leaving `none` untouched
 *  (§4.4).  The functorial map: `some(x)` becomes `some(f(x))`, `none` stays
 *  `none`.
 *
 *  ```typescript
 *  option_map( some(3), x => x + 1 );   // some(4)
 *  option_map( none,    x => x + 1 );   // none
 *  ```
 *
 *  @param value - The {@link AdtValue} option to map.
 *  @param fn    - The transform applied to the payload when present.
 *
 *  @returns `some(fn(payload))` when `some`, otherwise the original `none`.
 *
 *  @see some
 *  @see none
 *  @see option_unwrap_or
 *
 */
declare function option_map(value: AdtValue, fn: (inner: FslAcyclic) => FslAcyclic): AdtValue;
/*******
 *
 *  Bridges a declared-nullable `T?` value (§4.4) into the `option` world.
 *  `null` and `undefined` — the declared inhabitants of nullability — become
 *  `none`; every other value becomes `some(value)`.
 *
 *  ```typescript
 *  option_of_nullable(3);          // some(3)
 *  option_of_nullable(null);       // none
 *  option_of_nullable(undefined);  // none
 *  option_of_nullable(0);          // some(0)   (zero is present, not absent)
 *  ```
 *
 *  @param value - A nullable value to lift.
 *
 *  @returns `none` for `null`/`undefined`, otherwise `some(value)`.
 *
 *  @see nullable_of_option
 *  @see some
 *  @see none
 *
 */
declare function option_of_nullable(value: FslAcyclic): AdtValue;
/*******
 *
 *  Projects an `option` (§4.4) back into a declared-nullable `T?` value: `some`
 *  yields its payload, `none` yields `null`.  The inverse direction of
 *  {@link option_of_nullable}, for handing values back to a nullable-typed slot.
 *
 *  ```typescript
 *  nullable_of_option( some(3) );   // 3
 *  nullable_of_option( none );      // null
 *  ```
 *
 *  @param value - The {@link AdtValue} option to project.
 *
 *  @returns The payload when `some`, otherwise `null`.
 *
 *  @see option_of_nullable
 *
 */
declare function nullable_of_option(value: AdtValue): FslAcyclic;
/*******
 *
 *  Admits or rejects a value against a **declared-nullable** type `T?` (§4.4).
 *  FSL values are non-null by default, so `null` and `undefined` pass only when
 *  the slot was declared with the `?` suffix.  This makes "no `null` in
 *  arithmetic" a single boundary check rather than a test threaded through every
 *  operator: the value flows through unchanged when admissible, and is refused
 *  otherwise.
 *
 *  ```typescript
 *  nullable_check(7,         true);   // 7          (any value is fine)
 *  nullable_check(null,      true);   // null       (declared nullable, allowed)
 *  nullable_check(undefined, true);   // undefined  (declared nullable, allowed)
 *  nullable_check(0,         false);  // 0          (a real value, not absent)
 *  ```
 *
 *  @param value    - The value to admit or reject.
 *  @param nullable - Whether the declared type carried the `?` suffix.
 *
 *  @returns `value` unchanged when admissible.
 *
 *  @throws {JssmError} If `value` is `null`/`undefined` but the slot is not
 *                      declared nullable.
 *
 *  @see option_of_nullable
 *  @see nullable_of_option
 *
 */
declare function nullable_check(value: FslAcyclic, nullable: boolean): FslAcyclic;
/*******
 *
 *  A type-alias environment (§4.4): an immutable map from an alias name to the
 *  descriptor it stands for.  A descriptor is opaque acyclic data — typically a
 *  type descriptor record such as `{ base: 'int', lo: -273, hi: 1000 }` for
 *  `type Celsius = int -273..1000;` — and an alias may itself resolve to another
 *  alias name (a string), which {@link resolve_alias} chases transitively.
 *
 */
declare type AliasEnv = Readonly<Record<string, FslAcyclic>>;
/*******
 *
 *  Builds a {@link AliasEnv} from a plain record of alias definitions (§4.4),
 *  rejecting every alias whose definition points at a name that does not exist
 *  in the same batch — so a finished environment never contains a dangling
 *  alias.
 *  Self-reference and cycles among string definitions are likewise rejected,
 *  keeping resolution total.
 *
 *  ```typescript
 *  // type Name = string;  type Handle = Name;
 *  make_alias_env({
 *    Name    : { base: 'string' },
 *    Handle  : 'Name'
 *  });
 *  ```
 *
 *  @param defs - A record mapping alias names to descriptors or to the name of
 *                another alias in the same record.
 *
 *  @returns A frozen {@link AliasEnv}.
 *
 *  @throws {JssmError} If a string-valued alias names a missing alias, or if the
 *                      string aliases form a cycle.
 *
 *  @see resolve_alias
 *
 */
declare function make_alias_env(defs: Record<string, FslAcyclic>): AliasEnv;
/*******
 *
 *  Resolves an alias name through a {@link AliasEnv} to its underlying
 *  descriptor (§4.4), following chains of string aliases transitively.  A name
 *  absent from the environment resolves to itself (it is treated as a primitive
 *  type name, not an alias), so resolution is total and never throws.
 *
 *  ```typescript
 *  const env = make_alias_env({
 *    Celsius : { base: 'int', lo: -273, hi: 1000 },
 *    Temp    : 'Celsius'
 *  });
 *
 *  resolve_alias(env, 'Temp');     // { base: 'int', lo: -273, hi: 1000 }
 *  resolve_alias(env, 'Celsius');  // { base: 'int', lo: -273, hi: 1000 }
 *  resolve_alias(env, 'boolean');  // 'boolean'  (not an alias; itself)
 *  ```
 *
 *  @param env  - The alias environment to resolve against.
 *  @param name - The alias name to resolve.
 *
 *  @returns The resolved descriptor, or `name` itself when it is not an alias.
 *
 *  @see make_alias_env
 *
 */
declare function resolve_alias(env: AliasEnv, name: string): FslAcyclic;
/*******
 *
 *  A defunctionalized function value (§4.4): the `(tag, captures)` pair that
 *  represents a first-class lambda as plain data.  `tag` is a stable content
 *  identifier for the lambda body (a content-hash of the normalized lambda AST,
 *  or an index into the program's finite lambda table).  `captures` are the
 *  by-value, acyclic data the lambda closed over.  Because both halves are
 *  plain data, a function value **serializes, hashes, and crosses hosts** like
 *  every other ADT (§15), and equality is **intensional**: two function values
 *  are equal exactly when their tags match and their captures are deeply equal.
 *
 *  ```typescript
 *  // lambda  (x) => x + base   captured at base = 10
 *  const f: FnValue = { fn: 'lambda#a1b2', captures: { base: 10 } };
 *  ```
 *
 */
declare type FnValue = {
    readonly fn: string;
    readonly captures: Readonly<Record<string, FslAcyclic>>;
};
/*******
 *
 *  Constructs a defunctionalized function value (§4.4) from a body tag and an
 *  optional capture record.  The captures are validated to be **acyclic** (a
 *  capture graph with a cycle would defeat by-value serialization and break the
 *  §13 totality guarantee) and then deep-copied and frozen, so the returned
 *  value never aliases the caller's capture object.
 *
 *  ```typescript
 *  fn_value('lambda#id');                       // no captures
 *  fn_value('lambda#add', { base: 10 });        // captures base = 10
 *  ```
 *
 *  @param tag      - The stable content tag for the lambda body; a non-empty
 *                    string.
 *  @param captures - The by-value, acyclic captured environment.  Defaults to
 *                    the empty record.
 *
 *  @returns A frozen {@link FnValue}.
 *
 *  @throws {JssmError} If `tag` is not a non-empty string, or if `captures`
 *                      contains a reference cycle.
 *
 *  @see fn_equal
 *  @see fn_hash
 *  @see snapshot_value
 *
 */
declare function fn_value(tag: string, captures?: Record<string, FslAcyclic>): FnValue;
/*******
 *
 *  Predicate identifying a defunctionalized function value (§4.4).  Returns
 *  `true` only for a record carrying a string `fn` tag and a `captures` record.
 *
 *  ```typescript
 *  is_fn_value( fn_value('lambda#id') );   // true
 *  is_fn_value( variant('point') );        // false
 *  is_fn_value( 7 );                       // false
 *  ```
 *
 *  @param value - The candidate value to test.
 *
 *  @returns `true` when `value` is a well-formed {@link FnValue}.
 *
 *  @see fn_value
 *
 */
declare function is_fn_value(value: FslAcyclic): value is FnValue;
/*******
 *
 *  Intensional equality for function values (§4.4): two {@link FnValue}s are
 *  equal exactly when their body tags are identical **and** their captures are
 *  deeply equal.  This is deliberately *intensional* — extensional equality of
 *  lambdas is undecidable, so two function values that compute the same result
 *  by different bodies compare **unequal**.
 *
 *  ```typescript
 *  const a = fn_value('lambda#add', { base: 10 });
 *  const b = fn_value('lambda#add', { base: 10 });
 *  const c = fn_value('lambda#add', { base: 11 });
 *  const d = fn_value('lambda#sub', { base: 10 });
 *
 *  fn_equal(a, b);   // true   (same tag, equal captures)
 *  fn_equal(a, c);   // false  (captures differ)
 *  fn_equal(a, d);   // false  (tags differ)
 *  ```
 *
 *  @param a - The first function value.
 *  @param b - The second function value.
 *
 *  @returns `true` when the tags match and the captures are deeply equal.
 *
 *  @see fn_value
 *  @see deep_equal
 *
 */
declare function fn_equal(a: FnValue, b: FnValue): boolean;
/*******
 *
 *  Produces a stable string hash for a defunctionalized function value (§15),
 *  combining the body tag with a canonical serialization of the captures.  Two
 *  function values that are {@link fn_equal} produce the same hash; the hash is
 *  the same across hosts because it is built from canonical JSON (sorted keys),
 *  not from object identity or insertion order.
 *
 *  ```typescript
 *  const a = fn_value('lambda#add', { base: 10, mul: 2 });
 *  const b = fn_value('lambda#add', { mul: 2, base: 10 });   // keys reordered
 *
 *  fn_hash(a) === fn_hash(b);   // true  (canonical, order-independent)
 *  ```
 *
 *  @param value - The {@link FnValue} to hash.
 *
 *  @returns A stable hash string of the form `fn:<tag>:<canonical-captures>`.
 *
 *  @see fn_value
 *  @see fn_equal
 *  @see canonical_json
 *
 */
declare function fn_hash(value: FnValue): string;
/*******
 *
 *  Derives a stable `fn` **tag** from the normalized source of a lambda body
 *  (§4.4: "a content-hash of the normalized lambda AST, or an index into the
 *  program's finite lambda table").  This is the value you hand to
 *  {@link fn_value} as its body tag: two textually-identical normalized bodies
 *  produce the same tag, differing bodies (with overwhelming probability) do
 *  not — the foundation of the **intensional** function-value equality of
 *  {@link fn_equal}.  The digest is the pinned, host-independent §15 content
 *  hash, never a JS object identity, so a function value built from it
 *  serializes and compares the same across hosts.
 *
 *  ```typescript
 *  lambda_tag('(x) => x + 1');                       // e.g. '084fa3b1'
 *  lambda_tag('(x) => x + 1') === lambda_tag('(x) => x + 1');   // true
 *  fn_value(lambda_tag('(x) => x + n'), { n: 5 });   // a defunctionalized lambda
 *  ```
 *
 *  @param normalized_source - The lambda body in canonical normalized form.
 *
 *  @returns An eight-hex-digit content-hash tag.
 *
 *  @throws {JssmError} If `normalized_source` is not a string.
 *
 *  @see fn_value
 *  @see fn_equal
 *  @see fnv1a_hex
 *
 */
declare function lambda_tag(normalized_source: string): string;
/*******
 *
 *  Canonical serialization for every acyclic FSL value (§15): a deterministic
 *  JSON string with **sorted object keys**, so that two structurally-equal
 *  values always serialize to byte-identical text regardless of key insertion
 *  order.  This is the stable-key-order serialization the snapshot / hash model
 *  depends on for cross-host repro equality.  `undefined` — distinct from
 *  `null` in FSL (§4.1) — is preserved as the sentinel string `"undefined"` so
 *  the two never collapse together.
 *
 *  ```typescript
 *  canonical_json({ b: 1, a: 2 });   // '{"a":2,"b":1}'
 *  canonical_json([1, 2, 3]);        // '[1,2,3]'
 *  canonical_json(null);             // 'null'
 *  canonical_json(undefined);        // '"undefined"'
 *  canonical_json(NaN);              // 'nan'
 *  canonical_json(-0);               // '0'
 *  ```
 *
 *  @param value - The acyclic value to serialize.
 *
 *  @returns A canonical JSON string with sorted keys.
 *
 *  @see snapshot_value
 *  @see fn_hash
 *
 */
declare function canonical_json(value: FslAcyclic): string;
/*******
 *
 *  Produces the §15 snapshot of every acyclic FSL value — including ADT and
 *  function values — as its canonical serialization.  Because function values
 *  are already plain `(tag, captures)` data, they snapshot exactly like every
 *  other ADT, with no special case: the whole value tree, lambdas and all,
 *  reduces to one stable string suitable for the serialized machine state and
 *  for cross-host repro equality.
 *
 *  ```typescript
 *  snapshot_value( some( fn_value('lambda#id', { n: 1 }) ) );
 *  // '{"adt":"some","fields":{"value":{"captures":{"n":1},"fn":"lambda#id"}}}'
 *  ```
 *
 *  @param value - The value to snapshot.
 *
 *  @returns A canonical string snapshot.
 *
 *  @see canonical_json
 *  @see hash_value
 *
 */
declare function snapshot_value(value: FslAcyclic): string;
/*******
 *
 *  Produces a stable content hash for every acyclic FSL value (§15), derived from
 *  its {@link snapshot_value} via a fixed, host-independent string mix.  Two
 *  values that are {@link deep_equal} hash identically; the algorithm is pinned
 *  here (an FNV-1a-style 32-bit mix rendered as zero-padded hex) so the result
 *  is reproducible across every host, as §15 requires of observed state.
 *
 *  ```typescript
 *  hash_value( some(3) ) === hash_value( some(3) );   // true
 *  hash_value( some(3) ) === hash_value( none );      // false
 *  ```
 *
 *  @param value - The value to hash.
 *
 *  @returns A stable 8-character hex hash string.
 *
 *  @see snapshot_value
 *  @see deep_equal
 *
 */
declare function hash_value(value: FslAcyclic): string;
/*******
 *
 *  Structural deep equality for acyclic FSL values (§6 "structural deep
 *  equality for containers/ADTs").  Scalars compare by value (with `null` and
 *  `undefined` kept distinct per §4.1); arrays compare element-wise; records
 *  compare by the same key set and equal values.  This underlies both ADT and
 *  function-value equality.
 *
 *  ```typescript
 *  deep_equal( { a: [1, 2] }, { a: [1, 2] } );   // true
 *  deep_equal( [1, 2],        [1, 2, 3] );        // false
 *  deep_equal( null,          undefined );        // false  (distinct in FSL)
 *  deep_equal( NaN,           NaN );              // true   (SameValueZero)
 *  deep_equal( variant('point'), variant('point') ); // true
 *  ```
 *
 *  @param a - The first value.
 *  @param b - The second value.
 *
 *  @returns `true` when the two values are structurally deeply equal.
 *
 *  @see fn_equal
 *
 */
declare function deep_equal(a: FslAcyclic, b: FslAcyclic): boolean;
/*******
 *
 *  Validates that a value is **acyclic** — that no object or array reaches
 *  itself through its own slots (§4.4 / §13: captures are "by-value acyclic
 *  data").  A cycle would make by-value serialization non-terminating and would
 *  break the totality guarantee, so it is refused at construction time rather
 *  than discovered later in a hash or snapshot.  Throws on the first cycle
 *  found; returns silently when the value is fully acyclic.
 *
 *  ```typescript
 *  assert_acyclic({ a: 1, b: [2, 3] });      // ok, returns undefined
 *
 *  const loop: Record<string, unknown> = {};
 *  loop.self = loop;
 *  assert_acyclic(loop);                     // throws JssmError
 *  ```
 *
 *  @param value - The value to check for reference cycles.
 *
 *  @throws {JssmError} If `value` reaches itself through a slot.
 *
 *  @see fn_value
 *
 */
declare function assert_acyclic(value: FslAcyclic): void;
/*******
 *
 *  Deep-copies an acyclic value and freezes every level of the result (§13:
 *  captured environments are immutable by-value data).  Scalars pass through;
 *  arrays and records are reconstructed fresh and frozen, so the copy shares no
 *  mutable structure with the original.  The caller must pre-validate acyclicity
 *  (see {@link assert_acyclic}); this helper assumes a finite tree.
 *
 *  ```typescript
 *  const src = { a: [1, 2], b: { c: 3 } };
 *  const cp  = deep_freeze_copy(src);
 *  cp === src;          // false (fresh)
 *  Object.isFrozen(cp); // true
 *  ```
 *
 *  @param value - The acyclic value to copy and freeze.
 *
 *  @returns A frozen deep copy of `value`.
 *
 *  @see fn_value
 *  @see assert_acyclic
 *
 */
declare function deep_freeze_copy(value: FslAcyclic): FslAcyclic;
export { FslAcyclic, AdtValue, variant, is_variant, variant_tag, variant_field, match, some, none, is_some, is_none, option_unwrap_or, option_map, option_of_nullable, nullable_of_option, nullable_check, AliasEnv, make_alias_env, resolve_alias, FnValue, fn_value, is_fn_value, fn_equal, fn_hash, lambda_tag, canonical_json, snapshot_value, hash_value, deep_equal, assert_acyclic, deep_freeze_copy };
