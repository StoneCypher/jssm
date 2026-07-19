
import {
  // list
  list_of, list_from, list_length, resolve_list_index,
  list_get, list_at, list_set, list_push, list_pop, list_slice, list_includes,
  // set
  set_of, set_from, set_size, set_has, set_add, set_remove,
  set_union, set_intersection, set_difference,
  // map
  map_of, map_size, map_has, map_get, map_get_strict, map_get_or, map_put, map_remove,
  map_keys, map_values, map_entries,
  // typed errors + key predicate
  is_container_key, ContainerKeyError, ContainerRangeError,
  // structural protocol
  is_container, deep_equal, same_value_zero, equals, snapshot, deep_clone, compare, KIND_RANK,
  // helpers
  require_scalar, stringify_for_error, scalar_compare, container_equal,
  array_equal, is_plain_object, object_equal, compare_snapshots,
  type_rank, array_compare, object_compare
} from '../fsl_containers';

import type { FslList, FslSet, FslMap } from '../fsl_containers';



describe('list — array of T (§4.2)', () => {

  test('list_of builds an ordered list, keeps duplicates, copies the input', () => {
    expect( list_of(1, 2, 3).items ).toEqual([1, 2, 3]);
    expect( list_of().items ).toEqual([]);
    expect( list_of('a', 'a').items ).toEqual(['a', 'a']);
    expect( list_of(1, 2, 3).kind ).toBe('list');
  });

  test('list_of freezes the backing array', () => {
    expect( Object.isFrozen(list_of(1, 2).items) ).toBe(true);
  });

  test('list_from builds from an array argument', () => {
    expect( list_from([1, 2, 3]).items ).toEqual([1, 2, 3]);
    expect( list_from([]).items ).toEqual([]);
  });

  test('list_from copies — later mutation of the source cannot reach inside', () => {
    const src = [1, 2, 3];
    const lst = list_from(src);
    src.push(4);
    expect( lst.items ).toEqual([1, 2, 3]);
  });

  test('list_length counts elements', () => {
    expect( list_length(list_of(1, 2, 3)) ).toBe(3);
    expect( list_length(list_of()) ).toBe(0);
  });

  test('resolve_list_index resolves positive, negative, and out-of-range', () => {
    expect( resolve_list_index(0, 3) ).toBe(0);
    expect( resolve_list_index(-1, 3) ).toBe(2);
    expect( resolve_list_index(3, 3) ).toBeUndefined();
    expect( resolve_list_index(-4, 3) ).toBeUndefined();
  });

  test('list_get reads positive / negative / out-of-range', () => {
    const l = list_of(10, 20, 30);
    expect( list_get(l, 1) ).toBe(20);
    expect( list_get(l, -1) ).toBe(30);
    expect( list_get(l, 9) ).toBeUndefined();
  });

  test('list_set replaces in place, supports negatives, leaves the input alone', () => {
    const l = list_of(1, 2, 3);
    expect( list_set(l, 1, 9).items ).toEqual([1, 9, 3]);
    expect( list_set(l, -1, 9).items ).toEqual([1, 2, 9]);
    expect( l.items ).toEqual([1, 2, 3]);   // unchanged
  });

  test('list_set out of range returns the original by value', () => {
    const l = list_of(1, 2, 3);
    expect( list_set(l, 9, 0) ).toBe(l);
  });

  test('list_push appends', () => {
    expect( list_push(list_of(1, 2), 3).items ).toEqual([1, 2, 3]);
    expect( list_push(list_of(), 'x').items ).toEqual(['x']);
  });

  test('list_pop returns remaining and popped element', () => {
    const [rest, popped] = list_pop(list_of(1, 2, 3));
    expect( rest.items ).toEqual([1, 2]);
    expect( popped ).toBe(3);
  });

  test('list_pop on empty returns the empty list and undefined', () => {
    const empty = list_of<number>();
    const [rest, popped] = list_pop(empty);
    expect( rest ).toBe(empty);
    expect( popped ).toBeUndefined();
  });

  test('list_slice with explicit bounds, omitted hi, and negative hi', () => {
    const l = list_of(1, 2, 3, 4);
    expect( list_slice(l, 1, 3).items ).toEqual([2, 3]);
    expect( list_slice(l, 1).items ).toEqual([2, 3, 4]);
    expect( list_slice(l, 1, -1).items ).toEqual([2, 3]);
  });

  test('list_includes matches by structural deep equality', () => {
    expect( list_includes(list_of(1, 2, 3), 2) ).toBe(true);
    expect( list_includes(list_of(1, 2, 3), 9) ).toBe(false);
    expect( list_includes(list_of(list_of(1)), list_of(1)) ).toBe(true);
  });

});



