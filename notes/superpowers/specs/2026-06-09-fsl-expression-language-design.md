# FSL Extended State & Expression Language — Design Spec

> **Status:** DRAFT — product of the design dialogue 2026-06-05 .. 2026-06-09.
> **Target release:** major version bump (introduces a new language tier).
> **Sibling spec:** Design-by-Contract — invariants / `require` / `ensure` — tracked at **StoneCypher/fsl#1355** (depends on this).
> **Related fsl issues:** #1340–#1354 (statechart & event-model umbrellas and children), #1355 (contracts).
> **Repo note:** durable docs live under `notes/`, never `docs/` (`npm run clean` does `rm -rf docs/`).

---

## 1. Motivation — the source-vs-runtime gap

FSL today is, at the source level, a **topology + presentation** language. It can describe states, transitions, transition trigger labels ("actions" ≈ events), edge decorations (`after`, probability, description), and a config/attribute surface (styling, start states, machine attributes). It **cannot**, in source, express anything *conditional* or *stateful*: there is no guard syntax, no data, no entry/exit behavior. All of that exists only at **runtime**, via the `.add_hook(...)` API.

Meanwhile the *machine* already carries two half-built notions of extended state:

- **`property` (the language half)** — declared, named, defaulted, `required`-validated, scalar — but **immutable** and a **pure function of the current state**. `property color default "grey"; state Red: { property color "red"; }`. Read via `.prop()`/`.props()`. Never mutated by transitions.
- **`.data()` (the runtime half)** — a single `mDT`-typed blob, **mutable** (threaded through `next_data` + hook results via `_update_hook_fields`, replaced by `override`) — but **opaque**: unnamed, unstructured, undeclared, untyped, and invisible to source.

These are the same concept seen from opposite ends. This spec welds them: it gives the mutable blob the named/typed/defaulted/validated **contract surface** `property` already has, plus the **verbs** `property` lacks (read in conditions, write on transitions), via a self-contained, host-agnostic, statically-typed expression language.

The guiding distinction:

> **A `property` varies by *where you are*. A `var` varies by *how you got there*.**

---

## 2. Design principles

1. **Finite & checkable by default; the rich tier opts out explicitly.** FSL is the *Finite* State Language and a verification engine. Bounded domains + total expressions keep the configuration space analyzable. Power that breaks analyzability (unbounded numbers, open containers, first-class functions, RNG) is available but **only outside `checkable` mode**.
2. **Total expressions.** No loops, no recursion, no side effects in expression position. Every expression provably terminates and every guard provably has a value. Iteration exists only as bounded higher-order container operations.
3. **Host-agnostic — the spec defines semantics; it never borrows the host's.** FSL has its own type system and evaluation rules, lowered to each target by a **per-host runtime library**, validated by a **conformance test suite** (the executable definition).
4. **OCaml posture where OCaml and JavaScript conflict** — declared optionality, exhaustive matching, sum types, totality — *except* assignment, which is imperative/sequential by explicit choice (§7).

---

## 3. Verifiability bands

The type system is, in effect, a three-band verifiability spec:

| Band | Types | Checker strategy |
|---|---|---|
| **small-finite** | `boolean`, `enum(...)`, bounded `int lo..hi`, and finite combinations | explicit enumeration |
| **large-finite** | `int8/16/32/64`, `uint8/16/32/64` (`int128`/`uint128`?), other fixed-width | symbolic / SMT reasoning |
| **infinite / unchecked** | `longint`, `float`, `double`, unbounded `string`/`bytearray`, open `map`/`set`, `object`, `any`, first-class lambdas, `rand` | bounded analysis, or excluded from `checkable` |

The **`checkable` machine attribute** (§9) forbids the infinite band, so a machine's verifiability is a declared, visible fact — not something the checker silently degrades.

---

## 4. Type system

### 4.1 Scalars

