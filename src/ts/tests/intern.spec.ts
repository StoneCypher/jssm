import { Interner, pair_key, un_pair_key } from '../jssm_intern';

describe('jssm_intern', () => {

  describe('Interner', () => {

    test('intern assigns dense ids starting at zero', () => {
      const i = new Interner();
      expect(i.intern('red')).toBe(0);
      expect(i.intern('green')).toBe(1);
      expect(i.intern('yellow')).toBe(2);
    });

    test('intern is idempotent — re-interning returns the existing id', () => {
      const i = new Interner();
      expect(i.intern('red')).toBe(0);
      expect(i.intern('green')).toBe(1);
      expect(i.intern('red')).toBe(0);
      expect(i.size).toBe(2);
    });

    test('id_of returns the id for known names and undefined for unknown', () => {
      const i = new Interner();
      i.intern('red');
      expect(i.id_of('red')).toBe(0);
      expect(i.id_of('mauve')).toBeUndefined();
    });

    test('name_of inverts id_of', () => {
      const i = new Interner();
      i.intern('red');
      i.intern('green');
      expect(i.name_of(0)).toBe('red');
      expect(i.name_of(1)).toBe('green');
      expect(i.name_of(99)).toBeUndefined();
    });

    test('size reports the count of distinct interned names', () => {
      const i = new Interner();
      expect(i.size).toBe(0);
      i.intern('a');
      i.intern('b');
      i.intern('a');
      expect(i.size).toBe(2);
    });

  });

  describe('pair_key', () => {

    test('is injective over a dense id grid', () => {
      // Szudzik pairing must produce a distinct key for every ordered pair.
      const seen = new Set<number>();
      for (let a = 0; a < 50; a++) {
        for (let b = 0; b < 50; b++) {
          const k = pair_key(a, b);
          expect(seen.has(k)).toBe(false);
          seen.add(k);
        }
      }
      expect(seen.size).toBe(2500);
    });

    test('is order-sensitive', () => {
      expect(pair_key(2, 5)).not.toBe(pair_key(5, 2));
    });

    test('propagates NaN so unknown-id probes always miss', () => {
      // NaN is the deliberate sentinel for "no such interned name": a NaN key
      // can never equal any stored (always-real) key, so Map.get misses.
      expect(Number.isNaN(pair_key(NaN, 3))).toBe(true);
      expect(Number.isNaN(pair_key(3, NaN))).toBe(true);
    });

  });

  describe('un_pair_key', () => {

    test('round-trips every ordered pair over a dense id grid', () => {
      // un_pair_key must exactly invert pair_key for all non-negative inputs.
      for (let a = 0; a < 60; a++) {
        for (let b = 0; b < 60; b++) {
          expect(un_pair_key(pair_key(a, b))).toStrictEqual([a, b]);
        }
      }
    });

    test('matches the documented worked examples and preserves order', () => {
      expect(un_pair_key(27)).toStrictEqual([2, 5]);
      expect(un_pair_key(32)).toStrictEqual([5, 2]);
    });

  });

});
