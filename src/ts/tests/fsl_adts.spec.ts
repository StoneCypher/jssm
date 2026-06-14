
import {

  variant, is_variant, variant_tag, variant_field, match,
  some, none, is_some, is_none, option_unwrap_or, option_map,
  option_of_nullable, nullable_of_option,
  make_alias_env, resolve_alias,
  fn_value, is_fn_value, fn_equal, fn_hash,
  canonical_json, snapshot_value, hash_value, deep_equal,
  assert_acyclic, deep_freeze_copy

} from '../fsl_adts';

import type { AdtValue, FnValue, FslAcyclic } from '../fsl_adts';





describe('variant constructors (§4.3)', () => {

  test('payload-less constructor has empty fields', () => {
    const v = variant('point');
    expect(v.adt).toBe('point');
    expect(v.fields).toStrictEqual({});
  });

  test('payloaded constructor carries its fields', () => {
    const v = variant('circle', { radius: 3 });
    expect(v.adt).toBe('circle');
    expect(v.fields).toStrictEqual({ radius: 3 });
  });

  test('multi-field constructor', () => {
    const v = variant('rect', { w: 2, h: 5 });
    expect(v.fields).toStrictEqual({ w: 2, h: 5 });
  });

  test('result is frozen and does not alias the caller payload', () => {
    const payload = { radius: 3 };
    const v = variant('circle', payload);
    expect(Object.isFrozen(v)).toBe(true);
    expect(Object.isFrozen(v.fields)).toBe(true);
    expect(v.fields).not.toBe(payload);
    payload.radius = 99;
    expect(v.fields.radius).toBe(3);
  });

  test('empty-string tag throws', () => {
    expect(() => variant('')).toThrow();
  });

  test('non-string tag throws', () => {
    expect(() => variant(7 as unknown as string)).toThrow();
  });

});





describe('is_variant', () => {

  test('true for a constructed variant', () => {
    expect(is_variant(variant('point'))).toBe(true);
  });

  test('false for a plain record without an adt tag', () => {
    expect(is_variant({ radius: 3 })).toBe(false);
  });

  test('false for a number', () => {
    expect(is_variant(7)).toBe(false);
  });

  test('false for null', () => {
    expect(is_variant(null)).toBe(false);
  });

  test('false for an array', () => {
    expect(is_variant([1, 2, 3])).toBe(false);
  });

  test('false when adt present but fields missing', () => {
    expect(is_variant({ adt: 'x' } as unknown as FslAcyclic)).toBe(false);
  });

  test('false when fields is null', () => {
    expect(is_variant({ adt: 'x', fields: null } as unknown as FslAcyclic)).toBe(false);
  });

  test('false when fields is an array', () => {
    expect(is_variant({ adt: 'x', fields: [] } as unknown as FslAcyclic)).toBe(false);
  });

});





describe('variant_tag', () => {

  test('reads the constructor tag', () => {
    expect(variant_tag(variant('circle', { radius: 3 }))).toBe('circle');
  });

  test('throws on a non-variant', () => {
    expect(() => variant_tag({ radius: 3 } as unknown as AdtValue)).toThrow();
  });

});





describe('variant_field', () => {

  const r = variant('rect', { w: 2, h: 5 });

  test('reads a present field', () => {
    expect(variant_field(r, 'w')).toBe(2);
  });

  test('absent field is undefined', () => {
    expect(variant_field(r, 'depth')).toBe(undefined);
  });

  test('throws on a non-variant', () => {
    expect(() => variant_field({ } as unknown as AdtValue, 'w')).toThrow();
  });

});





describe('match (§4.3 / §7)', () => {

  const area = (s: AdtValue): number => match<number>(s, {
    circle : f => 3.14159 * (f.value as number ?? (f.radius as number)) * (f.radius as number),
    rect   : f => (f.w as number) * (f.h as number)
  }, () => 0);

  test('dispatches the circle arm', () => {
    expect(area(variant('circle', { radius: 2 }))).toBeCloseTo(12.566, 2);
  });

  test('dispatches the rect arm', () => {
    expect(area(variant('rect', { w: 3, h: 4 }))).toBe(12);
  });

  test('falls through to otherwise on an unhandled tag', () => {
    expect(area(variant('point'))).toBe(0);
  });

  test('otherwise receives the whole value', () => {
    const seen = match<string>(variant('mystery', { k: 1 }), {}, v => v.adt);
    expect(seen).toBe('mystery');
  });

  test('throws on a non-variant scrutinee', () => {
    expect(() => match(7 as unknown as AdtValue, {}, () => 0)).toThrow();
  });

});





