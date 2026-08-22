import * as lib from '../../cli/lib';

describe('cli/lib barrel', () => {

  it('re-exports render and renderSet as callable functions', () => {
    expect(typeof lib.render).toBe('function');
    expect(typeof lib.renderSet).toBe('function');
  });

  it('re-exports parseFslArgs as a callable function', () => {
    expect(typeof lib.parseFslArgs).toBe('function');
  });

  it('re-exports RenderError and RasterizationUnsupportedError as constructors', () => {
    expect(typeof lib.RenderError).toBe('function');
    expect(typeof lib.RasterizationUnsupportedError).toBe('function');
    const re = new lib.RenderError('msg');
    expect(re).toBeInstanceOf(Error);
    expect(re.message).toBe('msg');
  });

  it('re-exports rasterize as a callable function', () => {
    expect(typeof lib.rasterize).toBe('function');
  });

  it('rasterizes an svg to real png bytes through the barrel', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10">'
              + '<rect width="20" height="10" fill="red"/></svg>';
    const png = await lib.rasterize(svg, 'png');
    expect(png.length).toBeGreaterThan(0);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  });

  it('forwards raster options through the barrel', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10">'
              + '<rect width="20" height="10" fill="red"/></svg>';
    const png = await lib.rasterize(svg, 'png', { width: 200 });
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(view.getUint32(16, false)).toBe(200);
  });

});
