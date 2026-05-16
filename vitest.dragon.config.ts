
import { defineConfig } from 'vitest/config';

/**
 * Kitchen-sink dragon suite — equivalent to the former
 * jest-dragon.config.cjs.  Runs every `*.maximal.ts` and emits metrics
 * into `./coverage/ksd/`.
 */
export default defineConfig({

  test: {

    name              : 'dragon',
    globals           : true,
    environment       : 'node',
    include           : ['**/*.maximal.ts'],
    exclude           : ['**/node_modules/**', '**/dist/**', '.claude/**'],

    setupFiles        : ['./vitest.setup.ts'],

    reporters         : [
      'default',
      ['./src/buildjs/vitest_metrics_reporter.cjs', {
        outputDir  : './coverage/ksd',
        outputFile : 'metrics.json'
      }]
    ],

    coverage: {

      provider          : 'v8',
      enabled           : true,
      reportsDirectory  : './coverage/ksd',
      reporter          : ['text', 'clover', 'lcov', 'html', 'json'],

      include           : ['src/ts/**/*.{js,ts}'],
      exclude           : [
        'node_modules/**',
        'src/ts/tests/**',
        'src/ts/wc/tests/**',
        'src/ts/fsl_parser.ts',
        'src/ts/fsl_parser.js'
      ],

      thresholds: {
        branches   : 0,
        functions  : 0,
        lines      : 0,
        statements : 0
      }

    },

    testTimeout       : 120_000,
    hookTimeout       : 120_000

  }

});
