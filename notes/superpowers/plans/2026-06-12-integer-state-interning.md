# Integer State-ID Interning (Lever 1: dispatch path) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **In this repository:** subagents cannot mutate sibling worktrees (cwd resets to the main checkout; workarounds are permission-denied — see user memory `feedback_subagent_worktree_blocked`). Execute inline from the main session via superpowers:executing-plans, in the worktree `C:\Users\john\projects\worktrees\stonecypher_jssm_perf_26-06-12_state-interning`.

**Goal:** Intern state and action names to dense integer ids at machine construction so the per-transition dispatch path (`action()` / `transition()` / `force_transition()`) performs numeric map lookups instead of nested string-keyed lookups — behaviorally invisible, benchmark-gated, shipped as a 5.x perf release on `main`.

**Architecture:** A new pure `Interner` (string↔id bimap) plus a Szudzik `pair_key` packer live in `src/ts/jssm_intern.ts`. The `Machine` constructor interns every state and action and builds three *additive* numeric indexes beside the existing string maps (`pair_key(from_id,to_id)→edgeId`, `pair_key(action_id,from_id)→edgeId`, `edgeId→to_id`); the live current state gains a dual `_state_id`. Only `transition_impl`'s three validity branches and `current_action_for` switch to the numeric path; every other reader of `_edge_map` / `_actions` / `_reverse_actions` is untouched. Hook firing stays string-keyed — that is **Lever 2**, a separate follow-up PR per the perf-trail one-lever-per-PR pattern.

**Tech Stack:** TypeScript (`src/ts/jssm.ts`), vitest spec suite (100/100/100/100 coverage gate over `src/ts/**`), benny benchmarks (`npm run benny`; graviton CI is canonical, local numbers are envelope-only and never committed).

**Anchors:** All line numbers reference `src/ts/jssm.ts` at commit `bcb64f11` (branch `perf_26-06-12_state-interning`). If drift has occurred, locate by the quoted code, not the number.

**Behavioral invariants (the whole point — verify at every step):**
- Every public API returns byte-identical results; state names remain strings everywhere observable (errors, serialization, `list_edges()`, hook args, events).
- The `JssmTransition` objects stored in `_edges` gain **no new properties** (they are exposed via `list_edges()`; parallel arrays carry the ids instead).
- A deserialized machine whose `state` names an unknown state behaves exactly as today: every subsequent transition is invalid, nothing throws at restore time.
- `transition()` still refuses `forced_only` edges; `force_transition()` still accepts them.

---

### Task 1: The `Interner` and `pair_key` module

**Files:**
- Create: `src/ts/jssm_intern.ts`
- Test: `src/ts/tests/intern.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/ts/tests/intern.spec.ts`:

```typescript
import { Interner, pair_key } from '../jssm_intern';

describe('jssm_intern', () => {

  describe('Interner', () => {

    test('intern assigns dense ids starting at zero', () => {
      const i = new Interner();
      expect(i.intern('red')).toBe(0);
      expect(i.intern('green')).toBe(1);
      expect(i.intern('yellow')).toBe(2);
    });

    test('intern is idempotent — re-interning returns the existing id', () => {
      const i = new Interner();
      expect(i.intern('red')).toBe(0);
      expect(i.intern('green')).toBe(1);
      expect(i.intern('red')).toBe(0);
      expect(i.size).toBe(2);
    });

    test('id_of returns the id for known names and undefined for unknown', () => {
      const i = new Interner();
      i.intern('red');
      expect(i.id_of('red')).toBe(0);
      expect(i.id_of('mauve')).toBeUndefined();
    });

    test('name_of inverts id_of', () => {
      const i = new Interner();
      i.intern('red');
      i.intern('green');
      expect(i.name_of(0)).toBe('red');
      expect(i.name_of(1)).toBe('green');
      expect(i.name_of(99)).toBeUndefined();
    });

    test('size reports the count of distinct interned names', () => {
      const i = new Interner();
      expect(i.size).toBe(0);
      i.intern('a');
      i.intern('b');
      i.intern('a');
      expect(i.size).toBe(2);
    });

  });

  describe('pair_key', () => {

    test('is injective over a dense id grid', () => {
      // Szudzik pairing must produce a distinct key for every ordered pair.
      const seen = new Set<number>();
      for (let a = 0; a < 50; a++) {
        for (let b = 0; b < 50; b++) {
          const k = pair_key(a, b);
          expect(seen.has(k)).toBe(false);
          seen.add(k);
        }
      }
      expect(seen.size).toBe(2500);
    });

    test('is order-sensitive', () => {
      expect(pair_key(2, 5)).not.toBe(pair_key(5, 2));
    });

    test('propagates NaN so unknown-id probes always miss', () => {
      // NaN is the deliberate sentinel for "no such interned name": a NaN key
      // can never equal any stored (always-real) key, so Map.get misses.
      expect(Number.isNaN(pair_key(NaN, 3))).toBe(true);
      expect(Number.isNaN(pair_key(3, NaN))).toBe(true);
    });

  });

});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ts/tests/intern.spec.ts --config vitest.spec.config.ts --coverage.enabled=false`
Expected: FAIL — `Cannot find module '../jssm_intern'`

