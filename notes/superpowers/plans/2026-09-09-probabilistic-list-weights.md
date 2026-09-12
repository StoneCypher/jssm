# Probabilistic List-Target Weights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `a P% -> [b c]` share `P` across the list (group weight × member share) instead of copying `P` onto every member, add optional inner weights `[b 20% c 80%]`, and give `start_states` the same weighted-list form as an initial distribution.

**Architecture:** The grammar gains a weighted-member alternative used only in `ArrowTarget` and `ConfigStartNodes`, producing a tagged node only when a weight is present (plain lists keep their byte-identical array AST). The compiler computes shares and writes `probability = P × share` or, with no outer `P`, a new `share` field on the edge. The runtime picker weighs edges as `(probability ?? 1) × (share ?? 1)`. `Machine` gains a start-state weight map, an accessor, a sampler, and `stochastic_runs` draws a start per run when weights are declared.

**Tech Stack:** TypeScript, pegjs 0.10 (`npm run peg` regenerates the parser), vitest (`npx vitest run --config vitest.spec.config.ts <file> --coverage.enabled=false`; stoch config `vitest.stoch.config.ts`; unicode script `npm run vitest-unicode-config-state-list`).

**Spec:** `notes/superpowers/specs/2026-09-09-probabilistic-list-weights-design.md` — binding on every semantic question.

## Global Constraints

- Shares: with inner weights, `share_i = w_i / Σw`; without, `1/n`. A list mixing weighted and unweighted members is a compile error. Inner weights summing to 0 are a compile error.
- Weighted transition `a P% -> [..]`: each edge `probability = P × share_i`.
- Unweighted transition with inner weights `a -> [b 20% c 80%]`: edges carry `probability: undefined` and `share: share_i`.
- Picker weight for an edge = `(probability ?? 1) × (share ?? 1)`; `probable_exits_for`'s pool rule keys on `probability !== undefined` ONLY (a share-only edge does not evict unweighted siblings).
- Plain lists (`[a b] -> c`, `a -> [b c]`, `end_states: [x y]`, `arrange [a b]`) produce exactly today's AST: an array of names.
- Weighted-list AST node: `{ key: 'weighted_list', members: [{ name, weight? }] }` (plus `loc` under `options.locations`). Only `ArrowTarget` and `start_states` accept weights; a weight anywhere else is a parse error.
- `start_states: [idle 90% booting 10%]`: `start_state_weights()` returns a `Map<StateType, number>` normalized to sum 1 (empty Map when unweighted); `sample_start_state()` draws from the machine RNG; `stochastic_runs` uses it per run when the map is non-empty; the constructed machine's initial state remains `start_states[0]`.
- `JssmTransition.share?: number` is pre-declared `undefined` in `makeTransition` (hidden-class monomorphism, like `probability`).
- No fake tests, no golden files, no snapshot tests. Stochastic assertions use a seeded RNG and a tolerance.
- Do not run `npm run make`, `npm run build`, or `npm install`. You may run `npm run peg`, `npx tsc --noEmit -p tsconfig.json`, `npx eslint <files>`, and vitest on single files with coverage disabled.
- One command per tool call. Never chain commands with `&&`, `||`, `;`, a pipe, or a newline.
- Commit with `git add <paths>` then `git commit -m "<conventional commit>"`; never `git add -A`.

---

### Task 1: Grammar — weighted list members in arrow-target and start_states positions

**Files:**
- Modify: `src/ts/fsl_parser.peg` (`LabelList` ~740, `ArrowTarget` ~811, `ConfigStartNodes` ~1061)
- Modify: `src/ts/jssm_types.ts` (add the AST type near `JssmCompileSe`, ~1035)
- Test: `src/ts/tests/weighted_lists.spec.ts` (new)

**Interfaces:**
- Produces: AST node type `JssmWeightedList = { key: 'weighted_list', members: Array<{ name: string, weight?: number }>, loc?: FslSourceLocation }` exported from `jssm_types.ts`; `ArrowTarget` and `start_states` values are `Array<string> | JssmWeightedList`.

- [ ] **Step 1: Write the failing parse tests**

Create `src/ts/tests/weighted_lists.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

const first_se = (src: string): any => (jssm.parse(src) as any)[0].se;

describe('weighted list grammar', () => {

  it('a plain list target is still a plain array (byte-identical AST)', () => {
    expect(first_se('a -> [b c];').to).toEqual(['b', 'c']);
  });

  it('a plain list source is still a plain array', () => {
    expect((jssm.parse('[a b] -> c;') as any)[0].from).toEqual(['a', 'b']);
  });

  it('inner weights produce a weighted_list node', () => {
    expect(first_se('a 50% -> [b 20% c 80%];').to).toEqual({
      key: 'weighted_list',
      members: [{ name: 'b', weight: 20 }, { name: 'c', weight: 80 }],
    });
  });

  it('weights are decimals in percent, whitespace-tolerant', () => {
    expect(first_se('a -> [ b 0.5%   c 99.5% ];').to).toEqual({
      key: 'weighted_list',
      members: [{ name: 'b', weight: 0.5 }, { name: 'c', weight: 99.5 }],
    });
  });

  it('a partially weighted list parses (the compiler rejects it)', () => {
    expect(first_se('a -> [b 20% c];').to).toEqual({
      key: 'weighted_list',
      members: [{ name: 'b', weight: 20 }, { name: 'c' }],
    });
  });

  it('quoted names take weights too', () => {
    expect(first_se('a -> ["in progress" 30% done 70%];').to.members[0]).toEqual({ name: 'in progress', weight: 30 });
  });

  it('start_states accepts weights', () => {
    const cfg = (jssm.parse('start_states: [idle 90% booting 10%]; idle -> booting;') as any)[0];
    expect(cfg.key).toBe('start_states');
    expect(cfg.value).toEqual({
      key: 'weighted_list',
      members: [{ name: 'idle', weight: 90 }, { name: 'booting', weight: 10 }],
    });
  });

  it('start_states without weights stays a plain array', () => {
    const cfg = (jssm.parse('start_states: [idle booting]; idle -> booting;') as any)[0];
    expect(cfg.value).toEqual(['idle', 'booting']);
  });

  it.each([
    'end_states: [x 50% y 50%]; x -> y;',
    'arrange [a 50% b 50%]; a -> b;',
    'a -> b; &g : [a 50% b 50%];',
  ])('weights are a parse error outside arrow targets and start_states: %s', (src) => {
    expect(() => jssm.parse(src)).toThrow();
  });

  it('locations mode attaches loc to the weighted node', () => {
    const se = (jssm.parse('a -> [b 20% c 80%];', { locations: true } as any) as any)[0].se;
    const to = se.to;
    expect(to.key).toBe('weighted_list');
    expect(to.loc).toBeDefined();
  });

});
```