- **`boolean`** — `true` / `false`.
- **Numeric tower:**
  - `int` — signed 64-bit (the default integer).
  - Sized signed: `int8`, `int16`, `int32`, `int64` (`int128` optional).
  - Sized unsigned: `uint8`, `uint16`, `uint32`, `uint64` (`uint128` optional). A byte is a `uint8`; unsigned exists chiefly for bytes & bitwise.
  - `longint` — arbitrary-precision signed.
  - `float` — IEEE binary32; `double` — IEEE binary64 (distinct types, like the sized ints).
  - **Bounded forms:** `int 0..3`, `uint8 0..200`, `float 0.0..1.0`, `double 0.0..100.0`. Bounds participate in the small-finite band (integers) and in clamp/saturation & contracts (floats — a bounded float is still uncountable, so it aids contracts, not enumeration).
  - **NaN / infinity:** carried by `float`/`double`. Equality is **IEEE** (`NaN = NaN` is false; `±inf` compare normally). A separate **total `compare(a, b)`** is provided for when a decidable total order is needed (sorting, keys).
  - **Promotion:** widen to the larger (`int8 + int32 → int32`); `int → float → double`; anything `+ longint → longint`. **Receiving type decides** where there is one (`int c := a/b` → 2; `double d := a/b` → 2.333…). With **no receiving type** (guards, args, lambda bodies), division is **operand-determined** (`int/int → int`); cast to choose otherwise.
  - **Overflow / bounds violation:** **error by default**; **opt-in `saturating`** (clamp to the bound). **No wrapping.**
  - **`null` in arithmetic is forbidden** (statically, because nullability is declared — §4.4).
  - **Literals:** `7` → `int`; `7.0` → `double`; suffixes `7f` (`float`), `7L` (`longint`), `7i32`/`7u8`/etc. (sized); `0xFF`, `0b1010`, `0o17` integer bases.

- **`string`** — canonical model is **code points + a UTF-8 byte view** (Rust/Swift-style), *not* the host's native string. Indexing/length/iteration are by code point; a byte view (`getbyte`/`setbyte`) addresses the UTF-8 encoding. This makes the bulk of string ops bit-identical across hosts (§6.8).
- **`bytearray`** — mutable sequence of `uint8`; the home of bitwise (§6.2).
- **`enum(a, b, c)`** — a closed set of named members; small-finite.
- **`null`, `undefined`** — JS semantics (§4.4).

### 4.2 Containers

| Type | Shape | Notes |
|---|---|---|
| `tuple(T1, T2, …)` | fixed arity, heterogeneous, typed positions | |
| `array of T` | homogeneous sequence; open or bounded `array of T len 0..8` | elements need no equality |
| `set of (number \| string)` | unique members | **members restricted to numbers/strings** |
| `map<(number \| string), V>` | open or typed | **keys restricted to numbers/strings**; values any |
| `record { f: T; … }` | typed, declared fields | structural |
| `object` | dynamic, untyped bag | **rich tier only** (§4.3, §9) |

**Keys & set-members are numbers/strings only; values may be *any* type** (including maps, sets, lambdas, records). This is deliberate: keys need decidable equality, stable hashing, and stable serialization — numbers and strings have all three trivially, which removes any need for structural-key equality, snapshot-on-insert, or function equality.

### 4.3 Variant types (the unifying mechanism)

Pattern matching, options, `null`/`undefined`, and dynamic typing are one feature — **tagged unions**:

- **`option<T>` = `some(T) | none`** — the canonical *closed* variant. Fallible operations return options: `int_of(s) : option<int>` (total), alongside `int_of_strict(s)` (throws).
- **`any`** — the *open* variant (tag + value). Produced by reads from dynamic bags (`object`, open `map`/`set`). **Consumed only by narrowing** via `case` (**sound-narrow-only** — there is no unchecked `as`-cast escape hatch). Touching `any` puts a machine in the rich tier.
- **`null` / `undefined`** — distinguished inhabitants (see §4.4), consumable by the same `case`.

This makes "dynamic" a **value-level** concept (a tagged value you must inspect) rather than a **type-system hole** (an `any` that silently disables checking).

### 4.4 Nullability — JS semantics, declared only

- **Declared-nullable only:** types are non-null by default; `T?` admits null/undefined. There is no universal null inhabitant.
- `undefined` = a nullable var never assigned, or an absent field. `null` = an *intentionally* assigned absence.
- `null = undefined` evaluates to **false** (distinct values; we have no loose equality).
- Neither participates in arithmetic (static error).

### 4.5 Function types

