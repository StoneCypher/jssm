import { dispatch } from './dispatcher';

/**
 * Binary entry for `fsl` (and its alias `jssm`). Forwards argv to
 * `dispatch()` and exits with the returned code.
 *
 * The shebang (`#!/usr/bin/env node`) is added by rollup at build time.
 */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const code = await dispatch(argv);
  process.exit(code);
}

void main();
