# Adopt the template build system into jssm — phased migration plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans per phase. Steps use checkbox (`- [ ]`) syntax. **This is a roadmap** spanning ~3–5 weeks: Phase 1 is fully bite-sized below; Phases 2–5 are specified at design+acceptance altitude and get their own detailed bite-sized plan authored *at phase entry* (the orchestrator phases require incremental investigation of jssm's build that would otherwise force placeholder steps — forbidden by writing-plans).

**Goal:** Adopt the `StoneCypher/react_ts_with_claude_gh_template` build system into jssm — its config-driven build orchestrator, profile-driven CI, Playwright e2e tier, Stryker mutation testing, and modern lint/`attw`/commitlint — **without regressing** jssm's release-on-every-push pipeline, 100%-coverage gate, or any shipped artifact.

**Architecture:** Incremental, phase-gated. Each phase is its own branch + PR, independently green and releasable. The template contributes *structure* (orchestrator, profiles, CI hygiene, browser tier); jssm *keeps* its superior release core (OIDC trusted publishing, Graviton perf, unicode legs, multi-target bundling, PEG/CEM). Highest-risk phase (orchestrator) lands only after the additive phases prove the toolchain on this machine/CI.

**Tech Stack:** Node, vitest (spec/stoch/dragon/docs/unicode tiers), Rollup (~9 targets), PEG.js, custom-elements-manifest, TypeScript, GitHub Actions; adding `@playwright/test` + `servehere`, `@stryker-mutator/*`, `@arethetypeswrong/cli`, commitlint, eslint 9 flat config.

## Global Constraints

- **Release-on-every-push-to-main must never break.** `verify_version_bump.cjs` gates publish; every PR bumps version via `/sc-commit`. Preserve the `release` job (OIDC `--provenance` publish, skip-if-already-published, tag, gh release, Graviton fire) verbatim.
- **100% spec coverage** over `src/ts/**` (fsl_parser excluded) stays a hard gate.
- **Every shipped artifact preserved**: all `dist/**` targets (core es5/es6/iife, deno, viz×3, wc viz/instance es6+cdn, cm6, cli×4), `dist/**.d.ts`, `custom-elements.json`, site/cookbook/fsl.tools, typedoc, changelog, readme, cloc, perf_chart.
- **Test tiers stay split** (spec/stoch/dragon/docs/unicode report coverage independently — never merge).
- **No bare `git push`** on worktree branches (they track `origin/main`); explicit refspec only.
- **Builds launch from the Bash tool**, never PowerShell (PATH/`rm` dependency).
- Worktrees live **outside** the repo tree (nested worktree breaks the typedoc docs build).

---

## Phase ordering & dependencies

```
Phase 1  CI hygiene quick-wins        ── independent, fastest, safe        (~0.5 d)
Phase 2  Playwright e2e tier          ── independent; UNBLOCKS <fsl-editor> (~1–2 d)
Phase 3  Build orchestrator           ── the big one; gates Phase 4        (~1–2 wk)
Phase 4  CI restructure (profiles)    ── REQUIRES Phase 3                  (~2–3 d)
Phase 5  Lint 9 + Stryker + attw      ── mostly independent; some after P3 (~2–3 d)
```

Each phase = its own branch `build_<date>_<phase>` off the latest `main`, its own `/sc-commit` + PR. Do not stack; rebase each on main after the prior merges.

---

## Phase 1 — CI hygiene quick-wins  *(detailed; execute now)*

**Goal:** Harden `.github/workflows/nodejs.yml` with the template's CI hygiene that needs **no** orchestrator: per-job `timeout-minutes`, PR `concurrency` cancellation, and `paths-ignore` for doc-only PRs. Pure CI-config change; no source, no deps, no artifacts.

**Files:**
- Modify: `.github/workflows/nodejs.yml`

**Why safe:** jssm's CI currently has **no** `timeout-minutes` (a hung step runs toward GitHub's 360-min default) and **no** `concurrency` (redundant PR runs never cancel). These are additive YAML hardening; the release/publish jobs are untouched. Validation is the PR's own CI run.

