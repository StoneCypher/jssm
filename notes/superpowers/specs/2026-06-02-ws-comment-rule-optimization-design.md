# WS / Comment Grammar Rule Optimization — Design

> **Status:** Design — approved, ready for implementation planning
> **Date:** 2026-06-02
> **Author:** John Haugeland (with Claude collaboration)
> **Umbrella:** [#636](https://github.com/StoneCypher/jssm/issues/636) · **Sub-issue:** #676
> **Origin:** #673/#674 profiling localized the `construct()` cliff to the PEG.js parser — `peg$parseWS` is the single hottest JS self-time function and ~20% of ticks are GC.

---

## Summary

Rewrite three rules in the FSL grammar (`src/ts/fsl_parser.peg`) so the hot whitespace path is faster and the comment scanners stop recursing one character per stack frame. Strictly behavior-preserving; the win is expected to be **modest** (this trims per-call WS cost, not the *number* of WS evaluations — that structural cost is memoization's job, the next sub-issue).

---

## The rules today

```
LineTerminator   = [\n\r  ]

BlockCommentTail = "*/" / . BlockCommentTail              # right-recursive, one char per frame
BlockComment     = "/*" BlockCommentTail

LineCommentTail  = LineTerminator / EOF / . LineCommentTail   # right-recursive, one char per frame
LineComment      = "//" LineCommentTail

WS "whitespace"  = BlockComment WS? / LineComment WS? / [ \t\r\n\v]+ WS?
```

Two problems:

1. **`WS` is comment-first and right-recursive.** On the common all-whitespace path (and the `dense-200` benchmark source is *all* whitespace-separated, no comments), every WS call *attempts* `BlockComment` then `LineComment` (each peeks for `/`, fails) before matching `[ \t\r\n\v]+`, then recurses via `WS?`. WS is invoked at hundreds of `WS?` sites at every input position, with no memoization — hence the hottest function in the profile.
2. **The comment tails recurse per character.** A comment of length L costs L stack frames + L sets of position bookkeeping. Not hit by the benchmark (no comments in the shapes), but a latent cliff for comment-heavy FSL.

## The change

```
BlockComment "block comment"
  = "/*" (!"*/" .)* "*/"

LineComment "line comment"
  = "//" [^\n\r  ]* (LineTerminator / EOF)

WS "whitespace"
  = ([ \t\r\n\v]+ / BlockComment / LineComment)+
```

`BlockCommentTail` and `LineCommentTail` are **deleted** (inlined). `LineTerminator` is unchanged.

- **`WS`** — whitespace-first (the common path no longer probes the two comment alternatives), iterative `+` instead of right-recursion. Still matches ≥1 chunk of whitespace/comment in any order: same language. Every consumer uses `WS?` or bare `WS` and ignores the result (grep confirms no rule captures `x:WS`), so the change of return value (array of chunks vs nested structure) is invisible.
- **`BlockComment`** — `(!"*/" .)*` consumes the body iteratively until the closer; the trailing `"*/"` is still required, so an unterminated block comment still *fails to parse*, exactly as before.
- **`LineComment`** — `[^\n\r  ]*` consumes the body, then `(LineTerminator / EOF)` consumes the terminator (or matches end-of-input), reproducing `LineCommentTail` exactly: `\v` stays comment body (it is not a `LineTerminator`), and a final line comment with no trailing newline still matches at EOF.

### Equivalence — edge cases checked

| input | old behavior | new behavior |
|---|---|---|
| `/**/` | empty body, matches | empty body, matches |
| `/***/` | body `*`, matches | body `*`, matches |
| `/* unterminated` | **fails** (no `*/`) | **fails** (no `*/`) |
| `// c` at EOF (no `\n`) | matches via `EOF` | matches via `EOF` |
| `// a\vb\n` | `\v` is body, ends at `\n` | `\v` is body, ends at `\n` |
| `// c ` | ends at ` ` | ends at ` ` |
| `  \n\t ` (pure WS) | 1 ws-run + recursion | 1 ws-run, 1 loop iter |

`WS`'s `+` cannot loop forever: each alternative consumes ≥1 char (`[ \t\r\n\v]+` ≥1, comments start with `/`), so a zero-width iteration is impossible.

## Validation

- **Behavior (the gate):** the generated parser (`src/ts/fsl_parser.js`) is **excluded from coverage**, so this is purely a behavior-equivalence problem. The full parse suites must pass unchanged — `comment.spec.ts`, `parse.spec.ts`, `language.spec.ts`, `grammar_regressions.spec.ts`, and the `unicode-*` suites — and the spec suite must stay at **100% coverage** of `src/ts/**` (the consuming TS, not the generated parser).
- **Strengthen `comment.spec.ts`** to lock the equivalence explicitly:
  - a line comment as the final token with **no trailing newline**;
  - a **multi-line block comment** (body spans `\n`);
  - an **unterminated block comment throws**;
  - `\v` inside a line comment (stays comment body);
  - ` ` / ` ` as line-comment terminators.
- **Regen:** the `.peg` edit regenerates `src/ts/fsl_parser.js` via `npm run peg` (`= pegjs ... && node src/buildjs/fixparser.cjs`); `npm run make` / `npm run build` already run it. Commit the regenerated parser.
- **Perf:** capture `construct()` before/after with `npm run benny:scaling` (isolated runs), snapshot under `src/historic_benchmarks/`, and report in a #636 comment via `benchmark_compare`.

## Expectation (honest)

**Modest.** This removes the two comment-probes and the recursion from the hot WS path and de-recurses the comment scanners, but it does not reduce *how many times* WS is evaluated — that re-parsing cost is what **memoization** (the next sub-issue) attacks. Single-digit-to-maybe-low-double-digit % on `construct()` is the realistic outcome; `dense-200` will very likely **still round to 0 ops/sec**. If the measured win is marginal, the #636 comment says so plainly (per the #673 over-claim correction).

## Out of scope

- **Memoization** (`pegjs --cache`) — the next sub-issue by plan.
- **`pegjs` → `peggy` migration** — separate, larger effort.
- Any change to `src/ts/jssm.ts` or the build loop.

## Risks

- The grammar is load-bearing for *all* FSL parsing. Mitigation: the rewrites are provably equivalent (table above), WS is the sole consumer of the comment rules, and the full parse + unicode suites plus 100% coverage gate the change.
- `fixparser.cjs` post-processes the generated parser; confirm it still applies cleanly to the regenerated output (it is structure-agnostic, but verify the build’s `peg` step succeeds).
