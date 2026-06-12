'use strict';

/**
 *  Cached shootout orchestrator — recreatable, incremental, scale-ready.
 *
 *  Designed for tracking *hundreds* of competitors over time: each library is
 *  measured independently and its result cached in `data/<host>/<lib>.json`,
 *  keyed by the installed version. A run re-measures **only** the libraries
 *  whose installed version differs from the cache (or that have never been
 *  measured); everything else is reused. So adding a competitor, or a
 *  dependency bump, costs one library's measurement, not a full re-run.
 *
 *  Per stale library it spawns `measure_lib.cjs` in a child with `--expose-gc`
 *  and a wall-clock timeout; the worker writes progressively, so a library that
 *  hangs on a huge machine still contributes the shapes it finished (the rest
 *  read as `timeout`). One bad library can't break the run.
 *
 *  Finally it assembles a combined `report.json`, renders the grid HTML, and
 *  **promotes** both into `src/generated_docs/` for publication. (Committing /
 *  pushing — and eventually pushing to a separate data repo — is done outside
 *  this script.)
 *
 *  Usage: `node run.cjs [--force] [--only <lib,lib>]`
 *  Env:   SHOOTOUT_HOST (default `local-<arch>`) — cache + report are per-host,
 *         since throughput/memory are host-dependent.
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { ADAPTERS, EXCLUDED } = require('./adapters/index.cjs');

const HOST       = process.env.SHOOTOUT_HOST || `local-${process.arch}`;
const FORCE      = process.argv.includes('--force');
const onlyIdx    = process.argv.indexOf('--only');
const ONLY       = onlyIdx !== -1 && process.argv[onlyIdx + 1] ? process.argv[onlyIdx + 1].split(',') : null;
const WORKER_TIMEOUT_MS = 180000;   // per-library ceiling; partial results survive a kill

// Canonical shape order — must match measure_lib.cjs. A shape absent from a
// library's result (worker killed before reaching it) reads as a timeout.
const SHAPE_NAMES = ['chain-10', 'hub-50', 'dense-10', 'chain-200', 'dense-50',
                     'hub-200', 'chain-1000', 'messy-1000', 'dense-200', 'messy-5000'];

const dataDir = path.join(__dirname, 'data', HOST);
fs.mkdirSync(dataDir, { recursive: true });
const slug = (n) => n.replace(/[^a-z0-9._-]/gi, '-');
const cachePath = (lib) => path.join(dataDir, slug(lib) + '.json');

function cached(lib) {
  try { return JSON.parse(fs.readFileSync(cachePath(lib), 'utf8')); } catch { return null; }
}

// ---------------------------------------------------------------------------
// 1. measure stale libraries
// ---------------------------------------------------------------------------

console.log(`shootout run — host ${HOST}${FORCE ? ' (force)' : ''}`);
const measured = {};
for (const adapter of ADAPTERS) {
  if (ONLY && !ONLY.includes(adapter.name)) {
    const c = cached(adapter.name); if (c) measured[adapter.name] = c;
    continue;
  }
  const prev = cached(adapter.name);
  // Reuse if this version was already measured past the cheap phases (static +
  // behavior + memory present). A library that legitimately times out on a
  // huge shape never reaches `completedAt`, so requiring it would re-measure
  // (and re-time-out) every run; the missing shapes are read as timeouts
  // instead. `--force` re-measures regardless.
  const fresh = prev && prev.version === adapter.version && prev.static && prev.behavior && prev.memory && !FORCE;
  if (fresh) {
    measured[adapter.name] = prev;
    console.log(`  reuse  ${adapter.name.padEnd(26)} @${adapter.version} (cached)`);
    continue;
  }
  process.stdout.write(`  measure ${adapter.name.padEnd(25)} @${adapter.version} … `);
  try {
    execFileSync(process.execPath, ['--expose-gc', 'measure_lib.cjs', adapter.name],
      { cwd: __dirname, env: { ...process.env, SHOOTOUT_HOST: HOST }, timeout: WORKER_TIMEOUT_MS, stdio: 'ignore' });
    console.log('done');
  } catch (e) {
    const why = (e && (e.killed || e.code === 'ETIMEDOUT')) ? 'TIMEOUT (partial kept)' : 'error (partial kept)';
    console.log(why);
  }
  measured[adapter.name] = cached(adapter.name) || { name: adapter.name, version: adapter.version, host: HOST, shapes: {}, partial: true };
}

// ---------------------------------------------------------------------------
// 2. assemble combined report
// ---------------------------------------------------------------------------

const libs = {}, caps = {}, feasibility = {}, results = [];
const memory = { results: {}, shape: null };
const behavior = { adapters: {} };
const staticEnv = { results: {} };

for (const adapter of ADAPTERS) {
  const m = measured[adapter.name];
  libs[adapter.name] = adapter.version;
  caps[adapter.name] = adapter.caps;
  if (!m) continue;

  if (m.static)   staticEnv.results[adapter.name]  = { version: adapter.version, ...m.static };
  if (m.behavior) behavior.adapters[adapter.name]  = m.behavior;
  if (m.memory && !m.memory.error) { memory.results[adapter.name] = m.memory; memory.shape = m.memory.shape; }

  feasibility[adapter.name] = {};
  for (const sh of SHAPE_NAMES) {
    const e = m.shapes && m.shapes[sh];
    if (!e)                       feasibility[adapter.name][sh] = { status: 'timeout' };
    else if (e.feasibility === 'ok') {
      feasibility[adapter.name][sh] = { status: 'ok' };
      if (typeof e.constructOps === 'number')  results.push({ name: `${adapter.name} ${sh} construct()`,  ops: e.constructOps });
      if (typeof e.transitionOps === 'number') results.push({ name: `${adapter.name} ${sh} transition()`, ops: e.transitionOps });
    } else {
      feasibility[adapter.name][sh] = { status: e.feasibility || 'error' };
    }
  }
  for (const [cap, ops] of Object.entries(m.capabilityOps || {})) {
    results.push({ name: `${adapter.name} ${cap}()`, ops });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  host: HOST, node: process.version, arch: process.arch,
  ceilingMs: WORKER_TIMEOUT_MS, k: 100,
  libs, caps, excluded: EXCLUDED || [],
  feasibility, results,
  memory, behavior, static: staticEnv,
};

// ---------------------------------------------------------------------------
// 3. promote — report.json + rendered grid into src/generated_docs/
// ---------------------------------------------------------------------------

const genDir = path.join(__dirname, 'src', 'generated_docs');
fs.mkdirSync(genDir, { recursive: true });
const reportPath = path.join(genDir, 'shootout.report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

const htmlPath = path.join(genDir, 'shootout.html');
execFileSync(process.execPath, ['grid.cjs', '--report', reportPath, '--out', htmlPath], { cwd: __dirname, stdio: 'inherit' });

console.log(`\npromoted:\n  ${reportPath}\n  ${htmlPath}`);
console.log(`cache: ${dataDir}/*.json (${ADAPTERS.length} libraries)`);
