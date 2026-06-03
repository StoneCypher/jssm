'use strict';

const b    = require('benny');
const fs   = require('fs');   // used by loadMessyFixture (Task 4) and writeMarkdownPivot (Task 7)
const path = require('path'); // used by loadMessyFixture (Task 4) and writeMarkdownPivot (Task 7)

const jssm = require('../../dist/jssm.es5.cjs');
const sm   = jssm.sm;
const pkg  = require('../../package.json');

// ----------------------------------------------------------------------------
// Deep mode (BENNY_DEEP) — graviton_perf #675 prerequisite
// ----------------------------------------------------------------------------
//
// When BENNY_DEEP is truthy, the suite is measured more thoroughly and emits an
// ADDITIVE `msPerOp` (plus `samples`) field per result, so sub-1-ops/sec cases
// (e.g. `dense-200 construct()`) surface as a real number instead of rounding to
// `0`. Deep mode is purely additive: when BENNY_DEEP is unset the per-case
// options object is `{}` and the saved JSON envelope is byte-identical to before,
// so `benchmark_compare.cjs` and committed `scaling.json` snapshots keep working.
//
// To stay under the ~10-minute run cap, deepening is SELECTIVE — only the slow,
// sample-starved `construct()` cases get raised sample counts; the fast read-only
// cases already give tight margins at benny's default 5 samples.

const DEEP = Boolean(process.env.BENNY_DEEP);

/**
 *  Per-benny-case options object, threaded through every `b.add` call.  In
 *  normal mode this is always `{}` (preserving the legacy behavior exactly). In
 *  deep mode the slow `construct()` cases get raised `minSamples`/`maxTime` so
 *  their near-zero ops/sec collect a stable distribution; everything else stays
 *  on benny defaults so the benchmark phase stays bounded.
 *
 *  @param caseName e.g. `dense-200 construct()`.
 *  @returns A benny options object (`{}` in normal mode).
 *
 *  @example bennyOpts('chain-10 transition()') // => {} (when BENNY_DEEP unset)
 */
function bennyOpts(caseName) {
  if (!DEEP) { return {}; }
  if (caseName.endsWith('construct()')) {
    // ~1.5 s/call worst case -> a bounded maxTime keeps even dense-200 under
    // ~6 s while collecting far more than benny's default 5 samples.
    return { minSamples: 20, maxTime: 6 };
  }
  return {};
}

/**
 *  Augment the just-saved `scaling.json` with an additive per-result `msPerOp`
 *  (and `samples`) figure, computed from benny's per-case mean seconds/op.  Only
 *  runs in deep mode; in normal mode the envelope is left untouched.
 *
 *  @param summary The benny `Summary` passed to the `complete` handler, whose
 *         `results[].details.mean` is mean seconds per op and `results[].samples`
 *         is the sample count.
 *  @returns void; rewrites `benchmark/results/scaling.json` in place.
 */
function augmentDeepJson(summary) {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const byName = new Map();
  for (const r of summary.results) { byName.set(r.name, r); }

  for (const r of data.results) {
    const src = byName.get(r.name);
    if (src && src.details && typeof src.details.mean === 'number') {
      r.msPerOp = src.details.mean * 1000;   // mean is seconds/op
      r.samples = src.samples;
    }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

function writeMarkdownPivot() {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const mdPath   = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.md');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // A `ms/op` column is added ONLY when results carry msPerOp (deep mode); in
  // normal mode the markdown is byte-identical to before.
  const deep = data.results.some((r) => typeof r.msPerOp === 'number');

  // Group results by trailing operation token, e.g. "chain-10 transition()" -> op "transition()".
  const groups = new Map();
  for (const r of data.results) {
    const spaceIdx = r.name.lastIndexOf(' ');
    const shape    = r.name.slice(0, spaceIdx);
    const op       = r.name.slice(spaceIdx + 1);
    if (!groups.has(op)) groups.set(op, []);
    groups.get(op).push({ shape, ops: r.ops, msPerOp: r.msPerOp });
  }

  const lines = [];
  lines.push('# jssm scaling benchmark results');
  lines.push('');
  lines.push(`Generated: ${data.date}  `);
  lines.push(`jssm version: ${data.version}`);
  lines.push('');

  for (const [op, rows] of groups) {
    lines.push(`## ${op}`);
    lines.push('');
    if (deep) {
      lines.push('| shape       | ops/sec     | ms/op       |');
      lines.push('|-------------|------------:|------------:|');
      for (const row of rows) {
        const ms = typeof row.msPerOp === 'number' ? row.msPerOp.toPrecision(4) : '—';
        lines.push(`| ${row.shape.padEnd(11)} | ${String(row.ops).padStart(11)} | ${String(ms).padStart(11)} |`);
      }
    } else {
      lines.push('| shape       | ops/sec     |');
      lines.push('|-------------|------------:|');
      for (const row of rows) {
        lines.push(`| ${row.shape.padEnd(11)} | ${String(row.ops).padStart(11)} |`);
      }
    }
    lines.push('');
  }

  fs.writeFileSync(mdPath, lines.join('\n'));
  console.log(`wrote ${mdPath}`);
}

// ----------------------------------------------------------------------------
// Shape factories (structured topologies — deterministic from N)
// ----------------------------------------------------------------------------

function buildChainFSL(n) {
  const lines = ['allows_override: true;'];
  for (let i = 0; i < n - 1; ++i) lines.push(`s${i} -> s${i + 1};`);
  lines.push(`s${n - 1} -> s0;`);
  return lines.join('\n');
}

function buildDenseFSL(n) {
  const lines = ['allows_override: true;'];
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      if (i !== j) lines.push(`s${i} -> s${j};`);
    }
  }
  return lines.join('\n');
}

