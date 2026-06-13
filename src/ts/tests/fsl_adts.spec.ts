
import * as adts     from '../fsl_adts';

import { JssmError } from '../jssm_error';





// ---------------------------------------------------------------------------
//  §4.3  Sum / variant values
// ---------------------------------------------------------------------------

describe('adt_variant / accessors (§4.3)', () => {

  test('constructs with payload', () => {
    const v = adts.adt_variant('circle', [3.0]);
    expect( v.kind   ).toBe('variant');
    expect( v.tag    ).toBe('circle');
    expect( v.values ).toEqual([3.0]);
  });

  test('constructs payload-less (default [])', () => {
    const v = adts.adt_variant('point');
    expect( v.tag    ).toBe('point');
    expect( v.values ).toEqual([]);
  });

  test('is frozen and copies the payload (no aliasing)', () => {
    const src = [1];
    const v   = adts.adt_variant('node', src);
    expect( Object.isFrozen(v)        ).toBe(true);
    expect( Object.isFrozen(v.values) ).toBe(true);
    src.push(2);
    expect( v.values ).toEqual([1]);   // unaffected by mutation of src
  });

  test('empty-string tag throws typed + substring', () => {
    expect( () => adts.adt_variant('') ).toThrow(JssmError);
    expect( () => adts.adt_variant('') ).toThrow('non-empty string tag');
  });

  test('non-string tag throws typed + substring', () => {
    expect( () => adts.adt_variant(7 as any) ).toThrow(JssmError);
    expect( () => adts.adt_variant(7 as any) ).toThrow('non-empty string tag');
  });

});


describe('is_variant (§4.3)', () => {

  test('true for a variant', () => expect( adts.is_variant(adts.adt_variant('point')) ).toBe(true) );
  test('false for a function', () => expect( adts.is_variant(adts.adt_function('h')) ).toBe(false) );
  test('false for a scalar',   () => expect( adts.is_variant(7) ).toBe(false) );
  test('false for null',       () => expect( adts.is_variant(null) ).toBe(false) );

});


describe('variant_tag (§7 scrutinee)', () => {

  test('reads the tag', () => expect( adts.variant_tag(adts.adt_variant('circle', [1])) ).toBe('circle') );

  test('non-variant throws typed + substring', () => {
    expect( () => adts.variant_tag(7) ).toThrow(JssmError);
    expect( () => adts.variant_tag(7) ).toThrow('requires a variant value');
  });

  // exercises the null / undefined description paths inside the error message
  test('null and undefined scrutinees throw with named description', () => {
    expect( () => adts.variant_tag(null) ).toThrow('got null');
    expect( () => adts.variant_tag(undefined) ).toThrow('got undefined');
  });

});


describe('variant_field (§7 destructure)', () => {

  test('reads each field', () => {
    const r = adts.adt_variant('rect', [4, 5]);
    expect( adts.variant_field(r, 0) ).toBe(4);
    expect( adts.variant_field(r, 1) ).toBe(5);
  });

  test('non-variant throws typed + substring', () => {
    expect( () => adts.variant_field('x', 0) ).toThrow(JssmError);
    expect( () => adts.variant_field('x', 0) ).toThrow('requires a variant value');
  });

  test('non-integer index throws + substring', () => {
    const r = adts.adt_variant('rect', [4, 5]);
    expect( () => adts.variant_field(r, 0.5) ).toThrow(JssmError);
    expect( () => adts.variant_field(r, 0.5) ).toThrow('out of bounds');
  });

  test('negative index throws', () => {
    const r = adts.adt_variant('rect', [4, 5]);
    expect( () => adts.variant_field(r, -1) ).toThrow('out of bounds');
  });

  test('over-arity index throws', () => {
    const r = adts.adt_variant('rect', [4, 5]);
    expect( () => adts.variant_field(r, 2) ).toThrow('out of bounds');
  });

});





