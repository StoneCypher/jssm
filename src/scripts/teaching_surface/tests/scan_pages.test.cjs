const assert = require('node:assert/strict');
const path = require('node:path');
const { scanPages, parseFrontMatter } = require('../scan_pages.cjs');

// CRLF front-matter (Windows git autocrlf) must parse the same as LF — else the
// generated content module loses id/section/title on Windows CI (see jssm 5.149.0).
const crlf = parseFrontMatter('---\r\nid: x\r\nsection: s\r\ntitle: "T"\r\norder: 3\r\n---\r\nbody\r\n');
assert.equal(crlf.front.id, 'x');
assert.equal(crlf.front.section, 's');
assert.equal(crlf.front.title, 'T');
assert.equal(crlf.front.order, 3);
assert.equal(crlf.body, 'body\n');

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
