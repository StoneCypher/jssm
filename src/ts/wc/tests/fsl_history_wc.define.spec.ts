// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslHistory } from '../fsl_history_wc.define.js';

describe('<fsl-history> registration', () => {
  it('registers the canonical fsl-history tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-history')).toBe(FslHistory);
    expect(customElements.get('jssm-history')).toBeUndefined();
  });
});
