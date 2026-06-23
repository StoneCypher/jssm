
import {
  fsl_fence_lang
} from '../fsl_markdown_fence';

describe('fsl_fence_lang/1', () => {
  it('recognizes fsl', () => expect(fsl_fence_lang('fsl image code')).toBe('fsl'));
  it('recognizes jssm', () => expect(fsl_fence_lang('jssm')).toBe('jssm'));
  it('is case-insensitive', () => expect(fsl_fence_lang('FSL svg')).toBe('fsl'));
  it('canonicalizes JSSM to jssm', () => expect(fsl_fence_lang('JSSM')).toBe('jssm'));
  it('rejects other languages', () => expect(fsl_fence_lang('mermaid')).toBe(null));
  it('rejects empty', () => expect(fsl_fence_lang('   ')).toBe(null));
});
