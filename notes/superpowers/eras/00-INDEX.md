# 00-INDEX — The Era Program Ledger

> **This file is the resume point.** Update it FIRST (mark intent) and LAST (mark done) in every
> increment. If you are a successor model reading this after a halt: anything `in-flight` may be
> half-written; its "definition of done" line tells you what it was trying to be.
> Statuses: `done` · `in-flight` · `queued` · `deferred`.

**NEXT ACTION (for successors):** **The full v6→v16 tracker fill is EXECUTED (Increment 16,
2026-07-07, John-approved).** The era-book projection is now the live tracker + project board:
96 cluster nodes + 197 new item issues filed, 364 existing issues retrofitted into the
umbrella→cluster→item hierarchy, board fields set (Status=Triage / W-ID / Cluster + Size/Effort
on new items), 110 blocked-by links. fsl ~785→1076 open; 7 KEEP items correctly skipped (no fsl
twin). Umbrellas fsl#1401–#1411/#1418 + decision records fsl#1412–#1417 remain the anchors.
**The tracker + the `FSL Roadmap — 5.x → v16` project board (#2) are now the canonical plan
surface**; the era-book under `notes/era-book/` is the source-of-record the fill renders from
(executor: `build/era-projection/{render,execute}.mjs` — reconcile-first, idempotent, resumable,
fetch+GraphQL). Remaining threads: era-0 code packets (WP-2 bug burn-down etc.) on protected
`main` (needs John per-action); the fsl-org transfer window (HANDOFF, time-sensitive, John watches
from Sept 9); **label/effort/size on filed issues are heuristic first-pass** and open to a review
pass. **Lesson banked (Increment 5, reaffirmed 16):** reconcile against the LIVE tracker — the
Tjssm→fsl-twin map is derived from live "Migrated from jssm#N" pointers, not a stale ledger.

## Ledger

| # | Artifact | Status | Definition of done / notes |
|---|----------|--------|----------------------------|
| 1a | `HANDOFF.md` | done | Standing orders for successors; resume protocol; decided-vs-open lists |
| 1b | `00-INDEX.md` | done | This ledger |
| 1c | Founding docs copied to `../specs/` | done | `fable_sum_{critique,omissions,eras}.md` — committed here; untracked copies on the main checkout are now non-canonical |
| 1d | `issue-snapshots-2026-07-04/` | done | Frozen TSVs (number/labels/title): jssm open 107, jssm closed 434, fsl open 663, fsl closed 733 |
| 2a | `dag.md` | done | Workstream inventory w/ v6 state, explicit edge list, critical path (C1/C2 are the cheapest unblockers), era overlay table |
| 2b | `irreversibles.md` | done | 20-row register (registry-close 12 + omissions D1/D2/D10 + corpus pinning items), status legend, first-touch triggers, working discipline |
| 3 | `era-1-language-contract.md` | done | 10 packets; C1 hash spec + C2 ops semantics flagged DO-FIRST; C5 decision brief (Rust + IR-consumption recommended); dual as P2's opening move |
| 4–6, 8 | `eras-2-to-7-briefs.md` | done | Thin briefs, one file (supersedes separate era-2/3/4/5/6/7 rows): entry criteria, hazards, gates (era 4 PROCESS-gated, era 5 security-review-gated), era-3 ladder decision as headline |
| 7 | `era-0-cleanup-and-6.0.md` | done | **Executed as increment 3, promoted ahead of era-1** (John: end 5.x ASAP; renumber confirmed — era 0 ships as 6.0.0). Contains: exit criteria, phase plan, 10 work packets (incl. WP-4 One Merge, WP-3 bare-functions w/ 7.0 fallback, WP-6 dragon-live w/ 4 open questions for John), triage rulebook w/ disposition codes |
| 9 | `dispositions/` | delegated | Rules live in the era-0 brief rulebook (+MIG) and HANDOFF standing grant; the sweeps (WP-7 fsl 663, WP-8 jssm drain 107, codex-130 era-tagging) are executor work producing ledgers here |
| 10 | `issues-projection.md` | done (A/B/C/D executed) | A+B filed (Increment 2). §C/§D EXECUTED (Increment 5, 2026-07-05): **97 twins fsl#1419–#1515**, **99 jssm closes**, tracker drained 106→7 (KEEP set). Full map + 3 corrections in the projection's Execution log; drain ledger annotated EXECUTED. Corrections: #631 DONE?-refuted→migrated open (fsl#1514); #790 drop caught & migrated (fsl#1515); #919/#666 restored (were dropped from draft). |

## Increment log

- **2026-07-04 · Increment 1 (Fable):** Scaffold. Worktree `fable_new_v6_to_v12` created on
  `docs_26-07-04_fable-v6-to-v12` off `origin/v6` @ `c03bcdeb`. HANDOFF, INDEX, founding docs,
  frozen tracker snapshots. Context available to author: full v6 corpus read (all specs + plans +
  review corpus), both trackers surveyed in full (titles/labels), era decomposition agreed with
  John. Priority order for remaining increments = ledger order (2a → 2b → 3 → 4 → 5 → 6 → 7 →
  8 → 9 → 10), chosen by value × irreproducibility-of-Fable's-loaded-context.
- **2026-07-04 · Increment 2 (Opus 4.8, John's go):** Projection A+B executed. 11 era umbrellas
  filed fsl#1401-#1411 plus the 5.x umbrella fsl#1418, each pinned to milestones #48-#59; 6
  decision records filed fsl#1412-#1417 (B2-B6 → v6/#49 as children of #1401, B1 → v12/#55 under
  #1407). Recorded in `issues-projection.md` §A/§B. (Increment log not updated at the time;
  backfilled here for the survivor trail.)
- **2026-07-04 · Increment 3 (Opus 4.8, resume + reconcile):** Fresh-session orientation.
  Verified projection A+B live, open, and milestone-pinned on fsl. Reconciled
  `dispositions/jssm-drain.md` against the live jssm tracker: 106 open issues (922 down to 607),
  ledger covers 100%; snapshot drift 107→106 = one issue closed since, no orphan. **Correction:**
  the worktree/branch were renamed `fable_new_v6_to_v12` / `docs_…v6-to-v12` →
  `fable_new_v6_to_v16` / `docs_…v6-to-v16` in the five-way-split renumber; the HANDOFF header
  still showed the old v12 names at this point (fixed later in Increment 8). Also corrected: the successor queue's
  "step 1 = file projection A+B" was already complete (Increment 2), so the true resume point is
  the WP-8 drain. Surfaced to John the §C/§D drafting gate before the drain can file (see NEXT
  ACTION); awaiting his drafting-vs-direct-file decision.
- **2026-07-04 · Increment 4 (Opus 4.8, WP-8 drafting):** John chose draft-then-approve. Pulled
  all 106 live jssm titles/labels; drafted `issues-projection.md` §C (95 twins, grouped by
  milestone #49–#59, umbrella-first, with jssm#623→M1-twin and jssm#621→formatter-twin folds) and
  §D (99 closes: D1 97 migrations, D2 #871 dup, D3 #631 DONE?-verify; D4 lists the 7 KEEP items
  that close via their own PRs). Reconciles to 106 exactly. Left 3 batched open-Qs for John
  (milestone retags for #756/#650, #826 e1-vs-e5, AI-distribution hierarchy) — all defaulted so
  they don't block filing. NO tracker action taken; awaiting John's one batch approval of the
  revision before any twin is filed or any jssm issue closed.
- **2026-07-05 · Increment 5 (Opus 4.8, WP-8 drain EXECUTED):** John gave the go (defaults
  accepted). Filed **97 fsl twins (fsl#1419–#1515)** milestone-pinned + `Created by AI`,
  umbrella-first; **closed 99 jssm** with citation comments; jssm tracker drained 106→7 (KEEP
  set). Ran via a resumable state-file script (scratchpad, uncommitted). Three reality-corrections
  (all recorded in the projection Execution log + drain ledger): (1) #631 `DONE?` refuted by code
  → migrated OPEN as fsl#1514 not closed-done; (2) #790 had been dropped from the draft §C —
  caught by reconciling the live tracker post-batch (8 open, not 7) and migrated as fsl#1515;
  (3) #919/#666 (MIG, absent from draft §C) restored and filed. Full jssm→fsl map in the
  projection. Method note banked in NEXT ACTION: always reconcile against the live tracker after a
  batch — the internal asserts were self-consistent yet one short.
- **2026-07-05 · Increment 6 (Opus 4.8, KEEP-note correction):** Checked the "fix PR queued"
  claim against live PRs — ZERO open PRs on either repo. Found the val KEEP fixes (#755/#757/#758/
  #759) already merged to the **v6 branch** (jssm PRs #761/#760, 2026-06-16); they didn't
  auto-close because GitHub only auto-closes from the default branch (main). Sharpened the drain
  ledger KEEP rows to "FIXED ON v6 … closes on the WP-4 One Merge" (matching #827's already-on-v6
  status), and added a **KEEP-issue closers** bullet to WP-4 requiring the One Merge PR to carry
  `Closes #755 #757 #758 #759 #827` (+#921) so they auto-close from main. #754 stays WP-5.
- **2026-07-05 · Increment 7 (Opus 4.8, two decisions banked):** (1) **WP-4 merges the docs
  branch, not bare v6** (John) — docs is a superset of v6, so the One Merge lands the era book on
  main "for posterity"; recorded in the WP-4 packet + Corrections. (2) **fsl-org deadline
  corrected** — prior owner deleted 2026-06-14; 90-day no-exceptions window ⇒ ~Sept 12 deadline
  (HANDOFF said early October); John watches from Sept 9. HANDOFF time-sensitive + Corrections
  updated. v6-branch fate reaffirmed: keep frozen/protected, retire at WP-9 after 6.0.0 verifies.
- **2026-07-05 · Increment 8 (Opus 4.8, drift fix):** Fixed the stale program/branch naming in
  the HANDOFF header — title, worktree/branch line, and the "this branch is free" line now read
  `v6→v16` / `fable_new_v6_to_v16` / `docs_26-07-04_fable-v6-to-v16` (were `…v12`), with a short
  note recording the original scaffold names + the 5.x→v16 scope. Increment-1 log keeps the v12
  names as true history; increment-3's "still shows old names" flag updated to point here.
- **2026-07-05 · Increment 9 (Opus 4.8, WP-7 5.x slice):** Moved forward on 5.x. Live-verified the
  30 `e0` rows (all still open, no snapshot drift) and **milestone-tagged them to fsl #48** (batch
  gh edit; 4 transient GraphQL fails retried clean) — #48 now shows 31 open (30 + umbrella #1418),
  so the 5.x burn-down is visible on the tracker. Reconciled the book-vs-ledger charset drift:
  #505/#1195-#1199 are `e1`/v6 (umbrella #1379), not 5.x - corrected the era-book 5.x onepager.
  Flagged #1307 as satisfied-by-the-drain (close at 6.0). **Next on 5.x = the CODE burn-down**
  (WP-1 audit reverify -> pack-shape test; WP-6 dragon revival; WP-2 bug fixes) - those ship as
  5.158.x patches from protected `main`, so they need a worktree off main + John's per-action go.
- **2026-07-05 · Increment 10 (Opus 4.8, WP-1 audit re-verify):** John's go. Worktree
  `fix_26-07-05_5x-audit-reverify` off main @ b5509127. Re-verified all 7 megaspec-critique §1
  findings vs main (5.159.2) + origin/v6. **Verdict (table in the era-0 brief Corrections):
  nothing on main/5.x needs fixing** — #1 (pack shape) already FIXED on main (files allowlist +
  npm pack now include dist/cli/lib.* + jssm.cli.d.*, confirmed); #7 (FmtConfig) FIXED; #2–#6 are
  v6-only surfaces (codegen/interchange absent from main src, confirmed via git grep origin/v6) →
  recorded as v6-assembly re-verification items, NOT 5.x WP-2. So **WP-2 inherits zero audit
  items.** Remaining WP-1 deliverable: the pack-shape regression test (guards #1) on the worktree,
  → a 5.158.x patch (needs /sc-commit + John's merge, main protected).
- **2026-07-05 · Increment 11 (Opus 4.8, WP-1 CLOSED):** The pack-shape test already exists on
  main — `src/ts/tests/pack_shape.spec.ts` (added ~5.143.x with #1's fix): walks exports/bin/entry
  targets, asserts each is in `npm pack --dry-run --json`, skips when unbuilt, 120s timeout.
  **Verified passing** (ran not skipped: 1 passed, 5.7s) on the built main worktree. So **WP-1 is
  DONE with zero code changes** — both done-when conditions met, no 5.158.x patch needed. Worktree
  `fix_26-07-05_5x-audit-reverify` is clean (verification-only), free to reuse for WP-6 or remove.
  **Next 5.x code packet = WP-6 dragon phase A** (revive kitchen_sink_dragon, green locally + CI
  smoke lane) — the first packet that will actually produce a shippable change; needs a main
  worktree + John's per-action go.
- **2026-07-05 · Increment 12 (Opus 4.8, WP-6 dragon — step 1):** John's go. Reused the WP-1
  worktree, renamed its branch → `test_26-07-05_dragon-revival` (off main, pushed). Baseline:
  `npm run vitest-dragon` was ALREADY green (vitest port already done; 100 tests) — but the
  kitchen-sink ran `fc.assert` at collection time with a deferred `test()` per iteration, so
  fast-check never saw the assertion (no shrinking, no reproducible seed on a find). **Refactored**
  it to assert inside `fc.property` (one `it()`, numRuns 100); generation/walk logic preserved.
  **Verified**: green; and with the assertion temporarily inverted to force a find, fast-check
  printed `{ seed: 740228835 }` + `Counterexample: [false,0]` (the splitmix gen_seed) + `Shrunk 1
  time(s)` + the machine — both seeds, reproducible. eslint clean. Committed abb1ad83 (branch not
  yet /sc-committed — batching WP-6 into one 5.158.x patch). **WP-6 remaining:** CI lane (3-tier
  smoke/heavy/deep, touches nodejs.yml — release-sensitive), the 3 §-expansion dragon files (§3
  numeric, §4 colours, §6 arrow-decorations — the dragons-egg suggestions), find-handling doc,
  egg status update.
- **2026-07-05 · Increment 13 (Opus 4.8, WP-6 §6 dragon + first real find):** Wrote
  `arrow_decorations.maximal.ts` (§6 dragon: N≥3 + identical-value duplicate rejection, WS-run
  invariance, block/line comment invariance, malformed-report — all probed against the parser
  first). **The dragon immediately earned its keep:** writing it surfaced that
  `arrow_decorations.stoch.ts`'s `shuffle` used `rng() % (i+1)` on a float RNG → fractional index →
  `out[j]` always `undefined` → every shuffle collapsed to `[out[0], undefined,…]`, making the
  three order-invariance stoch tests **fake** (both sides degraded to one decoration, passed
  trivially). Fixed shuffle (real Fisher-Yates) + added a deterministic permutation guard; order
  invariance now genuinely holds (stoch green, 12). Logged the find + find-handling convention +
  dragon-tier-live in `dragons-egg.md`. Verified: dragon 16 green, stoch 12 green, eslint clean.
  Committed 9c22e282, pushed. **WP-6 remaining:** §3 + §4 dragon expansions, the CI lane
  (nodejs.yml, needs your review), then /sc-commit the batch as one 5.158.x patch.
- **2026-07-05 · Increment 14 (Opus 4.8, WP-6 §3+§4 dragons — expansions COMPLETE):** Wrote
  `colors.maximal.ts` (§4: invalid-length/WS/non-hex rejection, mixed-case preservation, Rgba8
  alpha round-trip — no finds, colour grammar solid) and `numeric.maximal.ts` (§3: any-position
  octal/binary rejection, degenerate radix prefixes, exact large-hex, negative rejection,
  case-sensitive constants, large-time no-overflow). All behaviours probed against the parser
  first. Dragon suite now **33 tests across 4 files, green**; eslint clean. Egg updated (§3/§4
  dragon-tier live, entries + flagged gaps: rebeccapurple/CSS4, SemVer harness held). Committed
  b46fcbee, pushed. **The three DECIDED 6.0 §-expansions (§3/§4/§6) are DONE.** WP-6 remaining is
  just: (1) the CI lane (3-tier, edits nodejs.yml — release-sensitive, to show John as a diff
  before landing), then (2) /sc-commit the whole branch as one 5.158.x patch (needs John's merge,
  main protected).
- **2026-07-05 · Increment 15 (Opus 4.8, WP-6 SHIPPED to PR):** John approved the minimal CI-lane
  diff. Committed the `dragon` CI job (e646a187), then /sc-commit: version 5.159.2→**5.159.3**
  (patch — test/tooling/docs only), full `npm run build` green (perf-chart refresh was canonical
  graviton c8g data, not local benny), release commit bf0bec4c. Pushed; opened **jssm PR #927**
  → main (Refs fsl#1418, fsl#65; no `closes` keywords — left for John). **WP-6 dragon phase A is
  code-complete and awaiting John's merge** (main protected). Meets the DECIDED 6.0 dragon exit
  bar: kitchen-sink revived + green in CI + the three §-expansions. Held for follow-up (in the
  egg): 3-tier CI budget (env-driven runs/seed + cron; deep tier wants mutation arms) and the
  SemVer-prerelease §3 dragon test. **After #927 merges + npm shows 5.159.3:** WP-2 inherits zero
  audit items (per WP-1), so the 5.x bug burn-down is just the ~30 milestone-#48 e0 issues — the
  remaining 5.x code work before the assembly branch / One Merge (WP-4).
- **2026-07-07 · Increment 16 (Opus 4.8, FULL v6→v16 TRACKER FILL EXECUTED, John-approved):**
  Rendered the entire era-book (`notes/era-book/items/*.json`) into the tracker + project board.
  Built `build/era-projection/{render,execute}.mjs` (reconcile-first, idempotent, resumable;
  transport migrated mid-run from `gh`-spawn → direct REST+GraphQL fetch with `--use-system-ca`,
  then concurrency=5, to beat a ~1–7 min background-runtime cap; final run 119s). **Executed:**
  96 cluster nodes created + nested under their era umbrellas; **197 new item issues filed**
  (incl. the MCP split — see below); **364 existing issues retrofitted** into umbrella→cluster→item
  (7 KEEP items `Tjssm-754/755/757/758/759/827/921` correctly skipped — fixed on v6, no fsl twin);
  board fields set (Status=Triage, W-ID, Cluster on all; Size/Effort heuristic on the 197 new);
  **110 blocked-by dependency links**. fsl open ~785→**1076**. **MCP roadmap edit:** split W8.22 —
  `fsl-mcp` authoring satellite pulled to **v6** (Wmcp.1=#1528), debugging/time-travel half stays
  **v12**; Wmcp.2–6 thread the tool through v7–v11 + a standing keep-current rule; satellite spec
  at `notes/superpowers/specs/2026-07-07-fsl-mcp-authoring-satellite.md`. **Verified live:** v6/#1401
  + v16/#1411 hierarchies; board fields on #1527 (W6.100) and #1642 (W12.3); dependency #1802←#1528.
  Committed 07db41d8 (era-book + spec + projection). **Cluster granularity (John, Option 1):** a
  (cluster,version) slice ≥2 → cluster node; singleton → direct under umbrella. **Two bugs caught
  in the v6 pilot before scaling:** twin pointer is "Migrated from jssm#N" (not "was jssm#N"), and
  cluster nodes must be explicitly nested under umbrellas. **Open:** labels/effort/size are
  first-pass heuristics, invite a review pass.
