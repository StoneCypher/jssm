
import {

  is_container_key,
  deep_equal,
  deep_clone,

  make_list, list_size, list_get, list_set,
  list_push, list_pop, list_includes,

  make_map, map_size, map_has, map_get, map_get_or,
  map_set, map_delete, map_keys, map_values,

  make_set, set_size, set_has, set_add, set_remove,
  set_union, set_intersection, set_difference,

  containers_equal, snapshot, restore,

  ContainerKeyError, ContainerRangeError,

} from '../fsl_containers';

import type { FslMap, FslSet } from '../fsl_containers';





describe('is_container_key', () => {

  test('accepts a string',           () => expect( is_container_key('a')      ).toBe(true)  );
  test('accepts a finite number',    () => expect( is_container_key(7)        ).toBe(true)  );
  test('accepts zero',               () => expect( is_container_key(0)        ).toBe(true)  );
  test('rejects NaN',                () => expect( is_container_key(NaN)      ).toBe(false) );
  test('rejects a boolean',          () => expect( is_container_key(true)     ).toBe(false) );
  test('rejects null',               () => expect( is_container_key(null)     ).toBe(false) );
  test('rejects an object',          () => expect( is_container_key({})       ).toBe(false) );

});





describe('deep_equal', () => {

  test('identical scalars are equal',        () => expect( deep_equal(3, 3)           ).toBe(true)  );
  test('NaN equals NaN',                      () => expect( deep_equal(NaN, NaN)       ).toBe(true)  );
  test('+0 and -0 are distinguished',         () => expect( deep_equal(0, -0)          ).toBe(false) );
  test('differing scalars are unequal',       () => expect( deep_equal(3, 4)           ).toBe(false) );
  test('scalar vs object is unequal',         () => expect( deep_equal(3, {})          ).toBe(false) );
  test('object vs scalar is unequal',         () => expect( deep_equal({}, 3)          ).toBe(false) );

  test('null vs object is unequal',           () => expect( deep_equal(null, {})       ).toBe(false) );
  test('object vs null is unequal',           () => expect( deep_equal({}, null)       ).toBe(false) );

  test('array vs object is unequal',          () => expect( deep_equal([1], { 0: 1 })  ).toBe(false) );
  test('object vs array is unequal',          () => expect( deep_equal({ 0: 1 }, [1])  ).toBe(false) );

  test('equal arrays are equal',              () => expect( deep_equal([1, 2], [1, 2]) ).toBe(true)  );
  test('arrays of differing length unequal',  () => expect( deep_equal([1], [1, 2])    ).toBe(false) );
  test('arrays of differing content unequal', () => expect( deep_equal([1, 2], [1, 9]) ).toBe(false) );

  test('equal nested objects are equal',      () => expect( deep_equal({ a: [1] }, { a: [1] }) ).toBe(true)  );
  test('objects of differing key count unequal', () => expect( deep_equal({ a: 1 }, { a: 1, b: 2 }) ).toBe(false) );
  test('objects with disjoint keys unequal',  () => expect( deep_equal({ a: 1 }, { b: 1 }) ).toBe(false) );
  test('objects of differing value unequal',  () => expect( deep_equal({ a: 1 }, { a: 9 }) ).toBe(false) );

});





describe('deep_clone', () => {

  test('a scalar clones to itself',  () => expect( deep_clone(5)    ).toBe(5)    );
  test('null clones to null',        () => expect( deep_clone(null) ).toBe(null) );

  test('an array clone is independent', () => {
    const src = [1, 2, 3];
    const cp  = deep_clone(src);
    cp.push(4);
    expect( src.length ).toBe(3);
    expect( cp.length  ).toBe(4);
  });

  test('a nested object clone is independent', () => {
    const src = { a: { b: [1] } };
    const cp  = deep_clone(src);
    cp.a.b.push(2);
    expect( src.a.b.length ).toBe(1);
    expect( cp.a.b.length  ).toBe(2);
  });

});





