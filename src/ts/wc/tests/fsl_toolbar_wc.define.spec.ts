// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslToolbar } from '../fsl_toolbar_wc.define.js';

describe('<fsl-toolbar> registration', () => {
  it('registers the canonical fsl-toolbar tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-toolbar')).toBe(FslToolbar);
    expect(customElements.get('jssm-toolbar')).toBeUndefined();
  });
});
