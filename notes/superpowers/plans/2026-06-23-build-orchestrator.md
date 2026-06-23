# Phase 3 — Build orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace jssm's monolithic serial `make`/`build` npm `&&`-chains with a config-driven, staged, parallel orchestrator that produces **byte-identical** artifacts, faster, and profile-selectable — without touching the release pipeline.

**Architecture:** A small CJS orchestrator (`src/buildjs/run_build.cjs`) runs a list of **stages serially**; the **scripts within each stage run concurrently**. The stage plan is computed by `src/buildjs/build_config.cjs` from a closed feature catalog (`build_config_features.cjs`) overlaid with `build.config.json` + profiles + env/CLI overrides. Every existing leaf npm script stays callable and unchanged — the orchestrator only *sequences* them. No rewrite of any build step.

**Tech Stack:** Node (CJS), npm scripts, the existing Rollup/PEG/tsc/CEM/terser/typedoc toolchain. **No new dependencies** — config validation is hand-rolled (the template uses zod; jssm deliberately does not add it).

## Global Constraints

- **Release-on-every-push-to-main must never break.** The `release` job and `verify_version_bump.cjs` are untouched. This phase changes only the *build the jobs invoke*, never the jobs.
- **Byte-identical artifacts.** Every file under `dist/**` (core es5/es6/iife, deno, viz×3, wc viz/instance es6+cdn, cm6, cli×4), every `dist/**.d.ts`, `custom-elements.json`, the root `*.d.ts`/`*.d.cts`, site/cookbook/fsl.tools, typedoc `docs/`, `CHANGELOG*.md`, `README.md`, `coverage/cloc`, and `perf_chart.svg` must match a pre-migration reference build (modulo the intentionally-volatile `build_time` epoch in `version.ts` and timestamped changelog/perf lines — see Task 1).
- **100% spec coverage** over `src/ts/**` (fsl_parser excluded) stays a hard gate.
- **Test tiers stay split** (spec/stoch/dragon/docs/unicode report coverage independently).
- **No new runtime or dev dependency** without explicit sign-off.
- **Builds launch from the Bash tool**, never PowerShell. Worktree is **outside** the repo tree (nested worktree breaks the typedoc docs build).
- **No bare `git push`** — explicit refspec to `origin build_26-06-23_build-orchestrator`.

---

## Reference: jssm's current build chain (the DAG to preserve)

`make` (serial `&&` today), with real data dependencies:

```
clean
makever          writes src/ts/version.ts          (needs: clean)
peg              writes src/ts/fsl_parser.{js,ts}   (needs: clean)
build:cem        custom-elements.json from src/ts   (needs: source only)
typescript       tsc --build → dist/es6/*.{js,d.ts} (needs: makever, peg)
make_doctests    @example → src/ts/tests/generated  (needs: source only)
typecheck_cli    tsc --noEmit cli                    (needs: source only)
make_core        rollup → dist/jssm.es5/es6/iife    (needs: typescript)
make_deno        rollup + cp d.ts → dist/deno        (needs: typescript)
make_viz         rollup → dist/jssm_viz.*            (needs: typescript)
make_wc_viz_es6        rollup → dist/wc/viz.js       (needs: typescript)
make_wc_viz_cdn        rollup → dist/cdn/viz.js      (needs: typescript)
make_wc_instance_es6   rollup → dist/wc/instance.js  (needs: typescript)
make_wc_instance_cdn   rollup → dist/cdn/instance.js (needs: typescript)
make_cm6         rollup → dist/cm6/fsl_language.js   (needs: typescript)
make_cli         rollup → dist/cli/*                 (needs: typescript)
minify           terser dist/es6/fsl_parser.js       (needs: typescript)
min_iife/es6/cjs terser core bundles                 (needs: make_core)
min_deno         terser deno bundle                  (needs: make_deno)
min_viz_*        terser viz bundles                  (needs: make_viz)
min_cli          terser cli bundles                  (needs: make_cli)
rm nonmin        cleanup                             (needs: all min_*)
```