describe('set — set of (number | string) (§4.2)', () => {

  test('set_of dedupes and preserves first-insertion order', () => {
    expect( set_of(1, 2, 3).members ).toEqual([1, 2, 3]);
    expect( set_of(1, 1, 2).members ).toEqual([1, 2]);
    expect( set_of(3, 1, 2).members ).toEqual([3, 1, 2]);
    expect( set_of(1).kind ).toBe('set');
  });

  test('set_of accepts mixed numbers and strings', () => {
    expect( set_of('a', 1).members ).toEqual(['a', 1]);
  });

  test('set_from builds from an array', () => {
    expect( set_from([1, 2, 2, 3]).members ).toEqual([1, 2, 3]);
    expect( set_from([]).members ).toEqual([]);
  });

  test('set construction rejects non-scalar members', () => {
    expect( () => set_of(NaN) ).toThrow();
    expect( () => set_of(Infinity) ).toThrow();
    // @ts-expect-error — deliberately illegal member type for the runtime guard
    expect( () => set_of(true) ).toThrow();
    expect( () => set_of(null) ).toThrow();
  });

  test('set_size counts distinct members', () => {
    expect( set_size(set_of(1, 2, 3)) ).toBe(3);
    expect( set_size(set_of(1, 1)) ).toBe(1);
  });

  test('set_has tests membership', () => {
    expect( set_has(set_of(1, 2, 3), 2) ).toBe(true);
    expect( set_has(set_of(1, 2, 3), 9) ).toBe(false);
    expect( set_has(set_of('a'), 'b') ).toBe(false);
  });

  test('set_add is idempotent and rejects bad members', () => {
    expect( set_add(set_of(1, 2), 3).members ).toEqual([1, 2, 3]);
    const s = set_of(1, 2);
    expect( set_add(s, 2) ).toBe(s);   // idempotent → same reference
    expect( () => set_add(s, NaN) ).toThrow();
  });

  test('set_remove drops a member; absent member returns the original', () => {
    expect( set_remove(set_of(1, 2, 3), 2).members ).toEqual([1, 3]);
    const s = set_of(1, 2, 3);
    expect( set_remove(s, 9) ).toBe(s);
  });

  test('set_union combines members', () => {
    expect( set_union(set_of(1, 2), set_of(2, 3)).members ).toEqual([1, 2, 3]);
    expect( set_union(set_of(), set_of(1)).members ).toEqual([1]);
  });

  test('set_intersection keeps shared members', () => {
    expect( set_intersection(set_of(1, 2, 3), set_of(2, 3, 4)).members ).toEqual([2, 3]);
    expect( set_intersection(set_of(1), set_of(2)).members ).toEqual([]);
  });

  test('set_difference keeps a-not-in-b', () => {
    expect( set_difference(set_of(1, 2, 3), set_of(2)).members ).toEqual([1, 3]);
    expect( set_difference(set_of(1, 2), set_of(1, 2)).members ).toEqual([]);
  });

});



