import { cli } from './subcommands/run/plugin';

/**
 * Binary entry for `fsl-run`. Calls the plugin's `cli()` function and exits
 * with the returned code. Mirrors `fsl-render.ts`; the shebang is added by
 * rollup at build time (`output.banner` in `rollup.config.cli.js`).
 *
 * Sets `process.exitCode` rather than calling `process.exit(code)` so the
 * event loop drains naturally, consistent with the other CLI entrypoints and
 * the Windows libuv async-handle teardown fix (#614). The exit code still
 * propagates verbatim.
 */
async function main(): Promise<void> {
  // process.argv shape: ['node', '/path/to/fsl-run.cjs', ...userArgs]
  const argv = process.argv.slice(2);
  const code = await cli(argv);
  process.exitCode = code;
}

void main();