// ---------------------------------------------------------------------------
//  §4.4  option<T>
// ---------------------------------------------------------------------------

describe('option<T> (§4.4)', () => {

  test('some wraps and tags', () => {
    const s = adts.option_some(7);
    expect( adts.variant_tag(s) ).toBe('some');
    expect( s.values ).toEqual([7]);
  });

  test('none singleton tag', () => expect( adts.variant_tag(adts.option_none) ).toBe('none') );

  test('is_some', () => {
    expect( adts.is_some(adts.option_some(7)) ).toBe(true);
    expect( adts.is_some(adts.option_none)    ).toBe(false);
    expect( adts.is_some(adts.adt_variant('some', [])) ).toBe(false); // wrong arity
  });

  test('is_none', () => {
    expect( adts.is_none(adts.option_none)    ).toBe(true);
    expect( adts.is_none(adts.option_some(7)) ).toBe(false);
  });

  test('option_get_or some', () => expect( adts.option_get_or(adts.option_some(7), 0) ).toBe(7) );
  test('option_get_or none', () => expect( adts.option_get_or(adts.option_none,    0) ).toBe(0) );

  test('option_get_or on non-option throws typed + substring', () => {
    expect( () => adts.option_get_or(adts.adt_variant('circle', [1]), 0) ).toThrow(JssmError);
    expect( () => adts.option_get_or(adts.adt_variant('circle', [1]), 0) ).toThrow('requires an option value');
  });

  // exercises the function-value description path inside the error message
  test('option_get_or on a function value names it as a function', () => {
    expect( () => adts.option_get_or(adts.adt_function('h'), 0) ).toThrow('function <h>');
  });

});





// ---------------------------------------------------------------------------
//  §4.4  Declared nullability (T?)
// ---------------------------------------------------------------------------

describe('nullable_check (§4.4 T?)', () => {

  test('non-null value passes regardless of declaration', () => {
    expect( adts.nullable_check(7, false) ).toBe(7);
    expect( adts.nullable_check(7, true)  ).toBe(7);
  });

  test('null/undefined allowed when nullable', () => {
    expect( adts.nullable_check(null,      true) ).toBe(null);
    expect( adts.nullable_check(undefined, true) ).toBe(undefined);
  });

  test('null on non-nullable throws typed + substring', () => {
    expect( () => adts.nullable_check(null, false) ).toThrow(JssmError);
    expect( () => adts.nullable_check(null, false) ).toThrow('null assigned to a non-nullable slot');
  });

  test('undefined on non-nullable throws + substring', () => {
    expect( () => adts.nullable_check(undefined, false) ).toThrow('undefined assigned to a non-nullable slot');
  });

});





// ---------------------------------------------------------------------------
//  §4.4  Type aliases
// ---------------------------------------------------------------------------

describe('type aliases (§4.4)', () => {

  test('build + resolve', () => {
    const env = adts.make_alias_env([['Celsius', 'int -273..1000'], ['Name', 'string']]);
    expect( adts.resolve_alias('Celsius', env) ).toBe('int -273..1000');
    expect( adts.resolve_alias('Name',    env) ).toBe('string');
  });

  test('empty env builds', () => {
    const env = adts.make_alias_env([]);
    expect( env.size ).toBe(0);
  });

  test('duplicate alias throws typed + substring', () => {
    expect( () => adts.make_alias_env([['A', 'int'], ['A', 'string']]) ).toThrow(JssmError);
    expect( () => adts.make_alias_env([['A', 'int'], ['A', 'string']]) ).toThrow('duplicate type alias');
  });

  test('empty-string alias name throws + substring', () => {
    expect( () => adts.make_alias_env([['', 'int']]) ).toThrow('non-empty string alias names');
  });

  test('non-string alias name throws + substring', () => {
    expect( () => adts.make_alias_env([[5 as any, 'int']]) ).toThrow('non-empty string alias names');
  });

  test('unknown alias throws typed + substring', () => {
    const env = adts.make_alias_env([['A', 'int']]);
    expect( () => adts.resolve_alias('B', env) ).toThrow(JssmError);
    expect( () => adts.resolve_alias('B', env) ).toThrow('unknown type alias');
  });

});