describe('map — map<(number | string), V> (§4.2)', () => {

  test('map_of builds entries; last value wins on a repeated key', () => {
    expect( map_of([['a', 1], ['b', 2]]).keys ).toEqual(['a', 'b']);
    expect( map_get(map_of([['a', 1], ['a', 9]]), 'a') ).toBe(9);
    expect( map_of([]).keys ).toEqual([]);
    expect( map_of([['a', 1]]).kind ).toBe('map');
  });

  test('map_of rejects non-scalar keys', () => {
    // @ts-expect-error — deliberately illegal key type for the runtime guard
    expect( () => map_of([[true, 1]]) ).toThrow();
    expect( () => map_of([[NaN, 1]]) ).toThrow();
  });

  test('map_size counts entries', () => {
    expect( map_size(map_of([['a', 1], ['b', 2]])) ).toBe(2);
    expect( map_size(map_of([])) ).toBe(0);
  });

  test('map_has distinguishes absent from present-undefined', () => {
    const m = map_of<number | undefined>([['a', undefined]]);
    expect( map_has(m, 'a') ).toBe(true);
    expect( map_has(m, 'z') ).toBe(false);
    expect( map_get(m, 'a') ).toBeUndefined();
  });

  test('map_get reads present and absent keys', () => {
    const m = map_of([['a', 1], ['b', 2]]);
    expect( map_get(m, 'b') ).toBe(2);
    expect( map_get(m, 'z') ).toBeUndefined();
  });

  test('map_put updates in place, appends new keys, rejects bad keys', () => {
    expect( map_put(map_of([['a', 1]]), 'b', 2).keys ).toEqual(['a', 'b']);
    const replaced = map_put(map_of([['a', 1], ['b', 2]]), 'a', 9);
    expect( map_get(replaced, 'a') ).toBe(9);
    expect( replaced.keys ).toEqual(['a', 'b']);   // position preserved
    expect( () => map_put(map_of<number>([]), NaN, 1) ).toThrow();
  });

  test('map_remove drops an entry; absent key returns the original', () => {
    expect( map_remove(map_of([['a', 1], ['b', 2]]), 'a').keys ).toEqual(['b']);
    const m = map_of([['a', 1]]);
    expect( map_remove(m, 'z') ).toBe(m);
  });

  test('map_keys / map_values / map_entries expose contents in insertion order', () => {
    const m = map_of([['a', 1], ['b', 2]]);
    expect( map_keys(m) ).toEqual(['a', 'b']);
    expect( map_values(m) ).toEqual([1, 2]);
    expect( map_entries(m) ).toEqual([['a', 1], ['b', 2]]);
  });

  test('map_keys / map_values return fresh arrays (mutating them is safe)', () => {
    const m  = map_of([['a', 1]]);
    map_keys(m).push('zzz' as never);
    map_values(m).push(999 as never);
    expect( m.keys ).toEqual(['a']);
    expect( m.values ).toEqual([1]);
  });

});



describe('require_scalar / stringify_for_error', () => {

  test('require_scalar passes strings and finite numbers', () => {
    expect( require_scalar('a') ).toBe('a');
    expect( require_scalar(7) ).toBe(7);
    expect( require_scalar(0) ).toBe(0);
    expect( require_scalar(-3.5) ).toBe(-3.5);
  });

  test('require_scalar throws on NaN, Infinity, and non-scalars', () => {
    expect( () => require_scalar(NaN) ).toThrow();
    expect( () => require_scalar(Infinity) ).toThrow();
    expect( () => require_scalar(true) ).toThrow();
    expect( () => require_scalar({}) ).toThrow();
    expect( () => require_scalar(undefined) ).toThrow();
  });

  test('stringify_for_error renders numbers, strings, and other values', () => {
    expect( stringify_for_error(NaN) ).toBe('NaN');
    expect( stringify_for_error('x') ).toBe('"x"');
    expect( stringify_for_error(undefined) ).toBe('undefined');
    expect( stringify_for_error(null) ).toBe('null');
  });

  test('stringify_for_error renders booleans, bigints, and symbols', () => {
    expect( stringify_for_error(true) ).toBe('true');
    // eslint-disable-next-line unicorn/prefer-bigint-literals -- the test tsconfig targets below ES2020, where a bigint literal is TS2737
    expect( stringify_for_error(BigInt(7)) ).toBe('7');
    expect( stringify_for_error(Symbol('k')) ).toBe('Symbol(k)');
  });

  test('stringify_for_error brand-renders objects, even null-prototype ones', () => {
    expect( stringify_for_error({}) ).toBe('[object Object]');
    expect( stringify_for_error([1, 2]) ).toBe('[object Array]');
    expect( stringify_for_error(Object.create(null)) ).toBe('[object Object]');
  });

});



