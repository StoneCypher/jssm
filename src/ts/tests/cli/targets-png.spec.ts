import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pngTarget } from '../../cli/subcommands/render/targets/png';

const trafficLight = readFileSync(
  resolve(__dirname, 'fixtures/machines/traffic-light.fsl'),
  'utf8',
);

describe('pngTarget', () => {

  it('produces PNG bytes with correct magic header', async () => {
    const buf = await pngTarget(trafficLight, { width: 600 });
    expect([...buf.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  });

  it('respects the requested width in the PNG header', async () => {
    const buf = await pngTarget(trafficLight, { width: 600 });
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const width = view.getUint32(16, false);
    expect(width).toBe(600);
  });

  it('throws RenderError for invalid FSL', async () => {
    const { RenderError } = await import('../../cli/types');
    await expect(pngTarget('not valid', { width: 400 })).rejects.toBeInstanceOf(RenderError);
  });

});
