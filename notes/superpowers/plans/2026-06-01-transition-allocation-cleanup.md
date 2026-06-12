# Transition Allocation Cleanup + Benchmark Comparison Generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a benchmark comparison-table generator and reduce per-transition allocations in `transition_impl`, shipped in one PR under sub-issue #670 (umbrella #636).

**Architecture:** Two independent deliverables. (1) A self-contained Node CLI (`src/scripts/benchmark_compare.cjs`) of pure functions that diff two or three historic benchmark JSONs into markdown tables. (2) Two behavior-preserving optimizations in `src/ts/jssm.ts`: guard the `hook_args` literal so it is only built when hooks exist, and gate the trailing observation-event block on a live `_event_listener_count` so detail literals are not allocated when nobody is subscribed.

**Tech Stack:** TypeScript (library), Node `.cjs` (scripts + benchmarks), vitest (`*.spec.ts`, 100% coverage on `src/ts/**`), benny (scaling benchmark).

---

## Critical project constraints (read before starting)

- **Spec suite enforces 100% branch/function/line/statement coverage on `src/ts/**`** (`vitest.spec.config.ts`). Every new branch in `jssm.ts` must be exercised by a test, and **no dead/impossible branches may be introduced** (they make 100% unreachable). The generator lives in `src/scripts/**`, which is *outside* the coverage `include`, so it is not coverage-gated — but it still gets real unit tests.
- **No compound shell commands** (`&&`, `||`, `;`, `|`). Run each command as its own call.
- **`git` verb comes first** — never `git -C ...`. `cd` as a standalone step if needed.
- **Benchmarking and full builds run from the main session, not a subagent** (long `benny`/`build` runs truncate subagent summaries; subagent pushes hit SSH errors). Tasks 2 and 7 are marked main-session.
- Tests use `describe`/`test`/`expect` as globals (vitest `globals: true`); import the library with `import { sm, from as sm_from, Machine } from '../jssm';`.
- **No golden-file/snapshot tests** — assert on substrings/specific rows. **No fake tests** — assert real computed output. **Never pin bugs.**
- To iterate on one spec file without the coverage gate failing on unrelated files:
  `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false <file.spec.ts>`

---

## File Structure

- **Create** `src/scripts/benchmark_compare.cjs` — pure comparison/render functions + thin CLI (`require.main === module`). Exports: `loadBenchmark`, `pivot`, `factor`, `formatOps`, `formatFactor`, `buildComparison`, `renderMarkdown`.
- **Create** `src/scripts/tests/benchmark_compare.spec.ts` — unit tests for the generator's pure functions.
- **Create** `src/scripts/tests/fixtures/bench_a.json`, `bench_b.json`, `bench_c.json` — tiny benchmark envelopes for `loadBenchmark`/end-to-end tests.
- **Create** `src/historic_benchmarks/benchmark_2026-06-01_pre-alloc-cleanup.json` — pre-change "previous" snapshot (Task 2).
- **Create** `src/historic_benchmarks/benchmark_2026-06-01_alloc-cleanup.json` — post-change "current" snapshot (Task 7).
- **Modify** `src/ts/jssm.ts`:
  - field declaration block (~line 435) — add `_event_listener_count`.
  - constructor (~line 610) — initialize it.
  - `off()` (~2373), `_subscribe` (~2423-2425), `_fire` once-removal (~2468) — route removals through a new `_unsubscribe_entry` helper; increment on subscribe.
  - `hook_args` construction (~3458) — guard the allocation.
  - observation-event block (~3764-3801) — wrap in the listener-count gate.
- **Modify** `src/ts/tests/events.spec.ts` — add counter-bookkeeping and gate guard tests.

---

## Task 1: Benchmark comparison generator

**Files:**
- Create: `src/scripts/benchmark_compare.cjs`
- Create: `src/scripts/tests/benchmark_compare.spec.ts`
- Create: `src/scripts/tests/fixtures/bench_a.json`, `bench_b.json`, `bench_c.json`

- [ ] **Step 1: Create the three fixture files**

`src/scripts/tests/fixtures/bench_a.json`:
```json
{
  "name": "scaling",
  "date": "2026-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "results": [
    { "name": "chain-10 transition()", "ops": 100 },
    { "name": "chain-50 transition()", "ops": 50 },
    { "name": "chain-10 edges_between()", "ops": 10 }
  ]
}
```

