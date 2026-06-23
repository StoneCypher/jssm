// Unit tests for src/buildjs/benchmark_load.cjs — cold require/load time of the
// bundle, measured by a fresh child process (the runner is injected here).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const load = require('../benchmark_load.cjs');

describe('measureLoadMs', () => {
  test('parses the milliseconds the child prints', () => {
    const runNode = () => '12.34\n';
    expect(load.measureLoadMs('/d/jssm.es5.cjs', runNode)).toBeCloseTo(12.34, 5);
  });
  test('passes a require() probe for the given path to the child', () => {
    let seen = '';
    load.measureLoadMs('/d/jssm.es5.cjs', (code: string) => { seen = code; return '1'; });
    expect(seen).toContain('require');
    expect(seen).toContain('/d/jssm.es5.cjs');
  });
  test('returns null when the child output is unparseable', () => {
    expect(load.measureLoadMs('/d/x', () => 'boom')).toBeNull();
  });
});
