# TypeScript 6 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move jssm's compiler from TypeScript 4.7.4 to 6.0.3, holding runtime and type-strictness behavior constant, and repair the build/emit and doc-toolchain fallout so `npm run build` is fully green.

**Architecture:** A held-behavior compiler bump. Config deltas are deterministic and known (from the retired `build_26-06-23_typescript-6` WIP); the type-error fixes and the `dist` emit repair are compiler-output-driven discovery, so those tasks give the exact procedure, decision rules, and acceptance gate rather than fabricated fixes. Delivered as one atomic PR because typedoc and typescript are version-locked.

**Tech Stack:** TypeScript 6.0.3, `tsc --build`, rollup (+ `@rollup/plugin-typescript` for the CLI bundle only), typedoc + `typedoc-plugin-missing-exports`, vitest (spec/stoch/doctest), the `run_build.cjs` staged orchestrator.

## Global Constraints

- Compiler target: `typescript` `^6.0.3` (current stable; do NOT jump to 7.0 RC).
- `typedoc` bumped to the line that supports TS 6.0.3; `typedoc-plugin-missing-exports` bumped to match; `@knodes/typedoc-plugin-pages` **removed**.
- `strict` / `noImplicitAny` / `strictNullChecks` pinned explicit `false` — no strict-mode migration here. Individually-enabled flags already on (`strictBindCallApply`, `alwaysStrict`, `noImplicitReturns`, `noUncheckedIndexedAccess`) stay on.
- No runtime or public-API behavior change. This is a compiler move, not a refactor.
- `@ts-nocheck` is allowed ONLY on the generated `src/ts/fsl_parser.ts`. Hand-written source gets a real type fix.
- The spec suite's 100% statements/branches/functions/lines gate and the `build_manifest` make-vs-build byte-parity gate must both pass.
- Never hand-bump `package.json` version — `/sc-commit` owns the bump and rebuild.
- All npm/npx runs from the Bash tool. One command per shell call (no `&&`, `||`, `;`, or pipes). Options go after the subcommand (`npm install`, `npm run build`), never between `git`/`npm` and the subcommand.
- Work happens in the `build_26-07-05_typescript-6` worktree (already created off `origin/main` @ 5.159.2). The spec is at `notes/superpowers/specs/2026-07-05-typescript-6-upgrade-design.md`.

---

### Task 1: Bump dependencies, re-pin tsconfig, install

**Files:**
- Modify: `package.json` (devDependencies + remove one dep)
- Modify: `tsconfig.json`
- Modify: `tsconfig.cli.json`
- Modify: `typedoc-options.cjs`

**Interfaces:**
- Produces: a tree resolvable at TypeScript 6.0.3 with the tsconfig settings every later task compiles against. No code symbols.

- [ ] **Step 1: Discover the typedoc version that supports 6.0.3**

Run: `npm view typedoc peerDependencies`
Then: `npm view typedoc versions --json`
Pick the highest published `typedoc` whose `peerDependencies.typescript` range admits `6.0.3` (e.g. a `>=6` or `6.0.x` range). Do the same for the plugin: `npm view typedoc-plugin-missing-exports peerDependencies`. Record the two chosen versions; use them in Step 2. If NO published typedoc supports 6.0.3, stop and report — that reopens a design decision (drop typedoc docs generation for this release).

- [ ] **Step 2: Edit `package.json` devDependencies**

Remove this line entirely (line ~304):
```json
    "@knodes/typedoc-plugin-pages": "^0.22.5",
```
Change these three (line ~344-346) to the versions chosen in Step 1 for typedoc/missing-exports, and `^6.0.3` for typescript:
```json
    "typedoc": "^<chosen-typedoc>",
    "typedoc-plugin-missing-exports": "^<chosen-missing-exports>",
    "typescript": "^6.0.3",
```

- [ ] **Step 3: Edit `tsconfig.json`**

