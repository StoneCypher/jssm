// Unit tests for src/buildjs/run_build.cjs — the parallel-stage runner. The
// per-script runner is injected so ordering/abort semantics are tested without
// spawning real npm processes.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rb = require('../run_build.cjs');

describe('runStages', () => {
  test('runs scripts within a stage concurrently, but stages serially', async () => {
    const order: string[] = [];
    const run = (s: string) => {
      order.push(`start:${s}`);
      return Promise.resolve().then(() => { order.push(`end:${s}`); });
    };
    await rb.runStages([['a', 'b'], ['c']], { run, log: () => {} });
    // a and b both start before either finishes → concurrent within the stage
    expect(order.indexOf('start:b')).toBeLessThan(order.indexOf('end:a'));
    // c starts only after both a and b have finished → stages are serial
    expect(order.indexOf('start:c')).toBeGreaterThan(order.indexOf('end:a'));
    expect(order.indexOf('start:c')).toBeGreaterThan(order.indexOf('end:b'));
  });

  test('a failing script aborts the build before later stages run', async () => {
    const ran: string[] = [];
    const run = (s: string) => {
      ran.push(s);
      return s === 'boom' ? Promise.reject(new Error('kaboom')) : Promise.resolve();
    };
    await expect(rb.runStages([['boom'], ['later']], { run, log: () => {} })).rejects.toThrow('kaboom');
    expect(ran).not.toContain('later');
  });

  test('skips empty stages', async () => {
    const ran: string[] = [];
    const run = (s: string) => { ran.push(s); return Promise.resolve(); };
    await rb.runStages([[], ['a'], []], { run, log: () => {} });
    expect(ran).toEqual(['a']);
  });
});
