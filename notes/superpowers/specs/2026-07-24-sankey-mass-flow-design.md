# Sankey / alluvial mass-flow view — design

Status: **built and rendering** (prototype in `build/`, pending promotion to `src/scripts`)
Tracker: fsl#1965 (package-size chart)
Date: 2026-07-24

## What it is

A third mode on the package-size chart, alongside `ecosystem` and `jssm proper`.
Where those two answer *"how big is it"*, this one answers **"where did the bytes
go"** — the consolidation of the jssm ecosystem read as a flow of mass through
time.

- **Nodes** are `(package @ event column)`. Node height is that package's
  measured installed size at that moment, from the size archaeology.
- **Ribbons** are mass crossing from one node to the next.
- **Columns** are ecosystem *events*, derived from the archive.

## The four decisions

These were settled before any code was written.

| Question | Answer |
|---|---|
| What flows? | **Bytes.** Real measured mass, not repo counts or lifecycle tokens. |
| What is the x axis? | **Event columns** — not calendar, not version index. |
| Non-npm repos? | A **mix**; they carry no npm mass, so they cannot be streams. |
| Curated or derived? | **Derived.** More repos are coming; hand-curation would not survive them. |

The "derived, not curated" answer is the load-bearing one. Adding packages to
the archive adds columns and ribbons with **no code change** — the events come
out of the data.

## Derived events

Four kinds, none of them typed by hand:

| Event | Derived from |
|---|---|
| `birth` | the package's first published version |
| `death` | its last published version, when it flowed out (npm-deprecated, obsoleted, or abandoned) |
| `supersede` | an `obsoletedBy` edge, dated at the **successor's** first release *after* the predecessor's last — the moment the work actually reappears downstream |
| `decompose` | a file family that stops being published by one package and starts being published by another within a year — the monorepo split, caught without naming it |

Events inside a 45-day window **collapse into one column**, so the five CLI
retirements read as a single consolidation rather than five near-identical
slices. A collapsed column is labelled by its two commonest event kinds plus a
`+N` overflow.

Two more columns exist for correctness rather than narrative:

- Every package's **first** column node is a source and its **last** is a sink,
  so the diagram has explicit ends rather than ribbons running off the edge.
- A terminal **`today`** column sits one day past the last release anywhere in
  the ecosystem. Without it, a package that dies in the last *event* column has
  no next column to flow into and its mass exits as an unexplained `death`
  instead of reaching (or visibly failing to reach) its successor. It is derived
  from the data, never the clock, so the diagram stays deterministic.

## Conservation is the correctness property

Not an aesthetic goal — the actual test.

At every node, inbound ribbons sum to exactly the node's mass, and so do
outbound ribbons, once explicit source terms (`birth`, `growth`) and sink terms
(`shrink`, `death`, `discard`, `today`) are counted.
`conservationViolations()` re-derives this from the built graph as a pure
function, so it can *disagree with the code that built it*. A mis-routed ribbon
fails loudly instead of merely looking plausible.

It earned its keep twice during implementation:

1. **Mass passed through successors.** The first routing sent a dead package's
   whole mass into its successor and straight out the far side as "discard" —
   inflow and outflow balanced, but the node's drawn height did not match
   either. It would have drawn an 84 MB ribbon entering `jssm`. The fix is
   physical: a supersession ribbon is **capped at the successor's real
   headroom** (what it actually gained), and the remainder evaporates at the
   *predecessor*. The ribbon crossing the gap is now exactly the mass `jssm`
   truly absorbed.
2. **Short-lived packages vanished.** A package born and retired inside one
   collapsed column was sampled at the column midpoint — before its birth or
   after its death — and disappeared from the diagram entirely. `sampleTime()`
   now pulls the sample to the nearest instant the package was actually alive
   when the column window overlaps its life. This recovered `fsl` and
   `require_jssm`.

This is also why `jssm-viz`'s 15.8 MB shows as `not carried forward` rather than
as a fat ribbon into `jssm`: the viz work *was* interned, but the interned form
is far smaller, and `jssm` did not gain 15.8 MB. The diagram says so.