describe('list construction and size', () => {

  test('make_list copies its input array', () => {
    const src  = [1, 2, 3];
    const list = make_list(src);
    src.push(4);
    expect( list_size(list) ).toBe(3);
  });

  test('make_list defaults to empty', () => {
    expect( list_size(make_list<number>()) ).toBe(0);
  });

  test('list_size counts elements', () => {
    expect( list_size(make_list([1, 2, 3])) ).toBe(3);
  });

});





describe('list_get', () => {

  test('reads a positive index',         () => expect( list_get(make_list([10, 20, 30]), 0)  ).toBe(10) );
  test('reads a negative index',         () => expect( list_get(make_list([10, 20, 30]), -1) ).toBe(30) );

  test('a too-large index throws range', () => {
    expect( () => list_get(make_list([1]), 5) ).toThrow(ContainerRangeError);
    expect( () => list_get(make_list([1]), 5) ).toThrow(/index 5 out of range for length 1/);
  });

  test('a too-negative index throws range', () => {
    expect( () => list_get(make_list([1]), -5) ).toThrow(ContainerRangeError);
    expect( () => list_get(make_list([1]), -5) ).toThrow(/index -5 out of range/);
  });

});





describe('list_set', () => {

  test('replaces at a positive index without mutating the original', () => {
    const a = make_list([1, 2, 3]);
    const b = list_set(a, 1, 99);
    expect( b.items ).toEqual([1, 99, 3]);
    expect( a.items ).toEqual([1, 2, 3]);
  });

  test('replaces at a negative index', () => {
    expect( list_set(make_list([1, 2, 3]), -1, 99).items ).toEqual([1, 2, 99]);
  });

  test('a too-large index throws range', () => {
    expect( () => list_set(make_list([1]), 5, 0) ).toThrow(ContainerRangeError);
    expect( () => list_set(make_list([1]), 5, 0) ).toThrow(/index 5 out of range for length 1/);
  });

  test('a too-negative index throws range', () => {
    expect( () => list_set(make_list([1]), -5, 0) ).toThrow(ContainerRangeError);
  });

});





describe('list_push and list_pop', () => {

  test('push appends without mutating the original', () => {
    const a = make_list([1, 2]);
    const b = list_push(a, 3);
    expect( b.items ).toEqual([1, 2, 3]);
    expect( a.items ).toEqual([1, 2]);
  });

  test('pop returns the last value and a shortened rest', () => {
    const { value, rest } = list_pop(make_list([1, 2, 3]));
    expect( value      ).toBe(3);
    expect( rest.items ).toEqual([1, 2]);
  });

  test('pop on an empty list throws range', () => {
    expect( () => list_pop(make_list([])) ).toThrow(ContainerRangeError);
    expect( () => list_pop(make_list([])) ).toThrow(/empty list/);
  });

});





describe('list_includes', () => {

  test('finds a scalar by value',          () => expect( list_includes(make_list([1, 2, 3]), 2) ).toBe(true)  );
  test('reports a missing scalar',         () => expect( list_includes(make_list([1, 2, 3]), 9) ).toBe(false) );
  test('finds a structural match',         () => expect( list_includes(make_list([{ a: 1 }]), { a: 1 }) ).toBe(true) );

});





describe('map construction and size', () => {

  test('make_map preserves insertion order', () => {
    expect( make_map([['a', 1], ['b', 2]]).entries ).toEqual([['a', 1], ['b', 2]]);
  });

  test('a repeated key keeps position but takes the last value', () => {
    expect( make_map([['a', 1], ['b', 2], ['a', 9]]).entries ).toEqual([['a', 9], ['b', 2]]);
  });

  test('make_map defaults to empty', () => {
    expect( map_size(make_map<number>()) ).toBe(0);
  });

  test('make_map rejects a non-key key', () => {
    expect( () => make_map([[ {} as any, 1 ]]) ).toThrow(ContainerKeyError);
  });

  test('map_size counts entries', () => {
    expect( map_size(make_map([['a', 1], ['b', 2]])) ).toBe(2);
  });

});





