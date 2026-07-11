import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { svgTarget } from '../../cli/subcommands/render/targets/svg';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

describe('svgTarget', () => {

  it('returns an SVG string with the SVG envelope', async () => {
    const out = await svgTarget(trafficLight);
    expect(out).toMatch(/^<\?xml[^>]+\?>[\s\S]*?<svg/);
    expect(out).toContain('</svg>');
  });

  it('mentions every declared state as text', async () => {
    const out = await svgTarget(trafficLight);
    expect(out).toMatch(/>Off</);
    expect(out).toMatch(/>Red</);
    expect(out).toMatch(/>Green</);
    expect(out).toMatch(/>Yellow</);
  });

  it('contains at least one transition path element', async () => {
    const out = await svgTarget(trafficLight);
    const pathCount = (out.match(/<path/g) ?? []).length;
    expect(pathCount).toBeGreaterThanOrEqual(3);
  });

  it('throws RenderError for invalid FSL', async () => {
    const { RenderError } = await import('../../cli/types');
    await expect(svgTarget('not valid fsl at all !!')).rejects.toBeInstanceOf(RenderError);
  });

});
