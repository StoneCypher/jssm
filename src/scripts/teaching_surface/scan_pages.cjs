'use strict';

// Scan the help-page tree (src/help/**/*.md) into page records + the coverage
// join the docs browser and the coverage checks both read. See
// notes/superpowers/specs/2026-06-27-help-bar-phase1-docs-engine-design.md.

const fs = require('node:fs');
const path = require('node:path');

/** Parse the leading `---`-delimited front-matter into a flat object. */
function parseFrontMatter(text) {
  text = text.replace(/\r\n/g, '\n');   // normalize CRLF (Windows git autocrlf) before LF-based parsing
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
