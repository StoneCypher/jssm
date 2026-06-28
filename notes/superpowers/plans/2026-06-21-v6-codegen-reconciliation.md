# v6 Codegen Reconciliation — Implementation Plan

> **For agentic workers:** This is an *integration* plan (merging two existing, tested codegen drafts), not greenfield. Most tasks = bring-and-wire existing code + verify its tests; tasks 6–8 are genuine TDD for new behavior. Steps use `- [ ]` tracking. Execute **inline from the main session** — subagents cannot mutate sibling worktrees in this environment.

**Goal:** Land one reconciled `fsl codegen` (plus the `import`/`export`/`interchange` ecosystem) on `v6`, built on draft **B** (`feat_26-06-12_v6-codegen`) with grafts from draft **A** (`feat_26-06-11_v6`).

**Architecture:** B's emitter core (targets dir, JS+TS, surface/emit-utils, dedicated `codegen-types` + error hierarchy, `codegenSet`, behavioral tests) is the base. Graft from A: config-layer wiring, the CLI plugin/binary test suites, final-state modeling, escaping robustness, and the entire import/export/interchange ecosystem. Surface eventless edges (decided).

**Tech Stack:** TypeScript, vitest (spec config, 100% coverage gate), the existing `fsl` CLI dispatcher/plugin pattern.

