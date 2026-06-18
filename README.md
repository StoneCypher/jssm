# jssm development timeline (analysis branch)

`timeline.json` is a machine-readable history of how the **jssm** repo and the **FSL** language developed. It is intended as input for charts/graphs; it is generated, not hand-maintained, and lives on this orphan analysis branch (like `perf_results`), disconnected from `main`.

## How it was built

- **Spine:** every change that landed on `origin/main`'s first-parent line — merged PRs *and* direct pushes (718 commits).
- **Classification:** each change's source diff was read by an LLM and classified into one or more **topics**. **Commit messages were deliberately not trusted** (this repo's messages are often wrong/missing/incomplete); judgments come only from the diff.
- **Exclusions:** generated/build output (`dist`, `docs`, `coverage`, `CHANGELOG*`, `README`, generated parser/version/doctests, `*.d.ts`, `custom-elements.json`, `package-lock`, …) was excluded so classification reflects real source. For early (~2017) history where `dist`/`README` were hand-edited source, the unfiltered diff was used when the filtered one was empty.
- **Multi-topic:** a change bundling genuinely-unrelated work contributes one entry per topic (so `total_topics` ≥ commit count).

Regenerate / extend with the `classify-pr` skill (`/classify-pr` with no argument runs incrementally).

## Shape

```jsonc
{
  "meta": { "repo", "generated_at" (unix), "range": [min,max] (unix),
            "total_commits", "total_topics",
            "by_type", "by_importance", "by_surface", "breaking_count" },
  "changes": [ {
    "landed":   <unix>,            // when it hit main
    "opened":   <unix|null>,       // PR open time (null for direct pushes)
    "type":     "feature|bug|perf|docs|refactor|test|build|ci|style|revert|chore",
    "importance":"major|medium|minor|miniscule",  // major = language expressiveness/usefulness; medium = easier/faster; minor = cool; miniscule = docs/bugfix
    "breaking": <bool>,            // breaks public API / FSL backward-compat
    "surface":  "language-grammar|runtime-api|viz|cli|web-components|tooling|build-ci",
    "direction":"adds|changes|removes",
    "tags":     [..1-3..],         // topical thread, e.g. groups/hooks/interning/units
    "title":    "what changed (from the diff)",
    "scope":    "fine area",
    "author":   "...", "co_authors": [...],
    "source":   "pr|direct", "pr": <num|null>, "labels": [...],
    "closes":   [ { "repo", "number" } ],   // incl. cross-repo StoneCypher/fsl
    "version":  "<release it shipped in|null>",
    "churn":    { "files", "insertions", "deletions" },   // source-only
    "deps_changed": { "added", "removed", "updated" } | null,
    "symbols":  { "added", "removed" } | null,            // exported public symbols (best-effort)
    "commit":   "<short sha>"
  } ],
  "releases":     [ { "version", "date" (unix), "commit" } ],
  "contributors": [ { "author", "first" (unix), "commits" } ]
}
```

## Notes on fidelity

- `surface` is coarse — CLI and web-component work sometimes rolls into `tooling`; use `tags` to thread those precisely.
- `closes` is reliable for same-repo (GitHub-tracked) and best-effort for cross-repo `StoneCypher/fsl` (parsed reference tokens; GitHub doesn't auto-track cross-repo closes).
- `symbols`/`deps_changed` are best-effort structural extractions.
