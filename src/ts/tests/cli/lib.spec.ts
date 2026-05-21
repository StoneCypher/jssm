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

});
