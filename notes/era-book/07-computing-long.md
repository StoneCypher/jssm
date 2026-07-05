# v7 — The Computing Machine (long form)

**Peggy fork + generator dual (the workshop).** *Manager:* Before doubling the grammar we
renovate the shop: fork peggy for richly-typed grammar output (John's direction, replacing
the dead fsl#1313 approach), and build the generator that turns the grammar into random valid
documents — so every later slice ships pre-fuzzed. Done = fork builds our peg; dual generates
parse-clean docs at scale. *CS:* peggy fork emits typed AST node interfaces from rule
annotations; grammar-as-data export; generator walks grammar with recursion budgets +
weighted terminal samplers (FSL declare-by-use ⇒ high semantic validity); wire into dragon
nightly; #561 constant tables generated from the same source.

**Numeric tower.** *Manager:* One coherent number system — plain ints, sized ints to 256-bit,
bignum, floats, exact decimal — with bounded forms that keep machines checkable. Overflow is
an error you asked for, never a silent wrap. *CS:* int=s53; int/uint 8..256 (JS: BigInt-backed
lanes for >32); longint=BigInt; float=f32/double=f64; decimal(p,s) fixed-point over BigInt,
banker's rounding; bounded `int lo..hi` refinements checked on write; promotion lattice
receiving-type-first; overflow error + opt-in `saturating`; literal suffixes 7f/7L/7i32/7u8,
0x/0b/0o; vectors per representation boundary (2^53±1, 256-bit edges, NaN/±∞ via §7
predicates only).

**Operators + precedence.** *Manager:* The full expression operator set with one pinned
precedence table, so no two docs or hosts ever disagree on `a or b implies c`. *CS:* grammar
per §6 table (tightest unary→`|>` loosest, `implies` right-assoc); eager boolean zoo +
short-circuit andalso/orelse distinct nodes; `in` over enum/array/set; bitwise only on sized
ints (type error otherwise); `++` strings; cross-type comparison = type error, total
`compare` builtin; C3 appendix gets the table verbatim; dragon: precedence-fuzz (random parse
trees → unparse → reparse → tree-equal).

**Control expressions.** *Manager:* `if/then/else`, `let … in`, and full `case` matching make
guards expressive without loops — every expression terminates by construction. *CS:*
expression-position only; `case` patterns: literals/enum/ADT-destructure/tuple/record/
bindings/`when`/`_`; exhaustiveness decidable over finite scrutinee types, else `else`
required (compile error otherwise); bounded quantifiers desugar to folds over static ranges;
totality: no recursion, HOF-only iteration (v8), microstep-independent purity.

**String model.** *Manager:* Strings that behave identically on every host: code-point
indexing, explicit grapheme opt-in, explicit bytes, no locale surprises. *CS:* length/index/
slice on code points; `s[3+]` grapheme via bundled segmenter tables; byte view getbyte/
setbyte over UTF-8; negative indices Python-style; portable op set per §8; normalize/casefold
pinned to Unicode 16.0 tables shipped in-package; `unicode: N` attribute checked
(finite=exact-match refuse); bounded `string len 0..N` refinement.

**`where` guards.** *Manager:* The payoff feature: transitions gated on typed state —
`Queuing 'board' -> Riding where patience > 0;` — silent enabledness, no runtime machinery
beyond evaluation, works with scalars alone. *CS:* guard = pure total expr over
vals/props (+sensors later); false ⇒ edge not in candidate set (C2 SELECTION step 3);
evaluation order never observable (pure); vectors: guard true/false/faulting-expr(=FAULT per
C2 §11 line 15); viz: guarded edges get decoration hooks.

**Scalar stdlib.** *Manager:* The everyday math vocabulary, identical everywhere — plus the
pinned infra (hash/encodings) the trust stack already leans on. *CS:* §7 families
(rounding/clamp/lerp; exp/log; trig degrees-default with rad; gcd/comb; popcount family on
sized ints; constants + per-type MIN/MAX/EPSILON); each builtin: signature, totality class,
error kinds, conformance vector; base64/base64url/hex/percent; vendored SHA-256 = the C1
hash exposed as `hash` builtin? NO — `hash` is the pinned non-crypto digest (§7), separate
from C1's SHA-256; pin both algorithms in vectors.

**C3 grammar appendix (rolling).** *Manager:* Every slice lands with its grammar section
written normatively, so by era's end the appendix exists by accretion, not by heroics. *CS:*
per-slice: EBNF fragment + weighted-list normalization examples where touched; fsl#818
proof-construct slice FIRST (unblocks corpus #817); the peggy-typed grammar is the appendix's
machine-readable twin.

**Vectors per slice (standing).** *Manager:* No feature is "done" without its conformance
vector — the rule that makes v10's second implementation a replay instead of a negotiation.
*CS:* vector = (doc, seed, stimuli)→canonical trace per C4 format; JS-only execution now;
IDs + feature tags + edition per corpus governance; promoted into the public corpus at v10.
