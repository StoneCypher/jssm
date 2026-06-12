'use strict';

/**
 *  The shootout throughput suite (v2): capability-gated benny benchmarks over
 *  every conformant adapter.
 *
 *  Two benchmark families:
 *
 *  1. **Scaling** — `construct()` and `transition()` across a trimmed shape set
 *     (chain / dense / hub / messy), for every adapter (all support
 *     transition).  construct() builds from each library's idiomatic
 *     definition; transition() runs K legal steps with a per-iteration reset.
 *
 *  2. **Capability throughput** — `action()` / `guard()` / `hook()` / `data()`
 *     on each adapter's own small fixed machine, **only for adapters that
 *     declare the capability**.  These measure per-op cost of the feature, not
 *     scaling; a library that lacks a capability is skipped, never zero-scored.
 *
 *  Async adapters (`caps.async`) are awaited inside the benny case.
 *
 *  Output: `shootout.json` — `{ date, node, arch, mode, k, libs, caps,
 *  excluded, results: [{ name, ops, margin }] }`, names shaped
 *  `"<lib> <shape> <op>()"` or `"<lib> <capability>()"`.
 *
 *  Usage: `node suite.cjs [--quick]` (quick = one small shape + capabilities).
 */

const b  = require('benny');
const fs = require('fs');

const { chainShape, denseShape, hubShape, buildMessy, K } = require('./shapes.cjs');
const { ADAPTERS, EXCLUDED } = require('./adapters/index.cjs');

// Some adapters keep a live runtime for the observer/hook benchmarks (e.g.
// xstate actors), which can emit a stray event during process teardown after
// the suite is done. That is harmless to the already-written throughput
// numbers, but we log it rather than swallow it silently — and the suite
// exits cleanly via process.exit(0) once the envelope is on disk, so a
// teardown artifact never fails the run (which would block the perf_results
// publish on the instance).
process.on('unhandledRejection', (reason) => {
  console.warn('suite: ignored post-run unhandled rejection during teardown:',
    reason && reason.constructor ? reason.constructor.name : String(reason));
});

const quick = process.argv.includes('--quick');

// Trimmed shape set — enough to show the scaling shape without exploding the
// case count (15 adapters × shapes × ops must fit the instance window).
const SCALING_SHAPES = quick
  ? [chainShape(10)]
  : [chainShape(10), chainShape(1000), denseShape(50), hubShape(200), buildMessy(1000)];

const CAP_OPS = ['action', 'guard', 'hook', 'data'];

// ---------------------------------------------------------------------------
// case factories
// ---------------------------------------------------------------------------

function constructCase(adapter, shape) {
  const def = adapter.buildDefinition(shape);
  return b.add(`${adapter.name} ${shape.name} construct()`, () => {
    const m = adapter.construct(def);
    if (m === undefined || m === null) throw new Error('construct produced nothing');
  });
}

function transitionCase(adapter, shape) {
  const ctx = adapter.open(shape);
  const seq = shape.transitionSeq;
  if (adapter.caps.async) {
    return b.add(`${adapter.name} ${shape.name} transition()`, async () => {
      adapter.reset(ctx);
      for (let k = 0; k < K; ++k) await adapter.step(ctx, seq[k]);
    });
  }
  return b.add(`${adapter.name} ${shape.name} transition()`, () => {
    adapter.reset(ctx);
    for (let k = 0; k < K; ++k) adapter.step(ctx, seq[k]);
  });
}

/** Capability-throughput case: K dispatches on the adapter's small machine. */
function capabilityCase(adapter, cap) {
  const name = `${adapter.name} ${cap}()`;

  // action: cycle the three events; guard/hook/data: ping-pong b<->a.
  if (cap === 'action') {
    const ctx = adapter.openAction();
    const evs = ['go1', 'go2', 'go3'];
    return adapter.caps.async
      ? b.add(name, async () => { for (let k = 0; k < K; ++k) await adapter.stepAction(ctx, evs[k % 3]); })
      : b.add(name, ()       => { for (let k = 0; k < K; ++k)       adapter.stepAction(ctx, evs[k % 3]); });
  }

  const open = { guard: 'openGuard', hook: 'openHook', data: 'openData' }[cap];
  const stepFn = { guard: 'stepGuard', hook: 'stepHook', data: 'stepData' }[cap];
  const ctx = adapter[open]();
  const targets = ['b', 'a'];
  if (cap === 'data') {
    return adapter.caps.async
      ? b.add(name, async () => { for (let k = 0; k < K; ++k) await adapter.stepData(ctx, targets[k % 2], k); })
      : b.add(name, ()       => { for (let k = 0; k < K; ++k)       adapter.stepData(ctx, targets[k % 2], k); });
  }
  return adapter.caps.async
    ? b.add(name, async () => { for (let k = 0; k < K; ++k) await adapter[stepFn](ctx, targets[k % 2]); })
    : b.add(name, ()       => { for (let k = 0; k < K; ++k)       adapter[stepFn](ctx, targets[k % 2]); });
}

// ---------------------------------------------------------------------------
// assemble
// ---------------------------------------------------------------------------

const cases = [];
for (const adapter of ADAPTERS) {
  for (const shape of SCALING_SHAPES) {
    cases.push(constructCase(adapter, shape));
    cases.push(transitionCase(adapter, shape));
  }
  for (const cap of CAP_OPS) {
    if (adapter.caps[cap]) cases.push(capabilityCase(adapter, cap));
  }
}

const libs = {};
const caps = {};
for (const a of ADAPTERS) { libs[a.name] = a.version; caps[a.name] = a.caps; }

b.suite(
  'fsm shootout v2',
  ...cases,
  b.cycle(),
  b.complete((summary) => {
    const envelope = {
      date     : new Date().toISOString(),
      node     : process.version,
      arch     : process.arch,
      mode     : quick ? 'quick' : 'full',
      k        : K,
      libs,
      caps,
      excluded : EXCLUDED || [],
      results  : summary.results.map(r => ({ name: r.name, ops: r.ops, margin: r.margin })),
    };
    fs.writeFileSync('shootout.json', JSON.stringify(envelope, null, 2));
    console.log(`\nwrote shootout.json — ${envelope.results.length} cases across ${ADAPTERS.length} libraries`);
    // Envelope is safely on disk; exit cleanly so live adapter runtimes can't
    // turn a teardown event into a non-zero exit. Deferred a tick so benny's
    // own completion bookkeeping flushes first.
    setImmediate(() => process.exit(0));
  }),
);
