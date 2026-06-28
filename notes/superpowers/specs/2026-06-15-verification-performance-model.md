# FSL Verification Performance Model

> **Status:** DRAFT 2026-06-15. Companion to `2026-06-09-fsl-megaspec.md` — §3 (verifiability bands + model-class ladder), §17 (verification), §23 (composed verification), §27 (storage decisions). Captures the cost reasoning behind the verification stack so the perf model lives alongside the feature design.

---

## 1. The runtime / check-time split (the headline)

Verification is a **design-time** activity. Model-checking happens when you ask (`fsl check`), never on the transition hot path, so **adding checkers costs the running machine ≈ nothing** — `construct()` / `transition()` are untouched. (Today's `fsl_verify` is a standalone read-only function over the state graph, not a dispatch hook.)

The verification-*enabling* runtime features are all opt-out or compile-out:

- **Contracts** (`require`/`ensure`/`invariant`) fire as debug assertions in unsealed builds but **compile out under `sealed`/proven** (§10).
- **Units** are phantom types — **zero runtime cost** (§4.5).
- **Capability attributes** let the runtime *skip* disallowed machinery (§3).
- The **undo-log journal** is **O(#writes), zero for read-only steps** (§27); the **tape** is a bounded ring (§14).

The only genuine runtime-regression surface is the **enabling infra** (RTC scheduler, journal, tape, debug-assert contracts) — which is exactly what the graviton perf CI guards, and why §27's hot-path decisions (columnar vals, integer state IDs, O(#writes) journal) were made up front.

## 2. The cost driver: `control-states × ∏(val domains)`

Topological safety (what ships today) is BFS over the state graph — `O(states + edges)`, trivial. The blow-up is **data**: the checked configuration space is `control-states × ∏(val domains)`, and bounded vals multiply combinatorially.

**Worked example — 4-player five-card stud (a "trivial" game).** Twenty of 52 cards dealt (1 hole + 4 up per player):

- **cards:** `P(52,20) = 52!/32! ≈ 3.07×10³²` positional deals (`≈ 9.24×10²⁶` if up-cards are unordered within a player, `÷(4!)⁴`).
- **betting:** 4 chip stacks `int 0..200` (`201⁴ ≈ 1.63×10⁹`) × current bet `0..200` (`×201`) × fold flags `bool⁴` (`×16`) × turn `enum(4)` × round `enum(4)` ≈ `8.4×10¹³` (pot is derived by conservation — not an independent factor).
- **total ≈ 2.6×10⁴⁶** (`≈ 7.8×10⁴⁰` with the symmetry-friendly card count).

That is **~25–30 orders of magnitude past exact enumeration** (`~10⁸`) and past exact symbolic checking (`~10¹²–10¹⁵`). A simple game is already statistical-tier — which is the whole point of the mitigation stack.

## 3. The mitigation stack (bands → cost)

| Band (§3) | Method | Practical reach |
|---|---|---|
| **small-finite** | explicit enumeration | `~10⁵–10⁸` |
| **large-finite** | symbolic SMT / BDD | `~10⁶–10¹²` (`~10¹⁵` with heroics) |
| **rich** | bounded analysis / statistical MC | unbounded, inexact |

- **`finite` + bounded-by-default** keeps the space analyzable at all.
- **LTL**: PSPACE in formula, linear in *(product)* machine size; via Spin, `10⁷–10⁹` states with partial-order / bitstate reduction.
- **PCTL**: linear systems over the Markov chain; via Storm, `~10⁷`, memory-bound.
- **`petri` coverability**: EXPSPACE — genuinely expensive, but opt-in by model-class declaration (you only pay if you climb the rung).

## 4. The exponent-killers

- **Assume-guarantee composition (§23)** — *the* answer to explosion: verify each member once against its interface contract, **compose contracts, not state spaces**. The 500-customer park stops being a 500-fold product and becomes one member-proof + a composition argument. Single biggest lever.
- **Symmetry reduction** — interchangeable members collapse the space (poker's 4 players → `÷4!`; partial suit symmetry; abstraction to the **7,462** hand-equivalence classes vs **2,598,960** distinct 5-card hands ≈ 350× on the dominant term).
- **Abstraction / CEGAR** (deferred §28) — abstract val domains to intervals/predicates, refine only where a counterexample was spurious.
- **Budgets (§25)** — `--budget` / `--max-configurations` → a first-class `undecided` answer instead of a hang; `--estimate` sizes the space *before* spending.
- **Statistical MC (§17)** — random walks + confidence intervals + shrinking; linear, works on any tier, the fallback when exact is hopeless.
- **Backends (Spin / Storm / nuXmv)** — decades of reduction technology, differential-checked against each other.

## 5. The perf-foundation synergy (the part that pays twice)

The checker is the **biggest beneficiary** of §27's hot-path decisions — the perf investment *is* the verification investment:

- **Integer state-ID interning** → visited-sets become `Uint8Array`/`Uint16Array` and adjacency is integer-indexed → fast batch stepping, walks, Monte-Carlo.
- **Columnar vals** (struct-of-arrays, never a `Map`) → cache-friendly, vectorizable many-instance evaluation — exactly the product enumeration, population stepping, and walk workloads the checker drives.

So the foundations aren't a tax the checker pays; they're its engine. This is why the integer-state-ID interning is sequenced first (a benchmark-gated 5.x perf release) — it unblocks the verification tier's batch workloads.

## 6. Delivery posture

- **Native safety in-house** — cheap, exact, with finite-trace counterexamples (shipped).
- **Heavy artillery (LTL/PCTL) delegated to backends**, behind budgets + `source_hash` memoization (every `--json` result carries the hash, so analyses cache across sessions/agents) + the incremental LSP check daemon.
- **Certificate-bearing** (`check --emit-certificate`): CI verifies certificates cheaply (hash comparison) rather than re-running expensive checks; `check`/`certify` runs behind budgets to bound the dev-loop cost.

**One-line model:** runtime cost ≈ 0 by construction; check-time cost is potentially exponential in *data* and is bounded **by choice** (band, budget, abstraction, composition, sampling) rather than by accident — and the same interning/columnar foundations that keep the runtime fast are what make the checker fast.