describe('scalar_compare', () => {

  test('orders numbers numerically and strings lexically', () => {
    expect( scalar_compare(1, 2) ).toBe(-1);
    expect( scalar_compare(2, 1) ).toBe(1);
    expect( scalar_compare(1, 1) ).toBe(0);
    expect( scalar_compare('a', 'b') ).toBe(-1);
    expect( scalar_compare('b', 'a') ).toBe(1);
    expect( scalar_compare('a', 'a') ).toBe(0);
  });

  test('all numbers sort before all strings', () => {
    expect( scalar_compare(9, 'a') ).toBe(-1);
    expect( scalar_compare('a', 9) ).toBe(1);
  });

});



describe('structural equality (§6)', () => {

  test('same_value_zero: ===, NaN===NaN, +0===-0, distinct values', () => {
    expect( same_value_zero(1, 1) ).toBe(true);
    expect( same_value_zero(NaN, NaN) ).toBe(true);
    expect( same_value_zero(0, -0) ).toBe(true);
    expect( same_value_zero(1, 2) ).toBe(false);
    expect( same_value_zero(NaN, 1) ).toBe(false);
  });

  test('is_container recognises the three kinds and rejects others', () => {
    expect( is_container(list_of(1)) ).toBe(true);
    expect( is_container(set_of(1)) ).toBe(true);
    expect( is_container(map_of([['a', 1]])) ).toBe(true);
    expect( is_container(42) ).toBe(false);
    expect( is_container(null) ).toBe(false);
    expect( is_container({ kind: 'nope' }) ).toBe(false);
    expect( is_container([1, 2, 3]) ).toBe(false);
  });

  test('deep_equal: lists are order-sensitive', () => {
    expect( deep_equal(list_of(1, 2), list_of(1, 2)) ).toBe(true);
    expect( deep_equal(list_of(1, 2), list_of(2, 1)) ).toBe(false);
  });

  test('deep_equal: sets and maps are order-free', () => {
    expect( deep_equal(set_of(1, 2, 3), set_of(3, 2, 1)) ).toBe(true);
    expect( deep_equal(map_of([['a', 1], ['b', 2]]), map_of([['b', 2], ['a', 1]])) ).toBe(true);
  });

  test('deep_equal: differing size / value / kind are unequal', () => {
    expect( deep_equal(set_of(1, 2), set_of(1, 2, 3)) ).toBe(false);
    expect( deep_equal(map_of([['a', 1]]), map_of([['a', 2]])) ).toBe(false);
    expect( deep_equal(map_of([['a', 1]]), map_of([['b', 1]])) ).toBe(false);
    expect( deep_equal(list_of(1), set_of(1)) ).toBe(false);
  });

  test('deep_equal: NaN leaves, nested arrays, and plain objects', () => {
    expect( deep_equal(NaN, NaN) ).toBe(true);
    expect( deep_equal([1, [2, 3]], [1, [2, 3]]) ).toBe(true);
    expect( deep_equal([1, 2], [1]) ).toBe(false);
    expect( deep_equal({ x: 1, y: 2 }, { y: 2, x: 1 }) ).toBe(true);
    expect( deep_equal({ x: 1 }, { x: 1, y: 2 }) ).toBe(false);
    expect( deep_equal({ x: 1 }, { y: 1 }) ).toBe(false);
  });

  test('deep_equal: container holding containers / records as values', () => {
    expect( deep_equal(
      map_of([['a', list_of(1, 2)]]),
      map_of([['a', list_of(1, 2)]])
    ) ).toBe(true);
    expect( deep_equal(
      list_of({ x: 1 }),
      list_of({ x: 1 })
    ) ).toBe(true);
  });

  test('deep_equal: mismatched composite shapes fall through to false', () => {
    expect( deep_equal([1, 2], { 0: 1, 1: 2 }) ).toBe(false);
    expect( deep_equal(list_of(1), 1) ).toBe(false);
    expect( deep_equal({ x: 1 }, [1]) ).toBe(false);
  });

  test('equals is the public typed wrapper over deep_equal', () => {
    expect( equals(list_of(1, 2, 3), list_of(1, 2, 3)) ).toBe(true);
    expect( equals(set_of(1, 2), set_of(2, 1)) ).toBe(true);
    expect( equals(map_of([['a', 1]]), map_of([['a', 2]])) ).toBe(false);
  });

  test('container_equal dispatches per kind and on kind mismatch', () => {
    expect( container_equal(list_of(1), list_of(1)) ).toBe(true);
    expect( container_equal(set_of(1), set_of(1)) ).toBe(true);
    expect( container_equal(map_of([['a', 1]]), map_of([['a', 1]])) ).toBe(true);
    expect( container_equal(list_of(1) as never, set_of(1) as never) ).toBe(false);
  });

  test('container_equal: maps of different key counts are unequal', () => {
    expect( container_equal(map_of([['a', 1]]), map_of([['a', 1], ['b', 2]])) ).toBe(false);
    expect( container_equal(map_of([['a', 1], ['b', 2]]), map_of([['a', 1]])) ).toBe(false);
  });

  test('array_equal / is_plain_object / object_equal directly', () => {
    expect( array_equal([1, 2], [1, 2]) ).toBe(true);
    expect( array_equal([1, 2], [1]) ).toBe(false);
    expect( is_plain_object({ x: 1 }) ).toBe(true);
    expect( is_plain_object([1, 2]) ).toBe(false);
    expect( is_plain_object(list_of(1)) ).toBe(false);
    expect( is_plain_object(null) ).toBe(false);
    expect( object_equal({ x: 1, y: 2 }, { y: 2, x: 1 }) ).toBe(true);
    expect( object_equal({ x: 1 }, { x: 1, y: 2 }) ).toBe(false);
  });

});



