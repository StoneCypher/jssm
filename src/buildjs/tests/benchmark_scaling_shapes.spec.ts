import { createRequire } from 'node:module';
// Import sm from the TS source (vitest-resolved), NOT the built dist/jssm.es5.cjs bundle —
// the trimmed `ci_test` matrix build doesn't produce that bundle, so requiring it there
// fails with MODULE_NOT_FOUND. This matches how the canonical src/ts specs import sm.
import { sm } from '../../ts/jssm';

const require = createRequire(import.meta.url);
const shapes = require('../benchmark_scaling_shapes.cjs');

// Drive a real machine through a closed walk: every step must be a legal transition
// from the current state, and the walk must end where it began — so the harness can
// replay it across benny iterations with no override() reset.
function driveClosed(fsl, walk) {
  const m = sm([fsl]);
  const start = m.state();
  for (let k = 0; k < walk.targets.length; ++k) {
    const ok = m.transition(walk.targets[k]);
    if (ok !== true) return { legal: false, atStep: k, target: walk.targets[k], from: m.state() };
  }
  return { legal: true, returnedToStart: m.state() === start, steps: walk.targets.length, stepCount: walk.stepCount };
}

// Pure shape/FSL/walk logic for the scaling harness, extracted so it is unit-testable
// (benchmark_scaling.cjs itself runs benny on require and can't be imported in tests).

describe('FSL shape generators — topology', () => {

  test('buildChainFSL builds a ring: forward edges plus a wrap back to s0', () => {
    const lines = shapes.buildChainFSL(3).split('\n');
    expect(lines).toContain('s0 -> s1;');
    expect(lines).toContain('s1 -> s2;');
    expect(lines).toContain('s2 -> s0;');
  });

  test('buildDenseFSL builds every distinct ordered pair and no self-loops', () => {
    const s = shapes.buildDenseFSL(3);
    expect(s).toContain('s0 -> s1;');
    expect(s).toContain('s2 -> s1;');
    expect(s).toContain('s1 -> s2;');
    expect(s).not.toContain('s0 -> s0;');
    expect(s).not.toContain('s1 -> s1;');
  });

  test('buildHubFSL builds an edge to and from the hub for every spoke', () => {
    const lines = shapes.buildHubFSL(3).split('\n');
    expect(lines).toContain('s1 -> s0;');
    expect(lines).toContain('s0 -> s1;');
    expect(lines).toContain('s2 -> s0;');
    expect(lines).toContain('s0 -> s2;');
  });

  test('generators emit bare FSL with no allows_override config (parses on pre-5.86 engines)', () => {
    expect(shapes.buildChainFSL(4)).not.toContain('allows_override');
    expect(shapes.buildDenseFSL(4)).not.toContain('allows_override');
    expect(shapes.buildHubFSL(4)).not.toContain('allows_override');
  });

});

describe('closedWalk — legal, closed laps (no override reset needed)', () => {

  const cases = [
    { kind: 'chain', n: 10,  fsl: (n: number) => shapes.buildChainFSL(n) },
    { kind: 'chain', n: 200, fsl: (n: number) => shapes.buildChainFSL(n) },
    { kind: 'dense', n: 10,  fsl: (n: number) => shapes.buildDenseFSL(n) },
    { kind: 'hub',   n: 50,  fsl: (n: number) => shapes.buildHubFSL(n) },
  ];

  for (const c of cases) {
    test(`${c.kind}-${c.n}: every step legal and walk returns to start`, () => {
      const walk = shapes.closedWalk(c.kind, c.n, 100);
      const r = driveClosed(c.fsl(c.n), walk);
      expect(r.legal).toBe(true);
      expect(r.returnedToStart).toBe(true);
      expect(walk.stepCount).toBeGreaterThanOrEqual(100);
      expect(walk.stepCount).toBe(walk.targets.length);
    });
  }

  test('stepCount is a whole number of laps (closes the cycle)', () => {
    // chain lap length == n; 100 rounded up to a multiple of 10 is 100
    expect(shapes.closedWalk('chain', 10, 100).stepCount % 10).toBe(0);
    // chain-200: one lap (200) is the smallest closed walk >= 100
    expect(shapes.closedWalk('chain', 200, 100).stepCount).toBe(200);
  });

});

