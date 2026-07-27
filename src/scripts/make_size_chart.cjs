'use strict';

/**
 *  Package-size archaeology chart (fsl#1965). Renders one self-contained HTML
 *  page from the per-package size archives on the `perf_results` data branch,
 *  with three modes:
 *
 *    - **ecosystem** — every published package stacked on a shared publish-time
 *      axis, subdivided package → file family → file. A package that is
 *      npm-deprecated (archive fact) or obsoleted (curated judgment, the
 *      {@link LIFECYCLE} map) drops to 0 after its last release, so libraries
 *      visibly flow in as they are born and out as they are superseded.
 *    - **jssm proper** — one package's own file families, with a top-K + ·rest
 *      collapse and a second drill level into any ·rest band.
 *    - **mass flow** — the Sankey: where the bytes went. Columns are ecosystem
 *      events *derived* from the archive, ribbons are mass crossing a package
 *      boundary, and non-npm repos appear as zero-mass lifespan rails.
 *
 *  Two consumers:
 *
 *    node src/scripts/make_size_chart.cjs
 *        Build-pipeline mode (the `size_chart` step of `npm run build`): reads
 *        the archives from `perf_results` and writes `docs/size_chart.html`.
 *        DETERMINISTIC — every timestamp comes from the data, never the wall
 *        clock. Degrades gracefully (warns, exit 0, leaves any existing file)
 *        when the branch is unreachable, so offline builds still pass.
 *
 *    node src/scripts/make_size_chart.cjs --from <dir> [--out <dir>]
 *        Reads archives from a local directory instead (what
 *        `collect_package_sizes.cjs --out <dir>` produces), for iterating on
 *        the chart without a network round trip.
 *
 *  **Conservation is a build gate.** The mass-flow model must balance at every
 *  node of every column; if it does not, this script exits non-zero rather than
 *  publish a diagram that misrepresents its own data. The limit is worth
 *  stating: conservation proves the *routing* is consistent with the measured
 *  masses. It cannot prove the archive was collected correctly, nor that a
 *  supersession edge reflects reality.
 *
 *  @see src/scripts/collect_package_sizes.cjs
 *  @see src/scripts/flow_model.cjs
 *  @see src/scripts/build_repo_timeline.cjs
 *  @see https://github.com/StoneCypher/fsl/issues/1965
 */

const { execFileSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const flowModel = require('./flow_model.cjs');
const { family } = require('./size_families.cjs');

/** Defaults shared by the CLI parser and the docs. */
const DEFAULTS = Object.freeze({
  branch     : 'perf_results',
  archiveDir : 'package_sizes',
  reposFile  : 'repos.json',
  //  Where `repos.json` may live on the data branch, best first. The workflow
  //  writes it at the branch root; `repo_timeline/` is where the dataset was
  //  first seeded by hand, before the workflow could run (a scheduled workflow
  //  only fires from the default branch, so the nightly cannot write anything
  //  until this branch merges). Both are read so the rails do not wait on a
  //  merge, and so the seed stays readable if it is never tidied away.
  reposDirs  : Object.freeze(['', 'package_sizes', 'repo_timeline']),
  outDir     : path.join(__dirname, '..', '..', 'docs'),
  outFile    : 'size_chart.html',
});

/**
 *  The DOWNSTREAM lifecycle interpretation, which is never stored in the
 *  archive: `status` is the curated disposition and `by`/`reason` the
 *  supersession edge. `deprecated` is read from the archive instead (an npm
 *  fact). A package flows out — drops to 0 after its last release — when it is
 *  npm-deprecated OR its status is anything other than `current`.
 *
 *  A package with no entry here is treated as `current`, so a newly collected
 *  package appears in the chart without a code change.
 */
const LIFECYCLE = Object.freeze({
  'jssm':                { status: 'current' },
  'jssm-fence':          { status: 'current' },
  'jssm-cli':            { status: 'current' },
  'codemirror-lang-fsl': { status: 'current' },
  'jssm-viz':            { status: 'obsoleted', by: 'jssm', reason: 'interned into main' },
  'jssm-viz-cli':        { status: 'obsoleted', by: 'jssm', reason: 'cli work' },
  'jssm-viz-demo':       { status: 'obsoleted', by: 'jssm', reason: 'interned (lit tags)' },
  'require_jssm':        { status: 'abandoned', by: 'jssm', reason: 'never took off' },
  'fsl':                 { status: 'reserved',  reason: 'org-name placeholder' },
});

/**
 *  Parse CLI flags.
 *
 *  @param argv - `process.argv.slice(2)`.
 *  @returns `{ fromDir, outDir, outFile }`; `fromDir` null means read the branch.
 *  @throws {Error} On an unknown flag.
 *
 *  @example
 *  parseArgs(['--from', 'build/pkgsizes']).fromDir   // => 'build/pkgsizes'
 */
function parseArgs(argv) {
  const opts = { fromDir: null, outDir: DEFAULTS.outDir, outFile: DEFAULTS.outFile };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if      (a === '--from') { opts.fromDir = argv[++i]; }
    else if (a === '--out')  { opts.outDir  = argv[++i]; }
    else { throw new Error(`unknown flag: ${a}`); }
  }
  return opts;
}

/**
 *  The paths `repos.json` may occupy, in precedence order, as slash-joined
 *  keys matching a `git ls-tree` listing.
 *
 *  @returns Candidate paths, best first: branch root, then the archive
 *           directory, then the hand-seeded `repo_timeline/`.
 *
 *  @example
 *  reposCandidates();   // => ['repos.json', 'package_sizes/repos.json', 'repo_timeline/repos.json']
 */
function reposCandidates() {
  return DEFAULTS.reposDirs.map(d => (d ? `${d}/${DEFAULTS.reposFile}` : DEFAULTS.reposFile));
}

/**
 *  Read every package archive plus the optional repo timeline.
 *
 *  From a local directory when `fromDir` is set, else from the `perf_results`
 *  branch via `git show`, exactly as {@link make_perf_chart} reads its runs.
 *  Either way the timeline is searched across {@link reposCandidates} rather
 *  than one fixed path, because the workflow and the original hand seed put it
 *  in different places.
 *
 *  @param fromDir - Local archive directory, or null to read the data branch.
 *  @returns `{ archives, repos }`, or null when the branch is unreachable —
 *           callers degrade gracefully on null so offline builds still pass.
 */
function readArchives(fromDir) {
  if (fromDir) {
    const archives = fs.readdirSync(fromDir)
      .filter(f => f.endsWith('.json') && f !== DEFAULTS.reposFile)
      .sort()
      .map(f => JSON.parse(fs.readFileSync(path.join(fromDir, f), 'utf8')));
    const rp = reposCandidates().map(c => path.join(fromDir, ...c.split('/'))).find(p => fs.existsSync(p));
    return { archives, repos: rp ? JSON.parse(fs.readFileSync(rp, 'utf8')) : null };
  }

  const git = (args, allowFail) => {
    try { return execFileSync('git', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 256 * 1024 * 1024 }); }
    catch (e) { if (allowFail) { return null; } throw e; }
  };

  if (git(['fetch', 'origin', DEFAULTS.branch], true) === null) { return null; }
  const listing = git(['ls-tree', '-r', 'FETCH_HEAD', '--name-only'], true);
  if (listing === null) { return null; }

  const files = listing.split('\n').map(s => s.trim()).filter(Boolean).sort();
  const archives = files
    .filter(p => p.startsWith(`${DEFAULTS.archiveDir}/`) && p.endsWith('.json'))
    .map(p => JSON.parse(git(['show', `FETCH_HEAD:${p}`], false)));

  const reposPath = reposCandidates().find(c => files.includes(c));
  return { archives, repos: reposPath ? JSON.parse(git(['show', `FETCH_HEAD:${reposPath}`], false)) : null };
}

/**
 *  Turn raw archives into the embedded payload: versions sorted by publish
 *  time, file paths interned once across every package, and the curated
 *  lifecycle joined on.
 *
 *  @param archives - Raw archive objects, each `{ package, versions }`.
 *  @returns `{ paths, packages }` — `paths` is the intern table.
 */
function buildPayload(archives) {
  const paths = [], pathIndex = new Map();
  const pi = p => { if (!pathIndex.has(p)) { pathIndex.set(p, paths.length); paths.push(p); } return pathIndex.get(p); };

  const packages = archives.map(raw => {
    const life = LIFECYCLE[raw.package] || { status: 'current' };
    const entries = Object.entries(raw.versions)
      .map(([v, rec]) => ({ v, t: Date.parse(rec.published) || 0, rec }))
      .sort((a, b) => a.t - b.t || (a.v < b.v ? -1 : 1));
    const versions = entries.map(({ v, t, rec }) => ({
      v, t,
      f: Object.entries(rec.files).map(([p, s]) => [pi(p), s]),
      ...(rec.deprecated ? { d: 1 } : {}),
    }));
    const deprecated = !!entries[entries.length - 1].rec.deprecated;
    return { name: raw.package, status: life.status, by: life.by || null,
             reason: life.reason || null, deprecated, versions };
  }).sort((a, b) => (a.name < b.name ? -1 : 1));

  return { paths, packages };
}

