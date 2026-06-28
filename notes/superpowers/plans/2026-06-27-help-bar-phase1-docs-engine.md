# Help-bar Phase 1 (Docs Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the cm6-editor `#docs` panel into a manifest-driven, drill-in language-docs IA browser, backed by a durable `src/help/` markdown tree and the existing `teaching-surface.json`, with coverage checks #2–#4 + fence doctests and 2–3 exemplar pages per section.

**Architecture:** No backend. The sketch (served from repo root) fetches `src/data/teaching-surface.json` + a generated `src/help/pages.json`, builds a three-level drill-in nav, fetches a page's markdown on demand, strips its front-matter, and renders the body with a minimal custom renderer. Node tooling scans page front-matter into `pages.json`, computes the coverage join, and runs checks #1–#4 + a fence doctest.

**Tech Stack:** Vanilla ES modules (`.mjs`) in the sketch; plain-node `.cjs`/`.mjs` for tooling (no `node_modules` needed for the checks); CodeMirror 6 (existing); Playwright for the UI smoke test (browsers already machine-wide).

## Global Constraints

- Phase 1 stays in the **prototype** `sketch/cm6-editor`; do NOT productionize into `./cm6`.
- Authored pages live in the **durable** `src/help/<section>/<page-id>.md`; never inside the sketch.
- **No new runtime dependency** for markdown rendering — a minimal custom renderer only.
- Tooling is **plain node**; `markdown_mini` must be testable under plain `node` (renders to an HTML **string**).
- Checks run in **validate-present mode**: enforce contracts for features a page claims; *report* (don't fail on) uncovered features. Full coverage is Phase 2.
- The six section ids are exactly: `getting-started`, `about-state-machines`, `tutorials`, `example-machines`, `index`, `search`.
- Conventional Commits; commit per task; **do not** change `package.json` version.
- Node for scripting (not Python). **No compound shell commands** (no `&&`/`;`/pipes) — one command per step. Launch `npm` from a Bash tool.
- The sketch needs `dist/` built (`editor.js` imports `../../dist/jssm.es6.mjs` and `../../dist/cdn/viz.js`).

---

### Task 1: Import the sidebar WIP and build dist

**Files:**
- Modify (overwrite from main checkout): `sketch/cm6-editor/*`
- Build artifact (gitignored): `dist/`

**Interfaces:**
- Produces: a runnable sketch in the worktree with `index.html`, `editor.js`, and the modules `completion.mjs`, `editor_theme.mjs`, `layout.mjs`, `semantic_overlay.mjs`, `splitter.mjs`, `diagnostics.mjs`.

- [ ] **Step 1: Copy the WIP from the main checkout into the worktree**

Run:
```
cp -r "C:/Users/john/projects/jssm/sketch/cm6-editor/." sketch/cm6-editor/
```
(Single command. Brings the uncommitted WIP modules + edits into the worktree, leaving the main checkout untouched.)

- [ ] **Step 2: Verify the expected files are present**

Run:
```
ls -1 sketch/cm6-editor
```
Expected: includes `completion.mjs`, `editor_theme.mjs`, `layout.mjs`, `semantic_overlay.mjs`, `splitter.mjs`, `docs`-bearing `index.html`, `editor.js`.

- [ ] **Step 3: Install deps (needed for the build + Playwright later)**

Run (from a Bash tool):
```
npm install
```
Expected: completes; if a transient `.git/objects` permission error appears, just re-run.

- [ ] **Step 4: Build dist so the sketch can load the parser + viz**

Run (from a Bash tool):
```
npm run make
```
Expected: `dist/jssm.es6.mjs` and `dist/cdn/viz.js` exist afterward.

- [ ] **Step 5: Commit the imported WIP**

```
git add sketch/cm6-editor
git commit -m "feat(sketch): import help-sidebar WIP (docs panel, layout, splitter, completion)"
```

---

### Task 2: Minimal markdown renderer (`markdown_mini.mjs`)

**Files:**
- Create: `sketch/cm6-editor/markdown_mini.mjs`
- Test: `sketch/cm6-editor/tests/markdown_mini.test.mjs`

**Interfaces:**
- Produces:
  - `export function renderMarkdown(md: string): string` — HTML string for the supported subset.
  - `export function stripFrontMatter(text: string): string` — returns `text` with a leading `---\n…\n---\n` block removed (body only).
  - `export function parseFenceInfo(info: string): { lang: string, attrs: object }` — parses ` ```fsl {teaches: x, run: true} ` info strings.

- [ ] **Step 1: Write the failing test**

```js
// sketch/cm6-editor/tests/markdown_mini.test.mjs
import assert from 'node:assert/strict';
import { renderMarkdown, stripFrontMatter, parseFenceInfo } from '../markdown_mini.mjs';

// headings, inline, lists
const h = renderMarkdown('# Title\n\nA **bold** and `code` and [x](http://y).\n\n- one\n- two\n');
assert.match(h, /<h1>Title<\/h1>/);
assert.match(h, /<strong>bold<\/strong>/);
assert.match(h, /<code>code<\/code>/);
assert.match(h, /<a href="http:\/\/y">x<\/a>/);
assert.match(h, /<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);

// front-matter strip
assert.equal(stripFrontMatter('---\nid: a\n---\nbody\n'), 'body\n');
assert.equal(stripFrontMatter('no front matter\n'), 'no front matter\n');

// fence info parsing
assert.deepEqual(parseFenceInfo('fsl {teaches: timed-transition, run: true}'),
  { lang: 'fsl', attrs: { teaches: 'timed-transition', run: true } });
assert.deepEqual(parseFenceInfo('js'), { lang: 'js', attrs: {} });

// fsl fence becomes a labelled block carrying its feature + run flag
const f = renderMarkdown('```fsl {teaches: transitions, run: true}\na -> b;\n```\n');
assert.match(f, /data-fsl-example/);
assert.match(f, /data-teaches="transitions"/);
assert.match(f, /data-run="true"/);

console.log('markdown_mini OK');
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```
node sketch/cm6-editor/tests/markdown_mini.test.mjs
```
Expected: FAIL (`Cannot find module ... markdown_mini.mjs`).

- [ ] **Step 3: Implement the renderer**

```js
// sketch/cm6-editor/markdown_mini.mjs

/** Remove a leading `---\n…\n---` front-matter block, returning the body. */
export function stripFrontMatter(text) {
  const m = /^---\n[\s\S]*?\n---\n?/.exec(text);
  return m ? text.slice(m[0].length) : text;
}

/** Parse a fenced-code info string like `fsl {teaches: x, run: true}`. */
export function parseFenceInfo(info) {
  const m = /^(\S+)\s*(?:\{([^}]*)\})?/.exec(info.trim()) || [];
  const lang = m[1] || '';
  const attrs = {};
  for (const pair of (m[2] || '').split(',')) {
    const kv = pair.split(':');
    if (kv.length < 2) continue;
    const k = kv[0].trim();
    let v = kv.slice(1).join(':').trim();
    if (v === 'true') v = true; else if (v === 'false') v = false;
    if (k) attrs[k] = v;
  }
  return { lang, attrs };
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

/** Render the supported markdown subset to an HTML string. */
export function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    const fence = /^```(.*)$/.exec(line);
    if (fence) {
      const { lang, attrs } = parseFenceInfo(fence[1]);
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // closing fence
      const code = esc(buf.join('\n'));
      if (lang === 'fsl') {
        const teaches = attrs.teaches ? ` data-teaches="${esc(String(attrs.teaches))}"` : '';
        const run = attrs.run === true ? ' data-run="true"' : '';
        out.push(`<pre data-fsl-example${teaches}${run}><code>${code}</code></pre>`);
      } else {
        out.push(`<pre><code>${code}</code></pre>`);
      }
      continue;
    }

    // headings
    const head = /^(#{1,3})\s+(.*)$/.exec(line);
    if (head) { const n = head[1].length; out.push(`<h${n}>${inline(head[2])}</h${n}>`); i++; continue; }

    // horizontal rule
    if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      out.push('<ul>');
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].replace(/^\s*[-*]\s+/, ''))}</li>`); i++;
      }
      out.push('</ul>');
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      out.push('<ol>');
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`); i++;
      }
      out.push('</ol>');
      continue;
    }

    // blank
    if (/^\s*$/.test(line)) { i++; continue; }

    // paragraph (collect until blank)
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|```|\s*[-*]\s|\s*\d+\.\s|---+\s*$)/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```
node sketch/cm6-editor/tests/markdown_mini.test.mjs
```
Expected: prints `markdown_mini OK`, exit 0.

- [ ] **Step 5: Commit**

```
git add sketch/cm6-editor/markdown_mini.mjs sketch/cm6-editor/tests/markdown_mini.test.mjs
git commit -m "feat(sketch): minimal markdown renderer with fsl-fence tagging"
```

---

### Task 3: Page contract + `scan_pages.cjs` + first exemplar page

**Files:**
- Create: `src/help/getting-started/welcome.md`
- Create: `src/scripts/teaching_surface/scan_pages.cjs`
- Create: `src/help/pages.json` (generated output, committed)
- Test: `src/scripts/teaching_surface/tests/scan_pages.test.cjs`

**Interfaces:**
- Consumes: `src/data/teaching-surface.json` (existing manifest).
- Produces:
  - `scanPages(helpDir): { pages: Page[], coverage: Record<featureId, {page,treatment}[]> }`
  - `Page = { id, section, title, order, source, teaches: string[], mentions: string[], indexTerms: string[], fences: {teaches?:string, run?:boolean}[] }`
  - writes `src/help/pages.json` = `{ generated:true, pages: Page[] }`.

- [ ] **Step 1: Write the first exemplar page (scan input + fixture)**

```markdown
<!-- src/help/getting-started/welcome.md -->
---
id: welcome
section: getting-started
title: "Welcome to FSL"
order: 10
teaches: []
mentions: [transitions]
indexTerms: [intro, start, hello]
---

