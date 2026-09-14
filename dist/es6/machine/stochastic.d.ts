/*******
 *
 *  The stochastic family: everything that draws on the machine's seeded
 *  PRNG — the weighted start-state distribution (`start_state_weights`,
 *  `sample_start_state`), the probabilistic exit pool (`probable_exits_for`),
 *  the destructive random steps (`probabilistic_transition`,
 *  `probabilistic_walk`, `probabilistic_histo_walk`), the non-destructive
 *  Monte-Carlo engine (`stochastic_runs`, `stochastic_summary`), and the seed
 *  accessors (`rng_seed`, `set_rng_seed`).  Every function takes the machine
 *  as its first argument and reads its fields directly; the `Machine` class
 *  methods, getter, and setter of the same names are one-line delegates onto
 *  these.
 *
 *  Every export here is public and re-exported by the `jssm` barrel,
 *  including the two `STOCHASTIC_DEFAULT_*` constants.  The former private
 *  methods `_assert_selectable_exit_pool` and `_stochastic_one_walk` are
 *  module-private functions here.
 *
 */
import type { Machine } from './machine.js';
import type { JssmTransition, JssmStochasticOptions, JssmStochasticRun, JssmStochasticSummary } from '../jssm_types.js';
type StateType = string;
/** Default number of independent Monte-Carlo runs when none is declared. */
export declare const STOCHASTIC_DEFAULT_RUNS = 1000;
/** Default per-run step cap (montecarlo) / walk length (steady_state). */
export declare const STOCHASTIC_DEFAULT_MAX_STEPS = 1000;
/**
 *  The initial distribution declared by a weighted `start_states` list
 *  (6.0), normalized to sum 1.  Empty when the machine's start states are
 *  unweighted.
 *  @param m The machine to read.
 *  @returns A map from start state to its share of the distribution.
 *  @example
 *  import { sm, start_state_weights } from 'jssm';
 *  const m = sm`start_states: [idle 90% booting 10%]; idle -> booting;`;
 *  start_state_weights(m).get('idle');  // => 0.9
 *  @see sample_start_state
 */
export declare function start_state_weights<mDT>(m: Machine<mDT>): Map<StateType, number>;
/**
 *  Draws a start state from {@link start_state_weights} using the
 *  machine's RNG; on an unweighted machine returns the first declared
 *  start state.  Does not change the machine's state.
 *  @param m The machine whose RNG and start distribution are used.
 *  @returns The sampled start state.
 *  @example
 *  import { sm, sample_start_state } from 'jssm';
 *  const m = sm`start_states: [idle 90% booting 10%]; idle -> booting;`;
 *  ['idle', 'booting'].includes(sample_start_state(m));  // => true
 *  @see start_state_weights
 */
export declare function sample_start_state<mDT>(m: Machine<mDT>): StateType;
/**
 * Get the transitions available from a state for use by the probabilistic
 *  walk system.
 *
 *  If any exit declares a `probability`, only those probability-bearing
 *  exits are returned, so that non-probability peers cannot dilute the
 *  declared distribution.  If no exit declares a `probability`, every
 *  legal (non-forced) exit is returned, which `weighted_rand_select`
 *  treats as equal weight.  Forced-only exits (`~>`) are always excluded,
 *  since they cannot be taken by an ordinary `transition()` call.
 *
 *  Fixes StoneCypher/fsl#1325, in which the function previously returned
 *  every exit unconditionally — including forced-only exits and exits
 *  with no `probability`, which distorted the weighted distribution.
 *
 *  Share-only edges (an unweighted transition onto a weighted list; 6.0
 *  list weights) carry no declared `probability` and so never evict their
 *  siblings from the pool; their `share` is applied later, by the picker.
 *  @param m The machine to inspect.
 *  @param whichState - The state to inspect.
 *  @returns An array of {@link JssmTransition} edges exiting the state,
 *  filtered as described above.  May be empty.
 *  @throws {JssmError} If the state does not exist.
 */
export declare function probable_exits_for<mDT>(m: Machine<mDT>, whichState: StateType): Array<JssmTransition<StateType, mDT>>;
/**
 * Take a single random transition from the current state, weighted by
 *  edge probabilities.
 *  @param m The machine to move.
 *  @returns `true` if a transition was taken, `false` otherwise.
 *  @throws {JssmError} If the candidate exit pool is non-empty but its
 *  total weight is zero — every candidate declares `0%` — per
 *  StoneCypher/fsl#1248.
 */
export declare function probabilistic_transition<mDT>(m: Machine<mDT>): boolean;
/**
 * Take `n` consecutive probabilistic transitions and return the sequence
 *  of states visited (before each transition).
 *  @param m The machine to move.
 *  @param n - Number of steps to walk.
 *  @returns An array of state names visited during the walk.
 *  @throws {JssmError} If a visited state's candidate exit pool is
 *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
 */
