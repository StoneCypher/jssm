/**
 * Build orchestrator feature catalog — jssm's build DAG expressed as data.
 *
 * Each feature maps to exactly one existing npm leaf script and declares the
 * build stage(s) it runs in. The orchestrator (`run_build.cjs`) runs stages
 * **serially** and the scripts within a stage **concurrently**, so two features
 * sharing a stage index must be safe to run in parallel (no shared output file,
 * no read-vs-write race). `requires` lists upstream features whose disabling
 * should cascade-disable this one; `mandatory` features always run and cannot be
 * disabled.
 *
 * The stage numbering reflects jssm's real data dependencies AND a strict rule
 * learned from a byte-equivalence-gate failure: a script that **broadly reads
 * `src/**`** (audit, cloc) must never share a stage with one that **mutates
 * `src/**`** (clean, makever, peg, doctests, perf_chart) — else the reader globs
 * a file mid-write/delete and the build dies with ENOENT (an intermittent race).
 * So the `src`-mutating steps each get an isolated stage:
 *   0  clean                              (deletes generated src + dist — alone)
 *   1  makever, peg                       (write version.ts / fsl_parser — disjoint)
 *   2  typescript, cem, typecheck_cli     (read src, write dist/cem/—; no src writes)
 *   3  doctests                           (writes src/ts/tests/generated — isolated)
 *   4  the 9 rollup bundles + eslint + audit  (read stable dist/es6 + src/ts)
 *   5  minify + per-bundle terser         (minify rewrites fsl_parser AFTER bundles read it)
 *   6  rm_nonmin                          (removes minify's *.nonmin.js)
 *   7  vitest, changelog
 *   8  perf_chart                         (writes src/generated_docs — isolated from cloc)
 *   9  cloc, docs, site
 *  10  cookbook, fsl.tools site
 *  11  readme                             (consumes vitest metrics + cloc report)
 *
 * @see ./build_config.cjs
 * @see ./run_build.cjs
 * @see notes/superpowers/plans/2026-06-23-build-orchestrator.md
 */

'use strict';

/**
 * The feature catalog. Keys are feature names (used in profiles/overrides);
 * values declare the npm `script`, the `stages` it occupies, whether it is
 * `mandatory` or `optional`, its `defaultEnabled` state (optional only), and
 * any `requires` upstream features.
 *
 * @type {Record<string, { script: string, stages: number[], mandatory?: boolean, optional?: boolean, defaultEnabled?: boolean, requires?: string[] }>}
 */
