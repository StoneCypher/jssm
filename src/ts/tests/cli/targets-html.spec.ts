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

  it('throws RenderError for invalid FSL', async () => {
    const { RenderError } = await import('../../cli/types');
    await expect(htmlTarget('not valid fsl at all !!')).rejects.toBeInstanceOf(RenderError);
  });

});