Line 15 — uncomment and set `lib`:
```jsonc
    "lib": ["es2020", "dom", "dom.iterable"],            /* 6.0.3 no longer folds newer Array APIs (flatMap/es2019) into the es2017 default lib; pin es2020+dom so the available types match the code. Emit target stays es2017. */
```
Line 29 — set `rootDir`:
```jsonc
    "rootDir": "./src/ts",                               /* 6.0.3 requires rootDir explicit when outDir is set; ./src/ts preserves the dist/es6 layout. */
```
Line 30 — change `moduleResolution`:
```jsonc
    "moduleResolution": "bundler",                       /* 6.0.3 removed "node" (node10); "bundler" matches the extensionless, rollup-bundled imports. */
```
Lines 79-81 — replace the commented strict trio with explicit false:
```jsonc
    /* 6.0.3 defaults `strict` to true; jssm predates strict mode, so pin these
       false to preserve 4.x strictness. Enabling strict is a separate migration. */
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
```

- [ ] **Step 4: Edit `tsconfig.cli.json`**

Line 5 — add `types` after `declaration`:
```jsonc
    "outDir": "./dist/cli",
    "declaration": false,
    "types": ["node"]
```

- [ ] **Step 5: Remove the `pluginPages` block from `typedoc-options.cjs`**

Delete the entire `pluginPages: { ... }` object (the `source` + `pages` tree). Leave `name`, `readme`, `out`, `customCss`, `excludePrivate`. The file should no longer reference `pluginPages` or `@knodes`.

- [ ] **Step 6: Install**

Run: `npm install`
Expected: completes; no ERESOLVE peer conflict mentioning typescript/typedoc. If ERESOLVE fires, the typedoc/missing-exports versions from Step 1 are wrong — return to Step 1.

- [ ] **Step 7: Verify the compiler version**

Run: `npx tsc --version`
Expected: `Version 6.0.3`

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.cli.json typedoc-options.cjs
git commit -m "build: bump to TypeScript 6.0.3 + TS6-compatible typedoc; drop pages plugin"
```

---

### Task 2: Exempt the generated parser from type-checking

**Files:**
- Modify: `src/buildjs/fixparser.cjs`
- Regenerates: `src/ts/fsl_parser.ts` (generated; not committed by this task alone — it is a build artifact)

**Interfaces:**
- Consumes: nothing from Task 1's symbols.
- Produces: a generated `fsl_parser.ts` carrying `// @ts-nocheck` so 6.0.3 does not type-check the machine-generated PEG.js output.

- [ ] **Step 1: Edit `fixparser.cjs` to prepend `@ts-nocheck`**

Find the final write (near the end of the file):
```js
fs.writeFileSync('./src/ts/fsl_parser.ts', body + tail);
```
Replace with:
```js
// The parser is machine-generated PEG.js output (plus the hand-tuned scanners
// above); its correctness is verified by the parse test suites, not the type
// checker. 6.0.3 is stricter than 4.x about the generated code's implicit-any
// parameters and V8-only `Error.captureStackTrace`, so suppress type-checking
// of this one generated file rather than annotating throwaway output. Emit is
// unaffected; terser strips the comment from the minified bundle.
const ts_nocheck = '// @ts-nocheck — generated PEG.js parser; verified by tests, not types\n';

fs.writeFileSync('./src/ts/fsl_parser.ts', ts_nocheck + body + tail);
```

- [ ] **Step 2: Regenerate the parser**

Run: `npm run peg`
Expected: completes; regenerates `src/ts/fsl_parser.ts`.

- [ ] **Step 3: Verify the marker landed**

Run: `head -1 src/ts/fsl_parser.ts`
Expected: the first line is the `// @ts-nocheck …` comment.

- [ ] **Step 4: Commit**

```bash
git add src/buildjs/fixparser.cjs
git commit -m "build: @ts-nocheck the generated fsl_parser.ts for the TS6 checker"
```

---

### Task 3: Drive `tsc --build tsconfig.json` to zero errors

**Files:**
- Modify: whichever `src/ts/**/*.ts` files 6.0.3 flags (determined by compiler output — NOT knowable in advance).
- Test: the compiler itself is the test (`npm run typescript`).

