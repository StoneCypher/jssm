
import * as fc from 'fast-check';

import {
  list_of, list_from, list_length, list_get, list_set, list_push, list_pop,
  list_slice, list_includes,
  set_of, set_from, set_size, set_has, set_add, set_remove,
  set_union, set_intersection, set_difference,
  map_of, map_size, map_has, map_get, map_put, map_remove, map_entries,
  is_container, deep_equal, equals, snapshot, deep_clone, compare,
  require_scalar, scalar_compare
} from '../fsl_containers';

import type { Scalar } from '../fsl_containers';



// Note on `void` (per seq.stoch.ts): fast-check@2's Property.run treats a
// predicate as failed unless it returns null/undefined/true; vitest's
// `expect(...)` chain returns an object, so we wrap each predicate body in
// `void <expr>` to coerce the return to undefined.

const RUNS = 200;



// A scalar arbitrary that stays inside the decidable key/member domain (finite
// numbers and strings) — the only values `require_scalar` accepts.
const scalar_arb: fc.Arbitrary<Scalar> = fc.oneof(
  fc.integer({ min: -1000, max: 1000 }),
  fc.double({ next: true, noNaN: true, noDefaultInfinity: true }),
  fc.string()
);

// Arbitrary lists of scalars (values may be any type, but scalars keep
// structural-equality checks cheap and total).
const list_arb = fc.array(scalar_arb, { maxLength: 12 });

// Arbitrary sets, built from a member array.
const set_arb = list_arb.map(set_from);

// Arbitrary maps, built from key/value entry pairs.
const entries_arb = fc.array(
  fc.tuple(scalar_arb, fc.integer({ min: -100, max: 100 })),
  { maxLength: 12 }
);
const map_arb = entries_arb.map(es => map_of(es));



describe('list invariants', () => {

  test('list_from round-trips its element array', () => {
    fc.assert(fc.property(list_arb, xs =>
      void expect( list_from(xs).items ).toEqual(xs)
    ), { numRuns: RUNS });
  });

  test('list_length matches the source array length', () => {
    fc.assert(fc.property(list_arb, xs =>
      void expect( list_length(list_from(xs)) ).toBe(xs.length)
    ), { numRuns: RUNS });
  });

  test('list_set then list_get round-trips at any in-range index', () => {
    fc.assert(fc.property(list_arb, scalar_arb, fc.integer(), (xs, v, raw) => {
      const l = list_from(xs);
      if (l.items.length === 0) { return; }
      const i = ((raw % l.items.length) + l.items.length) % l.items.length;
      expect( list_get(list_set(l, i, v), i) ).toBe(v);
    }), { numRuns: RUNS });
  });

  test('list_push then list_pop is identity, returning the pushed element', () => {
    fc.assert(fc.property(list_arb, scalar_arb, (xs, v) => {
      const l            = list_from(xs);
      const [back, popped] = list_pop(list_push(l, v));
      expect( popped ).toBe(v);
      expect( equals(back, l) ).toBe(true);
    }), { numRuns: RUNS });
  });

  test('list_slice never exceeds the source length', () => {
    fc.assert(fc.property(list_arb, fc.integer(), fc.integer(), (xs, a, b) =>
      void expect( list_slice(list_from(xs), a, b).items.length ).toBeLessThanOrEqual(xs.length)
    ), { numRuns: RUNS });
  });

  test('every element of a list is found by list_includes', () => {
    fc.assert(fc.property(list_arb, xs => {
      const l = list_from(xs);
      for (const x of xs) { expect( list_includes(l, x) ).toBe(true); }
    }), { numRuns: RUNS });
  });

  test('list operations never mutate the input', () => {
    fc.assert(fc.property(list_arb, scalar_arb, (xs, v) => {
      const l    = list_from(xs);
      const snap = [...l.items];
      list_set(l, 0, v); list_push(l, v); list_pop(l); list_slice(l, 0, 1);
      expect( l.items ).toEqual(snap);
    }), { numRuns: RUNS });
  });

});



describe('set invariants', () => {

  test('a set holds no duplicate members', () => {
    fc.assert(fc.property(set_arb, s =>
      void expect( new Set(s.members).size ).toBe(s.members.length)
    ), { numRuns: RUNS });
  });

  test('set_size equals the distinct-member count of the source', () => {
    fc.assert(fc.property(list_arb, xs =>
      void expect( set_size(set_from(xs)) ).toBe(new Set(xs).size)
    ), { numRuns: RUNS });
  });

  test('set_add is idempotent (adding a present member changes nothing)', () => {
    fc.assert(fc.property(set_arb, scalar_arb, (s, m) => {
      const once  = set_add(s, m);
      const twice = set_add(once, m);
      expect( equals(once, twice) ).toBe(true);
      expect( set_has(once, m) ).toBe(true);
    }), { numRuns: RUNS });
  });

  test('set_remove undoes a set_add of a fresh member', () => {
    fc.assert(fc.property(set_arb, scalar_arb, (s, m) => {
      if (set_has(s, m)) { return; }
      expect( equals(set_remove(set_add(s, m), m), s) ).toBe(true);
    }), { numRuns: RUNS });
  });

  test('union is commutative as a value (order-free equality)', () => {
    fc.assert(fc.property(set_arb, set_arb, (a, b) =>
      void expect( equals(set_union(a, b), set_union(b, a)) ).toBe(true)
    ), { numRuns: RUNS });
  });

  test('intersection members are in both sets; difference members are in only the left', () => {
    fc.assert(fc.property(set_arb, set_arb, (a, b) => {
      for (const m of set_intersection(a, b).members) {
        expect( set_has(a, m) && set_has(b, m) ).toBe(true);
      }
      for (const m of set_difference(a, b).members) {
        expect( set_has(a, m) && !set_has(b, m) ).toBe(true);
      }
    }), { numRuns: RUNS });
  });

});



