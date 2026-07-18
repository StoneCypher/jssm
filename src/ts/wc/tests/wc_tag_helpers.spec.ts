/**
 * @vitest-environment jsdom
 */
import { wc_suffix_matches, closest_wc, define_with_synonym, define_canonical } from '../wc_tag_helpers';

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
    const k = document.querySelector('#k')!;
    expect(closest_wc(k, 'instance')?.tagName.toLowerCase()).toBe('fsl-instance');
    document.body.innerHTML = '<jssm-instance><span id="j"></span></jssm-instance>';
    const j = document.querySelector('#j')!;
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

describe('define_canonical', () => {
  it('registers a single canonical fsl- tag with no synonym', () => {
    class A extends HTMLElement {}
    define_canonical('fsl-onesyn-x', A);
    expect(customElements.get('fsl-onesyn-x')).toBe(A);
    // No jssm- alias is minted for canonical-only registrations.
    expect(customElements.get('jssm-onesyn-x')).toBeUndefined();
  });
  it('is idempotent (guards on customElements.get)', () => {
    class A extends HTMLElement {}
    define_canonical('fsl-onesyn-y', A);
    expect(() => define_canonical('fsl-onesyn-y', A)).not.toThrow();
    expect(customElements.get('fsl-onesyn-y')).toBe(A);
  });
});
