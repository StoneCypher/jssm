# FSL v-next — Extended State, Expression Language, I/O & Verification (Megaspec)

> **Status:** DRAFT — consolidates the full design dialogue of 2026-06-05 .. 2026-06-10. Supersedes `2026-06-09-fsl-expression-language-design.md` **and** `2026-06-10-fsl-factories-systems-design.md` (both folded in here; the factories/systems content is §21–§26).
> **Target release:** major version bump (new language tier).
> **Issue map (StoneCypher/fsl):** #1355 contracts · #1356 wildcard transitions · #1357 lifecycle actions · #1358 declared event alphabet · #1359 editor alphabet curation · #1360 temporal property language · *(error-recovery transitions — to file)*. Structural/event umbrellas this builds on: #1353 (statechart semantics: history #1340, final #1341, fork/join #1342, in-state guards #1343, internal transitions #1344, RTC #1345), #1354 (actor/event model: raise/send #1346, deferred #1347, payloads #1348), #1349 time, #1350 eventless+else, #1351 activities, #1352 modularity. Factories: #413 umbrella, #430 instance name, #431 name factory method, #443 start-node selection, #459 data factory method. Tooling: #407 publish/npm modules, #1172/#1173 target capability negotiation, #64/#67 stochastic system testing.
> **Repo note:** durable docs live under `notes/`, never `docs/` (`npm run clean` wipes `docs/`).

---

## 1. Motivation

FSL source today is a **topology + presentation** language: states, transitions, action labels, edge decorations (`after`, probability), a config surface. Everything *conditional* or *stateful* lives only in the runtime hook API. This spec lifts that into source as a **self-contained, host-agnostic, statically-typed, total, verifiable** language layer, organized around three unifications:

- **Three kinds of variable.** `prop` varies by *where you are* (state-bound, exposed). `val` varies by *how you got there* (history-bound, mutable, local). `sensor` varies by *what's out there* (externally-sourced, read-only). All read identically in expressions; only their source differs.
- **The I/O 2×2.** `direction` × `trigger style`: input-edge = events/tape, output-edge = `emit`/tape, output-level = `prop` (exposed), input-level = `sensor`. Machines are **finite-state transducers**.
- **Verification north star.** Bounded domains + total expressions keep the configuration space finite and analyzable, so a machine can state and **model-check** its own safety and temporal properties; counterexamples are replayable input tapes.

The mantra: **bounded by default, opt into unbounded knowingly.** Finite types, bounded containers, the `finite` tier, tape retention, the microstep bound — every default is the safe/analyzable one; going unbounded is always a deliberate, visible act.

**Scope:** this megaspec specifies the new *language layer* — values, types, expressions, I/O, verification. The *structural-transition* features it builds on are referenced by issue, not re-specified here: wildcard `* ->` (#1356), eventless/`else` (#1350), history (#1340), final/done (#1341), fork/join (#1342), in-state guards (#1343), internal transitions (#1344), RTC (#1345). **Overlapping state groups** — also structural — are the exception: this spec absorbs their design directly (§19).

---

## 2. Design principles

1. **Finite & checkable by default; the rich tier is opt-in and explicit** (§4).
2. **Total expressions** — no loops, no recursion, no effects in expression position; iteration only via bounded HOFs over finite containers. Every expression terminates (§13).
3. **Deterministic execution + reproducible replay** — seeded RNG, recorded input; *input* is the single source of truth, everything else regenerates (§18).
4. **Host-agnostic** — the spec defines semantics; each target ships a runtime; a conformance suite is the executable definition. Never borrow host behavior (§19).
5. **OCaml posture where it conflicts with JS** — sum types, declared optionality, exhaustive matching, totality — *except* assignment, which is imperative/sequential by choice.

---

## 3. Verifiability bands & the `finite` attribute

| Band | Members | Checker |
|---|---|---|
| **small-finite** | `boolean`, `enum`, bounded `int lo..hi`, finite combinations | explicit enumeration |
| **large-finite** | `int8..128`, `uint8..128`, bounded `decimal(p,s)`, bounded `string`/`bytearray`/`set`/`map`, other fixed-width | symbolic / SMT |
| **infinite / rich** | `longint`, unbounded `decimal`, `float`/`double`, unbounded/open `string`·`bytearray`·`map`·`set`, `any`, first-class lambdas, **recursive ADTs**, infinite streams | bounded analysis only |

**`finite` machine attribute** (slots into `MachineAttribute`). When set, the compiler **rejects** the rich band: `float`/`double`, `longint`, unbounded `decimal`, first-class lambdas, `any`/dynamic, open or unbounded `string`/`bytearray`/`map`/`set`, recursive ADTs, infinite-stream runs. **`rand` and `sensor` are *allowed*** on `finite` machines — the checker **over-approximates** them ("any value in the declared domain"), so you prove "holds for all random/sensor outcomes." `data` (the opaque blob) is **forbidden** on `finite`. The attribute doubles as a **portability profile** (finite machines lower to even minimal hosts without the rich runtime).

**Capability attributes.** `finite` is one of a *family* of capability-restriction attributes (joining the existing `hooks: open/closed` and `allow_islands`). Each declares a feature the machine forgoes: `disallow transitions` / `actions` / `forced transitions` / `override`; the `input` · `output` · `log` · `error` tapes; `disallow sensors` / `channels` / `emit` / `time`; `disallow vals` / `assign` / `data`; `disallow lambdas` / `rand` / `probability`; `disallow rejection` / `error-recovery` / `rollback`; `disallow composition` / `embedding`; `sealed` (no runtime add/remove of edges/states). Each does three things at once: **documents** the machine's interface, lets the **checker** assume-and-enforce the restriction, and lets the **runtime skip the disallowed machinery** (the same specialization that keeps the hot path fast — e.g. `sealed` enables flattening/precompute). Named **profiles** bundle common sets: `finite` (rich tier), `pure` (no tapes/rand/sensors/time), `sealed` (no graph mutation), `deterministic` (no rand/probability), `stateless` (no vals/data), `closed` (no external I/O).

**Model-class attribute (the automata-ladder gate).** Separate from the *disallow* family: a declaration of which **automata class** the machine inhabits — the shape of its auxiliary memory, hence the verifier's decision procedure — and the attribute **enforces the restriction that keeps that class decidable** (its whole point, like `finite`'s). The full ladder:
- **`regular`** (default, rung 0) — bounded vals only → finite state → BFS / reachability.
- **`pushdown`** (rung 1) — adds **one** push/pop **stack** store (no second stack, no random access — *two stacks is a Turing machine*) → context-free → pushdown / CFL-reachability.
- **`petri`** (rung 2) — adds **bag/multiset** counters with monotone add/remove + threshold (`>=`) guards and **no zero-test** (a zero-test is a Minsky counter → Turing) → coverability (EXPSPACE). Needs the **`bag`** type (§4.2).
- **`tree`** (rung 3) — tree-shaped input/output → finite tree automaton / **tree transducer** → decidable (§17).

**Totality caps the ladder below rung 4 (Turing).** Naming the rung lets the checker pick the right algorithm *and* reject the operations that would silently climb past it.

**`hooks: closed` and fsl#617.** The `hooks: open`/`closed` attribute (fsl **#617**, grammar #644 / compiler #645) is the encapsulated-hook-surface member of this family: `closed` restricts the machine to the hooks **declared in source** — which is exactly the **named-hook declarations** of §14. Named hooks + `hooks: closed` together *fulfill and extend* #617: an allowlist becomes a **typed, `required` dependency contract**, and the closed/declared surface is what makes the codegen **hook-interface export** (§16) complete and hook **introspection** (§12) total. A landing PR should `Closes #617`.

---

## 4. Type system

