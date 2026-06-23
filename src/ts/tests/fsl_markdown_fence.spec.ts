
import {
  fsl_fence_lang,
  parse_fence_info
} from '../fsl_markdown_fence';

describe('fsl_fence_lang/1', () => {
  it('recognizes fsl', () => expect(fsl_fence_lang('fsl image code')).toBe('fsl'));
  it('recognizes jssm', () => expect(fsl_fence_lang('jssm')).toBe('jssm'));
  it('is case-insensitive', () => expect(fsl_fence_lang('FSL svg')).toBe('fsl'));
  it('canonicalizes JSSM to jssm', () => expect(fsl_fence_lang('JSSM')).toBe('jssm'));
  it('rejects other languages', () => expect(fsl_fence_lang('mermaid')).toBe(null));
  it('rejects empty', () => expect(fsl_fence_lang('   ')).toBe(null));
});

describe('parse_fence_info/1 — parts and defaults', () => {
  it('empty args default to image then code', () => {
    const d = parse_fence_info('fsl');
    expect(d.parts).toEqual(['image', 'code']);
  });
  it('keeps listed part order (first = top)', () => {
    expect(parse_fence_info('fsl code image').parts).toEqual(['code', 'image']);
  });
  it('accepts all part tokens', () => {
    expect(parse_fence_info('fsl title actions footer').parts)
      .toEqual(['title', 'actions', 'footer']);
  });
  it('dedupes a repeated part, first wins, and notes it', () => {
    const d = parse_fence_info('fsl image image');
    expect(d.parts).toEqual(['image']);
    expect(d.notes.some(n => /duplicate/i.test(n) && /image/.test(n))).toBe(true);
  });
  it('ignores an unknown token with a note', () => {
    const d = parse_fence_info('fsl image bogus');
    expect(d.parts).toEqual(['image']);
    expect(d.notes.some(n => /unknown/i.test(n) && /bogus/.test(n))).toBe(true);
  });
  it('only-noise args still fall back to the default parts', () => {
    expect(parse_fence_info('fsl bogus').parts).toEqual(['image', 'code']);
  });
});
