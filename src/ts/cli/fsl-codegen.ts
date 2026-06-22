import { cli } from './subcommands/codegen/plugin';

/**
 * Binary entry for `fsl-codegen`. Calls the plugin's `cli()` function and
 * exits with the returned code.
 *
 * The shebang (`#!/usr/bin/env node`) is added by rollup at build time via
 * the `output.banner` option in `rollup.config.cli.js`.
 */
async function main(): Promise<void> {
  // process.argv shape: ['node', '/path/to/fsl-codegen.cjs', ...userArgs]
  const argv = process.argv.slice(2);
  const code = await cli(argv);
  process.exit(code);
}

void main();