**Interfaces:**
- Consumes: Task 1 tsconfig, Task 2 parser exemption.
- Produces: a clean `tsc --build`, the precondition for every emit/rollup stage.

This task is compiler-output-driven. Do not fabricate fixes; run the compiler, then fix what it reports, following the decision rules below.

- [ ] **Step 1: Run the compiler and capture the full error list**

Run: `npm run typescript`
Expected initially: FAILS with a list of `error TS…` lines. Read the whole list; group errors by rule/type before fixing.

- [ ] **Step 2: Fix each error with a real, minimal fix**

Decision rules (apply per error, preserving behavior):
- **Removed lib API / changed signature** (e.g. an Array/DOM method type moved): confirm the value still exists at runtime; adjust the type/annotation only. Do NOT change runtime behavior.
- **Newly-surfaced implicit any / narrowing**: add the precise type annotation the code already implies. Never widen to `any` to silence — annotate the real type.
- **Module-resolution / import shape** under `moduleResolution: "bundler"`: fix the import form; do not add file extensions unless the bundler config requires them.
- **A generated file** (only `fsl_parser.ts` qualifies): already exempt via Task 2 — if another generated file appears, exempt it in its generator, not by hand-editing output.
- Each fix that changes a hand-written entity's type contract updates its DocBlock/tests per repo rules if the public contract shifts (most fixes are internal annotations and need none).

- [ ] **Step 3: Re-run until clean**

Run: `npm run typescript`
Expected: exit 0, no output errors. Repeat Step 2 until this holds.

- [ ] **Step 4: Commit (batch by coherent group)**

```bash
git add src/ts
git commit -m "fix(types): satisfy the TS6 checker without changing behavior"
```
If the fixes span clearly separable groups (e.g. lib-API vs import-shape), make one commit per group with a specific message.

---

### Task 4: Drive the CLI typecheck to zero errors

**Files:**
- Modify: `src/ts/cli/**` and/or `package.json` (only if `@types/node` must be added).
- Test: `npm run typecheck_cli`.

**Interfaces:**
- Consumes: Task 1 `tsconfig.cli.json` (`types: ["node"]`).
- Produces: a clean `tsc --noEmit -p tsconfig.cli.json`.

- [ ] **Step 1: Run the CLI typecheck**

Run: `npm run typecheck_cli`
Expected: may FAIL. Two likely shapes:
- `Cannot find type definition file for 'node'` → `@types/node` is not resolvable. Add it: `npm install --save-dev @types/node` (choose a version whose Node lib matches `engines`/CI Node; `^20` or later is safe), then re-run.
- Ordinary type errors → fix per the Task 3 decision rules.

- [ ] **Step 2: Re-run until clean**

