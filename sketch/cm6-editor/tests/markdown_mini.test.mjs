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
