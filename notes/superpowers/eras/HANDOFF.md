# HANDOFF — The v6→v12 Era Program

> **What this directory is.** The working home of the FSL/jssm era program: the decomposition of
> the v6 corpus into eight major-version eras, and the planning artifacts successor models need to
> execute them. Authored by **Claude Fable 5** (July 2026) during a limited-availability window,
> deliberately structured so that **Opus, Codex, or any successor can resume at any point,
> including after an unannounced mid-work halt.**
> **Worktree:** `fable_new_v6_to_v12` · **Branch:** `docs_26-07-04_fable-v6-to-v12` (off `origin/v6`).
> **The ledger is `00-INDEX.md`. Read it first. Always. It says what exists, what was in flight,
> and what the next action is.**

## How to resume (successor checklist)

1. Read `00-INDEX.md`. Any artifact marked `in-flight` may be half-written — its intent line says
   what "done" meant; finish or restart it against that definition.
2. Read `../specs/fable_sum_eras.md` (the era map), then `fable_sum_critique.md` and
   `fable_sum_omissions.md`. These three are the founding documents; they compress a full read of
   the v6 corpus plus both issue trackers.
3. Do **not** re-read the whole v6 corpus to get started — the briefs in this directory exist
   precisely so you don't have to. Deep-read a corpus document only when a brief points you at it.
4. Work in increments. Before starting an artifact: mark it `in-flight` in the INDEX with a
   one-line definition of done. After finishing: mark it `done`. Commit and push **every**
   increment. The remote is the survivor, not your session.
5. Update `00-INDEX.md` as the **first and last** edit of every increment.

## What is decided (do not re-litigate)

- **The era decomposition itself** — eight eras, cleanup → language+contract → society → proofs →
  survival → trust → fleet → ecosystem — per `fable_sum_eras.md`, agreed with John 2026-07-04.
  In-corpus "v7" labels are obsolete shorthand for "post-v6."
- **The versioning model (confirmed 2026-07-04, twice-amended — CANONICAL: the v6→v16 five-way
  split).** Breakage-batch-opens-major stands; old-v6 subdivides into five majors and downstream
  renumbers +4. **Translation map** (work-era IDs and ledger `eN` codes are STABLE): era0/`e0`
  → **v6 "The Ground"** (+5.x Long Goodbye patches); era1/`e1` → **v7 Computing / v8 Structured
  / v9 Transactional / v10 Portable** (wave→major note in the era-1 brief); era2/`e2` → **v11
  Composable**; era3/`e3` → **v12 Proven**; era4/`e4` → **v13 Durable**; era5/`e5` → **v14
  Trusted**; era6/`e6` → **v15 Ubiquitous**; era7/`e7` → **v16 Public**. Pithy names are
  PUBLIC-FACING (John, 2026-07-04). Canonical table with
  pithy names + counts: `../specs/fable_sum_eras.md`. v9 opens with the mDT→val-record
  hook-retarget breakage batch; the era-0 bare-functions fallback re-batches to v9 if taken.
- **The dragon suite goes live in era 0** (John, 2026-07-04): the grammar-adversarial testing
  tier (see `notes/dragons-egg.md`, `vitest.dragon.config.ts`, `kitchen_sink_dragon.maximal.ts`)
  is a 6.0 exit criterion, so era-1 grammar work lands on a hardened parser.
- **The cleave**: the portability *contract* (canonical IR/hash/ABI/pinning + one second
  implementation, differential CI at N=2) lands in era 1; the host *fleet* lands in era 6.
- **Survival (durable execution) is its own era**, after Proofs, before Trust and Fleet; it
  finalizes the ABI's effect/persistence surface before the fleet exists.
- **Standing rules** (fable_sum_eras.md §"Standing rules"): ring discipline; breakage batches at
  era boundaries; irreversibles specced at contract quality when first touched; the
  blind-thinkthrough PROCESS gates Survival and Trust (Trust with a security-lensed reviewer).
- Everything in the megaspec's **decision log (§28)** is settled unless an era brief explicitly
  reopens it with a reason.

## What is open (genuinely undecided — surface these, don't guess)

- The **automata-ladder conflict**: megaspec §3's four rungs vs the Gemini push-up recorded in
  `registry-close.md` (defer `pushdown`/`petri` decidability claims to era 3+). Needs a decision
  record; era-3 brief should carry the question.
- The **second-implementation language** for era 1 (Rust favored, not committed).
- Everything listed as an open question inside individual era briefs.

## Conventions in this directory

