/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { wc_suffix_matches, closest_wc, define_canonical } from '../wc_tag_helpers';

describe('wc_tag_helpers (fsl- only, 6.0)', () => {

  it('matches the fsl- prefix for a suffix, case-insensitively', () => {
    expect(wc_suffix_matches('FSL-VIZ', 'viz')).toBe(true);
    expect(wc_suffix_matches('fsl-viz', 'viz')).toBe(true);
    expect(wc_suffix_matches('fsl-vizard', 'viz')).toBe(false);
    expect(wc_suffix_matches('div', 'viz')).toBe(false);
  });

  it('no longer matches the retired jssm- prefix', () => {
    expect(wc_suffix_matches('jssm-viz', 'viz')).toBe(false);
    expect(wc_suffix_matches('JSSM-INSTANCE', 'instance')).toBe(false);
  });

  it('closest_wc finds an fsl- ancestor and ignores a jssm- one', () => {
    document.body.innerHTML = '<fsl-instance><span id="f"></span></fsl-instance><jssm-instance><span id="j"></span></jssm-instance>';
    const f = document.querySelector('#f')!;
    const j = document.querySelector('#j')!;
    expect(closest_wc(f, 'instance')?.tagName.toLowerCase()).toBe('fsl-instance');
    expect(closest_wc(j, 'instance')).toBeNull();
  });

  it('define_canonical registers the tag once and is idempotent', () => {
    class A extends HTMLElement {}
    define_canonical('fsl-onesyn-x', A);
    expect(customElements.get('fsl-onesyn-x')).toBe(A);
    expect(() => define_canonical('fsl-onesyn-x', A)).not.toThrow();
    expect(customElements.get('jssm-onesyn-x')).toBeUndefined();
  });

});
