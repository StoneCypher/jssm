# The Era Book — one document as a collection of markdowns

> Fable, 2026-07-04, written at ~3% tokens — deliberately halt-tolerant: each file stands
> alone; this README is the contract for finishing whatever is missing.

## Structure (target state)

1. `00-overview.md` — one page, the whole program (5.x → v16)
2. `NN-vNN-onepager.md` — one page per major (05x, 06 … 16)
3. `NN-vNN-long.md` — the long form per major: each entry gets (a) one manager-level
   paragraph — what it is, why it's worth money, what "done" looks like — then (b) a terse
   CS-level block: data structures, algorithms, invariants, failure modes, dependencies,
   test posture.

**GRANULARITY (corrected + redesigned with John, 2026-07-04):** the long forms are at
**cluster** level (~80 units over ~605 topics, ≈7:1 — e.g. "Numeric tower" = W6.1–.8).
**Item level is JSON, one item per file, in `items/`** — designed for parallel authoring
with zero merge conflicts; the HTML generator renders them. Three tiers reconcile:
**book cluster → items/*.json (W-IDs) → tracker issues.**

## 4. The item files — `items/<W-ID>.json`, one item per file

Schema (required: `id`, `title`, `version`, `manager`; all else optional-when-not-valuable):

```json
{
  "id": "W6.5",
  "title": "decimal(p,s) — exact base-10 numerics",
  "version": 7,
  "cluster": "numeric-tower",
  "src": ["MP§4.1"],
  "issue": null,
  "deps": ["W6.1"],
  "blocks": ["W6.52"],
  "manager": "What the feature IS and WHY IT MATTERS — written for a human deciding whether to care.",
  "cs": "Necessary technical detail. OMIT THIS FIELD entirely when it adds nothing."
}
```

Rules: `version` is a number 6–16 or the string "5.x" (NOT derivable from the W-ID — W6.*
spans majors 6–10 per the spec-workitems map); milestone derives from version (5.x→fsl ms#48,
6→#49 … 16→#59); `issue` gets the fsl number once filed (the projection flow fills it);
`manager` explains what/why, no done-looks-like boilerplate; sources for item content =
`eras/spec-workitems.md` + `eras/dispositions/*` + the megaspec §refs. Successors seed items
era-by-era as work activates; exemplars in `items/`.

## Sources for the long form (successors: derive, don't invent)

Items = union of `eras/spec-workitems.md` (W-IDs; version map in its header) + the milestone-
tagged keepers in `eras/dispositions/*.md`. Authority per item = its megaspec §ref (v6 branch
corpus) + the era briefs. Decisions all final per `eras/HANDOFF.md`; do not re-litigate.

## Worked example of the long-form format (copy this shape)

**W6.86 — Repeat-state merge (#454).** *Manager:* Today two `state X: {}` blocks are a hard
error, which blocks the spread/group workflow where a state legitimately appears in several
declarations. v6 makes repeats merge like CSS: same value twice is fine, conflicts are loud
errors naming both locations. Done = the old error is gone, conflicting declarations produce
a two-location diagnostic, and groups/spread compose cleanly. *CS:* per-state attribute maps
union across declaration sites; same-key/same-value idempotent; same-key/different-value at
equal cascade tier ⇒ compile error carrying both source spans (needs `options.locations`);
tier order theme < `state:{}` < kind < group-by-depth < state (§19/§28); vectors: merge,
idempotent repeat, conflict, cross-tier override; dragon: fuzz N declarations, assert
order-independence of the merged result.

Status: 00 + one-pagers were the priority under the token budget; long files are queued for
successors unless present. Update this line as files land.