## Global Constraints
- Land as a PR **`--base v6`** (never main). No npm release fires.
- v6 prerelease: bump `package.json` alpha counter (re-check `origin/v6` first; alpha.5 taken by #773).
- Full `npm run build` before commit; spec suite enforces **100% coverage** — every new line tested.
- No compound shell commands (`;`/`&&`/`||`/`|`); no options between `git`/`npm` and subcommand.
- Bash cwd silently resets to main checkout — re-`pwd`/check branch before bump/build/commit.
- Discard incidental `package-lock.json` churn before committing. PR body via `build/*.md` + `--body-file`.
- Source draft paths (read-only): A = `…/worktrees/stonecypher_jssm_feat_26-06-11_v6`, B = `…/worktrees/stonecypher-jssm-feat-26-06-12-v6-codegen`.

---

### Task 0: Fresh worktree off origin/v6

**Files:** none (setup).
- [ ] `git fetch origin --quiet`
- [ ] `git worktree add -b feat_26-06-21_v6-codegen-reconciled C:/Users/john/projects/worktrees/stonecypher_jssm_feat_26-06-21_v6-codegen-reconciled origin/v6`
- [ ] cd in; `npm install` (background ok)
- [ ] Verify: `pwd`, `git branch --show-current` = the new branch, `package.json` shows current v6 alpha.

### Task 1: Bring in B's codegen base + verify B's tests

**Files (copy from B into worktree):** `src/ts/cli/codegen-types.ts`; `src/ts/cli/subcommands/codegen/{codegen.ts,codegenSet.ts,emit-utils.ts,surface.ts,plugin.ts,targets/native-typescript.ts,targets/native-javascript.ts}`; `src/ts/cli/fsl-codegen.ts`; tests `src/ts/tests/cli/{codegen.spec.ts,codegen-emit-utils.spec.ts,codegen-surface.spec.ts,codegen-targets.spec.ts}`.
**Modify:** `src/ts/cli/dispatcher.ts` (register `codegen`), `src/ts/cli/lib.ts` (export B's codegen block: `codegen`, `codegenSet`, `CodegenTarget/Options/Artifact`, `CodegenError/CodegenUndecidedError`, `extractSurface`/`MachineSurface`).
- [ ] Copy the files (read each from B, Write into worktree — they're uncommitted in B so use filesystem reads, not `git show`).
- [ ] Wire dispatcher + lib (read B's versions of those two files for the exact codegen-only diffs; apply just the codegen parts onto v6's current dispatcher/lib).
- [ ] Run: `npx tsc --noEmit` → clean.
- [ ] Run B's codegen specs: `npx vitest run --config vitest.spec.config.ts src/ts/tests/cli/codegen.spec.ts src/ts/tests/cli/codegen-emit-utils.spec.ts src/ts/tests/cli/codegen-surface.spec.ts src/ts/tests/cli/codegen-targets.spec.ts --coverage.enabled=false` → all pass.
- [ ] Commit (pathspec): `feat(codegen): land v6-codegen emitter base (B) — JS+TS targets, surface/emit-utils, codegenSet`.

### Task 2: Bring in A's import/export/interchange ecosystem + verify

**Files (copy from A):** `src/ts/cli/{fsl-import.ts,fsl-export.ts}`; `src/ts/cli/subcommands/{import,export,interchange}/**`; tests `src/ts/tests/cli/{interchange-json.spec.ts,interchange-fsl-bridge.spec.ts}` + `src/ts/tests/cli/fixtures/interchange/**`.
**Modify:** `dispatcher.ts` (add import/export help + registration), `lib.ts` (add A's interchange export block alongside B's codegen block).
- [ ] Copy files (filesystem reads from A).
- [ ] Wire dispatcher/lib (merge A's import/export/interchange registration with the codegen wiring from Task 1 — this is the dispatcher/lib conflict resolution point).
- [ ] Run: `npx tsc --noEmit` → clean.
- [ ] Run interchange specs → pass.
- [ ] Commit: `feat(cli): land import/export/interchange (json/mermaid) from the v6 worktree`.

### Task 3: Graft A's config-layer wiring onto B's codegen plugin

**Files:** Modify `src/ts/cli/subcommands/codegen/plugin.ts` (the merged one). **Reference:** A's plugin.ts `CODEGEN_FLAG_TO_CONFIG` (`target`↔`codegen.defaultTarget`, `out-dir`↔`codegen.outDir`) + `defaultTarget ?? DEFAULT_TARGET` resolution.
- [ ] Read A's plugin.ts config wiring; add the `CODEGEN_FLAG_TO_CONFIG` map + config-backed target/out-dir resolution into B's plugin (which currently maps everything to null).
- [ ] Add/port the config tests covering `defaultTarget`/`outDir` from A's plugin spec (see Task 4 — fold these in there if cleaner).
- [ ] `npx tsc --noEmit` → clean.

### Task 4: Port A's CLI plugin + binary-entry tests onto B

**Files (copy from A, then adapt):** `src/ts/tests/cli/codegen-plugin.spec.ts`, `src/ts/tests/cli/codegen-binary.spec.ts`.
- [ ] Copy both specs in.
- [ ] Retarget error assertions: A asserts `RenderError`; B throws `CodegenError`/`CodegenUndecidedError` — update expectations.
- [ ] Add `native:javascript` cases (the reconciled target set is two).
- [ ] Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/cli/codegen-plugin.spec.ts src/ts/tests/cli/codegen-binary.spec.ts --coverage.enabled=false` → pass.
- [ ] Commit: `test(codegen): CLI plugin + binary-entry coverage (from A), retargeted to CodegenError + JS target`.

### Task 5: Final-state modeling (TDD)

**Files:** Modify `src/ts/cli/subcommands/codegen/surface.ts` (add `finals`/`state_is_final` to `MachineSurface`), `targets/native-typescript.ts` + `native-javascript.ts` (emit `isFinal()` + optional `FINAL` set). Test: `codegen-surface.spec.ts` + `codegen-targets.spec.ts`.
- [ ] Read B's surface.ts + both emitters first (need exact `MachineSurface` shape + emit structure).
- [ ] **Write failing test:** a machine with a final state → surface has it in `finals`; emitted TS+JS expose `isFinal()` returning true for it. (Use B's behavioral round-trip style: write emitted module to temp, import, assert.)
- [ ] Run → fails.
- [ ] Implement: extend surface extraction (use `state_is_final` from the machine) + emit `isFinal()` in both targets.
- [ ] Run → passes. Commit: `feat(codegen): surface final states + emit isFinal()`.

### Task 6: Surface eventless / unnamed edges (TDD) — DECIDED behavior

**Files:** Modify `surface.ts` (stop skipping action-less edges; represent them), both emitters (express an unlabeled/automatic transition in the generated API). Test: surface + targets specs.
- [ ] Read B's `extractSurface` (it currently `continue`s past action-less edges) + the emitter transition shape.
- [ ] **Write failing test:** a machine with an eventless edge (e.g. `a -> b;` with no action label, FSL empty-action form) → surface retains it; emitted TS+JS can take the eventless transition (define the API: e.g. an `action('')`/`step()` for the unlabeled edge — pick the shape while reading the emitter and document it in the emitter docblock).
- [ ] Run → fails.
- [ ] Implement in surface + both emitters.
- [ ] Run → passes. Commit: `feat(codegen): surface eventless/unnamed edges in generated machines`.

### Task 7: Escaping robustness (TDD)

**Files:** Modify `src/ts/cli/subcommands/codegen/emit-utils.ts` (`jsStringLiteralBody`). Test: `codegen-emit-utils.spec.ts`.
- [ ] **Write failing test:** state/action names containing `\f`, `\v`, `\0`, `\b` (and the existing `\ ' \n \r \t`) round-trip correctly in emitted source (assert the escaped output, and/or behavioral: emitted module imports and the name matches).
- [ ] Run → fails on the missing cases.
- [ ] Implement: extend `jsStringLiteralBody` to cover them (or switch to a `JSON.stringify`-based core per A, keeping B's quote style).
- [ ] Run → passes. Commit: `fix(codegen): cover \f \v \0 \b in string-literal escaping`.

### Task 8: Wire codegenSet into the plugin multi-file loop (TDD)

**Files:** Modify `plugin.ts` (replace the inline multi-input loop with a `codegenSet` call). Test: extend `codegen-plugin.spec.ts` multi-input cases.
- [ ] **Write failing test:** multi-input CLI run where one input is bad → batch continues, good outputs written, bad one reported (assert via `codegenSet` semantics surfaced through the CLI).
- [ ] Run → (may pass if inline loop already does this; if so, refactor to `codegenSet` and confirm still green — this task is a cleanup, keep it green).
- [ ] Implement: route multi-input through `codegenSet`.
- [ ] Run → passes. Commit: `refactor(codegen): back the plugin multi-input path with codegenSet`.

### Task 9: Full build, coverage gate, version bump, PR

**Files:** `package.json` (alpha bump), all regenerated artifacts.
- [ ] Re-check `origin/v6` `package.json` version; bump alpha (e.g. → next after alpha.5).
- [ ] `npm run build` (background; ~minutes). Must end exit 0 with **100% coverage**. Fix any uncovered lines (add tests) and rebuild.
- [ ] Discard `package-lock.json` churn; stage source + artifacts.
- [ ] Commit: `chore(release): build artifacts + v6 alpha bump for reconciled codegen`.
- [ ] Push; `gh pr create --base v6 --body-file build/pr_body.md`.
- [ ] Verify base = v6. Do NOT merge (await user).

## Self-Review
- **Spec coverage:** B-base ✔ (T1), A grafts — config ✔ (T3), plugin/binary tests ✔ (T4), finals ✔ (T5), escaping ✔ (T7), interchange ✔ (T2), conflict files ✔ (T1/T2), codegenSet wiring ✔ (T8); eventless-edges decision ✔ (T6); behavioral tests retained ✔ (B base). Land flow ✔ (T9).
- **Placeholders:** the new-behavior tasks (5–7) intentionally defer exact code to execution-time reading of B's surface/emitters — flagged, not hidden (can't fabricate accurate code against unread internals).
- **Type consistency:** uses B's names throughout (`CodegenArtifact`, `CodegenError`, `MachineSurface`, `extractSurface`, `codegenSet`).
