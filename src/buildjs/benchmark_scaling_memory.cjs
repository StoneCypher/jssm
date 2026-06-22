'use strict';

/**
 *  Memory & allocation measurement for the jssm scaling benchmark.  The
 *  primitives go through an injectable `{ gc, heapUsed }` seam so they are
 *  deterministic in unit tests without `--expose-gc`, and degrade to `null`
 *  (rather than crashing) when the real GC is not exposed — mirroring the
 *  harness's `--harness-from` op-gating philosophy.
 *
 *  @see src/buildjs/benchmark_scaling.cjs (the consumer)
 */

/**
 *  Default measurement seam: the real V8 GC (only present under `--expose-gc`)
 *  and the live heap-used reading.  Injected in tests so the primitives are
 *  deterministic without `--expose-gc`.
 *
 *  @returns `{ gc, heapUsed }` — `gc` is `global.gc` when exposed, else `null`.
 *
 *  @example defaultSeam().heapUsed() // => current process heapUsed in bytes
 */
function defaultSeam() {
  return {
    gc       : (typeof global.gc === 'function') ? global.gc : null,
    heapUsed : () => process.memoryUsage().heapUsed,
  };
}

/**
 *  Retained heap cost of a single constructed machine: collect garbage, read the
 *  baseline, build the machine, collect again (sweeping construction garbage so
 *  only the live machine remains), read again.  The machine stays referenced
 *  across the second collect, so the delta is its retained size.
 *
 *  @param buildMachine Thunk that constructs and returns one machine.
 *  @param seam Injectable `{ gc, heapUsed }`; defaults to {@link defaultSeam}.
 *  @returns Retained bytes, or `null` when `seam.gc` is not callable.
 *  @throws If `buildMachine` returns `undefined` (an instrument bug).
 *
 *  @example measureRetainedBytes(() => sm(['s0 -> s1;'])) // => e.g. 18452
 */
function measureRetainedBytes(buildMachine, seam = defaultSeam()) {
  if (typeof seam.gc !== 'function') { return null; }
  seam.gc();
  const base    = seam.heapUsed();
  const machine = buildMachine();
  seam.gc();
  const after   = seam.heapUsed();
  if (machine === undefined) { throw new Error('measureRetainedBytes: buildMachine returned undefined'); }
  return after - base;
}

/**
 *  Bytes allocated across one batch of work: collect, read baseline, run the
 *  batch, read again — WITHOUT a trailing collect, so transient allocations are
 *  included (this is allocation pressure, not retained size).  Divide by the
 *  batch's op count at the call site to get bytes/op.
 *
 *  @param runBatch Thunk that performs one batch of the operation under test.
 *  @param seam Injectable `{ gc, heapUsed }`; defaults to {@link defaultSeam}.
 *  @returns Allocated bytes for the batch, or `null` when `seam.gc` is not callable.
 *
 *  @example measureAllocBytes(() => { for (let i = 0; i < 100; i++) m.transition(t[i]); })
 */
function measureAllocBytes(runBatch, seam = defaultSeam()) {
  if (typeof seam.gc !== 'function') { return null; }
  seam.gc();
  const base  = seam.heapUsed();
  runBatch();
  const after = seam.heapUsed();
  return after - base;
}

/**
 *  Inject the memory metrics into a parsed `scaling.json` in place.  Footprint
 *  fields (`footprintBytes`, `bytesPerState`, `bytesPerEdge`) go on the
 *  `<shape> construct()` row for each measured shape; `allocBytesPerOp` goes on
 *  every result whose full name is a key in `allocs`.  Additive and total — rows
 *  without a measurement are left exactly as they were.
 *
 *  @param data Parsed scaling.json (`{ results: [...] }`); mutated in place.
 *  @param footprints Map of shape name -> `{ bytes, bytesPerState, bytesPerEdge }`.
 *  @param allocs Map of full result name -> bytes/op.
 *  @returns void.
 *
 *  @example injectMemoryFields(data, new Map([['chain-10', f]]), new Map())
 */
