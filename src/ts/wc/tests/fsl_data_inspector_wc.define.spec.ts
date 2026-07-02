// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslDataInspector } from '../fsl_data_inspector_wc.define.js';

describe('<fsl-data-inspector> registration', () => {
  it('registers the canonical fsl-data-inspector tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-data-inspector')).toBe(FslDataInspector);
    expect(customElements.get('jssm-data-inspector')).toBeUndefined();
  });
});