## Non-npm repos — zero-mass rails

They carry no measurable mass, so they cannot be streams in a mass diagram.
They get **zero-mass hairline rails** instead: a line spanning the repo's GitHub
lifespan, banded below the flow, grouped under the maintainer's verbatim
category and coloured by it. Same precedent as the area chart's key, where
zero-shipping entries sort to the end behind a gap — present and readable,
never pretending to a mass they do not have. An archived repo's rail is dashed;
a same-day repo still gets a visible 4px mark rather than vanishing.

**Dates.** `repos.json` gained `created` / `lastPush` from `gh repo list`.
`created` is repo-*creation*, not first-commit: every repo here was started on
GitHub so the two coincide, but an imported history would start its rail late,
and that caveat is recorded in the dataset's own note so a future import cannot
break the assumption silently.

**Cross-owner repos.** A `CATEGORIES` entry may now be written `owner/name`.
Those are not returned by `gh repo list <ourOwner>`, so they are fetched
individually. This is how work adopted upstream —
`highlightjs/highlightjs-fsl`, the alpha grammar promoted into the highlight.js
org two days after `alpha-highlightjs-fsl`'s last push — stays in the
ecosystem's story instead of silently dropping out of it.

**Supersession on rails is a pointer, not a ribbon.** A rail's `obsoletedBy`
edge is drawn as a faint dashed curve to its successor (another rail, or the
package stream it was folded into). These edges move *work*, not bytes, so they
deliberately do not read as mass crossing the diagram.

**Axis caveat.** A rail's x position is interpolated between the flow's event
columns, which are evenly spaced in x but not in time. A rail therefore shares
the flow's distortion — which is the point, since a rail that did not line up
with the streams would be worse than no rail at all.

## Where the code lives

| File | Role |
|---|---|
| `build/flow_model.cjs` | Pure model: `stepAt`, `deriveEvents`, `decompositions`, `collapseColumns`, `columnLabel`, `sampleTime`, `buildFlow`, `conservationViolations`. No DOM, no I/O. |
| `build/flow_selftest.cjs` | 22 checks over fixtures **and** the real archive. |
| `build/mockup_ecosystem_chart.cjs` | Layout and render only — no ecosystem knowledge. Inlines the model verbatim. |
| `build/shoot_flow.cjs` | Playwright render-verification: asserts ribbons, nodes, on-canvas bounds, conservation in both scales, and node-click drill-down. |

The model is **inlined verbatim** into the generated HTML, cut at a `node-only`
marker so its CommonJS export does not follow it into the browser. The browser
and the self-test therefore run literally the same source — one copy, one proof.
The generator throws if the marker ever goes missing.

## Scales

Linear is a true Sankey: ribbon widths are comparable everywhere. Log exists
because `jssm-viz` peaked roughly 40000× above `fsl`, which would otherwise be a
sub-pixel hairline. In log mode a node's *height* is log-scaled and each ribbon
takes its pro-rata share of that height, so ribbons still stack exactly inside
every node — local conservation is preserved, cross-node width comparison is
not. Conservation is asserted in both scales.

## Interaction

Shares the existing chart's discipline: package pills filter, the y toggle
switches scale, hover reports what moved and why, and **clicking a node drills
into that package's own file families** — landing in the existing single-package
view. The x toggle is disabled, since the flow has its own derived axis.

## Follow-ups

- Promote all of `build/` to `src/scripts` + `make_perf_chart` in one clean pass
  (the next planned task); `build/` is gitignored, so none of this is durable
  yet. The self-test becomes a vitest spec at that point.
- **Wire conservation as a build gate** during that same pass (approved). The
  generator exits non-zero on any unbalanced node, so a chart that
  misrepresents its own data fails CI instead of publishing. Worth stating the
  limit: conservation proves the *routing* is consistent with the node masses;
  it says nothing about whether the archive was collected correctly or whether
  a supersession edge reflects reality. It catches mis-routed ribbons and
  malformed new packages, not bad curation.
- The five `build/pkgsizes/*.json` archives and `repos.json` still need to land
  on `perf_results`; only `jssm` and `jssm-viz` are pushed today.
