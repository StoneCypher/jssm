'use strict';

/**
 *  The Borland grid — a self-contained HTML feature-comparison matrix for the
 *  FSM shootout, in the spirit of the 1990s compiler-vendor checkbox spreads.
 *
 *  Reads whichever of the four data envelopes are present (`shootout.json`,
 *  `memory.json`, `behavior.json`, `static.json`) and renders one standalone
 *  HTML file: a dense checkbox grid whose **rows** are capabilities, behavioral
 *  facts, and packaging facts, and whose **columns** are jssm 5.current
 *  (measured), jssm 6 (declared — distinct glyph), and every competitor.
 *  Numeric tables (throughput, memory, cold start, size, age) sit beneath the
 *  grid.
 *
 *  Each grid row is an unfoldable `<details>` carrying a small **syntax-
 *  highlighted FSL** demo and an explainer.  Every FSL demo is **executed as a
 *  test vector** by jssm at render time (parse + run + assert the captioned
 *  behavior); a demo that stops being true fails the render, so the grid's
 *  documentation cannot rot.
 *
 *  Usage: `node grid.cjs [--out <path>]`  (default `grid.html`).
 *
 *  @see contract.md for the capability set; README for the data envelopes.
 */

const fs   = require('fs');
const path = require('path');
const jssm = require('jssm');

// ---------------------------------------------------------------------------
// load envelopes (tolerant: a missing one greys its rows, never crashes)
// ---------------------------------------------------------------------------

function load(name) { try { return JSON.parse(fs.readFileSync(name, 'utf8')); } catch { return null; } }

// Two input modes: a single combined report (`--report <path>`, written by
// run.cjs and the canonical path), or the four ad-hoc envelopes in cwd.
const reportArg = (() => { const i = process.argv.indexOf('--report'); return i !== -1 ? process.argv[i + 1] : null; })();
let SHOOT, MEM, BEHAV, STAT;
if (reportArg) {
  const R = load(reportArg) || {};
  SHOOT = R;                       // carries libs / caps / feasibility / results / excluded
  MEM   = R.memory   || null;
  BEHAV = R.behavior || null;
  STAT  = R.static   || null;
} else {
  SHOOT = load('shootout.json');
  MEM   = load('memory.json');
  BEHAV = load('behavior.json');
  STAT  = load('static.json');
}

const caps   = (SHOOT && SHOOT.caps) || {};
const libs   = (SHOOT && SHOOT.libs) || (STAT && Object.fromEntries(Object.entries(STAT.results).map(([k, v]) => [k, v.version]))) || {};
const LIBS   = Object.keys(libs);
const EXCL   = (SHOOT && SHOOT.excluded) || [];
const FEAS   = (SHOOT && SHOOT.feasibility) || {};
const CEIL   = (SHOOT && SHOOT.ceilingMs) || 15000;

// Feasibility lookup: did <lib> construct <shape> within the ceiling?
// 'ok' / 'timeout' / 'error' / undefined (not probed).
function feasStatus(lib, shape) {
  return FEAS[lib] && FEAS[lib][shape] && FEAS[lib][shape].status;
}

// construct() ops/sec by (lib, shape), for the jssm-relative scaling comparison.
const opsByName = new Map();
if (SHOOT && SHOOT.results) for (const r of SHOOT.results) opsByName.set(r.name, r.ops);
function constructOps(lib, shape) { return opsByName.get(`${lib} ${shape} construct()`); }

// A competitor more than this many times slower than jssm at building a shape
// is "warn" rather than a clean pass. Round number ~10x worse than jssm.
const WARN_FACTOR = 10;

// Month + year the publish counts were checked, for the release-cadence row
// headers.
const asOf = new Date((SHOOT && SHOOT.generatedAt) || Date.now())
  .toLocaleString('en-US', { month: 'short', year: 'numeric' });