`build` (serial `&&` today): `vet → test → site → make_cookbook → site_fsl_tools → changelog → perf_chart → docs → cloc → readme`, where `test = make && vitest`, `site` needs the minified `dist/jssm.es5.iife.js`, `site_fsl_tools` needs `site`, `readme` needs `coverage/spec/metrics.json` (from vitest spec).

**Target stage DAG** (this is the hypothesis Task 6 must prove byte-identical):

```
Stage 0  clean
Stage 1  makever ∥ peg
Stage 2  typescript ∥ build:cem ∥ make_doctests ∥ typecheck_cli
Stage 3  make_core ∥ make_deno ∥ make_viz ∥ make_wc_viz_es6 ∥ make_wc_viz_cdn
         ∥ make_wc_instance_es6 ∥ make_wc_instance_cdn ∥ make_cm6 ∥ make_cli ∥ minify
Stage 4  min_iife ∥ min_es6 ∥ min_cjs ∥ min_deno ∥ min_viz_iife ∥ min_viz_es6
         ∥ min_viz_cjs ∥ min_cli
Stage 5  rm_nonmin
--- make ends; build continues ---
Stage 6  vitest (spec+stoch+docs)   [the `test` tail]   ∥ changelog ∥ perf_chart ∥ cloc
Stage 7  site                        (needs min iife)
Stage 8  make_cookbook ∥ site_fsl_tools ∥ docs
Stage 9  readme                      (needs metrics.json from Stage 6)
```

`vet` (eslint ∥ audit) is independent and can occupy Stage 0 alongside `clean` for `build`. The orchestrator computes the prefix (`make`) and the full chain (`build`) from the same catalog via profiles.

---

## File Structure