describe('snapshot — canonical, stable key order (§15)', () => {

  test('list snapshot keeps element order', () => {
    expect( snapshot(list_of(1, 2)) ).toEqual({ kind: 'list', items: [1, 2] });
  });

  test('set snapshot sorts members canonically', () => {
    expect( snapshot(set_of(3, 1, 2)) ).toEqual({ kind: 'set', members: [1, 2, 3] });
    expect( snapshot(set_of('b', 'a', 1)) ).toEqual({ kind: 'set', members: [1, 'a', 'b'] });
  });

  test('map snapshot emits entries sorted by key', () => {
    expect( snapshot(map_of([['b', 1], ['a', 2]])) )
      .toEqual({ kind: 'map', entries: [['a', 2], ['b', 1]] });
  });

  test('snapshot recurses through nested containers / arrays / objects', () => {
    expect( snapshot(list_of(set_of(2, 1))) )
      .toEqual({ kind: 'list', items: [{ kind: 'set', members: [1, 2] }] });
    expect( snapshot([set_of(2, 1)]) )
      .toEqual([{ kind: 'set', members: [1, 2] }]);
    expect( snapshot({ b: 1, a: set_of(2, 1) }) )
      .toEqual({ a: { kind: 'set', members: [1, 2] }, b: 1 });
  });

  test('snapshot of a scalar leaf returns it unchanged', () => {
    expect( snapshot(7) ).toBe(7);
    expect( snapshot('x') ).toBe('x');
  });

  test('structurally equal containers produce identical JSON snapshots', () => {
    const a = JSON.stringify(snapshot(set_of(3, 1, 2)));
    const b = JSON.stringify(snapshot(set_of(1, 2, 3)));
    expect( a ).toBe(b);
    const m1 = JSON.stringify(snapshot(map_of([['b', 2], ['a', 1]])));
    const m2 = JSON.stringify(snapshot(map_of([['a', 1], ['b', 2]])));
    expect( m1 ).toBe(m2);
  });

  test('snapshot output is frozen', () => {
    expect( Object.isFrozen(snapshot(list_of(1))) ).toBe(true);
    expect( Object.isFrozen(snapshot([1, 2])) ).toBe(true);
    expect( Object.isFrozen(snapshot({ x: 1 })) ).toBe(true);
  });

});



