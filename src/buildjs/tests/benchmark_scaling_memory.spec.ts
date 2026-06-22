// Unit tests for src/buildjs/benchmark_scaling_memory.cjs.
// The measurement primitives take an injectable { gc, heapUsed } seam so they
// are deterministic without --expose-gc. Assertions are exact-value / substring
// per house rules (no golden files).

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mem = require('../benchmark_scaling_memory.cjs');

describe('measureRetainedBytes', () => {
  test('returns post-build heap delta when gc is injectable', () => {
    const heap = mkHeap([1_000, 1_500]);            // base, after
    const seam = { gc: () => {}, heapUsed: heap };
    expect(mem.measureRetainedBytes(() => ({}), seam)).toBe(500);
  });

  test('returns null when gc is unavailable (graceful degrade)', () => {
    const seam = { gc: null, heapUsed: () => 0 };
    expect(mem.measureRetainedBytes(() => ({}), seam)).toBeNull();
  });

  test('throws if the build returns undefined (instrument bug guard)', () => {
    const seam = { gc: () => {}, heapUsed: mkHeap([0, 0]) };
    expect(() => mem.measureRetainedBytes(() => undefined, seam)).toThrow();
  });
});

describe('measureAllocBytes', () => {
  test('returns the heap delta across the batch (no trailing collect)', () => {
    const seam = { gc: () => {}, heapUsed: mkHeap([2_000, 2_240]) };
    expect(mem.measureAllocBytes(() => {}, seam)).toBe(240);
  });

  test('returns null when gc is unavailable', () => {
    const seam = { gc: null, heapUsed: () => 0 };
    expect(mem.measureAllocBytes(() => {}, seam)).toBeNull();
  });
});

function mkHeap(values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
