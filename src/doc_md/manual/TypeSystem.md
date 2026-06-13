# The Type System: Numbers, Strings, Containers, ADTs

FSL is now a *typed* data machine, and the types are doing real work: they're
what lets the verifier reason, and what keeps a machine in the
{@page VerifiabilityTiers.md `finite` tier}.  The recurring theme is **bounded by
default** — every type has a safe, analyzable default, and going unbounded is
something you do *visibly*.

This page is a tour of the type vocabulary you'll declare on `val`s, `prop`s,
and `sensor`s.



&nbsp;

&nbsp;

## The numeric tower

FSL has a full ladder of number types:

- **`int`** — a signed 53-bit integer (the safe-integer range);
- **sized ints** — `int8`..`int128` and `uint8`..`uint128`, exact widths;
- **`longint`** — arbitrary precision (a *rich-tier* type);
- **`float`** / **`double`** — IEEE floating point (also rich-tier);
- **`decimal`** — base-10 with **banker's rounding** (round-half-to-even), for
  money;
- **bounded forms** — `int 0..100`, the finite-tier workhorse.

Three decisions are worth committing to memory, because they differ from what
many languages do:

- **Receiving-type promotion.**  Arithmetic promotes toward the *type it's being
  stored into*, not toward the widest operand — so the destination's type
  governs.
- **Overflow is an error, not a wrap.**  A `uint8` that exceeds 255 *faults*; it
  does not silently wrap to 0.  If you genuinely want saturation, you **opt in**
  — but you never get silent wraparound.
- **NaN is honest.**  IEEE `NaN` exists, with `isnan` / `isinf` / `isfinite` to
  test for it.

```fsl
val balance  : decimal             default 0.00;   // money: banker's rounding
val patience : int 0..100          default 50;     // bounded → finite-eligible
val checksum : uint32              default 0;       // exact width
```

**Gotcha:** bitwise operations are defined on **sized** ints only (`uint8`,
`int32`, …) — *not* on bare `int` or `longint`, whose width isn't pinned.



&nbsp;

&nbsp;

## Strings

Strings default to **codepoint** semantics — indexing and length count Unicode
codepoints.  When you need user-perceived characters, the **grapheme** view is a
`+` suffix; there's a UTF-8 **byte** view as well, and negative slicing works
the way you'd hope (`s[-3..]` is the last three).

For the finite tier, bound the string: `string len 0..N`.  An unbounded string
is a rich-tier value, because its state space is unbounded.

```fsl
val code : string len 0..8;        // bounded → still enumerable-friendly
prop name : string;                 // a state-bound label
```



&nbsp;

&nbsp;

## Containers

Five container kinds, each with an optional bound:

| Container | Shape | Bound form |
|-----------|-------|-----------|
| **tuple** | fixed, heterogeneous | n/a (fixed by construction) |
| **array** | indexed, homogeneous | `array T len 0..N` |
| **set** | unique members | `set T size 0..N` |
| **map** | key → value | `map K V size 0..N` |
| **record** | named fields | n/a (fixed shape) |

There is deliberately **no `object`** type — use ADTs plus `any` instead (see
below).  And keys and set members are restricted to **number or string** only;
*values* can be anything.  Bounding a container (`len`/`size`) is what keeps it
finite-tier.

```fsl
val active_roles : set string size 0..16;       // bounded set
val scores       : map string int;               // unbounded → rich-tier
```



&nbsp;

&nbsp;

## ADTs — sum types

Algebraic data types let you model "one of several shapes," each carrying its
own data:

```fsl
type Shape = circle(r) | rect(w, h);
type Move  = normal(from, to) | castle(side) | en_passant(file);
```

ADTs and pattern matching are built for each other — you take them apart with
`case`, and the checker can prove your `case` is **exhaustive**.  A *recursive*
ADT (one whose definition refers to itself, like a tree) is a **rich-tier**
value, because it can grow without bound.



&nbsp;

&nbsp;

## Variants and nullability

- **`option`** — a value that's present or absent (the principled "maybe").
  Bracket-indexing a container *throws*; `get` returns an `option` instead — so
  reach for `get` when absence is expected.
- **`any`** — an open variant, but **sound-narrow-only**: you can't use an `any`
  directly; you must `case` it to a known shape first.  This is what keeps `any`
  from being an escape hatch out of the type system.
- **`null` and `undefined`** — both exist, with JS semantics, and they are
  **distinct**.  `null = undefined` is **false**.  Neither is allowed in
  arithmetic.  A value that may be absent is declared nullable with `T?`.

```fsl
val maybe_winner : string?;          // may be null
val shape        : any;              // must be case-narrowed before use
```

**Gotcha worth repeating:** `null = undefined` evaluates to **false**.  They are
two different absences, on purpose.



&nbsp;

&nbsp;

## Type aliases

Name a constrained type once and reuse it:

```fsl
type Celsius    = int -273..1000;
type Percentage = int 0..100;

val temp        : Celsius     default 20;
val satisfaction: Percentage  default 70;
```

Aliases are about readability and intent — but FSL goes one step further with
*dimensioned* types, which catch unit errors the type system above can't.  For
that, see {@page Units.md units and dimensional analysis}.



&nbsp;

&nbsp;

## The tier, at a glance

Pulling the "rich-tier" callouts together, here's what pushes a value out of the
enumerable {@page VerifiabilityTiers.md `finite` tier}:

- `float`, `double`, `longint`;
- unbounded strings and unbounded containers;
- recursive ADTs;
- first-class lambdas as data;
- `any`;
- the `data` escape hatch.

Bound your numbers and containers, prefer ADTs over open shapes, and a machine
stays in the band where the checker can prove the most.



&nbsp;

&nbsp;

## See also

- {@page Units.md Units} — dimensioned types layered on the numeric tower.
- {@page VerifiabilityTiers.md The verifiability tiers} — why bounding types
  keeps a machine checkable.
- {@page WhatIsFslNow.md What FSL is now} — where these types attach
  (`val`/`prop`/`sensor`).