Check the group-declaration syntax (`&g : [...]`) against the grammar's `NamedList` rule before running; adjust the third parse-error source if the real syntax differs.

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/weighted_lists.spec.ts --coverage.enabled=false`
Expected: the weighted cases FAIL (today `%` inside a list is a parse error); plain cases pass.

- [ ] **Step 3: Add the grammar**

In `src/ts/fsl_parser.peg`, after `LabelList`, add:

```pegjs
// A list member with an optional trailing weight, `name 20%`.  Used only by
// WeightedLabelList; every other list position stays weightless.
WeightedLabelMember
  = name:Label WS? weight:(w:NonNegNumber "%" { return w; })? {
      return weight === null ? { name } : { name, weight };
    }

// A bracketed list whose members may carry weights.  When NO member carries a
// weight the result is the same plain array LabelList produces, so existing
// consumers see no change; when any member does, a tagged node is returned.
WeightedLabelList
  = "[" WS? members:(WeightedLabelMember WS?)* "]" {
      const ms = members.map(i => i[0]);
      if (ms.every(m => m.weight === undefined)) { return ms.map(m => m.name); }
      const node: any = { key: 'weighted_list', members: ms };
      if (options.locations) { node.loc = location(); }
      return node;
    }
```

Change `ArrowTarget`'s `LabelList` alternative to `WeightedLabelList`, and `ConfigStartNodes`'s `value:LabelList` to `value:WeightedLabelList`. Leave every other `LabelList` use untouched.

Note: `NonNegNumber` is the rule `ArrowProbability` uses; a bare label followed by a number would previously have been two labels (`[b 20]` is not valid today because `20` was a bareword only under the 5.x charset — after #754 lands in the sibling worktree, a bare `20` is not a label at all). Confirm with the parse tests that `[b 20% c]` and `[b c]` both behave as specified.

In `src/ts/jssm_types.ts` near `JssmCompileSe`, add and export:

```typescript
/** One member of a weighted list, `name` with an optional percent weight. */
type JssmWeightedListMember = { name: string, weight?: number };

/**
 *  A list target or start-state list carrying per-member weights, as the
 *  parser emits it (`a 50% -> [b 20% c 80%]`, `start_states: [x 90% y 10%]`).
 *  A list with no weights parses to a plain `Array<string>` instead.
 */
type JssmWeightedList = {
  key      : 'weighted_list',
  members  : Array<JssmWeightedListMember>,
  loc?     : FslSourceLocation,
};
```

- [ ] **Step 4: Regenerate, type-check, test**

Run: `npm run peg`
Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/weighted_lists.spec.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add src/ts/fsl_parser.peg src/ts/jssm_types.ts src/ts/tests/weighted_lists.spec.ts
git commit -m "feat(grammar): weighted list members in arrow targets and start_states"
```

---

### Task 2: Compiler — shares, `probability = P × share`, and the `share` edge field

**Files:**
- Modify: `src/ts/jssm_types.ts:440-449` (`JssmTransition` gains `share?: number`)
- Modify: `src/ts/jssm_compiler.ts` (`makeTransition` ~100–190; `compile_rule_transition_step` ~966–1007)
- Test: `src/ts/tests/weighted_lists_compile.spec.ts` (new)

**Interfaces:**
- Consumes: `JssmWeightedList` from Task 1.
- Produces: exported pure helper `list_shares(list: Array<string> | JssmWeightedList): Array<{ name: string, share: number }>` in `jssm_compiler.ts` (throws `JssmError` on mixed or zero-sum weights); edges carry `probability` and/or `share` per Global Constraints.

- [ ] **Step 1: Write the failing compile tests**

