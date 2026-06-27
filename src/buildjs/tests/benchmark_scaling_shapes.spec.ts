import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const shapes = require('../benchmark_scaling_shapes.cjs');
const jssm = require('../../../dist/jssm.es5.cjs');
const sm = jssm.sm;

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
