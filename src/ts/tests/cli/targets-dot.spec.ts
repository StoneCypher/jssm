import { readFileSync } from 'fs';
import { resolve } from 'path';
import { dotTarget } from '../../cli/subcommands/render/targets/dot';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

describe('dotTarget', () => {

  it('returns a DOT string starting with digraph', async () => {
    const out = await dotTarget(trafficLight);
    expect(out).toMatch(/^\s*digraph\b/);
  });

  it('mentions every declared state', async () => {
    const out = await dotTarget(trafficLight);
    expect(out).toContain('"Off"');
    expect(out).toContain('"Red"');
    expect(out).toContain('"Green"');
    expect(out).toContain('"Yellow"');
  });

  it('contains transition edges', async () => {
    const out = await dotTarget(trafficLight);
    // Edges use state-name-derived slugs since PR #594 (slug-based node IDs).
    expect(out).toMatch(/\w+\s*->\s*\w+/);
  });

  it('throws RenderError for invalid FSL', async () => {
    const { RenderError } = await import('../../cli/types');
    await expect(dotTarget('not valid fsl at all !!')).rejects.toBeInstanceOf(RenderError);
  });

});