const FEATURES = {
  // --- Stage 0: clean (deletes generated src + dist; must run alone) ---
  clean:  { script: 'clean',  stages: [0], mandatory: true },

  // --- Stage 1: generated sources (disjoint writes under src/ts) ---
  makever: { script: 'makever', stages: [1], mandatory: true },
  peg:     { script: 'peg',     stages: [1], mandatory: true },
  // writes src/ts/wc/generated/fsl_docs_content.ts from src/help + the manifest
  make_help_content: { script: 'make_help_content', stages: [1], optional: true, defaultEnabled: true },

  // --- Stage 2: compile + source-only analyzers (read src, no src writes) ---
  typescript:    { script: 'typescript',    stages: [2], mandatory: true },
  cem:           { script: 'build:cem',      stages: [2], optional: true, defaultEnabled: true },
  typecheck_cli: { script: 'typecheck_cli',  stages: [2], optional: true, defaultEnabled: true },

  // --- Stage 3: doctests (writes src/ts/tests/generated — isolated from src readers) ---
  doctests: { script: 'make_doctests', stages: [3], optional: true, defaultEnabled: true },

  // --- Stage 4: rollup bundles (read stable dist/es6) + src-readers (src now stable) ---
  make_core:            { script: 'make_core',            stages: [4], optional: true, defaultEnabled: true },
  make_deno:            { script: 'make_deno',            stages: [4], optional: true, defaultEnabled: true },
  make_viz:             { script: 'make_viz',             stages: [4], optional: true, defaultEnabled: true },
  make_wc_viz_es6:      { script: 'make_wc_viz_es6',      stages: [4], optional: true, defaultEnabled: true },
  make_wc_viz_cdn:      { script: 'make_wc_viz_cdn',      stages: [4], optional: true, defaultEnabled: true },
  make_wc_instance_es6: { script: 'make_wc_instance_es6', stages: [4], optional: true, defaultEnabled: true },
  make_wc_instance_cdn: { script: 'make_wc_instance_cdn', stages: [4], optional: true, defaultEnabled: true },
  make_wc_editor_es6:   { script: 'make_wc_editor_es6',   stages: [4], optional: true, defaultEnabled: true },
  make_wc_widgets_es6:  { script: 'make_wc_widgets_es6',  stages: [4], optional: true, defaultEnabled: true },
  make_wc_docs_es6:     { script: 'make_wc_docs_es6',     stages: [4], optional: true, defaultEnabled: true },
  make_cm6:             { script: 'make_cm6',             stages: [4], optional: true, defaultEnabled: true },
  make_fence:           { script: 'make_fence',           stages: [4], optional: true, defaultEnabled: true },
  make_cli:             { script: 'make_cli',             stages: [4], optional: true, defaultEnabled: true },
  eslint:               { script: 'eslint',               stages: [4], optional: true, defaultEnabled: true },
  audit:                { script: 'audit',                stages: [4], optional: true, defaultEnabled: true },

  // --- Stage 5: minification (after bundles have read fsl_parser) ---
  minify:       { script: 'minify',       stages: [5], optional: true, defaultEnabled: true },
  min_iife:     { script: 'min_iife',     stages: [5], optional: true, defaultEnabled: true, requires: ['make_core'] },
  min_es6:      { script: 'min_es6',      stages: [5], optional: true, defaultEnabled: true, requires: ['make_core'] },
  min_cjs:      { script: 'min_cjs',      stages: [5], optional: true, defaultEnabled: true, requires: ['make_core'] },
  min_deno:     { script: 'min_deno',     stages: [5], optional: true, defaultEnabled: true, requires: ['make_deno'] },
  min_viz_iife: { script: 'min_viz_iife', stages: [5], optional: true, defaultEnabled: true, requires: ['make_viz'] },
  min_viz_es6:  { script: 'min_viz_es6',  stages: [5], optional: true, defaultEnabled: true, requires: ['make_viz'] },
  min_viz_cjs:  { script: 'min_viz_cjs',  stages: [5], optional: true, defaultEnabled: true, requires: ['make_viz'] },
  min_cli:      { script: 'min_cli',      stages: [5], optional: true, defaultEnabled: true, requires: ['make_cli'] },
  // in-place like min_cli (no nonmin intermediate); --module because the cdn
  // bundles are ESM.  terser's default comment filter keeps the lit @license
  // blocks the bundles carry.
  min_cdn:      { script: 'min_cdn',      stages: [5], optional: true, defaultEnabled: true, requires: ['make_wc_viz_cdn', 'make_wc_instance_cdn'] },

  // --- Stage 6: cleanup of minify's intermediate nonmin artifact ---
  rm_nonmin: { script: 'rm_nonmin', stages: [6], optional: true, defaultEnabled: true, requires: ['minify'] },

  // --- Stage 7: tests + changelog (disjoint outputs) ---
  vitest:    { script: 'vitest',    stages: [7], optional: true, defaultEnabled: true,
               requires: ['make_wc_viz_es6', 'make_wc_viz_cdn', 'make_wc_instance_es6', 'make_wc_instance_cdn', 'make_wc_editor_es6', 'make_wc_widgets_es6', 'make_wc_docs_es6', 'doctests'] },
  changelog: { script: 'changelog', stages: [7], optional: true, defaultEnabled: true },

  // --- Stage 8: perf_chart (writes src/generated_docs — isolated from cloc's src read) ---
  perf_chart: { script: 'perf_chart', stages: [8], optional: true, defaultEnabled: true },

  // --- Stage 9: src-readers + doc generators (src now stable; disjoint doc subdirs) ---
  cloc: { script: 'cloc', stages: [9], optional: true, defaultEnabled: true },
  docs: { script: 'docs', stages: [9], optional: true, defaultEnabled: true },
  site: { script: 'site', stages: [9], optional: true, defaultEnabled: true, requires: ['min_iife'] },
  // report-only: prints teaching-surface coverage drift; never fails the build (reads cem + the es6 bundle for fences)
  check_teaching_surface: { script: 'check_teaching_surface', stages: [9], optional: true, defaultEnabled: true, requires: ['cem', 'min_es6'] },

  // --- Stage 10: doc generators that write under docs/ after site ---
  make_cookbook:  { script: 'make_cookbook',  stages: [10], optional: true, defaultEnabled: true, requires: ['site'] },
  site_fsl_tools: { script: 'site_fsl_tools', stages: [10], optional: true, defaultEnabled: true, requires: ['site'] },

  // --- Stage 11: readme (consumes vitest metrics + cloc report) ---
  readme: { script: 'readme', stages: [11], optional: true, defaultEnabled: true, requires: ['vitest', 'cloc'] },
};

/** Feature names that always run and cannot be disabled. */
const MANDATORY_FEATURE_NAMES = Object.keys(FEATURES).filter(n => FEATURES[n].mandatory);

/** Feature names that profiles/overrides may toggle. */
const OPTIONAL_FEATURE_NAMES = Object.keys(FEATURES).filter(n => FEATURES[n].optional);

module.exports = { FEATURES, MANDATORY_FEATURE_NAMES, OPTIONAL_FEATURE_NAMES };
