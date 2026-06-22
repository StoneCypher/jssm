import { dispatch } from './dispatcher.js';

/**
 * Binary entry for `fsl` (and its alias `jssm`). Forwards argv to
 * `dispatch()` and exits with the returned code.
 *
 * Sets `process.exitCode` rather than calling `process.exit(code)` so the
 * event loop drains naturally: the image-render paths load WebAssembly
 * (`@viz-js/viz`, `@resvg/resvg-wasm`) whose background thread signals through
 * a libuv async handle, and forcing an abrupt exit before that handle closes
 * trips a `UV_HANDLE_CLOSING` assertion on Windows (#614). Draining lets the
 * handle close cleanly; the exit code still propagates verbatim.
 *
 * The shebang (`#!/usr/bin/env node`) is added by rollup at build time.
 */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const code = await dispatch(argv);
  process.exitCode = code;
}

void main();
