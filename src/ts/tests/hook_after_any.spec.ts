
import { sm, from as sm_from } from '../jssm';





// Coverage for StoneCypher/fsl#1299 — `hook_after` implies `hook_after_any`.
//
// Every other hook family carries an "any" companion (hook /
// hook_any_transition, hook_action / hook_any_action, post likewise); the
// after-timer family had only the per-state form.  `hook_after_any` fires
// when ANY state's `after` timer elapses, after the state's specific
// after-hook if one exists; like `hook_after` it is informational and
// cannot veto the timed transition.





const delay = (time: number = 100) =>
  new Promise( resolve => setTimeout(resolve, time) );





describe('fsl#1299 — hook_after_any', () => {

  test('fires when an after timer elapses', async () => {
    const m = sm`a after 2ms -> b;`;
    let calls = 0;
    m.hook_after_any(() => { calls += 1; });
    await delay();
    expect(m.state()).toBe('b');
    expect(calls).toBe(1);
  });

  test('a specific hook_after firing implies hook_after_any fires too, in that order', async () => {
    const m = sm`a after 2ms -> b;`;
    const order: Array<string> = [];
    m.hook_after('a', () => { order.push('specific'); });
    m.hook_after_any(() => { order.push('any'); });
    await delay();
    expect(order).toStrictEqual(['specific', 'any']);
  });

  test('fires alone on states with no specific after hook', async () => {
    const m = sm`a after 2ms -> b;`;
    let specific = 0,
        any      = 0;
    m.hook_after('b', () => { specific += 1; });   // wrong state on purpose
    m.hook_after_any(() => { any += 1; });
    await delay();
    expect(specific).toBe(0);
    expect(any).toBe(1);
  });

  test('does not fire on ordinary dispatch', () => {
    const m = sm`a after 20s -> c; a -> b;`;
    let calls = 0;
    m.hook_after_any(() => { calls += 1; });
    expect(m.go('b')).toBe(true);
    expect(calls).toBe(0);
    m.clear_state_timeout();
  });

  test('receives the machine data in its context', async () => {
    const m = sm_from(`a after 2ms -> b;`, { data: 7 });
    let seen: any = null;    
    m.hook_after_any(ctx => { seen = ctx; });
    await delay();
    expect(seen.data).toBe(7);
  });

  test('returns the machine for chaining', () => {
    const m = sm`a after 20s -> b;`;
    expect(m.hook_after_any(() => true)).toBe(m);
    m.clear_state_timeout();
  });

  test('appears in the hook registry as a global-scoped pre entry', () => {
    const m = sm`a -> b;`;
    m.hook_after_any(() => true);
    expect( m.hook_registry() ).toStrictEqual([
      { kind: 'after any', phase: 'pre', target: { scope: 'global' } }
    ]);
  });

  test('removing an unregistered after-any hook reports false', () => {
    const m = sm`a -> b;`;
    expect( m.remove_hook({ kind: 'after any', handler: () => true }) ).toBe(false);
    expect( m.hook_registry() ).toStrictEqual([]);
  });

  test('registers and removes through set_hook / remove_hook', async () => {
    const m = sm`a after 2ms -> b;`;
    let calls = 0;
    const handler = () => { calls += 1; };

    m.set_hook({ kind: 'after any', handler });
    expect( m.hook_registry().length ).toBe(1);

    m.remove_hook({ kind: 'after any', handler });
    expect( m.hook_registry().length ).toBe(0);

    await delay();
    expect(m.state()).toBe('b');
    expect(calls).toBe(0);
  });

});