- Create `src/buildjs/build_config_features.cjs` — the closed feature catalog: `{ name: { script, stages: number[], mandatory?, optional?, requires?, defaultEnabled? } }` plus `MANDATORY_FEATURE_NAMES` / `OPTIONAL_FEATURE_NAMES`. One responsibility: declare the DAG.
- Create `src/buildjs/build_config.cjs` — pure planner: layered config load + profile + overrides + hand-rolled validation + dependency cascade → `{ stages, disabled, warnings }`. Mirrors the template's `build_config.js`, CJS, zod removed.
- Create `src/buildjs/run_build.cjs` — thin runner: `buildPlan()` → for each stage `await Promise.all(spawn npm run …)`. Mirrors the template's `run_build.js`, CJS.
- Create `build.config.json` — feature flags + `fast`/`ci`/`ci-lite`/`release` profiles, expressed over jssm's catalog.
- Create tests under `src/buildjs/tests/` (run by the spec suite's `**/*.spec.ts` include; NOT coverage-gated since `coverage.include` is `src/ts/**`).
- Modify `package.json` — `make`/`build` delegate to `run_build.cjs --profile=…`; **keep every leaf script** callable.

---

## Task 0: Golden reference build

**Files:** none (produces a throwaway reference under the scratchpad).

- [ ] **Step 1:** On a clean checkout of merged `main` (this worktree), run the current chain end to end: `npm run build`.
- [ ] **Step 2:** Snapshot the artifact tree to a manifest of path → sha256, excluding intentionally-volatile content. Write `src/buildjs/build_manifest.cjs` (reused by Task 6) that hashes `dist/**`, root `*.d.ts`/`*.d.cts`, `custom-elements.json`, `CHANGELOG*.md`, `README.md`, `docs/**` (excluding typedoc's timestamped footer), and normalizes: drop `build_time` from `version.ts`/`version.js`, drop changelog/perf date lines. Save `reference.manifest.json` to the scratchpad.
- [ ] **Step 3:** Commit `build_manifest.cjs` only (it's a permanent tool): `git add src/buildjs/build_manifest.cjs && git commit -m "build: artifact manifest hasher for orchestrator parity checks"`.

Acceptance: `node src/buildjs/build_manifest.cjs` prints a stable manifest across two consecutive reference builds (proves the normalization covers all volatile content). If two reference builds disagree on a path, widen the normalization until they agree **before** proceeding — otherwise Task 6 can never pass.

---

## Task 1: Feature catalog (the DAG)

**Files:**
- Create: `src/buildjs/build_config_features.cjs`
- Test: `src/buildjs/tests/build_config_features.spec.ts`

**Interfaces:**
- Produces: `FEATURES` (object keyed by feature name → `{ script: string, stages: number[], mandatory?: boolean, optional?: boolean, requires?: string[], defaultEnabled?: boolean }`), `MANDATORY_FEATURE_NAMES: string[]`, `OPTIONAL_FEATURE_NAMES: string[]`.

- [ ] **Step 1: Write the failing test** (`build_config_features.spec.ts`):

```ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const F = require('../build_config_features.cjs');

describe('feature catalog', () => {
  test('every feature names a real npm script', () => {
    const pkg = require('../../../package.json');
    for (const [name, def] of Object.entries(F.FEATURES)) {
      expect(typeof def.script).toBe('string');
      expect(pkg.scripts[def.script], `script for ${name}`).toBeDefined();
    }
  });
  test('every feature is exactly one of mandatory|optional', () => {
    for (const [name, def] of Object.entries(F.FEATURES)) {
      expect(Boolean(def.mandatory) !== Boolean(def.optional), name).toBe(true);
    }
  });
  test('requires only reference known features', () => {
    const names = Object.keys(F.FEATURES);
    for (const def of Object.values(F.FEATURES))
      for (const r of def.requires ?? []) expect(names).toContain(r);
  });
  test('mandatory/optional name lists partition the catalog', () => {
    expect([...F.MANDATORY_FEATURE_NAMES, ...F.OPTIONAL_FEATURE_NAMES].sort())
      .toEqual(Object.keys(F.FEATURES).sort());
  });
  test('stages are non-negative integers', () => {
    for (const def of Object.values(F.FEATURES))
      for (const s of def.stages) expect(Number.isInteger(s) && s >= 0).toBe(true);
  });
});
```

- [ ] **Step 2: Run it; verify it fails** (`Cannot find module '../build_config_features.cjs'`).

- [ ] **Step 3: Implement the catalog.** Encode the Stage DAG above. `mandatory` = always runs (clean, makever, peg, typescript, the bundles, minifies, rm_nonmin, vitest). `optional` (toggleable by profile) = `eslint`, `audit`, `site`, `make_cookbook`, `site_fsl_tools`, `changelog`, `perf_chart`, `docs`, `cloc`, `readme`, `build_cem`, `make_doctests`, `typecheck_cli`. Each leaf maps to its existing script name (`make_core`, `min_iife`, …). `rm_nonmin` wraps the trailing `rm ./dist/es6/*.nonmin.js` — add a leaf script `rm_nonmin` to package.json in Task 5 so the orchestrator can spawn it like any other. Set `requires` for the dependency cascade (e.g. `min_viz_*` requires `make_viz`; `site` requires `make_core`; `readme` requires `vitest`; `site_fsl_tools` requires `site`).

- [ ] **Step 4: Run tests; verify green.**

- [ ] **Step 5: Commit.** `git add src/buildjs/build_config_features.cjs src/buildjs/tests/build_config_features.spec.ts && git commit -m "build: declare orchestrator feature catalog (jssm build DAG)"`

---

## Task 2: Config planner (`build_config.cjs`)

**Files:**
- Create: `src/buildjs/build_config.cjs`
- Test: `src/buildjs/tests/build_config.spec.ts`

**Interfaces:**
- Consumes: `FEATURES`, `MANDATORY_FEATURE_NAMES`, `OPTIONAL_FEATURE_NAMES` from Task 1.
- Produces: `buildPlan({ argv?, env?, cwd? }) → { stages: string[][], disabled: string[], warnings: string[] }`.

Port the template's `build_config.js` to CJS, **removing zod**. Replace `loadAndValidate`'s `BuildConfigSchema.safeParse` with a hand-rolled `validateConfig(parsed, path)` that asserts: top-level keys ⊆ `{features, profiles}`; `features` values are booleans over known optional names; each profile's `features` likewise; throws with the offending path on violation. Keep verbatim: `parseCliFlags`, `parseEnvVars`, `applyOverrides` (incl. `--only` exclusivity), `validateOverrideLayer` (unknown-name + mandatory-disable rejection), `resolveDependencies` (fixed-point cascade with warnings), `bucketByStage`.

- [ ] **Step 1: Write failing tests** covering: default plan includes all mandatory scripts bucketed by stage; `--profile=fast` disables the optional features `fast` turns off; `--disable=docs` removes `docs` and cascades (nothing requires docs, so no cascade — assert `disabled` contains `docs`); `--only=eslint` disables all other optionals; unknown feature in `--enable` throws; disabling a mandatory (`--disable=typescript`) throws; `--only` + `--enable` together throws; a profile that disables `make_core` cascades-disable `site` (requires make_core) with a warning. Use injected `argv`/`env`/`cwd` (point `cwd` at a tmp dir containing a fixture `build.config.json`), never the real process env.

- [ ] **Step 2: Run; verify red.**
- [ ] **Step 3: Implement** the CJS port with hand-rolled validation.
- [ ] **Step 4: Run; verify green.**
- [ ] **Step 5: Commit.** `git add src/buildjs/build_config.cjs src/buildjs/tests/build_config.spec.ts && git commit -m "build: config-driven stage planner (no zod; hand-rolled validation)"`

---

## Task 3: Stage runner (`run_build.cjs`)

**Files:**
- Create: `src/buildjs/run_build.cjs`
- Test: `src/buildjs/tests/run_build.spec.ts`

**Interfaces:**
- Consumes: `buildPlan` from Task 2.
- Produces: a `main()` (default-run on direct invoke) plus an exported `runStages(stages, { run })` where `run` is an injectable per-script runner (so tests assert ordering without spawning npm).

- [ ] **Step 1: Write failing tests** for `runStages`: scripts within a stage start before any in the next stage (inject a `run` that records start/finish order against a controllable promise); a rejected script aborts the build (later stages don't run) and `runStages` rejects; an empty stage is skipped. No real `spawn`.

- [ ] **Step 2: Run; verify red.**
- [ ] **Step 3: Implement.** Port the template's `run_build.js` to CJS: `runScript(name)` spawns `npm run <name>` with `{ stdio: 'inherit', shell: true }`; factor the loop into the injectable `runStages` for testability; `main()` calls `buildPlan()` then `runStages`. Keep the `=== Stage i: … ===` logging.
- [ ] **Step 4: Run; verify green.**
- [ ] **Step 5: Commit.** `git add src/buildjs/run_build.cjs src/buildjs/tests/run_build.spec.ts && git commit -m "build: parallel-stage build runner"`

---

## Task 4: `build.config.json` + profiles

**Files:**
- Create: `build.config.json`

- [ ] **Step 1:** Author `build.config.json`: `features` defaults = all optionals on (matches today's full `build`). Profiles:
  - `release` / `ci` — all on (parity with current `build`).
  - `fast` — disable `eslint`, `audit`, `docs`, `cloc`, `changelog`, `perf_chart`, `site`, `make_cookbook`, `site_fsl_tools`, `readme` (i.e. `make` + tests only).
  - `ci-lite` — like `fast` but also enable nothing artifact-producing beyond the `make_ci` subset (mirror today's `make_ci`: core skipped, only cem/tsc/doctests/wc/cm6/cli + typecheck).
- [ ] **Step 2:** Validate it loads: `node -e "require('./src/buildjs/build_config.cjs').buildPlan({argv:['--profile=fast']})"` prints no throw.
- [ ] **Step 3: Commit.** `git add build.config.json && git commit -m "build: orchestrator config + fast/ci/ci-lite/release profiles"`

---

## Task 5: Wire `package.json` to the orchestrator

**Files:**
- Modify: `package.json`

- [ ] **Step 1:** Add a `rm_nonmin` leaf script (`rm ./dist/es6/*.nonmin.js`) so the orchestrator can spawn the trailing cleanup as a feature.
- [ ] **Step 2:** Repoint the aggregates, keeping every leaf:
  - `make` → `node src/buildjs/run_build.cjs --profile=fast` (make = build minus the doc/site/lint tail; confirm the `fast` profile's enabled set equals today's `make` exactly).
  - `build` → `node src/buildjs/run_build.cjs --profile=release`.
  - Leave `make_ci`, `ci_test`, `ci_build`, `prep`, `test`, `vitest`, and all leaves as-is (or repoint `make_ci` → `--profile=ci-lite` once Task 6 proves the ci-lite set matches).
- [ ] **Step 3:** Smoke: `npm run make` completes; `git status` shows a populated `dist/`.
- [ ] **Step 4: Commit.** `git add package.json && git commit -m "build: delegate make/build to the staged orchestrator"`

---

## Task 6: Byte-equivalence validation (the gate)

**Files:** none (uses `build_manifest.cjs` from Task 0).

- [ ] **Step 1:** From a clean tree, run the orchestrated `npm run build`.
- [ ] **Step 2:** `node src/buildjs/build_manifest.cjs` → `orchestrated.manifest.json`; diff against `reference.manifest.json` from Task 0.
- [ ] **Step 3:** Expected: **identical** (every path, every hash). Any difference is a real defect — investigate the offending artifact (likely a stage-ordering or parallelism race, e.g. a `min_*` running before its `make_*`). Fix the catalog's `stages`/`requires`, rebuild, re-diff. Do not relax the manifest to hide a diff.
- [ ] **Step 4:** Run all five tiers: `npm run vitest`, `npm run vitest-dragon`, `npm run vitest-unicode-full-slow`. All green, spec at 100%.
- [ ] **Step 5:** Profile checks: `npm run make` (fast) produces `dist/` but no `docs/`/`README` regeneration; `node src/buildjs/run_build.cjs --profile=ci-lite` skips artifact production.

---

## Task 7: `/sc-commit` + PR

- [ ] **Step 1:** `/sc-commit` on `build_26-06-23_build-orchestrator` (patch — build-infra, no library change; bump above the then-published version), full build, commit.
- [ ] **Step 2:** `git push -u origin build_26-06-23_build-orchestrator`.
- [ ] **Step 3:** Open PR: `build: config-driven parallel build orchestrator (Phase 3)`, body documenting the stage DAG, the byte-equivalence proof, and the zero-new-deps decision. Note Phase 4 (CI profile restructure) depends on this.

---

## Self-Review

- **Spec coverage of the plan:** every Phase 3 acceptance criterion from the roadmap maps to a task — config+schema (T1/T2), orchestrator (T3), profiles incl. ci-lite (T4), package wiring (T5), byte-equivalent artifacts + five tiers + release-input integrity (T6). The "release jobs untouched" constraint holds: only `make`/`build` change.
- **Risk control:** the golden-reference manifest (T0) is authored *before* any orchestration so the parity gate (T6) is objective. Normalization of volatile content (`build_time`, changelog dates) is proven stable in T0 Step-2 acceptance before it can mask a real diff.
- **No-deps consistency:** zod is explicitly dropped (hand-rolled validation in T2); no other dep added — matches the Global Constraint and prior feedback.
- **Type/name consistency:** `buildPlan`, `runStages`, `FEATURES`, `MANDATORY_FEATURE_NAMES`, `OPTIONAL_FEATURE_NAMES` are used identically across T1–T3.
- **Open question for execution entry:** confirm the `fast` profile's enabled set is exactly today's `make` (Task 5 Step 2) and `ci-lite` exactly today's `make_ci` — these are the two places a profile mismatch would silently change CI behavior; both are gated by T6.
