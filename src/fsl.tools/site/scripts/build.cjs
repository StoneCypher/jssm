#!/usr/bin/env node
// scripts/build.cjs — turn recipes/*.cjs into static cookbook pages.
//
// Read AGENTS.md first.
//
// Outputs (relative to project root):
//   cookbook/<basename>.html            — one per recipe
//   cookbook/index.html                  — searchable index of all recipes
//   cookbook/test/index.html             — triples picker (if any test-* recipes)
//   cookbook/manifest.json               — {recipes, tags, categories}
//   cookbook/cookbook.css                — shared stylesheet for cookbook pages
//
// Zero dependencies. Just node ≥18.

'use strict';
const fs   = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT      = path.resolve(__dirname, '..');
const RECIPES   = path.join(ROOT, 'recipes');
const OUT       = path.join(ROOT, 'cookbook');
const TEMPLATES = path.join(__dirname, 'templates');

// ---------- helpers ----------

const esc = s => String(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function readTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES, name), 'utf8');
}

// Tiny mustache-ish: {{KEY}} → values[KEY]. No conditionals or loops.
function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in values)) throw new Error('template key missing: ' + k);
    return values[k];
  });
}

// ---------- recipe loading ----------

function loadRecipes() {
  if (!fs.existsSync(RECIPES)) {
    console.warn('[build] no recipes/ directory; nothing to build');
    return [];
  }
  const files = fs.readdirSync(RECIPES).filter(f => f.endsWith('.cjs')).sort();
  const out = [];
  for (const f of files) {
    const slug = f.replace(/\.cjs$/, '');
    const full = path.join(RECIPES, f);
    delete require.cache[full];
    let mod;
    try {
      mod = require(full);
    } catch (e) {
      throw new Error(`failed to load recipes/${f}: ${e.message}`);
    }
    if (!mod || typeof mod !== 'object') {
      throw new Error(`recipes/${f}: must module.exports = { ... }`);
    }
    validate(slug, mod);
    out.push({ ...mod, slug, _file: f });
  }
  // Stable order: by category, then by appearance in filename sort.
  out.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.slug.localeCompare(b.slug));
  // Assign 1-based recipe numbers AFTER sort, so renumbering is automatic.
  out.forEach((r, i) => { r.n = i + 1; });
  return out;
}

function validate(slug, r) {
  for (const k of ['title', 'category', 'problem']) {
    if (!r[k] || typeof r[k] !== 'string') {
      throw new Error(`recipes/${slug}.cjs: missing required string field "${k}"`);
    }
  }
  if (slug.startsWith('test-')) {
    const t = parseTripleSlug(slug);
    if (!t) throw new Error(`recipes/${slug}.cjs: triple slug must be test-<runner>-<bundler>-<frontend>`);
    r.triple = r.triple || t;
  }
  if (r.blocks) {
    if (!Array.isArray(r.blocks)) throw new Error(`recipes/${slug}.cjs: blocks must be an array`);
    for (const [i, b] of r.blocks.entries()) {
      if (!b.kind || typeof b.kind !== 'string') throw new Error(`recipes/${slug}.cjs: blocks[${i}] missing kind`);
      if (typeof b.code !== 'string') throw new Error(`recipes/${slug}.cjs: blocks[${i}] missing code string`);
    }
  }
}

function parseTripleSlug(slug) {
  // test-<runner>-<bundler>-<frontend>[-<extra>...]
  const parts = slug.split('-');
  if (parts[0] !== 'test') return null;
  if (parts.length < 4) return null;
  return { runner: parts[1], bundler: parts[2], frontend: parts.slice(3).join('-') };
}

