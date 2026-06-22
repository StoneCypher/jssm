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

describe('injectMemoryFields', () => {
  test('puts footprint on construct rows and allocs on matching op rows', () => {
    const data = { results: [
      { name: 'dense-200 construct()',      ops: 1 },
      { name: 'dense-200 edges_between()',  ops: 5 },
      { name: 'dense-200 transition()',     ops: 9 },
    ]};
    const footprints = new Map([['dense-200', { bytes: 40000, bytesPerState: 200, bytesPerEdge: 1 }]]);
    const allocs     = new Map([['dense-200 edges_between()', 12], ['dense-200 transition()', 64]]);

    mem.injectMemoryFields(data, footprints, allocs);

    const byName = Object.fromEntries(data.results.map((r: any) => [r.name, r]));
    expect(byName['dense-200 construct()'].footprintBytes).toBe(40000);
    expect(byName['dense-200 construct()'].bytesPerEdge).toBe(1);
    expect(byName['dense-200 construct()'].allocBytesPerOp).toBeUndefined();      // construct not in allocs map
    expect(byName['dense-200 edges_between()'].allocBytesPerOp).toBe(12);
    expect(byName['dense-200 edges_between()'].footprintBytes).toBeUndefined();   // footprint only on construct
    expect(byName['dense-200 transition()'].allocBytesPerOp).toBe(64);
  });

  test('leaves rows with no match untouched', () => {
    const data = { results: [{ name: 'chain-10 has_state()', ops: 3 }] };
    mem.injectMemoryFields(data, new Map(), new Map());
    expect(data.results[0]).toEqual({ name: 'chain-10 has_state()', ops: 3 });
  });
});

describe('collectMemory', () => {
  test('builds footprint + alloc maps from shapes via the seam', () => {
    const shape = { name: 'chain-3', machine: { list_edges: () => [{}, {}, {}] } };
    const rebuild = () => ({});                          // fake machine
    const opBatches = () => [['chain-3 transition()', () => {}]];
    // heapUsed sequence: footprint(base, after) then alloc(base, after)
    const seam = { gc: () => {}, heapUsed: mkHeap([0, 300, 0, 60]) };

    const { footprints, allocs } = mem.collectMemory([shape], 100, rebuild, opBatches, seam);

    expect(footprints.get('chain-3').bytes).toBe(300);
    expect(footprints.get('chain-3').bytesPerEdge).toBe(100);    // 300 / 3 edges
    expect(footprints.get('chain-3').bytesPerState).toBe(100);   // 300 / 3 states (from name)
    expect(allocs.get('chain-3 transition()')).toBeCloseTo(0.6, 5);   // 60 / 100
  });

  test('skips shapes when gc is unavailable', () => {
    const shape = { name: 'chain-3', machine: { list_edges: () => [] } };
    const seam = { gc: null, heapUsed: () => 0 };
    const { footprints, allocs } = mem.collectMemory([shape], 100, () => ({}), () => [], seam);
    expect(footprints.size).toBe(0);
    expect(allocs.size).toBe(0);
  });
});

function mkHeap(values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