`src/scripts/tests/fixtures/bench_b.json`:
```json
{
  "name": "scaling",
  "date": "2026-02-01T00:00:00.000Z",
  "version": "1.1.0",
  "results": [
    { "name": "chain-10 transition()", "ops": 150 },
    { "name": "chain-50 transition()", "ops": 60 },
    { "name": "chain-10 edges_between()", "ops": 20 }
  ]
}
```

`src/scripts/tests/fixtures/bench_c.json`:
```json
{
  "name": "scaling",
  "date": "2026-03-01T00:00:00.000Z",
  "version": "1.2.0",
  "results": [
    { "name": "chain-10 transition()", "ops": 300 },
    { "name": "chain-50 transition()", "ops": 90 },
    { "name": "chain-99 transition()", "ops": 5 },
    { "name": "chain-10 edges_between()", "ops": 40 }
  ]
}
```

- [ ] **Step 2: Write the failing test**

`src/scripts/tests/benchmark_compare.spec.ts`:
```ts
import { createRequire } from 'node:module';
import * as path from 'node:path';

const require = createRequire(import.meta.url);
const bc = require('../benchmark_compare.cjs');

const fixture = (n: string) => path.join(__dirname, 'fixtures', n);

describe('benchmark_compare pure helpers', () => {

  test('factor divides current by reference', () => {
    expect(bc.factor(300, 100)).toBe(3);
    expect(bc.factor(300, 150)).toBe(2);
  });

  test('factor returns null on missing or zero reference', () => {
    expect(bc.factor(5, 0)).toBe(null);
    expect(bc.factor(5, null)).toBe(null);
    expect(bc.factor(null, 5)).toBe(null);
  });

  test('formatOps inserts thousands separators and dashes nulls', () => {
    expect(bc.formatOps(1234567)).toBe('1,234,567');
    expect(bc.formatOps(null)).toBe('—');
  });

  test('formatFactor renders two decimals with the times sign', () => {
    expect(bc.formatFactor(3)).toBe('3.00×');
    expect(bc.formatFactor(null)).toBe('—');
  });

  test('pivot groups ops by operation then shape', () => {
    const opsByName = new Map([
      ['chain-10 transition()', 100],
      ['chain-50 transition()', 50],
      ['chain-10 edges_between()', 10]
    ]);
    const p = bc.pivot(opsByName);
    expect(p.get('transition()').get('chain-10')).toBe(100);
    expect(p.get('edges_between()').get('chain-10')).toBe(10);
  });

  test('loadBenchmark reads version, date, and an ops map', () => {
    const b = bc.loadBenchmark(fixture('bench_a.json'));
    expect(b.version).toBe('1.0.0');
    expect(b.date).toBe('2026-01-01T00:00:00.000Z');
    expect(b.opsByName.get('chain-10 transition()')).toBe(100);
  });

});

describe('benchmark_compare three-file comparison', () => {

  const render = () => {
    const benches = ['bench_a.json', 'bench_b.json', 'bench_c.json']
      .map((n) => bc.loadBenchmark(fixture(n)));
    return bc.renderMarkdown(bc.buildComparison(benches));
  };

  test('emits vs prev and vs orig factors for a shared shape', () => {
    // chain-10 transition(): orig 100, prev 150, curr 300 -> vsPrev 2.00×, vsOrig 3.00×
    expect(render()).toContain('| chain-10 | 100 | 150 | 300 | 2.00× | 3.00× |');
  });

  test('a shape only present in current renders dashes for missing columns', () => {
    // chain-99 transition() exists only in bench_c
    expect(render()).toContain('| chain-99 | — | — | 5 | — | — |');
  });

  test('groups tables by operation in canonical order', () => {
    const out = render();
    expect(out).toContain('### `transition()` ops/sec');
    expect(out).toContain('### `edges_between()` ops/sec');
    expect(out.indexOf('transition()')).toBeLessThan(out.indexOf('edges_between()'));
  });

});

describe('benchmark_compare two-file comparison', () => {

  test('omits the previous and vs-prev columns', () => {
    const benches = ['bench_a.json', 'bench_c.json']
      .map((n) => bc.loadBenchmark(fixture(n)));
    const out = bc.renderMarkdown(bc.buildComparison(benches));
    // chain-10 transition(): orig 100, curr 300 -> vsOrig 3.00×
    expect(out).toContain('| chain-10 | 100 | 300 | 3.00× |');
    expect(out).not.toContain('vs prev');
  });

});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false benchmark_compare.spec.ts`
Expected: FAIL — `Cannot find module '../benchmark_compare.cjs'`.