// ---------- syntax highlighter ----------
// Heuristic, language-aware enough to make our recipe code look right.
// Output: an array of {c: 'class', t: 'text'} runs.
//
// The `fsl` flavour is the one exception: it is not a heuristic. It goes
// through `highlight_fsl_runs` from the built `jssm/fence` bundle — the same
// two-layer (CM6 stream grammar + real parser) highlighter the editor uses —
// so cookbook FSL can never disagree with the editor. `dist/fence/fence.js`
// is ESM; this script is CommonJS, so it is loaded via dynamic import once,
// before `main()` runs (see `loadFence()` at the bottom of this file).

const FENCE_URL = pathToFileURL(path.resolve(__dirname, '../../../../dist/fence/fence.js')).href;
let highlight_fsl_runs; // set by loadFence()

async function loadFence() {
  ({ highlight_fsl_runs } = await import(FENCE_URL));
}

const SYN = {
  s:   '#5fbeb1', // state names (fsl)
  k:   '#c4ae5a', // keywords / strings
  a:   '#5fbeb1', // arrows
  i:   '#c9cfde', // identifiers
  p:   '#c9cfde', // punctuation
  n:   '#c294c2', // numeric
  cm:  'rgb(201 207 222 / 50%)', // comment
  err: '#c294c2', // refusal comment
  ok:  '#5fbeb1', // accepted comment
};

const JS_KEYWORDS = new Set([
  'const','let','var','function','return','if','else','for','while','do','break',
  'continue','switch','case','default','new','class','extends','typeof','instanceof',
  'import','from','export','as','async','await','try','catch','finally','throw',
  'true','false','null','undefined','this','super','in','of','void','yield',
]);

function highlight(code, kind) {
  const flavour = pickFlavour(kind);
  if (flavour === 'shell') return highlightShell(code);
  if (flavour === 'json')  return highlightJson(code);
  if (flavour === 'plain') return [{c:'p', t: code}];
  return highlightJsLike(code, flavour); // flavour: 'fsl' | 'js'
}

function pickFlavour(kind) {
  switch ((kind || '').toLowerCase()) {
    case 'fsl': return 'fsl';
    case 'shell': case 'bash': return 'shell';
    case 'json': return 'json';
    case 'yaml': case 'toml': case 'css': case 'html': return 'plain';
    default: return 'js'; // js, jsx, ts, tsx, react, vitest, jest, jssm, ...
  }
}

// Maps a parity-highlighter run's `fsl-tok-*` / `fsl-sem-*` classes onto the
// cookbook's own SYN kind letters. `fsl-tok-labelName` is FSL's token class
// for quoted action/event names (its grammar has no separate 'string' token —
// `stream.match(/^'.../, () => 'labelName')` in fsl_language.ts — so it is
// grouped with `fsl-tok-keyword` under 'k' (SYN: "keywords / strings").
function fslRunKind(run) {
  const classes = run.classes || '';
  if (classes.includes('fsl-sem-state'))                                       return 's';
  if (classes.includes('fsl-tok-keyword'))                                     return 'k';
  if (classes.includes('fsl-tok-labelName') || classes.includes('fsl-tok-string')) return 'k';
  if (classes.includes('fsl-tok-comment'))                                     return 'cm';
  if (classes.includes('fsl-tok-number'))                                      return 'n';
  return 'p';
}

