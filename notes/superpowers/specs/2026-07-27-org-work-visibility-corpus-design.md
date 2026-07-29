# Org work-visibility corpus and timeline — design (checkpoint)

**Date** 2026-07-27 · **Status** design in progress, checkpointed mid-brainstorm · **Author** John Haugeland with Claude

> This document is a **checkpoint**, not a finished spec. Decisions recorded here were
> settled in conversation and should be treated as agreed. The sections marked OPEN are
> genuinely undecided. The brainstorm stopped before "propose 2-3 approaches"; that is
> where a successor session resumes.

## The real problem

A senior leader ("the big boss") feels he does not know what is going on in engineering.
John wants to fix that. Everything below serves that sentence.

This is a question about **the work**, not about the people. That distinction is
load-bearing and is the reason several safeguards below exist.

`timeline_analysis` (the jssm orphan branch carrying `timeline.json`) is the prototype.
It is being shown as an example of what a result could look like, and it is already
closer to the right answer for this audience than a per-person productivity view would
be — it encodes `type`, `importance`, `surface`, `tags`, `breaking`, `version`, which is
approximately the vocabulary an executive needs.

## Audience, in priority order

1. **The big boss** — wants themes, arcs, what shipped, what is stuck, where effort
   concentrated. Will not operate a tool. Needs a first screenful that explains itself in
   about ten seconds, or something that arrives on a cadence.
2. **John, as a manager** — wants to sit down and see what work someone did over a given
   timeframe. A memory aid before a 1:1 or a review, not an evaluation instrument.
3. **Engineering colleagues** — will ask "could we run this on our repo?" That question
   is the adoption test, and answering it well is the stated priority.

## Scope: two sub-projects, one interface

The request decomposes into two independently buildable systems joined by a JSON schema.

| | what it is | leads? |
|---|---|---|
| **A — corpus generator** | Generalized to arbitrary repos: config, auth, repo/person allowlists, provenance, incremental refresh | **yes** |
| **B — timeline app** | Reads a corpus; work-centric primary view, person drill-down, hideable unmerged | after A |

**A leads.** John chose adoptability ("runs on any repo, near-zero setup") as the thing
the demo must prove, over insight, attribution, or polish. The visuals may stay plain
until the generator runs anywhere. Each sub-project gets its own spec → plan → build
cycle; this document covers shared decisions and then A.

## Decisions settled

### D1 — Two allowlists; nothing enters the pipeline implicitly

*"It's for work. It wants to be cheap and easy. Still, assumptions are toxic. Let's
create an allowlist."*

1. **Repos** — which repositories may be classified at all.
2. **People** — whose work enters the corpus, and whose branches may be analyzed.

The tool must never analyze a repo it merely discovered. Enrollment is an explicit,
auditable act. This exists because "may proprietary diffs be sent to an LLM" is a policy
question the tool cannot answer for itself, and guessing wrong is unrecoverable.

### D2 — GitHub App, not GitHub Action, and auth-only

A per-repo Action structurally cannot answer "what did this person do across the org" —
it would require stitching N repos by hand. An org-level App is the only shape where
that is one query, and it is installed once rather than merged into every repo.

**The App's repo-selection screen IS the repo allowlist from D1** — native, with
GitHub's own audit trail, administered by people with standing to decide. This replaces
a mechanism that would otherwise have to be built.

Keep the App **auth-only**: it grants scoped access via installation tokens; compute
lives in a CLI or a small scheduled worker. Adding webhooks would turn it into a hosted
service and forfeit "cheap and easy."

### D3 — Allowlist by stable ID, never by name

Users are allowlisted by numeric GitHub user ID; repos by repo ID. Logins are renameable
and a freed login can be reclaimed by someone else; `owner/name` changes on rename or
transfer and can come to point at a different repository. Carry the human-readable name
alongside as a comment.

### D4 — Two gates, AND-ed, for what enters the corpus

```
gate 1 (PR):      !isCrossRepository  &&  !author.is_bot  &&  author ∈ ALLOWLIST
gate 2 (commits): every commit author + every Co-authored-by trailer ∈ ALLOWLIST
```

The two exclude disjoint sets and both are needed — verified against live jssm data,
where Dependabot is *same-repo* (it pushes branches directly, it does not fork) and so
passes gate 1 while failing gate 2.

Gate 1 is the security boundary; gate 2 is content hygiene inside it. Commit authorship
is **attestation, not authentication** — anyone can set `user.email` — so gate 2 cannot
stand alone. It does not need to: gate 1's same-repo requirement means someone with push
access put it there, and push access is already the trust boundary.

### D5 — Work-centric primary view; person as drill-down

The front door is **work over time**. "Where did specific people contribute" is reached
by drilling into a piece of work — *"who built this"* rather than *"what did she
produce."* Same data, opposite reading; largely a layout decision.

**No aggregate per-person number anywhere.** A number invites comparison and is
screenshot-ready; a list of what someone did invites the reader to remember. An executive
without context will read any per-person view as productivity regardless of its label,
so person views must not be the front door.

