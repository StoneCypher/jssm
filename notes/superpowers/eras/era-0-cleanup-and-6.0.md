# Era 0 — Cleanup → 6.0.0: Ending the 5.x Line

> **Status:** stable (packet WP-6 carries open questions for John) · **Author:** Claude Fable 5
> · **Date:** 2026-07-04
> **Mission:** Ship **6.0.0 from main**, carrying the decided breakage batch and the v6
> integration branch's completed content, retiring the dual-track permanently; triage both
> trackers; bring the dragon suite live. This is the era successors execute FIRST — John needs
> the 5.x line over ASAP; the merge-up process is the program's standing toxicity.
> **Open questions:** WP-6 dragon scope questions (for John); WP-3 bare-functions fallback
> decision point (defined below, decide when reached, not now).

## Exit criteria (all must hold)

1. `npm view jssm version` reports **6.0.0** (verify explicitly — releases can silently fail on
   a flaky matrix leg; see memory/recipes).
2. `v6_breaking_changes.json` is complete and every entry shipped (or explicitly re-batched to
   7.0 with the manifest relabeled).
3. The `v6` integration branch is fully merged into main and retired (archival/deletion needs
   John's explicit permission — branch deletion is never unilateral).
4. Both trackers triaged per the rulebook below; disposition ledgers committed; any mass-close
   list delivered to John as a proposal, **not** executed unilaterally.
5. The dragon suite runs green in CI on some lane (gating policy per WP-6).
6. The June implementation audit re-verified; packaging (pack-shape) fixed and tested.

## Sequencing (phases; packets within a phase can parallelize)

```
Phase A (on main, 5.158.x patches):  WP-1 audit reverify   WP-2 bug burn-down   WP-6 dragon
                                     WP-7/WP-8 triage sweeps (off-tree, no releases)
Phase B (assembly branch opens):     WP-4 One Merge
Phase C (on assembly branch):        WP-3 bare-functions   WP-5 small breakage batch
Phase D (release event):             WP-9 6.0.0 ships, v6 branch retired
Phase E (immediately after):         WP-10 post-6.0 tail (P1 bugs as 6.0.x)
```

The assembly branch is a bounded mini-instance of the pattern we're killing: it exists for
weeks, not months; main continues 5.x *patches only* during Phase C (feature freezes by
agreement with John near Phase D); the branch re-syncs from main cheaply because post-freeze
diffs are mostly generated artifacts (recipe: `--theirs` on generated, rebuild).

## Work packets

Format: **type** (`judgment` needs design sense / `mechanical` executes rules), **size**
(S ≤ half a session, M ≈ a session, L = multi-session), inputs, definition of done,
verification, escalation triggers. All repo rules per `HANDOFF.md` apply to every packet.

### WP-1 · Re-verify the June implementation audit — mechanical · S
- **Inputs:** `fable_sum_critique.md` §"staleness hazards"; megaspec-critique.md §1 (the seven
  findings); current main + v6 heads.
- **Do:** For each finding (package-shape drift, unwired verbs, JSON interchange envelope +
  start-states, forced-transition erasure in codegen, config-schema drift, test type-import
  drift): reproduce or refute against BOTH branches. Fix what's cheap (pack-shape test via
  `npm pack --dry-run --json` assertion; envelope validation); file the rest into the WP-2 list.
- **Done when:** a dated verdict table is appended to this file under `Corrections`; pack-shape
  test exists and passes.
- **Escalate if:** a finding implies published-package breakage for current 5.x users (tell John
  before fixing — it may deserve an immediate 5.x patch release).

### WP-2 · 5.x bug burn-down — mechanical-to-judgment mix · M
- **Inputs:** the `e0`/`KEEP` rows of the two disposition ledgers (the authoritative feed).
  *Correction 2026-07-04: an earlier draft cited jssm #605/#584/#557/#515 — those are already
  closed; the ledgers supersede that list.*
