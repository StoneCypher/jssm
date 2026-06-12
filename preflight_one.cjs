'use strict';

/**
 *  Single (library, shape) feasibility probe, run as a **child process** so the
 *  parent can enforce a hard wall-clock ceiling with a kill — a synchronous
 *  construct() that never returns cannot be interrupted by an in-process timer,
 *  so isolation in a killable child is the only way to time a competitor out.
 *
 *  Constructs one machine of the shape via the adapter's idiomatic path, then
 *  runs a short transition burst. On success prints `OK construct=<ms>` and
 *  exits 0. On any throw prints `ERR <message>` and exits 1. If it hangs, the
 *  parent's timeout kills it (no exit, no output) — which the parent reads as
 *  `timeout`.
 *
 *  Usage (invoked by suite.cjs): `node preflight_one.cjs <adapterName> <shapeName>`
 */

const { ADAPTERS } = require('./adapters/index.cjs');
const { chainShape, denseShape, hubShape, buildMessy, K } = require('./shapes.cjs');

const [, , adapterName, shapeName] = process.argv;

function shapeByName(name) {
  const dash = name.lastIndexOf('-');
  const kind = name.slice(0, dash);
  const n    = parseInt(name.slice(dash + 1), 10);
  switch (kind) {
    case 'chain': return chainShape(n);
    case 'dense': return denseShape(n);
    case 'hub':   return hubShape(n);
    case 'messy': return buildMessy(n);
    default: throw new Error(`unknown shape kind: ${kind}`);
  }
}

(async () => {
  const adapter = ADAPTERS.find(a => a.name === adapterName);
  if (!adapter) { console.log(`ERR no adapter ${adapterName}`); process.exit(1); }

  try {
    const shape = shapeByName(shapeName);
    const def   = adapter.buildDefinition(shape);

    const t0 = process.hrtime.bigint();
    const m  = adapter.construct(def);
    const constructMs = Number(process.hrtime.bigint() - t0) / 1e6;
    if (m === undefined || m === null) throw new Error('construct produced nothing');

    // A short transition burst to confirm the constructed machine actually steps.
    const ctx = adapter.open(shape);
    adapter.reset(ctx);
    for (let k = 0; k < K; ++k) {
      const r = adapter.step(ctx, shape.transitionSeq[k]);
      if (adapter.caps.async) await r;
    }

    console.log(`OK construct=${constructMs.toFixed(2)}`);
    process.exit(0);
  } catch (e) {
    console.log(`ERR ${String(e && e.message || e).slice(0, 120)}`);
    process.exit(1);
  }
})();