/**
 *  Reduce the repo timeline to the non-npm repos, which become zero-mass rails.
 *  A repo that publishes to npm is already a stream, and a repo with no
 *  lifespan cannot be drawn, so both are dropped.
 *
 *  @param repos - Parsed `repos.json`, or null.
 *  @param shipped - Set of package names that appear as streams.
 *  @returns `{ categoryOrder, repos }`, or null when there is nothing to draw.
 */
function buildRails(repos, shipped) {
  if (!repos) { return null; }
  const rows = repos.repos
    .filter(r => !shipped.has(r.name) && r.created && r.lastPush)
    .map(r => ({ name: r.name, category: r.category, by: r.obsoletedBy, what: r.obsoletedByWhat,
                 archived: !!r.archived, note: r.note,
                 t0: Date.parse(r.created), t1: Date.parse(r.lastPush) }))
    .sort((a, b) => a.t0 - b.t0 || (a.name < b.name ? -1 : 1));
  return rows.length ? { categoryOrder: repos.categoryOrder, repos: rows } : null;
}

/**
 *  Explain why {@link buildRails} produced nothing, distinguishing an absent
 *  dataset from a present-but-unusable one.
 *
 *  Worth its own function because the two failures want opposite responses and
 *  read identically from the chart: a missing file waits on the nightly, while
 *  a dataset whose repos predate the `created`/`lastPush` fields will never
 *  draw a rail no matter how many times that job runs. Reporting both as "no
 *  repo timeline found" sends the reader hunting for a file that is sitting
 *  right there.
 *
 *  @param repos - Parsed `repos.json`, or null when none was found.
 *  @returns A clause naming the actual cause, for the caller's one-line notice.
 *
 *  @example
 *  railsAbsenceReason(null);                                  // => 'no repo timeline found'
 *  railsAbsenceReason({ repos: [{ name: 'a' }] });            // => '1 repo in the timeline, 0 with created/lastPush dates (pre-lifespan schema)'
 */
function railsAbsenceReason(repos) {
  if (!repos) { return 'no repo timeline found'; }
  const total = repos.repos.length,
        dated = repos.repos.filter(r => r.created && r.lastPush).length;
  return dated === 0
    ? `${total} repo${total === 1 ? '' : 's'} in the timeline, 0 with created/lastPush dates (pre-lifespan schema)`
    : `${dated}/${total} timeline repos are dated, but all are npm streams already`;
}

/**
 *  Build the model-shaped package records the mass-flow model consumes, so the
 *  conservation gate runs over exactly what the browser will draw.
 *
 *  @param packages - From {@link buildPayload}.
 *  @param paths - The intern table from {@link buildPayload}.
 *  @returns Records carrying times, totals, lifecycle, and per-family spans.
 */
function flowRecords(packages, paths) {
  const famOf = paths.map(family);
  return packages.map(pk => {
    const times  = pk.versions.map(v => v.t);
    const totals = pk.versions.map(v => v.f.reduce((a, [, s]) => a + s, 0));
    const famSpan = new Map();
    pk.versions.forEach(v => {
      for (const [i] of v.f) {
        const f = famOf[i], e = famSpan.get(f);
        if (e) { e.last = v.t; } else { famSpan.set(f, { first: v.t, last: v.t }); }
      }
    });
    return { name: pk.name, times, totals, born: times[0], lastT: times[times.length - 1],
             dead: pk.deprecated || pk.status !== 'current', by: pk.by, status: pk.status,
             reason: pk.reason, famSpan };
  });
}

/**
 *  Read the source of a `node-only`-marked module, cut at its marker so the
 *  CommonJS export does not follow it into the browser. One copy of the logic,
 *  proved by the same tests the build runs.
 *
 *  @param file - Absolute path to the module.
 *  @returns Browser-safe source text.
 *  @throws {Error} If the marker is missing, which would ship a broken page.
 */
const NODE_ONLY_MARKER = '/* ---- node-only';
function browserSource(file) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(NODE_ONLY_MARKER)) { throw new Error(`${path.basename(file)} lost its node-only marker`); }
  return src.slice(0, src.indexOf(NODE_ONLY_MARKER));
}

const W = 1360;