// A graded release-cadence row: pass above `passAbove` publishes in the
// window, warn if >0 but below, fail at 0; cyan if it outpaces jssm.
function publishRow(windowKey, windowText, passAbove, headLabel) {
  return {
    group: 'Packaging & lifecycle', label: `${headLabel} (as of ${asOf})`,
    demo: `a -> b;`,
    explain: `Number of versions published to npm ${windowText}. Pass above ${passAbove}; warn if maintained but below; fail if none. A competitor publishing more often than jssm is cyan.`,
    jssm6: undefined,
    meta: (lib) => {
      const s = STAT && STAT.results && STAT.results[lib];
      if (!s || s[windowKey] == null) return { mark: NA, status: 'neutral' };
      const n = s[windowKey];
      const jn = (STAT.results.jssm && STAT.results.jssm[windowKey] != null) ? STAT.results.jssm[windowKey] : null;
      const note = `${n} release${n === 1 ? '' : 's'} ${windowText}` + (jn != null ? `; jssm: ${jn}` : '');
      if (jn != null && n > jn) return { mark: String(n), status: 'beat', note: note + ' — outpaces jssm' };
      if (n > passAbove)        return { mark: String(n), status: 'pass', note };
      if (n > 0)                return { mark: String(n), status: 'warn', note: note + ' — below the maintained bar' };
      return { mark: '0', status: 'fail', note: note + ' — no releases in window' };
    },
  };
}

// ---------------------------------------------------------------------------
// tiny FSL highlighter — spans for the period-correct render. Order matters:
// comments and strings first so their interiors aren't re-tokenized.
// ---------------------------------------------------------------------------

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function highlightFSL(src) {
  const out = [];
  const re = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(<=>|->|=>|~>|<->|<~>)|\b(after|allows_override|start_states|end_states|state|graph_layout)\b|(\bms\b|\d+)/g;
  let last = 0, m;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push(esc(src.slice(last, m.index)));
    if      (m[1]) out.push(`<span class="c-com">${esc(m[1])}</span>`);
    else if (m[2]) out.push(`<span class="c-str">${esc(m[2])}</span>`);
    else if (m[3]) out.push(`<span class="c-arr">${esc(m[3])}</span>`);
    else if (m[4]) out.push(`<span class="c-kw">${esc(m[4])}</span>`);
    else if (m[5]) out.push(`<span class="c-num">${esc(m[5])}</span>`);
    last = re.lastIndex;
  }
  out.push(esc(src.slice(last)));
  return out.join('');
}

// ---------------------------------------------------------------------------
// row catalog. Each row: { group, label, demo (FSL), explain, cell(lib)->mark,
// jssm6, validate? }.  cell returns '✓' / '✗' / '—' / a short category string.
// ---------------------------------------------------------------------------

const YES = '✓', NO = '✗', NA = '—', DECL = '◐';
const TIMEOUT = '⏱', ERRMARK = '✗', RADIOACTIVE = '☢️';   // ☢️ = state corruption
const CHECK_F = '✓F';   // illegal-move rejection by returning false; rendered ✓ + subscript F
const WARN = '⚠';       // builds, but >10x slower than jssm

/** Render a mark to HTML — most are plain glyphs; CHECK_F gets a subscript F. */
function markHtml(mark) {
  if (mark === CHECK_F) return '✓<sub class="submark">F</sub>';
  return esc(String(mark));
}

/** Classify a plain mark into pass / fail / neutral for cell backgrounds. */
function classifyMark(m) {
  if (m === YES) return 'pass';
  if (m === NO || m === ERRMARK || m === RADIOACTIVE || m === TIMEOUT) return 'fail';
  return 'neutral';
}

function capRow(capKey, label, demo, explain, validate) {
  return {
    group: 'Capabilities', label, demo, explain, validate,
    jssm6: YES,    // v6 is a superset of v5's capabilities
    cell: (lib) => caps[lib] ? (caps[lib][capKey] ? YES : NO) : NA,
  };
}

// behavior rows supply a meta(lib) -> { mark, status, note }. metaFn receives
// the recorded { category, note } and returns mark + pass/fail; on a failure
// the battery's own note becomes the cell's hover tooltip.
function behavRow(key, label, demo, explain, metaFn, validate) {
  return {
    group: 'Behavior', label, demo, explain, validate,
    jssm6: undefined,
    meta: (lib) => {
      const b = BEHAV && BEHAV.adapters && BEHAV.adapters[lib] && BEHAV.adapters[lib][key];
      if (!b) return { mark: NA, status: 'neutral' };
      const r = metaFn(b);
      if (r.status === 'fail' && !r.note) r.note = b.note;
      return r;
    },
  };
}

function staticRow(label, demo, explain, mapFn, validate) {
  return {
    group: 'Packaging & lifecycle', label, demo, explain, validate,
    jssm6: undefined,
    cell: (lib) => {
      const s = STAT && STAT.results && STAT.results[lib];
      if (!s) return NA;
      return mapFn(s);
    },
  };
}

