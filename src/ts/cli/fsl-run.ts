import { cli } from './subcommands/run/plugin';

/**
 * Binary entry for `fsl-run`. Calls the plugin's `cli()` function and exits
 * with the returned code. Mirrors `fsl-render.ts`; the shebang is added by
 * rollup at build time (`output.banner` in `rollup.config.cli.js`).
 */
async function main(): Promise<void> {
  // process.argv shape: ['node', '/path/to/fsl-run.cjs', ...userArgs]
  const argv = process.argv.slice(2);
  const code = await cli(argv);
  process.exit(code);
}

void main();