Run: `npm run typecheck_cli`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/ts package.json package-lock.json
git commit -m "fix(cli): satisfy the TS6 CLI typecheck"
```

---

### Task 5: Restore correct `dist` emit under the new module/rootDir config

**Files:**
- Modify (likely): `tsconfig.json` emit options and/or the relevant `rollup.config.*.js` and/or `src/buildjs/*` output paths — determined by what the build actually emits.
- Test: `npm run make` + the pack-shape test.

**Interfaces:**
- Consumes: Tasks 1-4 (a compiling tree).
- Produces: `dist` artifacts at the exact paths `package.json` `exports`/`bin`/`main`/`types` and the rollup configs reference.

The stale WIP left stray `dist/jssm.es5.cjs.js`, `dist/jssm.es6.js`, `dist/jssm_viz.es5.cjs.js`, `dist/jssm_viz.es5.iife.js`, `dist/jssm_viz.es6.js` — a doubled/renamed emit symptom. This task finds and fixes the root cause.

- [ ] **Step 1: Run the dist build and observe the artifacts**

Run: `npm run make`
Then: `git status --short dist`
Compare the produced `dist` tree against the paths referenced in `package.json` (`exports`, `main`, `module`, `types`, `bin`) and in each `rollup.config.*.js` `output.file`. List every artifact that is missing, extra, or misnamed.

- [ ] **Step 2: Diagnose the root cause**

The doubled extensions point at a tsc-emit vs rollup-output interaction changed by `rootDir`/`module`/`moduleResolution`. Check, in order: (a) does `tsc --build` now emit to a different sub-path under `dist/es6` because of `rootDir: ./src/ts`? (b) do the rollup `input`/`output.file` paths still match the tsc output? (c) is `@rollup/plugin-typescript` (CLI bundle) emitting an extra `.js` because of the new module resolution? Fix the mismatched path/option at its source — do not rename artifacts after the fact.

- [ ] **Step 3: Rebuild and verify the artifact set**

Run: `npm run make`
Run: `git status --short dist`
Expected: no stray/untracked `dist/*` files; the tracked artifacts match their pre-upgrade paths (names unchanged; contents may legitimately differ under 6.0.3).

- [ ] **Step 4: Verify resolution and pack shape**

Run: `node -e "require('./dist/jssm.es5.cjs')"` (adjust to the actual CJS entry) — expected: no throw.
Run: `npx vitest run src/ts/tests/pack_shape.spec.ts --config vitest.spec.config.ts --coverage.enabled=false` — expected: PASS (every exports/bin/entry target is in the npm pack).

- [ ] **Step 5: Commit**

```bash
git add tsconfig.json rollup.config.*.js src/buildjs dist
git commit -m "build: restore correct dist emit paths under TS6 module/rootDir"
```

---

### Task 6: Green the typedoc docs stage

**Files:**
- Modify (likely): `typedoc-options.cjs` (renamed/removed options in the new typedoc major).
- Test: `npm run docs`.

**Interfaces:**
- Consumes: Task 1 typedoc bump + pages-plugin removal.
- Produces: a clean `npm run docs` generating `docs/docs` API reference.

- [ ] **Step 1: Run the docs generator**

Run: `npm run docs`
Expected: may FAIL or warn. Common breakages across a typedoc major: renamed options, an option that moved under a plugin namespace, or `excludePrivate` semantics. Read the errors/warnings.

- [ ] **Step 2: Fix `typedoc-options.cjs` for the new major**

Apply the exact option renames typedoc reports (it names each unknown/removed option). Confirm `typedoc-plugin-missing-exports` still loads (it is referenced implicitly by being installed; if the new typedoc needs explicit `plugin: [...]`, add it). Do not re-add pages.

- [ ] **Step 3: Re-run until clean**

Run: `npm run docs`
Expected: exit 0; `docs/docs` populated; no unknown-option warnings.

- [ ] **Step 4: Commit**

```bash
git add typedoc-options.cjs
git commit -m "docs: adapt typedoc options to the TS6-compatible typedoc major"
```

---

### Task 7 (conditional): Bound the build fan-out if the full build OOMs

Do this task ONLY if Task 8's `npm run build` fails with an out-of-memory / process-killed error on the build machine. Current main's `run_build.cjs` has no concurrency cap.

**Files:**
- Modify: `src/buildjs/run_build.cjs`
- Test: `src/buildjs/tests/run_build.spec.ts`

**Interfaces:**
- Produces: `runStageBounded(stage, run, limit)` and `resolveConcurrency(opts, env?)`, exported from `run_build.cjs`, honoring `BUILD_CONCURRENCY`.

- [ ] **Step 1: Add the bounded-concurrency helpers**

In `run_build.cjs`, add before `runStages`:
```js
async function runStageBounded(stage, run, limit) {
  if (!Number.isFinite(limit) || limit >= stage.length) {
    await Promise.all(stage.map(run));
    return;
  }
  let next = 0;
  const worker = async () => {
    while (next < stage.length) { await run(stage[next++]); }
  };
  await Promise.all(Array.from({ length: Math.max(1, limit) }, worker));
}

function resolveConcurrency(opts, env = process.env) {
  if (Number.isFinite(opts.concurrency)) return opts.concurrency;
  const fromEnv = Number(env.BUILD_CONCURRENCY);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : Infinity;
}
```
In `runStages`, replace `await Promise.all(stage.map(run));` with:
```js
    await runStageBounded(stage, run, resolveConcurrency(opts));
```
Add both helpers to `module.exports`.

- [ ] **Step 2: Test the helpers**

Add to `src/buildjs/tests/run_build.spec.ts` a test that `runStageBounded(['a','b','c'], run, 1)` runs them with at most one in flight (track concurrent count), and that `resolveConcurrency({}, { BUILD_CONCURRENCY: '2' })` returns `2` and `resolveConcurrency({})` returns `Infinity`.

Run: `npx vitest run src/buildjs/tests/run_build.spec.ts --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/buildjs/run_build.cjs src/buildjs/tests/run_build.spec.ts
git commit -m "build: cap per-stage fan-out via BUILD_CONCURRENCY to bound peak memory"
```

---

### Task 8: Full green build + all gates

**Files:** none new — this is the whole-build verification.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a release-ready tree.

- [ ] **Step 1: Run the full release build**

Run: `npm run build`
(If it OOMs, do Task 7, then re-run. If the machine is memory-constrained, `BUILD_CONCURRENCY=2 npm run build`.)
Expected: reaches the final `readme` stage; exit 0.

- [ ] **Step 2: Confirm each gate in the build log**

Confirm: spec suite `Statements : 100%` and `Tests … passed`; stoch suite passed; doctests passed; `build_manifest` parity reported no mismatch. Read coverage from `coverage/spec/coverage-final.json` if the text table is ambiguous — never trust the truncating table.

- [ ] **Step 3: Type-check and lint sweep**

Run: `npx tsc --noEmit`
Expected: exit 0.
Run: `npm run eslint`
Expected: exit 0.

- [ ] **Step 4: Commit any regenerated artifacts**

```bash
git add -A
git commit -m "build: rebuild all artifacts under TypeScript 6.0.3"
```

---

### Task 9: Release

**Files:** version bump + rebuild owned by `/sc-commit`.

- [ ] **Step 1: Run `/sc-commit` on the branch**

Invoke the `sc-commit` skill. It bumps the version (minor is appropriate for a toolchain upgrade of this size; confirm with the user), runs the full `npm run build`, and commits. Watch for build failures.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin build_26-07-05_typescript-6
```
Open a PR titled `build: upgrade to TypeScript 6.0.3`. Body references the spec and lists the toolchain changes. Use `Refs #<issue>` if an issue exists, else no issue ref.

- [ ] **Step 3: Wait for checks, then merge (with the user's go-ahead)**

Confirm every PR check is `pass`/`skipping` (especially `verify-version-bump` and every `test-main-matrix` leg). Merging to `main` triggers a release — get explicit user permission, then `gh pr merge <n> --repo StoneCypher/jssm --merge`.

- [ ] **Step 4: Verify the release published**

Run: `npm view jssm version`
Expected: the new version. If it lags, the release job silently skipped — investigate the run.

- [ ] **Step 5: Retire the stale WIP**

With user permission, remove the `build_26-06-23_typescript-6` worktree and delete its branch (its intent is now fully captured here and shipped).

---

## Self-Review

**Spec coverage:** every spec section maps to a task — deps/tsconfig (T1), parser exemption (T2), non-strict type errors (T3/T4), emit/naming repair (T5), typedoc cascade + pages-plugin drop (T1 config + T6 options), optional concurrency (T7), full-build gates incl. coverage + manifest parity (T8), release + stale-branch retirement (T9). Out-of-scope items (strict mode, TS7) are excluded by the Global Constraints.

**Placeholder scan:** the only deferred value is the exact typedoc/missing-exports version, which is intentionally resolved by a concrete `npm view` procedure in T1 Step 1 (a spike with an acceptance test), not a vague TODO. The type-error and emit fixes are compiler-output-driven by nature; they carry full procedures, decision rules, and gates rather than fabricated code — fabricating specific fixes for errors not yet observed would be the real failure.

**Type consistency:** the only defined symbols are T7's `runStageBounded(stage, run, limit)` and `resolveConcurrency(opts, env?)`, used consistently and exported.