describe('option<T> (§4.4)', () => {

  test('some wraps a payload', () => {
    expect(some(3)).toStrictEqual({ adt: 'some', fields: { value: 3 } });
  });

  test('none is the empty variant', () => {
    expect(none).toStrictEqual({ adt: 'none', fields: {} });
  });

  test('is_some / is_none discriminate', () => {
    expect(is_some(some(3))).toBe(true);
    expect(is_some(none)).toBe(false);
    expect(is_none(none)).toBe(true);
    expect(is_none(some(3))).toBe(false);
  });

  test('is_some is false for a non-option variant', () => {
    expect(is_some(variant('point'))).toBe(false);
  });

  test('is_none is false for a non-option variant', () => {
    expect(is_none(variant('point'))).toBe(false);
  });

  test('is_some is false for a non-variant', () => {
    expect(is_some(7 as unknown as AdtValue)).toBe(false);
  });

  test('is_none is false for a non-variant', () => {
    expect(is_none(7 as unknown as AdtValue)).toBe(false);
  });

  test('unwrap_or returns the payload when some', () => {
    expect(option_unwrap_or(some(3), 0)).toBe(3);
  });

  test('unwrap_or returns the fallback when none', () => {
    expect(option_unwrap_or(none, 0)).toBe(0);
  });

  test('option_map maps over some', () => {
    expect(option_map(some(3), x => (x as number) + 1)).toStrictEqual(some(4));
  });

  test('option_map leaves none untouched', () => {
    expect(option_map(none, x => (x as number) + 1)).toStrictEqual(none);
  });

});





describe('nullability T? (§4.4)', () => {

  test('lifts a present value to some', () => {
    expect(option_of_nullable(3)).toStrictEqual(some(3));
  });

  test('lifts null to none', () => {
    expect(option_of_nullable(null)).toStrictEqual(none);
  });

  test('lifts undefined to none', () => {
    expect(option_of_nullable(undefined)).toStrictEqual(none);
  });

  test('zero is present, not absent', () => {
    expect(option_of_nullable(0)).toStrictEqual(some(0));
  });

  test('projects some back to its payload', () => {
    expect(nullable_of_option(some(3))).toBe(3);
  });

  test('projects none back to null', () => {
    expect(nullable_of_option(none)).toBe(null);
  });

  test('round-trips a present value', () => {
    expect(nullable_of_option(option_of_nullable(42))).toBe(42);
  });

});





describe('type aliases (§4.4)', () => {

  test('resolves a direct alias to its descriptor', () => {
    const env = make_alias_env({ Celsius: { base: 'int', lo: -273, hi: 1000 } });
    expect(resolve_alias(env, 'Celsius')).toStrictEqual({ base: 'int', lo: -273, hi: 1000 });
  });

  test('resolves a transitive string-alias chain', () => {
    const env = make_alias_env({
      Celsius : { base: 'int', lo: -273, hi: 1000 },
      Temp    : 'Celsius'
    });
    expect(resolve_alias(env, 'Temp')).toStrictEqual({ base: 'int', lo: -273, hi: 1000 });
  });

  test('a non-alias name resolves to itself', () => {
    const env = make_alias_env({ Name: { base: 'string' } });
    expect(resolve_alias(env, 'boolean')).toBe('boolean');
  });

  test('env is frozen', () => {
    const env = make_alias_env({ Name: { base: 'string' } });
    expect(Object.isFrozen(env)).toBe(true);
  });

  test('rejects an alias pointing at a missing name', () => {
    expect(() => make_alias_env({ Handle: 'Name' })).toThrow();
  });

  test('rejects a self-referential alias cycle', () => {
    expect(() => make_alias_env({ A: 'A' })).toThrow();
  });

  test('rejects a multi-hop alias cycle', () => {
    expect(() => make_alias_env({ A: 'B', B: 'A' })).toThrow();
  });

});





