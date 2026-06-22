// Unit tests for src/buildjs/benchmark_bundle_size.cjs — raw/gzip/brotli sizing
// of dist artifacts. Behavioral assertions (not re-derived from the impl) per
// house rules (no golden / fake tests).

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bs = require('../benchmark_bundle_size.cjs');

describe('measureBundle', () => {
  test('raw is the byte length; gzip and brotli are smaller for compressible input', () => {
    const buf = Buffer.from('x'.repeat(10000));
    const m = bs.measureBundle(buf);
    expect(m.raw).toBe(10000);
    expect(m.gzip).toBeGreaterThan(0);
    expect(m.gzip).toBeLessThan(m.raw);
    expect(m.brotli).toBeGreaterThan(0);
    expect(m.brotli).toBeLessThan(m.raw);
  });

  test('tiny input still reports all three numeric sizes', () => {
    const m = bs.measureBundle(Buffer.from('a'));
    expect(m.raw).toBe(1);
    expect(typeof m.gzip).toBe('number');
    expect(typeof m.brotli).toBe('number');
  });
});

describe('collectBundleSizes', () => {
  test('keys by basename and measures each readable file; skips unreadable', () => {
    const fakeFiles: Record<string, Buffer> = {
      '/d/jssm.es5.cjs': Buffer.from('y'.repeat(5000)),
      '/d/jssm.es6.mjs': Buffer.from('z'.repeat(3000)),
    };
    const readFile = (p: string) => {
      if (!(p in fakeFiles)) { throw new Error('missing'); }
      return fakeFiles[p];
    };
    const out = bs.collectBundleSizes(['/d/jssm.es5.cjs', '/d/jssm.es6.mjs', '/d/gone.js'], readFile);
    expect(out['jssm.es5.cjs'].raw).toBe(5000);
    expect(out['jssm.es6.mjs'].raw).toBe(3000);
    expect(out['gone.js']).toBeUndefined();   // unreadable -> skipped, no throw
  });
});
