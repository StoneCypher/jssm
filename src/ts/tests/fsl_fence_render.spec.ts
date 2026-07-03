import { describe, it, expect } from 'vitest';
import { render_fence_html, transform_markdown } from '../fsl_fence_render.js';
import { fsl_to_svg_string } from '../jssm_viz.js';
import { extract_state_fills } from '../fsl_svg_patch.js';

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
    const svg   = await fsl_to_svg_string('Red -> Green;');
    const fills = extract_state_fills(svg);
    expect(html).toContain('data-state="Red"');
    expect(html).toContain(`style="color:${fills.get('Red')}"`);
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

  // The former gif-placeholder test was superseded when render_fence_gif
  // landed; the gif branch of image_html is now covered by the 'embeds a
  // gif data URI' test in fsl_fence_gif.spec.ts.

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

  it('does not close on a body line that merely starts with the tick run', async () => {
    const md = '````fsl\na -> b;\n````\n\n```js\nconst s = "```fsl inside a js block";\n```\n';
    const out = await transform_markdown(md);
    expect(out).toContain('class="fsl-fence"');
    expect(out).toContain('const s = "```fsl inside a js block";');
  });

  it('passes through a longer non-FSL fence containing a shorter fsl-looking fence, byte-identical', async () => {
    const inner = '````md\nExample:\n\n```fsl\na -> b;\n```\n\ndone\n````\n';
    const out = await transform_markdown(inner);
    expect(out).toBe(inner);
  });

  it('renders a four-tick fsl fence cleanly with no residual ticks', async () => {
    const md = '````fsl\na -> b;\n````\n';
    const out = await transform_markdown(md);
    expect(out).toContain('class="fsl-fence"');
    expect(out).not.toContain('````');
  });

  it('keeps a ticks-plus-text body line inside the fence instead of closing on it', async () => {
    const md = '```fsl\na -> b;\n```not a close\nmore body\n```\ntail\n';
    const out = await transform_markdown(md);
    // the fence body becomes invalid FSL (it contains the stray lines), which
    // routes to the error box — the point is that 'tail' survives untouched
    // and the ticks-plus-text line was NOT treated as a close (it ends up in
    // the error box source, proving it's part of the fence body, not a close).
    expect(out).toContain('tail');
    expect(out).toContain('fsl-error-box');
    expect(out).toContain('```not a close');
  });

  it('closes a three-tick fence at a four-tick line (CommonMark: at least as many)', async () => {
    const md = '```fsl\na -> b;\n````\ntail\n';
    const out = await transform_markdown(md);
    expect(out).toContain('class="fsl-fence"');
    expect(out).toContain('<svg');
    expect(out).toContain('tail');
  });

});