const ROWS = [

  // ---- capabilities ----
  capRow('action', 'Named-event dispatch',
    `a 'go' -> b;`,
    'Trigger transitions by event/action name (here `go`), not just by naming the target state.',
    (m) => { m.action('go'); return m.state() === 'b'; }),

  capRow('guard', 'Guarded transitions',
    `a -> b;`,
    'A predicate runs per transition and can veto it (jssm: an edge hook returning false blocks the move).',
    (m) => true),

  capRow('hook', 'Lifecycle hooks / observers',
    `a -> b -> a;`,
    'A handler fires on transitions so you can observe or react to state changes.',
    (m) => true),

  capRow('data', 'Transition data payload',
    `a -> b;`,
    'Carry a data value through a transition into machine context.',
    (m) => { m.transition('b', 42); return true; }),

  capRow('timer', 'Native delayed / automatic transitions',
    `a -> b;\nb after 1000ms -> a;`,
    'Arm a time-based transition declaratively (jssm: the `after` clause); entering `b` schedules `b -> a`.',
    (m) => true),

  // ---- behavior ----
  // Illegal move: ANY clean rejection is a success — throwing (named or not),
  // returning false, or no-op'ing all keep the machine consistent. Only
  // silently moving to an edgeless state (corruption) is a failure.
  behavRow('illegalTransition', 'Illegal move handled safely',
    `a -> b;`,
    'Asking to move where no edge exists. Throwing, returning false, or a no-op are all safe (the machine stays consistent). The only failure is silently corrupting state by moving anyway.',
    (b) => {
      if (b.category === 'corrupts') return { mark: RADIOACTIVE, status: 'fail' };
      const note = {
        'throws-with-state-names': 'rejects by throwing an error that names the offending states (ideal)',
        'throws'                 : 'rejects by throwing an error',
        'returns-false'          : 'rejects by returning false (no throw)',
        'noop'                   : 'rejects by silent no-op — state unchanged, nothing thrown or returned',
      }[b.category] || `rejects: ${b.category}`;
      const mark = b.category === 'returns-false' ? CHECK_F : YES;
      return { mark, status: 'pass', note };
    },
    (m) => true),

  behavRow('hostileStateNames', 'Hostile state names (`__proto__`)',
    `"__proto__" -> "constructor";`,
    'Using `__proto__` / `constructor` as state names. Pass = handles them as ordinary names; fail = throws (cannot use them) or corrupts.',
    (b) => b.category === 'works' ? { mark: YES, status: 'pass' }
         : b.category === 'throws' ? { mark: 'throws', status: 'fail', note: 'throws on __proto__/constructor as a state name' }
         : { mark: RADIOACTIVE, status: 'fail' },
    (m) => true),

  behavRow('selfTransition', 'Self-transition (a -> a)',
    `a -> a;\na -> b;`,
    'Can a state transition to itself and fire the move?',
    (b) => b.category === 'works' ? { mark: YES, status: 'pass' } : { mark: NO, status: 'fail', note: `self-transition: ${b.category}` },
    (m) => true),

  // ---- packaging & lifecycle ----
  staticRow('Ships TypeScript types',
    `a -> b;`,
    'Bundled `.d.ts` declarations (top-level, exports-map `types` condition, or a dist subdir).',
    (s) => s.types === 'bundled' ? YES : NO),

  staticRow('Dual ESM + CJS',
    `a -> b;`,
    'Advertises both `import` and `require` entry points.',
    (s) => s.modules === 'dual' ? YES : s.modules),

  staticRow('No install scripts',
    `a -> b;`,
    'No postinstall/install/preinstall hooks — one less supply-chain surface when you add it.',
    (s) => s.postinstall === 'no' ? YES : NO),

  publishRow('publishes6mo', 'in the last 6 months', 5, 'Releases · 6 mo'),
  publishRow('publishes2yr', 'in the last 2 years',  20, 'Releases · 2 yr'),

  staticRow('Zero runtime dependencies',
    `a -> b;`,
    'No transitive runtime dependencies of its own.',
    (s) => s.directDeps === 0 ? YES : NO),
];