Create `src/ts/tests/weighted_lists_compile.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

const edges = (src: string) => jssm.sm`${src}`.list_edges().map(e => ({ from: e.from, to: e.to, probability: e.probability, share: e.share }));
const edge  = (src: string, from: string, to: string) => edges(src).find(e => e.from === from && e.to === to)!;

describe('list_shares', () => {
  it('uniform shares for a plain list', () => {
    expect(jssm.list_shares(['b', 'c'])).toEqual([{ name: 'b', share: 0.5 }, { name: 'c', share: 0.5 }]);
  });
  it('normalized shares for inner weights', () => {
    expect(jssm.list_shares({ key: 'weighted_list', members: [{ name: 'b', weight: 20 }, { name: 'c', weight: 80 }] }))
      .toEqual([{ name: 'b', share: 0.2 }, { name: 'c', share: 0.8 }]);
  });
  it('weights are normalized, so 1%/4% equals 20%/80%', () => {
    expect(jssm.list_shares({ key: 'weighted_list', members: [{ name: 'b', weight: 1 }, { name: 'c', weight: 4 }] }))
      .toEqual([{ name: 'b', share: 0.2 }, { name: 'c', share: 0.8 }]);
  });
  it('rejects a list mixing weighted and unweighted members', () => {
    expect(() => jssm.list_shares({ key: 'weighted_list', members: [{ name: 'b', weight: 20 }, { name: 'c' }] })).toThrow(/every member|all members/i);
  });
  it('rejects inner weights that sum to zero', () => {
    expect(() => jssm.list_shares({ key: 'weighted_list', members: [{ name: 'b', weight: 0 }, { name: 'c', weight: 0 }] })).toThrow(/zero/i);
  });
});

describe('compiled probabilities for list targets', () => {

  it('example A: a 50% -> [b c] shares 50 as 25/25; a sibling keeps 50', () => {
    const src = 'a 50% -> [b c]; a 50% -> d;';
    expect(edge(src, 'a', 'b').probability).toBe(25);
    expect(edge(src, 'a', 'c').probability).toBe(25);
    expect(edge(src, 'a', 'd').probability).toBe(50);
    expect(edge(src, 'a', 'b').share).toBeUndefined();
  });

  it('example B: inner weights multiply the outer probability', () => {
    const src = 'a 50% -> [b 20% c 80%]; a 50% -> d;';
    expect(edge(src, 'a', 'b').probability).toBe(10);
    expect(edge(src, 'a', 'c').probability).toBe(40);
    expect(edge(src, 'a', 'd').probability).toBe(50);
  });

  it('example D: inner weights with no outer probability become shares', () => {
    const src = 'a -> [b 20% c 80%]; a -> d;';
    expect(edge(src, 'a', 'b')).toEqual({ from: 'a', to: 'b', probability: undefined, share: 0.2 });
    expect(edge(src, 'a', 'c')).toEqual({ from: 'a', to: 'c', probability: undefined, share: 0.8 });
    expect(edge(src, 'a', 'd')).toEqual({ from: 'a', to: 'd', probability: undefined, share: undefined });
  });

  it('example E: an unweighted list with no outer probability carries neither field', () => {
    const src = 'a -> [b c];';
    expect(edge(src, 'a', 'b')).toEqual({ from: 'a', to: 'b', probability: undefined, share: undefined });
  });

  it('a list SOURCE is not shared: [a b] 50% -> c gives each source edge 50', () => {
    const src = '[a b] 50% -> c;';
    expect(edge(src, 'a', 'c').probability).toBe(50);
    expect(edge(src, 'b', 'c').probability).toBe(50);
  });

  it('a reverse arrow shares on the list side: [a b] <- 50% e gives e->a 25 and e->b 25', () => {
    const src = '[a b] <- 50% e;';
    expect(edge(src, 'e', 'a').probability).toBe(25);
    expect(edge(src, 'e', 'b').probability).toBe(25);
  });

  it('a two-way arrow shares only the list-target direction', () => {
    const src = 'a 50% <-> 40% [b c];';
    expect(edge(src, 'a', 'b').probability).toBe(25);
    expect(edge(src, 'b', 'a').probability).toBe(40);
  });

  it('a mixed weighted list is a compile error', () => {
    expect(() => jssm.sm`a -> [b 20% c];`).toThrow(/every member|all members/i);
  });

});
```

Read `compile_rule_transition_step` and `makeTransition` before deciding how the two-way case's per-side probabilities map (`r_probability` is the pre-arrow side, `l_probability` the post-arrow side); adjust the two-way test's expected numbers only if the existing mapping contradicts the spec's "per side" rule, and say so in the report.

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/weighted_lists_compile.spec.ts --coverage.enabled=false`
Expected: FAIL (`list_shares` missing; shares not computed).

- [ ] **Step 3: Implement**

In `src/ts/jssm_types.ts` `JssmTransition`, after `probability ? : number,` add:

```typescript
  share       ? : number,                                       // within-list share of an unweighted transition's default weight (6.0 list weights); multiplies probability in the picker
```

In `src/ts/jssm_compiler.ts`, add before `compile_rule_transition_step`:

```typescript
/**
 *  Resolves a list target's members to their within-list shares (6.0 list
 *  weights).  A plain list shares uniformly; a weighted list normalizes its
 *  inner weights.  Pure.
 *  @param list - A plain name array or a parsed weighted list
 *  @returns One entry per member, shares summing to 1
 *  @throws {JssmError} when a weighted list mixes weighted and unweighted members, or its weights sum to zero
 *  @example
 *  list_shares(['b', 'c']);                                               // [{name:'b',share:0.5},{name:'c',share:0.5}]
 *  list_shares({ key:'weighted_list', members:[{name:'b',weight:20},{name:'c',weight:80}] }); // [{name:'b',share:0.2},{name:'c',share:0.8}]
 */
