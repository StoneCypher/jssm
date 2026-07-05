# 00-INDEX — The Era Program Ledger

> **This file is the resume point.** Update it FIRST (mark intent) and LAST (mark done) in every
> increment. If you are a successor model reading this after a halt: anything `in-flight` may be
> half-written; its "definition of done" line tells you what it was trying to be.
> Statuses: `done` · `in-flight` · `queued` · `deferred`.

**NEXT ACTION (for successors):** Projection A+B are FILED and LIVE (2026-07-04, Opus 4.8):
era umbrellas fsl#1401-#1411 + #1418, decision records fsl#1412-#1417, all open and
milestone-pinned (recorded in `issues-projection.md`). **Resume point = WP-8 jssm drain**, then
WP-7 fsl closes/milestone-tagging, then the era-0 code packets (WP-1 audit reverify, WP-6
dragon, WP-2 bug burn-down). The drain ledger (`dispositions/jssm-drain.md`) is approved and
reconciles EXACTLY with all 106 live open jssm issues (snapshot was 107; one closed since, no
orphan). **GATE before the drain files any twin:** the standing grant (HANDOFF) files new
issues only as written in an approved `issues-projection.md` revision, and §C (twins) / §D
(closes) are still placeholders — so the drain's fsl twins must be drafted from the ledger into
§C/§D and batch-approved by John before filing. Plan layer COMPLETE; all design questions
decided (dragon trio + era-1 trio). Pending from John: the fsl-org transfer window (HANDOFF,
time-sensitive) and the drain §C/§D go. Fable-optional: C1 hash spec, C2 ops-semantics appendix.

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
| 10 | `issues-projection.md` | done (drafted; awaiting approval) | A+B filed (Increment 2). §C/§D drafted from the approved drain ledger (Increment 4, John chose draft-then-approve): **95 twins** (milestone-grouped, umbrella-first, 623→825 + 621→792 folded) + **99 closes** (§D1–D3) + **7 KEEP-deferred** (§D4), reconciled to 106. 3 batched open-Qs with safe defaults. **Filing blocked until John approves this revision.** |

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
  still shows the old v12 names (left as-is, flagged here). Also corrected: the successor queue's
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
