# Era Book — Completeness Audit (honest, no spin)

> **Author:** Claude Opus 4.8 · **Date:** 2026-07-05 · **Status:** damage report
>
> **The standard (John, 2026-07-05):** the **long form carries every item** (a manager
> paragraph + CS block per item); the **one-pager names every item** (an enumerated list of item
> titles). **An incomplete list is worse than nothing** — it reads as complete and misleads.
>
> **By that standard, both reader-facing tiers are incomplete for every era, and Fable's final
> commit stamped them "complete."** This file states exactly how far off they are. It does not
> reassure. The one thing that is NOT lost: the item-level substance exists in the JSON register
> (`items/*.json`) — 562 entries, each with a manager paragraph (verified). The failure is that
> the one-pagers and long-forms were left as cluster-level *summaries* and never rendered to the
> item grain the standard requires.

## Verdict up front

- **One-pager tier:** names **0 items** individually. Every one-pager is prose (Mission /
  Contents / Exit / Hazards) that names ~4–10 *clusters* and quotes a "~N items" count without
  enumerating. As naming-lists they do not exist yet.
- **Long-form tier:** **77 entries across v6–v16 against 530 register items ≈ 15%** at item
  grain. Built at cluster grain (~7:1) by design; the standard wants item grain. Worst: v16 (4%),
  v10 (5%).
- **Register (`items/*.json`):** the only item-level layer that exists. 562 entries. Substantive
  (manager required on all; CS on 289). But it has accounting gaps (below), and it is NOT
  reader-facing — it renders via `era_book_html.cjs`, which is not the account of record.

## Per-era table

Item-grain completeness = long-form entries ÷ register items for that major.

| Era | Register items | Long-form entries | One-pager item names | Long-form @ item grain |
|---|---|---|---|---|
| 5.x | 32 | (its one-pager) | 0 (prose) | — (punch list) |
| v6  | 19 | 12 | 0 | 63%* |
| v7  | 46 | 9  | 0 | 20% |
| v8  | 35 | 7  | 0 | 20% |
| v9  | 32 | 7  | 0 | 22% |
| v10 | 120 | 6 | 0 | 5% |
| v11 | 64 | 8  | 0 | 13% |
| v12 | 28 | 6  | 0 | 21% |
| v13 | 17 | 6  | 0 | 35% |
| v14 | 11 | 5  | 0 | 45% |
| v15 | 13 | 5  | 0 | 38% |
| v16 | 145 | 6 | 0 | 4% |
| **v6–v16** | **530** | **77** | **0** | **≈15%** |

\* v6 is not really 63%: its long-form's 12 entries are the **6.0.0 breakage batch** (from the
era-0 brief), a *different* decomposition than the register's 19 v6.x-series items. The two barely
overlap, so neither "12/19" nor any single ratio is honest for v6 — see accounting problems.

## Why the numbers don't reconcile (the accounting is tangled across four systems)

1. **6.0.0 batch vs 6.x series.** v6's items live in TWO places: the 6.0.0 breakage/infra batch is
   in `eras/era-0-cleanup-and-6.0.md` (and the long-form's 12 entries); the 6.x language series is
   in the register (19 items). `spec-workitems.md` line 20 says outright "6.0.0 items live in the
   era-0 brief, not here." So "how many v6 items" has no single answer without a merge.
2. **W-ID prefix ≠ major.** `W6.*` items split across majors v6–v10 by cluster (spec-workitems
   header). The "v6 — the 6.x series" *section* of spec-workitems lists the whole W6.* corpus,
   most of which is v7–v10. Reading that section as "the v6 list" over-counts v6 badly.
3. **Register is a superset of the spec.** `spec-workitems.md` has **215 distinct W-IDs**; the
   register has **562** because it also folds in WP-* work-packets and Tfsl-*/Tjssm-* tracker
   keepers. So the register is the fuller item set — but its per-major `version` tags are the only
   place the true per-era item count is even asserted, and nothing cross-checks them.
4. **Cluster grain vs item grain.** Fable authored the long-forms at **cluster** grain (~80
   clusters over ~605 topics, ~7:1) and considered that "complete." The standard is **item**
   grain. These are different documents, not different completeness levels of the same document.

## What "done" requires (per the standard)

1. **Reconcile a single authoritative per-era item set.** Merge the 6.0.0 batch into the v6 set;
   verify each major's register items against spec-workitems + `dispositions/*`; settle the true
   count per era (v6 especially — 19 register + 12 batch ≈ 31, and John expects 40+, so items are
   likely still missing).
2. **One-pagers → enumerated naming lists.** Every item title, per era, listed. Derivable
   mechanically from the register once (1) is settled. Keep the Mission/Exit framing, but the
   Contents section becomes the full list, not a "~N" blurb.
3. **Long-forms → one entry per item.** Manager + CS per item. Largely renderable from the
   register JSONs (which already carry manager, and CS on ~half); the remainder is writing CS for
   items that lack it and authoring any items that are missing from the register entirely.
4. **Delete or clearly mark the current summaries** so no one mistakes them for the account of
   record in the meantime (incomplete-list-is-harmful rule).

## Rough cost

- Register reconciliation + gap-fill (per-era, find missing items): the hard, judgment-heavy part.
- One-pager naming lists: mostly mechanical once the register is settled (render titles).
- Long-form item write-ups: ~530 entries; ~289 already have CS in the register to draw from, ~241
  need CS authored; any register gaps need full authoring. This is the large body of work.

## Bottom line

Nothing was deleted and the substance is not gone — it sits in 562 substantive JSON items. But the
**account of record (one-pagers name every item; long-forms carry every item) does not exist yet**
— it's ~15% at the long-form tier and 0% at the one-pager naming tier, and it was labeled
complete. Rebuilding it to the standard is a real authoring job, bounded by the register that
already exists, not a from-scratch effort.
