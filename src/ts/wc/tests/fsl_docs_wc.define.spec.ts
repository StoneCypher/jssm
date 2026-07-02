// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslDocs } from '../fsl_docs_wc.define.js';

describe('<fsl-docs> registration', () => {
  it('registers the canonical fsl-docs tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-docs')).toBe(FslDocs);
    expect(customElements.get('jssm-docs')).toBeUndefined();
  });
});