- **Do:** TDD each (repo rules: fix, never pin; no fake tests; stoch where apt); ship as 5.158.x
  patches from main, batched to avoid one-release-per-typo.
- **Done when:** the triage ledger's `keep-5x-bug` bucket is empty or explicitly deferred with
  reasons.

### WP-3 · Bare-functions API split (§27) — judgment · L (the long pole; start FIRST in Phase C)
- **Inputs:** megaspec §27 + §28 "JS API shape" row; `v6_breaking_changes.json`
  `bare-functions-default-api` entry.
- **Do:** the four §27 phases: extract state-record + bare functions from the class internals;
  regenerate `Machine` as the delegating `jssm/compat` class; split entry points +
  `sideEffects:false` + bundle-size test; run the **5.x suite verbatim against compat** — that
  suite IS the compatibility contract.
- **Done when:** default `jssm` import = bare functions; `jssm/compat` passes the 5.x suite
  unmodified; bundle-size test proves shaking.
- **Fallback decision point:** if, when Phases A–B are done, WP-3 is projected to delay 6.0 by
  more than ~2 weeks, ask John whether to re-batch it to 7.0 (manifest entry relabels 5→7).
  Neither outcome is wrong; delay-vs-scope is his call.

### WP-4 · The One Merge — judgment · M–L
- **Inputs:** memory recipes (mid-PR release race; `--theirs` generated + rebuild); convergence
  doc's mechanics section; current divergence (v6 is 159 ahead / ~270 behind).