function list_shares(list: Array<string> | JssmWeightedList): Array<{ name: string, share: number }> {

  if (Array.isArray(list)) {
    const share = 1 / list.length;
    return list.map(name => ({ name, share }));
  }

  const weighted   = list.members.filter(m => m.weight !== undefined),
        unweighted = list.members.length - weighted.length;

  if (unweighted > 0 && weighted.length > 0) {
    throw new JssmError(undefined, `A weighted list must weight every member or none; [${list.members.map(m => m.name).join(' ')}] weights ${weighted.length} of ${list.members.length}`);
  }

  const total = weighted.reduce((acc, m) => acc + m.weight, 0);
  if (total === 0) {
    throw new JssmError(undefined, `The weights in [${list.members.map(m => `${m.name} ${m.weight}%`).join(' ')}] sum to zero, so no member can be chosen`);
  }

  return list.members.map(m => ({ name: m.name, share: m.weight / total }));

}
```

Export `list_shares` from `jssm_compiler.ts` and re-export it from `jssm.ts` beside `compile`.

In `makeTransition`, add `share: undefined` to the pre-declared edge literal (after `probability : undefined`).

In `compile_rule_transition_step`, the target may now be a plain array, a weighted node, or a single name. Replace the `uFrom`/`uTo` setup and the inner loop with:

```typescript
  const is_weighted = (x: unknown): x is JssmWeightedList => (typeof x === 'object') && (x !== null) && ((x as any).key === 'weighted_list');

  const from_names : Array<StateType> = is_weighted(from) ? from.members.map(m => m.name as unknown as StateType) : (Array.isArray(from) ? from : [from]);

  // only the TARGET side of a list shares its weight; a list source fans out
  // one full-weight edge per source (unchanged from 5.x)
  const to_shares  : Array<{ name: StateType, share: number }> =
    (Array.isArray(to) || is_weighted(to))
      ? list_shares(to as any).map(s => ({ name: s.name as unknown as StateType, share: s.share }))
      : [{ name: to as StateType, share: 1 }];

  const to_is_list = Array.isArray(to) || is_weighted(to);

  for (const f of from_names) {
    for (const { name: t, share } of to_shares) {

      const right: JssmTransition<StateType, mDT> = makeTransition(this_se, f, t, true);
      if (right.kind !== 'none') { apply_list_share(right, share, to_is_list); acc.push(right); }

      const left: JssmTransition<StateType, mDT> = makeTransition(this_se, t, f, false);
      // (existing one-way rejection block stays exactly as it is)
      ...
      } else {
        acc.push(left);   // the reverse edge leaves the list member, so no share applies
      }
    }
  }
```

and add the helper above it:

```typescript
/**
 *  Applies a list member's share to a compiled edge (6.0 list weights): a
 *  declared probability becomes `P × share`; an undeclared one records the
 *  share itself so the picker can weigh it against unweighted siblings.  A
 *  non-list target (share 1) is left untouched.
 */
function apply_list_share<StateType, mDT>(edge: JssmTransition<StateType, mDT>, share: number, to_is_list: boolean): void {
  if (!to_is_list) { return; }
  if (edge.probability !== undefined) { edge.probability = edge.probability * share; }
  else if (share !== 1)               { edge.share = share; }
}
```

Read the existing loop carefully: the reverse-arrow case (`[a b] <- 50% e`) is compiled with `from = [a b]`, `to = e`, and the REVERSE edge (`e -> a`) carries the list side. Trace which of `right`/`left` leaves `e` toward the list members, and apply the share to THAT edge when the list is on the `from` side of the source text and the arrow has a leftward component. The spec's rule is: the share applies on whichever edge ENTERS the list members. Write the code so both `a 50% -> [b c]` and `[b c] <- 50% a` give 25/25, and `[a b] 50% -> c` gives 50/50.

Also update the `start_states` config handling: in `compile_rule_handler`'s tautology path, `start_states` may now be a weighted node; leave it as-is there (Task 4 consumes it) but make the `result_cfg.start_states` assembly in `compile()` (~1550) use the member NAMES when the value is weighted:

```typescript
  const raw_starts = results.start_states as unknown as Array<StateType> | JssmWeightedList;
  const start_names: Array<StateType> = is_weighted(raw_starts) ? raw_starts.members.map(m => m.name as unknown as StateType) : raw_starts;
```

and pass `start_state_weights` through to the config when weighted (add `start_state_weights?: Array<{ name: StateType, share: number }>` to `JssmGenericConfig` in `jssm_types.ts` ~910):

```typescript
    start_states        : start_names.length > 0 ? start_names : [assembled_transitions[0].from],
    ...(is_weighted(raw_starts) ? { start_state_weights: list_shares(raw_starts).map(s => ({ name: s.name as unknown as StateType, share: s.share })) } : {}),
```

(`results.start_states` is typed as an array; it holds whatever the parser emitted for the single `start_states` rule, so narrow with `is_weighted` before use.)

- [ ] **Step 4: Type-check, lint, test**

Run: `npx tsc --noEmit -p tsconfig.json`
Run: `npx eslint src/ts/jssm_compiler.ts src/ts/jssm_types.ts src/ts/tests/weighted_lists_compile.spec.ts`
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/weighted_lists_compile.spec.ts --coverage.enabled=false`
Expected: all clean / PASS.
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/general.spec.ts src/ts/tests/sample_select.spec.ts --coverage.enabled=false`
Expected: `sample_select.spec.ts` may now fail on its statistical bounds (its expectations assume the 5.x copy model). Do NOT edit it here; report which assertions failed. Task 5 re-derives them.

- [ ] **Step 5: Commit**

```
git add src/ts/jssm_types.ts src/ts/jssm_compiler.ts src/ts/jssm.ts src/ts/tests/weighted_lists_compile.spec.ts
git commit -m "feat(compiler)!: list targets share a transition's probability; inner weights and edge shares"
```

---

### Task 3: Runtime — the picker weighs `(probability ?? 1) × (share ?? 1)`

**Files:**
- Modify: `src/ts/jssm_util.ts:92-125` (`weighted_rand_select`)
- Modify: `src/ts/jssm.ts` (`_assert_selectable_exit_pool` ~3079–3120; `probable_exits_for` docblock ~3020–3040)
- Test: `src/ts/tests/weighted_lists_runtime.spec.ts` (new)
- Test: `src/ts/tests/weighted_lists.stoch.ts` (new, in the stoch config)

**Interfaces:**
- Consumes: edges with `probability`/`share` from Task 2.
- Produces: `weighted_rand_select` (default `'probability'` key only) multiplies by `opt.share` when present.

- [ ] **Step 1: Write the failing runtime tests**

Create `src/ts/tests/weighted_lists_runtime.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

