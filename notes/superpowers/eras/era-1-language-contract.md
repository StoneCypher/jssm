# Era 1 — The 6.x Series: Language + Contract

> **Status:** stable · **Author:** Claude Fable 5 · **Date:** 2026-07-04
> **Mission:** Fill the 6.x series, trunk-based on main, with the two halves that make FSL what
> the corpus promises: the typed replayable **language** (P2/P3) and the portability
> **contract** (C1–C5). Everything here is ADDITIVE — the breakage batch shipped in 6.0.
> **Entry criteria:** 6.0.0 published; dual-track retired; dragon lane live.
> **DECIDED (John, 2026-07-04 — "accept all three"):** (1) second implementation is **Rust**;
> (2) C5 **consumes the compiled IR** (no second FSL parser; this triggers the irreversibles
> #14 IR-freeze at C5 start); (3) **M2 attempts era 1** inside WP-1.8's trust plumbing and
> slips to era 5 without ceremony if it doesn't fit — the record format (M1) is the
> irreversible part, the signing wrapper is not.

## Exit criteria

1. P2 (expression language) and P3 (contracts + safety checking) shipped across 6.x minors,
   each slice landing with spec+stoch+dragon+vector coverage.
2. C1–C4 exist as normative artifacts; C5 (second implementation) passes differential CI on the
   vector corpus, byte-identical canonical traces, in a lane that gates.
3. M1 (`check` + certificate record) and M4-subset (built-in run predicates) live.
4. Overlapping groups (§19) shipped; byte-level reversibility (#134: CST + `format`) shipped;
   the editor Format button live behind its round-trip interlock.
5. Every `open` irreversibles row whose first-touch trigger fired is specced (register updated).

## Work packets

### WP-1.1 · C1: the canonical `source_hash` spec — judgment · S–M · DO FIRST
The program's cheapest highest-leverage document (dag.md). Must decide and pin, with
conformance vectors: **normalization** (recommendation: hash the UTF-8 bytes of LF-normalized,
NFC-normalized source, BOM stripped — kills omissions D1 cross-OS mismatches); **algorithm**
SHA-256, tag `sha256:`; **layer identity** (the certificate subject is the normalized-source
hash; `proof_input_hash` = source ⊕ property ⊕ assumptions ⊕ checker-version, per irreversibles
#14 minimal slice); swap M3's `provisional:` seam; vectors must include CRLF, BOM, astral, and
NFC/NFD cases. Done when: spec committed, `fsl_hash` swapped, vectors green.

### WP-1.2 · C2: operational-semantics appendix — judgment · M · DO SECOND
Small-step pseudocode for the §12 macrostep: event selection order, guard evaluation, assign
journaling, internal-queue drain (FIFO), eventless cascade, microstep bound fault, invariant
check at stable, commit (journal discard) / rollback (reverse replay), observer/hook timing
points. Every rule cites its §28 decision-log row. Lands as a megaspec appendix on the same
PR-to-main flow as any 6.x work. Done when: two people (or two models) can hand-execute the
same tape identically from the text alone.

### WP-1.3 · C3: grammar appendix — judgment · M
Compact normative grammar for the new constructs: declarations (`val`/`prop`/`sensor`),
expressions, `assign`, `where`, contracts, weighted `LabelList` (+ normalization examples,
start-states + arrow-target positions unified), channels, factories, systems headers. The
fsl#818 proof-construct slice ships first (it blocks the example corpus #817). Also: sweep the
megaspec's remaining `%` comments to `//` (the §29 decided sweep — corpus hygiene).

### WP-1.4 · C4: conformance-vector format + seed corpus — judgment then mechanical · M
Schema `fsl.vector.v1`: `(document, seed, stimuli) → canonical trace + digest`, with id,
edition, feature tags, expected-result envelope. Trace events derive from WP-1.2 — C4 cannot
precede it. Seed the corpus by PROMOTING M3's determinism tests, then one vector per P2/P3
slice as they land (standing rule: no normative feature without a vector). Thin-harness
contract documented (per-host cost = the harness, not a suite port).

### WP-1.5 · C5: the second implementation + differential CI — judgment · L
Decision brief first (one page, for John): language (Rust recommended — WASM toolchain build
falls out, perf credibility, memory-safe; risk: iteration speed) and consumption model
(recommended: consume the compiled machine IR/JSON, do NOT reparse FSL — v6_suggestions'
"one canonical parser, N runtimes" posture; forces the IR freeze that irreversibles #14 wants
anyway). Scope strictly T1: states/transitions/actions/guards-free stepping + canonical trace
emission. Differential CI: both implementations run the full vector corpus; byte-compare
canonical traces; nightly full + PR smoke slice. Done when: a disagreement anywhere fails CI.

### WP-1.6 · P1 tail + the perf keystone — mechanical then judgment · M
Remaining val bugs (#755 non-null hole, #757 collisions, #758 validator no-op, #759 numeric
enums) as early 6.x patches. Then #756 (columnar val storage + undo-log journal, §28) — but
FIRST write the **runtime perf envelope** (omissions D4): explicit allowed-regression budget
vs the 6.0 graviton baseline, wired into the perf-envelope workflow. #756 is the enabling-infra
cost center the envelope exists to police.

### WP-1.7 · P2: the expression language — judgment · XL (the era's spine)
**Opening move: the generator/parser dual (a)** — grammar-as-data + document generator
(decision recorded in era-0 brief WP-6), so every subsequent grammar slice lands
generated-fuzzed at birth. Then slices, each shipping spec+stoch+dragon+vector: scalars &
literals → operators & precedence → `let`/`if`/`case` + exhaustiveness → containers + bounded
HOFs → `assign` + `where` → stdlib (§7, pinned infra per irreversibles #13) → lambdas
(defunctionalization tag normalization = irreversibles #12, spec at this slice). Entangled
infrastructure decision at slice 1: the PEG.js 0.10 substrate (semi-generation fsl#561,
possible parser regeneration) — decide once, at the workshop-renovation moment.

### WP-1.8 · P3: contracts + safety checking + trust plumbing — judgment · L
`require`/`ensure`/`invariant` (runtime asserts, §10/§11 semantics incl. rollback + error
model); safety-only checker (reachability, invariants — native BFS, no backends yet); **M1**
(`check` verb + unsigned certificate record per irreversibles #15, bound to WP-1.1's hash);
**M4-subset** (`reached_state`/`in_config`/`is_legal_run`/`never_entered` over M3 runs). M2
placement decided here (open question 3).

### WP-1.9 · Groups + leftovers — mixed · M
§19 overlapping groups (REFRESH the pre-vitest plan first); S2 value-module ports and S3
codegen reconciliation if era 0 didn't absorb them; jssm #921 manifest fix.

### WP-1.10 · Byte-level reversibility + Format — judgment · M
CST/trivia retention (decided: era 1 — John 2026-07-04), `format` verb, `parse→format→parse`
idempotence as an executable law in the vector corpus, editor Format button behind the
semantic-round-trip interlock (era-0 brief, downstream note).

## Ordering

WP-1.1 → WP-1.2 immediately (unblockers; both are writing, not code). Then three parallel
tracks: contract (1.3 → 1.4 → 1.5), language (1.6 → 1.7 → 1.8), surfaces (1.9, 1.10). The
tracks joint at the exit criteria: every P2/P3 slice feeds C4 vectors; C5 gates them all.

## The 6.x waves (subdivision of the ~270 v6 topics; each wave = one+ minor releases)

| Wave | Theme | Core content | ≈topics |
|------|-------|--------------|---------|
| 6.1 | Foundations | C1 hash + C2 appendix + dragon dual + P1 bug tail + perf envelope + error-code namespace + packaging fixes | ~25 |
| 6.2 | Scalars & expressions | numeric tower, literals, operators/precedence, if/let/case, quantifiers, string core (W6.1–.12, .32–.42, .57) | ~35 |
| 6.3 | Containers & data | tuple/array/set/bag/map/record, ADTs, option/any/T?, HOF protocol, streams (W6.13–.31) | ~30 |
| 6.4 | Mutation & contracts | assign+old, the contract quartet, violation model, error model, journal + #756 columnar, function-typed slots | ~35 |
| 6.5 | RTC & hooks | macrostep impl per C2, ordering/FIFO/bounds, macrostep hook points, handlers, lifecycle hooks, registry+introspection | ~30 |
| 6.6 | Groups & graph | §19 full, cascade, transition:{}/graph:{}, wildcards+resolution, eventless/else, arranged, multigraph — **independent of 6.2–6.4; may run parallel from 6.1** | ~35 |
| 6.7 | Conformance & N=2 | C3 (rolling), C4 format + corpus, IR freeze, Rust T1 runtime, differential CI — **starts at 6.1, gates everything at exit** | ~20 |
| 6.8 | Safety & trust plumbing | native safety checker, M1 cert record, M4-subset, budgets/undecided/estimate, M2 attempt | ~20 |
| 6.9 | Tooling & surfaces | format+CST+#134, lint, parse --json, explain, list, typegen, inspect, grammar exports, minifier, SVG/themes backlog, Format button | ~50 |
| lane | Perf (standing) | #712–#720 parser/transition levers, #1167 integer IDs — continuous, envelope-policed, not a wave | ~10 |

Dependency spine: 6.2 → 6.3 → 6.4 → (6.5, 6.8); 6.6 parallel; 6.7 rolling alongside all
(every wave lands its vectors); 6.9 trails grammar stability slice-by-slice. Feature gates
(shipped in 6.0's editions mechanism) let waves ship dark on trunk when a slice isn't
announce-ready — trunk-based never blocks on wave completeness.
