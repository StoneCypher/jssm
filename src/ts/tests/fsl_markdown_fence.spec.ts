
import {
  fsl_fence_lang,
  parse_fence_info
} from '../fsl_markdown_fence';

import * as jssm from '../jssm';

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

describe('parse_fence_info/1 — formats', () => {
  it('defaults to svg', () => expect(parse_fence_info('fsl image').format).toBe('svg'));
  it('a bare format implies image at its position', () => {
    const d = parse_fence_info('fsl png');
    expect(d.parts).toEqual(['image']);
    expect(d.format).toBe('png');
  });
  it('format after another part inserts image at the format position', () => {
    const d = parse_fence_info('fsl code jpeg');
    expect(d.parts).toEqual(['code', 'image']);
    expect(d.format).toBe('jpeg');
  });
  it('does not duplicate image when image is explicit', () => {
    const d = parse_fence_info('fsl image png');
    expect(d.parts).toEqual(['image']);
    expect(d.format).toBe('png');
  });
  it('two formats: last wins with a note', () => {
    const d = parse_fence_info('fsl png jpeg');
    expect(d.format).toBe('jpeg');
    expect(d.notes.some(n => /override|overrid/i.test(n) && /png/.test(n))).toBe(true);
  });
  it('accepts gif as a format', () => expect(parse_fence_info('fsl gif').format).toBe('gif'));
});

describe('parse_fence_info/1 — dimensions', () => {
  it('bare number is px', () =>
    expect(parse_fence_info('fsl image width=300').width).toEqual({ value: 300, unit: 'px' }));
  it('explicit px', () =>
    expect(parse_fence_info('fsl image height=120px').height).toEqual({ value: 120, unit: 'px' }));
  it('percent', () =>
    expect(parse_fence_info('fsl image width=100%').width).toEqual({ value: 100, unit: 'percent' }));
  it('both dimensions independently', () => {
    const d = parse_fence_info('fsl image width=300 height=200');
    expect(d.width).toEqual({ value: 300, unit: 'px' });
    expect(d.height).toEqual({ value: 200, unit: 'px' });
  });
  it('invalid dimension is ignored with a note', () => {
    const d = parse_fence_info('fsl image width=banana');
    expect(d.width).toBeNull();
    expect(d.notes.some(n => /invalid/i.test(n) && /width/.test(n))).toBe(true);
  });
  it('unset dimensions are null', () => {
    const d = parse_fence_info('fsl image');
    expect(d.width).toBeNull();
    expect(d.height).toBeNull();
  });
});

const IDE_PARTS = ['title','image','actions','info-panel','toolbar','editor','footer'];

describe('parse_fence_info/1 — ide macro', () => {
  it('ide expands to the canonical full part set', () => {
    const d = parse_fence_info('fsl ide');
    expect(d.ide).toBe(true);
    expect(d.parts).toEqual(IDE_PARTS);
  });
  it('ide overrides à-la-carte parts with a note', () => {
    const d = parse_fence_info('fsl image ide');
    expect(d.parts).toEqual(IDE_PARTS);
    expect(d.notes.some(n => /ide/i.test(n) && /overrid/i.test(n))).toBe(true);
  });
  it('non-ide blocks have ide=false', () =>
    expect(parse_fence_info('fsl image').ide).toBe(false));
});

describe('parse_fence_info/1 — interactive + raster override', () => {
  it('static blocks are not interactive', () =>
    expect(parse_fence_info('fsl image code').interactive).toBe(false));
  it('actions makes it interactive', () =>
    expect(parse_fence_info('fsl image actions').interactive).toBe(true));
  it('ide is interactive', () =>
    expect(parse_fence_info('fsl ide').interactive).toBe(true));
  it('raster + interactive forces svg with a note', () => {
    const d = parse_fence_info('fsl png actions');
    expect(d.interactive).toBe(true);
    expect(d.format).toBe('svg');
    expect(d.notes.some(n => /svg/i.test(n) && /png/.test(n))).toBe(true);
  });
  it('raster without interactive keeps the raster format', () =>
    expect(parse_fence_info('fsl png').format).toBe('png'));
  it('svg + interactive needs no override note', () => {
    const d = parse_fence_info('fsl actions');
    expect(d.format).toBe('svg');
    expect(d.notes.some(n => /forced.*svg|overridden to svg/i.test(n))).toBe(false);
  });
});

describe('parse_fence_info/1 — dot part and option edge cases', () => {
  it('dot is treated as a part, not an unknown token', () => {
    const d = parse_fence_info('fsl dot');
    expect(d.parts).toEqual(['dot']);
    expect(d.notes.some(n => /unknown/i.test(n))).toBe(false);
  });
  it('bare dot does NOT imply image (dot is a code-view, not a format)', () => {
    const d = parse_fence_info('fsl dot');
    expect(d.parts).not.toContain('image');
    expect(d.format).toBe('svg');
  });
  it('dot stacks after code in listed order', () => {
    expect(parse_fence_info('fsl code dot').parts).toEqual(['code', 'dot']);
  });
  it('empty-value width= is invalid and noted, width stays null', () => {
    const d = parse_fence_info('fsl image width=');
    expect(d.width).toBeNull();
    expect(d.notes.some(n => /invalid/i.test(n) && /width/.test(n))).toBe(true);
  });
});

describe('fence parser is exported from the jssm barrel', () => {
  it('exposes parse_fence_info', () =>
    expect(jssm.parse_fence_info('fsl').parts).toEqual(['image', 'code']));
  it('exposes fsl_fence_lang', () =>
    expect(jssm.fsl_fence_lang('jssm')).toBe('jssm'));
  it('a full real-world string parses end to end', () => {
    const d = jssm.parse_fence_info('fsl code image width=640 height=480 png');
    expect(d.parts).toEqual(['code', 'image']);
    expect(d.format).toBe('png');
    expect(d.width).toEqual({ value: 640, unit: 'px' });
    expect(d.height).toEqual({ value: 480, unit: 'px' });
    expect(d.interactive).toBe(false);
  });
});