const CLIENT = String.raw`
const D = window.__DATA__;
const P = D.paths, PKGS = D.packages;

const famOf = P.map(family);
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const kb = b => (b/1024).toFixed(0)+' KB';
const fm = b => b>=1048576?(b/1048576).toFixed(1)+'M':(b/1024).toFixed(0)+'K';

// ---- per-package precompute ----
PKGS.forEach((pk,idx)=>{
  pk.idx=idx;
  pk.times=pk.versions.map(r=>r.t);
  pk.fileMaps=pk.versions.map(r=>{const m=new Map();for(const [i,s] of r.f)m.set(i,s);return m;});
  pk.totals=pk.versions.map(r=>{let s=0;for(const [,b] of r.f)s+=b;return s;});
  pk.born=pk.times[0]; pk.lastT=pk.times[pk.times.length-1];
  pk.peak=Math.max.apply(null,pk.totals); pk.current=pk.totals[pk.totals.length-1];
  pk.dead=pk.deprecated||pk.status!=='current';   // "flows out" after last release
  // per-version family breakdown, so each package band can subdivide into its families
  pk.famAt=pk.versions.map(r=>{const m=new Map();for(const [i,s] of r.f){const f=famOf[i];m.set(f,(m.get(f)||0)+s);}return m;});
  const fpk=new Map(); for(const m of pk.famAt) for(const [f,s] of m) fpk.set(f,Math.max(fpk.get(f)||0,s));
  pk.fams=[...fpk.keys()].sort((a,b)=>fpk.get(b)-fpk.get(a));   // largest family first
});
// first/last publish time each file family appeared in each package. The flow
// model diffs these across packages to spot a DECOMPOSITION (a family leaving
// one package and turning up in another) without ever naming a package.
for(const pk of PKGS){ const sp=new Map();
  pk.famAt.forEach((m,vi)=>{ const t=pk.times[vi];
    for(const f of m.keys()){ const e=sp.get(f); if(e) e.last=t; else sp.set(f,{first:t,last:t}); } });
  pk.famSpan=sp; }
const PKByName=new Map(PKGS.map(p=>[p.name,p]));
function pkgHue(pk){return (pk.idx*137.508)%360;}
function pkgColor(pk){return pk.dead?'hsl('+pkgHue(pk).toFixed(0)+' 24% 60%)':'hsl('+pkgHue(pk).toFixed(0)+' 62% 46%)';}

// Each FILE FAMILY gets its own distinct hue, consistent across every package, so
// a package's stack reads as clearly different-coloured parts (not shades of one
// hue). Ordered by global peak so the biggest families get the most separated hues.
// Approximate visual area of each family = its total mass summed across every
// package and version. Families are placed on the colour ring in DESCENDING area,
// evenly spaced, with the ring rotated so 'core' sits at blue (240deg). Even
// spacing by area avoids the golden-angle "repeated-looking" hues.
const famPeakG=new Map();   // still used for legend/label ordering
for(const p of PKGS) for(const f of p.fams){ let mx=0; for(const m of p.famAt) mx=Math.max(mx,m.get(f)||0); famPeakG.set(f,Math.max(famPeakG.get(f)||0,mx)); }
const famArea=new Map();
for(const p of PKGS) for(const m of p.famAt) for(const [f,s] of m) famArea.set(f,(famArea.get(f)||0)+s);
const ALLFAMS=[...famArea.keys()].sort((a,b)=>famArea.get(b)-famArea.get(a));
const _step=360/Math.max(1,ALLFAMS.length);
const _coreIdx=Math.max(0,ALLFAMS.indexOf('core'));
const _off=240-_coreIdx*_step;                       // rotate ring so core -> blue
const famHue=new Map(ALLFAMS.map((f,i)=>[f,((i*_step+_off)%360+360)%360]));
// current shipping size per family = its total in the latest version of the ALIVE
// packages only (dead packages have flowed out to 0). Drives the key's now/peak
// sizes and the "still-shipping first, retired last" grouping.
const famCurrentG=new Map();
for(const pk of PKGS){ if(pk.dead) continue; const last=pk.famAt[pk.famAt.length-1]; for(const [f,s] of last) famCurrentG.set(f,(famCurrentG.get(f)||0)+s); }
// vivid, hue-distinct families in BOTH states (subdivision must stay legible);
// dead packages get only a slight lightening cue, not a desaturation that muddies them.
function famColorEco(pk,fam){ const h=famHue.get(fam)||0; return pk.dead?'hsl('+h.toFixed(0)+' 46% 58%)':'hsl('+h.toFixed(0)+' 60% 46%)'; }
const STATUS_TAG={current:'current',obsoleted:'obsoleted',abandoned:'abandoned',reserved:'reserved'};

// ---- state ----
const selected=new Set(PKGS.map(p=>p.name));   // package pills, all on
let stack=[{pkg:'jssm'}];   // default load: jssm proper (single package), see mode buttons below
let yMode='linear', xMode='version';

// visualization window: 'full' = whole history; 'count' = last N samples; 'range'
// = start..end (dates on the time axis, semver on the version axis). Restricts the
// drawn x-slice and rescales x/y to it, so recent history can be read at full height.
const win={mode:'full',count:0,start:'',end:''};
// prerelease-aware-ish semver compare: numeric major.minor.patch, then a plain
// release sorts AFTER its prereleases (5.163.4 > 5.163.4-x), and prerelease tags
// compare lexically/numerically (alpha.2 < alpha.10). Enough for this dataset.
function semverCmp(a,b){
  const split=v=>{const [core,pre]=String(v).split('-');const n=core.split('.').map(x=>parseInt(x,10)||0);return {n,pre};};
  const A=split(a),B=split(b);
  for(let i=0;i<3;i++){ if((A.n[i]||0)!==(B.n[i]||0)) return (A.n[i]||0)-(B.n[i]||0); }
  if(A.pre===B.pre) return 0;
  if(!A.pre) return 1; if(!B.pre) return -1;           // release outranks prerelease
  const ap=A.pre.split('.'),bp=B.pre.split('.');
  for(let i=0;i<Math.max(ap.length,bp.length);i++){
    const x=ap[i],y=bp[i]; if(x===y) continue; if(x===undefined) return -1; if(y===undefined) return 1;
    const nx=parseInt(x,10),ny=parseInt(y,10);
    if(!isNaN(nx)&&!isNaN(ny)) return nx-ny; return x<y?-1:1;
  }
  return 0;
}
// DUAL ORDERING: by-time draws in calendar order; by-version draws in true semver
// order (so v6.0.0-alpha.* append after 5.163.4 even though they were built in June).
function axisOrder(){
  const idx=F.times.map((_,i)=>i);
  if(F.kind==='eco'||xMode==='time') return idx.sort((a,b)=>F.times[a]-F.times[b]);
  return idx.sort((a,b)=>semverCmp(F.vlabels[a],F.vlabels[b])||F.times[a]-F.times[b]);
}
// window applies to the ORDERED sequence: last-N or a start..end range (dates on
// the time axis, semver on the version axis). Returns the visible data-indices.
function windowSeq(order){
  const N=order.length; if(N===0) return order;
  if(win.mode==='count'&&win.count>0) return order.slice(Math.max(0,N-win.count));
  if(win.mode==='range'){
    const useTime=F.kind==='eco'||xMode==='time';
    if(useTime){ const s=win.start?Date.parse(win.start):-Infinity, e=win.end?Date.parse(win.end)+864e5:Infinity;
      return order.filter(i=>F.times[i]>=s&&F.times[i]<=e); }
    return order.filter(i=>(!win.start||semverCmp(F.vlabels[i],win.start)>=0)&&(!win.end||semverCmp(F.vlabels[i],win.end)<=0));
  }
  return order;
}

const CW=1360,H=560,LX=80,RX=1030,TY=30,BY=498;
const FLOOR=1024;   // 1 KB log floor (ecosystem sizes span KB..tens of MB)
const TOPK=4;

// ---- ecosystem model (packages stacked on a shared time axis) ----
function ecoPkgs(){return PKGS.filter(p=>selected.has(p.name)).sort((a,b)=>a.born-b.born);}
function ecoTicks(pkgs){const s=new Set();for(const pk of pkgs)for(const t of pk.times)s.add(t);return [...s].sort((a,b)=>a-b);}
function ecoStep(pk,t){
  let idx=-1; for(let i=0;i<pk.times.length;i++){ if(pk.times[i]<=t) idx=i; else break; }
  if(idx<0) return 0;                       // not yet born
  if(pk.dead && t>pk.lastT) return 0;       // flowed out: drop after last release
  return pk.totals[idx];                     // else carry the latest size forward
}
// same step logic, but for one family's share of the package at time t
function ecoFamStep(pk,fam,t){
  let idx=-1; for(let i=0;i<pk.times.length;i++){ if(pk.times[i]<=t) idx=i; else break; }
  if(idx<0) return 0;
  if(pk.dead && t>pk.lastT) return 0;
  return pk.famAt[idx].get(fam)||0;
}
// A leaf band (one file, or a family's ·rest group) summed over ticks, with the
// same birth / flow-out rules as the package total.
function ecoLeafStep(pk,members,t){
  let idx=-1; for(let i=0;i<pk.times.length;i++){ if(pk.times[i]<=t) idx=i; else break; }
  if(idx<0) return 0;
  if(pk.dead && t>pk.lastT) return 0;
  const m=pk.fileMaps[idx]; let s=0; for(const i of members) s+=(m.get(i)||0); return s;
}
// leaf colour: family hue (so files group by family), lightness ramped by the
// file's rank within its family so the individual files inside a family are told apart.
function leafColor(fam,rank,n){
  const h=famHue.get(fam)||0; const f = n>1 ? rank/(n-1) : 0;
  return 'hsl('+h.toFixed(0)+' 58% '+(38+f*30).toFixed(0)+'%)';
}

// ---- single-package family view ----
function pkgView(pk){
  if(pk._view) return pk._view;                 // memoised: eco mode calls this for every package
  const fileMax=new Map(),famMax=new Map();
  for(const rec of pk.versions){const per=new Map();
    for(const [i,s] of rec.f){ fileMax.set(i,Math.max(fileMax.get(i)||0,s)); const f=famOf[i]; per.set(f,(per.get(f)||0)+s); }
    for(const [f,t] of per) famMax.set(f,Math.max(famMax.get(f)||0,t));
  }
  const families=[...famMax.keys()].sort((a,b)=>famMax.get(b)-famMax.get(a));
  const filesOfFamily=new Map(families.map(f=>[f,[...fileMax.keys()].filter(i=>famOf[i]===f).sort((a,b)=>fileMax.get(b)-fileMax.get(a))]));
  return pk._view={pk,fileMax,famMax,families,filesOfFamily};
}
function subBands(idxs,fam,fileMax){
  const sorted=idxs.slice().sort((a,b)=>fileMax.get(b)-fileMax.get(a));
  const kept=sorted.slice(0,TOPK),rest=sorted.slice(TOPK);
  const out=[]; const groupSize=kept.length+(rest.length?1:0);
  kept.forEach((i,rank)=>out.push({fam,members:[i],label:P[i].replace(/^dist\//,''),rank,groupSize}));
  if(rest.length)out.push({fam,members:rest,label:fam+' ·rest ('+rest.length+' files)',rest:true,rank:kept.length,groupSize});
  return out;
}
function famColor(b){
  const pk=PKByName.get(stack[0].pkg);
  const h=pkgHue(pk);
  const light=34+(b.rank/Math.max(1,b.groupSize-1))*34, sat=68-(b.rank/Math.max(1,b.groupSize-1))*16;
  return 'hsl('+h.toFixed(0)+' '+sat.toFixed(0)+'% '+light.toFixed(0)+'%)';
}

// ---- assemble the current frame (unifies both modes for one render path) ----
function frame(){
  if(stack.length===0){
    const pkgs=ecoPkgs(); const ticks=ecoTicks(pkgs);
    const bands=[];
    // full depth at the top level: package → family → leaf files (top-K + ·rest),
    // so every family already shows its constituent files without a click.
    for(const pk of pkgs){
      const view=pkgView(pk);
      for(const fam of view.families){
        for(const lb of subBands(view.filesOfFamily.get(fam),fam,view.fileMax)){
          bands.push({eco:true,pkg:pk,fam,members:lb.members,leaf:lb.label,rest:lb.rest,
            label:pk.name+' · '+fam+' · '+lb.label,
            color:leafColor(fam,lb.rank,lb.groupSize),
            vals:ticks.map(t=>ecoLeafStep(pk,lb.members,t))});
        }
      }
    }
    return {kind:'eco', N:ticks.length, times:ticks, vlabels:null, bands, pkgs};
  }
  const pk=PKByName.get(stack[0].pkg); const view=pkgView(pk);
  let bands = stack.length===1
    ? view.families.flatMap(f=>subBands(view.filesOfFamily.get(f),f,view.fileMax))
    : subBands(stack[1].members, stack[1].fam, view.fileMax);
  bands.forEach(b=>{ b.color=leafColor(b.fam,b.rank,b.groupSize);   // per-family hues, same palette as ecosystem (not all one package hue)
    b.vals=pk.versions.map((rec,vi)=>{const m=pk.fileMaps[vi];let s=0;for(const i of b.members)s+=(m.get(i)||0);return s;}); });
  return {kind:'pkg', pk, N:pk.versions.length, times:pk.times, vlabels:pk.versions.map(v=>v.v), bands};
}

let F=null, MAXY=1, SEQ=[];   // SEQ = visible data-indices, in display (axis) order
// x for the k-th drawn point: even spacing on the version axis, real time spacing
// on the time axis (so a parallel branch's gaps still read chronologically).
function xk(k){
  const useTime = F.kind==='eco' || xMode==='time';
  if(!useTime) return LX+(SEQ.length<=1?0:k/(SEQ.length-1))*(RX-LX);
  const t0=F.times[SEQ[0]], t1=F.times[SEQ[SEQ.length-1]];
  return LX+((F.times[SEQ[k]]-t0)/((t1-t0)||1))*(RX-LX);
}
function yOf(by){
  if(yMode==='log'){const lo=Math.log(FLOOR),hi=Math.log(MAXY);return BY-((Math.log(Math.max(by,FLOOR))-lo)/((hi-lo)||1))*(BY-TY);}
  return BY-(by/MAXY)*(BY-TY);
}
// px -> position k within SEQ (nearest)
function posAtX(px){
  const useTime = F.kind==='eco' || xMode==='time';
  if(!useTime) return Math.max(0,Math.min(SEQ.length-1,Math.round((px-LX)/(RX-LX)*(SEQ.length-1))));
  const t0=F.times[SEQ[0]],t1=F.times[SEQ[SEQ.length-1]],t=t0+((px-LX)/(RX-LX))*(t1-t0);
  let best=0,bd=Infinity; for(let k=0;k<SEQ.length;k++){const d=Math.abs(F.times[SEQ[k]]-t);if(d<bd){bd=d;best=k;}} return best;
}

// ---- Sankey / alluvial mass-flow mode --------------------------------------
// The model (stepAt / deriveEvents / buildFlow / conservationViolations) is
// injected verbatim from build/flow_model.cjs into its own script tag, so the
// browser and the node-side self-test run literally the same code. Everything
// here is LAYOUT -- no ecosystem knowledge lives in the renderer.
let flowMode=false, FLOW=null, FGEO=null;
// flow uses the full width (no side legend) and its own taller canvas, because
// the rotated event labels need room to fall away below the axis
const FLX=96, FRX=1264, FTY=56, FBY=444; let FH=606;
const RY0=FBY+104, RROW=11, RHEAD=16;      // zero-mass rail band, below the event labels
const REPOS=(D.repos&&D.repos.repos)||[], RCATS=(D.repos&&D.repos.categoryOrder)||[];
const NODEW=13, NODEGAP=12, STUB=34;
const KINDSTYLE={
  carry:    {op:0.40, lbl:'carried forward'},
  supersede:{op:0.86, lbl:'superseded into'},
  birth:    {op:0.34, lbl:'first release'},
  growth:   {op:0.34, lbl:'new code'},
  shrink:   {op:0.28, lbl:'shed'},
  discard:  {op:0.50, lbl:'not carried forward'},
  death:    {op:0.42, lbl:'ended here'},
  today:    {op:0.24, lbl:'still shipping'}
};
// the model wants plain records, not the render-side package objects
function flowPkgs(){ return PKGS.filter(p=>selected.has(p.name)); }

// One global byte->pixel scale so column heights stay comparable. In log mode a
// node's height is log-scaled (jssm-viz peaked 40000x above fsl, which would
// otherwise be a sub-pixel hairline) and each ribbon takes its share of that
// height pro rata, so ribbons still stack exactly inside every node.
function flowHeights(flow){
  const raw=m=>yMode==='log'?(Math.log(Math.max(m,FLOOR))-Math.log(FLOOR)+1):m;
  const perCol=flow.columns.map(()=>[]);
  for(const n of flow.nodes) perCol[n.col].push(n);
  for(const list of perCol) list.sort((a,b)=>PKByName.get(a.pkg).born-PKByName.get(b.pkg).born);
  let scale=Infinity;
  perCol.forEach(list=>{ if(!list.length) return;
    const avail=(FBY-FTY)-(list.length-1)*NODEGAP;
    const sum=list.reduce((a,n)=>a+raw(n.mass),0)||1;
    scale=Math.min(scale,avail/sum); });
  if(!isFinite(scale)) scale=1;
  perCol.forEach(list=>{
    const total=list.reduce((a,n)=>a+raw(n.mass)*scale,0)+(list.length-1)*NODEGAP;
    let y=FTY+((FBY-FTY)-total)/2;
    for(const n of list){ n.h=Math.max(1.2,raw(n.mass)*scale); n.y=y; y+=n.h+NODEGAP; }
  });
  return perCol;
}

// Assign each ribbon its slice of the node face it touches, ordered to minimise
// crossings: by the far endpoint's vertical position, with sources and sinks
// (which have no far endpoint) pinned to the outside.
function flowSlots(flow){
  const outs=new Map(), ins=new Map();
  const push=(m,n,l)=>{ if(!n) return; if(!m.has(n)) m.set(n,[]); m.get(n).push(l); };
  for(const l of flow.links){ push(outs,l.from,l); push(ins,l.to,l); }
  const rank=(l,side)=>{ const far=side==='out'?l.to:l.from; return far?far.y:(side==='out'?1e9:-1e9); };
  for(const [n,list] of outs){ list.sort((a,b)=>rank(a,'out')-rank(b,'out'));
    let y=n.y; for(const l of list){ const h=n.h*(l.bytes/n.mass); l.ay0=y; l.ay1=y+h; y+=h; } }
  for(const [n,list] of ins){ list.sort((a,b)=>rank(a,'in')-rank(b,'in'));
    let y=n.y; for(const l of list){ const h=n.h*(l.bytes/n.mass); l.by0=y; l.by1=y+h; y+=h; } }
}

function flowColX(ci,n){ return FLX+(n<=1?0:ci/(n-1))*(FRX-FLX-NODEW); }

// Repos that publish nothing to npm carry no mass, so they cannot be streams in
// a mass diagram. They get zero-mass HAIRLINE RAILS instead: a line spanning the
// repo's GitHub lifespan, on the same x axis as the flow, grouped by the
// maintainer's verbatim category. Same precedent as the area chart's key, where
// zero-shipping entries sort to the end behind a gap -- present and readable,
// never pretending to a mass they do not have.
// Rails are thin by nature, and a short-lived repo can end up a few pixels of
// hairline that reads as a smudge. RAILW is the floor for how THICK a rail
// draws, and RAILMIN the floor for how LONG: together they guarantee every
// repo is a legible mark no matter how brief its life. An archived repo still
// dashes -- the cue is the dash pattern, not a thinner line.
const RAILW=3, RAILMIN=6;
const CATHUE=new Map(RCATS.map((c,i)=>[c,(i*360/Math.max(1,RCATS.length)+18)%360]));
function catColor(c){ return 'hsl('+(CATHUE.get(c)||0).toFixed(0)+' 34% 52%)'; }

// The flow's x axis is a sequence of event columns, not linear time, so a date
// has to be interpolated between the columns that bracket it.
function railXFn(times,xs){
  return function(t){
    if(t<=times[0]) return xs[0];
    if(t>=times[times.length-1]) return xs[xs.length-1];
    for(let i=0;i+1<times.length;i++){ if(t<=times[i+1]){
      const f=(t-times[i])/((times[i+1]-times[i])||1); return xs[i]+f*(xs[i+1]-xs[i]); } }
    return xs[xs.length-1];
  };
}

let RAILS=[];
function renderRails(times,xs){
  RAILS=[];
  if(REPOS.length===0) return {svg:'',bottom:FBY+96};
  const X=railXFn(times,xs);
  let y=RY0, svg='';
  svg+='<text x="'+FLX+'" y="'+(y-16)+'" font-size="10.5" font-weight="bold" fill="#52514e">ecosystem repos that ship no npm mass — lifespan rails</text>';
  for(const cat of RCATS){
    const group=REPOS.filter(r=>r.category===cat);
    if(group.length===0) continue;
    svg+='<text x="'+FLX+'" y="'+y+'" font-size="9.5" fill="'+catColor(cat)+'">'+esc(cat)+'</text>';
    y+=RHEAD;
    for(const r of group.sort((a,b)=>a.t0-b.t0)){
      const x0=X(r.t0), x1=Math.max(X(r.t1),X(r.t0)+RAILMIN);   // a same-day repo is still a visible mark
      const rail={r:r,x0:x0,x1:x1,y:y,color:catColor(cat)};
      RAILS.push(rail);
      svg+='<line x1="'+x0.toFixed(1)+'" y1="'+y.toFixed(1)+'" x2="'+x1.toFixed(1)+'" y2="'+y.toFixed(1)+
           '" stroke="'+rail.color+'" stroke-width="'+RAILW+'" stroke-linecap="round"'+
           (r.archived?' stroke-dasharray="4 3"':'')+'/>';
      svg+='<circle cx="'+x0.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.4" fill="'+rail.color+'"/>';
      svg+='<circle cx="'+x1.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.4" fill="'+rail.color+'"/>';
      // label right of the rail when there is room, else left of it
      const w=r.name.length*5.1;
      const right=x1+6+w<FRX;
      svg+='<text x="'+((right?x1+6:x0-6)).toFixed(1)+'" y="'+(y+3.2).toFixed(1)+'" font-size="9" text-anchor="'+
           (right?'start':'end')+'" fill="#6b6a65">'+esc(r.name)+'</text>';
      svg+='<rect x="'+(x0-4).toFixed(1)+'" y="'+(y-5).toFixed(1)+'" width="'+(x1-x0+8).toFixed(1)+
           '" height="10" fill="transparent" data-fr="'+(RAILS.length-1)+'" class="rail"/>';
      y+=RROW;
    }
    y+=5;
  }

  // supersession, drawn as a pointer rather than a ribbon: these edges move
  // work, not bytes, so they must not read as mass crossing the diagram
  const railBy=new Map(RAILS.map(t=>[t.r.name,t]));
  let edges='';
  for(const t of RAILS){
    if(!t.r.by) continue;
    const target=railBy.get(t.r.by);
    let tx,ty;
    if(target){ tx=target.x0; ty=target.y; }
    else {
      const cand=FLOW.nodes.filter(n=>n.pkg===t.r.by);
      if(cand.length===0) continue;
      const hit=cand.find(n=>n.t>=t.r.t1)||cand[cand.length-1];
      tx=hit.x+NODEW/2; ty=hit.y+hit.h;
    }
    const mx=(t.x1+tx)/2;
    edges+='<path d="M'+t.x1.toFixed(1)+','+t.y.toFixed(1)+'Q'+mx.toFixed(1)+','+t.y.toFixed(1)+' '+
           tx.toFixed(1)+','+ty.toFixed(1)+'" fill="none" stroke="'+t.color+
           '" stroke-width="0.9" stroke-opacity="0.4" stroke-dasharray="2 3"/>';
  }
  return {svg:edges+svg,bottom:y};
}

function renderFlow(){
  const pkgs=flowPkgs();
  if(pkgs.length===0){ document.getElementById('chart').innerHTML='<p style="padding:20px">no packages selected</p>'; return; }
  FLOW=buildFlow(pkgs);
  const perCol=flowHeights(FLOW);
  flowSlots(FLOW);
  FGEO={perCol:perCol};
  const NC=FLOW.columns.length;
  FLOW.nodes.forEach(n=>{ n.x=flowColX(n.col,NC); });

  const nidx=new Map(); FLOW.nodes.forEach((n,i)=>nidx.set(n,i));
  const col=n=>pkgColor(PKByName.get(n.pkg));

  // ribbons first, nodes on top
  let ribs='';
  FLOW.links.forEach((l,li)=>{
    const st=KINDSTYLE[l.kind]||{op:0.3};
    const c=col(l.from||l.to);
    let d;
    if(l.from&&l.to){
      const xa=l.from.x+NODEW, xb=l.to.x, xm=(xa+xb)/2;
      d='M'+xa.toFixed(1)+','+l.ay0.toFixed(1)+
        'C'+xm.toFixed(1)+','+l.ay0.toFixed(1)+' '+xm.toFixed(1)+','+l.by0.toFixed(1)+' '+xb.toFixed(1)+','+l.by0.toFixed(1)+
        'L'+xb.toFixed(1)+','+l.by1.toFixed(1)+
        'C'+xm.toFixed(1)+','+l.by1.toFixed(1)+' '+xm.toFixed(1)+','+l.ay1.toFixed(1)+' '+xa.toFixed(1)+','+l.ay1.toFixed(1)+'Z';
    } else if(l.to){                                   // source: enters from the left edge
      const xb=l.to.x, xa=xb-STUB, mid=(l.by0+l.by1)/2, t=Math.max(0.5,(l.by1-l.by0)*0.22);
      d='M'+xa.toFixed(1)+','+(mid-t).toFixed(1)+'L'+xb.toFixed(1)+','+l.by0.toFixed(1)+
        'L'+xb.toFixed(1)+','+l.by1.toFixed(1)+'L'+xa.toFixed(1)+','+(mid+t).toFixed(1)+'Z';
    } else {                                           // sink: leaves to the right
      const xa=l.from.x+NODEW, xb=xa+STUB, mid=(l.ay0+l.ay1)/2, t=Math.max(0.5,(l.ay1-l.ay0)*0.22);
      d='M'+xa.toFixed(1)+','+l.ay0.toFixed(1)+'L'+xb.toFixed(1)+','+(mid-t).toFixed(1)+
        'L'+xb.toFixed(1)+','+(mid+t).toFixed(1)+'L'+xa.toFixed(1)+','+l.ay1.toFixed(1)+'Z';
    }
    ribs+='<path d="'+d+'" fill="'+c+'" fill-opacity="'+st.op+'" data-fl="'+li+'" class="rib"/>';
  });

  let rects='';
  FLOW.nodes.forEach((n,i)=>{
    rects+='<rect x="'+n.x.toFixed(1)+'" y="'+n.y.toFixed(1)+'" width="'+NODEW+'" height="'+n.h.toFixed(1)+
      '" fill="'+col(n)+'" data-fn="'+i+'" class="fnode"/>';
    if(n.h>=11){ rects+='<text x="'+(n.x+NODEW+4)+'" y="'+(n.y+n.h/2+3.4).toFixed(1)+'" font-size="9.5" fill="#3a3a37">'+esc(n.pkg)+'</text>'; }
  });

  // column headers: the derived event, and when it happened
  let heads='';
  FLOW.columns.forEach((c,ci)=>{
    const x=flowColX(ci,NC)+NODEW/2;
    const when=new Date(c.t).toISOString().slice(0,7);
    heads+='<line x1="'+x.toFixed(1)+'" y1="'+FTY+'" x2="'+x.toFixed(1)+'" y2="'+FBY+'" stroke="#f0efe9"/>';
    heads+='<text x="'+x.toFixed(1)+'" y="'+(FBY+18)+'" font-size="10" text-anchor="middle" fill="#6b6a65">'+when+'</text>';
    const lbl=c.label.length>30?c.label.slice(0,29)+'…':c.label;
    heads+='<text x="'+x.toFixed(1)+'" y="'+(FBY+34)+'" font-size="9.5" text-anchor="end" fill="#898781" transform="rotate(-20 '+x.toFixed(1)+' '+(FBY+34)+')">'+esc(lbl)+'</text>';
  });

  // the invariant, made visible: if a ribbon is ever mis-routed this stops
  // saying "conserving" and the chart admits it instead of looking plausible
  const bad=conservationViolations(FLOW);
  const inv=bad.length===0
    ? '<tspan fill="#2a7d46">conserving ✓</tspan>'
    : '<tspan fill="#b3261e">'+bad.length+' unbalanced node'+(bad.length===1?'':'s')+'</tspan>';

  const rails=renderRails(FLOW.columns.map(c=>c.t), FLOW.columns.map((c,ci)=>flowColX(ci,NC)+NODEW/2));
  FH=Math.max(606, rails.bottom+34);

  const KY=FH-16;                              // below the rotated event labels
  let key='', kx=FLX;
  for(const k of ['carry','supersede','birth','growth','discard','death']){
    key+='<rect x="'+kx+'" y="'+(KY-9)+'" width="16" height="9" fill="#4a4a46" fill-opacity="'+KINDSTYLE[k].op+'"/>'+
         '<text x="'+(kx+21)+'" y="'+KY+'" font-size="9.5" fill="#6b6a65">'+KINDSTYLE[k].lbl+'</text>';
    kx+=Math.max(96,KINDSTYLE[k].lbl.length*6.0+38);
  }

  const title=(yMode==='log'?'log':'linear')+' bytes · mass flow · '+NC+' derived events · '+selected.size+' of '+PKGS.length+' packages';
  document.getElementById('chart').innerHTML=
    '<svg width="'+CW+'" height="'+FH+'" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif">'+
    '<rect width="'+CW+'" height="'+FH+'" fill="#fcfcfb"/>'+
    '<text x="'+FLX+'" y="22" font-size="13.5" font-weight="bold" fill="#0b0b0b">'+esc(title)+'</text>'+
    '<text x="'+FLX+'" y="38" font-size="10.5" fill="#6b6a65">every column is an event the archive implies, never one we typed — '+inv+'</text>'+
    heads+ribs+rects+rails.svg+key+'</svg>';

  document.getElementById('pills').style.display='flex';
  const cr=document.getElementById('crumbs');
  cr.innerHTML='<button class="crumb" data-depth="0">mass flow</button>';
  cr.querySelectorAll('.crumb').forEach(b=>b.onclick=()=>{});
  document.querySelectorAll('[data-x]').forEach(b=>{ b.disabled=true; b.style.opacity='0.4'; b.style.cursor='not-allowed'; });
}

function render(){
  if(flowMode){ renderFlow(); return; }
  F=frame();
  SEQ=windowSeq(axisOrder()); if(SEQ.length===0) SEQ=axisOrder();
  const base=new Array(F.N).fill(0);
  MAXY=1; { let mx=0; for(const i of SEQ){ let s=0; for(const b of F.bands) s+=b.vals[i]; if(s>mx) mx=s; } MAXY=mx||1; }

  let polys='';
  F.bands.forEach((b,bi)=>{
    let pts=''; for(let k=0;k<SEQ.length;k++){const i=SEQ[k]; pts+=xk(k).toFixed(1)+','+yOf(base[i]+b.vals[i]).toFixed(1)+' ';}
    for(let k=SEQ.length-1;k>=0;k--){const i=SEQ[k]; pts+=xk(k).toFixed(1)+','+yOf(base[i]).toFixed(1)+' ';}
    const cls=(b.eco||b.rest)?'drill':'';
    polys+='<polygon points="'+pts.trim()+'" fill="'+b.color+'" data-b="'+bi+'" class="'+cls+'"/>';
    for(const i of SEQ) base[i]+=b.vals[i];
  });

  // y grid
  const mb=MAXY/1048576;
  // ticks are recomputed from the CURRENT height every render, so the axis always
  // spans the whole stack (it used to be a fixed array capped at 24M).
  let levels;
  if(yMode==='log'){
    levels=[]; for(let e=Math.floor(Math.log10(FLOOR/1048576)); Math.pow(10,e)<=mb*1.5; e++) levels.push(Math.pow(10,e));
  } else {
    // aim for ~10 gridlines at nice round values, recomputed for the CURRENT height
    const rough=(mb/10)||1, pw=Math.pow(10,Math.floor(Math.log10(rough))), n=rough/pw;
    const stp=(n<1.3?1:n<1.8?1.5:n<2.3?2:n<3.5?2.5:n<7.5?5:10)*pw;
    levels=[]; for(let v=stp; v<=mb*1.001; v+=stp) levels.push(v);
  }
  let grid='';
  for(const m of levels){const by=m*1048576; if(by>MAXY*1.02) continue; const y=yOf(by);
    const lbl=m>=1?m+'M':(m*1000).toFixed(m<0.01?0:0)+'K';
    grid+='<line x1="'+LX+'" y1="'+y.toFixed(1)+'" x2="'+RX+'" y2="'+y.toFixed(1)+'" stroke="#e1e0d9"/><text x="'+(LX-6)+'" y="'+(y+4).toFixed(1)+'" font-size="10" text-anchor="end" fill="#898781">'+lbl+'</text>';}

  // x axis (respects the window: labels are drawn only within W0..W1, and the time
  // axis drops to quarter ticks when the window spans less than ~2 years)
  const MON=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let xax=''; const useTime = F.kind==='eco' || xMode==='time';
  if(useTime){ const t0=F.times[SEQ[0]],t1=F.times[SEQ[SEQ.length-1]], spanYr=(t1-t0)/31557600000;
    const mark=(t,lbl)=>{ if(t<t0||t>t1)return; const x=LX+((t-t0)/((t1-t0)||1))*(RX-LX); xax+='<line x1="'+x.toFixed(1)+'" y1="'+TY+'" x2="'+x.toFixed(1)+'" y2="'+BY+'" stroke="#f0efe9"/><text x="'+x.toFixed(1)+'" y="'+(BY+16)+'" font-size="10" text-anchor="middle" fill="#898781">'+lbl+'</text>'; };
    if(spanYr>2.2){ for(let yr=2017;yr<=2027;yr++) mark(Date.parse(yr+'-01-01'),String(yr)); }
    else { for(let yr=2017;yr<=2027;yr++) for(const mo of [1,4,7,10]){ const mm=(mo<10?'0':'')+mo; mark(Date.parse(yr+'-'+mm+'-01'), (mo===1?yr+' ':'')+MON[mo]); } }
  } else { const st=Math.max(1,Math.ceil(SEQ.length/36)); for(let k=0;k<SEQ.length;k+=st){const x=xk(k);
      xax+='<text x="'+x.toFixed(1)+'" y="'+(BY+14)+'" font-size="7.5" text-anchor="end" fill="#898781" transform="rotate(-55 '+x.toFixed(1)+' '+(BY+14)+')">'+esc(F.vlabels[SEQ[k]])+'</text>';} }

  // legend
  let leg='',ly=42;
  if(F.kind==='eco'){
    const shown=[...new Set(F.bands.map(b=>b.fam))];
    const actF=shown.filter(f=>(famCurrentG.get(f)||0)>0).sort((a,b)=>(famCurrentG.get(b)||0)-(famCurrentG.get(a)||0));
    const retF=shown.filter(f=>!(famCurrentG.get(f)||0)).sort((a,b)=>(famPeakG.get(b)||0)-(famPeakG.get(a)||0));
    const famRow=f=>{ const cur=famCurrentG.get(f)||0; leg+='<rect x="'+(RX+16)+'" y="'+ly+'" width="11" height="11" fill="hsl('+(famHue.get(f)||0).toFixed(0)+' 58% 48%)"/><text x="'+(RX+32)+'" y="'+(ly+9)+'" font-size="10.5" fill="'+(cur?'#2a2a28':'#8a887f')+'">'+esc(f)+'</text><text x="'+(CW-8)+'" y="'+(ly+9)+'" font-size="9.5" text-anchor="end" fill="#52514e">'+(cur?fm(cur):'—')+' <tspan fill="#a5a399">('+fm(famPeakG.get(f)||0)+')</tspan></text>'; ly+=15; };
    leg+='<text x="'+(RX+16)+'" y="'+ly+'" font-size="10" font-weight="bold" fill="#52514e">file family</text><text x="'+(CW-8)+'" y="'+ly+'" font-size="9" text-anchor="end" fill="#9a988f">now (peak)</text>'; ly+=15;
    for(const f of actF) famRow(f);
    if(retF.length) ly+=8;                    // gap before the flowed-out families
    for(const f of retF) famRow(f);
    ly+=14;
    const aliveP=F.pkgs.filter(p=>!p.dead).sort((a,b)=>b.current-a.current);
    const deadP=F.pkgs.filter(p=>p.dead).sort((a,b)=>b.peak-a.peak);
    const pkgRow=p=>{ leg+='<text x="'+(RX+16)+'" y="'+ly+'" font-size="9.5" fill="'+(p.dead?'#8a887f':'#0b0b0b')+'">'+esc(p.name)+'</text><text x="'+(CW-8)+'" y="'+ly+'" font-size="9" text-anchor="end" fill="#a5a399">'+(p.dead?'0 ('+fm(p.peak)+')':fm(p.current))+'</text>'; ly+=13; };
    leg+='<text x="'+(RX+16)+'" y="'+ly+'" font-size="10" font-weight="bold" fill="#52514e">packages</text><text x="'+(CW-8)+'" y="'+ly+'" font-size="9" text-anchor="end" fill="#9a988f">now (peak)</text>'; ly+=14;
    for(const p of aliveP) pkgRow(p);
    if(deadP.length) ly+=8;                   // gap before the flowed-out packages
    for(const p of deadP) pkgRow(p);
  } else {
    const pk=F.pk;
    leg+='<text x="'+(RX+16)+'" y="'+(ly)+'" font-size="11" font-weight="bold" fill="#0b0b0b">'+esc(pk.name)+'</text>'; ly+=16;
    leg+='<text x="'+(RX+16)+'" y="'+(ly)+'" font-size="9.5" fill="#8a887f">'+STATUS_TAG[pk.status]+(pk.by?' → '+esc(pk.by):'')+'</text>'; ly+=8;
    if(pk.reason){leg+='<text x="'+(RX+16)+'" y="'+(ly+6)+'" font-size="9" fill="#a5a399">'+esc(pk.reason)+'</text>'; ly+=16;}
    ly+=6;
    const fams=[...new Set(F.bands.map(b=>b.fam))];
    for(const f of fams){const any=F.bands.find(b=>b.fam===f);
      leg+='<rect x="'+(RX+16)+'" y="'+ly+'" width="10" height="10" fill="'+any.color+'"/><text x="'+(RX+31)+'" y="'+(ly+9)+'" font-size="10" fill="#52514e">'+esc(f)+'</text>'; ly+=14;}
  }

  const scopeLabel = F.kind==='eco' ? (selected.size+' of '+PKGS.length+' packages') : (F.pk.name + (stack.length>1?' ▸ '+esc(stack[1].label):' — by file family'));
  const winLbl = win.mode==='count'?(' · last '+win.count):(win.mode==='range'?(' · '+(win.start||'…')+'–'+(win.end||'…')):'');
  const title=(yMode==='log'?'log':'linear')+' bytes · '+(F.kind==='eco'?'ecosystem · by publish time':(xMode==='time'?'by publish time':'by version'))+' · '+scopeLabel+winLbl;
  document.getElementById('chart').innerHTML='<svg width="'+CW+'" height="'+H+'" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,sans-serif"><rect width="'+CW+'" height="'+H+'" fill="#fcfcfb"/><text x="'+LX+'" y="20" font-size="13.5" font-weight="bold" fill="#0b0b0b">'+esc(title)+' <tspan fill-opacity="0.5">(lower is better)</tspan></text>'+grid+xax+polys+'<line x1="'+LX+'" y1="'+BY+'" x2="'+RX+'" y2="'+BY+'" stroke="#c3c2b7"/>'+leg+'</svg>';

  // breadcrumb
  let bc='<button class="crumb" data-depth="0">ecosystem</button>';
  stack.forEach((s,i)=>{ const lbl = i===0 ? s.pkg : s.label; bc+='<span class="sep">▸</span><button class="crumb" data-depth="'+(i+1)+'">'+esc(lbl)+'</button>'; });
  const cr=document.getElementById('crumbs'); cr.innerHTML=bc;
  cr.querySelectorAll('.crumb').forEach(btn=>btn.onclick=()=>{ stack=stack.slice(0,+btn.getAttribute('data-depth')); render(); });

  // pills (ecosystem only)
  const pillBox=document.getElementById('pills');
  pillBox.style.display = F.kind==='eco' ? 'flex' : 'none';

  // "by version" is meaningless across independently-versioned packages, so the
  // x toggle only applies inside a single package; disable it in ecosystem mode.
  document.querySelectorAll('[data-x]').forEach(b=>{ b.disabled = F.kind==='eco'; b.style.opacity = F.kind==='eco' ? '0.4' : '1'; b.style.cursor = F.kind==='eco' ? 'not-allowed' : 'pointer'; });

  // window range inputs take dates on the time axis, semver on the version axis
  const useTimeAxis = F.kind==='eco' || xMode==='time';
  const ws=document.getElementById('wstart'), we=document.getElementById('wend');
  if(ws){ ws.placeholder=useTimeAxis?'start date (YYYY-MM-DD)':'start version'; we.placeholder=useTimeAxis?'end date':'end version'; }
}

// pills built once
(function buildPills(){
  const box=document.getElementById('pills');
  let h='<span>packages</span>';
  for(const pk of PKGS.slice().sort((a,b)=>a.born-b.born)){
    h+='<button class="pill" data-pkg="'+esc(pk.name)+'" aria-pressed="true"><span class="dot" style="background:'+(pk.dead?'#b8b6ad':'#2a7d46')+'"></span>'+esc(pk.name)+'</button>';
  }
  box.innerHTML=h;
  box.querySelectorAll('.pill').forEach(btn=>btn.onclick=()=>{
    const n=btn.getAttribute('data-pkg');
    if(selected.has(n)){ if(selected.size>1) selected.delete(n); } else selected.add(n);
    btn.setAttribute('aria-pressed', selected.has(n));
    if(flowMode||stack.length===0) render();
  });
})();

const tt=document.getElementById('tt'), chart=document.getElementById('chart');
// flow-mode hover: ribbons report what moved and why, nodes report mass
function flowHover(el,e){
  let head,mid,hint='';
  if(el.getAttribute('data-fr')!==null){
    const t=RAILS[+el.getAttribute('data-fr')], r=t.r;
    const d=ms=>new Date(ms).toISOString().slice(0,10);
    head='<b>'+esc(r.name)+'</b> — '+esc(r.category);
    mid=d(r.t0)+' → '+d(r.t1)+(r.archived?' <i>(archived)</i>':'')+' · ships no npm mass';
    if(r.by) hint='<br>superseded by '+esc(r.by)+(r.what?' ('+esc(r.what)+')':'');
    if(r.note) hint+='<br><i>'+esc(r.note)+'</i>';
  } else if(el.getAttribute('data-fl')!==null){
    const l=FLOW.links[+el.getAttribute('data-fl')], st=KINDSTYLE[l.kind]||{lbl:l.kind};
    const a=l.from?l.from.pkg:null, b=l.to?l.to.pkg:null;
    head='<b>'+esc(a&&b?(a===b?a:a+' → '+b):(a||b))+'</b> — '+st.lbl;
    mid=fm(l.bytes)+(l.what?' · '+esc(l.what):'');
    const when=new Date((l.to||l.from).t).toISOString().slice(0,10);
    hint='<br>'+when;
  } else {
    const n=FLOW.nodes[+el.getAttribute('data-fn')], pk=PKByName.get(n.pkg);
    head='<b>'+esc(n.pkg)+'</b> — '+STATUS_TAG[pk.status];
    mid=new Date(n.t).toISOString().slice(0,10)+': '+fm(n.mass)+' installed';
    hint='<br><i>click to open '+esc(n.pkg)+'</i>';
  }
  tt.innerHTML=head+'<br>'+mid+hint;
  tt.style.left=(e.clientX+14)+'px'; tt.style.top=(e.clientY+14)+'px'; tt.style.opacity=1;
}
chart.addEventListener('mousemove',function(e){
  const el=e.target;
  if(flowMode){
    if(el&&(el.getAttribute('data-fl')!==null||el.getAttribute('data-fn')!==null||el.getAttribute('data-fr')!==null)) flowHover(el,e);
    else tt.style.opacity=0;
    return;
  }
  if(el&&el.tagName==='polygon'&&el.getAttribute('data-b')!==null){
    const b=F.bands[+el.getAttribute('data-b')];
    const r=el.ownerSVGElement.getBoundingClientRect();
    const i=SEQ[posAtX((e.clientX-r.left)*(CW/r.width))];
    let head, mid, hint='';
    if(F.kind==='eco'){ const pk=b.pkg;
      head='<b>'+esc(b.leaf)+'</b> — '+esc(pk.name)+' · '+esc(b.fam);
      const when=new Date(F.times[i]).toISOString().slice(0,10);
      mid=when+': '+kb(b.vals[i])+(b.vals[i]===0&&pk.dead?' <i>(flowed out)</i>':'')+' · '+STATUS_TAG[pk.status];
      hint='<br><i>click to open '+esc(pk.name)+'</i>';
    } else {
      head='<b>'+esc(b.label)+'</b> — '+esc(b.fam);
      mid=esc(F.vlabels[i])+': '+kb(b.vals[i]);
      if(b.rest) hint='<br><i>click to drill into '+b.members.length+' files</i>';
    }
    tt.innerHTML=head+'<br>'+mid+'<br>today: '+kb(b.vals[F.N-1])+hint;
    tt.style.left=(e.clientX+14)+'px'; tt.style.top=(e.clientY+14)+'px'; tt.style.opacity=1;
  } else tt.style.opacity=0;
});
chart.addEventListener('mouseleave',()=>tt.style.opacity=0);
chart.addEventListener('click',function(e){
  const el=e.target;
  if(flowMode){                              // a node is a package: drill straight in
    if(el&&el.getAttribute('data-fn')!==null){
      flowMode=false; stack=[{pkg:FLOW.nodes[+el.getAttribute('data-fn')].pkg}];
      document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',false));
      render();
    }
    return;
  }
  if(!(el&&el.tagName==='polygon'&&el.getAttribute('data-b')!==null))return;
  const b=F.bands[+el.getAttribute('data-b')];
  if(F.kind==='eco'){ stack=[{pkg:b.pkg.name}]; render(); }
  else if(b.rest){ stack=stack.slice(0,1).concat([{fam:b.fam,members:b.members,label:b.label}]); render(); }
});

function wire(group,set){document.querySelectorAll('[data-'+group+']').forEach(btn=>btn.addEventListener('click',()=>{set(btn.getAttribute('data-'+group));document.querySelectorAll('[data-'+group+']').forEach(x=>x.setAttribute('aria-pressed',x===btn));render();}));}
wire('y',v=>yMode=v); wire('x',v=>xMode=v);
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
  const m=btn.getAttribute('data-mode');
  document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',x===btn));
  flowMode = m==='flow';
  if(!flowMode) stack = m==='eco' ? [] : [{pkg:'jssm'}];
  render();
}));
document.querySelectorAll('[data-win]').forEach(btn=>btn.addEventListener('click',()=>{
  const v=btn.getAttribute('data-win');
  if(v==='full'){ win.mode='full'; } else { win.mode='count'; win.count=+v; }
  document.querySelectorAll('[data-win]').forEach(x=>x.setAttribute('aria-pressed',x===btn));
  render();
}));
document.getElementById('wset').addEventListener('click',()=>{
  win.mode='range'; win.start=document.getElementById('wstart').value.trim(); win.end=document.getElementById('wend').value.trim();
  document.querySelectorAll('[data-win]').forEach(x=>x.setAttribute('aria-pressed','false'));
  render();
});
render();
`;