**Acceptance:** PR CI is green; a second push to the PR branch cancels the in-flight run; the `release` job and all `needs:` chains are unchanged in behavior.

- [ ] **Step 1: Add `concurrency` (cancel in-progress PR runs, never main)**

Add near the top of `nodejs.yml`, after the `on:` block:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Rationale (copied from template): main pushes are releases and must run to completion, so cancellation is gated to PR events only.

- [ ] **Step 2: Add `paths-ignore` for doc-only PRs**

Change the `on:` block so PRs that only touch non-build docs skip CI. Keep `push` unfiltered (releases must always run):

```yaml
on:
  push:
  pull_request:
    paths-ignore:
      - 'notes/**'
      - 'CONTRIBUTING.md'
      - 'CODE_OF_CONDUCT.md'
      - 'LICENSE'
```

Do **NOT** add `src/doc_md/**` (typedoc/changelog inputs), `CHANGELOG*.md`, `README.md`, `package.json`, or anything under `src/ts/**` — those feed the build.

- [ ] **Step 3: Add `timeout-minutes` to every job**

Add a `timeout-minutes` to each job keyed to its normal runtime with generous headroom (fail-fast on hang, not at 360 min):

```
pr-check: 15      unicode-*: 15 (each)     build (matrix): 25
full-build: 20    deploy-docs: 15          benchmark: 20
verify-version-bump: 10   release: 15      finish: 5
```

(One `timeout-minutes: <n>` line per job, under `runs-on:`.)

- [ ] **Step 4: Lint the workflow YAML locally**

Run: `node -e "const y=require('js-yaml'); y.load(require('fs').readFileSync('.github/workflows/nodejs.yml','utf8')); console.log('yaml ok')"`
Expected: `yaml ok` (js-yaml is already a dep via the toolchain). If `js-yaml` isn't resolvable, skip — the PR CI run is the real validator.

- [ ] **Step 5: `/sc-commit` + push + PR**

Version bump (patch — CI-only change), build, commit on `build_26-06-23_adopt-template-build`, then:
`git push -u origin build_26-06-23_adopt-template-build` and open a PR titled `ci: timeouts, PR concurrency cancellation, and doc-only paths-ignore`.

---

## Phase 2 — Playwright e2e tier  *(design + acceptance; bite-sized plan authored at entry)*

**Goal:** Port the template's hosted-browser e2e harness so real-browser tests can run in CI with careful cross-platform teardown — the prerequisite for testing `<fsl-editor>`.