describe('map_has', () => {

  test('reports a present key',    () => expect( map_has(make_map([['a', 1]]), 'a') ).toBe(true)  );
  test('reports an absent key',    () => expect( map_has(make_map([['a', 1]]), 'z') ).toBe(false) );

  test('rejects an invalid key', () => {
    expect( () => map_has(make_map([['a', 1]]), NaN) ).toThrow(ContainerKeyError);
    expect( () => map_has(make_map([['a', 1]]), NaN) ).toThrow(/key must be a number or string/);
  });

});





describe('map_get (strict)', () => {

  test('returns the stored value', () => {
    expect( map_get(make_map([['a', 1]]), 'a') ).toBe(1);
  });

  test('a missing string key throws range with the quoted key', () => {
    expect( () => map_get(make_map([['a', 1]]), 'z') ).toThrow(ContainerRangeError);
    expect( () => map_get(make_map([['a', 1]]), 'z') ).toThrow(/no key "z"/);
  });

  test('a missing number key throws range with the bare number', () => {
    expect( () => map_get(make_map([[1, 'x']]), 2) ).toThrow(/no key 2/);
  });

  test('an invalid key throws ContainerKeyError', () => {
    expect( () => map_get(make_map([['a', 1]]), {} as any) ).toThrow(ContainerKeyError);
  });

});





describe('map_get_or (lenient)', () => {

  test('returns the stored value on a hit', () => {
    expect( map_get_or(make_map([['a', 1]]), 'a', 0) ).toBe(1);
  });

  test('returns the fallback on a miss', () => {
    expect( map_get_or(make_map([['a', 1]]), 'z', 0) ).toBe(0);
  });

  test('rejects an invalid key', () => {
    expect( () => map_get_or(make_map([['a', 1]]), NaN, 0) ).toThrow(ContainerKeyError);
  });

});





describe('map_set', () => {

  test('appends a new key without mutating the original', () => {
    const a = make_map([['x', 1]]);
    const b = map_set(a, 'y', 2);
    expect( b.entries ).toEqual([['x', 1], ['y', 2]]);
    expect( a.entries ).toEqual([['x', 1]]);
  });

  test('updates an existing key in place', () => {
    expect( map_set(make_map([['x', 1], ['y', 2]]), 'x', 9).entries )
      .toEqual([['x', 9], ['y', 2]]);
  });

  test('rejects an invalid key', () => {
    expect( () => map_set(make_map<number>([]), {} as any, 1) ).toThrow(ContainerKeyError);
  });

});





describe('map_delete', () => {

  test('removes a present key', () => {
    expect( map_delete(make_map([['a', 1], ['b', 2]]), 'a').entries ).toEqual([['b', 2]]);
  });

  test('removing an absent key is a no-op that returns a fresh object', () => {
    const a = make_map([['a', 1]]);
    const b = map_delete(a, 'z');
    expect( b.entries ).toEqual([['a', 1]]);
    expect( b ).not.toBe(a);
  });

  test('rejects an invalid key', () => {
    expect( () => map_delete(make_map<number>([]), NaN) ).toThrow(ContainerKeyError);
  });

});





describe('map_keys and map_values', () => {

  test('map_keys lists keys in order', () => {
    expect( map_keys(make_map([['a', 1], ['b', 2]])) ).toEqual(['a', 'b']);
  });

  test('map_values lists values in order', () => {
    expect( map_values(make_map([['a', 1], ['b', 2]])) ).toEqual([1, 2]);
  });

});





describe('set construction and size', () => {

  test('make_set drops duplicates and keeps first-seen order', () => {
    expect( make_set([1, 2, 2, 3, 1]).members ).toEqual([1, 2, 3]);
  });

  test('make_set defaults to empty', () => {
    expect( set_size(make_set()) ).toBe(0);
  });

  test('make_set rejects a non-key member', () => {
    expect( () => make_set([true as any]) ).toThrow(ContainerKeyError);
    expect( () => make_set([true as any]) ).toThrow(/member must be a number or string/);
  });

  test('set_size counts members', () => {
    expect( set_size(make_set([1, 2, 3])) ).toBe(3);
  });

});