describe('function values (§4.4 / §15)', () => {

  test('constructs with no captures', () => {
    const f = fn_value('lambda#id');
    expect(f.fn).toBe('lambda#id');
    expect(f.captures).toStrictEqual({});
  });

  test('constructs with captures', () => {
    const f = fn_value('lambda#add', { base: 10 });
    expect(f.captures).toStrictEqual({ base: 10 });
  });

  test('captures are deep-copied and frozen', () => {
    const caps = { nested: { base: 10 } };
    const f = fn_value('lambda#add', caps);
    expect(Object.isFrozen(f)).toBe(true);
    expect(Object.isFrozen(f.captures)).toBe(true);
    expect(Object.isFrozen(f.captures.nested)).toBe(true);
    expect(f.captures).not.toBe(caps);
  });

  test('empty-string tag throws', () => {
    expect(() => fn_value('')).toThrow();
  });

  test('non-string tag throws', () => {
    expect(() => fn_value(7 as unknown as string)).toThrow();
  });

  test('cyclic captures are rejected at construction', () => {
    const loop: Record<string, FslAcyclic> = {};
    loop.self = loop;
    expect(() => fn_value('lambda#bad', loop)).toThrow();
  });

  test('is_fn_value true for a function value', () => {
    expect(is_fn_value(fn_value('lambda#id'))).toBe(true);
  });

  test('is_fn_value false for a variant', () => {
    expect(is_fn_value(variant('point'))).toBe(false);
  });

  test('is_fn_value false for a number', () => {
    expect(is_fn_value(7)).toBe(false);
  });

  test('is_fn_value false for null', () => {
    expect(is_fn_value(null)).toBe(false);
  });

  test('is_fn_value false for an array', () => {
    expect(is_fn_value([1])).toBe(false);
  });

  test('is_fn_value false when captures missing', () => {
    expect(is_fn_value({ fn: 'x' } as unknown as FslAcyclic)).toBe(false);
  });

  test('is_fn_value false when captures null', () => {
    expect(is_fn_value({ fn: 'x', captures: null } as unknown as FslAcyclic)).toBe(false);
  });

  test('is_fn_value false when captures is an array', () => {
    expect(is_fn_value({ fn: 'x', captures: [] } as unknown as FslAcyclic)).toBe(false);
  });

});





describe('intensional function-value equality (§4.4)', () => {

  const a = fn_value('lambda#add', { base: 10 });
  const b = fn_value('lambda#add', { base: 10 });
  const c = fn_value('lambda#add', { base: 11 });
  const d = fn_value('lambda#sub', { base: 10 });

  test('equal tag and captures compare equal', () => {
    expect(fn_equal(a, b)).toBe(true);
  });

  test('differing captures compare unequal', () => {
    expect(fn_equal(a, c)).toBe(false);
  });

  test('differing tags compare unequal (intensional)', () => {
    expect(fn_equal(a, d)).toBe(false);
  });

});





describe('function-value hashing (§15)', () => {

  test('equal function values hash equal', () => {
    const a = fn_value('lambda#add', { base: 10 });
    const b = fn_value('lambda#add', { base: 10 });
    expect(fn_hash(a)).toBe(fn_hash(b));
  });

  test('hash is independent of capture key order', () => {
    const a = fn_value('lambda#add', { base: 10, mul: 2 });
    const b = fn_value('lambda#add', { mul: 2, base: 10 });
    expect(fn_hash(a)).toBe(fn_hash(b));
  });

  test('differing function values hash differently', () => {
    const a = fn_value('lambda#add', { base: 10 });
    const c = fn_value('lambda#add', { base: 11 });
    expect(fn_hash(a)).not.toBe(fn_hash(c));
  });

});





