import { createRequire } from 'node:module';
import * as path from 'node:path';

const require = createRequire(import.meta.url);
const bc = require('../benchmark_compare.cjs');

const fixture = (n: string) => path.join(__dirname, 'fixtures', n);

describe('benchmark_compare pure helpers', () => {

  test('factor divides current by reference', () => {
    expect(bc.factor(300, 100)).toBe(3);
    expect(bc.factor(300, 150)).toBe(2);
  });

  test('factor returns null on missing or zero reference', () => {
    expect(bc.factor(5, 0)).toBe(null);
    expect(bc.factor(5, null)).toBe(null);
    expect(bc.factor(null, 5)).toBe(null);
  });

  test('formatOps inserts thousands separators and dashes nulls', () => {
    expect(bc.formatOps(1234567)).toBe('1,234,567');
    expect(bc.formatOps(null)).toBe('—');
  });

  test('formatFactor renders two decimals with the times sign', () => {
    expect(bc.formatFactor(3)).toBe('3.00×');
    expect(bc.formatFactor(null)).toBe('—');
  });

  test('pivot groups ops by operation then shape', () => {
    const opsByName = new Map([
      ['chain-10 transition()', 100],
      ['chain-50 transition()', 50],
      ['chain-10 edges_between()', 10]
    ]);
    const p = bc.pivot(opsByName);
    expect(p.get('transition()').get('chain-10')).toBe(100);
    expect(p.get('edges_between()').get('chain-10')).toBe(10);
  });

  test('loadBenchmark reads version, date, and an ops map', () => {
    const b = bc.loadBenchmark(fixture('bench_a.json'));
    expect(b.version).toBe('1.0.0');
    expect(b.date).toBe('2026-01-01T00:00:00.000Z');
    expect(b.opsByName.get('chain-10 transition()')).toBe(100);
  });

});

describe('benchmark_compare three-file comparison', () => {

  const render = () => {
    const benches = ['bench_a.json', 'bench_b.json', 'bench_c.json']
      .map((n) => bc.loadBenchmark(fixture(n)));
    return bc.renderMarkdown(bc.buildComparison(benches));
  };

  test('emits vs prev and vs orig factors for a shared shape', () => {
    expect(render()).toContain('| chain-10 | 100 | 150 | 300 | 2.00× | 3.00× |');
  });

  test('a shape only present in current renders dashes for missing columns', () => {
    expect(render()).toContain('| chain-99 | — | — | 5 | — | — |');
  });

  test('emits action comparison rows', () => {
    expect(render()).toMatch(/\| chain-10 \| 80 \| 120 \| 240 \| 2\.00. \| 3\.00. \|/);
  });

  test('groups tables by operation in canonical order', () => {
    const out = render();
    expect(out).toContain('### `transition()` ops/sec');
    expect(out).toContain('### `action()` ops/sec');
    expect(out).toContain('### `edges_between()` ops/sec');
    expect(out.indexOf('transition()')).toBeLessThan(out.indexOf('action()'));
    expect(out.indexOf('action()')).toBeLessThan(out.indexOf('edges_between()'));
  });

});

describe('benchmark_compare two-file comparison', () => {

  test('omits the previous and vs-prev columns', () => {
    const benches = ['bench_a.json', 'bench_c.json']
      .map((n) => bc.loadBenchmark(fixture(n)));
    const out = bc.renderMarkdown(bc.buildComparison(benches));
    expect(out).toContain('| chain-10 | 100 | 300 | 3.00× |');
    expect(out).not.toContain('vs prev');
  });

});

describe('benchmark_compare argument validation', () => {

  test('buildComparison rejects fewer than 2 benchmarks', () => {
    expect(() => bc.buildComparison([])).toThrow(/2 or 3/);
    expect(() => bc.buildComparison([{ opsByName: new Map() }])).toThrow(/2 or 3/);
  });

  test('buildComparison rejects more than 3 benchmarks', () => {
    // length is checked before any element is dereferenced, so placeholders are fine
    expect(() => bc.buildComparison([1, 2, 3, 4])).toThrow(/2 or 3/);
  });

});

describe('benchmark_compare baseline-remembering arg resolution', () => {

  test('prepends the baseline when only a current file is given', () => {
    expect(bc.resolveInputPaths(['cur.json'], 'base.json'))
      .toEqual(['base.json', 'cur.json']);
  });

  test('prepends the baseline for a previous+current pair', () => {
    expect(bc.resolveInputPaths(['prev.json', 'cur.json'], 'base.json'))
      .toEqual(['base.json', 'prev.json', 'cur.json']);
  });

  test('defaults to the #636 baseline (benchmark_2026-05-26.json) when no override', () => {
    const [first] = bc.resolveInputPaths(['cur.json']);
    expect(first).toBe(bc.DEFAULT_BASELINE);
    expect(first).toContain('benchmark_2026-05-26.json');
  });

  test('--baseline overrides the default original', () => {
    expect(bc.resolveInputPaths(['--baseline', 'x.json', 'prev.json', 'cur.json'], 'base.json'))
      .toEqual(['x.json', 'prev.json', 'cur.json']);
  });

  test('--no-baseline reverts to fully-explicit positionals', () => {
    expect(bc.resolveInputPaths(['--no-baseline', 'orig.json', 'cur.json'], 'base.json'))
      .toEqual(['orig.json', 'cur.json']);
  });

  test('throws when steps + baseline would exceed three files', () => {
    expect(() => bc.resolveInputPaths(['a.json', 'b.json', 'c.json'], 'base.json')).toThrow(/total/);
  });

  test('throws on --no-baseline with too few files', () => {
    expect(() => bc.resolveInputPaths(['--no-baseline', 'only.json'], 'base.json')).toThrow(/total/);
  });

  test('throws when --baseline is missing its path', () => {
    expect(() => bc.resolveInputPaths(['--baseline'], 'base.json')).toThrow(/--baseline/);
  });

  test('throws on an unknown flag', () => {
    expect(() => bc.resolveInputPaths(['--wat', 'cur.json'], 'base.json')).toThrow(/unknown flag/);
  });

});
