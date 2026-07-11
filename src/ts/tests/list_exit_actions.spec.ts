
 

import * as jssm from '../jssm';

/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));

const sm = jssm.sm;





/**
 * Regression coverage for `Machine.list_exit_actions` against
 * StoneCypher/fsl#1326 — "list_exit_actions throws for actionless states".
 *
 * The historical bug: calling `list_exit_actions` on a state that exists but
 * has no `'action'`-named exit threw a `JssmError`, instead of returning the
 * empty list it returns for a state with action exits but none matching the
 * filter.
 *
 * The current guard in `jssm.ts` (~ line 2024) handles three cases:
 *   1. state has action exits  -> array of action names
 *   2. state exists, no action exits  -> []
 *   3. state does not exist  -> throws JssmError
 *
 * These tests pin those three contracts so they cannot regress.
 */

describe('list_exit_actions on actionless states (StoneCypher/fsl#1326)', () => {

  describe('mixed: some states have actions, some do not', () => {

    // a has two action exits, b has only a plain '->' exit, c has no exits
    const m = sm`a 'foo' -> b; a 'bar' -> c; b -> c;`;

    test('a (with two actions) returns both action names', () =>
      expect( [...m.list_exit_actions('a')].sort(code_unit_compare) )
        .toStrictEqual(['bar', 'foo']) );

    test('b (plain -> exit only, no action) returns [] and does not throw', () =>
      expect( m.list_exit_actions('b') )
        .toStrictEqual([]) );

    test('c (terminal, no exits at all) returns [] and does not throw', () =>
      expect( m.list_exit_actions('c') )
        .toStrictEqual([]) );

    test('nonexistent state throws JssmError', () =>
      expect( () => m.list_exit_actions('not_a_real_state') )
        .toThrow() );

  });



  describe('machine that uses no actions at all', () => {

    const m = sm`a -> b; b -> c;`;

    test('a returns [] and does not throw', () =>
      expect( m.list_exit_actions('a') )
        .toStrictEqual([]) );

    test('b returns [] and does not throw', () =>
      expect( m.list_exit_actions('b') )
        .toStrictEqual([]) );

    test('c (terminal) returns [] and does not throw', () =>
      expect( m.list_exit_actions('c') )
        .toStrictEqual([]) );

  });



  describe('default-argument variant on actionless current state', () => {

    // 'a' is the start state and has no action exits.
    const m = sm`a -> b;`;

    test('list_exit_actions() with no argument returns [] when current state is actionless', () =>
      expect( m.list_exit_actions() )
        .toStrictEqual([]) );

  });



  describe('state with action exits but argument matches no `from` (filter chain)', () => {

    // 'b' is a destination of an action edge but originates none itself.
    // This exercises the .filter(o => o.from === whichState) branch.
    const m = sm`a 'go' -> b;`;

    test('destination-only state b returns [] and does not throw', () =>
      expect( m.list_exit_actions('b') )
        .toStrictEqual([]) );

  });

});
