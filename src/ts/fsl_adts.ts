
import { JssmError } from './jssm_error';





/*******
 *
 *  FSL algebraic data types — the value-level runtime for §4.3 (sum / variant
 *  types) and §4.4 (option, declared nullability `T?`, type aliases, and the
 *  **defunctionalized** representation of function values), as specified in the
 *  FSL megaspec.
 *
 *  Everything here is **self-contained, pure, and total**: each function
 *  depends only on its arguments, has no observable side effects, and returns
 *  the same output for the same input.  The Phase-2 expression language lowers
 *  FSL `type … = … | …` declarations, `option<T>`, `T?`, aliases, and
 *  function literals onto these representations; nothing in this module is
 *  coupled to the parser or the machine runtime.
 *
 *  Three design commitments, all from the spec:
 *
 *    - **Sums are tagged products.**  A variant value is `{ tag, values }`:
 *      a discriminant string plus the (acyclic, by-value) payload tuple.  This
 *      is the shape pattern-matching (§7) destructures and the shape that
 *      serializes / hashes uniformly (§15).
 *    - **Functions defunctionalize.**  A function *value* is **not** a JS
 *      closure but `(lambda-id, captures)` — a stable content-hash *tag* over
 *      the normalized lambda body plus its by-value captured data — so it
 *      "serializes, hashes, and crosses hosts like any ADT" (§4.4).  Equality
 *      is **intensional**: same tag and equal captures, never extensional.
 *    - **Canonical serialization (§15).**  {@link adt_canonical} renders any of
 *      these values with **stable key order**, so two structurally-equal values
 *      always produce byte-identical output — the precondition for cross-host
 *      snapshot equality and content-hashing.
 *
 *  @see adt_variant   - construct a sum value
 *  @see option_some   - construct `some(T)`
 *  @see adt_function  - construct a defunctionalized function value
 *  @see adt_canonical - canonical (stable-key-order) serialization
 *  @see adt_equal     - structural / intensional deep equality
 *
 */





// ---------------------------------------------------------------------------
//  §4.3  Sum / variant values
// ---------------------------------------------------------------------------

/*******
 *
 *  A constructed sum-type value (§4.3): a discriminant `tag` plus its payload
 *  `values`.  A payload-less constructor (e.g. `point`, `none`, a bare `leaf`)
 *  carries an empty `values` array.  Payloads are positional and acyclic,
 *  matching the by-value / tree discipline of §13.
 *
 */

type FslVariant = {
  readonly kind   : 'variant';
  readonly tag    : string;
  readonly values : ReadonlyArray<FslAdtValue>;
};


/*******
 *
 *  A defunctionalized function value (§4.4): a `lambda_id` content-hash tag
 *  standing in for the normalized lambda body, plus the by-value `captures`
 *  closed over.  Holds no JS closure — it *is* data — so it serializes,
 *  hashes, and crosses hosts like any other ADT value.
 *
 */

type FslFunction = {
  readonly kind     : 'function';
  readonly lambda_id : string;
  readonly captures : ReadonlyArray<FslAdtValue>;
};


/*******
 *
 *  The closed universe of values these ADT representations may contain.
 *  Scalars (`boolean`/`number`/`string`/`null`/`undefined`) are leaves;
 *  variants and functions are the two compound, tagged shapes.  Recursion
 *  through `values` / `captures` is what realizes recursive ADTs (rich-tier,
 *  §4.3) and higher-order captures (§5), and is required to stay acyclic.
 *
 */

type FslAdtValue =
  | boolean
  | number
  | string
  | null
  | undefined
  | FslVariant
  | FslFunction;


/*******
 *
 *  Constructs a sum / variant value (§4.3) from a constructor `tag` and its
 *  positional `values` payload.  The single primitive every other constructor
 *  here (option, the ADT examples) is built on top of.
 *
 *  ```typescript
 *  adt_variant('circle', [3.0]);          // { kind:'variant', tag:'circle', values:[3.0] }
 *  adt_variant('rect',   [4, 5]);         // a two-field product variant
 *  adt_variant('point');                  // payload-less; values defaults to []
 *  adt_variant('node',  [1, adt_variant('leaf'), adt_variant('leaf')]); // recursive
 *  ```
 *
 *  @param tag    - The constructor's discriminant; must be a non-empty string.
 *  @param values - The positional payload; defaults to the empty tuple.
 *
 *  @returns A frozen {@link FslVariant}.
 *
 *  @throws {JssmError} If `tag` is not a non-empty string.
 *
 */

