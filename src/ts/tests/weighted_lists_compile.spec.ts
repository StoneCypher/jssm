import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

const edges = (src: string) => jssm.sm`${src}`.list_edges().map(e => ({ from: e.from, to: e.to, probability: e.probability, share: e.share }));
const edge  = (src: string, from: string, to: string) => edges(src).find(e => e.from === from && e.to === to)!;

describe('list_shares', () => {
  it('uniform shares for a plain list', () => {
    expect(jssm.list_shares(['b', 'c'])).toEqual([{ name: 'b', share: 0.5 }, { name: 'c', share: 0.5 }]);
  });
  it('normalized shares for inner weights', () => {
    expect(jssm.list_shares({ key: 'weighted_list', members: [{ name: 'b', weight: 20 }, { name: 'c', weight: 80 }] }))
      .toEqual([{ name: 'b', share: 0.2 }, { name: 'c', share: 0.8 }]);
  });
  it('weights are normalized, so 1%/4% equals 20%/80%', () => {
    expect(jssm.list_shares({ key: 'weighted_list', members: [{ name: 'b', weight: 1 }, { name: 'c', weight: 4 }] }))
      .toEqual([{ name: 'b', share: 0.2 }, { name: 'c', share: 0.8 }]);
  });
  it('rejects a list mixing weighted and unweighted members', () => {
    expect(() => jssm.list_shares({ key: 'weighted_list', members: [{ name: 'b', weight: 20 }, { name: 'c' }] })).toThrow(/every member|all members/i);
  });
  it('rejects inner weights that sum to zero', () => {
    expect(() => jssm.list_shares({ key: 'weighted_list', members: [{ name: 'b', weight: 0 }, { name: 'c', weight: 0 }] })).toThrow(/zero/i);
  });
  it('uniform shares for a weighted_list node whose members carry no weight (the grammar never emits this shape, but list_shares is public API)', () => {
    expect(jssm.list_shares({ key: 'weighted_list', members: [{ name: 'b' }, { name: 'c' }] }))
      .toEqual([{ name: 'b', share: 0.5 }, { name: 'c', share: 0.5 }]);
  });
});