describe('deep_clone — by-value snapshot (§15)', () => {

  test('clones each kind to an equal but independent value', () => {
    const l = list_of(1, 2, 3);
    const lc = deep_clone(l);
    expect( equals(l, lc) ).toBe(true);
    expect( lc.items === l.items ).toBe(false);

    const s = set_of(1, 2, 3);
    const sc = deep_clone(s);
    expect( equals(s, sc) ).toBe(true);
    expect( sc.members === s.members ).toBe(false);

    const m = map_of([['a', 1], ['b', 2]]);
    const mc = deep_clone(m);
    expect( equals(m, mc) ).toBe(true);
    expect( mc.values === m.values ).toBe(false);
  });

  test('clone preserves insertion order (not canonicalised)', () => {
    expect( deep_clone(set_of(3, 1, 2)).members ).toEqual([3, 1, 2]);
  });

  test('clones nested containers, arrays, and objects deeply', () => {
    const original = list_of<FslSet | { x: number[] }>(set_of(2, 1), { x: [1, 2] });
    const cloned   = deep_clone(original);
    expect( equals(cloned, original) ).toBe(true);
    expect( (cloned.items[0] as FslSet).members === (original.items[0] as FslSet).members ).toBe(false);
  });

  test('clone of a scalar leaf returns it unchanged', () => {
    expect( deep_clone(7) ).toBe(7);
    expect( deep_clone('x') ).toBe('x');
  });

  test('clone output is frozen and mutation of the original cannot reach it', () => {
    const arr     = [1, 2, 3];
    const wrapped = list_from(arr);
    const cloned  = deep_clone(wrapped);
    expect( Object.isFrozen(cloned.items) ).toBe(true);
    expect( cloned.items ).toEqual([1, 2, 3]);
  });

});



describe('compare — total order over containers (§6)', () => {

  test('orders lists lexically by element', () => {
    expect( compare(list_of(1, 2), list_of(1, 3)) ).toBe(-1);
    expect( compare(list_of(1, 3), list_of(1, 2)) ).toBe(1);
    expect( compare(list_of(1), list_of(1, 2)) ).toBe(-1);   // prefix sorts first
  });

  test('equal containers compare 0, regardless of insertion order', () => {
    expect( compare(set_of(1, 2), set_of(2, 1)) ).toBe(0);
    expect( compare(map_of([['a', 1], ['b', 2]]), map_of([['b', 2], ['a', 1]])) ).toBe(0);
  });

  test('orders by kind first (list < set < map)', () => {
    expect( KIND_RANK.list ).toBeLessThan( KIND_RANK.set );
    expect( KIND_RANK.set ).toBeLessThan( KIND_RANK.map );
    expect( compare(list_of(1), set_of(1)) ).toBe(-1);
    expect( compare(set_of(1), map_of([['a', 1]])) ).toBe(-1);
    expect( compare(map_of([['a', 1]]), set_of(1)) ).toBe(1);
  });

  test('compare is consistent with equals', () => {
    const a = set_of(1, 2, 3);
    const b = set_of(3, 2, 1);
    expect( compare(a, b) === 0 ).toBe( equals(a, b) );
  });

});



describe('compare_snapshots and its helpers', () => {

  test('type_rank ranks scalars < arrays < objects', () => {
    expect( type_rank(7) ).toBe(0);
    expect( type_rank('x') ).toBe(0);
    expect( type_rank(true) ).toBe(0);
    expect( type_rank([1]) ).toBe(1);
    expect( type_rank({ x: 1 }) ).toBe(2);
  });

  test('compare_snapshots orders scalars, then arrays, then objects', () => {
    expect( compare_snapshots(1, 2) ).toBe(-1);
    expect( compare_snapshots(1, 'a') ).toBe(-1);     // number rank precedes string within scalar
    expect( compare_snapshots(7, [1]) ).toBe(-1);     // scalar rank below array rank
    expect( compare_snapshots([1], { x: 1 }) ).toBe(-1);  // array rank below object rank
    expect( compare_snapshots([1], 7) ).toBe(1);      // reverse ranks
  });

  test('array_compare is lexicographic with prefix-first', () => {
    expect( array_compare([1, 2], [1, 3]) ).toBe(-1);
    expect( array_compare([1, 2], [1, 2, 3]) ).toBe(-1);
    expect( array_compare([1, 2, 3], [1, 2]) ).toBe(1);
    expect( array_compare([2], [1]) ).toBe(1);
    expect( array_compare([1, 2], [1, 2]) ).toBe(0);
  });

  test('object_compare orders by sorted keys then values', () => {
    expect( object_compare({ kind: 'list' }, { kind: 'set' }) ).toBe(-1);
    expect( object_compare({ a: 1 }, { a: 1, b: 2 }) ).toBe(-1);   // fewer keys sorts first
    expect( object_compare({ a: 2 }, { a: 1 }) ).toBe(1);
    expect( object_compare({ a: 1 }, { a: 1 }) ).toBe(0);
  });

});