/**
 *  Render the whole self-contained page.
 *
 *  The model and the family classifier are injected as their own script tags
 *  rather than pasted into {@link CLIENT}, so the browser runs exactly the
 *  source the unit tests cover.
 *
 *  @param payload - `{ paths, packages, repos }` to embed.
 *  @param flowSrc - Browser-safe `flow_model.cjs` source.
 *  @param famSrc - Browser-safe `size_families.cjs` source.
 *  @returns Complete HTML text.
 */
function renderPage(payload, flowSrc, famSrc) {
return `<title>jssm ecosystem — package size archaeology</title>
<style>
:root{--bg:#f7f7f5;--ink:#1a1a19;--sub:#5c5b57;--line:#e3e2dc;--accent:#2a7d46;--chip:#ffffff;--chipink:#1a1a19}
@media (prefers-color-scheme: dark){:root{--bg:#141413;--ink:#f0efec;--sub:#a3a29b;--line:#33322f;--chip:#26251f;--chipink:#f0efec}}
:root[data-theme=dark]{--bg:#141413;--ink:#f0efec;--sub:#a3a29b;--line:#33322f;--chip:#26251f;--chipink:#f0efec}
:root[data-theme=light]{--bg:#f7f7f5;--ink:#1a1a19;--sub:#5c5b57;--line:#e3e2dc;--chip:#ffffff;--chipink:#1a1a19}
*{box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif;margin:0;padding:30px 24px}
main{max-width:1420px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
h1{font-size:21px;margin:0}
p{color:var(--sub);font-size:14px;line-height:1.55;max-width:82ch;margin:0}
.controls{display:flex;gap:20px;flex-wrap:wrap;align-items:center}
.group{display:flex;gap:4px;align-items:center}
.group>span{font-size:12px;color:var(--sub);margin-right:4px;text-transform:uppercase;letter-spacing:.04em}
button{font:inherit;font-size:13px;padding:5px 12px;border:1px solid #9cc6ec;background:#e0f0ff;color:#12283a;border-radius:999px;cursor:pointer}
button[aria-pressed=true]{background:var(--accent);color:#fff;border-color:var(--accent)}
input.win{font:inherit;font-size:12px;padding:4px 8px;border:1px solid var(--line);background:var(--chip);color:var(--chipink);border-radius:6px;width:158px}
button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
#pills{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
#pills>span{font-size:12px;color:var(--sub);margin-right:2px;text-transform:uppercase;letter-spacing:.04em}
.pill{padding:4px 10px 4px 8px;display:inline-flex;align-items:center;gap:6px;background:#e0f0ff;color:#12283a;border-color:#9cc6ec}
.pill .dot{width:9px;height:9px;border-radius:50%;display:inline-block;opacity:.55}
.pill[aria-pressed=true]{background:#e0f0ff;color:#12283a;border-color:var(--accent)}
.pill[aria-pressed=true] .dot{opacity:1}
.pill[aria-pressed=false]{opacity:.5;text-decoration:line-through}
#crumbs{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px}
#crumbs .crumb{padding:3px 10px}
#crumbs .crumb:last-child{background:var(--accent);color:#fff;border-color:var(--accent)}
#crumbs .sep{color:var(--sub)}
.chart{background:#fcfcfb;border:1px solid var(--line);border-radius:6px;padding:8px;overflow-x:auto}
.chart svg{display:block;min-width:${W}px}
.chart svg polygon{cursor:crosshair}
.chart svg polygon.drill{cursor:zoom-in}
.chart svg polygon:hover{stroke:rgba(0,0,0,.55);stroke-width:1}
.chart svg polygon.drill:hover{stroke:#000;stroke-width:1.5}
.chart svg path.rib{cursor:crosshair}
.chart svg path.rib:hover{fill-opacity:0.95}
.chart svg rect.fnode{cursor:zoom-in}
.chart svg rect.fnode:hover{stroke:#000;stroke-width:1.5}
.chart svg rect.rail{cursor:crosshair}
.chart svg rect.rail:hover{fill:rgba(0,0,0,.07)}
#tt{position:fixed;pointer-events:none;background:#1a1a19;color:#fff;padding:6px 9px;border-radius:5px;font-size:12px;line-height:1.4;font-variant-numeric:tabular-nums;opacity:0;transition:opacity .08s;z-index:20;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.3)}
#tt i{color:#8fd0a6;font-style:normal}
</style>
<main>
<h1>jssm ecosystem — installed size, stacked by package</h1>
<p>Every published jssm-family npm package, from the real size archaeology (paths interned, embedded once). In <strong>ecosystem</strong> mode each package is stacked on a shared publish-time axis; a package that is <strong>npm-deprecated</strong> or <strong>obsoleted</strong> (folded into jssm) drops to 0 on the tick after its final release, so you can watch libraries flow in as they are born and out as they are superseded. Toggle packages with the pills; <strong>click any package</strong> to drill into its own files; <strong>hover</strong> for the size at the tick under your cursor.</p>
<p><strong>Mass flow</strong> answers the other question — <em>where did the bytes go</em>. Every column is an event the archive implies (a birth, a retirement, a supersession, a decomposition), never one we typed, so adding packages adds columns without touching code. Ribbon thickness is measured bytes crossing a package boundary, and the diagram <strong>conserves</strong>: what enters a node equals its height equals what leaves, with new code and shed weight drawn as explicit stubs. That is why <code>jssm-viz</code>'s final 15&#8202;MB reads as <em>not carried forward</em> rather than as a fat ribbon into <code>jssm</code> — the viz work was interned, but the interned form is far smaller, and jssm never gained that mass.</p>
<div class="controls">
  <div class="group"><span>mode</span><button data-mode="eco">ecosystem</button><button data-mode="jssm" aria-pressed="true">jssm proper</button><button data-mode="flow">mass flow</button></div>
  <div class="group"><span>y</span><button data-y="linear" aria-pressed="true">linear</button><button data-y="log">log</button></div>
  <div class="group"><span>x</span><button data-x="time">by time</button><button data-x="version" aria-pressed="true">by version</button></div>
</div>
<div class="controls">
  <div class="group"><span>window</span><button data-win="full" aria-pressed="true">full</button><button data-win="25">last 25</button><button data-win="50">last 50</button><button data-win="100">last 100</button><input id="wstart" class="win"><input id="wend" class="win"><button id="wset">set range</button></div>
</div>
<div id="pills"></div>
<div id="crumbs"></div>
<div class="chart" id="chart"></div>
<p>Watch the consolidation: <code>jssm-viz</code>, <code>jssm-viz-cli</code>, and <code>jssm-viz-demo</code> each grow, then flow out as their work is interned into <code>jssm</code> for v6. The early <code>jssm-viz-cli</code> bulge (7&#8202;MB) and <code>jssm-viz-demo</code> peak (14&#8202;MB) are real bundled-asset eras. Switch to <strong>log</strong> to see the small packages next to jssm's mass.</p>
</main>
<div id="tt"></div>
<script>window.__DATA__=${JSON.stringify(payload)};</script>
<script>${famSrc}</script>
<script>${flowSrc}</script>
<script>${CLIENT}</script>`;
}