// ---------------------------------------------------------------------------
//  §4.4 / §15  Defunctionalized function values
// ---------------------------------------------------------------------------

describe('adt_function / defunctionalization (§4.4)', () => {

  test('constructs with captures', () => {
    const f = adts.adt_function('lam1', [5]);
    expect( f.kind      ).toBe('function');
    expect( f.lambda_id ).toBe('lam1');
    expect( f.captures  ).toEqual([5]);
  });

  test('constructs capture-less (default [])', () => {
    const f = adts.adt_function('lam0');
    expect( f.captures ).toEqual([]);
  });

  test('is frozen and copies captures', () => {
    const caps = [1];
    const f    = adts.adt_function('lam', caps);
    expect( Object.isFrozen(f)          ).toBe(true);
    expect( Object.isFrozen(f.captures) ).toBe(true);
    caps.push(2);
    expect( f.captures ).toEqual([1]);
  });

  test('empty lambda_id throws typed + substring', () => {
    expect( () => adts.adt_function('') ).toThrow(JssmError);
    expect( () => adts.adt_function('') ).toThrow('non-empty string lambda_id');
  });

  test('non-string lambda_id throws + substring', () => {
    expect( () => adts.adt_function(3 as any) ).toThrow('non-empty string lambda_id');
  });

  test('is_function', () => {
    expect( adts.is_function(adts.adt_function('h')) ).toBe(true);
    expect( adts.is_function(adts.adt_variant('point')) ).toBe(false);
  });

});


describe('lambda_tag content-hash (§4.4)', () => {

  test('deterministic: same body, same tag', () => {
    expect( adts.lambda_tag('(x) => x + 1') ).toBe( adts.lambda_tag('(x) => x + 1') );
  });

  test('differing bodies differ', () => {
    expect( adts.lambda_tag('(x) => x + 1') ).not.toBe( adts.lambda_tag('(x) => x + 2') );
  });

  test('eight lowercase hex digits', () => {
    expect( adts.lambda_tag('anything') ).toMatch(/^[0-9a-f]{8}$/);
  });

  test('empty string hashes to the FNV basis (zero-padded)', () => {
    expect( adts.lambda_tag('') ).toBe('811c9dc5');
  });

  test('non-string throws typed + substring', () => {
    expect( () => adts.lambda_tag(7 as any) ).toThrow(JssmError);
    expect( () => adts.lambda_tag(7 as any) ).toThrow('requires a string');
  });

});





// ---------------------------------------------------------------------------
//  §15  Canonical serialization
// ---------------------------------------------------------------------------

describe('adt_canonical (§15)', () => {

  test('null',      () => expect( adts.adt_canonical(null) ).toBe('null') );
  test('undefined', () => expect( adts.adt_canonical(undefined) ).toBe('undef') );
  test('boolean true',  () => expect( adts.adt_canonical(true)  ).toBe('b:1') );
  test('boolean false', () => expect( adts.adt_canonical(false) ).toBe('b:0') );
  test('number',  () => expect( adts.adt_canonical(42) ).toBe('n:42') );
  test('string',  () => expect( adts.adt_canonical('hi') ).toBe('s:hi') );

  test('variant', () => expect( adts.adt_canonical(adts.adt_variant('rect', [4, 5])) ).toBe('V<rect>(n:4,n:5)') );
  test('payload-less variant', () => expect( adts.adt_canonical(adts.option_none) ).toBe('V<none>()') );
  test('nested variant', () => {
    const t = adts.adt_variant('node', [1, adts.adt_variant('leaf'), adts.adt_variant('leaf')]);
    expect( adts.adt_canonical(t) ).toBe('V<node>(n:1,V<leaf>(),V<leaf>())');
  });

  test('function', () => expect( adts.adt_canonical(adts.adt_function('h', ['a'])) ).toBe('F<h>(s:a)') );

  test('non-ADT (array) throws typed + substring', () => {
    expect( () => adts.adt_canonical([1, 2] as any) ).toThrow(JssmError);
    expect( () => adts.adt_canonical([1, 2] as any) ).toThrow('cannot serialize a non-ADT value');
  });

  // canonical_number branches, observed through adt_canonical
  test('NaN spelling',   () => expect( adts.adt_canonical(NaN) ).toBe('n:nan') );
  test('+Inf spelling',  () => expect( adts.adt_canonical(Infinity) ).toBe('n:inf') );
  test('-Inf spelling',  () => expect( adts.adt_canonical(-Infinity) ).toBe('n:-inf') );
  test('-0 collapses to 0', () => expect( adts.adt_canonical(-0) ).toBe('n:0') );

});