function adt_variant(tag: string, values: ReadonlyArray<FslAdtValue> = []): FslVariant {

  if (typeof tag !== 'string' || tag.length === 0) {
    throw new JssmError(undefined, `adt_variant/2 requires a non-empty string tag; got ${typeof tag === 'string' ? '""' : String(tag)}`);
  }

  return Object.freeze({ kind: 'variant', tag, values: Object.freeze([...values]) });

}


/*******
 *
 *  Type guard recognizing a {@link FslVariant}.  Used by pattern-matching and
 *  by the canonical / equality machinery to discriminate compound values.
 *
 *  ```typescript
 *  is_variant(adt_variant('point'));  // true
 *  is_variant(7);                     // false
 *  is_variant(null);                  // false
 *  ```
 *
 *  @param v - Any candidate value.
 *
 *  @returns `true` iff `v` is a constructed variant value.
 *
 */

function is_variant(v: FslAdtValue): v is FslVariant {
  return typeof v === 'object' && v !== null && (v as FslVariant).kind === 'variant';
}


/*******
 *
 *  Reads the discriminant tag of a variant value — the scrutinee a `case`
 *  arm matches against (§7).
 *
 *  ```typescript
 *  variant_tag(adt_variant('circle', [3.0]));  // 'circle'
 *  ```
 *
 *  @param v - The variant whose tag is wanted.
 *
 *  @returns The constructor tag.
 *
 *  @throws {JssmError} If `v` is not a variant value.
 *
 */

function variant_tag(v: FslAdtValue): string {

  if (!is_variant(v)) {
    throw new JssmError(undefined, `variant_tag/1 requires a variant value; got ${describe(v)}`);
  }

  return v.tag;

}


/*******
 *
 *  Reads a single positional payload field of a variant by index — the
 *  destructuring a `case circle(r) -> …` arm performs (§7).
 *
 *  ```typescript
 *  variant_field(adt_variant('rect', [4, 5]), 0);  // 4
 *  variant_field(adt_variant('rect', [4, 5]), 1);  // 5
 *  ```
 *
 *  @param v     - The variant to read from.
 *  @param index - Zero-based field position.
 *
 *  @returns The payload value at `index`.
 *
 *  @throws {JssmError} If `v` is not a variant, or `index` is out of bounds.
 *
 */

function variant_field(v: FslAdtValue, index: number): FslAdtValue {

  if (!is_variant(v)) {
    throw new JssmError(undefined, `variant_field/2 requires a variant value; got ${describe(v)}`);
  }

  if (!Number.isInteger(index) || index < 0 || index >= v.values.length) {
    throw new JssmError(undefined, `variant_field/2 index ${index} out of bounds for tag "${v.tag}" with arity ${v.values.length}`);
  }

  return v.values[index];

}





// ---------------------------------------------------------------------------
//  §4.4  option<T> = some(T) | none
// ---------------------------------------------------------------------------

/*******
 *
 *  Constructs `some(value)` — the present arm of `option<T>` (§4.4).  A thin
 *  wrapper over {@link adt_variant} so options pattern-match, serialize, and
 *  hash with the same machinery as any other sum.
 *
 *  ```typescript
 *  option_some(7);                    // some(7)
 *  variant_tag(option_some(7));       // 'some'
 *  ```
 *
 *  @param value - The wrapped value.
 *
 *  @returns A `some` variant carrying `value`.
 *
 */

function option_some(value: FslAdtValue): FslVariant {
  return adt_variant('some', [value]);
}


/*******
 *
 *  The single `none` value — the absent arm of `option<T>` (§4.4).  A
 *  payload-less, frozen singleton; every `none` is structurally equal.
 *
 *  ```typescript
 *  variant_tag(option_none);  // 'none'
 *  ```
 *
 */

const option_none: FslVariant = adt_variant('none');


