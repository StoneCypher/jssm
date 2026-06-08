/**
 * @vitest-environment jsdom
 */
import { wc_suffix_matches, closest_wc, define_with_synonym } from '../wc_tag_helpers';

describe('wc_suffix_matches', () => {
  it('matches both fsl- and jssm- prefixes for a suffix', () => {
    expect(wc_suffix_matches('FSL-VIZ', 'viz')).toBe(true);
    expect(wc_suffix_matches('jssm-viz', 'viz')).toBe(true);
    expect(wc_suffix_matches('div', 'viz')).toBe(false);
    expect(wc_suffix_matches('fsl-vizard', 'viz')).toBe(false);
  });
});

describe('closest_wc', () => {
  it('finds the nearest ancestor with either prefix for a suffix', () => {
    document.body.innerHTML = '<fsl-instance><div id="k"></div></fsl-instance>';
    const k = document.getElementById('k')!;
    expect(closest_wc(k, 'instance')?.tagName.toLowerCase()).toBe('fsl-instance');
    document.body.innerHTML = '<jssm-instance><span id="j"></span></jssm-instance>';
    const j = document.getElementById('j')!;
    expect(closest_wc(j, 'instance')?.tagName.toLowerCase()).toBe('jssm-instance');
  });
});

describe('define_with_synonym', () => {
  it('registers both tags with distinct constructors', () => {
    class A extends HTMLElement {}
    class B extends A {}
    define_with_synonym('fsl-twosyn-x', 'jssm-twosyn-x', A, B);
    expect(customElements.get('fsl-twosyn-x')).toBe(A);
    expect(customElements.get('jssm-twosyn-x')).toBe(B);
  });
  it('is idempotent (guards on customElements.get)', () => {
    class A extends HTMLElement {}
    class B extends A {}
    define_with_synonym('fsl-twosyn-y', 'jssm-twosyn-y', A, B);
    expect(() => define_with_synonym('fsl-twosyn-y', 'jssm-twosyn-y', A, B)).not.toThrow();
    expect(customElements.get('fsl-twosyn-y')).toBe(A);
  });
});
