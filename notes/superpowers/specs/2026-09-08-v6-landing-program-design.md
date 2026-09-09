# v6 landing program — umbrella design

**Date:** 2026-09-08
**Branch:** `docs_26-07-04_fable-v6-to-v16` (worktree `fable_new_v6_to_v16`), at 6.0.0-alpha.14
**Status:** approved in conversation 2026-09-08; sub-project specs follow

## Purpose

Land jssm 6.0.0 on `main` as one merge and one publish. This document is the
program-level plan: what remains, how it is cut into sub-projects, the order
they run in, and the gates each must pass. Each sub-project gets its own
design (in chat for bounded work, a spec file for architectural work) and
its own approval before code.

6.0.0 is the last release under the `jssm` name. The `@fsl/statemachine-js`
rename belongs to 7 and is out of scope here.

## Decisions recorded today

1. All three manifest breaks ship in 6.0. The 7.0 fallback for the
   bare-functions API is retracted. One tiny break was permitted in late 5.x
   and that was the last one before 6.
2. Under #754, **Unicode letters and digits remain barewords.** A bareword is
   `[\p{L}_][\p{L}\p{N}_]*`. Only ASCII symbols and a leading digit are
   evicted to quoted strings. Correction after reading the suite: the 15
   atom-driven unicode suites walk every codepoint of every Unicode block
   through the Atom rule, so they do NOT survive unchanged; the shared driver
   gains an identifier-class predicate, and each per-codepoint test asserts
   "bareword accepted" for identifier-class codepoints and "bareword
   rejected, quoted form accepted" for the rest.
3. The **probabilistic list-target semantics change ships in 6.0**: in
   `a P% -> [b c]` the group keeps weight P and members share it (uniform
   when unweighted, or by inner weights `[b 20% c 80%]`); the same weighted
   list form applies to `start_states`.
4. Sequencing **B**: sync first by hand; the three small sub-projects run in
   parallel worktrees off the v6 line; the bare-functions spec is written
   meanwhile and implemented after they land; landing last.

## Sub-projects

| # | Name | Class | Depends on | Gate |
|---|------|-------|-----------|------|
| 1 | Sync `origin/main` into the v6 line | bounded | — | in-chat design, nod |
| 2 | #754 bareword charset restriction | bounded | 1 | in-chat design, approval |
| 3 | Retire `jssm-*` web-component synonyms | bounded | 1 | in-chat design, approval |
| 4 | Probabilistic list-target weights | architectural (small) | 1 | short spec, approval |
| 5 | Bare-functions API + `jssm/compat` | architectural | 2, 3, 4 landed | spec, plan, approval |
| 6 | Landing: docs, gates, 6.0.0, PR to `main` | bounded, many steps | 5 | checklist, per-step approval where destructive |

### 1. Sync

