'use strict';

/**
 * Vitest reporter that emits a metrics.json file in the same shape that
 * `jest-json-reporter2` did for jssm under jest.  Consumed by
 * `src/buildjs/make_readme.cjs` and any other tooling that reads coverage
 * metrics.
 *
 * Output schema (the only one jssm uses):
 *
 *   {
 *     tests:   { failed, skipped, success },
 *     suites:  { failed, skipped, success },
 *     startTime: <ms since epoch>
 *   }
 *
 * Uses vitest 4's reporter API — `onTestRunEnd` plus the `TestModule` /
 * `TestCase` "Reported Tasks" API.  The pre-vitest-3 `onFinished(files)`
 * hook this reporter originally used is no longer called by vitest 4.
 *
 * Usage in a vitest config:
 *
 *   reporters: [
 *     'default',
 *     [
 *       './src/buildjs/vitest_metrics_reporter.cjs',
 *       { outputDir: './coverage/spec', outputFile: 'metrics.json' }
 *     ]
 *   ]
 */

const fs   = require('fs');
const path = require('path');



/**
 * Tallies vitest 4 `TestModule` results into jest-json-reporter2-shaped
 * `{ passed, failed, skipped }` counts for both tests and suites (files).
 *
 * In vitest 4 a `skipped` test-result state covers both `skip` and `todo`,
 * which matches how jest-json-reporter2 folded todo into pending — so no
 * separate todo handling is needed.
 *
 * @param {ReadonlyArray<object>} testModules  Modules from `onTestRunEnd`
 * @returns {{tests:{passed:number,failed:number,skipped:number},
 *            suites:{passed:number,failed:number,skipped:number}}}
 */
function tally(testModules) {

  const tests  = { passed: 0, failed: 0, skipped: 0 };
  const suites = { passed: 0, failed: 0, skipped: 0 };

  for (const mod of testModules) {

    const moduleState = mod.state();
    if      (moduleState === 'passed')  { suites.passed  += 1; }
    else if (moduleState === 'skipped') { suites.skipped += 1; }
    else                                { suites.failed  += 1; }  // failed / queued / pending

    for (const testCase of mod.children.allTests()) {
      const state = testCase.result().state;
      if      (state === 'passed')  { tests.passed  += 1; }
      else if (state === 'skipped') { tests.skipped += 1; }   // skip + todo
      else                          { tests.failed  += 1; }  // failed / pending
    }

  }

  return { tests, suites };

}



class JsonMetricsReporter {

  constructor(options = {}) {
    this._options   = options || {};
    this._startTime = Date.now();
  }

  /**
   * Called by vitest when it initializes; stamps the run start time,
   * mirroring `Jest.results.startTime`.
   */
  onInit() {
    this._startTime = Date.now();
  }

  /**
   * Called by vitest 4 once the run is complete.  Emits the metrics file.
   *
   * @param {ReadonlyArray<object>} testModules  Reported test modules
   */
  onTestRunEnd(testModules = []) {

    const { outputDir = './coverage', outputFile = 'metrics.json' } = this._options;

    const { tests, suites } = tally(testModules);

    const out = {
      tests: {
        failed  : tests.failed,
        skipped : tests.skipped,
        success : tests.passed
      },
      suites: {
        failed  : suites.failed,
        skipped : suites.skipped,
        success : suites.passed
      },
      startTime: this._startTime
    };

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, outputFile), JSON.stringify(out), 'utf-8');

  }

}



module.exports = JsonMetricsReporter;
module.exports.default = JsonMetricsReporter;