function buildHubFSL(n) {
  // s0 is the hub; every other state has edges to and from s0.
  const lines = ['allows_override: true;'];
  for (let i = 1; i < n; ++i) {
    lines.push(`s${i} -> s0;`);
    lines.push(`s0 -> s${i};`);
  }
  return lines.join('\n');
}

function buildHookedHub(n) {
  const machine = sm([buildHubFSL(n)]);
  // One per-edge hook for every edge in the hub topology.
  for (let i = 1; i < n; ++i) {
    machine.set_hook({ from: `s${i}`, to: 's0', handler: () => true, kind: 'hook' });
    machine.set_hook({ from: 's0', to: `s${i}`, handler: () => true, kind: 'hook' });
  }
  // Plus one global any-transition hook.
  machine.set_hook({ handler: () => true, kind: 'any transition' });
  return machine;
}

// ----------------------------------------------------------------------------
// Shape registry — populated below; each entry: { name, machine, transitionSeq }
// ----------------------------------------------------------------------------

const K = 100;   // per-call work, matches existing benny convention

function buildShapeChain(n) {
  const machine = sm([buildChainFSL(n)]);
  // For chain: state s_i -> s_{(i+1) mod n}.  Precompute K targets starting from s0.
  const seq = [];
  let cur = 0;
  for (let k = 0; k < K; ++k) {
    cur = (cur + 1) % n;
    seq.push(`s${cur}`);
  }
  const edgePairs = [];
  for (let k = 0; k < K; ++k) {
    const i = k % n;
    const j = (i + 1) % n;
    edgePairs.push([`s${i}`, `s${j}`]);
  }
  return { name: `chain-${n}`, machine, transitionSeq: seq, edgePairs };
}

function buildShapeDense(n) {
  const machine = sm([buildDenseFSL(n)]);
  // For dense: every (i, j) i!=j is valid.  Walk forward by 1 mod n for K steps from s0.
  const seq = [];
  let cur = 0;
  for (let k = 0; k < K; ++k) {
    cur = (cur + 1) % n;
    seq.push(`s${cur}`);
  }
  const edgePairs = [];
  for (let k = 0; k < K; ++k) {
    const i = k % n;
    const j = (i + 1) % n;
    edgePairs.push([`s${i}`, `s${j}`]);
  }
  return { name: `dense-${n}`, machine, transitionSeq: seq, edgePairs };
}

function buildHubTraversal(n) {
  const seq = [];
  let spoke = 1;
  for (let k = 0; k < K; ++k) {
    if (k % 2 === 0) {
      seq.push(`s${spoke}`);                       // hub -> spoke
    } else {
      seq.push('s0');                              // spoke -> hub
      spoke = (spoke % (n - 1)) + 1;               // next time pick a new spoke
    }
  }
  return seq;
}

function buildHubEdgePairs(n) {
  const pairs = [];
  let spoke = 1;
  for (let k = 0; k < K; ++k) {
    if (k % 2 === 0) {
      pairs.push(['s0', `s${spoke}`]);
    } else {
      pairs.push([`s${spoke}`, 's0']);
      spoke = (spoke % (n - 1)) + 1;
    }
  }
  return pairs;
}

function buildShapeHub(n) {
  const machine = sm([buildHubFSL(n)]);
  return { name: `hub-${n}`, machine, transitionSeq: buildHubTraversal(n), edgePairs: buildHubEdgePairs(n) };
}

function buildShapeHookedHub(n) {
  const machine = buildHookedHub(n);
  return { name: `hooked-${n}`, machine, transitionSeq: buildHubTraversal(n), edgePairs: buildHubEdgePairs(n) };
}

function loadMessyFixture(n) {
  const file = path.join(__dirname, '..', '..', 'benchmark', 'fixtures', `messy-${n}.fsl`);
  // Prepend allows_override:true so the per-iteration reset works, matching the structured
  // shapes. The fixture files themselves are frozen and don't carry this directive.
  return 'allows_override: true;\n' + fs.readFileSync(file, 'utf8');
}