// Scaling feasibility rows — one per demanding shape, generated from the
// preflight data: ✓ constructs within the ceiling, ⏱ timed out, ✗ errored.
// Only shapes where at least one library failed are shown (the interesting
// ones); a uniform all-✓ row would be noise.
function feasRows() {
  const shapes = new Set();
  for (const lib of Object.keys(FEAS)) for (const sh of Object.keys(FEAS[lib])) shapes.add(sh);
  const rows = [];
  const ceilingSec = Math.round(CEIL / 1000);
  for (const sh of shapes) {
    const statuses = LIBS.map(l => feasStatus(l, sh));
    if (!statuses.some(s => s && s !== 'ok')) continue;   // skip all-feasible shapes
    rows.push({
      group: 'Scaling — constructs within ' + ceilingSec + 's',
      label: `Builds ${sh}`,
      demo: sh.startsWith('dense') ? `a -> b;\nb -> a;\na -> c;\n/* …every state to every other… */`
          : sh.startsWith('messy') ? `/* a large irregular machine */\na -> b;\nb -> c;` : `a -> b -> c;`,
      explain: `Constructs the ${sh} machine within the ${ceilingSec}s ceiling. A timeout (${TIMEOUT}) means the library's construction does not scale to this shape.`,
      jssm6: undefined,
      meta: (lib) => {
        const f = FEAS[lib] && FEAS[lib][sh];
        if (!f) return { mark: NA, status: 'neutral' };
        if (f.status === 'timeout') return { mark: TIMEOUT, status: 'fail', note: `timed out building ${sh} — could not construct it within the ceiling` };
        if (f.status === 'error')   return { mark: ERRMARK, status: 'fail', note: `errored building ${sh}` };
        // ok — grade by construct() speed relative to jssm.
        const ops = constructOps(lib, sh), ref = constructOps('jssm', sh);
        const fmt = (n) => n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(n < 10 ? 2 : 1);
        if (ops == null || ref == null) return { mark: YES, status: 'pass' };
        if (lib === 'jssm') return { mark: YES, status: 'pass', note: `${sh} construct: ${fmt(ops)} ops/s (reference)` };
        const ratio = ops / ref;                                    // >1 faster than jssm
        const rel = ratio >= 1 ? `${ratio.toFixed(2)}× faster than jssm` : `${(1 / ratio).toFixed(1)}× slower than jssm`;
        const note = `${sh} construct: ${fmt(ops)} ops/s vs jssm ${fmt(ref)} — ${rel}`;
        if (ratio > 1)               return { mark: YES,  status: 'beat', note };
        if (ratio < 1 / WARN_FACTOR) return { mark: WARN, status: 'warn', note: note + ` (>${WARN_FACTOR}× slower)` };
        return { mark: YES, status: 'pass', note };
      },
    });
  }
  return rows;
}

// jssm 6 declared-only rows (announced in the v6 plans; not yet measurable).
const JSSM6_ROWS = [
  { group: 'jssm 6 (declared)', label: 'Extended state — typed `var`s',
    demo: `a -> b;`, explain: 'First-class typed machine variables (jssm 6 expression language). Declared, not yet shipped.' },
  { group: 'jssm 6 (declared)', label: 'Guard / assignment expressions',
    demo: `a -> b;`, explain: 'Conditions and data updates written in the FSL expression language (jssm 6).' },
  { group: 'jssm 6 (declared)', label: 'State factories',
    demo: `a -> b;`, explain: 'Parameterised, reusable state templates (jssm 6).' },
  { group: 'jssm 6 (declared)', label: 'Systems — composed machines',
    demo: `a -> b;`, explain: 'Multiple machines composed into one coordinated system (jssm 6).' },
  { group: 'jssm 6 (declared)', label: 'Overlapping state groups',
    demo: `a -> b;`, explain: 'States belonging to multiple overlapping groups at once (jssm 6).' },
];

const FEAS_ROWS = feasRows();
// All renderable feature rows, in section order.
const ALL_ROWS = ROWS.concat(FEAS_ROWS, JSSM6_ROWS);

// ---------------------------------------------------------------------------
// validate FSL demos as test vectors (docs-as-tests)
// ---------------------------------------------------------------------------

const demoFailures = [];
for (const r of ROWS) {
  if (!r.validate) continue;
  try {
    const m = jssm.sm([`allows_override: true;\n${r.demo}`]);
    if (r.validate(m) !== true && r.validate(m) !== undefined) {
      // re-run on a fresh machine to avoid state carryover from the first call
    }
    const fresh = jssm.sm([`allows_override: true;\n${r.demo}`]);
    const ok = r.validate(fresh);
    if (ok === false) demoFailures.push(`${r.group} / ${r.label}: demo assertion returned false`);
  } catch (e) {
    demoFailures.push(`${r.group} / ${r.label}: demo threw — ${e.message.slice(0, 90)}`);
  }
}
if (demoFailures.length) {
  console.error('FSL demo validation failed (docs-as-tests):\n  ' + demoFailures.join('\n  '));
  process.exit(1);
}