export declare function probabilistic_walk<mDT>(m: Machine<mDT>, n: number): Array<StateType>;
/**
 * Take `n` probabilistic steps and return a histograph of how many times
 *  each state was visited.
 *  @param m The machine to move.
 *  @param n - Number of steps to walk.
 *  @returns A `Map` from state name to visit count.
 *  @throws {JssmError} If a visited state's candidate exit pool is
 *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
 */
export declare function probabilistic_histo_walk<mDT>(m: Machine<mDT>, n: number): Map<StateType, number>;
/**
 * Lazily yield one {@link JssmStochasticRun} at a time.
 *
 *  In `montecarlo` mode (default) yields `runs` independent walks from the
 *  current state, each ending at a terminal or after `max_steps`.  In
 *  `steady_state` mode yields exactly one walk of `max_steps` steps.  This
 *  is the lazy engine behind {@link stochastic_summary}; the
 *  fsl-stochastic panel drives it across animation frames.  A walk already
 *  at a terminal is reported as terminated with length zero, including when
 *  `max_steps` is zero.
 *
 *  Passing `seed` reseeds the machine for reproducible runs.  Unlike
 *  {@link stochastic_summary}, the generator does NOT restore the
 *  prior seed afterward — a direct caller's machine is left reseeded.
 *  When the machine declares weighted `start_states` (6.0), each run's
 *  start is drawn independently via {@link sample_start_state}
 *  instead of always starting from the machine's current state.
 *  @param m The machine whose graph and RNG are read.
 *  @param opts - {@link JssmStochasticOptions}.
 *  @yields One {@link JssmStochasticRun} per completed walk.
 *  @returns A generator of per-run results.
 *  @example
 *  import { sm, stochastic_runs } from 'jssm';
 *  const m = sm`a 'go' -> b 'go' -> c;`;
 *  [...stochastic_runs(m, { runs: 2, seed: 1 })].length;  // => 2
 */
export declare function stochastic_runs<mDT>(m: Machine<mDT>, opts?: JssmStochasticOptions): Generator<JssmStochasticRun>;
/**
 * Run many weighted-random walks and return aggregate statistics.
 *
 *  Honors `%` transition probabilities (via the existing probabilistic
 *  machinery).  Non-destructive: the machine's current state and
 *  {@link rng_seed} are restored before returning, so calling this
 *  never perturbs the live machine.  `montecarlo` mode (default) reports
 *  per-run `path_lengths`, `terminal_reached`, and `capped`; `steady_state`
 *  mode runs one long walk and omits those fields.
 *
 *  Monte-Carlo runs count as `terminal_reached` when they start at a
 *  terminal or reach one on the final permitted transition.  Terminal
 *  starts contribute zero to `path_lengths`, even when `max_steps` is zero.
 *
 *  Timing (`after`) decorations and data-guard conditions are not modeled
 *  by this sampler; it walks the probabilistic graph topology.  When the
 *  machine declares weighted `start_states` (6.0), each run starts from an
 *  independently sampled start state (see {@link stochastic_runs}).
 *  @param m The machine whose graph and RNG are read.
 *  @param opts - {@link JssmStochasticOptions}.  `runs` defaults to the
 *  machine's declared `editor: { stochastic_run_count }` (fsl#1334) when
 *  present, otherwise {@link STOCHASTIC_DEFAULT_RUNS}.
 *  @returns A {@link JssmStochasticSummary}.
 *  @see stochastic_runs
 *  @see probabilistic_walk
 *  @see editor_config
 *  @example
 *  import { sm, stochastic_summary } from 'jssm';
 *  const m = sm`a 'go' -> b 'go' -> c;`;
 *  const s = stochastic_summary(m, { runs: 100, seed: 1 });
 *  s.terminal_reached;  // => 100
 */
export declare function stochastic_summary<mDT>(m: Machine<mDT>, opts?: JssmStochasticOptions): JssmStochasticSummary;
/**
 * Get the current RNG seed used for probabilistic transitions.
 *  @param m The machine to read.
 *  @returns The numeric seed value.
 */
export declare function rng_seed<mDT>(m: Machine<mDT>): number;
/**
 * Set the RNG seed.  Pass `undefined` to reseed from the current time.
 *  Resets the internal PRNG so subsequent probabilistic operations use the
 *  new seed.
 *  @param m The machine to reseed.
 *  @param to - The seed value, or `undefined` for time-based seeding.
 */
export declare function set_rng_seed<mDT>(m: Machine<mDT>, to: number | undefined): void;
export {};
