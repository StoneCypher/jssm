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
import { JssmError } from '../jssm_error.js';
import { seq, weighted_rand_select, histograph, gen_splitmix32 } from '../jssm_util.js';
import { state, editor_config } from './query.js';
import { transition } from './transition.js';
/** Default number of independent Monte-Carlo runs when none is declared. */
export const STOCHASTIC_DEFAULT_RUNS = 1000;
/** Default per-run step cap (montecarlo) / walk length (steady_state). */
export const STOCHASTIC_DEFAULT_MAX_STEPS = 1000;
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
export function start_state_weights(m) {
    return new Map(m._start_state_weights);
}
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
export function sample_start_state(m) {
    if (m._start_state_weights.size === 0) {
        return m._start_states.values().next().value;
    }
    const opts = [...m._start_state_weights].map(([name, probability]) => ({ name, probability }));
    return weighted_rand_select(opts, undefined, m._rng).name;
}
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
export function probable_exits_for(m, whichState) {
    const wstate = m._states.get(whichState);
    if (!(wstate)) {
        throw new JssmError(m, `No such state ${JSON.stringify(whichState)} in probable_exits_for`);
    }
    // single pass over the state's exits, replacing the old map -> filter ->
    // filter -> filter chain and its three intermediate arrays; selection and
    // ordering semantics are unchanged
    const legal_exits = [], probability_bearing = [];
    // hoisted: every exit shares whichState, so probe _edge_map for the
    // from-side once instead of re-hashing the same key per exit inside
    // lookup_transition_for.  wstate.to is non-empty only when at least one
    // outbound edge exists, and every outbound edge creates the from-side
    // mapping at construction — so emg is defined whenever the loop runs.
    const emg = m._edge_map.get(whichState);
    for (const ws of wstate.to) {
        // wstate.to is built from the same edge set _edge_map indexes, so the
        // per-target get cannot miss; the guard mirrors the old defensive
        // .filter(Boolean) and is equally unreachable.
        const edge = m._edges[emg.get(ws)];
        /* v8 ignore next */
        if (!edge) {
            continue;
        }
        // forced-only exits cannot be reached by transition(), so they are
        // never legal probabilistic outcomes
        if (edge.forced_only) {
            continue;
        }
        legal_exits.push(edge);
        // if any legal exit declares a probability, only those are returned, so
        // that probability-bearing edges are not diluted by their peers
        if (edge.probability !== undefined) {
            probability_bearing.push(edge);
        }
    }
    return (probability_bearing.length > 0) ? probability_bearing : legal_exits;
}
/**
 * Guard for the random-selection paths ({@link probabilistic_transition},
 *  {@link stochastic_runs}): rejects a candidate pool whose total
 *  selectable weight is zero, because weighted selection over an all-zero
 *  pool has no meaningful answer (StoneCypher/fsl#1248).  Undeclared
 *  probabilities count as weight 1, matching {@link weighted_rand_select}.
 *  Each edge's weight is `(probability ?? 1) × (share ?? 1)`, so a
 *  share-only edge (6.0 list weights) still contributes its fractional
 *  weight to the total rather than being treated as 1.
 *  An empty pool is not this guard's concern (terminality is handled by the
 *  callers) and passes through untouched.
 *
 *  Not a doctest: `assert_selectable_exit_pool` is module-private; the guard is reached through `probabilistic_transition`.
 *  ```typescript
 *  import { sm, probabilistic_transition } from 'jssm';
 *
 *  const m = sm`a 0% -> b; a 0% -> c;`;
 *  probabilistic_transition(m);  // throws JssmError — every exit is 0%
 *  ```
 *  @param m The machine the pool belongs to, named in the error.
 *  @param whichState - The state the pool exits from, named in the error.
 *  @param exits - The candidate pool, as built by {@link probable_exits_for}.
 *  @throws {JssmError} If the pool is non-empty and every candidate edge
 *  has probability 0 — including the case where explicit `0%` edges
 *  excluded their unweighted sibling edges from the candidate pool.
 *  @see probable_exits_for
 *  @internal
 */
