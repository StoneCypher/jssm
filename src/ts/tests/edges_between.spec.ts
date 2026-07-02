
import { describe, expect, test } from 'vitest';

import { sm } from '../jssm';





describe('edges_between', () => {

  test('returns the single edge between two directly connected states', () => {
    const m    = sm`a -> b -> c;`,
          ab   = m.edges_between('a', 'b'),
          bc   = m.edges_between('b', 'c');
    expect(ab.length).toBe(1);
    expect(ab[0].from).toBe('a');
    expect(ab[0].to).toBe('b');
    expect(bc.length).toBe(1);
  });

  test('returns empty array when from has no outbound edges to to', () => {
    const m = sm`a -> b -> c;`;
    expect(m.edges_between('a', 'c')).toEqual([]);
  });

  test('returns empty array when from is a terminal state with no outbound edges', () => {
    const m = sm`a -> b;`;   // b has no exits
    expect(m.edges_between('b', 'a')).toEqual([]);
  });

  test('returns empty array when from does not exist in the machine', () => {
    const m = sm`a -> b;`;
    expect(m.edges_between('nonexistent', 'b')).toEqual([]);
  });

  test('returns empty array when to does not exist in the machine', () => {
    const m = sm`a -> b;`;
    expect(m.edges_between('a', 'nonexistent')).toEqual([]);
  });

  test('returns every parallel action edge between the same pair, in declaration order', () => {
    const m  = sm`a 'go' -> b; a 'run' -> b;`,
          ab = m.edges_between('a', 'b');
    expect(ab.length).toBe(2);
    expect(ab[0].action).toBe('go');
    expect(ab[1].action).toBe('run');
  });

});
