# The Era Book — one document as a collection of markdowns

> Fable, 2026-07-04, written at ~3% tokens — deliberately halt-tolerant: each file stands
> alone; this README is the contract for finishing whatever is missing.

## Structure (target state)

1. `00-overview.md` — one page, the whole program (5.x → v16)
2. `NN-vNN-onepager.md` — one page per major (05x, 06 … 16)
3. `NN-vNN-long.md` — the long form per major: **every scheduled item** gets (a) one
   manager-level paragraph — what it is, why it's worth money, what "done" looks like — then
   (b) a terse CS-level block: data structures, algorithms, invariants, failure modes,
   dependencies, test posture. Length per item as the content demands; no padding.

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
