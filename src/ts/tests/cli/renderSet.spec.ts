import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderSet } from '../../cli/subcommands/render/renderSet';

const trafficLight = readFileSync(resolve(__dirname, 'fixtures/machines/traffic-light.fsl'), 'utf8');
const atm = readFileSync(resolve(__dirname, 'fixtures/machines/atm.fsl'), 'utf8');

describe('renderSet', () => {

  it('renders multiple FSL strings to a list of results', async () => {
    const results = await renderSet([trafficLight, atm], { target: 'svg' });
    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(true);
    if (results[0].ok && results[0].result.kind === 'text') {
      expect(results[0].result.content).toContain('<svg');
    }
    if (results[1].ok && results[1].result.kind === 'text') {
      expect(results[1].result.content).toContain('<svg');
    }
  });

  it('continues past errors and reports per-input', async () => {
    const results = await renderSet([trafficLight, 'not valid fsl', atm], { target: 'svg' });
    expect(results).toHaveLength(3);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    expect(results[2].ok).toBe(true);
    const failure = results[1];
    if (!failure.ok) {
      expect(failure.error.message).toMatch(/render failed|parse/i);
    }
  });

  it('renders to PNG for multiple inputs', async () => {
    const results = await renderSet([trafficLight, atm], { target: 'png', width: 400 });
    expect(results[0].ok && results[0].result.kind).toBe('raster');
    expect(results[1].ok && results[1].result.kind).toBe('raster');
  });

  it('returns an empty array for empty input', async () => {
    const results = await renderSet([], { target: 'svg' });
    expect(results).toEqual([]);
  });

});