describe('set_has', () => {

  test('reports a present member', () => expect( set_has(make_set([1, 2, 3]), 2) ).toBe(true)  );
  test('reports an absent member', () => expect( set_has(make_set([1, 2, 3]), 9) ).toBe(false) );

  test('rejects an invalid member', () => {
    expect( () => set_has(make_set([1]), NaN) ).toThrow(ContainerKeyError);
  });

});





describe('set_add', () => {

  test('adds a new member without mutating the original', () => {
    const a = make_set([1, 2]);
    const b = set_add(a, 3);
    expect( b.members ).toEqual([1, 2, 3]);
    expect( a.members ).toEqual([1, 2]);
  });

  test('adding a present member is a no-op that returns a fresh object', () => {
    const a = make_set([1, 2]);
    const b = set_add(a, 2);
    expect( b.members ).toEqual([1, 2]);
    expect( b ).not.toBe(a);
  });

  test('rejects an invalid member', () => {
    expect( () => set_add(make_set([1]), {} as any) ).toThrow(ContainerKeyError);
  });

});





describe('set_remove', () => {

  test('removes a present member', () => {
    expect( set_remove(make_set([1, 2, 3]), 2).members ).toEqual([1, 3]);
  });

  test('removing an absent member is a no-op', () => {
    expect( set_remove(make_set([1, 2, 3]), 9).members ).toEqual([1, 2, 3]);
  });

  test('rejects an invalid member', () => {
    expect( () => set_remove(make_set([1]), NaN) ).toThrow(ContainerKeyError);
  });

});





describe('set algebra', () => {

  test('union contains every member of either side in first-seen order', () => {
    expect( set_union(make_set([1, 2]), make_set([2, 3])).members ).toEqual([1, 2, 3]);
  });

  test('intersection keeps shared members in left order', () => {
    expect( set_intersection(make_set([1, 2, 3]), make_set([2, 3, 4])).members ).toEqual([2, 3]);
  });

  test('difference removes right members from the left', () => {
    expect( set_difference(make_set([1, 2, 3]), make_set([2])).members ).toEqual([1, 3]);
  });

});





describe('containers_equal', () => {

  test('equal sets compare equal',  () => expect( containers_equal(make_set([1, 2]),  make_set([1, 2]))  ).toBe(true)  );
  test('equal maps compare equal',  () => expect( containers_equal(make_map([['a', 1]]) as FslMap<number>, make_map([['a', 1]]) as FslMap<number>) ).toBe(true) );
  test('equal lists compare equal', () => expect( containers_equal(make_list([1, 2]), make_list([1, 2])) ).toBe(true)  );

  test('differing-kind containers are unequal', () => {
    const list = make_list<number>([1, 2]);
    const set  = make_set([1, 2]) as FslSet;
    expect( containers_equal(list, set) ).toBe(false);
  });

  test('differing-content containers are unequal', () => {
    expect( containers_equal(make_list([1, 2]), make_list([1, 9])) ).toBe(false);
  });

});





describe('snapshot and restore', () => {

  test('a snapshot is equal to but independent of the live container', () => {
    const live = make_list([{ n: 1 }]);
    const snap = snapshot(live);
    expect( containers_equal(snap, live) ).toBe(true);

    // Mutate the live container's inner value; the snapshot must not move.
    (live.items[0] as { n: number }).n = 99;
    expect( (snap.items[0] as { n: number }).n ).toBe(1);
  });

  test('restore yields an equal, independent copy', () => {
    const snap     = snapshot(make_map([['a', 1]]) as FslMap<number>);
    const restored = restore(snap);
    expect( containers_equal(restored, snap) ).toBe(true);
    expect( restored ).not.toBe(snap);
  });

});