- **Do:** worktree off latest main; `git merge origin/v6`; resolve real source conflicts
  (expect: `jssm.ts`, `jssm_compiler.ts`, the peg, `package.json` — take the 6.0.0-alpha line
  and set 6.0.0-alpha.next; both sides' tests are additive, keep both); resolve ALL generated
  artifacts by `--theirs`-then-full-rebuild (`npm run build`, from Bash, per memory); full suite
  green.
- **Done when:** assembly branch holds main ∪ v6 with green `npm run build`, and a
  delta-audit note lists every file where a semantic (non-generated) conflict was hand-resolved.
- **Escalate if:** a conflict implies v6 and main changed the same *behavior* divergently
  (not just adjacently) — stop and document rather than guess.
- **Note:** verify S1 (#773 totality PR) merged into v6 beforehand; if still open, merge it to
  v6 first (needs John's per-action OK — v6 is protected) or fold it into the assembly branch.

### WP-5 · Small breakage batch — mechanical · M
- **Inputs:** manifest entry #754 (atom charset — grammar + corpus sweep, per its
  `implementation` field); wc synonym policy memory (remove `jssm-viz`/`jssm-instance`/
  `jssm-bind` synonyms, `fsl-*` only); megaspec §28 multigraph row (probabilistic list-target
  copy→split, only observable with sibling probabilistic edges).
- **Do:** each on the assembly branch, TDD; **add the two missing manifest entries** (synonym
  removal, probabilistic split) as part of the work.
- **Done when:** all three land; manifest has 4+ complete entries with migration text.

### WP-6 · Dragon suite live — judgment first, then mechanical · M (Phase A; do EARLY)
- **What the dragon is (reconstructed from disk — John to correct):** the testing tier above
  stoch. Three artifacts exist: `notes/dragons-egg.md` (the tracker: per-grammar-§ stoch
  coverage, each entry carrying explicit dragon-tier suggestions — mutation testing of grammar
  alternative order, grammar-shaped negative fuzzing at every position, cross-kind interaction
  fuzzing, WS/comment interleaving, round-trip laws); `vitest.dragon.config.ts` (harness: runs
  `**/*.maximal.ts`, independent coverage to `coverage/ksd`, thresholds 0 = ungated);
  `src/ts/tests/kitchen_sink_dragon.maximal.ts` (the seed: splitmix-seeded random graph
  generators — loopable chain-graphs and terminating semi-stars — with random WS and edge types,
  driving construction + long walks).
- **Do:** (1) get `npm run vitest-dragon` green locally (the kitchen-sink file predates the
  vitest migration era — expect bit-rot); ensure failures print their seeds (splitmix seed +
  fc seed) so every find is reproducible; (2) wire a CI lane (interacts with jssm #922
  push-only-heavy-jobs decision — dragon belongs in the heavy lane); (3) implement the
  dragon-tier suggestion lists for the three covered grammar sections (§3 numeric, §4 colors,
  §6 arrow decorations) from dragons-egg.md — they are already itemized there; (4) establish
  the find-handling convention: every dragon find becomes a minimal deterministic `*.spec.ts`
  regression + a source fix (never pinned), and gets a dragons-egg entry; (5) update
  dragons-egg.md's status table as sections come live.
- **Why era 0:** hardens the parser/compiler before the One Merge's val grammar and era 1's P2
  grammar land on them; the generator lineage becomes the fuzz corpus for the era-1 conformance
  work (C4) and the megaspec §26 self-fuzzing posture.
- **DECIDED (John, 2026-07-04) — round-trip scope:** era 0 ships **semantic** round-trip
  (`parse(emit(parse(src)))` AST/graph-equal, via the lossy regenerator once its start-states
  bug is fixed); **byte-level** reversibility (#134: CST/trivia retention, true bijection) is
  era 1, riding the C3/C4 + formatter work. The full #579 generator/parser dual is era 1's
  opening move when P2 grammar surgery begins (it pays per-rule-added-after); optional era-0
  stretch ONLY if the lane comes up fast: a crude grammar-walking generator built by parsing
  the `.peg` with PEG.js itself (FSL's declare-by-use property makes generated documents
  unusually likely to be semantically valid).
- **DECIDED (John, 2026-07-04) — the dragon trio:**
  1. **Scope:** the **6.0.0 exit bar is light** — kitchen-sink revived + green in CI + the three
     pre-itemized §-expansions (§3 numeric, §4 colors, §6 arrow decorations). The **full
     dragons-egg gap list (§2, §5, §7–§11: stoch then dragon tier) closes by the END of the v6
     major** — a v6→v7 transition gate, worked through 6.x releases. Standing rule from v7 on:
     every new grammar slice lands with its dragon tier at birth.
  2. **Gating doctrine (permanent): the detector never gates; findings gate via promotion.**
     The dragon lane gates only on infrastructure-green (suite completes). Every confirmed find
     → minimal deterministic `*.spec.ts` regression + source fix (never pinned) + dragons-egg
     entry; those spec tests gate like any other. Generative flake can never block a release;
     confirmed bugs always do.
  3. **CI budget — three tiers, budgeted by iteration counts, not timeouts:** (i) PR smoke:
     fixed-seed deterministic slice, ~60–90s, always on; (ii) push-to-main/nightly heavy:
     ~10–15 min, randomized seeds, every failure prints its seed pair (splitmix + fc) for exact
     replay — folds jssm #922's heavy-jobs-to-main-only direction; (iii) weekly deep: 1–2 h,
     mutation-testing arms + big-N walks, emitting repro artifacts (seed + generated document)
     for hand-promotion.
- **Downstream note (era 1, recorded here so it isn't lost):** the editor gets a **Format
  button** when the pretty-printer (#792) lands — `<fsl-toolbar>` already ships buttons; the
  button applies the format as ONE CodeMirror transaction (undo-safe), via text-diff so the
  cursor maps, and **guards itself with the era-0 semantic round-trip check**: format → reparse
  → AST-compare → apply only on equality, else refuse and report a formatter bug. The era-0
  law becomes the button's safety interlock.
- **Done when:** dragon lane green in CI under the agreed policy; ≥3 grammar sections at
  dragon tier; find-handling convention documented in dragons-egg.md.

### WP-7 · fsl tracker triage sweep (663 open) — mechanical (delegate; subagent-friendly) · L
- **Inputs:** `issue-snapshots-2026-07-04/fsl_open.tsv`; the rulebook below.
- **Do:** classify every open issue into exactly one disposition; output
  `dispositions/fsl-triage.md` as a table (number · disposition · era/target · one-line note).
  Work in slices of ~100; commit per slice (halt-tolerance).
- **Done when:** all 663 rows dispositioned; bucket counts summarized; the `close-proposal`
  list extracted to `issues-projection.md` for John's batch approval.

### WP-8 · jssm tracker DRAIN — mechanical · M
- **Policy (John, 2026-07-04): the jssm tracker is kept EMPTY** (npm search-ranking signal);
  all new issues go to fsl, permanently. So WP-8 is not triage-in-place — it is
  **migrate-or-close for all 107**: every keeper (trust stack #825–#830, perf levers, wc suite,
  val tail, CLI verbs, AI-distribution block) gets an fsl twin ("was jssm#NNN" in the body, era
  tag per the rulebook) and the jssm original closes citing the fsl number; everything else
  closes as SUP/DONE?/SAT per the rulebook. Output: `dispositions/jssm-drain.md` ledger →
  John's batch approval → mechanical execution under the standing grant (HANDOFF). PRs fixing
  migrated items use cross-repo `closes StoneCypher/fsl#N`.

### WP-9 · The 6.0.0 release event — judgment · S–M
- **Do:** `/sc-commit` on the assembly branch (version → 6.0.0, full `npm run build`, never
  `make`); PR to main; John merges (protected branch — his action); then **verify**:
  `npm view jssm version`, tag exists, CI release job green end-to-end; re-merge/--theirs/
  re-bump recipe if a 5.x patch raced the PR. Then ask John about retiring the `v6` branch.
- **Done when:** exit criteria 1–3 hold.

### WP-10 · Post-6.0 tail — mechanical · M
- P1 val bug-tail as 6.0.x/6.1 from main, trunk-based: #755 non-null hole, #757 collisions,
  #758 validator no-op, #759 numeric enums; then #756 (columnar + journal) with the perf
  envelope written first (omissions D4; irreversibles row-adjacent).

## The triage rulebook (for WP-7/WP-8)

One disposition per issue:

| Code | Disposition | Rule |
|------|------------|------|
| `E1`–`E7` | absorb into era N | The issue IS era work (megaspec issue map, trust stack, fleet targets, ecosystem listings). Note the era; the issue stays open, retagged when John approves label changes. |
| `SUP` | superseded by program | Tutorial/video/course/propaganda issues whose content the manual program (taxonomy/templates/curriculum) now owns; also features the megaspec absorbed where the issue adds nothing the spec lacks. Goes on the close-proposal list with a one-line pointer to what supersedes it. |
| `KEEP5` | genuine near-term bug/QoL | Feeds WP-2. |
| `SAT` | satellite repo | Highlighters/editors/apps whose home is another repo (sublime-fsl, vscode-fsl, future fsl-grammars). Close-proposal with pointer, or retag, per John. |
| `DONE?` | probably already done | Title suggests shipped work (e.g. things the style-cascade/serialize/hooks programs completed). Verify against code before proposing close; if verification is nontrivial, mark `DONE?-unverified`. |
| `META` | list/umbrella issue | Re-point at the era map; propose converting to era umbrellas (issues-projection). |

Add disposition `MIG` — migrate to fsl (jssm issues only; fsl twin filed, jssm side closed with
cross-reference), per the jssm-empty policy.

Hard rules: tracker mutations ONLY under the HANDOFF standing grant (prepare → John approves the
ledger batch → mechanical execution; nothing off-ledger); **all new issues go to fsl, never
jssm**; every close carries a citation comment; the snapshot is the triage universe (note live
drift, don't chase it); when two dispositions fit, prefer the one that produces less work
(`SUP` over `E7` for pure-marketing items); anything genuinely ambiguous gets `ASK` and a
one-line question, batched to John, not one-at-a-time.

## Corrections

*(append dated corrections here as packets discover reality diverging from this brief)*