- [ ] **Step 4: Implement the generator**

`src/scripts/benchmark_compare.cjs`:
```js
'use strict';

/**
 *  Benchmark comparison generator.  Reads two or three historic benchmark
 *  JSON envelopes (as written by `src/buildjs/benchmark_scaling.cjs`) and
 *  emits the markdown delta tables used in the #636 perf-tracking comments,
 *  removing the hand-transcription step from each writeup.
 *
 *  CLI:
 *    node src/scripts/benchmark_compare.cjs <original.json> <current.json>
 *    node src/scripts/benchmark_compare.cjs <original.json> <previous.json> <current.json>
 *
 *  Two files -> `original`, `current`, `vs orig`.  Three files -> adds
 *  `previous` and `vs prev`.  Output is markdown on stdout.
 */

const fs = require('fs');

// Tables are emitted in this order; operations absent from the current file
// are skipped.
const OPERATION_ORDER = ['transition()', 'edges_between()', 'has_state()', 'construct()'];

/**
 *  Load one benchmark envelope from disk.
 *
 *  @param path Filesystem path to a `scaling.json`-shaped file.
 *  @returns `{ version, date, opsByName }` where `opsByName` maps each
 *           `"<shape> <operation>"` name to its ops/sec number.
 *
 *  @example
 *  loadBenchmark('src/historic_benchmarks/benchmark_2026-05-26.json').version
 *  // => '5.128.0'
 */
function loadBenchmark(path) {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
  const opsByName = new Map();
  for (const r of raw.results) { opsByName.set(r.name, r.ops); }
  return { version: raw.version, date: raw.date, opsByName };
}

/**
 *  Pivot a flat ops map into operation -> shape -> ops by splitting each
 *  result name at its final space (`"chain-200 transition()"` -> op
 *  `"transition()"`, shape `"chain-200"`).
 *
 *  @param opsByName Map of `"<shape> <operation>"` to ops/sec.
 *  @returns Map of operation to (Map of shape to ops/sec).
 */
function pivot(opsByName) {
  const ops = new Map();
  for (const [name, value] of opsByName) {
    const i     = name.lastIndexOf(' ');
    const shape = name.slice(0, i);
    const op    = name.slice(i + 1);
    if (!ops.has(op)) { ops.set(op, new Map()); }
    ops.get(op).set(shape, value);
  }
  return ops;
}

/**
 *  Speedup factor of `current` over `reference`.
 *
 *  @param current   Current ops/sec, or null/undefined if the shape is absent.
 *  @param reference Reference ops/sec, or null/undefined if absent.
 *  @returns `current / reference`, or `null` when either side is missing or
 *           the reference is zero (avoids divide-by-zero / NaN in the table).
 *
 *  @example factor(300, 150) // => 2
 *  @example factor(5, 0)     // => null
 */
function factor(current, reference) {
  if (current == null || reference == null || reference === 0) { return null; }
  return current / reference;
}

/**
 *  Format an ops/sec value with thousands separators, or `—` when null.
 *
 *  @example formatOps(1234567) // => '1,234,567'
 */
function formatOps(n) {
  if (n == null) { return '—'; }
  return n.toLocaleString('en-US');
}

/**
 *  Format a speedup factor as `X.XX×`, or `—` when null.
 *
 *  @example formatFactor(3) // => '3.00×'
 */
function formatFactor(f) {
  if (f == null) { return '—'; }
  return f.toFixed(2) + '×';
}

/**
 *  Build the comparison structure from 2 or 3 loaded benchmarks.  The first
 *  is the original baseline, the last is current; a middle entry (3-file
 *  form) is the previous step.
 *
 *  @param benchmarks Array of `{ version, date, opsByName }`, length 2 or 3.
 *  @returns `{ hasPrevious, original, previous, current, operations }`, where
 *           `operations` is an ordered list of `{ operation, rows }` and each
 *           row is `{ shape, original, previous?, current, vsPrev?, vsOrig }`.
 *  @throws Error if `benchmarks` is not length 2 or 3.
 */
function buildComparison(benchmarks) {
  if (benchmarks.length < 2 || benchmarks.length > 3) {
    throw new Error(`expected 2 or 3 benchmarks, got ${benchmarks.length}`);
  }
  const hasPrevious = benchmarks.length === 3;
  const original    = benchmarks[0];
  const current     = benchmarks[benchmarks.length - 1];
  const previous    = hasPrevious ? benchmarks[1] : null;

  const origPivot = pivot(original.opsByName);
  const currPivot = pivot(current.opsByName);
  const prevPivot = previous ? pivot(previous.opsByName) : null;

  const getOp = (p, op, shape) => {
    const byShape = p.get(op);
    if (byShape === undefined) { return null; }
    const v = byShape.get(shape);
    return v === undefined ? null : v;
  };

  const operations = [];
  for (const op of OPERATION_ORDER) {
    const currOps = currPivot.get(op);
    if (currOps === undefined) { continue; }
    const rows = [];
    for (const [shape, currentVal] of currOps) {
      const originalVal = getOp(origPivot, op, shape);
      const previousVal = prevPivot ? getOp(prevPivot, op, shape) : null;
      rows.push({
        shape,
        original : originalVal,
        previous : hasPrevious ? previousVal : undefined,
        current  : currentVal,
        vsPrev   : hasPrevious ? factor(currentVal, previousVal) : undefined,
        vsOrig   : factor(currentVal, originalVal)
      });
    }
    operations.push({ operation: op, rows });
  }
  return { hasPrevious, original, previous, current, operations };
}

/**
 *  Render a comparison (from {@link buildComparison}) to markdown: a header
 *  naming each input's version/date, then one table per operation.
 *
 *  @param comparison The structure returned by {@link buildComparison}.
 *  @returns A markdown string suitable for pasting into a #636 comment.
 *  @see buildComparison
 */
function renderMarkdown(comparison) {
  const { hasPrevious, original, previous, current, operations } = comparison;
  const lines = [];

  lines.push('## Comparison');
  lines.push('');
  lines.push(`- original: ${original.version} (${original.date})`);
  if (hasPrevious) { lines.push(`- previous: ${previous.version} (${previous.date})`); }
  lines.push(`- current: ${current.version} (${current.date})`);
  lines.push('');

  for (const { operation, rows } of operations) {
    lines.push(`### \`${operation}\` ops/sec`);
    lines.push('');
    if (hasPrevious) {
      lines.push('| shape | original | previous | current | vs prev | vs orig |');
      lines.push('|---|---:|---:|---:|---:|---:|');
      for (const r of rows) {
        lines.push(`| ${r.shape} | ${formatOps(r.original)} | ${formatOps(r.previous)} | ${formatOps(r.current)} | ${formatFactor(r.vsPrev)} | ${formatFactor(r.vsOrig)} |`);
      }
    } else {
      lines.push('| shape | original | current | vs orig |');
      lines.push('|---|---:|---:|---:|');
      for (const r of rows) {
        lines.push(`| ${r.shape} | ${formatOps(r.original)} | ${formatOps(r.current)} | ${formatFactor(r.vsOrig)} |`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

/**
 *  CLI entry point: parse argv, load the files, print the rendered markdown.
 *  Exits non-zero with a usage message on a wrong argument count.
 */
function main(argv) {
  const paths = argv.slice(2);
  if (paths.length < 2 || paths.length > 3) {
    process.stderr.write('usage: node benchmark_compare.cjs <original.json> [previous.json] <current.json>\n');
    process.exit(1);
    return;
  }
  const benchmarks = paths.map(loadBenchmark);
  process.stdout.write(renderMarkdown(buildComparison(benchmarks)) + '\n');
}

module.exports = { loadBenchmark, pivot, factor, formatOps, formatFactor, buildComparison, renderMarkdown };

if (require.main === module) { main(process.argv); }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false benchmark_compare.spec.ts`
Expected: PASS — all tests green.

- [ ] **Step 6: Smoke-test the CLI against real historic data**

Run: `node src/scripts/benchmark_compare.cjs src/historic_benchmarks/benchmark_2026-05-26.json src/historic_benchmarks/benchmark_2026-05-26_adjacency-index.json src/historic_benchmarks/benchmark_2026-05-27_hook-dispatch.json`
Expected: markdown tables on stdout with `## Comparison`, a `### \`transition()\` ops/sec` table, and populated `vs prev` / `vs orig` factor columns.

- [ ] **Step 7: Check IDE diagnostics**

Run `mcp__ide__getDiagnostics` and confirm no new errors/warnings in `benchmark_compare.cjs` or `benchmark_compare.spec.ts`.

- [ ] **Step 8: Commit**

```
git add src/scripts/benchmark_compare.cjs src/scripts/tests/benchmark_compare.spec.ts src/scripts/tests/fixtures/bench_a.json src/scripts/tests/fixtures/bench_b.json src/scripts/tests/fixtures/bench_c.json
git commit -m "feat: add benchmark comparison-table generator (#670)"
```

---

## Task 2: Capture the pre-change baseline (MAIN SESSION, not a subagent)

**Files:**
- Create: `src/historic_benchmarks/benchmark_2026-06-01_pre-alloc-cleanup.json`

> This must run on the current source **before** any `jssm.ts` change so it captures the true "previous" point. `benny:scaling` requires a built `dist/`.

- [ ] **Step 1: Rebuild dist from current source**

Run: `npm run make`
Expected: completes; `dist/jssm.es5.cjs` regenerated.

- [ ] **Step 2: Run the scaling benchmark**

Run: `npm run benny:scaling`
Expected: completes after the 12-shape × 4-op sweep; writes `benchmark/results/scaling.json`.

- [ ] **Step 3: Copy the result into the historic snapshot**

Run (PowerShell): `Copy-Item benchmark/results/scaling.json src/historic_benchmarks/benchmark_2026-06-01_pre-alloc-cleanup.json`
Expected: file exists.

- [ ] **Step 4: Commit**

```
git add src/historic_benchmarks/benchmark_2026-06-01_pre-alloc-cleanup.json
git commit -m "chore: snapshot pre-alloc-cleanup benchmark baseline (#670)"
```

---

## Task 3: Event listener count bookkeeping (B2, part 1)

**Files:**
- Modify: `src/ts/jssm.ts` (field decl ~435, constructor ~610, `off()` ~2373, `_subscribe` ~2423-2425, `_fire` once-removal ~2468)
- Modify: `src/ts/tests/events.spec.ts`

- [ ] **Step 1: Write the failing test** (append to `src/ts/tests/events.spec.ts`)

```ts
describe('_event_listener_count bookkeeping', () => {

  test('tracks live subscriptions across on/off/once/unsubscribe', () => {
    const m = sm`a -> b -> c -> d;`;
    const internal = m as unknown as { _event_listener_count: number };

    expect(internal._event_listener_count).toBe(0);

    const off1 = m.on('transition', () => {});
    expect(internal._event_listener_count).toBe(1);

    const fn = () => {};
    m.on('entry', fn);
    expect(internal._event_listener_count).toBe(2);

    m.once('exit', () => {});
    expect(internal._event_listener_count).toBe(3);

    // off() by reference decrements
    expect(m.off('entry', fn)).toBe(true);
    expect(internal._event_listener_count).toBe(2);

    // unsubscribe closure decrements
    off1();
    expect(internal._event_listener_count).toBe(1);

    // calling the same unsubscribe closure again must NOT decrement past the
    // real removal (idempotent — exercises the Set.delete === false path)
    off1();
    expect(internal._event_listener_count).toBe(1);

    // once auto-removal on fire decrements the remaining 'exit' listener
    m.transition('b');
    expect(internal._event_listener_count).toBe(0);
  });

});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false events.spec.ts`
Expected: FAIL — `_event_listener_count` is `undefined`, so the first `toBe(0)` fails.

- [ ] **Step 3: Declare the field** (in `src/ts/jssm.ts`, immediately after the `_event_handlers` declaration ~line 435)

```ts
  _event_handlers : Map<JssmEventName, Set<JssmEventEntry<any, any>>>;
  // Live count of registered event subscriptions across all event names.
  // Maintained by _subscribe (single add site) and _unsubscribe_entry (the
  // sole removal helper) so transition_impl can skip building observation-
  // event detail objects when nothing is listening.  See #670.
  _event_listener_count : number;
```

- [ ] **Step 4: Initialize it in the constructor** (immediately after `this._event_handlers = new Map();` ~line 610)

```ts
    this._event_handlers                = new Map();
    this._event_listener_count          = 0;
```

- [ ] **Step 5: Add the removal helper** (place it just above `_subscribe`, after `off()`)

```ts
  /**
   *  Remove one event-subscription entry from its set and keep
   *  {@link Machine._event_listener_count} in sync.  The count is decremented
   *  only when the entry was actually present, so calling a stale unsubscribe
   *  closure (or removing an already-fired `once` entry) is idempotent and
   *  cannot drive the count negative.
   *
   *  @param set   The per-event-name subscription set.
   *  @param entry The entry to remove.
   *  @internal
   */
  _unsubscribe_entry(set: Set<JssmEventEntry<any, any>>, entry: JssmEventEntry<any, any>): void {
    if (set.delete(entry)) { this._event_listener_count--; }
  }
```

- [ ] **Step 6: Increment on subscribe** (in `_subscribe`, replace the `set.add(entry); return ...` tail ~line 2423-2425)

Find:
```ts
    const entry: JssmEventEntry<mDT, Ev> = { handler, filter, once };
    set.add(entry);

    return () => { set!.delete(entry); };
```
Replace with:
```ts
    const entry: JssmEventEntry<mDT, Ev> = { handler, filter, once };
    set.add(entry);
    this._event_listener_count++;

    return () => { this._unsubscribe_entry(set!, entry); };
```

- [ ] **Step 7: Route `off()` through the helper** (in `off()` ~line 2376-2380)

Find:
```ts
    for (const entry of set) {
      if (entry.handler === handler) {
        set.delete(entry);
        return true;
      }
    }
```
Replace with:
```ts
    for (const entry of set) {
      if (entry.handler === handler) {
        this._unsubscribe_entry(set, entry);
        return true;
      }
    }
```

- [ ] **Step 8: Route the `once` auto-removal through the helper** (in `_fire` ~line 2468)

Find:
```ts
      if (entry.once) { set.delete(entry); }
```
Replace with:
```ts
      if (entry.once) { this._unsubscribe_entry(set, entry); }
```

- [ ] **Step 9: Run the new test to verify it passes**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false events.spec.ts`
Expected: PASS — including the existing on/off/once tests and the new bookkeeping test.

- [ ] **Step 10: Check IDE diagnostics**

Run `mcp__ide__getDiagnostics`; confirm no new errors/warnings in `jssm.ts`.

- [ ] **Step 11: Commit**

```
git add src/ts/jssm.ts src/ts/tests/events.spec.ts
git commit -m "perf: track live event-listener count via a single removal helper (#670)"
```

---

## Task 4: Observation-event listener gate (B2, part 2)

**Files:**
- Modify: `src/ts/jssm.ts` (observation block ~3764-3801)
- Modify: `src/ts/tests/events.spec.ts`

- [ ] **Step 1: Write the guard test** (append to `src/ts/tests/events.spec.ts`)

```ts
describe('observation events under the listener-count gate', () => {

  test('a listener installed by a pre-hook still receives the transition event', () => {
    const m = sm`a -> b;`;
    let seen = 0;
    // The hook subscribes mid-transition; the gate is read AFTER pre-hooks
    // run, so this subscription must still be observed for this same transition.
    m.hook('a', 'b', () => {
      m.on('transition', () => { seen++; });
      return true;
    });
    m.transition('b');
    expect(seen).toBe(1);
  });

  test('transitions with no listeners still mutate state and data', () => {
    const m = sm_from<number>('a -> b;', { data: 1 });
    expect(m.transition('b', 2)).toBe(true);
    expect(m.state()).toBe('b');
    expect(m.data()).toBe(2);
  });

});
```

> Note: `m.hook(from, to, fn)` registers a per-edge pre-hook; confirm the exact signature against existing `hooks.spec.ts` usage and adjust the call if needed (e.g. `set_hook({ from, to, handler, kind: 'hook' })`). The behavior under test — pre-hook subscribes, event still fires — is what matters.

- [ ] **Step 2: Run the guard test to verify current behavior** (gate not added yet → both pass)

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false events.spec.ts`
Expected: PASS (these lock behavior the gate must preserve).

- [ ] **Step 3: Add the gate** (in `transition_impl`, wrap the trailing observation block ~line 3764-3801)

Find the run beginning at the `const newData_after` line through the `complete` fire:
```ts
    const newData_after: mDT = this._data;
    this._fire('exit', {
      state  : fromState,
      to     : newState,
      action : fromAction,
      data   : newData_after
    });
    this._fire('transition', {
      from       : fromState,
      to         : newState,
      action     : fromAction,
      data       : newData_after,
      next_data  : newData,
      trans_type,
      forced     : wasForced
    });
    this._fire('entry', {
      state  : newState,
      from   : fromState,
      action : fromAction,
      data   : newData_after
    });
    if (oldData !== newData_after) {
      this._fire('data-change', {
        from     : fromState,
        to       : newState,
        action   : fromAction,
        old_data : oldData,
        new_data : newData_after,
        cause    : 'transition'
      });
    }
    if (this.state_is_terminal(newState)) {
      this._fire('terminal', { state: newState, data: newData_after });
    }
    if (this.state_is_complete(newState)) {
      this._fire('complete', { state: newState, data: newData_after });
    }
```
Wrap the whole run in the gate (the `const newData_after` declaration stays *outside* if it is used below — verify; in current code it is only used inside this block, so move it inside the gate):
```ts
    // Observation events (#638) fire after the state is committed.  Each call
    // builds a detail literal at the call site, so guard the whole block on a
    // live subscription count: with zero listeners (the common hot-path case,
    // and every benchmark shape) we skip all of these allocations entirely.
    // Read after pre-hooks, so a listener a pre-hook installed is still seen.  #670
    if (this._event_listener_count !== 0) {
      const newData_after: mDT = this._data;
      this._fire('exit', {
        state  : fromState,
        to     : newState,
        action : fromAction,
        data   : newData_after
      });
      this._fire('transition', {
        from       : fromState,
        to         : newState,
        action     : fromAction,
        data       : newData_after,
        next_data  : newData,
        trans_type,
        forced     : wasForced
      });
      this._fire('entry', {
        state  : newState,
        from   : fromState,
        action : fromAction,
        data   : newData_after
      });
      if (oldData !== newData_after) {
        this._fire('data-change', {
          from     : fromState,
          to       : newState,
          action   : fromAction,
          old_data : oldData,
          new_data : newData_after,
          cause    : 'transition'
        });
      }
      if (this.state_is_terminal(newState)) {
        this._fire('terminal', { state: newState, data: newData_after });
      }
      if (this.state_is_complete(newState)) {
        this._fire('complete', { state: newState, data: newData_after });
      }
    }
```

> **Verify `newData_after` is not read after this block.** Grep `newData_after` in `jssm.ts`; if the only uses are inside the moved block, the above is correct. If it is referenced later (e.g. by a return value), keep its declaration *outside* the gate and only wrap the `_fire` calls.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false events.spec.ts`
Expected: PASS — guard tests and all existing event tests green.

- [ ] **Step 5: Check IDE diagnostics**

Run `mcp__ide__getDiagnostics`; confirm no new errors/warnings (especially no "used before assigned" for `newData_after`).

- [ ] **Step 6: Commit**

```
git add src/ts/jssm.ts src/ts/tests/events.spec.ts
git commit -m "perf: gate observation-event dispatch on live listener count (#670)"
```

---

## Task 5: Guard the `hook_args` allocation (B1)

**Files:**
- Modify: `src/ts/jssm.ts` (`hook_args` construction ~line 3458)

- [ ] **Step 1: Apply the guard** (replace the unconditional `const hook_args = {...};`)

Find:
```ts
    const hook_args = {
      data       : this._data,
      action     : fromAction,
      from       : this._state,
      to         : newState,
      next_data  : newData,
      forced     : wasForced,
      trans_type
    };
```
Replace with:
```ts
    // hook_args is read only inside the `_has_hooks` / `_has_post_hooks`
    // blocks below.  Skip building it for hook-free machines (every
    // chain/dense/hub/messy benchmark shape) so the hot path stops allocating
    // a 7-field object it never reads.  The NonNullable cast keeps the type
    // unchanged for all downstream uses without introducing an impossible
    // (uncoverable) branch; the value is only dereferenced under the guards
    // that imply it was built.  #670
    const hook_args_obj = (this._has_hooks || this._has_post_hooks)
      ? {
          data       : this._data,
          action     : fromAction,
          from       : this._state,
          to         : newState,
          next_data  : newData,
          forced     : wasForced,
          trans_type
        }
      : undefined;
    const hook_args = hook_args_obj as NonNullable<typeof hook_args_obj>;
```

- [ ] **Step 2: Run the hook + event suites to verify no behavior change**

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false hooks.spec.ts`
Expected: PASS.

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false posthooks.spec.ts`
Expected: PASS.

Run: `npx vitest run --config vitest.spec.config.ts --coverage.enabled=false events.spec.ts`
Expected: PASS.

- [ ] **Step 3: Check IDE diagnostics**

Run `mcp__ide__getDiagnostics`; confirm no new errors/warnings in `jssm.ts`.

- [ ] **Step 4: Commit**

```
git add src/ts/jssm.ts
git commit -m "perf: build hook_args only when hooks are registered (#670)"
```

---

## Task 6: Full spec suite + coverage gate

**Files:** none (validation only)

- [ ] **Step 1: Run the full spec suite with coverage**

Run: `npm run vitest-spec`
Expected: PASS with 100% branches/functions/lines/statements on `src/ts/**`. If any new branch in `jssm.ts` is uncovered, add a targeted test in `events.spec.ts` (e.g., the gate's no-listener path is covered by `transitions with no listeners still mutate state`; the helper's `Set.delete === false` path by the double-unsubscribe test).

- [ ] **Step 2: Run the stochastic suite (sanity)**

Run: `npm run vitest-stoch`
Expected: PASS.

---

## Task 7: Measure, snapshot, compare (MAIN SESSION, not a subagent)

**Files:**
- Create: `src/historic_benchmarks/benchmark_2026-06-01_alloc-cleanup.json`

- [ ] **Step 1: Full build (regenerates every tracked artifact)**

Run: `npm run build`
Expected: completes (`vet && test && site && make_cookbook && site_fsl_tools && changelog && docs && cloc && readme`).

- [ ] **Step 2: Run the scaling benchmark on the changed build**

Run: `npm run benny:scaling`
Expected: completes; writes `benchmark/results/scaling.json`.

- [ ] **Step 3: Copy into the post-change snapshot**

Run (PowerShell): `Copy-Item benchmark/results/scaling.json src/historic_benchmarks/benchmark_2026-06-01_alloc-cleanup.json`

- [ ] **Step 4: Generate the comparison markdown**

Run: `node src/scripts/benchmark_compare.cjs src/historic_benchmarks/benchmark_2026-05-26.json src/historic_benchmarks/benchmark_2026-06-01_pre-alloc-cleanup.json src/historic_benchmarks/benchmark_2026-06-01_alloc-cleanup.json`
Expected: markdown comparing original (5.128.0) → previous (pre-change) → current (post-change). Capture it for the #636 comment.

- [ ] **Step 5: Commit the snapshot**

```
git add src/historic_benchmarks/benchmark_2026-06-01_alloc-cleanup.json
git commit -m "chore: snapshot post-alloc-cleanup benchmark (#670)"
```

---

## Task 8: Release prep + PR (MAIN SESSION, orchestrator)

**Files:** version bump + regenerated artifacts (via `/sc-commit`)

- [ ] **Step 1:** Run `/sc-commit` on this branch (version bump + full `npm run build` + commit).
- [ ] **Step 2:** Push the branch.
- [ ] **Step 3:** Open the PR; body references the design and includes a `Closes #670` line.
- [ ] **Step 4:** Post the Task 7 comparison markdown as a new comment on #636, framed as the alloc-cleanup step (new numbers, vs previous, vs original), documenting the real (possibly marginal) result honestly.

---

## Self-Review

**Spec coverage:** Deliverable 1 (generator) → Task 1. B1 (hook_args guard) → Task 5. B2 part 1 (counter + helper) → Task 3; part 2 (gate) → Task 4. Measurement/#636 workflow → Tasks 2 & 7. Sub-issue/PR → Task 8 (sub-issue #670 already opened). Build-before-release → Task 7 (`npm run build`). 100% coverage constraint → Task 6. All spec sections map to tasks.

**Placeholder scan:** No TBD/TODO. The one conditional instruction (verify `newData_after` is not used after the observation block; confirm `m.hook` signature) is an explicit verification step with the fallback spelled out, not a vague placeholder.

**Type/name consistency:** `_event_listener_count`, `_unsubscribe_entry`, `hook_args_obj`/`hook_args` used identically across tasks. Generator exports (`loadBenchmark`, `pivot`, `factor`, `formatOps`, `formatFactor`, `buildComparison`, `renderMarkdown`) match between the test (Task 1 Step 2) and the implementation (Step 4). Fixture ops values and the asserted table rows are arithmetically consistent (300/150=2.00×, 300/100=3.00×).