describe('immutability — no operation mutates its input', () => {

  test('every list update leaves the source list untouched', () => {
    const l = list_of(1, 2, 3);
    list_set(l, 0, 9);
    list_push(l, 4);
    list_pop(l);
    list_slice(l, 0, 1);
    expect( l.items ).toEqual([1, 2, 3]);
  });

  test('every set update leaves the source set untouched', () => {
    const s = set_of(1, 2, 3);
    set_add(s, 4);
    set_remove(s, 1);
    set_union(s, set_of(9));
    set_intersection(s, set_of(2));
    set_difference(s, set_of(2));
    expect( s.members ).toEqual([1, 2, 3]);
  });

  test('every map update leaves the source map untouched', () => {
    const m = map_of<number>([['a', 1], ['b', 2]]);
    map_put(m, 'c', 3);
    map_put(m, 'a', 9);
    map_remove(m, 'a');
    expect( map_entries(m) ).toEqual([['a', 1], ['b', 2]]);
  });

});




describe('is_container_key — §4.2 key / member predicate', () => {

  test('accepts strings and finite numbers', () => {
    expect( is_container_key('a') ).toBe(true);
    expect( is_container_key('')  ).toBe(true);
    expect( is_container_key(0)   ).toBe(true);
    expect( is_container_key(-3.5) ).toBe(true);
  });

  test('rejects NaN, infinities, and non-scalars', () => {
    expect( is_container_key(NaN) ).toBe(false);
    expect( is_container_key(Infinity) ).toBe(false);
    expect( is_container_key(-Infinity) ).toBe(false);
    expect( is_container_key(true) ).toBe(false);
    expect( is_container_key(null) ).toBe(false);
    expect( is_container_key(undefined) ).toBe(false);
    expect( is_container_key({}) ).toBe(false);
  });

});




describe('typed container errors (§11)', () => {

  test('ContainerKeyError carries kind, role, key, and is an FslError', () => {
    let caught: unknown;
    try { require_scalar({}, 'member'); } catch (error) { caught = error; }
    expect( caught ).toBeInstanceOf(ContainerKeyError);
    const err = caught as ContainerKeyError;
    expect( err.name ).toBe('ContainerKeyError');
    expect( err.kind ).toBe('type_error');
    expect( err.role ).toBe('member');
    expect( err.key  ).toEqual({});
    expect( err.message ).toContain('member');
  });

  test('require_scalar defaults role to key and rejects NaN / Infinity', () => {
    const grab = (fn: () => unknown): ContainerKeyError => {
      try { fn(); } catch (error) { return error as ContainerKeyError; }
      throw new Error('expected throw');
    };
    expect( grab(() => require_scalar(NaN)).role ).toBe('key');
    expect( grab(() => require_scalar(Infinity)).role ).toBe('key');
    expect( require_scalar('ok') ).toBe('ok');
    expect( require_scalar(5) ).toBe(5);
  });

  test('ContainerRangeError carries the out_of_bounds kind and is an FslError', () => {
    let caught: unknown;
    try { list_at(list_of(1), 9); } catch (error) { caught = error; }
    expect( caught ).toBeInstanceOf(ContainerRangeError);
    const err = caught as ContainerRangeError;
    expect( err.name ).toBe('ContainerRangeError');
    expect( err.kind ).toBe('out_of_bounds');
  });

});




