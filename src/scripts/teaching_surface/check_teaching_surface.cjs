'use strict';

// Unified teaching-surface checker: check #1 (partition, delegated) + #2-#4 +
// fence doctest, in validate-present mode (enforce what pages claim; report
// uncovered features). See
// notes/superpowers/specs/2026-06-27-help-bar-phase1-docs-engine-design.md §8.

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { checkAll } = require('./check_partition.cjs');
const { scanPages } = require('./scan_pages.cjs');

const ROOT = path.join(__dirname, '..', '..', '..');
const MANIFEST = path.join(ROOT, 'src', 'data', 'teaching-surface.json');
const HELP = path.join(ROOT, 'src', 'help');
const DIST = path.join(ROOT, 'dist', 'jssm.es6.mjs');

const TIER_NEEDS = {
  core: ['prose', 'example'],
  intermediate: ['example'],
  advanced: ['mention'],
};

async function runChecks() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const byId = new Map(manifest.features.map(f => [f.id, f]));
  const { pages, coverage } = scanPages(HELP);

  // #2 treatment — a feature a page front-matter `teaches:` commits to teaching
  // must meet its tier's full contract. Fence-only / mention-only features are
  // incidental (reported, not gated).
  const treatmentViolations = [];
  const taughtFeatures = new Set(pages.flatMap(p => p.teaches));
  for (const fid of taughtFeatures) {
    const f = byId.get(fid);
    if (!f) { treatmentViolations.push(`unknown feature id taught: ${fid}`); continue; }
    if (f.tier === 'exclude') { treatmentViolations.push(`page teaches excluded feature: ${fid}`); continue; }
    const have = new Set((coverage[fid] || []).map(c => c.treatment));
    // advanced only needs to be covered at all (prose/example are deeper than a
    // bare mention); core/intermediate need their specific treatments present.
    const okTier = f.tier === 'advanced' ? have.size > 0
                 : (TIER_NEEDS[f.tier] || []).every(need => have.has(need));
    if (!okTier) treatmentViolations.push(`${fid} (${f.tier}) under-covered (have: ${[...have].join(',') || 'none'})`);
  }

  // #3 no-stale — no page may teach/mention/tag a forbidInTutorial feature
  const staleViolations = [];
  for (const fid of Object.keys(coverage)) {
    const f = byId.get(fid);
    if (f && f.exclude && f.exclude.forbidInTutorial) staleViolations.push(`forbidden feature referenced: ${fid}`);
  }

  // #4 dependency order — DAG over the manifest + present-page ordering
  const dagViolations = [];
  const seen = new Set(), stack = new Set();
  const visit = (id) => {
    if (seen.has(id)) return;
    if (stack.has(id)) { dagViolations.push(`cycle at ${id}`); return; }
    stack.add(id);
    for (const d of (byId.get(id)?.dependsOn || [])) visit(d);
    stack.delete(id); seen.add(id);
  };
  for (const f of manifest.features) visit(f.id);
  const pageOrder = new Map();
  pages.filter(p => p.section === 'tutorials').sort((a, b) => a.order - b.order)
    .forEach((p, idx) => p.teaches.forEach(t => { if (!pageOrder.has(t)) pageOrder.set(t, idx); }));
  for (const [fid, idx] of pageOrder) {
    for (const dep of (byId.get(fid)?.dependsOn || [])) {
      if (pageOrder.has(dep) && pageOrder.get(dep) > idx) {
        dagViolations.push(`${fid} taught before its prerequisite ${dep}`);
      }
    }
  }

  // fence doctest — every ```fsl{run} fence must parse
  const fenceViolations = [];
  let parse;
  try { ({ parse } = await import(pathToFileURL(DIST).href)); }
  catch (e) { fenceViolations.push(`cannot load parser from dist (run npm run make): ${e.message}`); }
  if (parse) {
    for (const p of pages) {
      const text = fs.readFileSync(path.join(ROOT, p.source), 'utf8');
      const re = /^```fsl\s*\{[^}]*\brun:\s*true\b[^}]*\}\n([\s\S]*?)\n```/gm;
      let m;
      while ((m = re.exec(text))) {
        try { parse(m[1]); } catch (e) { fenceViolations.push(`${p.id}: fence parse error: ${e.message}`); }
      }
    }
  }

  // report-only: uncovered teachable features
  const reportUncovered = manifest.features
    .filter(f => f.tier !== 'exclude' && !coverage[f.id])
    .map(f => f.id);

  const partition = checkAll();
  const wrap = (name, arr) => ({ ok: arr.length === 0, violations: arr, name });
  const treatment = wrap('treatment', treatmentViolations);
  const stale = wrap('stale', staleViolations);
  const dag = wrap('dag', dagViolations);
  const fences = wrap('fences', fenceViolations);
  const ok = partition.ok && treatment.ok && stale.ok && dag.ok && fences.ok;
  return { ok, partition, treatment, stale, dag, fences, reportUncovered };
}

module.exports = { runChecks };

if (require.main === module) {
  // --report: print the report but always exit 0 (non-gating build step). Without
  // it the checker fails on a violation (for a future hard gate / local use).
  const report = process.argv.includes('--report');
  runChecks().then(r => {
    for (const k of ['treatment', 'stale', 'dag', 'fences']) {
      const c = r[k];
      console.log(`[${c.ok ? 'OK  ' : 'FAIL'}] ${k}`);
      for (const v of c.violations) console.log('       ' + v);
    }
    console.log(`partition: ${r.partition.ok ? 'OK' : 'FAIL'}`);
    console.log(`uncovered (report): ${r.reportUncovered.length} features`);
    console.log(r.ok ? '\nteaching-surface checks OK (validate-present)'
                     : `\nteaching-surface checks reported issues${report ? ' (report-only, not failing the build)' : ''}`);
    process.exit(report || r.ok ? 0 : 1);
  });
}