// Seeded histogram over many single probabilistic steps from `from`.
const histo = (src: string, from: string, n: number, seed: number): Map<string, number> => {
  const m = jssm.sm`${src}`;
  m.rng_seed = seed;
  const out = new Map<string, number>();
  for (let i = 0; i < n; ++i) {
    m.force_transition(from);
    m.probabilistic_transition();
    out.set(m.state(), (out.get(m.state()) ?? 0) + 1);
  }
  return out;
};

const near = (got: number, want: number, n: number) => expect(Math.abs(got / n - want)).toBeLessThan(0.04);

describe('list weights at runtime', () => {

  it('example A: 25/25/50 split', () => {
    const n = 4000, h = histo('a 50% -> [b c]; a 50% -> d; [b c d] -> a;', 'a', n, 1);
    near(h.get('b') ?? 0, 0.25, n);
    near(h.get('c') ?? 0, 0.25, n);
    near(h.get('d') ?? 0, 0.50, n);
  });

  it('example B: 10/40/50 split', () => {
    const n = 4000, h = histo('a 50% -> [b 20% c 80%]; a 50% -> d; [b c d] -> a;', 'a', n, 2);
    near(h.get('b') ?? 0, 0.10, n);
    near(h.get('c') ?? 0, 0.40, n);
    near(h.get('d') ?? 0, 0.50, n);
  });

  it('example D: share-only edges weigh against an unweighted sibling as 0.2 : 0.8 : 1', () => {
    const n = 4000, h = histo('a -> [b 20% c 80%]; a -> d; [b c d] -> a;', 'a', n, 3);
    near(h.get('b') ?? 0, 0.10, n);
    near(h.get('c') ?? 0, 0.40, n);
    near(h.get('d') ?? 0, 0.50, n);
  });

  it('share-only edges do not evict unweighted siblings from the pool', () => {
    const m = jssm.sm`a -> [b 20% c 80%]; a -> d;`;
    expect(m.probable_exits_for('a').map(e => e.to).sort()).toEqual(['b', 'c', 'd']);
  });

  it('declared probabilities still evict unweighted siblings (fsl#1248 unchanged)', () => {
    const m = jssm.sm`a 50% -> [b c]; a -> d;`;
    expect(m.probable_exits_for('a').map(e => e.to).sort()).toEqual(['b', 'c']);
  });

  it('weighted_rand_select multiplies probability by share on the default key', () => {
    const rng = jssm.gen_splitmix32(7);
    const opts = [{ to: 'x', probability: 50, share: 0.2 }, { to: 'y', probability: undefined, share: 0.8 }, { to: 'z' }];
    const counts = new Map<string, number>();
    for (let i = 0; i < 4000; ++i) { const k = jssm.weighted_rand_select(opts, undefined, rng).to; counts.set(k, (counts.get(k) ?? 0) + 1); }
    // weights 10 : 0.8 : 1  → 0.847 : 0.068 : 0.085
    near(counts.get('x') ?? 0, 10 / 11.8, 4000);
  });

  it('weighted_rand_select ignores share on a custom key (generic API unchanged)', () => {
    const rng = jssm.gen_splitmix32(8);
    const opts = [{ to: 'x', w: 1, share: 0.001 }, { to: 'y', w: 1 }];
    const counts = new Map<string, number>();
    for (let i = 0; i < 2000; ++i) { const k = jssm.weighted_rand_select(opts, 'w', rng).to; counts.set(k, (counts.get(k) ?? 0) + 1); }
    near(counts.get('x') ?? 0, 0.5, 2000);
  });

});
```

Check that `gen_splitmix32` returns a function compatible with the `rng` parameter (read `jssm_util.ts` `JssmRng`); if it returns something else, wrap accordingly.

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/weighted_lists_runtime.spec.ts --coverage.enabled=false`
Expected: example D and the `weighted_rand_select` share tests FAIL.

- [ ] **Step 3: Implement**

In `weighted_rand_select` (`jssm_util.ts`), change the two weight reads. In the sum loop:

```typescript
  for (const opt of options) {
    const p = named ? opt.probability : opt[probability_property];
    const s = named ? opt.share : undefined;
    prob_sum += ((p === undefined) ? 1 : p) * ((s === undefined) ? 1 : s);
  }
```

and in the cursor advance loop (read the rest of the function), apply the same `× share` to the per-option weight it adds to `cursor_sum`. Update the docblock: "On the default `'probability'` key, an option's `share` (6.0 list weights) multiplies its weight; custom keys ignore `share`."

In `jssm.ts` `_assert_selectable_exit_pool`, the total becomes:

```typescript
    for (const e of exits) {
      total += ((e.probability === undefined) ? 1 : e.probability) * ((e.share === undefined) ? 1 : e.share);
    }
```

`probable_exits_for` needs no code change (it keys on `probability !== undefined`); extend its docblock with one sentence: "Share-only edges (an unweighted transition onto a weighted list) carry no declared probability and so never evict their siblings; their `share` is applied by the picker."

- [ ] **Step 4: Stochastic property test**

