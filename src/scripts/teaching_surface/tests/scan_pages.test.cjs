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
