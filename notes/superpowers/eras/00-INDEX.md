# 00-INDEX — The Era Program Ledger

> **This file is the resume point.** Update it FIRST (mark intent) and LAST (mark done) in every
> increment. If you are a successor model reading this after a halt: anything `in-flight` may be
> half-written; its "definition of done" line tells you what it was trying to be.
> Statuses: `done` · `in-flight` · `queued` · `deferred`.

**NEXT ACTION:** Increment 2 — write `dag.md` and `irreversibles.md` (the two missing
coordination artifacts the critique identified).

## Ledger

| # | Artifact | Status | Definition of done / notes |
|---|----------|--------|----------------------------|
| 1a | `HANDOFF.md` | done | Standing orders for successors; resume protocol; decided-vs-open lists |
| 1b | `00-INDEX.md` | done | This ledger |
| 1c | Founding docs copied to `../specs/` | done | `fable_sum_{critique,omissions,eras}.md` — committed here; untracked copies on the main checkout are now non-canonical |
| 1d | `issue-snapshots-2026-07-04/` | done | Frozen TSVs (number/labels/title): jssm open 107, jssm closed 434, fsl open 663, fsl closed 733 |
| 2a | `dag.md` | queued | The merged dependency graph: megaspec §20 phases × trust M1–M6 × convergence streams × the 8 eras; every cross-plan edge explicit; one page |
| 2b | `irreversibles.md` | queued | Register of hash/ABI/serialization-shaped decisions that must be specced at contract quality when first touched; seeded from registry-close's 12 rows + omissions D1/D2/D10; each row: what, why irreversible, owning era, spec-status |
| 3 | `era-1-language-contract.md` | queued | v6 brief: scope-in/out, the contract half at near-spec quality (canonical hash incl. newline/NFC policy, pinning rules, vector format, 2nd-impl decision brief), work packets sized for Opus/Codex, exit criteria |
| 4 | `era-4-survival.md` | queued | Durable-execution brief + the brainstorm brief for its future PROCESS run; persistence contract, recorded hook returns (tape/ledger slot), migrates-from, 5.x-snapshot-lift decision; the era the corpus underprices |
| 5 | `era-2-society.md` | queued | Systems/factories/supervision brief; carries alias-removal + strict-mode breakage batch |
| 6 | `era-3-proofs.md` | queued | Verification brief; MUST carry the automata-ladder decision question (megaspec §3 vs Gemini push-up) as its headline open item |
| 7 | `era-0-cleanup.md` | queued | The triage RULEBOOK, not the sweep: disposition categories (absorb-into-era / superseded-by-manual-program / keep-5.x-bug / park-satellite), bucket definitions from the 2026-07-04 tracker read, per-bucket examples; sweep itself is delegated (see 9) |
| 8 | `era-5-trust.md`, `era-6-fleet.md`, `era-7-ecosystem.md` | queued | Deliberately thin: theme, boundaries, entry criteria, known hazards (trust: transparency-log equivocation + security-adversarial-review gate); no fake precision |
| 9 | `dispositions/` | queued | Advisory-corpus + tracker disposition ledgers. Fable writes the RULES + contentious calls; the mechanical sweeps (codex_on_v6's 130 items; ~600 fsl issues) are DELEGATE: MECHANICAL (Opus/Codex, or Opus subagents) |
| 10 | `issues-projection.md` | queued | Prepared issue titles+bodies (era umbrellas, decision-record asks) for batch filing WITH JOHN'S APPROVAL — no public actions without it |

## Increment log

- **2026-07-04 · Increment 1 (Fable):** Scaffold. Worktree `fable_new_v6_to_v12` created on
  `docs_26-07-04_fable-v6-to-v12` off `origin/v6` @ `c03bcdeb`. HANDOFF, INDEX, founding docs,
  frozen tracker snapshots. Context available to author: full v6 corpus read (all specs + plans +
  review corpus), both trackers surveyed in full (titles/labels), era decomposition agreed with
  John. Priority order for remaining increments = ledger order (2a → 2b → 3 → 4 → 5 → 6 → 7 →
  8 → 9 → 10), chosen by value × irreproducibility-of-Fable's-loaded-context.
