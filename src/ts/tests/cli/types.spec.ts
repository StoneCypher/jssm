import type { RenderTarget, RenderOptions, RenderResult, RasterResult, TextResult } from '../../cli/types';
import { RenderError, RasterizationUnsupportedError, TypegenError, RENDER_TARGETS } from '../../cli/types';
import {
  RenderError                   as SourceRenderError,
  RasterizationUnsupportedError as SourceRasterizationUnsupportedError,
} from '../../fsl_rasterize_errors';
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

  it('re-exports the SAME error classes as fsl_rasterize_errors (reference identity, not copies)', () => {
    // The error classes moved to fence-owned fsl_rasterize_errors.ts;
    // cli/types.ts re-exports them. If either path ever declared its own
    // copy, instanceof would break across the fence/cli package boundary at
    // runtime — pin reference identity, not just shape.
    expect(RenderError).toBe(SourceRenderError);
    expect(RasterizationUnsupportedError).toBe(SourceRasterizationUnsupportedError);
  });

});
