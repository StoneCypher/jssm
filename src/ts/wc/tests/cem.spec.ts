/**
 * @jest-environment node
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('custom-elements.json', () => {

  const cem_path = resolve(__dirname, '../../../../custom-elements.json');

  it('exists at the repo root', () => {
    expect(existsSync(cem_path)).toBe(true);
  });

  it('declares the jssm-viz tag', () => {
    const cem = readFileSync(cem_path, 'utf8');
    expect(cem).toContain('"jssm-viz"');
    expect(cem).toContain('JssmViz');
  });

  it('documents the fsl and engine properties', () => {
    const cem = readFileSync(cem_path, 'utf8');
    expect(cem).toContain('"fsl"');
    expect(cem).toContain('"engine"');
  });

  it('documents the viz-error event', () => {
    const cem = readFileSync(cem_path, 'utf8');
    expect(cem).toContain('"viz-error"');
  });

  it('documents the --jssm-viz-min-height CSS property', () => {
    const cem = readFileSync(cem_path, 'utf8');
    expect(cem).toContain('--jssm-viz-min-height');
  });

});