**Files (mirror the template):**
- Create: `playwright.config.ts` (testDir `src/ts/e2e`, `baseURL` from `BASE_URL` env, fallback `http://localhost:15512`).
- Create: `src/buildjs/hosted_test.cjs` (spawn `servehere` serving the built site dir on :15512 → poll `waitForServer` → `npx playwright test src/ts/e2e` with `BASE_URL` → halt via `/z-terminate` with 2s force-kill fallback; resolve servehere bin and spawn `process.execPath` directly, **no `shell: true`**, to avoid Windows libuv cleanup).
- Create: `src/ts/e2e/smoke.spec.ts` (one trivial e2e: load the demo page, assert a known element — proves the harness end-to-end).
- Modify: `package.json` — add devDeps `@playwright/test`, `servehere`; add scripts `hosted_test`; declare nothing as a runtime dep.
- Modify: `.github/workflows/nodejs.yml` — add a `e2e` job that caches Playwright browsers (`PLAYWRIGHT_BROWSERS_PATH`), runs `npx playwright install --with-deps chromium`, builds the site, runs `hosted_test`; set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` on all **other** jobs.

**Known risk — local browser provisioning:** `npx playwright install chromium` failed on this machine with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (TLS interception). The template manages this in **CI** (cache + `--with-deps`); **locally**, use the system browser channel (`channel: 'msedge'`/`'chrome'`) or `NODE_OPTIONS=--use-system-ca`. Resolve channel-vs-download as Step 1 of this phase before writing tests.

**Acceptance:** `node src/buildjs/hosted_test.cjs` starts servehere, runs the smoke e2e in a real browser, and tears the server down cleanly on win/mac/linux; CI `e2e` job green; no other job downloads a browser.

**Note:** jssm's stray `@vitest/browser` devDep is unused against this approach — evaluate removing it in this phase (the template uses `@playwright/test`, not vitest browser mode).

---

## Phase 3 — Build orchestrator  *(design + acceptance; bite-sized plan authored at entry)*

**Goal:** Replace jssm's monolithic serial `make` npm-chain with the template's config-driven, staged, parallel orchestrator — same artifacts, faster, profile-selectable.

**Files (mirror the template, adapt to jssm's surface):**
- Create: `build.config.json` + `build.config.schema.json` — feature flags for every jssm build concern (peg, cem, typescript, doctests, core/deno/viz/wc/cm6/cli bundles, minify, site, cookbook, fsl_tools, changelog, perf_chart, docs, cloc, readme) + profiles (`fast`, `ci`, `ci-lite`, `release`).
- Create: `src/buildjs/build_config.cjs` (compute stages from config + CLI/env overrides) and `src/buildjs/run_build.cjs` (run stages serially, scripts parallel within a stage).
- Modify: `package.json` — `build`/`make` delegate to `run_build.cjs`; keep every existing leaf script callable.

**Approach:** Wrap, don't rewrite. Each existing jssm npm script becomes a leaf "feature"; the orchestrator just sequences them into parallelizable stages (e.g., the independent rollup targets run concurrently). Decompose the current `&&` chain into a stage DAG that honors real ordering (peg/makever → tsc → bundles → minify; tests after make; site/docs/changelog after dist).

**Acceptance:** `npm run build` via the orchestrator produces **byte-equivalent** `dist/**` + all artifacts vs. the current chain (diff the trees); all five test tiers pass; the 100% gate holds; `--profile=ci-lite` skips artifact production; the release job's consumed artifacts (`dist/**`, `docs/`, `CHANGELOG.md`, tags) are unchanged.

**Risk:** Highest. Validate by full-tree diff against a pre-migration build before merge. Release jobs are not touched in this phase — only the build they invoke.

---

## Phase 4 — CI restructure (profiles)  *(requires Phase 3)*

**Goal:** Reshape `nodejs.yml` to the template's profile-driven jobs: `test-pr` (ci-lite), `test-main-full` (ci), `test-main-matrix` (ci-lite cross-platform), `#fullbuild` opt-in token. **Preserve verbatim:** `release` (OIDC), `verify-version-bump`, `deploy-docs`, `benchmark`, the 5 unicode jobs.

**Acceptance:** PR pays one cheap ci-lite job; push-to-main runs full build + matrix + unicode + benchmark + release exactly as today; `#fullbuild` in a PR head commit triggers the full matrix.

---

## Phase 5 — Lint 9 + Stryker + attw  *(mostly independent)*

**Goal:** eslint 7 → 9 flat config (`eslint.config.js`); add Stryker mutation tier (`stryker.config.json` + `vitest-mutat` config) as a push-only CI job; add `attw --pack` type-export validation to the build.

**Acceptance:** `npm run eslint` passes on the flat config over the existing 3 lint paths; `npx stryker run` produces a mutation score; `attw` reports clean type exports; all added as non-blocking-to-release CI jobs first, promoted to gating later.

---

## Self-review

- **Spec coverage:** every component of the template's build (orchestrator, profiles, CI hygiene, Playwright e2e, Stryker, attw, commitlint, flat eslint) maps to a phase. jssm-specific concerns (PEG, CEM, multi-target bundling, OIDC release, Graviton, unicode) are explicit Global Constraints / preserved jobs.
- **Placeholder scan:** Phase 1 is fully bite-sized with real YAML. Phases 2–5 are intentionally design+acceptance altitude with their detailed plans deferred to phase entry — flagged in the header, per the writing-plans scope-check (multi-subsystem → separate plans).
- **Ordering consistency:** dependencies stated (4 needs 3; 2 unblocks editor; 1/5 independent). Each phase its own branch/PR off fresh main.