/*******
 *
 *  Predicate: is this option the `some` arm?  (§4.4)
 *
 *  ```typescript
 *  is_some(option_some(7));   // true
 *  is_some(option_none);      // false
 *  ```
 *
 *  @param v - The option to test.
 *
 *  @returns `true` iff `v` is a `some(...)` variant.
 *
 */

function is_some(v: FslAdtValue): boolean {
  return is_variant(v) && v.tag === 'some' && v.values.length === 1;
}


/*******
 *
 *  Predicate: is this option the `none` arm?  (§4.4)
 *
 *  ```typescript
 *  is_none(option_none);      // true
 *  is_none(option_some(7));   // false
 *  ```
 *
 *  @param v - The option to test.
 *
 *  @returns `true` iff `v` is the payload-less `none` variant.
 *
 */

function is_none(v: FslAdtValue): boolean {
  return is_variant(v) && v.tag === 'none' && v.values.length === 0;
}


/*******
 *
 *  Total unwrap of `option<T>` (§4.4 / §13 "option-returning variants recover
 *  completeness"): returns the wrapped value for `some`, or `fallback` for
 *  `none`.  Never throws on a well-formed option, so the *normal* read path
 *  stays total.
 *
 *  ```typescript
 *  option_get_or(option_some(7), 0);  // 7
 *  option_get_or(option_none,    0);  // 0
 *  ```
 *
 *  @param v        - The option to read.
 *  @param fallback - Value to return when `v` is `none`.
 *
 *  @returns The wrapped value, or `fallback`.
 *
 *  @throws {JssmError} If `v` is neither a `some(...)` nor a `none`.
 *
 */

function option_get_or(v: FslAdtValue, fallback: FslAdtValue): FslAdtValue {

  if (is_some(v)) {
    return (v as FslVariant).values[0];
  }

  if (is_none(v)) {
    return fallback;
  }

  throw new JssmError(undefined, `option_get_or/2 requires an option value (some|none); got ${describe(v)}`);

}





// ---------------------------------------------------------------------------
//  §4.4  Declared nullability  (T?)
// ---------------------------------------------------------------------------

/*******
 *
 *  Validates a value against a **declared-nullable** type `T?` (§4.4):
 *  non-null by default, so `null` / `undefined` are accepted **only** when the
 *  slot was declared nullable.  This makes "forbidding `null` in arithmetic"
 *  static — the check lives here, at the boundary, not in every operator.
 *
 *  ```typescript
 *  nullable_check(7,         true);   // 7        — value passes through
 *  nullable_check(null,      true);   // null     — declared nullable, allowed
 *  nullable_check(undefined, true);   // undefined
 *  nullable_check(7,         false);  // 7        — non-null value, fine
 *  ```
 *
 *  @param value    - The value to admit or reject.
 *  @param nullable - Whether the declared type carried the `?` suffix.
 *
 *  @returns `value` unchanged when admissible.
 *
 *  @throws {JssmError} If `value` is `null`/`undefined` but the slot is
 *                      **not** declared nullable.
 *
 */

function nullable_check(value: FslAdtValue, nullable: boolean): FslAdtValue {

  if ((value === null || value === undefined) && !nullable) {
    throw new JssmError(undefined, `nullable_check/2: ${value === null ? 'null' : 'undefined'} assigned to a non-nullable slot (declare it T? to allow)`);
  }

  return value;

}





// ---------------------------------------------------------------------------
//  §4.4  Type aliases
// ---------------------------------------------------------------------------

/*******
 *
 *  An alias environment (§4.4): a frozen map from alias name to the textual
 *  type expression it stands for (`Celsius -> "int -273..1000"`,
 *  `Name -> "string"`).  Aliases are transparent — pure renamings — so this is
 *  resolution scaffolding, not a distinct runtime type.
 *
 */

type AliasEnv = ReadonlyMap<string, string>;


/*******
 *
 *  Builds an immutable {@link AliasEnv} from `[name, type-expression]` pairs
 *  (§4.4 `type Celsius = int -273..1000;`).  Rejects duplicate alias names so
 *  a redeclaration is an error rather than a silent overwrite.
 *
 *  ```typescript
 *  const env = make_alias_env([['Celsius', 'int -273..1000'], ['Name', 'string']]);
 *  resolve_alias('Name', env);  // 'string'
 *  ```
 *
 *  @param pairs - The alias declarations, in source order.
 *
 *  @returns A frozen alias environment.
 *
 *  @throws {JssmError} On a duplicate alias name, or a non-string name.
 *
 */

