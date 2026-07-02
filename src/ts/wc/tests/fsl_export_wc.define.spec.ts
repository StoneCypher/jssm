// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslExport } from '../fsl_export_wc.define.js';

describe('<fsl-export> registration', () => {
  it('registers the canonical fsl-export tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-export')).toBe(FslExport);
    expect(customElements.get('jssm-export')).toBeUndefined();
  });
});
