import { readFileSync } from 'fs';
import { resolve } from 'path';
import { render } from '../../cli/subcommands/render/render';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

describe('render', () => {

  it('dispatches target=svg to text result', async () => {
    const r = await render(trafficLight, { target: 'svg' });
    expect(r.kind).toBe('text');
    expect(r.target).toBe('svg');
    if (r.kind === 'text') {
      expect(r.content).toContain('<svg');
    }
  });

  it('dispatches target=dot to text result', async () => {
    const r = await render(trafficLight, { target: 'dot' });
    expect(r.kind).toBe('text');
    if (r.kind === 'text') {
      expect(r.content).toMatch(/^\s*digraph/);
    }
  });

  it('dispatches target=html to text result', async () => {
    const r = await render(trafficLight, { target: 'html' });
    expect(r.kind).toBe('text');
    if (r.kind === 'text') {
      expect(r.content).toMatch(/^<!DOCTYPE html>/);
    }
  });

  it('dispatches target=png to raster result', async () => {
    const r = await render(trafficLight, { target: 'png', width: 400 });
    expect(r.kind).toBe('raster');
    expect(r.target).toBe('png');
    if (r.kind === 'raster') {
      expect(Array.from(r.buffer.subarray(0, 8))).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    }
  });

  it('throws RenderError for invalid FSL', async () => {
    const { RenderError } = await import('../../cli/types');
    await expect(render('not valid fsl !!', { target: 'svg' })).rejects.toBeInstanceOf(RenderError);
  });

  it('throws for unknown target', async () => {
    // @ts-expect-error testing runtime guard
    await expect(render(trafficLight, { target: 'webp' })).rejects.toThrow(/unknown target/i);
  });

});