Create `src/ts/tests/weighted_lists.stoch.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import * as jssm from '../jssm';

describe('list weights — generative', () => {

  test('compiled list-target probabilities sum to the outer probability', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 6 }),
      fc.integer({ min: 1, max: 100 }),
      (weights, outer) => {
        const names = weights.map((_, i) => `s${i}`);
        const list  = names.map((n, i) => `${n} ${weights[i]}%`).join(' ');
        const m     = jssm.sm`${`a ${outer}% -> [${list}]; [${names.join(' ')}] -> a;`}`;
        const total = m.list_edges().filter(e => e.from === 'a').reduce((acc, e) => acc + (e.probability ?? 0), 0);
        expect(Math.abs(total - outer)).toBeLessThan(1e-9);
      }
    ), { numRuns: 200 });
  });

  test('shares of an unweighted transition onto a weighted list sum to 1', () => {
    fc.assert(fc.property(
      fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 2, maxLength: 6 }),
      (weights) => {
        const names = weights.map((_, i) => `s${i}`);
        const list  = names.map((n, i) => `${n} ${weights[i]}%`).join(' ');
        const m     = jssm.sm`${`a -> [${list}]; [${names.join(' ')}] -> a;`}`;
        const total = m.list_edges().filter(e => e.from === 'a').reduce((acc, e) => acc + (e.share ?? 0), 0);
        expect(Math.abs(total - 1)).toBeLessThan(1e-9);
      }
    ), { numRuns: 200 });
  });

  test('a uniform list and an explicitly equal-weighted list compile identically', () => {
    fc.assert(fc.property(
      fc.integer({ min: 2, max: 6 }), fc.integer({ min: 1, max: 100 }),
      (n, outer) => {
        const names = Array.from({ length: n }, (_, i) => `s${i}`);
        const plain = jssm.sm`${`a ${outer}% -> [${names.join(' ')}]; [${names.join(' ')}] -> a;`}`;
        const equal = jssm.sm`${`a ${outer}% -> [${names.map(x => `${x} 5%`).join(' ')}]; [${names.join(' ')}] -> a;`}`;
        const probs = (m: any) => m.list_edges().filter((e: any) => e.from === 'a').map((e: any) => e.probability);
        expect(probs(equal)).toEqual(probs(plain));
      }
    ), { numRuns: 100 });
  });

});
```

(`jssm.sm` is a tagged template; the `${...}` with a whole-source string works because `sm` joins strings and values.)

- [ ] **Step 5: Type-check, lint, test**

Run: `npx tsc --noEmit -p tsconfig.json`
Run: `npx eslint src/ts/jssm_util.ts src/ts/jssm.ts src/ts/tests/weighted_lists_runtime.spec.ts src/ts/tests/weighted_lists.stoch.ts`
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/weighted_lists_runtime.spec.ts --coverage.enabled=false`
Run: `npx vitest run --config vitest.stoch.config.ts src/ts/tests/weighted_lists.stoch.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 6: Commit**

```
git add src/ts/jssm_util.ts src/ts/jssm.ts src/ts/tests/weighted_lists_runtime.spec.ts src/ts/tests/weighted_lists.stoch.ts
git commit -m "feat(core): the probabilistic picker weighs edge shares from weighted lists"
```

---

### Task 4: Weighted start states — accessor, sampler, and stochastic runs

**Files:**
- Modify: `src/ts/jssm.ts` (fields ~637; constructor destructure ~841–847 and `_start_states` assignment ~925; new methods next to `is_start_state` ~2103; `stochastic_runs` ~3246–3265)
- Modify: `src/ts/jssm_types.ts` (`JssmGenericConfig.start_state_weights` from Task 2 if not yet added)
- Test: `src/ts/tests/weighted_start_states.spec.ts` (new)

**Interfaces:**
- Consumes: `start_state_weights` on the compiled config (Task 2).
- Produces: `Machine.start_state_weights(): Map<StateType, number>`, `Machine.sample_start_state(): StateType`.

- [ ] **Step 1: Write the failing tests**

Create `src/ts/tests/weighted_start_states.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as jssm from '../jssm';

const weighted = () => jssm.sm`start_states: [idle 90% booting 10%]; idle -> busy -> idle; booting -> idle;`;

describe('weighted start states', () => {

  it('start_state_weights normalizes to a sum of 1', () => {
    const w = weighted().start_state_weights();
    expect(w.get('idle')).toBeCloseTo(0.9, 10);
    expect(w.get('booting')).toBeCloseTo(0.1, 10);
    expect([...w.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it('an unweighted machine has an empty weight map', () => {
    expect(jssm.sm`start_states: [idle booting]; idle -> booting;`.start_state_weights().size).toBe(0);
    expect(jssm.sm`a -> b;`.start_state_weights().size).toBe(0);
  });

  it('the constructed machine still starts at the first listed state', () => {
    expect(weighted().state()).toBe('idle');
    expect(jssm.sm`start_states: [booting 10% idle 90%]; idle -> booting;`.state()).toBe('booting');
  });

  it('is_start_state is unchanged', () => {
    const m = weighted();
    expect(m.is_start_state('idle')).toBe(true);
    expect(m.is_start_state('booting')).toBe(true);
    expect(m.is_start_state('busy')).toBe(false);
  });

  it('sample_start_state draws from the weights, seeded', () => {
    const m = weighted();
    m.rng_seed = 11;
    const counts = new Map<string, number>();
    for (let i = 0; i < 2000; ++i) { const s = m.sample_start_state(); counts.set(s, (counts.get(s) ?? 0) + 1); }
    expect(Math.abs((counts.get('idle') ?? 0) / 2000 - 0.9)).toBeLessThan(0.04);
  });

  it('sample_start_state on an unweighted machine returns the first start state', () => {
    expect(jssm.sm`start_states: [x y]; x -> y;`.sample_start_state()).toBe('x');
  });

  it('stochastic_runs starts each run from a sampled start state when weights are declared', () => {
    const m = weighted();
    const runs = [...m.stochastic_runs({ runs: 2000, seed: 5, max_steps: 0 })];
    const booting = runs.filter(r => r.states[0] === 'booting').length;
    expect(Math.abs(booting / 2000 - 0.1)).toBeLessThan(0.04);
  });

  it('stochastic_runs on an unweighted machine still starts from the current state', () => {
    const m = jssm.sm`start_states: [x y]; x -> y -> x;`;
    m.go('y');
    const runs = [...m.stochastic_runs({ runs: 20, seed: 5, max_steps: 0 })];
    expect(runs.every(r => r.states[0] === 'y')).toBe(true);
  });

  it('a weighted start_states naming an unknown state is rejected like an unweighted one', () => {
    expect(() => jssm.sm`start_states: [idle 50% ghost 50%]; idle -> busy;`).toThrow();
  });

});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/weighted_start_states.spec.ts --coverage.enabled=false`
Expected: FAIL (`start_state_weights` is not a function).

