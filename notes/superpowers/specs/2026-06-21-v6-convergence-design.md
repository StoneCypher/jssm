# v6 Convergence — design (2026-06-21)

Goal: land three dormant/in-progress work streams into the `v6` integration branch, reconciling the two divergent codegen drafts into one. All three land as **separate PRs `--base v6`** (no npm release — release is main-only). v6 runs `6.0.0-alpha.x` prerelease versioning; bump the alpha counter per PR.

> Context note: the "parallel" work was made by a **past** Claude instance, now dormant — no live session owns these worktrees, so they can be committed/landed directly (with the user's authorization given 2026-06-21).

## The three streams

| Stream | Source | State | Difficulty |
|---|---|---|---|
| 1. `fsl_totality` | PR #773 (`feat_26-06-21_fsl-totality`) | open `--base v6`, 100% cov, green | trivial — just merge |
| 2. value-module ports | deltas from `parallel-modules` (`fe98d38c`) | designed, not started | medium — value modules only |
| 3. reconciled codegen | drafts A + B (below) | both uncommitted, dormant | hard — a real merge |

Land order: 1 → 2 → 3 (they're nearly disjoint: totality is its own file; ports touch only `fsl_*` value modules; codegen is the CLI subsystem).

## Stream 3: codegen reconciliation (the crux)

Two divergent codegen drafts, both uncommitted in worktrees:
- **A** = `feat_26-06-11_v6` worktree: `codegen.ts` + `plugin.ts` (typescript only), config integration, and the whole `import`/`export`/`interchange` (json/mermaid) ecosystem. CLI/plugin tests (~29). No JS target, no emit-utils/surface seams, inline types.
- **B** = `feat_26-06-12_v6-codegen` worktree: `targets/` dir with **native-typescript + native-javascript** emitters, `surface.ts`/`emit-utils.ts`/`codegen-types.ts`/`codegenSet.ts`, dedicated error hierarchy (`CodegenError`/`CodegenUndecidedError`), certify/budget seams, **behavioral round-trip tests**. No config integration, no CLI/plugin tests, no interchange ecosystem.

**Decision: B is the base.** It wins emitter core, type model, and emission tests. Graft from A:
1. **Config-layer wiring** — `--target`↔`codegen.defaultTarget`, `--out-dir`↔`codegen.outDir` (A's `CODEGEN_FLAG_TO_CONFIG` + `defaultTarget ?? DEFAULT_TARGET`). B's one real gap.
2. **A's CLI plugin + binary-entry test suites** — port wholesale; retarget error assertions from `RenderError` → B's `CodegenError`/`CodegenUndecidedError`; add `native:javascript` cases.
3. **Final-state modeling** — fold A's `state_is_final` into B's `surface.ts`; emit `isFinal()` (+ optional `FINAL` set) in both emitters.
4. **Escaping robustness** — reconcile B's `jsStringLiteralBody` with A's `JSON.stringify` approach; cover `\f`/`\v`/`\0`/`\b`.
5. **`import`/`export`/`interchange`** — comes from A unchanged (orthogonal; lands in the same PR).
6. **Conflict files** `dispatcher.ts` + `lib.ts` → B's codegen export block (`codegen-types`, `codegenSet`, `extractSurface`) **+** A's interchange export block; dispatcher help lists render/codegen/import/export.
7. **Wire `codegenSet` into the plugin multi-file loop** (currently dead from the CLI) instead of B's inline loop.

**Decisions made:**
- **Eventless / unnamed edges: SURFACE them** (A's behavior) — generated code stays faithful to FSL source; the emitted driver API needs a way to express an unlabeled/automatic transition.
- Keep B's richer generated API (`state` getter, `can()`, `actions()`, `action()`) + fold in A's `isFinal()`.
- Keep B's `certify`/`budget`/`undecided` agent-contract seam (forward-looking, aligns with megaspec agent verbs).
- Keep B's behavioral round-trip tests as the emission-correctness standard; extend to execute the TS target too (currently TS substring-only, JS executed).
- No "binary mode" feature exists — "binary" = the `fsl-codegen` CLI entry, byte-identical in both; just keep its test.

Targets after reconciliation: `native:typescript` + `native:javascript`, architected (targets dir + total `TARGET_META`) to add more.

## Stream 2: value-module ports

Port these deltas from `fe98d38c`'s versions INTO v6's versions (v6's are the stronger base — port deltas, don't replace):
- **adts**: NaN/Inf/-0-safe canonicalization; `nullable_check` guard; `lambda_tag`; bounds-checked field access.
- **constants**: per-constant `name`; `g_n`; string-tolerant `lookup_constant` + typed `UnknownConstantError`; `CONSTANTS_VERSION`.
- **containers**: typed `ContainerKeyError`/`ContainerRangeError`; key validation on read/remove; `is_container_key`; `map_get_or`.
- **tape**: `FslTapeError`; `Tape.read()`; `Tape` iterability; return values from commit/rollback; `Channel.receive/emit/values` + per-direction default bounds.
- **verify**: the `Machine`-decoupled `VerificationGraph` model (`build_adjacency`, generic `bfs_find_path`, edge labels, `check_all_safety` batch) as an alt input path.

**Decisions made:**
- **Equality: `SameValueZero` uniformly** across containers + adts (matches JS Map/Set; collapses -0/+0; keeps NaN reflexive). Moot for totality.
- **Strict-throw reads: lenient `undefined` stays the default; add explicit strict variants** (`_strict`/`at`) + `map_get_or`. Plus a **construction-time `strict` floor** resolved as `max(language, construction)` — "stricter wins" (safety floor, not generic override); explicit per-op ops always win both directions; the language-declared input is a deferred seam (needs grammar/compiler work that doesn't exist yet).

## Stream 1: fsl_totality
PR #773, `--base v6`, 6.0.0-alpha.5, 100% coverage. Just needs merge (user authorizes; v6 is shared/protected).

## Mechanics & gotchas
- Do all work in **fresh worktrees off `origin/v6`**; never touch the dormant source worktrees except read-only. PR **`--base v6`** (gh defaults to main).
- Bump v6 alpha per PR (re-check `origin/v6` `package.json` first; alpha.5 is taken by #773).
- Full `npm run build` before commit (needs `npm install` in fresh worktree); spec suite enforces **100% coverage** — test every new line.
- **No compound commands** (`;`/`&&`/`||`/`|`); no options between `git`/`npm` and subcommand. PR/commit bodies with `;` trip this — write PR body to a `build/*.md` file, use `--body-file`.
- **Bash cwd silently resets to the main checkout** (e.g. after Skill calls) — always re-`pwd`/check branch + version before bump/build/commit.
- Discard incidental `package-lock.json` churn before committing.
- **Never merge a v6 (or main) PR without explicit user permission** (shared/protected).

## Repo facts
- Every push to `main` = npm release + `jssm-viz` cascade. v6 prerelease never releases until v6 merges to main once.
- Big `main → v6` sync (140+ commits) is PARKED on the user's separate v6 worktree work — independent of these streams; the ports/codegen don't add reconciliation debt to it (those files don't exist on main).
