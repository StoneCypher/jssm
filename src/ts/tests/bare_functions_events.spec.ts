
import { describe, test, expect } from 'vitest';

import { sm, from as sm_from, on, once, off } from '../jssm';





// Direct tests of the events family as bare functions.  Every expected value
// here is known from the FSL text and the subscription sequence, never read
// back from the machine under test.  The class delegates (`m.on(...)` etc.)
// are covered by events.spec.ts; these exercise the function surface.

describe('bare functions — events family', () => {



  describe('on', () => {

    test('subscribes to transition events and the returned unsubscribe stops them', () => {
      const m    = sm`a -> b -> c;`;
      const seen: string[] = [];
      const unsub = on(m, 'transition', ev => { seen.push(ev.to); });
      m.transition('b');
      unsub();
      m.transition('c');
      expect(seen).toEqual(['b']);
    });

    test('delivers the transition detail with from, to, forced, and action', () => {
      const m = sm_from<number>(`a 'next' -> b;`, { data: 7 });
      let received: any = null;
      on(m, 'transition', ev => { received = ev; });
      m.action('next');
      expect(received.from).toBe('a');
      expect(received.to).toBe('b');
      expect(received.forced).toBe(false);
      expect(received.action).toBe('next');
    });

    test('the three-argument form inserts a filter that skips non-matching deliveries', () => {
      const m = sm`a -> b -> c;`;
      const seen: string[] = [];
      on(m, 'transition', { to: 'c' }, ev => { seen.push(ev.to); });
      m.transition('b');
      m.transition('c');
      expect(seen).toEqual(['c']);
    });

    test('an entry filter on a state fires only when that state is entered', () => {
      const m = sm`a -> b -> c;`;
      const seen: string[] = [];
      on(m, 'entry', { state: 'c' }, ev => { seen.push(ev.state); });
      m.transition('b');
      m.transition('c');
      expect(seen).toEqual(['c']);
    });

    test('handlers run in registration order', () => {
      const m   = sm`a -> b;`;
      const log: number[] = [];
      on(m, 'transition', () => { log.push(1); });
      on(m, 'transition', () => { log.push(2); });
      on(m, 'transition', () => { log.push(3); });
      m.transition('b');
      expect(log).toEqual([1, 2, 3]);
    });

    test('a throwing handler is re-emitted as an error event naming the source event', () => {
      const m = sm`a -> b;`;
      const boom = () => { throw new Error('boom'); };
      let received: any = null;
      on(m, 'transition', boom);
      on(m, 'error', ev => { received = ev; });
      m.transition('b');
      expect(received.source_event).toBe('transition');
      expect(received.handler).toBe(boom);
      expect(received.error.message).toBe('boom');
    });

    test('a throwing handler does not stop later handlers', () => {
      const m = sm`a -> b;`;
      let later = 0;
      on(m, 'transition', () => { throw new Error('first'); });
      on(m, 'transition', () => { later += 1; });
      m.transition('b');
      expect(later).toBe(1);
    });

    test('throws when the handler is not a function (no-filter form)', () => {
      const m = sm`a -> b;`;
      expect(() => (on as any)(m, 'transition', undefined)).toThrow();
    });

    test('throws when the handler is not a function (filter form)', () => {
      const m = sm`a -> b;`;
      expect(() => (on as any)(m, 'transition', { from: 'a' }, 'not a function')).toThrow();
    });

  });



  describe('once', () => {

    test('fires exactly one time', () => {
      const m = sm`a -> b -> c;`;
      let count = 0;
      once(m, 'transition', () => { count += 1; });
      m.transition('b');
      m.transition('c');
      expect(count).toBe(1);
    });

    test('unsubscribing before the delivery prevents it', () => {
      const m = sm`a -> b;`;
      let count = 0;
      const unsub = once(m, 'transition', () => { count += 1; });
      unsub();
      m.transition('b');
      expect(count).toBe(0);
    });

    test('the filter form waits for the first matching delivery', () => {
      const m = sm`a -> b -> c;`;
      const seen: string[] = [];
      once(m, 'transition', { to: 'c' }, ev => { seen.push(ev.to); });
      m.transition('b');
      m.transition('c');
      expect(seen).toEqual(['c']);
    });

  });



  describe('off', () => {

    test('removes a handler by reference and reports whether it was present', () => {
      const m = sm`a -> b;`;
      const h = () => {};
      on(m, 'transition', h);
      expect(off(m, 'transition', h)).toBe(true);
      expect(off(m, 'transition', h)).toBe(false);
    });

    test('a removed handler no longer receives deliveries', () => {
      const m = sm`a -> b -> c;`;
      let count = 0;
      const h = () => { count += 1; };
      on(m, 'transition', h);
      m.transition('b');
      off(m, 'transition', h);
      m.transition('c');
      expect(count).toBe(1);
    });

    test('reports false on an event name nothing was ever subscribed to', () => {
      const m = sm`a -> b;`;
      expect(off(m, 'transition', () => {})).toBe(false);
    });

  });



  describe('the function and the method share one subscription table', () => {

    test('a subscription made with on() is visible to the class method off()', () => {
      const m = sm`a -> b;`;
      const h = () => {};
      on(m, 'transition', h);
      expect(m.off('transition', h)).toBe(true);
    });

    test('a subscription made with the class method is removable with off()', () => {
      const m = sm`a -> b;`;
      const h = () => {};
      m.on('transition', h);
      expect(off(m, 'transition', h)).toBe(true);
    });

  });



  // The class keeps `_fire_one`, `_fire`, and `_has_subscribers` as
  // underscore delegates for transition_impl (until Task 3) and for the
  // existing tests that reach them by name.  `fire` now dispatches through
  // the family's `fire_one` directly, so the `_fire_one` delegate is only
  // reachable by calling it, which these do.

  describe('the class dispatch delegates', () => {

    test('_fire_one delivers the detail to one registered entry', () => {
      const m = sm`a -> b;`;
      const seen: any[] = [];
      on(m, 'transition', ev => { seen.push(ev); });
      const set     = m._event_handlers.get('transition');
      const [entry] = set;
      const detail  = { from: 'a', to: 'b', trans_type: 'legal', forced: false, data: undefined };
      m._fire_one(entry, set, 'transition', detail);
      expect(seen).toEqual([detail]);
      expect(set.has(entry)).toBe(true);
    });

    test('_fire_one removes a once entry from its set before delivering', () => {
      const m = sm`a -> b;`;
      let count = 0;
      once(m, 'transition', () => { count += 1; });
      const set     = m._event_handlers.get('transition');
      const [entry] = set;
      m._fire_one(entry, set, 'transition', { from: 'a', to: 'b', trans_type: 'legal', forced: false, data: undefined });
      expect(count).toBe(1);
      expect(set.has(entry)).toBe(false);
    });

    test('_fire_one skips an entry whose filter does not match the detail', () => {
      const m = sm`a -> b;`;
      let count = 0;
      on(m, 'transition', { to: 'c' }, () => { count += 1; });
      const set     = m._event_handlers.get('transition');
      const [entry] = set;
      m._fire_one(entry, set, 'transition', { from: 'a', to: 'b', trans_type: 'legal', forced: false, data: undefined });
      expect(count).toBe(0);
    });

    test('_has_subscribers and _fire agree with the function forms', () => {
      const m = sm`a -> b;`;
      expect(m._has_subscribers('transition')).toBe(false);
      let seen: any = null;
      on(m, 'transition', ev => { seen = ev; });
      expect(m._has_subscribers('transition')).toBe(true);
      m._fire('transition', { from: 'a', to: 'b', trans_type: 'legal', forced: false, data: undefined });
      expect(seen).toEqual({ from: 'a', to: 'b', trans_type: 'legal', forced: false, data: undefined });
    });

  });



});