- [ ] **Step 3: Write the implementation**

Create `src/ts/jssm_intern.ts`:

```typescript

/**
 * String interning support for the jssm machine internals.
 *
 * State and action names are interned to dense integer ids at machine
 * construction so that per-transition dispatch can use numeric map keys
 * (integer hashing) instead of repeated string-keyed lookups.  Internal
 * machinery only — deliberately not re-exported from the `jssm` public
 * surface, so the public API is unchanged.
 *
 * @internal
 */

/**
 * A string↔integer bimap.  Assigns dense ids (0, 1, 2, …) in first-seen
 * order; lookups are O(1) both directions.  Grows monotonically — there is
 * no removal, matching machine semantics (states and actions are fixed
 * after construction; late interning only happens for never-matching
 * lookups such as hook registrations naming unknown states).
 *
 * @example
 *   const i = new Interner();
 *   i.intern('red');     // 0
 *   i.intern('green');   // 1
 *   i.intern('red');     // 0  (idempotent)
 *   i.id_of('green');    // 1
 *   i.name_of(0);        // 'red'
 *
 * @see pair_key
 */
class Interner {

  private readonly ids   : Map<string, number>;
  private readonly names : Array<string>;

  constructor() {
    this.ids   = new Map();
    this.names = [];
  }

  /**
   * Return the id for `name`, assigning the next dense id if the name has
   * not been seen before.
   *
   * @param name - The string to intern.
   * @returns The (possibly newly assigned) integer id.
   *
   * @example
   *   interner.intern('red');  // 0 on first call, 0 on every later call
   */
  intern(name: string): number {
    const existing = this.ids.get(name);
    if (existing !== undefined) { return existing; }
    const id = this.names.length;
    this.ids.set(name, id);
    this.names.push(name);
    return id;
  }

  /**
   * Return the id for `name` without interning, or `undefined` when the
   * name has never been interned.  This is the hot-path probe for
   * user-supplied names.
   *
   * @param name - The string to look up.
   *
   * @example
   *   interner.id_of('mauve');  // undefined — never interned
   */
  id_of(name: string): number | undefined {
    return this.ids.get(name);
  }

  /**
   * Return the name for `id`, or `undefined` for an id never assigned.
   *
   * @param id - The integer id to invert.
   *
   * @example
   *   interner.name_of(0);  // 'red'
   */
  name_of(id: number): string | undefined {
    return this.names[id];
  }

  /** The count of distinct interned names. */
  get size(): number {
    return this.names.length;
  }

}



/**
 * Szudzik pairing: packs two non-negative integers into one unique number,
 * order-sensitively, with no dependence on a fixed table size — so interners
 * may keep growing without invalidating existing keys.  Values stay exact
 * for ids below 2^26 (the result is bounded by roughly max(a,b)^2), far
 * beyond any real machine's state count.
 *
 * NaN deliberately propagates: probing with an unknown name's id
 * (`id_of(...) ?? NaN`) yields a NaN key, which can never match a stored
 * key, so the lookup misses — exactly the behavior of the string-keyed maps
 * it replaces.  Do NOT use a negative sentinel instead: Szudzik is only
 * injective over the naturals, and a negative input can collide with a real
 * stored key (e.g. szudzik(-1, 2) === szudzik(1, 1) === 3), which would make
 * lookups from an unknown state falsely succeed.
 *
 * @param a - First non-negative integer (or NaN as a deliberate miss).
 * @param b - Second non-negative integer (or NaN as a deliberate miss).
 * @returns A number unique to the ordered pair `(a, b)` over the naturals.
 *
 * @example
 *   pair_key(2, 5);  // 27
 *   pair_key(5, 2);  // 32 — order-sensitive
 *
 * @see Interner
 */
function pair_key(a: number, b: number): number {
  return (a >= b)
    ? (a * a) + a + b
    : (b * b) + a;
}



export { Interner, pair_key };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ts/tests/intern.spec.ts --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS, 8 tests.

Note on the NaN-comparison branch: `pair_key(NaN, 3)` takes the `(a >= b)` false arm and `pair_key(3, NaN)` also takes the false arm (`NaN >= b` and `a >= NaN` are both false) — combined with the natural-number tests, both ternary arms are exercised.

- [ ] **Step 5: Check IDE diagnostics**

Run `mcp__ide__getDiagnostics` on `src/ts/jssm_intern.ts` and `src/ts/tests/intern.spec.ts`. Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/ts/jssm_intern.ts src/ts/tests/intern.spec.ts
git commit -m "feat(intern): string interner and Szudzik pair_key for numeric machine dispatch" -- src/ts/jssm_intern.ts src/ts/tests/intern.spec.ts
```

