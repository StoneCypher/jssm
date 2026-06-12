'use strict';

/**
 *  Memory runner for the shootout — the figures benny can't produce.
 *
 *  Must run under `node --expose-gc memory.cjs` so heap measurements are taken
 *  after a forced collection (otherwise uncollected garbage masks the real
 *  retained size).  Refuses to run without `global.gc`.
 *
 *  Two metrics per adapter:
 *
 *  1. **retainedBytesPerMachine** — build N machines of a fixed shape, keep
 *     them all alive in an array, force GC, and divide the heap delta by N.
 *     This is the steady-state footprint of one constructed machine — the
 *     number that matters for apps holding thousands of machines, and that
 *     nobody publishes.
 *
 *  2. **allocBytesPerTransition** — on one machine, force GC, run M
 *     transitions, and divide the heap delta by M.  Garbage generated per
 *     step predicts GC jank in UIs even when steady-state ops/sec looks fine.
 *     Reset cost is included only every cycle length, so it is amortized out
 *     by using a long run.
 *
 *  Output: `memory.json` — `{ date, node, arch, n, m, shape, results: { lib:
 *  { retainedBytesPerMachine, allocBytesPerTransition } } }`.  Published
 *  alongside `shootout.json` under the same run.
 *
 *  Usage: `node --expose-gc memory.cjs [--quick]`
 */

const fs = require('fs');

const { hubShape, K } = require('./shapes.cjs');
const { ADAPTERS } = require('./adapters/index.cjs');

if (typeof global.gc !== 'function') {
  console.error('memory.cjs requires --expose-gc:  node --expose-gc memory.cjs');
  process.exit(2);
}

const quick = process.argv.includes('--quick');
const N      = quick ? 200  : 2000;    // machines built for the retained measurement
const M      = quick ? 5000 : 50000;   // transitions for the allocation measurement
const SHAPE  = hubShape(50);           // moderate fixed topology, same for every lib

/** Settle the heap: collect a few times, then read heapUsed. */
function heapAfterGC() {
  global.gc(); global.gc(); global.gc();
  return process.memoryUsage().heapUsed;
}

async function retainedBytesPerMachine(adapter) {
  const def = adapter.buildDefinition(SHAPE);
  // Warm one machine so first-use lazy allocations (caches, prototypes) don't
  // land in the measured delta.
  adapter.construct(def);

  const before = heapAfterGC();
  const held = new Array(N);
  for (let i = 0; i < N; ++i) held[i] = adapter.construct(def);
  const after = heapAfterGC();

  // Touch the array post-measurement so the optimizer can't drop it.
  if (held[N - 1] === undefined && held[0] === undefined) throw new Error('machines collected early');
  return Math.max(0, Math.round((after - before) / N));
}

async function allocBytesPerTransition(adapter) {
  const ctx = adapter.open(SHAPE);
  const seq = SHAPE.transitionSeq;
  adapter.reset(ctx);

  const before = heapAfterGC();
  for (let k = 0; k < M; ++k) {
    const t = seq[k % K];
    if (adapter.caps.async) { await adapter.step(ctx, t); } else { adapter.step(ctx, t); }
    if ((k % K) === K - 1) adapter.reset(ctx);   // amortized; K resets over M steps
  }
  const after = heapAfterGC();
  return Math.max(0, Math.round((after - before) / M));
}

(async () => {
  const results = {};
  for (const a of ADAPTERS) {
    try {
      const retained = await retainedBytesPerMachine(a);
      const perTrans = await allocBytesPerTransition(a);
      results[a.name] = { retainedBytesPerMachine: retained, allocBytesPerTransition: perTrans };
      console.log(`${a.name.padEnd(26)} retained=${String(retained).padStart(7)} B/machine   alloc=${String(perTrans).padStart(6)} B/transition`);
    } catch (e) {
      results[a.name] = { error: e.message };
      console.log(`${a.name.padEnd(26)} ERROR: ${e.message}`);
    }
  }

  const envelope = {
    date  : new Date().toISOString(),
    node  : process.version,
    arch  : process.arch,
    n     : N,
    m     : M,
    shape : SHAPE.name,
    results,
  };
  fs.writeFileSync('memory.json', JSON.stringify(envelope, null, 2));
  console.log(`\nwrote memory.json — ${Object.keys(results).length} libraries`);
})();
