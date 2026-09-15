
import { describe, test, expect } from 'vitest';

import { sm, go, JssmError, groups, statesIn, groupsOf, isIn } from '../jssm';
import { groups_by_depth } from '../machine/groups';





// Direct tests of the groups family as bare functions.  Every expected value
// is readable from the `&group : [ … ];` declarations in the FSL text.

describe('bare functions — groups family', () => {



  describe('groups', () => {

    test('lists declared groups in declaration order', () => {
      expect(groups(sm`&first : [a]; &second : [b]; a -> b;`)).toStrictEqual(['first', 'second']);
    });

    test('is empty when no group is declared', () => {
      expect(groups(sm`a -> b;`)).toStrictEqual([]);
    });

    test('returns a copy; mutating it does not change the machine', () => {
      const m = sm`&g : [a b]; a -> b;`;
      groups(m).push('bogus');
      expect(groups(m)).toStrictEqual(['g']);
    });

  });



  describe('statesIn', () => {

    test('lists the direct members of a group', () => {
      expect(statesIn(sm`&g : [a b]; a -> b -> c;`, 'g')).toStrictEqual(['a', 'b']);
    });

    test('flattens nested groups in declaration order', () => {
      const m = sm`&inner : [a b]; &outer : [&inner c]; a -> b -> c;`;
      expect(statesIn(m, 'outer')).toStrictEqual(['a', 'b', 'c']);
      expect(statesIn(m, 'inner')).toStrictEqual(['a', 'b']);
    });

    test('throws a JssmError for an undeclared group', () => {
      expect(() => statesIn(sm`&g : [a]; a -> b;`, 'nonesuch')).toThrow(JssmError);
    });

  });



  describe('groupsOf', () => {

    test('is deep through nested groups', () => {
      const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
      expect(groupsOf(m, 'a')).toStrictEqual(new Set(['inner', 'outer']));
      expect(groupsOf(m, 'b')).toStrictEqual(new Set(['outer']));
    });

    test('is empty for a state in no group, and for an unknown name', () => {
      const m = sm`&g : [a]; a -> b;`;
      expect(groupsOf(m, 'b')).toStrictEqual(new Set());
      expect(groupsOf(m, 'zed')).toStrictEqual(new Set());
    });

    test('returns a fresh Set each call', () => {
      const m = sm`&g : [a]; a -> b;`;
      groupsOf(m, 'a').clear();
      expect(groupsOf(m, 'a')).toStrictEqual(new Set(['g']));
    });

  });



  describe('isIn', () => {

    test('reflects the current state', () => {
      const m = sm`&busy : [working]; idle -> working;`;
      expect(isIn(m, 'busy')).toBe(false);
      go(m, 'working');
      expect(isIn(m, 'busy')).toBe(true);
    });

    test('an undeclared group has no members', () => {
      expect(isIn(sm`&g : [a]; a -> b;`, 'nonesuch')).toBe(false);
    });

    test('agrees with the class method', () => {
      const m = sm`&g : [a]; a -> b;`;
      expect(isIn(m, 'g')).toBe(m.isIn('g'));
      go(m, 'b');
      expect(isIn(m, 'g')).toBe(m.isIn('g'));
    });

  });



  describe('groups_by_depth (module export, not in the barrel)', () => {

    test('orders the containing groups outermost first', () => {
      const m = sm`&inner : [a]; &outer : [&inner b]; a -> b;`;
      expect(groups_by_depth(m, 'a')).toStrictEqual(['outer', 'inner']);
    });

    test('breaks equal-depth ties by declaration order', () => {
      const m = sm`&g1 : [a]; &g2 : [a]; a -> b;`;
      expect(groups_by_depth(m, 'a')).toStrictEqual(['g1', 'g2']);
    });

    test('a state in one group or none needs no ordering', () => {
      const m = sm`&g : [a]; a -> b;`;
      expect(groups_by_depth(m, 'a')).toStrictEqual(['g']);
      expect(groups_by_depth(m, 'b')).toStrictEqual([]);
    });

  });

});