function make_alias_env(pairs: ReadonlyArray<readonly [string, string]>): AliasEnv {

  const env = new Map<string, string>();

  for (const [name, expansion] of pairs) {

    if (typeof name !== 'string' || name.length === 0) {
      throw new JssmError(undefined, `make_alias_env/1 requires non-empty string alias names; got ${typeof name === 'string' ? '""' : String(name)}`);
    }

    if (env.has(name)) {
      throw new JssmError(undefined, `make_alias_env/1: duplicate type alias "${name}"`);
    }

    env.set(name, expansion);

  }

  return env;

}


/*******
 *
 *  Resolves a type alias to the type expression it names (§4.4).  Aliases are
 *  transparent renamings, so resolution is a single lookup — chains are not
 *  followed here (an alias whose expansion is itself an alias name resolves to
 *  that *name*, leaving further resolution to the caller).
 *
 *  ```typescript
 *  const env = make_alias_env([['Celsius', 'int -273..1000']]);
 *  resolve_alias('Celsius', env);  // 'int -273..1000'
 *  ```
 *
 *  @param name - The alias to resolve.
 *  @param env  - The alias environment to resolve against.
 *
 *  @returns The type expression `name` stands for.
 *
 *  @throws {JssmError} If `name` is not a declared alias.
 *
 */

function resolve_alias(name: string, env: AliasEnv): string {

  const expansion = env.get(name);

  if (expansion === undefined) {
    throw new JssmError(undefined, `resolve_alias/2: unknown type alias "${name}"`);
  }

  return expansion;

}





// ---------------------------------------------------------------------------
//  §4.4 / §15  Defunctionalized function values
// ---------------------------------------------------------------------------

/*******
 *
 *  Constructs a defunctionalized function value (§4.4): the `lambda_id`
 *  content-hash tag for a normalized lambda body, plus the by-value `captures`
 *  it closes over.  Holds no JS closure — it *is* serializable, hashable,
 *  cross-host data, exactly like a variant.
 *
 *  Pair with {@link lambda_tag} to derive the `lambda_id` from a normalized
 *  source form; callers may also pass a pre-computed table index / hash.
 *
 *  ```typescript
 *  adt_function(lambda_tag('(x) => x + 1'), []);     // a closed lambda value
 *  adt_function(lambda_tag('(x) => x + n'), [5]);    // captures n = 5 by value
 *  ```
 *
 *  @param lambda_id - The stable tag for this lambda's normalized body; a
 *                     non-empty string (a content-hash or table index).
 *  @param captures  - The by-value, acyclic captured data; defaults to none.
 *
 *  @returns A frozen {@link FslFunction}.
 *
 *  @throws {JssmError} If `lambda_id` is not a non-empty string.
 *
 */

function adt_function(lambda_id: string, captures: ReadonlyArray<FslAdtValue> = []): FslFunction {

  if (typeof lambda_id !== 'string' || lambda_id.length === 0) {
    throw new JssmError(undefined, `adt_function/2 requires a non-empty string lambda_id; got ${typeof lambda_id === 'string' ? '""' : String(lambda_id)}`);
  }

  return Object.freeze({ kind: 'function', lambda_id, captures: Object.freeze([...captures]) });

}


/*******
 *
 *  Type guard recognizing a {@link FslFunction}.
 *
 *  ```typescript
 *  is_function(adt_function('h', []));  // true
 *  is_function(adt_variant('point'));   // false
 *  ```
 *
 *  @param v - Any candidate value.
 *
 *  @returns `true` iff `v` is a defunctionalized function value.
 *
 */

function is_function(v: FslAdtValue): v is FslFunction {
  return typeof v === 'object' && v !== null && (v as FslFunction).kind === 'function';
}