function assert_selectable_exit_pool(m, whichState, exits) {
    if (exits.length === 0) {
        return;
    }
    let total = 0;
    for (const e of exits) {
        total += ((e.probability === undefined) ? 1 : e.probability) * ((e.share === undefined) ? 1 : e.share);
    }
    if (total > 0) {
        return;
    }
    throw new JssmError(m, `Cannot randomly select an exit from state ${JSON.stringify(whichState)}: every candidate edge has probability 0%.  Note that an explicit 0% edge excludes unweighted sibling edges from the candidate pool (StoneCypher/fsl#1248)`);
}
/**
 * Take a single random transition from the current state, weighted by
 *  edge probabilities.
 *  @param m The machine to move.
 *  @returns `true` if a transition was taken, `false` otherwise.
 *  @throws {JssmError} If the candidate exit pool is non-empty but its
 *  total weight is zero — every candidate declares `0%` — per
 *  StoneCypher/fsl#1248.
 */
export function probabilistic_transition(m) {
    const exits = probable_exits_for(m, state(m));
    assert_selectable_exit_pool(m, state(m), exits);
    const selected = weighted_rand_select(exits, undefined, m._rng);
    return transition(m, selected.to);
}
/**
 * Take `n` consecutive probabilistic transitions and return the sequence
 *  of states visited (before each transition).
 *  @param m The machine to move.
 *  @param n - Number of steps to walk.
 *  @returns An array of state names visited during the walk.
 *  @throws {JssmError} If a visited state's candidate exit pool is
 *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
 */
export function probabilistic_walk(m, n) {
    return [...seq(n)
            .map(() => {
            const state_was = state(m);
            probabilistic_transition(m);
            return state_was;
        }), state(m)];
}
/**
 * Take `n` probabilistic steps and return a histograph of how many times
 *  each state was visited.
 *  @param m The machine to move.
 *  @param n - Number of steps to walk.
 *  @returns A `Map` from state name to visit count.
 *  @throws {JssmError} If a visited state's candidate exit pool is
 *  non-empty but all-zero-weight (StoneCypher/fsl#1248).
 */
export function probabilistic_histo_walk(m, n) {
    return histograph(probabilistic_walk(m, n));
}
/**
 * One non-destructive weighted-random walk over the graph from `start`.
 *
 *  Reads the graph and advances the PRNG only — it never calls
 *  {@link transition}, so it fires no hooks, mutates no machine
 *  state, and touches no `data`.  A state with no probabilistic exits
 *  (a terminal, or a forced-only `~>` state) ends the walk.
 *
 *  Terminality is checked before the first transition and after every
 *  transition.  A terminal start therefore completes with length zero even
 *  when `max_steps` is zero, and a terminal reached on the final permitted
 *  transition is completed rather than step-capped.
 *  @param m The machine whose graph and RNG are read.
 *  @param start - State to begin the walk from.
 *  @param max_steps - Maximum transitions before the walk is step-capped.
 *  @param exit_memo - Per-run-set cache of {@link probable_exits_for}
 *    results.  The graph is immutable after construction, so a state's
 *    probable exits never change; sharing one memo across a generator's
 *    runs collapses runs×steps re-derivations (two array allocations and an
 *    exit rescan per step) to one per distinct state.  The memo only reuses
 *    the derived arrays — RNG draw order is untouched, so seeded walks
 *    reproduce exactly.
 *  @returns The {@link JssmStochasticRun} for this walk.
 *  @throws {JssmError} If a visited state's candidate exit pool is
 *  non-empty but all-zero-weight — see
 *  {@link assert_selectable_exit_pool} (StoneCypher/fsl#1248).
 *  @internal
 */
