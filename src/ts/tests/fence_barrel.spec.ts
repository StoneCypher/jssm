import { describe, it, expect } from 'vitest';
import * as fence from '../fence.js';

describe('jssm/fence barrel', () => {

  it('exports the full static-rendering surface', () => {
    for (const name of [
      'render_fence_html', 'render_fence_gif', 'transform_markdown',
      'encode_gif', 'quantize', 'lzw_encode', 'plan_walk',
      'highlight_fsl_runs', 'highlight_fsl_html',
      'extract_state_fills', 'patch_state_fill',
    ]) {
      expect(typeof (fence as Record<string, unknown>)[name], name).toBe('function');
    }
  });

});
