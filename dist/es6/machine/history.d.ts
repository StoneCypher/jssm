/*******
 *
 *  The history family: reading and resizing the machine's ring buffer of
 *  recent `[state, data]` pairs.  Every function takes the machine as its
 *  first argument and reads the machine's `_history` / `_history_length`
 *  fields directly; the `Machine` class getters and setter of the same names
 *  are one-line delegates onto these.
 *
 */
import type { Machine } from './machine.js';
type StateType = string;
/*********
 *
 *  Get a truncated history of the recent states and data of the machine.
 *  Turned off by default; configure with `from('...', {history: 5})` by
 *  length, or call `set_history_length` at runtime.
 *
 *  History *does not contain the current state*.  If you want that, call
 *  `history_inclusive` instead.
 *
 *  Notice that in the example the machine's current state, `e`, is not in
 *  the returned list.
 *
 *  @example
 *  import { from, act, history } from 'jssm';
 *
 *  const foo = from(
 *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
 *    { history: 3 }
 *  );
 *
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  act(foo, 'next');
 *
 *  history(foo);  // => [ ['b', undefined], ['c', undefined], ['d', undefined] ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose history to read.
 *
 *  @returns The retained `[state, data]` pairs, oldest first, as a fresh array.
 *
 *  @see history_inclusive
 *  @see set_history_length
 *
 */
export declare function history<mDT>(m: Machine<mDT>): Array<[StateType, mDT]>;
/*********
 *
 *  Get a truncated history of the recent states and data of the machine,
 *  including the current state.  Turned off by default; configure with
 *  `from('...', {history: 5})` by length, or call `set_history_length` at
 *  runtime.
 *
 *  History inclusive contains the current state.  If you only want past
 *  states, call `history` instead.
 *
 *  The list returned will be one longer than the history buffer kept, as the
 *  history buffer kept gets the current state added to it to produce this
 *  list.
 *
 *  Notice that in the example the machine's current state, `e`, is in the
 *  returned list.
 *
 *  @example
 *  import { from, act, history_inclusive } from 'jssm';
 *
 *  const foo = from(
 *    "a 'next' -> b 'next' -> c 'next' -> d 'next' -> e;",
 *    { history: 3 }
 *  );
 *
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  act(foo, 'next');
 *
 *  history_inclusive(foo);  // => [ ['b', undefined], ['c', undefined], ['d', undefined], ['e', undefined] ]
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine whose history to read.
 *
 *  @returns The retained `[state, data]` pairs followed by the current
 *  `[state, data]`, oldest first, as a fresh array.
 *
 *  @see history
 *
 */
export declare function history_inclusive<mDT>(m: Machine<mDT>): Array<[StateType, mDT]>;
/*********
 *
 *  Find out how long a history this machine is keeping.  Defaults to zero.
 *  Change it with `set_history_length`.
 *
 *  @example
 *  import { from, history_length, set_history_length } from 'jssm';
 *
 *  const foo = from("a -> b;");
 *  history_length(foo);                                 // => 0
 *
 *  const bar = from("a -> b;", { history: 3 });
 *  history_length(bar);                                 // => 3
 *  set_history_length(bar, 5);
 *  history_length(bar);                                 // => 5
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m The machine to inspect.
 *
 *  @returns The number of past `[state, data]` pairs the machine retains.
 *
 *  @see set_history_length
 *
 */
export declare function history_length<mDT>(m: Machine<mDT>): number;
/*********
 *
 *  Set how long a history this machine keeps, resizing the buffer in place.
 *  Growing keeps every retained entry; shrinking drops the oldest entries so
 *  the most recent `to` survive; zero turns history off and empties it.
 *  Takes effect for every later transition.
 *
 *  @example
 *  import { from, act, history, set_history_length } from 'jssm';
 *
 *  const foo = from("a 'next' <-> 'next' b;");
 *  act(foo, 'next');
 *
 *  set_history_length(foo, 3);
 *  act(foo, 'next');
 *  act(foo, 'next');
 *  history(foo);              // => [ ['b', undefined], ['a', undefined] ]
 *
 *  set_history_length(foo, 1);
 *  history(foo);              // => [ ['a', undefined] ]
 *
 *  set_history_length(foo, 0);
 *  history(foo);              // => []
 *
 *  @typeParam mDT The type of the machine data member; usually omitted
 *
 *  @param m  The machine to resize the history of.
 *  @param to The number of past `[state, data]` pairs to retain, zero or more.
 *
 *  @see history_length
 *  @see history
 *
 */
export declare function set_history_length<mDT>(m: Machine<mDT>, to: number): void;
export {};
