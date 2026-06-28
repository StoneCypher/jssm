# Phase 4 — CI profile restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. The whole deliverable is one file (`.github/workflows/nodejs.yml`); validation is the PR's own CI run.

**Goal:** Reshape `nodejs.yml` to the template's profile-driven job structure — a cheap single PR check, a canonical full main build, a lean cross-platform matrix, and a `#fullbuild` opt-in — leveraging the Phase-3 orchestrator's `ci-lite`/`release` profiles, **without changing the release/publish behavior**.

**Architecture:** Pure CI-config change. Replace the current `pr-check` + 8-cell `build` matrix + `full-build` with `detect-fullbuild` → `test-pr` (PR, lean) / `test-main-full` (push, full) / `test-main-matrix` (push, lean cross-platform). Preserve verbatim: `release` (OIDC + Graviton), `verify-version-bump`, `deploy-docs`, `benchmark`, all 18 `unicode-*` jobs, `e2e`, `finish`.

**Tech Stack:** GitHub Actions; the orchestrator profiles from Phase 3 (`npm run build -- --profile=…`), and the existing `ci_test` (`vet && make_ci && vitest`) / `ci_build` (`vet && test`) scripts.

## Global Constraints

- **Release-on-every-push-to-main must never change behavior.** The `release` job (OIDC trusted publish, skip-if-published, tag, gh release, Graviton fire) stays byte-for-byte; only its `needs:` list is updated to the new job names. `verify-version-bump`, `deploy-docs`, `benchmark`, `finish` unchanged.
- **No coverage/test regression.** Whatever runs the 100% spec gate today must still run it (on PR and on main).
- **Preserve Node-version coverage intent.** Today's matrix checks the engine floor (20.x) + 22.x + current (23.x/24.x). Don't silently drop floor coverage.
- **Preserve the 18 `unicode-*` jobs and the `e2e` job** exactly (they already run correctly post-#803).
- Worktree **outside** the repo tree; builds from the **Bash tool**; no bare `git push`.

## jssm-specific design note (why this isn't a copy-paste of the template)

The template's `ci-lite` profile **includes tests**, so its `test-pr` is just `build --profile=ci-lite`. jssm's `ci-lite` is the `make_ci` artifact subset with **`vitest` disabled** — building it alone runs no tests. So:
- **PR check** must build-lite **and** test → use the existing **`ci_test`** (`vet && make_ci && vitest`), which is *cheaper* than today's `pr-check` (`ci_build` = `vet && test` = **full** `make` + vitest).
- **Main full build** → `npm run build` (orchestrated `release`: all bundles + docs + readme), as `full-build` does today.
- **Main matrix** → `ci_test` (lite build + tests) across platforms — cross-platform verification without re-producing platform-invariant artifacts.

---

## Reference: current vs target job set

```
CURRENT (push fires all):           TARGET:
  pr-check         (PR: ci_build)     detect-fullbuild (PR+push)
  e2e              (PR)               test-pr          (PR: ci_test)            [skip if #fullbuild]
  build  (8-cell matrix: ci_test)     e2e              (PR)                     [unchanged]
  full-build       (push/main: build) test-main-full   (push|#fullbuild: build)
  unicode-* ×18    (push)             test-main-matrix (push|#fullbuild: ci_test, lean cells)
  benchmark        (push)             unicode-* ×18    (push)                   [unchanged]
  verify-version-bump (push)          benchmark        (push)                   [unchanged]
  deploy-docs      (push/main)        verify-version-bump (push)                [unchanged]
  release          (push/main)        deploy-docs      (push/main)              [unchanged]
  finish                              release          (needs updated)          [body unchanged]
                                      finish                                    [unchanged]
```

---

## Task 1: Add `detect-fullbuild`

**Files:** Modify `.github/workflows/nodejs.yml`

- [ ] **Step 1:** Add the job (verbatim shape from the template, adapted name), after the `jobs:` line:

```yaml
  detect-fullbuild:
    if: github.event_name == 'pull_request' || github.event_name == 'push'
    name: Detect #fullbuild opt-in
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      fullbuild: ${{ steps.detect.outputs.fullbuild }}
    steps:
      - uses: actions/checkout@v5
        with: { fetch-depth: 1 }
      - id: detect
        shell: bash
        run: |
          MSG=$(git log -1 --pretty=%B)
          if echo "$MSG" | grep -q '#fullbuild'; then
            echo "fullbuild=true" >> $GITHUB_OUTPUT
          else
            echo "fullbuild=false" >> $GITHUB_OUTPUT
          fi
```

- [ ] **Step 2:** `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/nodejs.yml','utf8'))"` → no throw.

---

## Task 2: Replace `pr-check` with `test-pr` (lean PR check)

- [ ] **Step 1:** Rename `pr-check` → `test-pr`; add `needs: [detect-fullbuild]`; gate `if: github.event_name == 'pull_request' && needs.detect-fullbuild.outputs.fullbuild != 'true'`; keep `timeout-minutes: 15`.
- [ ] **Step 2:** Change its run step from `npm run ci_build` to **`npm run ci_test`** (vet + make_ci + vitest — lite build, still runs the 100% spec gate). Keep `env: CI: true` and the workflow-level `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: 1`.
- [ ] **Step 3:** Leave `e2e` untouched (still `if: github.event_name == 'pull_request'`). Acceptance: a PR runs `test-pr` + `e2e` only (2 jobs + detect-fullbuild).

---

## Task 3: Replace the 8-cell `build` matrix with `test-main-matrix` (lean)

- [ ] **Step 1:** Rename `build` → `test-main-matrix`; `needs: [detect-fullbuild]`; gate `if: github.event_name == 'push' || needs.detect-fullbuild.outputs.fullbuild == 'true'`.
- [ ] **Step 2:** Trim the matrix to preserve engine coverage cheaply (Ubuntu carries the multi-Node load; expensive OSes verify current only):

```yaml
    strategy:
      fail-fast: false
      matrix:
        include:
          - { os: ubuntu-latest,  node-version: 24.x }
          - { os: ubuntu-latest,  node-version: 23.x }
          - { os: ubuntu-latest,  node-version: 22.x }
          - { os: ubuntu-latest,  node-version: 20.x }   # engine floor
          - { os: macos-latest,   node-version: 24.x }
          - { os: windows-latest, node-version: 24.x }
```

- [ ] **Step 3:** Keep the run step `npm install && npm run ci_test` and the Coveralls upload step. Acceptance: 6 cells (down from 8), floor + current preserved, expensive-OS duplication removed.

---

## Task 4: Keep `full-build` as `test-main-full`

- [ ] **Step 1:** Rename `full-build` → `test-main-full`; `needs: [detect-fullbuild]`; gate `if: github.event_name == 'push' || needs.detect-fullbuild.outputs.fullbuild == 'true'` (was `push && main`). Keep run step `npm install && npm run build` (orchestrated release — full artifacts) and `timeout-minutes: 20`.
- [ ] **Step 2:** `deploy-docs` `needs: [full-build]` → `needs: [test-main-full]`.

---

## Task 5: Update `release` (and only its `needs:`)

- [ ] **Step 1:** Change `release.needs` from `[build, full-build, verify-version-bump, unicode-…×18]` to `[test-main-full, test-main-matrix, verify-version-bump, unicode-…×18]`. **Do not touch any release step** (OIDC publish, tag, gh release, Graviton). The 18 unicode names stay in the list verbatim.
- [ ] **Step 2:** Confirm `finish` still `needs: [release]`.

---

## Task 6: Validate end to end

- [ ] **Step 1:** YAML lint (Task 1 Step 2 command) passes.
- [ ] **Step 2:** `/sc-commit` on `build_26-06-23_ci-profiles` (patch — CI-only), full build, commit, push, open PR.
- [ ] **Step 3:** On the PR, confirm CI runs **only** `detect-fullbuild` + `test-pr` + `e2e` (+ snyk) — the push-only jobs (`test-main-*`, unicode, benchmark, release) correctly skip.
- [ ] **Step 4:** Confirm `test-pr` runs `ci_test` green (100% spec gate holds).
- [ ] **Step 5:** Push a throwaway commit with `#fullbuild` in the message to a scratch PR (optional) to confirm `test-main-full` + `test-main-matrix` fire on a PR.
- [ ] **Step 6:** After merge, confirm the push-to-main run executes `test-main-full` + `test-main-matrix` + unicode + benchmark + verify-version-bump → `release` → `finish`, and that `npm view jssm version` advances.

---

## Self-Review

- **Spec coverage of the plan:** every roadmap Phase-4 bullet maps to a task — `test-pr`/ci-lite (T2), `test-main-full`/ci (T4), `test-main-matrix`/ci-lite cross-platform (T3), `#fullbuild` opt-in (T1), preserve release/verify/deploy/benchmark/unicode (T5 + untouched).
- **Profile semantics:** the jssm-specific note resolves the key divergence — PR uses `ci_test` (build-lite + tests), not `build --profile=ci-lite` (which runs no tests in jssm). The 100% gate runs on both PR (`test-pr`) and main (`test-main-matrix` + `test-main-full`).
- **Release safety:** only `release.needs` changes; the publish path is untouched. `deploy-docs.needs` repointed to the renamed full-build.
- **Cost delta:** PR drops from full `make`+vitest to lite `make_ci`+vitest; main matrix drops 8→6 cells and uses lite. Net CI-minute reduction with preserved coverage.
- **Open question for execution entry:** Stryker (`stryker` job in the template) is **Phase 5**, not here — do not add it in Phase 4.
