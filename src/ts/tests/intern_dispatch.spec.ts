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
