// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { FslHookLog } from '../fsl_hook_log_wc.define.js';

describe('<fsl-hook-log> registration', () => {
  it('registers the canonical fsl-hook-log tag (no jssm- synonym)', () => {
    expect(customElements.get('fsl-hook-log')).toBe(FslHookLog);
    expect(customElements.get('jssm-hook-log')).toBeUndefined();
  });
});
