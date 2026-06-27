import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const shapes = require('../benchmark_scaling_shapes.cjs');

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

});