describe('map invariants', () => {

  test('map_put then map_get round-trips the value, and map_has is true', () => {
    fc.assert(fc.property(map_arb, scalar_arb, fc.integer(), (m, k, v) => {
      const m2 = map_put(m, k, v);
      expect( map_get(m2, k) ).toBe(v);
      expect( map_has(m2, k) ).toBe(true);
    }), { numRuns: RUNS });
  });

  test('map_remove undoes a map_put of a fresh key', () => {
    fc.assert(fc.property(map_arb, scalar_arb, fc.integer(), (m, k, v) => {
      if (map_has(m, k)) { return; }
      expect( equals(map_remove(map_put(m, k, v), k), m) ).toBe(true);
    }), { numRuns: RUNS });
  });

  test('map_size equals the distinct-key count of the source entries', () => {
    fc.assert(fc.property(entries_arb, es => {
      const keys = new Set(es.map(e => e[0]));
      expect( map_size(map_of(es)) ).toBe(keys.size);
    }), { numRuns: RUNS });
  });

  test('map_entries reproduces a queryable mapping', () => {
    fc.assert(fc.property(map_arb, m => {
      for (const [k, v] of map_entries(m)) {
        expect( map_get(m, k) ).toBe(v);
      }
    }), { numRuns: RUNS });
  });

});



describe('structural protocol invariants', () => {

  test('equals is reflexive over each kind', () => {
    fc.assert(fc.property(fc.oneof(list_arb.map(list_from), set_arb, map_arb), c =>
      void expect( equals(c, c) ).toBe(true)
    ), { numRuns: RUNS });
  });

  test('deep_clone is structurally equal to its input', () => {
    fc.assert(fc.property(fc.oneof(list_arb.map(list_from), set_arb, map_arb), c =>
      void expect( equals(deep_clone(c), c) ).toBe(true)
    ), { numRuns: RUNS });
  });

  test('snapshot is canonical: equal values give equal JSON snapshots', () => {
    fc.assert(fc.property(list_arb, xs => {
      const a = set_from(xs);
      const b = set_from([...xs].reverse());
      expect( JSON.stringify(snapshot(a)) ).toBe( JSON.stringify(snapshot(b)) );
    }), { numRuns: RUNS });
  });

  test('snapshot is JSON-round-trippable (plain data only)', () => {
    // JSON cannot represent -0 (it serialises to "0"), so a snapshot carrying
    // -0 round-trips to +0.  Fold -0 to 0 on the expected side before the
    // structural compare — the snapshot is canonical JSON, where -0 ≡ 0.
    const fold_neg_zero = (v: any): any => {
      if (Array.isArray(v))                        { return v.map(fold_neg_zero); }
      if (v !== null && typeof v === 'object')     { return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fold_neg_zero(x)])); }
      if (Object.is(v, -0))                        { return 0; }
      return v;
    };
    fc.assert(fc.property(fc.oneof(list_arb.map(list_from), set_arb, map_arb), c => {
      const json = JSON.stringify(snapshot(c));
      expect( JSON.parse(json) ).toEqual( fold_neg_zero(snapshot(c)) );
    }), { numRuns: RUNS });
  });

  test('every container is recognised by is_container', () => {
    fc.assert(fc.property(fc.oneof(list_arb.map(list_from), set_arb, map_arb), c =>
      void expect( is_container(c) ).toBe(true)
    ), { numRuns: RUNS });
  });

  test('compare(a, b) === 0 iff equals(a, b)', () => {
    const kinds = fc.oneof(list_arb.map(list_from), set_arb, map_arb);
    fc.assert(fc.property(kinds, kinds, (a, b) =>
      void expect( compare(a, b) === 0 ).toBe( equals(a, b) )
    ), { numRuns: RUNS });
  });

  test('compare is antisymmetric (sign flips when arguments swap)', () => {
    const kinds = fc.oneof(list_arb.map(list_from), set_arb, map_arb);
    fc.assert(fc.property(kinds, kinds, (a, b) =>
      void expect( compare(a, b) ).toBe( (-compare(b, a)) || 0 )   // `|| 0` folds -0 (from negating 0) to +0
    ), { numRuns: RUNS });
  });

});



describe('scalar guard and ordering invariants', () => {

  test('require_scalar accepts every finite number / string and is identity', () => {
    fc.assert(fc.property(scalar_arb, s =>
      void expect( require_scalar(s) ).toBe(s)
    ), { numRuns: RUNS });
  });

  test('scalar_compare is a total antisymmetric order', () => {
    fc.assert(fc.property(scalar_arb, scalar_arb, (a, b) => {
      const ab = scalar_compare(a, b);
      const ba = scalar_compare(b, a);
      expect( ab ).toBe( ((-ba) || 0) as -1 | 0 | 1 );   // `|| 0` folds -0 (from negating 0) to +0
      expect( deep_equal(a, b) ).toBe( ab === 0 );
    }), { numRuns: RUNS });
  });

});