function injectMemoryFields(data, footprints, allocs) {
  for (const r of data.results) {
    const sp    = r.name.lastIndexOf(' ');
    const shape = r.name.slice(0, sp);
    const op    = r.name.slice(sp + 1);
    if (op === 'construct()' && footprints.has(shape)) {
      const f = footprints.get(shape);
      r.footprintBytes   = f.bytes;
      r.bytesPerState    = f.bytesPerState;
      r.bytesPerEdge     = f.bytesPerEdge;
      r.mapCount         = f.maps;
      r.setCount         = f.sets;
      r.arrayCount       = f.arrays;
      r.containerEntries = f.entries;
    }
    if (allocs.has(r.name)) {
      r.allocBytesPerOp = allocs.get(r.name);
    }
  }
}

/**
 *  Structural container census of a machine: how many Map / Set / Array fields it
 *  holds and their total entry count.  A direct read on the object weight that
 *  the interning + overlapping-groups work inflated — rising map/entry counts
 *  are the structural side of the per-edge byte growth.
 *
 *  @param machine Any object (a constructed machine).
 *  @returns `{ maps, sets, arrays, entries }`.
 *
 *  @example countStructures({ a: new Map([['x',1]]), b: [1,2] }) // => {maps:1,sets:0,arrays:1,entries:3}
 */
function countStructures(machine) {
  let maps = 0, sets = 0, arrays = 0, entries = 0;
  for (const v of Object.values(machine)) {
    if (v instanceof Map)      { maps++;   entries += v.size; }
    else if (v instanceof Set) { sets++;   entries += v.size; }
    else if (Array.isArray(v)) { arrays++; entries += v.length; }
  }
  return { maps, sets, arrays, entries };
}

/**
 *  Count states from a shape name like `chain-200` / `dense-50` / `messy-1000`.
 *  For structured shapes the count is the suffix N; messy shapes return `null`
 *  (their state count isn't encoded in the name), so `bytesPerState` is omitted
 *  for them.
 *
 *  @param name Shape name.
 *  @returns State count, or `null` when not derivable from the name.
 *
 *  @example statesFromName('dense-50') // => 50
 *  @example statesFromName('messy-1000') // => null
 */
function statesFromName(name) {
  const m = name.match(/-(\d+)$/);
  if (!m) { return null; }
  if (name.startsWith('messy-')) { return null; }
  return parseInt(m[1], 10);
}

/**
 *  Build footprint and per-op allocation maps for every shape.  Footprint uses a
 *  fresh machine from `rebuild(name)`; allocations use the per-op batch thunks
 *  from `opBatches(shape)`.  All measurement goes through the seam, so a missing
 *  gc yields empty maps (graceful).
 *
 *  @param shapes The shape registry (each `{ name, machine, ... }`).
 *  @param K Ops per batch (to divide alloc bytes into bytes/op).
 *  @param rebuild `(name) => machine` — constructs a fresh machine for a shape.
 *  @param opBatches `(shape) => Array<[resultName, ()=>void]>` — batch thunks to alloc-measure.
 *  @param seam Injectable `{ gc, heapUsed }`; defaults to {@link defaultSeam}.
 *  @returns `{ footprints, allocs }` ready for {@link injectMemoryFields}.
 *
 *  @example collectMemory(shapes, 100, name => sm([src(name)]), opBatches)
 */
function collectMemory(shapes, K, rebuild, opBatches, seam = defaultSeam()) {
  const footprints = new Map();
  const allocs     = new Map();
  if (typeof seam.gc !== 'function') { return { footprints, allocs }; }

  for (const shape of shapes) {
    const edges  = shape.machine.list_edges().length;
    const states = statesFromName(shape.name);
    const bytes  = measureRetainedBytes(() => rebuild(shape.name), seam);
    if (bytes !== null) {
      footprints.set(shape.name, {
        bytes,
        bytesPerState : states ? bytes / states : null,
        bytesPerEdge  : edges  ? bytes / edges  : null,
        ...countStructures(shape.machine),
      });
    }
    for (const [resultName, batch] of opBatches(shape)) {
      const a = measureAllocBytes(batch, seam);
      if (a !== null) { allocs.set(resultName, a / K); }
    }
  }
  return { footprints, allocs };
}

module.exports = { defaultSeam, measureRetainedBytes, measureAllocBytes, injectMemoryFields, collectMemory, statesFromName, countStructures };