// Cookbook `fsl`-kind blocks are JS snippets with an `sm\`...\`` tagged FSL
// template embedded (see AGENTS.md's "Code block kinds" table and every
// recipes/*.cjs fsl block) — not standalone .fsl source. `highlightJsLike`
// walks the same comment/string/backtick scan it always has (so a comment
// containing a stray backtick, e.g. "// no edge leaves `delivered`", is still
// recognized as one comment token before backticks are ever considered); the
// only thing that changed is what happens once it is inside a `flavour ===
// 'fsl'` template literal — the interior is handed whole to
// `highlight_fsl_runs` (the real parity tokenizer) instead of being scanned
// by a hand-rolled "identifiers are state names" heuristic.
function highlightJsLike(code, flavour) {
  const out = [];
  const push = (c, t) => { if (t) out.push({c, t}); };
  let i = 0;
  while (i < code.length) {
    const ch = code[i];

    // line comment
    if (ch === '/' && code[i+1] === '/') {
      const nl = code.indexOf('\n', i);
      const end = nl === -1 ? code.length : nl;
      const body = code.slice(i, end);
      let kind = 'cm';
      if (/(refus|\bno\b|fail|error|cannot|invalid|reject|illegal|forbid)/i.test(body)) kind = 'err';
      else if (/\bok\b|→ ok|accepted/i.test(body)) kind = 'ok';
      push(kind, body);
      i = end; continue;
    }
    // block comment
    if (ch === '/' && code[i+1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? code.length : end + 2;
      push('cm', code.slice(i, stop));
      i = stop; continue;
    }
    // strings
    if (ch === "'" || ch === '"') {
      const q = ch; let j = i + 1;
      while (j < code.length && code[j] !== q) { if (code[j] === '\\') j += 2; else j++; }
      push('k', code.slice(i, Math.min(j+1, code.length)));
      i = Math.min(j+1, code.length); continue;
    }
    // template literal — tokenize inside
    if (ch === '`') {
      push('p', '`'); i++;
      if (flavour === 'fsl') {
        // The whole interior is FSL source (or as close to it as this
        // particular template gets) — classify it with the real parser, not
        // a per-character guess.
        let end = code.indexOf('`', i);
        if (end === -1) end = code.length;
        for (const run of highlight_fsl_runs(code.slice(i, end))) {
          push(fslRunKind(run), run.text);
        }
        i = end;
      } else {
        while (i < code.length && code[i] !== '`') {
          const c = code[i];
          if (c === '/' && code[i+1] === '/') {
            const nl = code.indexOf('\n', i);
            const end = nl === -1 ? code.length : nl;
            const body = code.slice(i, end);
            let kind = 'cm';
            if (/(refus|\bno\b|fail|error|cannot|invalid|reject)/i.test(body)) kind = 'err';
            push(kind, body); i = end; continue;
          }
          if (c === '→') { push('a', '→'); i++; continue; }
          if (c === '-' && code[i+1] === '>') { push('a', '->'); i += 2; continue; }
          if (c === "'" || c === '"') {
            const q = c; let j = i + 1;
            while (j < code.length && code[j] !== q) { if (code[j] === '\\') j += 2; else j++; }
            push('k', code.slice(i, Math.min(j+1, code.length)));
            i = Math.min(j+1, code.length); continue;
          }
          if (/[A-Za-z_$]/.test(c)) {
            let j = i + 1;
            while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j++;
            const word = code.slice(i, j);
            push('i', word);
            i = j; continue;
          }
          if (/[0-9]/.test(c)) {
            let j = i + 1;
            while (j < code.length && /[0-9.]/.test(code[j])) j++;
            push('n', code.slice(i, j)); i = j; continue;
          }
          push('p', c); i++;
        }
      }
      if (i < code.length) { push('p', '`'); i++; }
      continue;
    }
    // arrows
    if (ch === '→') { push('a', '→'); i++; continue; }
    if (ch === '-' && code[i+1] === '>') { push('a', '->'); i += 2; continue; }
    // numbers
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[0-9.eE_]/.test(code[j])) j++;
      push('n', code.slice(i, j)); i = j; continue;
    }
    // identifiers / keywords
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[A-Za-z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      let kind = 'i';
      if (JS_KEYWORDS.has(word)) kind = 'k';
      push(kind, word);
      i = j; continue;
    }
    // everything else — punctuation/whitespace
    push('p', ch); i++;
  }
  return out;
}

