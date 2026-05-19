/**
 * Jest setup for the web-component test environment.
 *
 * jsdom does not expose `TextDecoder` / `TextEncoder` on its window, but the
 * underlying `@viz-js/viz` WASM module imported transitively through
 * `fsl_to_svg_string` requires them. We polyfill from Node's `util` module
 * onto `globalThis` so the WASM glue can find them.
 */
const { TextDecoder, TextEncoder } = require('util');

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
