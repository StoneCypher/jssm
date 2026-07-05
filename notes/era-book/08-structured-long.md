# v8 — The Structured Machine (long form)

**Containers + HOF protocol.** *Manager:* Tuples, arrays, sets, bags, maps, records — with
bounded forms that keep machines provable, and iteration only through bounded combinators so
nothing can loop forever. *CS:* literals `(a,b)`/`[..]`/`#[..]`/`#(..)`/`#{..}`/`{..}`;
keys/set-members num|str only (decidable eq/hash); bounded `len/size 0..N` refinements;
bracket-index throws, `get` returns option; HOFs map/filter/foldl/foldr/all/any/find/count/
sort/flat_map (sort: total compare, stable); no foreach; bag = multiset with monotone
add/remove + `>=` threshold reads, **no zero-test ever** (the petri decidability line,
guarded from birth); structural deep equality; SameValueZero per convergence S2.

**ADTs + variants.** *Manager:* Real sum types with payloads and airtight matching; `any`
exists but only narrows soundly, so dynamic data can't corrupt proofs. *CS:* `type S =
c(f:T)|d;` nominal tags; recursive ⇒ rich-tier flag (acyclic by construction); `option<T>`
blessed; `any` consumed only via `case` narrow; `T?` declared nullability; aliases
transparent; match compiler: decision tree + exhaustiveness over finite tag sets;
vectors: nested destructure, `when` guards, narrow-failure = FAULT(failed_narrow).

**Streams (§4.6).** *Manager:* Seeded lazy randomness that replays perfectly — the
technobabble generator (fsl#1400) is the teaching demo: same seed, same nonsense, forever.
*CS:* `val s : stream(seed:u64)`; draws ONLY at rand*-with-stream-arg or assign-from-stream
(no expression-position effects); each draw journaled (C2) + advances position; serialized
state = (seed, position); unseeded root ← machine seed (recorded); finite-eligible when draw
domains bounded (over-approximation per §3).

**Function-typed slots.** *Manager:* Props can BE behavior (State pattern, one lambda pinned
per state, checkable) and vals can carry swappable strategies — without breaking replay,
because functions serialize as data. *CS:* defunctionalization: tag = SHA-256 of normalized
lambda AST (normalization spec = irreversibles #12: strip spans, canonical param names,
NFC), captures by-value acyclic; serialize/hash/rehydrate cross-host by tag lookup in the
program lambda table; intensional equality; finite-checkable iff assignable set × captures
finite; state-space cost documented per machine.

**Groups §19 (whole).** *Manager:* Named overlapping groups become first-class: shared
transitions, shared config, boundary hooks, membership queries — strictly more expressive
than hierarchy because states may belong to many groups. *CS:* `&g:[members]` ordered;
group→group DAG (cycle=error); nest `&c` vs spread `...&c`; deep-apply with
depth-specificity (state beats group, deeper beats shallower, equal-depth conflict=error, no
order tiebreak); repeat `state X:{}` blocks union (same-tier conflict = two-span error);
boundary enter/exit hooks on transitive crossing; `in(&g)`/groupsOf/statesIn; per-group
history slots; cascade: theme < `state:{}` < kind < group-by-depth < state; new
`transition:{}` + `graph:{}` tiers; REFRESH the pre-vitest implementation plan first.

**Graph features.** *Manager:* The transition system grows up: wildcards, automatic
(eventless) transitions with `else`, layout sugar, and a principled multigraph rule. *CS:*
resolution order per C2 SELECTION (specific > `'*'`-action > unlabeled > `*`-source >
rejection); eventless fire at quiescence check (C2 line 21), `else` = guard-complement arm;
`arranged a->b->c;` desugars to chain + `arrange`; multigraph: >1 edge per (from,to)
requires action names; ≤1 unlabeled non-prob edge; dragon: resolution-order fuzz.

**State kinds (#909 — spec first).** *Manager:* Per-state visual/status predicates
(`state * terminal: {}` selectors, trailing `dark` values) get their real spec, then land in
the cascade as the kind tier. *CS:* selector grammar per the #909 thread decisions; kinds =
predicate-derived classes feeding the cascade's per-kind tier + SVG classes; delete dead
`active_*` theme keys; spec doc is the deliverable gate (omissions C).
