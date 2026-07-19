# Monorepo Decomposition (fsl#1969) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish four packages from this one repo — core `jssm` plus new `jssm-viz`, `jssm-fence`, `jssm-cli` that depend on the published core instead of embedding it — in lockstep versions, dependency-order published, under the existing run_build DAG.

**Architecture:** Sources stay in `src/ts` (single tsc pass, vitest 100%-coverage globs untouched). npm workspaces add `packages/{jssm-viz,jssm-fence,jssm-cli}` as *publish shells*: each has its own package.json/README/dist, fed by new rollup configs that EXTERNALIZE `jssm` (and upstream siblings) instead of embedding. The root `jssm` package keeps every legacy subpath until the 6.0.0 breakage batch removes them (that removal is step 3 of fsl#1525 rev 5, NOT this plan). The fence↔cli import cycle is dissolved first by moving `rasterize` into fence-owned core source, making the dependency chain strictly core → viz → fence → cli.

**Tech Stack:** npm workspaces, rollup (existing config style), run_build DAG (`src/buildjs/build_config_features.cjs`), terser, vitest.

## Global Constraints

- Version is LOCKSTEP: all four packages share the root package.json version (currently 6.0.0-alpha.12); `makever.cjs` stays the single source of truth. Never hand-bump.
- Publish order at release: `jssm` → `jssm-viz` → `jssm-fence` → `jssm-cli` (each later one depends on all earlier ones it imports).
- New package names: exactly `jssm-viz`, `jssm-fence`, `jssm-cli` (decided by John 2026-07-19; jssm-viz deliberately takes over the deprecated npm line).
- NOTHING here removes any existing `jssm` subpath, bundle, or bin — this plan is purely additive (breakage batch is separate).
- One command per shell call, never compound. npm/builds from the Bash tool. No `#`-private fields. Object.hasOwn does not typecheck (pre-es2022 lib) — use `Object.prototype.hasOwnProperty.call`.
- eslint (0 errors), tsc core+cli, typecheck_tests, and the vitest 100% spec-coverage gate must pass at every commit (`npm run ci_build`).
- Do not touch `fsl_verify.ts` (quarantined oracle) or `dist/` by hand.
- JOHN-ONLY errand (not automatable, required before first real publish): create npm Trusted Publisher entries for `jssm-viz`, `jssm-fence`, `jssm-cli` mirroring `jssm`'s.

---

### Task 1: Dissolve the fence↔cli cycle — move rasterize into fence source

**Files:**
- Create: `src/ts/fsl_rasterize.ts` (moved content of `src/ts/cli/subcommands/render/rasterize.ts`)
- Create: `src/ts/fsl_rasterize_font.ts` (moved content of `src/ts/cli/subcommands/render/bundled-font.ts`)
- Modify: `src/ts/fsl_fence_render.ts` (line ~22: import rasterize from `./fsl_rasterize.js` instead of `./cli/subcommands/render/rasterize.js`)
- Modify: `src/ts/cli/subcommands/render/rasterize.ts` → becomes a two-line re-export shim (keeps cli's public import surface stable): `export * from '../../../fsl_rasterize.js';`
- Modify: `src/ts/cli/subcommands/render/bundled-font.ts` → same shim pattern to `../../../fsl_rasterize_font.js`
- Test: existing suites cover rasterize via `rasterize_dispatch_extras.stoch.ts` and the render plugin specs; the shim keeps them importing the same paths.

**Interfaces:**
- Consumes: nothing new.
- Produces: `fsl_rasterize.ts` exporting exactly the current `rasterize`, `rasterizeRgba` signatures; fence no longer imports from `cli/`.

- [ ] **Step 1:** `git mv`-style move (Read + Write both files; adjust rasterize's relative imports: `../../types.js` → `./cli/types.js`?? — NO: read the file first; its imports are `../../types.js` (cli/types) and `./bundled-font.js`. `types.js` import must be checked: if the imported types are cli-only, re-declare or import from `./cli/types.js` which stays valid from root level as `./cli/types.js`).
- [ ] **Step 2:** Point `fsl_fence_render.ts` at `./fsl_rasterize.js`.
- [ ] **Step 3:** Convert the two old cli files to re-export shims (DocBlock noting the move and why: package-boundary — fence may not depend on cli).
- [ ] **Step 4:** Run `npx tsc --noEmit`, `npx tsc -p tsconfig.cli.json --noEmit`, `npx eslint src/ts/fsl_rasterize.ts src/ts/fsl_rasterize_font.ts src/ts/fsl_fence_render.ts src/ts/cli/subcommands/render/rasterize.ts src/ts/cli/subcommands/render/bundled-font.ts` — all clean.
- [ ] **Step 5:** Run `npm run ci_build` (the coverage gate will confirm the moved files are still fully covered; the shims are re-export-only lines which v8 counts via the re-exported module).
- [ ] **Step 6:** Commit `refactor(fence): move rasterize into fence-owned source, dissolving the fence-cli cycle`.

### Task 2: Workspaces scaffold + three package.json shells

**Files:**
- Modify: root `package.json` — add `"workspaces": ["packages/*"]`.
- Create: `packages/jssm-viz/package.json`, `packages/jssm-fence/package.json`, `packages/jssm-cli/package.json`
- Create: `packages/jssm-viz/README.md`, `packages/jssm-fence/README.md`, `packages/jssm-cli/README.md` (short: what it is, install line, pointer to main repo docs, migration note that these were formerly `jssm/viz`, `jssm/fence`, `jssm` cli bins)
- Create: `packages/.gitignore` (`*/dist/`)

**Interfaces:**
- Produces: three workspace manifests later tasks build into. Exact fields:

`packages/jssm-viz/package.json` (pattern for all three; version copied from root at scaffold time and thereafter maintained by Task 5's version sync):
```json
{
  "name": "jssm-viz",
  "version": "6.0.0-alpha.12",
  "description": "Graphviz-based visualization for jssm state machines (split from the jssm package in v6)",
  "license": "MIT",
  "repository": { "type": "git", "url": "git+https://github.com/StoneCypher/jssm.git", "directory": "packages/jssm-viz" },
  "main": "./dist/jssm_viz.cjs",
  "module": "./dist/jssm_viz.mjs",
  "types": "./dist/jssm_viz.d.ts",
  "exports": {
    ".": { "types": "./dist/jssm_viz.d.ts", "require": "./dist/jssm_viz.cjs", "import": "./dist/jssm_viz.mjs" },
    "./wc/viz": "./dist/wc/viz.js", "./wc/viz/define": "./dist/wc/viz.define.js",
    "./wc/instance": "./dist/wc/instance.js", "./wc/instance/define": "./dist/wc/instance.define.js",
    "./wc/editor": "./dist/wc/editor.js", "./wc/editor/define": "./dist/wc/editor.define.js",
    "./wc/widgets": "./dist/wc/widgets.js", "./wc/widgets/define": "./dist/wc/widgets.define.js",
    "./wc/docs": "./dist/wc/docs.js", "./wc/docs/define": "./dist/wc/docs.define.js",
    "./cdn/viz": "./dist/cdn/viz.js", "./cdn/instance": "./dist/cdn/instance.js",
    "./custom-elements.json": "./custom-elements.json"
  },
  "files": ["dist/", "custom-elements.json", "README.md"],
  "dependencies": { "jssm": "6.0.0-alpha.12" },
  "optionalDependencies": { "@viz-js/viz": "^3.26.0" }
}
```
- `jssm-fence`: main/module/types → `./dist/fence.js` (+ d.ts); deps `jssm` + `jssm-viz` (lockstep exact); peer `@resvg/resvg-wasm` optional (mirror root's optionalDependencies handling — read root package.json for how resvg is declared and copy that classification).
- `jssm-cli`: `bin`: `{ "fsl": "./dist/fsl.cjs", "jssm": "./dist/fsl.cjs", "fsl-render": "./dist/fsl-render.cjs", "fsl-export-system-prompt": "./dist/fsl-export-system-prompt.cjs" }`; main/module → `./dist/lib.cjs`/`./dist/lib.mjs`, types `./dist/lib.d.ts`; deps `jssm`, `jssm-viz`, `jssm-fence` (lockstep exact).
- Version pinning style: EXACT lockstep versions (`"jssm-viz": "6.0.0-alpha.12"`, not `^`) for deps BETWEEN workspace members — lockstep publish means the matching version always exists, and exact pins make the trail attribution unambiguous.
- EXCEPTION (discovered at execution, 2026-07-19): the dependency on the ROOT package `jssm` must be `"jssm": "file:../.."` in every member manifest. npm workspaces link members to each other, but the workspace ROOT is not a member — a version dep on `jssm` resolves against the registry, where alphas never publish (ETARGET). Consequences: Task 5's makever stamps member versions and sibling pins but NEVER touches the `file:../..` dep; Task 6's publisher must transiently rewrite `file:../..` → the exact lockstep version in each manifest, publish, and restore the file: form (rewrite-publish-restore, atomic per package, --dry-run included).

- [ ] **Step 1:** Write the three manifests + READMEs + gitignore; add `workspaces` to root.
- [ ] **Step 2:** Run `npm install` — verify workspaces link (node_modules/jssm-viz -> packages/jssm-viz symlinks appear); commit lockfile.
- [ ] **Step 3:** Run `npm run ci_build` (nothing builds into packages yet; gate must stay green — specifically confirm eslint doesn't sweep packages/ (check eslint config ignores; add `packages/**/dist` to ignores if needed) and vitest globs don't match packages/ (they include `**/*.spec.ts` root-relative — packages/ has no specs)).
- [ ] **Step 4:** Commit `feat(monorepo): npm workspaces scaffold with jssm-viz, jssm-fence, jssm-cli publish shells`.

### Task 3: Externalized rollup bundles into packages/*/dist

**Files:**
- Create: `rollup.config.pkg_viz.js` — same input graph as `rollup.config.viz.js` but `external: (id) => id === 'jssm' || id.startsWith('jssm/')` plus existing externals; output `packages/jssm-viz/dist/jssm_viz.{cjs,mjs}`; wc/cdn outputs mirrored under `packages/jssm-viz/dist/wc/`, `dist/cdn/` — copy custom-elements.json in a small `cp` build step.
- Create: `rollup.config.pkg_fence.js` — externals `jssm`, `jssm-viz`, `@resvg/*`; output `packages/jssm-fence/dist/fence.js`.
- Create: `rollup.config.pkg_cli.js` — externals `jssm`, `jssm-viz`, `jssm-fence`, node builtins; outputs `packages/jssm-cli/dist/{fsl.cjs,fsl-render.cjs,fsl-export-system-prompt.cjs,lib.cjs,lib.mjs}`.
- Mapping note for the config author: the tsc intermediates in `dist/es6/` import each other by RELATIVE path (`./jssm_viz.js`), not by package name. The externalization therefore needs a rollup `paths`/alias step: mark the *relative module ids* that resolve into another package's surface as external and rewrite them to the package name. Concretely: in pkg_fence, `dist/es6/jssm_viz.js` → external id `jssm-viz`; `dist/es6/jssm.js` (and every core module fence pulls: fsl_gif, fsl_walk, fsl_svg_patch stay INTERNAL to fence — decide by the source-ownership map in notes/plans/, the fence-owned five files bundle in, everything else core → external `jssm`). Use rollup's `external` function + `output.paths` map, mirroring how `rollup.config.viz.js` handles `@viz-js/viz`.
- Modify: `package.json` scripts — add `make_pkg_viz`, `make_pkg_fence`, `make_pkg_cli`, `min_pkg_viz`, `min_pkg_fence`, `min_pkg_cli` (terser in place, mirroring the existing min_* command shapes), and d.ts copy steps `dts_pkg_viz` etc. copying the existing rolled-up `jssm_viz.es6.d.ts` → `packages/jssm-viz/dist/jssm_viz.d.ts`, `jssm.fence.d.ts` → `packages/jssm-fence/dist/fence.d.ts`, `jssm.cli.d.ts` → `packages/jssm-cli/dist/lib.d.ts` (single esm-flavor d.ts per package — the cjs/esm twin duplication dies in the new packages).
- Modify: `src/buildjs/build_config_features.cjs` — new features, stage 4: `make_pkg_viz` (requires typescript), `make_pkg_fence`, `make_pkg_cli`; stage 5: `min_pkg_*` + `dts_pkg_*` with `requires` on their stage-4 producer. Mirror the existing feature-object shape exactly (read two existing entries first).
- Test: `src/buildjs/tests/build_config_features.spec.ts` asserts every DAG script exists in root package.json scripts — extend its expectations for the new script names.

- [ ] **Step 1:** Write the three rollup configs (read `rollup.config.viz.js`, `rollup.config.fence.es6.js`, `rollup.config.cli.js` first and mirror their plugin stacks and version-injection; `__JSSM_VERSION__` replace in pkg_cli reads root pkg.version — unchanged single source).
- [ ] **Step 2:** Add the package.json scripts + DAG features + spec expectations.
- [ ] **Step 3:** Run `npm run make` — confirm packages/*/dist artifacts appear AND every legacy dist/ artifact is byte-stable (the additive invariant). Run `node -e` size report: each new bundle must be dramatically smaller than its embedded counterpart (jssm_viz ~504KB embedded → externalized target <100KB; fence 2.29MB → codemirror/lezer remain so expect ~1.5-2MB; cli lib 943KB → thin).
- [ ] **Step 4:** Smoke-run the externalized cli: `node packages/jssm-cli/dist/fsl.cjs --help` from a scratch dir where `jssm`/`jssm-viz`/`jssm-fence` resolve via the workspace symlinks. Render one machine through `fsl-render --target=svg` to prove the cross-package resolution works at runtime.
- [ ] **Step 5:** `npm run ci_build`; commit `feat(monorepo): externalized package bundles wired into the build DAG`.

### Task 4: verify_version_bump generalizes to the package loop

**Files:**
- Modify: `src/buildjs/verify_version_bump.cjs`
- Test: create `src/buildjs/tests/verify_version_bump.spec.ts` if none exists (check first); the module today is a run-to-effect script — refactor into `checkOnePackage(name, version, publishedVersion)` pure decision function + a thin main, and unit-test the decision function (greater→pass, equal/lesser→fail, unpublished(404)→pass-as-first-publish).

**Interfaces:**
- Produces: same CLI contract (exit 0/1, one `v${version}` lockstep tag), now looping `['jssm','jssm-viz','jssm-fence','jssm-cli']` with each workspace package.json's version compared to its own `npm view <name> version`; a 404 from npm view (package never published) counts as publishable.
- Also asserts LOCKSTEP: all four manifest versions identical, else exit 1 with a message naming the divergent package.

- [ ] **Step 1:** Write the failing spec for the extracted decision function (greater/equal/lesser/404/lockstep-divergence cases).
- [ ] **Step 2:** Refactor + implement; keep the single `git tag -a v${version}` (lockstep = one tag).
- [ ] **Step 3:** `npm run ci_build`; commit `feat(release): verify_version_bump loops all workspace packages with lockstep assertion`.

### Task 5: Version sync — makever stamps the workspaces

**Files:**
- Modify: `src/buildjs/makever.cjs` — after generating `src/ts/version.ts`, also rewrite the `version` field AND every lockstep internal dependency (`jssm`, `jssm-viz`, `jssm-fence` entries in `dependencies`) of each `packages/*/package.json` to the root version. This makes /sc-commit's root bump propagate automatically; no second bump mechanism.
- Test: extend/author its spec (check `src/buildjs/tests/` for an existing makever spec first) — feed a temp dir fixture of a workspace manifest, assert version + dep pins rewritten.

- [ ] **Step 1:** Failing test; **Step 2:** implement (JSON parse → mutate → stringify with 2-space indent + trailing newline, matching npm's own formatting so `npm install` doesn't reformat); **Step 3:** `npm run ci_build`; **Step 4:** commit `feat(release): makever propagates the lockstep version into workspace manifests`.

### Task 6: Dependency-order publish in the release job + rehearsal script

**Files:**
- Create: `src/scripts/publish_workspaces.cjs` — the ordered publisher: for `['jssm','jssm-viz','jssm-fence','jssm-cli']` in order: skip-guard `npm view <name>@<version>` (exists → skip), else `npm publish --provenance --access public` with `-w <name>` for the three workspaces / bare for root. `--dry-run` flag passes through to every publish (the rev-5 rehearsal mode). windowsHide on every spawn.
- Modify: `.github/workflows/nodejs.yml` release job — replace the single guarded `npm publish` step (~L829-835) with `node src/scripts/publish_workspaces.cjs`; tag/GH-release steps stay single-lockstep.
- Test: spec for the ordering/guard logic (extract `planPublishes(names, existsFn)` pure function; assert order, skip-on-exists, all-skipped short-circuit).

- [ ] **Step 1:** Failing spec for `planPublishes`; **Step 2:** implement script; **Step 3:** local rehearsal `node src/scripts/publish_workspaces.cjs --dry-run` — expect four dry-run publishes in order, sizes printed; **Step 4:** edit the workflow; **Step 5:** `npm run ci_build`; **Step 6:** commit `feat(release): dependency-ordered workspace publish with dry-run rehearsal (fsl#1969)`.

### Task 7: Full-build integration + docs + tracker

- [ ] **Step 1:** `npm run build` (full profile — regenerates site/docs/changelog/readme with the new scripts in the DAG).
- [ ] **Step 2:** `npm pack -w jssm-viz -w jssm-fence -w jssm-cli` + root `npm pack`; inspect tarball file lists — each must contain ONLY its own artifacts (no cross-package leakage, no dist/es6 intermediates).
- [ ] **Step 3:** Update root README source (whichever `make_readme.cjs` consumes — read it) with a "Package family" section: table of the four packages, what each is for, and that 6.0.0 slims `jssm` itself (forward reference to the breakage batch).
- [ ] **Step 4:** /sc-commit on the branch (bump per its rules), push.
- [ ] **Step 5:** Comment the disposition on fsl#1969 (what shipped, dependency chain, rehearsal instructions, the John-errand: Trusted Publisher entries for the three new names before merge-down). Do NOT close the issue (closes ride the eventual PR body per house rule).

---

## Self-review notes

- Coverage: issue asks workspaces ✓ (T2), packages depending on core ✓ (T3 externalization), lockstep ✓ (T4/T5), dependency-order publish ✓ (T6), verify_version_bump loop ✓ (T4), naming ✓ (locked jssm-*), rehearsals ✓ (T6 dry-run + T7 pack).
- The cycle fix (T1) is the load-bearing prerequisite the issue doesn't mention; without it jssm-fence↔jssm-cli can't both publish.
- Deliberately OUT of scope: removing jssm's own subpaths/bundles (breakage batch), per-package coverage reconfig (sources never move), scope migration to @fsl/*, cm6/deno/grammar extraction (stay in core).
- Known risk parked: rollup relative-id externalization (T3's mapping note) is the fiddliest piece; if `output.paths` proves insufficient, fall back to a tiny rollup plugin resolving `dist/es6/jssm_viz.js` → external `jssm-viz`. Budget T3 the most review attention.