Merge `origin/main` (tip 1fabfde0, PR #982, 5.164.0) into the v6 line. Dry
run shows 11 conflicting files, all from #982: two source files
(`src/ts/cli/lib.ts`, `src/ts/cli/subcommands/render/rasterize.ts`), the cli
bundles and declarations, `package.json`, `package-lock.json`. Source files
are hand-merged keeping v6 exports plus main's rasterize export; generated
files are resolved by rebuilding; `package.json` keeps the alpha version.
Verify with tsc, the cli typecheck, and the spec suite. Commit on the v6
line. No version bump (alpha branch does not publish).

### 2. #754 bareword charset

Grammar: `AtomFirstLetter` and `AtomLetter` in `src/ts/fsl_parser.peg`
become letter/underscore and letter/digit/underscore respectively, Unicode
aware. `ValEnumMember` follows the same class. pegjs 0.10 has no `\p{}`
classes, so the implementation is a code-unit match plus a semantic predicate
over a `u`-flag regex, with an explicit surrogate-pair alternative so astral
letters still work. Corpus sweep: zero example machines affected; the test
corpus has a handful of deliberate probes (`a -> 0;` in `numeric.stoch.ts`
asserts a bare `0` parses as a label, which flips to a rejection). Update the
grammar reference (§2 lexical), the language reference doc, and set the
manifest entry to landed. Error message for a rejected bareword names the
offending character and suggests quoting.

### 3. Retire `jssm-*` synonyms

Remove the three `Jssm*` thin subclasses and their `define_with_synonym`
calls in `fsl_viz_wc.define.ts`, `fsl_bind_wc.define.ts`,
`fsl_instance_wc.define.ts`; drop the `jssm-*` `HTMLElementTagNameMap`
entries; delete `define_with_synonym` and the `jssm-` branch of
`wc_suffix_matches` and `closest_wc` in `wc_tag_helpers.ts`; update the
`:scope > jssm-*` discovery in the instance host if present. Docs:
`WebComponents.md`, `Environments_Browser.md`, tutorials, the site index,
and the README source lose the alias mentions; the deprecation notice becomes
a removal notice. Add a manifest entry (`wc-jssm-synonyms-removed`) with the
migration line "rename the tag". Tests: the synonym specs become
"synonym is NOT registered" assertions; `wc_tag_helpers.spec.ts` shrinks.

### 4. Probabilistic list-target weights

Grammar: `LabelList` members gain an optional trailing `NonNegNumber "%"`;
the AST carries `{ name, weight? }` per member (or a parallel weights array)
without disturbing the many other `LabelList` consumers (`arrange`,
`end_states`, `panels`, group lists), which ignore weights or reject them.
Compiler: in `compile_rule_transition_step`, when the target is a list and
the semi-edge carries a probability P, each expanded edge gets
`P × share_i`, where shares are the normalized inner weights or `1/n`; a
list with inner weights but no outer P is an error (or uniform? decide in
spec). `start_states` gains weights, surfaced as a new machine accessor and
used by the stochastic tooling's initial distribution; `is_start_state`
semantics unchanged. Manifest entry (`probabilistic-list-weights`) with the
old-copy vs new-share example. Tests: parse shape, compile arithmetic,
stochastic summary honoring the shares, unicode uspec for weighted lists.
Grammar reference §6 and §8, language reference, manual topics.

### 5. Bare-functions API + `jssm/compat`

The design of record is the manifest's `bare-functions-default-api` entry
(megaspec §27). Its own brainstorm and spec cover: the opaque machine value
and its state record; the function naming (snake_case matching today's
method names, machine first); the split entry points (`.` bare functions,
`./compat` the class); `sideEffects: false` and a bundle-size test; the
contract check of running the existing spec suite against the compat class
via a vitest alias; how the sibling packages (viz, fence, cli, wc) consume
core after the split. Machine has 143 members in an 8,035-line file, so the
plan will cut the extraction into method families.

### 6. Landing

In order: merge `origin/main` again if it moved; write `MIGRATING-5-to-6.md`
covering every manifest entry with before/after; rewrite `README_base.md`
(package family is seven, ESM-only, drop es5/iife/Deno/Node-10 claims, drop
`jssm/viz`-style subpath examples, alpha install section removed or made
true); delete the stale root declaration files (`jssm.es5.d.cts`,
`jssm.fence.d.ts`, `jssm_viz.*.d.*`, `jssm.cli.d.*`) after confirming no
build step regenerates them; set every manifest entry to landed; close the
eslint scope gap or file it; graviton envelope A/B of committed dist
branch-vs-main and eyeball the perf chart; `/sc-commit` to **6.0.0**; full
`npm run build`; `npm pack` audit of all seven tarballs; open the PR to
`main` with the `Closes` list; John's errand before merge: npm Trusted
Publisher entries for `jssm-fence`, `jssm-cli`, `jssm-commonjs`,
`jssm-iife`, `jssm-verify`. After merge: verify `npm view jssm version`
reports 6.0.0 and every member published.

## Standing rules for every sub-project

- Work happens in a worktree off the v6 line, lands by PR into the v6 line,
  reviewed before merge. `--base docs_26-07-04_fable-v6-to-v16` on every PR.
- Version stays on the alpha line until sub-project 6; only `/sc-commit`
  bumps, and only the alpha counter.
- No fake tests, no golden files, no pinned bugs. Stochastic tests where the
  surface is generative.
- Each break updates `v6_breaking_changes.json`, the grammar reference, the
  language reference, and `MIGRATING-5-to-6.md` content (collected in 6).
- Subagent-driven execution per house rules, five in flight, one command per
  tool call, no compound commands.

## Out of scope

The package rename; the June strays (return as 6.x minors); the quarantined
oracle; containers/ADTs promotion (held as v8 material); the fsl org
acquisition.
