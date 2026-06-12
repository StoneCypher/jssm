import * as jssm from '../jssm';

describe('interned dispatch — guard branches', () => {

  test('action() with an unknown action name is invalid and does not move', () => {
    const m = jssm.from(`a 'go' -> b;`);
    expect(m.action('definitely_not_an_action')).toBe(false);
    expect(m.state()).toBe('a');
  });

  test('action() with a known action not available from the current state is invalid', () => {
    const m = jssm.from(`a 'go' -> b 'fly' -> c;`);
    expect(m.action('fly')).toBe(false);   // fly exists, but only from b
    expect(m.state()).toBe('a');
  });

  test('transition() to an unknown state name is invalid and does not move', () => {
    const m = jssm.from('a -> b;');
    expect(m.transition('never_heard_of_it')).toBe(false);
    expect(m.state()).toBe('a');
  });

  test('transition() refuses a forced-only edge; force_transition() takes it', () => {
    const m = jssm.from('a ~> b;');
    expect(m.transition('b')).toBe(false);
    expect(m.state()).toBe('a');
    expect(m.force_transition('b')).toBe(true);
    expect(m.state()).toBe('b');
  });

  test('force_transition() to an unknown state name is invalid', () => {
    const m = jssm.from('a -> b;');
    expect(m.force_transition('never_heard_of_it')).toBe(false);
    expect(m.state()).toBe('a');
  });

  // The valid_* methods are public API; transition_impl no longer routes
  // through them (it resolves edges once, numerically), so they need their
  // own direct exercise.

  test('valid_action() answers availability from the current state', () => {
    const m = jssm.from(`a 'go' -> b 'fly' -> c;`);
    expect(m.valid_action('go')).toBe(true);
    expect(m.valid_action('fly')).toBe(false);                     // known, wrong state
    expect(m.valid_action('definitely_not_an_action')).toBe(false);
  });

  test('valid_transition() requires an existing, non-forced edge', () => {
    const m = jssm.from('a -> b; a ~> c;');
    expect(m.valid_transition('b')).toBe(true);
    expect(m.valid_transition('c')).toBe(false);                   // forced-only edge
    expect(m.valid_transition('never_heard_of_it')).toBe(false);   // no edge at all
  });

  test('valid_force_transition() accepts any existing edge, forced or not', () => {
    const m = jssm.from('a -> b; a ~> c;');
    expect(m.valid_force_transition('b')).toBe(true);
    expect(m.valid_force_transition('c')).toBe(true);
    expect(m.valid_force_transition('never_heard_of_it')).toBe(false);
  });

  test('a deserialized foreign state name leaves the machine inert, as before interning', () => {
    const machine_str = 'a -> b;';
    const m   = jssm.from(machine_str);
    const ser = m.serialize();
    ser.state = 'some_state_this_machine_never_had';

    const restored = jssm.deserialize(machine_str, ser);
    expect(restored.state()).toBe('some_state_this_machine_never_had');
    expect(restored.transition('b')).toBe(false);
    expect(restored.action('anything')).toBe(false);
    expect(restored.state()).toBe('some_state_this_machine_never_had');
  });

});

describe('interned hooks — unknown-name guards (#729)', () => {

  const noop = () => undefined;

  test('hooks registered for unknown states never fire and do not disturb the machine', () => {
    let fired = 0;
    const m = jssm.from('a -> b;');
    m.hook('nope', 'also_nope', () => { fired++; return undefined; });
    m.hook_entry('never_a_state', () => { fired++; return undefined; });
    m.hook_exit('never_a_state',  () => { fired++; return undefined; });
    expect(m.transition('b')).toBe(true);
    expect(fired).toBe(0);
    expect(m.state()).toBe('b');
  });

  test('removing a basic hook by unknown names reports false; by real names true', () => {
    const m = jssm.from('a -> b;');
    m.hook('a', 'b', noop);
    expect(m.remove_hook({ kind: 'hook', from: 'zzz', to: 'b',   handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'hook', from: 'a',   to: 'zzz', handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'hook', from: 'a',   to: 'b',   handler: noop })).toBe(true);
  });

  test('removing a named hook covers every unknown-name arm', () => {
    const m = jssm.from(`a 'go' -> b;`);
    m.hook_action('a', 'b', 'go', noop);
    expect(m.remove_hook({ kind: 'named', from: 'zzz', to: 'b',   action: 'go',  handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'named', from: 'a',   to: 'zzz', action: 'go',  handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'named', from: 'a',   to: 'b',   action: 'zzz', handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'named', from: 'a',   to: 'b',   action: 'go',  handler: noop })).toBe(true);
  });

  test('removing a post named hook covers every unknown-name arm', () => {
    const m = jssm.from(`a 'go' -> b;`);
    m.post_hook_action('a', 'b', 'go', noop);
    expect(m.remove_hook({ kind: 'post named', from: 'zzz', to: 'b',   action: 'go',  handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'post named', from: 'a',   to: 'zzz', action: 'go',  handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'post named', from: 'a',   to: 'b',   action: 'zzz', handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'post named', from: 'a',   to: 'b',   action: 'go',  handler: noop })).toBe(true);
  });

  test('removing post-mirror and global-action hooks by unknown names reports false', () => {
    const m = jssm.from(`a 'go' -> b;`);
    m.post_hook('a', 'b', noop);
    m.hook_global_action('go', noop);
    m.post_hook_global_action('go', noop);
    m.post_hook_entry('b', noop);
    m.post_hook_exit('a', noop);

    expect(m.remove_hook({ kind: 'post hook', from: 'zzz', to: 'b',   handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'post hook', from: 'a',   to: 'zzz', handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'global action',      action: 'zzz', handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'post global action', action: 'zzz', handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'entry',      to: 'zzz',   handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'exit',       from: 'zzz', handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'post entry', to: 'zzz',   handler: noop })).toBe(false);
    expect(m.remove_hook({ kind: 'post exit',  from: 'zzz', handler: noop })).toBe(false);

    expect(m.remove_hook({ kind: 'post hook', from: 'a', to: 'b',     handler: noop })).toBe(true);
    expect(m.remove_hook({ kind: 'global action',      action: 'go', handler: noop })).toBe(true);
    expect(m.remove_hook({ kind: 'post global action', action: 'go', handler: noop })).toBe(true);
    expect(m.remove_hook({ kind: 'post entry', to: 'b',   handler: noop })).toBe(true);
    expect(m.remove_hook({ kind: 'post exit',  from: 'a', handler: noop })).toBe(true);
  });

  test('hooks still fire in order across a full action cycle after re-keying', () => {
    const calls: Array<string> = [];
    const m = jssm.from(`a 'go' -> b 'back' -> a;`);
    m.hook('a', 'b',              () => { calls.push('basic'); return undefined; });
    m.hook_action('a', 'b', 'go', () => { calls.push('named'); return undefined; });
    m.hook_entry('b',             () => { calls.push('entry'); return undefined; });
    m.hook_exit('a',              () => { calls.push('exit');  return undefined; });
    m.post_hook('a', 'b',         () => { calls.push('post');  return undefined; });

    expect(m.action('go')).toBe(true);
    expect(calls).toEqual(['exit', 'named', 'basic', 'entry', 'post']);
    expect(m.action('back')).toBe(true);
    expect(m.state()).toBe('a');
  });

});
