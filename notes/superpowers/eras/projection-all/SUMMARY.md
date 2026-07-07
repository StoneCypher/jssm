# Projection v6→v16 — morning brief

**Generated locally. Nothing was filed to GitHub.** This is the draft "file-able" set for
every unfiled era-book work item, ready for your review + approval, then mechanical filing.

## Totals
- Era-book items scanned: **568**
- Rendered fileable issues (unfiled W/WP items): **197** (197 ready, 0 blocked on a question)
- Cluster nodes to create: **40**
- Open questions for you: **0**
- Skipped: 371 already filed · 0 tracker-derived (T*) · 0 non-work · 0 parse errors

## Per version
| version | item issues | cluster nodes |
|---|---|---|
| 5.x | 1 | 0 |
| v6 | 6 | 0 |
| v7 | 42 | 6 |
| v8 | 28 | 5 |
| v9 | 19 | 5 |
| v10 | 13 | 2 |
| v11 | 29 | 6 |
| v12 | 19 | 5 |
| v13 | 14 | 4 |
| v14 | 11 | 3 |
| v15 | 6 | 1 |
| v16 | 9 | 3 |

## Open questions
_None — all resolved._

## Decisions applied
- **Cluster granularity (Option 1, John):** items nest under the umbrella matching their own `version`; a (cluster, version) slice with >=2 items becomes a cluster node, a single-item slice nests directly under the umbrella. Auto-splits `portability-contract`: W6.100 -> direct under v6 (#1401); WP10.1-3 -> `v10 · Portability contract` under v10 (#1405).

## MCP thread (flagged for review)
The `fsl-mcp` **authoring** satellite is pulled forward to **v6** (`Wmcp.1`) — the old bundled
`mcp` verb (`W8.22`) was split, with its **debugging/time-travel** half staying at v12. Sync
items thread the tool through every language-growth era (`Wmcp.2`–`Wmcp.6`, v7–v11), plus a
standing rule so it never lags the grammar. The satellite is a **separate package/repo**; its
build handoff is `notes/superpowers/specs/2026-07-07-fsl-mcp-authoring-satellite.md`.
Earliest practical landing for authoring: **now** (a few days as its own package on current jssm).

## Files
- `issues.json` — the rendered fileable item issues (title, body, milestone, umbrella, cluster, labels, project)
- `clusters.json` — the cluster grouping issues to create (umbrella → cluster → item)
- `questions.json` — everything I did not guess; answer these to unblock the blocked items

## Template already live (your approved sample)
- Item: #1520 `decimal(p,s) — exact base-10 numerics (W6.5)`
- Cluster: #1521 `v7 · Numeric tower (cluster)`
- Hierarchy: v7 umbrella **#1402 → #1521 → #1520**; labels Core/Types/Features/Needs implementation/Important for trust/Size: medium/Created by AI; on the roadmap board.

## To proceed (morning)
1. Skim `issues.json` / `clusters.json`; answer `questions.json`.
2. Approve, and I file mechanically: create cluster nodes, file items, wire sub-issues, set milestones, add to project — reconciling against the live tracker first (the Increment-5 lesson).

_Labels per item are heuristic suggestions — flagged for your review, not authoritative._
