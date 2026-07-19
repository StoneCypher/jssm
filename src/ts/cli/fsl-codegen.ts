import { cli } from './subcommands/codegen/plugin';

/**
 * Binary entry for `fsl-codegen`. Calls the plugin's `cli()` function and
 * exits with the returned code.
 *
 * Sets `process.exitCode` rather than calling `process.exit(code)` so the
 * event loop drains naturally, consistent with the other CLI entrypoints and
 * the Windows libuv async-handle teardown fix (#614). The exit code still
 * propagates verbatim.
 *
 * The shebang (`#!/usr/bin/env node`) is added by rollup at build time via
 * the `output.banner` option in `rollup.config.cli.js`.
 */
async function main(): Promise<void> {
  // process.argv shape: ['node', '/path/to/fsl-codegen.cjs', ...userArgs]
  const argv = process.argv.slice(2);
  const code = await cli(argv);
  process.exitCode = code;
}

void main();