- [ ] **Step 3: Implement**

In `Machine`: add the field `_start_state_weights: Map<StateType, number>;` beside `_start_states`; destructure `start_state_weights` from the constructor config (default `undefined`); after `this._start_states = new Set(start_states);` add:

```typescript
    this._start_state_weights = new Map((start_state_weights ?? []).map(s => [s.name, s.share] as [StateType, number]));
```

Add next to `is_start_state`:

```typescript
  /**
   *  The initial distribution declared by a weighted `start_states` list
   *  (6.0), normalized to sum 1.  Empty when the machine's start states are
   *  unweighted.
   *  @returns A map from start state to its share of the distribution.
   *  @example
   *  const m = sm`start_states: [idle 90% booting 10%]; idle -> booting;`;
   *  m.start_state_weights().get('idle');  // => 0.9
   *  @see sample_start_state
   */
  start_state_weights(): Map<StateType, number> {
    return new Map(this._start_state_weights);
  }

  /**
   *  Draws a start state from {@link start_state_weights} using the
   *  machine's RNG; on an unweighted machine returns the first declared
   *  start state.  Does not change the machine's state.
   *  @returns The sampled start state.
   *  @example
   *  const m = sm`start_states: [idle 90% booting 10%]; idle -> booting;`;
   *  ['idle', 'booting'].includes(m.sample_start_state());  // => true
   *  @see start_state_weights
   */
  sample_start_state(): StateType {
    if (this._start_state_weights.size === 0) { return this._start_states.values().next().value as StateType; }
    const opts = [...this._start_state_weights].map(([name, probability]) => ({ name, probability }));
    return weighted_rand_select(opts, undefined, this._rng).name;
  }
```

In `stochastic_runs`, replace `const start: StateType = this.state();` with:

```typescript
    const weighted_start: boolean = this._start_state_weights.size > 0;
    const fixed_start   : StateType = this.state();
```

and the loop body's call with `yield this._stochastic_one_walk(weighted_start ? this.sample_start_state() : fixed_start, max_steps, exit_memo);`. Update the `stochastic_runs` and `stochastic_summary` docblocks with one sentence each about weighted start states.

Confirm the constructor's existing "requested start state … does not exist" validation runs over `start_states` (the names), so the unknown-state test passes without new code; if it does not, add the check.

- [ ] **Step 4: Type-check, lint, test**

Run: `npx tsc --noEmit -p tsconfig.json`
Run: `npx eslint src/ts/jssm.ts src/ts/tests/weighted_start_states.spec.ts`
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/weighted_start_states.spec.ts src/ts/tests/stochastic_summary.spec.ts --coverage.enabled=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```
git add src/ts/jssm.ts src/ts/jssm_types.ts src/ts/tests/weighted_start_states.spec.ts
git commit -m "feat(core): weighted start_states — accessor, sampler, and stochastic runs"
```

---

### Task 5: Re-derive `sample_select`, unicode coverage, docs, and the manifest

**Files:**
- Modify: `src/ts/tests/sample_select.spec.ts:120-173`
- Modify: `src/ts/tests/unicode-config-state-lists.uspec.ts`
- Modify: `notes/fsl-grammar-reference.md` (§6 `ArrowTarget`/`LabelList` ~137–147, §8 `start_states` ~557)
- Modify: `src/help/tutorials/weighted-arrows.md`
- Modify: `src/doc_md/LanguageReference.md` (probability section; grep `%`)
- Modify: `v6_breaking_changes.json`

**Interfaces:** none.

- [ ] **Step 1: Re-derive the sample_select expectations**

The machine at `sample_select.spec.ts:129–134` is:

```
a 0.5% -> [b d e];  b 0.5% -> [a d e];  c 0.5% -> [a b d e];  d 0.5% -> [a b e];
[a b d] <- 0.5% e;  [a b d e] 4% -> c;
```

Under 6.0 sharing, from `a` the exits are b/d/e at 0.5/3 each and c at 4; from `e` the exits are a/b/d at 0.5/3 each and c at 4. Compute the stationary visit counts for 2500 steps by simulation in the test itself rather than by hand: replace the hard-coded "expects 375 requires 250" bounds with a computation from the compiled edges:

