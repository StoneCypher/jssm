'use strict';

const b    = require('benny');
const fs   = require('fs');   // used by loadMessyFixture (Task 4) and writeMarkdownPivot (Task 7)
const path = require('path'); // used by loadMessyFixture (Task 4) and writeMarkdownPivot (Task 7)

const jssm = require('../../dist/jssm.es5.cjs');
const sm   = jssm.sm;
const pkg  = require('../../package.json');

// ----------------------------------------------------------------------------
// Shape factories (structured topologies — deterministic from N)
// ----------------------------------------------------------------------------

function buildChainFSL(n) {
  const lines = ['allows_override: true;'];
  for (let i = 0; i < n - 1; ++i) lines.push(`s${i} -> s${i + 1};`);
  lines.push(`s${n - 1} -> s0;`);
  return lines.join('\n');
}

function buildDenseFSL(n) {
  const lines = ['allows_override: true;'];
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      if (i !== j) lines.push(`s${i} -> s${j};`);
    }
  }
  return lines.join('\n');
}

function buildHubFSL(n) {
  // s0 is the hub; every other state has edges to and from s0.
  const lines = ['allows_override: true;'];
  for (let i = 1; i < n; ++i) {
    lines.push(`s${i} -> s0;`);
    lines.push(`s0 -> s${i};`);
  }
  return lines.join('\n');
}

function buildHookedHub(n) {
  const machine = sm([buildHubFSL(n)]);
  // One per-edge hook for every edge in the hub topology.
  for (let i = 1; i < n; ++i) {
    machine.set_hook({ from: `s${i}`, to: 's0', handler: () => true, kind: 'hook' });
    machine.set_hook({ from: 's0', to: `s${i}`, handler: () => true, kind: 'hook' });
  }
  // Plus one global any-transition hook.
  machine.set_hook({ handler: () => true, kind: 'any transition' });
  return machine;
}

// ----------------------------------------------------------------------------
// Shape registry — populated below; each entry: { name, machine, transitionSeq }
// ----------------------------------------------------------------------------

const K = 100;   // per-call work, matches existing benny convention

function buildShapeChain(n) {
  const machine = sm([buildChainFSL(n)]);
  // For chain: state s_i -> s_{(i+1) mod n}.  Precompute K targets starting from s0.
  const seq = [];
  let cur = 0;
  for (let k = 0; k < K; ++k) {
    cur = (cur + 1) % n;
    seq.push(`s${cur}`);
  }
  return { name: `chain-${n}`, machine, transitionSeq: seq };
}

function buildShapeDense(n) {
  const machine = sm([buildDenseFSL(n)]);
  // For dense: every (i, j) i!=j is valid.  Walk forward by 1 mod n for K steps from s0.
  const seq = [];
  let cur = 0;
  for (let k = 0; k < K; ++k) {
    cur = (cur + 1) % n;
    seq.push(`s${cur}`);
  }
  return { name: `dense-${n}`, machine, transitionSeq: seq };
}

function buildHubTraversal(n) {
  const seq = [];
  let spoke = 1;
  for (let k = 0; k < K; ++k) {
    if (k % 2 === 0) {
      seq.push(`s${spoke}`);                       // hub -> spoke
    } else {
      seq.push('s0');                              // spoke -> hub
      spoke = (spoke % (n - 1)) + 1;               // next time pick a new spoke
    }
  }
  return seq;
}

function buildShapeHub(n) {
  const machine = sm([buildHubFSL(n)]);
  return { name: `hub-${n}`, machine, transitionSeq: buildHubTraversal(n) };
}

function buildShapeHookedHub(n) {
  const machine = buildHookedHub(n);
  return { name: `hooked-${n}`, machine, transitionSeq: buildHubTraversal(n) };
}

function loadMessyFixture(n) {
  const file = path.join(__dirname, '..', '..', 'benchmark', 'fixtures', `messy-${n}.fsl`);
  // Prepend allows_override:true so the per-iteration reset works, matching the structured
  // shapes. The fixture files themselves are frozen and don't carry this directive.
  return 'allows_override: true;\n' + fs.readFileSync(file, 'utf8');
}

function buildShapeMessy(n) {
  const machine = sm([loadMessyFixture(n)]);
  // For messy: not every (from, to) is valid. Walk by following whatever transitions are
  // available from the current state. Precompute by simulating.
  const seq = [];
  let cur = 's0';
  for (let k = 0; k < K; ++k) {
    const exits = machine.list_exits(cur);
    if (exits.length === 0) {
      cur = 's0';
      seq.push('s0');
      continue;
    }
    const next = exits[0];
    seq.push(next);
    cur = next;
  }
  machine.override('s0');
  return { name: `messy-${n}`, machine, transitionSeq: seq };
}

const shapes = [
  buildShapeChain(10),
  buildShapeChain(50),
  buildShapeChain(200),
  buildShapeChain(1000),
  buildShapeDense(10),
  buildShapeDense(50),
  buildShapeDense(200),
  buildShapeHub(50),
  buildShapeHub(200),
  buildShapeHookedHub(200),
  buildShapeMessy(1000),
  buildShapeMessy(5000),
];

// ----------------------------------------------------------------------------
// Benny case factory
// ----------------------------------------------------------------------------

function transitionCase(shape) {
  return b.add(`${shape.name} transition()`, () => {
    // Reset to s0 each iteration so the precomputed transitionSeq stays valid across
    // shapes whose cycle length doesn't divide K (chain-200, hub-N, messy-N, ...).
    // The override adds ~1% to per-iteration time for transition()-style cases; it
    // is omitted for read-only cases (edges_between, has_state) that don't mutate state.
    shape.machine.override('s0');
    for (let k = 0; k < K; ++k) shape.machine.transition(shape.transitionSeq[k]);
  });
}

// ----------------------------------------------------------------------------
// Suite
// ----------------------------------------------------------------------------

b.suite(
  'jssm scaling diagnostic suite',
  ...shapes.map(transitionCase),
  b.cycle(),
  b.complete(),
  b.save({ file: 'scaling', version: pkg.version }),
  b.save({ file: 'scaling', format: 'chart.html' }),
);
