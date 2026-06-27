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
    const footprints = new Map([['dense-200', { bytes: 40000, bytesPerState: 200, bytesPerEdge: 1, maps: 5, sets: 2, arrays: 3, entries: 100 }]]);
    const allocs     = new Map([['dense-200 edges_between()', 12], ['dense-200 transition()', 64]]);

    mem.injectMemoryFields(data, footprints, allocs);

    const byName = Object.fromEntries(data.results.map((r: any) => [r.name, r]));
    expect(byName['dense-200 construct()'].footprintBytes).toBe(40000);
    expect(byName['dense-200 construct()'].bytesPerEdge).toBe(1);
    expect(byName['dense-200 construct()'].mapCount).toBe(5);
    expect(byName['dense-200 construct()'].containerEntries).toBe(100);
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
    const shape = { name: 'chain-3', machine: { list_edges: () => [{}, {}, {}], _t: new Map([['a', 1]]) } };
    const rebuild = () => ({});                          // fake machine
    const opBatches = () => [['chain-3 transition()', () => {}]];
    // heapUsed sequence: footprint(base, after) then alloc(base, after)
    const seam = { gc: () => {}, heapUsed: mkHeap([0, 300, 0, 60]) };

    const { footprints, allocs } = mem.collectMemory([shape], 100, rebuild, opBatches, seam);

    expect(footprints.get('chain-3').bytes).toBe(300);
    expect(footprints.get('chain-3').bytesPerEdge).toBe(100);    // 300 / 3 edges
    expect(footprints.get('chain-3').bytesPerState).toBe(100);   // 300 / 3 states (from name)
    expect(footprints.get('chain-3').maps).toBe(1);              // structural count of the machine
    expect(footprints.get('chain-3').entries).toBe(1);           // total container entries
    expect(allocs.get('chain-3 transition()')).toBeCloseTo(0.6, 5);   // 60 / 100
  });

  test('divides each batch by its own opCount when a batch is a [name, fn, opCount] triple', () => {
    // A closed-walk transition batch runs stepCount ops (e.g. 200 for chain-200), not K.
    // Dividing by K=100 would report double the true bytes/op, so collectMemory must honor
    // the per-batch opCount carried in the triple.
    const shape     = { name: 'chain-200', machine: { list_edges: () => [] } };
    const rebuild   = () => ({});
    const opBatches = () => [['chain-200 transition()', () => {}, 200]];
    // footprint(base, after) then alloc(base, after): 60 bytes across the 200-op batch
    const seam = { gc: () => {}, heapUsed: mkHeap([0, 0, 0, 60]) };

    const { allocs } = mem.collectMemory([shape], 100, rebuild, opBatches, seam);

    expect(allocs.get('chain-200 transition()')).toBeCloseTo(0.3, 5);   // 60 / 200, NOT 60 / 100
  });

  test('still divides a [name, fn] pair batch by the fallback K (back-compat)', () => {
    const shape     = { name: 'chain-3', machine: { list_edges: () => [] } };
    const opBatches = () => [['chain-3 has_state()', () => {}]];   // pair, no opCount
    const seam      = { gc: () => {}, heapUsed: mkHeap([0, 0, 0, 50]) };
    const { allocs } = mem.collectMemory([shape], 100, () => ({}), opBatches, seam);
    expect(allocs.get('chain-3 has_state()')).toBeCloseTo(0.5, 5);   // 50 / 100 (fallback K)
  });

  test('skips shapes when gc is unavailable', () => {
    const shape = { name: 'chain-3', machine: { list_edges: () => [] } };
    const seam = { gc: null, heapUsed: () => 0 };
    const { footprints, allocs } = mem.collectMemory([shape], 100, () => ({}), () => [], seam);
    expect(footprints.size).toBe(0);
    expect(allocs.size).toBe(0);
  });

  test('degrades to null bytes/edge when the library lacks list_edges (old-version safety)', () => {
    const shape = { name: 'chain-3', machine: {} };   // no list_edges (a pre-list_edges build)
    const seam  = { gc: () => {}, heapUsed: mkHeap([0, 300]) };
    const { footprints } = mem.collectMemory([shape], 100, () => ({}), () => [], seam);
    expect(footprints.get('chain-3').bytes).toBe(300);
    expect(footprints.get('chain-3').bytesPerEdge).toBeNull();   // no edges countable -> null, never a throw
  });
});

describe('countStructures', () => {
  test('counts Maps, Sets, Arrays and their total entries on an object', () => {
    const obj = {
      a: new Map([['x', 1], ['y', 2]]),
      b: new Set([1, 2, 3]),
      c: [10, 20],
      d: 'ignored',
      e: 42,
    };
    expect(mem.countStructures(obj)).toEqual({ maps: 1, sets: 1, arrays: 1, entries: 7 });
  });
});

function mkHeap(values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}
