import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

// Seeded histogram over many single probabilistic steps from `from`.
const histo = (src: string, from: string, n: number, seed: number): Map<string, number> => {
  const m = jssm.sm`${src}`;
  m.rng_seed = seed;
  const out = new Map<string, number>();
  for (let i = 0; i < n; ++i) {
    m.force_transition(from);
    m.probabilistic_transition();
    out.set(m.state(), (out.get(m.state()) ?? 0) + 1);
  }
  return out;
};

// `true` when an observed count, as a fraction of `n` draws, lands within
// 0.04 of the expected share `want`.
const within_tolerance = (got: number, want: number, n: number): boolean =>
  Math.abs(got / n - want) < 0.04;

const lexicographic = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));

describe('list weights at runtime', () => {

  it('example A: 25/25/50 split', () => {
    const n = 4000, h = histo('a 50% -> [b c]; a 50% -> d; [b c d] -> a;', 'a', n, 1);
    expect(within_tolerance(h.get('b') ?? 0, 0.25, n)).toBe(true);
    expect(within_tolerance(h.get('c') ?? 0, 0.25, n)).toBe(true);
    expect(within_tolerance(h.get('d') ?? 0, 0.5, n)).toBe(true);
  });

  it('example B: 10/40/50 split', () => {
    const n = 4000, h = histo('a 50% -> [b 20% c 80%]; a 50% -> d; [b c d] -> a;', 'a', n, 2);
    expect(within_tolerance(h.get('b') ?? 0, 0.1, n)).toBe(true);
    expect(within_tolerance(h.get('c') ?? 0, 0.4, n)).toBe(true);
    expect(within_tolerance(h.get('d') ?? 0, 0.5, n)).toBe(true);
  });

  it('example D: share-only edges weigh against an unweighted sibling as 0.2 : 0.8 : 1', () => {
    const n = 4000, h = histo('a -> [b 20% c 80%]; a -> d; [b c d] -> a;', 'a', n, 3);
    expect(within_tolerance(h.get('b') ?? 0, 0.1, n)).toBe(true);
    expect(within_tolerance(h.get('c') ?? 0, 0.4, n)).toBe(true);
    expect(within_tolerance(h.get('d') ?? 0, 0.5, n)).toBe(true);
  });

  it('share-only edges do not evict unweighted siblings from the pool', () => {
    const m = jssm.sm`a -> [b 20% c 80%]; a -> d;`;
    expect(m.probable_exits_for('a').map(e => e.to).sort(lexicographic)).toEqual(['b', 'c', 'd']);
  });

  it('declared probabilities still evict unweighted siblings (fsl#1248 unchanged)', () => {
    const m = jssm.sm`a 50% -> [b c]; a -> d;`;
    expect(m.probable_exits_for('a').map(e => e.to).sort(lexicographic)).toEqual(['b', 'c']);
  });

  it('weighted_rand_select multiplies probability by share on the default key', () => {
    const rng = jssm.gen_splitmix32(7);
    const opts = [{ to: 'x', probability: 50, share: 0.2 }, { to: 'y', probability: undefined, share: 0.8 }, { to: 'z' }];
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; ++i) { const k = jssm.weighted_rand_select(opts, undefined, rng).to; counts.set(k, (counts.get(k) ?? 0) + 1); }
    // weights 10 : 0.8 : 1  → 0.847 : 0.068 : 0.085
    expect(within_tolerance(counts.get('x') ?? 0, 10 / 11.8, 4000)).toBe(true);
  });

  it('weighted_rand_select ignores share on a custom key (generic API unchanged)', () => {
    const rng = jssm.gen_splitmix32(8);
    const opts = [{ to: 'x', w: 1, share: 0.001 }, { to: 'y', w: 1 }];
    const counts = new Map<string, number>();
    for (let i = 0; i < 2000; ++i) { const k = jssm.weighted_rand_select(opts, 'w', rng).to; counts.set(k, (counts.get(k) ?? 0) + 1); }
    expect(within_tolerance(counts.get('x') ?? 0, 0.5, 2000)).toBe(true);
  });

});
