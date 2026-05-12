
'use strict';

/**
 * Vitest reporter that emits a metrics.json file in the same shape that
 * `jest-json-reporter2` did for jssm under jest.  Consumed by
 * `src/buildjs/make_readme.cjs` and any other tooling that read coverage
 * metrics.
 *
 * Output schema (truncated form, the only one jssm uses):
 *
 *   {
 *     tests:   { failed, skipped, success },
 *     suites:  { failed, skipped, success },
 *     startTime: <ms since epoch>
 *   }
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
 * Walks a vitest task tree and tallies leaf-test results into
 * `{ passed, failed, skipped, todo }` counts.
 *
 * Skipped includes both `skipped` and `todo` for jest-json-reporter2 parity.
 *
 * @param {Array<object>} tasks  Top-level tasks from `onFinished(files)`
 * @returns {{passed:number, failed:number, skipped:number, todo:number}}
 */
function tallyTasks(tasks) {

  let passed  = 0;
  let failed  = 0;
  let skipped = 0;
  let todo    = 0;

  const walk = (task) => {

    if (!task) { return; }

    if (task.type === 'test' || task.type === 'custom') {

      const state = task.result ? task.result.state : task.mode;

      if      (task.mode  === 'todo')                                                          { todo    += 1; }
      else if (task.mode  === 'skip'    || state === 'skip' || state === 'skipped')            { skipped += 1; }
      else if (state      === 'fail')                                                          { failed  += 1; }
      else if (state      === 'pass')                                                          { passed  += 1; }
      else                                                                                     {
        // Unknown state — treat as failure so we never silently undercount.
        failed += 1;
      }

    }

    if (Array.isArray(task.tasks)) {
      task.tasks.forEach(walk);
    }

  };

  tasks.forEach(walk);

  return { passed, failed, skipped, todo };

}



/**
 * Counts files (suites) by their aggregate result state.
 *
 * @param {Array<object>} files  Top-level files from `onFinished(files)`
 * @returns {{passed:number, failed:number, skipped:number}}
 */
function tallySuites(files) {

  let passed  = 0;
  let failed  = 0;
  let skipped = 0;

  for (const file of files) {

    const state = file.result ? file.result.state : undefined;

    if      (state === 'fail') { failed  += 1; }
    else if (state === 'pass') { passed  += 1; }
    else if (state === 'skip' || state === 'skipped') { skipped += 1; }
    else { failed += 1; }

  }

  return { passed, failed, skipped };

}



class JsonMetricsReporter {

  constructor(options = {}) {
    this._options = options || {};
    this._startTime = Date.now();
  }

  /**
   * Called by vitest at the start of a run; stash the start time in a way
   * that mirrors `Jest.results.startTime`.
   *
   * @param {Array<object>} _files
   */
  onInit() {
    this._startTime = Date.now();
  }

  onPathsCollected() {
    if (!this._startTime) { this._startTime = Date.now(); }
  }

  /**
   * Called by vitest once the run is complete.  Emits the metrics file.
   *
   * @param {Array<object>} files  All collected file-level tasks
   */
  onFinished(files = []) {

    const { outputDir = './coverage', outputFile = 'metrics.json' } = this._options;

    const tests  = tallyTasks (files);
    const suites = tallySuites(files);

    const out = {
      tests: {
        failed  : tests.failed,
        skipped : tests.skipped + tests.todo,   // jest counts todo as pending
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