# Welcome to FSL

FSL is a small language for finite state machines. Most machines are one line.

```fsl {teaches: transitions, run: true}
Red 'go' -> Green 'go' -> Yellow 'go' -> Red;
```
```

- [ ] **Step 2: Write the failing test**

```js
// src/scripts/teaching_surface/tests/scan_pages.test.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const { scanPages } = require('../scan_pages.cjs');

const helpDir = path.join(__dirname, '..', '..', '..', 'help');
const { pages, coverage } = scanPages(helpDir);

const welcome = pages.find(p => p.id === 'welcome');
assert.ok(welcome, 'welcome page found');
assert.equal(welcome.section, 'getting-started');
assert.equal(welcome.order, 10);
assert.deepEqual(welcome.mentions, ['transitions']);
assert.equal(welcome.fences.length, 1);
assert.equal(welcome.fences[0].teaches, 'transitions');
assert.equal(welcome.fences[0].run, true);

// coverage join: a tagged run-fence credits 'example'; mentions credits 'mention'
assert.ok(coverage['transitions'].some(c => c.treatment === 'example'));
assert.ok(coverage['transitions'].some(c => c.treatment === 'mention'));

console.log('scan_pages OK');
```

- [ ] **Step 3: Run it to verify it fails**

Run:
```
node src/scripts/teaching_surface/tests/scan_pages.test.cjs
```
Expected: FAIL (`Cannot find module ../scan_pages.cjs`).

- [ ] **Step 4: Implement `scan_pages.cjs`**

```js
// src/scripts/teaching_surface/scan_pages.cjs
'use strict';
const fs = require('node:fs');
const path = require('node:path');