describe('compiled probabilities for list targets', () => {

  it('example A: a 50% -> [b c] shares 50 as 25/25; a sibling keeps 50', () => {
    const src = 'a 50% -> [b c]; a 50% -> d;';
    expect(edge(src, 'a', 'b').probability).toBe(25);
    expect(edge(src, 'a', 'c').probability).toBe(25);
    expect(edge(src, 'a', 'd').probability).toBe(50);
    expect(edge(src, 'a', 'b').share).toBeUndefined();
  });

  it('example B: inner weights multiply the outer probability', () => {
    const src = 'a 50% -> [b 20% c 80%]; a 50% -> d;';
    expect(edge(src, 'a', 'b').probability).toBe(10);
    expect(edge(src, 'a', 'c').probability).toBe(40);
    expect(edge(src, 'a', 'd').probability).toBe(50);
  });

  it('example D: inner weights with no outer probability become shares', () => {
    const src = 'a -> [b 20% c 80%]; a -> d;';
    expect(edge(src, 'a', 'b')).toEqual({ from: 'a', to: 'b', probability: undefined, share: 0.2 });
    expect(edge(src, 'a', 'c')).toEqual({ from: 'a', to: 'c', probability: undefined, share: 0.8 });
    expect(edge(src, 'a', 'd')).toEqual({ from: 'a', to: 'd', probability: undefined, share: undefined });
  });

  it('example E: an unweighted list with no outer probability carries neither field', () => {
    const src = 'a -> [b c];';
    expect(edge(src, 'a', 'b')).toEqual({ from: 'a', to: 'b', probability: undefined, share: undefined });
  });

  it('a list SOURCE is not shared: [a b] 50% -> c gives each source edge 50', () => {
    const src = '[a b] 50% -> c;';
    expect(edge(src, 'a', 'c').probability).toBe(50);
    expect(edge(src, 'b', 'c').probability).toBe(50);
  });

  it('a reverse arrow shares on the list side: [a b] <- 50% e gives e->a 25 and e->b 25', () => {
    const src = '[a b] <- 50% e;';
    expect(edge(src, 'e', 'a').probability).toBe(25);
    expect(edge(src, 'e', 'b').probability).toBe(25);
  });

  it('a two-way arrow shares only the list-target direction', () => {
    const src = 'a 50% <-> 40% [b c];';
    expect(edge(src, 'a', 'b').probability).toBe(25);
    expect(edge(src, 'b', 'a').probability).toBe(40);
  });

  it('a mixed weighted list is a compile error', () => {
    expect(() => jssm.sm`a -> [b 20% c];`).toThrow(/every member|all members/i);
  });

  // A weighted list on the SOURCE side (`from_has_weights`): the share still
  // applies to whichever compiled edge ENTERS the list's members, using the
  // members' own inner weights instead of a uniform 1/n split.
  it('a weighted-source reverse arrow: [a 20% b 80%] <- 50% e gives e->a 10 and e->b 40', () => {
    const src = '[a 20% b 80%] <- 50% e;';
    expect(edge(src, 'e', 'a').probability).toBe(10);
    expect(edge(src, 'e', 'b').probability).toBe(40);
  });

  it('a weighted-source two-way arrow with no probability: [a 20% b 80%] <-> c records shares on the list side only', () => {
    const src = '[a 20% b 80%] <-> c;';
    expect(edge(src, 'c', 'a')).toEqual({ from: 'c', to: 'a', probability: undefined, share: 0.2 });
    expect(edge(src, 'c', 'b')).toEqual({ from: 'c', to: 'b', probability: undefined, share: 0.8 });
    expect(edge(src, 'a', 'c')).toEqual({ from: 'a', to: 'c', probability: undefined, share: undefined });
    expect(edge(src, 'b', 'c')).toEqual({ from: 'b', to: 'c', probability: undefined, share: undefined });
  });

  it('a weighted-source two-way arrow with both sides decorated: [a 20% b 80%] 50% <-> 40% e', () => {
    const src = '[a 20% b 80%] 50% <-> 40% e;';
    // source side (a->e, b->e): the list is the SOURCE here, so unshared.
    expect(edge(src, 'a', 'e').probability).toBe(50);
    expect(edge(src, 'b', 'e').probability).toBe(50);
    // list-target side (e->a, e->b): shared by each member's own inner weight.
    expect(edge(src, 'e', 'a').probability).toBe(8);
    expect(edge(src, 'e', 'b').probability).toBe(32);
  });

});

// `start_states` carries the same weighted-list AST as an ArrowTarget (Task 1); the compiler
// must resolve it to plain names on `start_states` and expose the declared weights separately,
// for Task 4's Machine accessors to consume — squarely this task's "carry through" scope.
describe('weighted start_states carries through to the compiled config', () => {

  it('a plain start_states list compiles unchanged, with no start_state_weights', () => {
    const cfg = jssm.compile(jssm.parse('start_states: [a b]; a -> c; b -> c;'));
    expect(cfg.start_states).toEqual(['a', 'b']);
    expect(cfg.start_state_weights).toBeUndefined();
  });

  it('a weighted start_states list normalizes shares and keeps plain names in start_states', () => {
    const cfg = jssm.compile(jssm.parse('start_states: [idle 90% booting 10%]; idle -> booting;'));
    expect(cfg.start_states).toEqual(['idle', 'booting']);
    expect(cfg.start_state_weights).toEqual([{ name: 'idle', share: 0.9 }, { name: 'booting', share: 0.1 }]);
  });

  it('a start_states list with a single unweighted member compiles unchanged', () => {
    const cfg = jssm.compile(jssm.parse('start_states: [a]; a -> c;'));
    expect(cfg.start_states).toEqual(['a']);
    expect(cfg.start_state_weights).toBeUndefined();
  });

});
