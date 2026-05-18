# Executable docblock examples — design

**Date:** 2026-05-16
**Status:** approved (design)

## Goal

Every `@example` block in a docblock becomes a real, runnable test. An example
that drifts out of sync with the code it documents fails the build instead of
rotting silently. This is what makes the project's docblock rule ("include at
least one realistic success example") safe to enforce — an example nothing runs
is an example that silently goes wrong.

## Background

- `jssm.ts` has 7 `@example` blocks and `jssm_constants.ts` has 3; the other
  five TypeDoc entry points have none. No example is executed by any test.
- Existing examples use informal trailing comments (`// true`, `// returns 1
  (v1 is newer)`). This design standardizes them on a strict `// =>` marker.
- The project has no documentation coverage measurement; it has test/code
  coverage (`@vitest/coverage-v8`) and `cloc` line counts. This feature does not
  add doc coverage — it makes the examples that exist trustworthy.
- Test suites are deliberately split (spec / stoch / dragon / unicode), each
  reporting coverage independently.

## Architecture

A new build-time codegen step parses docblocks across all TypeDoc entry points,
extracts each `@example`, and generates one test file per source module. A new
fifth vitest suite runs those generated files with its own independent coverage
report.

### Pipeline placement

- New script `make_doctests` runs inside `npm run make`, positioned after the
  `typescript` step (it only needs source).
- Generated test files are **ephemeral**, exactly like `src/ts/fsl_parser.ts`:
  `clean` deletes them, codegen regenerates them, they are gitignored. They live
  in `src/ts/tests/generated/`, one `*.docex.ts` file per source module. The
  `.docex.ts` extension is deliberate: the spec/stoch/dragon/unicode suites glob
  `*.spec.ts` / `*.stoch.ts` / `*.maximal.ts` / `*.uspec.ts` respectively, so
  `.docex.ts` is matched by none of them — only `vitest.docs.config.ts` picks
  it up.
- `tsconfig.json` needs no change: its `include` is `src/ts/*` (non-recursive),
  so `src/ts/tests/generated/` is already outside the `tsc --build` graph.
- New `vitest-docs` script runs `vitest run --config vitest.docs.config.ts`.
  It is added to the `vitest` aggregate script so CI exercises it.

## Components

| Component | Role |
|---|---|
| `src/buildjs/extract_examples.cjs` | Node codegen script — the extractor. |
| `vitest.docs.config.ts` | Fifth suite config; `jsdom` environment; own v8 coverage report, thresholds 0. |
| `src/ts/tests/generated/*.docex.ts` | Generated, gitignored test files. |
| `package.json` scripts | Adds `make_doctests` and `vitest-docs`; wires both into `make` / `vitest`; updates `clean`. |
| `.gitignore` | Adds `src/ts/tests/generated/` so generated tests are not committed. |

## Extraction

The extractor uses the `typescript` package (already a devDependency) — not
regex — to walk each of the 7 TypeDoc entry points
(`jssm.ts`, `jssm_viz.ts`, `jssm_types.ts`, `jssm_constants.ts`,
`jssm_error.ts`, `jssm_util.ts`, `version.ts`). For every `@example` tag it
records: owning symbol name, source file, exact source line, example body, and
pass mode.

The compiler API is chosen over regex specifically for **blame-ability**: a
failing generated test must name the docblock that lied (`jssm.ts:1698`), and
regex extraction loses line numbers across a multi-line comment.

## Pass modes

The extractor selects a mode per-example:

- **Assertion mode** — the example contains `expect(...)` calls (including
  `expect(() => …).toThrow()` for failure examples). Runs verbatim.
- **Output-comment mode** — a line of the form `expr; // => value`. The
  extractor rewrites the preceding expression into
  `expect(expr).toStrictEqual(value)`. The marker is the strict literal `// =>`.
- An example containing **neither** `expect` nor `// =>` is un-verifiable; the
  extractor emits a deliberately failing test naming the offending docblock, so
  the convention is enforced rather than silently skipped.

## Examples are self-contained

Each `@example` includes its own `import` line(s) and is a complete,
copy-pasteable snippet — what the docblock rule means by a "realistic example".
Examples import via the **package specifier** (`import { sm } from 'jssm'`),
exactly as a user would write it. The extractor **rewrites known jssm
specifiers** (`jssm`, `jssm/viz`, `jssm/cli`) to relative paths into `src/ts/`
source when generating the test, so the docblock stays realistic while the test
exercises current source rather than built `dist/` output.

Each example is wrapped in its own isolated `it()` with no injected scaffolding.

## viz / jsdom

The `vitest.docs.config.ts` suite uses the `jsdom` environment as a superset —
harmless for non-DOM examples, required for `jssm_viz.ts` examples. The
extractor does not classify which examples need a DOM.

## Error handling

- A malformed docblock, an example that will not compile, or an example with no
  verifiable assertion produces a **failing generated test** citing `file:line`
  — never a silent skip.
- A symbol with zero examples is fine; no test is emitted for it.
- A non-failure example whose code throws at runtime fails its test.

## Existing example migration (in scope)

The 10 existing `@example` blocks (7 in `jssm.ts`, 3 in `jssm_constants.ts`)
are migrated to the `// =>` marker and made self-contained (own imports). This
is required for the feature to deliver value on day one.

## Testing the extractor

`extract_examples.cjs` is new code, so per `CLAUDE.md` it ships with unit tests
and DocBlocks. It does **not** get a `README_base.md` entry: `CLAUDE.md` scopes
the README obligation to public API, and the extractor is internal build
tooling. The `// =>` convention is documented in this spec and in a header
comment the extractor writes into every generated file.

The generated suite reports v8 coverage independently, consistent with the
spec / stoch / dragon / unicode split.

## Implementation execution

Implementation is performed by a subagent working in the git worktree
`worktree-doctest-examples`, branched from `main`.

## Out of scope

- Documentation coverage measurement (% of exported symbols documented).
- Adding new `@example` blocks to under-documented symbols.
- Backfilling or rewriting existing `@param {type}` annotations.
- TypeDoc version upgrade (0.22 → 0.23+).
