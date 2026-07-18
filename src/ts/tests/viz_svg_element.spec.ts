/**
 * @vitest-environment jsdom
 */

 

import { TextDecoder, TextEncoder } from 'node:util';

// jsdom does not expose TextDecoder / TextEncoder; @viz-js/viz (WebAssembly
// loader) needs them.  Copy the Node built-ins onto globalThis before any
// test runs.
beforeAll(() => {
  if (globalThis.TextDecoder === undefined) {
    (globalThis as any).TextDecoder = TextDecoder;
  }
  if (globalThis.TextEncoder === undefined) {
    (globalThis as any).TextEncoder = TextEncoder;
  }
});

import * as jv   from '../jssm_viz';
import * as jssm from '../jssm';

const sm = jssm.sm;




describe('SVG element rendering (jsdom env)', () => {

  test('fsl_to_svg_element resolves to an SVGElement', async () => {
    const el = await jv.fsl_to_svg_element('a -> b;');
    expect(el).toBeDefined();
    expect(el.nodeName.toLowerCase()).toBe('svg');
  });

  test('machine_to_svg_element resolves to an SVGElement', async () => {
    const el = await jv.machine_to_svg_element(sm`a -> b;`);
    expect(el).toBeDefined();
    expect(el.nodeName.toLowerCase()).toBe('svg');
  });

});