---

### Task 2: Wire interners and numeric indexes into the Machine

**Files:**
- Modify: `src/ts/jssm.ts` — import block (~line 41), field declarations (~line 428), constructor init (~line 568), start-state assignment (~lines 906/909), `_new_state` (line 1011), constructor transition walk (~lines 792–841), `deserialize` (~line 5460)
- Test: existing suite (constructor lines are exercised by every machine test); plus one new deserialize test in Task 4

- [ ] **Step 1: Add the import**

Beneath the existing `jssm_util` import block (after line 58):

```typescript
import { Interner, pair_key } from './jssm_intern';
```

- [ ] **Step 2: Declare the fields**

Next to the existing internal-map declarations (after `_edge_map`'s declaration in the 365–510 field block — locate `_edge_map` and add below it):

```typescript
  // Interned-id machinery (#interning lever 1).  Additive numeric mirrors of
  // the hot-path string maps; every string map stays authoritative for its
  // other readers.  See notes/superpowers/plans/2026-06-12-integer-state-interning.md
  _state_interner         : Interner;
  _action_interner        : Interner;
  // The interned id of the current state.  NaN — never undefined — when the
  // current state is unknown to the interner (only reachable by deserializing
  // a foreign state name); NaN pair_keys can never match a stored key, so
  // every dispatch lookup misses, which is exactly the string-map behavior.
  _state_id               : number;
  _edge_id_by_pair        : Map<number, number>;  // pair_key(from_id, to_id)   -> edge id
  _edge_id_by_action_pair : Map<number, number>;  // pair_key(action_id, from_id) -> edge id
  _edge_to_ids            : Array<number>;        // edge id -> interned id of edge.to
```

- [ ] **Step 3: Initialize in the constructor**

Next to `this._states = new Map()` (line 568):

```typescript
    this._state_interner         = new Interner();
    this._action_interner        = new Interner();
    this._state_id               = NaN;
    this._edge_id_by_pair        = new Map();
    this._edge_id_by_action_pair = new Map();
    this._edge_to_ids            = [];
```

- [ ] **Step 4: Intern in `_new_state`**

In `_new_state` (line 1011), after `this._states.set(state_config.name, state_config);` (line 1017):

```typescript
    this._state_interner.intern(state_config.name);
```

- [ ] **Step 5: Populate the numeric edge index in the transition walk**

Immediately after the `_edge_map` population block (after `from_mapping.set(tr.to, thisEdgeId);`, line 800), insert:

```typescript
      // numeric mirror of the (from, to) endpoint mapping.  intern() rather
      // than id_of(): idempotent, and returns number (not number|undefined)
      // since both endpoints were just created above if missing.
      const from_id = this._state_interner.intern(tr.from);
      const to_id   = this._state_interner.intern(tr.to);
      this._edge_id_by_pair.set(pair_key(from_id, to_id), thisEdgeId);
      this._edge_to_ids[thisEdgeId] = to_id;
```

- [ ] **Step 6: Populate the numeric action index**

Inside the `if (tr.action) {` block, after the `rActionMap.set(tr.action, thisEdgeId);` line (line 841), insert:

```typescript
        // numeric mirror of the (action, from) dispatch mapping
        const action_id = this._action_interner.intern(tr.action);
        this._edge_id_by_action_pair.set(pair_key(action_id, from_id), thisEdgeId);
```

(`from_id` is in scope from Step 5 — Step 5's insert sits earlier in the same loop body.)

- [ ] **Step 7: Dual-write `_state_id` at the two constructor start-state sites**

Locate the two assignments around lines 906/909 (`this._state = initial_state;` and `this._state = start_states[0];`). After **each**, add:

```typescript
    this._state_id = this._state_interner.intern(this._state);
```

Why `intern` and not `id_of`: at these sites the state is guaranteed to exist (the requested-start-state error at ~line 901 fires earlier for unknown names), `intern` is idempotent and returns plain `number`, and the straight-line form introduces no `??` branch the 100% gate would demand an (unreachable) test for. The `?? NaN` fallback form belongs only at the `deserialize` site (Step 8), where an unknown name is genuinely reachable.

- [ ] **Step 8: Dual-write `_state_id` in `deserialize`**

In the module-level `deserialize` function (~line 5460), locate `machine._state = ser.state;` and add after it:

```typescript
  machine._state_id = machine._state_interner.id_of(ser.state) ?? NaN;
```

Here the `?? NaN` arm is genuinely reachable (foreign state name in the serialization) and Task 4 adds the test that covers it.

- [ ] **Step 9: Run the full spec suite**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false`
Expected: all tests pass (≈6,300). The numeric indexes are populated but not yet read, so behavior is unchanged by construction.

- [ ] **Step 10: Check IDE diagnostics on `src/ts/jssm.ts`**

Run `mcp__ide__getDiagnostics`. Expected: clean.

- [ ] **Step 11: Commit**

```bash
git commit -m "feat(machine): intern state and action names at construction; numeric edge and action indexes; dual-written _state_id" -- src/ts/jssm.ts
```

---

### Task 3: Switch the dispatch path to numeric lookups

**Files:**
- Modify: `src/ts/jssm.ts` — `current_action_for` (line 4789), `transition_impl` validity branches (lines 3739–3768), commit point (line 3939)

- [ ] **Step 1: Convert `current_action_for`**

Replace the body of `current_action_for` (lines 4789–4794):

```typescript
  current_action_for(action: StateType): number {
    const action_id = this._action_interner.id_of(action);
    return (action_id === undefined)
      ? undefined
      : this._edge_id_by_action_pair.get(pair_key(action_id, this._state_id));
  }
```

One string probe plus one numeric probe, replacing two string probes and a `state()` call. `valid_action` (line 4812) and `current_action_edge_for` (line 4801) sit on top of this and need no edits. Keep the existing DocBlock; append one line to it: `Interned dispatch: resolves via the numeric (action, from) index; unknown action names miss without throwing.`

- [ ] **Step 2: Inline numeric resolution in `transition_impl`'s three branches**

Replace lines 3739–3768 (from `let valid` through the close of the `else` branch) with:

```typescript
    let valid      : boolean               = false,
        trans_type : string,
        newState   : StateType,
        newStateId : number                = NaN,
        fromAction : StateType | undefined = undefined;

    if (wasForced) {
      // numeric inline of valid_force_transition: any edge qualifies, forced or not
      const to_id  = this._state_interner.id_of(newStateOrAction);
      const edgeId = (to_id === undefined) ? undefined : this._edge_id_by_pair.get(pair_key(this._state_id, to_id));
      if (edgeId !== undefined) {
        valid      = true;
        trans_type = 'forced';
        newState   = newStateOrAction;
        newStateId = to_id;
      }

    } else if (wasAction) {
      // single resolution: the old path looked the action up twice, once in
      // valid_action and again in current_action_edge_for
      const edgeId = this.current_action_for(newStateOrAction);
      if ((edgeId !== undefined) && (edgeId !== null)) {
        const edge: JssmTransition<StateType, mDT> = this._edges[edgeId];
        valid      = true;
        trans_type = edge.kind;
        newState   = edge.to;
        newStateId = this._edge_to_ids[edgeId];
        fromAction = newStateOrAction;
      }

    } else {
      // numeric inline of valid_transition: the edge must exist and must not
      // be forced_only (line 4830's refusal, preserved)
      const to_id  = this._state_interner.id_of(newStateOrAction);
      const edgeId = (to_id === undefined) ? undefined : this._edge_id_by_pair.get(pair_key(this._state_id, to_id));
      if ((edgeId !== undefined) && (this._edges[edgeId].forced_only === false)) {
        if (this._has_transition_hooks || this._has_post_transition_hooks) {
          trans_type = this.edges_between(this._state, newStateOrAction)[0].kind;  // TODO this won't do the right thing if various edges have different types
        }
        valid      = true;
        newState   = newStateOrAction;
        newStateId = to_id;
      }
    }
```

**Caution on `forced_only`:** check how the field is populated before relying on `=== false` — if compile can leave it `undefined` on ordinary edges, use `!this._edges[edgeId].forced_only` instead (run `grep -n "forced_only" src/ts/jssm_compiler.ts src/ts/jssm.ts` and match the old `valid_transition`'s truthiness semantics, which used `if (transition_for.forced_only) return false;` — i.e. truthiness, so prefer `!`):

```typescript
      if ((edgeId !== undefined) && (!this._edges[edgeId].forced_only)) {
```

Use the truthiness form. It is behaviorally identical to line 4830.

- [ ] **Step 3: Dual-write at the commit point**

At line 3939 (`this._state = newState;`), make it:

```typescript
        this._state    = newState;
        this._state_id = newStateId;
```

- [ ] **Step 4: Run the full spec suite**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false`
Expected: all tests pass. Failures here mean a semantic drift between the inline branches and the old `valid_*` calls — diff the branch logic against `valid_transition` (4824), `valid_force_transition` (4842), `valid_action` (4812) before touching anything else.

- [ ] **Step 5: Check IDE diagnostics on `src/ts/jssm.ts`**

Expected: clean. (`valid_action` / `valid_transition` / `valid_force_transition` remain used by their public callers; no unused-symbol warnings should appear.)

- [ ] **Step 6: Commit**

```bash
git commit -m "perf(machine): numeric interned dispatch in transition_impl and current_action_for" -- src/ts/jssm.ts
```

---

### Task 4: Branch-coverage tests for the new dispatch guards

**Files:**
- Create: `src/ts/tests/intern_dispatch.spec.ts`

The new code introduces these branches: unknown-action probe (`current_action_for`), unknown-target probe in the forced and unforced inline branches, the `forced_only` refusal in the inline branch, and the `?? NaN` arm in `deserialize`. Some overlap with existing specs; these tests pin them all in one place regardless.

- [ ] **Step 1: Write the tests**

Create `src/ts/tests/intern_dispatch.spec.ts`:

```typescript
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
```

**Pre-check before trusting the last test:** confirm on the *pre-interning* tree (e.g. `git stash` or the merge base) that `deserialize` with a foreign state name behaves this way today (does not throw; transitions invalid). If it throws today, match that instead — never let interning change the observable behavior. (Reading `deserialize` at bcb64f11: it assigns `machine._state = ser.state` with no membership check, and a string-map miss makes every dispatch invalid — the test above is the current behavior.)

- [ ] **Step 2: Run the new spec**

Run: `npx vitest run src/ts/tests/intern_dispatch.spec.ts --config vitest.spec.config.ts --coverage.enabled=false`
Expected: PASS, 6 tests.

- [ ] **Step 3: Run the whole spec suite WITH coverage**

Run: `npx vitest run --config vitest.spec.config.ts`
Expected: all pass and the coverage gate holds 100/100/100/100. If a line/branch in `jssm_intern.ts` or the new dispatch code reports uncovered, write the missing test — do not weaken the gate, do not add istanbul-ignore comments.

- [ ] **Step 4: Commit**

```bash
git add src/ts/tests/intern_dispatch.spec.ts
git commit -m "test(machine): pin the interned-dispatch guard branches" -- src/ts/tests/intern_dispatch.spec.ts
```

---

### Task 5: Benchmark envelope and full build

**Files:** none committed from benchmarking (local results stay in `build/`; `benchmark/results/` is untracked — never commit local numbers, per `feedback_no_local_benchmark_storage`)

- [ ] **Step 1: Capture the before/after envelope**

```bash
git stash            # park the interning work
npm run make
npm run benny        # BEFORE numbers — copy the table to build/bench-before.txt by hand
git stash pop
npm run make
npm run benny        # AFTER numbers — build/bench-after.txt
```

(If `git stash` is awkward across the many commits, instead check the merge base out in a throwaway worktree for the BEFORE run.) Watch specifically: `ActionCycleTL100Times`, `TransitionCycleTL100Times` (should improve — fewer/cheaper lookups), and the `construct`-flavored benchmarks (must not regress beyond noise; interning adds O(V+E) trivial work — the #682 lesson is that construct cliffs live in parse, but verify, don't assume).

- [ ] **Step 2: Evaluate**

Acceptance: action/transition cycles ≥ no-change (expect improvement); construction within noise (±2–3% on repeated runs). If construction regresses beyond noise, profile before proceeding — likely suspects are the per-edge `intern()` calls (switch Step 5/6 of Task 2 to cache `from_id` across the loop iteration if so).

- [ ] **Step 3: Full build**

Run: `npm run build` (NOT `npm run make` — the full chain regenerates site/docs/changelog/readme; a make-only tree is an invalid release state)
Expected: completes green end-to-end, including the 100% coverage gate and doctests.

- [ ] **Step 4: Commit regenerated artifacts**

```bash
git add dist docs README.md CHANGELOG.long.md CHANGELOG.md custom-elements.json jssm.cli.d.cts jssm.cli.d.ts jssm.es5.d.cts jssm.es6.d.ts jssm_viz.es5.d.cts jssm_viz.es6.d.ts src/doc_md src/ts/fsl_parser.ts src/ts/version.ts package-lock.json
git commit -m "chore(build): regenerate artifacts after interned dispatch"
```

---

### Task 6: Release prep and PR

- [ ] **Step 1: Run `/sc-commit`** (version bump — perf ⇒ patch on the current 5.143.x line — plus full build and conventional commit, on this branch)

- [ ] **Step 2: Push and open the PR against `main`**

```bash
git push -u origin perf_26-06-12_state-interning
gh pr create --base main --title "perf(machine): integer state-id interning for the dispatch path" --body "<summary: what interning is; lever-1 scope (dispatch only; hooks are lever 2); behavioral invariants preserved (list them); local benchmark table from build/bench-*.txt WITH the host caveat that graviton CI numbers are canonical; note _edge_map/_actions remain authoritative for non-dispatch readers>"
```

- [ ] **Step 3: Stop — merging into `main` is a release.** Ask for explicit permission before merging (every time; prior approvals do not carry).

---

### Out of scope (deliberate, for follow-up levers)

- **Lever 2 — hook firing on numeric keys:** `_hooks` / `_named_hooks` / `_entry_hooks` / `_exit_hooks` / post mirrors, their `set_hook` (2768) / `remove_hook` (~2993) registration symmetry, and the pre (3830–3931) and post (3992–4064) firing regions. The benny hook suites measure exactly this; it is its own benchmark-gated PR.
- **`probable_exits_for` / walk machinery** numeric paths.
- Anything columnar (vals, checker visited-sets) — that is v6 work that builds on this.

---

## Self-review notes

- Spec coverage: invisibility invariants ↔ Task 4 tests + full-suite runs in every task; perf claim ↔ Task 5; the four hot lookups identified in research (edge pair, action pair, double action resolution, `state()` call in `current_action_for`) are all addressed; hooks explicitly deferred.
- Type consistency: `Interner.id_of` returns `number | undefined` and every use either guards (`current_action_for`, inline branches) or uses `intern()` where existence is guaranteed (constructor) or `?? NaN` where unknown is legal (`deserialize`). `pair_key(a: number, b: number)` is only called with guarded ids or the deliberate NaN.
- No placeholders: every step carries its code or exact command; the two judgment points (truthiness of `forced_only`, deserialize foreign-state behavior) each specify the verification command and the decision rule with the expected answer.
