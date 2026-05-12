
import { defineConfig } from 'vitest/config';

/**
 * Stochastic suite — equivalent to the former jest-stoch.config.cjs.  Runs
 * fast-check property tests in `*.stoch.ts` and emits a metrics.json
 * summary in `./coverage/stoch/` for the readme build script.
 */
export default defineConfig({

  test: {

    name              : 'stoch',
    globals           : true,
    environment       : 'node',
    include           : ['**/*.stoch.ts'],
    exclude           : ['**/node_modules/**', '**/dist/**'],

    setupFiles        : ['./vitest.setup.ts'],

    reporters         : [
      'default',
      ['./src/buildjs/vitest_metrics_reporter.cjs', {
        outputDir  : './coverage/stoch',
        outputFile : 'metrics.json'
      }]
    ],

    coverage: {

      provider          : 'v8',
      enabled           : true,
      reportsDirectory  : './coverage/stoch',
      reporter          : ['text', 'clover', 'lcov', 'html', 'json'],

      include           : ['src/ts/**/*.{js,ts}'],
      exclude           : [
        'node_modules/**',
        'src/ts/tests/**',
        'src/ts/fsl_parser.ts',
        'src/ts/fsl_parser.js'
      ],

      // No floor in the original jest-stoch config (thresholds were all 0).
      thresholds: {
        branches   : 0,
        functions  : 0,
        lines      : 0,
        statements : 0
      }

    },

    // fast-check property tests can take a while.
    testTimeout       : 60_000,
    hookTimeout       : 60_000

  }

});