function highlightShell(code) {
  const out = [];
  for (const line of code.split('\n')) {
    if (/^\s*[$#]\s/.test(line)) {
      const m = line.match(/^(\s*[$#]\s)(.*)$/);
      out.push({c: 'cm', t: m[1]});
      out.push({c: 'i',  t: m[2]});
    } else if (line.length) {
      out.push({c: 'cm', t: line});
    }
    out.push({c: 'p', t: '\n'});
  }
  if (out.length && out.at(-1).t === '\n') out.pop();
  return out;
}

function highlightJson(code) {
  const out = [];
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '"') {
      let j = i + 1;
      while (j < code.length && code[j] !== '"') { if (code[j] === '\\') j += 2; else j++; }
      let k = j + 1;
      while (k < code.length && /\s/.test(code[k])) k++;
      const isKey = code[k] === ':';
      out.push({c: isKey ? 'i' : 'k', t: code.slice(i, j+1)});
      i = j + 1; continue;
    }
    if (/[0-9-]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[0-9.eE+-]/.test(code[j])) j++;
      out.push({c: 'n', t: code.slice(i, j)}); i = j; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < code.length && /[A-Za-z0-9_]/.test(code[j])) j++;
      out.push({c: 'k', t: code.slice(i, j)}); i = j; continue;
    }
    out.push({c: 'p', t: ch}); i++;
  }
  return out;
}

function renderHighlighted(tokens) {
  return tokens.map(({c, t}) => {
    const colour = SYN[c] || 'inherit';
    return `<span style="color:${colour}">${esc(t)}</span>`;
  }).join('');
}

// ---------- markdown-light for problem / note ----------
// supports `code`, *em*, [text](url)

function mdInline(s) {
  if (!s) return '';
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '`') {
      const end = s.indexOf('`', i + 1);
      if (end > i) {
        out += `<code>${esc(s.slice(i+1, end))}</code>`;
        i = end + 1; continue;
      }
    }
    if (ch === '*') {
      const end = s.indexOf('*', i + 1);
      if (end > i) {
        out += `<em>${esc(s.slice(i+1, end))}</em>`;
        i = end + 1; continue;
      }
    }
    if (ch === '[') {
      const close = s.indexOf(']', i + 1);
      if (close > i && s[close+1] === '(') {
        const urlEnd = s.indexOf(')', close + 2);
        if (urlEnd > close) {
          const text = s.slice(i+1, close);
          const url  = s.slice(close+2, urlEnd);
          out += `<a href="${esc(url)}">${esc(text)}</a>`;
          i = urlEnd + 1; continue;
        }
      }
    }
    out += esc(ch);
    i++;
  }
  return out;
}

// ---------- graph rendering (SVG) ----------

