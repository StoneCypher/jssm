
import * as jssm from '../jssm';
const sm = jssm.sm;





// #325: two different actions may drive the same (from, to) transition; the
// self-loop instance of that is #531.  Action-less edges stay one-per-pair,
// except probability-bearing ones (option B).
describe('parallel action edges (#325, #531)', () => {

  test('two distinct actions to the same target are allowed', () =>
    expect(sm`a 'f' -> c; a 'g' -> c;`.list_edges().length).toBe(2) );

  test('the first action dispatches to the shared target', () => {
    const m = sm`a 'f' -> c; a 'g' -> c;`;
    expect(m.action('f')).toBe(true);
    expect(m.state()).toBe('c');
  });

  test('the second action also reaches the shared target', () => {
    const m = sm`a 'f' -> c; a 'g' -> c;`;
    expect(m.action('g')).toBe(true);
    expect(m.state()).toBe('c');
  });

  test('self-loop with two actions is allowed and both dispatch (#531)', () => {
    const m = sm`A 'blah' -> A; A 'foo' -> A;`;
    expect(m.list_edges().length).toBe(2);
    expect(m.action('blah')).toBe(true);
    expect(m.state()).toBe('A');
    expect(m.action('foo')).toBe(true);
    expect(m.state()).toBe('A');
  });

  test('list_exit_actions reports both actions', () =>
    expect(sm`a 'f' -> c; a 'g' -> c;`.list_exit_actions('a').sort()).toEqual(['f', 'g']) );

  test('edges_between returns both parallel edges', () => {
    const between = sm`a 'f' -> c; a 'g' -> c;`.edges_between('a', 'c');
    expect(between.length).toBe(2);
    expect(between.map(e => e.action).sort()).toEqual(['f', 'g']);
  });

  test('lookup_transition_for resolves to the first-declared edge', () =>
    expect(sm`a 'f' -> c; a 'g' -> c;`.lookup_transition_for('a', 'c').action).toBe('f') );

  test('plain transition to the shared target still works (first edge)', () => {
    const m = sm`a 'f' -> c; a 'g' -> c;`;
    expect(m.transition('c')).toBe(true);
    expect(m.state()).toBe('c');
  });

  test('adjacency stays unique: list_exits reports the shared target once', () =>
    expect(sm`a 'f' -> c; a 'g' -> c;`.list_exits('a')).toEqual(['c']) );

  test('a second plain action-less edge to the same pair is still rejected', () =>
    expect(() => sm`a -> b; a -> b;`).toThrow(/already has/) );

  test('a repeated action to the same pair is rejected', () =>
    expect(() => sm`a 'f' -> c; a 'f' -> c;`).toThrow() );

  test('probability-bearing action-less edges may repeat a target (option B)', () =>
    expect(sm`a 30% -> b; a 70% -> b;`.list_edges().length).toBe(2) );

  test('probabilistic fan-out to different targets still works', () =>
    expect(sm`a 30% -> b; a 70% -> c;`.list_edges().length).toBe(2) );

});
