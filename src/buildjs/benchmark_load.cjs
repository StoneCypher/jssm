'use strict';

/**
 *  Cold load-time measurement for the jssm bundle.  `require` is cached within a
 *  process, so a cold measure must run in a fresh child — the time to parse,
 *  compile, and evaluate the bundle on first import is what a consuming app pays
 *  at startup.  The child runner is injected so the parsing logic unit-tests
 *  without spawning anything.
 *
 *  @see src/buildjs/benchmark_scaling.cjs (the consumer)
 */

/**
 *  Run a one-line node probe (provided to `runNode`) and return a string.
 *
 *  @param code The probe source.
 *  @returns The child's stdout.
 */
function defaultRunNode(code) {
  return require('child_process').execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' });
}

/**
 *  Cold `require` time of a bundle, in milliseconds, measured in a fresh child
 *  process.  Returns `null` if the child's output isn't a finite number.
 *
 *  @param distPath Absolute path to the bundle to require.
 *  @param runNode `(code) => stdout`; defaults to spawning node.
 *  @returns Milliseconds, or `null`.
 *
 *  @example measureLoadMs('/r/dist/jssm.es5.cjs') // => e.g. 11.7
 */
function measureLoadMs(distPath, runNode = defaultRunNode) {
  const code = `const t=process.hrtime.bigint();require(${JSON.stringify(distPath)});process.stdout.write(String(Number(process.hrtime.bigint()-t)/1e6));`;
  const ms   = parseFloat(runNode(code));
  return Number.isFinite(ms) ? ms : null;
}

module.exports = { measureLoadMs };
