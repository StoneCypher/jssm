import type { RenderTarget, RenderResult, RasterResult, TextResult } from '../../cli/types';
import { RenderError, RasterizationUnsupportedError, RENDER_TARGETS } from '../../cli/types';
import { SPEC } from '../../cli/subcommands/render/plugin';

describe('cli/types', () => {

  it('the CLI --target enum is exactly the canonical RenderTarget set', () => {
    // Derive the expectation from the runtime sources, not a hardcoded list +
    // count.  The old `.toBe(6)` form was tautological against omissions — it
    // was hand-bumped 5→6 when `gif` landed and would silently pass if a target
    // were dropped.  RENDER_TARGETS is the single source the RenderTarget type
    // derives from; SPEC.flags.target.enum is what the CLI actually validates
    // against.  The `RenderTarget[]` annotation adds a compile-time guarantee
    // that every SPEC value is a valid target; the `toEqual` guarantees the CLI
    // enum has not drifted from the canonical set.  One edit updates all three.
    const specTargets: RenderTarget[] = [...SPEC.flags.target.enum];
    expect(specTargets).toEqual([...RENDER_TARGETS]);
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