/**
 *  Entry point. Reads the archives, gates on conservation, writes the page.
 *
 *  Exits 0 without writing when the data branch is unreachable, so an offline
 *  build still passes; exits 1 when the mass-flow graph fails to balance, so a
 *  chart that misrepresents its own data can never publish.
 *
 *  @returns Process exit code.
 */
function main() {
  const opts = parseArgs(process.argv.slice(2));

  const read = readArchives(opts.fromDir);
  if (read === null || read.archives.length === 0) {
    process.stdout.write(`size_chart: ${DEFAULTS.branch} unreachable or empty; keeping existing artifacts\n`);
    return 0;
  }

  const { paths, packages } = buildPayload(read.archives);
  const rails = buildRails(read.repos, new Set(packages.map(p => p.name)));
  if (!rails) { process.stdout.write(`size_chart: ${railsAbsenceReason(read.repos)}; rendering without lifespan rails\n`); }

  // The gate. Conservation must hold over exactly the records the browser will
  // draw, or we refuse to publish rather than ship a plausible-looking lie.
  const flow = flowModel.buildFlow(flowRecords(packages, paths));
  const bad  = flowModel.conservationViolations(flow);
  if (bad.length) {
    process.stderr.write(`size_chart: mass flow does not conserve at ${bad.length} node(s); refusing to publish\n`);
    for (const b of bad.slice(0, 10)) {
      process.stderr.write(`  column ${b.col} ${b.pkg}: mass ${b.mass}, in ${b.inflow}, out ${b.outflow}\n`);
    }
    return 1;
  }

  const html = renderPage({ paths, packages, repos: rails },
                          browserSource(path.join(__dirname, 'flow_model.cjs')),
                          browserSource(path.join(__dirname, 'size_families.cjs')));

  fs.mkdirSync(opts.outDir, { recursive: true });
  const out = path.join(opts.outDir, opts.outFile);
  fs.writeFileSync(out, html);

  const nver = packages.reduce((a, p) => a + p.versions.length, 0);
  process.stdout.write(`size_chart: ${packages.length} packages, ${nver} versions, ${paths.length} interned paths, ` +
    `${flow.columns.length} flow columns (conserving), ${rails ? rails.repos.length : 0} rails; ` +
    `${(Buffer.byteLength(html) / 1024).toFixed(0)}KB -> ${out}\n`);
  return 0;
}


module.exports = { parseArgs, buildPayload, buildRails, railsAbsenceReason, reposCandidates, flowRecords, browserSource, renderPage, LIFECYCLE, DEFAULTS };

if (require.main === module) { process.exit(main()); }