### D6 — The corpus must display what it cannot see

Diff-derived attribution has a **directional** bias, not random noise: it under-credits
reviewers, designers, mentors, and anyone who talked a colleague out of the wrong
approach, and over-credits volume. It cannot see offline conversation at all.

Demonstrated in this very session: a search of `repo:StoneCypher/jssm` found one fork PR
by `blackeuler` and concluded that was their participation. `repo:StoneCypher/fsl` held
nine substantive design issues, and John noted further offline discussion invisible to
any query.

Therefore the person and work views must surface blind spots as prominently as findings.
The further a reader sits from the work, the less equipped they are to know what a chart
omits — so this matters *most* for the primary audience.

This is the same principle as D7 and as the no-silent-drops rule: an omission that does
not announce itself reads as completeness.

### D7 — Fail closed, and say so out loud

Anything excluded — unknown author, non-enrolled repo, unparseable diff — is dropped
**and logged**. Silent exclusion is the failure mode where a dataset looks comprehensive
and quietly is not.

### D8 — Contribution types beyond commits

Pull tracker participation (issues, comments) and PR reviews as first-class contribution
types. Without them the tool is a commit counter wearing a nicer chart, and it inherits
the full force of the D6 bias.

`timeline.json`'s `closes[]` already carries cross-repo references (including
`StoneCypher/fsl`), so threading issue *participants* onto a change is a natural
extension of an existing field rather than new machinery.

### D9 — Provenance on every judgment

For a dataset whose values are LLM judgments, record which model and which prompt
produced them. Without it, entries classified months apart are not commensurable and
incremental regeneration silently mixes vintages.

Per-entry rather than in `meta` **if** re-classification of existing entries is ever
possible; `meta` alone suffices for an append-only pipeline. Cheap now, unrecoverable
later.

### D10 — `unmerged[]` as a separate top-level array

Approved for the jssm corpus and inherited here. A separate array (rather than a flag on
`changes[]`) makes the live-hide toggle a one-line filter and prevents unmerged work from
silently contaminating `meta.by_type` / `total_topics`, which would change the meaning of
every existing number. Unmerged aggregates, if wanted, get their own block.

The unmerged spine is where untrusted content would enter, which is what D1 and D4 exist
to prevent — the `changes[]` spine never had exposure, because "landed" means a human
merged it.

## Non-goals

- No score, index, or ranking of any person, ever.
- No team-wide leaderboard.
- No webhook service in v1 (see D2).
- No attempt to *detect* whether a repo is sensitive — enrollment answers that (D1).
- Not a replacement for talking to people. It is a memory aid and an orientation device.

## Prior art in this repo, worth reading before building

- `src/scripts/collect_package_sizes.cjs` — incremental collector; orphan data branch;
  authoritative-once-written with a mutable-field re-sync. The shape to copy.
- `src/scripts/make_size_chart.cjs` — self-contained interactive SVG with drill-down, no
  external deps. Note `LIFECYCLE` at ~line 79: unknown entries default to `current`, so
  new data appears without a code change. Good pattern; note also that its
  drill-down-heavy design is **not** right for the ten-second executive screenful.
- `.github/workflows/package_sizes.yml` — nightly, orphan branch, `GITHUB_TOKEN`, no
  cross-repo secret. Caveat: a `schedule:` trigger only fires from the default branch.
- `src/buildjs/verify_side_effects.cjs`, `verify_peer_pins.cjs` — the "assert the
  invariant rather than remember it" gate shape, including advisory-note handling.

## OPEN — resume here

1. **Approaches.** The brainstorm stopped before proposing 2-3 approaches with
   trade-offs. That is the next step.
2. **Corpus schema for multi-repo.** `timeline.json` is single-repo. Does an org corpus
   become one file with a `repo` field per entry, one file per repo plus an index, or a
   directory convention? Affects incremental refresh and the viz's load story.
3. **Identity across repos and forges.** A person is a GitHub user ID here, but work
   email ≠ GitHub account at most companies, and the workplace may not be on GitHub at
   all. How far to generalize is undecided.
4. **Cadence and delivery for the executive.** Arriving digest vs. a link that explains
   itself. Affects whether a scheduled worker is needed at all.
5. **Scale.** jssm is ~718 landed changes. Workplace repos may be far larger, which bears
   on cost and on incremental strategy.
6. **Where the demo runs.** John chose adoptability, and a GitHub App needs org-admin
   install — a larger ask than running a CLI locally. Whether a CLI path is needed for
   the pitch itself is unresolved.

## Session provenance

Settled during a long session on 2026-07-27 that also covered v6 packaging gates. The
trust roster and the unprotected-`main` finding referenced here live in Claude's memory
at `project_classify_allowlist_and_main_unprotected.md`, including the seven allowlisted
user IDs and the note that jssm's `main` currently has no branch protection or rulesets.