function renderGraph(g) {
  if (!g || !g.nodes) return '';
  const NW = 52, NH = 22;
  const endpoint = (from, to) => {
    const dx = to.x - from.x, dy = to.y - from.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx > ady) return { x: from.x + Math.sign(dx) * NW, y: from.y };
    return { x: from.x, y: from.y + Math.sign(dy) * NH };
  };
  const edgeSvg = e => {
    const from = g.nodes.find(n => n.id === e.from);
    const to   = g.nodes.find(n => n.id === e.to);
    if (!from || !to) return '';
    let path, lx, ly;
    if (e.curve === 'self') {
      const r = 22;
      path = `M ${from.x - 10} ${from.y - r} C ${from.x - 30} ${from.y - r - 30}, ${from.x + 30} ${from.y - r - 30}, ${from.x + 10} ${from.y - r}`;
      lx = from.x; ly = from.y - r - 24;
    } else if (e.curve === 'arc' || e.curve === 'arc-up') {
      const off = e.arcOffset ?? 32;
      const start = endpoint(from, to), end = endpoint(to, from);
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2 + (e.curve === 'arc' ? off : -off);
      path = `M ${start.x} ${start.y} Q ${mx} ${my}, ${end.x} ${end.y}`;
      lx = mx; ly = my + (e.curve === 'arc' ? 4 : -6);
    } else {
      const start = endpoint(from, to), end = endpoint(to, from);
      const dx = end.x - start.x, dy = end.y - start.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, off = 12;
      path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      lx = (start.x + end.x) / 2 + nx * off;
      ly = (start.y + end.y) / 2 + ny * off + 3;
    }
    return `
      <path d="${path}" stroke="var(--rule-2)" stroke-width="1.25" fill="none" marker-end="url(#cb-arrow)"/>
      ${e.label ? `<text x="${lx}" y="${ly}" text-anchor="middle" font-family="var(--font-mono)" font-size="11" fill="var(--fg-3)">${esc(e.label)}</text>` : ''}
    `;
  };
  const nodeSvg = n => {
    const accent = n.id === g.accentNode;
    return `
      <rect x="${n.x - 52}" y="${n.y - 22}" width="104" height="44" rx="8"
            fill="${accent ? 'rgb(40 122 112 / 18%)' : 'var(--bg-2)'}"
            stroke="${accent ? 'var(--accent)' : 'var(--rule-2)'}" stroke-width="1"/>
      <text x="${n.x}" y="${n.y + 5}" text-anchor="middle"
            font-family="var(--font-mono)" font-size="13"
            fill="${accent ? 'var(--accent)' : 'var(--fg-1)'}">${esc(n.label || n.id)}</text>
    `;
  };
  return `
    <svg viewBox="0 0 ${g.width || 520} ${g.height || 200}" style="display:block;width:100%">
      <defs>
        <marker id="cb-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="var(--rule-2)"/>
        </marker>
      </defs>
      ${g.edges?.map(edgeSvg).join('') || ''}
      ${g.nodes.map(nodeSvg).join('')}
    </svg>
  `;
}

// ---------- per-recipe page ----------

const KIND_LABELS = {
  fsl: 'FSL', jssm: 'JSSM',
  ts: 'TS', tsx: 'TSX', js: 'JS', jsx: 'JSX',
  react: 'React', vitest: 'Vitest', jest: 'Jest',
  shell: 'Shell', bash: 'Bash',
  json: 'JSON', yaml: 'YAML', toml: 'TOML',
  html: 'HTML', css: 'CSS',
};

