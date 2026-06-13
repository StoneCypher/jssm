
/* eslint-disable max-len */

import { describe, test, expect } from 'vitest';

import { sm } from '../jssm';

import {
  // predicate atoms / constructors
  in_state,
  in_any,
  is_terminal,
  is_final,
  is_error,
  tautology,
  contradiction,
  p_not,
  p_and,
  p_or,
  // safety-property constructors
  always,
  never,
  reachable,
  unreachable,
  absence,
  existence,
  // evaluation
  as_predicate,
  eval_predicate,
  reachable_predecessors,
  trace_to,
  resolve_starts,
  check_safety
} from '../fsl_verify';

import type { StatePredicate } from '../fsl_verify';





// A linear pipeline: idle -> work -> done, with done terminal.
const pipeline = () => sm`idle 'go' -> work 'finish' -> done;`;

// A machine with a branch and an unreachable island so reachability matters.
//   start -> ok ; start -> bad ; (orphan is islanded)
const branching = () =>
  sm`allow_islands: true; start 'a' -> ok; start 'b' -> bad; orphan 'z' -> sink;`;

// A cyclic machine so BFS must guard against revisiting.
const cycle = () => sm`on 'toggle' <=> 'toggle' off;`;

const NO_ERR = new Set<string>();





describe('eval_predicate — atoms', () => {

  test('in_state matches the named state only', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'work', in_state('work'), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'idle', in_state('work'), NO_ERR)).toBe(false);
  });

  test('in_any matches set membership, empty set matches nothing', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'work', in_any(['idle', 'work']), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'done', in_any(['idle', 'work']), NO_ERR)).toBe(false);
    expect(eval_predicate(m, 'idle', in_any([]), NO_ERR)).toBe(false);
  });

  test('is_terminal is true only at dead ends', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'done', is_terminal, NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'idle', is_terminal, NO_ERR)).toBe(false);
  });

  test('is_final tracks terminal/complete states', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'done', is_final, NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'work', is_final, NO_ERR)).toBe(false);
  });

  test('is_error consults the supplied error set', () => {
    const m = pipeline();
    const errs = new Set(['done']);
    expect(eval_predicate(m, 'done', is_error, errs)).toBe(true);
    expect(eval_predicate(m, 'work', is_error, errs)).toBe(false);
    expect(eval_predicate(m, 'done', is_error, NO_ERR)).toBe(false);
  });

  test('tautology and contradiction are constant', () => {
    const m = pipeline();
    expect(eval_predicate(m, 'idle', tautology, NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'idle', contradiction, NO_ERR)).toBe(false);
  });

});



describe('eval_predicate — connectives', () => {

  const m = pipeline();

  test('not inverts', () => {
    expect(eval_predicate(m, 'idle', p_not(in_state('work')), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'work', p_not(in_state('work')), NO_ERR)).toBe(false);
  });

  test('and requires all; empty and is a tautology', () => {
    expect(eval_predicate(m, 'done', p_and(is_terminal, is_final), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'done', p_and(is_terminal, in_state('idle')), NO_ERR)).toBe(false);
    expect(eval_predicate(m, 'idle', p_and(), NO_ERR)).toBe(true); // unit of and
  });

  test('or requires one; empty or is a contradiction', () => {
    expect(eval_predicate(m, 'work', p_or(in_state('idle'), in_state('work')), NO_ERR)).toBe(true);
    expect(eval_predicate(m, 'work', p_or(in_state('idle'), in_state('done')), NO_ERR)).toBe(false);
    expect(eval_predicate(m, 'idle', p_or(), NO_ERR)).toBe(false); // unit of or
  });

});



describe('as_predicate', () => {

  test('wraps a bare state name as in_state', () => {
    expect(as_predicate('done')).toStrictEqual(in_state('done'));
  });

  test('passes an existing predicate through unchanged', () => {
    const p: StatePredicate = is_terminal;
    expect(as_predicate(p)).toBe(p);
  });

});



describe('reachable_predecessors & trace_to', () => {

  test('records BFS predecessors from a single seed', () => {
    const m = pipeline();
    const preds = reachable_predecessors(m, ['idle']);
    expect(preds.get('idle')).toBe(null);
    expect(preds.get('work')).toBe('idle');
    expect(preds.get('done')).toBe('work');
    expect(preds.has('orphan')).toBe(false);
  });

  test('seeds multiple starts and de-duplicates them', () => {
    const m = branching();
    const preds = reachable_predecessors(m, ['start', 'start', 'orphan']);
    expect(preds.get('start')).toBe(null);
    expect(preds.get('orphan')).toBe(null);
    // both seeds' successors are reached
    expect(preds.get('ok')).toBe('start');
    expect(preds.get('sink')).toBe('orphan');
  });

  test('terminates on cycles without revisiting', () => {
    const m = cycle();
    const preds = reachable_predecessors(m, ['on']);
    expect(preds.get('on')).toBe(null);
    expect(preds.get('off')).toBe('on');
    expect(preds.size).toBe(2);
  });

  test('trace_to reconstructs the shortest path inclusive of endpoints', () => {
    const m = pipeline();
    const preds = reachable_predecessors(m, ['idle']);
    expect(trace_to(preds, 'done')).toStrictEqual(['idle', 'work', 'done']);
    expect(trace_to(preds, 'idle')).toStrictEqual(['idle']);
  });

});



