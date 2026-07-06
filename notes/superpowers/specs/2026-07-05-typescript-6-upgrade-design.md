# TypeScript 6 upgrade — design

- **Date:** 2026-07-05
- **Branch:** `build_26-07-05_typescript-6` (worktree off `origin/main` @ 5.159.2)
- **Status:** approved design, pre-implementation
- **Supersedes:** the stale `build_26-06-23_typescript-6` worktree (368 commits behind main; harvested for reference, then retired)

## Goal

Move jssm's compiler from TypeScript `4.7.4` to `6.0.3` (current stable — 7.0 is
still RC/native-port), **holding runtime and type-strictness behavior constant**,
and repair the build/emit fallout so the toolchain is current. This lays the
groundwork for the later strict-mode migration without performing it here.

## Scope

**In scope**
- Bump `typescript` `^4.7.4` → `^6.0.3`.
- The version-locked doc toolchain cascade: bump `typedoc` to a 6.0.3-compatible
  line and `typedoc-plugin-missing-exports` to match; **drop
  `@knodes/typedoc-plugin-pages`** (see below).
- `tsconfig` changes for 6.0.3's stricter defaults (module resolution, lib,
  rootDir, explicit-off strict flags).
- Fix the new **non-strict** type errors 6.0.3 surfaces in `src/ts`.
- Repair the `dist` emit/naming breakage so artifacts land at the exact paths
  `package.json` exports and the rollup configs consume.

**Out of scope**
- Enabling `strict` / `strictNullChecks` / `noImplicitAny` — they stay pinned
  `false`. That is the separate v6/7-era strict-mode migration.
- The TypeScript 7.0 native port (still RC).
- Any runtime or public-API behavior change.

## Success criteria

A fully green `npm run build` (release profile) under 6.0.3:
- `tsc --build tsconfig.json` and `tsc --noEmit -p tsconfig.cli.json` clean.
- Every rollup bundle emits; `dist` artifacts are correctly named and resolvable.
- Spec suite at **100%** statements/branches/functions/lines; stoch suite green;
  doctests green.
- `build_manifest` make-vs-build byte-parity gate passes.
- cookbook / site / docs / changelog / readme / cloc all regenerate.
- Shipped as a normal patch/minor release via `/sc-commit` → PR → merge →
  `npm view jssm version` confirms publish.

## Approach

Approach **A** (chosen over resurrecting the stale worktree or patch-extraction):
a fresh worktree off current `main`, re-applying the WIP's proven config deltas
by hand and iterating to green. Delivered as **one atomic upgrade PR** — typedoc
and typescript are version-locked, so the compiler bump and the doc-toolchain
bump cannot be split.

## Known config deltas (proven by the stale WIP)

| File | Change |
|---|---|
| `package.json` | `typescript` `^4.7.4` → `^6.0.3`; `typedoc` `^0.22.18` → a 6.0.3-compatible line; `typedoc-plugin-missing-exports` → matching version; **remove** `@knodes/typedoc-plugin-pages` |
| `tsconfig.json` | add `lib:["es2020","dom","dom.iterable"]`; add `rootDir:"./src/ts"`; `moduleResolution:"node"` → `"bundler"`; pin `strict`/`noImplicitAny`/`strictNullChecks` explicit `false` |
| `tsconfig.cli.json` | add `types:["node"]` |
| `src/buildjs/fixparser.cjs` | prepend `// @ts-nocheck` to the generated `fsl_parser.ts` (generated PEG.js output; correctness verified by the parse test suites, not the type checker) |
| `src/buildjs/run_build.cjs` | reconcile the WIP's `BUILD_CONCURRENCY`-bounded fan-out with current main's orchestrator — apply only if main lacks it |
| `typedoc-options.cjs` | remove the `pluginPages` block (the dropped plugin's config) |

## typedoc: dropping `@knodes/typedoc-plugin-pages`

The plugin injects a hand-curated nav tree (Tutorials / Howtos / Tools /
Community / Changelog) into the typedoc site, most of it `todo.md` placeholders.
Chasing a 6.0.3-compatible release is the single largest risk and the pattern is
outdated, so we drop it: typedoc output becomes a clean **API reference**. The
underlying `src/doc_md/*.md` files are untouched and still feed the separate
FSL-tools site / cookbook, so no real content is lost — only the outdated
guides-inside-API-docs structure. Delete the dep from `package.json` and the
`pluginPages` block from `typedoc-options.cjs`.

## The iterative fix loop

This is an iterative upgrade, not a fixed edit list:

1. Apply config deltas + dependency bumps; `npm install` (from the Bash tool).
2. `tsc --build` → collect new errors → fix → repeat until clean.
3. docs/typedoc toolchain green (the `docs` build stage runs under the new typedoc).
4. rollup + emit stage green, with `dist` artifacts at correct paths/names.
5. full test stage green (spec 100%, stoch, doctests).
6. whole `npm run build` green end to end.
7. `/sc-commit` → PR → checks → merge → verify npm.

## Principles

- **Strict stays off; zero runtime/behavior change** — a compiler move, not a refactor.
- **Real fixes over suppressions.** `@ts-nocheck` is reserved for genuinely
  generated files (`fsl_parser.ts`); hand-written source gets a proper type fix.
- Any fix that touches an entity's contract carries its DocBlock / test / README
  update per repo rules. (Most fixes here are type annotations, not behavior.)
- The spec suite's **100% coverage gate** and the `build_manifest` byte-parity
  gate must both hold under 6.0.3.
- Do not hand-bump the version; `/sc-commit` owns the bump and rebuild.

## Risks (most-likely first)

1. ~~typedoc pages-plugin compatibility~~ — **resolved: drop the plugin.**
2. **Type-error cascade** — 6.0.3's improved inference surfaces new errors even
   non-strict; count is unknown (a few to dozens) and sets the effort size.
   Discovered in step 2 of the loop.
3. **Emit/naming root cause** — the `rootDir`/`module` change must still emit
   artifacts at the exact paths `package.json` exports and the rollup configs
   consume, or downstream resolution breaks. The stale WIP's stray
   `dist/*.cjs.js` / `*.es6.js` outputs are the symptom to chase.
4. **`@rollup/plugin-typescript` v12 peer range** vs 6.0.3 — probably fine
   (only `rollup.config.cli.js` transpiles TS directly); verify early.
5. **Build OOM** on the wider fan-out — mitigated by the `BUILD_CONCURRENCY` cap.
6. **`build_manifest` parity** compares make-vs-build within the same tree (not
   against pre-upgrade bytes), so it should hold as long as both paths use 6.0.3
   consistently — but 6.0.3 may legitimately change emitted JS vs 4.7, so any
   comparison against historical dist is expected to differ.

## Reference

The stale WIP lives in the `build_26-06-23_typescript-6` worktree; its
`package.json` / `tsconfig.json` / `tsconfig.cli.json` / `fixparser.cjs` /
`run_build.cjs` diffs are the reference spec for the config deltas above. Its
`dist` changes are meaningless (regenerated) and are not carried over.