/*******
 *
 *  Derives a stable `lambda_id` **tag** from the normalized source of a lambda
 *  body (§4.4: "content-hash of the normalized lambda AST / index into the
 *  program's finite lambda table").  Two textually-identical normalized bodies
 *  hash to the same tag; differing bodies (with overwhelming probability) do
 *  not — the foundation of **intensional** function equality.
 *
 *  The digest is a 32-bit FNV-1a over the source's UTF-16 code units, rendered
 *  as eight lowercase hex digits.  It is a *content* hash, deterministic and
 *  host-independent, never a JS object identity.
 *
 *  ```typescript
 *  lambda_tag('(x) => x + 1');               // e.g. '1a2b3c4d'
 *  lambda_tag('(x) => x + 1') ===
 *    lambda_tag('(x) => x + 1');             // true  — same body, same tag
 *  ```
 *
 *  @param normalized_source - The lambda body in canonical normalized form.
 *
 *  @returns An eight-hex-digit content-hash tag.
 *
 *  @throws {JssmError} If `normalized_source` is not a string.
 *
 */

function lambda_tag(normalized_source: string): string {

  if (typeof normalized_source !== 'string') {
    throw new JssmError(undefined, `lambda_tag/1 requires a string; got ${describe(normalized_source as FslAdtValue)}`);
  }

  return fnv1a_hex(normalized_source);

}





// ---------------------------------------------------------------------------
//  §15  Canonical serialization, content-hash, intensional/structural equality
// ---------------------------------------------------------------------------

/*******
 *
 *  Canonical (§15) serialization of any ADT value to a string with **stable,
 *  deterministic structure**, so two structurally-equal values always render
 *  byte-identically across hosts — the precondition for snapshot equality and
 *  content-hashing.
 *
 *  The grammar is unambiguous and total: scalars render with a type sigil
 *  (`b:` boolean, `n:` number, `s:` string, `null`, `undef`), variants as
 *  `V<tag>(field,…)`, and functions as `F<lambda_id>(capture,…)`.  Field /
 *  capture order is positional (already canonical); there are no free-floating
 *  object keys to sort, so order is structural, not incidental.
 *
 *  ```typescript
 *  adt_canonical(adt_variant('rect', [4, 5]));         // 'V<rect>(n:4,n:5)'
 *  adt_canonical(option_none);                          // 'V<none>()'
 *  adt_canonical(adt_function('h', ['a']));             // 'F<h>(s:a)'
 *  ```
 *
 *  @param v - The value to render.
 *
 *  @returns A canonical string representation.
 *
 *  @throws {JssmError} If `v` is not a representable ADT value (e.g. a JS
 *                      object, array, function, or symbol).
 *
 */

function adt_canonical(v: FslAdtValue): string {

  if (v === null)                  { return 'null'; }
  if (v === undefined)             { return 'undef'; }
  if (typeof v === 'boolean')      { return `b:${v ? '1' : '0'}`; }
  if (typeof v === 'number')       { return `n:${canonical_number(v)}`; }
  if (typeof v === 'string')       { return `s:${v}`; }

  if (is_variant(v)) {
    return `V<${v.tag}>(${v.values.map(adt_canonical).join(',')})`;
  }

  if (is_function(v)) {
    return `F<${v.lambda_id}>(${v.captures.map(adt_canonical).join(',')})`;
  }

  throw new JssmError(undefined, `adt_canonical/1 cannot serialize a non-ADT value; got ${describe(v)}`);

}


/*******
 *
 *  Content-hash (§15) of any ADT value: a 32-bit FNV-1a over its
 *  {@link adt_canonical} form, as eight lowercase hex digits.  Structurally
 *  equal values hash identically; this is the snapshot/hash digest used to
 *  fingerprint vals, props, and serialized function values.
 *
 *  ```typescript
 *  adt_hash(adt_variant('rect', [4, 5]));        // eight hex digits
 *  adt_hash(adt_function('h', [1])) ===
 *    adt_hash(adt_function('h', [1]));           // true — intensional equality
 *  ```
 *
 *  @param v - The value to fingerprint.
 *
 *  @returns An eight-hex-digit content hash.
 *
 *  @throws {JssmError} If `v` is not a representable ADT value.
 *
 */

function adt_hash(v: FslAdtValue): string {
  return fnv1a_hex(adt_canonical(v));
}


