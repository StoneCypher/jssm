import { cli } from './subcommands/render/plugin.js';

/**
 * Binary entry for `fsl-render`. Calls the plugin's `cli()` function and
 * exits with the returned code.
 *
 * Sets `process.exitCode` rather than calling `process.exit(code)` so the
 * event loop drains naturally: rasterization loads WebAssembly
 * (`@viz-js/viz`, `@resvg/resvg-wasm`) whose background thread signals through
 * a libuv async handle, and an abrupt exit before that handle closes trips a
 * `UV_HANDLE_CLOSING` assertion on Windows (#614). Draining lets the handle
 * close cleanly; the exit code still propagates verbatim.
 *
 * The shebang (`#!/usr/bin/env node`) is added by rollup at build time via
 * the `output.banner` option in `rollup.config.cli.js`.
 */
async function main(): Promise<void> {
  // process.argv shape: ['node', '/path/to/fsl-render.cjs', ...userArgs]
  const argv = process.argv.slice(2);
  const code = await cli(argv);
  process.exitCode = code;
}

void main();
