/**
 * Build orchestrator runner: executes the build as a sequence of parallel stages.
 *
 * The stage plan comes from `build_config.cjs` (`buildPlan`). Stages run
 * **serially**; the scripts within a stage run **concurrently** via
 * `child_process.spawn('npm run <name>', { shell: true })`. If any script in a
 * stage exits non-zero, that stage's `Promise.all` rejects, the build aborts,
 * and no later stage runs. Ported from the template's `run_build.js` to CJS,
 * with the stage loop factored into an injectable `runStages` for testing.
 *
 * @example
 *   // Invoked by the `build`/`make` npm scripts:
 *   node src/buildjs/run_build.cjs --profile=release
 *   node src/buildjs/run_build.cjs --profile=fast
 *   node src/buildjs/run_build.cjs --disable=docs,cloc
 *
 * @see ./build_config.cjs
 */

'use strict';

const { spawn } = require('child_process');
const { buildPlan } = require('./build_config.cjs');

/**
 * Run one npm script, resolving on clean exit and rejecting otherwise.
 *
 * `shell: true` with a single command string is the portable npm invocation
 * (npm is a `.cmd` shim on Windows); passing a string (not an args array) avoids
 * the unescaped-args deprecation.
 *
 * @param {string} script - npm script name (e.g. "typescript")
 * @returns {Promise<void>} resolves on exit 0; rejects on error or non-zero exit
 */
function runScript(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(`npm run ${script}`, { stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`npm run ${script} failed (exit ${code})`));
    });
  });
}

/**
 * Execute a stage plan: each stage's scripts in parallel, stages in order.
 *
 * @param {string[][]} stages - per-stage lists of script names
 * @param {{ run?: (script: string) => Promise<void>, log?: (msg: string) => void }} [opts]
 *   `run` performs one script (defaults to a real `npm run`); `log` sinks the
 *   per-stage banner (defaults to console.log). Both injected by tests.
 * @returns {Promise<void>} resolves when all stages complete; rejects on the
 *   first stage containing a failing script (later stages do not run).
 *
 * @example
 *   await runStages([['makever','peg'], ['typescript']]); // peg ∥ makever, then tsc
 */
async function runStages(stages, opts = {}) {
  const run = opts.run ?? runScript;
  const log = opts.log ?? console.log;
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (!stage.length) continue;
    log(`\n=== Stage ${i}: ${stage.join(', ')} ===`);
    await Promise.all(stage.map(run));
  }
}

/**
 * Entry point: compute the plan, narrate disabled features/warnings, run it.
 * @returns {Promise<void>}
 */
async function main() {
  const { stages, disabled, warnings } = buildPlan();
  for (const w of warnings) console.warn(`[build] ${w}`);
  if (disabled.length) console.log(`[build] disabled: ${disabled.join(', ')}`);
  await runStages(stages);
}

module.exports = { runScript, runStages, main };

if (require.main === module) {
  main().catch(err => {
    console.error(`\nBuild failed: ${err.message}`);
    process.exit(1);
  });
}