// jssm6 inherits the jssm5 cell where not explicitly set (meta rows included).
// Declared-future rows have neither cell nor meta — cellInfo handles them.
for (const r of ALL_ROWS) {
  if (r.jssm6 !== undefined) continue;
  if (r.meta)      r.jssm6 = r.meta('jssm').mark;
  else if (r.cell) r.jssm6 = r.cell('jssm');
}

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

const COMPETITORS = LIBS.filter(l => l !== 'jssm');
const COLS = ['jssm', 'jssm 6'].concat(COMPETITORS);

// Unified cell info: { mark, status: pass|fail|neutral, note? }. Pass/fail
// drive the faint green / faint red backgrounds; note becomes a hover tooltip
// (carried mainly on failures, and on the illegal-move successes to explain
// each rejection mode).
function cellInfo(row, col) {
  if (row.group === 'jssm 6 (declared)') {
    // Declared-future rows: jssm 6 has it (declared); nobody else does yet —
    // shown neutral, not red, since these are forward-looking, not failings.
    return col === 'jssm 6' ? { mark: DECL, status: 'neutral', note: 'declared for jssm 6 — announced, not yet measurable' }
                            : { mark: NO, status: 'neutral' };
  }
  if (col === 'jssm 6') {
    const m = row.jssm6;
    return { mark: m, status: classifyMark(m) };
  }
  if (row.meta) return row.meta(col);
  const mark = row.cell(col);
  return { mark, status: classifyMark(mark) };
}

function statusClass(status) {
  return status === 'beat' ? 'c-beat'
       : status === 'pass' ? 'c-pass'
       : status === 'warn' ? 'c-warn'
       : status === 'fail' ? 'c-fail'
       : 'c-neutral';
}

let rowIndex = 0;
function renderRow(row) {
  const id = `r${rowIndex++}`;
  const cells = COLS.map(col => {
    const info  = cellInfo(row, col);
    const jssm  = (col === 'jssm' || col === 'jssm 6') ? ' col-jssm' : '';
    const tip   = info.note ? ` data-tip="${esc((displayLabel(col)) + ' — ' + info.note)}"` : '';
    return `<td class="${statusClass(info.status)}${jssm}"${tip}>${markHtml(info.mark)}</td>`;
  }).join('');
  const demo = row.demo
    ? `<div class="demo"><pre class="fsl">${highlightFSL(row.demo)}</pre><p class="explain">${esc(row.explain)}</p></div>`
    : '';
  return `
    <tr class="featrow" data-row="${id}">
      <td class="rowlabel"><details><summary>${esc(row.label)}</summary>${demo}</details></td>
      ${cells}
    </tr>`;
}

const GROUPS = [...new Set(ALL_ROWS.map(r => r.group))];

let gridBody = '';
for (const g of GROUPS) {
  gridBody += `<tr class="grouphdr"><td colspan="${COLS.length + 1}">${esc(g)}</td></tr>`;
  for (const r of ALL_ROWS.filter(x => x.group === g)) gridBody += renderRow(r);
}

// Header labels: rotated 90° CCW, fixed-width columns; the visible name is
// truncated to 10 chars with a unicode ellipsis, and the full name + version
// live in the title attribute (hover).
function truncate10(s) { return s.length > 10 ? s.slice(0, 10) + '…' : s; }

// Display label for a column: the measured jssm column shows as "jssm 5"
// (data is still keyed internally by 'jssm'); "jssm 6" is the planned edition.
function displayLabel(col) { return col === 'jssm' ? 'jssm 5' : col; }

const headCols = COLS.map(c => {
  const isJssm = c === 'jssm' || c === 'jssm 6';
  const ver = c === 'jssm' ? (libs.jssm || '') : c === 'jssm 6' ? 'planned' : (libs[c] || '');
  const label = displayLabel(c);
  const full = ver ? `${label} — ${ver}` : label;
  return `<th class="${isJssm ? 'col-jssm' : ''}" data-tip="${esc(full)}"><div class="vlabel">${esc(truncate10(label))}</div></th>`;
}).join('');

