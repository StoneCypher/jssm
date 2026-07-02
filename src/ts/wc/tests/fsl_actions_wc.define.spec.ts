// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslActions } from '../fsl_actions_wc.define.js';

describe('<fsl-actions> registration', () => {
  it('registers the canonical fsl-actions tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-actions')).toBe(FslActions);
    expect(customElements.get('jssm-actions')).toBeUndefined();
  });
});
