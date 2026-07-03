import type { RenderTarget, RenderOptions, RenderResult, RasterResult, TextResult } from '../../cli/types';
import { RenderError, RasterizationUnsupportedError } from '../../cli/types';

describe('cli/types', () => {

  it('RenderTarget enumerates the v1 targets', () => {
    const valid: RenderTarget[] = ['svg', 'dot', 'png', 'jpeg', 'html', 'gif'];
    expect(valid.length).toBe(6);
  });

  it('RenderError is a real Error subclass with the path field', () => {
    const e = new RenderError('boom', { path: 'm.fsl' });
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('boom');
    expect(e.path).toBe('m.fsl');
    expect(e.name).toBe('RenderError');
  });

  it('RasterizationUnsupportedError is a RenderError subclass', () => {
    const e = new RasterizationUnsupportedError('no canvas, no wasm');
    expect(e).toBeInstanceOf(RenderError);
    expect(e.name).toBe('RasterizationUnsupportedError');
  });

  it('RenderResult discriminates text vs raster output', () => {
    const textResult: TextResult = { target: 'svg', kind: 'text', content: '<svg/>' };
    const rasterResult: RasterResult = { target: 'png', kind: 'raster', buffer: new Uint8Array([0]) };
    const all: RenderResult[] = [textResult, rasterResult];
    expect(all.length).toBe(2);
  });

});
