'use strict';

const b    = require('benny');
const fs   = require('fs');   // used by loadMessyFixture (Task 4) and writeMarkdownPivot (Task 7)
const path = require('path'); // used by loadMessyFixture (Task 4) and writeMarkdownPivot (Task 7)

const jssm = require('../../dist/jssm.es5.cjs');
const sm   = jssm.sm;
const pkg  = require('../../package.json');
const plan = require('./benchmark_scaling_plan.cjs');
const memory = require('./benchmark_scaling_memory.cjs');
const exponents = require('./benchmark_scaling_exponents.cjs');
const bundleSize = require('./benchmark_bundle_size.cjs');
const latency = require('./benchmark_scaling_latency.cjs');
const gc = require('./benchmark_gc.cjs');
const timing = require('./benchmark_timing.cjs');
const load = require('./benchmark_load.cjs');

// ----------------------------------------------------------------------------
// Deep mode (BENNY_DEEP) — graviton_perf #675 prerequisite
// ----------------------------------------------------------------------------
//
// When BENNY_DEEP is truthy, the suite is measured more thoroughly and emits an
// ADDITIVE `msPerOp` (plus `samples`) field per result, so sub-1-ops/sec cases
// (e.g. `dense-200 construct()`) surface as a real number instead of rounding to
// `0`. Deep mode is purely additive on top of the normal result set: when
// BENNY_DEEP is unset the per-case options object is `{}` and the saved JSON
// omits the deep-only `msPerOp` / `samples` fields.
//
// To stay under the ~10-minute run cap, deepening is SELECTIVE — only the slow,
// sample-starved `construct()` cases get raised sample counts; the fast read-only
// cases already give tight margins at benny's default 5 samples.

const DEEP = Boolean(process.env.BENNY_DEEP);

/**
 *  Per-benny-case options object, threaded through every `b.add` call.  In
 *  normal mode this is always `{}`. In
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

/**
 *  Normalize the mutating-op rows (`transition()`, `action()`) to per-transition
 *  throughput.  Those cases run a closed walk of `stepCount` ops per benny
 *  iteration, so benny measures laps/sec; multiplying `ops` by `stepCount` (and
 *  dividing any deep-mode `msPerOp` by it) converts to transitions/sec, keeping
 *  shapes with different lap lengths comparable.  Read-only ops do a fixed `K`
 *  calls per iteration and are left untouched.  Runs before the exponent/memory
 *  passes so every downstream consumer reads the normalized `ops`.
 *
 *  @returns void; rewrites `benchmark/results/scaling.json` in place.
 */
