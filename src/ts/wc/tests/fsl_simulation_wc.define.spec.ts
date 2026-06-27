// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslSimulation } from '../fsl_simulation_wc.define.js';

describe('<fsl-simulation> registration', () => {
  it('registers the canonical fsl-simulation tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-simulation')).toBe(FslSimulation);
    expect(customElements.get('jssm-simulation')).toBeUndefined();
  });
});