describe('resolve_starts', () => {

  test('defaults to the current machine state', () => {
    const m = pipeline();
    expect(resolve_starts(m, undefined)).toStrictEqual(['idle']);
  });

  test('honours an explicit, valid start frontier', () => {
    const m = pipeline();
    expect(resolve_starts(m, ['work', 'done'])).toStrictEqual(['work', 'done']);
  });

  test('throws on an unknown start state', () => {
    const m = pipeline();
    expect(() => resolve_starts(m, ['nope'])).toThrow(/not a state of the machine/);
  });

});



describe('check_safety — always (invariant)', () => {

  test('holds: every reachable state satisfies the invariant (no trace)', () => {
    const m = pipeline();
    const r = check_safety(m, always(p_not(is_error)));
    expect(r.holds).toBe(true);
    expect(r.trace).toBeUndefined();
    expect(r.states_explored).toBe(3);
    expect(r.property.kind).toBe('always');
  });

  test('fails: returns the shortest counterexample trace to the first violator', () => {
    const m = pipeline();
    const r = check_safety(m, always(p_not(is_error)), { error_states: ['done'] });
    expect(r.holds).toBe(false);
    expect(r.trace).toStrictEqual(['idle', 'work', 'done']);
  });

  test('accepts a bare state name as "must always be in it"', () => {
    const m = cycle();
    const r = check_safety(m, always('on'));
    expect(r.holds).toBe(false); // 'off' is reachable and is not 'on'
    expect(r.trace).toStrictEqual(['on', 'off']);
  });

});



describe('check_safety — never / unreachable / absence', () => {

  test('never holds when the forbidden predicate is unreachable', () => {
    const m = pipeline();
    const r = check_safety(m, never(is_error));
    expect(r.holds).toBe(true);
    expect(r.trace).toBeUndefined();
  });

  test('never fails with a counterexample when the forbidden state is reachable', () => {
    const m = pipeline();
    const r = check_safety(m, never('done'));
    expect(r.holds).toBe(false);
    expect(r.trace).toStrictEqual(['idle', 'work', 'done']);
  });

  test('unreachable is the same query, reported via its own kind', () => {
    const m = pipeline();
    const r = check_safety(m, unreachable('work'));
    expect(r.holds).toBe(false);
    expect(r.trace).toStrictEqual(['idle', 'work']);
    expect(r.property.kind).toBe('unreachable');
  });

  test('absence proves a designed failure state is never reached', () => {
    const m = branching();
    const reached = check_safety(m, absence('bad'));
    expect(reached.holds).toBe(false);
    expect(reached.trace).toStrictEqual(['start', 'bad']);

    // From a start frontier that cannot reach 'bad', absence holds.
    const safe = check_safety(m, absence('bad'), { start_states: ['orphan'] });
    expect(safe.holds).toBe(true);
    expect(safe.trace).toBeUndefined();
  });

});



describe('check_safety — reachable / existence', () => {

  test('reachable succeeds with a witness trace', () => {
    const m = pipeline();
    const r = check_safety(m, reachable('done'));
    expect(r.holds).toBe(true);
    expect(r.trace).toStrictEqual(['idle', 'work', 'done']);
  });

  test('reachable fails with no trace when the target is unreachable', () => {
    const m = branching();
    const r = check_safety(m, reachable('orphan')); // start frontier defaults to 'start'
    expect(r.holds).toBe(false);
    expect(r.trace).toBeUndefined();
  });

  test('existence is reachable under another name', () => {
    const m = pipeline();
    const r = check_safety(m, existence(is_final));
    expect(r.holds).toBe(true);
    expect(r.trace).toStrictEqual(['idle', 'work', 'done']);
    expect(r.property.kind).toBe('reachable');
  });

});



describe('check_safety — options & determinism', () => {

  test('respects an explicit start frontier', () => {
    const m = pipeline();
    const r = check_safety(m, reachable('idle'), { start_states: ['work'] });
    expect(r.holds).toBe(false); // can't reach 'idle' from 'work'
  });

  test('default options object works without an explicit argument', () => {
    const m = pipeline();
    const r = check_safety(m, always(tautology));
    expect(r.holds).toBe(true);
    expect(r.states_explored).toBe(3);
  });

  test('error states feed compound predicates', () => {
    const m = pipeline();
    const dangerous = p_or(is_error, is_terminal);
    const r = check_safety(m, never(dangerous), { error_states: ['idle'] });
    expect(r.holds).toBe(false);
    // 'idle' (error) is the start, so the shortest witness is itself.
    expect(r.trace).toStrictEqual(['idle']);
  });

});