/** Parse the leading `---`-delimited front-matter into a flat object. */
function parseFrontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  const front = {};
  if (!m) return { front, body: text };
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^\[.*\]$/.test(v)) {
      v = v.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, '');
      if (/^\d+$/.test(v)) v = Number(v);
    }
    front[kv[1]] = v;
  }
  return { front, body: text.slice(m[0].length) };
}

/** Extract tagged fsl fences: ```fsl {teaches: x, run: true} */
function scanFences(body) {
  const fences = [];
  const re = /^```fsl\s*\{([^}]*)\}/gm;
  let m;
  while ((m = re.exec(body))) {
    const attrs = {};
    for (const pair of m[1].split(',')) {
      const i = pair.indexOf(':');
      if (i < 0) continue;
      const k = pair.slice(0, i).trim();
      let v = pair.slice(i + 1).trim();
      if (v === 'true') v = true; else if (v === 'false') v = false;
      if (k) attrs[k] = v;
    }
    fences.push(attrs);
  }
  return fences;
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** Scan the help tree into page records + the coverage join. */
function scanPages(helpDir) {
  const pages = [];
  for (const file of walk(helpDir)) {
    const text = fs.readFileSync(file, 'utf8');
    const { front, body } = parseFrontMatter(text);
    const arr = k => Array.isArray(front[k]) ? front[k] : (front[k] ? [front[k]] : []);
    pages.push({
      id: front.id, section: front.section, title: front.title,
      order: typeof front.order === 'number' ? front.order : 0,
      source: path.relative(path.join(helpDir, '..', '..'), file).replace(/\\/g, '/'),
      teaches: arr('teaches'), mentions: arr('mentions'), indexTerms: arr('indexTerms'),
      fences: scanFences(body),
    });
  }
  const coverage = {};
  const add = (feat, page, treatment) => {
    if (!feat) return;
    (coverage[feat] ||= []).push({ page, treatment });
  };
  for (const p of pages) {
    for (const f of p.teaches) add(f, p.id, 'prose');
    for (const f of p.mentions) add(f, p.id, 'mention');
    for (const fence of p.fences) add(fence.teaches, p.id, 'example');
  }
  return { pages, coverage };
}

module.exports = { scanPages, parseFrontMatter };

if (require.main === module) {
  const helpDir = path.join(__dirname, '..', '..', '..', 'src', 'help');
  const { pages } = scanPages(helpDir);
  pages.sort((a, b) => (a.section + a.order).localeCompare(b.section + b.order));
  fs.writeFileSync(path.join(helpDir, 'pages.json'),
    JSON.stringify({ generated: true, pages }, null, 2) + '\n');
  console.log(`scanned ${pages.length} pages`);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```
node src/scripts/teaching_surface/tests/scan_pages.test.cjs
```
Expected: `scan_pages OK`.

- [ ] **Step 6: Generate `pages.json`**

Run:
```
node src/scripts/teaching_surface/scan_pages.cjs
```
Expected: `scanned 1 pages`; `src/help/pages.json` written.

- [ ] **Step 7: Commit**

```
git add src/help src/scripts/teaching_surface/scan_pages.cjs src/scripts/teaching_surface/tests/scan_pages.test.cjs
git commit -m "feat(teaching-surface): page contract + scan_pages (front-matter + fences -> pages.json)"
```

---

### Task 4: Coverage checks #2–#4 + fence doctest (`check_teaching_surface.cjs`)

**Files:**
- Create: `src/scripts/teaching_surface/check_teaching_surface.cjs`
- Test: `src/scripts/teaching_surface/tests/check_teaching_surface.test.cjs`

**Interfaces:**
- Consumes: `checkAll` from `check_partition.cjs`; `scanPages` from `scan_pages.cjs`; the manifest.
- Produces: `runChecks(): Promise<{ ok, partition, treatment, stale, dag, fences, reportUncovered }>` — `ok` is true when everything *present* is valid (validate-present mode); `reportUncovered` lists features with no coverage (informational).

- [ ] **Step 1: Write the failing test**

```js
// src/scripts/teaching_surface/tests/check_teaching_surface.test.cjs
const assert = require('node:assert/strict');
const { runChecks } = require('../check_teaching_surface.cjs');

(async () => {
  const r = await runChecks();
  // Partition (#1) must hold; present pages must validate (#2-#4, fences).
  assert.equal(r.partition.ok, true, 'partition ok');
  assert.equal(r.treatment.ok, true, 'present treatment ok');
  assert.equal(r.stale.ok, true, 'no stale references');
  assert.equal(r.dag.ok, true, 'dependsOn is a DAG');
  assert.equal(r.fences.ok, true, 'all fsl fences parse');
  assert.ok(Array.isArray(r.reportUncovered), 'uncovered features reported, not failed');
  assert.equal(r.ok, true);
  console.log('check_teaching_surface OK');
})();
```

- [ ] **Step 2: Run it to verify it fails**

Run:
```
node src/scripts/teaching_surface/tests/check_teaching_surface.test.cjs
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the unified runner**

```js
// src/scripts/teaching_surface/check_teaching_surface.cjs
'use strict';
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

  // #2 treatment — a feature a page front-matter `teaches:` commits to must meet
  // its tier's full contract. Fence-only / mention-only features are incidental.
  const treatmentViolations = [];
  const taughtFeatures = new Set(pages.flatMap(p => p.teaches));
  for (const fid of taughtFeatures) {
    const f = byId.get(fid);
    if (!f) { treatmentViolations.push(`unknown feature id taught: ${fid}`); continue; }
    if (f.tier === 'exclude') { treatmentViolations.push(`page teaches excluded feature: ${fid}`); continue; }
    const have = new Set((coverage[fid] || []).map(c => c.treatment));
    for (const need of TIER_NEEDS[f.tier] || []) {
      if (!have.has(need)) treatmentViolations.push(`${fid} (${f.tier}) missing '${need}'`);
    }
  }

  // #3 no-stale — no page may teach/mention/tag a forbidInTutorial feature
  const staleViolations = [];
  for (const fid of Object.keys(coverage)) {
    const f = byId.get(fid);
    if (f && f.exclude && f.exclude.forbidInTutorial) staleViolations.push(`forbidden feature referenced: ${fid}`);
  }

  // #4 dependency order — DAG + present-page ordering within tutorials
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
  // present-page ordering: a page's taught feature must not precede a prereq taught later
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
  runChecks().then(r => {
    for (const k of ['treatment', 'stale', 'dag', 'fences']) {
      const c = r[k];
      console.log(`[${c.ok ? 'OK  ' : 'FAIL'}] ${k}`);
      for (const v of c.violations) console.log('       ' + v);
    }
    console.log(`partition: ${r.partition.ok ? 'OK' : 'FAIL'}`);
    console.log(`uncovered (report): ${r.reportUncovered.length} features`);
    console.log(r.ok ? '\nteaching-surface checks OK (validate-present)' : '\nteaching-surface checks FAILED');
    process.exit(r.ok ? 0 : 1);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```
node src/scripts/teaching_surface/tests/check_teaching_surface.test.cjs
```
Expected: `check_teaching_surface OK`. (If it complains about `dist`, run `npm run make` first.)

- [ ] **Step 5: Commit**

```
git add src/scripts/teaching_surface/check_teaching_surface.cjs src/scripts/teaching_surface/tests/check_teaching_surface.test.cjs
git commit -m "feat(teaching-surface): checks #2-4 + fence doctest (validate-present runner)"
```

---

### Task 5: Docs-browser core — load, drill-in nav, page render

**Files:**
- Create: `sketch/cm6-editor/docs_panel.mjs`
- Modify: `sketch/cm6-editor/index.html` (replace the static `#docs` body with mount points)
- Modify: `sketch/cm6-editor/editor.js` (mount the panel; pass a `loadExample` callback)

**Interfaces:**
- Consumes: `renderMarkdown`, `stripFrontMatter` (Task 2); `pages.json` + `teaching-surface.json` (fetched).
- Produces: `export function mountDocsPanel({ bodyEl, manifestUrl, pagesUrl, helpBase, onLoadExample }): void` — renders nav into `bodyEl`; `onLoadExample(fslText)` is called when a `run` fence's "load into editor" button is clicked.

- [ ] **Step 1: Replace the static docs body in `index.html`**

In `sketch/cm6-editor/index.html`, replace the contents of `<div class="drawer-body">…</div>` (the six `<details>`) with a single mount point:
```html
<div class="drawer-body" id="docs-body"><!-- populated by docs_panel.mjs --></div>
```
(Keep the `.drawer-head` with the title + close button unchanged.)

- [ ] **Step 2: Implement `docs_panel.mjs`**

```js
// sketch/cm6-editor/docs_panel.mjs
import { renderMarkdown, stripFrontMatter } from './markdown_mini.mjs';

const SECTIONS = [
  ['getting-started', 'Getting Started'],
  ['about-state-machines', 'About State Machines'],
  ['tutorials', 'Tutorials'],
  ['example-machines', 'Example Machines'],
  ['index', 'Index'],
  ['search', 'Search'],
];

export function mountDocsPanel({ bodyEl, manifestUrl, pagesUrl, helpBase, onLoadExample }) {
  let manifest = { features: [] };
  let pages = [];
  const state = { view: 'sections', section: null };

  const load = async () => {
    manifest = await fetch(manifestUrl).then(r => r.json());
    pages = (await fetch(pagesUrl).then(r => r.json())).pages;
    renderSections();
  };

  const el = (html) => { bodyEl.innerHTML = html; };
  const crumb = (...parts) =>
    `<nav class="docs-crumb">${parts.map(p => p.href
      ? `<a href="#" data-go="${p.href}">${p.label}</a>` : `<span>${p.label}</span>`).join(' / ')}</nav>`;

  function renderSections() {
    state.view = 'sections';
    el(crumb({ label: 'Docs' }) +
      '<ul class="docs-nav">' +
      SECTIONS.map(([id, label]) => `<li><a href="#" data-section="${id}">${label}</a></li>`).join('') +
      '</ul>');
  }

  function pagesIn(section) {
    const list = pages.filter(p => p.section === section);
    if (section === 'tutorials') list.sort(byTutorialOrder);
    else list.sort((a, b) => a.order - b.order);
    return list;
  }

  // tutorials ordered by dependsOn topo then tier then order
  function byTutorialOrder(a, b) {
    const rank = (p) => {
      const f = manifest.features.find(x => (p.teaches || []).includes(x.id));
      const tierRank = { core: 0, intermediate: 1, advanced: 2 };
      return (f ? tierRank[f.tier] ?? 3 : 3) * 1000 + p.order;
    };
    return rank(a) - rank(b);
  }

  function renderSection(section) {
    state.view = 'pages'; state.section = section;
    const label = (SECTIONS.find(s => s[0] === section) || [])[1] || section;
    if (section === 'index') return renderIndex();      // Task 6
    if (section === 'search') return renderSearch();    // Task 6
    const list = pagesIn(section);
    el(crumb({ label: 'Docs', href: 'sections' }, { label }) +
      '<ul class="docs-nav">' +
      (list.length ? list.map(p => `<li><a href="#" data-page="${p.id}">${p.title}</a></li>`).join('')
                   : '<li class="docs-empty">No pages yet.</li>') +
      '</ul>');
  }

  async function renderPage(id) {
    state.view = 'page';
    const p = pages.find(x => x.id === id);
    if (!p) return;
    const md = await fetch(helpBase + '/' + p.source.replace(/^src\/help\//, '')).then(r => r.text());
    const html = renderMarkdown(stripFrontMatter(md));
    const label = (SECTIONS.find(s => s[0] === p.section) || [])[1] || p.section;
    el(crumb({ label: 'Docs', href: 'sections' }, { label, href: 'section:' + p.section }, { label: p.title }) +
      `<article class="docs-page">${html}</article>`);
    wireExamples();
  }

  function wireExamples() {
    for (const pre of bodyEl.querySelectorAll('pre[data-fsl-example][data-run="true"]')) {
      const btn = document.createElement('button');
      btn.className = 'docs-load-example'; btn.textContent = 'Load into editor';
      btn.addEventListener('click', () => onLoadExample(pre.querySelector('code').textContent));
      pre.appendChild(btn);
    }
  }

  // _renderIndex / _renderSearch are installed by docs_index_search.mjs (Task 6)
  function renderIndex()  { (mountDocsPanel._renderIndex || (() => {}))(bodyEl, manifest, pages, go); }
  function renderSearch() { (mountDocsPanel._renderSearch || (() => {}))(bodyEl, manifest, pages, go); }

  function go(target) {
    if (target === 'sections') return renderSections();
    if (target.startsWith('section:')) return renderSection(target.slice(8));
    if (target.startsWith('page:')) return renderPage(target.slice(5));
  }

  bodyEl.addEventListener('click', (e) => {
    const a = e.target.closest('[data-section],[data-page],[data-go]');
    if (!a) return;
    e.preventDefault();
    if (a.dataset.section) renderSection(a.dataset.section);
    else if (a.dataset.page) renderPage(a.dataset.page);
    else if (a.dataset.go) go(a.dataset.go);
  });

  load();
  return { go };
}
```

- [ ] **Step 3: Mount the panel from `editor.js`**

Add near the docs-panel wiring (after `const docsClose = …`):
```js
import { mountDocsPanel } from "./docs_panel.mjs";

mountDocsPanel({
  bodyEl: document.getElementById("docs-body"),
  manifestUrl: "../../src/data/teaching-surface.json",
  pagesUrl: "../../src/help/pages.json",
  helpBase: "../../src/help",
  onLoadExample: (fsl) => {
    window.view.dispatch({ changes: { from: 0, to: window.view.state.doc.length, insert: fsl } });
  },
});
```

- [ ] **Step 4: Add panel styles to `index.html`**

In the `<style>` block, append:
```css
.docs-nav { list-style: none; margin: 6px 0; padding: 0; }
.docs-nav li { margin: 2px 0; }
.docs-nav a { color: var(--help-accent); text-decoration: none; display: block; padding: 6px 4px; border-radius: 5px; }
.docs-nav a:hover { background: rgba(127,127,127,0.14); }
.docs-crumb { font-size: 11px; color: var(--header-sub); margin: 6px 0 8px; }
.docs-crumb a { color: var(--help-accent); text-decoration: none; }
.docs-page { font-size: 12.5px; line-height: 1.55; }
.docs-load-example { display: block; margin-top: 6px; font: inherit; font-size: 11px; cursor: pointer; }
.docs-empty { color: var(--header-sub); }
```

- [ ] **Step 5: Manual verification (served)**

Run (from a Bash tool, background):
```
npx serve . -l 3000
```
Open `http://localhost:3000/sketch/cm6-editor/`, click the `?` button → the docs panel shows the six sections; click "Getting Started" → "Welcome to FSL" → the page renders with a "Load into editor" button that replaces the editor content. (Automated smoke is Task 8.)

- [ ] **Step 6: Commit**

```
git add sketch/cm6-editor/docs_panel.mjs sketch/cm6-editor/index.html sketch/cm6-editor/editor.js
git commit -m "feat(sketch): manifest-driven drill-in docs browser (nav + page render + load-into-editor)"
```

---

### Task 6: Index and Search

**Files:**
- Create: `sketch/cm6-editor/docs_index_search.mjs`
- Modify: `sketch/cm6-editor/docs_panel.mjs` (wire `_renderIndex`/`_renderSearch`)

**Interfaces:**
- Consumes: `manifest`, `pages`, and a `go(target)` navigator from Task 5.
- Produces: `export function installIndexSearch(mountDocsPanel)` — sets `mountDocsPanel._renderIndex` and `_renderSearch`.

- [ ] **Step 1: Implement Index + Search**

```js
// sketch/cm6-editor/docs_index_search.mjs

export function installIndexSearch(mountDocsPanel) {
  // Index: every non-exclude feature, grouped by surface, linked to a teaching page.
  mountDocsPanel._renderIndex = (bodyEl, manifest, pages, go) => {
    const teachesOf = (fid) => pages.find(p => (p.teaches || []).includes(fid));
    const bySurface = {};
    for (const f of manifest.features) {
      if (f.tier === 'exclude') continue;
      (bySurface[f.surface] ||= []).push(f);
    }
    const rows = Object.keys(bySurface).sort().map(surface => {
      const items = bySurface[surface].sort((a, b) => a.title.localeCompare(b.title)).map(f => {
        const pg = teachesOf(f.id);
        const learn = pg ? `<a href="#" data-page="${pg.id}">${f.title}</a>` : `<span>${f.title}</span>`;
        const ref = f.referenceAnchor
          ? ` <a class="docs-ref" href="../../notes/fsl-grammar-reference.md#${f.referenceAnchor}" target="_blank">ref</a>` : '';
        return `<li>${learn}${ref}</li>`;
      }).join('');
      return `<h3>${surface}</h3><ul class="docs-nav">${items}</ul>`;
    }).join('');
    bodyEl.innerHTML = `<nav class="docs-crumb"><a href="#" data-go="sections">Docs</a> / <span>Index</span></nav>${rows}`;
  };

  // Search: client-side over feature titles + indexTerms + page titles/indexTerms.
  mountDocsPanel._renderSearch = (bodyEl, manifest, pages, go) => {
    bodyEl.innerHTML =
      `<nav class="docs-crumb"><a href="#" data-go="sections">Docs</a> / <span>Search</span></nav>
       <input id="docs-search-input" type="search" placeholder="Search the docs…" autocomplete="off" />
       <ul id="docs-search-results" class="docs-nav"></ul>`;
    const input = bodyEl.querySelector('#docs-search-input');
    const results = bodyEl.querySelector('#docs-search-results');
    const corpus = [
      ...manifest.features.filter(f => f.tier !== 'exclude').map(f => ({
        kind: 'feature', title: f.title,
        terms: [f.title, ...(f.indexTerms || []), ...((f.footguns || []).flatMap(g => g.indexTerms || []))].join(' ').toLowerCase(),
        page: (pages.find(p => (p.teaches || []).includes(f.id)) || {}).id,
      })),
      ...pages.map(p => ({
        kind: 'page', title: p.title,
        terms: [p.title, ...(p.indexTerms || [])].join(' ').toLowerCase(), page: p.id,
      })),
    ];
    const run = () => {
      const q = input.value.trim().toLowerCase();
      const hits = q ? corpus.filter(c => c.terms.includes(q)).slice(0, 40) : [];
      results.innerHTML = hits.map(h => h.page
        ? `<li><a href="#" data-page="${h.page}">${h.title}</a> <em>${h.kind}</em></li>`
        : `<li>${h.title} <em>${h.kind}</em></li>`).join('') || (q ? '<li class="docs-empty">No matches.</li>' : '');
    };
    input.addEventListener('input', run);
    input.focus();
  };
}
```

- [ ] **Step 2: Wire it in `docs_panel.mjs`**

At the top of `docs_panel.mjs`, import and install:
```js
import { installIndexSearch } from './docs_index_search.mjs';
installIndexSearch(mountDocsPanel);
```
(Place the `installIndexSearch(mountDocsPanel)` call at module scope, after the `mountDocsPanel` function declaration.)

- [ ] **Step 3: Manual verification**

Serve and open the panel; "Index" lists features grouped by surface (links go to teaching pages where present); "Search" filters as you type and links to pages.

- [ ] **Step 4: Commit**

```
git add sketch/cm6-editor/docs_index_search.mjs sketch/cm6-editor/docs_panel.mjs
git commit -m "feat(sketch): generated Index + client-side Search in the docs browser"
```

---

### Task 7: Exemplar pages (2–3 per section) + editor-help migration

**Files:**
- Create: `src/help/getting-started/using-the-editor.md` (migrated from the old `<details>`)
- Create: `src/help/getting-started/first-machine.md`
- Create: `src/help/about-state-machines/what-is-an-fsm.md`, `.../mealy-vs-moore.md`
- Create: `src/help/tutorials/transitions.md`, `.../states-and-styling.md`, `.../timed-transitions.md`
- Create: `src/help/example-machines/traffic-light.md`, `.../toggle.md`
- Regenerate: `src/help/pages.json`

**Interfaces:**
- Consumes: the page contract (Task 3); feature ids from `teaching-surface.json` (e.g. `transitions`, `states`, `state-styling`, `timed-transitions`).
- Produces: ≥2 pages in each authored section; tutorials satisfy their features' tier/treatment.

- [ ] **Step 1: Write the editor-help migration page**

Port the six old `<details>` (Editing & autocomplete, live diagram, Layouts, Resizing, Highlighting, Theme) into one markdown page:
```markdown
<!-- src/help/getting-started/using-the-editor.md -->
---
id: using-the-editor
section: getting-started
title: "Using the editor"
order: 20
teaches: []
mentions: []
indexTerms: [autocomplete, layout, theme, diagram, resize, highlight]
---

# Using the editor

## Editing & autocomplete
Write FSL in the code pane. Suggestions appear after a `:` or on Ctrl+Space — keys at the start of a line, values after a key's `:`.

## The live diagram
The graph re-renders whenever the machine parses and compiles cleanly. While an edit is invalid, the last good diagram stays and the status bar shows the parser error.

## Layouts
The View button chooses how the panes sit: side by side or stacked, single-pane, tabbed, or Auto (by window shape).

## Resizing panes
Drag any divider to resize; double-click a divider to reset it.

## Highlighting
Beyond base syntax colors, the editor reads the parsed machine: color values get a swatch chip, state names are tinted, shape values are marked as enums.

## Theme
The sun / moon button switches light and dark, and remembers your choice.
```

- [ ] **Step 2: Write the core-tier tutorial pages (prose + run-fence each)**

Each `core` tutorial needs prose **and** a `run` fence for its feature. Example:
```markdown
<!-- src/help/tutorials/transitions.md -->
---
id: tut-transitions
section: tutorials
title: "Transitions"
order: 10
teaches: [transitions]
mentions: [states, labels-quoting]
indexTerms: [arrow, edge, transition]
---

# Transitions

A transition is a state, an arrow, and a target. States are inferred from the arrows.

```fsl {teaches: transitions, run: true}
Off 'flip' -> On 'flip' -> Off;
```
```
Repeat the pattern for `src/help/tutorials/states-and-styling.md` (`teaches: [states]`, mentions `state-styling`, with a `state Foo { … };` run-fence) and `src/help/tutorials/timed-transitions.md` (`teaches: [timed-transitions]`, a `after 5 -> …` run-fence, and a paragraph noting `after N` = seconds).

For `states` (core) the page needs prose + an `example` fence tagged `teaches: states`. For `state-styling` (intermediate) one `example` fence suffices.

- [ ] **Step 3: Write the remaining section exemplars**

- `about-state-machines/what-is-an-fsm.md` + `mealy-vs-moore.md` — concept prose, `teaches: []` (ungated), `indexTerms` populated.
- `example-machines/traffic-light.md` + `toggle.md` — a short intro + one `run` fence each (these may `teaches: []` and just demonstrate).
- `getting-started/first-machine.md` — `teaches: []`, mentions `transitions`, one `run` fence.

- [ ] **Step 4: Regenerate `pages.json`**

Run:
```
node src/scripts/teaching_surface/scan_pages.cjs
```
Expected: `scanned 12 pages` (1 welcome + 11 new), `src/help/pages.json` updated.

- [ ] **Step 5: Run the full checks (validate-present)**

Run:
```
node src/scripts/teaching_surface/check_teaching_surface.cjs
```
Expected: all `[OK]`; `uncovered (report): N features` (non-zero is fine in Phase 1). If a `core` tutorial fails treatment, add the missing prose or `run`-fence.

- [ ] **Step 6: Commit**

```
git add src/help
git commit -m "docs(help): exemplar pages per section + editor-help migration"
```

---

### Task 8: Playwright UI smoke test

**Files:**
- Create: `sketch/cm6-editor/tests/docs_panel.e2e.mjs`

**Interfaces:**
- Consumes: a served sketch at `http://localhost:3000/sketch/cm6-editor/`.
- Produces: a runnable smoke test asserting the panel opens, drills in, renders, and Index/Search work.

- [ ] **Step 1: Write the smoke test**

```js
// sketch/cm6-editor/tests/docs_panel.e2e.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:3000/sketch/cm6-editor/';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(BASE);

await page.click('#btn-help');                                   // open docs
await page.click('[data-section="getting-started"]');            // drill into a section
await page.click('[data-page="welcome"]');                       // open a page
assert.ok(await page.locator('article.docs-page h1').count() >= 1, 'page rendered');
await page.click('.docs-load-example');                          // load example into editor
assert.match(await page.locator('.cm-content').innerText(), /->/, 'editor received fsl');

await page.click('[data-go="sections"]');
await page.click('[data-section="index"]');
assert.ok(await page.locator('.docs-nav a').count() >= 1, 'index populated');

await page.click('[data-go="sections"]');
await page.click('[data-section="search"]');
await page.fill('#docs-search-input', 'transition');
assert.ok(await page.locator('#docs-search-results li').count() >= 1, 'search returns hits');

await browser.close();
console.log('docs_panel e2e OK');
```

- [ ] **Step 2: Provision the browser (once) and serve**

Run (Bash tool):
```
NODE_OPTIONS=--use-system-ca npx playwright install chromium
```
Then serve in the background:
```
npx serve . -l 3000
```

- [ ] **Step 3: Run the smoke test**

Run:
```
node sketch/cm6-editor/tests/docs_panel.e2e.mjs
```
Expected: `docs_panel e2e OK`.

- [ ] **Step 4: Commit**

```
git add sketch/cm6-editor/tests/docs_panel.e2e.mjs
git commit -m "test(sketch): playwright smoke for the docs browser"
```

---

## Phase 1 done when

All eight tasks committed; `node src/scripts/teaching_surface/check_teaching_surface.cjs` is green (validate-present); the served sketch shows the IA browser with drill-in nav, page rendering, load-into-editor, Index, and Search; the Playwright smoke passes. Phase 2 (the ~40-page curriculum fan-out) gets its own plan.
