// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslEditor } from '../fsl_editor_wc.define.js';

describe('<fsl-editor> registration', () => {
  it('registers the canonical fsl-editor tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-editor')).toBe(FslEditor);
    expect(customElements.get('jssm-editor')).toBeUndefined();
  });

  it('re-exports the FslEditor class', () => {
    expect(typeof FslEditor).toBe('function');
  });
});