/*******
 *
 *  Deep structural equality over ADT values (§6 "structural deep equality for
 *  containers/ADTs"; §4.4 **intensional** function equality).  Two variants are
 *  equal iff same tag and pairwise-equal fields; two functions iff same
 *  `lambda_id` *and* pairwise-equal captures — never extensional, so two
 *  lambdas computing the same result but with different bodies compare unequal.
 *  Scalars compare by value, with `NaN === NaN` deliberately **true** here
 *  (snapshot identity wants reflexivity, unlike IEEE `=`).
 *
 *  ```typescript
 *  adt_equal(option_none, adt_variant('none'));          // true
 *  adt_equal(option_some(1), option_some(1));            // true
 *  adt_equal(option_some(1), option_some(2));            // false
 *  adt_equal(adt_function('a', []), adt_function('b', [])); // false (diff tag)
 *  ```
 *
 *  @param a - First value.
 *  @param b - Second value.
 *
 *  @returns `true` iff `a` and `b` are structurally / intensionally equal.
 *
 */

function adt_equal(a: FslAdtValue, b: FslAdtValue): boolean {

  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) ? Number.isNaN(b) : a === b;
  }

  if (is_variant(a) && is_variant(b)) {
    return a.tag === b.tag
        && a.values.length === b.values.length
        && a.values.every((x, i) => adt_equal(x, b.values[i]));
  }

  if (is_function(a) && is_function(b)) {
    return a.lambda_id === b.lambda_id
        && a.captures.length === b.captures.length
        && a.captures.every((x, i) => adt_equal(x, b.captures[i]));
  }

  return a === b;

}





// ---------------------------------------------------------------------------
//  Internal helpers (not exported)
// ---------------------------------------------------------------------------

/*******
 *
 *  Renders a number in a canonical, round-trippable textual form for
 *  serialization.  `-0` normalizes to `0` (so `+0` and `-0` snapshot equal),
 *  and `NaN`/`±Infinity` get stable spellings rather than the JSON `null`
 *  they would otherwise collapse to.
 *
 *  @param n - The number to render.
 *
 *  @returns A canonical decimal / keyword spelling of `n`.
 *
 */

function canonical_number(n: number): string {

  if (Number.isNaN(n))               { return 'nan'; }
  if (n === Number.POSITIVE_INFINITY) { return 'inf'; }
  if (n === Number.NEGATIVE_INFINITY) { return '-inf'; }
  if (n === 0)                        { return '0'; } // collapses -0 to 0

  return String(n);

}


/*******
 *
 *  32-bit FNV-1a hash of a string's UTF-16 code units, rendered as eight
 *  lowercase hex digits.  Shared by {@link lambda_tag} and {@link adt_hash};
 *  deterministic and host-independent, the §15 content-hash primitive.
 *
 *  @param s - The string to digest.
 *
 *  @returns An eight-hex-digit, zero-padded hash.
 *
 */

function fnv1a_hex(s: string): string {

  let h = 0x811c9dc5; // FNV offset basis

  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h  = Math.imul(h, 0x01000193); // FNV prime
  }

  return (h >>> 0).toString(16).padStart(8, '0');

}


/*******
 *
 *  Produces a short human-readable description of a value for error messages,
 *  preferring the structural tag of compound values over a bare `typeof`.
 *
 *  @param v - The value to describe.
 *
 *  @returns A brief description suitable for embedding in an error string.
 *
 */

function describe(v: FslAdtValue): string {

  if (v === null)             { return 'null'; }
  if (v === undefined)        { return 'undefined'; }
  if (is_variant(v))          { return `variant "${v.tag}"`; }
  if (is_function(v))         { return `function <${v.lambda_id}>`; }

  return `${typeof v} ${JSON.stringify(v)}`;

}





export {

  // §4.3 sum / variant
  adt_variant, is_variant, variant_tag, variant_field,

  // §4.4 option
  option_some, option_none, is_some, is_none, option_get_or,

  // §4.4 nullability
  nullable_check,

  // §4.4 type aliases
  make_alias_env, resolve_alias,

  // §4.4 / §15 defunctionalized functions
  adt_function, is_function, lambda_tag,

  // §15 canonical serialization / hash / equality
  adt_canonical, adt_hash, adt_equal

};

export type { FslVariant, FslFunction, FslAdtValue, AliasEnv };
