# Units and Dimensional Analysis

This is one of the big ones.  FSL can attach **physical dimensions** to numbers,
so that the type checker catches a whole class of bugs that ordinary types miss:
adding meters to seconds, treating a download speed as a distance, or — the
classic — losing a factor of 1000 between kilometers per hour and meters per
second.  These errors crash spacecraft and lose datacenters; FSL turns them into
compile-time mistakes.

And it does so at **zero runtime cost**.  Dimensions are *phantom types* — they
exist only during checking and disappear from the running machine.  You pay
nothing at runtime for catching the error at build time.



&nbsp;

&nbsp;

## Dimensions plus branding — you need both

There are *two* distinct mistakes a unit system should catch, and they need two
different mechanisms:

- **Dimensional analysis** catches *physically incompatible* quantities — you
  can't add `m/s` to `kg`, and a `m/s` value can't be stored where a `m` is
  expected.
- **Nominal branding** catches *dimensionally identical but semantically
  different* quantities — a `user_id` and an `order_id` are both integers, and
  **torque and energy are both newton-meters**, yet confusing them is a bug.

Dimensional analysis alone can't tell torque from energy; branding alone can't
tell meters from seconds.  A serious unit system needs both, and FSL has both.



&nbsp;

&nbsp;

## The SI prelude

You don't declare the common units — they come free.  FSL ships an **SI
prelude**: the seven base units, plus a **prefix system**, which together give
you the whole family without enumeration.  Because the prefixes are
*systematic*, `km`, `ms`, `μA`, `GHz`, and `nm` all just work, and so do the
**derived** units (newtons, joules, watts, pascals) built from the base ones.

```fsl
val cruise_speed : float m/s   default 27.8;     // ~100 km/h
val distance     : float km    default 0.0;
val draw         : float mA    default 0.0;
```

Conversions within a dimension are **automatic**: assign a `km/h` value into a
`m/s` slot and FSL converts it (and would *reject* assigning a `kg` there).  You
declare your own units too — both **products** (`N = kg·m/s²`) and **quotients**
(`Hz = 1/s`) — and dimensional checking covers them.



&nbsp;

&nbsp;

## The wins, by example

The point lands fastest with the cases people actually hit:

- **km/h ↔ m/s.**  The conversion factor (3.6) is the single most common
  unit-of-measure bug in control code.  Dimensioned types make the mismatch
  impossible to write, and the conversion automatic when it *is* valid.
- **bits ↔ bytes.**  A download manager that reports "8× too slow" almost always
  divided a bit-rate by a byte-count.  Brand them apart and the compiler stops
  you.



&nbsp;

&nbsp;

## The gotchas — where naïve unit systems break

These are worth teaching explicitly, because they're the cases that catch people
who *think* they have units handled:

- **Torque ≡ energy.**  Both are newton-meters.  Dimensionally, they're
  identical, so dimensional analysis *cannot* distinguish them — this is a true
  blind spot.  The fix is **branding**: make `Torque` and `Energy` distinct
  nominal types over the same dimension.
- **Affine temperature.**  Celsius and Fahrenheit are **affine**, not linear:
  converting them involves an *offset*, not just a scale, so 0 °C is not "no
  temperature."  Kelvin is the linear, ratio-scale unit.  Adding two Celsius
  temperatures is nonsense; adding a Kelvin *delta* to a Celsius value is fine.
  FSL treats the affine units correctly, and that distinction surprises people.
- **KB vs KiB.**  `KB` is 1000 bytes; `KiB` is 1024.  They are *different units*,
  and silently swapping them is a 2.4%-per-prefix error that compounds.  FSL
  keeps them apart.
- **Exponents do real algebra.**  Square dollars (dollars²) are the dimension of
  **variance** in finance — and that's not a joke, it's how a risk monitor's
  types come out.  Taking a square root **halves** the exponents (the standard
  deviation of dollars² is dollars).  The dimensional algebra is real algebra.



&nbsp;

&nbsp;

## Domain newtypes

Branding generalizes beyond physics.  Any "two values that are the same
underlying type but must never be confused" gets a **domain newtype**:

```fsl
type UserId  = brand int;
type OrderId = brand int;

val current_user  : UserId;
val current_order : OrderId;
// assigning a UserId where an OrderId is expected: rejected at check time
```

This is the same mechanism that separates torque from energy, applied to your
domain's identifiers.



&nbsp;

&nbsp;

## Worked examples to study

The manual reuses a set of unit-heavy worked machines, each chosen to exercise a
different facet:

- **battery charger** — product units (current × time = charge);
- **cruise control** — rate units (the km/h ↔ m/s win);
- **download manager** — data units (the bits ↔ bytes trap);
- **rocket ascent controller** — extreme units (where a missing factor is fatal);
- **risk monitor** — square dollars as variance (exponent algebra in finance);
- **motor controller** — mechanical and electrical watts, with the torque/energy
  twist.



&nbsp;

&nbsp;

## See also

- {@page TypeSystem.md The type system} — the numeric tower that units are
  layered onto.
- {@page VerifiabilityTiers.md The verifiability tiers} — phantom types vanish
  at runtime, so units cost nothing at run time and everything at check time.
