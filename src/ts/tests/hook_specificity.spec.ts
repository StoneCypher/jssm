
import { sm } from '../jssm';





// Coverage for StoneCypher/fsl#659 (unused hooks and weird action cases —
// unblocked when #531 closed) and StoneCypher/fsl#710 (colliding action and
// state names must not cross-trigger hooks).  These pin verified-current
// semantics: named hooks fire only through their action, unused hooks stay
// silent, and an action sharing a name with a state never leaks dispatch
// across the two namespaces.





describe('fsl#659 — unused hooks and weird action cases', () => {

  test('the #659 matrix: used hooks fire their exact counts, unused hooks never fire', () => {

    const m = sm`a 'target' => b 'target' => c;`;

    let edge_ab = 0,
        named_target = 0,
        named_missed = 0,
        shared  = 0;

    m.hook('a', 'b', () => { edge_ab += 1; });
    m.hook_action('a', 'b', 'target', () => { named_target += 1; });
    m.hook_action('a', 'b', 'missed', () => { named_missed += 1; });   // registers; can never fire
    m.hook('a', 'b', () => { shared += 1; });                          // second registration REPLACES edge_ab's? no — same slot; see below
    m.hook('b', 'c', () => { shared += 1; });

    expect(m.action('target')).toBe(true);   // a -> b
    expect(m.action('target')).toBe(true);   // b -> c

    expect(named_target).toBe(1);   // its action fired once on its edge
    expect(named_missed).toBe(0);   // never dispatchable
    expect(shared).toBe(2);         // once per edge it was installed on

    // edge hooks are one-per-edge: the second hook('a','b') registration
    // replaced the first, so the original handler never fired
    expect(edge_ab).toBe(0);

  });

  test('a named hook does not fire on a plain transition over its edge', () => {

    const m = sm`a 'target' => b;`;

    let named = 0;
    m.hook_action('a', 'b', 'target', () => { named += 1; });

    expect(m.transition('b')).toBe(true);
    expect(named).toBe(0);

  });

  test('an edge hook fires for both plain transitions and actions over its edge', () => {

    const walk_by_action = sm`a 'target' => b;`;
    const walk_by_name   = sm`a 'target' => b;`;

    let by_action = 0,
        by_name   = 0;

    walk_by_action.hook('a', 'b', () => { by_action += 1; });
    walk_by_name.hook('a', 'b', () => { by_name += 1; });

    expect(walk_by_action.action('target')).toBe(true);
    expect(walk_by_name.transition('b')).toBe(true);

    expect(by_action).toBe(1);
    expect(by_name).toBe(1);

  });

});





describe('fsl#710 — colliding action and state names do not cross-trigger hooks', () => {

  test('a plain walk into state x never fires action hooks named x', () => {

    const m = sm`a 'x' -> x; a -> b; b -> x;`;

    let global_x = 0,
        any_action = 0,
        entry_x = 0;

    m.hook_global_action('x', () => { global_x += 1; });
    m.hook_any_action(() => { any_action += 1; });
    m.hook_entry('x', () => { entry_x += 1; });

    expect(m.transition('b')).toBe(true);
    expect(m.transition('x')).toBe(true);

    expect(global_x).toBe(0);
    expect(any_action).toBe(0);
    expect(entry_x).toBe(1);

  });

  test('a plain transition over the actioned edge into x fires no action hooks', () => {

    const m = sm`a 'x' -> x; a -> b; b -> x;`;

    let global_x = 0,
        named    = 0,
        entry_x  = 0;

    m.hook_global_action('x', () => { global_x += 1; });
    m.hook_action('a', 'x', 'x', () => { named += 1; });
    m.hook_entry('x', () => { entry_x += 1; });

    expect(m.transition('x')).toBe(true);   // a -> x over the 'x'-actioned edge, by name

    expect(global_x).toBe(0);
    expect(named).toBe(0);
    expect(entry_x).toBe(1);

  });

  test('dispatching the action x fires action hooks exactly once and state hooks normally', () => {

    const m = sm`a 'x' -> x; a -> b; b -> x;`;

    let global_x = 0,
        named    = 0,
        entry_x  = 0;

    m.hook_global_action('x', () => { global_x += 1; });
    m.hook_action('a', 'x', 'x', () => { named += 1; });
    m.hook_entry('x', () => { entry_x += 1; });

    expect(m.action('x')).toBe(true);

    expect(global_x).toBe(1);
    expect(named).toBe(1);
    expect(entry_x).toBe(1);

  });

  test('an entry hook on the colliding state does not fire when the action name is dispatched elsewhere', () => {

    // action 'b' collides with state b, but drives a -> c; entering c must
    // not disturb hooks watching state b
    const m = sm`a 'b' -> c; a -> b;`;

    let entry_b = 0,
        entry_c = 0;

    m.hook_entry('b', () => { entry_b += 1; });
    m.hook_entry('c', () => { entry_c += 1; });

    expect(m.action('b')).toBe(true);   // lands in c, not b

    expect(entry_b).toBe(0);
    expect(entry_c).toBe(1);

  });

});
