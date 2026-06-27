import { describe, it, expect } from 'vitest';
import { canonicalize, canonical_config, CANONICAL_FORMAT_VERSION } from '../fsl_canonical';

describe('canonicalize (RFC 8785)', () => {
  it('sorts object keys by UTF-16 code unit, regardless of insertion order', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }));
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('orders non-ASCII and astral keys by code unit (RFC 8785 vector)', () => {
    // U+007A 'z', U+00E4 'ä', U+10140 (astral, surrogate D800 DD40)
    const s = canonicalize({ 'z': 1, 'ä': 2, '\u{10140}': 3 });
    // code-unit order: 'z'(007A) < 'ä'(00E4) < astral(D800…)
    expect(s).toBe('{"z":1,"ä":2,"\u{10140}":3}');
  });

  it('preserves array order and omits undefined keys', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
    expect(canonicalize({ a: 1, b: undefined, c: 3 })).toBe('{"a":1,"c":3}');
  });

  it('serializes undefined array elements as null (RFC 8785)', () => {
    expect(canonicalize([1, undefined, 3])).toBe('[1,null,3]');
  });

  it('canonical_config tags a version and carries state+data', () => {
    const s = canonical_config('Locked', { n: 1 });
    expect(s).toBe(`{"data":{"n":1},"state":"Locked","v":${CANONICAL_FORMAT_VERSION}}`);
  });
});
