import { describe, it, expect } from 'vitest';
import { render_fence_html, transform_markdown } from '../fsl_fence_render.js';

describe('render_fence_html', () => {

  it('default fence renders image over code, in that order', async () => {
    const html = await render_fence_html('Red -> Green;', 'fsl');
    expect(html).toContain('class="fsl-fence"');
    expect(html).toContain('<svg');
    expect(html).toContain('fsl-code');
    expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('fsl-code'));
  });

  it('code state names carry the diagram colors inline', async () => {
    const html = await render_fence_html('Red -> Green;', 'fsl code');
    expect(html).toContain('data-state="Red"');
    expect(html).toMatch(/data-state="Red"[^>]*style="color:/);
  });

  it('dot renders escaped DOT source, not an image', async () => {
    const html = await render_fence_html('a -> b;', 'fsl dot');
    expect(html).toContain('fsl-dot');
    expect(html).toContain('digraph');
    expect(html).not.toContain('<svg');
  });

  it('honors width and height on the wrapper', async () => {
    const html = await render_fence_html('a -> b;', 'fsl width=300 height=50%');
    expect(html).toContain('width:300px');
    expect(html).toContain('height:50%');
  });

  it('interactive parts emit nothing but a note comment', async () => {
    const html = await render_fence_html('a -> b;', 'fsl actions');
    expect(html).toContain('<!-- fsl-fence:');
    expect(html).not.toContain('fsl-actions');
  });

  it('invalid FSL yields the error box with the source still visible', async () => {
    const html = await render_fence_html('this is not -> valid ->;', 'fsl');
    expect(html).toContain('fsl-error-box');
    expect(html).toContain('FSL error');
    expect(html).toContain('fsl-fence-source');
  });

  it('raster formats produce a data-URI img', async () => {
    const html = await render_fence_html('a -> b;', 'fsl png');
    expect(html).toContain('<img');
    expect(html).toContain('data:image/png;base64,');
  });

  it('falls back to a Buffer-free base64 encoder when Buffer is unavailable', async () => {
    // vi.stubGlobal does not remove an existing global; delete it directly
    // to force the `typeof Buffer` check down the btoa path (mirrors the
    // precedent in tests/cli/rasterize.spec.ts's btoa/Buffer fallback test).
    const realBuffer = (globalThis as any).Buffer;
    delete (globalThis as any).Buffer;
    try {
      const html = await render_fence_html('a -> b;', 'fsl png');
      expect(html).toContain('<img');
      expect(html).toContain('data:image/png;base64,');
    } finally {
      (globalThis as any).Buffer = realBuffer;
    }
  });

  it('title renders the FSL machine_name directive', async () => {
    const html = await render_fence_html('machine_name: "My Machine"; a -> b;', 'fsl title');
    expect(html).toContain('<div class="fsl-title">My Machine</div>');
  });

  it('title falls back to a generic label when machine_name is unset', async () => {
    const html = await render_fence_html('a -> b;', 'fsl title');
    expect(html).toContain('<div class="fsl-title">FSL machine</div>');
  });

  it('footer renders an empty footer div', async () => {
    const html = await render_fence_html('a -> b;', 'fsl footer');
    expect(html).toContain('<div class="fsl-footer"></div>');
  });

  it('gif format emits the placeholder note pending render_fence_gif', async () => {
    const html = await render_fence_html('a -> b;', 'fsl gif');
    expect(html).toContain('<!-- fsl-fence:');
    expect(html).toContain('gif rendering lands with render_fence_gif');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<svg');
  });

});

describe('transform_markdown', () => {

  it('replaces fsl fences and leaves everything else byte-identical', async () => {
    const md = '# Title\n\n```fsl\na -> b;\n```\n\n```js\nconst x = 1;\n```\n\ntail\n';
    const out = await transform_markdown(md);
    expect(out).toContain('# Title');
    expect(out).toContain('class="fsl-fence"');
    expect(out).toContain('```js\nconst x = 1;\n```');
    expect(out).toContain('tail');
    expect(out).not.toContain('```fsl');
  });

  it('isolates a broken fence to its own error box', async () => {
    const md = '```fsl\nbroken ->;\n```\n\n```fsl\na -> b;\n```\n';
    const out = await transform_markdown(md);
    expect(out).toContain('fsl-error-box');
    expect(out).toContain('<svg');
  });

  it('supports longer backtick fences', async () => {
    const md = '````fsl\na -> b;\n````\n';
    expect(await transform_markdown(md)).toContain('class="fsl-fence"');
  });

});
