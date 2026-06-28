// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslFooter } from '../fsl_footer_wc.define.js';

describe('<fsl-footer> registration', () => {
  it('registers the canonical fsl-footer tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-footer')).toBe(FslFooter);
    expect(customElements.get('jssm-footer')).toBeUndefined();
  });
});
