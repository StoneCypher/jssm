/**
 * Renders the era book (notes/era-book/*.md) into one standalone HTML page, so
 * the v6–v16 program reads as a single document. Not part of the build chain —
 * run on demand via `npm run era_book`.
 *
 * Reading order: overview, then each major's one-pager followed by its long
 * form, then the README as an appendix. Missing files are skipped with a note,
 * so the script works even on a partially-written book.
 *
 * Output defaults to `build/era-book.html`; pass a path to override.
 *
 * @example
 *   node src/scripts/era_book_html.cjs
 *   // wrote build/era-book.html (26 sections)
 *
 * @throws {Error} With install instructions if markdown-it is not installed.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

let MarkdownIt;
try { MarkdownIt = require('markdown-it'); }
catch {
  console.error('markdown-it is not installed; run: npm install');
  process.exit(1);
}

const root    = path.resolve(__dirname, '..', '..');
const bookDir = path.join(root, 'notes', 'era-book');
const outPath = process.argv[2] ?? path.join(root, 'build', 'era-book.html');

const versions = ['05x-longgoodbye', '06-ground', '07-computing', '08-structured',
                  '09-transactional', '10-portable', '11-composable', '12-proven',
                  '13-durable', '14-trusted', '15-ubiquitous', '16-public'];

const order = [
  '00-overview.md',
  ...versions.flatMap(v => [`${v}-onepager.md`, `${v}-long.md`]),
  'README.md',
];

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const sections = [];
for (const name of order) {
  const file = path.join(bookDir, name);
  if (!fs.existsSync(file)) { continue; }
  sections.push(`<section id="${name.replace(/\.md$/u, '')}">\n`
    + md.render(fs.readFileSync(file, 'utf8'))
    + '\n</section>\n<hr/>');
}

const toc = sections.map(s => {
  const id    = s.match(/id="([^"]+)"/u)[1];
  const title = (s.match(/<h1[^>]*>(.*?)<\/h1>/u) ?? [null, id])[1];
  return `<li><a href="#${id}">${title}</a></li>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>The FSL Era Book — v6 to v16</title>
<style>
  body { max-width: 52em; margin: 2em auto; padding: 0 1em;
         font: 16px/1.6 Georgia, 'Times New Roman', serif; color: #222; }
  h1 { border-bottom: 2px solid #444; padding-bottom: .2em; }
  code, pre { font-family: Consolas, Menlo, monospace; background: #f4f4f4; }
  pre { padding: .8em; overflow-x: auto; }
  table { border-collapse: collapse; } th, td { border: 1px solid #999; padding: .3em .6em; }
  blockquote { border-left: 4px solid #bbb; margin-left: 0; padding-left: 1em; color: #555; }
  nav { background: #fafafa; border: 1px solid #ddd; padding: 1em 2em; }
  hr { border: none; border-top: 1px dashed #bbb; margin: 3em 0; }
</style></head><body>
<h1>The FSL Era Book</h1>
<p><em>v6 “The Ground” through v16 “The Public Machine” — generated ${new Date().toISOString().slice(0, 10)}</em></p>
<nav><ol>${toc}</ol></nav>
${sections.join('\n')}
</body></html>\n`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, html);
console.log(`wrote ${path.relative(root, outPath)} (${sections.length} sections)`);