describe('adt_hash (§15)', () => {

  test('eight lowercase hex digits', () => expect( adts.adt_hash(adts.adt_variant('rect', [4, 5])) ).toMatch(/^[0-9a-f]{8}$/) );

  test('structurally equal values hash identically', () => {
    expect( adts.adt_hash(adts.adt_function('h', [1])) ).toBe( adts.adt_hash(adts.adt_function('h', [1])) );
  });

  test('differing values hash differently', () => {
    expect( adts.adt_hash(adts.adt_variant('a')) ).not.toBe( adts.adt_hash(adts.adt_variant('b')) );
  });

});





// ---------------------------------------------------------------------------
//  §6 / §4.4  Structural / intensional equality
// ---------------------------------------------------------------------------

describe('adt_equal (§6 structural, §4.4 intensional)', () => {

  test('scalars by value', () => {
    expect( adts.adt_equal(1, 1)         ).toBe(true);
    expect( adts.adt_equal(1, 2)         ).toBe(false);
    expect( adts.adt_equal('a', 'a')     ).toBe(true);
    expect( adts.adt_equal(true, true)   ).toBe(true);
    expect( adts.adt_equal(null, null)   ).toBe(true);
    expect( adts.adt_equal(undefined, undefined) ).toBe(true);
  });

  test('NaN self-equal here (snapshot reflexivity)', () => {
    expect( adts.adt_equal(NaN, NaN) ).toBe(true);
    expect( adts.adt_equal(NaN, 1)   ).toBe(false);
  });

  test('variants: same tag + fields equal', () => {
    expect( adts.adt_equal(adts.option_none, adts.adt_variant('none')) ).toBe(true);
    expect( adts.adt_equal(adts.option_some(1), adts.option_some(1))    ).toBe(true);
  });

  test('variants: differ by tag / arity / field', () => {
    expect( adts.adt_equal(adts.adt_variant('a'), adts.adt_variant('b')) ).toBe(false);
    expect( adts.adt_equal(adts.adt_variant('a', [1]), adts.adt_variant('a')) ).toBe(false);
    expect( adts.adt_equal(adts.option_some(1), adts.option_some(2)) ).toBe(false);
  });

  test('functions: intensional — same tag + captures', () => {
    expect( adts.adt_equal(adts.adt_function('a', [1]), adts.adt_function('a', [1])) ).toBe(true);
    expect( adts.adt_equal(adts.adt_function('a', []),  adts.adt_function('b', [])) ).toBe(false);
    expect( adts.adt_equal(adts.adt_function('a', [1]), adts.adt_function('a', []))  ).toBe(false);
    expect( adts.adt_equal(adts.adt_function('a', [1]), adts.adt_function('a', [2])) ).toBe(false);
  });

  test('cross-kind compares unequal via fallthrough', () => {
    expect( adts.adt_equal(adts.adt_variant('x'), 5) ).toBe(false);
    expect( adts.adt_equal(adts.adt_function('x'), adts.adt_variant('x')) ).toBe(false);
  });

});