- `fn(T1, T2, …) -> R`. **Uncurried.**
- **Inline lambdas** (arguments to container ops) are in the checkable tier. **First-class lambdas** (stored in vars, passed around) are rich-tier only (function-valued state is higher-order and not finitely checkable).
- **Read-only capture** of enclosing vars/properties/payload; a lambda may not mutate captured state. (This also keeps the C lowering an immutable closure-environment struct.)

---

## 5. Declarations

```
var attempts : int 0..3                      default 0;
var verified : boolean                       default false;
var tier     : enum(free, pro, enterprise)   default free required;
var note     : string?                       default undefined;
```

- Syntax mirrors `property` (`default`, `required`), validated at construction and on every data update, reusing the existing `_property_keys` / `_default_properties` / `_required_properties` machinery.
- Accessor mirrors `.prop()`: `.var('attempts')`, `.vars()`.
- `property` is unchanged and remains state-bound/immutable. `var` is the new history-bound/mutable sibling.
- **Bounds** may reference literals and declared named constants (`int 0..max_tries`); arbitrary expressions in bound position is out of scope for v1.
- **Name collision** (a `var` and a `property` sharing a name): *draft default* — disallow at declaration time (error), rather than silently shadow. (Flag for review.)

---

## 6. The expression language

### 6.1 Literals
Numbers (§4.1), strings (`"..."` — single quotes are reserved for action labels), `true`/`false`, enum members, `null`/`undefined`, container literals (§6.9), variant constructors (`some(x)`, `none`).

### 6.2 Operators

