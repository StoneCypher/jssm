import type { RenderTarget, RenderOptions, RenderResult, RasterResult, TextResult } from '../../cli/types';
import { RenderError, RasterizationUnsupportedError, TypegenError } from '../../cli/types';

describe('cli/types', () => {

  it('RenderTarget enumerates the v1 targets', () => {
    const valid: RenderTarget[] = ['svg', 'dot', 'png', 'jpeg', 'html'];
    expect(valid.length).toBe(5);
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

  it('TypegenError is a real Error subclass carrying source-location fields', () => {
    const e = new TypegenError('boom', { path: 'm.fsl', line: 3, column: 5 });
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('TypegenError');
    expect(e.message).toBe('boom');
    expect(e.path).toBe('m.fsl');
    expect(e.line).toBe(3);
    expect(e.column).toBe(5);
  });

  it('TypegenError defaults its location fields to undefined', () => {
    const e = new TypegenError('boom');
    expect(e.path).toBeUndefined();
    expect(e.line).toBeUndefined();
    expect(e.column).toBeUndefined();
  });

});