function renderRecipePage(recipe, allRecipes) {
  const tpl = readTemplate('recipe.html');

  // TOC entries — one per code block + graph + note.
  const tocEntries = [];
  if (recipe.blocks?.length) tocEntries.push({id: 'sec-blocks', label: 'Code'});
  if (recipe.graph) tocEntries.push({id: 'sec-graph', label: 'Graph'});
  if (recipe.note)  tocEntries.push({id: 'sec-note',  label: 'Notes'});

  // Prev/next within same category, by recipe number.
  const sameCat = allRecipes.filter(r => r.category === recipe.category);
  const idx = sameCat.findIndex(r => r.slug === recipe.slug);
  const prev = idx > 0 ? sameCat[idx - 1] : null;
  const next = idx < sameCat.length - 1 ? sameCat[idx + 1] : null;

  const blocksHtml = (recipe.blocks || []).map(b => {
    const label = b.title || (KIND_LABELS[b.kind.toLowerCase()] || b.kind.toUpperCase());
    const tokens = highlight(b.code, b.kind);
    return `
      <figure class="cb-block">
        <figcaption class="cb-block-head"><span>${esc(label)}</span></figcaption>
        <pre class="cb-pre"><code>${renderHighlighted(tokens)}</code></pre>
      </figure>
    `;
  }).join('');

  const tagsHtml = (recipe.tags || []).map(t =>
    `<a class="cb-tag" href="index.html?tag=${encodeURIComponent(t)}">${esc(t)}</a>`
  ).join('');

  const tocHtml = tocEntries.map(e =>
    `<li><a href="#${e.id}">${esc(e.label)}</a></li>`
  ).join('');

  const tripleHtml = recipe.triple ? `
    <dl class="cb-triple">
      <div><dt>Runner</dt><dd>${esc(recipe.triple.runner)}</dd></div>
      <div><dt>Bundler</dt><dd>${esc(recipe.triple.bundler)}</dd></div>
      <div><dt>Frontend</dt><dd>${esc(recipe.triple.frontend)}</dd></div>
    </dl>
  ` : '';

  return fill(tpl, {
    TITLE:        esc(recipe.title),
    PAGE_TITLE:   `${esc(recipe.title)} · fsl.tools cookbook`,
    DESCRIPTION:  esc(recipe.problem.replace(/[`*]/g, '').slice(0, 180)),
    CATEGORY:     esc(recipe.category),
    NUMBER:       String(recipe.n).padStart(2, '0'),
    PROBLEM:      mdInline(recipe.problem),
    BLOCKS:       blocksHtml || '<p class="cb-empty">No code for this recipe yet.</p>',
    GRAPH:        recipe.graph ? `<section id="sec-graph" class="cb-section"><h2>Graph</h2><div class="cb-graph">${renderGraph(recipe.graph)}</div></section>` : '',
    NOTE:         recipe.note ? `<section id="sec-note" class="cb-section"><h2>Notes</h2><p class="cb-note">${mdInline(recipe.note)}</p></section>` : '',
    TAGS:         tagsHtml ? `<nav class="cb-tags">${tagsHtml}</nav>` : '',
    TRIPLE:       tripleHtml,
    TOC:          tocHtml,
    PREV:         prev ? `<a class="cb-nav prev" href="${prev.slug}.html"><span class="cb-nav-label">← Previous</span><span class="cb-nav-title">${esc(prev.title)}</span></a>` : '<span></span>',
    NEXT:         next ? `<a class="cb-nav next" href="${next.slug}.html"><span class="cb-nav-label">Next →</span><span class="cb-nav-title">${esc(next.title)}</span></a>` : '<span></span>',
  });
}

// ---------- /cookbook/index.html ----------

function renderIndexPage(recipes) {
  const tpl = readTemplate('index.html');
  // Pre-render the full grouped list as static HTML, with data-* hooks for JS filtering.
  const byCat = {};
  for (const r of recipes) (byCat[r.category] ||= []).push(r);
  const categories = Object.keys(byCat).sort();

  // Pre-fold: only the first category is open by default. JS opens any
  // category that contains a search/tag match.
  const groupsHtml = categories.map((cat, i) => {
    const rows = byCat[cat].map(r => `
      <li class="cb-row" data-tags="${esc((r.tags||[]).join(' '))}" data-search="${esc((r.title + ' ' + r.problem + ' ' + (r.tags||[]).join(' ')).toLowerCase())}">
        <a href="${esc(r.slug)}.html">
          <span class="cb-row-n">${String(r.n).padStart(2, '0')}</span>
          <span class="cb-row-title">${esc(r.title)}</span>
          <span class="cb-row-problem">${mdInline(r.problem.split('. ')[0] + (r.problem.includes('. ') ? '.' : ''))}</span>
          ${r.tags?.length ? `<span class="cb-row-tags">${r.tags.slice(0,3).map(t => `<span class="cb-row-tag">${esc(t)}</span>`).join('')}</span>` : ''}
        </a>
      </li>
    `).join('');
    const open = i === 0 ? ' open' : '';
    return `
      <section class="cb-group${open}" data-category="${esc(cat)}">
        <button type="button" class="cb-group-head" aria-expanded="${i === 0 ? 'true' : 'false'}">
          <span class="cb-group-caret" aria-hidden="true">▸</span>
          <span class="cb-group-name">// ${esc(cat).toLowerCase()}</span>
          <span class="cb-group-count">${byCat[cat].length}</span>
        </button>
        <ul class="cb-list">${rows}</ul>
      </section>
    `;
  }).join('');

  const allTags = {};
  for (const r of recipes) for (const t of (r.tags || [])) allTags[t] = (allTags[t]||0) + 1;
  const tagsSorted = Object.keys(allTags).sort((a,b)=>allTags[b]-allTags[a]);
  const tagsHtml = tagsSorted.map(t =>
    `<button class="cb-tag-chip" data-tag="${esc(t)}">${esc(t)} <span class="cb-tag-n">${allTags[t]}</span></button>`
  ).join('');

  return fill(tpl, {
    PAGE_TITLE: 'Cookbook · fsl.tools',
    TOTAL:      String(recipes.length),
    GROUPS:     groupsHtml,
    TAGS:       tagsHtml,
  });
}

// ---------- /cookbook/test/index.html (triples picker) ----------

function renderTriplesPage(triples) {
  if (triples.length === 0) return null;
  const tpl = readTemplate('triples.html');

  const runners   = [...new Set(triples.map(t => t.triple.runner))].sort();
  const bundlers  = [...new Set(triples.map(t => t.triple.bundler))].sort();
  const frontends = [...new Set(triples.map(t => t.triple.frontend))].sort();

  // A flat data island the picker can consume.
  const data = triples.map(t => ({
    slug: t.slug, title: t.title, ...t.triple,
  }));

  return fill(tpl, {
    PAGE_TITLE: 'Testing recipes · fsl.tools cookbook',
    TOTAL:      String(triples.length),
    RUNNERS:    runners.map(r => `<button class="ax-btn" data-axis="runner" data-value="${esc(r)}">${esc(r)}</button>`).join(''),
    BUNDLERS:   bundlers.map(b => `<button class="ax-btn" data-axis="bundler" data-value="${esc(b)}">${esc(b)}</button>`).join(''),
    FRONTENDS:  frontends.map(f => `<button class="ax-btn" data-axis="frontend" data-value="${esc(f)}">${esc(f)}</button>`).join(''),
    DATA_JSON:  JSON.stringify(data),
  });
}

// ---------- manifest ----------

function buildManifest(recipes) {
  return {
    generated: new Date().toISOString(),
    count: recipes.length,
    categories: [...new Set(recipes.map(r => r.category))].sort(),
    tags:       [...new Set(recipes.flatMap(r => r.tags || []))].sort(),
    recipes: recipes.map(r => ({
      slug: r.slug,
      n: r.n,
      title: r.title,
      category: r.category,
      tags: r.tags || [],
      problem: r.problem,
      triple: r.triple || null,
    })),
  };
}

// ---------- main ----------

function main() {
  const recipes = loadRecipes();
  console.log(`[build] loaded ${recipes.length} recipes`);

  rmrf(OUT);
  ensureDir(OUT);
  ensureDir(path.join(OUT, 'test'));

  // Stylesheet
  fs.copyFileSync(path.join(TEMPLATES, 'cookbook.css'), path.join(OUT, 'cookbook.css'));

  // Per-recipe pages
  for (const r of recipes) {
    const html = renderRecipePage(r, recipes);
    fs.writeFileSync(path.join(OUT, `${r.slug}.html`), html);
  }

  // Index
  fs.writeFileSync(path.join(OUT, 'index.html'), renderIndexPage(recipes));

  // Triples picker
  const triples = recipes.filter(r => r.triple);
  const triplesHtml = renderTriplesPage(triples);
  if (triplesHtml) {
    fs.writeFileSync(path.join(OUT, 'test', 'index.html'), triplesHtml);
  }

  // Manifest
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(buildManifest(recipes), null, 2));

  console.log(`[build] wrote ${recipes.length} recipes + index${triples.length ? ` + triples picker (${triples.length})` : ''} → cookbook/`);
}

if (require.main === module) {
  (async () => {
    try {
      await loadFence();
      main();
    } catch (e) {
      console.error('[build] FAILED:', e.message);
      process.exit(1);
    }
  })();
}

module.exports = { loadRecipes, renderRecipePage, parseTripleSlug };