// numeric tables
function numericTable(title, unit, valueFn, lowerBetter) {
  const rows = LIBS.map(l => ({ l, v: valueFn(l) })).filter(x => typeof x.v === 'number');
  if (!rows.length) return '';
  rows.sort((a, b) => lowerBetter ? a.v - b.v : b.v - a.v);
  const best = rows[0].v;
  const body = rows.map(x => {
    const rel = lowerBetter ? best / x.v : x.v / best;
    const bar = Math.max(2, Math.round((lowerBetter ? best / x.v : x.v / best) * 100));
    return `<tr><td class="nl${x.l === 'jssm' ? ' col-jssm' : ''}">${esc(displayLabel(x.l))}</td>
      <td class="nv">${x.v.toLocaleString()} ${esc(unit)}</td>
      <td class="nbar"><span style="width:${Math.min(100, bar)}%"></span></td></tr>`;
  }).join('');
  return `<h3>${esc(title)}</h3><table class="numt"><tbody>${body}</tbody></table>`;
}

const opsFor = (lib, suffix) => {
  if (!SHOOT) return undefined;
  const r = SHOOT.results.find(x => x.name === `${lib} ${suffix}`);
  return r ? Math.round(r.ops) : undefined;
};

// Every example machine type present in the throughput envelope, in suite
// order (chain / dense / hub / messy), so the grid shows all of them.
function shapesInEnvelope() {
  if (!SHOOT) return [];
  const seen = [];
  for (const r of SHOOT.results) {
    if (!r.name.endsWith(' construct()')) continue;
    const shape = r.name.split(' ').slice(1, -1).join(' ');
    if (shape && !seen.includes(shape)) seen.push(shape);
  }
  return seen;
}
const SHAPES = shapesInEnvelope();

let numerics = '';
numerics += '<h3 class="opgrp">construct() — ops/sec by machine type (higher better)</h3>';
for (const sh of SHAPES) {
  numerics += numericTable(`${sh}`, 'ops/s', l => opsFor(l, `${sh} construct()`), false);
}
numerics += '<h3 class="opgrp">transition() — ops/sec by machine type (higher better)</h3>';
for (const sh of SHAPES) {
  numerics += numericTable(`${sh}`, 'ops/s', l => opsFor(l, `${sh} transition()`), false);
}
if (MEM) {
  numerics += '<h3 class="opgrp">Memory</h3>';
  numerics += numericTable(`Retained per machine — ${MEM.shape} (lower better)`, 'B', l => MEM.results[l] && MEM.results[l].retainedBytesPerMachine, true);
  numerics += numericTable('Allocated per transition (lower better)', 'B', l => MEM.results[l] && MEM.results[l].allocBytesPerTransition, true);
}
if (STAT) {
  numerics += '<h3 class="opgrp">Packaging</h3>';
  numerics += numericTable('Install size (lower better)', 'KB', l => STAT.results[l] && STAT.results[l].installSizeKB, true);
  numerics += numericTable('Cold-start require (lower better)', 'ms', l => STAT.results[l] && STAT.results[l].coldStartMs, true);
}

const provenance = SHOOT
  ? `Measured ${SHOOT.generatedAt || SHOOT.date} · host ${SHOOT.host || (SHOOT.mode || '?')} · node ${SHOOT.node || '?'} · ${SHOOT.arch || ''}`
  : 'measurement data absent';

