
import { defineConfig } from 'vitest/config';

/**
 * Main spec suite — equivalent to the former jest-spec.config.cjs.  Runs
 * every `*.spec.ts` under `src/`, collects v8 coverage of `src/ts/**` with
 * 100% thresholds, and emits a `metrics.json` summary that the readme
 * build script consumes.
 */
export default defineConfig({

  test: {

    name              : 'spec',
    globals           : true,
    environment       : 'node',
    include           : ['**/*.spec.ts'],
    exclude           : ['**/node_modules/**', '**/dist/**', '.claude/**'],

    // The lone `viz_svg_element.spec.ts` uses `// @vitest-environment jsdom`
    // (added during the conversion).  No other per-file env overrides are
    // needed.
    environmentMatchGlobs: [],

    setupFiles        : ['./vitest.setup.ts'],

    reporters         : [
      'default',
      ['./src/buildjs/vitest_metrics_reporter.cjs', {
        outputDir  : './coverage/spec',
        outputFile : 'metrics.json'
      }]
    ],

    coverage: {

      provider          : 'v8',
      enabled           : true,
      reportsDirectory  : './coverage/spec',
      reporter          : ['text', 'clover', 'lcov', 'html', 'json'],

      include           : ['src/ts/**/*.{js,ts}'],
      // mirror coveragePathIgnorePatterns from the jest config:
      exclude           : [
        'node_modules/**',
        'src/ts/tests/**',
        'src/ts/wc/tests/**',
        'src/ts/jssm_viz.ts',
        'src/ts/jssm_viz_colors.ts',
        'src/ts/fsl_parser.ts',
        'src/ts/fsl_parser.js'
      ],

      thresholds: {
        branches   : 100,
        functions  : 100,
        lines      : 100,
        statements : 100
      }

    },

    // Help vitest spot leaks/teardown problems quickly on long suites.
    testTimeout       : 30_000,
    hookTimeout       : 30_000

  }

});
