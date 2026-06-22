import { readFileSync } from 'fs';
import { resolve } from 'path';
import { htmlTarget } from '../../cli/subcommands/render/targets/html';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

describe('htmlTarget', () => {

  it('returns an HTML document starting with DOCTYPE', async () => {
    const out = await htmlTarget(trafficLight);
    expect(out).toMatch(/^<!DOCTYPE html>/);
  });

  it('contains both an opening and closing html element', async () => {
    const out = await htmlTarget(trafficLight);
    expect(out).toContain('<html');
    expect(out).toContain('</html>');
  });

  it('embeds the SVG inside the body', async () => {
    const out = await htmlTarget(trafficLight);
    expect(out).toContain('<svg');
    expect(out).toContain('</svg>');
    expect(out).toMatch(/>Red</);
  });

  it('includes a <title> element', async () => {
    const out = await htmlTarget(trafficLight);
    expect(out).toMatch(/<title>[^<]+<\/title>/);
  });

  it('uses opts.title when provided (HTML-escaped)', async () => {
    const out = await htmlTarget(trafficLight, { title: 'My <Custom> "Title"' });
    // Escaped form must appear; raw < and " must not appear inside <title>.
    expect(out).toContain('<title>My &lt;Custom&gt; &quot;Title&quot;</title>');
  });

  it('escapes single quotes in opts.title', async () => {
    // Guards the apostrophe arm of escapeHtml (#774): a single quote must
    // become &#39; so a title can never break out of a quoted context.
    const out = await htmlTarget(trafficLight, { title: "O'Brien's" });
    expect(out).toContain('<title>O&#39;Brien&#39;s</title>');
    expect(out).not.toContain("O'Brien");
  });

  it('throws RenderError for invalid FSL', async () => {
    const { RenderError } = await import('../../cli/types');
    await expect(htmlTarget('not valid fsl at all !!')).rejects.toBeInstanceOf(RenderError);
  });

  it('wraps non-RenderError throws from svgTarget in new RenderError', async () => {
    // svgTarget contractually throws RenderError; this guards the fallback
    // branch in html.ts that wraps anything else. Mock svg locally so other
    // tests in this file keep using the real implementation.
    vi.resetModules();
    vi.doMock('../../cli/subcommands/render/targets/svg', () => ({
      svgTarget: async () => { throw new Error('synthetic non-RenderError'); },
    }));
    const { htmlTarget: mockedHtmlTarget } = await import('../../cli/subcommands/render/targets/html');
    const { RenderError } = await import('../../cli/types');
    await expect(mockedHtmlTarget('a -> b;')).rejects.toBeInstanceOf(RenderError);
    await expect(mockedHtmlTarget('a -> b;')).rejects.toThrow(/HTML render failed.*synthetic non-RenderError/);
    vi.doUnmock('../../cli/subcommands/render/targets/svg');
  });

});
