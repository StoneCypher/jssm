import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

const first_se = (src: string): any => (jssm.parse(src) as any)[0].se;

describe('weighted list grammar', () => {

  it('a plain list target is still a plain array (byte-identical AST)', () => {
    expect(first_se('a -> [b c];').to).toEqual(['b', 'c']);
  });

  it('a plain list source is still a plain array', () => {
    expect((jssm.parse('[a b] -> c;') as any)[0].from).toEqual(['a', 'b']);
  });

  it('inner weights produce a weighted_list node', () => {
    expect(first_se('a 50% -> [b 20% c 80%];').to).toEqual({
      key: 'weighted_list',
      members: [{ name: 'b', weight: 20 }, { name: 'c', weight: 80 }],
    });
  });

  it('weights are decimals in percent, whitespace-tolerant', () => {
    expect(first_se('a -> [ b 0.5%   c 99.5% ];').to).toEqual({
      key: 'weighted_list',
      members: [{ name: 'b', weight: 0.5 }, { name: 'c', weight: 99.5 }],
    });
  });

  it('a partially weighted list parses (the compiler rejects it)', () => {
    expect(first_se('a -> [b 20% c];').to).toEqual({
      key: 'weighted_list',
      members: [{ name: 'b', weight: 20 }, { name: 'c' }],
    });
  });

  it('quoted names take weights too', () => {
    expect(first_se('a -> ["in progress" 30% done 70%];').to.members[0]).toEqual({ name: 'in progress', weight: 30 });
  });

  it('start_states accepts weights', () => {
    const cfg = (jssm.parse('start_states: [idle 90% booting 10%]; idle -> booting;') as any)[0];
    expect(cfg.key).toBe('start_states');
    expect(cfg.value).toEqual({
      key: 'weighted_list',
      members: [{ name: 'idle', weight: 90 }, { name: 'booting', weight: 10 }],
    });
  });

  it('start_states without weights stays a plain array', () => {
    const cfg = (jssm.parse('start_states: [idle booting]; idle -> booting;') as any)[0];
    expect(cfg.value).toEqual(['idle', 'booting']);
  });

  it.each([
    'end_states: [x 50% y 50%]; x -> y;',
    'arrange [a 50% b 50%]; a -> b;',
    'a -> b; &g : [a 50% b 50%];',
  ])('weights are a parse error outside arrow targets and start_states: %s', (src) => {
    expect(() => jssm.parse(src)).toThrow();
  });

  it('locations mode attaches loc to the weighted node', () => {
    const se = (jssm.parse('a -> [b 20% c 80%];', { locations: true } as any) as any)[0].se;
    const to = se.to;
    expect(to.key).toBe('weighted_list');
    expect(to.loc).toBeDefined();
  });

});
