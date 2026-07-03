import { describe, it, expect } from 'vitest';
import { render_fence_gif, render_fence_html } from '../fsl_fence_render.js';
import { decode_gif } from './helpers/gif_decode.js';

describe('render_fence_gif', () => {

  it('renders one frame per walk state, looping forever', async () => {
    const gif = decode_gif(await render_fence_gif('Red => Green => Yellow => Red;', { scale: 25 }));
    expect(gif.frames.length).toBe(3);
    expect(gif.loop).toBe(0);
    expect(gif.width).toBeGreaterThan(0);
  }, 60_000);

  it('frames differ from one another (the highlight moved)', async () => {
    const gif = decode_gif(await render_fence_gif('A => B => A;', { scale: 25 }));
    expect(gif.frames.length).toBe(2);
    expect([...gif.frames[0]!.rgb]).not.toEqual([...gif.frames[1]!.rgb]);
  }, 60_000);

  it('truncates at max_frames', async () => {
    const gif = decode_gif(await render_fence_gif('A -> B; C -> D; E -> F;', { max_frames: 2, scale: 25 }));
    expect(gif.frames.length).toBe(2);
  }, 60_000);

  it('throws JssmError on invalid FSL', async () => {
    await expect(render_fence_gif('broken ->;')).rejects.toThrow();
  });

});

describe('render_fence_html with gif format', () => {

  it('embeds a gif data URI', async () => {
    const html = await render_fence_html('A => B => A;', 'fsl gif');
    expect(html).toContain('data:image/gif;base64,');
  }, 60_000);

  it('falls back to a Buffer-free base64 encoder when Buffer is unavailable', async () => {
    // vi.stubGlobal does not remove an existing global; delete it directly
    // to force the `typeof Buffer` check down the btoa path (mirrors the
    // Buffer-fallback precedent in fsl_fence_render.spec.ts's png test).
    const realBuffer = (globalThis as any).Buffer;
    delete (globalThis as any).Buffer;
    try {
      const html = await render_fence_html('A => B => A;', 'fsl gif');
      expect(html).toContain('data:image/gif;base64,');
    } finally {
      (globalThis as any).Buffer = realBuffer;
    }
  }, 60_000);

});