describe('key validation on read / membership / remove (§4.2)', () => {

  test('set_has and set_remove reject non-scalar members', () => {
    expect( () => set_has(set_of(1), NaN) ).toThrow(ContainerKeyError);
    // @ts-expect-error — deliberately illegal member type for the runtime guard
    expect( () => set_has(set_of(1), {}) ).toThrow(ContainerKeyError);
    expect( () => set_remove(set_of(1), Infinity) ).toThrow(ContainerKeyError);
  });

  test('set_has / set_remove still work for valid members', () => {
    expect( set_has(set_of(1, 2), 2) ).toBe(true);
    expect( set_has(set_of(1, 2), 9) ).toBe(false);
    const s = set_of(1, 2, 3);
    expect( set_remove(s, 2).members ).toEqual([1, 3]);
    expect( set_remove(s, 9) ).toBe(s);          // absent → original
  });

  test('map_has / map_get / map_remove reject non-scalar keys', () => {
    expect( () => map_has(map_of([['a', 1]]), NaN) ).toThrow(ContainerKeyError);
    expect( () => map_get(map_of([['a', 1]]), NaN) ).toThrow(ContainerKeyError);
    // @ts-expect-error — deliberately illegal key type for the runtime guard
    expect( () => map_remove(map_of([['a', 1]]), {}) ).toThrow(ContainerKeyError);
  });

  test('validated reads/removes still behave leniently for valid keys', () => {
    const m = map_of([['a', 1], ['b', 2]]);
    expect( map_has(m, 'a') ).toBe(true);
    expect( map_has(m, 'z') ).toBe(false);
    expect( map_get(m, 'b') ).toBe(2);
    expect( map_get(m, 'z') ).toBeUndefined();   // absent → undefined (lenient kept)
    expect( map_remove(m, 'a').keys ).toEqual(['b']);
    expect( map_remove(m, 'z') ).toBe(m);         // absent → original
  });

});




describe('strict reads — list_at / map_get_strict (additive to lenient default)', () => {

  test('list_at reads positive and negative indices', () => {
    const l = list_of(10, 20, 30);
    expect( list_at(l, 0) ).toBe(10);
    expect( list_at(l, 1) ).toBe(20);
    expect( list_at(l, -1) ).toBe(30);
  });

  test('list_at throws ContainerRangeError on out-of-range', () => {
    expect( () => list_at(list_of(1, 2, 3), 9) ).toThrow(ContainerRangeError);
    expect( () => list_at(list_of(1, 2, 3), -4) ).toThrow(ContainerRangeError);
    expect( () => list_at(list_of<number>(), 0) ).toThrow(ContainerRangeError);
  });

  test('list_get stays lenient (the default) while list_at throws', () => {
    const l = list_of(1, 2, 3);
    expect( list_get(l, 9) ).toBeUndefined();
    expect( () => list_at(l, 9) ).toThrow(ContainerRangeError);
  });

  test('map_get_strict returns present values', () => {
    expect( map_get_strict(map_of([['a', 1], ['b', 2]]), 'b') ).toBe(2);
    expect( map_get_strict(map_of([[7, 'x']]), 7) ).toBe('x');
  });

  test('map_get_strict throws ContainerRangeError for an absent key (string and number printables)', () => {
    expect( () => map_get_strict(map_of([['a', 1]]), 'z') ).toThrow(ContainerRangeError);
    expect( () => map_get_strict(map_of([[1, 'a']]), 9) ).toThrow(ContainerRangeError);
  });

  test('map_get_strict rejects non-scalar keys with ContainerKeyError', () => {
    expect( () => map_get_strict(map_of([['a', 1]]), NaN) ).toThrow(ContainerKeyError);
  });

});




describe('map_get_or — defaulting read', () => {

  test('returns the stored value when present', () => {
    expect( map_get_or(map_of([['a', 1]]), 'a', 0) ).toBe(1);
  });

  test('returns the fallback when absent', () => {
    expect( map_get_or(map_of([['a', 1]]), 'z', 0) ).toBe(0);
  });

  test('a key stored with value undefined returns that undefined, not the fallback', () => {
    const m = map_of<number | undefined>([['a', undefined]]);
    expect( map_get_or(m, 'a', 99) ).toBeUndefined();
    expect( map_get_or(m, 'z', 99) ).toBe(99);
  });

  test('rejects a non-scalar key with ContainerKeyError', () => {
    expect( () => map_get_or(map_of([['a', 1]]), NaN, 0) ).toThrow(ContainerKeyError);
  });

});
