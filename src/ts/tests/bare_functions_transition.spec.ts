
import { describe, test, expect } from 'vitest';

import {
  sm, from as sm_from,
  transition, go, force_transition, act, action, override,
  valid_action, valid_transition, valid_force_transition,
  on,
  JssmError
} from '../jssm';





// Direct tests of the transition family as bare functions.  Every expected
// value is written out from the FSL text and the call sequence; nothing here
// is computed by the code under test.  Data reads go through the class's
// `m.data()` until the data family lands (Task 5 of the bare-functions plan).

describe('bare functions — transition family', () => {



  describe('transition', () => {

    test('moves along a declared edge and reports true', () => {
      const m = sm`a -> b -> c;`;
      expect(transition(m, 'b')).toBe(true);
      expect(m.state()).toBe('b');
    });

    test('refuses an undeclared edge, leaves the state, reports false', () => {
      const m = sm`a -> b -> c;`;
      expect(transition(m, 'c')).toBe(false);
      expect(m.state()).toBe('a');
    });

    test('refuses a forced-only edge', () => {
      const m = sm`a ~> b;`;
      expect(transition(m, 'b')).toBe(false);
      expect(m.state()).toBe('a');
    });

    test('refuses a state that does not exist', () => {
      const m = sm`a -> b;`;
      expect(transition(m, 'zed')).toBe(false);
      expect(m.state()).toBe('a');
    });

    test('is vetoed by a rejecting hook, and reports false', () => {
      const m = sm`a -> b;`;
      m.hook('a', 'b', () => false);
      expect(transition(m, 'b')).toBe(false);
      expect(m.state()).toBe('a');
    });

  });



  describe('go', () => {

    test('is transition: same result and same resulting state', () => {
      const m1 = sm`a -> b -> c;`;
      const m2 = sm`a -> b -> c;`;
      expect(go(m1, 'b')).toBe(true);
      expect(transition(m2, 'b')).toBe(true);
      expect(m1.state()).toBe('b');
      expect(m2.state()).toBe('b');
      expect(go(m1, 'a')).toBe(false);
      expect(transition(m2, 'a')).toBe(false);
      expect(m1.state()).toBe('b');
      expect(m2.state()).toBe('b');
    });

  });



  describe('force_transition', () => {

    test('succeeds on a forced-only edge that transition refuses', () => {
      const m = sm`a ~> b;`;
      expect(transition(m, 'b')).toBe(false);
      expect(force_transition(m, 'b')).toBe(true);
      expect(m.state()).toBe('b');
    });

    test('also succeeds on a plain edge (any existing edge qualifies)', () => {
      const m = sm`a -> b;`;
      expect(force_transition(m, 'b')).toBe(true);
      expect(m.state()).toBe('b');
    });

    test('fails where no edge exists at all', () => {
      const m = sm`a ~> b -> c;`;
      expect(force_transition(m, 'c')).toBe(false);
      expect(m.state()).toBe('a');
    });

    test('fires the transition event with forced true', () => {
      const m = sm`a ~> b;`;
      let forced: boolean | undefined;
      on(m, 'transition', ev => { forced = ev.forced; });
      force_transition(m, 'b');
      expect(forced).toBe(true);
    });

  });



  describe('act and action', () => {

    test('act fires a named action from the current state', () => {
      const m = sm`a 'next' -> b 'next' -> c;`;
      expect(act(m, 'next')).toBe(true);
      expect(m.state()).toBe('b');
      expect(act(m, 'next')).toBe(true);
      expect(m.state()).toBe('c');
    });

    test('act returns false for an unknown action and leaves the state', () => {
      const m = sm`a 'next' -> b;`;
      expect(act(m, 'dance')).toBe(false);
      expect(m.state()).toBe('a');
    });

    test('act returns false for an action the current state does not have', () => {
      const m = sm`a 'next' -> b 'back' -> a;`;
      expect(act(m, 'back')).toBe(false);
      expect(m.state()).toBe('a');
    });

    test('action is the same function object as act', () => {
      expect(action).toBe(act);
    });

    test('action fires the action event with the action name', () => {
      const m = sm`a 'next' -> b;`;
      const seen: string[] = [];
      on(m, 'action', ev => { seen.push(ev.action); });
      action(m, 'next');
      expect(seen).toStrictEqual(['next']);
    });

  });



  describe('override', () => {

    test('teleports to any existing state when the machine allows override', () => {
      const m = sm`allows_override: true; a -> b -> c;`;
      override(m, 'c');
      expect(m.state()).toBe('c');
      override(m, 'a');
      expect(m.state()).toBe('a');
    });

    test('keeps the data when the data argument is omitted', () => {
      const m = sm_from(`allows_override: true; a -> b;`, { data: 'kept' });
      override(m, 'b');
      expect(m.data()).toBe('kept');
    });

    test('replaces the data when a data argument is given, including an explicit undefined', () => {
      const m1 = sm_from(`allows_override: true; a -> b;`, { data: 'old' });
      override(m1, 'b', 'new');
      expect(m1.data()).toBe('new');

      const m2 = sm_from(`allows_override: true; a -> b;`, { data: 'old' });
      override(m2, 'b', undefined);
      expect(m2.data()).toBe(undefined);
    });

    test('fires the override event naming both ends', () => {
      const m = sm`allows_override: true; a -> b;`;
      const seen: Array<[string, string]> = [];
      on(m, 'override', ev => { seen.push([ev.from, ev.to]); });
      override(m, 'b');
      expect(seen).toStrictEqual([ ['a', 'b'] ]);
    });

    test('throws a JssmError when the machine does not allow override', () => {
      const m = sm`a -> b;`;
      expect(() => override(m, 'b')).toThrow(JssmError);
      expect(m.state()).toBe('a');
    });

    test('throws a JssmError for a state that does not exist', () => {
      const m = sm`allows_override: true; a -> b;`;
      expect(() => override(m, 'zed')).toThrow(JssmError);
      expect(m.state()).toBe('a');
    });

  });



  describe('valid_transition, valid_force_transition, valid_action', () => {

    test('valid_transition predicts transition without moving the machine', () => {
      const m = sm`a -> b; a ~> c;`;
      expect(valid_transition(m, 'b')).toBe(true);
      expect(valid_transition(m, 'c')).toBe(false);
      expect(valid_transition(m, 'zed')).toBe(false);
      expect(m.state()).toBe('a');
      expect(transition(m, 'b')).toBe(true);
    });

    test('valid_force_transition predicts force_transition without moving the machine', () => {
      const m = sm`a -> b; a ~> c; d -> e;`;
      expect(valid_force_transition(m, 'b')).toBe(true);
      expect(valid_force_transition(m, 'c')).toBe(true);
      expect(valid_force_transition(m, 'e')).toBe(false);
      expect(m.state()).toBe('a');
      expect(force_transition(m, 'c')).toBe(true);
    });

    test('valid_action predicts act without moving the machine', () => {
      const m = sm`a 'next' -> b 'back' -> a;`;
      expect(valid_action(m, 'next')).toBe(true);
      expect(valid_action(m, 'back')).toBe(false);
      expect(valid_action(m, 'dance')).toBe(false);
      expect(m.state()).toBe('a');
      expect(act(m, 'next')).toBe(true);
      expect(valid_action(m, 'back')).toBe(true);
    });

  });



  // The fsl#1264 rule: provision is detected by arity.  An omitted data
  // argument preserves the data; an explicit `undefined` commits `undefined`.

  describe('data provision by arity (fsl#1264)', () => {

    test('transition(m, s) keeps the data; transition(m, s, undefined) clears it', () => {
      const m1 = sm_from(`a -> b;`, { data: 1 });
      expect(transition(m1, 'b')).toBe(true);
      expect(m1.data()).toBe(1);

      const m2 = sm_from(`a -> b;`, { data: 1 });
      expect(transition(m2, 'b', undefined)).toBe(true);
      expect(m2.data()).toBe(undefined);
    });

    test('transition(m, s, x) commits x, even a falsy x', () => {
      const m = sm_from<number | null>(`a -> b -> c;`, { data: 1 });
      expect(transition(m, 'b', 0)).toBe(true);
      expect(m.data()).toBe(0);
      expect(transition(m, 'c', null)).toBe(true);
      expect(m.data()).toBe(null);
    });

    test('go follows the same rule', () => {
      const m1 = sm_from(`a -> b;`, { data: 'x' });
      go(m1, 'b');
      expect(m1.data()).toBe('x');

      const m2 = sm_from(`a -> b;`, { data: 'x' });
      go(m2, 'b', undefined);
      expect(m2.data()).toBe(undefined);
    });

    test('force_transition follows the same rule', () => {
      const m1 = sm_from(`a ~> b;`, { data: 3 });
      force_transition(m1, 'b');
      expect(m1.data()).toBe(3);

      const m2 = sm_from(`a ~> b;`, { data: 3 });
      force_transition(m2, 'b', undefined);
      expect(m2.data()).toBe(undefined);
    });

    test('act follows the same rule', () => {
      const m1 = sm_from(`a 'step' -> b;`, { data: 'x' });
      act(m1, 'step');
      expect(m1.data()).toBe('x');

      const m2 = sm_from(`a 'step' -> b;`, { data: 'x' });
      act(m2, 'step', undefined);
      expect(m2.data()).toBe(undefined);

      const m3 = sm_from(`a 'step' -> b;`, { data: 'x' });
      act(m3, 'step', 'y');
      expect(m3.data()).toBe('y');
    });

  });



  // The class keeps every member as a delegate.  `act` is new on the class;
  // `do` stays (deprecated, fsl#1992) and `action` stays, all three the same
  // dispatch.

  describe('the class side', () => {

    test('m.act fires an action', () => {
      const m = sm`a 'go' -> b;`;
      expect(m.act('go')).toBe(true);
      expect(m.state()).toBe('b');
    });

    test('m.do still works and has the same effect as m.action', () => {
      const m1 = sm`a 'go' -> b 'go' -> c;`;
      const m2 = sm`a 'go' -> b 'go' -> c;`;
      expect(m1.do('go')).toBe(true);
      expect(m2.action('go')).toBe(true);
      expect(m1.state()).toBe('b');
      expect(m2.state()).toBe('b');
      expect(m1.do('nope')).toBe(false);
      expect(m2.action('nope')).toBe(false);
      expect(m1.state()).toBe('b');
      expect(m2.state()).toBe('b');
    });

    test('m.act, m.do, and m.action all keep the arity rule for data', () => {
      const kept    = sm_from(`a 'go' -> b 'go' -> c 'go' -> d;`, { data: 7 });
      kept.act('go');
      kept.do('go');
      kept.action('go');
      expect(kept.data()).toBe(7);

      const cleared = sm_from(`a 'go' -> b;`, { data: 7 });
      cleared.act('go', undefined);
      expect(cleared.data()).toBe(undefined);
    });

    test('the class delegates for transition, go, and force_transition agree with the functions', () => {
      const via_class = sm`a ~> b -> c -> a;`;
      const via_fns   = sm`a ~> b -> c -> a;`;
      expect(via_class.transition('b')).toBe(transition(via_fns, 'b'));
      expect(via_class.force_transition('b')).toBe(force_transition(via_fns, 'b'));
      expect(via_class.go('c')).toBe(go(via_fns, 'c'));
      expect(via_class.state()).toBe('c');
      expect(via_fns.state()).toBe('c');
    });

    test('the class delegates for override and the valid_* predicates agree with the functions', () => {
      const via_class = sm`allows_override: true; a 'go' -> b; a ~> c;`;
      const via_fns   = sm`allows_override: true; a 'go' -> b; a ~> c;`;
      expect(via_class.valid_transition('b')).toBe(valid_transition(via_fns, 'b'));
      expect(via_class.valid_force_transition('c')).toBe(valid_force_transition(via_fns, 'c'));
      expect(via_class.valid_action('go')).toBe(valid_action(via_fns, 'go'));
      via_class.override('c');
      override(via_fns, 'c');
      expect(via_class.state()).toBe('c');
      expect(via_fns.state()).toBe('c');
    });

  });



  // The class keeps `transition_impl`, `_fire_hook_rejection`, and
  // `_fire_boundary_actions` as delegates for the tests and families that
  // reach them by name.  The family's transition_impl now calls the module
  // functions directly, so these delegates are only reachable by calling
  // them, which these do.

  describe('the class dispatch delegates', () => {

    test('transition_impl dispatches a plain, a forced, and an action transition', () => {
      const m = sm`a 'go' -> b ~> c -> a;`;
      expect(m.transition_impl('go', undefined, false, true)).toBe(true);
      expect(m.state()).toBe('b');
      expect(m.transition_impl('c', undefined, true, false)).toBe(true);
      expect(m.state()).toBe('c');
      expect(m.transition_impl('a', undefined, false, false)).toBe(true);
      expect(m.state()).toBe('a');
      expect(m.transition_impl('c', undefined, false, false)).toBe(false);
      expect(m.state()).toBe('a');
    });

    test('transition_impl defaults dataProvided from newData !== undefined', () => {
      const m = sm_from<string>(`a -> b -> c;`, { data: 'x' });
      m.transition_impl('b', undefined, false, false);
      expect(m.data()).toBe('x');
      m.transition_impl('c', 'y', false, false);
      expect(m.data()).toBe('y');
    });

    test('_fire_hook_rejection fires a hook-reason rejection event with the given fields', () => {
      const m = sm`a -> b;`;
      let seen: any = null;
      on(m, 'rejection', ev => { seen = ev; });
      m._fire_hook_rejection('exit', 'a', 'b', undefined, 'old', 'new', false);
      expect(seen).toStrictEqual({
        from: 'a', to: 'b', action: undefined, data: 'old', next_data: 'new',
        reason: 'hook', hook_name: 'exit', forced: false
      });
    });

    test('_fire_boundary_actions dispatches the enter action for the crossed group', () => {
      // the 'action' event fires on every attempt, valid or not, so it observes
      // the dispatch itself rather than any transition it may cause
      const m = sm`&busy : [work]; idle 'go' -> work 'leave' -> idle; on enter &busy do 'leave';`;
      const seen: string[] = [];
      on(m, 'action', ev => { seen.push(ev.action); });
      m._fire_boundary_actions('idle', 'work');
      expect(seen).toStrictEqual(['leave']);
    });

    test('_fire_boundary_actions does nothing when the state is unchanged', () => {
      const m = sm`&busy : [work]; idle 'go' -> work 'leave' -> idle; on enter &busy do 'leave';`;
      const seen: string[] = [];
      on(m, 'action', ev => { seen.push(ev.action); });
      m._fire_boundary_actions('work', 'work');
      expect(seen).toStrictEqual([]);
    });

  });



});
