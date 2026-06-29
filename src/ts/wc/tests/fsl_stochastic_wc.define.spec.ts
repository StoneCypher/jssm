// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslStochastic } from '../fsl_stochastic_wc.define.js';

describe('<fsl-stochastic> registration', () => {
  it('registers the canonical fsl-stochastic tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-stochastic')).toBe(FslStochastic);
    expect(customElements.get('jssm-stochastic')).toBeUndefined();
  });
});