- **Arithmetic:** `+ - * /`, `mod`, `rem` (differ on negative operands), and integer `div` (when `/` is float-typed by context). 
- **Comparison:** `= != < <= > >=`. Cross-type comparison is a **type error**. `compare(a,b)` gives a total order (incl. NaN).
- **Boolean (eager):** `and or not nand nor xor xnor andnot implies nimplies`.
- **Boolean (short-circuit):** `andalso`, `orelse` — used to guard partial operations: `where i < length(a) andalso a[i] = 5` never evaluates `a[i]` when the bound check fails.
- **Membership:** `x in (...)` over enums, arrays, and sets.
- **Bitwise:** `band bor bxor bnot bshl bshr` over `bytearray` and **fixed-width** ints/uints. **Not** over `longint` (two's-complement of unbounded ints is a footgun). Shifts are logical for unsigned, arithmetic for signed.
- **String concat:** `++` (distinct from numeric `+`).
- **Pipe:** `|>` — `xs |> filter(odd) |> map(square) |> foldl(0, plus)` (pure sugar for nested calls).

**Precedence (draft, flag for review),** tightest → loosest: `bnot`/`not`/unary `-` → `bshl`/`bshr` → `band` → `bxor` → `bor` → `* / mod rem div` → `+ - ++` → `= != < <= > >= in` → `and`/`andalso`/`nand`/`andnot` → `xor`/`xnor` → `or`/`orelse`/`nor` → `implies`/`nimplies` (right-assoc) → `|>`. Parenthesize freely.

### 6.3 Conditional & binding
- **`if c then a else b end`** — an *expression* (returns a value).
- **`let x = e in body`** — pure, immutable, local binding to avoid recomputation; not a `var`.

### 6.4 Pattern matching — `case`
Full pattern matching:
```
case value of
    some(n)        -> n + 1;
    none           -> 0;
    (0, y)         -> y;            % tuple destructure
    { kind: k, v } -> k;           % record destructure + binding
    x when x > 100 -> x;           % binding + when-guard
    _              -> -1;          % wildcard
end
```
- Patterns: literals, enum members, variant tags (`some`/`none`/`int`/`string`/…), tuple/record destructuring, bindings, `when` guards, wildcard `_`.
- **Exhaustiveness** is checked over the scrutinee's type's value space — decidable for finite types (enum, boolean, bounded int, finite combinations). For infinite/open types an **`else` arm is required** to satisfy it.

### 6.5 Builtins
- **Math:** `trunc ceil round pow sqrt cubert sign abs min max clamp` + trig (`sin cos tan asin acos atan atan2`, radians). Domain errors (e.g. `asin(2)`) follow the NaN policy for floats / error for the checkable integer tier.
- **RNG:** `rand(lo, hi)` — seeded; the RNG state ({initial seed, current, step count}) is part of serialized machine state (§7). Its presence flips a machine out of `checkable`.
- **Constants:** `pi`, `e`, `tau`, per-type `MIN`/`MAX`, `inf`, `nan`. (Inventory to be reconciled with constants already present in the parser.)

### 6.6 The container protocol
A tiered uniform interface (free-function call style, §6.7), so names stay consistent:

- **Universal** (string, array, tuple, map, set, bytearray): `length`, `size`, `is_empty`, `contains`, iteration, `=` (deep structural).
- **Ordered/indexed** (string, array, tuple, bytearray): `at`/`get(i)`, `first`, `last`, `slice`, `substring`, `reverse`, `concat`, `chunk`, `index_of`, `take`, `drop`.
- **Keyed** (map, object): `keys`, `values`, `entries`, `get(k)`, `has(k)`, `with(k,v)`, `without(k)`.
- **Set-algebra** (set): `union`, `intersection`, `difference`, `subset`, `add`, `remove`.
- **Higher-order** (array, set, map, string-as-chars): `map`, `filter`, `foldl`, `foldr`, `all`, `any`, `find`, `count`, `sort`, `flat_map`.

**Access surfaces:** bracket `a[i]` / `m[k]` **throws** on missing/out-of-bounds (you asserted presence); `get(a, i)` / `get(m, k)` returns **`option`** (`none` on absence). `foreach` is **not** provided — `foldl` subsumes it without reintroducing nested effects.

### 6.7 Lambdas
```
filter(xs, fn(x) -> x > threshold)            % inline, read-captures `threshold`
foldl(xs, 0, fn(acc, x) -> acc + x)
```
- **Uncurried**, free-function call (`map(xs, f)`, not `xs.map(f)`) — lowers identically across hosts.
- Inline lambdas (checkable) and first-class storable lambdas (rich tier); read-only capture (§4.5).

### 6.8 String model & portability
- **Code point is the unit** of `length`/index/iteration; **UTF-8 is the byte view**.
- **Fully portable, fully specified:** `length`, `getch`/`getcp`, indexing, `substring`/`slice`, `concat`, `reverse`, `startsWith`/`endsWith`/`includes`/`find` (code-point comparison), `split` on a literal, `padStart`/`padEnd`, `trim`/`trimStart`/`trimEnd`, plus the `getbyte`/`setbyte` UTF-8 layer.
- **Implementation-defined / deferred** (Unicode-table- or locale-dependent): `toUpper`/`toLower`, `normalize`, collation, **regex**, locale. These either pin a bundled Unicode version for determinism or are explicitly marked implementation-defined. (See §10, §12.)

### 6.9 Container literals (draft, flag for review)
`[1, 2, 3]` array; `(1, true)` tuple (`(1,)` for a 1-tuple to disambiguate from parenthesization); `{ field: v }` record; a distinct set literal and map literal (object vs map literal disambiguation TBD); bytearray literal (Erlang-style `<<...>>` candidate). Reconciled during drafting.

---

## 7. Mutation (`assign`) and machine integration

### 7.1 The `assign` verb
The assignment keyword is **`assign`** (the type keeps the name `set`). Whole-value and **slot** assignment, sequential/imperative within a block:
```
Idle 'submit' -> Checking    assign attempts := attempts + 1;
Checking 'ok' -> Authed      assign verified := true;
Locked 'reset' -> Idle       assign { attempts := 0; verified := false; };
Cart 'add'(item) -> Cart     assign { items[count] := item; count := count + 1; };   % slot assign
```
- Compound forms: `+= -= *= …`.
- **Sequential semantics:** later statements see earlier writes (imperative). The **pre-transition state is available via `old`/`pre`** — the same accessor postconditions use (it maps onto the pipeline's already-captured `oldData`/`fromState`).

### 7.2 Guards vs preconditions
- **`where <expr>`** — a *guard*. A false guard means **this edge does not apply** (silent non-transition; candidate selection).
- **`require <expr>`** — a *precondition* (contract, #1355). A false precondition means **the edge was invoked wrongly** → error + rollback.

### 7.3 Pipeline slots
The source clauses compile into named slots of jssm's existing committed transition pipeline (each phase can veto and/or mutate; `oldData`/`fromState` captured up front):

| Clause | Slot | On failure | Sees |
|---|---|---|---|
| `where` | validity / candidate selection | silent (edge inapplicable) | pre-state |
| `require` | early (≈ phase 1) | **error + rollback** | pre-state |
| `assign` | between **exit** and **entry** (UML transition-action slot) | error + rollback | evolving state + `old` |
| `ensure` | post (≈ phase 9) | **error + rollback** | `old` **and** new |
| `invariant` | at the **stable** (run-to-completion) configuration only | **error + rollback** | new config |

**Ordering** at a shared phase: `where`/`require` → user API hooks → `assign` → user entry hooks → `ensure`/`invariant`. **Exit → assign → entry** so entry actions observe post-`assign` data.

### 7.4 Errors, rollback, atomicity
- Error sources: index/key out-of-bounds, overflow under error-mode, integer division by zero, failed narrowing, contract violation.
- On any error: **atomic rollback of machine state + data**, and **observers are notified that a rollback occurred** (a rollback notification/event). Rollback is **not** responsible for undoing external side effects already performed by user hooks (e.g. I/O).
- No in-language `catch`; error-recovery transitions are a separate future feature.

---

## 8. Expression reach

Expressions may appear **everywhere a value token appears**: guards, `assign` RHS, edge **probability**, `after` **delay**, `var`/`property` defaults, `case` scrutinees, function arguments, container literals.

Expressions may **not** appear in **identifier slots** — you cannot *compute* a target state name or action label (that is the FSMs-as-data feature, separate).

- **Computed probability:** the out-edge probabilities are **scaled to sum to 1** (matches current jssm behavior). A *negative* or *NaN* individual probability is an **error**.
- **Computed delay:** a negative or NaN `after` value is an **error**.

---

## 9. The `checkable` machine attribute

A machine attribute (slots into the existing `MachineAttribute` grammar rule alongside `npm_name`, `failed_outputs`, `allow_islands`, `default_size`). Working name `checkable` (alternatives: `verifiable`, `finite`).

When set, the compiler **rejects** every rich-tier construct: `object`/open `map`/open `set`, `longint`, unbounded `float`/`double`, first-class lambdas, `any`/dynamic access, `rand`, and unbounded containers. The attribute is therefore not mere metadata — it **enforces** the small/large-finite bands and makes verifiability a checked, declared property.

It doubles as a **portability profile**: a `checkable` machine uses no rich types and lowers to even the most minimal host (C) without the full runtime; rich-tier machines require the per-host support runtime (§10).

---

## 10. Multi-host posture

**Targets in view now:** Rust, C, Python, PHP, Ruby, C#, JavaScript. **Later:** Lisp, Erlang, Elixir, and dozens more.

Because that range spans manual-memory/no-closure C through dynamic Ruby/Python through immutable/single-assignment Erlang/Lisp, there is **no common host behavior to borrow**. Therefore:

- **The spec defines semantics abstractly.** Each backend implements an **FSL support runtime** (longint, maps, sets, bytearrays, UTF-8 strings, first-class lambdas, seeded RNG, variants) with identical behavior.
- **A conformance test suite is the executable specification** every backend must pass.
- **Never delegate to host-native types/behavior** except where behavior provably matches (an optimization, not the contract).
- **Single-assignment hosts** (Erlang/Elixir/Lisp): imperative `assign` lowers to **SSA / rebinding** — a lowering detail.
- **C specifically:** first-class lambdas = function pointer + explicit immutable closure-environment struct (read-only capture makes this a plain struct); the `checkable`/finite profile lowers trivially without the rich runtime.
- **Implementation-defined corners** shrink to the genuinely unavoidable (locale, case-mapping, normalization, regex) — and even these prefer a **pinned bundled Unicode version** for cross-host determinism where feasible (§12).

---

## 11. Phasing (implementation; the spec covers the full surface)

1. **Phase 1 — declarations.** `var` with the full type system, defaults, `required`, validation. Promotes the opaque `.data()` blob to named, typed, validated fields. No expression evaluation yet.
2. **Phase 2 — expressions.** The expression language, `where` guards, `assign` (incl. slot assignment + sequential semantics + `old`), pattern matching, builtins, the container protocol, variants/options/`any`, lambdas.
3. **Phase 3 — reach & contracts.** Expressions into probability/delay/defaults; the contracts layer (#1355: `require`/`ensure`/`invariant`).

---

## 12. Open / deferred

- **Regex** flavor and **locale / Unicode normalization & case-mapping** — the worst multi-host conformance offenders; specified last, as an explicitly implementation-defined tier (with a pinned Unicode version where determinism is required).
- **Contracts** detail → StoneCypher/fsl#1355.
- **Reserved-word policy** — ~40 new keywords vs FSL's free-form state/action names (a state literally named `Set`, an action `'map'`). *Draft lean:* **context-scoped keywords** (the lexer treats these as keywords only inside expression context: after `where`/`assign`/`case`/`require`/`ensure`/`invariant`/bounds) to preserve backward compatibility, accepting grammar complexity.
- **`int128`/`uint128`** inclusion.
- **`div` naming** / final rule for float-vs-integer division in no-context position.
- **Container literal syntaxes** (object-vs-map-vs-set literal disambiguation; bytearray literal; 1-tuple form) — §6.9.
- **var/property name-collision** policy (§5) — draft: error.
- **Payload typing** — declaring action parameter types (`action coin(amount : uint8)`); coordinate with payloads issue #1348.
- **`checkable` attribute name** — `checkable` vs `verifiable` vs `finite`.

---

## 13. Decision log

| # | Decision | Resolution |
|---|---|---|
| Extended state | how to express it | `var` sibling to `property`: history-bound/mutable vs state-bound/immutable |
| Expression language | embedded-host or self-contained | **self-contained, host-agnostic** (FSL targets many hosts) |
| Division | result type | **receiving type decides**; no-context → operand-determined |
| Sized ints | which | signed `int8..64` + unsigned `uint8..64`; bare `int` = signed 64; `longint` arbitrary |
| Overflow | policy | **error by default; opt-in `saturating`; no wrapping** |
| NaN | equality | IEEE for arithmetic; separate total `compare` |
| Nullability | model | **declared-nullable only**; `null`/`undefined` JS semantics; `null = undefined` → false |
| `null` in arithmetic | allowed? | **forbidden** (static) |
| Mutation | functional vs in-place | **in-place slot assignment**; sequential/imperative; `old` accessor |
| `assign` keyword | name | **`assign`** (type keeps `set`) |
| Pattern matching | depth | **full** (destructure, bindings, `when`, exhaustiveness with `else` opt-out) |
| `if/then/else` | form | **expression** |
| `let … in` | included? | **yes** |
| Booleans | set | `and or not nand nor xor xnor andnot implies nimplies` + short-circuit `andalso`/`orelse` |
| Bitwise | scope | bytearray + fixed-width ints; **not** `longint` |
| Keys / set-members | types | **numbers & strings only**; values may be any type |
| HOFs | which | `map filter foldl foldr all any find count sort flat_map`; **no `foreach`** |
| Lambdas | kind | uncurried; **inline (checkable) + first-class (rich)**; read-only capture |
| Call style | method vs free | **free-function** + `|>` pipe |
| Dynamic typing | `object`/open map/set | **`any` open variant; sound-narrow-only**; quarantined by `checkable` |
| `option` | fallible results | `some`/`none`; total `int_of` vs throwing `int_of_strict` |
| Indexing | missing/OOB | **bracket throws; `get` → option**; both shipped |
| Pipeline | clause slots | `where`@validity, `require` early, `assign` exit→·→entry, `ensure` post, `invariant`@stable |
| Rollback | responsibility | atomic machine state/data + **notify observers**; not external side effects; on any error |
| Invariants | timing | **stable (run-to-completion) configs only** |
| Expression reach | where | **everywhere a value token appears**; not identifier slots |
| Probability | computed | **scale sum to 1**; negative/NaN component = error |
| `checkable` | form | **machine attribute**; enforces finite bands; doubles as portability profile |
| Host posture | strategy | **spec-defines-semantics + per-host runtime + conformance suite**; never borrow host |
| Contracts | scope | **sibling spec** StoneCypher/fsl#1355 |
