This is a typescript project that creates a library with a function, as well as a CLI.

## Releases are coupled to every push to `main`

`main` is protected (PR-only). CI (`.github/workflows/nodejs.yml`) treats **every push to `main` as a release**: the `release` job publishes to npm, pushes a git tag, and dispatches a downstream `jssm-viz` upgrade.

`src/buildjs/verify_version_bump.cjs` gates this — it passes only when `package.json`'s version is **greater than the currently-published npm version**. Consequences:

- **Every PR must bump the version** (via `/sc-commit` on the feature branch) or `verify-version-bump` fails and the PR can't merge. Never hand-bump.
- **Even a docs-only / notes-only change forces a real npm release** of a new version, plus the `jssm-viz` cascade. To avoid functionally-empty releases, **batch trivial changes** into a PR that carries real content rather than cutting a release per typo.

## Build before merge/release: `npm run build`, not `npm run make`

`npm run build` runs `vet && test && site && make_cookbook && site_fsl_tools && changelog && docs && cloc && readme` — it regenerates every tracked artifact. `npm run make` only rebuilds `dist/` and skips site/docs/changelog/readme/cloc, so a `make`-only tree is an invalid release state. Always `npm run build` before merging or releasing.

## CI job shape (`.github/workflows/nodejs.yml`)

- **Pull requests** run `pr-check` → `ci_build` (= `vet && test`, i.e. full `make` + vitest).
- **Pushes (any branch)** run `verify-version-bump` (push-only; compares against the published npm version), the `unicode-*` suites, and `benchmark`.
- **Pushes to `main`** additionally run the `build` matrix + `full-build`, then `release` (npm publish + tag + `jssm-viz` dispatch) and `finish`.
