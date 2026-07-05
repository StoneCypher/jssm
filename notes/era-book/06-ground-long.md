# v6 — The Ground (long form)

> Format per README. Items = era-0 brief WPs + the 6.0 batch. Fable, at the wire.

**Atom charset restriction (#754).** *Manager:* Today a state can be named `foo,bar#baz`,
which breaks tooling, highlighting, and the future expression language (dot is member access,
dash is the arrow). 6.0 restricts unquoted names to identifier form; anything else gets
quotes. Migration is mechanical and the manifest documents it. Done = old symbol-bearing
barewords are parse errors with a quote-it suggestion. *CS:* peg `AtomFirstLetter/AtomLetter`
+ enum-member rule → `[A-Za-z_][A-Za-z0-9_]*`; corpus sweep of examples/tests; diagnostic
carries span + suggested_fix (quoted form); vectors: accept identifier, reject `a.b`/`1a`/
`a-b` with correct messages; manifest entry already written.

**`jssm-*` synonym removal.** *Manager:* The web components answer to two names; the old
`jssm-viz`/`jssm-instance`/`jssm-bind` aliases confuse docs and split search. 6.0 ships
`fsl-*` only. Done = aliases gone, README/examples swept, manifest entry added. *CS:* delete
alias registrations in `define_canonical()`; grep-kill `jssm-` tags in examples/site; add the
manifest entry (this IS the missing one from omissions C); tests assert alias tags no longer
upgrade.

**Probabilistic list-target split.** *Manager:* `a 50% -> [b c]` today copies 50% onto each
edge, which double-counts against sibling edges. 6.0 makes the origin % the group's weight,
split among members — the mathematically-correct reading, observable only in machines with
sibling probabilistic edges. Done = split semantics + manifest entry. *CS:* compiler fan-out
at `jssm_compiler.ts:149` changes copy→normalized-split (inner weights per §28 all-or-nothing
rule); histograph/walk tests updated to split expectations; vector: `a 50% -> [b 20% c 80%]`
⇒ 10/40; manifest entry documents copy→split with the sibling-edge example.

**Bare-functions API (§27).** *Manager:* The 420-method class makes bundles carry everything;
consumers asked for tree-shaking for years (#1167's API twin). 6.0 makes `import { create,
transition } from 'jssm'` the default, with the ENTIRE 5.x class intact at `jssm/compat` —
one import-line change for legacy users, proven by running the 5.x suite against compat
verbatim. Done = shaking proven by a bundle-size test; suite passes on compat; manifest entry
exists (it does). Fallback: re-batch to v9 if it slips >2 weeks. *CS:* extract state-record
type + free functions from class internals (methods already operate on fields); regenerate
`Machine` as mechanical delegation (single source of truth); entry-point split +
`sideEffects:false`; bundle test asserts absent symbols; wc/viz consume bare fns.

**The One Merge.** *Manager:* The v6 branch holds finished work (vals, tapes, the replayer,
codegen) that main can't see, and every main release widens the gap. One deliberate merge
brings it home as 6.0's feature payload and retires the dual-track forever. Done = assembly
branch = main ∪ v6, full build green, hand-resolved files documented. *CS:* worktree off
main; `git merge origin/v6`; real conflicts expected only in `jssm.ts`/compiler/peg/
`package.json` (take 6.0.0 line); ALL generated artifacts `--theirs` + `npm run build`;
verify #773 merged first; delta-audit note per semantic resolution; escalate on divergent
same-behavior edits.

**Dragon suite live (WP-6, decided trio).** *Manager:* Our adversarial grammar-fuzzing tier
exists as a harness and one kitchen-sink file, currently dormant. 6.0 revives it: green in
CI, three grammar sections at dragon tier, findings promoted to permanent regressions. The
full backfill closes by v6's end; from v7 every grammar change lands pre-fuzzed. Done = light
bar + doctrine live. *CS:* fix bit-rot in `kitchen_sink_dragon.maximal.ts` (print splitmix+fc
seeds on failure); lanes per decided budget (PR fixed-seed 60–90s / nightly 10–15m random /
weekly deep w/ mutation arms); implement dragons-egg §3/§4/§6 suggestion lists; convention:
find → minimal spec + fix + egg entry; lane gates on completion only.

**C1 canonical hash (SPEC WRITTEN — implement).** *Manager:* Every certificate, tape, and
lockfile forever binds to this identifier; the spec pins it before anything signs. Done =
`fsl_hash` swapped, ten vectors green. *CS:* per `2026-07-04-canonical-source-hash.md`:
UTF-8-or-refuse, BOM strip, CRLF/CR→LF, NFC, sync vendored SHA-256, `sha256:` tag;
`proof_input_hash` over RFC 8785; provisional-tag sunset at v9.

**C2 operational semantics (SPEC WRITTEN — conform).** *Manager:* The one paragraph everything
keys off is now executable pseudocode; implementations and the future trace schema conform to
it, not to habit. Done = M3 replayer + runtime audited against the appendix; deviations are
bugs. *CS:* per `2026-07-04-operational-semantics.md`: audit selection order, FIFO drain,
journal semantics, hook timing vs current `transition_impl`; file deltas as bugs; C4 trace
events will name these steps.

**Perf envelope (before any journal work).** *Manager:* We shipped −20%/−40% regressions once
without noticing; v9's journal is the next risk. Write the allowed-cost budget against the
6.0 graviton baseline first, so enabling-infra cost is a policed number, not a vibe. Done =
envelope doc + graviton workflow gate. *CS:* baseline = post-6.0 run (construct, unfixed
transition, edges_between, walk throughput); thresholds per case; envelope check wired to the
existing perf-envelope workflow; breach = block until justified.

**Tracker execution (drain + closes + umbrellas).** *Manager:* Both ledgers and the projection
are approved; executing them empties jssm, files the twelve umbrellas + six asks, closes
~235 fsl issues with living citations, and milestone-tags the survivors. Done = jssm at zero;
fsl mirrors the program. *CS:* file A/B (milestone-pinned); MIG twins "was jssm#NNN"; closes
cite umbrella+artifact (SUP), satellite twin (SAT), or verified code (DONE? — verify first);
record filed numbers back into the ledgers.

**Error-code namespace reservation.** *Manager:* Codes become public API the moment one ships;
reserving the scheme now costs an afternoon, retrofitting costs an edition. Done = scheme doc
+ existing error kinds mapped. *CS:* `FSL####` ranges by phase (parse/compile/runtime/
check/cli); ReplayError/ConfigError/CodegenError kinds get numbers; `explain` skeleton reads
the table; projection B6 files it.

**Audit re-verification (WP-1).** *Manager:* June's implementation audit found packaging and
fidelity issues against a tree that has since moved; re-verify so 6.0 fixes real things.
Done = verdict table under Corrections; pack-shape test green. *CS:* reproduce each of the
seven findings on both branches; `npm pack --dry-run --json` assertion test; envelope
validation + start-states fix in interchange or explicit lossy marking.
