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
  const edgePairs = [];
  for (let k = 0; k < K; ++k) {
    const i = k % n;
    const j = (i + 1) % n;
    edgePairs.push([`s${i}`, `s${j}`]);
  }
  return { name: `chain-${n}`, machine, transitionSeq: seq, edgePairs };
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
  const edgePairs = [];
  for (let k = 0; k < K; ++k) {
    const i = k % n;
    const j = (i + 1) % n;
    edgePairs.push([`s${i}`, `s${j}`]);
  }
  return { name: `dense-${n}`, machine, transitionSeq: seq, edgePairs };
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

function buildHubEdgePairs(n) {
  const pairs = [];
  let spoke = 1;
  for (let k = 0; k < K; ++k) {
    if (k % 2 === 0) {
      pairs.push(['s0', `s${spoke}`]);
    } else {
      pairs.push([`s${spoke}`, 's0']);
      spoke = (spoke % (n - 1)) + 1;
    }
  }
  return pairs;
}

function buildShapeHub(n) {
  const machine = sm([buildHubFSL(n)]);
  return { name: `hub-${n}`, machine, transitionSeq: buildHubTraversal(n), edgePairs: buildHubEdgePairs(n) };
}

function buildShapeHookedHub(n) {
  const machine = buildHookedHub(n);
  return { name: `hooked-${n}`, machine, transitionSeq: buildHubTraversal(n), edgePairs: buildHubEdgePairs(n) };
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
  const edgePairs = [];
  let cur = 's0';
  for (let k = 0; k < K; ++k) {
    const exits = machine.list_exits(cur);
    if (exits.length === 0) {
      // Dead end - reset to s0 and continue.
      cur = 's0';
      seq.push('s0');
      edgePairs.push(['s0', 's0']);   // self-pair for dead-end steps; edges_between will just return []
      continue;
    }
    const next = exits[0];
    seq.push(next);
    edgePairs.push([cur, next]);
    cur = next;
  }
  machine.override('s0');
  return { name: `messy-${n}`, machine, transitionSeq: seq, edgePairs };
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

function edgesBetweenCase(shape) {
  return b.add(`${shape.name} edges_between()`, () => {
    for (let k = 0; k < K; ++k) {
      const [f, t] = shape.edgePairs[k];
      shape.machine.edges_between(f, t);
    }
  });
}

function hasStateCase(shape) {
  // Use the transition targets as the state list to probe - they're real states.
  return b.add(`${shape.name} has_state()`, () => {
    for (let k = 0; k < K; ++k) shape.machine.has_state(shape.transitionSeq[k]);
  });
}

// NOTE: action() is deliberately deferred from this scaling suite. Adding it would require
// giving every edge in chain/dense/hub a named action, which is a topology choice that
// would invalidate trend continuity if the naming convention later changes. Pick it up in
// a follow-up if action() turns out to be on a hot path the scaling diagnostic should cover.

// ----------------------------------------------------------------------------
// Suite
// ----------------------------------------------------------------------------

b.suite(
  'jssm scaling diagnostic suite',
  ...shapes.map(transitionCase),
  ...shapes.map(edgesBetweenCase),
  ...shapes.map(hasStateCase),
  b.cycle(),
  b.complete(),
  b.save({ file: 'scaling', version: pkg.version }),
  b.save({ file: 'scaling', format: 'chart.html' }),
);
