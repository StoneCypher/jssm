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

const shapes = [
  buildShapeChain(10),
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
