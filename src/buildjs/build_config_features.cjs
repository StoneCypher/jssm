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
 * The stage numbering reflects jssm's real data dependencies:
 *   0  clean (+ lint, which is independent of everything)
 *   1  makever, peg                      (write version.ts / fsl_parser)
 *   2  typescript (+ cem/doctests/cli typecheck — source-only, parallel to tsc)
 *   3  the rollup bundles                 (consume tsc output in dist/es6)
 *   4  minify + per-bundle terser         (minify rewrites fsl_parser AFTER bundles read it)
 *   5  rm_nonmin                          (removes minify's *.nonmin.js)
 *   6  vitest, changelog, perf_chart, cloc
 *   7  site                               (copies the minified iife bundle)
 *   8  cookbook, fsl.tools site, typedoc
 *   9  readme                             (consumes vitest metrics + cloc report)
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
  // --- Stage 0: clean + independent lint ---
  clean:  { script: 'clean',  stages: [0], mandatory: true },
  eslint: { script: 'eslint', stages: [0], optional: true, defaultEnabled: true },
  audit:  { script: 'audit',  stages: [0], optional: true, defaultEnabled: true },

  // --- Stage 1: generated sources ---
  makever: { script: 'makever', stages: [1], mandatory: true },
  peg:     { script: 'peg',     stages: [1], mandatory: true },

  // --- Stage 2: typecheck/compile + source-only analyzers ---
  typescript:    { script: 'typescript',    stages: [2], mandatory: true },
  cem:           { script: 'build:cem',      stages: [2], optional: true, defaultEnabled: true },
  doctests:      { script: 'make_doctests',  stages: [2], optional: true, defaultEnabled: true },
  typecheck_cli: { script: 'typecheck_cli',  stages: [2], optional: true, defaultEnabled: true },

  // --- Stage 3: rollup bundles (consume dist/es6 from tsc) ---
  make_core:            { script: 'make_core',            stages: [3], optional: true, defaultEnabled: true },
  make_deno:            { script: 'make_deno',            stages: [3], optional: true, defaultEnabled: true },
  make_viz:             { script: 'make_viz',             stages: [3], optional: true, defaultEnabled: true },
  make_wc_viz_es6:      { script: 'make_wc_viz_es6',      stages: [3], optional: true, defaultEnabled: true },
  make_wc_viz_cdn:      { script: 'make_wc_viz_cdn',      stages: [3], optional: true, defaultEnabled: true },
  make_wc_instance_es6: { script: 'make_wc_instance_es6', stages: [3], optional: true, defaultEnabled: true },
  make_wc_instance_cdn: { script: 'make_wc_instance_cdn', stages: [3], optional: true, defaultEnabled: true },
  make_cm6:             { script: 'make_cm6',             stages: [3], optional: true, defaultEnabled: true },
  make_cli:             { script: 'make_cli',             stages: [3], optional: true, defaultEnabled: true },

  // --- Stage 4: minification (after bundles have read fsl_parser) ---
  minify:       { script: 'minify',       stages: [4], optional: true, defaultEnabled: true },
  min_iife:     { script: 'min_iife',     stages: [4], optional: true, defaultEnabled: true, requires: ['make_core'] },
  min_es6:      { script: 'min_es6',      stages: [4], optional: true, defaultEnabled: true, requires: ['make_core'] },
  min_cjs:      { script: 'min_cjs',      stages: [4], optional: true, defaultEnabled: true, requires: ['make_core'] },
  min_deno:     { script: 'min_deno',     stages: [4], optional: true, defaultEnabled: true, requires: ['make_deno'] },
  min_viz_iife: { script: 'min_viz_iife', stages: [4], optional: true, defaultEnabled: true, requires: ['make_viz'] },
  min_viz_es6:  { script: 'min_viz_es6',  stages: [4], optional: true, defaultEnabled: true, requires: ['make_viz'] },
  min_viz_cjs:  { script: 'min_viz_cjs',  stages: [4], optional: true, defaultEnabled: true, requires: ['make_viz'] },
  min_cli:      { script: 'min_cli',      stages: [4], optional: true, defaultEnabled: true, requires: ['make_cli'] },

  // --- Stage 5: cleanup of minify's intermediate nonmin artifact ---
  rm_nonmin: { script: 'rm_nonmin', stages: [5], optional: true, defaultEnabled: true, requires: ['minify'] },

  // --- Stage 6: tests + independent doc inputs ---
  vitest:     { script: 'vitest',     stages: [6], optional: true, defaultEnabled: true,
                requires: ['make_wc_viz_es6', 'make_wc_viz_cdn', 'make_wc_instance_es6', 'make_wc_instance_cdn', 'doctests'] },
  changelog:  { script: 'changelog',  stages: [6], optional: true, defaultEnabled: true },
  perf_chart: { script: 'perf_chart', stages: [6], optional: true, defaultEnabled: true },
  cloc:       { script: 'cloc',       stages: [6], optional: true, defaultEnabled: true },

  // --- Stage 7: site (copies the minified iife into docs/) ---
  site: { script: 'site', stages: [7], optional: true, defaultEnabled: true, requires: ['min_iife'] },

  // --- Stage 8: doc generators that write under docs/ ---
  make_cookbook:  { script: 'make_cookbook',  stages: [8], optional: true, defaultEnabled: true, requires: ['site'] },
  site_fsl_tools: { script: 'site_fsl_tools', stages: [8], optional: true, defaultEnabled: true, requires: ['site'] },
  docs:           { script: 'docs',           stages: [8], optional: true, defaultEnabled: true },

  // --- Stage 9: readme (consumes vitest metrics + cloc report) ---
  readme: { script: 'readme', stages: [9], optional: true, defaultEnabled: true, requires: ['vitest', 'cloc'] },
};

/** Feature names that always run and cannot be disabled. */
const MANDATORY_FEATURE_NAMES = Object.keys(FEATURES).filter(n => FEATURES[n].mandatory);

/** Feature names that profiles/overrides may toggle. */
const OPTIONAL_FEATURE_NAMES = Object.keys(FEATURES).filter(n => FEATURES[n].optional);

module.exports = { FEATURES, MANDATORY_FEATURE_NAMES, OPTIONAL_FEATURE_NAMES };