describe('canonical_json (§15)', () => {

  test('sorts object keys', () => {
    expect(canonical_json({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  test('serializes arrays in order', () => {
    expect(canonical_json([1, 2, 3])).toBe('[1,2,3]');
  });

  test('serializes a string scalar', () => {
    expect(canonical_json('hi')).toBe('"hi"');
  });

  test('serializes a number scalar', () => {
    expect(canonical_json(7)).toBe('7');
  });

  test('serializes a boolean scalar', () => {
    expect(canonical_json(true)).toBe('true');
  });

  test('serializes null as null', () => {
    expect(canonical_json(null)).toBe('null');
  });

  test('serializes undefined distinctly from null', () => {
    expect(canonical_json(undefined)).toBe('"undefined"');
    expect(canonical_json(undefined)).not.toBe(canonical_json(null));
  });

  test('nested records sort recursively', () => {
    expect(canonical_json({ z: { y: 1, x: 2 } })).toBe('{"z":{"x":2,"y":1}}');
  });

});





describe('snapshot_value (§15)', () => {

  test('snapshots a nested option-of-function-value with sorted keys', () => {
    const snap = snapshot_value(some(fn_value('lambda#id', { n: 1 })));
    expect(snap).toBe('{"adt":"some","fields":{"value":{"captures":{"n":1},"fn":"lambda#id"}}}');
  });

  test('two structurally-equal values snapshot identically', () => {
    expect(snapshot_value(variant('rect', { w: 1, h: 2 })))
      .toBe(snapshot_value(variant('rect', { h: 2, w: 1 })));
  });

});





describe('hash_value (§15)', () => {

  test('deeply-equal values hash equal', () => {
    expect(hash_value(some(3))).toBe(hash_value(some(3)));
  });

  test('distinct values hash differently', () => {
    expect(hash_value(some(3))).not.toBe(hash_value(none));
  });

  test('hash is an 8-character hex string', () => {
    expect(hash_value(some(3))).toMatch(/^[0-9a-f]{8}$/);
  });

  test('hash is key-order independent', () => {
    expect(hash_value({ a: 1, b: 2 })).toBe(hash_value({ b: 2, a: 1 }));
  });

  test('hash zero-pads small magnitudes to 8 chars', () => {
    // exercise many inputs; every hash must be exactly 8 hex chars
    for (let i = 0; i < 200; i++) {
      expect(hash_value(i)).toMatch(/^[0-9a-f]{8}$/);
    }
  });

});





describe('deep_equal (§6)', () => {

  test('identical references are equal', () => {
    const v = variant('point');
    expect(deep_equal(v, v)).toBe(true);
  });

  test('equal scalars', () => {
    expect(deep_equal(7, 7)).toBe(true);
  });

  test('unequal scalars', () => {
    expect(deep_equal(7, 8)).toBe(false);
  });

  test('null and undefined are distinct (§4.1)', () => {
    expect(deep_equal(null, undefined)).toBe(false);
  });

  test('scalar vs record is unequal', () => {
    expect(deep_equal(7, { a: 1 })).toBe(false);
  });

  test('record vs scalar is unequal', () => {
    expect(deep_equal({ a: 1 }, 7)).toBe(false);
  });

  test('array vs record never match', () => {
    expect(deep_equal([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  test('equal arrays', () => {
    expect(deep_equal([1, [2, 3]], [1, [2, 3]])).toBe(true);
  });

  test('arrays of differing length', () => {
    expect(deep_equal([1, 2], [1, 2, 3])).toBe(false);
  });

  test('arrays with a differing element', () => {
    expect(deep_equal([1, 2], [1, 9])).toBe(false);
  });

  test('equal records regardless of key order', () => {
    expect(deep_equal({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  test('records with differing key sets', () => {
    expect(deep_equal({ a: 1 }, { b: 1 })).toBe(false);
  });

  test('records with differing key counts', () => {
    expect(deep_equal({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  test('records with a differing value', () => {
    expect(deep_equal({ a: 1 }, { a: 2 })).toBe(false);
  });

  test('nested ADT equality', () => {
    expect(deep_equal(variant('point'), variant('point'))).toBe(true);
  });

});





describe('assert_acyclic (§13)', () => {

  test('passes for a finite tree', () => {
    expect(() => assert_acyclic({ a: 1, b: [2, 3], c: { d: 4 } })).not.toThrow();
  });

  test('passes for a scalar', () => {
    expect(() => assert_acyclic(7)).not.toThrow();
  });

  test('passes for null', () => {
    expect(() => assert_acyclic(null)).not.toThrow();
  });

  test('passes for a shared-but-acyclic diamond', () => {
    const shared = { x: 1 };
    expect(() => assert_acyclic([shared, shared])).not.toThrow();
  });

  test('rejects a direct self-cycle', () => {
    const loop: Record<string, FslAcyclic> = {};
    loop.self = loop;
    expect(() => assert_acyclic(loop)).toThrow();
  });

  test('rejects a cycle through an array', () => {
    const arr: FslAcyclic[] = [];
    arr.push(arr);
    expect(() => assert_acyclic(arr)).toThrow();
  });

  test('rejects an indirect cycle', () => {
    const a: Record<string, FslAcyclic> = {};
    const b: Record<string, FslAcyclic> = { a };
    a.b = b;
    expect(() => assert_acyclic({ root: a })).toThrow();
  });

});





describe('deep_freeze_copy (§13)', () => {

  test('passes scalars through', () => {
    expect(deep_freeze_copy(7)).toBe(7);
    expect(deep_freeze_copy(null)).toBe(null);
  });

  test('copies and freezes a record deeply', () => {
    const src = { a: [1, 2], b: { c: 3 } };
    const cp  = deep_freeze_copy(src) as Record<string, FslAcyclic>;
    expect(cp).not.toBe(src);
    expect(cp).toStrictEqual(src);
    expect(Object.isFrozen(cp)).toBe(true);
    expect(Object.isFrozen(cp.a)).toBe(true);
    expect(Object.isFrozen(cp.b)).toBe(true);
  });

  test('copies and freezes nested arrays', () => {
    const cp = deep_freeze_copy([[1], [2]]) as FslAcyclic[];
    expect(Object.isFrozen(cp)).toBe(true);
    expect(Object.isFrozen(cp[0])).toBe(true);
  });

});