function buildShapeMessy(n) {
  const machine = sm([loadMessyFixture(n)]);
  // For messy: not every (from, to) is valid. Walk by following whatever transitions are
  // available from the current state. Precompute by simulating.
  const seq = [];
  const edgePairs = [];
  let cur = 's0';
  for (let k = 0; k < K; ++k) {
    const exits = machine.list_exits(cur);
    if (exits.length === 0) {
      // Dead end - reset to s0 and continue.
      cur = 's0';
      seq.push('s0');
      edgePairs.push(['s0', 's0']);   // self-pair for dead-end steps; edges_between will just return []
      continue;
    }
    const next = exits[0];
    seq.push(next);
    edgePairs.push([cur, next]);
    cur = next;
  }
  machine.override('s0');
  return { name: `messy-${n}`, machine, transitionSeq: seq, edgePairs };
}

const shapes = [
  buildShapeChain(10),
  buildShapeChain(50),
  buildShapeChain(200),
  buildShapeChain(1000),
  buildShapeDense(10),
  buildShapeDense(50),
  buildShapeDense(200),
  buildShapeHub(50),
  buildShapeHub(200),
  buildShapeHookedHub(200),
  buildShapeMessy(1000),
  buildShapeMessy(5000),
];

// ----------------------------------------------------------------------------
// Benny case factory
// ----------------------------------------------------------------------------

function transitionCase(shape) {
  const name = `${shape.name} transition()`;
  return b.add(name, () => {
    // Reset to s0 each iteration so the precomputed transitionSeq stays valid across
    // shapes whose cycle length doesn't divide K (chain-200, hub-N, messy-N, ...).
    // The override adds ~1% to per-iteration time for transition()-style cases; it
    // is omitted for read-only cases (edges_between, has_state) that don't mutate state.
    shape.machine.override('s0');
    for (let k = 0; k < K; ++k) shape.machine.transition(shape.transitionSeq[k]);
  }, bennyOpts(name));
}

function edgesBetweenCase(shape) {
  const name = `${shape.name} edges_between()`;
  return b.add(name, () => {
    for (let k = 0; k < K; ++k) {
      const [f, t] = shape.edgePairs[k];
      shape.machine.edges_between(f, t);
    }
  }, bennyOpts(name));
}

function hasStateCase(shape) {
  const name = `${shape.name} has_state()`;
  // Use the transition targets as the state list to probe - they're real states.
  return b.add(name, () => {
    for (let k = 0; k < K; ++k) shape.machine.has_state(shape.transitionSeq[k]);
  }, bennyOpts(name));
}

function constructionCase(shape) {
  // Re-derive the FSL source for each shape at registration time, then time only
  // sm`...` in the inner loop so we measure full parse + build, including the
  // FSL grammar pass. For hooked-* we time the underlying hub build, not the hook
  // attachments — hook setup cost is implicit in the hooked shape's transition()
  // measurement, and this case is intentionally a parse-cost probe.
  let source;
  switch (true) {
    case shape.name.startsWith('chain-'):  source = buildChainFSL(parseInt(shape.name.slice(6), 10)); break;
    case shape.name.startsWith('dense-'):  source = buildDenseFSL(parseInt(shape.name.slice(6), 10)); break;
    case shape.name.startsWith('hub-'):    source = buildHubFSL(parseInt(shape.name.slice(4), 10));   break;
    case shape.name.startsWith('hooked-'): source = buildHubFSL(parseInt(shape.name.slice(7), 10));   break;
    case shape.name.startsWith('messy-'):  source = loadMessyFixture(parseInt(shape.name.slice(6), 10)); break;
    default: throw new Error(`unknown shape: ${shape.name}`);
  }
  const name = `${shape.name} construct()`;
  return b.add(name, () => {
    const m = sm([source]);
    if (m === undefined) throw 'not defined!';   // prevent tree-shaking
  }, bennyOpts(name));
}

// NOTE: action() is deliberately deferred from this scaling suite. Adding it would require
// giving every edge in chain/dense/hub a named action, which is a topology choice that
// would invalidate trend continuity if the naming convention later changes. Pick it up in
// a follow-up if action() turns out to be on a hot path the scaling diagnostic should cover.

// ----------------------------------------------------------------------------
// Suite
// ----------------------------------------------------------------------------

b.suite(
  'jssm scaling diagnostic suite',
  ...shapes.map(transitionCase),
  ...shapes.map(edgesBetweenCase),
  ...shapes.map(hasStateCase),
  ...shapes.map(constructionCase),
  b.cycle(),
  b.complete((summary) => {
    // benny writes scaling.json synchronously during the b.save calls below in this
    // suite's argument list. Defer with setImmediate so the post-save steps run
    // after the save side-effects flush. If a future benny upgrade changes save
    // ordering, swap to .then(...) on the b.suite() return value.
    setImmediate(() => {
      // Deep mode: inject the additive msPerOp/samples fields into the saved
      // JSON before the markdown writer reads it, so the ms/op column appears.
      if (DEEP) { augmentDeepJson(summary); }
      writeMarkdownPivot();
    });
  }),
  b.save({ file: 'scaling', version: pkg.version }),
  b.save({ file: 'scaling', format: 'chart.html' }),
);
