
import { defineConfig } from 'vitest/config';

/**
 * Unicode suite — equivalent to the former jest-unicode.config.cjs.  Each
 * unicode runner is invoked with a single `*.uspec.ts` filename argument
 * to test one slice of the Unicode space at a time.  Emits metrics into
 * `./coverage/unicode/`.
 */
export default defineConfig({

  test: {

    name              : 'unicode',
    globals           : true,
    environment       : 'node',
    include           : ['**/*.uspec.ts'],
    exclude           : ['**/node_modules/**', '**/dist/**', '.claude/**'],

    setupFiles        : ['./vitest.setup.ts'],

    reporters         : [
      'default',
      ['./src/buildjs/vitest_metrics_reporter.cjs', {
        outputDir  : './coverage/unicode',
        outputFile : 'metrics.json'
      }]
    ],

    coverage: {

      provider          : 'v8',
      enabled           : true,
      reportsDirectory  : './coverage/unicode',
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

    // unicode walks ~145k codepoints; allow generous timeouts.
    testTimeout       : 300_000,
    hookTimeout       : 300_000

  }

});
