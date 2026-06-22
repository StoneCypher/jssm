
import { sm, from as sm_from, Machine } from '../jssm';





describe('on/off/once basic mechanics', () => {

  test('on returns an unsubscribe function', () => {
    const m = sm`a -> b;`;
    let count = 0;
    const off = m.on('transition', () => { count++; });
    m.transition('b');
    expect(count).toBe(1);
    off();
    expect(m.is_terminal()).toBe(true);  // sanity
  });

  test('off removes a handler by reference', () => {
    const m = sm`a -> b -> c;`;
    let count = 0;
    const handler = () => { count++; };
    m.on('transition', handler);
    m.transition('b');
    expect(count).toBe(1);
    expect(m.off('transition', handler)).toBe(true);
    m.transition('c');
    expect(count).toBe(1);
  });

  test('off returns false when handler not registered', () => {
    const m = sm`a -> b;`;
    const fn = () => {};
    expect(m.off('transition', fn)).toBe(false);
    m.on('transition', () => {});
    expect(m.off('transition', fn)).toBe(false);
  });

  test('unsubscribe via the returned function', () => {
    const m = sm`a -> b -> c;`;
    let count = 0;
    const off = m.on('transition', () => { count++; });
    m.transition('b');
    expect(count).toBe(1);
    off();
    m.transition('c');
    expect(count).toBe(1);
  });

  test('once fires exactly one time', () => {
    const m = sm`a -> b -> c;`;
    let count = 0;
    m.once('transition', () => { count++; });
    m.transition('b');
    m.transition('c');
    expect(count).toBe(1);
  });

  test('once unsubscribe before fire prevents the single delivery', () => {
    const m = sm`a -> b;`;
    let count = 0;
    const off = m.once('transition', () => { count++; });
    off();
    m.transition('b');
    expect(count).toBe(0);
  });

  test('multiple handlers run in registration order', () => {
    const m = sm`a -> b;`;
    const log: number[] = [];
    m.on('transition', () => { log.push(1); });
    m.on('transition', () => { log.push(2); });
    m.on('transition', () => { log.push(3); });
    m.transition('b');
    expect(log).toEqual([1, 2, 3]);
  });

  test('throws when handler is not a function (no-filter form)', () => {
    const m = sm`a -> b;`;
    expect(() => (m as any).on('transition', undefined)).toThrow();
  });

  test('throws when handler is not a function (filter form)', () => {
    const m = sm`a -> b;`;
    expect(() => (m as any).on('transition', { from: 'a' }, 'not a function')).toThrow();
  });

  test('off returns false on an unknown event name', () => {
    const m = sm`a -> b;`;
    expect(m.off('transition', () => {})).toBe(false);
  });

});





describe('transition event', () => {

  test('fires with from/to/data/forced=false on a normal transition', () => {
    const m = sm_from<number>(`a -> b;`, { data: 7 });
    let received: any = null;
    m.on('transition', e => { received = e; });
    m.transition('b');
    expect(received.from).toBe('a');
    expect(received.to).toBe('b');
    expect(received.forced).toBe(false);
    expect(received.action).toBeUndefined();
  });

  test('fires with forced=true on a forced transition', () => {
    const m = sm`a ~> b;`;
    let forced = false;
    m.on('transition', e => { forced = e.forced; });
    m.force_transition('b');
    expect(forced).toBe(true);
  });

  test('fires with action name on an action-driven transition', () => {
    const m = sm`a 'next' -> b;`;
    let received: any = null;
    m.on('transition', e => { received = e; });
    m.action('next');
    expect(received.action).toBe('next');
    expect(received.to).toBe('b');
  });

  test('does NOT fire on a rejected transition', () => {
    const m = sm`a -> b;`;
    let count = 0;
    m.on('transition', () => { count++; });
    m.transition('c');  // c does not exist
    expect(count).toBe(0);
  });

});