function stochastic_one_walk(m, start, max_steps, exit_memo) {
    const states = [start];
    const edges = [];
    let cur = start;
    let exits = exit_memo.get(cur);
    if (exits === undefined) {
        exits = probable_exits_for(m, cur);
        assert_selectable_exit_pool(m, cur, exits);
        exit_memo.set(cur, exits);
    }
    let terminated = exits.length === 0;
    for (let step = 0; step < max_steps && !terminated; step++) {
        const selected = weighted_rand_select(exits, undefined, m._rng);
        edges.push(`${cur}→${selected.to}`);
        cur = selected.to;
        states.push(cur);
        exits = exit_memo.get(cur);
        if (exits === undefined) {
            exits = probable_exits_for(m, cur);
            assert_selectable_exit_pool(m, cur, exits);
            exit_memo.set(cur, exits);
        }
        terminated = exits.length === 0;
    }
    return { states, edges, length: states.length - 1, terminated };
}
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
export function* stochastic_runs(m, opts = {}) {
    var _a, _b, _c, _d, _e;
    if (opts.seed !== undefined) {
        set_rng_seed(m, opts.seed);
    }
    const mode = (_a = opts.mode) !== null && _a !== void 0 ? _a : 'montecarlo';
    const max_steps = (_b = opts.max_steps) !== null && _b !== void 0 ? _b : STOCHASTIC_DEFAULT_MAX_STEPS;
    const runs = (mode === 'steady_state')
        ? 1
        : ((_e = (_c = opts.runs) !== null && _c !== void 0 ? _c : (_d = editor_config(m)) === null || _d === void 0 ? void 0 : _d.stochastic_run_count) !== null && _e !== void 0 ? _e : STOCHASTIC_DEFAULT_RUNS);
    const weighted_start = m._start_state_weights.size > 0;
    const fixed_start = state(m);
    // one probable-exits memo for the whole run set; see stochastic_one_walk
    const exit_memo = new Map();
    for (let i = 0; i < runs; i++) {
        yield stochastic_one_walk(m, weighted_start ? sample_start_state(m) : fixed_start, max_steps, exit_memo);
    }
}
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
export function stochastic_summary(m, opts = {}) {
    var _a, _b, _c;
    const mode = (_a = opts.mode) !== null && _a !== void 0 ? _a : 'montecarlo';
    const saved_seed = m._rng_seed;
    if (opts.seed !== undefined) {
        set_rng_seed(m, opts.seed);
    }
    const effective_seed = m._rng_seed;
    const state_visits = new Map();
    const edge_traversals = new Map();
    const path_lengths = [];
    let terminal_reached = 0, capped = 0, runs = 0;
    try {
        const run_stream = stochastic_runs(m, Object.assign(Object.assign({}, opts), { mode }));
        for (const run of run_stream) {
            runs += 1;
            for (const s of run.states) {
                state_visits.set(s, ((_b = state_visits.get(s)) !== null && _b !== void 0 ? _b : 0) + 1);
            }
            for (const e of run.edges) {
                edge_traversals.set(e, ((_c = edge_traversals.get(e)) !== null && _c !== void 0 ? _c : 0) + 1);
            }
            if (mode === 'montecarlo') {
                if (run.terminated) {
                    terminal_reached += 1;
                    path_lengths.push(run.length);
                }
                else {
                    capped += 1;
                }
            }
        }
    }
    finally {
        // restore the PRNG so the call is non-destructive even when the loop throws
        set_rng_seed(m, saved_seed);
    }
    const total_visits = [...state_visits.values()].reduce((a, b) => a + b, 0);
    const state_visit_fraction = new Map();
    for (const [s, c] of state_visits) {
        state_visit_fraction.set(s, c / total_visits);
    }
    const summary = {
        mode, runs, seed: effective_seed,
        state_visits, state_visit_fraction, edge_traversals,
    };
    if (mode === 'montecarlo') {
        summary.path_lengths = path_lengths;
        summary.terminal_reached = terminal_reached;
        summary.capped = capped;
    }
    return summary;
}
/**
 * Get the current RNG seed used for probabilistic transitions.
 *  @param m The machine to read.
 *  @returns The numeric seed value.
 */
export function rng_seed(m) {
    return m._rng_seed;
}
/**
 * Set the RNG seed.  Pass `undefined` to reseed from the current time.
 *  Resets the internal PRNG so subsequent probabilistic operations use the
 *  new seed.
 *  @param m The machine to reseed.
 *  @param to - The seed value, or `undefined` for time-based seeding.
 */
export function set_rng_seed(m, to) {
    m._rng_seed = to === undefined ? Date.now() : to;
    m._rng = gen_splitmix32(m._rng_seed);
}
