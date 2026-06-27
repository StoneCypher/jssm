// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslHelp } from '../fsl_help_wc.define.js';

describe('<fsl-help> registration', () => {
  it('registers the canonical fsl-help tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-help')).toBe(FslHelp);
    expect(customElements.get('jssm-help')).toBeUndefined();
  });
});
