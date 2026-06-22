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
      r.footprintBytes = f.bytes;
      r.bytesPerState  = f.bytesPerState;
      r.bytesPerEdge   = f.bytesPerEdge;
    }
    if (allocs.has(r.name)) {
      r.allocBytesPerOp = allocs.get(r.name);
    }
  }
}

module.exports = { defaultSeam, measureRetainedBytes, measureAllocBytes, injectMemoryFields };