describe('rejection event', () => {

  test('fires with reason=invalid when no edge exists', () => {
    const m = sm`a -> b;`;
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('c');
    expect(received.reason).toBe('invalid');
    expect(received.from).toBe('a');
    expect(received.to).toBe('c');
  });

  test('fires with reason=hook and hook_name when a hook vetoes', () => {
    const m = sm`a -> b;`;
    m.hook('a', 'b', () => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('b');
    expect(received.reason).toBe('hook');
    expect(received.hook_name).toBe('hook');
  });

  test('fires hook_name="any transition" when any-transition hook vetoes', () => {
    const m = sm`a -> b;`;
    m.hook_any_transition(() => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('b');
    expect(received.hook_name).toBe('any transition');
  });

  test('fires hook_name="exit" when exit hook vetoes', () => {
    const m = sm`a -> b;`;
    m.hook_exit('a', () => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('b');
    expect(received.hook_name).toBe('exit');
  });

  test('fires hook_name="entry" when entry hook vetoes', () => {
    const m = sm`a -> b;`;
    m.hook_entry('b', () => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('b');
    expect(received.hook_name).toBe('entry');
  });

  test('fires hook_name="standard transition" when standard-transition hook vetoes', () => {
    const m = sm`a -> b;`;
    m.hook_standard_transition(() => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('b');
    expect(received.hook_name).toBe('standard transition');
  });

  test('fires hook_name="main transition" when main-transition hook vetoes', () => {
    const m = sm`a => b;`;
    m.hook_main_transition(() => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('b');
    expect(received.hook_name).toBe('main transition');
  });

  test('fires hook_name="forced transition" when forced-transition hook vetoes', () => {
    const m = sm`a ~> b;`;
    m.hook_forced_transition(() => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.force_transition('b');
    expect(received.hook_name).toBe('forced transition');
  });

  test('fires hook_name="any action" when any-action hook vetoes', () => {
    const m = sm`a 'next' -> b;`;
    m.hook_any_action(() => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.action('next');
    expect(received.hook_name).toBe('any action');
  });

  test('fires hook_name="global action" when global-action hook vetoes', () => {
    const m = sm`a 'next' -> b;`;
    m.hook_global_action('next', () => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.action('next');
    expect(received.hook_name).toBe('global action');
  });

  test('fires hook_name="named" when named hook vetoes', () => {
    const m = sm`a 'next' -> b;`;
    m.hook_action('a', 'b', 'next', () => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.action('next');
    expect(received.hook_name).toBe('named');
  });

  test('fires hook_name="pre everything" when pre-everything hook vetoes', () => {
    const m = sm`a -> b;`;
    m.set_hook({ kind: 'pre everything', handler: () => false });
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('b');
    expect(received.hook_name).toBe('pre everything');
  });

  test('fires hook_name="everything" when everything hook vetoes', () => {
    const m = sm`a -> b;`;
    m.hook_everything(() => false);
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('b');
    expect(received.hook_name).toBe('everything');
  });

});





describe('action event', () => {

  test('fires whenever action() is called, with the action name', () => {
    const m = sm`a 'next' -> b;`;
    let received: any = null;
    m.on('action', e => { received = e; });
    m.action('next');
    expect(received.action).toBe('next');
    expect(received.from).toBe('a');
    expect(received.to).toBe('b');
  });

  test('fires even when the action would be invalid (no such edge)', () => {
    const m = sm`a 'next' -> b;`;
    let fired = false;
    m.on('action', () => { fired = true; });
    m.action('nonexistent');
    expect(fired).toBe(true);
  });

  test('does NOT fire on non-action transitions', () => {
    const m = sm`a -> b;`;
    let count = 0;
    m.on('action', () => { count++; });
    m.transition('b');
    expect(count).toBe(0);
  });

});





describe('entry / exit events', () => {

  test('entry fires after a successful transition, with the new state', () => {
    const m = sm`a -> b;`;
    let received: any = null;
    m.on('entry', e => { received = e; });
    m.transition('b');
    expect(received.state).toBe('b');
    expect(received.from).toBe('a');
  });

  test('exit fires after a successful transition, with the old state', () => {
    const m = sm`a -> b;`;
    let received: any = null;
    m.on('exit', e => { received = e; });
    m.transition('b');
    expect(received.state).toBe('a');
    expect(received.to).toBe('b');
  });

  test('entry filter by state matches', () => {
    const m = sm`a -> b -> c;`;
    let received: any = null;
    m.on('entry', { state: 'c' }, e => { received = e; });
    m.transition('b');
    expect(received).toBeNull();
    m.transition('c');
    expect(received.state).toBe('c');
  });

  test('exit filter by state matches', () => {
    const m = sm`a -> b -> c;`;
    let received: any = null;
    m.on('exit', { state: 'b' }, e => { received = e; });
    m.transition('b');
    expect(received).toBeNull();
    m.transition('c');
    expect(received.state).toBe('b');
  });

});





describe('transition filter semantics', () => {

  test('filter {from} matches only the named source state', () => {
    const m = sm`a -> b -> c;`;
    let received: any = null;
    m.on('transition', { from: 'b' }, e => { received = e; });
    m.transition('b');
    expect(received).toBeNull();
    m.transition('c');
    expect(received.from).toBe('b');
  });

  test('filter {to} matches only the named target state', () => {
    const m = sm`a -> b -> c;`;
    let received: any = null;
    m.on('transition', { to: 'c' }, e => { received = e; });
    m.transition('b');
    expect(received).toBeNull();
    m.transition('c');
    expect(received.to).toBe('c');
  });

  test('filter {from,to} matches only when both keys match', () => {
    const m = sm`a -> b -> c;`;
    let received: any = null;
    m.on('transition', { from: 'b', to: 'c' }, e => { received = e; });
    m.transition('b');
    expect(received).toBeNull();
    m.transition('c');
    expect(received.from).toBe('b');
    expect(received.to).toBe('c');
  });

  test('empty filter object {} matches everything', () => {
    const m = sm`a -> b -> c;`;
    let count = 0;
    m.on('transition', {}, () => { count++; });
    m.transition('b');
    m.transition('c');
    expect(count).toBe(2);
  });

  test('once with filter only fires on a match', () => {
    const m = sm`a -> b -> c;`;
    let received: any = null;
    m.once('transition', { from: 'b' }, e => { received = e; });
    m.transition('b');         // does not match (from=a)
    expect(received).toBeNull();
    m.transition('c');         // matches (from=b)
    expect(received.from).toBe('b');
  });

});





describe('terminal / complete events', () => {

  test('terminal fires when entering a state with no exits', () => {
    const m = sm`a -> b;`;
    let received: any = null;
    m.on('terminal', e => { received = e; });
    m.transition('b');
    expect(received.state).toBe('b');
  });

  test('terminal does NOT fire when entering a non-terminal state', () => {
    const m = sm`a -> b -> c;`;
    let count = 0;
    m.on('terminal', () => { count++; });
    m.transition('b');
    expect(count).toBe(0);
  });

  test('complete fires when entering a complete state', () => {
    const m = new Machine({
      start_states : ['a'],
      transitions  : [{ from: 'a', to: 'b', kind: 'legal', forced_only: false, main_path: false }],
      complete     : ['b']
    } as any);
    let received: any = null;
    m.on('complete', e => { received = e; });
    m.transition('b');
    expect(received.state).toBe('b');
  });

  test('complete does NOT fire when entering a non-complete state', () => {
    const m = new Machine({
      start_states : ['a'],
      transitions  : [
        { from: 'a', to: 'b', kind: 'legal', forced_only: false, main_path: false },
        { from: 'b', to: 'c', kind: 'legal', forced_only: false, main_path: false }
      ],
      complete     : ['c']
    } as any);
    let count = 0;
    m.on('complete', () => { count++; });
    m.transition('b');
    expect(count).toBe(0);
  });

});





describe('override event', () => {

  test('fires when override() is called', () => {
    const m = sm_from(`allows_override: true; a -> b;`);
    let received: any = null;
    m.on('override', e => { received = e; });
    m.override('b');
    expect(received.from).toBe('a');
    expect(received.to).toBe('b');
  });

  test('data-change fires alongside override when data changes', () => {
    const m = sm_from<number>(`allows_override: true; a -> b;`, { data: 1 });
    let received: any = null;
    m.on('data-change', e => { received = e; });
    m.override('b', 42);
    expect(received.cause).toBe('override');
    expect(received.old_data).toBe(1);
    expect(received.new_data).toBe(42);
  });

  test('data-change does NOT fire when override leaves data unchanged', () => {
    const m = sm_from<number>(`allows_override: true; a -> b;`, { data: 5 });
    let count = 0;
    m.on('data-change', () => { count++; });
    m.override('b', 5);
    expect(count).toBe(0);
  });

});





describe('data-change event', () => {

  test('fires when transition supplies new data', () => {
    const m = sm_from<number>(`a -> b;`, { data: 1 });
    let received: any = null;
    m.on('data-change', e => { received = e; });
    m.transition('b', 7);
    expect(received.cause).toBe('transition');
    expect(received.old_data).toBe(1);
    expect(received.new_data).toBe(7);
  });

  test('does NOT fire when transition leaves data unchanged', () => {
    const m = sm_from<number>(`a -> b;`, { data: 1 });
    let count = 0;
    m.on('data-change', () => { count++; });
    m.transition('b');
    expect(count).toBe(0);
  });

});





describe('error event', () => {

  test('handler that throws does not block subsequent handlers', () => {
    const m = sm`a -> b;`;
    let later_ran = false;
    m.on('transition', () => { throw new Error('boom'); });
    m.on('transition', () => { later_ran = true; });
    m.transition('b');
    expect(later_ran).toBe(true);
  });

  test('throwing handler is re-emitted as an error event', () => {
    const m = sm`a -> b;`;
    const offender = () => { throw new Error('boom'); };
    let captured: any = null;
    m.on('error', e => { captured = e; });
    m.on('transition', offender);
    m.transition('b');
    expect(captured).not.toBeNull();
    expect(captured.source_event).toBe('transition');
    expect(captured.handler).toBe(offender);
    expect((captured.error as Error).message).toBe('boom');
  });

  test('error handler that throws does not recurse', () => {
    const m = sm`a -> b;`;
    // suppress console.error noise while the recursion guard kicks in
    const orig = console.error;
    console.error = () => {};
    try {
      m.on('error', () => { throw new Error('inner'); });
      m.on('transition', () => { throw new Error('outer'); });
      expect(() => m.transition('b')).not.toThrow();
    } finally {
      console.error = orig;
    }
  });

});





describe('hook-registration / hook-removal events', () => {

  test('hook-registration fires when set_hook is called', () => {
    const m = sm`a -> b;`;
    let received: any = null;
    m.on('hook-registration', e => { received = e; });
    m.set_hook({ kind: 'hook', from: 'a', to: 'b', handler: () => true });
    expect(received).not.toBeNull();
    expect(received.description.kind).toBe('hook');
  });

  test('hook-registration fires for fluent hook helpers too', () => {
    const m = sm`a -> b;`;
    const log: string[] = [];
    m.on('hook-registration', e => { log.push(e.description.kind); });
    m.hook_entry('b', () => true);
    m.hook_exit('a', () => true);
    expect(log).toContain('entry');
    expect(log).toContain('exit');
  });

  test('remove_hook fires hook-removal and returns true on success', () => {
    const m = sm`a -> b;`;
    const fn = () => true;
    m.set_hook({ kind: 'hook', from: 'a', to: 'b', handler: fn });
    let received: any = null;
    m.on('hook-removal', e => { received = e; });
    const ok = m.remove_hook({ kind: 'hook', from: 'a', to: 'b', handler: fn });
    expect(ok).toBe(true);
    expect(received.description.kind).toBe('hook');
  });

  test('remove_hook returns false (and does not fire) when nothing to remove', () => {
    const m = sm`a -> b;`;
    let count = 0;
    m.on('hook-removal', () => { count++; });
    const ok = m.remove_hook({ kind: 'hook', from: 'a', to: 'b', handler: () => true });
    expect(ok).toBe(false);
    expect(count).toBe(0);
  });

  test('remove_hook covers every documented hook kind', () => {
    const m = sm`a 'next' -> b;`;
    const noop: any = () => true;

    // register & remove every kind to walk the switch
    const descs: any[] = [
      { kind: 'hook',                        from: 'a', to: 'b', handler: noop },
      { kind: 'named',                       from: 'a', to: 'b', action: 'next', handler: noop },
      { kind: 'global action',               action: 'next',                     handler: noop },
      { kind: 'any action',                                                      handler: noop },
      { kind: 'standard transition',                                             handler: noop },
      { kind: 'main transition',                                                 handler: noop },
      { kind: 'forced transition',                                               handler: noop },
      { kind: 'any transition',                                                  handler: noop },
      { kind: 'entry',                       to: 'b',                            handler: noop },
      { kind: 'exit',                        from: 'a',                          handler: noop },
      { kind: 'after',                       from: 'a',                          handler: noop },
      { kind: 'post hook',                   from: 'a', to: 'b',                 handler: noop },
      { kind: 'post named',                  from: 'a', to: 'b', action: 'next', handler: noop },
      { kind: 'post global action',          action: 'next',                     handler: noop },
      { kind: 'post any action',                                                 handler: noop },
      { kind: 'post standard transition',                                        handler: noop },
      { kind: 'post main transition',                                            handler: noop },
      { kind: 'post forced transition',                                          handler: noop },
      { kind: 'post any transition',                                             handler: noop },
      { kind: 'post entry',                  to: 'b',                            handler: noop },
      { kind: 'post exit',                   from: 'a',                          handler: noop },
      { kind: 'pre everything',                                                  handler: noop },
      { kind: 'everything',                                                      handler: noop },
      { kind: 'pre post everything',                                             handler: noop },
      { kind: 'post everything',                                                 handler: noop }
    ];

    descs.forEach(d => {
      m.set_hook(d);
      expect(m.remove_hook(d)).toBe(true);
      // second removal returns false: covers the "already empty" branches
      expect(m.remove_hook(d)).toBe(false);
    });
  });

  test('remove_hook throws on unknown kind', () => {
    const m = sm`a -> b;`;
    expect(() => m.remove_hook({ kind: 'Smaug', from: 'a', to: 'b', handler: () => true } as any))
      .toThrow();
  });

  test('remove_hook named returns false when from has no map yet', () => {
    const m = sm`a 'next' -> b;`;
    expect(
      m.remove_hook({ kind: 'named', from: 'a', to: 'b', action: 'next', handler: () => true })
    ).toBe(false);
  });

  test('remove_hook named returns false when from has map but no inner for to', () => {
    const m = sm`a 'next' -> b 'next' -> c;`;
    // register a named hook a->b/next so the outer map exists for 'a' but
    // not the inner for the (a, c) edge that we'll try to remove next
    m.set_hook({ kind: 'named', from: 'a', to: 'b', action: 'next', handler: () => true });
    expect(
      m.remove_hook({ kind: 'named', from: 'a', to: 'c', action: 'next', handler: () => true })
    ).toBe(false);
  });

  test('remove_hook post named returns false when from has no map yet', () => {
    const m = sm`a 'next' -> b;`;
    expect(
      m.remove_hook({ kind: 'post named', from: 'a', to: 'b', action: 'next', handler: () => true })
    ).toBe(false);
  });

  test('remove_hook post named returns false when from has map but no inner for to', () => {
    const m = sm`a 'next' -> b 'next' -> c;`;
    m.set_hook({ kind: 'post named', from: 'a', to: 'b', action: 'next', handler: () => true });
    expect(
      m.remove_hook({ kind: 'post named', from: 'a', to: 'c', action: 'next', handler: () => true })
    ).toBe(false);
  });

});





describe('timeout event', () => {

  test('fires when an after-mapping timer triggers', async () => {
    const m = sm_from(`a after 10ms -> b;`);
    let received: any = null;
    m.on('timeout', e => { received = e; });
    await new Promise(r => setTimeout(r, 100));
    expect(received).not.toBeNull();
    expect(received.from).toBe('a');
    expect(received.to).toBe('b');
    expect(received.after_time).toBe(10);
  });

});





describe('multiple events on a single transition', () => {

  test('exit then transition then entry order', () => {
    const m = sm`a -> b;`;
    const order: string[] = [];
    m.on('exit', () => { order.push('exit'); });
    m.on('transition', () => { order.push('transition'); });
    m.on('entry', () => { order.push('entry'); });
    m.transition('b');
    expect(order).toEqual(['exit', 'transition', 'entry']);
  });

});

describe('observation events under the listener-count gate', () => {

  test('a listener installed by a pre-hook still receives the transition event', () => {
    const m = sm`a -> b;`;
    let seen = 0;
    // The hook subscribes mid-transition; the gate is read AFTER pre-hooks
    // run, so this subscription must still be observed for this same transition.
    m.hook('a', 'b', () => {
      m.on('transition', () => { seen++; });
      return true;
    });
    m.transition('b');
    expect(seen).toBe(1);
  });

  test('transitions with no listeners still mutate state and data', () => {
    const m = sm_from<number>('a -> b;', { data: 1 });
    expect(m.transition('b', 2)).toBe(true);
    expect(m.state()).toBe('b');
    expect(m.data()).toBe(2);
  });

});

describe('_event_listener_count bookkeeping', () => {

  test('tracks live subscriptions across on/off/once/unsubscribe', () => {
    const m = sm`a -> b -> c -> d;`;
    const internal = m as unknown as { _event_listener_count: number };

    expect(internal._event_listener_count).toBe(0);

    const off1 = m.on('transition', () => {});
    expect(internal._event_listener_count).toBe(1);

    const fn = () => {};
    m.on('entry', fn);
    expect(internal._event_listener_count).toBe(2);

    m.once('exit', () => {});
    expect(internal._event_listener_count).toBe(3);

    // off() by reference decrements
    expect(m.off('entry', fn)).toBe(true);
    expect(internal._event_listener_count).toBe(2);

    // unsubscribe closure decrements
    off1();
    expect(internal._event_listener_count).toBe(1);

    // calling the same unsubscribe closure again must NOT decrement past the
    // real removal (idempotent — exercises the Set.delete === false path)
    off1();
    expect(internal._event_listener_count).toBe(1);

    // once auto-removal on fire decrements the remaining 'exit' listener
    m.transition('b');
    expect(internal._event_listener_count).toBe(0);
  });

});




describe('action/rejection listener-count gate (perf #671)', () => {

  // --- action gate: zero-listener branch ---

  test('action() with no listeners still mutates state (gate skip path)', () => {
    // Exercises the wasAction=true / _event_listener_count===0 branch: the
    // inner _fire('action') is skipped but the transition must still succeed.
    const m = sm`a 'go' -> b;`;
    const internal = m as unknown as { _event_listener_count: number };
    expect(internal._event_listener_count).toBe(0);
    const result = m.action('go');
    expect(result).toBe(true);
    expect(m.state()).toBe('b');
  });

  // --- action gate: non-zero-listener branch ---

  test('action() with an action listener fires the event (gate live path)', () => {
    // Exercises the wasAction=true / _event_listener_count!==0 branch: a
    // subscribed handler must receive the 'action' event.
    const m = sm`a 'go' -> b;`;
    let received: any = null;
    m.on('action', e => { received = e; });
    m.action('go');
    expect(received).not.toBeNull();
    expect(received.action).toBe('go');
    expect(received.from).toBe('a');
    expect(received.to).toBe('b');
  });

  // --- rejection gate (invalid path): zero-listener branch ---

  test('invalid transition with no listeners does not throw (gate skip path)', () => {
    // Exercises the invalid / _event_listener_count===0 branch: the inner
    // _fire('rejection') is skipped but transition() must return false cleanly.
    const m = sm`a -> b;`;
    const internal = m as unknown as { _event_listener_count: number };
    expect(internal._event_listener_count).toBe(0);
    expect(() => m.transition('c')).not.toThrow();
    expect(m.transition('c')).toBe(false);
    expect(m.state()).toBe('a');
  });

  // --- rejection gate (invalid path): non-zero-listener branch ---

  test('invalid transition with a rejection listener still fires it (gate live path)', () => {
    // Exercises the invalid / _event_listener_count!==0 branch: a subscribed
    // handler must receive the 'rejection' event even though the transition
    // was invalid.
    const m = sm`a -> b;`;
    let received: any = null;
    m.on('rejection', e => { received = e; });
    m.transition('c');   // no edge a->c
    expect(received).not.toBeNull();
    expect(received.reason).toBe('invalid');
    expect(received.from).toBe('a');
    expect(received.to).toBe('c');
  });

});
