'use strict';

/**
 *  Static / lifecycle runner for the shootout — the facts that need no machine
 *  to run, just the installed package and a cold `require`.
 *
 *  Per library:
 *  - **installSizeKB** — recursive on-disk size of the package's own directory
 *    (its own files, not its dependency tree).
 *  - **directDeps** — count of runtime dependencies declared in its
 *    package.json (a proxy for supply-chain surface).
 *  - **types** — `bundled` (ships .d.ts via `types`/`typings` or a top-level
 *    declaration) / `none`.
 *  - **modules** — which entry points it advertises: `esm`, `cjs`, or `dual`.
 *  - **postinstall** — `yes` if any install/postinstall/preinstall script is
 *    declared (a thing to know before adding a dependency), else `no`.
 *  - **lastPublishISO / ageYears** — staleness, via `npm view` (best-effort;
 *    network). Half this field set is a maintenance signal in itself.
 *  - **coldStartMs** — median of a few child-process `require()` timings; the
 *    cost that dominates CLI and serverless use, invisible to transition
 *    benchmarks.
 *
 *  Output: `static.json`. Filesystem + packaging metrics are deterministic;
 *  `lastPublish` is omitted (not faked) when the network call fails.
 *
 *  Usage: `node static.cjs`
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { ADAPTERS } = require('./adapters/index.cjs');

function dirSizeBytes(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(full);
    else if (entry.isFile()) { try { total += fs.statSync(full).size; } catch { /* race */ } }
  }
  return total;
}

function pkgDir(name) {
  // node_modules/<name> or node_modules/@scope/name
  return path.join(__dirname, 'node_modules', ...name.split('/'));
}

function modulesOf(pkg) {
  const hasESM = Boolean(pkg.module) ||
    (pkg.exports && JSON.stringify(pkg.exports).includes('import')) ||
    pkg.type === 'module';
  const hasCJS = Boolean(pkg.main) ||
    (pkg.exports && JSON.stringify(pkg.exports).includes('require')) ||
    (!pkg.module && !pkg.exports);   // legacy default is CJS
  if (hasESM && hasCJS) return 'dual';
  if (hasESM) return 'esm';
  return 'cjs';
}

function typesOf(name, dir, pkg) {
  // Explicit fields.
  if (pkg.types || pkg.typings) return 'bundled';
  // Modern packages declare types only via an exports-map "types" condition.
  if (pkg.exports && JSON.stringify(pkg.exports).includes('"types"')) return 'bundled';
  // Otherwise look for any shipped .d.ts (top level or one dir down, e.g.
  // dist/ or types/), which covers libraries that ship declarations without
  // advertising them in package.json.
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.d.ts')) return 'bundled';
      if (entry.isDirectory() && ['dist', 'types', 'lib', 'build', 'esm', 'cjs'].includes(entry.name)) {
        try {
          if (fs.readdirSync(path.join(dir, entry.name)).some(f => f.endsWith('.d.ts'))) return 'bundled';
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  return 'none';
}

function lastPublish(name) {
  try {
    // Windows needs a shell to resolve npm.cmd; the Linux instance (the
    // canonical run) does not, which avoids the args-via-shell deprecation.
    // Library names come from our own pinned list, so there is no injection
    // surface either way.
    const out = execFileSync('npm', ['view', name, 'time.modified', '--silent'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], shell: process.platform === 'win32', timeout: 20000 });
    const iso = out.trim();
    if (!iso) return null;
    const ageYears = (Date.now() - new Date(iso).getTime()) / (365.25 * 24 * 3600 * 1000);
    return { lastPublishISO: iso, ageYears: Math.round(ageYears * 10) / 10 };
  } catch { return null; }
}

function coldStartMs(name) {
  const samples = [];
  for (let i = 0; i < 5; ++i) {
    try {
      const out = execFileSync(process.execPath,
        ['-e', `const t=process.hrtime.bigint();require(${JSON.stringify(name)});process.stdout.write(String(Number(process.hrtime.bigint()-t)/1e6));`],
        { encoding: 'utf8', cwd: __dirname, timeout: 20000 });
      const ms = parseFloat(out);
      if (!Number.isNaN(ms)) samples.push(ms);
    } catch { /* a lib that throws on bare require is itself a finding, captured elsewhere */ }
  }
  if (!samples.length) return null;
  samples.sort((a, b) => a - b);
  return Math.round(samples[Math.floor(samples.length / 2)] * 100) / 100;   // median, 2dp
}

// ---------------------------------------------------------------------------

const results = {};
for (const a of ADAPTERS) {
  const name = a.name;
  const dir  = pkgDir(name);
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); } catch { /* leave {} */ }

  const scripts = pkg.scripts || {};
  results[name] = {
    version       : a.version,
    installSizeKB : Math.round(dirSizeBytes(dir) / 1024),
    directDeps    : Object.keys(pkg.dependencies || {}).length,
    types         : typesOf(name, dir, pkg),
    modules       : modulesOf(pkg),
    postinstall   : (scripts.postinstall || scripts.install || scripts.preinstall) ? 'yes' : 'no',
    coldStartMs   : coldStartMs(name),
    ...(lastPublish(name) || {}),
  };

  const r = results[name];
  console.log(name.padEnd(26),
    `${String(r.installSizeKB).padStart(5)} KB`,
    `deps=${r.directDeps}`.padEnd(8),
    `types=${r.types}`.padEnd(15),
    `mod=${r.modules}`.padEnd(10),
    `postinstall=${r.postinstall}`.padEnd(16),
    `cold=${r.coldStartMs ?? '—'}ms`.padEnd(13),
    r.ageYears !== undefined ? `age=${r.ageYears}y` : 'age=?');
}

const envelope = { date: new Date().toISOString(), node: process.version, results };
fs.writeFileSync('static.json', JSON.stringify(envelope, null, 2));
console.log(`\nwrote static.json — ${Object.keys(results).length} libraries`);