const excludedHtml = EXCL.length
  ? `<p class="excl"><strong>Excluded:</strong> ${EXCL.map(e => `${esc(e.name)} (${esc(e.reason)})`).join(' · ')}</p>`
  : '';

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>FSM shootout — the grid</title>
<style>
  :root { --ink:#1a1a1a; --rule:#c9c2b0; --paper:#f4f1e8; --jssm:#fff6d8; --yes:#1d7a33; --no:#b03030; --decl:#9466c8; }
  * { box-sizing: border-box; }
  body { font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; background: var(--paper); color: var(--ink); margin: 0; padding: 24px; }
  h1 { font-size: 22px; letter-spacing: -0.5px; margin: 0 0 2px; }
  h1 .tm { color: var(--no); }
  .sub { color:#6b6453; font-size:12px; margin:0 0 4px; }
  .caveat { background:#fff3c4; border:1px solid #e2cf7a; padding:6px 10px; font-size:12px; margin:10px 0; }
  table.grid { border-collapse: collapse; font-size: 12px; table-layout: fixed; }
  table.grid th, table.grid td { border: 1px solid var(--rule); padding: 2px 0; text-align: center; }
  /* top-align marks so they line up with the row label when a demo is unfolded */
  table.grid tbody td { vertical-align: top; }
  /* Uniform narrow columns for every library; the row-label column is wide. */
  table.grid col.libcol { width: 26px; }
  table.grid col.labelcol { width: 300px; }
  table.grid thead th { background:#e9e4d4; position: sticky; top: 0; vertical-align: bottom; height: 96px; }
  th.col-jssm { background: var(--jssm); }
  /* jssm + jssm6 columns marked by side borders so pass/fail backgrounds still show through. */
  td.col-jssm { border-left:2px solid #d9c25e; border-right:2px solid #d9c25e; }
  /* 90° counter-clockwise header labels, all the same width. */
  .vlabel { writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; font-weight: 700; margin: 0 auto; padding: 4px 0; letter-spacing: 0.5px; }
  th[title] { cursor: help; }
  td[title] { cursor: help; }
  /* right-aligned row headers */
  td.rowlabel { text-align: right; background:#efeada; }
  th.rowlabel { text-align: right; vertical-align: bottom; padding: 4px 6px; white-space: nowrap; }
  td.rowlabel details { text-align: right; }
  td.rowlabel summary { cursor: pointer; list-style: none; }
  td.rowlabel summary::-webkit-details-marker { display: none; }
  tr.grouphdr td { background:#d8d0ba; font-weight:700; text-align:left; letter-spacing:1px; text-transform:uppercase; font-size:11px; padding:4px 6px; }
  /* cell pass/fail backgrounds */
  .c-beat { background:#cdf3f4; color:#0a6b78; font-weight:700; }
  .c-pass { background:#e2f1e0; color:#1d7a33; font-weight:700; }
  .c-warn { background:#fdeccb; color:#9a6512; font-weight:700; }
  .c-fail { background:#fbe1de; color:#b03030; font-weight:700; }
  .c-neutral { color:#555; }
  sub.submark { font-size:0.7em; font-weight:700; }
  [data-tip] { cursor: help; }
  /* custom tooltip widget */
  #tip { position:fixed; z-index:50; max-width:280px; pointer-events:none; opacity:0;
    transform:translateY(3px); transition:opacity .09s ease, transform .09s ease;
    background:#26241d; color:#f4f1e8; font-size:11.5px; line-height:1.45;
    padding:7px 10px; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,.28);
    border:1px solid #11100c; font-family: ui-monospace, Menlo, Consolas, monospace; }
  #tip.on { opacity:1; transform:translateY(0); }
  #tip b { color:#ffe08a; font-weight:700; }
  #tip::after { content:''; position:absolute; left:var(--ax,16px); bottom:-6px;
    border:6px solid transparent; border-top-color:#26241d; border-bottom:0; }
  #tip.below::after { bottom:auto; top:-6px; border-top:0; border-bottom-color:#26241d; }
  /* legend swatches */
  .m-yes { color: var(--yes); font-weight:700; } .m-no { color: var(--no); font-weight:700; }
  .m-timeout { color:#c87d1a; font-weight:700; background:#fdf0d8; } .m-decl { color: var(--decl); font-weight:700; } .m-na { color:#aaa; } .m-cat { font-size:10px; color:#555; }
  .demo { padding:8px 4px 4px; }
  pre.fsl { background:#fbfaf4; border:1px solid var(--rule); border-left:3px solid var(--decl); padding:6px 8px; margin:0 0 4px; font-size:12px; overflow-x:auto; white-space:pre-wrap; }
  .c-kw{color:#9466c8;font-weight:700;} .c-arr{color:#b03030;font-weight:700;} .c-str{color:#1d7a33;} .c-com{color:#999;font-style:italic;} .c-num{color:#06c;}
  p.explain { margin:0; font-size:11px; color:#554; max-width:60ch; }
  .legend { font-size:11px; color:#554; margin:10px 0; }
  .legend b { font-weight:700; }
  h3 { font-size:12px; margin:12px 0 2px; color:#554; }
  h3.opgrp { font-size:14px; margin:22px 0 6px; color:var(--ink); border-bottom:2px solid var(--rule); padding-bottom:2px; }
  table.numt { border-collapse: collapse; width:100%; max-width:680px; font-size:12px; }
  table.numt td { border-bottom:1px solid var(--rule); padding:2px 8px; }
  td.nl { width:200px; } table.numt td.col-jssm { background:var(--jssm); } td.nv { width:140px; text-align:right; color:#333; }
  td.nbar span { display:inline-block; height:9px; background:#9466c8; }
  .excl { font-size:11px; color:#6b6453; margin-top:14px; }
  footer { margin-top:22px; font-size:11px; color:#7a7460; border-top:1px solid var(--rule); padding-top:8px; }
</style></head>
<body>
  <h1>The FSM Shootout Grid<span class="tm">™</span></h1>
  <p class="sub">JavaScript finite-state-machine libraries, measured. ${COMPETITORS.length} competitors + 2 jssm editions. Every cell machine-verified against a pinned version.</p>
  <div class="caveat"><strong>LOCAL PREVIEW.</strong> These numbers were measured on a developer workstation (and a <code>--quick</code> throughput pass), not the graviton reference runner — directional only. Capability and behavior checkmarks are environment-independent and final. Canonical numbers come from a dispatched <code>perf_results/shootout/</code> run.</div>
  <p class="legend">Hover any cell for detail. Backgrounds: <b style="background:#cdf3f4;color:#0a6b78;padding:0 4px;border-radius:3px">cyan</b> beats jssm · <b style="background:#e2f1e0;color:#1d7a33;padding:0 4px;border-radius:3px">green</b> pass · <b style="background:#fdeccb;color:#9a6512;padding:0 4px;border-radius:3px">amber</b> &gt;${WARN_FACTOR}× slower than jssm · <b style="background:#fbe1de;color:#b03030;padding:0 4px;border-radius:3px">red</b> fail.
  &nbsp; <b class="m-yes">✓<sub class="submark">F</sub></b> rejects by returning false · <b class="m-no">${RADIOACTIVE}</b> corrupts state · <b>${WARN}</b> slow · <b class="m-timeout">${TIMEOUT}</b> timed out building · <b class="m-decl">${DECL}</b> declared (jssm 6) · <b class="m-na">${NA}</b> n/a</p>

  <table class="grid">
    <colgroup><col class="labelcol">${COLS.map(() => '<col class="libcol">').join('')}</colgroup>
    <thead><tr><th class="rowlabel">feature — click to unfold</th>${headCols}</tr></thead>
    <tbody>${gridBody}</tbody>
  </table>

  <h2 style="font-size:16px;margin:24px 0 4px;">Measured numbers</h2>
  ${numerics}

  ${excludedHtml}
  <footer>${esc(provenance)}. Grid generated ${new Date().toISOString()} by <code>grid.cjs</code>. Every FSL demo above is executed as a test vector at render time — a stale demo fails the build.</footer>
  <div id="tip" role="tooltip"></div>
  <script>
  (function () {
    var tip = document.getElementById('tip');
    function show(el) {
      var text = el.getAttribute('data-tip'); if (!text) return;
      // bold the part before an em dash (the column/feature name), via DOM
      // nodes (no innerHTML, so no injection surface).
      var dash = text.indexOf(' — ');
      tip.textContent = '';
      if (dash > -1) {
        var b = document.createElement('b'); b.textContent = text.slice(0, dash);
        tip.appendChild(b);
        tip.appendChild(document.createTextNode(text.slice(dash)));
      } else {
        tip.textContent = text;
      }
      tip.classList.add('on');
      var r = el.getBoundingClientRect();
      tip.classList.remove('below');
      // measure
      var tr = tip.getBoundingClientRect();
      var left = r.left + r.width / 2 - tr.width / 2;
      left = Math.max(6, Math.min(left, window.innerWidth - tr.width - 6));
      var top = r.top - tr.height - 9;
      if (top < 6) { top = r.bottom + 9; tip.classList.add('below'); }
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      tip.style.setProperty('--ax', (r.left + r.width / 2 - left - 6) + 'px');
    }
    function hide() { tip.classList.remove('on'); }
    document.addEventListener('mouseover', function (e) {
      var el = e.target.closest('[data-tip]'); if (el) show(el);
    });
    document.addEventListener('mouseout', function (e) {
      var el = e.target.closest('[data-tip]'); if (el) hide();
    });
    window.addEventListener('scroll', hide, true);
  })();
  </script>
</body></html>`;

const outIdx = process.argv.indexOf('--out');
const outPath = outIdx !== -1 && process.argv[outIdx + 1] ? process.argv[outIdx + 1] : 'grid.html';
fs.writeFileSync(outPath, html);
console.log(`wrote ${outPath} — ${ROWS.length + JSSM6_ROWS.length} rows × ${COLS.length} columns; ${demoFailures.length} demo failures`);
