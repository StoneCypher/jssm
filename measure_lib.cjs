'use strict';

/**
 *  Per-library measurement worker for the cached shootout pipeline.
 *
 *  Measures ONE library across every dimension and writes its result to
 *  `data/<host>/<lib-slug>.json`, **progressively** — the file is rewritten
 *  after each shape completes, so if the parent kills this worker for hanging
 *  on a large machine, the cheaper shapes measured before it survive (and the
 *  missing ones are read by the orchestrator as `timeout`).  Shapes are run
 *  cheapest-first so a hang costs only the largest ones.
 *
 *  Run with `--expose-gc` (the parent supplies it) so the retained-memory
 *  measurement can force collection.  Self-contained: throughput is a bounded
 *  timing loop, not benny, so each library measures independently and can be
 *  cached by version.
 *
 *  Usage: `node --expose-gc measure_lib.cjs <libName>`
 *  Env:   SHOOTOUT_HOST (default `local-<arch>`) — keys the cache by host,
 *         since throughput/memory are host-dependent.
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { ADAPTERS } = require('./adapters/index.cjs');
const { chainShape, denseShape, hubShape, buildMessy, K } = require('./shapes.cjs');

const libName = process.argv[2];
const HOST    = process.env.SHOOTOUT_HOST || `local-${process.arch}`;

const adapter = ADAPTERS.find(a => a.name === libName);
if (!adapter) { console.error(`no adapter ${libName}`); process.exit(2); }

// Shapes cheapest-first: a hang on a big one loses only the big ones.
const SHAPES = [
  chainShape(10), hubShape(50), denseShape(10), chainShape(200), denseShape(50),
  hubShape(200), chainShape(1000), buildMessy(1000), denseShape(200), buildMessy(5000),
];

function slug(name) { return name.replace(/[^a-z0-9._-]/gi, '-'); }
const outDir  = path.join(__dirname, 'data', HOST);
const outPath = path.join(outDir, slug(libName) + '.json');
fs.mkdirSync(outDir, { recursive: true });

const result = {
  name: libName, version: adapter.version, host: HOST,
  measuredAt: new Date().toISOString(), caps: adapter.caps,
  static: null, behavior: null, memory: null, shapes: {}, capabilityOps: {},
};
function flush() { fs.writeFileSync(outPath, JSON.stringify(result, null, 2)); }

// --- timing primitive: ops/sec of `fn` over a bounded window ------------------
function opsPerSec(fn, warmupMs = 40, runMs = 350) {
  let t = Date.now();
  while (Date.now() - t < warmupMs) fn();
  let ops = 0;
  t = Date.now();
  let elapsed;
  do { fn(); ops++; elapsed = Date.now() - t; } while (elapsed < runMs);
  return Math.round((ops * 1000) / elapsed);
}

// --- static (filesystem + cold start) ----------------------------------------
function measureStatic() {
  const dir = path.join(__dirname, 'node_modules', ...libName.split('/'));
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); } catch {}
  const dirSize = (d) => { let t = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name); if (e.isDirectory()) t += dirSize(f); else if (e.isFile()) { try { t += fs.statSync(f).size; } catch {} } } return t; };
  const hasExportTypes = pkg.exports && JSON.stringify(pkg.exports).includes('"types"');
  const dts = (() => { try { return fs.readdirSync(dir).some(f => f.endsWith('.d.ts')); } catch { return false; } })();
  const hasESM = Boolean(pkg.module) || (pkg.exports && JSON.stringify(pkg.exports).includes('import')) || pkg.type === 'module';
  const hasCJS = Boolean(pkg.main) || (pkg.exports && JSON.stringify(pkg.exports).includes('require')) || (!pkg.module && !pkg.exports);
  const s = pkg.scripts || {};
  let coldStartMs = null;
  try {
    const samples = [];
    for (let i = 0; i < 3; ++i) {
      const out = execFileSync(process.execPath, ['-e', `const t=process.hrtime.bigint();require(${JSON.stringify(libName)});process.stdout.write(String(Number(process.hrtime.bigint()-t)/1e6));`],
        { cwd: __dirname, encoding: 'utf8', timeout: 15000 });
      const ms = parseFloat(out); if (!Number.isNaN(ms)) samples.push(ms);
    }
    if (samples.length) { samples.sort((a, b) => a - b); coldStartMs = Math.round(samples[Math.floor(samples.length / 2)] * 100) / 100; }
  } catch {}
  return {
    installSizeKB: Math.round(dirSize(dir) / 1024),
    directDeps: Object.keys(pkg.dependencies || {}).length,
    types: (pkg.types || pkg.typings || hasExportTypes || dts) ? 'bundled' : 'none',
    modules: hasESM && hasCJS ? 'dual' : hasESM ? 'esm' : 'cjs',
    postinstall: (s.postinstall || s.install || s.preinstall) ? 'yes' : 'no',
    coldStartMs,
    ...measurePublishes(),
  };
}

// Release cadence: count published versions in the last 6 months / 2 years
// from npm's per-version timestamps. A maintenance signal the grid grades.
function measurePublishes() {
  try {
    const out = execFileSync('npm', ['view', libName, 'time', '--json'],
      { cwd: __dirname, encoding: 'utf8', timeout: 20000, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'ignore'] });
    const time = JSON.parse(out);
    const now = Date.now(), sixMo = now - 182 * 864e5, twoYr = now - 730 * 864e5;
    let p6 = 0, p2 = 0, last = null;
    for (const [v, iso] of Object.entries(time)) {
      if (v === 'created' || v === 'modified') continue;
      const t = new Date(iso).getTime(); if (Number.isNaN(t)) continue;
      if (t >= sixMo) p6++;
      if (t >= twoYr) p2++;
      if (!last || t > new Date(last).getTime()) last = iso;
    }
    return { publishes6mo: p6, publishes2yr: p2, lastPublishISO: last, publishCheckedAt: new Date().toISOString() };
  } catch { return {}; }
}

// --- behavior (categorical) ---------------------------------------------------
function measureBehavior() {
  const out = {};
  // illegal transition
  try {
    const ctx = adapter.open(chainShape(3)); const from = ctx.now();
    let threw = null, ret; try { ret = adapter.step(ctx, 's2'); } catch (e) { threw = e; }
    const after = ctx.now();
    if (threw) { const msg = String(threw.message || threw); out.illegalTransition = { category: (msg.includes('s2') || msg.includes(from)) ? 'throws-with-state-names' : 'throws', note: msg.slice(0, 100) }; }
    else if (after !== from) out.illegalTransition = { category: 'corrupts', note: `moved ${from} -> ${after} with no edge` };
    else if (ret === false) out.illegalTransition = { category: 'returns-false' };
    else out.illegalTransition = { category: 'noop', note: `returned ${JSON.stringify(ret)}` };
  } catch (e) { out.illegalTransition = { category: 'construct-threw', note: e.message.slice(0, 80) }; }
  // self transition
  try {
    const shape = { name: 'self', start: 'a', edges: [{ from: 'a', to: 'a' }, { from: 'a', to: 'b' }, { from: 'b', to: 'a' }], transitionSeq: ['a'], fsl: 'allows_override: true;\na -> a;\na -> b;\nb -> a;' };
    const ctx = adapter.open(shape); if (adapter.caps.async) out.selfTransition = { category: 'skipped-async' }; else { adapter.step(ctx, 'a'); out.selfTransition = { category: ctx.now() === 'a' ? 'works' : 'no-op' }; }
  } catch (e) { out.selfTransition = { category: 'throws', note: e.message.slice(0, 80) }; }
  // hostile names
  try {
    const shape = { name: 'hostile', start: '__proto__', edges: [{ from: '__proto__', to: 'constructor' }, { from: 'constructor', to: '__proto__' }], transitionSeq: ['constructor'], fsl: 'allows_override: true;\n"__proto__" -> "constructor";\n"constructor" -> "__proto__";' };
    const ctx = adapter.open(shape); if (adapter.caps.async) out.hostileStateNames = { category: 'skipped-async' }; else { adapter.step(ctx, 'constructor'); out.hostileStateNames = { category: ctx.now() === 'constructor' ? 'works' : 'corrupts' }; }
  } catch (e) { out.hostileStateNames = { category: 'throws', note: e.message.slice(0, 80) }; }
  return out;
}

// --- memory (retained per machine + alloc per transition) --------------------
function measureMemory() {
  if (typeof global.gc !== 'function') return null;
  const shape = hubShape(50);
  const def = adapter.buildDefinition(shape);
  const gc = () => { global.gc(); global.gc(); global.gc(); return process.memoryUsage().heapUsed; };
  adapter.construct(def);                          // warm
  const before = gc(); const held = new Array(2000);
  for (let i = 0; i < 2000; ++i) held[i] = adapter.construct(def);
  const retained = Math.max(0, Math.round((gc() - before) / 2000));
  if (held[1999] === undefined && held[0] === undefined) throw new Error('collected early');
  const ctx = adapter.open(shape); const seq = shape.transitionSeq; adapter.reset(ctx);
  const b2 = gc(); const M = 50000;
  for (let k = 0; k < M; ++k) { adapter.step(ctx, seq[k % K]); if (k % K === K - 1) adapter.reset(ctx); }
  const perTrans = Math.max(0, Math.round((gc() - b2) / M));
  return { retainedBytesPerMachine: retained, allocBytesPerTransition: perTrans, shape: shape.name };
}

// --- capability throughput ----------------------------------------------------
function measureCapabilities() {
  const ops = {};
  if (adapter.caps.async) return ops;   // async caps: skipped in the cached loop
  // Action machine is a 3-state cycle (a -> b -> c -> a); the per-call step
  // count must be a whole number of cycles or the machine ends off-cycle and
  // the next call sends an event invalid from the current state (strict
  // libraries throw). floor(K/3)*3 keeps every call returning to the start.
  if (adapter.caps.action) { const ctx = adapter.openAction(); const ev = ['go1','go2','go3']; const n3 = Math.floor(K/3)*3; ops.action = opsPerSec(() => { for (let k=0;k<n3;++k) adapter.stepAction(ctx, ev[k%3]); }); }
  for (const [cap, open, step] of [['guard','openGuard','stepGuard'],['hook','openHook','stepHook']]) {
    if (!adapter.caps[cap]) continue; const ctx = adapter[open](); const t = ['b','a']; ops[cap] = opsPerSec(() => { for (let k=0;k<K;++k) adapter[step](ctx, t[k%2]); });
  }
  if (adapter.caps.data) { const ctx = adapter.openData(); const t = ['b','a']; ops.data = opsPerSec(() => { for (let k=0;k<K;++k) adapter.stepData(ctx, t[k%2], k); }); }
  return ops;
}

// --- run ---------------------------------------------------------------------
result.static   = measureStatic();    flush();
result.behavior = measureBehavior();  flush();
try { result.memory = measureMemory(); } catch (e) { result.memory = { error: e.message }; } flush();
result.capabilityOps = measureCapabilities(); flush();

for (const shape of SHAPES) {
  const entry = {};
  try {
    const def = adapter.buildDefinition(shape);
    entry.constructOps = opsPerSec(() => { const m = adapter.construct(def); if (!m) throw new Error('nothing'); });
    entry.feasibility = 'ok';
    if (!adapter.caps.async) {
      const ctx = adapter.open(shape); const seq = shape.transitionSeq;
      entry.transitionOps = opsPerSec(() => { adapter.reset(ctx); for (let k = 0; k < K; ++k) adapter.step(ctx, seq[k]); });
    }
  } catch (e) { entry.feasibility = 'error'; entry.error = String(e.message || e).slice(0, 120); }
  result.shapes[shape.name] = entry;
  flush();   // progressive: survive a kill on the next (larger) shape
}

result.completedAt = new Date().toISOString();
flush();
console.log(`measured ${libName}@${adapter.version} -> ${outPath}`);