```typescript
    // 6.0 list weights: a list target shares the outer probability, so each of
    // the three members of `a 0.5% -> [b d e]` carries 0.5/3.  Derive the
    // expected long-run visit fractions from the compiled edges by power
    // iteration, then require the walk to land within a wide band of them.
    const states = ['a', 'b', 'c', 'd', 'e'];
    const P: Record<string, Record<string, number>> = Object.fromEntries(states.map(s => [s, Object.fromEntries(states.map(t => [t, 0]))]));
    for (const s of states) {
      const exits = weighted.probable_exits_for(s);
      const total = exits.reduce((acc, e) => acc + ((e.probability ?? 1) * (e.share ?? 1)), 0);
      for (const e of exits) { P[s][e.to] = ((e.probability ?? 1) * (e.share ?? 1)) / total; }
    }
    let pi: Record<string, number> = Object.fromEntries(states.map(s => [s, 1 / states.length]));
    for (let i = 0; i < 500; ++i) {
      const next: Record<string, number> = Object.fromEntries(states.map(s => [s, 0]));
      for (const s of states) { for (const t of states) { next[t] += pi[s] * P[s][t]; } }
      pi = next;
    }
    const walk_len = 2500;
    for (const s of states) {
      test(`${s} lands near its stationary share ${pi[s].toFixed(3)}`, () =>
        expect(Math.abs((res.get(s) ?? 0) / walk_len - pi[s])).toBeLessThan(0.06));
    }
```

Remove the five old per-state tests and the "c expects 1050" one; keep the machine and `res` as they are. This is not a fake test: the expected values come from the compiled edges, the observed ones from the walk, and a broken picker or compiler makes them disagree.

- [ ] **Step 2: Unicode**

In `src/ts/tests/unicode-config-state-lists.uspec.ts`, add one more assertion inside the existing per-codepoint test: build `start_states: [${cp_as_name} 60% other 40%]; …` (using the bareword form when it is legal and the quoted form otherwise, following the driver's `bareword_ok` / `quoted` helpers if the #754 worktree has landed them; otherwise quote unconditionally) and assert `m.start_state_weights().get(cp)` is close to 0.6.

Run: `npm run vitest-unicode-config-state-list`
Expected: PASS.

- [ ] **Step 3: Docs**

Grammar reference §6, after the `LabelList` entry, add:

```markdown
### `WeightedLabelList` (arrow targets and `start_states` only)

```
WeightedLabelMember = Label WS? (NonNegNumber "%")?
WeightedLabelList   = "[" WS? (WeightedLabelMember WS?)* "]"
```

Members may carry a percent weight.  With no weights the rule yields the
same plain array `LabelList` does.  **Semantics (6.0):** a probabilistic
transition onto a list keeps its probability as the *group's* weight and
the members share it — uniformly, or by their inner weights (normalized):
`a 50% -> [b c]` gives b 25%, c 25%; `a 50% -> [b 20% c 80%]` gives b 10%,
c 40%.  An unweighted transition onto a weighted list (`a -> [b 20% c 80%]`)
records the shares on the edges, which the picker multiplies against the
default weight (b 0.2, c 0.8 versus a sibling's 1).  Weights on a list
source (`[a b] 50% -> c`) are not shared: each source edge is a separate
transition.  5.x copied the full probability onto every member.
```

§8: change `start_states : <LabelList>;` to `start_states : <WeightedLabelList>;` with the note "`[idle 90% booting 10%]` declares the initial distribution used by `sample_start_state()` and `stochastic_runs`; the constructed machine still starts at the first listed state."

`src/help/tutorials/weighted-arrows.md`: add a short "Lists" section with examples A and B and one sentence on the 5.x difference. `LanguageReference.md`: same two examples where probabilities are introduced.

- [ ] **Step 4: Manifest**

Append to `changes` in `v6_breaking_changes.json`:

```json
    {
      "id": "probabilistic-list-weights",
      "title": "A probabilistic transition onto a list shares its weight across the members",
      "status": "landed",
      "decided": true,
      "issue": null,
      "decision": "Decided 2026-09-09 (examples A–E reviewed): the group keeps the stated weight and members share it, uniformly or by inner weights; inner weights without an outer probability apply to the default weight.",
      "summary": "In 6.0, `a 50% -> [b c]` compiles to a->b 25% and a->c 25% (5.x: 50% each). Lists accept inner weights `[b 20% c 80%]`, and `start_states` accepts the same form as an initial distribution.",
      "breaks": "Any 5.x document whose probabilistic transition targets a list AND has sibling edges from the same state — the list's members now draw less often than before.",
      "migration": "Multiply the outer probability by the member count to keep 5.x odds (`a 50% -> [b c]` becomes `a 100% -> [b c]`), or write inner weights.",
      "implementation": "Landed 2026-09 on the v6 line: WeightedLabelList in fsl_parser.peg (ArrowTarget, start_states), list_shares + apply_list_share in the compiler, JssmTransition.share, share-aware weighted_rand_select, start_state_weights()/sample_start_state(), weighted starts in stochastic_runs."
    }
```

- [ ] **Step 5: Verify and commit**

Run: `node -e "JSON.parse(require('fs').readFileSync('v6_breaking_changes.json','utf8'))"`
Run: `npx vitest run --config vitest.spec.config.ts src/ts/tests/sample_select.spec.ts --coverage.enabled=false`
Expected: PASS.

```
git add src/ts/tests/sample_select.spec.ts src/ts/tests/unicode-config-state-lists.uspec.ts notes/fsl-grammar-reference.md src/help/tutorials/weighted-arrows.md src/doc_md/LanguageReference.md v6_breaking_changes.json
git commit -m "docs(grammar): list-target weights and weighted start_states; re-derive sample_select"
```