- One artifact per file; every file starts with a status header: `Status:` (draft / stable),
  `Author:`, `Date:`, `Open questions:`. Nothing depends on conversation memory.
- Plain markdown, house style, no emoji in committed artifacts.
- Era numbering: era 0 (cleanup) through era 7 (ecosystem); version labels v6–v12 are provisional
  names, not release promises.
- Issue references: bare `#N` = jssm; `fsl#N` = StoneCypher/fsl. Cross-repo closing keywords need
  the full `StoneCypher/fsl#N` form.
- The tracker snapshots in `issue-snapshots-2026-07-04/` are **frozen**: triage against them, so
  disposition work is stable even as the live trackers move. Note live drift in the disposition
  files rather than regenerating the snapshot.

## Repo rules that will bite you (crib from CLAUDE.md + hard experience)

- **No compound shell commands** (`&&`, `||`, `;`, pipes) — each is a fresh permission prompt.
- **git/npm verb-first**, never options between the command and the subcommand. `cd` as its own
  command; Bash cwd silently resets after some tool calls — re-check `pwd` before commit.
- **Never `git add -A`** — stage explicit paths (shared machines may host parallel sessions).
- `main` and `v6` are **protected**: no commits, merges, or pushes to them without John's
  explicit per-action permission. This branch (`docs_26-07-04_fable-v6-to-v12`) is free.
- Issues close only via PR `Closes #N` references, never `gh issue close`.
- **Public tracker actions — standing scoped grant (John, 2026-07-04):** the model is
  *prepare → John approves the ledger once, as a batch → execution from the approved ledger is
  pre-authorized and mechanical.* Concretely: (a) new issues may be filed **only** exactly as
  written in an `issues-projection.md` revision John has approved; (b) existing issues may be
  closed **only** if listed in an approved dispositions ledger, and every close carries a
  one-line comment citing what supersedes/absorbs it; (c) anything not on an approved ledger
  still requires an explicit ask. All other public actions (posting, PRs to protected branches,
  external comms) remain ask-first.
- **Issue granularity & cadence:** the era briefs are the backlog of record; the tracker
  mirrors only active and near-term work. Era umbrellas file now (projection §A); an era's
  work packets become child issues **just-in-time when that era activates** (drafted by the
  executor into a projection revision, batch-approved, then filed individually as drafted);
  spec-internal items (megaspec features, irreversibles rows) get an issue only at first-touch.
  Never bulk-dump the whole program into the tracker — that recreates the stale-tracker
  problem era 0 exists to fix.
- **Tracker policy (John, 2026-07-04): the jssm tracker is kept EMPTY** — npm ranks modules
  partly on open-issue signals. ALL new issues go to **StoneCypher/fsl**, permanently. Existing
  jssm open issues drain via migrate-or-close: migrate = create the fsl twin (titled/bodied with
  a "was jssm#NNN" pointer), then close the jssm side citing the fsl number; PRs that fix
  migrated work use cross-repo `closes StoneCypher/fsl#N` (one keyword per line). This resumes
  the project's own historical consolidation (fsl #20/#25/#1085–#1098).
- Durable docs live under `notes/` (never `docs/` — `npm run clean` deletes `docs/`).
- Subagents cannot mutate sibling worktrees; commits/pushes happen from the main session.

## Source-of-truth map

| Question | Where |
|---|---|
| What is v6, normatively? | `notes/superpowers/specs/2026-06-09-fsl-megaspec.md` (this branch's parent, `v6`) — §28 decision log settles disputes |
| The era map | `notes/superpowers/specs/fable_sum_eras.md` |
| What's wrong / missing in the corpus | `fable_sum_critique.md` / `fable_sum_omissions.md` |
| Trust stack sequencing | `notes/superpowers/plans/2026-06-26-signed-run-receipts-roadmap.md` (M1–M6 = jssm #825–#830) |
| Tracker state (frozen 2026-07-04) | `issue-snapshots-2026-07-04/*.tsv` — jssm 107 open / 434 closed; fsl 663 open / 733 closed |
| Hard-topic design process | `notes/superpowers/specs/blind-thinkthrough/PROCESS.md` |

## Division of labor

Fable-authored artifacts here are **judgment-dense syntheses** — they encode a full-context read
that is expensive to reproduce. Successor models: treat their *conclusions* as decided (per the
lists above) and their *work packets* as yours to execute, refine, and correct against reality.
Where an artifact says "delegate: mechanical," that packet was sized for execution without
whole-corpus context. When reality contradicts a brief, the brief loses — record the correction
in the brief's file (dated, under a `Corrections` heading) and in the INDEX, so drift is visible
rather than silent.
