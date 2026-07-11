
import * as jssm from '../jssm';

/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));
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
    expect(sm`a 'f' -> c; a 'g' -> c;`.list_exit_actions('a').sort(code_unit_compare)).toEqual(['f', 'g']) );

  test('edges_between returns both parallel edges', () => {
    const between = sm`a 'f' -> c; a 'g' -> c;`.edges_between('a', 'c');
    expect(between.length).toBe(2);
    expect(between.map(e => e.action).sort(code_unit_compare)).toEqual(['f', 'g']);
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



// transition-kind hooks resolve the dispatched edge's kind through the same
// first-declared-wins rule as lookup_transition_for and the pair fast-path,
// so a parallel (from, to) pair with mixed arrow kinds fires the hook of the
// FIRST-declared edge's kind
describe('parallel edges: transition-kind hooks see the first-declared kind', () => {

  test('main-then-legal parallel pair dispatches the main-transition hook', () => {
    // a=>b declared first (kind 'main'), a->b second (kind 'legal').
    const m = sm`a 'go' => b; a 'walk' -> b;`;
    let main_fired = false, standard_fired = false;
    m.hook_main_transition( () => { main_fired = true; } );
    m.hook_standard_transition( () => { standard_fired = true; } );
    expect(m.transition('b')).toBe(true);
    expect(main_fired).toBe(true);       // first-declared edge kind is 'main'
    expect(standard_fired).toBe(false);  // 'legal' hook must not fire
  });

});
