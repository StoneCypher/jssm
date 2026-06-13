import { mergeConfigs } from '../../../cli/config/merge';
import type { PartialConfig } from '../../../cli/config/types';

describe('cli/config/merge', () => {

  it('merging an empty list returns an empty object', () => {
    expect(mergeConfigs([])).toEqual({});
  });

  it('merging a single layer returns that layer', () => {
    const a: PartialConfig = { render: { scale: 5 } };
    expect(mergeConfigs([a])).toEqual(a);
  });

  it('later layer overrides earlier for scalars', () => {
    const out = mergeConfigs([
      { render: { scale: 3 } },
      { render: { scale: 7 } },
    ]);
    expect(out.render?.scale).toBe(7);
  });

  it('objects merge recursively per-key', () => {
    const out = mergeConfigs([
      { render: { scale: 3, outDir: 'a' } },
      { render: { scale: 7 } },
    ]);
    expect(out.render).toEqual({ scale: 7, outDir: 'a' });
  });

  it('arrays REPLACE (do not concat or union)', () => {
    const out = mergeConfigs([
      { include: ['a', 'b'] },
      { include: ['c'] },
    ]);
    expect(out.include).toEqual(['c']);
  });

  it('null from a later layer clears a value', () => {
    const out = mergeConfigs([
      { render: { outDir: 'a' } },
      { render: { outDir: null as any } },
    ]);
    expect(out.render?.outDir).toBeNull();
  });

  it('undefined from a later layer does NOT override an earlier value', () => {
    const out = mergeConfigs([
      { render: { scale: 5 } },
      { render: { scale: undefined } },
    ]);
    expect(out.render?.scale).toBe(5);
  });

  it('type mismatch: later wins (object replaced by array)', () => {
    const out = mergeConfigs([
      { render: { theme: 'dark' } as any },
      { render: ['unexpected'] as any },
    ]);
    expect(out.render).toEqual(['unexpected']);
  });

  it('three layers merge in order', () => {
    const out = mergeConfigs([
      { render: { scale: 1, outDir: 'a', quality: 10 } },
      { render: { scale: 2, outDir: 'b' } },
      { render: { scale: 3 } },
    ]);
    expect(out.render).toEqual({ scale: 3, outDir: 'b', quality: 10 });
  });

  it('does not mutate input layers', () => {
    const a: PartialConfig = { render: { scale: 1 } };
    const b: PartialConfig = { render: { scale: 2 } };
    mergeConfigs([a, b]);
    expect(a.render?.scale).toBe(1);
    expect(b.render?.scale).toBe(2);
  });

  it('handles deeply-nested merges', () => {
    const out = mergeConfigs([
      { render: { theme: 'a', outDir: 'x' } },
      { render: { theme: 'b' } },
    ]);
    expect(out.render).toEqual({ theme: 'b', outDir: 'x' });
  });

  it('key present in later layer with undefined value, absent from earlier layer, is omitted from output', () => {
    const out = mergeConfigs([
      { render: { scale: undefined } },
      { render: { scale: undefined } },
    ]);
    expect('scale' in (out.render ?? {})).toBe(false);
  });

});