### 4.1 Scalars
- `boolean`.
- **Numeric tower:** `int` = **signed safe-integer (s53)**; `int8/16/32/64/128/256`, `uint8/16/32/64/128/256` (fixed-width ladder caps at **256** — covers SHA-256 / EVM `uint256` / big fixed-point; beyond 256 use `longint`); `longint` (arbitrary-precision signed); `float` (f32), `double` (f64); **`decimal`** for exact base-10 (bounded `decimal(p, s)` — p digits, s after the point — is large-finite/checkable; unbounded `decimal` is rich; rounding modes to enumerate, banker's/half-even default). Bounded forms `int 0..3`, `uint8 0..200`, `float 0.0..1.0`, `decimal(10, 2)`.
  - **Promotion:** widen to the larger; `int → float → double`; `… + longint → longint`. Receiving type decides where present; no-context → operand-determined (`int/int → int`); integer `div` when `/` is float-typed by context.
  - **Overflow / bounds:** **error by default; opt-in `saturating`; no wrapping.**
  - **NaN/∞:** IEEE (`NaN = NaN` is false); a total `compare` for ordering; **`isnan`/`isinf`/`isfinite`** required.
  - **Literals:** `7`→int, `7.0`→double, `7f`/`7L`/`7i32`/`7u8`, `0xFF`/`0b…`/`0o…`.
- `string` — **code point** is the unit of length/index/iteration; **UTF-8** is the byte view (§8); bounded form `string len 0..N` is finite-eligible (unbounded `string` is rich).
- `bytearray` — mutable `uint8` sequence; home of bitwise; bounded form `bytearray len 0..N` is finite-eligible.
- `enum(a, b, c)` — closed, payload-less, small-finite.
- `null`, `undefined` — JS semantics; distinct (`null = undefined` is false); forbidden in arithmetic; declared-nullable only (§4.4).

### 4.2 Containers
| Type | Literal | Notes |
|---|---|---|
| `tuple(T1, T2, …)` | `(1, true)` / 1-tuple `(1,)` | fixed arity, heterogeneous |
| `array of T` | `[1, 2, 3]` | open or `len lo..hi` bounded |
| `set of (number\|string)` | `#[1, 2, 3]` | members num/string; bounded `size 0..N` is finite-eligible |
| `bag of (number\|string)` | `#( 1, 1, 2 )` | multiset (members + multiplicities); the `petri`/rung-2 token store (§3); monotone ops + `>=` thresholds, no zero-test; bounded `size 0..N` finite-eligible |
| `map<(number\|string), V>` | `#{ "a": 1 }` | keys num/string, values any; bounded `size 0..N` is finite-eligible |
| `record { f: T; … }` | `{ x: 1, y: 2 }` | typed product |
| `bytearray` | `[< 0, 255, 16 >]` | (`[< >]` chosen for HTML-safety; `<<>>` collides with shift) |

`object` is **removed** — superseded by ADTs + `any` + `map<string, any>`. **Keys/set-members = numbers/strings only** (decidable equality/hash/serialize); **values = any type.**

### 4.3 Algebraic data types (sum types)
```
type Shape = circle(radius: float) | rect(w: int, h: int) | point;
type Tree  = leaf | node(value: int, left: Tree, right: Tree);   % recursive ⇒ rich-tier only
```
Sums (with payloads) complement records (products); pattern matching (§7) is built for them. **Recursive ADTs are allowed but rich-tier only** (unbounded depth ⇒ not finite); they stay acyclic (trees, not graphs — §13).

### 4.4 Variants, nullability, aliases, functions
- **`option<T>` = `some(T) | none`** (closed); **`any`** = open variant, **consumed only by narrowing** via `case` (sound-narrow-only); `null`/`undefined` are inhabitants.
- **Nullability:** declared-only, `T?`; non-null by default; forbidding `null` in arithmetic is therefore static.
- **Type aliases:** `type Celsius = int -273..1000;  type Name = string;`
- **Function types:** `fn(T1, T2) -> R`, uncurried; **inline** (checkable) + **first-class** (rich); **by-value read-only capture** (§13). **Function values defunctionalize** to `(lambda-id, captured-data)` — the body is a stable **tag** (content-hash of the normalized lambda AST / index into the program's finite lambda table), captures are by-value acyclic data — so they **serialize, hash, and cross hosts** like any ADT (§15). **Equality is intensional** (same tag + equal captures; extensional equality is undecidable, so two lambdas that compute the same thing compare *unequal*).
- **Both `prop` and `val` may be function-typed** (§5). A function-typed **prop** = one concrete lambda pinned per state — the **State pattern**, native and *checkable* (a finite map state→lambda, reasoned over symbolically; never a free function variable). A function-typed **val** = a reassignable **carried strategy** — first-class, so a rich-tier door per §13/§3, but **finite-checkable when the assignable-lambda set and its captures are finite-typed**, at a state-space cost (each such val ranges over the finite program-lambda set × captures).

### 4.5 Dimensioned types (units)
A **units-of-measure** layer over the numeric tower: a numeric type may carry a **dimension** built from declared base + derived units. Purely **compile-time phantom types — erased before runtime, *zero* runtime cost** (a non-using machine compiles identically; a using machine pays at most a constant, compile-time-folded conversion multiply).
- **Declare** base, scaled, and derived dimensions, via product *and* quotient: `unit length = base meter (m); length += km = 1000 m; unit velocity = length / time; unit acceleration = velocity / time;`. Literals carry units: `100 km/h`, `0 m/s/s`.
- **Dimensional checking:** `+ - = < …` require matching dimensions; `* /` add/subtract the base-dimension **exponent vector**; same-unit `/` cancels to **dimensionless** (so `received / total` is a unit-less ratio). Mixing units within a compatible dimension auto-inserts the conversion factor; mixing *incompatible* dimensions is a **type error**.
- **Standard units library (a default prelude).** The 7 **SI base units** (meter/kilogram/second/ampere/kelvin/mole/candela) + the **SI prefix system** — so `km`, `ms`, `MHz`, `μA` exist *without definition*: define a base once and every prefix (`Y…k…m…μ…y`) comes free — + the named SI **derived units** (`hertz`, `newton`, `joule`, `watt`, `volt`, `ohm`, `pascal`, … and `velocity`/`acceleration` compounds). Opt-in modules: `data` (byte/bit, `KB` vs `KiB`), `imperial`, extended `time` (minute/hour/day), `angle`. Users declare only *domain-custom* units (`unit health = base hitpoint;`). The earlier examples' `unit length = base meter …` lines are normally **provided by the prelude**, not hand-written.
- **Subsumes** the angle `deg`/`rad` units; **pairs with `decimal`** for money. **Domain newtypes** (`user_id` vs `order_id`, `cents` vs `dollars`, `pixels` vs `points`) use the same mechanism for plain type-safety, not physics. The units *library* (definitions, mostly exact/stable) is **distinct from** the versioned physical-*constants* library (`c`, `G`, `h` — measured/CODATA).
- **Caveats (later detail):** affine units (°C/°F vs K — a temperature *difference* is a different thing from a temperature); binary vs decimal prefixes (`KB`=1000 vs `KiB`=1024) are distinct declared units. A **later-phase** type-system extension; pairs with a versioned physical-constants library (the home for CODATA values).

---

## 5. Declarations

```
val attempts : int 0..3                  default 0;
val verified : boolean                   default false required;   % required+default conflict = error
prop color   : string                    default "grey";           % props are now typed too
prop color   : string;  state Red: { prop color "red"; }           % state-overridden
sensor temp  : int 0..200;                                          % read-only, externally sourced
val loot     : stream(seed: 42);                                    % an RNG stream is a stream-typed val
```
- `val`/`prop`/`sensor` share grammar shape and the `.prop()`-style accessor families (`.val()`, `.vals()`, `.set_val()`, `.known_val()`, `.var_type()`; `.prop()` etc.; `.sensor()` read-only).
- Initial value resolves: supplied `vals` config > `default` > (`required` → throw) > `undefined`; validated against the declared type at construction.
- **Type annotations are optional on `prop`** (an unannotated `prop`, and the legacy `property` alias, infer or stay untyped — backward-compat); `val` and `sensor` are typed.
- **`property`→`prop` and `var`→`val`** renames; `property` kept as a **deprecated alias, removed in v7**.
- **Name collisions:** `val`/`prop`/`sensor` sharing a name = error; a user name shadowing a constant = allowed + lint-warn.
- **Function-typed slots:** `prop` *and* `val` may hold function values (§4.4) — props give per-state behavior (State pattern, pinned/checkable); vals carry a reassignable strategy (first-class). Both snapshot/hash via defunctionalization `(tag, captures)` (§15); equality is intensional. Captures stay by-value/acyclic (§13), so higher-order (a captured function value) is allowed and stays acyclic.
- **`val`s supersede `.data()`:** `val`s are the **typed mutable surface** (named/validated/codegen-exported). The legacy opaque **`.data()` / `mDT`** blob is retained as a **deprecated untyped escape hatch** (`mDT = unknown`, eventual removal — the §4.2 `object`→`any` move, one layer up); **hooks re-target** their data surface from `mDT` to the typed **val-record**. The val-record's runtime *layout* and rollback *snapshot* are below.

---

## 6. Expression language — operators

- **Arithmetic:** `+ - * /` `mod` `rem` `div`.
- **Comparison:** `= != < <= > >=` (cross-type = type error); structural deep equality for containers/ADTs; total `compare`.
- **Boolean (eager):** `and or not nand nor xor xnor andnot implies nimplies`; **(short-circuit):** `andalso orelse`.
- **Membership:** `x in (…)` over enums/arrays/sets.
- **Bitwise:** `band bor bxor bnot bshl bshr` over bytearray + **sized** ints (`int8/16/32/64/128`, `uint…`) — not bare `int` (s53, no clean width) or `longint`.
- **String concat** `++`; **pipe** `|>`.
- **Precedence** (tightest→loosest): unary `not`/`bnot`/`-` → shifts → `band` → `bxor` → `bor` → `* / mod rem div` → `+ - ++` → comparisons/`in` → `and`/`andalso`/`nand`/`andnot` → `xor`/`xnor` → `or`/`orelse`/`nor` → `implies`/`nimplies` (right-assoc) → `|>`.

### Control & binding
- `if c then a else b end` (expression); `let x = e in body` (pure local).
- **Pattern matching** — `case scrut of pat -> expr ; … [else -> …] end`; full patterns (literals, enum/variant tags, tuple/record/ADT destructure, bindings, `when` guards, `_`); **exhaustiveness** decidable over finite types, `else` required otherwise.
- **Bounded quantifiers:** `forall x in 0..n : P(x)` · `exists s in xs : P(s)` (over finite ranges/collections).

---

## 7. Standard library / math

**Core = domain-neutral primitives** (every builtin is reimplemented per host + conformance-tested, so the core stays lean; domain toolkits — physics, finance, geometry, ML — are userland libraries).

- **Arithmetic/rounding:** `abs min max clamp sign trunc floor ceil round pow sqrt cubert hypot lerp smoothstep`.
- **Exp/log:** `exp log ln log2 log10`.
- **Trig (degrees default, `rad`/`°` units, `deg` optional):** `sin cos tan asin acos atan atan2` + hyperbolic `sinh cosh tanh asinh acosh atanh` + `degrees`/`radians`.
- **Predicates (required for NaN/∞):** `isnan isinf isfinite`.
- **Integer/combinatorics:** `gcd lcm factorial comb perm`.
- **Bit:** `popcount clz ctz rotl rotr`.
- **Descriptive stats (over collections):** `sum product mean median mode variance stddev percentile`.
- **RNG (rich tier; over-approximated on `finite`; optional stream arg):** `rand(lo,hi)` `rand_float([lo,hi))` `rand_normal(mean,sd)` `rand_bool(p)` `rand_choice(coll)` `rand_weighted(pairs)`.
- **Constants (math-only):** `pi e tau phi sqrt2 ln2 ln10 inf nan`, per-float `EPSILON`, per-type `MIN`/`MAX`.
- **Infrastructure (blessed):** **encoding** — `base64` / `base64url` (URL-safe) / `hex` / percent (URL) encode-decode; a stable **pinned** non-crypto `hash` (algorithm fixed in the conformance suite); **compression** — `zstd` and `lz4` (`compress`/`decompress`; portable specified *decoders* everywhere, a **pinned canonical encoder** where compressed bytes are observed state). Each compressed blob has a **URL-safe representation** (`compress |> base64url`) for embedding machine state / tapes in shareable links. The `decimal` type lives in the numeric tower (§4.1). *(Userland: physics/finance/geometry/etc.)*

---

## 8. String model

Three addressing units: **byte** (UTF-8, `getbyte`/`setbyte`), **code point** (default for length/index/slice), **extended grapheme cluster** (opt-in via a `+` suffix: `s[3+]`, `s[0 : 5+]`). **Negative-from-the-back** indexing/slicing (Python-style): `s[-1]`, `s[1:-1]`. Portable-and-specified ops: length, `getcp`/`getch`, index, `substring`/slice, `concat`, `reverse`, `startsWith`/`endsWith`/`includes`/`find`, literal `split`, `pad*`, `trim*`. **`normalize`/case-fold are allowed on `finite`** but locked to the **shipped Unicode version** (deterministic via bundled tables); **locale-tailored** casing and **regex** stay rich/implementation-defined (regex deferred). **Unicode floor = 16.0** (GB9c-bearing); a `unicode: N;` attribute may **request** higher — a **hard requirement** on `finite` machines (exact match or refuse), best-effort otherwise.

---

## 9. Mutation (`assign`)

`assign` is the verb (the type keeps `set`). Whole-value and **slot** assignment, **sequential/imperative**; pre-state via `old`:
```
A 'go' -> B  assign { count := count + 1; items[i] := x; rec.f := y; };
```

---

## 10. Guards & contracts
- `where <expr>` — guard (false ⇒ edge inapplicable; silent).
- `require`/`ensure`/`invariant` — Design-by-Contract → **#1355** (`require` failure = misuse/error; `ensure` may reference `old`; invariants checked at **stable** RTC configs). #1355 is the safety (`always`) fragment of the temporal language (#1360).
- **The four are distinct** (the manual must keep them apart): `where` = **enabledness** (false ⇒ edge silently unavailable); `require` = **caller obligation** (false ⇒ violation); `ensure` = **machine obligation** after assigns (may read `old`); `invariant` = **always-at-stable**.
- **Violation model:** a contract is a **proof obligation** the verifier discharges (a §17 safety property; counterexample = replayable tape) **and** a runtime **assertion** that fires in unsealed/debug builds and **compiles out under `sealed`/proven**. Contract expressions are total/pure (read props/vals/sensors/payload/`old`). **No contract inheritance/refinement** — FSL composes, it doesn't subclass.

---

## 11. Error model

| Surface | Audience | Form |
|---|---|---|
| `last_error` (`option<Error>`, sticky) + `error_count` | in-machine | read in guards; `Error.kind` finite enum (`div_by_zero`, `out_of_bounds`, `overflow`, `contract_violation`, …); message rich |
| `error` tape | in-language composition | runtime auto-emits on rollback; route into a supervisor machine |
| `rollback` event | host integration | `machine.on('rollback', …)`, joins the existing bus (`rejection`/`override`/`data-change`); carries the **pre-error snapshot** repro bundle |
| error-recovery transitions | behavioral | *(to file)* `require X else -> S;` / `on error where last_error.kind = K -> S;` — failure **routes** to a state (no atomicity violation) |

On any error: **atomic rollback of state + data** (and the in-flight `emit`s), then notify. Rollback is **not** responsible for external hook side effects. No `on rollback` handler (it would break atomicity). `error_count` is monotonic over the machine's lifetime.

---

## 12. Lifecycle hooks (→ #1357)

**Execution model — macrostep / microstep / stable (the keystone).** One external stimulus is processed **run-to-completion**: a **macrostep** is the whole reaction; each transition fired inside it is a **microstep**. Pipeline per external event: *before-macrostep* → select enabled transitions (`where`-guards + resolution order) → **fire** (exit-hooks → `require` → action-hooks + journaled `assign`s → `ensure` with `old` → entry-hooks → raise internal events / enable eventless) → **cascade** (drain internal queue + fire eventless, repeat) until **quiescence** → **stable** (check `invariant`s → **commit** journaled writes + append event to tape → *at-stable*/*post-commit* hooks → observers / serialization see the new state). **Stable = the quiescent config where no transition (eventless or internal-event-driven) is enabled** — the *single* point invariants check at, commit/rollback bracket, post-macrostep hooks fire at, and the tape/observers/serialize see. *Microstep semantics:* simultaneous-enabled order is **explicit priority, document-order tiebreak** — fully deterministic (nondeterminism only via seeded `probabilistic` edges, §15); **internal events drain within the macrostep before the next external** (FIFO, SCXML-style); a configurable **microstep bound faults** on runaway eventless cycles, and the verifier **proves quiescence** for `finite` machines. Fault anywhere → reverse-replay the journal (rollback vals + in-flight `emit`s, §11); external hook effects already emitted are not unwound.

**Machine lifecycle status (#621 / #458) — distinct from the current state.** Above the FSM state sits a machine **status**: *running* → *halted* (terminated — accepts no further transitions; all events rejected), plus the orthogonal *complete* flag (reached a **final/done** state, #1341; markable per-state via `complete`, #1145). Halting is **terminal and observable** — it fires `destruct`/termination hooks, resolves a **termination promise** (#458), and is queryable (`.halted()` / `.complete()`). It's the lifecycle layer the RTC/stable model needs (a halted machine is *permanently* quiescent), and it's why "stopped" can't be just another state: it's a property *of the machine*, not a node in its graph.

Three scopes, all behavioral source constructs: **machine** `on construct`/`on destruct`; **state** `on entry of S`/`on exit of S`; **edge** `assign`/`where`/`require`/`ensure`. Plus the behavioral input-response set: `on any transition`, `on any action` (successful-only), `on rejection(event)` (machine-wide fallback + per-state override; routes a tape-run's rejected symbol). The ~21 *observational* runtime hooks (pre/post `everything`, the global `any-*` observers, edge-kind hooks) stay **API-only** — they watch the machine, they don't define it.

**Named handlers** — a reusable *internal* effectful block (`handler bump = { assign retries += 1; emit log <- "retry"; };`) attached to many transitions by name (`X 'e' -> Y  bump;`). DRY for shared transition logic; the internal dual of named hooks (§14).

**Observational hook surface (scales with the feature set).** Every new *kind of event* — `val` change, sensor read, `emit`/tape write, channel receive, group-boundary cross, contract check (`require`/`ensure`/`invariant`), rollback, **macrostep boundary** (`before-macrostep`/`at-stable`/`post-commit` — the new RTC points), clock tick, stream draw, `construct`/`destruct`, and system-level system-step / wire-fire — is a natural new **pre/post hook target**, roughly doubling the existing ~25. Kept sane by three disciplines: the behavioral-vs-observational line (these *observe*; source *defines*); **pure observers** (post-style, no veto/mutate — that now lives in source `where`/`require`/`assign`), so verification stays clean; and a **generated, uniform registry** keyed by `(event-kind, target, phase)` rather than hand-written pairs. The registry also makes **introspection** first-class — `has_hook(target, phase)`, `hooks_on(state)`, `hooks_on(from→to)` / `(action)` — which is currently *missing* (jssm's per-state `has_hooks(state)` is stubbed/commented, leaving the `hooked_state` viz styling unapplied); the registry completes it. Implementation-phase, per-feature.

---

## 13. Totality & termination
- **Recursion-free by construction** in the checkable tier (no named defs; non-recursive `let`; inline lambdas can't self-name). Closed by **by-value capture** (no recursion through a stored lambda) and **acyclic data** (no cycle-through-slot-assignment).
- **Terminating ≠ total:** throwing ops (div0, OOB, overflow, failed narrow) make functions *partial*; `option`-returning variants (`get`, `int_of`) recover completeness.
- **Microstep bound:** RTC settling is capped (default **100,000 per reaction**, configurable/disable-able) to catch non-stabilizing eventless cycles; *per reaction*, not per tape. Machine-level RTC termination is otherwise #1345's concern.
- First-class lambdas, recursive ADTs, and live-capture would each be a deliberate door into the rich/undecidable tier.

---

## 14. I/O & composition (the transducer / tape model)

- **Input = reactive triggers** in the transition head: `on chan(payload) -> …`; a bare `'action'` = an event on the default channel. **No `consume` keyword** (input drives the machine; it isn't imperatively pulled).
- **Output = `emit chan <- expr`** (active effect; part of the transaction — rolled back with the transition).
- **Mealy + Moore:** emit on edges (Mealy) and on entry (Moore).
- **Named typed channels** (multichannel) — the actor-model ports (#1354); wiring `m1.out -> m2.in` is transducer composition; `|>` pipes output tape → input tape.
- **Sensors** — input-level dual of props; declared, typed, read-only, externally wired to a remote `prop`/host value; level-triggered (pairs with eventless #1350). **Sensor reads are recorded as part of the input source-of-truth** (so replay reproduces sensor-driven runs); over-approximated for verification.
- **Named hooks** — *caller-provided* callbacks the machine `call`s out to (the inverse of `emit`): declared with a typed signature, optionally **`required`** (the caller must supply it at construction, like required `vals` — so a machine's required hooks are its **dependency contract**). Called in action position (`call persist(s, d)`, `assign x := call fetch(id)`); the **return is recorded** (replay-safe, like a sensor read) and **over-approximated** for verification (finite-eligible if the return type is finite). The typed, declared, requireable evolution of jssm's caller-provided runtime hooks.
- **Time = a pluggable, caller-provided sensor** — never live wall-clock. The caller injects the source: default a **clock**; a library **discrete tick source** exposing `.advance`; or custom/outer-world sources (NTP, simulation, game-loop, Lamport). A **single synthetic clock projected into many machines** gives one coherent, controllable timeline across a composed system — deterministic multi-machine simulation and cross-machine temporal traceability. For verification the source declares an **abstract time model** (`monotonic`, `discrete` vs `dense`, optional rate bounds) the checker reasons over and any concrete source must honor — so the language stays time-agnostic rather than baking in discrete-vs-real. Recorded like any sensor (replay-safe); powers bounded temporal properties.
- **Tokenizer = composition** — a lexer transducer `|>` the machine; optional sugar `input source : bytes tokenized_by Lexer;`. The alphabet (#1358) is the token set.
- **Tapes:** **input tape** is the single retained source of truth (bounded ring buffer, default **100,000**, `input_history: N | unlimited`); **output**, **`log`** (user `emit log <- …`), **`error`** (runtime auto-fed) tapes are **not retained** — they regenerate by replaying input. Two standard diagnostic tapes only (`log`, `error`), kept *separate from the main output tape* so verification of the I/O relation isn't polluted.
- **Finite tapes** = terminating runs (easy verification); **infinite streams** = a deliberate later *productivity* tier (liveness/ω-regular, §17).
- **First-class tapes** — *in scope*: tapes are values (`tape of T`), buildable / storable / passable; a machine can build a tape, run a sub-machine over it, and transform tapes in-language. Bounded `tape of T len 0..N` is finite-eligible; unbounded tapes, or running-a-machine-over-a-tape (higher-order, meta-circular with machines-as-values #1354), are rich-tier.

### Multi-machine systems
One string / `.fsl` file may encode **multiple named machines plus their wiring** — the composition model lifted to a top-level **system**, with a bare single machine as the backward-compatible degenerate case.

```
machine Lexer  { … }
machine Parser { … }
import  Auth from "auth.fsl";           % cross-file (the #1352 modularity layer)
wire    Lexer.tokens -> Parser.input;   % output channel → input channel
```

- **Construction — two types, no union; the tag grid (decided 2026-06-10, supersedes the earlier `sm`-untouched/`ms` draft).** Template tags form a 2×2 — language × system, instance × factory: **`` fsl`…` ``** → `Machine` (canonical; **`` sm`…` `` stays as a deprecated synonym**, removal not scheduled in v6), **`` fslf`…` ``** → `MachineFactory`, **`` fss`…` ``** → `System`, **`` fssf`…` ``** → `SystemFactory` (§21). Function forms mirror `from()`: `from()`, `factory_from()`, `system_from()`, `system_factory_from()`. The single↔multi choice lives at the *entry point*, never the return type (a tagged template's return type can't depend on string content). Instance tags throw on unbound `required` vals / unresolved registry names; factory tags defer those checks to `make()`/`at()`.
- **Name resolution — registry core, `import` sugar.** A system compiles against a **registry** (name → machine/system definition or factory); the host API populates it (`.register('Gate', gateFactory)`) — works in browsers, tests, and embedded hosts with no filesystem. `import X from "x.fsl"` (#1352) is file-loader sugar that populates the same registry. The spec defines resolution once; loaders are per-host.
- **`System` is additive** — a named bag of machines + a wiring router + a scheduler. The **per-machine API is delegated** (`system.machine(name).state()/.data()/…` — no re-analogue). The genuinely system-level surface: topology (`.machines`, `.wires`), configuration (the tuple of all current states), stepping (`.step`, **`.advance(clock)`** — the shared-clock crank — `.feed`, `.run(tape)`), whole-system serialization, machine/wire mutation, and the construction/serialization family — `system_from()`, `make_system()`, `compile_system()`, `serialize_system()`, `deserialize_system()` (analogues of `from`/`make`/`compile`/`serialize`/`deserialize`).
- **Shared interfaces** (`Steppable` / `Serializable` / `Renderable`), implemented by both `Machine` and `System`, collapse most of the viz / CLI / web-component fan-out — and the **existing web component detects machine-vs-system** (one element, no separate `<fsl-system>`).
- **Stepping semantics:** synchronous via a **shared clock** (the shared-tick-clock pattern, time above) gives deterministic, replayable multi-machine simulation; async/queued is the alternative — caller-chosen.
- **Verification:** a `System` is the product machine for **cross-machine** temporal properties (compositional verification); its serialization is the system-level repro bundle.
- **Machine-vals — embedding, a second composition axis *beside* Systems.** A `val` may be **machine-typed** (`val sub : machine LexerType`) — a sub-machine held **by value**: owned, parent-driven (the parent's macrostep drives the child), and **snapshotted/serialized with its parent** (just a nested `Serializable` value; the undo-journal nests). This is **HAS-A composition** — the third axis, beside group *hierarchy* (one machine, shared tape/clock) and system *wiring* (peer machines) — and the primitive the **Factory** patterns need (a transition that creates a machine-val = Factory Method; child-type-by-state/payload = Abstract Factory). **It does not subsume `System`**, on topology grounds: embedding is a **tree** (owned, by-value, **acyclic** — no machine contains itself, like recursive ADTs ⇒ rich-tier), while system **wiring** is a **graph** (referenced peers, often **cyclic**: A↔B handshakes/feedback), and a cyclic wiring graph *cannot* be expressed as by-value embedding. So the two sit **beside** each other as distinct policies over the **shared `Steppable`/`Serializable`/`Renderable` + columnar/journal/tape engine** (shared mechanism, distinct policy; consistent with the two-types-no-union decision above). Rule of thumb: **embed when you own it, wire when they're peers.** Verification: a machine-val multiplies the parent's state space (the System product, embedded) — finite iff the child is finite.
- Builds on the actor/event model (#1354) and modularity/imports (#1352).
- **The full orchestration layer — populations, factory-fed members, routes (wiring beyond `wire`), lifecycle (`spawn`/`retire`), failure policy, hierarchical systems-in-systems, and the deterministic queued dispatch — is specified in §22**; parameterized construction (factories, the seed tree) in §21; composed verification in §23.

---

## 15. Determinism & replay
Execution is deterministic; the **seed/stream state is in the serialized snapshot**, so replay reproduces draws exactly. **Repro bundle = state snapshot (pre-error) + retained input tape (events *and* sensor reads) → replay regenerates state, output, log, error.** Serialization is **canonical** (stable key order; includes vals/stream-state/`last_error`/`error_count`; format-version tagged) for cross-host repro equality. This is event-sourcing, and it makes every model-checking counterexample (§17) a runnable tape.

**Version gating (#410 / #1010 / #1056 / #1057).** The snapshot carries both the **FSL language version** and the **machine's own version**; deserialize **refuses an incompatible version by default**, with a deliberate, *loud* override for intentional cross-version loads (never silent). A machine attribute declares its **minimum-supported language version** (generalizing the existing `fsl_version`). This closes the determinism trap the whole replay model exists to prevent: a tape/snapshot from an old binary silently misloading into a different runtime and reproducing the *wrong* execution.

---

## 16. Multi-host
**Targets:** Rust, C, Python, PHP, Ruby, C#, JavaScript now; Lisp, Erlang, Elixir, + dozens later. Because the range spans manual-memory C to single-assignment Erlang, **specify semantics + ship a per-host runtime + a conformance suite is the spec; never borrow host behavior.** Imperative `assign` lowers to SSA/rebinding on single-assignment hosts; first-class lambdas in C = function pointer + immutable closure-env struct; a `finite` machine lowers without the rich runtime. **A function value in serialized state is a defunctionalized `(lambda-tag, captured-data)` pair** — the tag is identical across every host's codegen (so a serialized strategy held in a `val` rehydrates cross-host), captures are portable by-value data; this is what lets function-typed `val`s be snapshotted, hashed, and replayed (§4.4). Tag = content-hash of the normalized lambda AST, so editing a lambda body invalidates old repro bundles referencing it (a versioning concern, like any program change).

**Codegen exports the machine's *type surface*, not just its runtime** (in languages where it makes sense). The state alphabet, event/action alphabet, tape/channel element types, `val`/`sensor`/`prop` types, ADTs, enums, records, and the `Error`/`option` shapes are emitted as **host-idiomatic declarations** — a C header's `enum`s for the state/tape alphabets, TypeScript `type`/`interface`/discriminated-unions, Rust `enum`s/structs, Python `Enum`/`@dataclass`/hints; weaker hosts (PHP/Ruby/Lisp) get constants/hints/docblocks. This is the **compile-time half of the host↔machine contract** (its runtime half is the named-hook interface, which is *also* exported — a TS `interface` / Rust `trait` / C function-pointer struct — for the caller to implement and satisfy the `required` hooks). So host code imports the machine's types, implements the hook interface, and gets the dependency contract checked **at compile time**. A full codegen output is three artifacts: runtime, type surface, and hook interface (plus the package manifest, below). Host identifiers are name-mapped/slugified per host convention.

**Package-name attributes.** A general `package_name` gives the machine's canonical base name; codegen derives each ecosystem's name from it with that ecosystem's normalization. Per-package-manager **override** attributes (generalizing the existing `npm_name`, v5.142.1) take precedence. They are named for the **package manager, not the language** (so `npm` not `node`/`javascript`, `pip` not `python`) — which makes the set extensible per-*manager*, the granularity at which names actually diverge: `npm_name` (JS), `cargo_name` (Rust), `pip_name` (Python/PyPI), `nuget_name` (C#), `composer_name` (PHP), `gem_name` (Ruby) — and additional managers get their own (`jsr_name` for Deno, `conda_name` for conda; yarn/pnpm share npm's name). Each is the *full* ecosystem-specific name (scope/vendor included, e.g. `@acme/x`, `acme/x`, `Acme.X`). Resolution: manager-specific override if set, else `package_name` normalized. Codegen emits the matching manifest (`package.json`/`Cargo.toml`/`pyproject.toml`/`.nuspec`/`composer.json`/`.gemspec`) as a fourth output artifact. (C has no canonical manager → no override.)

**Documentation extraction.** A machine is **self-documenting**: codegen emits **reference documentation** from the source — the state alphabet, transition table, event/action alphabet, the typed `val`/`prop`/`sensor` surface (types + ranges + units), event payloads, the **contracts as documented behavior** (`require`/`ensure`/`invariant` read *as the machine's spec*), error/final states, and the rendered **diagram**. It's the *documentation* analogue of the type-surface export, and requires a **doc-comment syntax in FSL** — prose attached to the machine, states, transitions, `val`/`prop`/`sensor`, events, handlers (e.g. `/// …` or a `doc "…"` annotation) — the FSL parallel of JSDoc/rustdoc/docstrings. Output is host-idiomatic where relevant (docblocks on the generated declarations) **and** a standalone reference (Markdown/HTML) bundling prose + alphabets + typed surface + contracts + diagram. A **fifth codegen artifact** alongside runtime / type-surface / hook-interface / manifest.

**The toolchain itself ships as WASM** (distinct from codegen *targets*): a WASM build of parse/check/run/render runs zero-install in browser sandboxes, code-interpreter contexts, and AI-artifact environments — exactly the constrained places agents execute, which can usually load WASM but cannot `npm install`. The same build powers the website playground and the editor. For a language whose pitch includes AI systems as authors, running where AI systems actually run *is* distribution.

**Target capability negotiation (#1173 / #1172).** Each codegen target **declares the feature set it supports** (a capability manifest — first-class lambdas? 256-bit ints? dense-time? arbitrary precision? threads?). A machine carries a **`targets` directive** naming its intended hosts; compiling **warns — or errors — when the machine uses a feature a declared target can't honor.** This is the *codegen dual* of the verification capability/`disallow` attributes (§3): those bound what the **checker** may assume, this bounds what a **host** can emit. Target plugins self-advertise their abilities, so the matrix is data-driven and new targets describe themselves. So `targets: c, erlang;` lets a user learn at compile time that, say, their `double` math won't lower faithfully to a fixed-point-only target — rather than discovering it as a silent runtime divergence.

---

## 17. Verification & temporal properties (→ #1360)
Finite-state + ω-regular = **decidable** (PSPACE in formula, linear in machine size). **Safety** (`always` / invariants #1355) = reachability (cheap, finite-trace counterexamples). **Liveness** (`eventually`, `leads-to`, `always eventually`, `eventually always`, `forall eventually`, `until`, `weak-until`, bounded `leads-to[within N]`, `exists eventually`, `release`) = Büchi product + accepting-cycle detection (lasso counterexamples). Plus **past operators** (`once`, `since`, `historically`, `previously`) — equi-expressive with future-LTL but more succinct, and ideal for **runtime monitoring** over the recorded input tape. **Probabilistic verification** is in scope: weighted/`probability` transitions make the machine a Markov chain / MDP, checked with **PCTL** (`P>=0.99 [eventually Done]`, expected-cost), PRISM/Storm-style. Phasing: **safety → bounded-temporal → liveness (Büchi) → probabilistic.** Dense-time (timed automata, #1361) and probabilistic timed automata (#1362) are their own issues. Every counterexample is a replayable tape (§15).

**Tree automata — verifiable validators & type-checkers (the `tree` model class, §3; #492).** Under `tree`, a machine consumes a **recursive-ADT tree** instead of a linear tape: a **bottom-up** run where each node's state is a function of its constructor + its **children's result states** (never their subtree values), accepting on the root — a schema validator / AST type-checker, expressed as a machine. A **finite** state carrier makes it a **finite tree automaton** over a **regular tree language**, so emptiness / membership / inclusion stay **decidable** — a general recursive fold would be rich-tier; the finite carrier *is* the guarantee (the tree analogue of `finite`). Practical wrinkles: there's **no single "current state"** mid-run (a *frontier* of node states), hooks fire **per-node** (not per-step), and the **post-order** traversal is pinned for deterministic replay. The tree is handed in whole or piped from an upstream parser machine.

**Tree transducers (the output dual).** Because FSL is a transducer (input→output, §14), the linear case is a *string* transducer and `tree` makes it a **tree transducer**: `emit` at each node assembles an **output tree** from the children's output fragments. This is the formal model for **compiler passes / AST transforms / XSLT-style rewriting**, and — type-checked against input/output tree automata (decidable for useful transducer classes, expensive/limited for the most expressive) — yields **provably schema-/type-preserving** passes. It's also the principled basis for the deferred transcompile feature (#4): FSL→SCXML/XState is a tree transducer over ASTs. Caveat: *recognition* (accept/reject) is the clean case; general transducer *equivalence* can be undecidable, so output-side guarantees are a finer sub-tier than input-side recognition.

**Error states** — tagged via a state-declaration member (`state Crashed: { error; }`, the *local* form of the `failed_outputs` machine attribute) — are designed domain-level failure configurations (distinct from runtime faults / the `error` tape). They give the checker a built-in safety target (`always not in(error)` + error-state reachability) and a terminal-state taxonomy alongside final/done (#1341), and feed `.in_error()` / `.is_failed()`.

**Weighted start states & statistical model checking.** Start states may carry **weights** — `start_states: [a 30% b 70%];`, the **same weighted-`LabelList`** as probabilistic list targets: `start_states` already takes a `LabelList` (`[a b c]`, grammar `ConfigStartNodes`), so per-member `%` falls out for free. A start list has **no origin side**, so there's no outer group weight — the member weights *are* the **initial distribution** (μ₀), normalized to 1 across the start states (uniform if omitted → `[a b c]` = ⅓ each). Companion to weighted transitions, together making the machine a full Markov chain. A **seeded random walk** samples that chain (jssm already has `probabilistic_walk` / `probabilistic_histograph` over a SplitMix32 RNG); with the seed in serialized state, walks are **reproducible** and a failing walk is a repro bundle. Random walks give a **statistical / Monte-Carlo verification tier** that *complements* exact model checking: it estimates probabilistic & temporal properties cheaply, works on **rich-tier** machines where exact checking is undecidable, and doubles as **test-tape generation** (coverage-guided walks) and **cheap counterexample search** (adversarial/property-directed walks). Full-surface walks also fuzz the new input space — random sensor reads, events, and payloads, not just transition choice. Weights normalize to 1; negative/NaN = error; the seeded draw is recorded/replayable; non-probabilistic `finite` checking over-approximates the start set.

**Testing toolkit & model-based testing.** FSL ships **user-facing test tools**, all powered by the verification stack: **unit** assertions (`reaches`, `blocked`, `reachable`/`unreachable`, property checks) — where a "unit test" can be a *model-check over all paths*, not one example, failing with a replayable counterexample tape — and **stochastic** tools (random walks, statistical MC with confidence intervals, coverage, **shrinking** to a minimal failing trace). The capstone is **model-based testing**: the FSL machine is the *model / oracle* for a real stateful system — `val`s are the expected shadow state, `require`/`ensure` are pre/postconditions, **named hooks bind the model's transitions to the real system's operations**, and random walks generate command sequences run against both, comparing results and shrinking failures. FSL is unusually suited to be that model because it is *simultaneously* an executable oracle, a formally verifiable machine, and a visualizable diagram — which no host-language MBT framework offers. **Concolic guidance** reuses the verifier's SMT solver to *steer* walks into deeply-guarded states (solve `where`/`require` constraints for inputs pure randomness can't hit) — so verification and test-generation share one engine.

**Test-authoring surface.** Two surfaces: **in-language `test`/`expect` blocks** (declarative, in the `.fsl` — portable, codegen-exported, and themselves **verifiable**: `test reaches Done;`, `test never violates invariant;`, `test inputs [a b] outputs [x y];`) and the **host API** (integration + the MBT glue). **Assertion vocabulary:** `reaches`/`blocked`/`reachable`/`unreachable`, property checks, **invariant-holds**, **contract-never-violated**, **temporal** (LTL, above), **I/O-relation** (tape in→out), **determinism/replay-equivalence**, **coverage thresholds**. **Tests are tapes** — a shrunk failing walk serializes to a permanent regression case (the repro bundle *is* the test; a saved tape replays as a unit test). **Coverage is FSM-shaped:** state / transition / path / guard-condition (MC-DC); user suites may split **unit (exhaustive/model-check) vs stochastic (walk)** the way this project's own suites do. Testing ≡ the verification continuum (example → exhaustive → statistical), one assertion serving all three tiers per the machine's checkability.

**Modelable formalisms (the automata zoo).** FSL models a large swath of state-machine-adjacent formalisms **as configurations of existing features**, not as bolt-ons:
- **Systems + wiring + actor model (§14):** protocol state machines; **session types** (a channel's machine *is* the type; conformance = a verification query); **CFSMs** (bounded channels decidable; unbounded → Turing); **I/O & interface automata** (composition + compatibility checking); **workflow nets / BPMN / DMN** (token concurrency = `petri`, gateways = pseudostates #1342, pools/lanes = wired participants, decision tables = guards); **cellular automata / boolean networks** (synchronous wired grid — suits columnar batch-stepping); **synchronous languages** (Esterel/Lustre = the shared-clock `System`); **ladder logic / PLC** (synchronous cyclic-scan transducer — factory automation); **DEVS** (the canonical discrete-event-simulation formalism — Systems + time + hierarchy); **hardware / sequential-circuit FSMs** (Verilog/VHDL, MATLAB **Stateflow** — synchronous + registers); **consensus protocols (Raft / Paxos)** (specified *as* state machines — a CFSM / `System`); **SFC / Grafcet** (IEC-61131 sequential function charts — Petri-flavored structured PLC control; ladder-logic's sibling); **CMMN** (case management — BPMN's less-structured sibling).
- **Model-class ladder (§3):** **regex** (`regular`); **CFGs / parsers / recursive state machines** (`pushdown`; RSMs *are* pushdown systems); **visibly-pushdown / nested-word automata** (a more-decidable pushdown refinement — XML & call/return traces); **one-counter automata**; **Petri / workflow nets** (`petri`); **tree automata / attribute grammars** (`tree`; synthesized attrs = bottom-up, inherited = top-down); **colored Petri nets** (`petri` + a *typed* `bag<T>` — tokens carry data); **behavior trees** (game-AI / robotics — a `tree` of tasks ticked synchronously; sequence/selector/parallel nodes = gateways); **decision trees / BDDs** (`tree`; BDDs are the verifier's *own* data structure).
- **Weighted / probabilistic (§17):** **Markov chains / MDPs / Markov-reward**; **weighted automata** (generalize probability's semiring — tropical/min-plus = cost & shortest-path); **Hidden Markov Models** (states emit observations probabilistically); **reward machines** (an FSM encoding a reward over histories — RL).
- **Transducer / tape (§14):** **Mealy / Moore**; **finite-state transducers**; **tree transducers** (`tree`); **two-way automata** (head re-scans — needs a repositionable tape); **L-systems** (Lindenmayer — *parallel* rewriting, every symbol rewritten at once; stretches the model — a research corner).
- **Vals as registers:** **register / data automata** (vals over an infinite domain + equality tests).
- **Verification-native (§17):** **Kripke structures / labeled transition systems** (states + props — what the checker sees); **Büchi / ω-automata** (liveness); **alternating automata** (the verifier's internal tool).
- **Groups + history (§19):** **statecharts / Harel / UML / SCXML**; **Stateflow** (MATLAB/Simulink control statecharts).
- **Specification family & the inverse (synthesis):** FSL + contracts (`require`/`ensure`/`invariant`) is a lightweight, *executable, visual* member of the **TLA+ / Event-B / B** family (state + invariants + next-state relation). The **inverse of verification** — generating a machine *from* a spec — is adjacent rather than a zoo member: **reactive / LTL synthesis** and **supervisory control** (Ramadge–Wonham) produce a machine from a temporal/safety spec (ties to parity **games**); **automata learning** (Angluin **L\***) *infers* a machine from a black-box oracle (ties to MBT, §17).
- **Deferred / non-fits (not claimed):** *(deferred)* timed automata (#1361), probabilistic timed automata (#1362); *(off-model — continuous ODE dynamics)* hybrid automata (discrete skeleton only); *(beyond the totality ceiling)* π-calculus / mobile process calculi (need dynamic spawn/rewiring), unbounded-channel CFSMs, full Turing machines.

**Meta:** these are *coordinates* in a small feature space — **memory shape** (the ladder) × **communicating copies** (systems) × **weights** × **I/O shape** (transducer) × **registers** (vals) — *recovered*, not implemented. Same story as "GoF patterns are features" (§1) and the automata ladder (§3).

---

## 18. Concurrency
**Composition-first** — separate machines, each owning its `val`s, wired by channels: race-free, compositionally verifiable, zero hot-path cost. This is the concurrency model of this spec. **Parallel regions** (#1353) are an **open question — no decision is made here**; composition is the present answer, and the engineering analysis (on-the-fly configuration vs. product-flattening under dynamic edges, plus the perf/verification trade-offs) is left to #1353 for when it's taken up. Explicit nondeterministic *choice* is **rejected** — `rand`/`sensor` over-approximation already gives verification-time nondeterminism while preserving runtime determinism.

---

## 19. Overlapping state groups

Extends FSL's existing `NamedList` (`&group : [a b c];`) from a fan-out transition-target alias into a first-class, **ordered** *state group* with shared behaviour. **Strictly more expressive than hierarchical states** — and able to represent Harel statecharts — because it captures *both* depth (nesting) *and* non-hierarchical **overlap** (multi-membership), the latter being something neither a hierarchy tree nor orthogonal regions can express. (Native *compact* orthogonality remains the separate parallel-regions axis, §18.)

- **Syntax:** `&group : [members];` — colon, *not* `=` (the `=` spelling, tracker #244, was rejected for grammar reuse). Every *reference* carries `&` (`&busy 'CANCEL' -> idle`) so group names never collide with state names.
- **Overlap + nest, no flattening.** A state may belong to many groups; a group may contain states *or* groups. The compiler keeps an **ordered group→group graph**, resolves transitive membership lazily, and **rejects cycles** (DAG check). Members use **`&child`** (nest — sub-group preserved for precedence/rendering) vs **`...&child`** (spread — flattened, identity erased).
- **Groups gain behaviour:** transition sources (`&busy 'e' -> x`), default state metadata, **boundary (enter/exit) hooks** that fire on crossing the group's *transitive* boundary, and runtime membership queries (`in(&group)`, `groupsOf`, `statesIn`).
- **Group config objects** — a group takes a `{ … }` config block exactly like a state, applied to **all members**, in either form: inline `&colors : [red green yellow] { shape: circle; };` or separate (`&colors : [red green yellow];` then `&colors : { shape: circle; };`). Disambiguated by bracket after the `:` — `[…]` = members, `{…}` = config (same `:` as NamedList; the `=` spelling is *not* used). It's the **group-metadata tier** of the cascade above: a state-specific config beats a group's, and the nearer/deeper group wins on conflict.
- **Deep apply, depth-specificity.** Applying a transition/metadata/hook to a group hits all transitive members; on conflict the **deepest/nearest group wins**, equal-depth ties by declaration order, and a **state-specific definition beats any group**.
- **One unified config cascade:** theme → `state: {}` (the root group ⊤ over all states) → per-kind defaults → group metadata by **nesting depth** (inner wins) → per-state config, with `active_state` as a runtime overlay. The same machinery drives new `transition: {}` (edge defaults) and `graph: {}` (Graphviz graph defaults, superseding the scattered graph-level keys as deprecated aliases).
- **Per-group history slots** — multi-membership states keep independent history per group.
- **Verification tie-in:** `in(&group)` is a first-class predicate for guards and temporal properties; combined with error-state tagging (§17) and group boundaries, the checker reasons over membership directly.

Major-version change. A complete task-by-task implementation plan exists; it predates this session's jest→vitest migration and needs that refresh before execution.

---

## 20. Phasing (implementation)
1. **Phase 1 — `val` scalar core**: declarations + type validation + accessors + `set_val` (the committed Phase-1 plan, scalar types).
2. **Phase 2 — expressions**: full type system, operators, pattern matching, container protocol, lambdas, `assign`, `where`, math/stdlib, string model, error model.
3. **Phase 3 — contracts, I/O, verification**: #1355 contracts, the tape/channel/sensor I/O model, #1360 temporal properties (safety first).

**The factories/systems track (F-phases) interleaves:**

| Phase | Needs | Delivers |
|---|---|---|
| **F1** | Phase 1 | `factory` block (literal bindings + `seq()` + identity targets); `fsl`/`fslf` tags + `sm` deprecation; `Factory` API; seed tree + `derive()` with vectors; cursor semantics. *Factories useful from here.* |
| **F2** | Phase 2 | Full generator expressions; `rand()` bindings; eager `with()` type checking. |
| **F3** | F2 + Phase 3 I/O (#1348/#1358) | Declared channel alphabets + `emit` pipeline slot + rollback semantics (the §14 model, implemented). |
| **F4** | F3 | `system {}` blocks; registry + `import`; routes incl. observation sugar + `on action`; system output channels; queued dispatch; `spawn`/`retire`; failure policy; `fss` tag. |
| **F5** | F4 | System factories (`fssf`, mostly free by symmetry); hierarchy (§22.4); serialization of both; system `finite` enforcement; CLI surface (§25). |
| **F6** | F5 | Composed-system checker (§23): bounds/contracts/deliverability; system `invariant` + aggregates; opt-in deadlock; executable counterexamples. |

jssm-viz structural system rendering (§24) is a parallel cross-repo track keyed to F4/F5. CLI verb phasing per §25.

---

## 21. Factories & parameterized construction

*(Folded from the 2026-06-10 factories/systems spec; recast onto this spec's vocabulary. Resolves fsl#413/#430/#431/#443/#459.)*

A machine's `val` declarations are its **parameter surface**: a `required` val with no `default` is an unfilled parameter. A **factory** is a binding layer over a parameterizable document — per parameter, a fixed value or a generator expression — deterministic, curryable, serializable. Machine documents and system documents are both parameterizable (`val`s + optional `factory` block), so **factory semantics are defined once** and system factories fall out by symmetry.

### 21.1 The `factory` block

```
// customer machine
Entering -> Queuing -> Riding -> Leaving;
Riding 'done' -> Leaving    emit left <- satisfaction;

val name         : string            required;
val patience     : int 0..100        default 50;
val satisfaction : int 0..100        default 70;
val tier         : enum(kid, adult)  required;

channel left : int 0..100;            % declared output alphabet (#1358/#1348 syntax, settled jointly)

factory {
  seed 1234;                          % optional; else supplied at construction (§21.2)
  name          <- "Cust ${seq()}";
  patience      <- rand(20, 95);
  instance_name <- "customer_${seq()}";
  % tier left unbound: must be supplied at with()/make()/at()
}
```

- At most **one** `factory` block per document (the document's canonical factory; alternates are built API-side via `.with()` or registered under other names).
- Binding an undeclared name or a type-mismatched expression = compile error; binding a non-`required` val overrides its default.
- **Reserved identity targets:** `instance_name` (fsl#430), `machine_name` (fsl#431), `start_at` (a literal declared start state — fsl#443; start-state weights §17 still apply when `start_at` is unbound), `seed` (the instance's RNG seed; defaults to a derived value).
- **Factory-block-only builtins:** `seq()` = the instance index *n*; `rand(lo, hi)` seeded from the seed tree. Bindings may read earlier bindings only (declaration order; no cycles).
- **Construction-time `rand` is free** under the §3 over-approximation rule — it picks initial values inside declared val domains the checker verifies over anyway, so **stochastic factories emit fully `finite`-eligible machines**.

### 21.2 The seed tree (determinism for construction)

One rule: **a seed is sampled only at the root; every other seed is derived**, by a spec-fixed `derive(parent_seed : uint64, label : string) -> uint64` (working candidate: FNV-1a 64 over the label, mixed through one splitmix64 round; pure uint64 ops, no host RNG, test vectors in the conformance suite — the §15 pinning principle applied to construction).

```
system seed
 └─ derive(sys_seed, "<member name>")   → population-factory seed
     └─ derive(factory_seed, "<n>")     → instance n's seed
         ├─ derive(instance_seed, "<k>")          → k-th rand() call site
         └─ derive(instance_seed, "machine_rng")  → the instance's RNG stream seed
```

`at(n)` is therefore bit-identical across hosts, runs, and time — instance 42 of seed 1234 is a *coordinate*, not an anecdote — and disjoint index ranges of one population build in parallel with zero coordination. **Unseeded roots:** the host samples its clock **once, at the root only** (ms since Unix epoch as uint64); the sampled value **becomes the recorded seed** (readable via `.seed()`, serialized, CLI-printed), so even unseeded runs replay after the fact.

### 21.3 Pure core, cursor sugar, currying

- `at(n, overrides?)` — pure; cursor untouched. `make(overrides?)` — `at(cursor)`, then cursor += 1. `seq()` = *n*.
- `with(bindings)` → a **new** immutable factory; validates names/types **immediately**. `make()`/`at()` validate **completeness**: unbound `required` vals throw `UnboundParameterError` (a `JssmError` subtype) listing **all** missing names.
- Host-callback bindings are allowed but rich-tier: not portable, not serializable.
- **`Factory` contract** (machine and system factories alike): `.with() .make() .at() .unbound() .seed() .cursor() .bindings() .serialize()`. Serializes as `{ source_hash, bindings (FSL expression source), seed, cursor }` — portable JSON, since bindings are FSL text, not host closures.
- **Relation to machine-vals (§14):** machine-typed vals give the GoF *Factory Method* (a transition creating an owned sub-machine); document factories are the *population* factory (factory_girl / stochastic-tester). Different layers, deliberately: one is in-language behavior, the other is parameterized construction.

---

## 22. Systems in full: populations, routes, lifecycle, failure

*(The orchestration layer over §14's system primitives. A system block lives in a `.fsl` file alongside `machine {}` blocks and `import`s — no separate file extension.)*

```
import Customer from "./customer.fsl";

system Park {

  val n_customers : int 0..500 default 200;

  customers : many Customer via factory  count n_customers max 500;
  gate      : one  Gate;
  kids      : one  KidsSection;            % a member *system* (§22.4)

  channel closed : string;                 % this system's own output channel

  wire gate.tick -> kids.tick;             % plain channel→channel (§14)

  on customers.left(s)        -> gate 'depart'(s);      % channel route (the primitive)
  on gate enters Closed       -> customers 'hurry';     % observation route (sugar)
  on gate.admit               -> spawn customers;       % lifecycle verb
  on customers enters Leaving -> retire sender;         % lifecycle verb
  on gate enters Closed       -> emit closed <- "day end";  % writes our output channel
  on action 'hurry'           -> customers 'hurry';     % our inbound action surface

  on_undeliverable: error;                 % error | drop | dead_letter

  invariant count(customers) <= 500;       % system invariant (§23)

  factory {                                % a system factory binds these (§21)
    n_customers <- rand(50, 400);
  }
}
```

### 22.1 Members & populations

- `name : one Defn;` — singleton, from `Defn`'s factory if present, else defaults; unbound required vals = instantiation error.
- `name : many Defn via factory count <expr> max N;` — a population fed by `Defn`'s factory (`via OtherName` selects a registered alternative). `count` = initial size (expression over system vals); `max N` is the hard bound — **required for a `finite` system** (§23), runtime-enforced (a `spawn` beyond `max` is an undeliverable).
- Systems declare `val`s and may carry a `factory` block (§21) — system vals are readable in `count` expressions and route selectors.

### 22.2 Routes

`on <source-fact> -> <target> <delivery>;`

- **Source facts:** `member.chan(bindings)` — a member's channel emission, the primitive; `enters S` / `exits S` / `takes 'a'` — **observation sugar** (the system synthesizes an internal record from the observed fact, same plumbing underneath); `on action 'name'` — the system's own inbound action (its declared action surface; deliveries naming anything else are undeliverable).
- **Targets:** a `one` member; a population (broadcast, member-creation order); a filtered population — `-> customers where patience < 20 'leave_now'` — `where` evaluated per member over its vals/props/current state. Same expression language.
- **Deliveries:** `'action'(payload-expr)`; a lifecycle verb (§22.3); or targetless `emit chan <- expr` writing the enclosing system's own output channel.
- **`sender`** is the single reserved context name (the member whose fact fired the route); no computed member references — identifier slots stay non-computed, routes stay statically analyzable.
- `wire a.out -> b.in` (§14) remains the direct channel→channel form; routes are the general form. One delivery semantics underneath.

### 22.3 Dispatch, lifecycle, failure, time

**Dispatch — deterministic queued (the async model of §14, fully specified).** The system owns a FIFO queue of pending deliveries. (1) An external stimulus begins a **system step**. (2) The target machine runs one full **macrostep** (§12) — emissions during it enqueue in write order; a rolled-back macrostep enqueues nothing. (3) The system pops the queue head, evaluates routes in **document order**, delivers (broadcasts in member-creation order); each delivery is itself a macrostep (back to 2). (4) The step ends at **system quiescence** (queue empty). A **queue-depth bound** (the system-level sibling of the §13 microstep bound; *draft default 10,000, flag for review*) faults runaway cascades. No re-entrancy is possible; same seed + same stimuli ⇒ bit-identical run. Shared-clock synchronous stepping (`.advance`, §14) remains the alternative the caller may choose; the queue model is the default.

**Lifecycle:** `spawn <population>` stamps the next instance from the population's factory (cursor advances inside the dispatch loop — deterministic); `retire sender` / `retire <member>` removes a member (queue items targeting it follow the undeliverable policy; `seq()` indices are never reused). Host API mirrors both.

**Failure:** `on_undeliverable: error | drop | dead_letter;` — default **error** (loud beats silent). Undeliverable = action not permitted in the target's current state, contract rollback, or retired target. `dead_letter` appends the failed record (source, target, reason) to a system-owned **dead-letter tape** — a third standard diagnostic tape beside `log`/`error` (§14), system-scoped, inspectable via `.dead_letters()`.

**Time:** the system projects one caller-provided time source into every member (§14's shared-clock pattern) — virtual-clock testing of a whole park is the single-machine trick, system-wide.

### 22.4 Hierarchy: systems as members

The member contract is **actions in, channels out** — and a system has both: its `on action` routes are its inbound surface; its declared output channels are its outbound. So `kids : one KidsSection;` works when `KidsSection` resolves to a registered *system*; `many` + system factories give populations of systems. **Dispatch nests hierarchically:** a delivery to a member system enters via its `on action` routes and runs *its* dispatch loop to quiescence (own queue, own depth bound); emissions on its output channels during that processing enqueue into the **parent's** queue in write order. Determinism composes. **Composition is a tree, compile-enforced** (registry resolution rejects recursive composition) — wiring *within* a level may be cyclic (A↔B, §14); *containment* may not. The seed tree (§21.2) extends with no new rules. Member systems serialize recursively as nested snapshots (§15: system snapshot = definition hash + registry names + member states + population cursors + queue + dead-letters + root seed; replay-equality is a conformance test).

**System API:** `.member(name)`, `.members(name)`, `.action(member, action, payload?)`, `.spawn()`, `.retire()`, `.register()`, `.dead_letters()`, `.seed()`, plus the §14 surface (topology, configuration, stepping, serialization family).

---

## 23. Composed-system verification

*(Extends §17 to systems; phase F6 in §20.)*

A system may declare **`finite`** when: every member definition (machine or system) is `finite`-eligible, every population declares `max N`, and the queue-depth bound is declared — compiler-**enforced**, like the machine attribute, so the composed artifact is *finite by construction* (the `checkable`/SMT band applies compositionally when members are large-finite). The checker verifies, over member states × val domains × population sizes `0..max` × queue contents up to the bound:

1. **Bound safety** — queue depth and population `max`es unviolable from any reachable configuration.
2. **Contract safety** — member `invariant`/`require`/`ensure` lifted compositionally.
3. **Deliverability** — under `on_undeliverable: error`, no reachable dispatch is undeliverable (the point of static routes).
4. **System invariants** — `invariant <expr>;` over member aggregates via four system-context-only builtins: `count(pop)`, `all(pop, pred)`, `any(pop, pred)`, `sum(pop, expr)`.
5. **Liveness (opt-in)** — deadlock detection, per §17's temporal machinery; system-level temporal properties are §17 over the product.

**Counterexamples are stimulus tapes** (§15) — executable reproduction scripts, replaying bit-identically on any host.

---

## 24. Visualization model (systems)

Normative structural model; implementation in jssm-viz + the CLI render path. A system renders as nested **clusters**: each `one` member a cluster containing its machine graph; a population one representative cluster with a **badge** (`×200 / max 500`); member systems nest (the composition tree **is** the cluster tree). **Routes are inter-cluster edges** — anchored at the state for `enters`/`exits` sources, at the cluster boundary for channel/action sources, labeled with channel/action name, `where` selectors as edge decorations; output channels render as boundary port nodes; the dead-letter tape as a sink when enabled. Builds on the 5.143 group-cluster machinery (§19) — members are clusters with different framing, not a new engine — and composes with the SVG id/class/`::part()` styling hooks (§27 decision log). Live/runtime rendering (state heat, queue depth, population counts) is deferred viz-side work.

---

## 25. The CLI

The existing git-style dispatcher is unchanged (`fsl <verb>`; built-ins reserved; any `fsl-<verb>` on PATH is the plugin seam). Every verb sits on the config loader (branch `feat_26-05-22_fsl-cli-config_631`, whose Tasks 1–11 survive untouched); config gains a **`registry:`** section (name → file) consumed by every name-resolving verb.

| Verb | Role | Notes |
|---|---|---|
| `render` | documents → images (exists) | targets incl. **`ascii`** (deterministic text-art graphs — terminals, diffs, text-only models); grows system rendering (§24); `--watch` live-reload |
| `make` | stamp instances from factories | `--bind k=v`, `--seed`, `-n`/`--at n`; emits §21 serializations |
| `run` | drive a doc from a stimulus file | JSONL stimuli in, channel records out; `--snapshot`/`--restore`; **the replayer**; `--require-profile <p>` refuses documents not satisfying a §3 capability profile (sandboxed agents verify-before-run, §25.1) |
| `check` | `finite` validation; §23 model checking | counterexamples = stimulus files `run` replays; `--narrate` renders the counterexample as prose steps (the §16 prose generator pointed at a trace); **`--emit-certificate`** produces a portable verification certificate (below); meaningful exit codes |
| `test` | user-facing test runner | a test = `(document, seed, stimuli, expectations)` — the §26 vector format, user-aimed; runs the §17 `test`/`expect` blocks |
| `repl` | interactive session | send actions; watch state/vals/queue/populations; **sessions record as stimulus files** |
| `lint` | warnings beyond errors | unreachable states, unused vals, suspicious routes; rule list = drafting detail |
| `format` | canonical formatter | comment-preserving round-trip via the 5.143 parser source locations |
| `parse` | dump parse tree / compiled config JSON | the tooling seam for editors, plugins, bug reports |
| `config` | print resolved config with provenance | files discovered, extends chain, winning layer per key |
| `import` | SCXML / xstate / mermaid / dot → FSL | lossy conversions marked |
| `export` | FSL → SCXML / xstate / mermaid / JSON | tool interchange; plus **grammar artifacts** (`--target gbnf`/`lark`/`ebnf`) — the versioned machine-readable grammar, for constrained decoding (inference stacks force syntactically valid FSL from any model, including small local ones) |
| `codegen` | FSL → host source (§16 artifacts) | targets = plugins declaring abilities + certified tier (§26, #1172/#1173); `--certify` runs conformance |
| `publish` | package as a module (fsl#407) | npm first; wraps codegen + manifest; **never touches a registry without explicit confirmation** |
| `init` | scaffold project / config / registry | `--example <cookbook-pattern>` starts from a known-good cookbook machine — agents (and humans) edit valid artifacts far more reliably than blank pages |
| `docs` | per-document human documentation | the §16 documentation-extraction artifact, standalone; `--interface` emits the **interface card** — states, action alphabet, typed channels/vals, contracts, profiles in a few hundred tokens (the `.d.ts` of a machine; §16's type surface for *readers under a token budget*) |
| `diff` | semantic diff of two document versions — or two **runs** | documents: states/transitions/vals/routes added/removed/changed; tapes/bundles: first divergence step and what differed (input, seed, version, val state) — regression forensics, free because serialization is canonical |
| `walk` | seeded walks / statistical tier (§17) | statistical MC w/ confidence intervals, coverage-guided tape generation, full-surface fuzzing, adversarial counterexample search, **shrinking**; the stimulus *generator* feeding `run`/`test`/§26 vectors |
| `inspect` | read-only repro-bundle / snapshot / tape reader | seed, FSL + machine versions, digest, event count, §15 compatibility verdict — see *why* a bundle is refused before trying it; `--narrate` renders any tape as prose steps |
| `lsp` | language server (stdio) | completions from declared alphabets (#1358/#1359), live diagnostics/format over the same `lint`/`parse`/`format` internals; one verb instead of N editor plugins |
| `mcp` | MCP server (stdio) | exposes the verb set (parse/lint/check/run/walk/render/make…) as MCP tools for AI agents — the agent-facing twin of `lsp`, same internals, different protocol; also **time-travel debugging**: attach to a snapshot+tape and expose `state_at(step)` / `why_rejected(step)` / `val_history(val, member)` / `diverges_from(tape)` — a conversational debugger over total replay, no live process needed |
| `explain` | error-code explainers | rustc-style: stable error codes (`E0042`), each with a canonical explanation + before/after example, at stable URLs reachable from llms.txt; `--json` errors carry the code — any agent self-teaches at the moment of failure |
| `list` | project discovery | enumerate the documents/machines/systems a project contains (via config/registry), `--json`; ends the waking-up-in-an-unfamiliar-repo dance |

**Verb boundaries:** `render` = images for eyes; `codegen` = executable source for hosts (the `host:library` coordinates — `native:*` = certified runtime, T1–T3; **adapter** targets = xstate/stent/boost:msm/… per the FeatureComparison matrix, declaring feature subsets per #1172); `import`/`export` = tool interchange; package *fetching* is not `import`'s job.

**The `publish` bundle:** module code + manifest + generated `README.md` + an HTML render + PNG and SVG renders (via `render`/`docs`) + — when the document checks — its **verification certificate**. The README and HTML carry a small, unobtrusive attribution link to the FSL website and GitHub repo (footer/badge placement) — every published machine quietly points home (SEO). A certificate-bearing README can state, truthfully and checkably, *"these properties are proven for this exact source."*

**Verification certificates (proof-carrying machines).** `check --emit-certificate` produces a small, portable, sign-able record: **document `source_hash`, properties verified, checker version, verifiability tier, result** — an attestation that *this machine, at this hash, was proven*. CI verifies the certificate without re-running the (possibly expensive) check; an agent receiving a machine confirms what was proven, by what, against what, before composing with it. The proof-carrying-code idea, sized for state machines — in an ecosystem where agents exchange machines, **the certificate is the trust currency**, and it makes §25.1's "the verifier vouches for it" literal: an artifact, not a slogan. A certificate is invalidated by any source change (the hash) or checker change (the version); re-certification is one command.

**Agent verb contracts (cross-cutting — AI agents are first-class CLI users; these are contracts, not conveniences).** Every verb supports **`--json`**: structured results where errors carry source spans (the 5.143 parser locations), the expectation, and a **`suggested_fix`** patch field; `check --json` embeds its counterexample tape **inline**; `lint`/`diff`/`test` findings are structured. Every verb is **non-interactive-total**: no TTY assumptions, meaningful exit codes, an explicit flag wherever confirmation exists (`publish --yes`), and human prose never mixed into `--json` stdout. **`parse → format → parse` is idempotent**, guaranteed and conformance-tested, so mechanical editors rewrite files without fear. **Every `--json` result carries the document's `source_hash`** — a stated contract, so any client (agents, the LSP, CI) can memoize any analysis across sessions and across agents sharing a cache. **Long-running verbs accept budgets** (`check`/`walk`/`codegen --certify`: `--budget <time>`, `--max-configurations`) and exhausting one returns a structured **`undecided`** result with partial findings — a first-class third answer beside pass and fail, so an agent loop never hangs (narrow scope, drop to `walk`, or escalate — the caller decides, informed). **`fsl --capabilities --json`** self-describes the toolchain: verbs, version, installed codegen targets and their certified tiers — discovery instead of flag-guessing for non-MCP clients.

**Flows:** `check` → counterexample → `run` (two-command reproduction); `repl` → recorded session → `test` (interactive discovery becomes a regression file); `walk` → shrunk failing tape → `test` (a fuzz find becomes a permanent regression); factories → `walk` → vectors → `codegen --certify` (§26); any refused bundle → `inspect` (see why).

**Protocol servers:** `lsp` and `mcp` are thin stdio adapters over the same library internals as the one-shot verbs — editors and AI agents respectively become clients of one implementation rather than reimplementing N integrations. If `mcp` outgrows stdio (hosted/HTTP), it spins out to its own package then — same door as codegen targets.

**The FSL Claude plugin (separate repo; ecosystem, not CLI).** A standalone Claude Code plugin repo — self-publishing single-plugin marketplace (`/plugin marketplace add <owner>/<repo>` + `/plugin install`), per the 2026-05-22 scaffold plan — whose v0.1 is one `SKILL.md` teaching Claude idiomatic FSL, with `commands/`/`agents/`/`hooks/` later. Two of that plan's deferred decisions are **resolved here**: the plugin's MCP component is **configuration, not implementation** — an `.mcp.json` launching `fsl mcp` (this section), so the plugin never reimplements tooling — and there is **no LSP-wrapper repo**: `fsl lsp` is the language server, editors configure it directly. The skill's body (mental model, idioms, pitfalls Claude gets wrong, tooling commands) derives from the manual-topics syllabus. The scaffold *procedure* lives in the plugin-dev skills (which the plan itself deferred to as authoritative).

**Verb phasing:** `lint`/`format`/`parse`/`config`/`init`/`explain`/`list` are parser/loader-only, land early; `lsp` follows them; `make`/`run` ride F1–F5 (§20); `check` rides F5/F6; `test`/`repl`/`walk` follow `run` (`walk` rides the existing seeded `probabilistic_walk` machinery); `inspect` follows serialization; `mcp` once the verb surface stabilizes; `import`/`export`/`docs`/`diff` independent; `codegen`/`publish` are the long pole, gated on certification (§26). *(Considered and declined: a `migrate` codemod — context-scoped keywords keep v5 documents parsing and `sm` stays a synonym, so v6 adoption needs no rewriter; revisit at v7 when the `property` alias is removed.)*

### 25.1 The AI-accessibility posture

FSL's adoption surface includes AI systems as *authors*, and FSL holds an asymmetric advantage there: an LLM's characteristic failure mode is **plausible-but-wrong**, and FSL is a language where that failure is *caught* — a `finite` machine's properties are proven or refuted with a replayable counterexample (§17/§23). The posture is **"AI writes it, the verifier vouches for it."** Its supports:

- **Corpus strategy — NL↔FSL pairs, uniformly spelled.** Model fluency in a niche language is a function of paired training exposure. Every published machine (the publish bundle) pairs its §16-generated prose description with canonically-`format`ted source on the public web; the cookbook is curated few-shot/training data and is maintained as such; everything public passes through `format` so the corpus has **one spelling**.
- **Retrieval surface.** fsl.tools ships **`llms.txt`/`llms-full.txt`**, a one-page versioned language reference at stable per-version URLs, and an **"FSL in ~500 tokens" cheat-sheet** designed for system prompts. The mantra-style principle lines ("a `prop` varies by *where you are*; a `val` by *how you got there*") are deliberate in-context-teaching assets — a house style, kept on purpose.
- **Constrained decoding.** The `export` grammar artifacts (gbnf/lark/ebnf) make *syntactically valid* FSL enforceable at sampling time on any inference stack.
- **Evals.** A small versioned eval set — NL→FSL authoring, FSL→NL explanation, bug-fix-given-counterexample — ships with the project: it measures model fluency, regression-tests the cheat-sheet/skill material, and gives model vendors a target.
- **Delivery.** The Claude plugin and `mcp` (above) are the packaged form of all of this; the repair loop they enable — *write → `check --json` → counterexample tape → replay → fix → proof* — is the product.
- **Effect-safety: verify-before-run.** The §3 capability profiles make harmlessness *statically provable*: a `pure` document (no sensors, no named hooks, no time, no I/O) is consequence-free to execute, and `run --require-profile pure` enforces it. A sandboxed agent can therefore safely run **untrusted** machines — including ones another AI wrote. Named hooks are the only doors to the world, and they are declared: a machine's hook signature is its effect signature, inspectable (`docs --interface`) before any trust decision.

---

## 26. Conformance mechanics & certification tiers

Cross-host equivalence is tested as **data, not N ported suites** (the concrete machinery behind §16's conformance-suite posture):

- A **vector** is `(document, seed, stimuli)`; expected result = a **canonical trace** (JSONL per macrostep: transition, val deltas, emissions, rollbacks) + digest. Expected traces come from the reference implementation and are **reviewed into the suite as normative spec artifacts**, versioned with the spec — the trace *is* the specified behavior, not an incidental snapshot.
- A backend ships one **thin native harness** (read vector → run → emit trace); a host-agnostic differ compares. Per-language cost = the harness, not a suite port.
- **Certification tiers:** **T1** finite profile (no floats/locale/regex/unicode tables — trivially exact everywhere, including C); **T2** rich-portable; **T3** pinned-unicode (§8's locked-version operations). A codegen target **declares its certified tier** in its capability manifest (#1172). `fsl codegen --certify <target>` runs the suite.
- **Vector generation is factory work** (§21): seeded factories mass-produce machines and stimulus streams. **Differential mode** diffs all certified backends pairwise — disagreements localize to a backend immediately.

---

## 27. Decision log

| Topic | Resolution |
|---|---|
| Extended state | `val` sibling to `prop` (and `sensor`); `var`→`val`, `property`→`prop` (alias removed v7) |
| props | now typed (optional annotations) |
| function-typed slots | `prop` *and* `val` may hold function values; props pin one lambda/state (State pattern, checkable); vals carry reassignable strategies (rich-tier door, finite-checkable if assignable set + captures finite-typed). **Defunctionalized `(tag, captures)`** → serialize/hash/cross-host; **intensional equality** (not extensional); captures by-value/acyclic (§4.4 / §5 / §15) |
| `.data()` / `mDT` fate | **B + C-for-hooks**: `val`s are the typed mutable surface (codegen-exported types); `.data()` survives as a **deprecated untyped escape hatch** (`mDT` defaults to `unknown`; mirrors §4.2 `object`→`any`+`map<string,any>`), eventual removal. **Hooks re-target** their data surface from the opaque `mDT` blob to the **typed val-record** (decide exact surface with the hook taxonomy #9). Generic mostly evaporates — the ~210 `mDT` instantiations collapse to one generated record type. **Perf is type-erased / neutral across A/B/C**; real cost is val storage + snapshot (below) |
| val storage layout | **columnar always** — compile-time slot indices, flat register-file / struct-of-arrays (numeric columns in typed arrays; string/container/function columns boxed); **never a `Map`** for declared vals. One instance = register file; many instances (walks / MC / systems) = true SoA columns → cache-friendly, vectorizable batch stepping. Stable layout *is* the codegen struct (§16) / the C state+val structs |
| val snapshot / rollback | **undo-log journal, from Phase 1** — log `(slot, old-value)` per write within a macrostep; fault → reverse-replay, commit → discard. O(#writes), **zero for read-only steps**; transient (never serialized); hook writes journal identically. **Time-travel = replay from tape** (§15), not snapshots → no persistent/COW structure (the one thing that wouldn't lower to C). Persistent/COW = opt-in for huge val sets only |
| machine-vals (embedding) | a `val` may be **machine-typed** (`val sub : machine T`) — a **by-value, owned, parent-driven** sub-machine, snapshotted/serialized with its parent (nested `Serializable`; journal nests). **HAS-A composition** = the 3rd axis beside group *hierarchy* and system *wiring*; the primitive **Factory Method/Abstract Factory** need. **Sits *beside* `System`, not under it** — embedding is an acyclic **tree** (no self-containment, rich-tier like recursive ADTs); wiring is a possibly-**cyclic graph** (A↔B), which by-value embedding can't express. Both ride the shared `Steppable`/`Serializable`/`Renderable` + columnar/journal/tape engine. Rule: *embed when you own it, wire when they're peers* (§14) |
| `int` | signed safe-integer (s53); `int8..256`/`uint8..256`/`longint`/`float`(f32)/`double`(f64). Ladder caps at **256** (SHA-256/EVM/big fixed-point); >256 → `longint`. Cost is C/Rust runtime only (4×u64 limbs or vetted bignum); arbitrary-precision hosts (JS BigInt / Python / Ruby / C# BigInteger) get 256 free |
| numeric state IDs | states **interned to integer IDs** at compile time; the hot path (current-state, transition lookup, hooks, visited-sets, hashing) is integer-indexed — nested **string Maps → integer-indexed adjacency arrays**; a string↔id bimap translates only at the API/display/serialize boundary. Pairs with columnar vals; **big win for walks/MC/verification** (visited-sets become `Uint8`/`Uint16Array`) and **codegen** (IDs *are* the C/Rust state `enum`, §16). Modest for one-off stepping, transformative for batch |
| execution model (RTC) | **macrostep** = one external stimulus run-to-completion; **microstep** = one fired transition; **stable** = quiescent config (no transition enabled) — the keystone invariants/commit/rollback/post-macrostep-hooks/observers all key off. Order = explicit **priority + doc-order tiebreak** (deterministic; nondeterminism only via seeded `probabilistic`); internal events drain before external (SCXML FIFO); **microstep bound faults** runaway eventless, verifier proves quiescence for `finite`. Hooks gain **macrostep-level** points (`before-macrostep`/`at-stable`/`post-commit`). Contract violation = **proof-obligation + debug-assert** (compiles out under `sealed`); no contract inheritance (§10 / §11 / §12) |
| testing surface | two surfaces — **in-language `test`/`expect` blocks** (declarative, verifiable, codegen-exported) + **host API** (integration/MBT). Vocabulary: reaches/blocked/reachable/property/invariant-holds/contract-never-violated/temporal-LTL/IO-relation/replay-equivalence/coverage. **Tests are tapes** (shrunk failing walk → permanent regression; repro bundle = test). Coverage = state/transition/path/guard (MC-DC); user suites may split unit-vs-stoch. Testing ≡ verification continuum, example → exhaustive → statistical (§17) |
| documentation extraction | a machine is **self-documenting**: codegen emits **reference docs** (alphabets, typed val/prop/sensor surface, payloads, **contracts-as-behavior**, error/final states, diagram) — the doc analogue of the type-surface export; a **5th codegen artifact**. Needs an **FSL doc-comment syntax** (`///` / `doc "…"` on machine/state/transition/val/event), the JSDoc/rustdoc parallel. Host docblocks + standalone Markdown/HTML (§16) |
| target capability negotiation | each codegen target **declares its supported feature set**; a machine's **`targets` directive** names intended hosts; compile **warns/errors when a used feature a target can't honor** — the codegen dual of the verification `disallow`/capability attrs (§3). Target plugins self-advertise abilities → data-driven matrix (#1173/#1172) (§16) |
| serialize version gating | snapshot carries FSL-language + machine version; deserialize **refuses incompatible by default** (loud opt-in override); **minimum-language-version** attribute (generalizes `fsl_version`) — stops an old tape silently misloading (the determinism trap replay guards) (#410/#1010/#1056/#1057) (§15) |
| machine lifecycle status | a machine **status** above the FSM state: *running*→*halted* (terminal, rejects all events) + orthogonal *complete* (reached final/done #1341; per-state `complete` #1145); halting fires destruct/termination hooks + resolves a **termination promise** (#458); `.halted()`/`.complete()`. "Stopped" is a property of the machine, not a graph node (#621) (§12) |
| model-class attribute (automata ladder) | declared rung — **`regular`**(0)/**`pushdown`**(1)/**`petri`**(2)/**`tree`**(3) — sets the auxiliary-memory shape *and* the verifier's decision procedure, **and enforces the restriction that keeps the rung decidable**: pushdown = one push/pop stack (two stacks = Turing); petri = monotone multiset, **no zero-test** (zero-test = Turing); tree = finite carrier (regular tree language) + **tree-transducer** output. Adds a **`bag`/multiset** type (§4.2) for petri. Totality caps below rung 4; naming the rung also rejects ops that would silently climb past it. **`tree`** = verifiable validators/type-checkers + compiler passes (basis for transcompile #4) (§3/§14/§17; #492/#980) |
| overflow | error default; opt-in `saturating`; no wrapping |
| NaN/∞ | IEEE; `isnan`/`isinf`/`isfinite` required; total `compare` |
| nullability | declared-only `T?`; `null`/`undefined` JS-distinct; no null in arithmetic |
| containers | tuple/array/set/map/record; **no object**; keys num/string, values any |
| ADTs | user-defined sum types; **recursive ⇒ rich-tier** |
| variants | `option`; `any` open-variant, sound-narrow-only |
| aliases | `type X = …` |
| functions | uncurried; inline + first-class; **by-value capture** |
| mutation | `assign`; slot assignment; sequential; `old` |
| pattern match | full + exhaustiveness + `else`; **bounded quantifiers** |
| container access | bracket throws / `get` → option; HOFs `map/filter/foldl/foldr/all/any/find/count/sort/flat_map`; no `foreach` |
| call style | free-function + `|>` |
| literals | `[…]`/`(…,)`/`{…}`/`#{…}`/`#[…]`/`[< >]` |
| string | codepoint default, `+`=grapheme, byte view; negative slicing; Unicode floor 16.0 + `unicode:` request; normalize/case on finite locked to shipped version |
| error model | `last_error`+`error_count` (read) / `error` tape (compose) / `rollback` event (host) / error-recovery transitions (route); atomic rollback + notify; no `on rollback` handler |
| error states | state-decl member `state X: { error; }` (local form of `failed_outputs`); domain-level failure designation (≠ runtime faults); free `always not in(error)` safety target; taxonomy with final/done #1341 |
| totality | recursion-free checkable tier; by-value capture; acyclic data; terminating-not-total (`option`); microstep bound 100k/reaction |
| `finite` | machine attribute; rejects rich band; `rand`/`sensor` allowed (over-approximated); `data` forbidden; portability profile |
| capability attributes | family of `disallow X` / profile attributes (`finite`, `sealed`, `pure`, `deterministic`, `stateless`; disallow transitions/actions/tapes/sensors/time/override/rejection) — one declaration buys interface docs + checker assumption + runtime specialization; `finite`/`hooks`/`allow_islands` are existing members |
| lifecycle | construct/destruct/entry/exit/on-rejection in source; observers stay API |
| named handlers | reusable *internal* effectful block (`handler h = { … }`) attached to transitions by name; DRY shared logic |
| named hooks | caller-provided typed callbacks the machine `call`s (inverse of `emit`); optionally `required` → dependency contract; returns recorded (replay) + over-approximated (verify); action-position |
| observational hooks | surface scales ~2× with features (val-change/sensor/emit/contract/rollback/clock/group-boundary/system-step, pre/post); **pure observers** (veto/mutate is in source); **generated uniform registry** keyed by (kind,target,phase); enables **introspection** `has_hook`/`hooks_on` — currently stubbed (`has_hooks(state)` commented → dead `hooked_state` styling); registry completes it |
| I/O | reactive `on chan(p)` (no `consume`); `emit chan <- v`; Mealy+Moore; multichannel = actor ports; sensors (recorded as input); tokenizer=composition (+`tokenized_by`) |
| time | pluggable caller-provided sensor (default clock; tick source w/ `.advance`; custom/outer-world); a **shared synthetic clock across machines → system-wide coherent, traceable timeline**; declared abstract model (monotonic / discrete vs dense) for verification |
| tapes | input-only retention (100k default, tunable/unlimited); output/log/error not retained (regenerated); `log`/`error` standard, separate from main output; **first-class** (`tape of T` values; bounded=finite, run-over/unbounded=rich) |
| determinism | seeded; seed in snapshot; canonical serialization; repro bundle = snapshot + input |
| RNG | per-machine seeded streams (stream-typed vals); distributions; over-approximated on finite |
| concurrency | composition-first (this spec's model); **parallel regions = open, no decision now** (#1353); explicit nondeterminism rejected |
| temporal | #1360; safety→bounded→liveness→**probabilistic** (in scope); **past operators** (once/since); counterexamples = replayable tapes; dense-time #1361 + PTA #1362 |
| weighted start states | `start_states: [a 30% b 70%];` — **reuses the weighted-`LabelList`** (`start_states` already takes a `LabelList`); **no origin side ⇒ members *are* μ₀** (no outer group weight), uniform if omitted; probabilistic initial distribution μ₀ (companion to weighted transitions → full Markov chain); seeded draw at construction (recorded/replayable); normalizes to 1, negative/NaN = error; feeds random walks + probabilistic verification; over-approximated on non-prob finite checking |
| testing toolkit | user-facing **unit** assertions (verifier-powered: `reaches`/`blocked`/`reachable`/property — a unit test can be a *model-check over all paths*, counterexample = replayable tape) + **stoch** tools (walks, statistical MC, coverage, shrinking); capstone **model-based testing** (machine = oracle for a real system: vals=shadow state, require/ensure=pre/post, named hooks=real ops); concolic guidance reuses the SMT solver; integrates with host test runner |
| random walks | already seeded (SplitMix32 + `probabilistic_walk`/`histograph`); opportunities → seed-in-serialization (reproducible-by-default) + named streams; full-surface fuzzing (sensors/events/payloads); **statistical MC verification tier** (Monte-Carlo, works on rich-tier where exact fails); test-tape generation (coverage-guided) + counterexample search (adversarial); rich trajectory output; Markov analytics (stationary/hitting/absorption); full-surface fuzzing **opt-in** (config object at call); **shrinking** to minimal failing trace (QuickCheck-style); **model-based testing** (machine as oracle for a real system, à la Hughes); confidence-interval / sequential MC |
| math core | domain-neutral primitives only; physics/domain → userland (units + CODATA-versioning). Blessed infra: encoding `base64`/`base64url`/`hex`/percent; pinned `hash`; compression `zstd`+`lz4` (portable decoders, pinned encoder, URL-safe via base64url); `decimal` type (tower) |
| units (§4.5) | dimensioned numeric types (base + derived via `*` and `/`); compile-time phantom types, **zero runtime cost**; auto-convert within a dimension, type-error across; same-unit `/` → dimensionless; ships **standard SI prelude** (base units + prefix system → `km`/`ms`/`μA` free + derived units) + opt-in `data`/`imperial`/`angle`/`time` modules; constants library separate; subsumes angle units, pairs with `decimal`; domain-newtype safety; **in scope, later phase** |
| pinning principle | pin anything not uniquely determined by input → identical cross-host output: hash *algorithm*, compression *encoder*, Unicode *version* |
| host posture | spec-semantics + per-host runtime + conformance suite; never borrow host |
| overlapping state groups | `&group : [...]` (NamedList extended); ordered; overlap + nest (group graph, no flatten, DAG check); nest `&c` / spread `...&c`; deep-apply depth-specificity; boundary hooks; per-group history; unified cascade + `transition:{}`/`graph:{}`; > hierarchical, represents Harel (compact orthogonality = parallel regions) |
| SVG styling hooks | rendered SVG emits **stable IDs + semantic classes + CSS `::part()`** per state/edge (`fsl-state-<slug>`; `.fsl-state`/`start-state`/`end-state`/`error-state`/`hooked-state`/`current-state`, `fsl-group-<g>` — mirroring the §19 cascade kinds); **live `current-state`** updates on transition; names **slugified** + collision-disambiguated, so the API returns the exact selector — `svg_id_for_state`/`svg_id_for_edge`/`svg_element_map()` — since users can't guess the slug; `::part()` lets external CSS reach shadow-DOM web components |
| `arranged` (sugar) | `arranged a -> b -> c;` ≡ `a -> b -> c; arrange [a b c];` — desugars a chain into its transitions **and** the layout `arrange`, extracting states in chain order (decorations stay on edges; repeats deduped). DRY: stops writing the chain twice. New keyword, backward-compatible; composes with explicit `arrange`; `arranged-start`/`arranged-end` are the obvious analogs |
| multigraph + wildcards | basic case = 1 edge per (from,to); **more needs action names** (the disambiguator); ≤1 **unlabeled** non-probabilistic edge per target (= what `transition(to)` invokes); **probabilistic** edges are the exception (rolled, not named); wildcard `*` source (`* -> X`, #1356) + wildcard action (`'*'`); resolution order: specific-action > wildcard-action > unlabeled > wildcard-source > rejection; probabilistic **list target** `a P% -> [b c]` — list/named-list targets **already fan out** (`ArrowTarget ⊇ LabelList`); current impl = copy (each fanned edge gets P; 33/33/33 with a sibling — `jssm_compiler.ts:149`). **Resolved → hierarchical:** the **origin-side `%` is the group's weight**; optional **per-member `%` inside** the list are within-group shares — **the `%` is required when weighting** (no bare numbers: `[b 1% c 3%]`, never `[b 1 c 3]`) and present weights are **normalized** (need not sum to 100; `[b 1% c 3%]` → 25%/75%). Multiply by the group weight (`a 50% -> [b 20% c 80%]` → b=10%, c=40%). **All-or-nothing:** omit every inner weight → uniform (25/25); mixing weighted and unweighted members is an error. **Syntax-compatible** (existing `P% -> [list]` parses unchanged; identical in isolation); semantically = split, differing from old copy *only* with sibling probabilistic edges (33/33/33→25/25/50 — the group keeps its stated weight; the more-correct direction). Major-bump change |
| multi-machine systems | one string = many `machine {}` + `wire` + `import`; **tags `fsl`/`fslf`/`fss`/`fssf`** (2026-06-10; `sm` = deprecated synonym of `fsl`, `ms` renamed to `fss`); `Machine` vs `System`, two types, no union; per-machine API delegated via `.machine(name)`; system-level fns `system_from`/`factory_from`/`system_factory_from`/`make_system`/`compile_system`/`serialize_system`/`deserialize_system`; topology/config/scheduler; shared `Steppable`/`Serializable`/`Renderable` (web component auto-detects); stepping = deterministic queued dispatch default (§22.3), shared-clock sync alternative; System = product for cross-machine verification; #1354/#1352 |
| reserved words | **context-scoped keywords** — nothing globally reserved; `state`/`start`/`val`/`div`/etc. are keywords only where the grammar expects them, so they stay legal as identifiers elsewhere |
| `div` (integer division) | explicit integer-division operator, **Erlang-style** `a div b` — always integer regardless of type context; `/` stays context-determined (float where typed). Pairs with `mod`/`rem` |
| `finite` vs `checkable` | **both names kept**: `finite` = the hard enumerable line (small-finite), `checkable` = the softer "the checker may attempt it" tier (large-finite/SMT). Distinct; **docs must spell out the difference explicitly** |
| blessed-infra namespace | **core, always present** (no import) — encoding/`hash`/compression/`decimal` are always in scope; resolves the §28 core-vs-module question |
| weighted-list inner format | member `%` **required when weighting** (no bare numbers), **normalized** (need not sum to 100), **all-or-nothing** (omit all → uniform; mixing weighted+unweighted = error); same rule for arrow-target lists and `start_states` |
| factories (§21) | document-level factories over the val parameter surface: `factory` block (one per doc) binding vals + identity targets (`instance_name`/`machine_name`/`start_at`/`seed` — fsl#430/#431/#443); **pure core `at(n)` + hidden-cursor `make()`**; `with()` curries immutably + validates eagerly; `UnboundParameterError` lists all missing; serializes `{source_hash, bindings-as-FSL-text, seed, cursor}`; host-callback bindings = rich/non-portable; construction-time `rand` preserves `finite` (over-approximation); distinct from machine-val Factory Method (GoF layer) |
| seed tree (§21.2) | single root seed, everything below derived via spec-fixed `derive(uint64, label)` (FNV-1a64+splitmix64 candidate, conformance vectors); unseeded root = clock sampled **once**, recorded, replayable after the fact; `at(n)` bit-identical cross-host/cross-time; parallel range builds coordinate-free |
| system orchestration (§22) | populations `many X via factory count E max N` (max required for `finite`, runtime-enforced); routes `on fact -> target delivery` over channel emissions + observation sugar (`enters`/`exits`/`takes`) + `on action` inbound surface; `where` selectors per member; `sender` = sole context name; lifecycle verbs `spawn`/`retire` (indices never reused); `on_undeliverable: error\|drop\|dead_letter` default **error**, dead-letter = third system-scoped diagnostic tape; dispatch = deterministic FIFO queued (doc order / write order / creation order), queue-depth bound (sibling of microstep bound), shared-clock sync as the alternative |
| hierarchical systems (§22.4) | systems satisfy the member contract (actions in via `on action`, channels out); child dispatch runs to quiescence, child emissions enqueue in parent; **containment tree compile-enforced acyclic** (wiring within a level may be cyclic); nested recursive snapshots; seed tree extends rule-free |
| composed verification (§23) | `finite` system = all members finite + population `max`es + queue bound, compiler-enforced; checker: bound safety / lifted contracts / deliverability / system `invariant` over aggregates (`count`/`all`/`any`/`sum`, system-context-only) / opt-in deadlock; counterexamples = executable stimulus tapes |
| system visualization (§24) | normative structural model: nested clusters (composition tree = cluster tree), population badges, routes as inter-cluster edges, channel ports, dead-letter sink; reuses 5.143 group-cluster machinery + SVG id/class hooks; live rendering deferred |
| CLI (§25) | **23 built-in verbs** (render make run check test repl lint format parse config import export codegen publish init docs diff walk inspect lsp mcp **explain list**); dispatcher/plugin architecture unchanged; config gains `registry:`; boundaries render=images / codegen=host source / import-export=interchange (no package fetching); `walk` = the statistical tier + stimulus generator + shrinking; `lsp`/`mcp` = stdio protocol servers over the same internals (editors / AI agents); `inspect` = repro-bundle reader (§15 version-gating's face); publish bundle = module + README + HTML/PNG/SVG with subtle FSL-site/repo attribution links (SEO); `migrate` considered+declined (context-scoped keywords; revisit at v7 alias removal); cli-config branch Tasks 1–11 survive |
| agent ops (§25/§25.1, batch 2) | budgeted verification (`--budget`/`--max-configurations`; **`undecided` is a first-class third answer** with partial findings — agent loops never hang); `docs --interface` interface cards (the `.d.ts` of a machine, token-budgeted); `explain` error codes (rustc-style, llms.txt-reachable); `init --example <cookbook-pattern>` (edit-valid-artifacts beats blank-page); `run --require-profile` effect-safety (statically provable harmlessness — sandboxed agents run untrusted machines); `list` project discovery; `fsl --capabilities --json` toolchain self-description; semantic patches → §28 door |
| trust & forensics (§25, batch 3) | **verification certificates** (`check --emit-certificate`: source_hash + properties + checker version + tier + result; proof-carrying machines; shipped in the publish bundle; CI/agents verify without re-running; the trust currency of agent-exchanged machines); **WASM toolchain build** (§16 — zero-install execution in sandboxes/code-interpreters; powers playground + editor); `--narrate` on `check`/`inspect` (traces as prose via the §16 generator); `mcp` time-travel debugging over snapshot+tape (`state_at`/`why_rejected`/`val_history`/`diverges_from`); `diff` over runs (first-divergence forensics); every `--json` result carries `source_hash` (universal memoization contract); reference repair-loop cookbook recipe |
| conformance mechanics (§26) | vectors-as-data `(document, seed, stimuli)` → canonical trace (normative artifact, not snapshot); thin per-host harness; **T1 finite / T2 rich-portable / T3 pinned-unicode** certification declared in target capability manifests (#1172); `codegen --certify`; factory-generated vectors; pairwise differential mode |
| agent verb contracts (§25) | `--json` on every verb (errors carry spans + expectation + `suggested_fix`; `check` embeds its counterexample tape inline); non-interactive totality (no TTY, semantic exit codes, explicit `--yes` where confirmation exists, prose never in `--json` stdout); `parse→format→parse` idempotence conformance-tested |
| grammar export | `export --target gbnf/lark/ebnf` — the versioned machine-readable grammar as an artifact, for constrained decoding |
| ascii render | `render --target ascii` — deterministic text-art graphs (terminals, diffs, text-only models) |
| AI-accessibility posture (§25.1) | "AI writes it, the verifier vouches for it": NL↔FSL paired corpus (publish prose + canonical formatting; cookbook = curated few-shot data); llms.txt + versioned one-page reference + ~500-token cheat-sheet; mantra-style principles as deliberate house style; versioned NL↔FSL/bug-fix eval set |

---

## 28. Open / deferred
Regex; locale-tailored normalization/casing; dense-time verification (#1361) + probabilistic timed automata (#1362); parallel regions (#1353); **semantic patches** (the dual of `fsl diff` — a state/transition/val-level patch format applied without string surgery; the door for multi-agent collaboration on one machine; `format` idempotence already makes textual editing safe, so this waits until agents are heavy concurrent authors). *(Now specced, not deferred: contract model #1355 → §10/§11; RTC/microstep #1345 → §12.)*