describe('labelActionEdges — bare labeled action FSL', () => {

  test('labels every edge and emits no allows_override config', () => {
    const base = sm([shapes.buildChainFSL(3)]);
    const { fsl, labelsByPair } = shapes.labelActionEdges(base);
    expect(fsl).not.toContain('allows_override');
    expect(fsl).toContain("'act_0'");                 // first edge labeled
    expect(labelsByPair.size).toBe(3);                // chain-3 has 3 edges
  });

  test('the labeled FSL builds an action machine that dispatches its labels', () => {
    const base = sm([shapes.buildChainFSL(3)]);
    const { fsl, labelsByPair } = shapes.labelActionEdges(base);
    const am  = sm([fsl]);
    const lbl = labelsByPair.get(shapes.edgePairKey('s0', 's1'));
    expect(am.action(lbl)).toBe(true);                // s0 -> s1 action fires from the start state
  });

});

describe('closedActionWalk — closed legal action sequence (no override)', () => {

  for (const [kind, n, fslOf] of [
    ['chain', 10, (k: number) => shapes.buildChainFSL(k)],
    ['dense', 10, (k: number) => shapes.buildDenseFSL(k)],
    ['hub',   20, (k: number) => shapes.buildHubFSL(k)],
  ] as Array<[string, number, (k: number) => string]>) {
    test(`${kind}-${n}: every action fires and the action machine returns to start`, () => {
      const base = sm([fslOf(n)]);
      const { fsl, labelsByPair } = shapes.labelActionEdges(base);
      const am   = sm([fsl]);
      const start = am.state();
      const walk  = shapes.closedWalk(kind, n, 100);
      const aw    = shapes.closedActionWalk(walk, start, labelsByPair);

      expect(aw.stepCount).toBe(walk.stepCount);
      for (let k = 0; k < aw.labels.length; ++k) {
        expect(am.action(aw.labels[k])).toBe(true);
      }
      expect(am.state()).toBe(start);                 // closed: back where it began
    });
  }

});

describe('closedSubWalk — irregular (messy) closed sub-walk via BFS', () => {

  const CYCLIC = ['s0 -> s1;', 's1 -> s2;', 's2 -> s0;', 's2 -> s3;'].join('\n');

  test('finds a shortest cycle through s0 and repeats it to >= minSteps', () => {
    // s0 -> s1 -> s2 -> s0 is a 3-edge cycle; s2 -> s3 is a dead-end spur.
    const m = sm([CYCLIC]);
    const w = shapes.closedSubWalk(m, 's0', 10);
    expect(w).not.toBeNull();
    expect(w.stepCount).toBeGreaterThanOrEqual(10);
    // drive it: every step legal, ends back at s0
    const m2 = sm([CYCLIC]);
    for (const tgt of w.targets) { expect(m2.transition(tgt)).toBe(true); }
    expect(m2.state()).toBe('s0');
  });

  test('returns null when s0 has no path back to itself (acyclic)', () => {
    const m = sm([['s0 -> s1;', 's1 -> s2;'].join('\n')]);   // DAG, no return to s0
    expect(shapes.closedSubWalk(m, 's0', 10)).toBeNull();
  });

});

describe('perTransition — per-transition throughput normalization', () => {

  test('multiplies iterations/sec by the lap step count (transitions/sec)', () => {
    // A shape doing 10 laps/sec where each lap is 200 transitions runs 2000 transitions/sec.
    expect(shapes.perTransition(10, 200)).toBe(2000);
  });

  test('a single-transition lap is the identity (stepCount 1)', () => {
    expect(shapes.perTransition(1234.5, 1)).toBe(1234.5);
  });

  test('matches the closedWalk stepCount it normalizes against', () => {
    const walk = shapes.closedWalk('chain', 200, 100);   // stepCount 200
    expect(shapes.perTransition(3, walk.stepCount)).toBe(600);
  });

});
