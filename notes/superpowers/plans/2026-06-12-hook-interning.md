# Numeric Hook-Firing Keys (Interning Lever 2, #729) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **In this repository:** subagents cannot mutate sibling worktrees; execute inline via superpowers:executing-plans in `C:\Users\john\projects\worktrees\stonecypher_jssm_perf_26-06-12_hook-interning-729`.

**Goal:** Re-key the hook stores from string-keyed (nested) maps to interned-id numeric maps so hook firing costs numeric probes instead of up to three string probes per store — behaviorally invisible, benchmark-gated, landing on `main` (closes #729).

**Architecture:** The stores **replace** their string keying outright (verified: their only readers are `set_hook`, `remove_hook`, and the two fire regions; no test touches the fields). Registration interns names (`intern` — unknown state names get ids that can never match a live machine state, preserving today's registers-silently-never-fires behavior); removal probes with `id_of` and treats unknown names as not-found. Fire sites reuse the lever-1 ids already in scope (`_state_id`, `newStateId`) plus two new threaded values (`actionId`, `fromStateId`). `_after_hooks` is excluded (mixed state/action key domain, single guarded probe).

**Tech Stack:** TypeScript (`src/ts/jssm.ts`, `src/ts/jssm_intern.ts` already exports `Interner`/`pair_key`), vitest spec suite (100/100/100/100 gate), benny (`npm run benny`; graviton canonical; the hook suites are the target metric).

**Anchors:** line numbers reference `src/ts/jssm.ts` at `5df5ddba` (the lever-1 merge). Locate by quoted code if drifted.

**Behavioral invariants:**
- Hook handlers still receive string names in `hook_args` — only the *storage keys* change.
- Registering a hook for an unknown state/action: silent, never fires (as today).
- Removing a hook for an unknown name: returns `false`, no throw (as today).
- Re-registering over an existing hook replaces it (Map.set semantics, as today).

---

### Task 1: Re-key the stores — declarations, init, `set_hook`, `remove_hook`

**Files:** Modify `src/ts/jssm.ts`

- [ ] **Step 1: Field declarations** (~lines 443–448 and ~470–474). Replace the string-keyed types:

```typescript
  // Numeric interned hook stores (interning lever 2, #729).  Keys are
  // pair_key(from_id, to_id) for the pair maps, an interned action id for
  // the global-action maps, and a state id for entry/exit.  _after_hooks
  // stays string-keyed: its key domain mixes state and action names.
  _hooks                    : Map<number, HookHandler<mDT>>;
  _named_hooks              : Map<number, Map<number, HookHandler<mDT>>>;
  _entry_hooks              : Map<number, HookHandler<mDT>>;
  _exit_hooks               : Map<number, HookHandler<mDT>>;
  _after_hooks              : Map<string, HookHandler<mDT>>;
  _global_action_hooks      : Map<number, HookHandler<mDT>>;
```

and the post mirrors:

```typescript
  _post_hooks                    : Map<number, HookHandler<mDT>>;
  _post_named_hooks              : Map<number, Map<number, HookHandler<mDT>>>;
  _post_entry_hooks              : Map<number, HookHandler<mDT>>;
  _post_exit_hooks               : Map<number, HookHandler<mDT>>;
  _post_global_action_hooks      : Map<number, HookHandler<mDT>>;
```

(Constructor `new Map()` init lines need no change.)

- [ ] **Step 2: `set_hook` registration cases** (~2768+). Replace the bodies of the keyed cases (the kind flags and `_has_*` writes stay):

```typescript
      case 'hook': {
        this._hooks.set(
          pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to)),
          HookDesc.handler,
        );
        this._has_hooks       = true;
        this._has_basic_hooks = true;
        break;
      }

      case 'named': {
        const pk = pair_key(this._state_interner.intern(HookDesc.from), this._state_interner.intern(HookDesc.to));
        let inner = this._named_hooks.get(pk);
        if (inner === undefined) {
          inner = new Map();
          this._named_hooks.set(pk, inner);
        }
        inner.set(this._action_interner.intern(HookDesc.action), HookDesc.handler);
        this._has_hooks       = true;
        this._has_named_hooks = true;
        break;
      }

      case 'global action':
        this._global_action_hooks.set( this._action_interner.intern(HookDesc.action), HookDesc.handler );
        this._has_hooks               = true;
        this._has_global_action_hooks = true;
        break;

      case 'entry':
        this._entry_hooks.set( this._state_interner.intern(HookDesc.to), HookDesc.handler );
        this._has_hooks       = true;
        this._has_entry_hooks = true;
        break;

      case 'exit':
        this._exit_hooks.set( this._state_interner.intern(HookDesc.from), HookDesc.handler );
        this._has_hooks      = true;
        this._has_exit_hooks = true;
        break;
```

Post mirrors `'post hook'` / `'post named'` / `'post global action'` / `'post entry'` / `'post exit'` get the identical transformation against their `_post_*` stores and `_has_post_*` flags. `'after'` and all handler-slot cases (`any action`, transition-kind, everything) are untouched.

- [ ] **Step 3: `remove_hook` cases** (~3025+). Unknown names must yield `false` without interning (`id_of`, not `intern` — removal must not grow the tables):

```typescript
      case 'hook': {
        const fid = this._state_interner.id_of(HookDesc.from),
              tid = this._state_interner.id_of(HookDesc.to);
        removed = (fid !== undefined) && (tid !== undefined) && this._hooks.delete(pair_key(fid, tid));
        break;
      }

      case 'named': {
        const fid = this._state_interner.id_of(HookDesc.from),
              tid = this._state_interner.id_of(HookDesc.to),
              aid = this._action_interner.id_of(HookDesc.action);
        const inner = ((fid === undefined) || (tid === undefined)) ? undefined : this._named_hooks.get(pair_key(fid, tid));
        removed = (inner !== undefined) && (aid !== undefined) && inner.delete(aid);
        break;
      }

      case 'global action': {
        const aid = this._action_interner.id_of(HookDesc.action);
        removed = (aid !== undefined) && this._global_action_hooks.delete(aid);
        break;
      }

      case 'entry': {
        const tid = this._state_interner.id_of(HookDesc.to);
        removed = (tid !== undefined) && this._entry_hooks.delete(tid);
        break;
      }

      case 'exit': {
        const fid = this._state_interner.id_of(HookDesc.from);
        removed = (fid !== undefined) && this._exit_hooks.delete(fid);
        break;
      }
```

Post mirrors identically. `'after'` untouched.

- [ ] **Step 4: typecheck only** — Run `npx tsc --build tsconfig.json` (or rely on diagnostics): the fire sites still use string keys and now fail to typecheck. That is expected mid-task; proceed straight to Task 2 (commit happens after both).

### Task 2: Convert the fire sites

**Files:** Modify `src/ts/jssm.ts` — `transition_impl`

- [ ] **Step 1: Thread `actionId`.** In the `let valid ... newStateId : number = NaN,` declaration block add `actionId : number = NaN,` and replace the `wasAction` branch's resolution so the id is captured rather than hidden inside `current_action_for`:

```typescript
    } else if (wasAction) {
      // single numeric resolution; aid is kept for the hook probes below
      const aid    = this._action_interner.id_of(newStateOrAction);
      const edgeId = (aid === undefined) ? undefined : this._edge_id_by_action_pair.get(pair_key(aid, this._state_id));
      if (edgeId !== undefined) {
        const edge: JssmTransition<StateType, mDT> = this._edges[edgeId];
        valid      = true;
        trans_type = edge.kind;
        newState   = edge.to;
        newStateId = this._edge_to_ids[edgeId];
        fromAction = newStateOrAction;
        actionId   = aid;
      }
    }
```

- [ ] **Step 2: Capture `fromStateId`.** Next to `const fromState: StateType = this._state;` (~3858) add:

```typescript
    const fromStateId: number = this._state_id;
```

- [ ] **Step 3: Pre-fire probes** (~3880–3975):

| probe | old | new |
|---|---|---|
| global action (1b) | `this._global_action_hooks.get(newStateOrAction)` | `this._global_action_hooks.get(actionId)` |
| exit (4) | `this._exit_hooks.get(this._state)` | `this._exit_hooks.get(this._state_id)` |
| named (5) | `byTo = this._named_hooks.get(this._state)` / `byAct = byTo...get(newState)` / `nh = byAct...get(newStateOrAction)` | `const byPair = this._named_hooks.get(pair_key(this._state_id, newStateId));` / `const nh = byPair === undefined ? undefined : byPair.get(actionId);` |
| basic (6) | `byTo = this._hooks.get(this._state)` / `h = byTo...get(newState)` | `const h = this._hooks.get(pair_key(this._state_id, newStateId));` |
| entry (8) | `this._entry_hooks.get(newState)` | `this._entry_hooks.get(newStateId)` |

- [ ] **Step 4: Post-fire probes** (~4054–4128):

| probe | old | new |
|---|---|---|
| post global action (2) | `this._post_global_action_hooks.get(hook_args.action)` | `this._post_global_action_hooks.get(actionId)` |
| post exit (4) | `this._post_exit_hooks.get(hook_args.from)` | `this._post_exit_hooks.get(fromStateId)` |
| post named (5) | three nested string gets | `const byPair = this._post_named_hooks.get(pair_key(fromStateId, newStateId));` / `const pnh = byPair === undefined ? undefined : byPair.get(actionId);` |
| post basic (6) | two nested string gets | `const hook = this._post_hooks.get(pair_key(fromStateId, newStateId));` |
| post entry (8) | `this._post_entry_hooks.get(hook_args.to)` | `this._post_entry_hooks.get(newStateId)` |

(Post probes run only on the valid path, after commit — `this._state_id` is already the *new* state there, which is why `fromStateId` must be the captured value, not the live field.)

- [ ] **Step 5: Run the full spec suite** — `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false`. Expected: all pass (the 1,681-test hook suite and 55-test posthook suite are the real referee).

- [ ] **Step 6: Diagnostics on `src/ts/jssm.ts`** — expected clean.

- [ ] **Step 7: Commit**

```bash
git commit -m "perf(machine): numeric interned keys for hook storage and firing (#729)" -- src/ts/jssm.ts
```

### Task 3: Coverage for the new guard branches

**Files:** Create/extend `src/ts/tests/intern_dispatch.spec.ts` (same home as lever 1's guards)

- [ ] **Step 1: Run the suite WITH coverage** — `npx vitest run --config vitest.spec.config.ts` — and list what the gate demands. Expected gaps: the `id_of === undefined` arms in `remove_hook` (unknown from / unknown to / unknown action, pre and post variants), possibly unknown-name `set_hook` behavior.

- [ ] **Step 2: Add the tests** (shape below; extend per the actual gap list):

```typescript
describe('interned hooks — unknown-name guards', () => {

  test('hooks registered for unknown states never fire and do not disturb the machine', () => {
    let fired = 0;
    const m = jssm.from('a -> b;');
    m.hook('nope', 'also_nope', () => { fired++; });
    m.hook_entry('never_a_state', () => { fired++; });
    expect(m.transition('b')).toBe(true);
    expect(fired).toBe(0);
    expect(m.state()).toBe('b');
  });

  test('removing hooks by unknown names reports false', () => {
    const m = jssm.from(`a 'go' -> b;`);
    m.hook('a', 'b', () => undefined);
    expect(m.remove_hook({ kind: 'hook', from: 'zzz', to: 'b'   })).toBe(false);
    expect(m.remove_hook({ kind: 'hook', from: 'a',   to: 'zzz' })).toBe(false);
    expect(m.remove_hook({ kind: 'hook', from: 'a',   to: 'b'   })).toBe(true);
  });

  // ...named / global action / entry / exit / post mirrors per the gap list

});
```

(Check `remove_hook`'s actual public signature/types before writing — if hooks are removed via dedicated public wrappers, use those instead of raw descriptors.)

- [ ] **Step 3: Re-run with coverage** — gate must hold 100/100/100/100. Iterate until it does.

- [ ] **Step 4: Commit**

```bash
git add src/ts/tests/intern_dispatch.spec.ts
git commit -m "test(machine): unknown-name guards for interned hook registration and removal" -- src/ts/tests/intern_dispatch.spec.ts
```

### Task 4: Benchmark envelope + full build

- [ ] BEFORE: `git checkout 5df5ddba -- src/ts/jssm.ts` → `npm run make` → `npm run benny > build/bench-before.txt` → `git checkout HEAD -- src/ts/jssm.ts`
- [ ] AFTER: `npm run make` → `npm run benny > build/bench-after.txt` (twice if anything looks odd — this host needs replication, see lever 1)
- [ ] Compare with `node build/bench_diff.cjs` (copy the lever-1 script from the sibling worktree's `build/` if absent). Watch the hooked benny cases specifically; construct must hold within noise.
- [ ] `npm run build` (full) — green end-to-end.
- [ ] Commit artifacts (standard pathspec set).

### Task 5: Land it (user-authorized through merge)

- [ ] `/sc-commit`-style bump: check `npm view jssm version` immediately before choosing the patch number (the parallel session may have released again).
- [ ] Push; `gh pr create --base main` with the table + host caveat + `Closes #729`.
- [ ] Watch checks; on green, `gh pr merge --merge`. If GraphQL reports conflicts, sync-cycle: merge `origin/main`, take theirs on artifacts, re-bump, rebuild, push, retry.

---

## Self-review notes

- Replacement (not duplication) is justified by the reader census done in-session; the census is restated in the Architecture line.
- `intern` on register / `id_of` on remove is the growth-correct pairing; removal never creates ids.
- Post-region correctness hinges on `fromStateId` being captured pre-commit; called out twice.
- `_after_hooks` exclusion is stated with its reason in the field-declaration comment so the next reader doesn't "fix" it.
