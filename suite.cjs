'use strict';

/**
 *  The shootout benny suite: adapters × shapes × operations.
 *
 *  Operations measured per library, per shape:
 *
 *  - `construct()` — build a machine from the library's own idiomatic
 *    definition (FSL text for jssm, config object for XState; each library
 *    pays its true entry price — see the adapter headers).
 *  - `transition()` — K legal steps along the shape's precomputed walk,
 *    reset to the start state each iteration.
 *
 *  Output: `shootout.json` in the working directory — an envelope of
 *  `{ date, node, arch, libs: { name: version }, results: [{ name, ops, margin }] }`
 *  with result names shaped `"<lib> <shape> <op>()"`.
 *
 *  Usage: `node suite.cjs [--quick]` (`--quick` trims to three small shapes
 *  for a smoke run).
 */

const b  = require('benny');
const fs = require('fs');

const { allShapes, chainShape, denseShape, hubShape, K } = require('./shapes.cjs');

const adapters = [
  require('./adapters/jssm.cjs'),
  require('./adapters/xstate.cjs'),
];

const quick  = process.argv.includes('--quick');
const shapes = quick
  ? [chainShape(10), denseShape(10), hubShape(50)]
  : allShapes();

function constructCase(adapter, shape) {
  const def = adapter.buildDefinition(shape);
  return b.add(`${adapter.name} ${shape.name} construct()`, () => {
    const m = adapter.construct(def);
    if (m === undefined) throw new Error('construct produced nothing');
  });
}

function transitionCase(adapter, shape) {
  const ctx = adapter.open(shape);
  const seq = shape.transitionSeq;
  return b.add(`${adapter.name} ${shape.name} transition()`, () => {
    adapter.reset(ctx);
    for (let k = 0; k < K; ++k) adapter.step(ctx, seq[k]);
  });
}

const cases = [];
for (const shape of shapes) {
  for (const adapter of adapters) {
    cases.push(constructCase(adapter, shape));
    cases.push(transitionCase(adapter, shape));
  }
}

b.suite(
  'fsm shootout',
  ...cases,
  b.cycle(),
  b.complete((summary) => {
    const libs = {};
    for (const a of adapters) libs[a.name] = a.version;
    const envelope = {
      date    : new Date().toISOString(),
      node    : process.version,
      arch    : process.arch,
      mode    : quick ? 'quick' : 'full',
      k       : K,
      libs,
      results : summary.results.map(r => ({
        name   : r.name,
        ops    : r.ops,
        margin : r.margin,
      })),
    };
    fs.writeFileSync('shootout.json', JSON.stringify(envelope, null, 2));
    console.log('wrote shootout.json —', envelope.results.length, 'cases');
  }),
);