function normalizePass() {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const stepByName = new Map();
  for (const shape of shapes) {
    if (shape.transitionWalk) { stepByName.set(`${shape.name} transition()`, shape.transitionWalk.stepCount); }
    if (shape.actionWalk)     { stepByName.set(`${shape.name} action()`,     shape.actionWalk.stepCount); }
  }

  for (const r of data.results) {
    const steps = stepByName.get(r.name);
    if (steps) {
      r.ops = perTransition(r.ops, steps);
      if (typeof r.msPerOp === 'number') { r.msPerOp = r.msPerOp / steps; }
    }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

function writeMarkdownPivot() {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const mdPath   = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.md');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // A `ms/op` column is added ONLY when results carry msPerOp (deep mode); in
  // normal mode the markdown omits that column.
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
// FSL generators live in ./benchmark_scaling_shapes.cjs so they stay unit-testable.
// ----------------------------------------------------------------------------

const { buildChainFSL, buildDenseFSL, buildHubFSL, closedWalk, perTransition } = require('./benchmark_scaling_shapes.cjs');

function installHubHooks(machine, n) {
  // One per-edge hook for every edge in the hub topology.
  for (let i = 1; i < n; ++i) {
    machine.set_hook({ from: `s${i}`, to: 's0', handler: () => true, kind: 'hook' });
    machine.set_hook({ from: 's0', to: `s${i}`, handler: () => true, kind: 'hook' });
  }
  // Plus one global any-transition hook.
  machine.set_hook({ handler: () => true, kind: 'any transition' });
  return machine;
}

function buildHookedHub(n) {
  return installHubHooks(sm([buildHubFSL(n)]), n);
}

// ----------------------------------------------------------------------------
// Shape registry — populated below; each entry carries the base machine and
// precomputed transition probes, plus action probes when that overlay is safe.
// ----------------------------------------------------------------------------

const K = 100;   // per-call work, matches existing benny convention

function edgePairKey(from, to) {
  return `${from}\u0000${to}`;
}

function arrowForEdge(edge) {
  if (edge.forced_only || edge.kind === 'forced') { return '~>'; }
  if (edge.main_path   || edge.kind === 'main')   { return '=>'; }
  return '->';
}

function attachActionSupport(shape, decorateActionMachine) {
  if (typeof shape.machine.list_edges !== 'function') { return shape; }

  const labelsByPair = new Map();
  const lines        = ['allows_override: true;'];
  let actionId       = 0;

  for (const edge of shape.machine.list_edges()) {
    const label = `act_${actionId++}`;
    labelsByPair.set(edgePairKey(edge.from, edge.to), label);
    lines.push(`${edge.from} '${label}' ${arrowForEdge(edge)} ${edge.to};`);
  }

  const actionSeq    = [];
  const actionStates = [];
  for (const [from, to] of shape.edgePairs) {
    const label = labelsByPair.get(edgePairKey(from, to));
    if (label === undefined) { return shape; }
    actionSeq.push(label);
    actionStates.push(from);
  }

  const actionMachine = sm([lines.join('\n')]);
  if (decorateActionMachine) { decorateActionMachine(actionMachine); }

  // Instrument integrity: every action benchmark must measure successful
  // dispatch, not the cheap rejected-action path.
  actionMachine.override('s0');
  for (let k = 0; k < K; ++k) {
    if (actionMachine.action(actionSeq[k]) !== true) {
      throw new Error(`instrument bug: ${shape.name} action() failed at step ${k}`);
    }
  }
  actionMachine.override('s0');

  return { ...shape, actionMachine, actionSeq, actionStates };
}

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
  return attachActionSupport({ name: `chain-${n}`, machine, transitionSeq: seq, edgePairs, transitionWalk: closedWalk('chain', n, K) });
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
  return attachActionSupport({ name: `dense-${n}`, machine, transitionSeq: seq, edgePairs, transitionWalk: closedWalk('dense', n, K) });
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
  return attachActionSupport({ name: `hub-${n}`, machine, transitionSeq: buildHubTraversal(n), edgePairs: buildHubEdgePairs(n), transitionWalk: closedWalk('hub', n, K) });
}

function buildShapeHookedHub(n) {
  const machine = buildHookedHub(n);
  return attachActionSupport(
    { name: `hooked-${n}`, machine, transitionSeq: buildHubTraversal(n), edgePairs: buildHubEdgePairs(n), transitionWalk: closedWalk('hub', n, K) },
    (actionMachine) => installHubHooks(actionMachine, n)
  );
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

/**
 * Map a planned shape name back to its builder, so the shape registry can be driven
 * by {@link plan.plannedShapeNames}: feature-gated shapes (hooked-*, messy-*) are
 * only built when the library under test supports the ops they need.
 */
function buildShapeByName(name) {
  if (name.startsWith('chain-'))  return buildShapeChain(parseInt(name.slice(6), 10));
  if (name.startsWith('dense-'))  return buildShapeDense(parseInt(name.slice(6), 10));
  if (name.startsWith('hub-'))    return buildShapeHub(parseInt(name.slice(4), 10));
  if (name.startsWith('hooked-')) return buildShapeHookedHub(parseInt(name.slice(7), 10));
  if (name.startsWith('messy-'))  return buildShapeMessy(parseInt(name.slice(6), 10));
  throw new Error(`unknown shape: ${name}`);
}

// Feature-detect the optional operations so an older library — e.g. one benchmarked
// via the graviton runner's `--harness-from` overlay — degrades to a partial suite
// instead of crashing on a method it doesn't have yet. With a current build every
// flag is true and the suite includes every planned column.
// Bare FSL only (no allows_override config) so the probe itself parses on pre-5.86
// engines — otherwise the very degradation framework it drives would crash here.
const probe = sm(['s0 -> s1;']);
const HAS   = {
  set_hook               : typeof probe.set_hook               === 'function',
  list_exits             : typeof probe.list_exits             === 'function',
  action                 : typeof probe.action                 === 'function',
  edges_between          : typeof probe.edges_between          === 'function',
  has_state              : typeof probe.has_state              === 'function',
  list_exit_actions      : typeof probe.list_exit_actions      === 'function',
  probable_action_exits  : typeof probe.probable_action_exits  === 'function',
};

const shapes = plan.plannedShapeNames(HAS).map(buildShapeByName);

// ----------------------------------------------------------------------------
// Benny case factory
// ----------------------------------------------------------------------------

function transitionCase(shape) {
  // Drive the shape's closed walk: a whole number of laps that returns to the start
  // state, so continuous replay across benny iterations stays legal with no
  // override() reset. Shapes with no closed transition walk (e.g. a messy fixture
  // whose s0 has no cycle) carry no transitionWalk and are skipped here.
  const w = shape.transitionWalk;
  if (!w) { return null; }
  const name = `${shape.name} transition()`;
  return b.add(name, () => {
    for (let k = 0; k < w.stepCount; ++k) shape.machine.transition(w.targets[k]);
  }, bennyOpts(name));
}

function actionCase(shape) {
  if (!shape.actionMachine) { return null; }
  const name = `${shape.name} action()`;
  return b.add(name, () => {
    shape.actionMachine.override('s0');
    for (let k = 0; k < K; ++k) shape.actionMachine.action(shape.actionSeq[k]);
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

function listExitActionsCase(shape) {
  if (!shape.actionMachine) { return null; }
  const name = `${shape.name} list_exit_actions()`;
  return b.add(name, () => {
    for (let k = 0; k < K; ++k) shape.actionMachine.list_exit_actions(shape.actionStates[k]);
  }, bennyOpts(name));
}

function probableActionExitsCase(shape) {
  if (!shape.actionMachine) { return null; }
  const name = `${shape.name} probable_action_exits()`;
  return b.add(name, () => {
    for (let k = 0; k < K; ++k) shape.actionMachine.probable_action_exits(shape.actionStates[k]);
  }, bennyOpts(name));
}

/**
 * Map a shape name to its FSL source string. Shared by constructionCase (parse
 * cost) and the memory pass (footprint rebuild) so the derivation lives once.
 */
function sourceForShape(name) {
  if (name.startsWith('chain-'))  return buildChainFSL(parseInt(name.slice(6), 10));
  if (name.startsWith('dense-'))  return buildDenseFSL(parseInt(name.slice(6), 10));
  if (name.startsWith('hub-'))    return buildHubFSL(parseInt(name.slice(4), 10));
  if (name.startsWith('hooked-')) return buildHubFSL(parseInt(name.slice(7), 10));
  if (name.startsWith('messy-'))  return loadMessyFixture(parseInt(name.slice(6), 10));
  throw new Error(`unknown shape: ${name}`);
}

function constructionCase(shape) {
  // Re-derive the FSL source for each shape at registration time, then time only
  // sm`...` in the inner loop so we measure full parse + build, including the
  // FSL grammar pass. For hooked-* we time the underlying hub build, not the hook
  // attachments — hook setup cost is implicit in the hooked shape's transition()
  // measurement, and this case is intentionally a parse-cost probe.
  const source = sourceForShape(shape.name);
  const name   = `${shape.name} construct()`;
  return b.add(name, () => {
    const m = sm([source]);
    if (m === undefined) throw 'not defined!';   // prevent tree-shaking
  }, bennyOpts(name));
}

// ----------------------------------------------------------------------------
// Suite
// ----------------------------------------------------------------------------

/** Case factories keyed by the operation token used in {@link plan.plannedCaseKinds}. */
const CASE_FACTORIES = {
  'transition()'              : transitionCase,
  'action()'                  : actionCase,
  'edges_between()'           : edgesBetweenCase,
  'has_state()'               : hasStateCase,
  'list_exit_actions()'       : listExitActionsCase,
  'probable_action_exits()'   : probableActionExitsCase,
  'construct()'               : constructionCase,
};

function casesForKind(kind) {
  return shapes.map(CASE_FACTORIES[kind]).filter(Boolean);
}

/**
 *  Re-measure every shape's footprint and per-op allocation after the timing
 *  suite, and inject the additive fields into the saved scaling.json. Uses a
 *  fresh machine per footprint (via sourceForShape) and the same K-batch shape
 *  as the timing cases. Requires `--expose-gc`; without it collectMemory returns
 *  empty maps and the JSON is left untouched.
 */
function memoryPass() {
  const rebuild   = (name) => sm([sourceForShape(name)]);
  const opBatches = (shape) => {
    const out = [];
    if (shape.transitionWalk) {
      const w = shape.transitionWalk;
      // Full closed walk (returns to s0) so the next batch starts legal, override-free;
      // divides by its own stepCount, not K, since the lap length varies by shape.
      out.push([`${shape.name} transition()`, () => {
        for (let k = 0; k < w.stepCount; ++k) shape.machine.transition(w.targets[k]);
      }, w.stepCount]);
    }
    if (HAS.edges_between) {
      out.push([`${shape.name} edges_between()`, () => {
        for (let k = 0; k < K; ++k) { const [f, t] = shape.edgePairs[k]; shape.machine.edges_between(f, t); }
      }]);
    }
    if (HAS.has_state) {
      out.push([`${shape.name} has_state()`, () => {
        for (let k = 0; k < K; ++k) shape.machine.has_state(shape.transitionSeq[k]);
      }]);
    }
    if (shape.actionMachine && HAS.action) {
      out.push([`${shape.name} action()`, () => {
        shape.actionMachine.override('s0');
        for (let k = 0; k < K; ++k) shape.actionMachine.action(shape.actionSeq[k]);
      }]);
    }
    if (shape.actionMachine && HAS.list_exit_actions) {
      out.push([`${shape.name} list_exit_actions()`, () => {
        for (let k = 0; k < K; ++k) shape.actionMachine.list_exit_actions(shape.actionStates[k]);
      }]);
    }
    if (shape.actionMachine && HAS.probable_action_exits) {
      out.push([`${shape.name} probable_action_exits()`, () => {
        for (let k = 0; k < K; ++k) shape.actionMachine.probable_action_exits(shape.actionStates[k]);
      }]);
    }
    return out;
  };
  const { footprints, allocs } = memory.collectMemory(shapes, K, rebuild, opBatches);
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  memory.injectMemoryFields(data, footprints, allocs);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

/**
 *  Compute the per-op/family scaling exponents from the saved ops and write them
 *  to scaling.json as an additive `exponents` block. Pure post-processing — runs
 *  every time (no gc needed), unlike the memory pass.
 */
function exponentsPass() {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  data.exponents = exponents.computeExponents(data.results);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

/**
 *  Measure the published dist bundles (raw/gzip/brotli) and write them to
 *  scaling.json as an additive `bundles` block. Pure file sizing — no benny, no
 *  gc; tracks package weight per release.
 */
function bundlesPass() {
  const dist     = (f) => path.join(__dirname, '..', '..', 'dist', f);
  const files    = [dist('jssm.es5.cjs'), dist('jssm.es6.mjs'), dist('jssm.es5.iife.js')];
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  data.bundles   = bundleSize.collectBundleSizes(files);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

/**
 *  Inject the per-op latency spread (min/median/max ms) from the benny summary
 *  into scaling.json. Runs always — the spread is meaningful even at the default
 *  sample count, since the max captures the worst (tail) sample.
 */
function latencyPass(summary) {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  latency.injectLatency(data, summary);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

/** Parse-vs-construct split: median time of jssm.parse vs full sm per shape (hrtime). */
function parsePass() {
  if (typeof jssm.parse !== 'function') { return; }   // pre-`parse`-export library: skip the split, don't crash
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const byName   = new Map(data.results.map((r) => [r.name, r]));
  const ns       = () => Number(process.hrtime.bigint());
  for (const shape of shapes) {
    const source = sourceForShape(shape.name);
    const p = [], c = [];
    for (let i = 0; i < 5; ++i) {
      let t = ns(); jssm.parse(source); p.push((ns() - t) / 1e6);
      t = ns();     sm([source]);       c.push((ns() - t) / 1e6);
    }
    const split = timing.splitBuild(timing.median(p), timing.median(c));
    const row   = byName.get(`${shape.name} construct()`);
    if (row) { row.parseMs = split.parseMs; row.constructMs = split.constructMs; row.buildMs = split.buildMs; }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

/** Warmup: cold (first batch) vs warm (median of rest) transition batch times per shape. */
function warmupPass() {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const byName   = new Map(data.results.map((r) => [r.name, r]));
  const ns       = () => Number(process.hrtime.bigint());
  for (const shape of shapes) {
    const walk = shape.transitionWalk;
    if (!walk) { continue; }   // no closed transition walk -> no warmup row (matches transitionCase)
    const batches = [];
    for (let i = 0; i < 6; ++i) {
      // Full closed walk per batch returns to s0, so the next batch starts legal with no
      // override() reset. coldMs/warmMs are per-walk diagnostics; warmupRatio is
      // batch-size-independent (cold ÷ warm).
      const t = ns();
      for (let k = 0; k < walk.stepCount; ++k) shape.machine.transition(walk.targets[k]);
      batches.push((ns() - t) / 1e6);
    }
    const w   = timing.summarizeWarmup(batches);
    const row = byName.get(`${shape.name} transition()`);
    if (row) { row.coldMs = w.coldMs; row.warmMs = w.warmMs; row.warmupRatio = w.warmupRatio; }
  }
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

/** Cold bundle load time -> scaling.json `loadMs` (fresh-process require). */
function loadPass() {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  data.loadMs    = load.measureLoadMs(path.join(__dirname, '..', '..', 'dist', 'jssm.es5.cjs'));
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

/** Total GC pause/count observed across the whole run -> scaling.json `gc`. */
function gcPass() {
  const jsonPath = path.join(__dirname, '..', '..', 'benchmark', 'results', 'scaling.json');
  const data     = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  data.gc        = gcTracker.stop();
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

// Observe GC for the whole run (the suite below); gcPass() stops + records it.
const gcTracker = gc.createGcTracker();

b.suite(
  'jssm scaling diagnostic suite',
  ...plan.plannedCaseKinds(HAS).flatMap(casesForKind),
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
      normalizePass();   // per-transition normalization before exponents/memory read ops
      memoryPass();
      exponentsPass();
      bundlesPass();
      latencyPass(summary);
      parsePass();
      warmupPass();
      loadPass();
      gcPass();
      writeMarkdownPivot();
    });
  }),
  b.save({ file: 'scaling', version: pkg.version }),
  b.save({ file: 'scaling', format: 'chart.html' }),
);
